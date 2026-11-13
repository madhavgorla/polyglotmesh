package com.infotact.polyglotmesh.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * REST Request DTO for code execution.
 * Validates language ("javascript", "python", "ruby"), source code presence, and max size (64KB).
 */
public class ExecutionRequest {

    @NotBlank(message = "Language is required.")
    @Pattern(regexp = "^(?i)(python|javascript|js|ruby)$", message = "Unsupported language. Must be 'javascript', 'python', or 'ruby'.")
    private String language;

    @NotNull(message = "Code field cannot be null.")
    @Size(max = 65536, message = "Source code exceeds maximum size limit of 64KB (65536 bytes).")
    private String code;

    private Integer timeoutMs;

    public ExecutionRequest() {
    }

    public ExecutionRequest(String language, String code) {
        this.language = language;
        this.code = code;
    }

    public ExecutionRequest(String language, String code, Integer timeoutMs) {
        this.language = language;
        this.code = code;
        this.timeoutMs = timeoutMs;
    }

    public String getLanguage() {
        if (language == null) return null;
        String trimmed = language.trim().toLowerCase();
        return "js".equals(trimmed) ? "javascript" : trimmed;
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

    public Integer getTimeoutMs() {
        return timeoutMs;
    }

    public void setTimeoutMs(Integer timeoutMs) {
        this.timeoutMs = timeoutMs;
    }
}
