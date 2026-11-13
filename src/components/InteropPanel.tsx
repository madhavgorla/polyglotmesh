import React, { useState } from 'react';
import { InteropPricingResponse } from '../types';
import { ArrowLeftRight, Play, Loader2, CheckCircle2, XCircle, Code2 } from 'lucide-react';

const DEFAULT_JS_SCRIPT = `(function() {
  const subtotal = pricingData.basePrice * pricingData.quantity;
  const discountRate = pricingData.discountTier === 'ENTERPRISE' ? 0.20 : (pricingData.discountTier === 'PRO' ? 0.10 : 0.0);
  const discountAmount = Math.round(subtotal * discountRate * 100) / 100;
  const taxable = subtotal - discountAmount;
  const taxAmount = Math.round(taxable * pricingData.taxRate * 100) / 100;
  const finalTotal = Math.round((taxable + taxAmount) * 100) / 100;
  return {
    currency: pricingData.currency,
    subtotal: subtotal,
    discountRate: discountRate,
    discountAmount: discountAmount,
    taxAmount: taxAmount,
    finalTotal: finalTotal
  };
})();`;

const DEFAULT_PY_SCRIPT = `subtotal = pricingData["basePrice"] * pricingData["quantity"]
tier = pricingData["discountTier"]
discount_rate = 0.20 if tier == "ENTERPRISE" else (0.10 if tier == "PRO" else 0.0)
discount_amount = round(subtotal * discount_rate, 2)
taxable = subtotal - discount_amount
tax_amount = round(taxable * pricingData["taxRate"], 2)
final_total = round(taxable + tax_amount, 2)
result = {
    "currency": pricingData["currency"],
    "subtotal": round(subtotal, 2),
    "discountRate": discount_rate,
    "discountAmount": discount_amount,
    "taxAmount": tax_amount,
    "finalTotal": final_total
}`;

export const InteropPanel: React.FC = () => {
  const [guestLanguage, setGuestLanguage] = useState<'python' | 'javascript'>('python');
  const [basePrice, setBasePrice] = useState<number>(120);
  const [quantity, setQuantity] = useState<number>(5);
  const [taxRate, setTaxRate] = useState<number>(0.18);
  const [discountTier, setDiscountTier] = useState<string>('ENTERPRISE');
  const [currency, setCurrency] = useState<string>('USD');
  const [customScript, setCustomScript] = useState<string>(DEFAULT_PY_SCRIPT);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<InteropPricingResponse | null>(null);

  const handleLangChange = (lang: 'python' | 'javascript') => {
    setGuestLanguage(lang);
    setCustomScript(lang === 'python' ? DEFAULT_PY_SCRIPT : DEFAULT_JS_SCRIPT);
  };

  const handleExecuteInterop = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/interop/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestLanguage,
          basePrice,
          quantity,
          taxRate,
          discountTier,
          currency,
          customGuestScript: customScript
        })
      });
      const data: InteropPricingResponse = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({
        success: false,
        guestLanguage,
        inputPricingMap: { basePrice, quantity, taxRate, discountTier, currency },
        transformedResult: null,
        error: err.message || 'Failed calling /api/interop/pricing',
        executionTimeMs: 0,
        interopMechanism: 'HTTP Error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="p-5 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-sky-400" />
            <span>Module E: Cross-Language Pricing Map Data Exchange</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Java creates a Map of pricing data, binds it directly to a restricted guest context via GraalVM <code className="text-sky-300 font-mono">ProxyObject.fromMap()</code>, transforms it in Python/JS, and retrieves the resulting value without JSON round-trips.
          </p>
        </div>

        <button
          onClick={handleExecuteInterop}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>Run Interop Transform</span>
        </button>
      </div>

      {/* Interactive Controls & Transformation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Host Pricing Map Inputs */}
        <div className="lg:col-span-5 p-5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-4 text-xs">
          <h3 className="text-sm font-semibold text-white">1. Host Java Pricing Map</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Base Price</label>
              <input
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Quantity</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Tax Rate (decimal)</label>
              <input
                type="number"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Discount Tier</label>
              <select
                value={discountTier}
                onChange={(e) => setDiscountTier(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
              >
                <option value="ENTERPRISE">ENTERPRISE (20% off)</option>
                <option value="PRO">PRO (10% off)</option>
                <option value="STANDARD">STANDARD (0% off)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Currency</label>
            <input
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono"
            />
          </div>

          <div>
            <span className="block text-slate-400 mb-1">Guest Language Target</span>
            <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
              <button
                onClick={() => handleLangChange('python')}
                className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                  guestLanguage === 'python' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Python (GraalPy)
              </button>
              <button
                onClick={() => handleLangChange('javascript')}
                className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                  guestLanguage === 'javascript' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                JavaScript (GraalJS)
              </button>
            </div>
          </div>
        </div>

        {/* Right: Guest Transformation Script & Output */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="p-5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <span>2. Restricted Guest Transformation Script ({guestLanguage})</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-400">Binding: pricingData</span>
            </div>

            <textarea
              value={customScript}
              onChange={(e) => setCustomScript(e.target.value)}
              rows={10}
              spellCheck={false}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-y"
            />
          </div>

          <div className="p-5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">3. Retrieved Result in Host Context</h3>
              {result && (
                <span className="font-mono tabular-nums text-slate-400">{result.executionTimeMs} ms</span>
              )}
            </div>

            {!result ? (
              <p className="text-slate-500 py-4 text-center">
                Click "Run Interop Transform" to pass the pricing map into the guest context and retrieve the transformed map.
              </p>
            ) : result.success ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{result.interopMechanism}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] text-slate-400 mb-1">Host Input Map</div>
                    <pre className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-sky-300 overflow-x-auto">
                      {JSON.stringify(result.inputPricingMap, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 mb-1">Returned Guest Value</div>
                    <pre className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-emerald-300 overflow-x-auto">
                      {JSON.stringify(result.transformedResult, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded text-rose-200 flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{result.error}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interoperability Limitations Explanation */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1.5">
        <strong className="text-slate-200">GraalVM Interoperability Notes & Limitations:</strong>
        <p>
          In the Java 21 backend (<code className="text-slate-300 font-mono">CrossLanguageInteropService.java</code>), Java exposes <code className="text-slate-300 font-mono">Map&lt;String, Object&gt;</code> via <code className="text-slate-300 font-mono">ProxyObject.fromMap()</code> instead of <code className="text-slate-300 font-mono">HostAccess.ALL</code> so untrusted scripts cannot reflectively invoke arbitrary Java methods on host objects. Complex custom Java POJOs require explicit <code className="text-slate-300 font-mono">@HostAccess.Export</code> annotations or proxy wrappers.
        </p>
      </div>
    </div>
  );
};
