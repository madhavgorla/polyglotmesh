import { execSync, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import * as esbuild from 'esbuild';
import * as acorn from 'acorn';

export type PolyglotLang = 'python' | 'javascript' | 'typescript' | 'java' | 'c' | 'cpp';

export function checkCommandAvailable(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export const EXTRA_RUNTIMES = {
  typescript: true,
  java: checkCommandAvailable('javac') && checkCommandAvailable('java'),
  c: checkCommandAvailable('gcc'),
  cpp: checkCommandAvailable('g++')
};

export interface ComplexityEstimate {
  time: string;
  space: string;
  notes: string[];
}

export interface ExecutionTelemetryPayload {
  executionTimeMs: number;
  compileTimeMs?: number;
  peakMemoryKb: number;
  memoryUsedMb: number;
  memoryLimitMb: number;
  timeoutLimitMs: number;
  engine: string;
  backendSource: 'graalvm-backend' | 'polyglot-sandbox';
  measuredAt: string;
}

export function buildTelemetrySnapshot(params: {
  executionTimeMs: number;
  compileTimeMs?: number;
  peakMemoryKb: number;
  memoryLimitMb?: number;
  timeoutLimitMs?: number;
  engine: string;
  backendSource?: 'graalvm-backend' | 'polyglot-sandbox';
}): ExecutionTelemetryPayload {
  const safeExecMs = Math.max(1, Math.round(params.executionTimeMs * 100) / 100);
  const safePeakKb = Math.max(1, Math.round(params.peakMemoryKb));
  const memoryUsedMb = Math.round((safePeakKb / 1024) * 100) / 100;
  return {
    executionTimeMs: safeExecMs,
    ...(params.compileTimeMs !== undefined ? { compileTimeMs: Math.max(0, Math.round(params.compileTimeMs)) } : {}),
    peakMemoryKb: safePeakKb,
    memoryUsedMb,
    memoryLimitMb: params.memoryLimitMb ?? 256,
    timeoutLimitMs: params.timeoutLimitMs ?? 3000,
    engine: params.engine,
    backendSource: params.backendSource ?? 'polyglot-sandbox',
    measuredAt: new Date().toISOString()
  };
}

export interface PolyglotJudgeCaseInput {
  name: string;
  value: string;
}

export interface PolyglotJudgeCase {
  id?: string;
  label?: string;
  inputs: PolyglotJudgeCaseInput[];
  expectedDisplay: string;
  hasExpected?: boolean;
}

export interface ParamTypeSpec {
  name: string;
  pyType: string;
  jsType?: string;
}

function stripCommentsAndStrings(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ')
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
}

export function analyzeStaticComplexity(
  lang: 'java' | 'c' | 'cpp' | 'typescript',
  source: string,
  methodName: string
): ComplexityEstimate {
  const cleaned = stripCommentsAndStrings(source);
  let loopDepth = 0;
  let maxLoopDepth = 0;
  let braceDepth = 0;
  const loopBraceStack: number[] = [];

  const tokens = cleaned.match(/\b(?:for|while|do)\b|[{}]/g) || [];
  for (let i = 0; i < tokens.length; i += 1) {
    const tok = tokens[i];
    if (tok === 'for' || tok === 'while' || tok === 'do') {
      loopDepth += 1;
      if (loopDepth > maxLoopDepth) maxLoopDepth = loopDepth;
      loopBraceStack.push(braceDepth + 1);
    } else if (tok === '{') {
      braceDepth += 1;
    } else if (tok === '}') {
      while (loopBraceStack.length > 0 && loopBraceStack[loopBraceStack.length - 1] >= braceDepth) {
        loopBraceStack.pop();
        loopDepth = Math.max(0, loopDepth - 1);
      }
      braceDepth = Math.max(0, braceDepth - 1);
    }
  }

  const hasSort =
    /\b(?:Arrays\.sort|Collections\.sort|std::sort|sort|qsort)\s*\(/.test(cleaned) ||
    /\.sort\s*\(/.test(cleaned);

  const safeMethod = methodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const fnCallCount = safeMethod
    ? (cleaned.match(new RegExp(`\\b${safeMethod}\\s*\\(`, 'g')) || []).length
    : 0;
  const hasRecursion = fnCallCount >= 2;

  const hasAuxCollection =
    /\b(?:new\s+(?:HashMap|HashSet|TreeMap|TreeSet|ArrayList|LinkedList|ArrayDeque|Stack|PriorityQueue|Map|Set)|unordered_map|unordered_set|vector|deque|stack|queue|priority_queue|malloc|calloc)\b/.test(
      cleaned
    );

  let time = 'O(1)';
  if (maxLoopDepth >= 3) time = 'O(n^3)';
  else if (maxLoopDepth === 2) time = 'O(n^2)';
  else if (hasSort && maxLoopDepth <= 1) time = 'O(n log n)';
  else if (maxLoopDepth === 1 && />>\s*1|\/\s*2\b/.test(cleaned)) time = 'O(log n)';
  else if (maxLoopDepth === 1) time = 'O(n)';
  else if (hasRecursion) time = 'O(n) / recursive';

  const space = hasAuxCollection ? 'O(n)' : hasRecursion ? 'O(h) stack' : 'O(1)';
  const notes: string[] = [];
  if (maxLoopDepth > 0) notes.push(`Loop depth: ${maxLoopDepth}`);
  if (hasSort) notes.push('Sorting detected');
  if (hasRecursion) notes.push('Recursion detected');
  if (hasAuxCollection) notes.push('Auxiliary structure allocated');
  if (notes.length === 0) notes.push('Constant-time direct evaluation');

  return { time, space, notes };
}

export function auditExtraLanguageSecurity(
  lang: string,
  code: string
): { dangerous: boolean; reason?: string } {
  const lower = code.toLowerCase();
  if (lang === 'typescript') {
    if (
      lower.includes('child_process') ||
      lower.includes('process.exit') ||
      lower.includes('process.kill') ||
      lower.includes('process.binding') ||
      lower.includes('global.process') ||
      lower.includes('this.constructor.constructor')
    ) {
      return {
        dangerous: true,
        reason: 'Process access and constructor prototype escape are prohibited by PolyglotMesh policy.'
      };
    }
  }
  if (lang === 'java') {
    if (
      lower.includes('runtime.getruntime') ||
      lower.includes('processbuilder') ||
      lower.includes('java.net.socket') ||
      lower.includes('java.io.file') ||
      lower.includes('java.nio.file') ||
      lower.includes('system.exit')
    ) {
      return {
        dangerous: true,
        reason: 'Host process spawning, file I/O, and network sockets are prohibited by PolyglotMesh policy.'
      };
    }
  }
  if (lang === 'c' || lang === 'cpp') {
    if (
      /\bsystem\s*\(/.test(lower) ||
      /\bpopen\s*\(/.test(lower) ||
      /\bfork\s*\(/.test(lower) ||
      /\bexecv|\bexecl/.test(lower) ||
      lower.includes('sys/socket.h') ||
      lower.includes('unistd.h')
    ) {
      return {
        dangerous: true,
        reason: 'OS process spawning and POSIX socket/unistd calls are prohibited by PolyglotMesh policy.'
      };
    }
  }
  return { dangerous: false };
}

export function transpileTypeScript(code: string): {
  ok: boolean;
  jsCode?: string;
  error?: { line: number; column: number; message: string };
} {
  try {
    const out = esbuild.transformSync(code, {
      loader: 'ts',
      target: 'es2022',
      format: 'cjs'
    });
    // Validate emitted JS cleanly via Acorn
    acorn.parse(out.code, { ecmaVersion: 'latest', sourceType: 'script' });
    return { ok: true, jsCode: out.code };
  } catch (err: any) {
    const first = err?.errors?.[0];
    if (first) {
      return {
        ok: false,
        error: {
          line: first.location?.line || 1,
          column: (first.location?.column ?? 0) + 1,
          message: first.text || 'TypeScript syntax error'
        }
      };
    }
    return {
      ok: false,
      error: {
        line: err?.loc?.line || 1,
        column: (err?.loc?.column ?? 0) + 1,
        message: err?.message ? String(err.message) : 'TypeScript syntax error'
      }
    };
  }
}

function runCommandWithTimeout(
  cmd: string,
  args: string[],
  cwd: string,
  timeoutMs: number
): Promise<{ code: number | null; signal: string | null; stdout: string; stderr: string; timedOut: boolean }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      env: { PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin' }
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.on('data', (d) => {
      if (stdout.length < 2 * 1024 * 1024) stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      if (stderr.length < 512 * 1024) stderr += d.toString();
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ code: 1, signal: null, stdout, stderr: err.message, timedOut });
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr, timedOut });
    });
  });
}

function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-run-'));
  return fn(dir).finally(() => {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });
}

function parseGccDiagnostic(stderr: string, filename: string): { line: number; column: number; message: string } {
  const lines = stderr.split('\n');
  for (const raw of lines) {
    const re = new RegExp(`${filename.replace('.', '\\.')}:(\\d+):(?:(\\d+):)?\\s*(?:fatal\\s+)?error:\\s*(.+)$`);
    const m = raw.match(re);
    if (m) {
      return {
        line: Math.max(1, parseInt(m[1], 10)),
        column: m[2] ? Math.max(1, parseInt(m[2], 10)) : 1,
        message: m[3].trim()
      };
    }
  }
  const fallback = stderr.match(/:(\d+):(?:(\d+):)?\s*error:\s*(.+)/);
  if (fallback) {
    return {
      line: Math.max(1, parseInt(fallback[1], 10)),
      column: fallback[2] ? Math.max(1, parseInt(fallback[2], 10)) : 1,
      message: fallback[3].trim()
    };
  }
  return { line: 1, column: 1, message: stderr.trim().split('\n')[0] || 'Compilation error' };
}

