import React from 'react';
import { SavedScript, SupportedLanguage, HealthStatus } from '../types';
import { FileCode2, Plus, Trash2, Code2, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

interface ScriptSidebarProps {
  language: SupportedLanguage;
  onSelectLanguage: (lang: SupportedLanguage) => void;
  scripts: SavedScript[];
  activeScriptId: string | null;
  onSelectScript: (script: SavedScript) => void;
  onNewScript: () => void;
  onDeleteScript: (id: string) => void;
  onRefreshScripts: () => void;
  health: HealthStatus | null;
  loadingScripts: boolean;
}

export const ScriptSidebar: React.FC<ScriptSidebarProps> = ({
  language,
  onSelectLanguage,
  scripts,
  activeScriptId,
  onSelectScript,
  onNewScript,
  onDeleteScript,
  onRefreshScripts,
  health,
  loadingScripts
}) => {
  const languages: { id: SupportedLanguage; label: string; available: boolean }[] = [
    { id: 'javascript', label: 'JavaScript (GraalJS)', available: health ? health.runtimes.javascript : true },
    { id: 'python', label: 'Python 3 (GraalPy)', available: health ? health.runtimes.python : true },
    { id: 'ruby', label: 'Ruby (TruffleRuby)', available: health ? health.runtimes.ruby : false }
  ];

  return (
    <aside className="w-full lg:w-64 shrink-0 flex flex-col bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
      {/* Language Selection Section */}
      <div className="p-3.5 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 tracking-wide">Target Language</span>
        </div>

        <div className="space-y-1">
          {languages.map((lang) => (
            <button
              key={lang.id}
              onClick={() => onSelectLanguage(lang.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                language === lang.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800/80'
              }`}
            >
              <span className="truncate">{lang.label}</span>
              <span
                className={`text-[10px] font-mono shrink-0 ml-2 ${
                  language === lang.id
                    ? 'text-indigo-100'
                    : lang.available
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {lang.available ? 'Ready' : 'Not Installed'}
              </span>
            </button>
          ))}
        </div>

        {language === 'ruby' && health && !health.runtimes.ruby && (
          <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-900/60 text-[11px] text-amber-200 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>
              TruffleRuby / Ruby is not installed in this container. Executing will return a clear runtime-unavailable message.
            </span>
          </div>
        )}
      </div>

      {/* Saved Scripts Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 tracking-wide">
            Saved Scripts ({scripts.length})
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onRefreshScripts}
              title="Refresh saved scripts"
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingScripts ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onNewScript}
              title="Create blank script"
              className="p-1 text-indigo-400 hover:text-indigo-300 rounded hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[260px] lg:max-h-none">
          {scripts.length === 0 ? (
            <div className="text-center py-8 px-3 text-xs text-slate-500">
              <FileCode2 className="w-6 h-6 mx-auto mb-2 opacity-40" />
              <p>No saved scripts yet.</p>
              <button
                onClick={onNewScript}
                className="mt-2 text-indigo-400 hover:underline font-medium"
              >
                Create first script
              </button>
            </div>
          ) : (
            scripts.map((script) => {
              const isSelected = activeScriptId === script.id;
              return (
                <div
                  key={script.id}
                  className={`group flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 text-white border border-slate-700'
                      : 'text-slate-300 hover:bg-slate-800/50 border border-transparent'
                  }`}
                  onClick={() => onSelectScript(script)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{script.name}</div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-slate-400">{script.language}</span>
                      <span>·</span>
                      <span className="truncate">{script.author || 'Intern'}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteScript(script.id);
                    }}
                    title="Delete script"
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-all shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
};
