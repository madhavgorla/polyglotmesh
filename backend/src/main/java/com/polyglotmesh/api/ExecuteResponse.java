package com.polyglotmesh.api;

public record ExecuteResponse(boolean success, String output, String error, long executionTimeMs) {
    public static ExecuteResponse ok(String output, long ms) {
        return new ExecuteResponse(true, output, null, ms);
    }
    public static ExecuteResponse fail(String error, long ms) {
        return new ExecuteResponse(false, "", error, ms);
    }
}
