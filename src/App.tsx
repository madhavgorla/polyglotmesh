import React, { useState, useEffect, useMemo } from 'react';
import { VisualiserWorkspaceView } from './components/VisualiserWorkspaceView';
import { ProblemsExplorerView } from './components/visualizer/ProblemsExplorerView';
import { ProblemSolverView } from './components/visualizer/ProblemSolverView';
import { DailyStreakCounter } from './components/visualizer/DailyStreakCounter';
import { ALGORITHM_PROBLEMS, AlgorithmProblem } from './data/visualizerProblems';
import {
  computeStreakFromDates,
  extractDatesFromTimestamps,
  readStoredDailyStreak,
  saveDailyStreak,
} from './utils/dailyStreak';

type AppMode = 'home' | 'problems' | 'solve';

const SOLVED_IDS_STORAGE_KEY = 'polyglotmesh_solved_ids_v1';
const SOLVE_TIMESTAMPS_STORAGE_KEY = 'polyglotmesh_solve_timestamps_v1';

function readStoredSolvedIds(): string[] {
  try {
    const raw = window.localStorage.getItem(SOLVED_IDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function readStoredTimestamps(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(SOLVE_TIMESTAMPS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string') out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>('home');
  const [selectedProblem, setSelectedProblem] = useState<AlgorithmProblem>(ALGORITHM_PROBLEMS[0]);
  const [solverLang, setSolverLang] = useState<'python' | 'javascript'>('python');
  const [solvedIds, setSolvedIds] = useState<string[]>(readStoredSolvedIds);
  const [solveTimestamps, setSolveTimestamps] = useState<Record<string, string>>(readStoredTimestamps);
  const [storedStreakDates, setStoredStreakDates] = useState<string[]>(
    () => readStoredDailyStreak().solvedDates
  );

  const dailyStreak = useMemo(() => {
    const fromTimestamps = extractDatesFromTimestamps(solveTimestamps);
    const merged = Array.from(new Set([...storedStreakDates, ...fromTimestamps]));
    return computeStreakFromDates(merged);
  }, [solveTimestamps, storedStreakDates]);

  useEffect(() => {
    saveDailyStreak(dailyStreak);
  }, [dailyStreak]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SOLVED_IDS_STORAGE_KEY, JSON.stringify(solvedIds));
    } catch {
      // Ignore storage quota errors
    }
  }, [solvedIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SOLVE_TIMESTAMPS_STORAGE_KEY, JSON.stringify(solveTimestamps));
    } catch {
      // Ignore storage quota errors
    }
  }, [solveTimestamps]);

  const handleMarkSolved = (id: string) => {
    setSolvedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setSolveTimestamps((prev) => (prev[id] ? prev : { ...prev, [id]: new Date().toISOString() }));
  };

  const handleToggleSolved = (id: string) => {
    const wasSolved = solvedIds.includes(id);
    setSolvedIds((prev) => {
      const exists = prev.includes(id);
      if (exists) {
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
    setSolveTimestamps((prev) => {
      if (wasSolved || prev[id]) {
        const next = { ...prev };
        delete next[id];
        const remainingDates = extractDatesFromTimestamps(next);
        setStoredStreakDates(remainingDates);
        return next;
      }
      return { ...prev, [id]: new Date().toISOString() };
    });
  };

  const handleResetProgress = () => {
    setSolvedIds([]);
    setSolveTimestamps({});
    setStoredStreakDates([]);
  };

  const openProblemInSolver = (
    problem: AlgorithmProblem,
    lang: 'python' | 'javascript' = 'python'
  ) => {
    setSelectedProblem(problem);
    setSolverLang(lang);
    setAppMode('solve');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const tryRandomProblem = () => {
    const random = ALGORITHM_PROBLEMS[Math.floor(Math.random() * ALGORITHM_PROBLEMS.length)];
    openProblemInSolver(random, 'python');
  };

  // Mode 2: Dedicated Problems Explorer
  if (appMode === 'problems') {
    return (
      <ProblemsExplorerView
        solvedIds={solvedIds}
        solveTimestamps={solveTimestamps}
        dailyStreak={dailyStreak}
        onToggleSolved={handleToggleSolved}
        onResetProgress={handleResetProgress}
        onSelectProblem={(problem) => openProblemInSolver(problem, 'python')}
        onGoHome={() => {
          setAppMode('home');
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
      />
    );
  }

  // Mode 3: Dedicated Split Problem Solver IDE
  if (appMode === 'solve') {
    return (
      <ProblemSolverView
        problem={selectedProblem}
        problems={ALGORITHM_PROBLEMS}
        solvedIds={solvedIds}
        dailyStreak={dailyStreak}
        initialLanguage={solverLang}
        isSolved={solvedIds.includes(selectedProblem.id)}
        onSelectProblem={(p) => openProblemInSolver(p, solverLang)}
        onBackToProblems={() => setAppMode('problems')}
        onGoHome={() => {
          setAppMode('home');
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
        onSolved={handleMarkSolved}
        onToggleSolved={handleToggleSolved}
      />
    );
  }

  // Mode 1: Visualiser Landing & Animated Illustrations
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 flex flex-col font-sans">
      <header className="sticky top-0 z-40 w-full bg-[#0a0a0a]/90 backdrop-blur-md border-b border-neutral-900 px-4 sm:px-8 py-3.5">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-8">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            PolyglotMesh
          </a>

          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-neutral-400">
            <button
              type="button"
              onClick={() => scrollToSection('two-sum-section')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Code Visualiser
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('animated-illustrations')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Animated Illustrations
            </button>
            <button
              type="button"
              onClick={() => setAppMode('problems')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Problems
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <DailyStreakCounter
              streak={dailyStreak}
              onOpenProblems={() => setAppMode('problems')}
            />
            <button
              type="button"
              onClick={() => setAppMode('problems')}
              className="px-4 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0"
            >
              Solve problems
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <VisualiserWorkspaceView
          onTryRandomProblem={tryRandomProblem}
          onExploreProblems={() => {
            setAppMode('problems');
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
          onOpenProblem={(prob, lang) => openProblemInSolver(prob, lang || 'python')}
        />
      </main>

      <footer className="border-t border-neutral-900 px-6 py-6 text-xs text-neutral-500">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>PolyglotMesh · Interactive Code Visualiser &amp; Live Debugger</span>
          <button
            type="button"
            onClick={() => setAppMode('problems')}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            Browse All Problems
          </button>
        </div>
      </footer>
    </div>
  );
}
