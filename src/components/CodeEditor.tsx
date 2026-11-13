import React, { useState, useEffect, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { SupportedLanguage } from '../types';
import { CODE_TEMPLATES } from '../data/templates';
import {
  Sparkles,
  Clock,
  RotateCcw,
  BookmarkPlus,
  FolderOpen,
  FileCode2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  CornerDownRight,
  Trash2,
  Save
} from 'lucide-react';

interface CodeEditorProps {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  code: string;
  setCode: (code: string) => void;
  timeoutMs: number;
  setTimeoutMs: (ms: number) => void;
  onOpenLibrary: () => void;
  onSaveScript: () => void;
  onUpdateActiveScript?: () => void;
  activeScriptName?: string | null;
  onResetTemplate: () => void;
  onClearConsole: () => void;
  validationMessage?: string | null;
}

interface SyntaxErrorDetail {
  line: number;
  column: number;
  message: string;
  text?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  language,
  setLanguage,
  code,
  setCode,
  timeoutMs,
  setTimeoutMs,
  onOpenLibrary,
  onSaveScript,
  onUpdateActiveScript,
  activeScriptName,
  onResetTemplate,
  onClearConsole,
  validationMessage
}) => {
  const [monacoError, setMonacoError] = useState(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  const [syntaxState, setSyntaxState] = useState<{
    isValid: boolean;
    isChecking: boolean;
    errors: SyntaxErrorDetail[];
  }>({
    isValid: true,
    isChecking: false,
    errors: []
  });

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.editor.defineTheme('polyglot-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'keyword', foreground: '818cf8', fontStyle: 'bold' },
        { token: 'string', foreground: '34d399' },
        { token: 'number', foreground: 'fbbf24' }
      ],
      colors: {
        'editor.background': '#090d16',
        'editor.foreground': '#e2e8f0',
        'editorCursor.foreground': '#818cf8',
        'editor.lineHighlightBackground': '#11182766',
        'editorLineNumber.foreground': '#475569',
        'editorLineNumber.activeForeground': '#94a3b8',
        'editorError.foreground': '#f43f5e',
        'editorWarning.foreground': '#fbbf24'
      }
    });
    monaco.editor.setTheme('polyglot-dark');

    validateSyntax(code, language, editor, monaco);
  };

  const validateSyntax = async (
    currentCode: string,
    currentLang: SupportedLanguage,
    editorInstance = editorRef.current,
    monacoInstance = monacoRef.current
  ) => {
    if (!currentCode || currentCode.trim().length === 0) {
      if (editorInstance && monacoInstance) {
        const model = editorInstance.getModel();
        if (model) {
          monacoInstance.editor.setModelMarkers(model, 'polyglot-syntax-checker', []);
        }
      }
      setSyntaxState({ isValid: true, isChecking: false, errors: [] });
      return;
    }

    setSyntaxState(prev => ({ ...prev, isChecking: true }));

    try {
      const res = await fetch('/api/check-syntax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: currentLang, code: currentCode })
      });

      const data = await res.json();
      const model = editorInstance?.getModel();

      if (data.valid) {
        if (editorInstance && monacoInstance && model) {
          monacoInstance.editor.setModelMarkers(model, 'polyglot-syntax-checker', []);
        }
        setSyntaxState({ isValid: true, isChecking: false, errors: [] });
      } else {
        const errors: SyntaxErrorDetail[] = data.errors || [];
        if (editorInstance && monacoInstance && model) {
          const markers = errors.map(err => {
            const line = Math.max(1, err.line || 1);
            const col = Math.max(1, err.column || 1);
            const maxCol = model.getLineMaxColumn(line) || 80;
            return {
              startLineNumber: line,
              startColumn: col,
              endLineNumber: line,
              endColumn: Math.max(col + 3, maxCol),
              message: err.message,
              severity: monacoInstance.MarkerSeverity.Error,
              source:
                currentLang === 'python'
                  ? 'GraalPy Syntax Validator'
                  : currentLang === 'ruby'
                  ? 'TruffleRuby Syntax Validator'
                  : 'GraalJS Syntax Validator'
            };
          });
          monacoInstance.editor.setModelMarkers(model, 'polyglot-syntax-checker', markers);
        }
        setSyntaxState({ isValid: false, isChecking: false, errors });
      }
    } catch {
      setSyntaxState(prev => ({ ...prev, isChecking: false }));
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      validateSyntax(code, language);
    }, 280);
    return () => clearTimeout(timer);
  }, [code, language]);

  const handleTemplateSelect = (templateId: string) => {
    const tmpl = CODE_TEMPLATES.find(t => t.id === templateId);
    if (tmpl) {
      setLanguage(tmpl.language);
      setCode(tmpl.code);
    }
  };

  const handleJumpToError = (line: number, column: number) => {
    if (editorRef.current) {
      editorRef.current.revealLineInCenter(line);
      editorRef.current.setPosition({ lineNumber: line, column: Math.max(1, column) });
      editorRef.current.focus();
    }
  };

  const lineCount = code.split('\n').length;
  const byteCount = new Blob([code]).size;
  const firstError = syntaxState.errors[0];

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
      {/* Editor Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
        {/* Left: Language tabs & Template dropdown */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setLanguage('javascript')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                language === 'javascript' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              JavaScript
            </button>
            <button
              onClick={() => setLanguage('python')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                language === 'python' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Python
            </button>
            <button
              onClick={() => setLanguage('ruby')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                language === 'ruby' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ruby
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <select
              onChange={(e) => handleTemplateSelect(e.target.value)}
              defaultValue=""
              className="bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="" disabled>Load Example...</option>
              {CODE_TEMPLATES.map(t => (
                <option key={t.id} value={t.id}>
                  [{t.language.toUpperCase()}] {t.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Deadline, Save/Update, Library, Reset, Clear */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-2 py-1 rounded-md border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={timeoutMs}
              onChange={(e) => setTimeoutMs(Number(e.target.value))}
              className="bg-transparent text-slate-200 font-mono focus:outline-none cursor-pointer"
              title="Execution Timeout Deadline"
            >
              <option value={1000} className="bg-slate-900">1000 ms</option>
              <option value={2000} className="bg-slate-900">2000 ms</option>
              <option value={3000} className="bg-slate-900">3000 ms</option>
              <option value={5000} className="bg-slate-900">5000 ms</option>
            </select>
          </div>

          {activeScriptName && onUpdateActiveScript && (
            <button
              onClick={onUpdateActiveScript}
              title={`Update "${activeScriptName}"`}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 rounded-md border border-emerald-800/60 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Update</span>
            </button>
          )}

          <button
            onClick={onSaveScript}
            title="Save as new script"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700/60 transition-colors"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Save</span>
          </button>

          <button
            onClick={onOpenLibrary}
            title="Script Library & Execution History"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700/60 transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">History</span>
          </button>

          <button
            onClick={onResetTemplate}
            title="Reset code to language example"
            className="flex items-center gap-1 px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Reset</span>
          </button>

          <button
            onClick={onClearConsole}
            title="Clear console output"
            className="flex items-center gap-1 px-2 py-1 text-slate-300 hover:text-rose-300 hover:bg-slate-800 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Empty/Validation Alert Banner */}
      {validationMessage && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-950/60 border-b border-amber-900/70 text-xs text-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{validationMessage}</span>
        </div>
      )}

      {/* Real-time Syntax Diagnostic Warning Banner */}
      {!syntaxState.isValid && firstError && (
        <div className="flex items-center justify-between px-4 py-2 bg-rose-950/70 border-b border-rose-900/80 text-xs text-rose-200">
          <div className="flex items-center gap-2 overflow-hidden">
            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold text-rose-300">Syntax Error:</span>
            <span className="truncate font-mono text-[11px] text-rose-200">{firstError.message}</span>
            <span className="text-[11px] text-rose-400/80 shrink-0 font-mono">
              (Line {firstError.line}, Col {firstError.column})
            </span>
          </div>

          <button
            onClick={() => handleJumpToError(firstError.line, firstError.column)}
            className="flex items-center gap-1 px-2.5 py-1 bg-rose-900/60 hover:bg-rose-800/80 text-rose-100 rounded text-[11px] font-medium transition-colors shrink-0 border border-rose-700/60"
          >
            <CornerDownRight className="w-3 h-3" />
            <span>Go to Line {firstError.line}</span>
          </button>
        </div>
      )}

      {/* Monaco Editor Body */}
      <div className="relative flex-1 min-h-[380px] lg:min-h-[460px] bg-[#090d16]">
        {monacoError ? (
          <div className="w-full h-full flex flex-col p-3">
            <div className="flex items-center gap-2 mb-2 text-xs text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <span>Monaco Editor unavailable; using standard code editor mode.</span>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full flex-1 bg-slate-950 text-slate-100 font-mono text-sm p-4 rounded border border-slate-800 focus:outline-none focus:border-indigo-500 resize-none"
              spellCheck={false}
            />
          </div>
        ) : (
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={(val) => setCode(val || '')}
            onMount={handleEditorDidMount}
            theme="polyglot-dark"
            loading={
              <div className="flex items-center justify-center h-full text-slate-400 text-xs gap-2">
                <FileCode2 className="w-4 h-4 text-indigo-400" />
                <span>Loading Monaco Editor...</span>
              </div>
            }
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'JetBrains Mono', monospace",
              fontLigatures: true,
              lineNumbers: 'on',
              roundedSelection: true,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: language === 'python' ? 4 : 2,
              wordWrap: 'on',
              padding: { top: 12, bottom: 12 },
              renderLineHighlight: 'all',
              bracketPairColorization: { enabled: true },
              glyphMargin: true
            }}
          />
        )}
      </div>

      {/* Editor Footer Status Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-1.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 gap-2">
        <div className="flex items-center gap-3">
          {activeScriptName && (
            <>
              <span className="text-indigo-300 font-medium truncate max-w-[180px]">{activeScriptName}</span>
              <span className="text-slate-600">·</span>
            </>
          )}
          <div className="flex items-center gap-1.5">
            {syntaxState.isChecking ? (
              <span className="flex items-center gap-1 text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                <span>Checking syntax...</span>
              </span>
            ) : syntaxState.isValid ? (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Syntax Clean</span>
              </span>
            ) : (
              <button
                onClick={() => firstError && handleJumpToError(firstError.line, firstError.column)}
                className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-medium underline decoration-dotted"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>{syntaxState.errors.length} Syntax Error{syntaxState.errors.length > 1 ? 's' : ''}</span>
              </button>
            )}
          </div>
          <span className="text-slate-600">·</span>
          <span>Sandbox: <strong className="text-emerald-400 font-medium">HostAccess.NONE</strong></span>
        </div>

        <div className="flex items-center gap-3 font-mono tabular-nums">
          <span>Lines: {lineCount}</span>
          <span className="text-slate-600">·</span>
          <span>{byteCount} / 65536 bytes</span>
        </div>
      </div>
    </div>
  );
};
