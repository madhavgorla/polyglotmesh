import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Code2,
  History,
  RotateCcw,
  Trash2,
  X
} from 'lucide-react';
import {
  MAX_EXECUTION_HISTORY,
  SuccessfulRunSnapshot
} from '../../data/problemInsights';
import { SolverLanguage } from '../../types';

const LANGUAGE_LABELS: Record<SolverLanguage, string> = {
  python: 'Python 3',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  java: 'Java',
  c: 'C',
  cpp: 'C++'
};

interface CodeExecutionHistoryPanelProps {
  entries: SuccessfulRunSnapshot[];
  currentCode: string;
  currentLang: SolverLanguage;
  undoSnapshot: { code: string; language: SolverLanguage } | null;
  revertedEntryId: string | null;
  onRevert: (entry: SuccessfulRunSnapshot) => void;
  onUndoRevert: () => void;
  onClear: () => void;
  onClose: () => void;
}

function formatRelativeTime(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60000) return 'Just now';
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '';
  }
}

function formatExactTime(iso: string): string {
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

export const CodeExecutionHistoryPanel: React.FC<CodeExecutionHistoryPanelProps> = ({
  entries,
  currentCode,
  currentLang,
  undoSnapshot,
  revertedEntryId,
  onRevert,
  onUndoRevert,
  onClear,
  onClose
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <aside
      aria-label="Code Execution History"
      className="h-full rounded-lg border border-neutral-800 bg-[#0b0b0e] flex flex-col overflow-hidden"
    >
      {/* Side Panel Header */}
      <div className="px-3.5 py-2.5 border-b border-neutral-800 bg-[#101014] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <History className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold text-white truncate">
            Code Execution History
          </span>
          <span className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 font-mono text-[10px] text-neutral-400 tabular-nums shrink-0">
            {entries.length}/{MAX_EXECUTION_HISTORY}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {entries.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear execution history"
              title="Clear saved versions for this problem"
              className="p-1 rounded text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Code Execution History"
            title="Close side panel"
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Undo Revert Banner */}
      {undoSnapshot && (
        <div className="px-3.5 py-2 border-b border-emerald-500/30 bg-emerald-950/25 flex items-center justify-between gap-2 text-[11px] shrink-0">
          <span className="text-emerald-300 truncate">
            Reverted to saved run
          </span>
          <button
            type="button"
            onClick={onUndoRevert}
            className="font-semibold text-emerald-200 hover:text-white underline underline-offset-2 whitespace-nowrap shrink-0"
          >
            Undo
          </button>
        </div>
      )}

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        <p className="text-[11px] text-neutral-500 leading-relaxed">
          Last {MAX_EXECUTION_HISTORY} successful runs for this problem. Revert anytime to restore an earlier working version.
        </p>

        {entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-800 bg-[#09090c] p-5 text-center space-y-2">
            <CheckCircle2 className="w-5 h-5 text-neutral-600 mx-auto" />
            <div className="text-xs font-medium text-neutral-300">
              No successful runs yet
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Run or Submit passing code to automatically capture snapshots here.
            </p>
          </div>
        ) : (
          entries.map((entry, idx) => {
            const isCurrent =
              entry.code === currentCode && entry.language === currentLang;
            const isExpanded = expandedId === entry.id;
            const wasJustReverted = revertedEntryId === entry.id;
            const lineCount = entry.code.split(/\r?\n/).length;
            const snippetLines = entry.code
              .split(/\r?\n/)
              .slice(0, isExpanded ? 24 : 3)
              .join('\n');

            return (
              <div
                key={entry.id}
                className={`rounded-lg border transition-colors overflow-hidden ${
                  isCurrent
                    ? 'border-emerald-500/45 bg-emerald-950/15'
                    : 'border-neutral-800 bg-[#0d0d11] hover:border-neutral-700'
                }`}
              >
                <div className="p-2.5 space-y-2">
                  {/* Top Row: Version Badge + Language + Time */}
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono font-semibold tabular-nums ${
                          idx === 0
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        {idx === 0 ? 'v1 · Latest' : `v${idx + 1}`}
                      </span>
                      <span className="font-medium text-neutral-200 truncate">
                        {LANGUAGE_LABELS[entry.language] || entry.language}
                      </span>
                    </div>

                    <span
                      className="font-mono text-[10px] text-neutral-500 tabular-nums shrink-0"
                      title={formatExactTime(entry.createdAt)}
                    >
                      {formatRelativeTime(entry.createdAt)}
                    </span>
                  </div>

                  {/* Metrics Row */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono text-neutral-400 tabular-nums">
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span>
                        {entry.action} · {entry.passedCount}/{entry.totalCount}
                      </span>
                    </span>
                    <span className="text-neutral-700">·</span>
                    <span>{entry.runtimeMs} ms</span>
                    {typeof entry.memoryUsedMb === 'number' && (
                      <>
                        <span className="text-neutral-700">·</span>
                        <span>{entry.memoryUsedMb.toFixed(2)} MB</span>
                      </>
                    )}
                  </div>

                  {/* Compact Code Snippet Preview */}
                  <div className="rounded border border-neutral-800/80 bg-[#08080a] px-2.5 py-1.5 overflow-x-auto">
                    <pre className="font-mono text-[10.5px] leading-4 text-neutral-300 whitespace-pre">
                      {snippetLines}
                    </pre>
                    {lineCount > 3 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId((prev) =>
                            prev === entry.id ? null : entry.id
                          )
                        }
                        className="mt-1 inline-flex items-center gap-1 text-[10px] font-sans text-neutral-500 hover:text-neutral-200 transition-colors"
                      >
                        <Code2 className="w-2.5 h-2.5" />
                        <span>
                          {isExpanded
                            ? 'Collapse preview'
                            : `Preview all ${lineCount} lines`}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Revert Footer */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="text-[10px] font-mono text-neutral-500 tabular-nums">
                      {lineCount} {lineCount === 1 ? 'line' : 'lines'}
                    </span>

                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-emerald-500/35 bg-emerald-500/10 text-[11px] font-medium text-emerald-300">
                        <Check className="w-3 h-3" />
                        <span>{wasJustReverted ? 'Restored' : 'Active'}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRevert(entry)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 hover:border-emerald-500/50 text-[11px] font-medium text-neutral-100 hover:text-emerald-300 transition-colors whitespace-nowrap"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Revert</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
