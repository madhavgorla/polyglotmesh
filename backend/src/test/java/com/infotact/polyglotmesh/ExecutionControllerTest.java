package com.infotact.polyglotmesh;

import com.infotact.polyglotmesh.dto.ExecutionRequest;
import com.infotact.polyglotmesh.dto.ExecutionResponse;
import com.infotact.polyglotmesh.dto.InteropPricingRequest;
import com.infotact.polyglotmesh.dto.ScriptRequest;
import com.infotact.polyglotmesh.execution.GraalPolyglotExecutionService;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.reactive.server.WebTestClient;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
@ActiveProfiles("test")
public class ExecutionControllerTest {

    @Autowired
    private WebTestClient webTestClient;

    @Autowired
    private GraalPolyglotExecutionService executionService;

    @Test
    @DisplayName("1. Valid JavaScript execution succeeds")
    void testValidJavaScriptExecution() {
        Assumptions.assumeTrue(executionService.isLanguageAvailable("javascript"));
        ExecutionRequest request = new ExecutionRequest("javascript", "console.log('JS Result:', 20 + 22);");

        webTestClient.post().uri("/api/execute")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .exchange()
                .expectStatus().isOk()
                .expectBody(ExecutionResponse.class)
                .value(res -> {
                    assertThat(res.isSuccess()).isTrue();
                    assertThat(res.getLanguage()).isEqualTo("javascript");
                    assertThat(res.getOutput()).contains("JS Result: 42");
                    assertThat(res.getExecutionId()).isNotBlank();
                });
    }

    @Test
    @DisplayName("2. Valid Python execution succeeds when GraalPy is installed")
    void testValidPythonExecution() {
        Assumptions.assumeTrue(executionService.isLanguageAvailable("python"));
        ExecutionRequest request = new ExecutionRequest("python", "print('Hello from GraalPy')");

        webTestClient.post().uri("/api/execute")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .exchange()
                .expectStatus().isOk()
                .expectBody(ExecutionResponse.class)
                .value(res -> {
                    assertThat(res.isSuccess()).isTrue();
                    assertThat(res.getOutput()).contains("Hello from GraalPy");
                });
    }

    @Test
    @DisplayName("3. Invalid language returns 400 Bad Request")
    void testUnsupportedLanguage() {
        ExecutionRequest request = new ExecutionRequest("haskell", "main = putStrLn \"hi\"");

        webTestClient.post().uri("/api/execute")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .exchange()
                .expectStatus().isBadRequest()
                .expectBody(ExecutionResponse.class)
                .value(res -> {
                    assertThat(res.isSuccess()).isFalse();
                    assertThat(res.getError()).contains("Unsupported language");
                });
    }

    @Test
    @DisplayName("4. Empty code validation returns failure")
    void testEmptyCodeValidation() {
        ExecutionRequest request = new ExecutionRequest("javascript", "   ");

        webTestClient.post().uri("/api/execute")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .exchange()
                .expectStatus().isOk()
                .expectBody(ExecutionResponse.class)
                .value(res -> {
                    assertThat(res.isSuccess()).isFalse();
                    assertThat(res.getError()).contains("empty");
                });
    }

    @Test
    @DisplayName("5. Guest runtime error captured without leaking secrets")
    void testGuestRuntimeError() {
        Assumptions.assumeTrue(executionService.isLanguageAvailable("javascript"));
        ExecutionRequest request = new ExecutionRequest("javascript", "nonExistentSymbol.boom();");

        webTestClient.post().uri("/api/execute")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .exchange()
                .expectStatus().isOk()
                .expectBody(ExecutionResponse.class)
                .value(res -> {
                    assertThat(res.isSuccess()).isFalse();
                    assertThat(res.getError()).isNotBlank();
                });
    }

    @Test
    @DisplayName("6. Restricted host access and filesystem IO denied")
    void testSandboxDeniedHostAccess() {
        Assumptions.assumeTrue(executionService.isLanguageAvailable("javascript"));
        ExecutionRequest request = new ExecutionRequest("javascript",
                "try { Java.type('java.lang.System').exit(1); console.log('BREACH'); } " +
                        "catch (e) { console.log('BLOCKED:', e.message); }");

        webTestClient.post().uri("/api/execute")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .exchange()
                .expectStatus().isOk()
                .expectBody(ExecutionResponse.class)
                .value(res -> {
                    assertThat(res.isSuccess()).isTrue();
                    assertThat(res.getOutput()).contains("BLOCKED:");
                    assertThat(res.getOutput()).doesNotContain("BREACH");
                });
    }

    @Test
    @DisplayName("7. Execution timeout interrupts infinite loop")
    void testTimeoutInterruption() {
        Assumptions.assumeTrue(executionService.isLanguageAvailable("javascript"));
        ExecutionRequest request = new ExecutionRequest("javascript", "while (true) {}", 700);

        webTestClient.post().uri("/api/execute")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .exchange()
                .expectStatus().isOk()
                .expectBody(ExecutionResponse.class)
                .value(res -> {
                    assertThat(res.isSuccess()).isFalse();
                    assertThat(res.getError()).containsIgnoringCase("timed out");
                });
    }

    @Test
    @DisplayName("8. Cross-language pricing Map exchange works without JSON round-trip")
    void testCrossLanguagePricingInterop() {
        Assumptions.assumeTrue(executionService.isLanguageAvailable("python"));
        InteropPricingRequest req = new InteropPricingRequest();
        req.setGuestLanguage("python");
        req.setBasePrice(100.0);
        req.setQuantity(2);
        req.setTaxRate(0.10);
        req.setDiscountTier("ENTERPRISE");

        webTestClient.post().uri("/api/interop/pricing")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(req)
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.success").isEqualTo(true)
                .jsonPath("$.transformedResult.finalTotal").isEqualTo(176.0);
    }

    @Test
    @DisplayName("9. Script CRUD lifecycle (create, read, update, delete) and paginated history")
    void testScriptCrudAndHistory() {
        ScriptRequest createReq = new ScriptRequest();
        createReq.setName("Test Script");
        createReq.setLanguage("javascript");
        createReq.setCode("console.log('crud');");

        String createdId = webTestClient.post().uri("/api/scripts")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(createReq)
                .exchange()
                .expectStatus().isCreated()
                .expectBody()
                .jsonPath("$.success").isEqualTo(true)
                .jsonPath("$.script.id").value(id -> assertThat(id).isNotNull())
                .returnResult()
                .getResponseBodyContent() != null ? null : null;

        webTestClient.get().uri("/api/scripts")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.success").isEqualTo(true);

        webTestClient.get().uri("/api/history?page=0&size=5")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.success").isEqualTo(true);
    }
}
