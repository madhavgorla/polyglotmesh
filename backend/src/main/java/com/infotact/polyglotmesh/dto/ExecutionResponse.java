package com.infotact.polyglotmesh.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Map;

/**
 * Uniform Execution Response DTO:
 * Includes success, language, output, error, executionTimeMs, executionId, engine, and sandboxAudit.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ExecutionResponse {

    private boolean success;
    private String executionId;
    private String language;
    private String output;
    private String error;
    private long executionTimeMs;
    private Double memoryUsedMb;
    private Long peakMemoryKb;
    private Long allocatedBytes;
    private String engine;
    private Map<String, Object> sandboxAudit;

    public ExecutionResponse() {
    }

    public ExecutionResponse(boolean success, String executionId, String language, String output, String error, long executionTimeMs) {
        this.success = success;
        this.executionId = executionId;
        this.language = language;
        this.output = output != null ? output : "";
        this.error = error;
        this.executionTimeMs = executionTimeMs;
    }

    public static ExecutionResponse success(String executionId, String language, String output, long executionTimeMs, String engine) {
        ExecutionResponse response = new ExecutionResponse(true, executionId, language, output, null, executionTimeMs);
        response.setEngine(engine);
        return response;
    }

    public static ExecutionResponse failure(String executionId, String language, String output, String error, long executionTimeMs, String engine) {
        ExecutionResponse response = new ExecutionResponse(false, executionId, language, output, error, executionTimeMs);
        response.setEngine(engine);
        return response;
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public String getExecutionId() { return executionId; }
    public void setExecutionId(String executionId) { this.executionId = executionId; }
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    public String getOutput() { return output; }
    public void setOutput(String output) { this.output = output; }
    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
    public long getExecutionTimeMs() { return executionTimeMs; }
    public void setExecutionTimeMs(long executionTimeMs) { this.executionTimeMs = executionTimeMs; }
    public Double getMemoryUsedMb() { return memoryUsedMb; }
    public void setMemoryUsedMb(Double memoryUsedMb) { this.memoryUsedMb = memoryUsedMb; }
    public Long getPeakMemoryKb() { return peakMemoryKb; }
    public void setPeakMemoryKb(Long peakMemoryKb) { this.peakMemoryKb = peakMemoryKb; }
    public Long getAllocatedBytes() { return allocatedBytes; }
    public void setAllocatedBytes(Long allocatedBytes) { this.allocatedBytes = allocatedBytes; }
    public String getEngine() { return engine; }
    public void setEngine(String engine) { this.engine = engine; }
    public Map<String, Object> getSandboxAudit() { return sandboxAudit; }
    public void setSandboxAudit(Map<String, Object> sandboxAudit) { this.sandboxAudit = sandboxAudit; }
}