function parseJavacDiagnostic(stderr: string, filename: string, headerLines: number): { line: number; column: number; message: string } {
  const lines = stderr.split('\n');
  for (const raw of lines) {
    const re = new RegExp(`${filename.replace('.', '\\.')}:(\\d+):\\s*error:\\s*(.+)$`);
    const m = raw.match(re);
    if (m) {
      const rawLine = parseInt(m[1], 10);
      return {
        line: Math.max(1, rawLine - headerLines),
        column: 1,
        message: m[2].trim()
      };
    }
  }
  return { line: 1, column: 1, message: stderr.trim().split('\n')[0] || 'Java compilation error' };
}

function buildJavaSolutionFile(code: string): { source: string; headerLines: number } {
  const hasUtilImport = /\bimport\s+java\.util\.\*/.test(code);
  const header = hasUtilImport ? '' : 'import java.util.*;\n';
  const headerLines = header ? 1 : 0;
  return { source: header + code, headerLines };
}

function cNodePreamble(code: string): string {
  const definesListNode = /\bstruct\s+ListNode\s*\{/.test(code);
  const definesTreeNode = /\bstruct\s+TreeNode\s*\{/.test(code);
  let pre = '#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n#include <stdbool.h>\n#include <math.h>\n#include <limits.h>\n#include <time.h>\n#include <sys/resource.h>\n';
  if (!definesListNode) {
    pre += 'struct ListNode { int val; struct ListNode *next; };\n';
  }
  if (!definesTreeNode) {
    pre += 'struct TreeNode { int val; struct TreeNode *left; struct TreeNode *right; };\n';
  }
  return pre;
}

function cppNodePreamble(code: string): string {
  const definesListNode = /\bstruct\s+ListNode\s*\{/.test(code);
  const definesTreeNode = /\bstruct\s+TreeNode\s*\{/.test(code);
  let pre = `#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <map>
#include <set>
#include <queue>
#include <stack>
#include <algorithm>
#include <cmath>
#include <climits>
#include <sstream>
#include <numeric>
#include <chrono>
#include <sys/resource.h>
using namespace std;
`;
  if (!definesListNode) {
    pre += 'struct ListNode { int val; ListNode *next; ListNode() : val(0), next(nullptr) {} ListNode(int x) : val(x), next(nullptr) {} ListNode(int x, ListNode *next) : val(x), next(next) {} };\n';
  }
  if (!definesTreeNode) {
    pre += 'struct TreeNode { int val; TreeNode *left; TreeNode *right; TreeNode() : val(0), left(nullptr), right(nullptr) {} TreeNode(int x) : val(x), left(nullptr), right(nullptr) {} TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {} };\n';
  }
  return pre;
}

export async function checkPolyglotSyntax(
  lang: 'typescript' | 'java' | 'c' | 'cpp',
  code: string
): Promise<{ valid: boolean; errors: Array<{ line: number; column: number; message: string; severity?: string }> }> {
  if (lang === 'typescript') {
    const res = transpileTypeScript(code);
    if (res.ok) return { valid: true, errors: [] };
    return {
      valid: false,
      errors: [{ ...(res.error || { line: 1, column: 1, message: 'Syntax error' }), severity: 'error' }]
    };
  }

  if (lang === 'c') {
    if (!EXTRA_RUNTIMES.c) return { valid: true, errors: [] };
    return withTempDir(async (dir) => {
      const src = `${cNodePreamble(code)}\n#line 1 "solution.c"\n${code}\n`;
      fs.writeFileSync(path.join(dir, 'solution.c'), src, 'utf-8');
      const run = await runCommandWithTimeout('gcc', ['-std=c11', '-fsyntax-only', 'solution.c'], dir, 3000);
      if (run.code === 0) return { valid: true, errors: [] };
      const diag = parseGccDiagnostic(run.stderr, 'solution.c');
      return { valid: false, errors: [{ ...diag, severity: 'error' }] };
    });
  }

  if (lang === 'cpp') {
    if (!EXTRA_RUNTIMES.cpp) return { valid: true, errors: [] };
    return withTempDir(async (dir) => {
      const src = `${cppNodePreamble(code)}\n#line 1 "solution.cpp"\n${code}\n`;
      fs.writeFileSync(path.join(dir, 'solution.cpp'), src, 'utf-8');
      const run = await runCommandWithTimeout('g++', ['-std=c++17', '-fsyntax-only', 'solution.cpp'], dir, 3500);
      if (run.code === 0) return { valid: true, errors: [] };
      const diag = parseGccDiagnostic(run.stderr, 'solution.cpp');
      return { valid: false, errors: [{ ...diag, severity: 'error' }] };
    });
  }

  if (lang === 'java') {
    if (!EXTRA_RUNTIMES.java) return { valid: true, errors: [] };
    return withTempDir(async (dir) => {
      fs.writeFileSync(
        path.join(dir, 'ListNode.java'),
        'public class ListNode { public int val; public ListNode next; public ListNode() {} public ListNode(int v) { val = v; } public ListNode(int v, ListNode n) { val = v; next = n; } }\n',
        'utf-8'
      );
      fs.writeFileSync(
        path.join(dir, 'TreeNode.java'),
        'public class TreeNode { public int val; public TreeNode left; public TreeNode right; public TreeNode() {} public TreeNode(int v) { val = v; } public TreeNode(int v, TreeNode l, TreeNode r) { val = v; left = l; right = r; } }\n',
        'utf-8'
      );
      const { source, headerLines } = buildJavaSolutionFile(code);
      const classMatch = code.match(/\bpublic\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/);
      const fname = classMatch ? `${classMatch[1]}.java` : 'Solution.java';
      fs.writeFileSync(path.join(dir, fname), source, 'utf-8');
      const files = ['ListNode.java', 'TreeNode.java', fname];
      const run = await runCommandWithTimeout('javac', ['-Xlint:none', ...files], dir, 5000);
      if (run.code === 0) return { valid: true, errors: [] };
      const diag = parseJavacDiagnostic(run.stderr, fname, headerLines);
      return { valid: false, errors: [{ ...diag, severity: 'error' }] };
    });
  }

  return { valid: true, errors: [] };
}

export async function executeStandaloneNativeScript(
  lang: 'java' | 'c' | 'cpp',
  code: string,
  timeoutMs: number
): Promise<{
  success: boolean;
  output: string;
  error: string | null;
  engine: string;
  executionTimeMs?: number;
  compileTimeMs?: number;
  peakMemoryKb?: number;
  memoryUsedMb?: number;
  telemetry?: ExecutionTelemetryPayload;
}> {
  if (lang === 'c') {
    if (!EXTRA_RUNTIMES.c) {
      return { success: false, output: '', error: 'GCC (C compiler) is unavailable in this environment.', engine: 'GCC C11' };
    }
    return withTempDir(async (dir) => {
      const src = `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n#include <stdbool.h>\n#include <math.h>\n#line 1 "main.c"\n${code}\n`;
      fs.writeFileSync(path.join(dir, 'main.c'), src, 'utf-8');
      const compStart = Date.now();
      const comp = await runCommandWithTimeout('gcc', ['-O2', '-std=c11', 'main.c', '-lm', '-o', 'main'], dir, 5000);
      const compileTimeMs = Date.now() - compStart;
      if (comp.code !== 0) {
        const d = parseGccDiagnostic(comp.stderr, 'main.c');
        return { success: false, output: '', error: `CompileError (Line ${d.line}): ${d.message}`, engine: 'GCC C11 Native Compiler', compileTimeMs };
      }
      const runStart = Date.now();
      const run = await runCommandWithTimeout('./main', [], dir, timeoutMs);
      const execMs = Math.max(1, Date.now() - runStart);
      const telemetry = buildTelemetrySnapshot({
        executionTimeMs: execMs,
        compileTimeMs,
        peakMemoryKb: 2400,
        timeoutLimitMs: timeoutMs,
        engine: 'GCC C11 Native Binary'
      });
      if (run.timedOut) {
        return { success: false, output: run.stdout, error: `Execution timed out (${timeoutMs}ms)`, engine: 'GCC C11 Native Binary', executionTimeMs: timeoutMs, compileTimeMs, peakMemoryKb: telemetry.peakMemoryKb, memoryUsedMb: telemetry.memoryUsedMb, telemetry };
      }
      if (run.code !== 0) {
        return {
          success: false,
          output: run.stdout,
          error: run.stderr.trim() || `Exited with status ${run.code ?? run.signal}`,
          engine: 'GCC C11 Native Binary',
          executionTimeMs: execMs,
          compileTimeMs,
          peakMemoryKb: telemetry.peakMemoryKb,
          memoryUsedMb: telemetry.memoryUsedMb,
          telemetry
        };
      }
      return {
        success: true,
        output: run.stdout.trimEnd() || '(Execution finished with no stdout output)',
        error: null,
        engine: 'GCC C11 Native Binary',
        executionTimeMs: execMs,
        compileTimeMs,
        peakMemoryKb: telemetry.peakMemoryKb,
        memoryUsedMb: telemetry.memoryUsedMb,
        telemetry
      };
    });
  }

  if (lang === 'cpp') {
    if (!EXTRA_RUNTIMES.cpp) {
      return { success: false, output: '', error: 'G++ (C++ compiler) is unavailable in this environment.', engine: 'G++ C++17' };
    }
    return withTempDir(async (dir) => {
      const src = `${cppNodePreamble(code)}\n#line 1 "main.cpp"\n${code}\n`;
      fs.writeFileSync(path.join(dir, 'main.cpp'), src, 'utf-8');
      const compStart = Date.now();
      const comp = await runCommandWithTimeout('g++', ['-O2', '-std=c++17', 'main.cpp', '-o', 'main'], dir, 6000);
      const compileTimeMs = Date.now() - compStart;
      if (comp.code !== 0) {
        const d = parseGccDiagnostic(comp.stderr, 'main.cpp');
        return { success: false, output: '', error: `CompileError (Line ${d.line}): ${d.message}`, engine: 'G++ C++17 Native Compiler', compileTimeMs };
      }
      const runStart = Date.now();
      const run = await runCommandWithTimeout('./main', [], dir, timeoutMs);
      const execMs = Math.max(1, Date.now() - runStart);
      const telemetry = buildTelemetrySnapshot({
        executionTimeMs: execMs,
        compileTimeMs,
        peakMemoryKb: 3200,
        timeoutLimitMs: timeoutMs,
        engine: 'G++ C++17 Native Binary'
      });
      if (run.timedOut) {
        return { success: false, output: run.stdout, error: `Execution timed out (${timeoutMs}ms)`, engine: 'G++ C++17 Native Binary', executionTimeMs: timeoutMs, compileTimeMs, peakMemoryKb: telemetry.peakMemoryKb, memoryUsedMb: telemetry.memoryUsedMb, telemetry };
      }
      if (run.code !== 0) {
        return {
          success: false,
          output: run.stdout,
          error: run.stderr.trim() || `Exited with status ${run.code ?? run.signal}`,
          engine: 'G++ C++17 Native Binary',
          executionTimeMs: execMs,
          compileTimeMs,
          peakMemoryKb: telemetry.peakMemoryKb,
          memoryUsedMb: telemetry.memoryUsedMb,
          telemetry
        };
      }
      return {
        success: true,
        output: run.stdout.trimEnd() || '(Execution finished with no stdout output)',
        error: null,
        engine: 'G++ C++17 Native Binary',
        executionTimeMs: execMs,
        compileTimeMs,
        peakMemoryKb: telemetry.peakMemoryKb,
        memoryUsedMb: telemetry.memoryUsedMb,
        telemetry
      };
    });
  }

  if (!EXTRA_RUNTIMES.java) {
    return { success: false, output: '', error: 'Java JDK (javac/java) is unavailable in this environment.', engine: 'OpenJDK 17' };
  }
  return withTempDir(async (dir) => {
    const classMatch = code.match(/\b(?:public\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)/);
    const mainClass = classMatch ? classMatch[1] : 'Main';
    const hasMain = /\bpublic\s+static\s+void\s+main\s*\(/.test(code);
    const wrapped = hasMain
      ? code
      : `public class Main {\n  public static void main(String[] args) {\n${code}\n  }\n}`;
    const fname = `${hasMain ? mainClass : 'Main'}.java`;
    const { source, headerLines } = buildJavaSolutionFile(wrapped);
    fs.writeFileSync(path.join(dir, fname), source, 'utf-8');
    const compStart = Date.now();
    const comp = await runCommandWithTimeout('javac', ['-Xlint:none', fname], dir, 7000);
    const compileTimeMs = Date.now() - compStart;
    if (comp.code !== 0) {
      const d = parseJavacDiagnostic(comp.stderr, fname, headerLines + (hasMain ? 0 : 2));
      return { success: false, output: '', error: `CompileError (Line ${d.line}): ${d.message}`, engine: 'OpenJDK 17 javac', compileTimeMs };
    }
    const runStart = Date.now();
    const run = await runCommandWithTimeout('java', ['-Xmx128m', hasMain ? mainClass : 'Main'], dir, timeoutMs);
    const execMs = Math.max(1, Date.now() - runStart);
    const telemetry = buildTelemetrySnapshot({
      executionTimeMs: execMs,
      compileTimeMs,
      peakMemoryKb: 16384,
      memoryLimitMb: 128,
      timeoutLimitMs: timeoutMs,
      engine: 'OpenJDK 17 JVM'
    });
    if (run.timedOut) {
      return { success: false, output: run.stdout, error: `Execution timed out (${timeoutMs}ms)`, engine: 'OpenJDK 17 JVM', executionTimeMs: timeoutMs, compileTimeMs, peakMemoryKb: telemetry.peakMemoryKb, memoryUsedMb: telemetry.memoryUsedMb, telemetry };
    }
    if (run.code !== 0) {
      return { success: false, output: run.stdout, error: run.stderr.trim() || 'Java runtime error', engine: 'OpenJDK 17 JVM', executionTimeMs: execMs, compileTimeMs, peakMemoryKb: telemetry.peakMemoryKb, memoryUsedMb: telemetry.memoryUsedMb, telemetry };
    }
    return {
      success: true,
      output: run.stdout.trimEnd() || '(Execution finished with no stdout output)',
      error: null,
      engine: 'OpenJDK 17 JVM',
      executionTimeMs: execMs,
      compileTimeMs,
      peakMemoryKb: telemetry.peakMemoryKb,
      memoryUsedMb: telemetry.memoryUsedMb,
      telemetry
    };
  });
}

function inferPyTypeFromVal(val: any): string {
  if (typeof val === 'boolean') return 'bool';
  if (typeof val === 'string') return 'str';
  if (typeof val === 'number') return Number.isInteger(val) ? 'int' : 'float';
  if (Array.isArray(val)) {
    if (val.length === 0) return 'List[int]';
    if (Array.isArray(val[0])) {
      return typeof val[0]?.[0] === 'string' ? 'List[List[str]]' : 'List[List[int]]';
    }
    return typeof val[0] === 'string' ? 'List[str]' : 'List[int]';
  }
  return 'int';
}

function parseJsonSafe(raw: string): any {
  const t = String(raw).trim();
  try {
    return JSON.parse(t);
  } catch {
    if (t === 'True') return true;
    if (t === 'False') return false;
    if (t === 'None' || t === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
    return t;
  }
}

function canonicalizeVal(val: any): any {
  if (Array.isArray(val)) return val.map(canonicalizeVal);
  if (val && typeof val === 'object') {
    const out: Record<string, any> = {};
    for (const k of Object.keys(val).sort()) out[k] = canonicalizeVal(val[k]);
    return out;
  }
  return val;
}

function deepEqual(a: any, b: any, unordered: boolean): boolean {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
    return Math.abs(a - b) <= 1e-5;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    if (!unordered) return a.every((v, idx) => deepEqual(v, b[idx], false));
    const normA = a
      .map((item) => JSON.stringify(canonicalizeVal(Array.isArray(item) ? [...item].sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y))) : item)))
      .sort();
    const normB = b
      .map((item) => JSON.stringify(canonicalizeVal(Array.isArray(item) ? [...item].sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y))) : item)))
      .sort();
    return JSON.stringify(normA) === JSON.stringify(normB);
  }
  return false;
}

