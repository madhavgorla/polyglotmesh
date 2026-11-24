import React, { useState, useRef, useEffect } from 'react';
import { Flame, CheckCircle2 } from 'lucide-react';
import { DailyStreakState } from '../../utils/dailyStreak';

interface DailyStreakCounterProps {
  streak: DailyStreakState;
  onOpenProblems?: () => void;
}

export const DailyStreakCounter: React.FC<DailyStreakCounterProps> = ({
  streak,
  onOpenProblems,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const isActive = streak.count > 0;
  const solvedToday = streak.solvedToday;

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={`Daily streak: ${streak.count} consecutive ${
          streak.count === 1 ? 'day' : 'days'
        }`}
        title={
          solvedToday
            ? `${streak.count}-day streak active (solved today)`
            : isActive
            ? `${streak.count}-day streak — solve a problem today to keep it going`
            : '0-day streak — solve a problem today to start your streak'
        }
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
          solvedToday && isActive
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15'
            : isActive
            ? 'border-neutral-700 bg-[#131317] text-neutral-200 hover:border-neutral-600'
            : 'border-neutral-800 bg-[#131317] text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
        }`}
      >
        <Flame
          className={`w-3.5 h-3.5 shrink-0 ${
            solvedToday && isActive
              ? 'text-amber-400'
              : isActive
              ? 'text-amber-400/75'
              : 'text-neutral-500'
          }`}
          aria-hidden="true"
        />
        <span className="font-mono tabular-nums">{streak.count}d</span>
        <span className="hidden sm:inline text-neutral-400 font-normal">streak</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg border border-neutral-800 bg-[#111115] p-3.5 shadow-xl z-50 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
            <span className="font-semibold text-white">Daily Streak</span>
            <span className="font-mono tabular-nums text-amber-400 font-semibold">
              {streak.count} {streak.count === 1 ? 'day' : 'days'}
            </span>
          </div>

          <div className="space-y-2 text-neutral-300">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Today</span>
              {solvedToday ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Solved
                </span>
              ) : (
                <span className="text-neutral-400">Pending</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Active days</span>
              <span className="font-mono tabular-nums text-neutral-200">
                {streak.solvedDates.length}
              </span>
            </div>

            {streak.lastSolvedDate && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Last solve</span>
                <span className="font-mono tabular-nums text-neutral-200">
                  {streak.lastSolvedDate}
                </span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-neutral-500 leading-relaxed pt-1 border-t border-neutral-800/80">
            {solvedToday
              ? 'Great consistency — at least one problem solved today.'
              : 'Solve at least one algorithm problem today to extend your consecutive day streak.'}
          </p>

          {onOpenProblems && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenProblems();
              }}
              className="w-full py-1.5 px-3 rounded-md bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-semibold text-xs transition-colors"
            >
              Go to Problems
            </button>
          )}
        </div>
      )}
    </div>
  );
};
