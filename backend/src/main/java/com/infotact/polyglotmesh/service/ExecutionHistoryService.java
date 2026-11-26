package com.infotact.polyglotmesh.service;

import com.infotact.polyglotmesh.dto.ExecutionResponse;
import com.infotact.polyglotmesh.entity.ExecutionHistoryEntity;
import com.infotact.polyglotmesh.repository.ExecutionHistoryRepository;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ExecutionHistoryService {

    private final ExecutionHistoryRepository historyRepository;

    public ExecutionHistoryService(ExecutionHistoryRepository historyRepository) {
        this.historyRepository = historyRepository;
    }

    public Mono<ExecutionHistoryEntity> recordExecution(String code, ExecutionResponse response) {
        ExecutionHistoryEntity entity = new ExecutionHistoryEntity();
        entity.setId(response.getExecutionId());
        entity.setLanguage(response.getLanguage());
        entity.setCodeSnippet(code != null ? code.trim().substring(0, Math.min(code.trim().length(), 250)) : "");
        entity.setOutput(response.getOutput());
        entity.setError(response.getError());
        entity.setExecutionTimeMs(response.getExecutionTimeMs());
        entity.setPeakMemoryKb(response.getPeakMemoryKb() != null ? response.getPeakMemoryKb() : 0L);
        entity.setSuccess(response.isSuccess());
        entity.setEngine(response.getEngine());
        entity.setExecutedAt(Instant.now());
        entity.markNew(true);
        return historyRepository.save(entity);
    }

    public Mono<Map<String, Object>> getPagedHistory(int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);
        long offset = (long) safePage * safeSize;

        Mono<List<ExecutionHistoryEntity>> itemsMono = historyRepository.findPaged(safeSize, offset).collectList();
        Mono<Long> totalMono = historyRepository.count();

        return Mono.zip(itemsMono, totalMono).map(tuple -> {
            long total = tuple.getT2();
            int totalPages = (int) Math.ceil((double) total / safeSize);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("history", tuple.getT1());
            result.put("page", safePage);
            result.put("size", safeSize);
            result.put("totalElements", total);
            result.put("totalPages", totalPages);
            return result;
        });
    }

    public Mono<Map<String, Object>> getPerformanceMetrics() {
        return historyRepository.findAll().collectList().map(records -> {
            long total = records.size();
            long successCount = records.stream().filter(ExecutionHistoryEntity::isSuccess).count();
            long failureCount = total - successCount;
            double avgDuration = records.stream()
                    .mapToLong(ExecutionHistoryEntity::getExecutionTimeMs)
                    .average()
                    .orElse(0.0);

            double avgPeakKb = records.stream()
                    .mapToLong(r -> r.getPeakMemoryKb() != null ? r.getPeakMemoryKb() : 0L)
                    .average()
                    .orElse(0.0);

            Map<String, Long> byLanguage = new LinkedHashMap<>();
            byLanguage.put("python", records.stream().filter(r -> "python".equalsIgnoreCase(r.getLanguage())).count());
            byLanguage.put("javascript", records.stream().filter(r -> "javascript".equalsIgnoreCase(r.getLanguage())).count());
            byLanguage.put("ruby", records.stream().filter(r -> "ruby".equalsIgnoreCase(r.getLanguage())).count());

            Map<String, Object> metrics = new LinkedHashMap<>();
            metrics.put("totalExecutions", total);
            metrics.put("successCount", successCount);
            metrics.put("failureCount", failureCount);
            metrics.put("avgExecutionTimeMs", Math.round(avgDuration * 100.0) / 100.0);
            metrics.put("avgPeakMemoryKb", Math.round(avgPeakKb * 100.0) / 100.0);
            metrics.put("avgMemoryMb", Math.round((avgPeakKb / 1024.0) * 100.0) / 100.0);
            metrics.put("languageCounts", byLanguage);
            metrics.put("recentHistory", records.stream().limit(10).toList());
            return metrics;
        });
    }
}
