import React, { useState, useEffect } from 'react';
import { SavedScript, ExecutionHistoryRecord, SupportedLanguage } from '../types';
import {
  X,
  FolderOpen,
  History,
  Trash2,
  Play,
  CheckCircle2,
  XCircle,
  Plus,
  Bookmark
} from 'lucide-react';

interface ScriptLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadScript: (script: SavedScript) => void;
  onSavedSuccess: () => void;
  currentCode: string;
  currentLanguage: SupportedLanguage;
  initialTab?: 'saved' | 'history' | 'saveNew';
}

export const ScriptLibraryModal: React.FC<ScriptLibraryModalProps> = ({
  isOpen,
  onClose,
  onLoadScript,
  onSavedSuccess,
  currentCode,
  currentLanguage,
  initialTab = 'saved'
}) => {
  const [activeTab, setActiveTab] = useState<'saved' | 'history' | 'saveNew'>(initialTab);
  const [scripts, setScripts] = useState<SavedScript[]>([]);
  const [history, setHistory] = useState<ExecutionHistoryRecord[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('Madhav Gorla');
  const [newDesc, setNewDesc] = useState('');
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSaveMessage(null);
      fetchScripts();
      fetchHistory();
    }
  }, [isOpen, initialTab]);

  const fetchScripts = async () => {
    try {
      const res = await fetch('/api/scripts');
      const data = await res.json();
      if (data.scripts) setScripts(data.scripts);
    } catch (e) {
      console.error('Failed to load scripts', e);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history?page=0&size=25');
      const data = await res.json();
      if (data.history) setHistory(data.history);
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage(null);

    if (!newTitle.trim()) {
      setSaveMessage({ type: 'error', text: 'Script name is required.' });
      return;
    }
    if (!currentCode.trim()) {
      setSaveMessage({ type: 'error', text: 'Cannot save empty source code.' });
      return;
    }

    try {
      const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTitle.trim(),
          language: currentLanguage,
          code: currentCode,
          description: newDesc.trim(),
          author: newAuthor.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveMessage({ type: 'success', text: 'Script saved successfully.' });
        setNewTitle('');
        setNewDesc('');
        fetchScripts();
        onSavedSuccess();
        setTimeout(() => {
          setActiveTab('saved');
          setSaveMessage(null);
        }, 900);
      } else {
        setSaveMessage({ type: 'error', text: data.error || 'Failed to save script.' });
      }
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Network error saving script.' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/scripts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setScripts(prev => prev.filter(s => s.id !== id));
        onSavedSuccess();
      }
    } catch (e) {
      console.error('Failed to delete script', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Script Library & Execution History</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'saved' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>Saved Scripts ({scripts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'history' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5 text-purple-400" />
            <span>History ({history.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('saveNew')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ml-auto ${
              activeTab === 'saveNew' ? 'bg-indigo-600 text-white' : 'text-indigo-400 hover:bg-indigo-950/40'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Save New</span>
          </button>
        </div>

        <div className="flex-1 p-5 overflow-y-auto text-xs space-y-3">
          {activeTab === 'saved' && (
            <div className="space-y-2.5">
              {scripts.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No saved scripts found.</div>
              ) : (
                scripts.map(s => (
                  <div
                    key={s.id}
                    className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-lg flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white truncate">{s.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{s.language}</span>
                      </div>
                      {s.description && <p className="text-[11px] text-slate-400 mt-1 truncate">{s.description}</p>}
                      <div className="text-[10px] text-slate-500 mt-1">
                        {s.author} · Updated {new Date(s.updatedAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          onLoadScript(s);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium flex items-center gap-1"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Load</span>
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400"
                        title="Delete script"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-2">
              {history.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No recent execution history.</div>
              ) : (
                history.map(item => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {item.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <div className="truncate">
                        <div className="font-mono text-slate-300 truncate text-[11px]">{item.codeSnippet}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono tabular-nums">
                          <span>{item.language}</span>
                          <span>·</span>
                          <span>{item.executionTimeMs} ms</span>
                          <span>·</span>
                          <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">{item.engine}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'saveNew' && (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Script Name</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  placeholder="e.g. Pricing Tax Calculation"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Author</label>
                <input
                  type="text"
                  maxLength={80}
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  maxLength={300}
                  placeholder="Brief description of what this script does"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-[11px] text-slate-400">
                <span>Language: <strong className="text-slate-200">{currentLanguage}</strong></span> ·{' '}
                <span>Size: <strong className="text-slate-200">{new Blob([currentCode]).size} bytes</strong></span>
              </div>

              {saveMessage && (
                <div className={`p-2.5 rounded text-xs ${
                  saveMessage.type === 'success'
                    ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/60'
                    : 'bg-rose-950/50 text-rose-300 border border-rose-800/60'
                }`}>
                  {saveMessage.text}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Save Script
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
