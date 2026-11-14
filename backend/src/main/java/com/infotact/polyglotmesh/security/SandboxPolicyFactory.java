package com.infotact.polyglotmesh.security;

import com.infotact.polyglotmesh.config.PolyglotProperties;
import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Engine;
import org.graalvm.polyglot.EnvironmentAccess;
import org.graalvm.polyglot.HostAccess;
import org.graalvm.polyglot.ResourceLimits;
import org.graalvm.polyglot.io.IOAccess;
import org.springframework.stereotype.Component;

import java.io.OutputStream;
import java.util.Map;

/**
 * Builds hardened GraalVM Polyglot Contexts with explicit least-privilege security controls.
 * Does NOT rely on Java's deprecated SecurityManager.
 */
@Component
public class SandboxPolicyFactory {

    private final PolyglotProperties properties;

    public SandboxPolicyFactory(PolyglotProperties properties) {
        this.properties = properties;
    }

    public Context buildIsolatedContext(
            String graalLanguage,
            Engine sharedEngine,
            OutputStream stdout,
            OutputStream stderr
    ) {
        ResourceLimits limits = ResourceLimits.newBuilder()
                .statementLimit(properties.getExecution().getStatementLimit(), null)
                .build();

        Context.Builder builder = Context.newBuilder(graalLanguage)
                .engine(sharedEngine)
                .allowAllAccess(false)
                .allowHostAccess(HostAccess.NONE)
                .allowIO(IOAccess.NONE)
                .allowNativeAccess(false)
                .allowCreateProcess(false)
                .allowCreateThread(false)
                .allowEnvironmentAccess(EnvironmentAccess.NONE)
                .allowExperimentalOptions(true)
                .resourceLimits(limits)
                .out(stdout)
                .err(stderr);

        if ("js".equals(graalLanguage)) {
            builder.option("js.ecmascript-version", "2022")
                    .option("js.intl-402", "true")
                    .option("js.load", "false")
                    .option("js.console", "true");
        } else if ("python".equals(graalLanguage)) {
            builder.option("python.DontWriteBytecodeFlag", "true")
                    .option("python.IgnoreEnvironmentFlag", "true");
        }

        return builder.build();
    }

    public Context buildRestrictedInteropContext(String graalLanguage, Engine sharedEngine) {
        ResourceLimits limits = ResourceLimits.newBuilder()
                .statementLimit(properties.getExecution().getStatementLimit(), null)
                .build();

        // Restricted context used strictly for Module E (Cross-Language Pricing Map Exchange)
        // Uses ProxyObject bindings without exposing general Java classes or reflection.
        return Context.newBuilder(graalLanguage)
                .engine(sharedEngine)
                .allowAllAccess(false)
                .allowHostAccess(HostAccess.NONE)
                .allowIO(IOAccess.NONE)
                .allowNativeAccess(false)
                .allowCreateProcess(false)
                .allowCreateThread(false)
                .allowEnvironmentAccess(EnvironmentAccess.NONE)
                .allowExperimentalOptions(true)
                .resourceLimits(limits)
                .build();
    }

    public Map<String, Object> createAuditSnapshot(long deadlineMs) {
        return Map.of(
                "hostAccessDenied", !properties.getSandbox().isAllowHostAccess(),
                "ioDenied", !properties.getSandbox().isAllowIo(),
                "networkDenied", true,
                "processDenied", !properties.getSandbox().isAllowProcessCreation(),
                "environmentAccessDenied", !properties.getSandbox().isAllowEnvironmentAccess(),
                "statementLimit", properties.getExecution().getStatementLimit(),
                "deadlineMs", deadlineMs
        );
    }
}
