package com.infotact.polyglotmesh.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "polyglot")
public class PolyglotProperties {

    private Execution execution = new Execution();
    private Sandbox sandbox = new Sandbox();

    public Execution getExecution() {
        return execution;
    }

    public void setExecution(Execution execution) {
        this.execution = execution;
    }

    public Sandbox getSandbox() {
        return sandbox;
    }

    public void setSandbox(Sandbox sandbox) {
        this.sandbox = sandbox;
    }

    public static class Execution {
        private long defaultTimeoutMs = 3000;
        private long maxTimeoutMs = 5000;
        private int maxSourceSizeBytes = 65536;
        private int maxOutputLength = 65536;
        private long statementLimit = 100000;
        private int maxConcurrentExecutions = 16;

        public long getDefaultTimeoutMs() { return defaultTimeoutMs; }
        public void setDefaultTimeoutMs(long defaultTimeoutMs) { this.defaultTimeoutMs = defaultTimeoutMs; }
        public long getMaxTimeoutMs() { return maxTimeoutMs; }
        public void setMaxTimeoutMs(long maxTimeoutMs) { this.maxTimeoutMs = maxTimeoutMs; }
        public int getMaxSourceSizeBytes() { return maxSourceSizeBytes; }
        public void setMaxSourceSizeBytes(int maxSourceSizeBytes) { this.maxSourceSizeBytes = maxSourceSizeBytes; }
        public int getMaxOutputLength() { return maxOutputLength; }
        public void setMaxOutputLength(int maxOutputLength) { this.maxOutputLength = maxOutputLength; }
        public long getStatementLimit() { return statementLimit; }
        public void setStatementLimit(long statementLimit) { this.statementLimit = statementLimit; }
        public int getMaxConcurrentExecutions() { return maxConcurrentExecutions; }
        public void setMaxConcurrentExecutions(int maxConcurrentExecutions) { this.maxConcurrentExecutions = maxConcurrentExecutions; }
    }

    public static class Sandbox {
        private boolean allowHostAccess = false;
        private boolean allowIo = false;
        private boolean allowNativeAccess = false;
        private boolean allowProcessCreation = false;
        private boolean allowThreadCreation = false;
        private boolean allowEnvironmentAccess = false;

        public boolean isAllowHostAccess() { return allowHostAccess; }
        public void setAllowHostAccess(boolean allowHostAccess) { this.allowHostAccess = allowHostAccess; }
        public boolean isAllowIo() { return allowIo; }
        public void setAllowIo(boolean allowIo) { this.allowIo = allowIo; }
        public boolean isAllowNativeAccess() { return allowNativeAccess; }
        public void setAllowNativeAccess(boolean allowNativeAccess) { this.allowNativeAccess = allowNativeAccess; }
        public boolean isAllowProcessCreation() { return allowProcessCreation; }
        public void setAllowProcessCreation(boolean allowProcessCreation) { this.allowProcessCreation = allowProcessCreation; }
        public boolean isAllowThreadCreation() { return allowThreadCreation; }
        public void setAllowThreadCreation(boolean allowThreadCreation) { this.allowThreadCreation = allowThreadCreation; }
        public boolean isAllowEnvironmentAccess() { return allowEnvironmentAccess; }
        public void setAllowEnvironmentAccess(boolean allowEnvironmentAccess) { this.allowEnvironmentAccess = allowEnvironmentAccess; }
    }
}
