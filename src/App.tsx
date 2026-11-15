import React, { useState } from 'react';
import { VisualiserWorkspaceView } from './components/VisualiserWorkspaceView';
import { ProblemsExplorerView } from './components/visualizer/ProblemsExplorerView';
import { ProblemSolverView } from './components/visualizer/ProblemSolverView';
import { ALGORITHM_PROBLEMS, AlgorithmProblem } from './data/visualizerProblems';

type AppMode = 'home' | 'problems' | 'solve';

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>('home');
  const [selectedProblem, setSelectedProblem] = useState<AlgorithmProblem>(ALGORITHM_PROBLEMS[0]);
  const [solverLang, setSolverLang] = useState<'python' | 'javascript'>('python');
  const [solvedIds, setSolvedIds] = useState<string[]>([]);

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
        initialLanguage={solverLang}
        onBackToProblems={() => setAppMode('problems')}
        onGoHome={() => {
          setAppMode('home');
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
        onSolved={(id) =>
          setSolvedIds(prev => (prev.includes(id) ? prev : [...prev, id]))
        }
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

          <button
            type="button"
            onClick={() => setAppMode('problems')}
            className="px-4 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0"
          >
            Solve problems
          </button>
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
