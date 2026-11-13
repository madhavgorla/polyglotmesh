package com.infotact.polyglotmesh.controller;

import com.infotact.polyglotmesh.dto.ExecutionRequest;
import com.infotact.polyglotmesh.dto.ExecutionResponse;
import com.infotact.polyglotmesh.execution.GraalPolyglotExecutionService;
import com.infotact.polyglotmesh.service.ExecutionHistoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@Tag(name = "Execution API", description = "Execute sandboxed guest code and inspect runtime telemetry")
public class ExecutionController {

    private static final Logger log = LoggerFactory.getLogger(ExecutionController.class);

    private final GraalPolyglotExecutionService executionService;
    private final ExecutionHistoryService historyService;

    public ExecutionController(
            GraalPolyglotExecutionService executionService,
            ExecutionHistoryService historyService
    ) {
        this.executionService = executionService;
        this.historyService = historyService;
    }

    @PostMapping(
            value = "/execute",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @Operation(summary = "Execute code inside an isolated GraalVM Polyglot Context")
    public Mono<ResponseEntity<ExecutionResponse>> executeCode(@Valid @RequestBody ExecutionRequest request) {
        log.info("Executing {} script ({} chars)", request.getLanguage(), request.getCode().length());

        return Mono.fromCallable(() -> executionService.execute(request))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(response -> historyService.recordExecution(request.getCode(), response)
                        .onErrorResume(err -> {
                            log.warn("Non-fatal error persisting execution history: {}", err.getMessage());
                            return Mono.empty();
                        })
                        .thenReturn(ResponseEntity.ok(response)))
                .onErrorResume(ex -> {
                    log.error("Execution pipeline failure: {}", ex.getMessage());
                    ExecutionResponse failureResponse = ExecutionResponse.failure(
                            null, request.getLanguage(), "", "Internal execution failure.", 0, "WebFlux Controller"
                    );
                    return Mono.just(ResponseEntity.internalServerError().body(failureResponse));
                });
    }

    @GetMapping("/history")
    @Operation(summary = "Retrieve paginated execution history")
    public Mono<Map<String, Object>> getHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return historyService.getPagedHistory(page, size);
    }

    @GetMapping("/metrics")
    @Operation(summary = "Retrieve performance dashboard metrics")
    public Mono<Map<String, Object>> getMetrics() {
        return historyService.getPerformanceMetrics();
    }

    @GetMapping("/health")
    @Operation(summary = "Check application health and GraalVM language runtime availability")
    public Mono<Map<String, Object>> getHealth() {
        Map<String, Object> runtimes = new LinkedHashMap<>();
        runtimes.put("javascript", executionService.isLanguageAvailable("javascript"));
        runtimes.put("python", executionService.isLanguageAvailable("python"));
        runtimes.put("ruby", executionService.isLanguageAvailable("ruby"));

        Map<String, Object> health = new LinkedHashMap<>();
        health.put("status", "UP");
        health.put("platform", "PolyglotMesh Backend (Spring WebFlux + Java 21)");
        health.put("graalvmVersion", "24.1.1");
        health.put("javaVersion", System.getProperty("java.version"));
        health.put("installedGraalLanguages", executionService.getAvailableGraalLanguages());
        health.put("runtimes", runtimes);
        return Mono.just(health);
    }
}
