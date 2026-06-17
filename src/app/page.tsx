"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  WOW_CLASSES_SPECS,
  generateDefaultBuild
} from "@/lib/trainingEngine";

interface Session {
  loggedIn: boolean;
  user: {
    id: number;
    battletag: string;
  } | null;
}

interface ImportedButton {
  slot: number;
  type: string;
  id: number;
  name: string;
  key: string;
  icon: number;
}

interface ImportedBar {
  barName: string;
  buttons: ImportedButton[];
}

interface ImportedBuild {
  class: string;
  spec: string;
  actionBars: ImportedBar[];
}

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Addon Import States
  const [importString, setImportString] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Preset Selector States
  const [showPresets, setShowPresets] = useState(false);
  const [selectedClass, setSelectedClass] = useState("Demon Hunter");
  const [selectedSpec, setSelectedSpec] = useState("Havoc");

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        setSession(data);
      } catch (e) {
        console.error("Failed to fetch session", e);
      } finally {
        setIsLoadingSession(false);
      }
    }
    checkSession();
  }, []);

  const handleClassChange = (className: string) => {
    setSelectedClass(className);
    const cls = WOW_CLASSES_SPECS.find(c => c.name === className);
    const firstSpec = cls && cls.specs.length > 0 ? cls.specs[0] : "";
    setSelectedSpec(firstSpec);
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSuccess(false);

    if (!importString.trim()) {
      setErrorMessage("Please paste an export string first.");
      return;
    }

    try {
      const decoded = atob(importString.trim());
      const parsed = JSON.parse(decoded) as ImportedBuild;

      if (!parsed.class || !parsed.spec || !Array.isArray(parsed.actionBars)) {
        throw new Error("Invalid structure");
      }

      localStorage.setItem("pullprep_active_build", JSON.stringify(parsed));
      setIsSuccess(true);
      setTimeout(() => {
        router.push("/train");
      }, 800);
    } catch (e) {
      setErrorMessage("Failed to parse. Copy the exact code from /pp in-game.");
    }
  };

  const handleTrainPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClass && selectedSpec) {
      const defaultBuild = generateDefaultBuild(selectedClass, selectedSpec);
      localStorage.setItem("pullprep_active_build", JSON.stringify(defaultBuild));
      router.push("/train");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 overflow-hidden relative">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-900/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-900/10 blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <span className="font-bold text-white text-lg tracking-wider">P</span>
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-50 to-zinc-400">
              PULLPREP<span className="text-violet-500">.COM</span>
            </span>
          </div>
          <nav className="flex items-center space-x-6">
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Dashboard
            </Link>

            {isLoadingSession ? (
              <div className="w-24 h-7 bg-zinc-900 rounded-lg animate-pulse" />
            ) : session?.loggedIn ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1.5 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs font-bold text-zinc-300 font-mono">
                    {session.user?.battletag}
                  </span>
                </div>
                <a
                  href="/api/auth/logout"
                  className="text-xs font-extrabold text-rose-500 hover:text-rose-450 transition-colors uppercase tracking-wider"
                >
                  Sign Out
                </a>
              </div>
            ) : (
              <a
                href="/api/auth/login"
                className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-all shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-95"
              >
                <span>Battle.net Login</span>
              </a>
            )}

            <Link
              href="/train"
              className="px-4 py-2 text-sm font-bold text-zinc-950 bg-white rounded-lg hover:bg-zinc-200 active:scale-95 transition-all shadow-md shadow-white/5"
            >
              Start Training
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow flex flex-col justify-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
            {/* Promo Badge */}
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-semibold text-violet-400 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              <span>Aim Lab for World of Warcraft</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-white">
              Master Your Rotation <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-emerald-400">
                Before The Pull.
              </span>
            </h1>

            <p className="text-zinc-400 text-lg sm:text-xl max-w-2xl mx-auto lg:mx-0 font-medium">
              Train your opener, cooldown timings, and proc reactions using your actual WoW keybinds. Build the muscle memory to execute flawlessly under pressure.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link
                href="/train"
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-lg shadow-violet-500/25 active:scale-98 transition-all flex items-center justify-center space-x-2 text-base"
              >
                <span>Start Training</span>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                  />
                </svg>
              </Link>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-8 py-4 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-bold rounded-xl active:scale-98 transition-all flex items-center justify-center"
              >
                Go to Dashboard
              </Link>
            </div>

            {/* Quick Metrics */}
            <div className="pt-8 border-t border-zinc-900 flex flex-wrap justify-center lg:justify-start gap-8 sm:gap-12">
              <div>
                <span className="block text-2xl font-black text-white">0.25s</span>
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Target Reaction Time
                </span>
              </div>
              <div>
                <span className="block text-2xl font-black text-white">100%</span>
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Keybind Familiarity
                </span>
              </div>
              <div>
                <span className="block text-2xl font-black text-white">0ms</span>
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  GCD Downtime
                </span>
              </div>
            </div>
          </div>

          {/* Quick Import Console Card */}
          <div className="lg:col-span-5 relative flex justify-center items-center">
            <div className="w-full max-w-[440px] rounded-3xl bg-zinc-900/60 border border-zinc-800/80 p-6 shadow-2xl relative backdrop-blur-md overflow-hidden flex flex-col space-y-4 shadow-[0_0_50px_-12px_rgba(139,92,246,0.15)]">
              {/* Grid Decorative overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e_1px,transparent_1px)] bg-[size:24px_24px] opacity-10 pointer-events-none" />

              {/* Title Section */}
              <div className="flex items-center justify-between border-b border-zinc-850 pb-3 relative z-10">
                <span className="text-xs font-black text-violet-400 tracking-wider uppercase flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                  <span>Import & Train</span>
                </span>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-950 px-2 py-0.5 rounded border border-zinc-900">
                  WoW Addon
                </span>
              </div>

              {/* Addon Promotion Box */}
              <div className="bg-gradient-to-br from-violet-950/20 via-zinc-950 to-indigo-950/10 border border-violet-900/35 rounded-2xl p-4 space-y-2.5 relative z-10">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0 shadow shadow-violet-500/20">
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="size-4.5 text-white">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-white uppercase tracking-wide">
                      1. Install PullPrep Addon
                    </h4>
                    <p className="text-[11px] text-zinc-400 leading-snug">
                      Download the official addon to export your real action bars, keybinds, and spell configs.
                    </p>
                  </div>
                </div>
                <div className="flex pt-1">
                  <a
                    href="https://github.com/PullPrep/PullPrep-Addon"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-center py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-[11px] font-black text-violet-400 rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <svg fill="currentColor" viewBox="0 0 24 24" className="size-3.5">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                    </svg>
                    <span>Download on GitHub</span>
                  </a>
                </div>
              </div>

              {/* Paste Console Form */}
              <form onSubmit={handleImport} className="space-y-3 relative z-10 flex flex-col">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest block">
                    2. Paste /pullprep Export Code
                  </label>
                  <textarea
                    value={importString}
                    onChange={(e) => setImportString(e.target.value)}
                    placeholder="Paste Base64 addon string here..."
                    className="w-full h-24 bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 text-[10px] text-zinc-300 font-mono focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/20 focus:outline-none placeholder-zinc-700 resize-none transition-all"
                  />
                </div>

                {errorMessage && (
                  <p className="text-[10px] text-rose-400 bg-rose-950/20 border border-rose-900/40 p-2 rounded-lg leading-snug">
                    ⚠️ {errorMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSuccess}
                  className={`w-full py-3 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-md ${
                    isSuccess
                      ? "bg-emerald-600 text-white shadow-emerald-500/20"
                      : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-500/15 hover:shadow-violet-500/25 active:scale-98"
                  }`}
                >
                  {isSuccess ? (
                    <>
                      <svg fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="size-4 animate-bounce">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      <span>Success! Loading Simulator...</span>
                    </>
                  ) : (
                    <>
                      <svg fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="size-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                      </svg>
                      <span>Import & Start Training</span>
                    </>
                  )}
                </button>
              </form>

              {/* Try Preset Toggle */}
              <div className="pt-2 border-t border-zinc-850 relative z-10">
                {!showPresets ? (
                  <button
                    type="button"
                    onClick={() => setShowPresets(true)}
                    className="w-full text-center text-[11px] font-bold text-zinc-500 hover:text-zinc-355 transition-colors uppercase tracking-wider py-1"
                  >
                    No addon? Try a default spec preset ▾
                  </button>
                ) : (
                  <div className="space-y-3 bg-zinc-950/30 border border-zinc-850/60 rounded-xl p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide">
                        Select Default Spec Preset
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPresets(false)}
                        className="text-[10px] text-zinc-400 hover:text-zinc-200 uppercase font-black"
                      >
                        Hide ▴
                      </button>
                    </div>
                    <form onSubmit={handleTrainPreset} className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={selectedClass}
                          onChange={(e) => handleClassChange(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-300 focus:border-violet-500 focus:outline-none cursor-pointer"
                        >
                          {WOW_CLASSES_SPECS.map((c) => (
                            <option key={c.key} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={selectedSpec}
                          onChange={(e) => setSelectedSpec(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-300 focus:border-violet-500 focus:outline-none cursor-pointer"
                        >
                          {(WOW_CLASSES_SPECS.find((c) => c.name === selectedClass)?.specs || []).map((spec) => (
                            <option key={spec} value={spec}>
                              {spec}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-[11px] font-black text-zinc-200 rounded-lg transition-all cursor-pointer"
                      >
                        Launch with {selectedSpec} {selectedClass}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* How it Works Section */}
      <section className="border-t border-zinc-900 bg-zinc-950 py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              How It Works
            </h2>
            <p className="text-zinc-400 text-lg">
              Set up your 1:1 muscle memory trainer in three simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-zinc-900/20 border border-zinc-850 p-8 rounded-2xl relative space-y-4">
              <div className="w-10 h-10 rounded-full bg-violet-950/80 border border-violet-800/80 text-violet-400 flex items-center justify-center font-black text-sm shadow">
                1
              </div>
              <h3 className="text-lg font-bold text-white">Download the Addon</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Download the official PullPrep Addon from{" "}
                <a
                  href="https://github.com/PullPrep/PullPrep-Addon"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300 underline font-bold"
                >
                  GitHub
                </a>{" "}
                and place it in your WoW directory at <code className="text-zinc-300 font-mono text-xs">Interface/AddOns/</code>.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-zinc-900/20 border border-zinc-850 p-8 rounded-2xl relative space-y-4">
              <div className="w-10 h-10 rounded-full bg-indigo-950/80 border border-indigo-800/80 text-indigo-400 flex items-center justify-center font-black text-sm shadow">
                2
              </div>
              <h3 className="text-lg font-bold text-white">Export In-Game</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Log into World of Warcraft, type <code className="text-violet-400 font-mono bg-violet-950/45 px-1.5 py-0.5 rounded border border-violet-900/50">/pp</code> or <code className="text-violet-400 font-mono bg-violet-950/45 px-1.5 py-0.5 rounded border border-violet-900/50">/pullprep</code> in your chat console, and copy the generated Base64 layout string.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-zinc-900/20 border border-zinc-850 p-8 rounded-2xl relative space-y-4">
              <div className="w-10 h-10 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-450 flex items-center justify-center font-black text-sm shadow">
                3
              </div>
              <h3 className="text-lg font-bold text-white">Paste and Train</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Paste your configuration string in the import box above. The app will build your bars and keybinds dynamically so you can start practicing!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="border-t border-zinc-900 bg-zinc-950/30 py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Engineered for WoW Competitors
            </h2>
            <p className="text-zinc-400 text-lg">
              We focus 100% on the cognitive mechanics of rotation speed and execution. No gear math, no DPS specs — just muscle memory.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-zinc-900/40 border border-zinc-850 p-8 rounded-2xl hover:border-zinc-800 transition-colors space-y-4 group">
              <div className="w-12 h-12 rounded-xl bg-violet-950/80 border border-violet-800/80 text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Action Bar Recreation</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Matches your real Warcraft spell icons, spell bindings, and bar positions in the browser. Build hand-eye coordination for your key arrangements.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-zinc-900/40 border border-zinc-850 p-8 rounded-2xl hover:border-zinc-800 transition-colors space-y-4 group">
              <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Opener Practice Engine</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Run scripted training sequences (like a 15-second opening burst). Prompts show what to hit next to internalize optimal spell order.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-zinc-900/40 border border-zinc-850 p-8 rounded-2xl hover:border-zinc-800 transition-colors space-y-4 group">
              <div className="w-12 h-12 rounded-xl bg-amber-950/80 border border-amber-800/80 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Scoring & Stats Analysis</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Analyzes key errors, delay in casting major cooldowns, downtime between GCDs, and proc reaction speeds. Get actionable training reports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 bg-zinc-950/60 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs font-semibold text-zinc-500">
          <span>&copy; 2026 PullPrep.com. All rights reserved.</span>
          <span className="mt-2 sm:mt-0">Built for World of Warcraft players who want to excel.</span>
        </div>
      </footer>
    </div>
  );
}
