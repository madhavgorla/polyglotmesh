package com.infotact.polyglotmesh.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * A runtime (or syntax) error reported by the debugger.
 * Mirrors the front-end shape: { type, message, line, column? }.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DebugRuntimeError {

    private String type;
    private String message;
    private int line;
    private Integer column;

    public DebugRuntimeError() {
    }

    public DebugRuntimeError(String type, String message, int line) {
        this.type = type;
        this.message = message;
        this.line = line;
    }

    public DebugRuntimeError(String type, String message, int line, Integer column) {
        this.type = type;
        this.message = message;
        this.line = line;
        this.column = column;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
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
}