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
  RotateCcw
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
import { ExecutionResponse, SupportedLanguage } from '../../types';

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

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  useEffect(() => {
    setCode(getProblemCode(problem, lang));
    setResult(null);
    setSubmissionStatus('idle');
  }, [problem, lang]);

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
        'editorLineNumber.activeForeground': '#a1a1aa'
      }
    });
    monaco.editor.setTheme('ntree-obsidian');
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

        {/* Center/Right Action Buttons (Visualise, Run, Submit) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setLeftTab(leftTab === 'visualiser' ? 'description' : 'visualiser')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              leftTab === 'visualiser'
                ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                : 'bg-amber-950/30 border-amber-700/50 text-amber-300 hover:bg-amber-900/40'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
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
              onClick={() => setLeftTab('visualiser')}
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
                <div className="rounded-xl border border-neutral-800 bg-[#09090b] p-4">
                  {renderProblemIllustration()}
                </div>
                <p className="font-editorial text-sm text-neutral-400">
                  Step through the animated state transitions above, then test your implementation on the right.
                </p>
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
                onChange={(val) => setCode(val || '')}
                onMount={handleEditorDidMount}
                theme="ntree-obsidian"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
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
