import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Shuffle,
  List,
  Play,
  Upload,
  Eye,
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Bug,
  Clock,
  Pause,
  Maximize2,
  Minimize2,
  Settings2,
  Plus,
  X,
  Code2,
  Check,
  CheckSquare,
  TerminalSquare,
  AlignLeft,
  Braces,
  Lock,
  Search,
  History,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import {
  ALGORITHM_PROBLEMS,
  AlgorithmProblem
} from '../../data/visualizerProblems';
import {
  getLeetCodeSpec,
  getStarterStubForLanguage,
  LeetCodeTestCase
} from '../../data/leetcodeSpecs';
import {
  ProblemComplexityResult,
  ProblemSubmissionRecord,
  SuccessfulRunSnapshot,
  MAX_EXECUTION_HISTORY,
  loadProblemSubmissions,
  saveProblemSubmission,
  loadSuccessfulRunHistory,
  saveSuccessfulRunSnapshot,
  clearSuccessfulRunHistory,
  getProblemHints
} from '../../data/problemInsights';
import {
  PalindromeLinkedListVisual,
  MergeIntervalsVisual,
  ContainerWaterVisual,
  LargestIslandVisual
} from './AlgorithmIllustrations';
import { LiveMemoryVisualiser } from './LiveMemoryVisualiser';
import { PlaybackBar } from './PlaybackBar';
import { ConfettiBurst } from './ConfettiBurst';
import { DailyStreakCounter } from './DailyStreakCounter';
import {
  ExecutionMetricsTracker,
  SessionTelemetryEntry
} from './ExecutionMetricsTracker';
import { CodeExecutionHistoryPanel } from './CodeExecutionHistoryPanel';
import { configureLeetCodeMonaco } from './monacoLeetCodeSetup';
import { DailyStreakState, readStoredDailyStreak } from '../../utils/dailyStreak';
import {
  DebugResponse,
  DebugStep,
  ExecutionTelemetry,
  SolverLanguage
} from '../../types';

const LANGUAGE_LABELS: Record<SolverLanguage, string> = {
  python: 'Python 3',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  java: 'Java',
  c: 'C',
  cpp: 'C++'
};

interface JudgeCaseResult {
  id: string;
  label: string;
  passed: boolean;
  inputDisplay: string;
  stdout: string;
  actualOutput: string;
  expectedOutput: string;
  error: string | null;
  runtimeMs?: number;
}

interface JudgeVerdictResponse {
  verdict:
    | 'Accepted'
    | 'Wrong Answer'
    | 'Runtime Error'
    | 'Compile Error'
    | 'Time Limit Exceeded';
  passedCount: number;
  totalCount: number;
  runtimeMs: number;
  compileTimeMs?: number;
  memoryUsedMb?: number;
  peakMemoryKb?: number;
  telemetry?: ExecutionTelemetry;
  complexity?: ProblemComplexityResult;
  cases: JudgeCaseResult[];
  errorLine?: number | null;
  errorMessage?: string | null;
  isSubmit?: boolean;
}

interface EditorPreferences {
  fontSize: number;
  tabSize: 2 | 4;
  wordWrap: 'off' | 'on';
  autocomplete: boolean;
}

interface ProblemSolverViewProps {
  problem: AlgorithmProblem;
  problems?: AlgorithmProblem[];
  solvedIds?: string[];
  dailyStreak?: DailyStreakState;
  initialLanguage?: SolverLanguage;
  initialTab?: 'description' | 'visualiser';
  isSolved?: boolean;
  onSelectProblem?: (problem: AlgorithmProblem) => void;
  onBackToProblems: () => void;
  onGoHome: () => void;
  onSolved: (problemId: string) => void;
  onToggleSolved?: (problemId: string) => void;
  onOpenCommandPalette?: () => void;
}

const PREFS_STORAGE_KEY = 'polyglotmesh_editor_prefs_v1';
const DRAFT_KEY_PREFIX = 'polyglotmesh_draft_v1';
const NOTE_KEY_PREFIX = 'polyglotmesh_note_v1';

function readEditorPrefs(): EditorPreferences {
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        fontSize: Number(parsed.fontSize) || 13,
        tabSize: parsed.tabSize === 2 ? 2 : 4,
        wordWrap: parsed.wordWrap === 'on' ? 'on' : 'off',
        autocomplete: parsed.autocomplete !== false
      };
    }
  } catch {
    // Ignore storage errors
  }
  return { fontSize: 13, tabSize: 4, wordWrap: 'off', autocomplete: true };
}

function readDraft(problemId: string, lang: string): string {
  try {
    return window.localStorage.getItem(`${DRAFT_KEY_PREFIX}:${problemId}:${lang}`) || '';
  } catch {
    return '';
  }
}

function writeDraft(problemId: string, lang: string, value: string) {
  try {
    const key = `${DRAFT_KEY_PREFIX}:${problemId}:${lang}`;
    if (!value) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage errors
  }
}

function readNote(problemId: string): string {
  try {
    return window.localStorage.getItem(`${NOTE_KEY_PREFIX}:${problemId}`) || '';
  } catch {
    return '';
  }
}

function writeNote(problemId: string, value: string) {
  try {
    const key = `${NOTE_KEY_PREFIX}:${problemId}`;
    if (!value) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage errors
  }
}

