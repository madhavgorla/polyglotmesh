import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import {
  Code2,
  Layers,
  Play,
  Bug,
  RotateCcw,
  Loader2,
  AlertCircle,
  XCircle
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
  const editSeqRef = useRef<number>(0);

  const setEditorMarkers = useCallback(
    (
      synErr: { line: number; column?: number; message: string } | null,
      runErr: { type: string; message: string; line: number } | null
    ) => {
      const model = editorRef.current?.getModel();
      const monaco = monacoRef.current;
      if (!model || !monaco) return;

      const markers: any[] = [];
      if (synErr) {
        const line = Math.min(Math.max(1, synErr.line || 1), model.getLineCount());
        markers.push({
          startLineNumber: line,
          startColumn: Math.max(1, synErr.column || 1),
          endLineNumber: line,
          endColumn: model.getLineMaxColumn(line) || 80,
          message: synErr.message,
          severity: monaco.MarkerSeverity.Error
        });
      } else if (runErr) {
        const line = Math.min(Math.max(1, runErr.line || 1), model.getLineCount());
        markers.push({
          startLineNumber: line,
          startColumn: 1,
          endLineNumber: line,
          endColumn: model.getLineMaxColumn(line) || 80,
          message: `${runErr.type}: ${runErr.message}`,
          severity: monaco.MarkerSeverity.Error
        });
      }
      monaco.editor.setModelMarkers(model, 'live-errors', markers);
    },
    []
  );

  const runDebug = useCallback(
    async (
      sourceCode: string,
      language: 'python' | 'javascript',
      startPlayback = false,
      silent = false,
      expectedSeq?: number
    ) => {
      if (!silent) {
        setIsDebugging(true);
        setIsPlaying(false);
        setSyntaxError(null);
        setRuntimeError(null);
      }

      try {
        const res = await fetch('/api/debug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language,
            code: sourceCode,
            timeoutMs: silent ? 900 : 3000
          })
        });
        const data: DebugResponse = await res.json();

        // Ignore stale trace if user kept typing
        if (expectedSeq !== undefined && expectedSeq !== editSeqRef.current) {
          return;
        }

        const nextSteps = data.steps || [];
        const synErr = data.syntaxError || null;
        const runErr = data.runtimeError || null;

        setSteps(nextSteps);
        setIsDirty(false);
        setTruncated(Boolean(data.truncated));
        setSyntaxError(synErr);
        setRuntimeError(runErr);
        setEditorMarkers(synErr, runErr);

        if (runErr && nextSteps.length > 0) {
          const errIdx = nextSteps.findIndex(s => s.error);
          setStepIndex(errIdx >= 0 ? errIdx : 0);
        } else if (!silent) {
          setStepIndex(0);
          if (startPlayback && data.success && nextSteps.length > 1) {
            setIsPlaying(true);
          }
        } else {
          setStepIndex(prev => Math.min(prev, Math.max(0, nextSteps.length - 1)));
        }
      } catch (err: any) {
        if (expectedSeq !== undefined && expectedSeq !== editSeqRef.current) {
          return;
        }
        if (!silent) {
          setRuntimeError({
            type: 'NetworkError',
            message: err?.message || 'Failed to contact /api/debug',
            line: 1
          });
        }
      } finally {
        if (!silent) {
          setIsDebugging(false);
        }
      }
    },
    [setEditorMarkers]
  );

  // Auto-trace when language switches or on initial mount
  useEffect(() => {
    const template = lang === 'python' ? TWO_SUM_PYTHON : TWO_SUM_JS;
    editSeqRef.current += 1;
    setCode(template);
    setBreakpoints([]);
    setIsDirty(false);
    setEditorMarkers(null, null);
    runDebug(template, lang, false, false, editSeqRef.current);
  }, [lang, runDebug, setEditorMarkers]);

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

  // Live error detection while writing: fast syntax check (180ms) -> silent runtime trace (500ms)
  useEffect(() => {
    if (!isDirty) return;
    const seq = editSeqRef.current;

    if (!code.trim()) {
      setSyntaxError(null);
      setRuntimeError(null);
      setEditorMarkers(null, null);
      return;
    }

    let runtimeTimer: ReturnType<typeof setTimeout> | null = null;

    const syntaxTimer = setTimeout(async () => {
      try {
        const res = await fetch('/api/check-syntax', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: lang, code })
        });
        const data = await res.json();
        if (seq !== editSeqRef.current) return;

        if (!data.valid && data.errors?.length) {
          const first = data.errors[0];
          setSyntaxError(first);
          setRuntimeError(null);
          setEditorMarkers(first, null);
        } else {
          setSyntaxError(null);
          setEditorMarkers(null, null);
          runtimeTimer = setTimeout(() => {
            if (seq === editSeqRef.current) {
              runDebug(code, lang, false, true, seq);
            }
          }, 320);
        }
      } catch {
        // Ignore transient errors while typing
      }
    }, 180);

    return () => {
      clearTimeout(syntaxTimer);
      if (runtimeTimer) clearTimeout(runtimeTimer);
    };
  }, [code, lang, isDirty, runDebug, setEditorMarkers]);

  // Apply Monaco debugger decorations (active line, error line, breakpoints)
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!editor || !monaco || !model) return;

    // Also keep markers synced after editor mounts
    setEditorMarkers(syntaxError, runtimeError);

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

    if (syntaxError && syntaxError.line >= 1 && syntaxError.line <= maxLines) {
      decos.push({
        range: new monaco.Range(syntaxError.line, 1, syntaxError.line, 1),
        options: {
          isWholeLine: true,
          className: 'debug-error-line'
        }
      });
    } else if (currentStep && currentStep.line >= 1 && currentStep.line <= maxLines && !isDirty) {
      const isErrLine = Boolean(currentStep.error) || (errorLine === currentStep.line && Boolean(runtimeError));
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
  }, [steps, stepIndex, breakpoints, syntaxError, runtimeError, isDirty, editorMounted, setEditorMarkers]);

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
    editSeqRef.current += 1;
    setCode(template);
    setIsDirty(false);
    setSyntaxError(null);
    setRuntimeError(null);
    setEditorMarkers(null, null);
    runDebug(template, lang, false);
  };

  const totalSteps = Math.max(steps.length, 1);
  const inlineError = syntaxError
    ? {
        label: 'SyntaxError',
        line: syntaxError.line,
        column: syntaxError.column,
        message: syntaxError.message
      }
    : runtimeError
    ? {
        label: runtimeError.type,
        line: runtimeError.line,
        column: undefined,
        message: runtimeError.message
      }
    : null;

  return (
    <section aria-labelledby="two-sum-heading" className="space-y-4">
      <div className="space-y-1.5 max-w-2xl">
        <h2 id="two-sum-heading" className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Two Sum &amp; Live Code Debugger
        </h2>
        <p className="font-editorial text-[15px] text-neutral-300 leading-relaxed">
          Write or edit code directly in the editor, click the gutter to set breakpoints, and debug line by line with
          live variable, array, hash-map, and instant error detection as you type.
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

            {/* Inline Status Strip */}
            <div className="flex items-center justify-between px-4 py-1.5 border-b border-neutral-900 bg-[#09090b] text-[11px] font-mono">
              <div className="flex items-center gap-3 text-neutral-500">
                <span>Click line gutter to toggle breakpoint</span>
                {breakpoints.length > 0 && (
                  <span className="text-rose-400">
                    {breakpoints.length} {breakpoints.length === 1 ? 'breakpoint' : 'breakpoints'}
                  </span>
                )}
              </div>

              {inlineError ? (
                <button
                  type="button"
                  onClick={() => handleJumpToLine(inlineError.line)}
                  className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold shrink-0"
                >
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{inlineError.label} @ Line {inlineError.line}</span>
                </button>
              ) : isDirty ? (
                <span className="text-amber-400">Checking live...</span>
              ) : (
                <span className="text-emerald-400/90">No errors</span>
              )}
            </div>

            {/* Editable Monaco Editor */}
            <div className="h-[340px] sm:h-[370px] w-full">
              <Editor
                height="100%"
                language={lang}
                value={code}
                onChange={(val) => {
                  editSeqRef.current += 1;
                  setCode(val ?? '');
                  setIsDirty(true);
                  setIsPlaying(false);
                  setRuntimeError(null);
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

            {/* Full Live Error Strip directly beneath editor whenever code is wrong */}
            {inlineError && (
              <div className="px-4 py-2 border-t border-rose-500/40 bg-rose-950/35 flex items-start justify-between gap-3 text-xs font-mono">
                <div className="flex items-start gap-2 text-rose-200 min-w-0">
                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span className="break-words">
                    <strong className="text-rose-300">
                      {inlineError.label} (Line {inlineError.line}
                      {inlineError.column ? `:${inlineError.column}` : ''}):
                    </strong>{' '}
                    {inlineError.message}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleJumpToLine(inlineError.line)}
                  className="px-2 py-0.5 rounded border border-rose-500/40 bg-rose-950/60 hover:bg-rose-900/60 text-[11px] text-rose-200 shrink-0 transition-colors"
                >
                  Line {inlineError.line}
                </button>
              </div>
            )}
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