function escapeCString(s: string): string {
  return JSON.stringify(s);
}

function resolveParamTypes(
  testCases: PolyglotJudgeCase[],
  providedParams?: ParamTypeSpec[],
  providedReturn?: { py: string },
  dataStructureKind?: string | null
): { params: ParamTypeSpec[]; pyReturn: string } {
  const firstCase = testCases[0];
  let params: ParamTypeSpec[] = Array.isArray(providedParams) && providedParams.length > 0
    ? providedParams
    : (firstCase?.inputs || []).map((inp) => {
        const lower = inp.name.toLowerCase();
        if (dataStructureKind === 'linked-list' && ['head', 'list1', 'list2', 'l1', 'l2'].includes(lower)) {
          return { name: inp.name, pyType: 'Optional[ListNode]' };
        }
        if (dataStructureKind === 'tree' && ['root', 'p', 'q', 'subroot'].includes(lower)) {
          return { name: inp.name, pyType: 'Optional[TreeNode]' };
        }
        return { name: inp.name, pyType: inferPyTypeFromVal(parseJsonSafe(inp.value)) };
      });

  let pyReturn = providedReturn?.py || 'int';
  if (!providedReturn?.py && firstCase?.expectedDisplay) {
    const expVal = parseJsonSafe(firstCase.expectedDisplay);
    pyReturn = inferPyTypeFromVal(expVal);
    if (dataStructureKind === 'linked-list' && Array.isArray(expVal) && !Array.isArray(expVal[0])) {
      pyReturn = 'Optional[ListNode]';
    } else if (dataStructureKind === 'tree' && Array.isArray(expVal) && !Array.isArray(expVal[0])) {
      pyReturn = 'Optional[TreeNode]';
    }
  }
  return { params, pyReturn };
}

function buildCppArgDecl(pyType: string, varName: string, val: any): string {
  if (pyType === 'Optional[ListNode]') {
    const arr = Array.isArray(val) ? val : [];
    const elems = arr.map((x) => String(Number(x) || 0)).join(', ');
    return `ListNode* ${varName} = __pmArrToList(vector<int>{${elems}});`;
  }
  if (pyType === 'Optional[TreeNode]') {
    const arr = Array.isArray(val) ? val : [];
    const elems = arr.map((x) => (x === null || x === undefined ? 'INT_MIN' : String(Number(x) || 0))).join(', ');
    return `TreeNode* ${varName} = __pmArrToTree(vector<int>{${elems}});`;
  }
  if (pyType === 'bool') return `bool ${varName} = ${val ? 'true' : 'false'};`;
  if (pyType === 'float') return `double ${varName} = ${Number(val) || 0};`;
  if (pyType === 'int') return `int ${varName} = ${Math.trunc(Number(val) || 0)};`;
  if (pyType === 'str') return `string ${varName} = ${escapeCString(String(val ?? ''))};`;
  if (pyType === 'List[int]') {
    const elems = (Array.isArray(val) ? val : []).map((x) => String(Math.trunc(Number(x) || 0))).join(', ');
    return `vector<int> ${varName}{${elems}};`;
  }
  if (pyType === 'List[str]') {
    const elems = (Array.isArray(val) ? val : []).map((x) => escapeCString(String(x))).join(', ');
    return `vector<string> ${varName}{${elems}};`;
  }
  if (pyType === 'List[List[int]]') {
    const rows = (Array.isArray(val) ? val : [])
      .map((r: any) => `{${(Array.isArray(r) ? r : []).map((x) => String(Math.trunc(Number(x) || 0))).join(', ')}}`)
      .join(', ');
    return `vector<vector<int>> ${varName}{${rows}};`;
  }
  if (pyType === 'List[List[str]]') {
    const rows = (Array.isArray(val) ? val : [])
      .map((r: any) => `{${(Array.isArray(r) ? r : []).map((x) => escapeCString(String(x))).join(', ')}}`)
      .join(', ');
    return `vector<vector<string>> ${varName}{${rows}};`;
  }
  return `int ${varName} = ${Math.trunc(Number(val) || 0)};`;
}

