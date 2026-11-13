package com.infotact.polyglotmesh.exception;

import com.infotact.polyglotmesh.dto.ExecutionResponse;
import org.springframework.core.io.buffer.DataBufferLimitException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.support.WebExchangeBindException;
import org.springframework.web.server.ServerWebInputException;

import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(WebExchangeBindException.class)
    public ResponseEntity<ExecutionResponse> handleValidationErrors(WebExchangeBindException ex) {
        String errorMsg = ex.getBindingResult().getFieldErrors().stream()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .collect(Collectors.joining("; "));
        ExecutionResponse response = ExecutionResponse.failure(null, null, "", "Validation Error: " + errorMsg, 0, "WebFlux Validator");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(ServerWebInputException.class)
    public ResponseEntity<ExecutionResponse> handleMalformedRequest(ServerWebInputException ex) {
        ExecutionResponse response = ExecutionResponse.failure(null, null, "", "Malformed request body: " + ex.getReason(), 0, "WebFlux Parser");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(DataBufferLimitException.class)
    public ResponseEntity<ExecutionResponse> handlePayloadTooLarge(DataBufferLimitException ex) {
        ExecutionResponse response = ExecutionResponse.failure(null, null, "", "Payload Too Large: Exceeds maximum allowed input size.", 0, "WebFlux Buffer Guard");
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(response);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "success", false,
                "error", ex.getMessage()
        ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ExecutionResponse> handleGenericException(Exception ex) {
        // Safe error reporting: never leak internal stack traces or secrets
        ExecutionResponse response = ExecutionResponse.failure(null, null, "", "Internal Server Error processing request.", 0, "PolyglotMesh Gateway");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
