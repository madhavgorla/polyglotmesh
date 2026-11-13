package com.infotact.polyglotmesh.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.util.Map;

public class InteropPricingRequest {

    @NotBlank(message = "Guest language is required.")
    @Pattern(regexp = "^(?i)(python|javascript)$", message = "Interop demo supports 'python' or 'javascript'.")
    private String guestLanguage = "python";

    @DecimalMin(value = "0.0", message = "Base price must be non-negative.")
    private double basePrice = 120.0;

    @Min(value = 1, message = "Quantity must be at least 1.")
    private int quantity = 5;

    private double taxRate = 0.18;
    private String discountTier = "ENTERPRISE";
    private String currency = "USD";
    private String customGuestScript;

    public String getGuestLanguage() { return guestLanguage != null ? guestLanguage.trim().toLowerCase() : "python"; }
    public void setGuestLanguage(String guestLanguage) { this.guestLanguage = guestLanguage; }
    public double getBasePrice() { return basePrice; }
    public void setBasePrice(double basePrice) { this.basePrice = basePrice; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public double getTaxRate() { return taxRate; }
    public void setTaxRate(double taxRate) { this.taxRate = taxRate; }
    public String getDiscountTier() { return discountTier; }
    public void setDiscountTier(String discountTier) { this.discountTier = discountTier; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public String getCustomGuestScript() { return customGuestScript; }
    public void setCustomGuestScript(String customGuestScript) { this.customGuestScript = customGuestScript; }

    public static class InteropPricingResponse {
        private boolean success;
        private String guestLanguage;
        private Map<String, Object> inputPricingMap;
        private Map<String, Object> transformedResult;
        private String error;
        private long executionTimeMs;
        private String interopMechanism;

        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
        public String getGuestLanguage() { return guestLanguage; }
        public void setGuestLanguage(String guestLanguage) { this.guestLanguage = guestLanguage; }
        public Map<String, Object> getInputPricingMap() { return inputPricingMap; }
        public void setInputPricingMap(Map<String, Object> inputPricingMap) { this.inputPricingMap = inputPricingMap; }
        public Map<String, Object> getTransformedResult() { return transformedResult; }
        public void setTransformedResult(Map<String, Object> transformedResult) { this.transformedResult = transformedResult; }
        public String getError() { return error; }
        public void setError(String error) { this.error = error; }
        public long getExecutionTimeMs() { return executionTimeMs; }
        public void setExecutionTimeMs(long executionTimeMs) { this.executionTimeMs = executionTimeMs; }
        public String getInteropMechanism() { return interopMechanism; }
        public void setInteropMechanism(String interopMechanism) { this.interopMechanism = interopMechanism; }
    }
}
