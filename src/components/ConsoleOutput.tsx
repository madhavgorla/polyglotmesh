import React, { useState } from 'react';
import { ExecutionResponse } from '../types';
import {
  Terminal,
  AlertTriangle,
  ShieldCheck,
  FileJson,
  Copy,
  Check,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Lock
} from 'lucide-react';

interface ConsoleOutputProps {
  response: ExecutionResponse | null;
  isRunning: boolean;
  onClear: () => void;
  lastRequestPayload: any;
}

export const ConsoleOutput: React.FC<ConsoleOutputProps> = ({
  response,
  isRunning,
  onClear,
  lastRequestPayload
}) => {
  const [activeTab, setActiveTab] = useState<'stdout' | 'stderr' | 'sandbox' | 'api'>('stdout');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    let textToCopy = '';
    if (activeTab === 'stdout') textToCopy = response?.output || '';
    else if (activeTab === 'stderr') textToCopy = response?.error || '';
    else if (activeTab === 'api') textToCopy = JSON.stringify({ request: lastRequestPayload, response }, null, 2);
    else if (activeTab === 'sandbox') textToCopy = JSON.stringify(response?.sandboxAudit || {}, null, 2);

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasError = response && !response.success;

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
      {/* Console Tab Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('stdout')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
              activeTab === 'stdout' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Output</span>
          </button>

          <button
            onClick={() => setActiveTab('stderr')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
              activeTab === 'stderr' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${hasError ? 'text-rose-400' : 'text-slate-500'}`} />
            <span>Errors</span>
          </button>

          <button
            onClick={() => setActiveTab('sandbox')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
              activeTab === 'sandbox' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sandbox</span>
          </button>

          <button
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
              activeTab === 'api' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileJson className="w-3.5 h-3.5 text-amber-400" />
            <span>API JSON</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {response && (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-slate-400 mr-1">
              <Clock className="w-3 h-3" />
              <span className="tabular-nums font-semibold text-slate-200">{response.executionTimeMs} ms</span>
            </div>
          )}

          <button
            onClick={handleCopy}
            title="Copy current tab contents"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClear}
            title="Clear console output"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Console Content Area */}
      <div className="flex-1 p-4 bg-[#070b13] font-mono text-xs overflow-auto min-h-[220px]">
        {isRunning ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 py-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            <div className="text-center">
              <p className="text-slate-200 font-medium">Executing script in isolated runtime...</p>
              <p className="text-[11px] text-slate-500 mt-1">Enforcing deadline watchdog and sandbox permissions</p>
            </div>
          </div>
        ) : !response ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 py-12">
            <Terminal className="w-8 h-8 text-slate-700 mb-2" />
            <p className="text-slate-400">Ready for execution</p>
            <p className="text-[11px] text-slate-600 mt-0.5">Click "Run Script" or press Ctrl+Enter.</p>
          </div>
        ) : (
          <>
            {activeTab === 'stdout' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-[11px] text-slate-500">
                  <div className="flex items-center gap-2">
                    {response.success ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Execution Succeeded</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-400 font-medium">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Execution Failed</span>
                      </span>
                    )}
                    {response.executionId && (
                      <>
                        <span className="text-slate-700">·</span>
                        <span className="text-slate-400">{response.executionId}</span>
                      </>
                    )}
                  </div>
                  <span className="tabular-nums text-slate-400">{response.engine || 'PolyglotMesh'}</span>
                </div>

                <pre className="text-slate-200 whitespace-pre-wrap leading-relaxed select-text">
                  {response.output || (response.success ? '(Finished with empty stdout)' : '(No stdout emitted)')}
                </pre>

                {response.error && (
                  <div className="mt-4 p-3 rounded bg-rose-950/40 border border-rose-900/60 text-rose-300">
                    <p className="font-semibold mb-1 text-[11px] text-rose-400">Error / Diagnostics:</p>
                    <pre className="whitespace-pre-wrap">{response.error}</pre>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stderr' && (
              <div>
                {response.error ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-rose-950/30 border border-rose-800/60 rounded-lg text-rose-200">
                      <div className="flex items-center gap-2 font-semibold text-rose-300 mb-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span>Error Trace & Diagnostics</span>
                      </div>
                      <pre className="whitespace-pre-wrap text-rose-200/90 text-xs">{response.error}</pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500 mb-2" />
                    <p className="text-slate-300 font-medium">No errors recorded</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'sandbox' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-slate-300 font-semibold">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Sandbox Policy Enforcement</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                  <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-300">Host Access</span>
                    <span className="text-emerald-400">HostAccess.NONE</span>
                  </div>
                  <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-300">File & Network I/O</span>
                    <span className="text-emerald-400">IOAccess.NONE</span>
                  </div>
                  <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-300">Process Creation</span>
                    <span className="text-emerald-400">Blocked</span>
                  </div>
                  <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-300">Watchdog Deadline</span>
                    <span className="text-indigo-300">{response.sandboxAudit?.deadlineMs || 3000} ms</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="space-y-3">
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 mb-1">POST /api/execute Request</div>
                  <pre className="p-3 bg-slate-950 rounded border border-slate-800 text-sky-300 overflow-x-auto">
                    {JSON.stringify(lastRequestPayload, null, 2)}
                  </pre>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 mb-1">JSON Response</div>
                  <pre className="p-3 bg-slate-950 rounded border border-slate-800 text-emerald-300 overflow-x-auto">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Console Bottom Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400">
        <span>Endpoint: <strong className="text-slate-300">POST /api/execute</strong></span>
        {response && (
          <span className="font-mono tabular-nums">
            {response.executionId ? `${response.executionId} · ` : ''}
            <strong className="text-indigo-300">{response.executionTimeMs} ms</strong>
          </span>
        )}
      </div>
    </div>
  );
};
