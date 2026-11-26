import React, { useState, useMemo } from 'react';
import { PanelLeftClose, PanelLeftOpen, Layers, Grid2X2, Search, Check, ArrowRight } from 'lucide-react';
import { ALGORITHM_PROBLEMS, ALL_TOPICS, AlgorithmProblem } from '../../data/visualizerProblems';
import { getDailyChallengeProblem } from '../../data/problemInsights';
import { UserProgressDashboard } from './UserProgressDashboard';
import { DailyStreakCounter } from './DailyStreakCounter';
import { DailyStreakState, readStoredDailyStreak } from '../../utils/dailyStreak';

interface ProblemsExplorerViewProps {
  onSelectProblem: (problem: AlgorithmProblem) => void;
  onGoHome: () => void;
  solvedIds: string[];
  solveTimestamps?: Record<string, string>;
  dailyStreak?: DailyStreakState;
  onToggleSolved?: (problemId: string) => void;
  onResetProgress?: () => void;
  onOpenCommandPalette?: () => void;
}

const DIFFICULTY_META: Record<
  AlgorithmProblem['difficulty'],
  {
    label: 'Easy' | 'Medium' | 'Hard';
    bars: 1 | 2 | 3;
    badgeClass: string;
    activeBarClass: string;
    inactiveBarClass: string;
  }
> = {
  easy: {
    label: 'Easy',
    bars: 1,
    badgeClass: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300',
    activeBarClass: 'bg-emerald-400',
    inactiveBarClass: 'bg-emerald-500/20',
  },
  medium: {
    label: 'Medium',
    bars: 2,
    badgeClass: 'bg-amber-500/10 border-amber-500/40 text-amber-300',
    activeBarClass: 'bg-amber-400',
    inactiveBarClass: 'bg-amber-500/20',
  },
  hard: {
    label: 'Hard',
    bars: 3,
    badgeClass: 'bg-rose-500/10 border-rose-500/40 text-rose-300',
    activeBarClass: 'bg-rose-400',
    inactiveBarClass: 'bg-rose-500/20',
  },
};

