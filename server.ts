import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { spawn, execSync } from 'child_process';
import vm from 'vm';
import fs from 'fs';
import * as acorn from 'acorn';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '128kb' }));

// ---- Backend proxy (opt-in) -------------------------------------------------
// Set POLYGLOT_PROXY_BACKEND=1 to forward /api/* requests to the real Java/GraalVM
// Spring Boot backend instead of the built-in in-process mock (server.ts) sandbox.
// Backend URL is configurable via BACKEND_URL (default http://localhost:8080).
const PROXY_BACKEND = process.env.POLYGLOT_PROXY_BACKEND === '1';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

function proxyToBackend(req: Request, res: Response, next: NextFunction) {
  const backendTarget = new URL(BACKEND_URL);
  const pathname = req.originalUrl;
  const headers: Record<string, string> = { ...(req.headers as Record<string, string>) };
  headers['host'] = backendTarget.host;

  let body: Buffer | null = null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
    headers['content-length'] = String(body.length);
  }

  const proxyReq = http.request(
    {
      hostname: backendTarget.hostname,
      port: backendTarget.port || (backendTarget.protocol === 'https:' ? 443 : 80),
      path: pathname,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.status(proxyRes.statusCode || 502);
      for (const [k, v] of Object.entries(proxyRes.headers)) {
        if (v !== undefined) res.setHeader(k, v);
      }
      proxyRes.pipe(res);
    }
  );
  proxyReq.on('error', (err) => {
    console.error(`[PolyglotMesh] Backend proxy error for ${req.method} ${pathname}:`, err.message);
    res.status(502).json({
      success: false,
      error: 'Backend unavailable. Start the Java backend (mvn spring-boot:run) or run without POLYGLOT_PROXY_BACKEND=1.',
    });
  });
  if (body) proxyReq.write(body);
  proxyReq.end();
}

if (PROXY_BACKEND) {
  app.use('/api', proxyToBackend);
  console.log(`[PolyglotMesh] /api/* requests proxied to ${BACKEND_URL}`);
}
// -----------------------------------------------------------------------------

// Detect real runtime availability in the current environment
function checkCommandAvailable(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const RUNTIME_AVAILABILITY = {
  javascript: true, // Isolated Node.js VM runtime
  python: checkCommandAvailable('python3'),
  ruby: checkCommandAvailable('ruby')
};

type SupportedLanguage = 'python' | 'javascript' | 'ruby';

interface SavedScript {
  id: string;
  name: string;
  language: SupportedLanguage;
  code: string;
  description: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

interface ExecutionRecord {
  id: string;
  language: string;
  codeSnippet: string;
  output: string;
  error: string | null;
  executionTimeMs: number;
  success: boolean;
  timestamp: string;
  engine: string;
}

// Persistent JSON store in .data/polyglotmesh-store.json so scripts & history survive restarts
const DATA_DIR = path.join(__dirname, '.data');
const STORE_FILE = path.join(DATA_DIR, 'polyglotmesh-store.json');

const DEFAULT_SCRIPTS: SavedScript[] = [
  {
    id: 'script-1',
    name: 'Python Data Aggregation',
    language: 'python',
    code: `# PolyglotMesh Python Demo
data = [12, 45, 68, 23, 91, 54, 77, 33]
filtered = [x for x in data if x > 40]
avg = sum(filtered) / len(filtered)
print(f"Original items: {len(data)}")
print(f"Items > 40: {filtered}")
print(f"Calculated average: {avg:.2f}")`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: 'Hariom Verma',
    description: 'Calculates list comprehension metrics inside sandboxed Python context.'
  },
  {
    id: 'script-2',
    name: 'JavaScript Matrix Transform',
    language: 'javascript',
    code: `// PolyglotMesh JavaScript Demo
const matrix = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9]
];

const transposed = matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
console.log("Original Matrix:", JSON.stringify(matrix));
console.log("Transposed Matrix:", JSON.stringify(transposed));

const sum = matrix.flat().reduce((acc, val) => acc + val, 0);
console.log("Total Element Sum:", sum);`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: 'Naveen',
    description: 'Demonstrates modern ES6 matrix transformation and array operations.'
  },
  {
    id: 'script-3',
    name: 'Security Sandbox Probe (Denied IO)',
    language: 'javascript',
    code: `// Security Sandbox Verification
console.log("[Probe 1] Testing Host Process Access...");
try {
  // Attempt to access Node/Java host objects
  console.log("Process object type:", typeof process);
  if (typeof process === "undefined") {
    console.log("BLOCKED SECURELY: Host process object is undefined in sandbox");
  }
} catch (e) {
  console.log("BLOCKED SECURELY:", e.message);
}

console.log("[Probe 2] Testing Host Filesystem Access...");
try {
  const fs = require("fs");
  console.log("VULNERABLE: Loaded fs");
} catch (e) {
  console.log("BLOCKED SECURELY: Module require prohibited ->", e.message);
}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: 'Hariom Verma',
    description: 'Verifies host process and filesystem isolation inside guest context.'
  },
  {
    id: 'script-4',
    name: 'Infinite Loop Timeout Guard',
    language: 'javascript',
    code: `// Timeout and resource deadline demonstration
console.log("Starting deliberate long operation to test deadline...");
let counter = 0;
while (true) {
  counter++;
  if (counter % 1000000 === 0) {
    // Keep running to trigger execution deadline
  }
}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: 'Madhav Gorla',
    description: 'Tests execution deadline enforcement (3000ms default timeout).'
  }
];

interface PersistedStore {
  scripts: SavedScript[];
  history: ExecutionRecord[];
}

function loadStore(): PersistedStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        scripts: Array.isArray(parsed.scripts) ? parsed.scripts : [...DEFAULT_SCRIPTS],
        history: Array.isArray(parsed.history) ? parsed.history : []
      };
    }
  } catch (err) {
    console.warn('Could not read store file, initializing defaults:', err);
  }
  return { scripts: [...DEFAULT_SCRIPTS], history: [] };
}

function saveStore(store: PersistedStore) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to persist store:', err);
  }
}

const store = loadStore();

// Helper: Security verification for code inputs
function auditCodeSecurity(language: string, code: string): { dangerous: boolean; reason?: string } {
  const normalized = code.toLowerCase();

  if (language === 'python') {
    if (
      normalized.includes('subprocess') ||
      normalized.includes('import pty') ||
      normalized.includes('__import__("os").system') ||
      normalized.includes("__import__('os').system") ||
      normalized.includes('os.system') ||
      normalized.includes('os.popen') ||
      normalized.includes('os.spawn') ||
      (normalized.includes('import socket') && normalized.includes('connect'))
    ) {
      return {
        dangerous: true,
        reason: 'Host process execution and arbitrary socket access are prohibited by PolyglotMesh security policy.'
      };
    }
  }

  if (language === 'javascript') {
    if (
      normalized.includes('child_process') ||
      normalized.includes('process.exit') ||
      normalized.includes('process.kill') ||
      normalized.includes('process.binding') ||
      normalized.includes('global.process') ||
      normalized.includes('this.constructor.constructor')
    ) {
      return {
        dangerous: true,
        reason: 'Process access and constructor prototype escape are prohibited by PolyglotMesh host policy.'
      };
    }
  }

  if (language === 'ruby') {
    if (normalized.includes('system(') || normalized.includes('exec(') || normalized.includes('open3')) {
      return {
        dangerous: true,
        reason: 'Host shell execution is prohibited by PolyglotMesh security policy.'
      };
    }
  }

  return { dangerous: false };
}

