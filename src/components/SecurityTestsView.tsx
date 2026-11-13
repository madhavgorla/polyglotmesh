import React, { useState } from 'react';
import { AutomatedTestCase } from '../types';
import { ShieldCheck, Play, Loader2, CheckCircle2, XCircle, Lock, RefreshCw } from 'lucide-react';

const TEST_CASES: AutomatedTestCase[] = [
  {
    id: 'test-1',
    name: '01. Valid Python Execution',
    language: 'python',
    description: 'Verifies arithmetic and standard output in Python 3.',
    code: 'val = sum([1, 2, 3, 4, 5])\nprint(f"Computed sum: {val}")',
    expectedStatus: 'success',
    expectedMatch: 'Computed sum: 15'
  },
  {
    id: 'test-2',
    name: '02. Valid JavaScript Execution',
    language: 'javascript',
    description: 'Verifies array reduction and console.log in JavaScript.',
    code: 'const nums = [10, 20, 30];\nconsole.log("Reduced product:", nums.reduce((a, b) => a * b, 1));',
    expectedStatus: 'success',
    expectedMatch: 'Reduced product: 6000'
  },
  {
    id: 'test-3',
    name: '03. Ruby Runtime Availability Report',
    language: 'ruby',
    description: 'Verifies honest failure message with setup instructions when Ruby runtime is not installed.',
    code: 'puts "Hello Ruby"',
    expectedStatus: 'runtime_unavailable',
    expectedMatch: 'Runtime Unavailable'
  },
  {
    id: 'test-4',
    name: '04. Python Syntax Error Handling',
    language: 'python',
    description: 'Validates syntax errors return success=false with readable error trace.',
    code: 'def bad_syntax(:\n    pass',
    expectedStatus: 'error',
    expectedMatch: 'SyntaxError'
  },
  {
    id: 'test-5',
    name: '05. JavaScript Runtime Error Handling',
    language: 'javascript',
    description: 'Validates runtime reference errors are trapped safely without server crash.',
    code: 'const result = missingGlobalVariable.callSomething();',
    expectedStatus: 'error',
    expectedMatch: 'not defined'
  },
  {
    id: 'test-6',
    name: '06. Unsupported Language Rejection',
    language: 'haskell',
    description: 'Validates unsupported languages are rejected with HTTP 400 Bad Request.',
    code: 'main = putStrLn "Hello"',
    expectedStatus: 'rejected',
    expectedMatch: 'Unsupported language'
  },
  {
    id: 'test-7',
    name: '07. Execution Deadline & Timeout Interruption',
    language: 'javascript',
    description: 'Validates infinite loops are interrupted cleanly by the watchdog deadline.',
    code: 'while (true) {}',
    expectedStatus: 'timeout',
    expectedMatch: 'timed out'
  },
  {
    id: 'test-8',
    name: '08. Restricted Host Process & File Access',
    language: 'python',
    description: 'Verifies security policy blocks host subprocess execution.',
    code: 'import subprocess\nsubprocess.run(["ls"])',
    expectedStatus: 'error',
    expectedMatch: 'SecurityPolicyViolation'
  }
];

