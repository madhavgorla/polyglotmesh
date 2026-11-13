package com.infotact.polyglotmesh.execution;

import com.infotact.polyglotmesh.config.PolyglotProperties;
import com.infotact.polyglotmesh.dto.ExecutionRequest;
import com.infotact.polyglotmesh.dto.ExecutionResponse;
import com.infotact.polyglotmesh.security.CodeSecurityValidator;
import com.infotact.polyglotmesh.security.SandboxPolicyFactory;
import jakarta.annotation.PreDestroy;
import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Engine;
import org.graalvm.polyglot.PolyglotException;
import org.graalvm.polyglot.Source;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.*;

/**
 * Core GraalVM Polyglot Execution Service.
 * Creates a fresh isolated Context per request with strict timeout watchdog and concurrency semaphore.
 */
@Service
public class GraalPolyglotExecutionService {

    private static final Logger log = LoggerFactory.getLogger(GraalPolyglotExecutionService.class);

    private final Engine sharedEngine;
    private final ScheduledExecutorService watchdogExecutor;
    private final Semaphore concurrencyLimiter;
    private final PolyglotProperties properties;
    private final SandboxPolicyFactory sandboxPolicyFactory;
    private final CodeSecurityValidator securityValidator;

    public GraalPolyglotExecutionService(
            PolyglotProperties properties,
            SandboxPolicyFactory sandboxPolicyFactory,
            CodeSecurityValidator securityValidator
    ) {
        this.properties = properties;
        this.sandboxPolicyFactory = sandboxPolicyFactory;
        this.securityValidator = securityValidator;
        this.sharedEngine = Engine.newBuilder()
                .option("engine.WarnInterpreterOnly", "false")
                .build();
        this.watchdogExecutor = Executors.newScheduledThreadPool(2);
        this.concurrencyLimiter = new Semaphore(properties.getExecution().getMaxConcurrentExecutions());
    }

    public Set<String> getAvailableGraalLanguages() {
        return sharedEngine.getLanguages().keySet();
    }

    public boolean isLanguageAvailable(String apiLanguage) {
        String graalId = mapToGraalId(apiLanguage);
        return graalId != null && sharedEngine.getLanguages().containsKey(graalId);
    }

    public ExecutionResponse execute(ExecutionRequest request) {
        long startTime = System.currentTimeMillis();
        String executionId = "exec-" + UUID.randomUUID().toString().substring(0, 8);
        String apiLang = request.getLanguage();
        String code = request.getCode();

        if (code == null || code.trim().isEmpty()) {
            return ExecutionResponse.failure(
                    executionId, apiLang, "", "Validation Error: Source code cannot be empty.", 0, "PolyglotMesh Validator"
            );
        }

        String graalLang = mapToGraalId(apiLang);
        if (graalLang == null) {
            return ExecutionResponse.failure(
                    executionId, apiLang, "", "Unsupported language: " + apiLang, 0, "PolyglotMesh Validator"
            );
        }

        if (!sharedEngine.getLanguages().containsKey(graalLang)) {
            return ExecutionResponse.failure(
                    executionId,
                    apiLang,
                    "",
                    "Runtime Unavailable: '" + apiLang + "' (GraalVM ID '" + graalLang + "') is not installed in this GraalVM distribution. " +
                            "Available runtimes: " + sharedEngine.getLanguages().keySet() + ". " +
                            "Enable the corresponding Maven dependency/profile (e.g. -Pruby-runtime for TruffleRuby).",
                    System.currentTimeMillis() - startTime,
                    "GraalVM Polyglot Runtime Registry"
            );
        }

        Optional<String> policyViolation = securityValidator.validate(apiLang, code);
        if (policyViolation.isPresent()) {
            long elapsed = System.currentTimeMillis() - startTime;
            ExecutionResponse denied = ExecutionResponse.failure(
                    executionId, apiLang, "", "[SecurityPolicyViolation] " + policyViolation.get(), elapsed, "GraalVM Sandbox Policy"
            );
            denied.setSandboxAudit(sandboxPolicyFactory.createAuditSnapshot(properties.getExecution().getDefaultTimeoutMs()));
            return denied;
        }

        long defaultTimeout = properties.getExecution().getDefaultTimeoutMs();
        long maxTimeout = properties.getExecution().getMaxTimeoutMs();
        long timeout = request.getTimeoutMs() != null
                ? Math.min(Math.max(request.getTimeoutMs(), 500), maxTimeout)
                : defaultTimeout;

        boolean acquired = false;
        try {
            acquired = concurrencyLimiter.tryAcquire(2, TimeUnit.SECONDS);
            if (!acquired) {
                return ExecutionResponse.failure(
                        executionId, apiLang, "",
                        "Server Busy: Maximum concurrent execution capacity reached. Please retry.",
                        System.currentTimeMillis() - startTime,
                        "Concurrency Guard"
                );
            }

            return executeInIsolatedContext(executionId, apiLang, graalLang, code, timeout, startTime);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            return ExecutionResponse.failure(
                    executionId, apiLang, "", "Execution interrupted while awaiting worker slot.",
                    System.currentTimeMillis() - startTime, "Concurrency Guard"
            );
        } finally {
            if (acquired) {
                concurrencyLimiter.release();
            }
        }
    }