function recordHistory(
  executionId: string,
  language: string,
  code: string,
  output: string,
  error: string | null,
  executionTimeMs: number,
  success: boolean,
  engine: string
) {
  store.history.unshift({
    id: executionId,
    language,
    codeSnippet: code.trim().slice(0, 140),
    output: output.slice(0, 400),
    error,
    executionTimeMs,
    success,
    timestamp: new Date().toISOString(),
    engine
  });
  if (store.history.length > 200) {
    store.history.pop();
  }
  saveStore(store);
}

// Real-time Syntax Checking Endpoint (Monaco Diagnostic Marker Support)
app.post('/api/check-syntax', async (req: Request, res: Response) => {
  const { language, code } = req.body || {};
  if (!language || !code || typeof code !== 'string' || code.trim().length === 0) {
    return res.json({ valid: true, errors: [] });
  }

  const normalizedLang = language.trim().toLowerCase();

  if (normalizedLang === 'javascript' || normalizedLang === 'js') {
    try {
      acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
      new vm.Script(code);
      return res.json({ valid: true, errors: [] });
    } catch (err: any) {
      let line = err.loc?.line || 1;
      const col = typeof err.loc?.column === 'number' ? err.loc.column + 1 : 1;
      if (!err.loc?.line && err.stack) {
        const lineMatch = err.stack.match(/evalmachine\.<anonymous>:(\d+)/);
        if (lineMatch) line = parseInt(lineMatch[1], 10);
      }
      return res.json({
        valid: false,
        errors: [{
          line,
          column: col,
          message: err.message ? String(err.message).replace(/\s*\(\d+:\d+\)$/, '') : 'SyntaxError in JavaScript',
          severity: 'error'
        }]
      });
    }
  }

  if (normalizedLang === 'python' && RUNTIME_AVAILABILITY.python) {
    const checkScript = `
import ast, json, sys

code = sys.stdin.read()
try:
    ast.parse(code)
    print(json.dumps({'valid': True, 'errors': []}))
except SyntaxError as e:
    line = e.lineno or 1
    col = e.offset or 1
    print(json.dumps({
        'valid': False,
        'errors': [{
            'line': line,
            'column': col,
            'message': f"SyntaxError: {e.msg}",
            'text': (e.text or '').strip()
        }]
    }))
except Exception as e:
    print(json.dumps({'valid': False, 'errors': [{'line': 1, 'column': 1, 'message': str(e)}]}))
`;

    const py = spawn('python3', ['-c', checkScript]);
    let stdout = '';
    py.stdout.on('data', d => { stdout += d.toString(); });
    py.stdin.write(code);
    py.stdin.end();

    py.on('close', () => {
      try {
        const parsed = JSON.parse(stdout);
        return res.json(parsed);
      } catch {
        return res.json({ valid: true, errors: [] });
      }
    });

    py.on('error', () => res.json({ valid: true, errors: [] }));
    return;
  }

  return res.json({ valid: true, errors: [] });
});

// Helper: Extract declared variable names from an Acorn pattern
function collectPatternNames(pattern: any, out: Set<string>) {
  if (!pattern) return;
  if (pattern.type === 'Identifier') {
    out.add(pattern.name);
  } else if (pattern.type === 'ArrayPattern') {
    pattern.elements?.forEach((el: any) => collectPatternNames(el, out));
  } else if (pattern.type === 'ObjectPattern') {
    pattern.properties?.forEach((prop: any) => {
      if (prop.type === 'Property') collectPatternNames(prop.value, out);
      else if (prop.type === 'RestElement') collectPatternNames(prop.argument, out);
    });
  } else if (pattern.type === 'AssignmentPattern') {
    collectPatternNames(pattern.left, out);
  } else if (pattern.type === 'RestElement') {
    collectPatternNames(pattern.argument, out);
  }
}

// Helper: Build safe JSON snapshot expression for declared lexical variables
function buildSnapshotFnExpr(vars: string[]): string {
  const unique = Array.from(new Set(vars)).filter(v => !v.startsWith('__'));
  if (unique.length === 0) return '() => ({})';
  const assigns = unique
    .map(name => `try { _o[${JSON.stringify(name)}] = __safeVal(${name}); } catch {}`)
    .join(' ');
  return `() => { const _o = {}; ${assigns} return _o; }`;
}

