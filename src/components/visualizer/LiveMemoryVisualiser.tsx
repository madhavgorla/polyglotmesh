import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  CornerDownRight,
  Loader2,
  Terminal,
  XCircle
} from 'lucide-react';
import { DebugStep } from '../../types';

interface LiveMemoryVisualiserProps {
  steps: DebugStep[];
  stepIndex: number;
  syntaxError?: { line: number; column?: number; message: string } | null;
  runtimeError?: { type: string; message: string; line: number } | null;
  isDebugging?: boolean;
  truncated?: boolean;
  onJumpToLine?: (line: number) => void;
  compact?: boolean;
}

const INDEX_VAR_NAMES = new Set([
  'i',
  'j',
  'k',
  'idx',
  'index',
  'lo',
  'hi',
  'low',
  'high',
  'left',
  'right',
  'l',
  'r',
  'mid',
  'slow',
  'fast',
  'read',
  'write',
  'ptr',
  'start',
  'end',
  'curr',
  'pos'
]);

function formatPrimitive(val: unknown): string {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (typeof val === 'string') return JSON.stringify(val);
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  return String(val);
}

function formatCompactValue(val: unknown): string {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (typeof val === 'string') {
    return val.length > 24 ? JSON.stringify(val.slice(0, 21) + '...') : JSON.stringify(val);
  }
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  try {
    const s = JSON.stringify(val);
    return s.length > 36 ? s.slice(0, 33) + '...' : s;
  } catch {
    return String(val);
  }
}

