package com.polyglotmesh.api;

import com.polyglotmesh.execution.PolyglotExecutionService;
import com.polyglotmesh.persistence.ScriptPersistenceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;
import java.util.List;

@RestController
@RequestMapping("/api")
public class ExecutionController {
    private final PolyglotExecutionService executionService;
    private final ScriptPersistenceService persistenceService;
    public ExecutionController(PolyglotExecutionService executionService, ScriptPersistenceService persistenceService) {
        this.executionService = executionService; this.persistenceService = persistenceService;
    }

    @PostMapping("/execute")
    public Mono<ExecuteResponse> execute(@Valid @RequestBody ExecuteRequest request) {
        return Mono.fromCallable(() -> {
            long start = System.nanoTime();
            try {
                var result = executionService.execute(request.language(), request.code());
                persistenceService.record(request.language(), true, result.executionTimeMs());
                return ExecuteResponse.ok(result.output(), result.executionTimeMs());
            } catch (PolyglotExecutionService.ExecutionFailure e) {
                persistenceService.record(request.language(), false, e.getExecutionTimeMs());
                return ExecuteResponse.fail(e.getMessage(), e.getExecutionTimeMs());
            } catch (IllegalArgumentException e) {
                long ms = (System.nanoTime() - start) / 1_000_000;
                persistenceService.record(request.language(), false, ms);
                return ExecuteResponse.fail(e.getMessage(), ms);
            }
        }).subscribeOn(Schedulers.boundedElastic());
    }

    @GetMapping("/history")
    public List<ScriptPersistenceService.ExecutionEvent> history() { return persistenceService.history(); }

    @GetMapping("/health")
    public String health() { return "PolyglotMesh API is running"; }
}