const DifficultyBadge: React.FC<{ difficulty: AlgorithmProblem['difficulty']; fixedWidth?: boolean }> = ({
  difficulty,
  fixedWidth = false,
}) => {
  const meta = DIFFICULTY_META[difficulty];
  return (
    <span
      aria-label={`Difficulty: ${meta.label}`}
      className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] font-semibold tracking-tight whitespace-nowrap shrink-0 ${meta.badgeClass} ${
        fixedWidth ? 'min-w-[84px]' : ''
      }`}
    >
      <span className="inline-flex items-end gap-0.5 h-3" aria-hidden="true">
        <span className={`w-[3px] h-1 rounded-xs ${meta.bars >= 1 ? meta.activeBarClass : meta.inactiveBarClass}`} />
        <span className={`w-[3px] h-2 rounded-xs ${meta.bars >= 2 ? meta.activeBarClass : meta.inactiveBarClass}`} />
        <span className={`w-[3px] h-3 rounded-xs ${meta.bars >= 3 ? meta.activeBarClass : meta.inactiveBarClass}`} />
      </span>
      <span>{meta.label}</span>
    </span>
  );
};

export const ProblemsExplorerView: React.FC<ProblemsExplorerViewProps> = ({
  onSelectProblem,
  onGoHome,
  solvedIds,
  solveTimestamps = {},
  dailyStreak,
  onToggleSolved,
  onResetProgress,
  onOpenCommandPalette,
}) => {
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const dailyProblem = useMemo(() => getDailyChallengeProblem(ALGORITHM_PROBLEMS), []);
  const isDailySolved = solvedIds.includes(dailyProblem.id);

  const filteredProblems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ALGORITHM_PROBLEMS.filter(p => {
      if (selectedTopic !== 'All' && !p.topics.includes(selectedTopic) && p.category !== selectedTopic) {
        return false;
      }
      if (selectedWeek !== 'all' && String(p.week || '') !== selectedWeek) {
        return false;
      }
      if (selectedDifficulty !== 'all' && p.difficulty !== selectedDifficulty) {
        return false;
      }
      if (q) {
        const numStr = p.leetcodeNumber ? String(p.leetcodeNumber) : '';
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchNum = numStr.includes(q);
        const matchCat = (p.category || '').toLowerCase().includes(q);
        if (!matchTitle && !matchNum && !matchCat) return false;
      }
      return true;
    });
  }, [selectedTopic, selectedWeek, selectedDifficulty, searchQuery]);

  const resetFilters = () => {
    setSelectedTopic('All');
    setSelectedWeek('all');
    setSelectedDifficulty('all');
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 flex">
      {/* Left Sidebar matching Photo 5 */}
      <aside
        className={`${
          sidebarOpen ? 'w-60' : 'w-14'
        } shrink-0 bg-[#111113] border-r border-neutral-800/80 flex flex-col justify-between transition-all duration-200`}
      >
        <div>
          <div className="h-14 px-4 flex items-center justify-between border-b border-neutral-800/60">
            {sidebarOpen && (
              <button
                type="button"
                onClick={onGoHome}
                className="text-base font-bold tracking-tight text-white hover:text-emerald-400 transition-colors whitespace-nowrap"
              >
                PolyglotMesh
              </button>
            )}
            <button
              type="button"
              onClick={() => setSidebarOpen(prev => !prev)}
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors"
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
          </div>

          <nav className="p-2.5 space-y-1">
            <button
              type="button"
              onClick={resetFilters}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-neutral-800/80 text-white text-xs font-medium transition-colors"
            >
              <Grid2X2 className="w-4 h-4 text-neutral-200 shrink-0" />
              {sidebarOpen && <span className="whitespace-nowrap">Solve problems</span>}
            </button>

            <button
              type="button"
              onClick={onGoHome}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800/50 text-xs font-medium transition-colors"
            >
              <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
              {sidebarOpen && <span className="whitespace-nowrap">Animated illustrations</span>}
            </button>
          </nav>
        </div>

        {sidebarOpen && (
          <div className="p-4 border-t border-neutral-800/80 space-y-3">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-white">Interactive Debugger</div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Execute Python &amp; JavaScript solutions with live line tracing and error diagnostics.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const random = ALGORITHM_PROBLEMS[Math.floor(Math.random() * ALGORITHM_PROBLEMS.length)];
                onSelectProblem(random);
              }}
              className="w-full py-2 px-3 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-semibold text-xs transition-colors"
            >
              Try a problem
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 px-6 sm:px-10 lg:px-14 py-8 max-w-[1160px]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-baseline gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Problems</h1>
                <span className="text-xs font-mono text-neutral-500 tabular-nums">
                  {filteredProblems.length} / {ALGORITHM_PROBLEMS.length}
                </span>
              </div>
              <DailyStreakCounter streak={dailyStreak ?? readStoredDailyStreak()} align="left" />
            </div>

            {/* Search + Week + Difficulty Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search title or #..."
                  aria-label="Search problems"
                  className="bg-[#111113] border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 w-44 sm:w-52"
                />
              </div>

              {onOpenCommandPalette && (
                <button
                  type="button"
                  onClick={onOpenCommandPalette}
                  title="Quick command jump (Ctrl/Cmd + K)"
                  className="bg-[#111113] border border-neutral-800 hover:border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-neutral-400 hover:text-white transition-colors whitespace-nowrap shrink-0"
                >
                  ⌘K
                </button>
              )}

              <select
                aria-label="Filter by Week"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="bg-[#111113] border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">All Weeks</option>
                {Array.from({ length: 12 }, (_, idx) => idx + 1).map(w => (
                  <option key={w} value={String(w)}>
                    Week {w}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by Difficulty"
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value as 'all' | 'easy' | 'medium' | 'hard')}
                className="bg-[#111113] border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">All Levels</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Today's Challenge Strip */}
          <div className="rounded-xl border border-neutral-800 bg-[#0d0d10] px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                <span className="font-semibold text-neutral-200">Today&apos;s Challenge</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span aria-hidden="true">·</span>
                <span className={isDailySolved ? 'text-emerald-400 font-medium' : 'text-neutral-400'}>
                  {isDailySolved ? 'Completed' : 'Unsolved'}
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-2.5">
                {dailyProblem.leetcodeNumber && (
                  <span className="text-xs font-mono text-neutral-500 tabular-nums">
                    #{dailyProblem.leetcodeNumber}
                  </span>
                )}
                <span className="text-sm font-semibold text-white">
                  {dailyProblem.title}
                </span>
                <span className="text-xs font-mono text-neutral-500">
                  W{dailyProblem.week || 1} · {dailyProblem.category || dailyProblem.topics[0]}
                </span>
                <DifficultyBadge difficulty={dailyProblem.difficulty} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectProblem(dailyProblem)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0"
            >
              <span>{isDailySolved ? 'Review Challenge' : "Solve Today's Challenge"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* User Progress Summary Dashboard */}
          <UserProgressDashboard
            problems={ALGORITHM_PROBLEMS}
            solvedIds={solvedIds}
            solveTimestamps={solveTimestamps}
            selectedDifficulty={selectedDifficulty}
            onFilterDifficulty={setSelectedDifficulty}
            onSelectProblem={onSelectProblem}
            onResetProgress={onResetProgress}
          />

          {/* TOPICS Filter Pills */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">Topics</span>
              {(selectedTopic !== 'All' || selectedWeek !== 'all' || selectedDifficulty !== 'all' || searchQuery) && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_TOPICS.map(topic => {
                const active = selectedTopic === topic;
                const count = ALGORITHM_PROBLEMS.filter(
                  p => p.topics.includes(topic) || p.category === topic
                ).length;
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setSelectedTopic(active ? 'All' : topic)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300'
                        : count > 0
                        ? 'bg-transparent border-neutral-800 text-neutral-200 hover:border-neutral-600'
                        : 'bg-transparent border-neutral-800/60 text-neutral-500 hover:border-neutral-700 hover:text-neutral-300'
                    }`}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alternating Zebra Problem Rows */}
          <div className="space-y-0.5 pt-1">
            {filteredProblems.length === 0 ? (
              <div className="rounded-lg border border-neutral-800 bg-[#141416] p-8 text-center space-y-3">
                <p className="text-sm text-neutral-300">
                  No problems match the current filter selection.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-neutral-700 text-neutral-200 hover:bg-neutral-800 transition-colors"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              filteredProblems.map((problem, idx) => {
                const isSolved = solvedIds.includes(problem.id);
                return (
                  <div
                    key={problem.id}
                    className={`w-full px-4 py-3 rounded-lg flex items-center gap-3.5 transition-colors hover:bg-neutral-800/70 ${
                      idx % 2 === 1 ? 'bg-[#141416]' : 'bg-transparent'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleSolved?.(problem.id)}
                      aria-label={
                        isSolved
                          ? `Mark ${problem.title} as unsolved`
                          : `Mark ${problem.title} as solved`
                      }
                      aria-pressed={isSolved}
                      title={isSolved ? 'Solved (click to unmark)' : 'Mark as solved'}
                      className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                        isSolved
                          ? 'border-emerald-400 bg-emerald-400 text-neutral-950'
                          : 'border-emerald-400/70 hover:border-emerald-300 bg-transparent'
                      }`}
                    >
                      {isSolved && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectProblem(problem)}
                      className="flex-1 min-w-0 flex items-center justify-between gap-4 text-left py-0.5"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {problem.leetcodeNumber && (
                          <span className="text-xs font-mono text-neutral-500 tabular-nums w-10 shrink-0">
                            #{problem.leetcodeNumber}
                          </span>
                        )}
                        <span className="text-sm font-medium text-neutral-100 truncate">
                          {problem.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        {problem.week && (
                          <span className="hidden md:inline max-w-[180px] truncate text-[11px] font-mono text-neutral-500">
                            W{problem.week} · {problem.category || problem.topics[0]}
                          </span>
                        )}
                        <DifficultyBadge difficulty={problem.difficulty} fixedWidth />
                      </div>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
