import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, WorkspaceTab } from './components/Navbar';
import { ScriptSidebar } from './components/ScriptSidebar';
import { CodeEditor } from './components/CodeEditor';
import { ConsoleOutput } from './components/ConsoleOutput';
import { InteropPanel } from './components/InteropPanel';
import { PerformanceDashboardView } from './components/PerformanceDashboardView';
import { SecurityTestsView } from './components/SecurityTestsView';
import { ArchitectureView } from './components/ArchitectureView';
import { VisualiserWorkspaceView } from './components/VisualiserWorkspaceView';
import { ProblemsExplorerView } from './components/visualizer/ProblemsExplorerView';
import { ProblemSolverView } from './components/visualizer/ProblemSolverView';
import { ScriptLibraryModal } from './components/ScriptLibraryModal';
import { SupportedLanguage, ExecutionResponse, SavedScript, HealthStatus } from './types';
import { CODE_TEMPLATES } from './data/templates';
import { ALGORITHM_PROBLEMS, AlgorithmProblem } from './data/visualizerProblems';

type AppMode = 'home' | 'problems' | 'solve' | 'sandbox';

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>('home');
  const [selectedProblem, setSelectedProblem] = useState<AlgorithmProblem>(ALGORITHM_PROBLEMS[0]);
  const [solverLang, setSolverLang] = useState<'python' | 'javascript'>('python');
  const [solvedIds, setSolvedIds] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('editor');
  const [securitySubTab, setSecuritySubTab] = useState<'tests' | 'architecture'>('tests');
  const [language, setLanguage] = useState<SupportedLanguage>('python');
  const [code, setCode] = useState<string>(CODE_TEMPLATES[0].code);
  const [timeoutMs, setTimeoutMs] = useState<number>(3000);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [response, setResponse] = useState<ExecutionResponse | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const [scripts, setScripts] = useState<SavedScript[]>([]);
  const [loadingScripts, setLoadingScripts] = useState(false);
  const [activeScript, setActiveScript] = useState<SavedScript | null>(null);

  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthError, setHealthError] = useState(false);

  const [lastRequestPayload, setLastRequestPayload] = useState<any>({
    language: 'python',
    code: CODE_TEMPLATES[0].code,
    timeoutMs: 3000
  });

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryTab, setLibraryTab] = useState<'saved' | 'history' | 'saveNew'>('saved');

  const loadHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('Health check failed');
      const data: HealthStatus = await res.json();
      setHealth(data);
      setHealthError(false);
    } catch {
      setHealthError(true);
    }
  }, []);

  const loadScripts = useCallback(async () => {
    setLoadingScripts(true);
    try {
      const res = await fetch('/api/scripts');
      if (res.ok) {
        const data = await res.json();
        setScripts(data.scripts || []);
      }
    } catch (err) {
      console.error('Failed loading scripts:', err);
    } finally {
      setLoadingScripts(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();
    loadScripts();
  }, [loadHealth, loadScripts]);

  const handleExecute = useCallback(async () => {
    if (isRunning) return;

    if (!code || code.trim().length === 0) {
      setValidationMessage('Source code cannot be empty. Enter valid code before running.');
      return;
    }

    setValidationMessage(null);
    setActiveTab('editor');
    setIsRunning(true);
    const payload = { language, code, timeoutMs };
    setLastRequestPayload(payload);

    const startTime = Date.now();
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Unexpected response from server (HTTP ${res.status})`);
      }

      const data: ExecutionResponse = await res.json();
      setResponse(data);
    } catch (err: any) {
      setResponse({
        success: false,
        language,
        output: '',
        error: `Backend Communication Error: ${err.message || 'Unable to reach execution API'}`,
        executionTimeMs: Date.now() - startTime,
        engine: 'PolyglotMesh Web Client'
      });
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, language, code, timeoutMs]);

  useEffect(() => {
    if (appMode !== 'sandbox') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleExecute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appMode, handleExecute]);

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    setValidationMessage(null);
    setActiveScript(null);
    const defaultTmpl = CODE_TEMPLATES.find(t => t.language === newLang);
    if (defaultTmpl) {
      setCode(defaultTmpl.code);
    }
  };

  const handleResetTemplate = () => {
    setValidationMessage(null);
    const defaultTmpl = CODE_TEMPLATES.find(t => t.language === language);
    if (defaultTmpl) {
      setCode(defaultTmpl.code);
    }
  };

  const handleSelectScript = (script: SavedScript) => {
    setActiveScript(script);
    setLanguage(script.language);
    setCode(script.code);
    setValidationMessage(null);
    setActiveTab('editor');
  };

  const handleNewScript = () => {
    setActiveScript(null);
    setCode('');
    setValidationMessage(null);
    setActiveTab('editor');
  };

  const handleUpdateActiveScript = async () => {
    if (!activeScript) return;
    if (!code.trim()) {
      setValidationMessage('Cannot save empty code.');
      return;
    }

    try {
      const res = await fetch(`/api/scripts/${activeScript.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: activeScript.name,
          language,
          code,
          description: activeScript.description,
          author: activeScript.author
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveScript(data.script);
        loadScripts();
        setValidationMessage(`Updated "${data.script.name}" successfully.`);
        setTimeout(() => setValidationMessage(null), 2500);
      } else {
        setValidationMessage(data.error || 'Failed to update script.');
      }
    } catch (err: any) {
      setValidationMessage(`Update error: ${err.message}`);
    }
  };

  const handleDeleteScript = async (id: string) => {
    try {
      const res = await fetch(`/api/scripts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (activeScript?.id === id) setActiveScript(null);
        loadScripts();
      }
    } catch (err) {
      console.error('Failed deleting script:', err);
    }
  };

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

  // Mode 2: Dedicated Problems Explorer (Photo 5)
  if (appMode === 'problems') {
    return (
      <ProblemsExplorerView
        solvedIds={solvedIds}
        onSelectProblem={(problem) => openProblemInSolver(problem, 'python')}
        onGoHome={() => {
          setAppMode('home');
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
        onOpenSandbox={() => {
          setAppMode('sandbox');
          setActiveTab('editor');
        }}
      />
    );
  }

  // Mode 3: Dedicated Split Problem Solver IDE (Photo 4 Window)
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

  // Mode 1: Clean Visualiser Landing & Animated Illustrations (Photos 4, 1, 2, 3)
  if (appMode === 'home') {
    const scrollToSection = (id: string) => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
      <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 flex flex-col font-sans">
        {/* Clean 3-Zone Top Bar matching the minimal #0a0a0a aesthetic */}
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
              <button
                type="button"
                onClick={() => {
                  setAppMode('sandbox');
                  setActiveTab('editor');
                }}
                className="hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                Sandbox IDE
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
            <span>PolyglotMesh · Interactive Code Visualiser &amp; Polyglot Sandbox</span>
            <button
              type="button"
              onClick={() => {
                setAppMode('sandbox');
                setActiveTab('editor');
              }}
              className="text-neutral-400 hover:text-white transition-colors"
            >
              Open Full GraalVM Sandbox IDE
            </button>
          </div>
        </footer>
      </div>
    );
  }

  // Mode 4: Full PolyglotMesh Sandbox IDE (accessible via "Sandbox IDE")
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'visualiser') {
            setAppMode('home');
          } else {
            setActiveTab(tab);
          }
        }}
        onRun={handleExecute}
        isRunning={isRunning}
        language={language}
        health={health}
        healthError={healthError}
      />

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex items-center gap-2 px-4 py-2 bg-slate-900 border-b border-slate-800 overflow-x-auto text-xs">
        {([
          { id: 'visualiser', label: 'Visualiser' },
          { id: 'editor', label: 'IDE' },
          { id: 'interop', label: 'Interop' },
          { id: 'performance', label: 'Performance' },
          { id: 'security', label: 'Security & Docs' }
        ] as Array<{ id: WorkspaceTab; label: string }>).map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'visualiser') {
                setAppMode('home');
              } else {
                setActiveTab(tab.id);
              }
            }}
            className={`px-3 py-1 rounded-md whitespace-nowrap ${
              activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <main className="flex-1 p-4 lg:p-5 max-w-[1760px] w-full mx-auto">
        {activeTab === 'editor' && (
          <div className="flex flex-col lg:flex-row gap-4 h-full">
            <ScriptSidebar
              language={language}
              onSelectLanguage={handleLanguageChange}
              scripts={scripts}
              activeScriptId={activeScript?.id || null}
              onSelectScript={handleSelectScript}
              onNewScript={handleNewScript}
              onDeleteScript={handleDeleteScript}
              onRefreshScripts={loadScripts}
              health={health}
              loadingScripts={loadingScripts}
            />

            <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-4 min-w-0">
              <div className="xl:col-span-7 h-[540px] lg:h-[calc(100vh-145px)] flex flex-col">
                <CodeEditor
                  language={language}
                  setLanguage={handleLanguageChange}
                  code={code}
                  setCode={(val) => {
                    setCode(val);
                    if (validationMessage) setValidationMessage(null);
                  }}
                  timeoutMs={timeoutMs}
                  setTimeoutMs={setTimeoutMs}
                  onOpenLibrary={() => {
                    setLibraryTab('history');
                    setIsLibraryOpen(true);
                  }}
                  onSaveScript={() => {
                    setLibraryTab('saveNew');
                    setIsLibraryOpen(true);
                  }}
                  onUpdateActiveScript={handleUpdateActiveScript}
                  activeScriptName={activeScript?.name || null}
                  onResetTemplate={handleResetTemplate}
                  onClearConsole={() => setResponse(null)}
                  validationMessage={validationMessage}
                />
              </div>

              <div className="xl:col-span-5 h-[440px] lg:h-[calc(100vh-145px)] flex flex-col">
                <ConsoleOutput
                  response={response}
                  isRunning={isRunning}
                  onClear={() => setResponse(null)}
                  lastRequestPayload={lastRequestPayload}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'interop' && <InteropPanel />}
        {activeTab === 'performance' && <PerformanceDashboardView />}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <div className="inline-flex items-center p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setSecuritySubTab('tests')}
                className={`px-3.5 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
                  securitySubTab === 'tests'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Automated Security &amp; Contract Tests
              </button>
              <button
                type="button"
                onClick={() => setSecuritySubTab('architecture')}
                className={`px-3.5 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
                  securitySubTab === 'architecture'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Architecture &amp; Docs
              </button>
            </div>
            {securitySubTab === 'tests' ? <SecurityTestsView /> : <ArchitectureView />}
          </div>
        )}
      </main>

      <ScriptLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onLoadScript={handleSelectScript}
        onSavedSuccess={loadScripts}
        currentCode={code}
        currentLanguage={language}
        initialTab={libraryTab}
      />
    </div>
  );
}
