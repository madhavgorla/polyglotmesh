import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import {
  Code2,
  Layers,
  Play,
  Bug,
  RotateCcw,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { PlaybackBar } from './PlaybackBar';
import { LiveMemoryVisualiser } from './LiveMemoryVisualiser';
import { TWO_SUM_PYTHON, TWO_SUM_JS } from '../../data/visualizerProblems';
import { DebugResponse, DebugStep, SupportedLanguage } from '../../types';

interface TwoSumVisualizerProps {
  onImplement: (language: SupportedLanguage, code: string, title: string) => void;
}

export const TwoSumVisualizer: React.FC<TwoSumVisualizerProps> = ({ onImplement }) => {
  const [lang, setLang] = useState<'python' | 'javascript'>('python');
  const [code, setCode] = useState<string>(TWO_SUM_PYTHON);
  const [steps, setSteps] = useState<DebugStep[]>([]);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isDebugging, setIsDebugging] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [truncated, setTruncated] = useState<boolean>(false);
  const [syntaxError, setSyntaxError] = useState<{ line: number; column: number; message: string } | null>(null);
  const [runtimeError, setRuntimeError] = useState<{ type: string; message: string; line: number } | null>(null);
  const [breakpoints, setBreakpoints] = useState<number[]>([]);
  const [editorMounted, setEditorMounted] = useState<boolean>(false);

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<any>(null);

  const runDebug = useCallback(async (sourceCode: string, language: 'python' | 'javascript', startPlayback = false) => {
    setIsDebugging(true);
    setIsPlaying(false);
    setSyntaxError(null);
    setRuntimeError(null);

    try {
      const res = await fetch('/api/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code: sourceCode, timeoutMs: 3000 })
      });
      const data: DebugResponse = await res.json();

      setSteps(data.steps || []);
      setStepIndex(0);
      setIsDirty(false);
      setTruncated(Boolean(data.truncated));
      setSyntaxError(data.syntaxError || null);
      setRuntimeError(data.runtimeError || null);

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
        monacoRef.current.editor.setModelMarkers(model, 'visualizer-debug', markers);
      }

      if (data.runtimeError && (data.steps?.length || 0) > 0) {
        // Jump straight to the failing line so user immediately sees where the error occurred
        const errIdx = (data.steps || []).findIndex(s => s.error);
        if (errIdx >= 0) setStepIndex(errIdx);
      } else if (startPlayback && data.success && (data.steps?.length || 0) > 1) {
        setIsPlaying(true);
      }
    } catch (err: any) {
      setRuntimeError({
        type: 'NetworkError',
        message: err?.message || 'Failed to contact /api/debug',
        line: 1
      });
    } finally {
      setIsDebugging(false);
    }
  }, []);

  // Auto-trace when language switches or initial mount
  useEffect(() => {
    const template = lang === 'python' ? TWO_SUM_PYTHON : TWO_SUM_JS;
    setCode(template);
    setBreakpoints([]);
    runDebug(template, lang, false);
  }, [lang, runDebug]);

  // Playback timer with breakpoint pause support
  useEffect(() => {
    if (!isPlaying || steps.length === 0) return;
    const timer = setInterval(() => {
      setStepIndex(prev => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        const nextIdx = prev + 1;
        const nextStep = steps[nextIdx];
        if (nextStep && breakpoints.includes(nextStep.line)) {
          setIsPlaying(false);
        }
        return nextIdx;
      });
    }, 650);
    return () => clearInterval(timer);
  }, [isPlaying, steps, breakpoints]);

  // Real-time syntax check while user edits code
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(async () => {
      if (!code.trim()) {
        setSyntaxError(null);
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
          setSyntaxError(null);
          if (model && monacoRef.current) {
            monacoRef.current.editor.setModelMarkers(model, 'visualizer-syntax', []);
          }
        } else if (data.errors?.length) {
          const first = data.errors[0];
          setSyntaxError(first);
          if (model && monacoRef.current) {
            monacoRef.current.editor.setModelMarkers(
              model,
              'visualizer-syntax',
              data.errors.map((err: any) => ({
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
        // Ignore transient typing check failures
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [code, lang, isDirty]);

  // Apply Monaco debugger decorations (active line, error line, breakpoints)
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!editor || !monaco || !model) return;

    const decos: any[] = [];
    const maxLines = model.getLineCount();
    const currentStep = steps[stepIndex];
    const errorLine = syntaxError?.line || currentStep?.error?.line || runtimeError?.line || null;

    for (const bpLine of breakpoints) {
      if (bpLine >= 1 && bpLine <= maxLines) {
        decos.push({
          range: new monaco.Range(bpLine, 1, bpLine, 1),
          options: {
            isWholeLine: false,
            glyphMarginClassName: 'debug-breakpoint-glyph',
            glyphMarginHoverMessage: { value: `Breakpoint at line ${bpLine} (click to remove)` }
          }
        });
      }
    }

    if (currentStep && currentStep.line >= 1 && currentStep.line <= maxLines && !isDirty) {
      const isErrLine = Boolean(currentStep.error) || (errorLine === currentStep.line && Boolean(syntaxError || runtimeError));
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
    } else if (errorLine && errorLine >= 1 && errorLine <= maxLines) {
      decos.push({
        range: new monaco.Range(errorLine, 1, errorLine, 1),
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
  }, [steps, stepIndex, breakpoints, syntaxError, runtimeError, isDirty, editorMounted]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.editor.defineTheme('polyglot-debugger', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
        { token: 'keyword', foreground: '60a5fa', fontStyle: 'bold' },
        { token: 'string', foreground: '34d399' },
        { token: 'number', foreground: 'fbbf24' }
      ],
      colors: {
        'editor.background': '#09090b',
        'editor.foreground': '#e5e7eb',
        'editorCursor.foreground': '#34d399',
        'editor.lineHighlightBackground': '#18181b55',
        'editorLineNumber.foreground': '#52525b',
        'editorLineNumber.activeForeground': '#e4e4e7',
        'editorGutter.background': '#09090b'
      }
    });
    monaco.editor.setTheme('polyglot-debugger');

    // Click glyph margin to toggle breakpoints
    editor.onMouseDown((e: any) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN && e.target.position?.lineNumber) {
        const clickedLine = e.target.position.lineNumber;
        setBreakpoints(prev =>
          prev.includes(clickedLine) ? prev.filter(l => l !== clickedLine) : [...prev, clickedLine]
        );
      }
    });

    // Ctrl+Enter / Cmd+Enter runs debugger
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      const currentCode = editor.getValue();
      runDebug(currentCode, lang, false);
    });

    setEditorMounted(true);
  };

  const handleJumpToLine = (line: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.revealLineInCenter(line);
    editor.setPosition({ lineNumber: line, column: 1 });
    editor.focus();
  };

  const handleTogglePlay = () => {
    if (isDirty) {
      runDebug(code, lang, true);
      return;
    }
    if (!isPlaying && stepIndex >= Math.max(0, steps.length - 1)) {
      setStepIndex(0);
    }
    setIsPlaying(prev => !prev);
  };

  const handleResetTemplate = () => {
    const template = lang === 'python' ? TWO_SUM_PYTHON : TWO_SUM_JS;
    setCode(template);
    setIsDirty(false);
    runDebug(template, lang, false);
  };

  const totalSteps = Math.max(steps.length, 1);

  return (
    <section aria-labelledby="two-sum-heading" className="space-y-4">
      <div className="space-y-1.5 max-w-2xl">
        <h2 id="two-sum-heading" className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Two Sum &amp; Live Code Debugger
        </h2>
        <p className="font-editorial text-[15px] text-neutral-300 leading-relaxed">
          Write or edit code directly in the editor, click the gutter to set breakpoints, and debug line by line with
          live variable, array, hash-map, and error inspection.
        </p>
      </div>

      {/* Outer Container (Split Code + Visualiser) */}
      <div className="rounded-xl border border-neutral-800 bg-[#0d0d10] p-2.5 sm:p-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Left Pane: EDITABLE MONACO CODE EDITOR */}
          <div className="lg:col-span-6 rounded-lg border border-neutral-800 bg-[#09090b] overflow-hidden flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-neutral-800/90 bg-[#0d0d10]">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-neutral-300 uppercase">
                  <Code2 className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Code</span>
                </div>

                <select
                  aria-label="Visualiser Code Language"
                  value={lang}
                  onChange={(e) => setLang(e.target.value as 'python' | 'javascript')}
                  className="bg-neutral-900 border border-neutral-800 rounded px-2 py-0.5 text-xs font-medium text-neutral-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="python" className="bg-neutral-900">Python</option>
                  <option value="javascript" className="bg-neutral-900">JavaScript</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleResetTemplate}
                  title="Restore sample template"
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>

                <button
                  type="button"
                  onClick={() => runDebug(code, lang, false)}
                  disabled={isDebugging}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded border transition-colors ${
                    isDirty
                      ? 'bg-amber-500 text-neutral-950 border-amber-400 hover:bg-amber-400'
                      : 'bg-amber-950/40 border-amber-600/50 text-amber-300 hover:bg-amber-900/50'
                  } disabled:opacity-50`}
                >
                  {isDebugging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bug className="w-3 h-3" />}
                  <span>{isDirty ? 'Re-Debug' : 'Debug'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onImplement(lang, code, 'Two Sum')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
                >
                  <Play className="w-3 h-3 text-emerald-400 fill-current" />
                  <span>Implement</span>
                </button>
              </div>
            </div>

            {/* Inline Status / Syntax Strip */}
            <div className="flex items-center justify-between px-4 py-1.5 border-b border-neutral-900 bg-[#09090b] text-[11px] font-mono">
              <div className="flex items-center gap-3 text-neutral-500">
                <span>Click line gutter to toggle breakpoint</span>
                {breakpoints.length > 0 && (
                  <span className="text-rose-400">
                    {breakpoints.length} {breakpoints.length === 1 ? 'breakpoint' : 'breakpoints'}
                  </span>
                )}
              </div>

              {syntaxError ? (
                <button
                  type="button"
                  onClick={() => handleJumpToLine(syntaxError.line)}
                  className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 truncate max-w-[260px]"
                >
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span className="truncate">Line {syntaxError.line}: {syntaxError.message}</span>
                </button>
              ) : isDirty ? (
                <span className="text-amber-400">Edited — click Debug to trace</span>
              ) : runtimeError ? (
                <button
                  type="button"
                  onClick={() => handleJumpToLine(runtimeError.line)}
                  className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300"
                >
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{runtimeError.type} @ L{runtimeError.line}</span>
                </button>
              ) : (
                <span className="text-emerald-400/90">Ready</span>
              )}
            </div>

            {/* Editable Monaco Editor */}
            <div className="h-[340px] sm:h-[370px] w-full">
              <Editor
                height="100%"
                language={lang}
                value={code}
                onChange={(val) => {
                  setCode(val ?? '');
                  setIsDirty(true);
                  setIsPlaying(false);
                }}
                onMount={handleEditorDidMount}
                theme="polyglot-debugger"
                options={{
                  minimap: { enabled: false },
                  glyphMargin: true,
                  lineNumbers: 'on',
                  lineNumbersMinChars: 3,
                  folding: false,
                  fontSize: 13,
                  lineHeight: 22,
                  fontFamily: "'JetBrains Mono', monospace",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: lang === 'python' ? 4 : 2,
                  padding: { top: 10, bottom: 10 },
                  renderLineHighlight: 'none'
                }}
              />
            </div>
          </div>

          {/* Right Pane: LIVE VISUALISER */}
          <div className="lg:col-span-6 rounded-lg border border-neutral-800 bg-[#09090b] overflow-hidden flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-neutral-800/90 bg-neutral-950">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-neutral-300 uppercase">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Visualiser</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-xs font-medium text-neutral-400">
                  {steps[stepIndex] ? `Line ${steps[stepIndex].line}` : 'Debugger'}
                </span>
                <PlaybackBar
                  currentIndex={Math.min(stepIndex, totalSteps - 1)}
                  totalSteps={totalSteps}
                  isPlaying={isPlaying}
                  onTogglePlay={handleTogglePlay}
                  onFirst={() => { setIsPlaying(false); setStepIndex(0); }}
                  onPrev={() => { setIsPlaying(false); setStepIndex(s => Math.max(0, s - 1)); }}
                  onNext={() => {
                    setIsPlaying(false);
                    if (isDirty) {
                      runDebug(code, lang, false);
                    } else {
                      setStepIndex(s => Math.min(totalSteps - 1, s + 1));
                    }
                  }}
                  onLast={() => { setIsPlaying(false); setStepIndex(Math.max(0, steps.length - 1)); }}
                />
              </div>
            </div>

            <LiveMemoryVisualiser
              steps={steps}
              stepIndex={stepIndex}
              syntaxError={syntaxError}
              runtimeError={runtimeError}
              isDebugging={isDebugging}
              truncated={truncated}
              onJumpToLine={handleJumpToLine}
            />
          </div>
        </div>
      </div>

      <p className="font-editorial text-[15px] text-neutral-300">
        Being able to explain how your code runs is an important signal in a real interview.
      </p>
    </section>
  );
};