    private ExecutionResponse executeInIsolatedContext(
            String executionId, String apiLang, String graalLang, String code, long timeout, long startTime
    ) {
        ByteArrayOutputStream stdoutStream = new ByteArrayOutputStream();
        ByteArrayOutputStream stderrStream = new ByteArrayOutputStream();
        Context context = sandboxPolicyFactory.buildIsolatedContext(graalLang, sharedEngine, stdoutStream, stderrStream);
        ScheduledFuture<?> timeoutTask = null;
        boolean[] isTimedOut = new boolean[]{false};
        String engineName = "GraalVM Polyglot (" + graalLang + ")";

        try {
            timeoutTask = watchdogExecutor.schedule(() -> {
                isTimedOut[0] = true;
                try {
                    context.close(true);
                } catch (Exception e) {
                    log.warn("Watchdog failed closing context {}: {}", executionId, e.getMessage());
                }
            }, timeout, TimeUnit.MILLISECONDS);

            Source source = Source.newBuilder(graalLang, code, "untrusted-script").build();
            context.eval(source);

            long elapsed = System.currentTimeMillis() - startTime;
            String output = truncateOutput(stdoutStream.toString(StandardCharsets.UTF_8));

            ExecutionResponse response = ExecutionResponse.success(
                    executionId,
                    apiLang,
                    output.isEmpty() ? "(Execution completed with no standard output)" : output,
                    elapsed,
                    engineName
            );
            response.setSandboxAudit(sandboxPolicyFactory.createAuditSnapshot(timeout));
            return response;

        } catch (PolyglotException pe) {
            long elapsed = System.currentTimeMillis() - startTime;
            String errorMsg;
            if (isTimedOut[0] || pe.isCancelled()) {
                errorMsg = "Execution timed out: Exceeded deadline of " + timeout + "ms. Polyglot Context interrupted.";
            } else if (pe.isSyntaxError()) {
                errorMsg = "Syntax Error: " + pe.getMessage();
            } else if (pe.isHostException()) {
                errorMsg = "Host Security Exception: Access Denied.";
            } else {
                errorMsg = pe.getMessage();
            }
            String output = truncateOutput(stdoutStream.toString(StandardCharsets.UTF_8));
            ExecutionResponse response = ExecutionResponse.failure(executionId, apiLang, output, errorMsg, elapsed, engineName);
            response.setSandboxAudit(sandboxPolicyFactory.createAuditSnapshot(timeout));
            return response;

        } catch (IOException ioe) {
            return ExecutionResponse.failure(
                    executionId, apiLang, "", "Source initialization error.", System.currentTimeMillis() - startTime, engineName
            );
        } finally {
            if (timeoutTask != null) {
                timeoutTask.cancel(true);
            }
            try {
                context.close();
            } catch (Exception ignored) {}
        }
    }

    private String truncateOutput(String output) {
        int maxLen = properties.getExecution().getMaxOutputLength();
        if (output.length() > maxLen) {
            return output.substring(0, maxLen) + "\n... [output truncated at " + maxLen + " chars]";
        }
        return output;
    }

    private String mapToGraalId(String apiLang) {
        if (apiLang == null) return null;
        return switch (apiLang.trim().toLowerCase()) {
            case "javascript", "js" -> "js";
            case "python" -> "python";
            case "ruby" -> "ruby";
            default -> null;
        };
    }

    @PreDestroy
    public void shutdown() {
        watchdogExecutor.shutdownNow();
        sharedEngine.close();
    }
}
