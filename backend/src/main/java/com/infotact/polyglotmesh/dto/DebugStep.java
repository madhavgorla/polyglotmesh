package com.infotact.polyglotmesh.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;
import java.util.Map;

/**
 * A single trace step of the PolyglotMesh debugger.
 * Mirrors the front-end DebugStep contract consumed by the visualiser.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DebugStep {

    private int step;
    private int line;
    private String event;          // line | call | return | exception
    private String functionName;
    private Map<String, Object> locals;
    private List<DebugStackFrame> stack;
    private String stdout;
    private DebugRuntimeError error;
    private Object returnValue;
    private String caption;

    public DebugStep() {
    }

    public int getStep() {
        return step;
    }

    public void setStep(int step) {
        this.step = step;
    }

    public int getLine() {
        return line;
    }

    public void setLine(int line) {
        this.line = line;
    }

    public String getEvent() {
        return event;
    }

    public void setEvent(String event) {
        this.event = event;
    }

    public String getFunctionName() {
        return functionName;
    }

    public void setFunctionName(String functionName) {
        this.functionName = functionName;
    }

    public Map<String, Object> getLocals() {
        return locals;
    }

    public void setLocals(Map<String, Object> locals) {
        this.locals = locals;
    }

    public List<DebugStackFrame> getStack() {
        return stack;
    }

    public void setStack(List<DebugStackFrame> stack) {
        this.stack = stack;
    }

    public String getStdout() {
        return stdout;
    }

    public void setStdout(String stdout) {
        this.stdout = stdout;
    }

    public DebugRuntimeError getError() {
        return error;
    }

    public void setError(DebugRuntimeError error) {
        this.error = error;
    }

    public Object getReturnValue() {
        return returnValue;
    }

    public void setReturnValue(Object returnValue) {
        this.returnValue = returnValue;
    }

    public String getCaption() {
        return caption;
    }

    public void setCaption(String caption) {
        this.caption = caption;
    }
}