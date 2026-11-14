import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Code2, Layers, ArrowRight, Play } from 'lucide-react';
import { PlaybackBar } from './PlaybackBar';
import {
  TWO_SUM_NUMS,
  TWO_SUM_TARGET,
  TWO_SUM_STEPS,
  TWO_SUM_PYTHON,
  TWO_SUM_JS
} from '../../data/visualizerProblems';
import { SupportedLanguage } from '../../types';

interface TwoSumVisualizerProps {
  onImplement: (language: SupportedLanguage, code: string, title: string) => void;
}

const PY_DISPLAY_LINES = [
  'def twoSum(nums: list[int], target: int) -> list[int]:',
  '    seen = {}',
  '    for i, n in enumerate(nums):',
  '        if target - n in seen:',
  '            return [seen[target - n], i]',
  '        seen[n] = i',
  "    raise ValueError('no answer')"
];

const JS_DISPLAY_LINES = [
  'function twoSum(nums, target) {',
  '  const seen = {};',
  '  for (let i = 0; i < nums.length; i++) {',
  '    const n = nums[i];',
  '    if ((target - n) in seen) {',
  '      return [seen[target - n], i];',
  '    }',
  '    seen[n] = i;',
  '  }',
  "  throw new Error('no answer');",
  '}'
];

