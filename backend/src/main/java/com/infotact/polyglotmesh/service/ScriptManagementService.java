package com.infotact.polyglotmesh.service;

import com.infotact.polyglotmesh.dto.ScriptRequest;
import com.infotact.polyglotmesh.entity.SavedScriptEntity;
import com.infotact.polyglotmesh.exception.ResourceNotFoundException;
import com.infotact.polyglotmesh.repository.SavedScriptRepository;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.UUID;

@Service
public class ScriptManagementService {

    private final SavedScriptRepository scriptRepository;

    public ScriptManagementService(SavedScriptRepository scriptRepository) {
        this.scriptRepository = scriptRepository;
    }

    public Flux<SavedScriptEntity> listScripts() {
        return scriptRepository.findAllOrderByUpdatedAtDesc();
    }

    public Mono<SavedScriptEntity> getScript(String id) {
        return scriptRepository.findById(id)
                .switchIfEmpty(Mono.error(new ResourceNotFoundException("Script not found with id: " + id)));
    }

    public Mono<SavedScriptEntity> createScript(ScriptRequest request) {
        Instant now = Instant.now();
        SavedScriptEntity entity = new SavedScriptEntity();
        entity.setId("script-" + UUID.randomUUID().toString().substring(0, 8));
        entity.setName(request.getName().trim());
        entity.setLanguage(request.getLanguage());
        entity.setCode(request.getCode());
        entity.setDescription(request.getDescription());
        entity.setAuthor(request.getAuthor() != null ? request.getAuthor() : "Infotact Intern");
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        entity.markNew(true);
        return scriptRepository.save(entity);
    }

    public Mono<SavedScriptEntity> updateScript(String id, ScriptRequest request) {
        return getScript(id).flatMap(existing -> {
            existing.setName(request.getName().trim());
            existing.setLanguage(request.getLanguage());
            existing.setCode(request.getCode());
            existing.setDescription(request.getDescription());
            if (request.getAuthor() != null) {
                existing.setAuthor(request.getAuthor());
            }
            existing.setUpdatedAt(Instant.now());
            existing.markNew(false);
            return scriptRepository.save(existing);
        });
    }

    public Mono<Void> deleteScript(String id) {
        return getScript(id).flatMap(scriptRepository::delete);
    }
}
