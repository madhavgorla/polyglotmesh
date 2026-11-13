package com.infotact.polyglotmesh.repository;

import com.infotact.polyglotmesh.entity.ExecutionHistoryEntity;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

public interface ExecutionHistoryRepository extends ReactiveCrudRepository<ExecutionHistoryEntity, String> {

    @Query("SELECT * FROM execution_history ORDER BY executed_at DESC LIMIT :limit OFFSET :offset")
    Flux<ExecutionHistoryEntity> findPaged(int limit, long offset);
}