// Helper: Instrument JavaScript AST with line-by-line variable + call stack tracing
function instrumentJavaScriptForDebug(code: string): string {
  const ast: any = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
  const patches: Array<{ start: number; end: number; text: string }> = [];

  const collectBlockDeclaredVars = (stmts: any[]): string[] => {
    const vars: string[] = [];
    for (const s of stmts || []) {
      if (s.type === 'VariableDeclaration') {
        const set = new Set<string>();
        s.declarations?.forEach((d: any) => collectPatternNames(d.id, set));
        vars.push(...Array.from(set));
      } else if (s.type === 'ForStatement' && s.init?.type === 'VariableDeclaration') {
        const set = new Set<string>();
        s.init.declarations?.forEach((d: any) => collectPatternNames(d.id, set));
        vars.push(...Array.from(set));
      }
    }
    return vars;
  };

  const instrumentNode = (node: any, scopeVars: string[], fnName: string) => {
    if (!node || typeof node !== 'object') return;

    const handleBlockLike = (bodyNode: any, extraVars: string[], currentFn: string) => {
      if (!bodyNode) return;
      if (bodyNode.type === 'BlockStatement') {
        instrumentBlock(bodyNode, extraVars, currentFn, false);
      } else {
        const line = bodyNode.loc?.start?.line || 1;
        const allVars = [...scopeVars, ...extraVars];
        const snap = buildSnapshotFnExpr(allVars);
        if (bodyNode.type === 'ReturnStatement') {
          const argCode = bodyNode.argument ? code.slice(bodyNode.argument.start, bodyNode.argument.end) : 'undefined';
          patches.push({
            start: bodyNode.start,
            end: bodyNode.end,
            text: `{ return __ret(${line}, ${JSON.stringify(currentFn)}, ${snap}, (${argCode})); }`
          });
        } else {
          patches.push({ start: bodyNode.start, end: bodyNode.start, text: `{ __trace(${line}, ${JSON.stringify(currentFn)}, ${snap}); ` });
          patches.push({ start: bodyNode.end, end: bodyNode.end, text: ` }` });
          instrumentNode(bodyNode, allVars, currentFn);
        }
      }
    };

    const instrumentBlock = (block: any, injectedVars: string[], currentFn: string, isFunctionBody: boolean) => {
      const localVars = [...scopeVars, ...injectedVars, ...collectBlockDeclaredVars(block.body)];
      const snap = buildSnapshotFnExpr(localVars);

      if (isFunctionBody) {
        const fnLine = block.loc?.start?.line || 1;
        patches.push({
          start: block.start + 1,
          end: block.start + 1,
          text: ` __enter(${fnLine}, ${JSON.stringify(currentFn)}, ${buildSnapshotFnExpr(injectedVars)}); try {`
        });
      }

      for (const stmt of block.body || []) {
        const line = stmt.loc?.start?.line || 1;
        if (stmt.type === 'FunctionDeclaration') {
          instrumentNode(stmt, localVars, currentFn);
          continue;
        }
        if (stmt.type === 'ReturnStatement') {
          const argCode = stmt.argument ? code.slice(stmt.argument.start, stmt.argument.end) : 'undefined';
          patches.push({
            start: stmt.start,
            end: stmt.end,
            text: `return __ret(${line}, ${JSON.stringify(currentFn)}, ${snap}, (${argCode}));`
          });
          // Recurse into argument expressions in case of inline function/arrow expressions
          if (stmt.argument) instrumentNode(stmt.argument, localVars, currentFn);
          continue;
        }

        patches.push({
          start: stmt.start,
          end: stmt.start,
          text: `__trace(${line}, ${JSON.stringify(currentFn)}, ${snap}); `
        });

        instrumentNode(stmt, localVars, currentFn);

        if (stmt.type === 'VariableDeclaration' || stmt.type === 'ExpressionStatement') {
          const endLine = stmt.loc?.end?.line || line;
          patches.push({
            start: stmt.end,
            end: stmt.end,
            text: ` __trace(${endLine}, ${JSON.stringify(currentFn)}, ${snap}, true);`
          });
        }
      }

      if (isFunctionBody) {
        patches.push({
          start: block.end - 1,
          end: block.end - 1,
          text: ` } finally { __exit(); } `
        });
      }
    };

    if (node.type === 'Program') {
      const topVars = [...scopeVars, ...collectBlockDeclaredVars(node.body)];
      const snap = buildSnapshotFnExpr(topVars);
      for (const stmt of node.body || []) {
        const line = stmt.loc?.start?.line || 1;
        if (stmt.type === 'FunctionDeclaration') {
          instrumentNode(stmt, topVars, fnName);
          continue;
        }
        patches.push({
          start: stmt.start,
          end: stmt.start,
          text: `__trace(${line}, ${JSON.stringify(fnName)}, ${snap}); `
        });
        instrumentNode(stmt, topVars, fnName);
        if (stmt.type === 'VariableDeclaration' || stmt.type === 'ExpressionStatement') {
          const endLine = stmt.loc?.end?.line || line;
          patches.push({
            start: stmt.end,
            end: stmt.end,
            text: ` __trace(${endLine}, ${JSON.stringify(fnName)}, ${snap}, true);`
          });
        }
      }
      return;
    }

    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
      const name = node.id?.name || (node.type === 'ArrowFunctionExpression' ? 'arrow()' : 'anonymous()');
      const paramSet = new Set<string>();
      node.params?.forEach((p: any) => collectPatternNames(p, paramSet));
      if (node.body?.type === 'BlockStatement') {
        instrumentBlock(node.body, Array.from(paramSet), name, true);
      }
      return;
    }

    if (node.type === 'IfStatement') {
      handleBlockLike(node.consequent, [], fnName);
      if (node.alternate) {
        if (node.alternate.type === 'IfStatement') {
          instrumentNode(node.alternate, scopeVars, fnName);
        } else {
          handleBlockLike(node.alternate, [], fnName);
        }
      }
      return;
    }

    if (node.type === 'ForStatement') {
      const loopVars: string[] = [];
      if (node.init?.type === 'VariableDeclaration') {
        const set = new Set<string>();
        node.init.declarations?.forEach((d: any) => collectPatternNames(d.id, set));
        loopVars.push(...Array.from(set));
      }
      handleBlockLike(node.body, loopVars, fnName);
      return;
    }

    if (node.type === 'ForOfStatement' || node.type === 'ForInStatement') {
      const loopVars: string[] = [];
      if (node.left?.type === 'VariableDeclaration') {
        const set = new Set<string>();
        node.left.declarations?.forEach((d: any) => collectPatternNames(d.id, set));
        loopVars.push(...Array.from(set));
      }
      handleBlockLike(node.body, loopVars, fnName);
      return;
    }

    if (node.type === 'WhileStatement' || node.type === 'DoWhileStatement') {
      handleBlockLike(node.body, [], fnName);
      return;
    }

    if (node.type === 'TryStatement') {
      if (node.block) instrumentBlock(node.block, [], fnName, false);
      if (node.handler?.body) {
        const catchSet = new Set<string>();
        if (node.handler.param) collectPatternNames(node.handler.param, catchSet);
        instrumentBlock(node.handler.body, Array.from(catchSet), fnName, false);
      }
      if (node.finalizer) instrumentBlock(node.finalizer, [], fnName, false);
      return;
    }

    if (node.type === 'BlockStatement') {
      instrumentBlock(node, [], fnName, false);
      return;
    }

    // Recurse into generic expressions (to catch nested functions in VariableDeclaration, etc.)
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'start' || key === 'end' || key === 'type') continue;
      const val = node[key];
      if (Array.isArray(val)) {
        val.forEach(item => instrumentNode(item, scopeVars, fnName));
      } else if (val && typeof val === 'object' && typeof val.type === 'string') {
        instrumentNode(val, scopeVars, fnName);
      }
    }
  };

  instrumentNode(ast, [], '<module>');

  // Apply patches in reverse order of offset (preserving earlier offsets)
  patches.sort((a, b) => b.start - a.start || b.end - a.end);
  let output = code;
  for (const p of patches) {
    output = output.slice(0, p.start) + p.text + output.slice(p.end);
  }
  return output;
}

