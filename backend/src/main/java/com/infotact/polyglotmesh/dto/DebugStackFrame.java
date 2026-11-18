package com.infotact.polyglotmesh.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Map;

/**
 * A single entry of the call stack captured in a debug step.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DebugStackFrame {

    private String functionName;
    private int line;
    private Map<String, Object> locals;

    public DebugStackFrame() {
    }

    public DebugStackFrame(String functionName, int line, Map<String, Object> locals) {
        this.functionName = functionName;
        this.line = line;
        this.locals = locals;
    }

    public String getFunctionName() {
        return functionName;
    }

    public void setFunctionName(String functionName) {
        this.functionName = functionName;
    }

    public int getLine() {
        return line;
    }

    public void setLine(int line) {
        this.line = line;
    }

    public Map<String, Object> getLocals() {
        return locals;
    }

    public void setLocals(Map<String, Object> locals) {
        this.locals = locals;
    }
}