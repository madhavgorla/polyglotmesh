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

        // Step 1: Java creates a Map containing sample pricing data.
        // Numeric values are normalised to Long/Double (GraalPy-friendly) so the
        // guest arithmetic coerces cleanly instead of seeing boxed Java Integer objects.
        Map<String, Object> javaPricingMap = new LinkedHashMap<>();
        javaPricingMap.put("basePrice", asLongOrDouble(request.getBasePrice()));
        javaPricingMap.put("quantity", asLongOrDouble(request.getQuantity()));
        javaPricingMap.put("taxRate", asLongOrDouble(request.getTaxRate()));
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
            // Step 2: Expose the pricing fields directly as native top-level bindings.
            // GraalPy cannot subscript a ProxyObject map with pricingData["key"] in the
            // restricted (HostAccess.NONE) context, so a single ProxyObject is unreliable.
            // Binding each scalar on its own gives the guest native numbers/strings it
            // can read deterministically. The ProxyObject map is kept for the response
            // metadata and as a reference for the zero-JSON mechanism.
            context.getBindings(graalLang).putMember("basePrice", asBindingScalar(javaPricingMap.get("basePrice")));
            context.getBindings(graalLang).putMember("quantity", asBindingScalar(javaPricingMap.get("quantity")));
            context.getBindings(graalLang).putMember("taxRate", asBindingScalar(javaPricingMap.get("taxRate")));
            context.getBindings(graalLang).putMember("discountTier", javaPricingMap.get("discountTier"));
            context.getBindings(graalLang).putMember("currency", javaPricingMap.get("currency"));
            context.getBindings(graalLang).putMember("pricingData", ProxyObject.fromMap(javaPricingMap));

            // Step 3: Guest script reads & transforms the data directly
            Value resultValue = context.eval(graalLang, guestScript);

            // Step 4: Java retrieves the resulting map directly from GraalVM Value.
            // Guest dict/object results are enumerated via the hash-entry iterator,
            // where each entry is exposed as a 2-element pair (element 0 = key,
            // element 1 = value). Plain Python dicts that do not surface their entries
            // as interop members fall back onto this path; JS objects use members.
            Map<String, Object> transformed = new LinkedHashMap<>();
            if (resultValue.hasHashEntries()) {
                Value entriesIterator = resultValue.getHashEntriesIterator();
                while (entriesIterator.hasIteratorNextElement()) {
                    Value entry = entriesIterator.getIteratorNextElement();
                    if (!entry.hasArrayElements() || entry.getArraySize() < 2) {
                        continue;
                    }
                    Value keyV = entry.getArrayElement(0);
                    Value member = entry.getArrayElement(1);
                    String key = keyV.isString() ? keyV.asString() : String.valueOf(keyV);
                    if (member.isNumber()) {
                        transformed.put(key, member.fitsInLong() ? member.asLong() : member.asDouble());
                    } else if (member.isBoolean()) {
                        transformed.put(key, member.asBoolean());
                    } else if (member.isString()) {
                        transformed.put(key, member.asString());
                    }
                }
            } else if (resultValue.hasMembers()) {
                for (String key : resultValue.getMemberKeys()) {
                    Value member = resultValue.getMember(key);
                    if (member.isNumber()) {
                        transformed.put(key, member.fitsInLong() ? member.asLong() : member.asDouble());
                    } else if (member.isBoolean()) {
                        transformed.put(key, member.asBoolean());
                    } else if (member.isString()) {
                        transformed.put(key, member.asString());
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

    private String defaultTransformScript(String graalLang) {
        if ("python".equals(graalLang)) {
            // Explicit float()/int() coercion of the interop-provided pricingData
            // values: GraalPy hands back Java boxed Number objects through the
            // ProxyObject, and coercing to native floats/ints makes the arithmetic
            // deterministic under the restricted (HostAccess.NONE) context.
            return """
                base = float(basePrice)
                qty = int(quantity)
                tax = float(taxRate)
                tier = str(discountTier)
                subtotal = base * qty
                discount_rate = 0.20 if tier == "ENTERPRISE" else (0.10 if tier == "PRO" else 0.0)
                discount_amount = round(subtotal * discount_rate, 2)
                taxable = subtotal - discount_amount
                tax_amount = round(taxable * tax, 2)
                final_total = round(taxable + tax_amount, 2)
                {
                    "currency": str(currency),
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
                const subtotal = basePrice * quantity;
                const discountRate = discountTier === 'ENTERPRISE' ? 0.20 : (discountTier === 'PRO' ? 0.10 : 0.0);
                const discountAmount = Math.round(subtotal * discountRate * 100) / 100;
                const taxable = subtotal - discountAmount;
                const taxAmount = Math.round(taxable * taxRate * 100) / 100;
                const finalTotal = Math.round((taxable + taxAmount) * 100) / 100;
                return {
                    currency: currency,
                    subtotal: Math.round(subtotal * 100) / 100,
                    discountRate: discountRate,
                    discountAmount: discountAmount,
                    taxAmount: taxAmount,
                    finalTotal: finalTotal
                };
            })();
            """;
    }

    /**
     * Normalises a double to the most compact GraalVM-friendly Java number form:
     * a whole double becomes a Long, a fractional one stays a Double. Avoiding
     * boxed Integer/Double mismatches keeps the guest-side float()/int() coercion
     * in the transform scripts deterministic.
     */
    private Object asLongOrDouble(double value) {
        if (value == Math.rint(value)) {
            return (long) value;
        }
        return value;
    }

    /**
     * Ensures a value placed as a top-level guest binding is the most native-friendly
     * Java form possible (Long/Double instead of boxed Integer) so the guest runtime
     * coerces it cleanly to its own number type.
     */
    private Object asBindingScalar(Object value) {
        if (value instanceof Number number) {
            if (number.intValue() == number.doubleValue()) {
                return number.longValue();
            }
            return number.doubleValue();
        }
        return value;
    }
}
