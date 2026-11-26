import React, { useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  HardDrive
} from 'lucide-react';
import { ExecutionTelemetry, SolverLanguage } from '../../types';
import { ProblemComplexityResult } from '../../data/problemInsights';

export interface SessionTelemetryEntry {
  id: string;
  action: 'Run' | 'Submit' | 'Debug';
  language: SolverLanguage;
  verdict: string;
  passedCount?: number;
  totalCount?: number;
  telemetry: ExecutionTelemetry;
}

interface ExecutionMetricsTrackerProps {
  telemetry: ExecutionTelemetry | null;
  complexity?: ProblemComplexityResult;
  history: SessionTelemetryEntry[];
  isRunning: boolean;
}

const LANGUAGE_SHORT: Record<SolverLanguage, string> = {
  python: 'Python 3',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  java: 'Java',
  c: 'C',
  cpp: 'C++'
};

function formatDeltaMs(current: number, previous: number | undefined): string | null {
  if (previous === undefined) return null;
  const diff = Math.round((current - previous) * 100) / 100;
  if (diff === 0) return '0 ms vs prev';
  return `${diff > 0 ? '+' : ''}${diff} ms vs prev`;
}

function formatDeltaMb(current: number, previous: number | undefined): string | null {
  if (previous === undefined) return null;
  const diff = Math.round((current - previous) * 100) / 100;
  if (diff === 0) return '0.00 MB vs prev';
  return `${diff > 0 ? '+' : ''}${diff.toFixed(2)} MB vs prev`;
}

function formatShortTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return '';
  }
}

