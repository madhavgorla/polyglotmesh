package com.infotact.polyglotmesh.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request DTO for POST /api/check-syntax.
 * Carries the source code and language for fast, non-executing syntax validation.
 */
public class CheckSyntaxRequest {

    @NotBlank(message = "language is required")
    private String language;

    private String code;

    public CheckSyntaxRequest() {
    }

    public CheckSyntaxRequest(String language, String code) {
        this.language = language;
        this.code = code;
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
}