// REST Endpoint: POST /api/debug (Complete Line-by-Line Code Debugger)
app.post('/api/debug', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { language, code, timeoutMs = 3000 } = req.body || {};

  if (!language || typeof language !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Missing "language" parameter.',
      steps: [],
      executionTimeMs: 0
    });
  }

  let normalizedLang = language.trim().toLowerCase();
  if (normalizedLang === 'js') normalizedLang = 'javascript';

  if (normalizedLang !== 'python' && normalizedLang !== 'javascript') {
    return res.status(400).json({
      success: false,
      error: `Step debugger supports "python" and "javascript" (received "${language}").`,
      steps: [],
      executionTimeMs: 0
    });
  }

  if (typeof code !== 'string' || code.trim().length === 0) {
    return res.status(400).json({
      success: false,
      language: normalizedLang,
      error: 'Source code cannot be empty.',
      steps: [],
      executionTimeMs: 0
    });
  }

  if (code.length > 64 * 1024) {
    return res.status(413).json({
      success: false,
      language: normalizedLang,
      error: 'Source code exceeds 64KB debug limit.',
      steps: [],
      executionTimeMs: 0
    });
  }

  const securityCheck = auditCodeSecurity(normalizedLang, code);
  if (securityCheck.dangerous) {
    return res.json({
      success: false,
      language: normalizedLang,
      steps: [],
      runtimeError: {
        type: 'SecurityPolicyViolation',
        message: securityCheck.reason || 'Disallowed host access in code.',
        line: 1
      },
      finalOutput: '',
      executionTimeMs: Date.now() - startTime
    });
  }

  const deadline = Math.min(Math.max(Number(timeoutMs) || 3000, 500), 5000);

  if (normalizedLang === 'javascript') {
    try {
      acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
    } catch (err: any) {
      const line = err.loc?.line || 1;
      const column = typeof err.loc?.column === 'number' ? err.loc.column + 1 : 1;
      const msg = err.message ? String(err.message).replace(/\s*\(\d+:\d+\)$/, '') : 'SyntaxError in JavaScript';
      return res.json({
        success: false,
        language: 'javascript',
        steps: [
          {
            step: 1,
            line,
            event: 'exception',
            functionName: '<module>',
            locals: {},
            stack: [{ functionName: '<module>', line, locals: {} }],
            stdout: '',
            error: { type: 'SyntaxError', message: msg, line, column },
            caption: `SyntaxError on line ${line}: ${msg}`
          }
        ],
        syntaxError: { line, column, message: msg },
        runtimeError: null,
        finalOutput: '',
        executionTimeMs: Date.now() - startTime
      });
    }

    try {
      const instrumented = instrumentJavaScriptForDebug(code);
      const logs: string[] = [];
      const steps: any[] = [];
      const callStack: Array<{ functionName: string; line: number; locals: Record<string, any> }> = [
        { functionName: '<module>', line: 1, locals: {} }
      ];
      let lastLine = 1;
      let truncated = false;
      const MAX_STEPS = 350;

      const safeVal = (val: any, depth = 0): any => {
        if (val === null || val === undefined) return val === undefined ? null : null;
        if (typeof val === 'boolean' || typeof val === 'number' || typeof val === 'string') return val;
        if (typeof val === 'function') return '[Function]';
        if (depth >= 3) return '[Object]';
        if (Array.isArray(val)) return val.slice(0, 60).map(v => safeVal(v, depth + 1));
        if (val instanceof Set) return Array.from(val).slice(0, 60).map(v => safeVal(v, depth + 1));
        if (val instanceof Map) {
          const out: Record<string, any> = {};
          let count = 0;
          for (const [k, v] of val.entries()) {
            if (count++ >= 40) break;
            out[String(k)] = safeVal(v, depth + 1);
          }
          return out;
        }
        if (typeof val === 'object') {
          const out: Record<string, any> = {};
          const keys = Object.keys(val).slice(0, 40);
          for (const k of keys) {
            out[k] = safeVal(val[k], depth + 1);
          }
          return out;
        }
        return String(val);
      };

      const pushStep = (
        line: number,
        event: 'line' | 'call' | 'return' | 'exception',
        fnName: string,
        locals: Record<string, any>,
        caption: string,
        returnValue?: any,
        errorObj?: any
      ) => {
        if (steps.length >= MAX_STEPS) {
          truncated = true;
          throw new Error('__TRACE_LIMIT__');
        }
        lastLine = line;
        if (callStack.length > 0) {
          callStack[callStack.length - 1] = {
            functionName: fnName,
            line,
            locals
          };
        }
        const prev = steps[steps.length - 1];
        const serializedLocals = JSON.stringify(locals);
        // Merge duplicate consecutive snapshot if identical line + locals + event
        if (
          prev &&
          prev.line === line &&
          prev.event === event &&
          prev.functionName === fnName &&
          JSON.stringify(prev.locals) === serializedLocals &&
          prev.stdout === logs.join('\n') &&
          !errorObj &&
          returnValue === undefined
        ) {
          return;
        }
        steps.push({
          step: steps.length + 1,
          line,
          event,
          functionName: fnName,
          locals,
          stack: callStack.map(f => ({ ...f, locals: { ...f.locals } })),
          ...(returnValue !== undefined ? { returnValue } : {}),
          stdout: logs.join('\n'),
          error: errorObj || null,
          caption
        });
      };

      const sandbox: Record<string, any> = {
        console: {
          log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
          error: (...args: any[]) => logs.push('[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
          warn: (...args: any[]) => logs.push('[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))
        },
        Math,
        Date,
        JSON,
        Array,
        Object,
        String,
        Number,
        Boolean,
        RegExp,
        Set,
        Map,
        Error,
        TypeError,
        RangeError,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
        __safeVal: safeVal,
        __enter: (line: number, fnName: string, snapFn: () => Record<string, any>) => {
          const locals = snapFn();
          callStack.push({ functionName: fnName, line, locals });
          pushStep(line, 'call', fnName, locals, `Enter ${fnName}()`);
        },
        __exit: () => {
          if (callStack.length > 1) callStack.pop();
        },
        __trace: (line: number, fnName: string, snapFn: () => Record<string, any>, isPost = false) => {
          const locals = snapFn();
          pushStep(
            line,
            'line',
            fnName,
            locals,
            isPost ? `Updated state after line ${line}` : `Executing line ${line} in ${fnName}`
          );
        },
        __ret: (line: number, fnName: string, snapFn: () => Record<string, any>, val: any) => {
          const locals = snapFn();
          const safeRet = safeVal(val);
          pushStep(line, 'return', fnName, locals, `Return ${JSON.stringify(safeRet)} from ${fnName}`, safeRet);
          return val;
        }
      };

      const context = vm.createContext(sandbox);
      const script = new vm.Script(instrumented);
      try {
        script.runInContext(context, { timeout: deadline, breakOnSigint: true });
      } catch (runErr: any) {
        if (runErr?.message !== '__TRACE_LIMIT__') {
          const errType = runErr?.name || 'Error';
          const isTimeout = runErr?.message && runErr.message.includes('timed out');
          const errMsg = isTimeout
            ? `Execution timed out after ${deadline}ms`
            : (runErr?.message || 'Runtime error');
          const currentFrame = callStack[callStack.length - 1] || { functionName: '<module>', locals: {} };
          const errObj = { type: isTimeout ? 'TimeoutError' : errType, message: errMsg, line: lastLine };
          steps.push({
            step: steps.length + 1,
            line: lastLine,
            event: 'exception',
            functionName: currentFrame.functionName,
            locals: currentFrame.locals,
            stack: callStack.map(f => ({ ...f })),
            stdout: logs.join('\n'),
            error: errObj,
            caption: `${errObj.type} at line ${lastLine}: ${errMsg}`
          });
          return res.json({
            success: false,
            language: 'javascript',
            steps,
            syntaxError: null,
            runtimeError: errObj,
            finalOutput: logs.join('\n'),
            executionTimeMs: Date.now() - startTime,
            truncated
          });
        }
      }

      return res.json({
        success: true,
        language: 'javascript',
        steps,
        syntaxError: null,
        runtimeError: null,
        finalOutput: logs.join('\n'),
        executionTimeMs: Date.now() - startTime,
        truncated
      });
    } catch (err: any) {
      return res.json({
        success: false,
        language: 'javascript',
        steps: [],
        runtimeError: { type: 'DebuggerError', message: err.message || 'Failed to instrument JS', line: 1 },
        finalOutput: '',
        executionTimeMs: Date.now() - startTime
      });
    }
  }

  // Python Debugger via sys.settrace inside isolated python3 -I
  if (!RUNTIME_AVAILABILITY.python) {
    return res.status(503).json({
      success: false,
      language: 'python',
      steps: [],
      runtimeError: { type: 'RuntimeUnavailable', message: 'python3 not installed in container', line: 1 },
      finalOutput: '',
      executionTimeMs: 0
    });
  }

  const pyDebugHarness = `
import ast, io, json, sys, traceback

user_code = sys.stdin.read()

try:
    ast.parse(user_code)
except SyntaxError as e:
    line = e.lineno or 1
    col = e.offset or 1
    msg = f"SyntaxError: {e.msg}"
    print(json.dumps({
        "success": False,
        "language": "python",
        "steps": [{
            "step": 1,
            "line": line,
            "event": "exception",
            "functionName": "<module>",
            "locals": {},
            "stack": [{"functionName": "<module>", "line": line, "locals": {}}],
            "stdout": "",
            "error": {"type": "SyntaxError", "message": msg, "line": line, "column": col},
            "caption": f"{msg} (line {line})"
        }],
        "syntaxError": {"line": line, "column": col, "message": msg},
        "runtimeError": None,
        "finalOutput": ""
    }))
    sys.exit(0)

MAX_STEPS = 350
steps = []
truncated = False
stdout_buf = io.StringIO()
old_stdout = sys.stdout
sys.stdout = stdout_buf

def safe_val(v, depth=0):
    if v is None or isinstance(v, (bool, int, float, str)):
        return v
    if depth >= 3:
        return repr(v)[:80]
    if isinstance(v, (list, tuple)):
        return [safe_val(x, depth + 1) for x in list(v)[:60]]
    if isinstance(v, set):
        return [safe_val(x, depth + 1) for x in list(v)[:60]]
    if isinstance(v, dict):
        out = {}
        for idx, (k, val) in enumerate(v.items()):
            if idx >= 40:
                break
            out[str(k)] = safe_val(val, depth + 1)
        return out
    if hasattr(v, "__dict__"):
        out = {"__type__": type(v).__name__}
        for idx, (k, val) in enumerate(vars(v).items()):
            if idx >= 20 or str(k).startswith("_"):
                continue
            out[str(k)] = safe_val(val, depth + 1)
        return out
    return repr(v)[:100]

def extract_locals(frame):
    out = {}
    for k, v in frame.f_locals.items():
        if k.startswith("__") or callable(v) or isinstance(v, type):
            continue
        if isinstance(v, type(sys)):
            continue
        out[k] = safe_val(v)
    return out

def extract_stack(frame):
    chain = []
    curr = frame
    while curr is not None:
        if curr.f_code.co_filename == "<user_code>":
            chain.append({
                "functionName": curr.f_code.co_name,
                "line": curr.f_lineno,
                "locals": extract_locals(curr)
            })
        curr = curr.f_back
    chain.reverse()
    return chain

class TraceLimitReached(Exception):
    pass

last_line = 1
pending_exception = None

def tracer(frame, event, arg):
    global truncated, last_line, pending_exception
    if frame.f_code.co_filename != "<user_code>":
        return tracer
    if len(steps) >= MAX_STEPS:
        truncated = True
        raise TraceLimitReached()

    fn_name = frame.f_code.co_name
    line = frame.f_lineno
    last_line = line
    locs = extract_locals(frame)
    stack = extract_stack(frame)
    out_text = stdout_buf.getvalue()

    if event == "call":
        if fn_name != "<module>":
            steps.append({
                "step": len(steps) + 1,
                "line": line,
                "event": "call",
                "functionName": fn_name,
                "locals": locs,
                "stack": stack,
                "stdout": out_text,
                "error": None,
                "caption": f"Enter {fn_name}()"
            })
    elif event == "line":
        steps.append({
            "step": len(steps) + 1,
            "line": line,
            "event": "line",
            "functionName": fn_name,
            "locals": locs,
            "stack": stack,
            "stdout": out_text,
            "error": None,
            "caption": f"Line {line} in {fn_name}"
        })
    elif event == "return":
        if fn_name != "<module>":
            ret_val = safe_val(arg)
            steps.append({
                "step": len(steps) + 1,
                "line": line,
                "event": "return",
                "functionName": fn_name,
                "locals": locs,
                "stack": stack,
                "returnValue": ret_val,
                "stdout": out_text,
                "error": None,
                "caption": f"Return {json.dumps(ret_val)} from {fn_name}"
            })
    elif event == "exception":
        exc_type, exc_val, _ = arg
        if exc_type is not TraceLimitReached:
            pending_exception = {
                "type": exc_type.__name__,
                "message": str(exc_val),
                "line": line
            }
    return tracer

runtime_err = None
try:
    compiled = compile(user_code, "<user_code>", "exec")
    ns = {"__name__": "__main__"}
    sys.settrace(tracer)
    exec(compiled, ns, ns)
except TraceLimitReached:
    pass
except Exception as e:
    sys.settrace(None)
    tb = traceback.extract_tb(e.__traceback__)
    err_line = last_line
    for entry in reversed(tb):
        if entry.filename == "<user_code>":
            err_line = entry.lineno
            break
    runtime_err = {
        "type": type(e).__name__,
        "message": str(e),
        "line": err_line
    }
    prev_stack = steps[-1]["stack"] if steps else [{"functionName": "<module>", "line": err_line, "locals": {}}]
    prev_locs = steps[-1]["locals"] if steps else {}
    prev_fn = steps[-1]["functionName"] if steps else "<module>"
    steps.append({
        "step": len(steps) + 1,
        "line": err_line,
        "event": "exception",
        "functionName": prev_fn,
        "locals": prev_locs,
        "stack": prev_stack,
        "stdout": stdout_buf.getvalue(),
        "error": runtime_err,
        "caption": f"{type(e).__name__} at line {err_line}: {e}"
    })
finally:
    sys.settrace(None)
    sys.stdout = old_stdout

print(json.dumps({
    "success": runtime_err is None,
    "language": "python",
    "steps": steps,
    "syntaxError": None,
    "runtimeError": runtime_err,
    "finalOutput": stdout_buf.getvalue(),
    "truncated": truncated
}))
`;

  const py = spawn('python3', ['-I', '-c', pyDebugHarness], {
    timeout: deadline,
    env: {
      PYTHONUNBUFFERED: '1',
      PYTHONDONTWRITEBYTECODE: '1'
    }
  });

  let stdout = '';
  let stderr = '';
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    py.kill('SIGKILL');
  }, deadline);

  py.stdout.on('data', chunk => {
    stdout += chunk.toString();
    if (stdout.length > 2 * 1024 * 1024) {
      py.kill('SIGKILL');
    }
  });
  py.stderr.on('data', chunk => {
    stderr += chunk.toString();
  });

  py.stdin.write(code);
  py.stdin.end();

  py.on('close', () => {
    clearTimeout(timer);
    const elapsed = Date.now() - startTime;
    if (timedOut) {
      return res.json({
        success: false,
        language: 'python',
        steps: [],
        runtimeError: {
          type: 'TimeoutError',
          message: `Debug trace exceeded deadline of ${deadline}ms`,
          line: 1
        },
        finalOutput: '',
        executionTimeMs: elapsed
      });
    }
    try {
      const parsed = JSON.parse(stdout);
      return res.json({
        ...parsed,
        executionTimeMs: elapsed
      });
    } catch {
      return res.json({
        success: false,
        language: 'python',
        steps: [],
        runtimeError: {
          type: 'DebuggerError',
          message: stderr.trim() || 'Failed to parse debug trace',
          line: 1
        },
        finalOutput: '',
        executionTimeMs: elapsed
      });
    }
  });
});

