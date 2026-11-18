package com.infotact.polyglotmesh.controller;

import com.infotact.polyglotmesh.dto.CheckSyntaxRequest;
import com.infotact.polyglotmesh.dto.DebugRequest;
import com.infotact.polyglotmesh.dto.DebugResponse;
import com.infotact.polyglotmesh.dto.DebugRuntimeError;
import com.infotact.polyglotmesh.dto.SyntaxCheckResponse;
import com.infotact.polyglotmesh.execution.GraalPolyglotExecutionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

/**
 * Live editor endpoints backing the front-end's check-while-you-type and step-debug UI.
 * /api/check-syntax is a pure parse (no execution, no concurrency slot); /api/debug runs
 * inside the hardened sandbox.
 */
@RestController
@RequestMapping("/api")
@Tag(name = "Debug API", description = "Live syntax checking and step debugging for the visualiser editors")
public class DebugController {

    private static final Logger log = LoggerFactory.getLogger(DebugController.class);

    private final GraalPolyglotExecutionService executionService;

    public DebugController(GraalPolyglotExecutionService executionService) {
        this.executionService = executionService;
    }

    @PostMapping(
            value = "/check-syntax",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @Operation(summary = "Fast GraalVM parse-only syntax check (no execution)")
    public Mono<SyntaxCheckResponse> checkSyntax(@Valid @RequestBody CheckSyntaxRequest request) {
        log.debug("check-syntax called (language={}, {} chars)", request.getLanguage(),
                request.getCode() == null ? 0 : request.getCode().length());
        SyntaxCheckResponse response = executionService.checkSyntax(request.getLanguage(), request.getCode());
        return Mono.just(response);
    }

    @PostMapping(
            value = "/debug",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @Operation(summary = "Sandboxed step-debug with syntax and runtime error reporting")
    public Mono<ResponseEntity<DebugResponse>> debug(@Valid @RequestBody DebugRequest request) {
        log.info("debug called (language={}, {} chars, timeout={})", request.getLanguage(),
                request.getCode() == null ? 0 : request.getCode().length(), request.getTimeoutMs());
        return Mono.fromCallable(() -> executionService.debug(request))
                .subscribeOn(Schedulers.boundedElastic())
                .map(ResponseEntity::ok)
                .onErrorResume(ex -> {
                    log.error("Debug pipeline failure: {}", ex.getMessage());
                    DebugResponse failure = DebugResponse.failure(request.getLanguage(), java.util.List.of(),
                            null, new DebugRuntimeError("DebuggerError", "Internal debug failure.", 1),
                            "", 0);
                    return Mono.just(ResponseEntity.status(500).body(failure));
                });
    }
}