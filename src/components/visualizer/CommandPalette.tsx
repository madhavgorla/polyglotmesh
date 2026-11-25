import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Check, Sparkles, Shuffle, LayoutGrid, Terminal, CornerDownLeft, X } from 'lucide-react';
import { AlgorithmProblem } from '../../data/visualizerProblems';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  problems: AlgorithmProblem[];
  solvedIds: string[];
  dailyProblem: AlgorithmProblem;
  onSelectProblem: (problem: AlgorithmProblem) => void;
  onOpenProblems: () => void;
  onGoHome: () => void;
  onOpenRandomUnsolved: () => void;
}

interface PaletteActionItem {
  kind: 'action' | 'problem';
  id: string;
  label: string;
  sublabel: string;
  difficulty?: AlgorithmProblem['difficulty'];
  solved?: boolean;
  problem?: AlgorithmProblem;
  onExecute: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  problems,
  solvedIds,
  dailyProblem,
  onSelectProblem,
  onOpenProblems,
  onGoHome,
  onOpenRandomUnsolved
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }
  }, [isOpen]);

  const items = useMemo<PaletteActionItem[]>(() => {
    const q = query.trim().toLowerCase();
    const solvedSet = new Set(solvedIds);
    const results: PaletteActionItem[] = [];

    if (!q) {
      results.push({
        kind: 'action',
        id: 'action-daily',
        label: `Today's Challenge: ${dailyProblem.leetcodeNumber ? `#${dailyProblem.leetcodeNumber} ` : ''}${dailyProblem.title}`,
        sublabel: `${dailyProblem.category || dailyProblem.topics[0] || 'Algorithm'} · Week ${dailyProblem.week || 1}`,
        difficulty: dailyProblem.difficulty,
        solved: solvedSet.has(dailyProblem.id),
        onExecute: () => {
          onSelectProblem(dailyProblem);
          onClose();
        }
      });

      const unsolvedCount = problems.length - solvedSet.size;
      results.push({
        kind: 'action',
        id: 'action-random-unsolved',
        label: unsolvedCount > 0 ? 'Random Unsolved Problem' : 'Random Practice Problem',
        sublabel: `${unsolvedCount} remaining across ${problems.length} curriculum problems`,
        onExecute: () => {
          onOpenRandomUnsolved();
          onClose();
        }
      });

      results.push({
        kind: 'action',
        id: 'action-explore',
        label: 'Explore Curriculum',
        sublabel: 'Browse all 154 problems by week, topic, and difficulty',
        onExecute: () => {
          onOpenProblems();
          onClose();
        }
      });

      results.push({
        kind: 'action',
        id: 'action-home',
        label: 'Interactive Code Visualiser',
        sublabel: 'Open the live step-by-step memory & algorithm showcase',
        onExecute: () => {
          onGoHome();
          onClose();
        }
      });
    }

    const matchedProblems = problems
      .filter((p) => {
        if (!q) return true;
        const num = p.leetcodeNumber ? String(p.leetcodeNumber) : '';
        const cat = (p.category || '').toLowerCase();
        const weekStr = p.week ? `w${p.week} week ${p.week}` : '';
        return (
          p.title.toLowerCase().includes(q) ||
          num.includes(q) ||
          cat.includes(q) ||
          weekStr.includes(q) ||
          p.difficulty.toLowerCase().includes(q) ||
          p.topics.some((t) => t.toLowerCase().includes(q))
        );
      })
      .slice(0, q ? 30 : 12);

    for (const p of matchedProblems) {
      results.push({
        kind: 'problem',
        id: p.id,
        label: `${p.leetcodeNumber ? `#${p.leetcodeNumber} ` : ''}${p.title}`,
        sublabel: `W${p.week || 1} · ${p.category || p.topics[0] || 'Algorithm'}`,
        difficulty: p.difficulty,
        solved: solvedSet.has(p.id),
        problem: p,
        onExecute: () => {
          onSelectProblem(p);
          onClose();
        }
      });
    }

    return results;
  }, [
    query,
    problems,
    solvedIds,
    dailyProblem,
    onSelectProblem,
    onOpenProblems,
    onGoHome,
    onOpenRandomUnsolved,
    onClose
  ]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const activeEl = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`);
    if (activeEl && typeof (activeEl as HTMLElement).scrollIntoView === 'function') {
      (activeEl as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) =>
        items.length > 0 ? (prev - 1 + items.length) % items.length : 0
      );
      return;
    }
    if (e.key === 'Enter' && items[activeIndex]) {
      e.preventDefault();
      items[activeIndex].onExecute();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Quick command palette"
      onKeyDown={handleKeyDown}
    >
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-2xl rounded-xl border border-neutral-800 bg-[#0d0d10] overflow-hidden shadow-2xl">
        <div className="h-12 px-4 border-b border-neutral-800 flex items-center gap-3">
          <Search className="w-4 h-4 text-neutral-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to problem (#, title, topic, week) or run command..."
            aria-label="Command palette search"
            className="flex-1 bg-transparent text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className="p-1 rounded text-neutral-500 hover:text-neutral-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={listRef} className="max-h-[380px] overflow-y-auto divide-y divide-neutral-900">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-neutral-500">
              No matching problems or commands found for "{query}".
            </div>
          ) : (
            items.map((item, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-idx={idx}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={item.onExecute}
                  className={`w-full px-4 py-2.5 flex items-center justify-between gap-4 text-left transition-colors ${
                    isActive ? 'bg-neutral-800/80 text-white' : 'text-neutral-200 hover:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.kind === 'action' ? (
                      <span className="w-5 h-5 flex items-center justify-center shrink-0 text-emerald-400">
                        {item.id === 'action-daily' ? (
                          <Sparkles className="w-3.5 h-3.5" />
                        ) : item.id === 'action-random-unsolved' ? (
                          <Shuffle className="w-3.5 h-3.5" />
                        ) : item.id === 'action-explore' ? (
                          <LayoutGrid className="w-3.5 h-3.5" />
                        ) : (
                          <Terminal className="w-3.5 h-3.5" />
                        )}
                      </span>
                    ) : (
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          item.solved
                            ? 'border-emerald-400 bg-emerald-400 text-neutral-950'
                            : 'border-neutral-700'
                        }`}
                      >
                        {item.solved && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </span>
                    )}

                    <div className="min-w-0">
                      <div className="text-xs font-medium text-neutral-100 truncate">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono truncate">
                        {item.sublabel}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-xs">
                    {item.difficulty && (
                      <span
                        className={`font-medium capitalize ${
                          item.difficulty === 'easy'
                            ? 'text-emerald-400'
                            : item.difficulty === 'hard'
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {item.difficulty}
                      </span>
                    )}
                    {isActive && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-neutral-400" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-neutral-800/80 bg-[#09090b] flex items-center justify-between text-[11px] font-mono text-neutral-500">
          <span>↑↓ Navigate · Enter Open · Esc Close</span>
          <span className="tabular-nums">
            {solvedIds.length} / {problems.length} Solved
          </span>
        </div>
      </div>
    </div>
  );
};
