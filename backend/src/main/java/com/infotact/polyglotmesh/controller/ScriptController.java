package com.infotact.polyglotmesh.controller;

import com.infotact.polyglotmesh.dto.ScriptRequest;
import com.infotact.polyglotmesh.entity.SavedScriptEntity;
import com.infotact.polyglotmesh.service.ScriptManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api/scripts")
@Tag(name = "Script Persistence API", description = "CRUD endpoints for saved scripts in PostgreSQL")
public class ScriptController {

    private final ScriptManagementService scriptService;

    public ScriptController(ScriptManagementService scriptService) {
        this.scriptService = scriptService;
    }

    @GetMapping
    @Operation(summary = "List all saved scripts")
    public Mono<Map<String, Object>> listScripts() {
        return scriptService.listScripts().collectList()
                .map(scripts -> Map.of("success", true, "scripts", scripts));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Retrieve a single saved script by ID")
    public Mono<Map<String, Object>> getScript(@PathVariable String id) {
        return scriptService.getScript(id)
                .map(script -> Map.of("success", true, "script", script));
    }

    @PostMapping
    @Operation(summary = "Save a new script")
    public Mono<ResponseEntity<Map<String, Object>>> createScript(@Valid @RequestBody ScriptRequest request) {
        return scriptService.createScript(request)
                .map(saved -> ResponseEntity.status(HttpStatus.CREATED)
                        .body(Map.of("success", true, "script", saved)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing saved script")
    public Mono<Map<String, Object>> updateScript(
            @PathVariable String id,
            @Valid @RequestBody ScriptRequest request
    ) {
        return scriptService.updateScript(id, request)
                .map(updated -> Map.of("success", true, "script", updated));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a saved script")
    public Mono<Map<String, Object>> deleteScript(@PathVariable String id) {
        return scriptService.deleteScript(id)
                .thenReturn(Map.of("success", true, "message", "Script deleted successfully"));
    }
}
