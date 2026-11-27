package com.infotact.polyglotmesh.execution;

import com.infotact.polyglotmesh.dto.InteropPricingRequest;
import com.infotact.polyglotmesh.dto.InteropPricingRequest.InteropPricingResponse;
import com.infotact.polyglotmesh.security.SandboxPolicyFactory;
import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Engine;
import org.graalvm.polyglot.PolyglotException;
import org.graalvm.polyglot.Value;
import org.graalvm.polyglot.proxy.ProxyObject;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Module E: Cross-Language Data Exchange.
 * Demonstrates direct Java-to-Guest interoperability using GraalVM ProxyObject without JSON serialization overhead.
 */
@Service
public class CrossLanguageInteropService {

    private final Engine interopEngine = Engine.newBuilder()
            .option("engine.WarnInterpreterOnly", "false")
            .build();

    private final SandboxPolicyFactory sandboxPolicyFactory;

    public CrossLanguageInteropService(SandboxPolicyFactory sandboxPolicyFactory) {
        this.sandboxPolicyFactory = sandboxPolicyFactory;
    }

    public InteropPricingResponse transformPricingData(InteropPricingRequest request) {
        long startTime = System.currentTimeMillis();
        String apiLang = request.getGuestLanguage();
        String graalLang = "javascript".equalsIgnoreCase(apiLang) ? "js" : "python";

        // Step 1: Java creates a Map containing sample pricing data
        Map<String, Object> javaPricingMap = new LinkedHashMap<>();
        javaPricingMap.put("basePrice", request.getBasePrice());
        javaPricingMap.put("quantity", request.getQuantity());
        javaPricingMap.put("taxRate", request.getTaxRate());
        javaPricingMap.put("discountTier", request.getDiscountTier());
        javaPricingMap.put("currency", request.getCurrency());

        InteropPricingResponse response = new InteropPricingResponse();
        response.setGuestLanguage(apiLang);
        response.setInputPricingMap(javaPricingMap);
        response.setInteropMechanism("Direct GraalVM ProxyObject.fromMap() + Context.getBindings() (Zero JSON round-trip)");

        if (!interopEngine.getLanguages().containsKey(graalLang)) {
            response.setSuccess(false);
            response.setError("Guest runtime '" + graalLang + "' is not installed in this GraalVM distribution.");
            response.setExecutionTimeMs(System.currentTimeMillis() - startTime);
            return response;
        }

        String guestScript = (request.getCustomGuestScript() != null && !request.getCustomGuestScript().isBlank())
                ? request.getCustomGuestScript()
                : defaultTransformScript(graalLang);

        try (Context context = sandboxPolicyFactory.buildRestrictedInteropContext(graalLang, interopEngine)) {
            // Step 2: Expose Java Map directly to the restricted guest context using ProxyObject
            context.getBindings(graalLang).putMember("pricingData", ProxyObject.fromMap(javaPricingMap));

            // Step 3: Guest script reads & transforms the data directly
            Value resultValue = context.eval(graalLang, guestScript);

            // Step 4: Java retrieves the resulting map directly from GraalVM Value.
            // A guest dict (Python) exposes its *data* through the hash-entry API, while its
            // member view (getMemberKeys()) returns built-in methods (pop, get, keys, ...), not
            // data keys. A guest object (JS) exposes data through members. Branch on which view
            // the value actually carries so we never try to read a built-in method as a string.
            Map<String, Object> transformed = new LinkedHashMap<>();
            if (resultValue.hasHashEntries()) {
                Value keyIterator = resultValue.getHashKeysIterator();
                while (keyIterator.hasIteratorNextElement()) {
                    Value key = keyIterator.getIteratorNextElement();
                    Value member = resultValue.getHashValue(key);
                    Object coerced = coerceGuestValue(member);
                    if (coerced != null) {
                        transformed.put(key.asString(), coerced);
                    }
                }
            } else if (resultValue.hasMembers()) {
                for (String key : resultValue.getMemberKeys()) {
                    Object coerced = coerceGuestValue(resultValue.getMember(key));
                    if (coerced != null) {
                        transformed.put(key, coerced);
                    }
                }
            }

            response.setSuccess(true);
            response.setTransformedResult(transformed);
            response.setExecutionTimeMs(System.currentTimeMillis() - startTime);
            return response;

        } catch (PolyglotException pe) {
            response.setSuccess(false);
            response.setError("Guest interop error: " + pe.getMessage());
            response.setExecutionTimeMs(System.currentTimeMillis() - startTime);
            return response;
        }
    }

    /**
     * Safely coerce a guest scalar to a plain Java value (Long/Double/Boolean/String).
     * Nested containers (dicts/lists) fall back to a readable string instead of crashing on a
     * forced {@code asString()} that would throw ClassCastException for non-string guests.
     */
    private Object coerceGuestValue(Value value) {
        if (value == null || value.isNull()) {
            return null;
        }
        if (value.isNumber()) {
            return value.fitsInLong() ? value.asLong() : value.asDouble();
        }
        if (value.isBoolean()) {
            return value.asBoolean();
        }
        if (value.isString()) {
            return value.asString();
        }
        try {
            return value.toString();
        } catch (RuntimeException e) {
            return null;
        }
    }

    private String defaultTransformScript(String graalLang) {
        if ("python".equals(graalLang)) {
            // NOTE: ProxyObject.fromMap() exposes the Java map to Python as a 'foreign' object,
            // which supports attribute access (pricingData.key) but NOT subscript access
            // (pricingData["key"] throws TypeError: 'foreign' object is not subscriptable).
            return """
                subtotal = pricingData.basePrice * pricingData.quantity
                tier = pricingData.discountTier
                discount_rate = 0.20 if tier == "ENTERPRISE" else (0.10 if tier == "PRO" else 0.0)
                discount_amount = round(subtotal * discount_rate, 2)
                taxable = subtotal - discount_amount
                tax_amount = round(taxable * pricingData.taxRate, 2)
                final_total = round(taxable + tax_amount, 2)
                {
                    "currency": pricingData.currency,
                    "subtotal": round(subtotal, 2),
                    "discountRate": discount_rate,
                    "discountAmount": discount_amount,
                    "taxAmount": tax_amount,
                    "finalTotal": final_total
                }
                """;
        }
        return """
            (function() {
                const subtotal = pricingData.basePrice * pricingData.quantity;
                const discountRate = pricingData.discountTier === 'ENTERPRISE' ? 0.20 : (pricingData.discountTier === 'PRO' ? 0.10 : 0.0);
                const discountAmount = Math.round(subtotal * discountRate * 100) / 100;
                const taxable = subtotal - discountAmount;
                const taxAmount = Math.round(taxable * pricingData.taxRate * 100) / 100;
                const finalTotal = Math.round((taxable + taxAmount) * 100) / 100;
                return {
                    currency: pricingData.currency,
                    subtotal: Math.round(subtotal * 100) / 100,
                    discountRate: discountRate,
                    discountAmount: discountAmount,
                    taxAmount: taxAmount,
                    finalTotal: finalTotal
                };
            })();
            """;
    }
}