function buildJavaArgExpr(pyType: string, val: any): string {
  if (pyType === 'Optional[ListNode]') {
    const elems = (Array.isArray(val) ? val : []).map((x) => String(Math.trunc(Number(x) || 0))).join(', ');
    return `__pmArrToList(new int[]{${elems}})`;
  }
  if (pyType === 'Optional[TreeNode]') {
    const elems = (Array.isArray(val) ? val : [])
      .map((x) => (x === null || x === undefined ? 'null' : String(Math.trunc(Number(x) || 0))))
      .join(', ');
    return `__pmArrToTree(new Integer[]{${elems}})`;
  }
  if (pyType === 'bool') return val ? 'true' : 'false';
  if (pyType === 'float') return String(Number(val) || 0);
  if (pyType === 'int') return String(Math.trunc(Number(val) || 0));
  if (pyType === 'str') return escapeCString(String(val ?? ''));
  if (pyType === 'List[int]') {
    const elems = (Array.isArray(val) ? val : []).map((x) => String(Math.trunc(Number(x) || 0))).join(', ');
    return `new int[]{${elems}}`;
  }
  if (pyType === 'List[str]') {
    const elems = (Array.isArray(val) ? val : []).map((x) => escapeCString(String(x))).join(', ');
    return `new String[]{${elems}}`;
  }
  if (pyType === 'List[List[int]]') {
    const rows = (Array.isArray(val) ? val : [])
      .map((r: any) => `{${(Array.isArray(r) ? r : []).map((x) => String(Math.trunc(Number(x) || 0))).join(', ')}}`)
      .join(', ');
    return `new int[][]{${rows}}`;
  }
  if (pyType === 'List[List[str]]') {
    const rows = (Array.isArray(val) ? val : [])
      .map((r: any) => `{${(Array.isArray(r) ? r : []).map((x) => escapeCString(String(x))).join(', ')}}`)
      .join(', ');
    return `new String[][]{${rows}}`;
  }
  return String(Math.trunc(Number(val) || 0));
}

function buildCArgSetup(
  pyType: string,
  varName: string,
  val: any
): { decls: string[]; passArgs: string[] } {
  if (pyType === 'Optional[ListNode]') {
    const arr = Array.isArray(val) ? val : [];
    if (arr.length === 0) {
      return { decls: [`struct ListNode* ${varName} = NULL;`], passArgs: [varName] };
    }
    const elems = arr.map((x) => String(Math.trunc(Number(x) || 0))).join(', ');
    return {
      decls: [
        `int __raw_${varName}[] = {${elems}};`,
        `struct ListNode* ${varName} = __pmArrToList(__raw_${varName}, ${arr.length});`
      ],
      passArgs: [varName]
    };
  }
  if (pyType === 'Optional[TreeNode]') {
    const arr = Array.isArray(val) ? val : [];
    if (arr.length === 0) {
      return { decls: [`struct TreeNode* ${varName} = NULL;`], passArgs: [varName] };
    }
    const elems = arr.map((x) => (x === null || x === undefined ? 'INT_MIN' : String(Math.trunc(Number(x) || 0)))).join(', ');
    return {
      decls: [
        `int __raw_${varName}[] = {${elems}};`,
        `struct TreeNode* ${varName} = __pmArrToTree(__raw_${varName}, ${arr.length});`
      ],
      passArgs: [varName]
    };
  }
  if (pyType === 'bool') return { decls: [`bool ${varName} = ${val ? 'true' : 'false'};`], passArgs: [varName] };
  if (pyType === 'float') return { decls: [`double ${varName} = ${Number(val) || 0};`], passArgs: [varName] };
  if (pyType === 'int') return { decls: [`int ${varName} = ${Math.trunc(Number(val) || 0)};`], passArgs: [varName] };
  if (pyType === 'str') {
    return {
      decls: [`char ${varName}[] = ${escapeCString(String(val ?? ''))};`],
      passArgs: [varName]
    };
  }
  if (pyType === 'List[int]') {
    const arr = Array.isArray(val) ? val : [];
    if (arr.length === 0) {
      return { decls: [`int* ${varName} = NULL;`, `int ${varName}Size = 0;`], passArgs: [varName, `${varName}Size`] };
    }
    const elems = arr.map((x) => String(Math.trunc(Number(x) || 0))).join(', ');
    return {
      decls: [`int ${varName}[] = {${elems}};`, `int ${varName}Size = ${arr.length};`],
      passArgs: [varName, `${varName}Size`]
    };
  }
  if (pyType === 'List[str]') {
    const arr = Array.isArray(val) ? val : [];
    if (arr.length === 0) {
      return { decls: [`char** ${varName} = NULL;`, `int ${varName}Size = 0;`], passArgs: [varName, `${varName}Size`] };
    }
    const elems = arr.map((x) => escapeCString(String(x))).join(', ');
    return {
      decls: [`char* ${varName}[] = {${elems}};`, `int ${varName}Size = ${arr.length};`],
      passArgs: [varName, `${varName}Size`]
    };
  }
  if (pyType === 'List[List[int]]') {
    const rows = Array.isArray(val) ? val : [];
    if (rows.length === 0) {
      return {
        decls: [`int** ${varName} = NULL;`, `int ${varName}Size = 0;`, `int* ${varName}ColSize = NULL;`],
        passArgs: [varName, `${varName}Size`, `${varName}ColSize`]
      };
    }
    const decls: string[] = [];
    const ptrNames: string[] = [];
    const colSizes: number[] = [];
    rows.forEach((r: any, rIdx: number) => {
      const safeRow = Array.isArray(r) ? r : [];
      colSizes.push(safeRow.length);
      const rVar = `__row_${varName}_${rIdx}`;
      if (safeRow.length === 0) {
        decls.push(`int* ${rVar} = NULL;`);
      } else {
        decls.push(`int ${rVar}[] = {${safeRow.map((x) => String(Math.trunc(Number(x) || 0))).join(', ')}};`);
      }
      ptrNames.push(rVar);
    });
    decls.push(`int* ${varName}[] = {${ptrNames.join(', ')}};`);
    decls.push(`int ${varName}Size = ${rows.length};`);
    decls.push(`int ${varName}ColSize[] = {${colSizes.join(', ')}};`);
    return { decls, passArgs: [varName, `${varName}Size`, `${varName}ColSize`] };
  }
  if (pyType === 'List[List[str]]') {
    const rows = Array.isArray(val) ? val : [];
    if (rows.length === 0) {
      return {
        decls: [`char*** ${varName} = NULL;`, `int ${varName}Size = 0;`, `int* ${varName}ColSize = NULL;`],
        passArgs: [varName, `${varName}Size`, `${varName}ColSize`]
      };
    }
    const decls: string[] = [];
    const ptrNames: string[] = [];
    const colSizes: number[] = [];
    rows.forEach((r: any, rIdx: number) => {
      const safeRow = Array.isArray(r) ? r : [];
      colSizes.push(safeRow.length);
      const rVar = `__row_${varName}_${rIdx}`;
      if (safeRow.length === 0) {
        decls.push(`char** ${rVar} = NULL;`);
      } else {
        decls.push(`char* ${rVar}[] = {${safeRow.map((x) => escapeCString(String(x))).join(', ')}};`);
      }
      ptrNames.push(rVar);
    });
    decls.push(`char** ${varName}[] = {${ptrNames.join(', ')}};`);
    decls.push(`int ${varName}Size = ${rows.length};`);
    decls.push(`int ${varName}ColSize[] = {${colSizes.join(', ')}};`);
    return { decls, passArgs: [varName, `${varName}Size`, `${varName}ColSize`] };
  }
  return { decls: [`int ${varName} = ${Math.trunc(Number(val) || 0)};`], passArgs: [varName] };
}

function extractRunnerMetrics(
  stdout: string,
  fallbackExecMs: number,
  fallbackPeakKb: number
): { cleanStdout: string; execMs: number; peakMemoryKb: number } {
  const metricsMatch = stdout.match(/\n?__PM_METRICS__=(\{[^\n]+\})\s*$/);
  if (!metricsMatch) {
    return { cleanStdout: stdout, execMs: fallbackExecMs, peakMemoryKb: fallbackPeakKb };
  }
  const cleanStdout = stdout.slice(0, metricsMatch.index).trimEnd();
  try {
    const parsed = JSON.parse(metricsMatch[1]);
    const execMs = typeof parsed.execMs === 'number' && parsed.execMs >= 0 ? Math.max(1, Math.round(parsed.execMs)) : fallbackExecMs;
    const peakMemoryKb =
      typeof parsed.peakMemoryKb === 'number' && parsed.peakMemoryKb > 0
        ? Math.round(parsed.peakMemoryKb)
        : fallbackPeakKb;
    return { cleanStdout, execMs, peakMemoryKb };
  } catch {
    return { cleanStdout, execMs: fallbackExecMs, peakMemoryKb: fallbackPeakKb };
  }
}

function parseMarkedRunnerOutput(
  stdout: string,
  safeCases: PolyglotJudgeCase[],
  unorderedReturn: boolean
) {
  const results: any[] = [];
  for (let i = 0; i < safeCases.length; i += 1) {
    const tc = safeCases[i];
    const inputDisplay = (tc.inputs || []).map((inp) => `${inp.name} = ${inp.value}`).join('\n');
    const markerStart = `__PM_CASE_${i}_START__`;
    const markerVal = `__PM_CASE_${i}_VAL__`;
    const markerEnd = `__PM_CASE_${i}_END__`;
    const sIdx = stdout.indexOf(markerStart);
    const vIdx = stdout.indexOf(markerVal);
    const eIdx = stdout.indexOf(markerEnd);

    if (sIdx === -1 || vIdx === -1 || eIdx === -1) {
      results.push({
        id: tc.id || `case-${i + 1}`,
        label: tc.label || `Case ${i + 1}`,
        passed: false,
        inputDisplay,
        stdout: '',
        actualOutput: '',
        expectedOutput: tc.hasExpected ? tc.expectedDisplay : '(custom case)',
        error: 'Process exited before completing testcase'
      });
      continue;
    }

    const caseStdout = stdout.slice(sIdx + markerStart.length, vIdx).trim();
    const rawJson = stdout.slice(vIdx + markerVal.length, eIdx).trim();
    const actualVal = parseJsonSafe(rawJson);
    const hasExpected = Boolean(tc.hasExpected);
    let passed = true;
    if (hasExpected) {
      const expVal = parseJsonSafe(tc.expectedDisplay);
      passed = deepEqual(actualVal, expVal, unorderedReturn);
    }

    results.push({
      id: tc.id || `case-${i + 1}`,
      label: tc.label || `Case ${i + 1}`,
      passed,
      inputDisplay,
      stdout: caseStdout,
      actualOutput: rawJson,
      expectedOutput: hasExpected ? tc.expectedDisplay : '(custom case)',
      error: null
    });
  }
  return results;
}

