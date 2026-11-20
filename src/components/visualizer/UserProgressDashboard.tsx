import React, { useMemo, useState } from 'react';
import { CheckCircle2, Flame, RotateCcw } from 'lucide-react';
import { AlgorithmProblem } from '../../data/visualizerProblems';

export type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard';
type HeatmapMode = 'curriculum' | 'activity';

interface UserProgressDashboardProps {
  problems: AlgorithmProblem[];
  solvedIds: string[];
  solveTimestamps?: Record<string, string>;
  selectedDifficulty?: DifficultyFilter;
  onFilterDifficulty?: (difficulty: DifficultyFilter) => void;
  onSelectProblem?: (problem: AlgorithmProblem) => void;
  onResetProgress?: () => void;
}

interface DifficultyStat {
  key: 'easy' | 'medium' | 'hard';
  label: string;
  solved: number;
  total: number;
  percent: number;
  stroke: string;
  textClass: string;
  barClass: string;
  tileClass: string;
}

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const UserProgressDashboard: React.FC<UserProgressDashboardProps> = ({
  problems,
  solvedIds,
  solveTimestamps = {},
  selectedDifficulty = 'all',
  onFilterDifficulty,
  onSelectProblem,
  onResetProgress,
}) => {
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('curriculum');
  const [hoveredProblem, setHoveredProblem] = useState<AlgorithmProblem | null>(null);
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number } | null>(null);

  const solvedSet = useMemo(() => new Set(solvedIds), [solvedIds]);

  const { totalCount, solvedCount, overallPercent, difficultyStats } = useMemo(() => {
    const totals = { easy: 0, medium: 0, hard: 0 };
    const solved = { easy: 0, medium: 0, hard: 0 };

    for (const p of problems) {
      totals[p.difficulty] += 1;
      if (solvedSet.has(p.id)) {
        solved[p.difficulty] += 1;
      }
    }

    const total = problems.length;
    const totalSolved = solved.easy + solved.medium + solved.hard;
    const pct = total > 0 ? Math.round((totalSolved / total) * 100) : 0;

    const stats: DifficultyStat[] = [
      {
        key: 'easy',
        label: 'Easy',
        solved: solved.easy,
        total: totals.easy,
        percent: totals.easy > 0 ? Math.round((solved.easy / totals.easy) * 100) : 0,
        stroke: '#34d399',
        textClass: 'text-emerald-400',
        barClass: 'bg-emerald-400',
        tileClass: 'bg-emerald-400 border-emerald-300',
      },
      {
        key: 'medium',
        label: 'Medium',
        solved: solved.medium,
        total: totals.medium,
        percent: totals.medium > 0 ? Math.round((solved.medium / totals.medium) * 100) : 0,
        stroke: '#fbbf24',
        textClass: 'text-amber-400',
        barClass: 'bg-amber-400',
        tileClass: 'bg-amber-400 border-amber-300',
      },
      {
        key: 'hard',
        label: 'Hard',
        solved: solved.hard,
        total: totals.hard,
        percent: totals.hard > 0 ? Math.round((solved.hard / totals.hard) * 100) : 0,
        stroke: '#fb7185',
        textClass: 'text-rose-400',
        barClass: 'bg-rose-400',
        tileClass: 'bg-rose-400 border-rose-300',
      },
    ];

    return {
      totalCount: total,
      solvedCount: totalSolved,
      overallPercent: pct,
      difficultyStats: stats,
    };
  }, [problems, solvedSet]);

  // SVG Ring geometry
  const ringRadius = 56;
  const ringCircumference = 2 * Math.PI * ringRadius;

  const ringSegments = useMemo(() => {
    if (totalCount === 0) return [];
    let accumulatedLength = 0;

    return difficultyStats.map((stat) => {
      const length = (stat.solved / totalCount) * ringCircumference;
      const segment = {
        ...stat,
        length,
        offset: -accumulatedLength,
      };
      accumulatedLength += length;
      return segment;
    });
  }, [difficultyStats, ringCircumference, totalCount]);

  // Group problems by week (0 = Core featured visualiser problems, 1..12 = curriculum weeks)
  const weekBuckets = useMemo(() => {
    const groups = new Map<number, AlgorithmProblem[]>();
    for (const p of problems) {
      const w = p.week ?? 0;
      const list = groups.get(w) ?? [];
      list.push(p);
      groups.set(w, list);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .map(([week, items]) => ({
        week,
        label: week === 0 ? 'Core' : `W${week}`,
        items,
      }));
  }, [problems]);

  // Build 16-week daily activity matrix from real solveTimestamps
  const activityData = useMemo(() => {
    const countsByDay = new Map<string, number>();

    for (const id of solvedIds) {
      const iso = solveTimestamps[id];
      if (!iso) continue;
      const parsed = new Date(iso);
      if (Number.isNaN(parsed.getTime())) continue;
      const key = toLocalDateKey(parsed);
      countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
    }

    const totalWeeks = 16;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Align grid so the rightmost column ends on Saturday of the current week
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - today.getDay()));

    const startDay = new Date(endOfWeek);
    startDay.setDate(endOfWeek.getDate() - (totalWeeks * 7 - 1));

    const columns: Array<Array<{ date: string; count: number; isFuture: boolean }>> = [];
    let cursor = new Date(startDay);

    for (let col = 0; col < totalWeeks; col += 1) {
      const weekDays: Array<{ date: string; count: number; isFuture: boolean }> = [];
      for (let row = 0; row < 7; row += 1) {
        const key = toLocalDateKey(cursor);
        const isFuture = cursor.getTime() > today.getTime();
        weekDays.push({
          date: key,
          count: isFuture ? 0 : (countsByDay.get(key) ?? 0),
          isFuture,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      columns.push(weekDays);
    }

    // Calculate current consecutive-day streak strictly from recorded dates
    let currentStreak = 0;
    const checkDay = new Date(today);
    if ((countsByDay.get(toLocalDateKey(checkDay)) ?? 0) === 0) {
      checkDay.setDate(checkDay.getDate() - 1);
    }
    while ((countsByDay.get(toLocalDateKey(checkDay)) ?? 0) > 0) {
      currentStreak += 1;
      checkDay.setDate(checkDay.getDate() - 1);
    }

    return {
      columns,
      activeDays: countsByDay.size,
      currentStreak,
    };
  }, [solvedIds, solveTimestamps]);

  const handleDifficultyToggle = (level: 'easy' | 'medium' | 'hard') => {
    if (!onFilterDifficulty) return;
    onFilterDifficulty(selectedDifficulty === level ? 'all' : level);
  };

  return (
    <section
      aria-label="User progress dashboard"
      className="rounded-xl border border-neutral-800 bg-[#0d0d10] overflow-hidden"
    >
      {/* Top Header Strip */}
      <div className="px-5 py-3.5 border-b border-neutral-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-sm font-semibold tracking-tight text-white">Progress Summary</h2>
          <span className="text-xs font-mono text-neutral-400 tabular-nums">
            {solvedCount} / {totalCount} solved · {overallPercent}%
          </span>
          {activityData.currentStreak > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 tabular-nums">
              <Flame className="w-3.5 h-3.5" aria-hidden="true" />
              {activityData.currentStreak}d streak
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onResetProgress && solvedCount > 0 && (
            <button
              type="button"
              onClick={onResetProgress}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/70 transition-colors"
              title="Clear recorded solved progress"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}

          <div
            role="tablist"
            aria-label="Heatmap visualization mode"
            className="inline-flex items-center rounded-lg border border-neutral-800 bg-[#0a0a0a] p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={heatmapMode === 'curriculum'}
              onClick={() => setHeatmapMode('curriculum')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                heatmapMode === 'curriculum'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Curriculum Grid
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={heatmapMode === 'activity'}
              onClick={() => setHeatmapMode('activity')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                heatmapMode === 'activity'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Activity Heatmap
            </button>
          </div>
        </div>
      </div>

      {/* Main 3-Column Dashboard Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-neutral-800/80">
        {/* Left: Segmented Progress Ring */}
        <div className="lg:col-span-3 p-5 flex flex-col items-center justify-center gap-2">
          <div className="relative w-[144px] h-[144px] flex items-center justify-center">
            <svg
              width="144"
              height="144"
              viewBox="0 0 144 144"
              className="-rotate-90"
              role="img"
              aria-label={`Progress ring: ${solvedCount} of ${totalCount} problems solved (${overallPercent}%)`}
            >
              {/* Subtle inner guide circle */}
              <circle
                cx="72"
                cy="72"
                r={ringRadius - 10}
                fill="none"
                stroke="#18181b"
                strokeWidth="1"
              />
              {/* Base background track */}
              <circle
                cx="72"
                cy="72"
                r={ringRadius}
                fill="none"
                stroke="#1c1c21"
                strokeWidth="10"
              />
              {/* Proportional difficulty arcs */}
              {ringSegments.map((seg) => {
                if (seg.length <= 0) return null;
                const dimmed =
                  selectedDifficulty !== 'all' && selectedDifficulty !== seg.key;
                return (
                  <circle
                    key={seg.key}
                    cx="72"
                    cy="72"
                    r={ringRadius}
                    fill="none"
                    stroke={seg.stroke}
                    strokeWidth="10"
                    strokeLinecap="butt"
                    strokeDasharray={`${seg.length} ${ringCircumference}`}
                    strokeDashoffset={seg.offset}
                    opacity={dimmed ? 0.28 : 1}
                    className="transition-all duration-500 ease-out"
                  />
                );
              })}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <div className="text-2xl font-bold tracking-tight text-white font-mono tabular-nums leading-none">
                {solvedCount}
                <span className="text-xs font-normal text-neutral-500">/{totalCount}</span>
              </div>
              <span className="mt-1.5 text-[11px] font-mono text-neutral-400 tabular-nums">
                {overallPercent}% done
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="tabular-nums">
              {totalCount - solvedCount} remaining
            </span>
          </div>
        </div>

        {/* Middle: Difficulty Breakdown Bars */}
        <div className="lg:col-span-4 p-5 flex flex-col justify-center gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              By Difficulty
            </span>
            {selectedDifficulty !== 'all' && onFilterDifficulty && (
              <button
                type="button"
                onClick={() => onFilterDifficulty('all')}
                className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Show all
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {difficultyStats.map((stat) => {
              const isSelected = selectedDifficulty === stat.key;
              return (
                <button
                  key={stat.key}
                  type="button"
                  onClick={() => handleDifficultyToggle(stat.key)}
                  disabled={!onFilterDifficulty}
                  className={`w-full text-left rounded-lg px-3 py-2 border transition-colors ${
                    isSelected
                      ? 'bg-neutral-800/80 border-neutral-600'
                      : 'bg-[#111114] border-neutral-800/80 hover:border-neutral-700'
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="flex items-center gap-2 font-medium text-neutral-100">
                      <span
                        className={`w-2 h-2 rounded-xs ${stat.barClass}`}
                        aria-hidden="true"
                      />
                      {stat.label}
                    </span>
                    <span className="font-mono tabular-nums text-neutral-300">
                      {stat.solved}
                      <span className="text-neutral-500"> / {stat.total}</span>
                      <span className={`ml-2 ${stat.textClass}`}>{stat.percent}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-neutral-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${stat.barClass} transition-all duration-500 ease-out`}
                      style={{ width: `${stat.percent}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Dual-Mode Visual Heatmap */}
        <div className="lg:col-span-5 p-5 flex flex-col justify-between gap-3">
          {heatmapMode === 'curriculum' ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Curriculum Mastery Map
                </span>
                <span className="text-[11px] font-mono text-neutral-500 tabular-nums">
                  {weekBuckets.length} groups · {totalCount} items
                </span>
              </div>

              <div
                className="flex items-end gap-1.5 overflow-x-auto pb-1"
                onMouseLeave={() => setHoveredProblem(null)}
              >
                {weekBuckets.map((bucket) => (
                  <div key={bucket.week} className="flex flex-col items-center gap-1.5 shrink-0">
                    <div className="grid grid-cols-2 gap-1">
                      {bucket.items.map((problem) => {
                        const isSolved = solvedSet.has(problem.id);
                        const matchesFilter =
                          selectedDifficulty === 'all' ||
                          problem.difficulty === selectedDifficulty;

                        const solvedStyle =
                          problem.difficulty === 'easy'
                            ? 'bg-emerald-400 border-emerald-300'
                            : problem.difficulty === 'hard'
                            ? 'bg-rose-400 border-rose-300'
                            : 'bg-amber-400 border-amber-300';

                        const unsolvedStyle =
                          problem.difficulty === 'easy'
                            ? 'bg-emerald-500/10 border-emerald-500/25 hover:border-emerald-400'
                            : problem.difficulty === 'hard'
                            ? 'bg-rose-500/10 border-rose-500/25 hover:border-rose-400'
                            : 'bg-amber-500/10 border-amber-500/25 hover:border-amber-400';

                        return (
                          <button
                            key={problem.id}
                            type="button"
                            onMouseEnter={() => setHoveredProblem(problem)}
                            onFocus={() => setHoveredProblem(problem)}
                            onClick={() => onSelectProblem?.(problem)}
                            aria-label={`${problem.title} (${problem.difficulty}) - ${
                              isSolved ? 'Solved' : 'Unsolved'
                            }`}
                            className={`w-2.5 h-2.5 rounded-[2px] border transition-all ${
                              isSolved ? solvedStyle : unsolvedStyle
                            } ${matchesFilter ? 'opacity-100' : 'opacity-25'}`}
                          />
                        );
                      })}
                    </div>
                    <span className="text-[10px] font-mono text-neutral-500 tabular-nums">
                      {bucket.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800/70 text-[11px]">
                <div className="text-neutral-300 truncate min-w-0 font-mono">
                  {hoveredProblem ? (
                    <span>
                      {hoveredProblem.leetcodeNumber ? `#${hoveredProblem.leetcodeNumber} · ` : ''}
                      {hoveredProblem.title} ·{' '}
                      <span
                        className={
                          hoveredProblem.difficulty === 'easy'
                            ? 'text-emerald-400'
                            : hoveredProblem.difficulty === 'hard'
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }
                      >
                        {hoveredProblem.difficulty}
                      </span>{' '}
                      · {solvedSet.has(hoveredProblem.id) ? 'Solved' : 'Pending'}
                    </span>
                  ) : (
                    <span className="text-neutral-500">
                      Hover any tile to inspect · Click to solve
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-neutral-400 shrink-0">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-[2px] bg-neutral-800 border border-neutral-700" />
                    Todo
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-[2px] bg-emerald-400" />
                    Easy
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-[2px] bg-amber-400" />
                    Med
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-[2px] bg-rose-400" />
                    Hard
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  16-Week Solve Activity
                </span>
                <span className="text-[11px] font-mono text-neutral-500 tabular-nums">
                  {activityData.activeDays} active {activityData.activeDays === 1 ? 'day' : 'days'}
                </span>
              </div>

              <div
                className="flex items-center gap-2 overflow-x-auto pb-1"
                onMouseLeave={() => setHoveredDay(null)}
              >
                <div className="flex flex-col justify-between h-[86px] text-[9px] font-mono text-neutral-500 pr-1 shrink-0 py-0.5">
                  <span>Mon</span>
                  <span>Wed</span>
                  <span>Fri</span>
                </div>

                <div className="flex gap-1">
                  {activityData.columns.map((weekCol, colIdx) => (
                    <div key={colIdx} className="flex flex-col gap-1">
                      {weekCol.map((cell) => {
                        const intensityClass = cell.isFuture
                          ? 'bg-transparent border-transparent'
                          : cell.count === 0
                          ? 'bg-[#17171b] border-neutral-800/80 hover:border-neutral-600'
                          : cell.count === 1
                          ? 'bg-emerald-900 border-emerald-700'
                          : cell.count === 2
                          ? 'bg-emerald-600 border-emerald-500'
                          : 'bg-emerald-400 border-emerald-300';

                        return (
                          <button
                            key={cell.date}
                            type="button"
                            disabled={cell.isFuture}
                            onMouseEnter={() => setHoveredDay(cell)}
                            onFocus={() => setHoveredDay(cell)}
                            aria-label={`${cell.date}: ${cell.count} solved`}
                            className={`w-2.5 h-2.5 rounded-[2px] border transition-colors ${intensityClass}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800/70 text-[11px]">
                <div className="font-mono text-neutral-300 truncate min-w-0 tabular-nums">
                  {hoveredDay ? (
                    <span>
                      {hoveredDay.date} · {hoveredDay.count}{' '}
                      {hoveredDay.count === 1 ? 'problem' : 'problems'} solved
                    </span>
                  ) : solvedCount === 0 ? (
                    <span className="text-neutral-500">
                      Solve or check off a problem below to log daily activity.
                    </span>
                  ) : (
                    <span className="text-neutral-500">
                      Hover a day square to inspect solves
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-neutral-500 shrink-0">
                  <span>Less</span>
                  <span className="w-2 h-2 rounded-[2px] bg-[#17171b] border border-neutral-800" />
                  <span className="w-2 h-2 rounded-[2px] bg-emerald-900" />
                  <span className="w-2 h-2 rounded-[2px] bg-emerald-600" />
                  <span className="w-2 h-2 rounded-[2px] bg-emerald-400" />
                  <span>More</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
