package com.infotact.polyglotmesh.dto;

import java.util.List;

/**
 * Response DTO for POST /api/check-syntax.
 * Mirrors the front-end shape: { valid, errors: [ { line, column, message, severity } ] }.
 */
public class SyntaxCheckResponse {

    private boolean valid;
    private List<SyntaxDiagnostic> errors;

    public SyntaxCheckResponse() {
    }

    public SyntaxCheckResponse(boolean valid, List<SyntaxDiagnostic> errors) {
        this.valid = valid;
        this.errors = errors;
    }

    public static SyntaxCheckResponse valid() {
        return new SyntaxCheckResponse(true, List.of());
    }

    public static SyntaxCheckResponse invalid(List<SyntaxDiagnostic> errors) {
        return new SyntaxCheckResponse(false, errors);
    }

    public boolean isValid() {
        return valid;
    }

    public void setValid(boolean valid) {
        this.valid = valid;
    }

    public List<SyntaxDiagnostic> getErrors() {
        return errors;
    }

    public void setErrors(List<SyntaxDiagnostic> errors) {
        this.errors = errors;
    }
}