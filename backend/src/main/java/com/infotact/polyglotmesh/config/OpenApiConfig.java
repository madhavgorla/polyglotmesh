package com.infotact.polyglotmesh.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI polyglotMeshOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("PolyglotMesh Runtime Sandbox API")
                        .version("1.0.0")
                        .description("Reactive Spring WebFlux + GraalVM Polyglot execution, cross-language interoperability, script persistence, and telemetry API.")
                        .contact(new Contact()
                                .name("Infotact Solutions - Team 6")
                                .email("madhugorla497@gmail.com")));
    }
}