export const LiveMemoryVisualiser: React.FC<LiveMemoryVisualiserProps> = ({
  steps,
  stepIndex,
  syntaxError,
  runtimeError,
  isDebugging = false,
  truncated = false,
  onJumpToLine,
  compact = false
}) => {
  const currentStep = steps[stepIndex] || steps[steps.length - 1] || null;
  const activeError =
    syntaxError
      ? {
          kind: 'SyntaxError',
          line: syntaxError.line || 1,
          column: syntaxError.column,
          message: syntaxError.message
        }
      : currentStep?.error
      ? {
          kind: currentStep.error.type || 'RuntimeError',
          line: currentStep.error.line || currentStep.line || 1,
          column: currentStep.error.column,
          message: currentStep.error.message
        }
      : runtimeError
      ? {
          kind: runtimeError.type || 'RuntimeError',
          line: runtimeError.line || 1,
          message: runtimeError.message
        }
      : null;

  if (isDebugging) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
        <div className="text-xs font-mono text-neutral-300">
          Tracing execution frames &amp; inspecting variables...
        </div>
      </div>
    );
  }

  if (syntaxError && steps.length === 0) {
    return (
      <div className="p-5 flex-1 flex flex-col justify-center">
        <div className="rounded-lg border border-rose-500/45 bg-rose-950/25 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-rose-300 font-mono text-xs font-semibold">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                SyntaxError on Line {syntaxError.line}
                {syntaxError.column ? `:${syntaxError.column}` : ''}
              </span>
            </div>
            {onJumpToLine && (
              <button
                type="button"
                onClick={() => onJumpToLine(syntaxError.line || 1)}
                className="px-2.5 py-1 rounded border border-rose-500/40 bg-rose-950/60 hover:bg-rose-900/60 text-[11px] font-mono text-rose-200 transition-colors"
              >
                Go to Line {syntaxError.line}
              </button>
            )}
          </div>
          <pre className="font-mono text-xs text-rose-200 whitespace-pre-wrap leading-relaxed">
            {syntaxError.message}
          </pre>
        </div>
      </div>
    );
  }

  if (!currentStep) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-2">
        {activeError ? (
          <div className="w-full max-w-md rounded-lg border border-rose-500/45 bg-rose-950/25 p-4 text-left space-y-2">
            <div className="flex items-center justify-between gap-2 text-rose-300 font-mono text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                {activeError.kind} (Line {activeError.line})
              </span>
              {onJumpToLine && (
                <button
                  type="button"
                  onClick={() => onJumpToLine(activeError.line)}
                  className="px-2 py-0.5 rounded border border-rose-500/40 text-[11px] text-rose-200 hover:bg-rose-900/50"
                >
                  Line {activeError.line}
                </button>
              )}
            </div>
            <pre className="font-mono text-xs text-rose-200 whitespace-pre-wrap">{activeError.message}</pre>
          </div>
        ) : (
          <p className="font-mono text-xs text-neutral-500">
            Write code in the editor and click <span className="text-amber-300">Debug</span> to inspect live execution.
          </p>
        )}
      </div>
    );
  }

  const stackFrames =
    currentStep.stack && currentStep.stack.length > 0
      ? currentStep.stack
      : [
          {
            functionName: currentStep.functionName || '<module>',
            line: currentStep.line,
            locals: currentStep.locals || {}
          }
        ];

  const topFrame = stackFrames[stackFrames.length - 1];
  const rawLocals = topFrame.locals || {};
  const entries = Object.entries(rawLocals);

  const arrayVars = entries.filter(([, v]) => Array.isArray(v)) as Array<[string, any[]]>;
  const dictVars = entries.filter(
    ([, v]) => v !== null && typeof v === 'object' && !Array.isArray(v)
  ) as Array<[string, Record<string, any>]>;
  const scalarVars = entries.filter(
    ([, v]) => v === null || typeof v !== 'object'
  ) as Array<[string, any]>;

  // Map array indices to pointer variable names (e.g., i=1, lo=0, hi=5)
  const activePointers: Array<{ name: string; index: number }> = [];
  for (const [k, v] of scalarVars) {
    if (typeof v === 'number' && Number.isInteger(v) && INDEX_VAR_NAMES.has(k.toLowerCase())) {
      activePointers.push({ name: k, index: v });
    }
  }

  const returnedIndices =
    currentStep.event === 'return' &&
    Array.isArray(currentStep.returnValue) &&
    currentStep.returnValue.every((x: any) => typeof x === 'number' && Number.isInteger(x))
      ? new Set<number>(currentStep.returnValue)
      : null;

  return (
    <div className={`${compact ? 'p-4 gap-4' : 'p-5 gap-5'} flex-1 flex flex-col justify-between`}>
      <div className="space-y-4">
        {/* Error Alert Banner (Syntax / Runtime exception) */}
        {activeError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-rose-500/50 bg-rose-950/30 px-3.5 py-2.5 space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-rose-300">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  {activeError.kind} at Line {activeError.line}
                  {activeError.column ? `:${activeError.column}` : ''}
                </span>
              </div>
              {onJumpToLine && (
                <button
                  type="button"
                  onClick={() => onJumpToLine(activeError.line)}
                  className="px-2 py-0.5 rounded border border-rose-500/40 bg-rose-950/60 hover:bg-rose-900/60 text-[11px] font-mono text-rose-200 transition-colors"
                >
                  Go to Line {activeError.line}
                </button>
              )}
            </div>
            <div className="font-mono text-xs text-rose-200 break-words">{activeError.message}</div>
          </motion.div>
        )}

        {/* Call Stack + Heap / Structures Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
          {/* Left: Stack Frames & Local Variables */}
          <div
            className={`${
              arrayVars.length > 0 || dictVars.length > 0 ? 'sm:col-span-5' : 'sm:col-span-12'
            } space-y-2.5`}
          >
            {stackFrames.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono text-neutral-400">
                {stackFrames.map((frame, idx) => (
                  <React.Fragment key={`${frame.functionName}-${idx}`}>
                    {idx > 0 && <CornerDownRight className="w-3 h-3 text-neutral-600" />}
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        idx === stackFrames.length - 1
                          ? 'bg-sky-950/50 text-sky-300 border border-sky-500/40'
                          : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                      }`}
                    >
                      {frame.functionName === '<module>' ? 'global' : `${frame.functionName}()`}:L{frame.line}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            )}

            <div className="rounded-lg border border-sky-500/45 bg-sky-950/15 p-3 font-mono text-xs">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] text-sky-300 font-semibold">
                  {topFrame.functionName === '<module>' ? 'global()' : `${topFrame.functionName}()`}
                </span>
                <span className="text-[10px] text-neutral-500 tabular-nums">line {currentStep.line}</span>
              </div>

              {entries.length === 0 ? (
                <div className="text-[11px] text-neutral-500 py-1 italic">No active local variables</div>
              ) : (
                <div className="space-y-1.5">
                  {arrayVars.map(([name, arr]) => (
                    <div
                      key={`arr-ref-${name}`}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-200"
                    >
                      <span className="truncate">{name}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-sky-400 shrink-0">
                        <span>[{arr.length}]</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  ))}

                  {dictVars.map(([name]) => (
                    <div
                      key={`dict-ref-${name}`}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-200"
                    >
                      <span className="truncate">{name}</span>
                      <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
                    </div>
                  ))}

                  {scalarVars.map(([name, val]) => {
                    const isPointer = INDEX_VAR_NAMES.has(name.toLowerCase()) && typeof val === 'number';
                    return (
                      <div
                        key={`scalar-${name}`}
                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-neutral-900 border ${
                          isPointer ? 'border-amber-500/40 text-amber-200' : 'border-neutral-800 text-neutral-200'
                        }`}
                      >
                        <span className="truncate text-neutral-300">{name}</span>
                        <span className="tabular-nums font-semibold text-white truncate max-w-[120px]">
                          {formatPrimitive(val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {currentStep.event === 'return' && currentStep.returnValue !== undefined && (
                <motion.div
                  initial={{ opacity: 0, y: -3 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-emerald-950/45 border border-emerald-500/50 text-emerald-300"
                >
                  <span>return</span>
                  <span className="tabular-nums font-semibold truncate">
                    {formatCompactValue(currentStep.returnValue)}
                  </span>
                </motion.div>
              )}
            </div>
          </div>

          {/* Right: Indexed Arrays + Dictionaries/Objects */}
          {(arrayVars.length > 0 || dictVars.length > 0) && (
            <div className="sm:col-span-7 space-y-5">
              {/* Array Visualizations */}
              {arrayVars.map(([name, arr]) => (
                <div key={`array-${name}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-neutral-400">{name}</span>
                    <span className="text-[10px] font-mono text-neutral-600 tabular-nums">
                      len = {arr.length}
                    </span>
                  </div>
                  {arr.length === 0 ? (
                    <div className="px-3 py-2 rounded-md border border-dashed border-neutral-800 text-xs font-mono text-neutral-500 inline-block">
                      []
                    </div>
                  ) : (
                    <div className="flex items-start gap-1.5 flex-wrap">
                      {arr.slice(0, 24).map((val, idx) => {
                        const matchingPtrs = activePointers.filter(p => p.index === idx);
                        const isMatched = returnedIndices?.has(idx) ?? false;
                        const isPointed = matchingPtrs.length > 0;
                        return (
                          <div key={idx} className="flex flex-col items-center gap-1">
                            <motion.div
                              animate={{
                                scale: isPointed || isMatched ? 1.05 : 1,
                                borderColor: isMatched
                                  ? '#10b981'
                                  : isPointed
                                  ? '#60a5fa'
                                  : '#3f3f46'
                              }}
                              transition={{ duration: 0.16 }}
                              className={`min-w-[38px] px-2 h-9 rounded-md border flex items-center justify-center font-mono text-xs font-semibold tabular-nums ${
                                isMatched
                                  ? 'bg-emerald-950/50 text-emerald-300'
                                  : isPointed
                                  ? 'bg-sky-950/50 text-sky-200'
                                  : 'bg-neutral-900 text-neutral-200'
                              }`}
                            >
                              {formatCompactValue(val)}
                            </motion.div>
                            <span className="text-[10px] font-mono tabular-nums text-neutral-500">{idx}</span>
                            {matchingPtrs.length > 0 && (
                              <span className="text-[10px] font-mono text-sky-400 leading-none">
                                {matchingPtrs.map(p => p.name).join(',')}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {arr.length > 24 && (
                        <span className="text-[11px] font-mono text-neutral-500 self-center pl-1">
                          +{arr.length - 24} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Dictionary / Hash Table / Object Visualizations */}
              {dictVars.map(([name, obj]) => {
                const pairs = Object.entries(obj).filter(([k]) => k !== '__type__');
                const slotCount = Math.max(pairs.length, 3);
                return (
                  <div key={`dict-${name}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-neutral-400">
                        {name}
                        {obj.__type__ ? ` (${obj.__type__})` : ''}
                      </span>
                      {pairs.length > 0 && (
                        <span className="text-[10px] font-mono text-neutral-600 tabular-nums">
                          {pairs.length} {pairs.length === 1 ? 'entry' : 'entries'}
                        </span>
                      )}
                    </div>
                    <div className="rounded-lg border border-neutral-800 bg-neutral-950/80 divide-y divide-neutral-800/80 max-w-[270px]">
                      {Array.from({ length: Math.min(slotCount, 10) }).map((_, slotIdx) => {
                        const pair = pairs[slotIdx];
                        return (
                          <div key={slotIdx} className="flex items-center justify-between px-3 py-1.5 gap-2.5">
                            <AnimatePresence mode="wait">
                              {pair ? (
                                <motion.div
                                  key={`k-${pair[0]}`}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="min-w-[38px] max-w-[96px] px-2 h-7 rounded border border-neutral-700 bg-neutral-900 flex items-center justify-center font-mono text-xs font-semibold text-neutral-200 truncate"
                                  title={String(pair[0])}
                                >
                                  {pair[0]}
                                </motion.div>
                              ) : (
                                <div className="w-9 h-7 rounded border border-dashed border-neutral-800" />
                              )}
                            </AnimatePresence>

                            <ArrowRight className="w-3.5 h-3.5 text-neutral-600 shrink-0" />

                            <AnimatePresence mode="wait">
                              {pair ? (
                                <motion.div
                                  key={`v-${pair[0]}-${formatCompactValue(pair[1])}`}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="min-w-[38px] max-w-[96px] px-2 h-7 rounded border border-neutral-700 bg-neutral-900 flex items-center justify-center font-mono text-xs font-semibold text-emerald-300 truncate"
                                  title={formatCompactValue(pair[1])}
                                >
                                  {formatCompactValue(pair[1])}
                                </motion.div>
                              ) : (
                                <div className="w-9 h-7 rounded border border-dashed border-neutral-800" />
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                      {pairs.length > 10 && (
                        <div className="px-3 py-1.5 text-[10px] font-mono text-neutral-500 text-center">
                          +{pairs.length - 10} more entries
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Console Output + Caption Footer */}
      <div className="space-y-2.5 pt-2 border-t border-neutral-900">
        {currentStep.stdout && (
          <div className="rounded-md border border-neutral-800 bg-[#070709] px-3 py-2 font-mono text-xs">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
              <Terminal className="w-3 h-3 text-emerald-400" />
              <span>Output</span>
            </div>
            <pre className="text-emerald-300 whitespace-pre-wrap break-words leading-relaxed">
              {currentStep.stdout}
            </pre>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 text-xs font-mono text-neutral-400">
          <span className="truncate">{currentStep.caption}</span>
          {truncated && (
            <span className="text-[10px] text-amber-400 shrink-0">Trace capped at 350 steps</span>
          )}
        </div>
      </div>
    </div>
  );
};
