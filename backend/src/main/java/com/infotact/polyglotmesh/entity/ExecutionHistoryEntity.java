package com.infotact.polyglotmesh.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.Instant;

@Table("execution_history")
public class ExecutionHistoryEntity implements Persistable<String> {

    @Id
    private String id;
    private String language;

    @Column("code_snippet")
    private String codeSnippet;

    private String output;
    private String error;

    @Column("execution_time_ms")
    private long executionTimeMs;

    private boolean success;
    private String engine;

    @Column("executed_at")
    private Instant executedAt;

    @org.springframework.data.annotation.Transient
    private boolean isNewRecord = true;

    public ExecutionHistoryEntity() {}

    @Override
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    public String getCodeSnippet() { return codeSnippet; }
    public void setCodeSnippet(String codeSnippet) { this.codeSnippet = codeSnippet; }
    public String getOutput() { return output; }
    public void setOutput(String output) { this.output = output; }
    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
    public long getExecutionTimeMs() { return executionTimeMs; }
    public void setExecutionTimeMs(long executionTimeMs) { this.executionTimeMs = executionTimeMs; }
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public String getEngine() { return engine; }
    public void setEngine(String engine) { this.engine = engine; }
    public Instant getExecutedAt() { return executedAt; }
    public void setExecutedAt(Instant executedAt) { this.executedAt = executedAt; }

    @Override
    public boolean isNew() { return isNewRecord; }
    public void markNew(boolean isNew) { this.isNewRecord = isNew; }
}
