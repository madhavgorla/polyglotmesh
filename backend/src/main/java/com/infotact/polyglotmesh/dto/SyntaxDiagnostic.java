package com.infotact.polyglotmesh.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * A single syntax diagnostic marker, matching the Monaco diagnostic contract
 * returned by the front-end dev-server's /api/check-syntax.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SyntaxDiagnostic {

    private int line;
    private Integer column;
    private String message;
    private String severity;
    private String text;

    public SyntaxDiagnostic() {
    }

    public SyntaxDiagnostic(int line, Integer column, String message, String severity) {
        this.line = line;
        this.column = column;
        this.message = message;
        this.severity = severity;
    }

    public SyntaxDiagnostic(int line, Integer column, String message, String severity, String text) {
        this(line, column, message, severity);
        this.text = text;
    }

    public int getLine() {
        return line;
    }

    public void setLine(int line) {
        this.line = line;
    }

    public Integer getColumn() {
        return column;
    }

    public void setColumn(Integer column) {
        this.column = column;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }
}