import { useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, SquareTerminal, Code2, Clock3, CircleCheck, CircleX, LoaderCircle, ShieldCheck, History, PanelLeft } from 'lucide-react';

const samples = {
  js: "// Welcome to PolyglotMesh\n// Click Run to execute this JavaScript program.\nconsole.log('Hello from PolyglotMesh!');\n\nconst languages = ['JavaScript', 'Python'];\nconsole.log('Available language profiles:', languages.join(', '));",
  python: "# Python profile preview\n# Enable GraalPy in the backend before execution.\nprint('Hello from PolyglotMesh!')"
};

export default function App() {
  const [language, setLanguage] = useState('js');
  const [code, setCode] = useState(samples.js);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState('output');
  const [history, setHistory] = useState([]);
  const [fileName, setFileName] = useState('untitled.js');
  const editorLanguage = useMemo(() => language === 'python' ? 'python' : 'javascript', [language]);

  function changeLanguage(next) {
    setLanguage(next);
    setCode(samples[next]);
    setFileName(next === 'python' ? 'untitled.py' : 'untitled.js');
    setResult(null);
  }

  async function runCode() {
    setRunning(true); setTab('output'); setResult(null);
    const started = performance.now();
    try {
      const response = await fetch('/api/execute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code })
      });
      const data = await response.json();
      const item = { ...data, language, createdAt: new Date().toLocaleTimeString(), elapsed: Math.round(performance.now() - started) };
      setResult(item); setHistory(old => [item, ...old].slice(0, 20));
    } catch (error) {
      const item = { success: false, output: '', error: 'Could not reach the backend. Confirm that Spring Boot is running on port 8080 and the Vite proxy is configured.', executionTimeMs: Math.round(performance.now() - started), language, createdAt: new Date().toLocaleTimeString() };
      setResult(item); setHistory(old => [item, ...old].slice(0, 20));
    } finally { setRunning(false); }
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Code2 size={20}/></div><div><strong>PolyglotMesh</strong><span>TEAM 6 · MULTI-LANGUAGE PLAYGROUND</span></div></div>
      <div className="top-actions"><span className="runtime-pill"><span className="green-dot"/> API workspace</span><button className="run-button" onClick={runCode} disabled={running}>{running ? <LoaderCircle className="spin" size={16}/> : <Play size={16} fill="currentColor"/>}{running ? 'Running…' : 'Run code'} <kbd>Ctrl ↵</kbd></button></div>
    </header>
    <main className="workspace">
      <aside className="rail"><button title="Workspace" className="rail-active"><PanelLeft size={19}/></button><button title="Execution history" onClick={() => setTab('history')}><History size={19}/></button><div className="rail-bottom"><ShieldCheck size={19}/></div></aside>
      <section className="main-panel">
        <div className="filebar"><div className="file-tab"><span className={language === 'python' ? 'py-dot' : 'js-dot'}>{language === 'python' ? 'Py' : 'JS'}</span>{fileName}<span className="unsaved-dot"/></div><div className="filebar-right"><span>UTF-8</span><span>Spaces: 2</span><span>Ln {code.split('\n').length}, Col 1</span></div></div>
        <div className="editor-toolbar"><div className="language-control"><label htmlFor="language">Language</label><select id="language" value={language} onChange={e => changeLanguage(e.target.value)}><option value="js">JavaScript (GraalJS)</option><option value="python">Python (GraalPy — setup required)</option></select></div><span className="editor-hint">Monaco Editor <span>•</span> IntelliSense-ready</span></div>
        <div className="editor-wrap"><Editor height="100%" language={editorLanguage} theme="vs-dark" value={code} onChange={value => setCode(value ?? '')} options={{fontSize:14, minimap:{enabled:false}, padding:{top:18}, scrollBeyondLastLine:false, automaticLayout:true, tabSize:2, wordWrap:'on', lineNumbers:'on', roundedSelection:false, renderLineHighlight:'all', suggestOnTriggerCharacters:true, glyphMargin:true}} /></div>
        <section className="console-panel"><div className="console-head"><div className="console-tabs"><button className={tab === 'output' ? 'console-tab selected' : 'console-tab'} onClick={() => setTab('output')}><SquareTerminal size={15}/> Output</button><button className={tab === 'history' ? 'console-tab selected' : 'console-tab'} onClick={() => setTab('history')}><History size={15}/> History <span className="count">{history.length}</span></button></div><div className="console-tools"><span className="console-status">{running ? 'Executing' : result ? (result.success ? 'Completed' : 'Failed') : 'Ready'}</span><button className="clear-btn" onClick={() => {setResult(null); setHistory([])}}>Clear</button></div></div>
          <div className="console-body">{tab === 'history' ? history.length ? <div className="history-list">{history.map((item, index) => <button className="history-item" key={index} onClick={() => {setResult(item);setTab('output')}}><span className={item.success ? 'history-icon success' : 'history-icon failed'}>{item.success ? <CircleCheck size={15}/> : <CircleX size={15}/>}</span><span className="history-message"><strong>{item.language.toUpperCase()} execution</strong><small>{item.createdAt} · {item.executionTimeMs ?? item.elapsed} ms</small></span><span className="history-chevron">↗</span></button>)}</div> : <div className="empty-state"><History size={24}/><strong>No executions yet</strong><span>Your recent runs will appear here.</span></div> : result ? <div className="result-view"><div className={result.success ? 'result-label success-text' : 'result-label error-text'}>{result.success ? <CircleCheck size={15}/> : <CircleX size={15}/>} {result.success ? 'Execution successful' : 'Execution failed'}<span><Clock3 size={13}/> {result.executionTimeMs ?? result.elapsed} ms</span></div>{result.output ? <pre className="output-text">{result.output}</pre> : null}{result.error ? <pre className="error-text output-text">{result.error}</pre> : null}{!result.output && !result.error ? <span className="muted">Program finished without output.</span> : null}</div> : <div className="empty-state"><Play size={22}/><strong>Ready when you are</strong><span>Run your code to see output, diagnostics and execution timing.</span><button onClick={runCode} disabled={running} className="inline-run"><Play size={13} fill="currentColor"/> Run current file</button></div>}</div>
        </section>
        <footer className="statusbar"><span><span className="green-dot"/> Ready</span><span>PolyglotMesh · Team 6</span><span>{language === 'python' ? 'Python profile' : 'JavaScript profile'}</span><span>Backend: localhost:8080</span></footer>
      </section>
      <aside className="right-info"><div className="info-card"><div className="info-icon"><ShieldCheck size={18}/></div><h3>Execution sandbox</h3><p>Host access and IO are restricted in the starter runtime. This is not a complete production security boundary.</p><span className="info-link">Review security notes in README</span></div><div className="info-card"><div className="info-icon purple"><Clock3 size={18}/></div><h3>Latest execution</h3>{result ? <><div className="metric"><span>Status</span><strong className={result.success ? 'success-text' : 'error-text'}>{result.success ? 'Success' : 'Failed'}</strong></div><div className="metric"><span>Duration</span><strong>{result.executionTimeMs ?? result.elapsed} ms</strong></div><div className="metric"><span>Language</span><strong>{result.language}</strong></div></> : <p>Run a program to see execution telemetry.</p>}</div><div className="info-card team-card"><h3>Team modules</h3><div className="team-row"><span className="avatar avatar-purple">H</span><div><strong>Hariom Verma</strong><small>GraalVM Core</small></div><span className="team-state">CORE</span></div><div className="team-row"><span className="avatar avatar-blue">N</span><div><strong>Naveen</strong><small>Backend API</small></div><span className="team-state">API</span></div><div className="team-row"><span className="avatar avatar-orange">T</span><div><strong>Trishul</strong><small>Persistence</small></div><span className="team-state">DATA</span></div><div className="team-row"><span className="avatar avatar-green">M</span><div><strong>Madhav Gorla</strong><small>Frontend & integration</small></div><span className="team-state">UI</span></div></div></aside>
    </main>
  </div>;
}
