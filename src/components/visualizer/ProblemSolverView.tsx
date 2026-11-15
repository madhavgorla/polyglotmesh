import React, { useState, useEffect, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import {
  ArrowLeft,
  Play,
  Upload,
  Eye,
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Bug
} from 'lucide-react';
import {
  AlgorithmProblem,
  getProblemCode
} from '../../data/visualizerProblems';
import {
  PalindromeLinkedListVisual,
  MergeIntervalsVisual,
  ContainerWaterVisual,
  LargestIslandVisual
} from './AlgorithmIllustrations';
import { LiveMemoryVisualiser } from './LiveMemoryVisualiser';
import { PlaybackBar } from './PlaybackBar';
import { DebugResponse, DebugStep, ExecutionResponse, SupportedLanguage } from '../../types';

interface ProblemSolverViewProps {
  problem: AlgorithmProblem;
  initialLanguage?: 'python' | 'javascript';
  onBackToProblems: () => void;
  onGoHome: () => void;
  onSolved: (problemId: string) => void;
}

export const ProblemSolverView: React.FC<ProblemSolverViewProps> = ({
  problem,
  initialLanguage = 'python',
  onBackToProblems,
  onGoHome,
  onSolved
}) => {
  const [lang, setLang] = useState<'python' | 'javascript'>(initialLanguage);
  const [code, setCode] = useState<string>(getProblemCode(problem, initialLanguage));
  const [leftTab, setLeftTab] = useState<'description' | 'visualiser' | 'solutions'>('description');
  const [bottomTab, setBottomTab] = useState<'cases' | 'result'>('cases');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResponse | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'passed' | 'failed'>('idle');
  const [syntaxErrors, setSyntaxErrors] = useState<Array<{ line: number; column: number; message: string }>>([]);
  const [debugSteps, setDebugSteps] = useState<DebugStep[]>([]);
  const [debugStepIndex, setDebugStepIndex] = useState<number>(0);
  const [isDebugging, setIsDebugging] = useState<boolean>(false);
  const [isPlayingDebug, setIsPlayingDebug] = useState<boolean>(false);
  const [debugTruncated, setDebugTruncated] = useState<boolean>(false);
  const [debugRuntimeError, setDebugRuntimeError] = useState<{ type: string; message: string; line: number } | null>(null);
  const [debugSyntaxError, setDebugSyntaxError] = useState<{ line: number; column: number; message: string } | null>(null);
  const [debugDirty, setDebugDirty] = useState<boolean>(false);
  const [breakpoints, setBreakpoints] = useState<number[]>([]);
  const [visualiserMode, setVisualiserMode] = useState<'trace' | 'illustration'>('trace');
  const [editorMounted, setEditorMounted] = useState<boolean>(false);

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<any>(null);

  useEffect(() => {
    setCode(getProblemCode(problem, lang));
    setResult(null);
    setSubmissionStatus('idle');
    setDebugSteps([]);
    setDebugStepIndex(0);
    setDebugRuntimeError(null);
    setDebugSyntaxError(null);
    setDebugDirty(false);
    setIsPlayingDebug(false);
    setBreakpoints([]);
  }, [problem, lang]);

  const jumpToLine = (line: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.revealLineInCenter(line);
    editor.setPosition({ lineNumber: line, column: 1 });
    editor.focus();
  };

  const runDebugTrace = async (sourceCode = code, startPlayback = false) => {
    setLeftTab('visualiser');
    setVisualiserMode('trace');
    setIsDebugging(true);
    setIsPlayingDebug(false);
    setDebugRuntimeError(null);
    setDebugSyntaxError(null);
    try {
      const res = await fetch('/api/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang, code: sourceCode, timeoutMs: 3000 })
      });
      const data: DebugResponse = await res.json();
      setDebugSteps(data.steps || []);
      setDebugTruncated(Boolean(data.truncated));
      setDebugSyntaxError(data.syntaxError || null);
      setDebugRuntimeError(data.runtimeError || null);
      setDebugDirty(false);

      const model = editorRef.current?.getModel();
      if (model && monacoRef.current) {
        const markers: any[] = [];
        if (data.syntaxError) {
          markers.push({
            startLineNumber: Math.max(1, data.syntaxError.line || 1),
            startColumn: Math.max(1, data.syntaxError.column || 1),
            endLineNumber: Math.max(1, data.syntaxError.line || 1),
            endColumn: model.getLineMaxColumn(Math.max(1, data.syntaxError.line || 1)) || 80,
            message: data.syntaxError.message,
            severity: monacoRef.current.MarkerSeverity.Error
          });
        } else if (data.runtimeError) {
          markers.push({
            startLineNumber: Math.max(1, data.runtimeError.line || 1),
            startColumn: 1,
            endLineNumber: Math.max(1, data.runtimeError.line || 1),
            endColumn: model.getLineMaxColumn(Math.max(1, data.runtimeError.line || 1)) || 80,
            message: `${data.runtimeError.type}: ${data.runtimeError.message}`,
            severity: monacoRef.current.MarkerSeverity.Error
          });
        }
        monacoRef.current.editor.setModelMarkers(model, 'solver-debug', markers);
      }

      if (data.runtimeError && (data.steps?.length || 0) > 0) {
        const errIdx = (data.steps || []).findIndex(s => s.error);
        setDebugStepIndex(errIdx >= 0 ? errIdx : 0);
      } else {
        setDebugStepIndex(0);
        if (startPlayback && data.success && (data.steps?.length || 0) > 1) {
          setIsPlayingDebug(true);
        }
      }
    } catch (err: any) {
      setDebugRuntimeError({
        type: 'NetworkError',
        message: err?.message || 'Debug trace request failed',
        line: 1
      });
    } finally {
      setIsDebugging(false);
    }
  };

  useEffect(() => {
    if (!isPlayingDebug || debugSteps.length === 0) return;
    const timer = setInterval(() => {
      setDebugStepIndex(prev => {
        if (prev >= debugSteps.length - 1) {
          setIsPlayingDebug(false);
          return prev;
        }
        const nextIdx = prev + 1;
        const nextStep = debugSteps[nextIdx];
        if (nextStep && breakpoints.includes(nextStep.line)) {
          setIsPlayingDebug(false);
        }
        return nextIdx;
      });
    }, 650);
    return () => clearInterval(timer);
  }, [isPlayingDebug, debugSteps, breakpoints]);

  // Apply Monaco debugger decorations (breakpoints, active step line, error line)
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!editor || !monaco || !model) return;

    const decos: any[] = [];
    const maxLines = model.getLineCount();
    const currentStep = leftTab === 'visualiser' ? debugSteps[debugStepIndex] : undefined;
    const errLine = debugSyntaxError?.line || syntaxErrors[0]?.line || currentStep?.error?.line || debugRuntimeError?.line || null;

    for (const bpLine of breakpoints) {
      if (bpLine >= 1 && bpLine <= maxLines) {
        decos.push({
          range: new monaco.Range(bpLine, 1, bpLine, 1),
          options: {
            isWholeLine: false,
            glyphMarginClassName: 'debug-breakpoint-glyph',
            glyphMarginHoverMessage: { value: `Breakpoint at line ${bpLine}` }
          }
        });
      }
    }

    if (currentStep && currentStep.line >= 1 && currentStep.line <= maxLines && !debugDirty) {
      const isErrLine = Boolean(currentStep.error) || errLine === currentStep.line;
      decos.push({
        range: new monaco.Range(currentStep.line, 1, currentStep.line, 1),
        options: {
          isWholeLine: true,
          className: isErrLine ? 'debug-error-line' : 'debug-active-line',
          glyphMarginClassName: isErrLine ? undefined : 'debug-active-glyph'
        }
      });
      if (typeof editor.revealLineInCenterIfOutsideViewport === 'function') {
        editor.revealLineInCenterIfOutsideViewport(currentStep.line);
      } else if (typeof editor.revealLineInCenter === 'function') {
        editor.revealLineInCenter(currentStep.line);
      }
    } else if (errLine && errLine >= 1 && errLine <= maxLines) {
      decos.push({
        range: new monaco.Range(errLine, 1, errLine, 1),
        options: {
          isWholeLine: true,
          className: 'debug-error-line'
        }
      });
    }

    if (typeof editor.createDecorationsCollection === 'function') {
      if (!decorationsRef.current) {
        decorationsRef.current = editor.createDecorationsCollection(decos);
      } else {
        decorationsRef.current.set(decos);
      }
    }
  }, [leftTab, debugSteps, debugStepIndex, breakpoints, syntaxErrors, debugSyntaxError, debugRuntimeError, debugDirty, editorMounted]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    monaco.editor.defineTheme('ntree-obsidian', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
        { token: 'keyword', foreground: '60a5fa', fontStyle: 'bold' },
        { token: 'string', foreground: '34d399' },
        { token: 'number', foreground: 'fbbf24' }
      ],
      colors: {
        'editor.background': '#0b0b0e',
        'editor.foreground': '#e5e7eb',
        'editorCursor.foreground': '#34d399',
        'editor.lineHighlightBackground': '#18181b88',
        'editorLineNumber.foreground': '#52525b',
        'editorLineNumber.activeForeground': '#a1a1aa',
        'editorGutter.background': '#0b0b0e'
      }
    });
    monaco.editor.setTheme('ntree-obsidian');

    editor.onMouseDown((e: any) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN && e.target.position?.lineNumber) {
        const clickedLine = e.target.position.lineNumber;
        setBreakpoints(prev =>
          prev.includes(clickedLine) ? prev.filter(l => l !== clickedLine) : [...prev, clickedLine]
        );
      }
    });

    setEditorMounted(true);
  };

  // Real-time syntax markers
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!code.trim()) {
        setSyntaxErrors([]);
        return;
      }
      try {
        const res = await fetch('/api/check-syntax', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: lang, code })
        });
        const data = await res.json();
        const model = editorRef.current?.getModel();
        if (data.valid) {
          setSyntaxErrors([]);
          if (model && monacoRef.current) {
            monacoRef.current.editor.setModelMarkers(model, 'solver-syntax', []);
          }
        } else {
          const errs = data.errors || [];
          setSyntaxErrors(errs);
          if (model && monacoRef.current) {
            monacoRef.current.editor.setModelMarkers(
              model,
              'solver-syntax',
              errs.map((err: any) => ({
                startLineNumber: Math.max(1, err.line || 1),
                startColumn: Math.max(1, err.column || 1),
                endLineNumber: Math.max(1, err.line || 1),
                endColumn: model.getLineMaxColumn(Math.max(1, err.line || 1)) || 80,
                message: err.message,
                severity: monacoRef.current.MarkerSeverity.Error
              }))
            );
          }
        }
      } catch {
        // Ignore transient errors during typing
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [code, lang]);

  const executeCode = async (isSubmit: boolean) => {
    if (isRunning) return;
    setIsRunning(true);
    setBottomTab('result');
    setSubmissionStatus('idle');
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang as SupportedLanguage, code, timeoutMs: 3000 })
      });
      const data: ExecutionResponse = await res.json();
      setResult(data);
      if (isSubmit) {
        const outputLower = (data.output || '').toLowerCase();
        const expectedLower = problem.expectedPrintSubstring.toLowerCase();
        if (data.success && outputLower.includes(expectedLower)) {
          setSubmissionStatus('passed');
          onSolved(problem.id);
        } else {
          setSubmissionStatus('failed');
        }
      }
    } catch (err: any) {
      setResult({
        success: false,
        output: '',
        error: err.message || 'Execution request failed',
        executionTimeMs: 0
      });
      if (isSubmit) setSubmissionStatus('failed');
    } finally {
      setIsRunning(false);
    }
  };

  const renderProblemIllustration = () => {
    switch (problem.illustrationKey) {
      case 'palindrome':
        return <PalindromeLinkedListVisual />;
      case 'merge-intervals':
        return <MergeIntervalsVisual />;
      case 'water':
        return <ContainerWaterVisual />;
      case 'island':
        return <LargestIslandVisual />;
      default:
        return (
          <div className="p-4 rounded-lg border border-neutral-800 bg-[#0d0d10] space-y-3">
            <div className="text-xs font-medium text-neutral-300">Example Trace</div>
            {problem.examples.map((ex, i) => (
              <div key={i} className="font-mono text-xs text-neutral-300 space-y-1">
                <div><span className="text-neutral-500">Input:</span> {ex.input}</div>
                <div><span className="text-neutral-500">Output:</span> <span className="text-emerald-400">{ex.output}</span></div>
                {ex.explanation && <div className="text-neutral-400">{ex.explanation}</div>}
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 flex flex-col">
      {/* Top Bar matching the window inside Photo 4 */}
      <header className="h-12 px-4 border-b border-neutral-800 bg-[#0d0d10] flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={onGoHome}
            className="text-sm font-bold tracking-tight text-white hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0"
          >
            PolyglotMesh
          </button>
          <span className="text-neutral-700">/</span>
          <button
            type="button"
            onClick={onBackToProblems}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Problems</span>
          </button>
        </div>

        {/* Center/Right Action Buttons (Visualise / Debug, Run, Submit) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => runDebugTrace(code, false)}
            disabled={isDebugging}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              leftTab === 'visualiser'
                ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                : 'bg-amber-950/30 border-amber-700/50 text-amber-300 hover:bg-amber-900/40'
            } disabled:opacity-50`}
          >
            {isDebugging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
            <span>Visualise</span>
          </button>

          <button
            type="button"
            onClick={() => executeCode(false)}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-100 transition-colors disabled:opacity-50"
          >
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>Run</span>
          </button>

          <button
            type="button"
            onClick={() => executeCode(true)}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-400 hover:bg-emerald-300 text-neutral-950 transition-colors disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Submit</span>
          </button>
        </div>
      </header>

      {/* Main Split Panels matching Photo 4's IDE layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 p-2 min-h-[calc(100vh-48px)]">
        {/* Left Pane: DESCRIPTION / VISUALISER / SOLUTIONS */}
        <section className="lg:col-span-5 rounded-lg border border-neutral-800 bg-[#0b0b0e] flex flex-col overflow-hidden">
          <div className="flex items-center gap-5 px-4 border-b border-neutral-800 bg-[#101014] text-[11px] font-semibold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => setLeftTab('description')}
              className={`py-2.5 border-b-2 transition-colors ${
                leftTab === 'description'
                  ? 'border-white text-white'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Description
            </button>
            <button
              type="button"
              onClick={() => {
                setLeftTab('visualiser');
                if (debugSteps.length === 0 || debugDirty) {
                  runDebugTrace(code, false);
                }
              }}
              className={`py-2.5 border-b-2 transition-colors ${
                leftTab === 'visualiser'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Visualiser
            </button>
            <button
              type="button"
              onClick={() => setLeftTab('solutions')}
              className={`py-2.5 border-b-2 transition-colors ${
                leftTab === 'solutions'
                  ? 'border-white text-white'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Solutions
            </button>
          </div>

          <div className="p-5 overflow-y-auto flex-1 space-y-5">
            <div>
              <h1 className="text-xl font-bold text-white">{problem.title}</h1>
              <div className="mt-1.5 flex items-center gap-2 text-xs">
                <span className={problem.difficulty === 'easy' ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                  {problem.difficulty}
                </span>
                <span className="text-neutral-600">·</span>
                <span className="text-neutral-400">{problem.topics.join(', ')}</span>
              </div>
            </div>

            {leftTab === 'description' && (
              <div className="space-y-5">
                <p className="font-editorial text-[15px] text-neutral-200 leading-relaxed">
                  {problem.description}
                </p>

                <div className="space-y-3">
                  {problem.examples.map((ex, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="text-xs font-semibold text-neutral-300">Example {idx + 1}:</div>
                      <div className="p-3.5 rounded-lg border border-neutral-800 bg-[#09090b] font-mono text-xs text-neutral-300 space-y-1.5">
                        <div>
                          <span className="text-neutral-500">Input: </span>
                          <span>{ex.input}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500">Output: </span>
                          <span className="text-emerald-400">{ex.output}</span>
                        </div>
                        {ex.explanation && (
                          <div className="text-neutral-400 pt-1">{ex.explanation}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {leftTab === 'visualiser' && (
              <div className="space-y-4">
                {problem.illustrationKey && problem.illustrationKey !== 'two-sum' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setVisualiserMode('trace')}
                      className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                        visualiserMode === 'trace'
                          ? 'bg-amber-500/20 border-amber-500/60 text-amber-200'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      Live Code Debugger
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisualiserMode('illustration')}
                      className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                        visualiserMode === 'illustration'
                          ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      Algorithm Illustration
                    </button>
                  </div>
                )}

                {visualiserMode === 'illustration' && problem.illustrationKey && problem.illustrationKey !== 'two-sum' ? (
                  <div className="rounded-xl border border-neutral-800 bg-[#09090b] p-4">
                    {renderProblemIllustration()}
                  </div>
                ) : (
                  <div className="rounded-xl border border-neutral-800 bg-[#09090b] overflow-hidden flex flex-col">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 border-b border-neutral-800 bg-neutral-950">
                      <button
                        type="button"
                        onClick={() => runDebugTrace(code, false)}
                        disabled={isDebugging}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold bg-amber-950/50 border border-amber-600/50 text-amber-300 hover:bg-amber-900/50 transition-colors disabled:opacity-50"
                      >
                        {isDebugging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bug className="w-3 h-3" />}
                        <span>{debugDirty ? 'Re-Debug Code' : 'Debug Code'}</span>
                      </button>

                      <PlaybackBar
                        compact
                        currentIndex={Math.min(debugStepIndex, Math.max(0, debugSteps.length - 1))}
                        totalSteps={Math.max(1, debugSteps.length)}
                        isPlaying={isPlayingDebug}
                        onTogglePlay={() => {
                          if (debugDirty || debugSteps.length === 0) {
                            runDebugTrace(code, true);
                            return;
                          }
                          if (!isPlayingDebug && debugStepIndex >= debugSteps.length - 1) {
                            setDebugStepIndex(0);
                          }
                          setIsPlayingDebug(p => !p);
                        }}
                        onFirst={() => { setIsPlayingDebug(false); setDebugStepIndex(0); }}
                        onPrev={() => { setIsPlayingDebug(false); setDebugStepIndex(s => Math.max(0, s - 1)); }}
                        onNext={() => {
                          setIsPlayingDebug(false);
                          if (debugDirty || debugSteps.length === 0) {
                            runDebugTrace(code, false);
                          } else {
                            setDebugStepIndex(s => Math.min(Math.max(0, debugSteps.length - 1), s + 1));
                          }
                        }}
                        onLast={() => { setIsPlayingDebug(false); setDebugStepIndex(Math.max(0, debugSteps.length - 1)); }}
                      />
                    </div>

                    <LiveMemoryVisualiser
                      compact
                      steps={debugSteps}
                      stepIndex={debugStepIndex}
                      syntaxError={debugSyntaxError || syntaxErrors[0] || null}
                      runtimeError={debugRuntimeError}
                      isDebugging={isDebugging}
                      truncated={debugTruncated}
                      onJumpToLine={jumpToLine}
                    />
                  </div>
                )}
              </div>
            )}

            {leftTab === 'solutions' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">Reference {lang === 'python' ? 'Python' : 'JavaScript'} solution</span>
                  <button
                    type="button"
                    onClick={() => setCode(getProblemCode(problem, lang))}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-neutral-700 text-xs text-neutral-200 hover:bg-neutral-800 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restore template</span>
                  </button>
                </div>
                <pre className="p-4 rounded-lg border border-neutral-800 bg-[#09090b] font-mono text-xs text-neutral-200 overflow-x-auto leading-6">
                  {getProblemCode(problem, lang)}
                </pre>
              </div>
            )}
          </div>
        </section>

        {/* Right Pane: CODE EDITOR (Top) + TEST CASES / RESULT (Bottom) */}
        <section className="lg:col-span-7 flex flex-col gap-2 min-h-[540px]">
          <div className="flex-1 rounded-lg border border-neutral-800 bg-[#0b0b0e] flex flex-col overflow-hidden min-h-[340px]">
            <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 bg-[#101014] text-xs">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Code</span>
                <select
                  aria-label="Editor Language"
                  value={lang}
                  onChange={(e) => setLang(e.target.value as 'python' | 'javascript')}
                  className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                </select>
              </div>

              {syntaxErrors.length > 0 ? (
                <span className="text-[11px] text-rose-400 font-mono">
                  Syntax: Line {syntaxErrors[0].line} — {syntaxErrors[0].message}
                </span>
              ) : (
                <span className="text-[11px] text-neutral-500 font-mono">Syntax valid</span>
              )}
            </div>

            <div className="flex-1 min-h-[280px]">
              <Editor
                height="100%"
                language={lang}
                value={code}
                onChange={(val) => {
                  setCode(val || '');
                  setDebugDirty(true);
                  setIsPlayingDebug(false);
                }}
                onMount={handleEditorDidMount}
                theme="ntree-obsidian"
                options={{
                  minimap: { enabled: false },
                  glyphMargin: true,
                  fontSize: 13,
                  lineHeight: 21,
                  fontFamily: "'JetBrains Mono', monospace",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: lang === 'python' ? 4 : 2,
                  padding: { top: 12, bottom: 12 }
                }}
              />
            </div>
          </div>

          {/* Bottom Test Cases / Test Result Panel */}
          <div className="h-48 rounded-lg border border-neutral-800 bg-[#0b0b0e] flex flex-col overflow-hidden">
            <div className="flex items-center gap-5 px-4 border-b border-neutral-800 bg-[#101014] text-[11px] font-semibold uppercase tracking-wider">
              <button
                type="button"
                onClick={() => setBottomTab('cases')}
                className={`py-2 border-b-2 transition-colors ${
                  bottomTab === 'cases' ? 'border-white text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Test Cases
              </button>
              <button
                type="button"
                onClick={() => setBottomTab('result')}
                className={`py-2 border-b-2 transition-colors ${
                  bottomTab === 'result' ? 'border-white text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Test Result
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto font-mono text-xs">
              {bottomTab === 'cases' ? (
                <div className="space-y-2 text-neutral-300">
                  <div>
                    <span className="text-neutral-500">Input: </span>
                    {problem.examples[0]?.input}
                  </div>
                  <div>
                    <span className="text-neutral-500">Expected Output: </span>
                    <span className="text-emerald-400">{problem.examples[0]?.output}</span>
                  </div>
                </div>
              ) : isRunning ? (
                <div className="flex items-center gap-2 text-neutral-400">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Running inside PolyglotMesh sandbox...</span>
                </div>
              ) : result ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {result.success && submissionStatus !== 'failed' ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{submissionStatus === 'passed' ? 'Accepted' : 'Executed cleanly'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-rose-400 font-semibold">
                          <XCircle className="w-4 h-4" />
                          <span>{submissionStatus === 'failed' ? 'Wrong Answer / Failed' : 'Execution Error'}</span>
                        </span>
                      )}
                    </div>
                    <span className="text-neutral-500 tabular-nums">{result.executionTimeMs} ms</span>
                  </div>

                  {result.output && (
                    <pre className="p-2.5 rounded bg-[#09090b] border border-neutral-800 text-neutral-200 whitespace-pre-wrap">
                      {result.output}
                    </pre>
                  )}
                  {result.error && (
                    <pre className="p-2.5 rounded bg-rose-950/30 border border-rose-900/60 text-rose-300 whitespace-pre-wrap">
                      {result.error}
                    </pre>
                  )}
                </div>
              ) : (
                <div className="text-neutral-500">Click Run or Submit to execute your code.</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
