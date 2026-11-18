package com.infotact.polyglotmesh.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request DTO for POST /api/debug.
 * Supplies source and an optional per-request timeout (ms), clamped by the sandbox.
 */
public class DebugRequest {

    @NotBlank(message = "language is required")
    private String language;

    @NotBlank(message = "code is required")
    private String code;

    private Long timeoutMs;

    public DebugRequest() {
    }

    public DebugRequest(String language, String code) {
        this.language = language;
        this.code = code;
    }

    public DebugRequest(String language, String code, Long timeoutMs) {
        this.language = language;
        this.code = code;
        this.timeoutMs = timeoutMs;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public Long getTimeoutMs() {
        return timeoutMs;
    }

    public void setTimeoutMs(Long timeoutMs) {
        this.timeoutMs = timeoutMs;
    }
}