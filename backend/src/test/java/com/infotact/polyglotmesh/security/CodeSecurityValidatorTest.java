package com.infotact.polyglotmesh.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Defense-in-depth pre-flight policy unit tests for CodeSecurityValidator
 * (Hariom Verma - GraalVM Core & Sandbox Lead).
 *
 * Verifies blocked OS / process / prototype-escape signatures are rejected
 * before they ever reach a GraalVM Context, while benign guest code is allowed.
 */
class CodeSecurityValidatorTest {

    private final CodeSecurityValidator validator = new CodeSecurityValidator();

    // ---------- Python ----------

    @Test
    @DisplayName("Python: subprocess import is blocked")
    void pythonSubprocessBlocked() {
        assertTrue(validator.validate("python", "import subprocess\nsubprocess.call(['rm', '-rf', '/'])").isPresent());
    }

    @Test
    @DisplayName("Python: os.system / os.popen are blocked")
    void pythonOsSystemBlocked() {
        assertTrue(validator.validate("python", "import os\nos.system('whoami')").isPresent());
        assertTrue(validator.validate("python", "import os\nos.popen('ls').read()").isPresent());
    }

    @Test
    @DisplayName("Python: __import__('os').system escape is blocked")
    void pythonDunderImportEscapeBlocked() {
        assertTrue(validator.validate("python", "__import__('os').system('rm -rf /')").isPresent());
    }

    @Test
    @DisplayName("Python: benign numeric / print code is allowed")
    void pythonBenignAllowed() {
        assertTrue(validator.validate("python", "print(sum(range(10)))").isEmpty());
        assertTrue(validator.validate("python", "x = [i * 2 for i in range(5)]\nprint(x)").isEmpty());
    }

    // ---------- JavaScript ----------

    @Test
    @DisplayName("JavaScript: child_process usage is blocked")
    void jsChildProcessBlocked() {
        assertTrue(validator.validate("javascript", "require('child_process').execSync('id')").isPresent());
    }

    @Test
    @DisplayName("JavaScript: process.exit and prototype constructor escapes are blocked")
    void jsProcessAndPrototypeEscapeBlocked() {
        assertTrue(validator.validate("javascript", "process.exit(1)").isPresent());
        assertTrue(validator.validate("javascript", "this.constructor.constructor('return process')()").isPresent());
    }

    @Test
    @DisplayName("JavaScript: benign function and console output are allowed")
    void jsBenignAllowed() {
        assertTrue(validator.validate("javascript", "console.log('hello'); function add(a,b){return a+b;} add(2,3);").isEmpty());
    }

    // ---------- Ruby ----------

    @Test
    @DisplayName("Ruby: system() / exec() shell invocation is blocked")
    void rubySystemExecBlocked() {
        assertTrue(validator.validate("ruby", "system('ls -la')").isPresent());
        assertTrue(validator.validate("ruby", "exec('cat /etc/passwd')").isPresent());
    }

    @Test
    @DisplayName("Ruby: open3 shell library is blocked")
    void rubyOpen3Blocked() {
        assertTrue(validator.validate("ruby", "require 'open3'\nOpen3.capture2('id')").isPresent());
    }

    @Test
    @DisplayName("Ruby: benign puts and arithmetic are allowed")
    void rubyBenignAllowed() {
        assertTrue(validator.validate("ruby", "puts 'hi'\nputs(2 + 3 * 4)").isEmpty());
    }

    // ---------- Edge cases ----------

    @Test
    @DisplayName("Edge: null and blank code never trigger a violation")
    void nullAndBlankCodeAllowed() {
        assertFalse(validator.validate("python", "").isPresent());
        assertFalse(validator.validate("javascript", null).isPresent());
        assertFalse(validator.validate("ruby", "   ").isPresent());
    }

    @Test
    @DisplayName("Edge: case-insensitive blocked keyword still caught")
    void caseInsensitiveBlocked() {
        assertTrue(validator.validate("python", "import OS\nOS.System('whoami')").isPresent());
    }
}