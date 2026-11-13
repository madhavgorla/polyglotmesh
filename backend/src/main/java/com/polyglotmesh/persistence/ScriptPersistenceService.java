package com.polyglotmesh.persistence;

import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentLinkedDeque;

@Service
public class ScriptPersistenceService {
    public record ExecutionEvent(String id, String language, boolean success, long executionTimeMs, Instant createdAt) {}
    private final ConcurrentLinkedDeque<ExecutionEvent> history = new ConcurrentLinkedDeque<>();
    private static final int MAX_HISTORY = 100;

    public void record(String language, boolean success, long executionTimeMs) {
        history.addFirst(new ExecutionEvent(UUID.randomUUID().toString(), language, success, executionTimeMs, Instant.now()));
        while (history.size() > MAX_HISTORY) history.pollLast();
    }
    public List<ExecutionEvent> history() { return List.copyOf(history); }
}
