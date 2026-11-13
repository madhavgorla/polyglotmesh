package com.infotact.polyglotmesh.controller;

import com.infotact.polyglotmesh.dto.InteropPricingRequest;
import com.infotact.polyglotmesh.dto.InteropPricingRequest.InteropPricingResponse;
import com.infotact.polyglotmesh.execution.CrossLanguageInteropService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@RestController
@RequestMapping("/api/interop")
@Tag(name = "Cross-Language Interop API", description = "Direct Java-to-Guest Polyglot data exchange without JSON serialization")
public class InteropController {

    private final CrossLanguageInteropService interopService;

    public InteropController(CrossLanguageInteropService interopService) {
        this.interopService = interopService;
    }

    @PostMapping("/pricing")
    @Operation(summary = "Transform a Java pricing Map inside a restricted Python or JavaScript GraalVM context")
    public Mono<InteropPricingResponse> transformPricing(@Valid @RequestBody InteropPricingRequest request) {
        return Mono.fromCallable(() -> interopService.transformPricingData(request))
                .subscribeOn(Schedulers.boundedElastic());
    }
}