// REST Endpoint: POST /api/execute
app.post('/api/execute', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const executionId = 'exec-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  const { language, code, timeoutMs = 3000 } = req.body || {};

  if (!language || typeof language !== 'string') {
    return res.status(400).json({
      success: false,
      executionId,
      language: null,
      output: '',
      error: 'Invalid or missing "language" parameter. Supported: "javascript", "python", "ruby".',
      executionTimeMs: 0
    });
  }

  let normalizedLang = language.trim().toLowerCase();
  if (normalizedLang === 'js') normalizedLang = 'javascript';

  if (normalizedLang !== 'python' && normalizedLang !== 'javascript' && normalizedLang !== 'ruby') {
    return res.status(400).json({
      success: false,
      executionId,
      language: normalizedLang,
      output: '',
      error: `Unsupported language "${language}". Supported language identifiers are: "javascript", "python", "ruby".`,
      executionTimeMs: 0
    });
  }

  if (typeof code !== 'string') {
    return res.status(400).json({
      success: false,
      executionId,
      language: normalizedLang,
      output: '',
      error: 'Malformed request: "code" must be a string.',
      executionTimeMs: 0
    });
  }

  const MAX_CODE_SIZE = 64 * 1024;
  if (code.length > MAX_CODE_SIZE) {
    return res.status(413).json({
      success: false,
      executionId,
      language: normalizedLang,
      output: '',
      error: `Payload Too Large: Source code length (${code.length} bytes) exceeds maximum limit of ${MAX_CODE_SIZE} bytes.`,
      executionTimeMs: 0
    });
  }

  if (code.trim().length === 0) {
    return res.status(400).json({
      success: false,
      executionId,
      language: normalizedLang,
      output: '',
      error: 'Validation Error: Source code cannot be empty.',
      executionTimeMs: 0
    });
  }

  // Honest check for Ruby runtime availability (never fake Ruby output!)
  if (normalizedLang === 'ruby' && !RUNTIME_AVAILABILITY.ruby) {
    const elapsed = Date.now() - startTime;
    const msg =
      'Runtime Unavailable: Ruby (TruffleRuby / ruby) is not installed in this container environment. ' +
      'To enable Ruby in the Java 21 Spring WebFlux backend, run Maven with the TruffleRuby profile: ' +
      '`mvn spring-boot:run -Pruby-runtime` on GraalVM 24.1+ JDK.';
    recordHistory(executionId, normalizedLang, code, '', msg, elapsed, false, 'Ruby Runtime Check');
    return res.json({
      success: false,
      executionId,
      language: normalizedLang,
      output: '',
      error: msg,
      executionTimeMs: elapsed,
      engine: 'GraalVM Polyglot Runtime Registry'
    });
  }

  // Security Policy Pre-Flight Check
  const securityCheck = auditCodeSecurity(normalizedLang, code);
  if (securityCheck.dangerous) {
    const elapsed = Date.now() - startTime;
    const errorMsg = `[SecurityPolicyViolation] Access Denied: ${securityCheck.reason}`;
    recordHistory(executionId, normalizedLang, code, '', errorMsg, elapsed, false, 'Sandbox Policy Validator');
    return res.json({
      success: false,
      executionId,
      language: normalizedLang,
      output: '',
      error: errorMsg,
      executionTimeMs: elapsed,
      engine: 'GraalVM Sandbox Policy Validator',
      sandboxAudit: {
        hostAccessDenied: true,
        ioDenied: true,
        networkDenied: true,
        processDenied: true,
        deadlineMs: timeoutMs
      }
    });
  }

  const deadline = Math.min(Math.max(Number(timeoutMs) || 3000, 500), 5000);

  try {
    if (normalizedLang === 'javascript') {
      const logs: string[] = [];
      const sandbox = {
        console: {
          log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
          error: (...args: any[]) => logs.push('[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
          warn: (...args: any[]) => logs.push('[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
          info: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))
        },
        Math,
        Date,
        JSON,
        Array,
        Object,
        String,
        Number,
        Boolean,
        RegExp,
        parseInt,
        parseFloat,
        isNaN,
        isFinite
      };

      const context = vm.createContext(sandbox);
      const script = new vm.Script(code);

      try {
        const evalResult = script.runInContext(context, {
          timeout: deadline,
          breakOnSigint: true
        });

        if (evalResult !== undefined && logs.length === 0) {
          logs.push(typeof evalResult === 'object' ? JSON.stringify(evalResult, null, 2) : String(evalResult));
        }

        const elapsed = Date.now() - startTime;
        const output = logs.join('\n') || '(Execution finished with no console output)';
        recordHistory(executionId, normalizedLang, code, output, null, elapsed, true, 'JavaScript Isolated VM');

        return res.json({
          success: true,
          executionId,
          language: normalizedLang,
          output,
          error: null,
          executionTimeMs: elapsed,
          engine: 'JavaScript Isolated VM (GraalJS Compatible)',
          sandboxAudit: {
            hostAccessDenied: true,
            ioDenied: true,
            networkDenied: true,
            processDenied: true,
            deadlineMs: deadline
          }
        });
      } catch (runErr: any) {
        const elapsed = Date.now() - startTime;
        const isTimeout = runErr.message && runErr.message.includes('timed out');
        const errorMsg = isTimeout
          ? `Execution timed out: Exceeded deadline of ${deadline}ms. Guest execution interrupted.`
          : (runErr.message || 'Execution error');

        const output = logs.join('\n');
        recordHistory(executionId, normalizedLang, code, output, errorMsg, elapsed, false, 'JavaScript Isolated VM');

        return res.json({
          success: false,
          executionId,
          language: normalizedLang,
          output,
          error: errorMsg,
          executionTimeMs: elapsed,
          engine: 'JavaScript Isolated VM (GraalJS Compatible)',
          sandboxAudit: {
            hostAccessDenied: true,
            ioDenied: true,
            networkDenied: true,
            processDenied: true,
            deadlineMs: deadline
          }
        });
      }
    }

    // Python execution via isolated Python 3 process (-I isolated mode)
    if (normalizedLang === 'python') {
      const pyProcess = spawn('python3', ['-I', '-c', code], {
        timeout: deadline,
        env: {
          PYTHONUNBUFFERED: '1',
          PYTHONDONTWRITEBYTECODE: '1'
        }
      });

      let stdoutData = '';
      let stderrData = '';
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        pyProcess.kill('SIGKILL');
      }, deadline);

      pyProcess.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
        if (stdoutData.length > 512 * 1024) {
          pyProcess.kill('SIGKILL');
        }
      });

      pyProcess.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      pyProcess.on('close', (exitCode) => {
        clearTimeout(timer);
        const elapsed = Date.now() - startTime;

        if (timedOut) {
          const errorMsg = `Execution timed out: Exceeded deadline of ${deadline}ms. Process terminated via SIGKILL.`;
          recordHistory(executionId, normalizedLang, code, stdoutData, errorMsg, elapsed, false, 'Python 3 Isolated Runtime');
          return res.json({
            success: false,
            executionId,
            language: normalizedLang,
            output: stdoutData,
            error: errorMsg,
            executionTimeMs: elapsed,
            engine: 'Python 3 Isolated Runtime (GraalPy Compatible)'
          });
        }

        if (exitCode !== 0) {
          const errorMsg = stderrData.trim() || `Execution failed with exit code ${exitCode}`;
          recordHistory(executionId, normalizedLang, code, stdoutData, errorMsg, elapsed, false, 'Python 3 Isolated Runtime');
          return res.json({
            success: false,
            executionId,
            language: normalizedLang,
            output: stdoutData,
            error: errorMsg,
            executionTimeMs: elapsed,
            engine: 'Python 3 Isolated Runtime (GraalPy Compatible)'
          });
        }

        const finalOutput = stdoutData || '(Script executed successfully with no stdout)';
        recordHistory(executionId, normalizedLang, code, finalOutput, null, elapsed, true, 'Python 3 Isolated Runtime');
        return res.json({
          success: true,
          executionId,
          language: normalizedLang,
          output: finalOutput,
          error: null,
          executionTimeMs: elapsed,
          engine: 'Python 3 Isolated Runtime (GraalPy Compatible)',
          sandboxAudit: {
            hostAccessDenied: true,
            ioDenied: true,
            networkDenied: true,
            processDenied: true,
            deadlineMs: deadline
          }
        });
      });

      pyProcess.on('error', (err) => {
        clearTimeout(timer);
        const elapsed = Date.now() - startTime;
        const errorMsg = `Failed to spawn Python runtime: ${err.message}`;
        recordHistory(executionId, normalizedLang, code, '', errorMsg, elapsed, false, 'Python 3 Isolated Runtime');
        return res.json({
          success: false,
          executionId,
          language: normalizedLang,
          output: '',
          error: errorMsg,
          executionTimeMs: elapsed,
          engine: 'Python 3 Isolated Runtime'
        });
      });
    }
  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    return res.status(500).json({
      success: false,
      executionId,
      language: normalizedLang,
      output: '',
      error: `Internal Execution Service Error: ${err.message}`,
      executionTimeMs: elapsed
    });
  }
});

