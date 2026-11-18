package com.infotact.polyglotmesh.execution;

import com.infotact.polyglotmesh.config.PolyglotProperties;
import com.infotact.polyglotmesh.dto.DebugRequest;
import com.infotact.polyglotmesh.dto.DebugResponse;
import com.infotact.polyglotmesh.dto.SyntaxCheckResponse;
import com.infotact.polyglotmesh.security.CodeSecurityValidator;
import com.infotact.polyglotmesh.security.SandboxPolicyFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Plain unit tests for the live-editor endpoints (/api/check-syntax, /api/debug).
 * Built directly against GraalPolyglotExecutionService with a real GraalVM engine,
 * so it does NOT require the Spring/DB context that the H2 test profile can't load.
 */
class GraalDebugEndpointsTest {

    private static GraalPolyglotExecutionService service;

    @BeforeAll
    static void setUp() {
        PolyglotProperties properties = new PolyglotProperties();
        // Defaults in PolyglotProperties are fine (3s default timeout, 5s max, 16 concurrent).
        SandboxPolicyFactory sandbox = new SandboxPolicyFactory(properties);
        CodeSecurityValidator validator = new CodeSecurityValidator();
        service = new GraalPolyglotExecutionService(properties, sandbox, validator);
    }

    // ---------- /api/check-syntax ----------

    @Test
    void validPythonSyntaxIsAccepted() {
        SyntaxCheckResponse res = service.checkSyntax("python", "def add(a, b):\n    return a + b\nprint(add(2, 3))\n");
        assertTrue(res.isValid(), "valid Python should parse cleanly");
        assertNotNull(res.getErrors());
        assertTrue(res.getErrors().isEmpty());
    }

    @Test
    void invalidPythonSyntaxIsRejectedWithLine() {
        SyntaxCheckResponse res = service.checkSyntax("python", "def add(a, b):\n    return a +\n");
        assertFalse(res.isValid());
        assertFalse(res.getErrors().isEmpty());
        assertEquals("error", res.getErrors().get(0).getSeverity());
        assertTrue(res.getErrors().get(0).getLine() >= 1);
    }

    @Test
    void validJavaScriptSyntaxIsAccepted() {
        SyntaxCheckResponse res = service.checkSyntax("javascript", "const x = [1,2,3];\nconsole.log(x.length);\n");
        assertTrue(res.isValid());
    }

    @Test
    void invalidJavaScriptSyntaxIsRejected() {
        SyntaxCheckResponse res = service.checkSyntax("javascript", "const x = ;\n");
        assertFalse(res.isValid());
        assertFalse(res.getErrors().isEmpty());
    }

    @Test
    void blockedCodeIsRejectedBySecurityPolicy() {
        // os.system is blocked by the security validator for python
        SyntaxCheckResponse res = service.checkSyntax("python", "import os\nos.system('ls')\n");
        assertFalse(res.isValid());
        assertTrue(res.getErrors().get(0).getMessage().startsWith("[SecurityPolicyViolation]"));
    }

    @Test
    void blankCodeIsTreatedAsValid() {
        SyntaxCheckResponse res = service.checkSyntax("python", "   \n");
        assertTrue(res.isValid());
    }

    // ---------- /api/debug ----------

    @Test
    void debugJavaScriptRuntimeError() {
        DebugResponse res = service.debug(new DebugRequest("javascript", "const a = null;\na.x = 1;\n"));
        assertFalse(res.isSuccess());
        assertNotNull(res.getRuntimeError());
        assertEquals("TypeError", res.getRuntimeError().getType());
    }

    @Test
    void debugSuccessReturnsCapturedOutput() {
        DebugResponse res = service.debug(new DebugRequest("python", "print('hello from debug')\n"));
        assertTrue(res.isSuccess());
        assertNull(res.getSyntaxError());
        assertNull(res.getRuntimeError());
        assertTrue(res.getFinalOutput().contains("hello from debug"));
        assertNotNull(res.getSteps());
        assertFalse(res.getSteps().isEmpty());
        assertNotNull(res.getExecutionTimeMs());
    }

    @Test
    void debugReportsRuntimeError() {
        DebugResponse res = service.debug(new DebugRequest("python", "print('a')\nx = 1/0\n"));
        assertFalse(res.isSuccess());
        assertNotNull(res.getRuntimeError());
        assertNull(res.getSyntaxError());
        assertTrue(res.getRuntimeError().getMessage().toLowerCase().contains("zero"));
    }

    @Test
    void debugReportsSyntaxErrorShape() {
        DebugResponse res = service.debug(new DebugRequest("python", "def broken(:\n    pass\n"));
        assertFalse(res.isSuccess());
        assertNotNull(res.getSyntaxError());
        assertNull(res.getRuntimeError());
        assertEquals("SyntaxError", res.getSyntaxError().getType());
        assertFalse(res.getSteps().isEmpty());
        assertEquals("exception", res.getSteps().get(0).getEvent());
    }

    @Test
    void debugReportsSecurityViolation() {
        DebugResponse res = service.debug(new DebugRequest("javascript", "process.binding('net');"));
        assertFalse(res.isSuccess());
        assertNotNull(res.getRuntimeError());
        assertEquals("SecurityPolicyViolation", res.getRuntimeError().getType());
        assertFalse(res.getSteps().isEmpty());
    }

    @Test
    void debugHandlesUnsupportedLanguage() {
        DebugResponse res = service.debug(new DebugRequest("brainfuck", "+++."));
        assertFalse(res.isSuccess());
        assertNotNull(res.getRuntimeError());
        assertEquals("UnsupportedLanguage", res.getRuntimeError().getType());
    }

    @Test
    void debugJavaScriptSuccess() {
        DebugResponse res = service.debug(new DebugRequest("javascript", "let total = 0;\nfor (let i=1; i<=5; i++) total += i;\nconsole.log(total);\n"));
        assertTrue(res.isSuccess());
        assertTrue(res.getFinalOutput().contains("15"));
    }
}