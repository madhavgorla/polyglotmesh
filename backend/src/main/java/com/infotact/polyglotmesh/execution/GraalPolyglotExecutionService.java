package com.infotact.polyglotmesh.execution;

import com.infotact.polyglotmesh.config.PolyglotProperties;
import com.infotact.polyglotmesh.dto.DebugRequest;
import com.infotact.polyglotmesh.dto.DebugResponse;
import com.infotact.polyglotmesh.dto.DebugRuntimeError;
import com.infotact.polyglotmesh.dto.DebugStackFrame;
import com.infotact.polyglotmesh.dto.DebugStep;
import com.infotact.polyglotmesh.dto.ExecutionRequest;
import com.infotact.polyglotmesh.dto.ExecutionResponse;
import com.infotact.polyglotmesh.dto.SyntaxCheckResponse;
import com.infotact.polyglotmesh.dto.SyntaxDiagnostic;
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
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
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
        warmUpGraalRuntimes();
    }

    /**
     * GraalVM's first polyglot eval per language does a slow (~10s+) interpreter warm-up
     * (interop + traceback-formatting initialization) that, if it happened on a real user
     * request, could trip the execution/debug timeout. Pre-warm only the languages this
     * backend serves under the sandbox so the first request is fast and correct.
     */
    private void warmUpGraalRuntimes() {
        for (String lang : new String[]{"python", "js"}) {
            if (sharedEngine.getLanguages().containsKey(lang)) {
                try {
                    ByteArrayOutputStream sink = new ByteArrayOutputStream();
                    Context ctx = sandboxPolicyFactory.buildIsolatedContext(lang, sharedEngine, sink, sink);
                    try {
                        ctx.eval(Source.newBuilder(lang, warmUpSource(lang), "engine-warmup").build());
                    } finally {
                        ctx.close();
                    }
                } catch (Exception e) {
                    log.warn("GraalVM warm-up failed for '{}': {}", lang, e.getMessage());
                }
            }
        }
    }

    private String warmUpSource(String lang) {
        return switch (lang) {
            case "python" -> "x = 1\n";
            case "js" -> "let x = 1;\n";
            default -> "let x = 1;\n";
        };
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

    /**
     * Fast-path syntax validation. Parses the source with the GraalVM language parser
     * WITHOUT building a Context or executing anything, so it never contends with the
     * concurrency limiter and is safe to call on every editor keystroke (debounced).
     */
    public SyntaxCheckResponse checkSyntax(String language, String code) {
        if (language == null || language.isBlank() || code == null || code.isBlank()) {
            return SyntaxCheckResponse.valid();
        }
        String apiLang = language.trim().toLowerCase();
        String graalLang = mapToGraalId(apiLang);
        if (graalLang == null) {
            return SyntaxCheckResponse.invalid(List.of(
                    new SyntaxDiagnostic(1, 1, "Unsupported language: " + language, "error")
            ));
        }
        if (!sharedEngine.getLanguages().containsKey(graalLang)) {
            return SyntaxCheckResponse.invalid(List.of(
                    new SyntaxDiagnostic(1, 1,
                            "Runtime Unavailable: '" + apiLang + "' is not installed in this GraalVM distribution.", "error")
            ));
        }

        Optional<String> policyViolation = securityValidator.validate(apiLang, code);
        if (policyViolation.isPresent()) {
            return SyntaxCheckResponse.invalid(List.of(
                    new SyntaxDiagnostic(1, 1, "[SecurityPolicyViolation] " + policyViolation.get(), "error")
            ));
        }

        try {
            Source source = Source.newBuilder(graalLang, code, "check-syntax")
                    .mimeType(resolveMimeType(graalLang))
                    .build();
            // Real parse (not just Source construction): invalid syntax throws isSyntaxError.
            // No host access, no IO, no concurrency slot — parse-only, then immediately closed.
            Context parseContext = sandboxPolicyFactory.buildIsolatedContext(graalLang, sharedEngine,
                    new ByteArrayOutputStream(), new ByteArrayOutputStream());
            try {
                parseContext.parse(source);
            } finally {
                parseContext.close();
            }
            return SyntaxCheckResponse.valid();
        } catch (PolyglotException pe) {
            if (pe.isSyntaxError()) {
                int line = 1;
                int column = 1;
                String text = null;
                if (pe.getSourceLocation() != null) {
                    line = pe.getSourceLocation().getStartLine();
                    column = Math.max(1, pe.getSourceLocation().getStartColumn());
                    text = pe.getSourceLocation().getSource().getCharacters(line).toString().strip();
                }
                String message = "Syntax Error: " + pe.getMessage();
                return SyntaxCheckResponse.invalid(List.of(
                        new SyntaxDiagnostic(line, column, message, "error", text)
                ));
            }
            return SyntaxCheckResponse.invalid(List.of(
                    new SyntaxDiagnostic(1, 1, "Failed to parse source: " + pe.getMessage(), "error")
            ));
        } catch (IllegalArgumentException iae) {
            return SyntaxCheckResponse.invalid(List.of(
                    new SyntaxDiagnostic(1, 1, "Unsupported source: " + iae.getMessage(), "error")
            ));
        } catch (IOException ioe) {
            return SyntaxCheckResponse.invalid(List.of(
                    new SyntaxDiagnostic(1, 1, "Failed to read source: " + ioe.getMessage(), "error")
            ));
        }
    }

    /**
     * Line-oriented sandboxed debug. Parses source first (syntax errors are reported as a
     * single exception step, matching the front-end contract), then executes inside the
     * hardened isolated Context to surface real runtime errors and captured stdout.
     */
    public DebugResponse debug(DebugRequest request) {
        long startTime = System.currentTimeMillis();
        String apiLang = request.getLanguage().trim().toLowerCase();
        String code = request.getCode();

        if (code == null || code.isBlank()) {
            return DebugResponse.failure(apiLang, List.of(),
                    new DebugRuntimeError("ValidationError", "Source code cannot be empty.", 1),
                    null, "", System.currentTimeMillis() - startTime);
        }
        if (code.length() > properties.getExecution().getMaxSourceSizeBytes()) {
            return DebugResponse.failure(apiLang, List.of(),
                    new DebugRuntimeError("PayloadTooLarge",
                            "Source code exceeds " + properties.getExecution().getMaxSourceSizeBytes() + " byte limit.", 1),
                    null, "", System.currentTimeMillis() - startTime);
        }

        String graalLang = mapToGraalId(apiLang);
        if (graalLang == null) {
            return DebugResponse.failure(apiLang, List.of(),
                    null, new DebugRuntimeError("UnsupportedLanguage",
                            "Step debugger supports \"python\" and \"javascript\" (received \"" + apiLang + "\").", 1),
                    "", System.currentTimeMillis() - startTime);
        }
        if (!sharedEngine.getLanguages().containsKey(graalLang)) {
            DebugRuntimeError unavailable = new DebugRuntimeError("RuntimeUnavailable",
                    "'" + apiLang + "' not installed in this GraalVM distribution.", 1);
            return DebugResponse.failure(apiLang, List.of(), null, unavailable, "",
                    System.currentTimeMillis() - startTime);
        }

        Optional<String> policyViolation = securityValidator.validate(apiLang, code);
        if (policyViolation.isPresent()) {
            DebugRuntimeError security = new DebugRuntimeError("SecurityPolicyViolation",
                    policyViolation.get(), 1);
            DebugStep securityStep = new DebugStep();
            securityStep.setStep(1);
            securityStep.setLine(1);
            securityStep.setEvent("exception");
            securityStep.setFunctionName("<module>");
            securityStep.setLocals(Collections.emptyMap());
            securityStep.setStack(List.of(new DebugStackFrame("<module>", 1, Collections.emptyMap())));
            securityStep.setStdout("");
            securityStep.setError(security);
            securityStep.setCaption("[SecurityPolicyViolation] " + policyViolation.get());
            return DebugResponse.failure(apiLang, List.of(securityStep), null, security, "",
                    System.currentTimeMillis() - startTime);
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
                DebugRuntimeError busy = new DebugRuntimeError("ServerBusy",
                        "Maximum concurrent execution capacity reached. Please retry.", 1);
                return DebugResponse.failure(apiLang, List.of(), null, busy, "",
                        System.currentTimeMillis() - startTime);
            }
            return debugInIsolatedContext(apiLang, graalLang, code, timeout, startTime);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            DebugRuntimeError interrupted = new DebugRuntimeError("Interrupted",
                    "Debug session interrupted while awaiting worker slot.", 1);
            return DebugResponse.failure(apiLang, List.of(), null, interrupted, "",
                    System.currentTimeMillis() - startTime);
        } finally {
            if (acquired) {
                concurrencyLimiter.release();
            }
        }
    }

    private DebugResponse debugInIsolatedContext(
            String apiLang, String graalLang, String code, long timeout, long startTime
    ) {
        List<DebugStep> steps = new ArrayList<>();
        ByteArrayOutputStream stdoutStream = new ByteArrayOutputStream();
        Context context = sandboxPolicyFactory.buildIsolatedContext(graalLang, sharedEngine, stdoutStream, stdoutStream);
        ScheduledFuture<?> timeoutTask = null;
        boolean[] isTimedOut = new boolean[]{false};
        try {
            Source source;
            try {
                source = Source.newBuilder(graalLang, code, "debug-script")
                        .mimeType(resolveMimeType(graalLang))
                        .build();
            } catch (PolyglotException pe) {
                if (pe.isSyntaxError()) {
                    return buildSyntaxErrorDebug(apiLang, graalLang, pe, steps, startTime);
                }
                DebugRuntimeError parseError = new DebugRuntimeError("SyntaxError",
                        "Failed to parse source: " + pe.getMessage(), lineOf(pe));
                return DebugResponse.failure(apiLang, List.of(), parseError, null, "",
                        System.currentTimeMillis() - startTime);
            }

            timeoutTask = watchdogExecutor.schedule(() -> {
                isTimedOut[0] = true;
                try {
                    context.close(true);
                } catch (Exception e) {
                    log.warn("Watchdog failed closing debug context: {}", e.getMessage());
                }
            }, timeout, TimeUnit.MILLISECONDS);

            context.eval(source);

            String finalOutput = truncateOutput(stdoutStream.toString(StandardCharsets.UTF_8));
            DebugStep completionStep = new DebugStep();
            completionStep.setStep(steps.size() + 1);
            completionStep.setLine(1);
            completionStep.setEvent("return");
            completionStep.setFunctionName("<module>");
            completionStep.setLocals(Collections.emptyMap());
            completionStep.setStack(List.of(new DebugStackFrame("<module>", 1, Collections.emptyMap())));
            completionStep.setStdout(finalOutput);
            completionStep.setCaption("Program completed");
            steps.add(completionStep);

            return DebugResponse.ok(apiLang, steps, finalOutput, System.currentTimeMillis() - startTime);

        } catch (PolyglotException pe) {
            String finalOutput = truncateOutput(stdoutStream.toString(StandardCharsets.UTF_8));
            if (pe.isSyntaxError()) {
                DebugRuntimeError syntaxError = new DebugRuntimeError("SyntaxError", pe.getMessage(),
                        lineOf(pe), pe.getSourceLocation() != null
                            ? Math.max(1, pe.getSourceLocation().getStartColumn()) : 1);
                DebugStep syntaxStep = new DebugStep();
                syntaxStep.setStep(1);
                syntaxStep.setLine(syntaxError.getLine());
                syntaxStep.setEvent("exception");
                syntaxStep.setFunctionName("<module>");
                syntaxStep.setLocals(Collections.emptyMap());
                syntaxStep.setStack(List.of(new DebugStackFrame("<module>", syntaxError.getLine(), Collections.emptyMap())));
                syntaxStep.setStdout(finalOutput);
                syntaxStep.setError(syntaxError);
                syntaxStep.setCaption("SyntaxError on line " + syntaxError.getLine() + ": " + syntaxError.getMessage());
                steps.add(syntaxStep);
                return DebugResponse.failure(apiLang, steps, syntaxError, null, finalOutput,
                        System.currentTimeMillis() - startTime);
            }

            DebugRuntimeError runtimeError;
            if (isTimedOut[0] || pe.isCancelled()) {
                runtimeError = new DebugRuntimeError("TimeoutError",
                        "Execution timed out after " + timeout + "ms.", lineOf(pe));
            } else {
                String message = guestMessage(pe);
                runtimeError = new DebugRuntimeError(typeOf(pe), message, lineOf(pe));
            }
            DebugStep exceptionStep = new DebugStep();
            exceptionStep.setStep(steps.size() + 1);
            exceptionStep.setLine(runtimeError.getLine());
            exceptionStep.setEvent("exception");
            exceptionStep.setFunctionName("<module>");
            exceptionStep.setLocals(Collections.emptyMap());
            exceptionStep.setStack(List.of(new DebugStackFrame("<module>", runtimeError.getLine(), Collections.emptyMap())));
            exceptionStep.setStdout(finalOutput);
            exceptionStep.setError(runtimeError);
            exceptionStep.setCaption(runtimeError.getType() + " at line " + runtimeError.getLine() + ": "
                    + runtimeError.getMessage());
            steps.add(exceptionStep);

            return DebugResponse.failure(apiLang, steps, null, runtimeError, finalOutput,
                    System.currentTimeMillis() - startTime);
        } catch (IOException ioe) {
            DebugRuntimeError initError = new DebugRuntimeError("InitError",
                    "Source initialization error.", 1);
            return DebugResponse.failure(apiLang, List.of(), null, initError, "",
                    System.currentTimeMillis() - startTime);
        } finally {
            if (timeoutTask != null) {
                timeoutTask.cancel(true);
            }
            try {
                context.close();
            } catch (Exception ignored) {
            }
        }
    }

    private DebugResponse buildSyntaxErrorDebug(
            String apiLang, String graalLang, PolyglotException pe, List<DebugStep> steps, long startTime
    ) {
        int line = lineOf(pe);
        int column = pe.getSourceLocation() != null ? Math.max(1, pe.getSourceLocation().getStartColumn()) : 1;
        String msg = pe.getMessage();
        DebugRuntimeError syntaxError = new DebugRuntimeError("SyntaxError", msg, line, column);

        DebugStep syntaxStep = new DebugStep();
        syntaxStep.setStep(1);
        syntaxStep.setLine(line);
        syntaxStep.setEvent("exception");
        syntaxStep.setFunctionName("<module>");
        syntaxStep.setLocals(Collections.emptyMap());
        syntaxStep.setStack(List.of(new DebugStackFrame("<module>", line, Collections.emptyMap())));
        syntaxStep.setStdout("");
        syntaxStep.setError(syntaxError);
        syntaxStep.setCaption("SyntaxError on line " + line + ": " + msg);
        steps.add(syntaxStep);

        return DebugResponse.failure(apiLang, steps, syntaxError, null, "",
                System.currentTimeMillis() - startTime);
    }

    private int lineOf(PolyglotException pe) {
        if (pe.getSourceLocation() != null) {
            return pe.getSourceLocation().getStartLine();
        }
        return 1;
    }

    private String typeOf(PolyglotException pe) {
        String guestClassName = pe.getGuestObject() != null ? pe.getGuestObject().getMetaObject().getMetaQualifiedName() : null;
        if (guestClassName != null && !guestClassName.isBlank()) {
            return guestClassName;
        }
        if (pe.isResourceExhausted()) return "ResourceLimitExceeded";
        if (pe.isCancelled()) return "Cancelled";
        return "RuntimeError";
    }

    /**
     * Extracts a readable guest exception message. Falls back to the guest object's string
     * representation (which for Python includes the argument, e.g. ValueError('boom')), so the
     * front-end gets the actual thrown message rather than a host-side fragment.
     */
    private String guestMessage(PolyglotException pe) {
        String host = pe.getMessage();
        if (host != null && !host.isBlank()) {
            String trimmed = host.trim();
            if (trimmed.equals("java.lang.IllegalArgumentException") || trimmed.startsWith("java.io")) {
                return trimmed;
            }
            // GraalVM Python typically includes the message already; if it carries the guest
            // repr we prefer the richer guest view below.
        }
        if (pe.getGuestObject() != null) {
            try {
                String repr = pe.getGuestObject().toString();
                if (repr != null && !repr.isBlank()) {
                    return repr;
                }
            } catch (Exception ignored) {
                // fall through to host message
            }
        }
        return host != null ? host : "Runtime error.";
    }

    private String resolveMimeType(String graalLang) {
        return switch (graalLang) {
            case "python" -> "text/x-python";
            case "js" -> "text/javascript";
            case "ruby" -> "text/x-ruby";
            default -> null;
        };
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