export interface CompiledJudgeResult {
  verdict: string;
  passedCount: number;
  totalCount: number;
  runtimeMs: number;
  compileTimeMs?: number;
  memoryUsedMb?: number;
  peakMemoryKb?: number;
  complexity: ComplexityEstimate;
  telemetry?: ExecutionTelemetryPayload;
  cases: any[];
  errorLine?: number;
  errorMessage?: string | null;
}

export async function judgeCompiledLanguage({
  language,
  code,
  methodName,
  params: providedParams,
  returnType: providedReturn,
  unorderedReturn,
  dataStructureKind,
  expectedPrintSubstring,
  testCases,
  timeoutMs
}: {
  language: 'java' | 'c' | 'cpp';
  code: string;
  methodName: string;
  params?: ParamTypeSpec[];
  returnType?: { py: string; js?: string };
  unorderedReturn: boolean;
  dataStructureKind: string | null;
  expectedPrintSubstring: string;
  testCases: PolyglotJudgeCase[];
  timeoutMs: number;
}): Promise<CompiledJudgeResult> {
  const startTime = Date.now();
  const safeCases = Array.isArray(testCases) ? testCases : [];
  const complexity = analyzeStaticComplexity(language, code, methodName);
  const { params, pyReturn } = resolveParamTypes(safeCases, providedParams, providedReturn, dataStructureKind);

  // If standalone program with main() and no Solution/target method, execute directly as script
  const hasMain =
    language === 'java'
      ? /\bpublic\s+static\s+void\s+main\s*\(/.test(code)
      : /\bint\s+main\s*\(/.test(code);
  const hasSolutionOrMethod =
    (language !== 'c' && /\bclass\s+Solution\b/.test(code)) ||
    new RegExp(`\\b${methodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\(`).test(code);

  if (hasMain && !hasSolutionOrMethod) {
    const execRes = await executeStandaloneNativeScript(language, code, timeoutMs);
    const elapsed = execRes.executionTimeMs || Math.max(1, Date.now() - startTime);
    if (!execRes.success) {
      const lineMatch = execRes.error?.match(/Line (\d+)/);
      return {
        verdict: execRes.error?.startsWith('CompileError')
          ? 'Compile Error'
          : execRes.error?.includes('timed out')
          ? 'Time Limit Exceeded'
          : 'Runtime Error',
        passedCount: 0,
        totalCount: 1,
        runtimeMs: elapsed,
        compileTimeMs: execRes.compileTimeMs,
        memoryUsedMb: execRes.memoryUsedMb,
        peakMemoryKb: execRes.peakMemoryKb,
        complexity,
        telemetry: execRes.telemetry,
        cases: [],
        errorLine: lineMatch ? parseInt(lineMatch[1], 10) : 1,
        errorMessage: execRes.error
      };
    }
    const expStr = String(expectedPrintSubstring || safeCases[0]?.expectedDisplay || '').trim();
    const normExp = expStr.replace(/^["']|["']$/g, '').toLowerCase();
    const passed = normExp ? execRes.output.toLowerCase().includes(normExp) : execRes.output.length > 0;
    return {
      verdict: passed ? 'Accepted' : 'Wrong Answer',
      passedCount: passed ? 1 : 0,
      totalCount: 1,
      runtimeMs: elapsed,
      compileTimeMs: execRes.compileTimeMs,
      memoryUsedMb: execRes.memoryUsedMb,
      peakMemoryKb: execRes.peakMemoryKb,
      complexity,
      telemetry: execRes.telemetry,
      cases: [
        {
          id: 'script-1',
          label: 'Program Output',
          passed,
          inputDisplay: safeCases[0]?.inputs?.map((i) => `${i.name} = ${i.value}`).join(', ') || '(main)',
          stdout: execRes.output,
          actualOutput: execRes.output,
          expectedOutput: expStr || '(non-empty output)',
          error: null,
          runtimeMs: elapsed
        }
      ]
    };
  }

  // ===== C++ JUDGE =====
  if (language === 'cpp') {
    if (!EXTRA_RUNTIMES.cpp) {
      return {
        verdict: 'Runtime Error',
        passedCount: 0,
        totalCount: safeCases.length,
        runtimeMs: 0,
        complexity,
        cases: [],
        errorLine: 1,
        errorMessage: 'G++ (C++17) runtime is unavailable in this environment.'
      };
    }

    return withTempDir(async (dir) => {
      const hasClassSolution = /\bclass\s+Solution\b/.test(code);
      const caseBlocks = safeCases
        .map((tc, idx) => {
          const inputs = tc.inputs || [];
          const decls = inputs.map((inp, pIdx) => {
            const pSpec = params[pIdx] || { name: inp.name, pyType: inferPyTypeFromVal(parseJsonSafe(inp.value)) };
            return buildCppArgDecl(pSpec.pyType, `__arg_${idx}_${pIdx}`, parseJsonSafe(inp.value));
          });
          const argNames = inputs.map((_, pIdx) => `__arg_${idx}_${pIdx}`);
          const invTarget = hasClassSolution ? `__sol.${methodName}(${argNames.join(', ')})` : `${methodName}(${argNames.join(', ')})`;
          const safeMethodCpp = methodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const usesVoidReturn = new RegExp(`\\bvoid\\s+${safeMethodCpp}\\s*\\(`).test(code);

          return `  {
    cout << "__PM_CASE_${idx}_START__\\n";
    ${decls.join('\n    ')}
    ${
      usesVoidReturn && argNames.length > 0
        ? `${invTarget};\n    cout << "\\n__PM_CASE_${idx}_VAL__\\n" << __pmJson(${argNames[0]}) << "\\n__PM_CASE_${idx}_END__\\n";`
        : `auto __res_${idx} = ${invTarget};\n    cout << "\\n__PM_CASE_${idx}_VAL__\\n" << __pmJson(__res_${idx}) << "\\n__PM_CASE_${idx}_END__\\n";`
    }
  }`;
        })
        .join('\n');

      const cppSource = `${cppNodePreamble(code)}
#line 1 "solution.cpp"
${code}

#line 10000 "harness.cpp"
static ListNode* __pmArrToList(const vector<int>& arr) {
  ListNode dummy(0);
  ListNode* curr = &dummy;
  for (int v : arr) { curr->next = new ListNode(v); curr = curr->next; }
  return dummy.next;
}
static TreeNode* __pmArrToTree(const vector<int>& arr) {
  if (arr.empty() || arr[0] == INT_MIN) return nullptr;
  TreeNode* root = new TreeNode(arr[0]);
  queue<TreeNode*> q;
  q.push(root);
  size_t i = 1;
  while (!q.empty() && i < arr.size()) {
    TreeNode* n = q.front(); q.pop();
    if (i < arr.size() && arr[i] != INT_MIN) { n->left = new TreeNode(arr[i]); q.push(n->left); }
    i++;
    if (i < arr.size() && arr[i] != INT_MIN) { n->right = new TreeNode(arr[i]); q.push(n->right); }
    i++;
  }
  return root;
}
static string __pmEscape(const string& s) {
  string out = "\\"";
  for (char c : s) {
    if (c == '\\\\') out += "\\\\\\\\";
    else if (c == '\\"') out += "\\\\\\"";
    else if (c == '\\n') out += "\\\\n";
    else out += c;
  }
  out += "\\"";
  return out;
}
static string __pmJson(int v) { return to_string(v); }
static string __pmJson(long long v) { return to_string(v); }
static string __pmJson(double v) { ostringstream oss; oss << v; return oss.str(); }
static string __pmJson(bool v) { return v ? "true" : "false"; }
static string __pmJson(const string& s) { return __pmEscape(s); }
template <typename T>
static string __pmJson(const vector<T>& vec) {
  string out = "[";
  for (size_t i = 0; i < vec.size(); i++) {
    if (i > 0) out += ",";
    out += __pmJson(vec[i]);
  }
  out += "]";
  return out;
}
static string __pmJson(ListNode* head) {
  string out = "[";
  unordered_set<ListNode*> seen;
  bool first = true;
  int guard = 0;
  while (head && !seen.count(head) && guard++ < 5000) {
    seen.insert(head);
    if (!first) out += ",";
    first = false;
    out += to_string(head->val);
    head = head->next;
  }
  out += "]";
  return out;
}
static string __pmJson(TreeNode* root) {
  if (!root) return "[]";
  vector<string> items;
  queue<TreeNode*> q;
  q.push(root);
  while (!q.empty() && items.size() < 5000) {
    TreeNode* n = q.front(); q.pop();
    if (n) {
      items.push_back(to_string(n->val));
      q.push(n->left);
      q.push(n->right);
    } else {
      items.push_back("null");
    }
  }
  while (!items.empty() && items.back() == "null") items.pop_back();
  string out = "[";
  for (size_t i = 0; i < items.size(); i++) {
    if (i > 0) out += ",";
    out += items[i];
  }
  out += "]";
  return out;
}
static long __pmReadProcMemoryKb(void) {
  long hwm = 0, rss = 0;
  FILE* f = fopen("/proc/self/status", "r");
  if (f) {
    char buf[256];
    while (fgets(buf, sizeof(buf), f)) {
      long v = 0;
      if (sscanf(buf, "VmHWM: %ld kB", &v) == 1 && v > 0) hwm = v;
      else if (sscanf(buf, "VmRSS: %ld kB", &v) == 1 && v > 0) rss = v;
    }
    fclose(f);
  }
  if (hwm > 0) return hwm;
  if (rss > 0) return rss;
  struct rusage __pmRu;
  getrusage(RUSAGE_SELF, &__pmRu);
  return __pmRu.ru_maxrss > 0 ? __pmRu.ru_maxrss : 3200;
}
int main() {
  auto __pmT0 = std::chrono::steady_clock::now();
${hasClassSolution ? '  Solution __sol;\n' : ''}${caseBlocks}
  auto __pmT1 = std::chrono::steady_clock::now();
  long long __pmExecMs = std::chrono::duration_cast<std::chrono::milliseconds>(__pmT1 - __pmT0).count();
  long __pmPeakKb = __pmReadProcMemoryKb();
  cout << "\\n__PM_METRICS__={\\"execMs\\":" << __pmExecMs << ",\\"peakMemoryKb\\":" << __pmPeakKb << "}\\n";
  return 0;
}
`;

      fs.writeFileSync(path.join(dir, 'main.cpp'), cppSource, 'utf-8');
      const compileStart = Date.now();
      const comp = await runCommandWithTimeout('g++', ['-O2', '-std=c++17', 'main.cpp', '-o', 'main'], dir, 7000);
      const compileTimeMs = Date.now() - compileStart;
      if (comp.code !== 0) {
        const d = parseGccDiagnostic(comp.stderr, 'solution.cpp');
        return {
          verdict: 'Compile Error',
          passedCount: 0,
          totalCount: safeCases.length,
          runtimeMs: Date.now() - startTime,
          compileTimeMs,
          memoryUsedMb: 0,
          peakMemoryKb: 0,
          complexity,
          telemetry: buildTelemetrySnapshot({
            executionTimeMs: Date.now() - startTime,
            compileTimeMs,
            peakMemoryKb: 1,
            timeoutLimitMs: timeoutMs,
            engine: 'G++ C++17 Compiler'
          }),
          cases: [],
          errorLine: d.line,
          errorMessage: d.message
        };
      }

      const runStart = Date.now();
      const run = await runCommandWithTimeout('./main', [], dir, timeoutMs);
      const runWallMs = Math.max(1, Date.now() - runStart);
      const { cleanStdout, execMs, peakMemoryKb } = extractRunnerMetrics(run.stdout, runWallMs, 3200);
      const telemetry = buildTelemetrySnapshot({
        executionTimeMs: execMs,
        compileTimeMs,
        peakMemoryKb,
        timeoutLimitMs: timeoutMs,
        engine: 'G++ C++17 Native Binary'
      });

      if (run.timedOut) {
        return {
          verdict: 'Time Limit Exceeded',
          passedCount: 0,
          totalCount: safeCases.length,
          runtimeMs: timeoutMs,
          compileTimeMs,
          memoryUsedMb: telemetry.memoryUsedMb,
          peakMemoryKb: telemetry.peakMemoryKb,
          complexity,
          telemetry,
          cases: [],
          errorLine: 1,
          errorMessage: `Time Limit Exceeded (${timeoutMs}ms)`
        };
      }
      if (run.code !== 0) {
        return {
          verdict: 'Runtime Error',
          passedCount: 0,
          totalCount: safeCases.length,
          runtimeMs: telemetry.executionTimeMs,
          compileTimeMs,
          memoryUsedMb: telemetry.memoryUsedMb,
          peakMemoryKb: telemetry.peakMemoryKb,
          complexity,
          telemetry,
          cases: parseMarkedRunnerOutput(cleanStdout, safeCases, unorderedReturn),
          errorLine: 1,
          errorMessage: run.stderr.trim() || `Runtime crash (signal: ${run.signal || run.code})`
        };
      }
      const cases = parseMarkedRunnerOutput(cleanStdout, safeCases, unorderedReturn);
      const passedCount = cases.filter((c) => c.passed).length;
      return {
        verdict: passedCount === cases.length && cases.length > 0 ? 'Accepted' : 'Wrong Answer',
        passedCount,
        totalCount: cases.length,
        runtimeMs: telemetry.executionTimeMs,
        compileTimeMs,
        memoryUsedMb: telemetry.memoryUsedMb,
        peakMemoryKb: telemetry.peakMemoryKb,
        complexity,
        telemetry,
        cases
      };
    });
  }

  // ===== C JUDGE =====
  if (language === 'c') {
    if (!EXTRA_RUNTIMES.c) {
      return {
        verdict: 'Runtime Error',
        passedCount: 0,
        totalCount: safeCases.length,
        runtimeMs: 0,
        complexity,
        cases: [],
        errorLine: 1,
        errorMessage: 'GCC (C11) runtime is unavailable in this environment.'
      };
    }

    return withTempDir(async (dir) => {
      const usesVoidReturn = new RegExp(`\\bvoid\\s+${methodName}\\s*\\(`).test(code);
      const caseBlocks = safeCases
        .map((tc, idx) => {
          const inputs = tc.inputs || [];
          const allDecls: string[] = [];
          const callArgs: string[] = [];
          inputs.forEach((inp, pIdx) => {
            const pSpec = params[pIdx] || { name: inp.name, pyType: inferPyTypeFromVal(parseJsonSafe(inp.value)) };
            const setup = buildCArgSetup(pSpec.pyType, `__arg_${idx}_${pIdx}`, parseJsonSafe(inp.value));
            allDecls.push(...setup.decls);
            callArgs.push(...setup.passArgs);
          });

          let execAndPrint = '';
          if (usesVoidReturn && inputs.length > 0) {
            execAndPrint = `    ${methodName}(${callArgs.join(', ')});
    printf("\\n__PM_CASE_${idx}_VAL__\\n");
    __pmPrintIntArr(__arg_${idx}_0, __arg_${idx}_0Size);`;
          } else if (pyReturn === 'int') {
            execAndPrint = `    int __ret = ${methodName}(${callArgs.join(', ')});
    printf("\\n__PM_CASE_${idx}_VAL__\\n%d", __ret);`;
          } else if (pyReturn === 'float') {
            execAndPrint = `    double __ret = ${methodName}(${callArgs.join(', ')});
    printf("\\n__PM_CASE_${idx}_VAL__\\n%g", __ret);`;
          } else if (pyReturn === 'bool') {
            execAndPrint = `    bool __ret = ${methodName}(${callArgs.join(', ')});
    printf("\\n__PM_CASE_${idx}_VAL__\\n%s", __ret ? "true" : "false");`;
          } else if (pyReturn === 'str') {
            execAndPrint = `    char* __ret = ${methodName}(${callArgs.join(', ')});
    printf("\\n__PM_CASE_${idx}_VAL__\\n");
    __pmPrintJsonStr(__ret);`;
          } else if (pyReturn === 'List[int]') {
            callArgs.push('&__retSize');
            execAndPrint = `    int __retSize = 0;
    int* __ret = ${methodName}(${callArgs.join(', ')});
    printf("\\n__PM_CASE_${idx}_VAL__\\n");
    __pmPrintIntArr(__ret, __retSize);`;
          } else if (pyReturn === 'List[str]') {
            callArgs.push('&__retSize');
            execAndPrint = `    int __retSize = 0;
    char** __ret = ${methodName}(${callArgs.join(', ')});
    printf("\\n__PM_CASE_${idx}_VAL__\\n");
    __pmPrintStrArr(__ret, __retSize);`;
          } else if (pyReturn === 'List[List[int]]') {
            callArgs.push('&__retSize', '&__retCols');
            execAndPrint = `    int __retSize = 0;
    int* __retCols = NULL;
    int** __ret = ${methodName}(${callArgs.join(', ')});
    printf("\\n__PM_CASE_${idx}_VAL__\\n");
    __pmPrintInt2D(__ret, __retSize, __retCols);`;
          } else if (pyReturn === 'Optional[ListNode]') {
            execAndPrint = `    struct ListNode* __ret = ${methodName}(${callArgs.join(', ')});
    printf("\\n__PM_CASE_${idx}_VAL__\\n");
    __pmPrintList(__ret);`;
          } else if (pyReturn === 'Optional[TreeNode]') {
            execAndPrint = `    struct TreeNode* __ret = ${methodName}(${callArgs.join(', ')});
    printf("\\n__PM_CASE_${idx}_VAL__\\n");
    __pmPrintTree(__ret);`;
          } else {
            execAndPrint = `    int __ret = ${methodName}(${callArgs.join(', ')});
    printf("\\n__PM_CASE_${idx}_VAL__\\n%d", __ret);`;
          }

          return `  {
    printf("__PM_CASE_${idx}_START__\\n");
    ${allDecls.join('\n    ')}
${execAndPrint}
    printf("\\n__PM_CASE_${idx}_END__\\n");
  }`;
        })
        .join('\n');

      const cSource = `${cNodePreamble(code)}
static struct ListNode* __pmArrToList(int* arr, int n) {
  struct ListNode dummy = {0, NULL};
  struct ListNode* curr = &dummy;
  for (int i = 0; i < n; i++) {
    struct ListNode* node = (struct ListNode*)malloc(sizeof(struct ListNode));
    node->val = arr[i]; node->next = NULL;
    curr->next = node; curr = node;
  }
  return dummy.next;
}
static struct TreeNode* __pmArrToTree(int* arr, int n) {
  if (n == 0 || arr[0] == INT_MIN) return NULL;
  struct TreeNode* root = (struct TreeNode*)malloc(sizeof(struct TreeNode));
  root->val = arr[0]; root->left = NULL; root->right = NULL;
  struct TreeNode** q = (struct TreeNode**)malloc(sizeof(struct TreeNode*) * (n + 4));
  int head = 0, tail = 0;
  q[tail++] = root;
  int i = 1;
  while (head < tail && i < n) {
    struct TreeNode* cur = q[head++];
    if (i < n && arr[i] != INT_MIN) {
      cur->left = (struct TreeNode*)malloc(sizeof(struct TreeNode));
      cur->left->val = arr[i]; cur->left->left = NULL; cur->left->right = NULL;
      q[tail++] = cur->left;
    }
    i++;
    if (i < n && arr[i] != INT_MIN) {
      cur->right = (struct TreeNode*)malloc(sizeof(struct TreeNode));
      cur->right->val = arr[i]; cur->right->left = NULL; cur->right->right = NULL;
      q[tail++] = cur->right;
    }
    i++;
  }
  free(q);
  return root;
}
static void __pmPrintJsonStr(const char* s) {
  if (!s) { printf("null"); return; }
  putchar('"');
  for (int i = 0; s[i]; i++) {
    if (s[i] == '\\\\') printf("\\\\\\\\");
    else if (s[i] == '"') printf("\\\\\\"");
    else if (s[i] == '\\n') printf("\\\\n");
    else putchar(s[i]);
  }
  putchar('"');
}
static void __pmPrintIntArr(int* arr, int n) {
  putchar('[');
  for (int i = 0; i < n; i++) { if (i > 0) putchar(','); printf("%d", arr[i]); }
  putchar(']');
}
static void __pmPrintStrArr(char** arr, int n) {
  putchar('[');
  for (int i = 0; i < n; i++) { if (i > 0) putchar(','); __pmPrintJsonStr(arr[i]); }
  putchar(']');
}
static void __pmPrintInt2D(int** arr, int rows, int* cols) {
  putchar('[');
  for (int r = 0; r < rows; r++) {
    if (r > 0) putchar(',');
    __pmPrintIntArr(arr[r], cols ? cols[r] : 0);
  }
  putchar(']');
}
static void __pmPrintList(struct ListNode* head) {
  putchar('[');
  int count = 0;
  while (head && count++ < 5000) {
    if (count > 1) putchar(',');
    printf("%d", head->val);
    head = head->next;
  }
  putchar(']');
}
static void __pmPrintTree(struct TreeNode* root) {
  if (!root) { printf("[]"); return; }
  struct TreeNode* q[5005];
  int vals[5005];
  int isNull[5005];
  int head = 0, tail = 0, len = 0;
  q[tail++] = root;
  while (head < tail && len < 5000) {
    struct TreeNode* n = q[head++];
    if (n) {
      vals[len] = n->val; isNull[len] = 0; len++;
      if (tail < 5004) q[tail++] = n->left;
      if (tail < 5004) q[tail++] = n->right;
    } else {
      isNull[len++] = 1;
    }
  }
  while (len > 0 && isNull[len - 1]) len--;
  putchar('[');
  for (int i = 0; i < len; i++) {
    if (i > 0) putchar(',');
    if (isNull[i]) printf("null");
    else printf("%d", vals[i]);
  }
  putchar(']');
}
#line 1 "solution.c"
${code}

#line 10000 "harness.c"
static long __pmReadProcMemoryKb(void) {
  long hwm = 0, rss = 0;
  FILE* f = fopen("/proc/self/status", "r");
  if (f) {
    char buf[256];
    while (fgets(buf, sizeof(buf), f)) {
      long v = 0;
      if (sscanf(buf, "VmHWM: %ld kB", &v) == 1 && v > 0) hwm = v;
      else if (sscanf(buf, "VmRSS: %ld kB", &v) == 1 && v > 0) rss = v;
    }
    fclose(f);
  }
  if (hwm > 0) return hwm;
  if (rss > 0) return rss;
  struct rusage __pmRu;
  getrusage(RUSAGE_SELF, &__pmRu);
  return __pmRu.ru_maxrss > 0 ? __pmRu.ru_maxrss : 2400;
}
int main(void) {
  struct timespec __pmT0, __pmT1;
  timespec_get(&__pmT0, TIME_UTC);
${caseBlocks}
  timespec_get(&__pmT1, TIME_UTC);
  long long __pmExecMs = (long long)((__pmT1.tv_sec - __pmT0.tv_sec) * 1000LL + (__pmT1.tv_nsec - __pmT0.tv_nsec) / 1000000LL);
  long __pmPeakKb = __pmReadProcMemoryKb();
  printf("\\n__PM_METRICS__={\\"execMs\\":%lld,\\"peakMemoryKb\\":%ld}\\n", __pmExecMs, __pmPeakKb);
  return 0;
}
`;

      fs.writeFileSync(path.join(dir, 'main.c'), cSource, 'utf-8');
      const compileStart = Date.now();
      const comp = await runCommandWithTimeout('gcc', ['-O2', '-std=c11', 'main.c', '-lm', '-o', 'main'], dir, 6000);
      const compileTimeMs = Date.now() - compileStart;
      if (comp.code !== 0) {
        const d = parseGccDiagnostic(comp.stderr, 'solution.c');
        return {
          verdict: 'Compile Error',
          passedCount: 0,
          totalCount: safeCases.length,
          runtimeMs: Date.now() - startTime,
          compileTimeMs,
          memoryUsedMb: 0,
          peakMemoryKb: 0,
          complexity,
          telemetry: buildTelemetrySnapshot({
            executionTimeMs: Date.now() - startTime,
            compileTimeMs,
            peakMemoryKb: 1,
            timeoutLimitMs: timeoutMs,
            engine: 'GCC C11 Compiler'
          }),
          cases: [],
          errorLine: d.line,
          errorMessage: d.message
        };
      }

      const runStart = Date.now();
      const run = await runCommandWithTimeout('./main', [], dir, timeoutMs);
      const runWallMs = Math.max(1, Date.now() - runStart);
      const { cleanStdout, execMs, peakMemoryKb } = extractRunnerMetrics(run.stdout, runWallMs, 2400);
      const telemetry = buildTelemetrySnapshot({
        executionTimeMs: execMs,
        compileTimeMs,
        peakMemoryKb,
        timeoutLimitMs: timeoutMs,
        engine: 'GCC C11 Native Binary'
      });

      if (run.timedOut) {
        return {
          verdict: 'Time Limit Exceeded',
          passedCount: 0,
          totalCount: safeCases.length,
          runtimeMs: timeoutMs,
          compileTimeMs,
          memoryUsedMb: telemetry.memoryUsedMb,
          peakMemoryKb: telemetry.peakMemoryKb,
          complexity,
          telemetry,
          cases: [],
          errorLine: 1,
          errorMessage: `Time Limit Exceeded (${timeoutMs}ms)`
        };
      }
      if (run.code !== 0) {
        return {
          verdict: 'Runtime Error',
          passedCount: 0,
          totalCount: safeCases.length,
          runtimeMs: telemetry.executionTimeMs,
          compileTimeMs,
          memoryUsedMb: telemetry.memoryUsedMb,
          peakMemoryKb: telemetry.peakMemoryKb,
          complexity,
          telemetry,
          cases: parseMarkedRunnerOutput(cleanStdout, safeCases, unorderedReturn),
          errorLine: 1,
          errorMessage: run.stderr.trim() || `Runtime crash (signal: ${run.signal || run.code})`
        };
      }
      const cases = parseMarkedRunnerOutput(cleanStdout, safeCases, unorderedReturn);
      const passedCount = cases.filter((c) => c.passed).length;
      return {
        verdict: passedCount === cases.length && cases.length > 0 ? 'Accepted' : 'Wrong Answer',
        passedCount,
        totalCount: cases.length,
        runtimeMs: telemetry.executionTimeMs,
        compileTimeMs,
        memoryUsedMb: telemetry.memoryUsedMb,
        peakMemoryKb: telemetry.peakMemoryKb,
        complexity,
        telemetry,
        cases
      };
    });
  }

  // ===== JAVA JUDGE =====
  if (!EXTRA_RUNTIMES.java) {
    return {
      verdict: 'Runtime Error',
      passedCount: 0,
      totalCount: safeCases.length,
      runtimeMs: 0,
      complexity,
      cases: [],
      errorLine: 1,
      errorMessage: 'Java JDK (javac/java) is unavailable in this environment.'
    };
  }

  return withTempDir(async (dir) => {
    const javacFiles: string[] = [];
    if (!/\bclass\s+ListNode\b/.test(code)) {
      fs.writeFileSync(
        path.join(dir, 'ListNode.java'),
        'public class ListNode { public int val; public ListNode next; public ListNode() {} public ListNode(int v) { val = v; } public ListNode(int v, ListNode n) { val = v; next = n; } }\n',
        'utf-8'
      );
      javacFiles.push('ListNode.java');
    }
    if (!/\bclass\s+TreeNode\b/.test(code)) {
      fs.writeFileSync(
        path.join(dir, 'TreeNode.java'),
        'public class TreeNode { public int val; public TreeNode left; public TreeNode right; public TreeNode() {} public TreeNode(int v) { val = v; } public TreeNode(int v, TreeNode l, TreeNode r) { val = v; left = l; right = r; } }\n',
        'utf-8'
      );
      javacFiles.push('TreeNode.java');
    }

    const { source: solSource, headerLines } = buildJavaSolutionFile(code);
    fs.writeFileSync(path.join(dir, 'Solution.java'), solSource, 'utf-8');
    javacFiles.push('Solution.java', 'Main.java');

    const safeMethodJava = methodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const usesVoidReturn = new RegExp(`\\bvoid\\s+${safeMethodJava}\\s*\\(`).test(code);
    const javaTypeForVoid = (pt: string) => {
      if (pt === 'List[int]') return 'int[]';
      if (pt === 'List[str]') return 'String[]';
      if (pt === 'List[List[int]]') return 'int[][]';
      if (pt === 'Optional[ListNode]') return 'ListNode';
      if (pt === 'Optional[TreeNode]') return 'TreeNode';
      return 'Object';
    };
    const caseCalls = safeCases
      .map((tc, idx) => {
        const inputs = tc.inputs || [];
        const argsCode = inputs.map((inp, pIdx) => {
          const pSpec = params[pIdx] || { name: inp.name, pyType: inferPyTypeFromVal(parseJsonSafe(inp.value)) };
          return {
            pyType: pSpec.pyType,
            expr: buildJavaArgExpr(pSpec.pyType, parseJsonSafe(inp.value))
          };
        });
        const declFirst = argsCode.length > 0 ? `${javaTypeForVoid(argsCode[0].pyType)} __arg0_${idx} = ${argsCode[0].expr};` : '';
        const invokeArgs = argsCode
          .map((a, i) => (i === 0 && usesVoidReturn ? `__arg0_${idx}` : a.expr))
          .join(', ');

        return `    {
      ByteArrayOutputStream __baos = new ByteArrayOutputStream();
      PrintStream __oldOut = System.out;
      System.setOut(new PrintStream(__baos));
      ${usesVoidReturn && argsCode.length > 0 ? declFirst : ''}
      try {
        ${
          usesVoidReturn && argsCode.length > 0
            ? `__sol.${methodName}(${invokeArgs});\n        System.setOut(__oldOut);\n        System.out.println("__PM_CASE_${idx}_START__");\n        System.out.print(__baos.toString());\n        System.out.println("\\n__PM_CASE_${idx}_VAL__");\n        System.out.println(__pmJson(__arg0_${idx}));`
            : `Object __ret = __sol.${methodName}(${invokeArgs});\n        System.setOut(__oldOut);\n        System.out.println("__PM_CASE_${idx}_START__");\n        System.out.print(__baos.toString());\n        System.out.println("\\n__PM_CASE_${idx}_VAL__");\n        System.out.println(__pmJson(__ret));`
        }
      } finally {
        System.setOut(__oldOut);
      }
      System.out.println("__PM_CASE_${idx}_END__");
    }`;
      })
      .join('\n');

    const mainJava = `import java.util.*;
import java.io.*;

public class Main {
  static ListNode __pmArrToList(int[] arr) {
    ListNode dummy = new ListNode(0);
    ListNode curr = dummy;
    for (int v : arr) { curr.next = new ListNode(v); curr = curr.next; }
    return dummy.next;
  }
  static TreeNode __pmArrToTree(Integer[] arr) {
    if (arr.length == 0 || arr[0] == null) return null;
    TreeNode root = new TreeNode(arr[0]);
    Queue<TreeNode> q = new ArrayDeque<>();
    q.offer(root);
    int i = 1;
    while (!q.isEmpty() && i < arr.length) {
      TreeNode n = q.poll();
      if (i < arr.length && arr[i] != null) { n.left = new TreeNode(arr[i]); q.offer(n.left); }
      i++;
      if (i < arr.length && arr[i] != null) { n.right = new TreeNode(arr[i]); q.offer(n.right); }
      i++;
    }
    return root;
  }
  static String __pmEscape(String s) {
    StringBuilder sb = new StringBuilder("\\"");
    for (int i = 0; i < s.length(); i++) {
      char c = s.charAt(i);
      if (c == '\\\\') sb.append("\\\\\\\\");
      else if (c == '"') sb.append("\\\\\\"");
      else if (c == '\\n') sb.append("\\\\n");
      else sb.append(c);
    }
    sb.append("\\"");
    return sb.toString();
  }
  static String __pmJson(Object obj) {
    if (obj == null) return "null";
    if (obj instanceof Boolean || obj instanceof Number) return String.valueOf(obj);
    if (obj instanceof String) return __pmEscape((String) obj);
    if (obj instanceof int[]) {
      int[] a = (int[]) obj;
      StringBuilder sb = new StringBuilder("[");
      for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(","); sb.append(a[i]); }
      return sb.append("]").toString();
    }
    if (obj instanceof double[]) {
      double[] a = (double[]) obj;
      StringBuilder sb = new StringBuilder("[");
      for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(","); sb.append(a[i]); }
      return sb.append("]").toString();
    }
    if (obj instanceof String[]) {
      String[] a = (String[]) obj;
      StringBuilder sb = new StringBuilder("[");
      for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(","); sb.append(__pmEscape(a[i])); }
      return sb.append("]").toString();
    }
    if (obj instanceof int[][]) {
      int[][] a = (int[][]) obj;
      StringBuilder sb = new StringBuilder("[");
      for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(","); sb.append(__pmJson(a[i])); }
      return sb.append("]").toString();
    }
    if (obj instanceof Object[]) {
      Object[] a = (Object[]) obj;
      StringBuilder sb = new StringBuilder("[");
      for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(","); sb.append(__pmJson(a[i])); }
      return sb.append("]").toString();
    }
    if (obj instanceof List<?>) {
      List<?> list = (List<?>) obj;
      StringBuilder sb = new StringBuilder("[");
      for (int i = 0; i < list.size(); i++) { if (i > 0) sb.append(","); sb.append(__pmJson(list.get(i))); }
      return sb.append("]").toString();
    }
    if (obj instanceof ListNode) {
      ListNode curr = (ListNode) obj;
      Set<ListNode> seen = Collections.newSetFromMap(new IdentityHashMap<>());
      StringBuilder sb = new StringBuilder("[");
      boolean first = true;
      int guard = 0;
      while (curr != null && seen.add(curr) && guard++ < 5000) {
        if (!first) sb.append(",");
        first = false;
        sb.append(curr.val);
        curr = curr.next;
      }
      return sb.append("]").toString();
    }
    if (obj instanceof TreeNode) {
      TreeNode root = (TreeNode) obj;
      List<String> items = new ArrayList<>();
      Queue<TreeNode> q = new LinkedList<>();
      q.offer(root);
      while (!q.isEmpty() && items.size() < 5000) {
        TreeNode n = q.poll();
        if (n != null) {
          items.add(String.valueOf(n.val));
          q.offer(n.left);
          q.offer(n.right);
        } else {
          items.add("null");
        }
      }
      while (!items.isEmpty() && items.get(items.size() - 1).equals("null")) items.remove(items.size() - 1);
      return "[" + String.join(",", items) + "]";
    }
    return __pmEscape(String.valueOf(obj));
  }

  public static void main(String[] args) throws Exception {
    long __pmT0 = System.nanoTime();
    Solution __sol = new Solution();
${caseCalls}
    long __pmExecMs = Math.max(1L, Math.round((System.nanoTime() - __pmT0) / 1_000_000.0));
    long __pmHeapUsed = Math.max(0L, Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory());
    long __pmPeakKb = Math.max(1L, __pmHeapUsed / 1024L);
    System.out.println("\\n__PM_METRICS__={\\"execMs\\":" + __pmExecMs + ",\\"peakMemoryKb\\":" + __pmPeakKb + "}");
  }
}
`;

    fs.writeFileSync(path.join(dir, 'Main.java'), mainJava, 'utf-8');
    const compileStart = Date.now();
    const comp = await runCommandWithTimeout(
      'javac',
      ['-Xlint:none', ...javacFiles],
      dir,
      7000
    );
    const compileTimeMs = Date.now() - compileStart;
    if (comp.code !== 0) {
      const d = parseJavacDiagnostic(comp.stderr, 'Solution.java', headerLines);
      return {
        verdict: 'Compile Error',
        passedCount: 0,
        totalCount: safeCases.length,
        runtimeMs: Date.now() - startTime,
        compileTimeMs,
        memoryUsedMb: 0,
        peakMemoryKb: 0,
        complexity,
        telemetry: buildTelemetrySnapshot({
          executionTimeMs: Date.now() - startTime,
          compileTimeMs,
          peakMemoryKb: 1,
          memoryLimitMb: 128,
          timeoutLimitMs: timeoutMs,
          engine: 'OpenJDK 17 javac'
        }),
        cases: [],
        errorLine: d.line,
        errorMessage: d.message
      };
    }

    const runStart = Date.now();
    const run = await runCommandWithTimeout('java', ['-Xmx128m', 'Main'], dir, timeoutMs);
    const runWallMs = Math.max(1, Date.now() - runStart);
    const { cleanStdout, execMs, peakMemoryKb } = extractRunnerMetrics(run.stdout, runWallMs, 16384);
    const telemetry = buildTelemetrySnapshot({
      executionTimeMs: execMs,
      compileTimeMs,
      peakMemoryKb,
      memoryLimitMb: 128,
      timeoutLimitMs: timeoutMs,
      engine: 'OpenJDK 17 JVM'
    });

    if (run.timedOut) {
      return {
        verdict: 'Time Limit Exceeded',
        passedCount: 0,
        totalCount: safeCases.length,
        runtimeMs: timeoutMs,
        compileTimeMs,
        memoryUsedMb: telemetry.memoryUsedMb,
        peakMemoryKb: telemetry.peakMemoryKb,
        complexity,
        telemetry,
        cases: [],
        errorLine: 1,
        errorMessage: `Time Limit Exceeded (${timeoutMs}ms)`
      };
    }
    if (run.code !== 0) {
      const lineMatch = run.stderr.match(/Solution\.java:(\d+)/);
      return {
        verdict: 'Runtime Error',
        passedCount: 0,
        totalCount: safeCases.length,
        runtimeMs: telemetry.executionTimeMs,
        compileTimeMs,
        memoryUsedMb: telemetry.memoryUsedMb,
        peakMemoryKb: telemetry.peakMemoryKb,
        complexity,
        telemetry,
        cases: parseMarkedRunnerOutput(cleanStdout, safeCases, unorderedReturn),
        errorLine: lineMatch ? Math.max(1, parseInt(lineMatch[1], 10) - headerLines) : 1,
        errorMessage: run.stderr.trim() || 'Java Runtime Error'
      };
    }
    const cases = parseMarkedRunnerOutput(cleanStdout, safeCases, unorderedReturn);
    const passedCount = cases.filter((c) => c.passed).length;
    return {
      verdict: passedCount === cases.length && cases.length > 0 ? 'Accepted' : 'Wrong Answer',
      passedCount,
      totalCount: cases.length,
      runtimeMs: telemetry.executionTimeMs,
      compileTimeMs,
      memoryUsedMb: telemetry.memoryUsedMb,
      peakMemoryKb: telemetry.peakMemoryKb,
      complexity,
      telemetry,
      cases
    };
  });
}
