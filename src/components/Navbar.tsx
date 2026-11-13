import React from 'react';
import { Play, Loader2, Terminal, Cpu, Shield, BarChart3, ArrowLeftRight } from 'lucide-react';
import { HealthStatus, SupportedLanguage } from '../types';

export type WorkspaceTab = 'editor' | 'interop' | 'performance' | 'security' | 'architecture';

interface NavbarProps {
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;
  onRun: () => void;
  isRunning: boolean;
  language: SupportedLanguage;
  health: HealthStatus | null;
  healthError: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onRun,
  isRunning,
  language,
  health,
  healthError
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 lg:px-6 py-3 flex items-center justify-between gap-8">
      {/* Zone 1: Brand Title */}
      <a
        href="#top"
        onClick={(e) => { e.preventDefault(); setActiveTab('editor'); }}
        className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
      >
        PolyglotMesh
      </a>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-400">
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex items-center gap-1.5 py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'editor'
              ? 'text-white border-indigo-500'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span>IDE Workspace</span>
        </button>

        <button
          onClick={() => setActiveTab('interop')}
          className={`flex items-center gap-1.5 py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'interop'
              ? 'text-white border-indigo-500'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-sky-400" />
          <span>Data Interop</span>
        </button>

        <button
          onClick={() => setActiveTab('performance')}
          className={`flex items-center gap-1.5 py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'performance'
              ? 'text-white border-indigo-500'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
          <span>Performance</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-1.5 py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'security'
              ? 'text-white border-indigo-500'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Security & Tests</span>
        </button>

        <button
          onClick={() => setActiveTab('architecture')}
          className={`flex items-center gap-1.5 py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'architecture'
              ? 'text-white border-indigo-500'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span>Architecture & Docs</span>
        </button>
      </nav>

      {/* Zone 3: Runtime status + Primary Action */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="hidden xl:flex items-center gap-2 text-[11px] text-slate-400">
          {healthError ? (
            <span className="text-rose-400 font-medium whitespace-nowrap">Backend Offline</span>
          ) : health ? (
            <span className="whitespace-nowrap">
              <span className="text-emerald-400 font-medium">API Connected</span>
              <span className="mx-1.5 text-slate-600">·</span>
              <span className="font-mono text-slate-300">
                JS:{health.runtimes.javascript ? 'OK' : 'N/A'} / Py:{health.runtimes.python ? 'OK' : 'N/A'} / Rb:{health.runtimes.ruby ? 'OK' : 'N/A'}
              </span>
            </span>
          ) : (
            <span className="text-slate-500 whitespace-nowrap">Checking API...</span>
          )}
        </div>

        <button
          onClick={onRun}
          disabled={isRunning}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            isRunning
              ? 'bg-indigo-700 cursor-not-allowed opacity-80'
              : 'bg-indigo-600 hover:bg-indigo-500'
          }`}
        >
          {isRunning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Executing {language}...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Script</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