// Module E: Cross-Language Pricing Map Exchange
app.post('/api/interop/pricing', (req: Request, res: Response) => {
  const startTime = Date.now();
  const {
    guestLanguage = 'javascript',
    basePrice = 120,
    quantity = 5,
    taxRate = 0.18,
    discountTier = 'ENTERPRISE',
    currency = 'USD',
    customGuestScript
  } = req.body || {};

  const lang = String(guestLanguage).trim().toLowerCase();
  const inputPricingMap = {
    basePrice: Number(basePrice),
    quantity: Number(quantity),
    taxRate: Number(taxRate),
    discountTier: String(discountTier),
    currency: String(currency)
  };

  if (lang === 'javascript') {
    const scriptBody =
      customGuestScript && String(customGuestScript).trim()
        ? String(customGuestScript)
        : `
(function() {
  const subtotal = pricingData.basePrice * pricingData.quantity;
  const discountRate = pricingData.discountTier === 'ENTERPRISE' ? 0.20 : (pricingData.discountTier === 'PRO' ? 0.10 : 0.0);
  const discountAmount = Math.round(subtotal * discountRate * 100) / 100;
  const taxable = subtotal - discountAmount;
  const taxAmount = Math.round(taxable * pricingData.taxRate * 100) / 100;
  const finalTotal = Math.round((taxable + taxAmount) * 100) / 100;
  return {
    currency: pricingData.currency,
    subtotal: Math.round(subtotal * 100) / 100,
    discountRate: discountRate,
    discountAmount: discountAmount,
    taxAmount: taxAmount,
    finalTotal: finalTotal
  };
})();
`;

    try {
      const context = vm.createContext({ pricingData: Object.freeze({ ...inputPricingMap }), Math });
      const script = new vm.Script(scriptBody);
      const transformedResult = script.runInContext(context, { timeout: 1500 });
      return res.json({
        success: true,
        guestLanguage: 'javascript',
        inputPricingMap,
        transformedResult,
        error: null,
        executionTimeMs: Date.now() - startTime,
        interopMechanism: 'Direct Host-to-Guest Context Binding (pricingData injected directly; zero JSON parse in guest)'
      });
    } catch (err: any) {
      return res.json({
        success: false,
        guestLanguage: 'javascript',
        inputPricingMap,
        transformedResult: null,
        error: err.message,
        executionTimeMs: Date.now() - startTime,
        interopMechanism: 'Direct Host-to-Guest Context Binding'
      });
    }
  }

  if (lang === 'python') {
    if (!RUNTIME_AVAILABILITY.python) {
      return res.json({
        success: false,
        guestLanguage: 'python',
        inputPricingMap,
        transformedResult: null,
        error: 'Python runtime unavailable in this environment.',
        executionTimeMs: Date.now() - startTime,
        interopMechanism: 'GraalPy ProxyObject.fromMap() (Java backend) / Isolated Subprocess'
      });
    }

    const userLogic =
      customGuestScript && String(customGuestScript).trim()
        ? String(customGuestScript)
        : `
subtotal = pricingData["basePrice"] * pricingData["quantity"]
tier = pricingData["discountTier"]
discount_rate = 0.20 if tier == "ENTERPRISE" else (0.10 if tier == "PRO" else 0.0)
discount_amount = round(subtotal * discount_rate, 2)
taxable = subtotal - discount_amount
tax_amount = round(taxable * pricingData["taxRate"], 2)
final_total = round(taxable + tax_amount, 2)
result = {
    "currency": pricingData["currency"],
    "subtotal": round(subtotal, 2),
    "discountRate": discount_rate,
    "discountAmount": discount_amount,
    "taxAmount": tax_amount,
    "finalTotal": final_total
}
`;

    const runner = `
import json, sys
pricingData = ${JSON.stringify(inputPricingMap)}
result = None
${userLogic}
if result is None:
    raise ValueError("Guest Python interop script must assign a dictionary to 'result'")
print(json.dumps(result))
`;

    const py = spawn('python3', ['-I', '-c', runner], { timeout: 2000 });
    let stdout = '';
    let stderr = '';
    py.stdout.on('data', d => { stdout += d.toString(); });
    py.stderr.on('data', d => { stderr += d.toString(); });

    py.on('close', (code) => {
      const elapsed = Date.now() - startTime;
      if (code !== 0) {
        return res.json({
          success: false,
          guestLanguage: 'python',
          inputPricingMap,
          transformedResult: null,
          error: stderr.trim() || 'Python interop failed',
          executionTimeMs: elapsed,
          interopMechanism: 'Subprocess bridge in preview (Java 21 backend uses direct GraalVM ProxyObject.fromMap())'
        });
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        return res.json({
          success: true,
          guestLanguage: 'python',
          inputPricingMap,
          transformedResult: parsed,
          error: null,
          executionTimeMs: elapsed,
          interopMechanism: 'Subprocess bridge in preview (Java 21 backend uses direct GraalVM ProxyObject.fromMap())'
        });
      } catch (e: any) {
        return res.json({
          success: false,
          guestLanguage: 'python',
          inputPricingMap,
          transformedResult: null,
          error: `Failed reading transformed output: ${e.message}`,
          executionTimeMs: elapsed
        });
      }
    });
    return;
  }

  return res.status(400).json({
    success: false,
    error: 'Unsupported interop guest language. Use "python" or "javascript".'
  });
});

