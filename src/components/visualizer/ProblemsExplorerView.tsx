import React, { useState, useMemo } from 'react';
import { PanelLeftClose, PanelLeftOpen, Layers, Grid2X2 } from 'lucide-react';
import { ALGORITHM_PROBLEMS, ALL_TOPICS, AlgorithmProblem } from '../../data/visualizerProblems';

interface ProblemsExplorerViewProps {
  onSelectProblem: (problem: AlgorithmProblem) => void;
  onGoHome: () => void;
  solvedIds: string[];
}

export const ProblemsExplorerView: React.FC<ProblemsExplorerViewProps> = ({
  onSelectProblem,
  onGoHome,
  solvedIds
}) => {
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const filteredProblems = useMemo(() => {
    if (selectedTopic === 'All') return ALGORITHM_PROBLEMS;
    return ALGORITHM_PROBLEMS.filter(p => p.topics.includes(selectedTopic));
  }, [selectedTopic]);

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
              onClick={() => setSelectedTopic('All')}
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

      {/* Main Content matching Photo 5 */}
      <main className="flex-1 min-w-0 px-6 sm:px-10 lg:px-14 py-8 max-w-[1160px]">
        <div className="space-y-7">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Problems</h1>

          {/* TOPICS Filter Pills (Interactive Filter Controls) */}
          <div className="space-y-3">
            <div className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">Topics</div>
            <div className="flex flex-wrap gap-2">
              {ALL_TOPICS.map(topic => {
                const active = selectedTopic === topic;
                const count = ALGORITHM_PROBLEMS.filter(p => p.topics.includes(topic)).length;
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

          {/* Alternating Zebra Problem Rows matching Photo 5 */}
          <div className="space-y-0.5 pt-2">
            {filteredProblems.length === 0 ? (
              <div className="rounded-lg border border-neutral-800 bg-[#141416] p-8 text-center space-y-3">
                <p className="text-sm text-neutral-300">
                  No interactive problems tagged with <strong className="text-white">{selectedTopic}</strong> yet.
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedTopic('All')}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-neutral-700 text-neutral-200 hover:bg-neutral-800 transition-colors"
                >
                  Show all problems
                </button>
              </div>
            ) : (
              filteredProblems.map((problem, idx) => {
                const isSolved = solvedIds.includes(problem.id);
                return (
                  <button
                    key={problem.id}
                    type="button"
                    onClick={() => onSelectProblem(problem)}
                    className={`w-full text-left px-4 py-3.5 rounded-lg flex items-center justify-between gap-4 transition-colors hover:bg-neutral-800/70 ${
                      idx % 2 === 1 ? 'bg-[#141416]' : 'bg-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span
                        className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${
                          isSolved ? 'border-emerald-400 bg-emerald-400/25' : 'border-emerald-400'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="text-sm font-medium text-neutral-100 truncate">{problem.title}</span>
                    </div>

                    <span
                      className={`text-xs font-medium shrink-0 ${
                        problem.difficulty === 'easy' ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {problem.difficulty}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