export const TwoSumVisualizer: React.FC<TwoSumVisualizerProps> = ({ onImplement }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lang, setLang] = useState<'python' | 'javascript'>('python');

  const currentStep = TWO_SUM_STEPS[stepIndex];
  const lines = lang === 'python' ? PY_DISPLAY_LINES : JS_DISPLAY_LINES;
  const activeLine = lang === 'python' ? currentStep.activeLinePy : currentStep.activeLineJs;

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setStepIndex(prev => {
        if (prev >= TWO_SUM_STEPS.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 850);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const handleTogglePlay = () => {
    if (!isPlaying && stepIndex >= TWO_SUM_STEPS.length - 1) {
      setStepIndex(0);
    }
    setIsPlaying(prev => !prev);
  };

  return (
    <section aria-labelledby="two-sum-heading" className="space-y-4">
      <div className="space-y-1.5 max-w-2xl">
        <h2 id="two-sum-heading" className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Two Sum
        </h2>
        <p className="font-editorial text-[15px] text-neutral-300 leading-relaxed">
          Given an array of integers <code className="font-mono text-sm text-neutral-200">nums</code> and an integer{' '}
          <code className="font-mono text-sm text-neutral-200">target</code>, return the indexes of the two numbers that add
          up to target.
        </p>
      </div>

      {/* Outer Container (Split Code + Visualiser matching Photo 1) */}
      <div className="rounded-xl border border-neutral-800 bg-[#0d0d10] p-2.5 sm:p-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Left Pane: CODE */}
          <div className="lg:col-span-6 rounded-lg border border-neutral-800 bg-[#09090b] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800/90 bg-[#0d0d10]">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-neutral-300 uppercase">
                <Code2 className="w-3.5 h-3.5 text-neutral-400" />
                <span>Code</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onImplement(lang, lang === 'python' ? TWO_SUM_PYTHON : TWO_SUM_JS, 'Two Sum')
                  }
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
                >
                  <Play className="w-3 h-3 text-emerald-400 fill-current" />
                  <span>Implement</span>
                </button>
              </div>
            </div>

            <div className="px-4 pt-3 pb-1">
              <select
                aria-label="Visualiser Code Language"
                value={lang}
                onChange={(e) => setLang(e.target.value as 'python' | 'javascript')}
                className="bg-transparent text-xs font-medium text-neutral-200 focus:outline-none cursor-pointer"
              >
                <option value="python" className="bg-neutral-900">Python</option>
                <option value="javascript" className="bg-neutral-900">JavaScript</option>
              </select>
            </div>

            <div className="px-4 py-3 font-mono text-[13px] leading-7 overflow-x-auto flex-1 flex flex-col justify-center">
              {lines.map((lineText, idx) => {
                const lineNum = idx + 1;
                const isActive = lineNum === activeLine;
                return (
                  <div
                    key={lineNum}
                    className={`relative flex items-center px-2 rounded transition-colors duration-150 ${
                      isActive ? 'bg-amber-950/45 text-white' : 'text-neutral-300'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="two-sum-active-line"
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0 rounded bg-amber-500/12 pointer-events-none"
                      />
                    )}
                    <span
                      className={`w-7 shrink-0 text-right pr-4 select-none tabular-nums text-xs ${
                        isActive ? 'text-amber-300 font-semibold' : 'text-neutral-600'
                      }`}
                    >
                      {lineNum}
                    </span>
                    <pre className="whitespace-pre font-mono relative z-10">{lineText}</pre>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Pane: VISUALISER */}
          <div className="lg:col-span-6 rounded-lg border border-neutral-800 bg-[#09090b] overflow-hidden flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-neutral-800/90 bg-neutral-950">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-neutral-300 uppercase">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Visualiser</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-xs font-medium text-neutral-300">Two Sum</span>
                <PlaybackBar
                  currentIndex={stepIndex}
                  totalSteps={TWO_SUM_STEPS.length}
                  isPlaying={isPlaying}
                  onTogglePlay={handleTogglePlay}
                  onFirst={() => { setIsPlaying(false); setStepIndex(0); }}
                  onPrev={() => { setIsPlaying(false); setStepIndex(s => Math.max(0, s - 1)); }}
                  onNext={() => { setIsPlaying(false); setStepIndex(s => Math.min(TWO_SUM_STEPS.length - 1, s + 1)); }}
                  onLast={() => { setIsPlaying(false); setStepIndex(TWO_SUM_STEPS.length - 1); }}
                />
              </div>
            </div>

            {/* Memory Stage */}
            <div className="p-5 flex-1 flex flex-col justify-center gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
                {/* Stack Frame Box */}
                <div className="sm:col-span-4 rounded-lg border border-sky-500/45 bg-sky-950/15 p-3 font-mono text-xs">
                  <div className="text-[11px] text-sky-300 font-semibold mb-2.5">twoSum()</div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-200">
                      <span>nums</span>
                      <ArrowRight className="w-3 h-3 text-sky-400" />
                    </div>
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-200">
                      <span>target</span>
                      <span className="tabular-nums font-semibold text-white">{TWO_SUM_TARGET}</span>
                    </div>
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-200">
                      <span>seen</span>
                      <ArrowRight className="w-3 h-3 text-emerald-400" />
                    </div>
                    {currentStep.i !== null && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded bg-neutral-900 border border-amber-500/40 text-amber-200"
                      >
                        <span>i / n</span>
                        <span className="tabular-nums">
                          {currentStep.i} / {currentStep.n}
                        </span>
                      </motion.div>
                    )}
                    {currentStep.need !== null && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded border ${
                          currentStep.hitPair
                            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-300'
                        }`}
                      >
                        <span>need</span>
                        <span className="tabular-nums font-semibold">{currentStep.need}</span>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Right Column: nums Array + seen Hash Table */}
                <div className="sm:col-span-8 space-y-6">
                  {/* nums array */}
                  <div>
                    <div className="text-xs font-mono text-neutral-400 mb-2">nums</div>
                    <div className="flex items-start gap-1.5 flex-wrap">
                      {TWO_SUM_NUMS.map((val, idx) => {
                        const isCurrent = currentStep.i === idx;
                        const isMatch =
                          currentStep.hitPair !== null &&
                          (currentStep.hitPair[0] === idx || currentStep.hitPair[1] === idx);

                        return (
                          <div key={idx} className="flex flex-col items-center gap-1">
                            <motion.div
                              animate={{
                                scale: isCurrent || isMatch ? 1.06 : 1,
                                borderColor: isMatch
                                  ? '#10b981'
                                  : isCurrent
                                  ? '#60a5fa'
                                  : '#3f3f46'
                              }}
                              transition={{ duration: 0.2 }}
                              className={`w-10 h-10 rounded-md border flex items-center justify-center font-mono text-sm font-semibold tabular-nums ${
                                isMatch
                                  ? 'bg-emerald-950/50 text-emerald-300'
                                  : isCurrent
                                  ? 'bg-sky-950/50 text-sky-200'
                                  : 'bg-neutral-900 text-neutral-200'
                              }`}
                            >
                              {val}
                            </motion.div>
                            <span className="text-[11px] font-mono tabular-nums text-neutral-500">{idx}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* seen hash table */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-neutral-400">seen</span>
                      {currentStep.returnValue && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-xs font-mono font-semibold text-emerald-400 tabular-nums"
                        >
                          return [{currentStep.returnValue.join(', ')}]
                        </motion.span>
                      )}
                    </div>

                    <div className="rounded-lg border border-neutral-800 bg-neutral-950/80 divide-y divide-neutral-800/80 max-w-[230px]">
                      {[0, 1, 2, 3].map((slotIdx) => {
                        const entry = currentStep.seen[slotIdx];
                        const isHitEntry =
                          entry &&
                          currentStep.checkingKey !== null &&
                          entry.key === currentStep.checkingKey;

                        return (
                          <div key={slotIdx} className="flex items-center justify-between px-3 py-2 gap-3">
                            <AnimatePresence mode="wait">
                              {entry ? (
                                <motion.div
                                  key={`k-${entry.key}`}
                                  initial={{ opacity: 0, scale: 0.85 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className={`w-9 h-8 rounded border flex items-center justify-center font-mono text-xs font-semibold tabular-nums ${
                                    isHitEntry
                                      ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300'
                                      : 'border-neutral-700 bg-neutral-900 text-neutral-200'
                                  }`}
                                >
                                  {entry.key}
                                </motion.div>
                              ) : (
                                <div className="w-9 h-8 rounded border border-dashed border-neutral-800" />
                              )}
                            </AnimatePresence>

                            <ArrowRight
                              className={`w-3.5 h-3.5 ${
                                isHitEntry ? 'text-emerald-400' : 'text-neutral-600'
                              }`}
                            />

                            <AnimatePresence mode="wait">
                              {entry ? (
                                <motion.div
                                  key={`v-${entry.value}`}
                                  initial={{ opacity: 0, scale: 0.85 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className={`w-9 h-8 rounded border flex items-center justify-center font-mono text-xs font-semibold tabular-nums ${
                                    isHitEntry
                                      ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300'
                                      : 'border-neutral-700 bg-neutral-900 text-neutral-200'
                                  }`}
                                >
                                  {entry.value}
                                </motion.div>
                              ) : (
                                <div className="w-9 h-8 rounded border border-dashed border-neutral-800" />
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="font-editorial text-[15px] text-neutral-300">
        Being able to explain how your code runs is an important signal in a real interview.
      </p>
    </section>
  );
};