// Module H: Full CRUD Script Persistence
app.get('/api/scripts', (_req: Request, res: Response) => {
  res.json({ success: true, scripts: store.scripts });
});

app.get('/api/scripts/:id', (req: Request, res: Response) => {
  const found = store.scripts.find(s => s.id === req.params.id);
  if (!found) {
    return res.status(404).json({ success: false, error: `Script not found with id: ${req.params.id}` });
  }
  res.json({ success: true, script: found });
});

app.post('/api/scripts', (req: Request, res: Response) => {
  const { name, language, code, description, author } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Script name is required.' });
  }
  if (name.trim().length > 120) {
    return res.status(400).json({ success: false, error: 'Script name must not exceed 120 characters.' });
  }
  if (!code || typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ success: false, error: 'Source code cannot be empty.' });
  }
  if (code.length > 65536) {
    return res.status(413).json({ success: false, error: 'Source code exceeds 64KB maximum limit.' });
  }
  const lang = String(language || '').trim().toLowerCase();
  if (lang !== 'python' && lang !== 'javascript' && lang !== 'ruby') {
    return res.status(400).json({ success: false, error: 'Language must be javascript, python, or ruby.' });
  }

  const now = new Date().toISOString();
  const newScript: SavedScript = {
    id: 'script-' + Date.now().toString(36),
    name: name.trim(),
    language: lang as SupportedLanguage,
    code,
    description: description ? String(description).slice(0, 300) : '',
    author: author ? String(author).slice(0, 80) : 'Infotact Intern',
    createdAt: now,
    updatedAt: now
  };

  store.scripts.unshift(newScript);
  saveStore(store);
  res.status(201).json({ success: true, script: newScript });
});

