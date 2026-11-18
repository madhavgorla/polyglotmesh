package com.infotact.polyglotmesh.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * Response DTO for POST /api/debug.
 * Mirrors the front-end DebugResponse contract:
 * { success, language, steps[], syntaxError?, runtimeError?, finalOutput, executionTimeMs, truncated? }.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DebugResponse {

    private boolean success;
    private String language;
    private List<DebugStep> steps;
    private DebugRuntimeError syntaxError;
    private DebugRuntimeError runtimeError;
    private String finalOutput;
    private long executionTimeMs;
    private Boolean truncated;

    public DebugResponse() {
    }

    public DebugResponse(
            boolean success,
            String language,
            List<DebugStep> steps,
            DebugRuntimeError syntaxError,
            DebugRuntimeError runtimeError,
            String finalOutput,
            long executionTimeMs
    ) {
        this.success = success;
        this.language = language;
        this.steps = steps;
        this.syntaxError = syntaxError;
        this.runtimeError = runtimeError;
        this.finalOutput = finalOutput;
        this.executionTimeMs = executionTimeMs;
    }

    public static DebugResponse ok(String language, List<DebugStep> steps, String finalOutput, long executionTimeMs) {
        return new DebugResponse(true, language, steps, null, null, finalOutput, executionTimeMs);
    }

    public static DebugResponse failure(String language, List<DebugStep> steps,
                                        DebugRuntimeError syntaxError, DebugRuntimeError runtimeError,
                                        String finalOutput, long executionTimeMs) {
        return new DebugResponse(false, language, steps, syntaxError, runtimeError, finalOutput, executionTimeMs);
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public List<DebugStep> getSteps() {
        return steps;
    }

    public void setSteps(List<DebugStep> steps) {
        this.steps = steps;
    }

    public DebugRuntimeError getSyntaxError() {
        return syntaxError;
    }

    public void setSyntaxError(DebugRuntimeError syntaxError) {
        this.syntaxError = syntaxError;
    }

    public DebugRuntimeError getRuntimeError() {
        return runtimeError;
    }

    public void setRuntimeError(DebugRuntimeError runtimeError) {
        this.runtimeError = runtimeError;
    }

    public String getFinalOutput() {
        return finalOutput;
    }

    public void setFinalOutput(String finalOutput) {
        this.finalOutput = finalOutput;
    }

    public long getExecutionTimeMs() {
        return executionTimeMs;
    }

    public void setExecutionTimeMs(long executionTimeMs) {
        this.executionTimeMs = executionTimeMs;
    }

    public Boolean getTruncated() {
        return truncated;
    }

    public void setTruncated(Boolean truncated) {
        this.truncated = truncated;
    }
}