function formatTimer(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatRelativeTime(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60000) return 'Just now';
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export const ProblemSolverView: React.FC<ProblemSolverViewProps> = ({
  problem,
  problems = ALGORITHM_PROBLEMS,
  solvedIds = [],
  dailyStreak,
  initialLanguage = 'python',
  initialTab = 'description',
  isSolved,
  onSelectProblem,
  onBackToProblems,
  onGoHome,
  onSolved,
  onToggleSolved,
  onOpenCommandPalette
}) => {
  // Problem signature spec & language starter template
  const leetcodeSpec = useMemo(() => getLeetCodeSpec(problem), [problem]);

  const [lang, setLang] = useState<SolverLanguage>(initialLanguage);
  const [code, setCode] = useState<string>(
    () =>
      readDraft(problem.id, initialLanguage) ||
      getStarterStubForLanguage(leetcodeSpec, initialLanguage)
  );
  const [noteText, setNoteText] = useState<string>(() => readNote(problem.id));
  const [localSolved, setLocalSolved] = useState<boolean>(false);
  const [confettiTrigger, setConfettiTrigger] = useState<number>(0);

  // Left & Bottom Panel Tabs
  const [leftTab, setLeftTab] = useState<'description' | 'notes' | 'submissions' | 'visualiser'>(initialTab);
  const [runtimeAvailability, setRuntimeAvailability] = useState<Partial<Record<SolverLanguage, boolean>>>({});
  const [bottomTab, setBottomTab] = useState<'cases' | 'result'>('cases');
  const [topicsOpen, setTopicsOpen] = useState<boolean>(false);
  const [openHints, setOpenHints] = useState<[boolean, boolean]>([false, false]);
  const [submissions, setSubmissions] = useState<ProblemSubmissionRecord[]>(() =>
    loadProblemSubmissions(problem.id)
  );
  const [executionHistory, setExecutionHistory] = useState<SuccessfulRunSnapshot[]>(() =>
    loadSuccessfulRunHistory(problem.id)
  );
  const [historyPanelOpen, setHistoryPanelOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1200 : true
  );
  const [undoRevertSnapshot, setUndoRevertSnapshot] = useState<{
    code: string;
    language: SolverLanguage;
  } | null>(null);
  const [revertedEntryId, setRevertedEntryId] = useState<string | null>(null);
  const conceptualHints = useMemo(() => getProblemHints(problem), [problem]);

  // Testcases & Judge State
  const [testCases, setTestCases] = useState<LeetCodeTestCase[]>(leetcodeSpec.defaultTestCases);
  const [activeCaseIdx, setActiveCaseIdx] = useState<number>(0);
  const [activeResultCaseIdx, setActiveResultCaseIdx] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [judgeResult, setJudgeResult] = useState<JudgeVerdictResponse | null>(null);
  const [latestTelemetry, setLatestTelemetry] = useState<ExecutionTelemetry | null>(null);
  const [sessionTelemetry, setSessionTelemetry] = useState<SessionTelemetryEntry[]>([]);

  // Syntax & Live Debugger State
  const [syntaxErrors, setSyntaxErrors] = useState<
    Array<{ line: number; column: number; message: string }>
  >([]);
  const [debugSteps, setDebugSteps] = useState<DebugStep[]>([]);
  const [debugStepIndex, setDebugStepIndex] = useState<number>(0);
  const [isDebugging, setIsDebugging] = useState<boolean>(false);
  const [isPlayingDebug, setIsPlayingDebug] = useState<boolean>(false);
  const [debugTruncated, setDebugTruncated] = useState<boolean>(false);
  const [debugRuntimeError, setDebugRuntimeError] = useState<{
    type: string;
    message: string;
    line: number;
  } | null>(null);
  const [debugSyntaxError, setDebugSyntaxError] = useState<{
    line: number;
    column: number;
    message: string;
  } | null>(null);
  const [debugDirty, setDebugDirty] = useState<boolean>(false);
  const [breakpoints, setBreakpoints] = useState<number[]>([]);
  const [visualiserMode, setVisualiserMode] = useState<'trace' | 'illustration'>('trace');
  const [editorMounted, setEditorMounted] = useState<boolean>(false);
  const [cursorPos, setCursorPos] = useState<{ line: number; column: number }>({
    line: 1,
    column: 1
  });

  // LeetCode Workspace UX Controls (Resizable Panes, Timer, Settings, Problem Switcher)
  const [leftWidthPct, setLeftWidthPct] = useState<number>(43);
  const [consoleHeightPx, setConsoleHeightPx] = useState<number>(300);
  const [consoleCollapsed, setConsoleCollapsed] = useState<boolean>(false);
  const [editorCollapsed, setEditorCollapsed] = useState<boolean>(false);
  const [editorMaximized, setEditorMaximized] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerQuery, setDrawerQuery] = useState<string>('');
  const [editorPrefs, setEditorPrefs] = useState<EditorPreferences>(readEditorPrefs);

  // Focus Timer (Stopwatch)
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<any>(null);
  const editSeqRef = useRef<number>(0);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const rightPaneRef = useRef<HTMLDivElement | null>(null);
  const runActionRef = useRef<(isSubmit: boolean) => void>(() => {});

  const currentProblemIndex = useMemo(
    () => problems.findIndex((p) => p.id === problem.id),
    [problems, problem.id]
  );

  const drawerProblems = useMemo(() => {
    const q = drawerQuery.trim().toLowerCase();
    if (!q) return problems;
    return problems.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        String(p.leetcodeNumber || '').includes(q) ||
        (p.category || '').toLowerCase().includes(q)
    );
  }, [problems, drawerQuery]);

  // Persist editor preferences
  useEffect(() => {
    try {
      window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(editorPrefs));
    } catch {
      // Ignore storage errors
    }
  }, [editorPrefs]);

  // Timer tick
  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setTimerSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

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

  // Sync when switching problem or language
  useEffect(() => {
    editSeqRef.current += 1;
    const saved = readDraft(problem.id, lang);
    const starter = getStarterStubForLanguage(leetcodeSpec, lang);
    setCode(saved || starter);
    setNoteText(readNote(problem.id));
    setSubmissions(loadProblemSubmissions(problem.id));
    setOpenHints([false, false]);
    setTestCases(leetcodeSpec.defaultTestCases);
    setActiveCaseIdx(0);
    setActiveResultCaseIdx(0);
    setLocalSolved(false);
    setConfettiTrigger(0);
    setJudgeResult(null);
    setSyntaxErrors([]);
    setDebugSteps([]);
    setDebugStepIndex(0);
    setDebugRuntimeError(null);
    setDebugSyntaxError(null);
    setDebugDirty(false);
    setIsPlayingDebug(false);
    setBreakpoints([]);
    setEditorMarkers(null, null);
  }, [problem, lang, leetcodeSpec, setEditorMarkers]);

  // Fetch live container runtime availability (Python, JS, TS, C, C++, Java)
  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.runtimes && typeof data.runtimes === 'object') {
          setRuntimeAvailability(data.runtimes);
        }
      })
      .catch(() => {
        // Keep optimistic defaults when health probe fails
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Honor initialTab when opening a problem in Visualiser mode
  useEffect(() => {
    setLeftTab(initialTab);
  }, [problem.id, initialTab]);

  // Clear per-problem telemetry & sync per-problem execution history when problem switches
  useEffect(() => {
    setLatestTelemetry(null);
    setSessionTelemetry([]);
    setExecutionHistory(loadSuccessfulRunHistory(problem.id));
    setUndoRevertSnapshot(null);
    setRevertedEntryId(null);
  }, [problem.id]);

  // Save draft on code changes (clear stored draft when identical to starter template)
  useEffect(() => {
    const starter = getStarterStubForLanguage(leetcodeSpec, lang);
    if (code === starter) {
      writeDraft(problem.id, lang, '');
    } else {
      writeDraft(problem.id, lang, code);
    }
  }, [problem.id, lang, code, leetcodeSpec]);

  // Save notes on change
  useEffect(() => {
    writeNote(problem.id, noteText);
  }, [problem.id, noteText]);

  const effectiveSolved = isSolved ?? localSolved;

  const handleMarkSolvedToggle = () => {
    if (!effectiveSolved) {
      setLocalSolved(true);
      if (onToggleSolved) {
        onToggleSolved(problem.id);
      } else {
        onSolved(problem.id);
      }
      setConfettiTrigger((prev) => prev + 1);
    } else {
      setLocalSolved(false);
      if (onToggleSolved) {
        onToggleSolved(problem.id);
      }
    }
  };

  const jumpToLine = (line: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.revealLineInCenter(line);
    editor.setPosition({ lineNumber: line, column: 1 });
    editor.focus();
  };

  const formatEditorCode = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const formatAction = editor.getAction?.('editor.action.formatDocument');
    if (formatAction) {
      formatAction.run();
    }
    editor.focus();
  };

  const insertSignatureStub = () => {
    const stub = getStarterStubForLanguage(leetcodeSpec, lang);
    editSeqRef.current += 1;
    setCode(stub);
    setUndoRevertSnapshot(null);
    setRevertedEntryId(null);
    setDebugDirty(false);
    setSyntaxErrors([]);
    setDebugSyntaxError(null);
    setDebugRuntimeError(null);
    setEditorMarkers(null, null);
    window.setTimeout(() => {
      const editor = editorRef.current;
      const model = editor?.getModel();
      if (editor && model) {
        const lastLine = model.getLineCount();
        const col = model.getLineMaxColumn(lastLine);
        editor.setPosition({ lineNumber: lastLine, column: col });
        editor.focus();
      }
    }, 20);
  };

  const runDebugTrace = useCallback(
    async (
      sourceCode = code,
      startPlayback = false,
      silent = false,
      expectedSeq?: number
    ) => {
      if (!silent) {
        setLeftTab('visualiser');
        setVisualiserMode('trace');
        setIsDebugging(true);
        setIsPlayingDebug(false);
        setDebugRuntimeError(null);
        setDebugSyntaxError(null);
      }
      try {
        const res = await fetch('/api/debug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language: lang,
            code: sourceCode,
            timeoutMs: silent ? 900 : 3000
          })
        });
        const data: DebugResponse = await res.json();
        if (expectedSeq !== undefined && expectedSeq !== editSeqRef.current) {
          return;
        }

        const nextSteps = data.steps || [];
        const synErr = data.syntaxError || null;
        const runErr = data.runtimeError || null;

        setDebugSteps(nextSteps);
        setDebugTruncated(Boolean(data.truncated));
        setDebugSyntaxError(synErr);
        setDebugRuntimeError(runErr);
        setSyntaxErrors(synErr ? [synErr] : []);
        setDebugDirty(false);
        setEditorMarkers(synErr, runErr);

        if (runErr && nextSteps.length > 0) {
          const errIdx = nextSteps.findIndex((s) => s.error);
          setDebugStepIndex(errIdx >= 0 ? errIdx : 0);
        } else if (!silent) {
          setDebugStepIndex(0);
          if (startPlayback && data.success && nextSteps.length > 1) {
            setIsPlayingDebug(true);
          }
        } else {
          setDebugStepIndex((prev) =>
            Math.min(prev, Math.max(0, nextSteps.length - 1))
          );
        }

        if (!silent && data.telemetry) {
          setLatestTelemetry(data.telemetry);
          setSessionTelemetry((prev) =>
            [
              {
                id: `dbg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
                action: 'Debug' as const,
                language: lang,
                verdict: data.success ? 'Trace Ready' : (runErr?.type || 'Debug Error'),
                telemetry: data.telemetry!
              },
              ...prev
            ].slice(0, 20)
          );
        }
      } catch (err: any) {
        if (expectedSeq !== undefined && expectedSeq !== editSeqRef.current) {
          return;
        }
        if (!silent) {
          setDebugRuntimeError({
            type: 'NetworkError',
            message: err?.message || 'Debug trace request failed',
            line: 1
          });
        }
      } finally {
        if (!silent) {
          setIsDebugging(false);
        }
      }
    },
    [code, lang, setEditorMarkers]
  );

  useEffect(() => {
    if (!isPlayingDebug || debugSteps.length === 0) return;
    const timer = setInterval(() => {
      setDebugStepIndex((prev) => {
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

  // Apply Monaco debugger decorations
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!editor || !monaco || !model) return;

    const decos: any[] = [];
    const maxLines = model.getLineCount();
    const currentStep =
      leftTab === 'visualiser' ? debugSteps[debugStepIndex] : undefined;
    const activeSynErr = debugSyntaxError || syntaxErrors[0] || null;
    setEditorMarkers(activeSynErr, debugRuntimeError);
    const errLine =
      activeSynErr?.line ||
      currentStep?.error?.line ||
      debugRuntimeError?.line ||
      null;

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

    if (
      activeSynErr &&
      activeSynErr.line >= 1 &&
      activeSynErr.line <= maxLines
    ) {
      decos.push({
        range: new monaco.Range(activeSynErr.line, 1, activeSynErr.line, 1),
        options: {
          isWholeLine: true,
          className: 'debug-error-line'
        }
      });
    } else if (
      currentStep &&
      currentStep.line >= 1 &&
      currentStep.line <= maxLines &&
      !debugDirty
    ) {
      const isErrLine =
        Boolean(currentStep.error) || errLine === currentStep.line;
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
  }, [
    leftTab,
    debugSteps,
    debugStepIndex,
    breakpoints,
    syntaxErrors,
    debugSyntaxError,
    debugRuntimeError,
    debugDirty,
    editorMounted,
    setEditorMarkers
  ]);

  // Real-time syntax & silent error checking while typing
  useEffect(() => {
    const seq = editSeqRef.current;

    if (!code.trim()) {
      setSyntaxErrors([]);
      setDebugSyntaxError(null);
      setDebugRuntimeError(null);
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
          const errs = data.errors || [];
          setSyntaxErrors(errs);
          setDebugSyntaxError(errs[0]);
          setDebugRuntimeError(null);
          setEditorMarkers(errs[0], null);
        } else {
          setSyntaxErrors([]);
          setDebugSyntaxError(null);
          setEditorMarkers(null, null);
          if (debugDirty) {
            runtimeTimer = setTimeout(() => {
              if (seq === editSeqRef.current) {
                runDebugTrace(code, false, true, seq);
              }
            }, 320);
          }
        }
      } catch {
        // Ignore transient typing network errors
      }
    }, 180);

    return () => {
      clearTimeout(syntaxTimer);
      if (runtimeTimer) clearTimeout(runtimeTimer);
    };
  }, [code, lang, debugDirty, runDebugTrace, setEditorMarkers]);

  const executeJudge = useCallback(
    async (isSubmit: boolean) => {
      if (isRunning) return;
      setIsRunning(true);
      setConsoleCollapsed(false);
      setBottomTab('result');
      setActiveResultCaseIdx(0);

      const casesToRun = isSubmit
        ? [...testCases, ...leetcodeSpec.hiddenTestCases]
        : testCases;

      try {
        const res = await fetch('/api/judge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language: lang,
            code,
            methodName: leetcodeSpec.methodName,
            params: leetcodeSpec.params,
            returnType: leetcodeSpec.returnType,
            unorderedReturn: leetcodeSpec.unorderedReturn,
            dataStructureKind: leetcodeSpec.dataStructureKind || null,
            expectedPrintSubstring: problem.expectedPrintSubstring,
            testCases: casesToRun,
            timeoutMs: 3000
          })
        });
        const data: JudgeVerdictResponse = await res.json();
        setJudgeResult({ ...data, isSubmit });

        const hasRealExecutionMetrics =
          data.verdict !== 'Runtime Error' &&
          data.verdict !== 'Compile Error' &&
          typeof data.peakMemoryKb === 'number' &&
          data.peakMemoryKb > 0;

        const resolvedTelemetry: ExecutionTelemetry | null = data.telemetry
          ? data.telemetry
          : hasRealExecutionMetrics && typeof data.runtimeMs === 'number'
          ? {
              executionTimeMs: Math.max(1, data.runtimeMs),
              ...(typeof data.compileTimeMs === 'number'
                ? { compileTimeMs: data.compileTimeMs }
                : {}),
              peakMemoryKb: data.peakMemoryKb!,
              memoryUsedMb:
                data.memoryUsedMb ??
                Math.round(((data.peakMemoryKb! / 1024) + Number.EPSILON) * 100) / 100,
              memoryLimitMb: lang === 'java' ? 128 : 256,
              timeoutLimitMs: 3000,
              engine: `${LANGUAGE_LABELS[lang] || lang} Runtime`,
              backendSource: 'polyglot-sandbox',
              measuredAt: new Date().toISOString()
            }
          : null;

        if (resolvedTelemetry) {
          setLatestTelemetry(resolvedTelemetry);
          setSessionTelemetry((prev) =>
            [
              {
                id: `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
                action: (isSubmit ? 'Submit' : 'Run') as 'Run' | 'Submit',
                language: lang,
                verdict: data.verdict,
                passedCount: data.passedCount,
                totalCount: data.totalCount,
                telemetry: resolvedTelemetry
              },
              ...prev
            ].slice(0, 20)
          );
        }

        if (data.verdict === 'Accepted') {
          const nextHistory = saveSuccessfulRunSnapshot({
            id: `hist-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            problemId: problem.id,
            action: isSubmit ? 'Submit' : 'Run',
            language: lang,
            code,
            passedCount: data.passedCount ?? casesToRun.length,
            totalCount: data.totalCount ?? casesToRun.length,
            runtimeMs: data.runtimeMs ?? 0,
            memoryUsedMb: resolvedTelemetry?.memoryUsedMb,
            createdAt: new Date().toISOString()
          });
          setExecutionHistory(nextHistory);
          setUndoRevertSnapshot(null);
          setRevertedEntryId(null);
        }

        if (isSubmit && data.verdict) {
          const nextSubs = saveProblemSubmission({
            id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            problemId: problem.id,
            language: lang,
            verdict: data.verdict,
            passedCount: data.passedCount ?? 0,
            totalCount: data.totalCount ?? casesToRun.length,
            runtimeMs: data.runtimeMs ?? 0,
            memoryUsedMb: resolvedTelemetry?.memoryUsedMb,
            peakMemoryKb: resolvedTelemetry?.peakMemoryKb,
            engine: resolvedTelemetry?.engine,
            code,
            complexity: data.complexity,
            createdAt: new Date().toISOString()
          });
          setSubmissions(nextSubs);
        }

        if (data.errorLine && data.errorMessage) {
          if (data.verdict === 'Compile Error') {
            setDebugSyntaxError({
              line: data.errorLine,
              column: 1,
              message: data.errorMessage
            });
          } else {
            setDebugRuntimeError({
              type: data.verdict,
              line: data.errorLine,
              message: data.errorMessage
            });
          }
        }

        if (isSubmit && data.verdict === 'Accepted') {
          setLocalSolved(true);
          onSolved(problem.id);
          setConfettiTrigger((prev) => prev + 1);
          setTimerRunning(false);
        } else if (data.cases?.length) {
          const firstFail = data.cases.findIndex((c) => !c.passed);
          if (firstFail >= 0) setActiveResultCaseIdx(firstFail);
        }
      } catch (err: any) {
        setJudgeResult({
          verdict: 'Runtime Error',
          passedCount: 0,
          totalCount: casesToRun.length,
          runtimeMs: 0,
          cases: [],
          errorLine: 1,
          errorMessage: err?.message || 'Judge request failed',
          isSubmit
        });
      } finally {
        setIsRunning(false);
      }
    },
    [
      isRunning,
      testCases,
      leetcodeSpec,
      lang,
      code,
      problem.expectedPrintSubstring,
      problem.id,
      onSolved
    ]
  );

  const debugSpecificCase = useCallback(
    (caseIdx: number, startPlayback = false) => {
      const targetTc = testCases[caseIdx] || leetcodeSpec.hiddenTestCases[caseIdx - testCases.length] || testCases[0];
      if (!targetTc || !code.trim() || leetcodeSpec.isDesignClass) {
        runDebugTrace(code, startPlayback);
        return;
      }

      const dsKind = leetcodeSpec.dataStructureKind;
      const methodName = leetcodeSpec.methodName;

      if (lang === 'python') {
        const argLines = targetTc.inputs.map((inp) => {
          const lower = inp.name.toLowerCase();
          const pyLit = inp.value
            .replace(/\btrue\b/g, 'True')
            .replace(/\bfalse\b/g, 'False')
            .replace(/\bnull\b/g, 'None');
          if (dsKind === 'linked-list' && ['head', 'list1', 'list2', 'l1', 'l2'].includes(lower)) {
            return `${inp.name} = __array_to_list_node(${pyLit})`;
          }
          if (dsKind === 'tree' && ['root', 'p', 'q', 'subroot'].includes(lower)) {
            return `${inp.name} = __array_to_tree_node(${pyLit})`;
          }
          return `${inp.name} = ${pyLit}`;
        });
        const callArgs = targetTc.inputs.map((inp) => inp.name).join(', ');
        const hasSolutionClass = /class\s+Solution\b/.test(code);
        const invokeLine = hasSolutionClass
          ? `_debug_res = Solution().${methodName}(${callArgs})`
          : `_debug_res = ${methodName}(${callArgs})`;
        const tracedCode = `${code.trimEnd()}\n\n${argLines.join('\n')}\n${invokeLine}\nprint(_debug_res)`;
        runDebugTrace(tracedCode, startPlayback);
        return;
      }

      if (lang === 'java' || lang === 'c' || lang === 'cpp') {
        runDebugTrace(code, startPlayback);
        return;
      }

      const jsArgLines = targetTc.inputs.map((inp) => {
        const lower = inp.name.toLowerCase();
        if (dsKind === 'linked-list' && ['head', 'list1', 'list2', 'l1', 'l2'].includes(lower)) {
          return `const __dbg_${inp.name} = __arrayToListNode(${inp.value});`;
        }
        if (dsKind === 'tree' && ['root', 'p', 'q', 'subroot'].includes(lower)) {
          return `const __dbg_${inp.name} = __arrayToTreeNode(${inp.value});`;
        }
        return `const __dbg_${inp.name} = ${inp.value};`;
      });
      const callArgs = targetTc.inputs.map((inp) => `__dbg_${inp.name}`).join(', ');
      const hasJsClass = /class\s+Solution\b/.test(code);
      const invokeLine = hasJsClass
        ? `const _debugResult = new Solution().${methodName}(${callArgs});`
        : `const _debugResult = ${methodName}(${callArgs});`;
      const tracedCode = `${code.trimEnd()}\n\n${jsArgLines.join('\n')}\n${invokeLine}\nconsole.log(_debugResult);`;
      runDebugTrace(tracedCode, startPlayback);
    },
    [code, lang, leetcodeSpec, testCases, runDebugTrace]
  );

  const restoreCodeIntoEditor = useCallback(
    (targetCode: string, targetLang: SolverLanguage) => {
      editSeqRef.current += 1;
      writeDraft(problem.id, targetLang, targetCode);
      if (targetLang !== lang) {
        setLang(targetLang);
      }
      setCode(targetCode);
      setDebugDirty(true);
      setIsPlayingDebug(false);
      setSyntaxErrors([]);
      setDebugSyntaxError(null);
      setDebugRuntimeError(null);
      setEditorMarkers(null, null);
      window.setTimeout(() => {
        editorRef.current?.focus();
      }, 20);
    },
    [problem.id, lang, setEditorMarkers]
  );

  const handleRevertExecution = useCallback(
    (entry: SuccessfulRunSnapshot) => {
      if (code !== entry.code || lang !== entry.language) {
        setUndoRevertSnapshot({ code, language: lang });
      }
      setRevertedEntryId(entry.id);
      restoreCodeIntoEditor(entry.code, entry.language);
    },
    [code, lang, restoreCodeIntoEditor]
  );

  const handleUndoRevert = useCallback(() => {
    if (!undoRevertSnapshot) return;
    restoreCodeIntoEditor(undoRevertSnapshot.code, undoRevertSnapshot.language);
    setUndoRevertSnapshot(null);
    setRevertedEntryId(null);
  }, [undoRevertSnapshot, restoreCodeIntoEditor]);

  const handleClearExecutionHistory = useCallback(() => {
    setExecutionHistory(clearSuccessfulRunHistory(problem.id));
    setUndoRevertSnapshot(null);
    setRevertedEntryId(null);
  }, [problem.id]);

  const handleVisualiseCode = useCallback(
    (startPlayback = false) => {
      if (
        (lang === 'python' || lang === 'javascript' || lang === 'typescript') &&
        !leetcodeSpec.isDesignClass &&
        code.trim()
      ) {
        const escapedMethod = leetcodeSpec.methodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const definesTarget = new RegExp(`\\b${escapedMethod}\\b`).test(code);
        const nonDefLines = code
          .split(/\r?\n/)
          .filter((ln) => !/^\s*(?:def|function|const|let|var|class|#|\/\/)\b/.test(ln))
          .join('\n');
        const alreadyInvokesAtTopLevel =
          new RegExp(`(?:new\\s+Solution\\(\\)\\.|Solution\\(\\)\\.)${escapedMethod}\\s*\\(`).test(
            nonDefLines
          ) ||
          new RegExp(`^[^\\s].*\\b${escapedMethod}\\s*\\(`, 'm').test(nonDefLines);
        if (definesTarget && !alreadyInvokesAtTopLevel) {
          debugSpecificCase(activeCaseIdx, startPlayback);
          return;
        }
      }
      runDebugTrace(code, startPlayback);
    },
    [lang, leetcodeSpec.isDesignClass, leetcodeSpec.methodName, code, activeCaseIdx, debugSpecificCase, runDebugTrace]
  );

  useEffect(() => {
    runActionRef.current = executeJudge;
  }, [executeJudge]);

  // Global keyboard shortcuts (Ctrl/Cmd+Enter Run, Ctrl/Cmd+Shift+Enter Submit)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        runActionRef.current(e.shiftKey);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    configureLeetCodeMonaco(monaco);

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      runActionRef.current(false);
    });
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter,
      () => {
        runActionRef.current(true);
      }
    );

    editor.onDidChangeCursorPosition((e: any) => {
      if (e.position) {
        setCursorPos({
          line: e.position.lineNumber,
          column: e.position.column
        });
      }
    });

    editor.onMouseDown((e: any) => {
      if (
        e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
        e.target.position?.lineNumber
      ) {
        const clickedLine = e.target.position.lineNumber;
        setBreakpoints((prev) =>
          prev.includes(clickedLine)
            ? prev.filter((l) => l !== clickedLine)
            : [...prev, clickedLine]
        );
      }
    });

    setEditorMounted(true);
  };

  // Resizable Horizontal Split Divider
  const startHorizontalResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const container = workspaceRef.current;
    if (!container) return;

    const onMove = (moveEvt: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const pct = ((moveEvt.clientX - rect.left) / rect.width) * 100;
      setLeftWidthPct(Math.min(64, Math.max(28, pct)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Resizable Vertical Split Divider (Editor / Console)
  const startVerticalResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const container = rightPaneRef.current;
    if (!container) return;

    const onMove = (moveEvt: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nextHeight = rect.bottom - moveEvt.clientY;
      setConsoleCollapsed(false);
      setConsoleHeightPx(Math.min(Math.max(130, nextHeight), Math.max(220, rect.height - 180)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleAddCustomCase = () => {
    const template = testCases[activeCaseIdx] || testCases[0];
    const newCase: LeetCodeTestCase = {
      id: `custom-${Date.now().toString(36)}`,
      label: `Case ${testCases.length + 1}`,
      inputs: template
        ? template.inputs.map((inp) => ({ ...inp }))
        : [{ name: 'input', value: '[]' }],
      expectedDisplay: '',
      hasExpected: false,
      isCustom: true
    };
    setTestCases((prev) => [...prev, newCase]);
    setActiveCaseIdx(testCases.length);
    setConsoleCollapsed(false);
    setBottomTab('cases');
  };

  const handleRemoveCase = (idx: number) => {
    if (testCases.length <= 1) return;
    setTestCases((prev) => prev.filter((_, i) => i !== idx));
    setActiveCaseIdx((prev) => Math.max(0, prev >= idx ? prev - 1 : prev));
  };

  const handleCaseInputChange = (
    caseIdx: number,
    inputIdx: number,
    newVal: string
  ) => {
    setTestCases((prev) =>
      prev.map((tc, cIdx) => {
        if (cIdx !== caseIdx) return tc;
        return {
          ...tc,
          inputs: tc.inputs.map((inp, iIdx) =>
            iIdx === inputIdx ? { ...inp, value: newVal } : inp
          )
        };
      })
    );
  };

  const goPrevProblem = () => {
    if (!onSelectProblem || currentProblemIndex <= 0) return;
    onSelectProblem(problems[currentProblemIndex - 1]);
  };

  const goNextProblem = () => {
    if (
      !onSelectProblem ||
      currentProblemIndex < 0 ||
      currentProblemIndex >= problems.length - 1
    ) {
      return;
    }
    onSelectProblem(problems[currentProblemIndex + 1]);
  };

  const goRandomProblem = () => {
    if (!onSelectProblem || problems.length === 0) return;
    const pool = problems.filter((p) => p.id !== problem.id);
    const chosen =
      pool.length > 0
        ? pool[Math.floor(Math.random() * pool.length)]
        : problems[0];
    onSelectProblem(chosen);
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
            <div className="text-xs font-medium text-neutral-300">
              Example Trace
            </div>
            {problem.examples.map((ex, i) => (
              <div key={i} className="font-mono text-xs text-neutral-300 space-y-1">
                <div>
                  <span className="text-neutral-500">Input:</span> {ex.input}
                </div>
                <div>
                  <span className="text-neutral-500">Output:</span>{' '}
                  <span className="text-emerald-400">{ex.output}</span>
                </div>
                {ex.explanation && (
                  <div className="text-neutral-400">{ex.explanation}</div>
                )}
              </div>
            ))}
          </div>
        );
    }
  };

  const activeCase = testCases[activeCaseIdx] || testCases[0];
  const activeResultCase =
    judgeResult?.cases?.[activeResultCaseIdx] || judgeResult?.cases?.[0];

  return (
    <div className="h-screen bg-[#0a0a0a] text-neutral-100 flex flex-col overflow-hidden">
      <ConfettiBurst triggerKey={confettiTrigger} resetKey={problem.id} />

      {/* Quick Problem Switcher Drawer (LeetCode Problem List Sidebar) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-[1px]"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative z-10 w-80 sm:w-96 max-w-full h-full bg-[#0d0d10] border-r border-neutral-800 flex flex-col">
            <div className="h-12 px-4 border-b border-neutral-800 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-white">
                Problem List
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close problem list"
                className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-neutral-800/80">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={drawerQuery}
                  onChange={(e) => setDrawerQuery(e.target.value)}
                  placeholder="Search problems..."
                  className="w-full bg-[#111114] border border-neutral-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/50">
              {drawerProblems.map((item) => {
                const isCurrent = item.id === problem.id;
                const itemSolved = solvedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectProblem?.(item);
                      setDrawerOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left transition-colors ${
                      isCurrent
                        ? 'bg-neutral-800/80 text-white'
                        : 'hover:bg-neutral-800/40 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                          itemSolved
                            ? 'border-emerald-400 bg-emerald-400 text-neutral-950'
                            : 'border-neutral-600'
                        }`}
                      >
                        {itemSolved && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </span>
                      <span className="text-xs font-medium truncate">
                        {item.leetcodeNumber ? `${item.leetcodeNumber}. ` : ''}
                        {item.title}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-medium shrink-0 ${
                        item.difficulty === 'easy'
                          ? 'text-emerald-400'
                          : item.difficulty === 'hard'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {item.difficulty}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      )}

      {/* LeetCode-style Top Workspace Header */}
      <header className="h-12 px-3 sm:px-4 border-b border-neutral-800 bg-[#0d0d10] flex items-center justify-between gap-3 shrink-0">
        {/* Left Zone: Brand + Problem List & Prev/Next/Shuffle */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onGoHome}
            className="text-sm font-bold tracking-tight text-white hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0"
          >
            PolyglotMesh
          </button>

          <span className="text-neutral-700 hidden sm:inline">/</span>

          <div className="flex items-center rounded-md border border-neutral-800 bg-[#131317] p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-neutral-200 hover:bg-neutral-800 transition-colors whitespace-nowrap"
              title="Open problem list drawer"
            >
              <List className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden sm:inline">Problem List</span>
            </button>
            <button
              type="button"
              onClick={goPrevProblem}
              disabled={!onSelectProblem || currentProblemIndex <= 0}
              aria-label="Previous problem"
              title="Previous problem"
              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={goNextProblem}
              disabled={
                !onSelectProblem ||
                currentProblemIndex < 0 ||
                currentProblemIndex >= problems.length - 1
              }
              aria-label="Next problem"
              title="Next problem"
              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={goRandomProblem}
              disabled={!onSelectProblem}
              aria-label="Random problem"
              title="Pick random problem"
              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 transition-colors"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onBackToProblems}
            className="hidden lg:inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Problems</span>
          </button>

          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              title="Quick jump (Ctrl/Cmd + K)"
              className="hidden xl:inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-neutral-800 bg-[#131317] text-[11px] font-mono text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Search className="w-3 h-3" />
              <span>⌘K</span>
            </button>
          )}
        </div>

        {/* Center Zone: Run / Submit / Visualise / Mark Solved */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleVisualiseCode(false)}
            disabled={isDebugging}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
              leftTab === 'visualiser'
                ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                : 'bg-amber-950/30 border-amber-700/50 text-amber-300 hover:bg-amber-900/40'
            } disabled:opacity-50`}
          >
            {isDebugging ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            <span className="hidden md:inline">Visualise</span>
          </button>

          <div className="inline-flex items-center rounded-md border border-neutral-800 bg-[#141418] p-0.5">
            <button
              type="button"
              onClick={() => executeJudge(false)}
              disabled={isRunning}
              title="Run testcases (Ctrl+Enter)"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium text-neutral-100 hover:bg-neutral-800 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {isRunning && !judgeResult?.isSubmit ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : (
                <Play className="w-3.5 h-3.5 text-neutral-300" />
              )}
              <span>Run</span>
            </button>
            <div className="w-px h-4 bg-neutral-800" />
            <button
              type="button"
              onClick={() => executeJudge(true)}
              disabled={isRunning}
              title="Submit solution (Ctrl+Shift+Enter)"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold text-emerald-400 hover:bg-emerald-500/15 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {isRunning && judgeResult?.isSubmit ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>Submit</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleMarkSolvedToggle}
            aria-pressed={effectiveSolved}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
              effectiveSolved
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/25'
                : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-neutral-200'
            }`}
          >
            <CheckCircle2
              className={`w-3.5 h-3.5 ${
                effectiveSolved ? 'text-emerald-400' : 'text-neutral-400'
              }`}
            />
            <span className="hidden sm:inline">
              {effectiveSolved ? 'Solved' : 'Mark solved'}
            </span>
          </button>
        </div>

        {/* Right Zone: Daily Streak & Focus Stopwatch Timer */}
        <div className="flex items-center gap-2 shrink-0">
          <DailyStreakCounter
            streak={dailyStreak ?? readStoredDailyStreak()}
            onOpenProblems={onBackToProblems}
          />
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setTimerRunning((r) => !r)}
              title={timerRunning ? 'Pause timer' : 'Start focus timer'}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono tabular-nums transition-colors ${
                timerRunning
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-neutral-800 bg-[#131317] text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {timerRunning ? (
                <Pause className="w-3 h-3" />
              ) : (
                <Clock className="w-3 h-3" />
              )}
              <span>{formatTimer(timerSeconds)}</span>
            </button>
            {timerSeconds > 0 && (
              <button
                type="button"
                onClick={() => {
                  setTimerRunning(false);
                  setTimerSeconds(0);
                }}
                aria-label="Reset timer"
                title="Reset timer"
                className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Split Workspace */}
      <div
        ref={workspaceRef}
        className="flex-1 min-h-0 flex flex-col lg:flex-row p-2 gap-2 lg:gap-0 overflow-y-auto lg:overflow-hidden"
      >
        {/* Left Pane: DESCRIPTION / NOTES / VISUALISER */}
        {!editorMaximized && (
          <section
            style={{ ['--left-pane-w' as any]: `${leftWidthPct}%` }}
            className="w-full lg:w-[var(--left-pane-w)] shrink-0 rounded-lg border border-neutral-800 bg-[#0b0b0e] flex flex-col overflow-hidden min-h-[260px] lg:min-h-0"
          >
            <div className="flex items-center justify-between px-4 border-b border-neutral-800 bg-[#101014] overflow-x-auto">
              <div className="flex items-center gap-5 text-[11px] font-semibold uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => setLeftTab('description')}
                  className={`py-2.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    leftTab === 'description'
                      ? 'border-white text-white'
                      : 'border-transparent text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  Description
                </button>
                <button
                  type="button"
                  onClick={() => setLeftTab('notes')}
                  className={`py-2.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    leftTab === 'notes'
                      ? 'border-white text-white'
                      : 'border-transparent text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  Notes
                </button>
                <button
                  type="button"
                  onClick={() => setLeftTab('submissions')}
                  className={`py-2.5 border-b-2 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                    leftTab === 'submissions'
                      ? 'border-white text-white'
                      : 'border-transparent text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <span>Submissions</span>
                  {submissions.length > 0 && (
                    <span className="font-mono text-[10px] text-neutral-400 tabular-nums">
                      ({submissions.length})
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLeftTab('visualiser');
                    if (debugSteps.length === 0 || debugDirty) {
                      handleVisualiseCode(false);
                    }
                  }}
                  className={`py-2.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    leftTab === 'visualiser'
                      ? 'border-amber-400 text-amber-300'
                      : 'border-transparent text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  Visualiser
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h1 className="text-xl font-bold text-white tracking-tight">
                    {problem.leetcodeNumber ? `${problem.leetcodeNumber}. ` : ''}
                    {problem.title}
                  </h1>
                  {effectiveSolved && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 shrink-0 pt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Solved
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={
                      problem.difficulty === 'easy'
                        ? 'text-emerald-400 font-medium capitalize'
                        : problem.difficulty === 'hard'
                        ? 'text-rose-400 font-medium capitalize'
                        : 'text-amber-400 font-medium capitalize'
                    }
                  >
                    {problem.difficulty}
                  </span>
                  {problem.week && (
                    <>
                      <span className="text-neutral-600">·</span>
                      <span className="text-neutral-400 font-mono tabular-nums">
                        Week {problem.week}
                      </span>
                    </>
                  )}
                  <span className="text-neutral-600">·</span>
                  <button
                    type="button"
                    onClick={() => setTopicsOpen((o) => !o)}
                    className="inline-flex items-center gap-1 text-neutral-400 hover:text-neutral-200 transition-colors"
                  >
                    <span>Topics ({problem.topics.length})</span>
                    {topicsOpen ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {topicsOpen && (
                  <div className="mt-2 text-xs text-neutral-400 border-t border-neutral-800/70 pt-2">
                    {problem.topics.join(' · ')}
                  </div>
                )}
              </div>

              {leftTab === 'description' && (
                <div className="space-y-5">
                  <p className="font-editorial text-[15px] text-neutral-200 leading-relaxed">
                    {problem.description}
                  </p>

                  <div className="space-y-3">
                    {problem.examples.map((ex, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="text-xs font-semibold text-neutral-300">
                          Example {idx + 1}:
                        </div>
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
                            <div className="text-neutral-400 pt-1">
                              <span className="text-neutral-500">
                                Explanation:{' '}
                              </span>
                              {ex.explanation}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-neutral-800/80">
                    <div className="text-xs font-semibold text-neutral-300">
                      Constraints:
                    </div>
                    <ul className="space-y-1.5 font-mono text-xs text-neutral-400 list-disc list-inside">
                      {leetcodeSpec.constraints.map((c, idx) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Collapsible Conceptual Hints (Zero Code Spoilers) */}
                  <div className="space-y-2 pt-3 border-t border-neutral-800/80">
                    <div className="text-xs font-semibold text-neutral-300">
                      Conceptual Hints
                    </div>
                    {conceptualHints.map((hint, idx) => {
                      const isOpen = openHints[idx];
                      return (
                        <div
                          key={idx}
                          className="rounded-lg border border-neutral-800 bg-[#09090b] overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenHints((prev) =>
                                idx === 0 ? [!prev[0], prev[1]] : [prev[0], !prev[1]]
                              )
                            }
                            aria-expanded={isOpen}
                            className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-medium text-neutral-300 hover:text-white transition-colors"
                          >
                            <span className="inline-flex items-center gap-2">
                              <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>Hint {idx + 1}</span>
                            </span>
                            {isOpen ? (
                              <ChevronUp className="w-3.5 h-3.5 text-neutral-500" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                            )}
                          </button>
                          {isOpen && (
                            <div className="px-3.5 pb-3 pt-1 text-xs text-neutral-300 leading-relaxed border-t border-neutral-800/60">
                              {hint}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {leftTab === 'notes' && (
                <div className="flex flex-col h-full gap-3">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span>
                      Personal notes for this problem (auto-saved locally)
                    </span>
                    {noteText && (
                      <button
                        type="button"
                        onClick={() => setNoteText('')}
                        className="text-neutral-500 hover:text-neutral-200 transition-colors"
                      >
                        Clear note
                      </button>
                    )}
                  </div>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Jot down your time/space complexity ideas, edge cases, or approach notes..."
                    className="w-full min-h-[240px] flex-1 rounded-lg border border-neutral-800 bg-[#09090b] p-3.5 text-xs font-mono text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                  />
                </div>
              )}

              {leftTab === 'submissions' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span>Submission history for this problem</span>
                    <span className="font-mono tabular-nums text-neutral-500">
                      {submissions.length} total
                    </span>
                  </div>

                  {submissions.length === 0 ? (
                    <div className="rounded-lg border border-neutral-800 bg-[#09090b] p-6 text-center space-y-2">
                      <History className="w-5 h-5 text-neutral-500 mx-auto" />
                      <div className="text-xs font-medium text-neutral-200">
                        No submissions yet
                      </div>
                      <p className="text-xs text-neutral-500">
                        Press Submit (Ctrl+Shift+Enter) to evaluate all visible &amp; hidden test cases and record your attempt here.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-neutral-800 bg-[#09090b] divide-y divide-neutral-800/70">
                      {submissions.map((sub) => {
                        const accepted = sub.verdict === 'Accepted';
                        return (
                          <div
                            key={sub.id}
                            className="p-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-neutral-900/40 transition-colors"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 text-xs">
                                {accepted ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                )}
                                <span
                                  className={`font-semibold ${
                                    accepted ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {sub.verdict}
                                </span>
                                <span className="text-neutral-600">·</span>
                                <span className="font-mono text-neutral-400 tabular-nums">
                                  {sub.passedCount}/{sub.totalCount} cases
                                </span>
                                <span className="text-neutral-600">·</span>
                                <span className="text-neutral-400">
                                  {LANGUAGE_LABELS[sub.language] || sub.language}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-neutral-500 tabular-nums">
                                <span>{sub.runtimeMs} ms</span>
                                {typeof sub.memoryUsedMb === 'number' && (
                                  <>
                                    <span>·</span>
                                    <span>{sub.memoryUsedMb.toFixed(2)} MB</span>
                                  </>
                                )}
                                {sub.complexity && (
                                  <>
                                    <span>·</span>
                                    <span>
                                      Time {sub.complexity.time} · Space {sub.complexity.space}
                                    </span>
                                  </>
                                )}
                                <span>·</span>
                                <span>{formatRelativeTime(sub.createdAt)}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (sub.language !== lang) {
                                  setLang(sub.language);
                                  window.setTimeout(() => {
                                    editSeqRef.current += 1;
                                    setCode(sub.code);
                                    setDebugDirty(true);
                                  }, 30);
                                } else {
                                  editSeqRef.current += 1;
                                  setCode(sub.code);
                                  setDebugDirty(true);
                                }
                              }}
                              className="px-2.5 py-1 rounded border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-[11px] font-medium text-neutral-200 transition-colors whitespace-nowrap shrink-0"
                            >
                              Load to Editor
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {leftTab === 'visualiser' && (
                <div className="space-y-4">
                  {problem.illustrationKey &&
                    problem.illustrationKey !== 'two-sum' && (
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

                  {visualiserMode === 'illustration' &&
                  problem.illustrationKey &&
                  problem.illustrationKey !== 'two-sum' ? (
                    <div className="rounded-xl border border-neutral-800 bg-[#09090b] p-4">
                      {renderProblemIllustration()}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-neutral-800 bg-[#09090b] overflow-hidden flex flex-col">
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 border-b border-neutral-800 bg-neutral-950">
                        <button
                          type="button"
                          onClick={() => handleVisualiseCode(false)}
                          disabled={isDebugging}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold bg-amber-950/50 border border-amber-600/50 text-amber-300 hover:bg-amber-900/50 transition-colors disabled:opacity-50"
                        >
                          {isDebugging ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Bug className="w-3 h-3" />
                          )}
                          <span>
                            {debugDirty ? 'Re-Debug Code' : 'Debug Code'}
                          </span>
                        </button>

                        <PlaybackBar
                          compact
                          currentIndex={Math.min(
                            debugStepIndex,
                            Math.max(0, debugSteps.length - 1)
                          )}
                          totalSteps={Math.max(1, debugSteps.length)}
                          isPlaying={isPlayingDebug}
                          onTogglePlay={() => {
                            if (debugDirty || debugSteps.length === 0) {
                              handleVisualiseCode(true);
                              return;
                            }
                            if (
                              !isPlayingDebug &&
                              debugStepIndex >= debugSteps.length - 1
                            ) {
                              setDebugStepIndex(0);
                            }
                            setIsPlayingDebug((p) => !p);
                          }}
                          onFirst={() => {
                            setIsPlayingDebug(false);
                            setDebugStepIndex(0);
                          }}
                          onPrev={() => {
                            setIsPlayingDebug(false);
                            setDebugStepIndex((s) => Math.max(0, s - 1));
                          }}
                          onNext={() => {
                            setIsPlayingDebug(false);
                            if (debugDirty || debugSteps.length === 0) {
                              handleVisualiseCode(false);
                            } else {
                              setDebugStepIndex((s) =>
                                Math.min(
                                  Math.max(0, debugSteps.length - 1),
                                  s + 1
                                )
                              );
                            }
                          }}
                          onLast={() => {
                            setIsPlayingDebug(false);
                            setDebugStepIndex(
                              Math.max(0, debugSteps.length - 1)
                            );
                          }}
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
            </div>
          </section>
        )}

        {/* Horizontal Drag Resizer */}
        {!editorMaximized && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize description and editor panes"
            onMouseDown={startHorizontalResize}
            className="hidden lg:flex w-2 shrink-0 cursor-col-resize items-center justify-center group"
          >
            <div className="w-0.5 h-10 rounded-full bg-neutral-800 group-hover:bg-emerald-400 transition-colors" />
          </div>
        )}

        {/* Right Pane: CODE EDITOR (Top) + TESTCASE / TEST RESULT (Bottom) */}
        <section
          ref={rightPaneRef}
          className="flex-1 min-w-0 flex flex-col min-h-[540px] lg:min-h-0"
        >
          {/* Code Editor Panel */}
          <div
            className={`${
              editorCollapsed ? 'shrink-0' : 'flex-1 min-h-[240px]'
            } rounded-lg border border-[#3a3a3c] bg-[#262626] flex flex-col overflow-hidden relative`}
          >
            {/* Top LeetCode Panel Title Header: </> Code  [Maximize] [^] */}
            <div className="h-9 px-3.5 bg-[#333333] border-b border-[#3e3e42] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-100">
                <Code2 className="w-4 h-4 text-[#2cbb5d]" />
                <span>Code</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditorCollapsed(false);
                    setEditorMaximized((m) => !m);
                  }}
                  aria-label={editorMaximized ? 'Restore layout' : 'Maximize editor'}
                  title={editorMaximized ? 'Restore layout' : 'Maximize editor'}
                  className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-[#404044] transition-colors"
                >
                  {editorMaximized ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditorCollapsed((c) => !c)}
                  aria-label={editorCollapsed ? 'Expand code editor' : 'Collapse code editor'}
                  title={editorCollapsed ? 'Expand code editor' : 'Collapse code editor'}
                  className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-[#404044] transition-colors"
                >
                  {editorCollapsed ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {!editorCollapsed && (
              <>
                {/* Secondary LeetCode Language & Icon Utility Bar */}
                <div className="h-9 px-3 border-b border-[#363638] bg-[#262626] flex items-center justify-between gap-2 text-xs shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative inline-flex items-center">
                      <select
                        aria-label="Editor Language"
                        value={lang}
                        onChange={(e) =>
                          setLang(e.target.value as SolverLanguage)
                        }
                        className="appearance-none bg-transparent hover:bg-[#333336] rounded pl-2 pr-6 py-1 text-xs font-medium text-neutral-200 focus:outline-none cursor-pointer transition-colors"
                      >
                        <option value="python" className="bg-[#262626] text-neutral-100">
                          Python 3
                        </option>
                        <option value="javascript" className="bg-[#262626] text-neutral-100">
                          JavaScript
                        </option>
                        <option value="typescript" className="bg-[#262626] text-neutral-100">
                          TypeScript
                        </option>
                        <option value="java" className="bg-[#262626] text-neutral-100">
                          {runtimeAvailability.java === false ? 'Java (Unavailable)' : 'Java'}
                        </option>
                        <option value="c" className="bg-[#262626] text-neutral-100">
                          {runtimeAvailability.c === false ? 'C (Unavailable)' : 'C'}
                        </option>
                        <option value="cpp" className="bg-[#262626] text-neutral-100">
                          {runtimeAvailability.cpp === false ? 'C++ (Unavailable)' : 'C++'}
                        </option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-neutral-400 pointer-events-none absolute right-1.5" />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setEditorPrefs((p) => ({ ...p, autocomplete: !p.autocomplete }))
                      }
                      title={
                        editorPrefs.autocomplete
                          ? 'Auto-complete enabled (click to toggle)'
                          : 'Auto-complete disabled (click to toggle)'
                      }
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                        editorPrefs.autocomplete
                          ? 'text-neutral-400 hover:text-neutral-200 hover:bg-[#333336]'
                          : 'text-neutral-500 hover:text-neutral-300 hover:bg-[#333336]'
                      }`}
                    >
                      <Lock className="w-3 h-3" />
                      <span>{editorPrefs.autocomplete ? 'Auto' : 'Manual'}</span>
                    </button>

                    {(() => {
                      const liveErr = debugSyntaxError || syntaxErrors[0] || null;
                      if (liveErr) {
                        return (
                          <button
                            type="button"
                            onClick={() => jumpToLine(liveErr.line)}
                            className="hidden sm:inline text-[11px] text-rose-400 hover:text-rose-300 font-mono font-semibold whitespace-nowrap truncate"
                          >
                            SyntaxError · L{liveErr.line}
                          </button>
                        );
                      }
                      if (debugRuntimeError) {
                        return (
                          <button
                            type="button"
                            onClick={() => jumpToLine(debugRuntimeError.line)}
                            className="hidden sm:inline text-[11px] text-rose-400 hover:text-rose-300 font-mono font-semibold whitespace-nowrap truncate"
                          >
                            {debugRuntimeError.type} · L{debugRuntimeError.line}
                          </button>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* Right Icon Utility Strip */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={formatEditorCode}
                      title="Format code"
                      aria-label="Format code"
                      className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-[#333336] transition-colors"
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setHistoryPanelOpen((open) => !open)}
                      aria-expanded={historyPanelOpen}
                      aria-label="Toggle Code Execution History"
                      title="Code Execution History (last 5 successful runs)"
                      className={`inline-flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-medium transition-colors ${
                        historyPanelOpen
                          ? 'text-emerald-400 bg-emerald-500/15'
                          : 'text-neutral-400 hover:text-white hover:bg-[#333336]'
                      }`}
                    >
                      <History className="w-3.5 h-3.5" />
                      {executionHistory.length > 0 && (
                        <span className="font-mono text-[10px] tabular-nums">
                          {executionHistory.length}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={insertSignatureStub}
                      title="Insert Solution signature stub"
                      aria-label="Insert signature stub"
                      className="p-1.5 rounded text-neutral-400 hover:text-emerald-400 hover:bg-[#333336] transition-colors"
                    >
                      <Braces className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        writeDraft(problem.id, lang, '');
                        insertSignatureStub();
                      }}
                      title="Reset to default code definition"
                      aria-label="Reset to default code definition"
                      className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-[#333336] transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setSettingsOpen((s) => !s)}
                        aria-label="Editor settings"
                        title="Editor settings"
                        className={`p-1.5 rounded transition-colors ${
                          settingsOpen
                            ? 'bg-[#3a3a3e] text-white'
                            : 'text-neutral-400 hover:text-white hover:bg-[#333336]'
                        }`}
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                      </button>

                      {settingsOpen && (
                        <div className="absolute right-0 top-9 z-40 w-60 rounded-lg border border-neutral-700 bg-[#1e1e20] p-3.5 space-y-3 shadow-xl">
                          <div className="flex items-center justify-between text-xs font-semibold text-white">
                            <span>Editor Settings</span>
                            <button
                              type="button"
                              onClick={() => setSettingsOpen(false)}
                              className="text-neutral-400 hover:text-white"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-neutral-400">Font Size</span>
                            <select
                              value={editorPrefs.fontSize}
                              onChange={(e) =>
                                setEditorPrefs((p) => ({
                                  ...p,
                                  fontSize: Number(e.target.value)
                                }))
                              }
                              className="bg-[#2b2b2e] border border-neutral-700 rounded px-2 py-0.5 text-xs text-neutral-200 tabular-nums"
                            >
                              {[12, 13, 14, 15, 16].map((sz) => (
                                <option key={sz} value={sz}>
                                  {sz}px
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-neutral-400">Tab Size</span>
                            <div className="inline-flex rounded border border-neutral-700 bg-[#2b2b2e] p-0.5">
                              {([2, 4] as const).map((ts) => (
                                <button
                                  key={ts}
                                  type="button"
                                  onClick={() =>
                                    setEditorPrefs((p) => ({ ...p, tabSize: ts }))
                                  }
                                  className={`px-2 py-0.5 rounded text-[11px] tabular-nums ${
                                    editorPrefs.tabSize === ts
                                      ? 'bg-neutral-600 text-white'
                                      : 'text-neutral-400'
                                  }`}
                                >
                                  {ts}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-neutral-400">Word Wrap</span>
                            <button
                              type="button"
                              onClick={() =>
                                setEditorPrefs((p) => ({
                                  ...p,
                                  wordWrap: p.wordWrap === 'on' ? 'off' : 'on'
                                }))
                              }
                              className={`px-2 py-0.5 rounded border text-[11px] ${
                                editorPrefs.wordWrap === 'on'
                                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                                  : 'border-neutral-700 bg-[#2b2b2e] text-neutral-400'
                              }`}
                            >
                              {editorPrefs.wordWrap === 'on' ? 'On' : 'Off'}
                            </button>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-neutral-400">Autocomplete</span>
                            <button
                              type="button"
                              onClick={() =>
                                setEditorPrefs((p) => ({
                                  ...p,
                                  autocomplete: !p.autocomplete
                                }))
                              }
                              className={`px-2 py-0.5 rounded border text-[11px] ${
                                editorPrefs.autocomplete
                                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                                  : 'border-neutral-700 bg-[#2b2b2e] text-neutral-400'
                              }`}
                            >
                              {editorPrefs.autocomplete ? 'On' : 'Off'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Runtime Availability Notice when a language runtime is absent in container */}
                {runtimeAvailability[lang] === false && (
                  <div className="px-4 py-1.5 border-b border-amber-800/50 bg-amber-950/35 flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-200">
                    <span>
                      {LANGUAGE_LABELS[lang]} runtime is not installed in this container. Switch to Python 3, JavaScript, TypeScript, C, or C++ to run code.
                    </span>
                    <button
                      type="button"
                      onClick={() => setLang('python')}
                      className="font-medium text-amber-300 hover:text-amber-200 underline underline-offset-2 whitespace-nowrap"
                    >
                      Switch to Python 3
                    </button>
                  </div>
                )}

                {/* Subtle LeetCode Method Signature Hint Strip when Editor is Empty */}
                {!code.trim() && (
                  <div className="px-4 py-1.5 border-b border-[#333336] bg-[#222224] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="font-mono text-neutral-400 truncate">
                      Target:{' '}
                      <span className="text-neutral-200">
                        {leetcodeSpec.isDesignClass
                          ? `class ${leetcodeSpec.methodName}`
                          : lang === 'c'
                          ? `${leetcodeSpec.methodName}(${leetcodeSpec.params
                              .map((p) => p.name)
                              .join(', ')})`
                          : `Solution.${leetcodeSpec.methodName}(${leetcodeSpec.params
                              .map((p) => p.name)
                              .join(', ')})`}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={insertSignatureStub}
                      className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors whitespace-nowrap"
                    >
                      Insert empty signature
                    </button>
                  </div>
                )}

                <div className="flex-1 min-h-0 bg-[#262626]">
                  <Editor
                    height="100%"
                    language={lang}
                    value={code}
                    onChange={(val) => {
                      editSeqRef.current += 1;
                      setCode(val || '');
                      setUndoRevertSnapshot(null);
                      setRevertedEntryId(null);
                      setDebugDirty(true);
                      setIsPlayingDebug(false);
                      setDebugRuntimeError(null);
                    }}
                    onMount={handleEditorDidMount}
                    theme="ntree-obsidian"
                    options={{
                      minimap: { enabled: false },
                      glyphMargin: true,
                      fontSize: editorPrefs.fontSize,
                      lineHeight: Math.round(editorPrefs.fontSize * 1.6),
                      fontFamily: "'JetBrains Mono', monospace",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: editorPrefs.tabSize,
                      insertSpaces: true,
                      wordWrap: editorPrefs.wordWrap,
                      autoClosingBrackets: 'always',
                      autoClosingQuotes: 'always',
                      autoIndent: 'full',
                      formatOnType: true,
                      matchBrackets: 'always',
                      bracketPairColorization: { enabled: true },
                      quickSuggestions: editorPrefs.autocomplete,
                      suggestOnTriggerCharacters: editorPrefs.autocomplete,
                      padding: { top: 12, bottom: 12 }
                    }}
                  />
                </div>

                {(debugSyntaxError || syntaxErrors[0] || debugRuntimeError) &&
                  (() => {
                    const syn = debugSyntaxError || syntaxErrors[0] || null;
                    const errLabel = syn ? 'SyntaxError' : debugRuntimeError!.type;
                    const errLine = syn ? syn.line : debugRuntimeError!.line;
                    const errCol = syn ? syn.column : undefined;
                    const errMsg = syn ? syn.message : debugRuntimeError!.message;
                    return (
                      <div className="px-4 py-2 border-t border-rose-500/40 bg-rose-950/40 flex items-start justify-between gap-3 text-xs font-mono">
                        <div className="flex items-start gap-2 text-rose-200 min-w-0">
                          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                          <span className="break-words">
                            <strong className="text-rose-300">
                              {errLabel} (Line {errLine}
                              {errCol ? `:${errCol}` : ''}):
                            </strong>{' '}
                            {errMsg}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => jumpToLine(errLine)}
                          className="px-2 py-0.5 rounded border border-rose-500/40 bg-rose-950/60 hover:bg-rose-900/60 text-[11px] text-rose-200 shrink-0 transition-colors"
                        >
                          Line {errLine}
                        </button>
                      </div>
                    );
                  })()}

                {/* LeetCode Editor Bottom Bar: Ln X, Col Y | Saved  ...  [Debug] [Run] [Submit] */}
                <div className="h-11 px-3.5 border-t border-[#333336] bg-[#262626] flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5 text-xs text-neutral-400 min-w-0">
                    <span className="font-sans tabular-nums whitespace-nowrap">
                      Ln {cursorPos.line}, Col {cursorPos.column}
                    </span>
                    <span className="text-neutral-600">|</span>
                    <span className="whitespace-nowrap">
                      {code.trim() ? 'Saved' : 'Empty'}
                    </span>
                    {latestTelemetry && (
                      <>
                        <span className="hidden xl:inline text-neutral-600">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setBottomTab('result');
                            setConsoleCollapsed(false);
                          }}
                          title="Inspect live execution time & memory tracker"
                          className="hidden xl:inline-flex items-center gap-1.5 font-mono text-[11px] text-neutral-400 hover:text-emerald-400 transition-colors tabular-nums whitespace-nowrap"
                        >
                          <span>{latestTelemetry.executionTimeMs} ms</span>
                          <span className="text-neutral-600">·</span>
                          <span>{latestTelemetry.memoryUsedMb.toFixed(2)} MB</span>
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleVisualiseCode(false)}
                      disabled={isDebugging}
                      title="Debug / Visualise line-by-line execution"
                      aria-label="Debug code"
                      className={`p-1.5 rounded-md transition-colors ${
                        leftTab === 'visualiser'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'text-amber-400 hover:bg-[#3a3a3d]'
                      } disabled:opacity-50`}
                    >
                      {isDebugging ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Bug className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => executeJudge(false)}
                      disabled={isRunning}
                      title="Run testcases (Ctrl+Enter)"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#3a3a3d] hover:bg-[#48484c] text-neutral-100 text-xs font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {isRunning && !judgeResult?.isSubmit && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      )}
                      <span>Run</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => executeJudge(true)}
                      disabled={isRunning}
                      title="Submit solution (Ctrl+Shift+Enter)"
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-[#2cbb5d] hover:bg-[#26a651] text-white text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {isRunning && judgeResult?.isSubmit && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      )}
                      <span>Submit</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Vertical Drag Resizer */}
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize code editor and testcase console"
            onMouseDown={startVerticalResize}
            className="h-2 shrink-0 cursor-row-resize flex items-center justify-center group"
          >
            <div className="h-1 w-10 rounded-full bg-[#3a3a3d] group-hover:bg-emerald-400 transition-colors" />
          </div>

          {/* Bottom Testcase / Test Result Panel */}
          <div
            style={{
              height: consoleCollapsed ? '38px' : `${consoleHeightPx}px`
            }}
            className="shrink-0 rounded-lg border border-[#3a3a3c] bg-[#262626] flex flex-col overflow-hidden transition-[height] duration-75"
          >
            <div className="h-[38px] px-3.5 border-b border-[#363638] bg-[#303033] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setBottomTab('cases');
                    setConsoleCollapsed(false);
                  }}
                  className={`inline-flex items-center gap-1.5 py-2 border-b-2 transition-colors whitespace-nowrap ${
                    bottomTab === 'cases'
                      ? 'border-white text-white'
                      : 'border-transparent text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5 text-[#2cbb5d]" />
                  <span>Testcase</span>
                </button>
                <span className="text-neutral-600">|</span>
                <button
                  type="button"
                  onClick={() => {
                    setBottomTab('result');
                    setConsoleCollapsed(false);
                  }}
                  className={`inline-flex items-center gap-1.5 py-2 border-b-2 transition-colors whitespace-nowrap ${
                    bottomTab === 'result'
                      ? 'border-white text-white'
                      : 'border-transparent text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <TerminalSquare className="w-3.5 h-3.5 text-[#2cbb5d]" />
                  <span>Test Result</span>
                  {judgeResult && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        judgeResult.verdict === 'Accepted'
                          ? 'bg-emerald-400'
                          : 'bg-rose-400'
                      }`}
                    />
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setConsoleCollapsed((c) => !c)}
                aria-label={
                  consoleCollapsed ? 'Expand console' : 'Collapse console'
                }
                className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                {consoleCollapsed ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {!consoleCollapsed && (
              <div className="p-4 flex-1 overflow-y-auto font-mono text-xs">
                {bottomTab === 'cases' ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {testCases.map((tc, idx) => (
                        <div
                          key={tc.id}
                          className={`inline-flex items-center rounded-md border transition-colors ${
                            idx === activeCaseIdx
                              ? 'bg-neutral-800 border-neutral-600 text-white'
                              : 'bg-[#121216] border-neutral-800 text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setActiveCaseIdx(idx)}
                            className="px-2.5 py-1 text-[11px] font-medium whitespace-nowrap"
                          >
                            {tc.label}
                          </button>
                          {testCases.length > 1 && tc.isCustom && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCase(idx)}
                              aria-label={`Remove ${tc.label}`}
                              className="pr-1.5 text-neutral-500 hover:text-rose-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleAddCustomCase}
                        aria-label="Add custom testcase"
                        title="Add custom testcase"
                        className="p-1 rounded-md border border-neutral-800 bg-[#121216] text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {activeCase && (
                      <div className="space-y-2.5">
                        {activeCase.inputs.map((inp, inpIdx) => (
                          <div key={inpIdx} className="space-y-1">
                            <label className="block text-[11px] text-neutral-400">
                              {inp.name} =
                            </label>
                            <input
                              type="text"
                              value={inp.value}
                              onChange={(e) =>
                                handleCaseInputChange(
                                  activeCaseIdx,
                                  inpIdx,
                                  e.target.value
                                )
                              }
                              className="w-full rounded-md border border-neutral-800 bg-[#121216] px-3 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : isRunning ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-neutral-400">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Running testcases &amp; measuring runtime telemetry...</span>
                    </div>
                    <ExecutionMetricsTracker
                      telemetry={latestTelemetry}
                      complexity={judgeResult?.complexity}
                      history={sessionTelemetry}
                      isRunning
                    />
                  </div>
                ) : judgeResult ? (
                  <div className="space-y-3">
                    {/* LeetCode Verdict Banner */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        {judgeResult.verdict === 'Accepted' ? (
                          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-400 font-sans">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Accepted</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-rose-400 font-sans">
                            <XCircle className="w-4 h-4" />
                            <span>{judgeResult.verdict}</span>
                          </span>
                        )}
                        <span className="text-neutral-500 tabular-nums">
                          {judgeResult.passedCount} / {judgeResult.totalCount}{' '}
                          testcases passed
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-neutral-400 tabular-nums">
                        {judgeResult.verdict === 'Accepted' &&
                          onSelectProblem &&
                          currentProblemIndex >= 0 &&
                          currentProblemIndex < problems.length - 1 && (
                            <button
                              type="button"
                              onClick={goNextProblem}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-sans font-semibold text-[11px] transition-colors whitespace-nowrap"
                            >
                              <span>Next Problem</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                      </div>
                    </div>

                    {/* Real-Time Execution & Memory Tracker */}
                    <ExecutionMetricsTracker
                      telemetry={latestTelemetry}
                      complexity={judgeResult.complexity}
                      history={sessionTelemetry}
                      isRunning={false}
                    />

                    {/* Top-level Compile / Runtime Error Box */}
                    {judgeResult.errorMessage && (
                      <div className="p-3 rounded-md bg-rose-950/30 border border-rose-900/60 text-rose-300 flex items-start justify-between gap-3">
                        <pre className="whitespace-pre-wrap break-words">
                          {judgeResult.errorMessage}
                        </pre>
                        {judgeResult.errorLine && (
                          <button
                            type="button"
                            onClick={() => jumpToLine(judgeResult.errorLine!)}
                            className="px-2 py-0.5 rounded border border-rose-500/40 bg-rose-950/60 hover:bg-rose-900/60 text-[11px] text-rose-200 shrink-0"
                          >
                            Line {judgeResult.errorLine}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Per-Case Verdict Tabs */}
                    {judgeResult.cases.length > 0 && (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {judgeResult.cases.map((c, idx) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setActiveResultCaseIdx(idx)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors ${
                                  idx === activeResultCaseIdx
                                    ? 'bg-neutral-800 border-neutral-600 text-white'
                                    : 'bg-[#121216] border-neutral-800 text-neutral-400 hover:text-neutral-200'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    c.passed ? 'bg-emerald-400' : 'bg-rose-400'
                                  }`}
                                />
                                <span>{c.label}</span>
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => debugSpecificCase(activeResultCaseIdx)}
                            disabled={isDebugging || !code.trim()}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-amber-700/50 bg-amber-950/30 hover:bg-amber-900/40 text-[11px] font-medium text-amber-300 transition-colors disabled:opacity-40 whitespace-nowrap"
                          >
                            <Bug className="w-3 h-3" />
                            <span>Debug this case</span>
                          </button>
                        </div>

                        {activeResultCase && (
                          <div className="space-y-2.5">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                                <span>Input</span>
                                {typeof activeResultCase.runtimeMs === 'number' && (
                                  <span className="font-mono tabular-nums text-neutral-400">
                                    Case runtime: {activeResultCase.runtimeMs} ms
                                  </span>
                                )}
                              </div>
                              <pre className="p-2.5 rounded-md bg-[#121216] border border-neutral-800/80 text-neutral-200 whitespace-pre-wrap">
                                {activeResultCase.inputDisplay}
                              </pre>
                            </div>

                            {activeResultCase.stdout && (
                              <div className="space-y-1">
                                <div className="text-[11px] text-neutral-500">
                                  Stdout
                                </div>
                                <pre className="p-2.5 rounded-md bg-[#121216] border border-neutral-800/80 text-neutral-300 whitespace-pre-wrap">
                                  {activeResultCase.stdout}
                                </pre>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div className="space-y-1">
                                <div className="text-[11px] text-neutral-500">
                                  Output
                                </div>
                                <pre
                                  className={`p-2.5 rounded-md border whitespace-pre-wrap ${
                                    activeResultCase.passed
                                      ? 'bg-[#121216] border-neutral-800/80 text-emerald-300'
                                      : 'bg-rose-950/20 border-rose-900/50 text-rose-300'
                                  }`}
                                >
                                  {activeResultCase.actualOutput ||
                                    activeResultCase.error ||
                                    '(none)'}
                                </pre>
                              </div>

                              <div className="space-y-1">
                                <div className="text-[11px] text-neutral-500">
                                  Expected
                                </div>
                                <pre className="p-2.5 rounded-md bg-[#121216] border border-neutral-800/80 text-emerald-400 whitespace-pre-wrap">
                                  {activeResultCase.expectedOutput}
                                </pre>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-neutral-500">
                      You must run your code first. Press{' '}
                      <span className="text-neutral-300">Run</span> (Ctrl+Enter)
                      or <span className="text-neutral-300">Submit</span>{' '}
                      (Ctrl+Shift+Enter).
                    </div>
                    <ExecutionMetricsTracker
                      telemetry={latestTelemetry}
                      history={sessionTelemetry}
                      isRunning={false}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right Side Panel: Code Execution History (Docked on lg+ when editor not maximized) */}
        {historyPanelOpen && !editorMaximized && (
          <div className="hidden lg:block w-72 xl:w-80 shrink-0 pl-2 min-h-0">
            <CodeExecutionHistoryPanel
              entries={executionHistory}
              currentCode={code}
              currentLang={lang}
              undoSnapshot={undoRevertSnapshot}
              revertedEntryId={revertedEntryId}
              onRevert={handleRevertExecution}
              onUndoRevert={handleUndoRevert}
              onClear={handleClearExecutionHistory}
              onClose={() => setHistoryPanelOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Responsive Slide-Over Drawer for Code Execution History (< lg or when editor is maximized) */}
      {historyPanelOpen && (
        <div
          className={`fixed inset-0 z-50 flex justify-end ${
            editorMaximized ? '' : 'lg:hidden'
          }`}
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-[1px]"
            onClick={() => setHistoryPanelOpen(false)}
          />
          <div className="relative z-10 w-80 sm:w-96 max-w-full h-full p-2 bg-[#0a0a0a]">
            <CodeExecutionHistoryPanel
              entries={executionHistory}
              currentCode={code}
              currentLang={lang}
              undoSnapshot={undoRevertSnapshot}
              revertedEntryId={revertedEntryId}
              onRevert={(entry) => {
                handleRevertExecution(entry);
                setHistoryPanelOpen(false);
              }}
              onUndoRevert={handleUndoRevert}
              onClear={handleClearExecutionHistory}
              onClose={() => setHistoryPanelOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