export const SecurityTestsView: React.FC = () => {
  const [testResults, setTestResults] = useState<{ [id: string]: { status: 'idle' | 'running' | 'passed' | 'failed'; message: string; durationMs: number } }>({});
  const [isRunningAll, setIsRunningAll] = useState(false);

  const runTest = async (test: AutomatedTestCase) => {
    setTestResults(prev => ({
      ...prev,
      [test.id]: { status: 'running', message: 'Executing test...', durationMs: 0 }
    }));

    const startTime = Date.now();
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: test.language,
          code: test.code,
          timeoutMs: test.expectedStatus === 'timeout' ? 900 : 3000
        })
      });

      const data = await res.json();
      const elapsed = Date.now() - startTime;

      let passed = false;
      let note = '';

      if (test.expectedStatus === 'success') {
        passed = data.success === true && (data.output?.includes(test.expectedMatch) || false);
        note = passed ? `Matched "${test.expectedMatch}"` : `Mismatch: ${data.output || data.error}`;
      } else if (test.expectedStatus === 'error' || test.expectedStatus === 'runtime_unavailable') {
        passed = data.success === false && ((data.error?.toLowerCase().includes(test.expectedMatch.toLowerCase())) || false);
        note = passed ? `Caught expected response (${test.expectedMatch})` : `Unexpected response: ${data.error || data.output}`;
      } else if (test.expectedStatus === 'rejected') {
        passed = res.status === 400 || (data.error && data.error.includes('Unsupported language'));
        note = passed ? 'Rejected with HTTP 400 Bad Request' : 'Did not reject invalid language';
      } else if (test.expectedStatus === 'timeout') {
        passed = data.success === false && (data.error?.toLowerCase().includes('timed out') || false);
        note = passed ? `Interrupted by deadline after ${elapsed}ms` : 'Failed to enforce timeout';
      }

      setTestResults(prev => ({
        ...prev,
        [test.id]: {
          status: passed ? 'passed' : 'failed',
          message: note,
          durationMs: elapsed
        }
      }));
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [test.id]: {
          status: 'failed',
          message: `HTTP Error: ${err.message}`,
          durationMs: Date.now() - startTime
        }
      }));
    }
  };

  const runAllTests = async () => {
    setIsRunningAll(true);
    for (const test of TEST_CASES) {
      await runTest(test);
    }
    setIsRunningAll(false);
  };

  const passedCount = Object.values(testResults).filter(r => r.status === 'passed').length;
  const totalRun = Object.values(testResults).filter(r => r.status === 'passed' || r.status === 'failed').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900/80 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Automated Security Sandbox & Contract Verification Suite</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Live integration tests executed directly against POST /api/execute.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {totalRun > 0 && (
            <span className="text-xs text-slate-300 font-mono tabular-nums">
              Passed: <strong className="text-emerald-400">{passedCount} / {TEST_CASES.length}</strong>
            </span>
          )}

          <button
            onClick={runAllTests}
            disabled={isRunningAll}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {isRunningAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>Execute All {TEST_CASES.length} Tests</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {TEST_CASES.map((test) => {
          const res = testResults[test.id];
          return (
            <div
              key={test.id}
              className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-3 text-xs">
                  <h4 className="text-sm font-semibold text-white">{test.name}</h4>
                  <span className="font-mono text-slate-400">{test.language}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-400 font-mono">expected: {test.expectedStatus}</span>
                </div>
                <p className="text-xs text-slate-400">{test.description}</p>

                {res && (
                  <div className={`mt-2 p-2 rounded text-[11px] font-mono flex items-center gap-2 ${
                    res.status === 'passed' ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50' :
                    res.status === 'failed' ? 'bg-rose-950/40 text-rose-300 border border-rose-800/50' :
                    'bg-slate-950 text-slate-400'
                  }`}>
                    {res.status === 'passed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    {res.status === 'failed' && <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                    {res.status === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />}
                    <span className="truncate">{res.message}</span>
                    {res.durationMs > 0 && <span className="ml-auto text-slate-400 tabular-nums">{res.durationMs} ms</span>}
                  </div>
                )}
              </div>

              <button
                onClick={() => runTest(test)}
                disabled={res?.status === 'running' || isRunningAll}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className="w-3 h-3 text-slate-400" />
                <span>Run Test</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Honest Security Limitations Disclosure */}
      <div className="p-5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-3 text-xs">
        <div className="flex items-center gap-2 text-white font-semibold text-sm">
          <Lock className="w-4 h-4 text-emerald-400" />
          <span>Sandbox Security Architecture & Verified Limitations</span>
        </div>
        <p className="text-slate-400 leading-relaxed">
          The Java 21 backend builds a fresh GraalVM <code className="text-slate-300 font-mono">Context</code> per request with <code className="text-slate-300 font-mono">HostAccess.NONE</code>, <code className="text-slate-300 font-mono">IOAccess.NONE</code>, <code className="text-slate-300 font-mono">EnvironmentAccess.NONE</code>, disabled process/thread creation, and <code className="text-slate-300 font-mono">ResourceLimits.statementLimit</code> paired with a scheduled watchdog calling <code className="text-slate-300 font-mono">context.close(true)</code>. Thread interruption alone cannot reliably halt untrusted CPU-bound native execution; therefore, <code className="text-slate-300 font-mono">docker-compose.yml</code> enforces OS-level container memory/CPU caps, read-only rootfs, and <code className="text-slate-300 font-mono">cap_drop: ALL</code> for defense-in-depth.
        </p>
      </div>
    </div>
  );
};
