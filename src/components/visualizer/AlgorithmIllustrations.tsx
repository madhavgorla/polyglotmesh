import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ArrowDown, ArrowUp, ArrowLeft } from 'lucide-react';
import { PlaybackBar } from './PlaybackBar';
import {
  PALINDROME_LIST_NODES,
  PALINDROME_LIST_STEPS,
  MERGE_INTERVALS_STEPS,
  WATER_BARS,
  WATER_STEPS,
  ISLAND_GRID,
  ISLAND_STEPS,
  ALGORITHM_PROBLEMS,
  getProblemCode
} from '../../data/visualizerProblems';
import { SupportedLanguage } from '../../types';

interface IllustrationProps {
  onImplement: (language: SupportedLanguage, code: string, title: string) => void;
}

function useStepPlayer(totalSteps: number, intervalMs = 850) {
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setIndex(prev => {
        if (prev >= totalSteps - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [isPlaying, totalSteps, intervalMs]);

  const togglePlay = () => {
    if (!isPlaying && index >= totalSteps - 1) {
      setIndex(0);
    }
    setIsPlaying(prev => !prev);
  };

  return {
    index,
    isPlaying,
    togglePlay,
    first: () => {
      setIsPlaying(false);
      setIndex(0);
    },
    prev: () => {
      setIsPlaying(false);
      setIndex(s => Math.max(0, s - 1));
    },
    next: () => {
      setIsPlaying(false);
      setIndex(s => Math.min(totalSteps - 1, s + 1));
    },
    last: () => {
      setIsPlaying(false);
      setIndex(totalSteps - 1);
    }
  };
}

interface CardFooterProps {
  title: string;
  description: string;
  onImplement: () => void;
}

const IllustrationCardFooter: React.FC<CardFooterProps> = ({ title, description, onImplement }) => (
  <div className="pt-4 mt-4 border-t border-neutral-800/90 flex items-end justify-between gap-4">
    <div className="space-y-1.5 min-w-0">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="font-editorial text-[13.5px] text-neutral-400 leading-relaxed line-clamp-3">{description}</p>
    </div>
    <button
      type="button"
      onClick={onImplement}
      className="px-4 py-2 text-xs font-medium text-neutral-100 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 rounded-lg transition-colors whitespace-nowrap shrink-0"
    >
      Implement
    </button>
  </div>
);

/* 1. Palindrome Linked List */
export const PalindromeLinkedListVisual: React.FC = () => {
  const player = useStepPlayer(PALINDROME_LIST_STEPS.length, 950);
  const step = PALINDROME_LIST_STEPS[player.index];

  return (
    <div className="flex flex-col items-center justify-center min-h-[225px] gap-5">
      {/* Linked List Visual */}
      <div className="flex items-center flex-wrap justify-center gap-1.5 sm:gap-2 py-6">
          {PALINDROME_LIST_NODES.map((val, idx) => {
            const hasSlow = step.slow === idx;
            const hasFast = step.fast === idx;
            const hasLeft = step.leftPtr === idx;
            const hasRight = step.rightPtr === idx;
            const isMatched = step.matchedIndices.includes(idx);
            const isReversedArrow = step.reversedFrom !== null && idx >= step.reversedFrom;

            return (
              <React.Fragment key={idx}>
                <div className="relative flex flex-col items-center">
                  {/* Top pointer label */}
                  {(hasSlow || hasLeft) && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-9 flex flex-col items-center text-[11px] font-mono text-sky-400"
                    >
                      <span>{hasSlow ? 'slow' : 'left'}</span>
                      <ArrowDown className="w-3 h-3" />
                    </motion.div>
                  )}

                  {/* Linked List Node Box [val | next] */}
                  <motion.div
                    animate={{
                      borderColor: isMatched
                        ? '#10b981'
                        : hasSlow || hasLeft
                        ? '#60a5fa'
                        : hasFast || hasRight
                        ? '#34d399'
                        : '#3f3f46',
                      scale: hasSlow || hasFast || hasLeft || hasRight ? 1.06 : 1
                    }}
                    transition={{ duration: 0.2 }}
                    className={`flex items-center h-9 rounded-md border overflow-hidden font-mono text-xs ${
                      isMatched
                        ? 'bg-emerald-950/35 text-emerald-300'
                        : hasSlow || hasLeft
                        ? 'bg-sky-950/30 text-white'
                        : 'bg-neutral-900 text-neutral-200'
                    }`}
                  >
                    <span className="w-7 h-full flex items-center justify-center font-semibold tabular-nums">
                      {val}
                    </span>
                    <span className="w-4 h-full border-l border-neutral-700/70 bg-neutral-950/60" />
                  </motion.div>

                  {/* Bottom pointer label */}
                  {(hasFast || hasRight) && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -bottom-9 flex flex-col items-center text-[11px] font-mono text-emerald-400"
                    >
                      <ArrowUp className="w-3 h-3" />
                      <span>{hasFast ? 'fast' : 'right'}</span>
                    </motion.div>
                  )}
                </div>

                {idx < PALINDROME_LIST_NODES.length - 1 && (
                  <motion.span
                    animate={{ rotate: isReversedArrow ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={`inline-flex ${isReversedArrow ? 'text-amber-400' : 'text-neutral-500'}`}
                    aria-hidden="true"
                  >
                    {isReversedArrow ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  </motion.span>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Dynamic Caption + Controls */}
        <p className="text-xs font-mono text-neutral-300 text-center min-h-[18px]">{step.caption}</p>

        <PlaybackBar
          compact
          currentIndex={player.index}
          totalSteps={PALINDROME_LIST_STEPS.length}
          isPlaying={player.isPlaying}
          onTogglePlay={player.togglePlay}
          onFirst={player.first}
          onPrev={player.prev}
          onNext={player.next}
          onLast={player.last}
        />
    </div>
  );
};

const PalindromeLinkedListCard: React.FC<{ onImplement: () => void }> = ({ onImplement }) => {
  const problem = ALGORITHM_PROBLEMS.find(p => p.id === 'palindrome-linked-list')!;
  return (
    <article className="rounded-xl border border-neutral-800 bg-[#0c0c0f] p-5 flex flex-col justify-between">
      <PalindromeLinkedListVisual />
      <IllustrationCardFooter
        title={problem.title}
        description={problem.description}
        onImplement={onImplement}
      />
    </article>
  );
};

/* 2. Merge Intervals */
export const MergeIntervalsVisual: React.FC = () => {
  const player = useStepPlayer(MERGE_INTERVALS_STEPS.length, 1000);
  const step = MERGE_INTERVALS_STEPS[player.index];

  const toPct = (val: number) => `${(val / 20) * 100}%`;
  const widthPct = (start: number, end: number) => `${((end - start) / 20) * 100}%`;

  return (
    <div className="flex flex-col items-center justify-center min-h-[225px] gap-4">
        {/* Interval Tracks */}
        <div className="w-full max-w-[440px] space-y-2">
          {step.rows.map((bar) => (
            <motion.div
              key={bar.id}
              layout
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-3"
            >
              <span className="w-16 text-right font-mono text-[11px] text-neutral-300 tabular-nums shrink-0">
                {bar.label}
              </span>
              <div className="relative flex-1 h-6 rounded bg-neutral-900/90 overflow-hidden">
                <motion.div
                  layout
                  transition={{ duration: 0.25 }}
                  style={{ left: toPct(bar.start), width: widthPct(bar.start, bar.end) }}
                  className={`absolute top-0.5 bottom-0.5 rounded border transition-colors ${
                    bar.state === 'active'
                      ? 'bg-sky-500/25 border-sky-400'
                      : bar.state === 'merged'
                      ? 'bg-emerald-500/20 border-emerald-500/70'
                      : bar.state === 'dim'
                      ? 'bg-neutral-800/50 border-neutral-700/50 opacity-50'
                      : 'bg-sky-950/35 border-sky-500/45'
                  }`}
                />
              </div>
            </motion.div>
          ))}

          {/* Merged Output Row */}
          <div className="flex items-center gap-3 pt-1">
            <span className="w-16 text-right font-mono text-[11px] text-neutral-400 shrink-0">merged</span>
            <div className="relative flex-1 h-6 rounded bg-neutral-950/60 border border-neutral-800/80 overflow-hidden">
              {step.merged.map((m, i) => (
                <motion.div
                  key={`${m.start}-${m.end}-${i}`}
                  initial={{ opacity: 0, scaleX: 0.8 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ duration: 0.22 }}
                  style={{ left: toPct(m.start), width: widthPct(m.start, m.end) }}
                  className={`absolute top-0.5 bottom-0.5 rounded border flex items-center justify-center font-mono text-[10px] tabular-nums ${
                    m.highlight
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                      : 'bg-sky-500/20 border-sky-400/70 text-sky-200'
                  }`}
                >
                  [{m.start},{m.end}]
                </motion.div>
              ))}
            </div>
          </div>

          {/* 0..20 Coordinate Axis */}
          <div className="flex items-center gap-3 pt-1">
            <span className="w-16 shrink-0" />
            <div className="flex-1 border-t border-neutral-800 pt-1 flex justify-between font-mono text-[10px] text-neutral-500 tabular-nums">
              <span>0</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
              <span>20</span>
            </div>
          </div>
        </div>

        <p className="text-xs font-mono text-neutral-300 text-center min-h-[18px]">{step.caption}</p>

        <PlaybackBar
          compact
          currentIndex={player.index}
          totalSteps={MERGE_INTERVALS_STEPS.length}
          isPlaying={player.isPlaying}
          onTogglePlay={player.togglePlay}
          onFirst={player.first}
          onPrev={player.prev}
          onNext={player.next}
          onLast={player.last}
        />
    </div>
  );
};

const MergeIntervalsCard: React.FC<{ onImplement: () => void }> = ({ onImplement }) => {
  const problem = ALGORITHM_PROBLEMS.find(p => p.id === 'merge-intervals')!;
  return (
    <article className="rounded-xl border border-neutral-800 bg-[#0c0c0f] p-5 flex flex-col justify-between">
      <MergeIntervalsVisual />
      <IllustrationCardFooter
        title={problem.title}
        description={problem.description}
        onImplement={onImplement}
      />
    </article>
  );
};

/* 3. Container With Most Water */
export const ContainerWaterVisual: React.FC = () => {
  const player = useStepPlayer(WATER_STEPS.length, 950);
  const step = WATER_STEPS[player.index];

  const maxH = 9;
  const chartHeightPx = 112;
  const waterPx = (step.waterHeight / maxH) * chartHeightPx;

  // Approximate horizontal span between lo and hi across 6 evenly spaced bars
  const loPct = (step.lo / (WATER_BARS.length - 1)) * 100;
  const hiPct = (step.hi / (WATER_BARS.length - 1)) * 100;

  return (
    <div className="flex flex-col items-center justify-center min-h-[225px] gap-4">
        <div className="relative w-full max-w-[330px] pt-6 pb-8 px-4">
          {/* Translucent Water Span between lo and hi */}
          {step.waterHeight > 0 && (
            <div className="relative w-full" style={{ height: `${chartHeightPx}px` }}>
              <motion.div
                animate={{
                  height: `${waterPx}px`,
                  left: `calc(${loPct}% * 0.86 + 7%)`,
                  width: `calc(${Math.max(0, hiPct - loPct)}% * 0.86)`
                }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="absolute bottom-0 bg-sky-500/20 border-t border-sky-400/50 rounded-t-xs pointer-events-none"
              />

              {/* Bars */}
              <div className="relative z-10 h-full flex items-end justify-between">
                {WATER_BARS.map((val, idx) => {
                  const isLo = idx === step.lo;
                  const isHi = idx === step.hi;
                  const barPx = (val / maxH) * chartHeightPx;

                  return (
                    <div key={idx} className="relative flex flex-col items-center w-8">
                      <span className="text-[11px] font-mono text-neutral-300 mb-1 tabular-nums">{val}</span>
                      <div
                        style={{ height: `${barPx}px` }}
                        className={`w-3.5 rounded-t-xs border-2 transition-colors ${
                          isLo && isHi
                            ? 'border-emerald-400 bg-emerald-950/60'
                            : isLo
                            ? 'border-violet-400 bg-violet-950/60'
                            : isHi
                            ? 'border-pink-400 bg-pink-950/60'
                            : 'border-neutral-500/70 bg-neutral-800/80'
                        }`}
                      />
                      <span className="absolute -bottom-5 text-[10px] font-mono text-neutral-500 tabular-nums">
                        {idx}
                      </span>

                      {(isLo || isHi) && (
                        <motion.div
                          initial={{ opacity: 0, y: 2 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`absolute -bottom-11 flex flex-col items-center text-[10px] font-mono font-semibold ${
                            isLo ? 'text-violet-400' : 'text-pink-400'
                          }`}
                        >
                          <ArrowUp className="w-3 h-3" />
                          <span>{isLo && isHi ? 'lo/hi' : isLo ? 'lo' : 'hi'}</span>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step.waterHeight === 0 && (
            <div className="relative w-full" style={{ height: `${chartHeightPx}px` }}>
              <div className="relative z-10 h-full flex items-end justify-between">
                {WATER_BARS.map((val, idx) => {
                  const isPtr = idx === step.lo;
                  const barPx = (val / maxH) * chartHeightPx;
                  return (
                    <div key={idx} className="relative flex flex-col items-center w-8">
                      <span className="text-[11px] font-mono text-neutral-300 mb-1 tabular-nums">{val}</span>
                      <div
                        style={{ height: `${barPx}px` }}
                        className={`w-3.5 rounded-t-xs border-2 ${
                          isPtr ? 'border-emerald-400 bg-emerald-950/60' : 'border-neutral-600 bg-neutral-800/70'
                        }`}
                      />
                      <span className="absolute -bottom-5 text-[10px] font-mono text-neutral-500 tabular-nums">
                        {idx}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <p className="text-xs font-mono text-neutral-300 text-center min-h-[18px]">{step.caption}</p>

        <PlaybackBar
          compact
          currentIndex={player.index}
          totalSteps={WATER_STEPS.length}
          isPlaying={player.isPlaying}
          onTogglePlay={player.togglePlay}
          onFirst={player.first}
          onPrev={player.prev}
          onNext={player.next}
          onLast={player.last}
        />
    </div>
  );
};

const ContainerWaterCard: React.FC<{ onImplement: () => void }> = ({ onImplement }) => {
  const problem = ALGORITHM_PROBLEMS.find(p => p.id === 'container-with-most-water')!;
  return (
    <article className="rounded-xl border border-neutral-800 bg-[#0c0c0f] p-5 flex flex-col justify-between">
      <ContainerWaterVisual />
      <IllustrationCardFooter
        title={problem.title}
        description={problem.description}
        onImplement={onImplement}
      />
    </article>
  );
};

/* 4. Largest Island */
export const LargestIslandVisual: React.FC = () => {
  const player = useStepPlayer(ISLAND_STEPS.length, 450);
  const step = ISLAND_STEPS[player.index];

  const activeKey = step.activeCell ? `${step.activeCell[0]},${step.activeCell[1]}` : '';

  return (
    <div className="flex flex-col items-center justify-center min-h-[225px] gap-4">
        <div className="grid grid-cols-4 gap-1.5 p-2 rounded-lg bg-neutral-950/70 border border-neutral-800/70">
          {ISLAND_GRID.map((row, r) =>
            row.map((cell, c) => {
              const k = `${r},${c}`;
              const isActive = activeKey === k;
              const isInCurrent = step.currentIsland.includes(k);
              const isVisitedLand = step.visitedLand.includes(k);
              const isScannedWater = step.scannedWater.includes(k);

              let cellCls = 'border-neutral-700 bg-neutral-900 text-neutral-300';
              if (cell === 0) {
                cellCls = isActive
                  ? 'border-sky-400 bg-sky-950/40 text-sky-200 border-dashed'
                  : isScannedWater
                  ? 'border-neutral-800 bg-neutral-950 text-neutral-600 border-dashed'
                  : 'border-neutral-700/80 bg-neutral-950/60 text-neutral-500 border-dashed';
              } else {
                if (isActive) {
                  cellCls = 'border-amber-400 bg-amber-500/25 text-amber-200';
                } else if (isInCurrent) {
                  cellCls = 'border-emerald-400 bg-emerald-500/20 text-emerald-200';
                } else if (isVisitedLand) {
                  cellCls = 'border-sky-500/50 bg-sky-950/35 text-sky-200';
                }
              }

              return (
                <motion.div
                  key={k}
                  animate={{ scale: isActive ? 1.08 : 1 }}
                  transition={{ duration: 0.15 }}
                  className={`w-9 h-9 rounded-md border flex items-center justify-center font-mono text-xs font-semibold tabular-nums transition-colors ${cellCls}`}
                >
                  {cell}
                </motion.div>
              );
            })
          )}
        </div>

        <p className="text-xs font-mono text-neutral-300 text-center min-h-[18px]">
          {step.caption} <span className="text-neutral-500">·</span>{' '}
          <span className="text-emerald-400">max = {step.largestSize}</span>
        </p>

        <PlaybackBar
          compact
          currentIndex={player.index}
          totalSteps={ISLAND_STEPS.length}
          isPlaying={player.isPlaying}
          onTogglePlay={player.togglePlay}
          onFirst={player.first}
          onPrev={player.prev}
          onNext={player.next}
          onLast={player.last}
        />
    </div>
  );
};

const LargestIslandCard: React.FC<{ onImplement: () => void }> = ({ onImplement }) => {
  const problem = ALGORITHM_PROBLEMS.find(p => p.id === 'largest-island')!;
  return (
    <article className="rounded-xl border border-neutral-800 bg-[#0c0c0f] p-5 flex flex-col justify-between">
      <LargestIslandVisual />
      <IllustrationCardFooter
        title={problem.title}
        description={problem.description}
        onImplement={onImplement}
      />
    </article>
  );
};

export const AlgorithmIllustrations: React.FC<IllustrationProps> = ({ onImplement }) => {
  const implementProblem = (id: string) => {
    const prob = ALGORITHM_PROBLEMS.find(p => p.id === id);
    if (!prob) return;
    onImplement('python', getProblemCode(prob, 'python'), prob.title);
  };

  return (
    <section id="animated-illustrations" aria-labelledby="illustrations-heading" className="space-y-5">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full border-2 border-emerald-400 shrink-0" aria-hidden="true" />
          <h2 id="illustrations-heading" className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Animated illustrations
          </h2>
        </div>
        <p className="font-editorial text-[15px] text-neutral-300">Each problem comes with illustrated solutions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <PalindromeLinkedListCard onImplement={() => implementProblem('palindrome-linked-list')} />
        <MergeIntervalsCard onImplement={() => implementProblem('merge-intervals')} />
        <ContainerWaterCard onImplement={() => implementProblem('container-with-most-water')} />
        <LargestIslandCard onImplement={() => implementProblem('largest-island')} />
      </div>
    </section>
  );
};
