package com.infotact.polyglotmesh.security;

import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Defense-in-depth static pre-flight check before entering GraalVM Polyglot Context.
 * Complements Context-level HostAccess.NONE and IOAccess.NONE restrictions.
 */
@Component
public class CodeSecurityValidator {

    private static final Pattern PYTHON_BLOCKED = Pattern.compile(
            "(?i)(subprocess|import\\s+pty|os\\.system|os\\.popen|os\\.spawn|__import__\\(['\"]os['\"]\\)\\.system)"
    );

    private static final Pattern JS_BLOCKED = Pattern.compile(
            "(?i)(child_process|process\\.exit|process\\.kill|process\\.binding|global\\.process|this\\.constructor\\.constructor)"
    );

    private static final Pattern RUBY_BLOCKED = Pattern.compile(
            "(?i)(system\\(|exec\\(|`[^`]+`|%x\\{|open3|io\\.popen)"
    );

    public Optional<String> validate(String language, String code) {
        if (code == null || code.isBlank()) {
            return Optional.empty();
        }
        return switch (language.toLowerCase()) {
            case "python" -> PYTHON_BLOCKED.matcher(code).find()
                    ? Optional.of("Host process execution and restricted OS invocations are prohibited by PolyglotMesh policy.")
                    : Optional.empty();
            case "javascript" -> JS_BLOCKED.matcher(code).find()
                    ? Optional.of("Process access and constructor prototype escapes are prohibited by PolyglotMesh policy.")
                    : Optional.empty();
            case "ruby" -> RUBY_BLOCKED.matcher(code).find()
                    ? Optional.of("Shell subcommand execution is prohibited by PolyglotMesh policy.")
                    : Optional.empty();
            default -> Optional.empty();
        };
    }
}
