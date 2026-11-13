package com.infotact.polyglotmesh.repository;

import com.infotact.polyglotmesh.entity.SavedScriptEntity;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

public interface SavedScriptRepository extends ReactiveCrudRepository<SavedScriptEntity, String> {

    @Query("SELECT * FROM saved_scripts ORDER BY updated_at DESC")
    Flux<SavedScriptEntity> findAllOrderByUpdatedAtDesc();
}
