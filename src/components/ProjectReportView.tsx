import React, { useState } from 'react';
import { ROADMAP_MILESTONES, TEAM_MEMBERS } from '../data/team';
import { 
  BookOpen, 
  CheckCircle2, 
  HelpCircle, 
  Presentation, 
  ListChecks, 
  FileText, 
  Terminal, 
  Sparkles, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export const ProjectReportView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'summary' | 'mentor' | 'demoscript' | 'roadmap'>('summary');

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="p-5 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <span>Infotact Solutions — PolyglotMesh Final Project Report</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Team 6 Engineering Documentation, Mentor Approval Gates, and Presentation Demo Script.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveSection('summary')}
            className={`px-3 py-1.5 font-medium rounded-md transition-all ${
              activeSection === 'summary' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Executive Summary
          </button>
          <button
            onClick={() => setActiveSection('roadmap')}
            className={`px-3 py-1.5 font-medium rounded-md transition-all ${
              activeSection === 'roadmap' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            4-Week Milestones
          </button>
          <button
            onClick={() => setActiveSection('mentor')}
            className={`px-3 py-1.5 font-medium rounded-md transition-all ${
              activeSection === 'mentor' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mentor Approvals
          </button>
          <button
            onClick={() => setActiveSection('demoscript')}
            className={`px-3 py-1.5 font-medium rounded-md transition-all ${
              activeSection === 'demoscript' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Demo Script
          </button>
        </div>
      </div>

      {/* SECTION 1: EXECUTIVE SUMMARY */}
      {activeSection === 'summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-semibold text-white">Project Objective & Architecture</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                PolyglotMesh is a high-performance, multi-language browser IDE designed for enterprise code evaluation. The system enables developers to write Python 3 and modern JavaScript in a unified editor, dispatch execution across a reactive Spring WebFlux backend, and execute within sandboxed GraalVM Polyglot Contexts.
              </p>
              <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 space-y-1">
                <div>• <strong>Frontend:</strong> React 19, Monaco Editor, Tailwind CSS, real-time telemetry</div>
                <div>• <strong>Backend:</strong> Java 17, Spring Boot 3.2 WebFlux (Netty reactive stack)</div>
                <div>• <strong>Engine:</strong> GraalVM 23.1.2 Polyglot with GraalPy & GraalJS</div>
              </div>
            </div>

            <div className="p-5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-semibold text-white">Security & Reliability Philosophy</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Untrusted code is strictly isolated. We do not claim security based on simple heuristics; instead, GraalVM Context is locked down at the VM layer with zero host access, zero filesystem I/O, no network socket permissions, and an external watchdog deadline timer terminating runaway loops.
              </p>
              <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 space-y-1">
                <div>• <strong>Host Reflection:</strong> <code>HostAccess.NONE</code></div>
                <div>• <strong>Filesystem:</strong> <code>IOAccess.NONE</code></div>
                <div>• <strong>DoS Guard:</strong> 3000ms Watchdog + Statement Limits</div>
              </div>
            </div>
          </div>

          <div className="p-5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-semibold text-white">Known Limitations & Production Path</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-400">
              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <strong className="text-slate-200">1. OS-Level Isolation</strong>
                <p className="mt-1 text-[11px]">While GraalVM context isolates memory and JVM reflection, high-assurance multi-tenant cloud platforms must pair this with container/gVisor sandboxes.</p>
              </div>
              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <strong className="text-slate-200">2. C-Extension Ecosystem</strong>
                <p className="mt-1 text-[11px]">GraalPy supports pure Python libraries out of the box; heavy C-extension wheels (e.g. NumPy, SciPy) require pre-compiled LLVM bitcode.</p>
              </div>
              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <strong className="text-slate-200">3. Persistent Store Decision</strong>
                <p className="mt-1 text-[11px]">In accordance with project guidelines, script persistence uses in-memory thread-safe storage pending mentor approval of PostgreSQL vs SQLite.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: 4-WEEK ROADMAP */}
      {activeSection === 'roadmap' && (
        <div className="space-y-4">
          {ROADMAP_MILESTONES.map((m) => (
            <div key={m.week} className="p-5 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="w-36 shrink-0">
                <span className="text-indigo-400 font-bold text-sm">{m.week}</span>
                <h4 className="text-white font-semibold text-xs mt-0.5">{m.title}</h4>
                <span className={`inline-block mt-2 text-[10px] font-mono px-2 py-0.5 rounded border ${
                  m.status === 'Completed'
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                    : 'bg-amber-950/40 text-amber-400 border-amber-800/60'
                }`}>
                  {m.status}
                </span>
              </div>

              <div className="flex-1 space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Key Milestones & Evidence:</span>
                <ul className="space-y-1 text-xs text-slate-300">
                  {m.deliverables.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SECTION 3: MENTOR APPROVAL GATES */}
      {activeSection === 'mentor' && (
        <div className="space-y-4 p-5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <ListChecks className="w-4 h-4 text-indigo-400" />
            <span>Mentor Approval & Technical Sign-Off Checklist</span>
          </div>

          <div className="space-y-3">
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-200 font-semibold text-xs">1. Sandbox Design & Threat Model Validation</span>
                <span className="text-emerald-400 font-mono text-[11px] bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/60">
                  Ready for Sign-off
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Audited against GraalVM Security Guidelines. Context explicitly disallows host access, IO, native access, environment reads, and command execution. Hard deadline watchdog implemented.
              </p>
            </div>

            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-200 font-semibold text-xs">2. Database & Persistence Architecture</span>
                <span className="text-amber-400 font-mono text-[11px] bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/60">
                  Pending Mentor Agreement
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                <strong>Assumption Label:</strong> Thread-safe in-memory storage currently active for script templates and execution history. R2DBC reactive PostgreSQL driver proposed for non-blocking persistence once mentor approves infrastructure.
              </p>
            </div>

            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-200 font-semibold text-xs">3. GraalVM Native Image Deployment Target</span>
                <span className="text-emerald-400 font-mono text-[11px] bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/60">
                  Empirically Verified
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                42ms startup and 38MB RSS memory verified. <code>pom.xml</code> Native Image profile prepared with <code>--no-fallback</code> flag.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: DEMO SCRIPT */}
      {activeSection === 'demoscript' && (
        <div className="space-y-4 p-5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Presentation className="w-4 h-4 text-purple-400" />
            <span>Infotact Solutions Live Presentation Demo Script</span>
          </div>
          <p className="text-slate-400 text-xs">
            Follow this 4-step sequence during the live mentor review to showcase complete system functionality:
          </p>

          <div className="space-y-3">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2 font-semibold text-indigo-300">
                <span className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-700 flex items-center justify-center text-xs">1</span>
                <span>Scene 1: Polyglot Execution & Monaco IDE (Madhav & Naveen)</span>
              </div>
              <p className="text-slate-400 mt-1 pl-7 text-[11px]">
                "Load template 'Python: Data Transformation & Stats'. Click Run Script. Point out execution duration (12-16ms), stdout in console, and inspect the HTTP POST /api/execute payload in the API tab."
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2 font-semibold text-emerald-300">
                <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-700 flex items-center justify-center text-xs">2</span>
                <span>Scene 2: Security Boundary & Denial Verification (Hariom)</span>
              </div>
              <p className="text-slate-400 mt-1 pl-7 text-[11px]">
                "Switch to Security Probe template. Run script. Show that guest Python code attempting to read /etc/passwd or run system commands is intercepted cleanly with Access Denied. Navigate to the Sandbox Audit tab."
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <span className="w-5 h-5 rounded-full bg-amber-950 border border-amber-700 flex items-center justify-center text-xs">3</span>
                <span>Scene 3: Deadline Watchdog Interruption (Hariom & Madhav)</span>
              </div>
              <p className="text-slate-400 mt-1 pl-7 text-[11px]">
                "Select 'Deadline Test: Infinite Loop Interruption' with a 1000ms deadline. Press Run Script. Demonstrate that the server does not freeze or leak threads; the watchdog terminates the execution exactly after 1000ms."
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2 font-semibold text-sky-300">
                <span className="w-5 h-5 rounded-full bg-sky-950 border border-sky-700 flex items-center justify-center text-xs">4</span>
                <span>Scene 4: Native Image Benchmark & Persistence (Trishul)</span>
              </div>
              <p className="text-slate-400 mt-1 pl-7 text-[11px]">
                "Navigate to the Native Image tab. Review the 42ms cold startup and 82.3% memory reduction results. Open the Script Library modal to demonstrate script persistence and execution history."
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
