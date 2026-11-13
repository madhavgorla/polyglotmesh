package com.polyglotmesh.execution;

import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.HostAccess;
import org.graalvm.polyglot.PolyglotException;
import org.graalvm.polyglot.io.IOAccess;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@Service
public class PolyglotExecutionService {
    public record Result(String output, long executionTimeMs) {}

    public Result execute(String language, String code) {
        String id = normalizeLanguage(language);
        if (!id.equals("js")) {
            throw new IllegalArgumentException("Language '" + language + "' is not configured. This starter currently enables JavaScript; add and verify GraalPy before enabling Python.");
        }
        long started = System.nanoTime();
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (Context context = Context.newBuilder("js")
                .allowHostAccess(HostAccess.NONE)
                .allowHostClassLookup(name -> false)
                .allowIO(IOAccess.NONE)
                .allowCreateThread(false)
                .allowNativeAccess(false)
                .out((OutputStream) output)
                .err((OutputStream) output)
                .build()) {
            context.eval("js", code);
            return new Result(output.toString(StandardCharsets.UTF_8), (System.nanoTime() - started) / 1_000_000);
        } catch (PolyglotException e) {
            String message = e.isSyntaxError() ? "Syntax error: " + e.getMessage() : "Execution error: " + e.getMessage();
            throw new ExecutionFailure(message, (System.nanoTime() - started) / 1_000_000);
        }
    }

    private String normalizeLanguage(String language) {
        if (language == null) throw new IllegalArgumentException("Language is required.");
        return switch (language.trim().toLowerCase()) {
            case "js", "javascript" -> "js";
            default -> language.trim().toLowerCase();
        };
    }

    public static class ExecutionFailure extends RuntimeException {
        private final long executionTimeMs;
        public ExecutionFailure(String message, long executionTimeMs) {
            super(message); this.executionTimeMs = executionTimeMs;
        }
        public long getExecutionTimeMs() { return executionTimeMs; }
    }
}