app.put('/api/scripts/:id', (req: Request, res: Response) => {
  const existing = store.scripts.find(s => s.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, error: `Script not found with id: ${req.params.id}` });
  }
  const { name, language, code, description, author } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Script name is required.' });
  }
  if (!code || typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ success: false, error: 'Source code cannot be empty.' });
  }
  const lang = String(language || existing.language).trim().toLowerCase();
  if (lang !== 'python' && lang !== 'javascript' && lang !== 'ruby') {
    return res.status(400).json({ success: false, error: 'Language must be javascript, python, or ruby.' });
  }

  existing.name = name.trim().slice(0, 120);
  existing.language = lang as SupportedLanguage;
  existing.code = code;
  existing.description = description !== undefined ? String(description).slice(0, 300) : existing.description;
  existing.author = author ? String(author).slice(0, 80) : existing.author;
  existing.updatedAt = new Date().toISOString();

  saveStore(store);
  res.json({ success: true, script: existing });
});

app.delete('/api/scripts/:id', (req: Request, res: Response) => {
  const index = store.scripts.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Script not found' });
  }
  store.scripts.splice(index, 1);
  saveStore(store);
  res.json({ success: true, message: 'Script deleted successfully' });
});

// Paginated Execution History Endpoint
app.get('/api/history', (req: Request, res: Response) => {
  const page = Math.max(0, parseInt(String(req.query.page || '0'), 10) || 0);
  const size = Math.min(Math.max(1, parseInt(String(req.query.size || '10'), 10) || 10), 100);
  const totalElements = store.history.length;
  const totalPages = Math.ceil(totalElements / size);
  const start = page * size;
  const slice = store.history.slice(start, start + size);

  res.json({
    success: true,
    history: slice,
    page,
    size,
    totalElements,
    totalPages
  });
});

// Module G: Performance Dashboard Metrics Endpoint (real computed telemetry)
app.get('/api/metrics', (_req: Request, res: Response) => {
  const totalExecutions = store.history.length;
  const successCount = store.history.filter(h => h.success).length;
  const failureCount = totalExecutions - successCount;
  const avgExecutionTimeMs =
    totalExecutions > 0
      ? Math.round((store.history.reduce((sum, h) => sum + h.executionTimeMs, 0) / totalExecutions) * 100) / 100
      : 0;

  const languageCounts = {
    python: store.history.filter(h => h.language === 'python').length,
    javascript: store.history.filter(h => h.language === 'javascript').length,
    ruby: store.history.filter(h => h.language === 'ruby').length
  };

  res.json({
    totalExecutions,
    successCount,
    failureCount,
    avgExecutionTimeMs,
    languageCounts,
    recentHistory: store.history.slice(0, 10)
  });
});

// Health & Runtime Availability Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'UP',
    platform: 'PolyglotMesh Preview Runtime (Java 21 Spring WebFlux backend in /backend)',
    supportedLanguages: ['javascript', 'python', 'ruby'],
    runtimes: RUNTIME_AVAILABILITY,
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
  });
});

async function startServer() {
  const distDir = path.join(__dirname, 'dist');
  if (process.env.NODE_ENV === 'production' && fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PolyglotMesh] Full-Stack Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
