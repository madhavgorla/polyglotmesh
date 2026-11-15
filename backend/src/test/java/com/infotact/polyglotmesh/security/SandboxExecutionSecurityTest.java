package com.infotact.polyglotmesh.security;

import com.infotact.polyglotmesh.config.PolyglotProperties;
import com.infotact.polyglotmesh.dto.ExecutionRequest;
import com.infotact.polyglotmesh.dto.ExecutionResponse;
import com.infotact.polyglotmesh.execution.GraalPolyglotExecutionService;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * End-to-end security execution tests that run real guest code through the sandbox.
 * (Hariom Verma - GraalVM Core & Sandbox Lead).
 *
 * Exercises GraalPolyglotExecutionService + SandboxPolicyFactory + CodeSecurityValidator
 * without a Spring context (only the real GraalVM runtimes), proving:
 *   - injected-language mapping and availability checks,
 *   - pre-flight policy rejection ("[SecurityPolicyViolation]"),
 *   - HostAccess.NONE host isolation,
 *   - infinite-loop watchdog timeout enforcement (context.close(true)),
 *   - JS success path passing through Machine policy with allowExperimentalOptions.
 */
class SandboxExecutionSecurityTest {

    private static GraalPolyglotExecutionService service;

    @BeforeAll
    static void buildService() {
        PolyglotProperties properties = new PolyglotProperties();
        // Tight sandbox defaults are already disabled; keep obvious conservative values.
        SandboxPolicyFactory factory = new SandboxPolicyFactory(properties);
        CodeSecurityValidator validator = new CodeSecurityValidator();
        service = new GraalPolyglotExecutionService(properties, factory, validator);

        // Warm up the Python runtime so the first interpreter build + parse does not
        // count against the default 3s watchdog deadline in a later assertion.
        // The result is intentionally ignored; we only want the runtime loaded.
        service.execute(new ExecutionRequest("python", "import sys; print(sys.version_info.major)"));
    }

    @AfterAll
    static void closeService() {
        service.shutdown();
    }

    @Test
    @DisplayName("Language registry resolves via mapToGraalId")
    void languageAvailability() {
        assertTrue(service.isLanguageAvailable("javascript"));
        assertTrue(service.isLanguageAvailable("python"));
        assertFalse(service.isLanguageAvailable("cobol"));
    }

    @Test
    @DisplayName("Empty source is rejected by the execution guard")
    void emptySourceRejected() {
        ExecutionResponse response = service.execute(new ExecutionRequest("javascript", "   "));
        assertFalse(response.isSuccess());
        assertNotNull(response.getError());
        assertTrue(response.getError().toLowerCase().contains("empty"));
    }

    @Test
    @DisplayName("Unsupported language is rejected without touching GraalVM")
    void unsupportedLanguageRejected() {
        ExecutionResponse response = service.execute(new ExecutionRequest("cobol", "DISPLAY 'x'."));
        assertFalse(response.isSuccess());
        assertTrue(response.getError().toLowerCase().contains("unsupported language"));
    }

    @Test
    @DisplayName("Python os.system is denied by pre-flight policy (never reaches context)")
    void pythonOsSystemPolicyDenied() {
        ExecutionResponse response = service.execute(new ExecutionRequest("python", "import os\nos.system('whoami')"));
        assertFalse(response.isSuccess());
        assertTrue(response.getError().contains("[SecurityPolicyViolation]"));
    }

    @Test
    @DisplayName("JavaScript process access is denied by pre-flight policy")
    void jsProcessPolicyDenied() {
        ExecutionResponse response = service.execute(new ExecutionRequest("javascript", "process.exit(1)"));
        assertFalse(response.isSuccess());
        assertTrue(response.getError().contains("[SecurityPolicyViolation]"));
    }

    @Test
    @DisplayName("Host Java access is denied inside the sandbox context")
    void hostAccessDeniedInContext() {
        // HostAccess.NONE: guest cannot reach JVM host types.
        ExecutionResponse response = service.execute(new ExecutionRequest("js", "Java.type('java.lang.System').getProperty('user.home')"));
        assertFalse(response.isSuccess());
        assertNotNull(response.getError());
        assertNotNull(response.getSandboxAudit());
        assertTrue(response.getSandboxAudit().containsKey("hostAccessDenied"));
    }

    @Test
    @DisplayName("Infinite loop is force-terminated by the watchdog deadline")
    void infiniteLoopWatchdogCancellation() {
        long started = System.currentTimeMillis();
        ExecutionResponse response = service.execute(new ExecutionRequest("javascript", "while(true){}", 1200));
        long elapsed = System.currentTimeMillis() - started;

        assertFalse(response.isSuccess());
        assertTrue(response.getError().toLowerCase().contains("timed out") || response.getError().toLowerCase().contains("cancelled"),
                "expected watchdog interruption, got: " + response.getError());
        // Deadline of 1200ms plus small scheduling slack.
        assertTrue(elapsed < 5000, "watchdog did not interrupt promptly: " + elapsed + "ms");
    }

    @Test
    @DisplayName("Benign JavaScript executes successfully with output")
    void benignJsExecutes() {
        ExecutionResponse response = service.execute(new ExecutionRequest("javascript", "console.log('sandbox-ok:' + (2 + 3));"));
        assertTrue(response.isSuccess(),
                "expected success but got: " + response.getError());
        assertTrue(response.getOutput().contains("sandbox-ok:5"));
        assertNotNull(response.getSandboxAudit());
    }

    @Test
    @DisplayName("Benign Python executes successfully with output")
    void benignPythonExecutes() {
        // A fresh Python Context is created per request (isolation by design), and
        // building it has real cold-start latency in GraalPy, so grant the maximum
        // allowed watchdog deadline for this honest execution check.
        ExecutionResponse response = service.execute(new ExecutionRequest("python", "print('py-ok', 6 * 7)", 5000));
        assertTrue(response.isSuccess(), "expected success but got: " + response.getError());
        assertTrue(response.getOutput().contains("py-ok 42"));
    }
}