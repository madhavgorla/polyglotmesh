import React, { useState } from 'react';
import { Play, Eye, Upload, Code2 } from 'lucide-react';
import { TwoSumVisualizer } from './visualizer/TwoSumVisualizer';
import { AlgorithmIllustrations } from './visualizer/AlgorithmIllustrations';
import { ALGORITHM_PROBLEMS, AlgorithmProblem } from '../data/visualizerProblems';
import { SolverLanguage, SupportedLanguage } from '../types';

interface VisualiserWorkspaceViewProps {
  onTryRandomProblem: () => void;
  onExploreProblems: () => void;
  onOpenProblem: (problem: AlgorithmProblem, language?: SolverLanguage, initialTab?: 'description' | 'visualiser') => void;
}

const LCA_PREVIEW_LINES = [
  '# Definition:',
  '# class Node:',
  '#   def __init__(self, val, parent=None):',
  '#     self.val = val',
  '#     self.parent = parent',
  '',
  'def lowestCommonAncestor(p: Node, q: Node) -> Node:',
  '    a, b = p, q',
  '    while a is not b:',
  '        a = a.parent if a.parent else q',
  '        b = b.parent if b.parent else p',
  '    return a'
];

export const VisualiserWorkspaceView: React.FC<VisualiserWorkspaceViewProps> = ({
  onTryRandomProblem,
  onExploreProblems,
  onOpenProblem
}) => {
  const [heroActiveNode, setHeroActiveNode] = useState<number>(5);

  const openLca = (tab: 'description' | 'visualiser' = 'description') => {
    const lca = ALGORITHM_PROBLEMS.find(p => p.id === 'lowest-common-ancestor') || ALGORITHM_PROBLEMS[0];
    onOpenProblem(lca, 'python', tab);
  };

  const handleImplementByTitle = (lang: SupportedLanguage, _code: string, title: string) => {
    const found =
      ALGORITHM_PROBLEMS.find(p => p.title.toLowerCase() === title.toLowerCase()) ||
      ALGORITHM_PROBLEMS[0];
    const solverLang: SolverLanguage = lang === 'ruby' ? 'python' : lang;
    onOpenProblem(found, solverLang, 'description');
  };

  return (
    <div className="space-y-24 pb-20 max-w-[1200px] mx-auto px-4 sm:px-6">
      {/* 1. Hero Section matching Photo 4 */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center pt-10 sm:pt-14">
        <div className="lg:col-span-5 space-y-6">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.08] text-white text-balance">
            Prepare for your coding interview{' '}
            <span className="text-emerald-400">with genuinely better tools</span>
          </h1>

          <ul className="space-y-3 text-[15px] text-neutral-300">
            <li className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-400 shrink-0" aria-hidden="true" />
              <span>Visualise your code line by line with an actual debugger</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-400 shrink-0" aria-hidden="true" />
              <span>Understand algorithms with animated illustrations</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-400 shrink-0" aria-hidden="true" />
              <span>Check your solution against every test case</span>
            </li>
          </ul>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onTryRandomProblem}
              className="px-5 py-2.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-semibold text-sm transition-colors whitespace-nowrap shrink-0"
            >
              Try with a random problem
            </button>
            <button
              type="button"
              onClick={onExploreProblems}
              className="px-5 py-2.5 rounded-lg bg-[#0d0d10] hover:bg-neutral-900 text-neutral-200 border border-neutral-800 font-medium text-sm transition-colors whitespace-nowrap shrink-0"
            >
              Explore problems
            </button>
          </div>
        </div>

        {/* Right Column: Framed IDE Preview matching Photo 4 */}
        <div className="lg:col-span-7">
          <div className="rounded-xl p-4 sm:p-6 bg-gradient-to-br from-blue-600/35 via-amber-500/25 to-indigo-700/40 border border-neutral-800/80">
            <div className="rounded-lg border border-neutral-800 bg-[#0b0b0e] overflow-hidden shadow-2xl">
              {/* Top App Window Bar */}
              <div className="flex items-center justify-between px-3.5 py-2 border-b border-neutral-800 bg-[#101014] text-[11px]">
                <span className="font-semibold text-neutral-300">PolyglotMesh</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openLca('visualiser')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-700/50 text-amber-300 hover:bg-amber-900/50 transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Visualise</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openLca('description')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-200 hover:bg-neutral-800 transition-colors"
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>Run</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openLca('description')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-400 text-neutral-950 font-semibold hover:bg-emerald-300 transition-colors"
                  >
                    <Upload className="w-2.5 h-2.5" />
                    <span>Submit</span>
                  </button>
                </div>
              </div>

              {/* Split Problem Description + Code Window */}
              <div className="grid grid-cols-1 sm:grid-cols-12 divide-y sm:divide-y-0 sm:divide-x divide-neutral-800">
                <div className="sm:col-span-5 flex flex-col">
                  <div className="flex items-center gap-3 px-3 py-1.5 border-b border-neutral-800 text-[10px] uppercase tracking-wider text-neutral-400">
                    <span className="text-white font-semibold">Description</span>
                    <span>Solutions</span>
                    <span>Submissions</span>
                  </div>

                  <div className="p-3.5 space-y-2.5">
                    <div>
                      <div className="text-sm font-bold text-white">Lowest Common Ancestor</div>
                      <div className="text-[10px] mt-0.5 flex items-center gap-2">
                        <span className="text-amber-400 font-medium">medium</span>
                        <span className="text-neutral-600">·</span>
                        <span className="text-emerald-400">solved</span>
                      </div>
                    </div>

                    <p className="font-editorial text-[11.5px] text-neutral-300 leading-relaxed">
                      Given two nodes <code className="font-mono text-neutral-200">p</code> and{' '}
                      <code className="font-mono text-neutral-200">q</code> from a tree, return their lowest common
                      ancestor.
                    </p>

                    <div className="pt-1 flex justify-center">
                      <svg viewBox="0 0 180 116" className="w-40 h-28 select-none" aria-label="Binary tree example">
                        <g stroke="#3f3f46" strokeWidth="1.2">
                          <line x1="90" y1="16" x2="55" y2="42" />
                          <line x1="90" y1="16" x2="125" y2="42" />
                          <line x1="55" y1="42" x2="34" y2="70" />
                          <line x1="55" y1="42" x2="76" y2="70" />
                          <line x1="125" y1="42" x2="110" y2="70" />
                          <line x1="125" y1="42" x2="146" y2="70" />
                          <line x1="76" y1="70" x2="62" y2="98" />
                          <line x1="76" y1="70" x2="90" y2="98" />
                        </g>
                        {[
                          { val: 3, x: 90, y: 16 },
                          { val: 5, x: 55, y: 42 },
                          { val: 1, x: 125, y: 42 },
                          { val: 6, x: 34, y: 70 },
                          { val: 2, x: 76, y: 70 },
                          { val: 0, x: 110, y: 70 },
                          { val: 8, x: 146, y: 70 },
                          { val: 7, x: 62, y: 98 },
                          { val: 4, x: 90, y: 98 }
                        ].map(node => {
                          const selected = heroActiveNode === node.val;
                          const isTarget = node.val === 6 || node.val === 4;
                          return (
                            <g key={node.val} onClick={() => setHeroActiveNode(node.val)} className="cursor-pointer">
                              <circle
                                cx={node.x}
                                cy={node.y}
                                r="10"
                                fill={selected ? '#4f46e5' : isTarget ? '#1e3a8a' : '#18181b'}
                                stroke={selected ? '#818cf8' : isTarget ? '#60a5fa' : '#52525b'}
                                strokeWidth="1.4"
                              />
                              <text
                                x={node.x}
                                y={node.y + 3.5}
                                textAnchor="middle"
                                className="fill-neutral-100 font-mono text-[9.5px] font-semibold"
                              >
                                {node.val}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    <div className="p-2 rounded bg-[#09090b] border border-neutral-800/80 font-mono text-[10px] text-neutral-400">
                      Input: tree = [3,5,1,6,2,0,8,null,null,7,4], p = 6, q = 4
                      <div className="text-neutral-200 mt-0.5">Output: 5</div>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-7 flex flex-col justify-between bg-[#09090b]">
                  <div>
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-800 text-[10px] text-neutral-400">
                      <span className="flex items-center gap-1.5 font-mono uppercase tracking-wider">
                        <Code2 className="w-3 h-3 text-neutral-400" />
                        Code
                      </span>
                      <span className="font-mono text-neutral-500">Python · Node {heroActiveNode}</span>
                    </div>

                    <div className="p-3 font-mono text-[10.5px] leading-5 text-neutral-300 overflow-x-auto">
                      {LCA_PREVIEW_LINES.map((line, i) => (
                        <div
                          key={i}
                          className={`flex gap-2.5 px-1 rounded ${
                            i === 6 ? 'bg-amber-950/35 text-white' : ''
                          }`}
                        >
                          <span className="w-4 text-right text-neutral-600 select-none tabular-nums">{i + 1}</span>
                          <pre className="whitespace-pre">{line}</pre>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="px-3 py-2 border-t border-neutral-800 flex items-center gap-4 text-[10px] uppercase tracking-wider text-neutral-400">
                    <span className="text-neutral-200">Test Cases</span>
                    <span>Test Result</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Two Sum Interactive Visualiser (Photo 1) */}
      <div id="two-sum-section" className="scroll-mt-20">
        <TwoSumVisualizer onImplement={handleImplementByTitle} />
      </div>

      {/* 3. Animated Illustrations 2x2 Gallery (Photos 2 & 3) */}
      <AlgorithmIllustrations onImplement={handleImplementByTitle} />
    </div>
  );
};