export const ExecutionMetricsTracker: React.FC<ExecutionMetricsTrackerProps> = ({
  telemetry,
  complexity,
  history,
  isRunning
}) => {
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);

  if (isRunning) {
    return (
      <div
        aria-label="Measuring execution telemetry"
        className="rounded-md border border-neutral-800 bg-[#0d0d11] overflow-hidden"
      >
        <div className="px-3 py-2 border-b border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400">
          <span className="inline-flex items-center gap-1.5 font-sans font-medium text-neutral-300">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Measuring runtime &amp; memory telemetry...</span>
          </span>
          <span className="font-mono text-neutral-500">Live probe</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-neutral-800/80">
          {[0, 1, 2, 3].map((slot) => (
            <div key={slot} className="p-2.5 space-y-2">
              <div className="h-2.5 w-20 bg-neutral-800/90 rounded animate-pulse" />
              <div className="h-5 w-24 bg-neutral-800 rounded animate-pulse" />
              <div className="h-1.5 w-full bg-neutral-900 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!telemetry && history.length === 0) {
    return (
      <div className="rounded-md border border-neutral-800 bg-[#0d0d11] px-3 py-2.5 flex items-center justify-between gap-3 text-[11px] text-neutral-500">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          <span className="truncate font-sans">
            Run or Submit code to inspect real-time execution latency and peak RSS memory telemetry.
          </span>
        </div>
      </div>
    );
  }

  const active = telemetry || history[0].telemetry;
  const previousEntry = history.length >= 2 ? history[1] : undefined;
  const timeDelta = formatDeltaMs(active.executionTimeMs, previousEntry?.telemetry.executionTimeMs);
  const memDelta = formatDeltaMb(active.memoryUsedMb, previousEntry?.telemetry.memoryUsedMb);

  const timePct = Math.min(
    100,
    Math.max(2, Math.round((active.executionTimeMs / Math.max(1, active.timeoutLimitMs)) * 100))
  );
  const memPct = Math.min(
    100,
    Math.max(2, Math.round((active.memoryUsedMb / Math.max(1, active.memoryLimitMb)) * 100))
  );

  const timeDeltaPositive =
    previousEntry !== undefined && active.executionTimeMs > previousEntry.telemetry.executionTimeMs;
  const timeDeltaNegative =
    previousEntry !== undefined && active.executionTimeMs < previousEntry.telemetry.executionTimeMs;
  const memDeltaPositive =
    previousEntry !== undefined && active.memoryUsedMb > previousEntry.telemetry.memoryUsedMb;
  const memDeltaNegative =
    previousEntry !== undefined && active.memoryUsedMb < previousEntry.telemetry.memoryUsedMb;

  const sparkEntries = history.slice(0, 10).reverse();
  const maxSparkMs = Math.max(...sparkEntries.map((e) => e.telemetry.executionTimeMs), 1);
  const maxSparkMb = Math.max(...sparkEntries.map((e) => e.telemetry.memoryUsedMb), 0.1);

  return (
    <div className="rounded-md border border-neutral-800 bg-[#0d0d11] overflow-hidden">
      {/* Tracker Top Header */}
      <div className="px-3 py-2 border-b border-neutral-800/80 bg-[#101015] flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="font-sans font-semibold text-neutral-200 whitespace-nowrap">
            Execution &amp; Memory Telemetry
          </span>
          <span className="text-neutral-700">·</span>
          <span className="font-mono text-neutral-400 truncate">
            {active.backendSource === 'graalvm-backend'
              ? 'GraalVM WebFlux Backend'
              : 'Polyglot Sandbox'}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {active.measuredAt && (
            <span className="hidden sm:inline font-mono text-neutral-500 tabular-nums">
              {formatShortTime(active.measuredAt)}
            </span>
          )}
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setHistoryOpen((open) => !open)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-[11px] font-sans font-medium text-neutral-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              <span>Run History ({history.length})</span>
              {historyOpen ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* 4-Column Flat Hairline Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-neutral-800/80">
        {/* 1. Execution Time */}
        <div className="p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-sans">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3 text-neutral-500" />
              <span>Execution Time</span>
            </span>
            {active.compileTimeMs !== undefined && active.compileTimeMs > 0 && (
              <span className="font-mono text-[10px] text-neutral-500 tabular-nums">
                Compile {active.compileTimeMs} ms
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-base font-semibold font-mono text-neutral-100 tabular-nums">
              {active.executionTimeMs} <span className="text-xs font-normal text-neutral-400">ms</span>
            </span>
            {timeDelta && (
              <span
                className={`text-[10px] font-mono tabular-nums whitespace-nowrap ${
                  timeDeltaNegative
                    ? 'text-emerald-400'
                    : timeDeltaPositive
                    ? 'text-amber-400'
                    : 'text-neutral-500'
                }`}
              >
                {timeDelta}
              </span>
            )}
          </div>
          <div className="space-y-1">
            <div className="h-1 w-full rounded-full bg-neutral-900 overflow-hidden">
              <div
                style={{ width: `${timePct}%` }}
                className={`h-full transition-all duration-200 ${
                  timePct > 80
                    ? 'bg-rose-400'
                    : timePct > 50
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 tabular-nums">
              <span>{timePct}% of budget</span>
              <span>{active.timeoutLimitMs} ms max</span>
            </div>
          </div>
        </div>

        {/* 2. Peak Memory */}
        <div className="p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-sans">
            <span className="inline-flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-neutral-500" />
              <span>Peak Memory</span>
            </span>
            <span className="font-mono text-[10px] text-neutral-500 tabular-nums">
              {active.peakMemoryKb.toLocaleString()} KB
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-base font-semibold font-mono text-neutral-100 tabular-nums">
              {active.memoryUsedMb.toFixed(2)}{' '}
              <span className="text-xs font-normal text-neutral-400">MB</span>
            </span>
            {memDelta && (
              <span
                className={`text-[10px] font-mono tabular-nums whitespace-nowrap ${
                  memDeltaNegative
                    ? 'text-emerald-400'
                    : memDeltaPositive
                    ? 'text-amber-400'
                    : 'text-neutral-500'
                }`}
              >
                {memDelta}
              </span>
            )}
          </div>
          <div className="space-y-1">
            <div className="h-1 w-full rounded-full bg-neutral-900 overflow-hidden">
              <div
                style={{ width: `${memPct}%` }}
                className={`h-full transition-all duration-200 ${
                  memPct > 80
                    ? 'bg-rose-400'
                    : memPct > 50
                    ? 'bg-amber-400'
                    : 'bg-sky-400'
                }`}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 tabular-nums">
              <span>{memPct}% of ceiling</span>
              <span>{active.memoryLimitMb} MB cap</span>
            </div>
          </div>
        </div>

        {/* 3. Complexity Profile */}
        <div
          className="p-2.5 space-y-1.5"
          title={complexity?.notes?.length ? complexity.notes.join(' · ') : undefined}
        >
          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-sans">
            <span>Static Complexity</span>
            <span className="font-mono text-[10px] text-neutral-500">AST</span>
          </div>
          <div className="text-sm font-semibold font-mono text-neutral-100 tabular-nums truncate">
            {complexity ? `${complexity.time}` : 'Direct'}
            <span className="text-neutral-600 mx-1.5">·</span>
            <span className="text-neutral-300 font-normal">
              {complexity ? complexity.space : 'O(1)'}
            </span>
          </div>
          <div className="text-[10px] font-sans text-neutral-500 truncate">
            {complexity?.notes?.[0] || 'Time & auxiliary space profile'}
          </div>
        </div>

        {/* 4. Execution Engine */}
        <div className="p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-sans">
            <span className="inline-flex items-center gap-1">
              <Cpu className="w-3 h-3 text-neutral-500" />
              <span>Runtime Engine</span>
            </span>
          </div>
          <div className="text-xs font-medium font-mono text-neutral-200 leading-snug truncate" title={active.engine}>
            {active.engine}
          </div>
          <div className="text-[10px] font-sans text-neutral-500 truncate">
            {active.backendSource === 'graalvm-backend'
              ? 'Isolated GraalVM Polyglot context'
              : 'Container isolated execution'}
          </div>
        </div>
      </div>

      {/* Collapsible Run History + Sparkline Trend */}
      {historyOpen && history.length > 0 && (
        <div className="border-t border-neutral-800/80 bg-[#09090c] p-3 space-y-3">
          {sparkEntries.length >= 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded border border-neutral-800/80 bg-[#0d0d11] p-2.5 flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="text-[10px] font-sans uppercase tracking-wider text-neutral-500">
                    Latency Trend ({sparkEntries.length} runs)
                  </div>
                  <div className="text-xs font-mono text-neutral-300 tabular-nums">
                    {Math.min(...sparkEntries.map((e) => e.telemetry.executionTimeMs))} –{' '}
                    {Math.max(...sparkEntries.map((e) => e.telemetry.executionTimeMs))} ms
                  </div>
                </div>
                <svg
                  viewBox="0 0 120 28"
                  className="w-28 h-7 shrink-0 overflow-visible"
                  aria-label="Execution time trend"
                >
                  <polyline
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={sparkEntries
                      .map((entry, idx) => {
                        const x =
                          sparkEntries.length === 1
                            ? 60
                            : Math.round((idx / (sparkEntries.length - 1)) * 116) + 2;
                        const y =
                          25 -
                          Math.round((entry.telemetry.executionTimeMs / maxSparkMs) * 21);
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />
                </svg>
              </div>

              <div className="rounded border border-neutral-800/80 bg-[#0d0d11] p-2.5 flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="text-[10px] font-sans uppercase tracking-wider text-neutral-500">
                    Memory Trend ({sparkEntries.length} runs)
                  </div>
                  <div className="text-xs font-mono text-neutral-300 tabular-nums">
                    {Math.min(...sparkEntries.map((e) => e.telemetry.memoryUsedMb)).toFixed(2)} –{' '}
                    {Math.max(...sparkEntries.map((e) => e.telemetry.memoryUsedMb)).toFixed(2)} MB
                  </div>
                </div>
                <svg
                  viewBox="0 0 120 28"
                  className="w-28 h-7 shrink-0 overflow-visible"
                  aria-label="Peak memory trend"
                >
                  <polyline
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={sparkEntries
                      .map((entry, idx) => {
                        const x =
                          sparkEntries.length === 1
                            ? 60
                            : Math.round((idx / (sparkEntries.length - 1)) * 116) + 2;
                        const y =
                          25 -
                          Math.round((entry.telemetry.memoryUsedMb / maxSparkMb) * 21);
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />
                </svg>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-[11px] tabular-nums">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-500 font-sans">
                  <th className="py-1.5 pr-3 font-medium">#</th>
                  <th className="py-1.5 pr-3 font-medium">Action</th>
                  <th className="py-1.5 pr-3 font-medium">Language</th>
                  <th className="py-1.5 pr-3 font-medium">Verdict</th>
                  <th className="py-1.5 pr-3 font-medium text-right">Time</th>
                  <th className="py-1.5 pr-3 font-medium text-right">Memory</th>
                  <th className="py-1.5 font-medium text-right">Recorded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {history.slice(0, 12).map((entry, idx) => {
                  const ok =
                    entry.verdict === 'Accepted' || entry.verdict === 'Trace Ready';
                  return (
                    <tr key={entry.id} className="text-neutral-300">
                      <td className="py-1.5 pr-3 text-neutral-500">
                        {history.length - idx}
                      </td>
                      <td className="py-1.5 pr-3 font-sans">{entry.action}</td>
                      <td className="py-1.5 pr-3">
                        {LANGUAGE_SHORT[entry.language] || entry.language}
                      </td>
                      <td
                        className={`py-1.5 pr-3 font-sans font-medium ${
                          ok ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {entry.verdict}
                        {entry.passedCount !== undefined &&
                        entry.totalCount !== undefined
                          ? ` (${entry.passedCount}/${entry.totalCount})`
                          : ''}
                      </td>
                      <td className="py-1.5 pr-3 text-right">
                        {entry.telemetry.executionTimeMs} ms
                      </td>
                      <td className="py-1.5 pr-3 text-right">
                        {entry.telemetry.memoryUsedMb.toFixed(2)} MB
                      </td>
                      <td className="py-1.5 text-right text-neutral-500">
                        {formatShortTime(entry.telemetry.measuredAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
