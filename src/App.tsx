import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, WorkspaceTab } from './components/Navbar';
import { ScriptSidebar } from './components/ScriptSidebar';
import { CodeEditor } from './components/CodeEditor';
import { ConsoleOutput } from './components/ConsoleOutput';
import { InteropPanel } from './components/InteropPanel';
import { PerformanceDashboardView } from './components/PerformanceDashboardView';
import { SecurityTestsView } from './components/SecurityTestsView';
import { ArchitectureView } from './components/ArchitectureView';
import { ScriptLibraryModal } from './components/ScriptLibraryModal';
import { SupportedLanguage, ExecutionResponse, SavedScript, HealthStatus } from './types';
import { CODE_TEMPLATES } from './data/templates';

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('editor');
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

  // Poll /api/health on startup
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

  // Execute code via POST /api/execute
  const handleExecute = useCallback(async () => {
    if (isRunning) return;

    if (!code || code.trim().length === 0) {
      setValidationMessage('Source code cannot be empty. Enter valid code before running.');
      return;
    }

    setValidationMessage(null);
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleExecute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleExecute]);

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRun={handleExecute}
        isRunning={isRunning}
        language={language}
        health={health}
        healthError={healthError}
      />

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex items-center gap-2 px-4 py-2 bg-slate-900 border-b border-slate-800 overflow-x-auto text-xs">
        {(['editor', 'interop', 'performance', 'security', 'architecture'] as WorkspaceTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded-md capitalize whitespace-nowrap ${
              activeTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <main className="flex-1 p-4 lg:p-5 max-w-[1760px] w-full mx-auto">
        {activeTab === 'editor' && (
          <div className="flex flex-col lg:flex-row gap-4 h-full">
            {/* Left Sidebar: Saved Scripts & Language Selection */}
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

            {/* Main Editor & Console Split */}
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
        {activeTab === 'security' && <SecurityTestsView />}
        {activeTab === 'architecture' && <ArchitectureView />}
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

      <footer className="w-full bg-slate-900/80 border-t border-slate-800/80 px-4 lg:px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <div>
          Infotact Solutions · <strong>PolyglotMesh</strong> · Java 21 + Spring WebFlux + GraalVM Polyglot
        </div>
        <div className="text-[11px] text-slate-500">
          Press Ctrl+Enter to execute
        </div>
      </footer>
    </div>
  );
}
