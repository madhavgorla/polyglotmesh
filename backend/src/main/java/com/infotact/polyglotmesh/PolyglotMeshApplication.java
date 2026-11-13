package com.infotact.polyglotmesh;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * PolyglotMesh Backend - Team 6 (Infotact Solutions)
 * Architecture: Java 17, Spring WebFlux, GraalVM Polyglot (GraalPy & GraalJS)
 *
 * Team Roles:
 * - Hariom Verma: Runtime setup, polyglot execution, sandbox configuration
 * - Naveen: WebFlux REST endpoints, validation, API contract, error handling
 * - Trishul: Persistence, data binding, execution history
 * - Madhav Gorla: Frontend Monaco IDE integration, testing & demo materials
 */
@SpringBootApplication
public class PolyglotMeshApplication {

    public static void main(String[] args) {
        SpringApplication.run(PolyglotMeshApplication.class, args);
    }
}
