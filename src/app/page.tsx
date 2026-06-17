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

  // Active Tab State ("preset" or "import")
  const [activeTab, setActiveTab] = useState<"preset" | "import">("preset");

  // Preset Selector States
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
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-amber-500/5 blur-[150px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-violet-900/5 blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 select-none">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <span className="font-serif font-black text-zinc-950 text-base">P</span>
            </div>
            <span className="font-serif font-black text-lg tracking-wider text-amber-500">
              PULLPREP<span className="text-zinc-400">.COM</span>
            </span>
          </div>
          <nav className="flex items-center space-x-6">
            <Link
              href="/dashboard"
              className="text-xs font-bold font-serif uppercase tracking-wider text-zinc-400 hover:text-amber-400 transition-colors"
            >
              Dashboard
            </Link>

            {isLoadingSession ? (
              <div className="w-24 h-7 bg-zinc-900 rounded animate-pulse" />
            ) : session?.loggedIn ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1.5 px-3 py-1 bg-zinc-900/50 border border-zinc-800 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-zinc-300 font-mono">
                    {session.user?.battletag}
                  </span>
                </div>
                <a
                  href="/api/auth/logout"
                  className="text-[10px] font-black text-rose-500 hover:text-rose-450 transition-colors uppercase tracking-wider font-serif"
                >
                  Sign Out
                </a>
              </div>
            ) : (
              <a
                href="/api/auth/login"
                className="flex items-center space-x-1 px-3 py-1.5 text-[10px] font-extrabold font-serif uppercase tracking-wider text-zinc-950 bg-amber-500 hover:bg-amber-400 rounded transition-all active:scale-95"
              >
                <span>Battle.net Login</span>
              </a>
            )}

            <Link
              href="/train"
              className="px-3.5 py-1.5 text-[10px] font-extrabold font-serif uppercase tracking-wider text-zinc-100 border border-zinc-800 hover:border-amber-500/40 rounded active:scale-95 transition-all shadow shadow-white/5"
            >
              Start Training
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col items-center justify-center max-w-4xl mx-auto px-4 py-12 relative z-10 w-full">
        {/* Game Title Header */}
        <div className="text-center space-y-2.5 mb-8 select-none">
          <h1 className="text-4xl sm:text-5xl font-black font-serif tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-400 to-amber-600 drop-shadow-[0_2px_10px_rgba(245,158,11,0.2)] uppercase">
            Rotation Trainer
          </h1>
          <p className="text-zinc-400 text-[11px] sm:text-xs font-bold tracking-widest uppercase max-w-md mx-auto leading-relaxed">
            Aim Lab for World of Warcraft • Internalize your muscle memory
          </p>
        </div>

        {/* Centralized Game Lobby Console */}
        <div className="w-full max-w-2xl rounded-2xl bg-zinc-900/40 border border-zinc-800/80 p-6 sm:p-8 shadow-2xl relative backdrop-blur-md overflow-hidden flex flex-col space-y-6 shadow-[0_0_50px_rgba(245,158,11,0.03)] border-amber-500/10">
          {/* Subtle Grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.03] pointer-events-none" />

          {/* Tab Selection */}
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-900 relative z-10">
            <button
              type="button"
              onClick={() => setActiveTab("preset")}
              className={`flex-1 text-center py-2 text-[10px] sm:text-xs font-black font-serif rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "preset"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow shadow-amber-500/5"
                  : "text-zinc-500 hover:text-zinc-350"
              }`}
            >
              Quick Start Presets
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("import")}
              className={`flex-1 text-center py-2 text-[10px] sm:text-xs font-black font-serif rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "import"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow shadow-amber-500/5"
                  : "text-zinc-500 hover:text-zinc-350"
              }`}
            >
              Import From Addon
            </button>
          </div>

          {activeTab === "preset" ? (
            /* Preset Panel */
            <div className="space-y-6 relative z-10 animate-fade-in-up">
              {/* Class Selector Grid */}
              <div className="space-y-3">
                <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest block text-center">
                  Select Warcraft Class
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {WOW_CLASSES_SPECS.map((c) => {
                    const color = CLASS_COLORS_HEX[c.key] || "#a855f7";
                    const isSelected = selectedClass === c.name;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => handleClassChange(c.name)}
                        className="text-[10px] sm:text-xs font-black uppercase py-2 px-2 rounded-lg border text-center transition-all cursor-pointer truncate"
                        style={{
                          borderColor: isSelected ? color : "rgba(39,39,42,0.5)",
                          color: isSelected ? "#ffffff" : color,
                          backgroundColor: isSelected ? `${color}15` : "transparent",
                          boxShadow: isSelected ? `0 0 10px -2px ${color}` : "none",
                        }}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Specialization Selection Row */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest block text-center">
                  Select Specialization
                </span>
                <div className="flex flex-wrap gap-2 justify-center">
                  {(WOW_CLASSES_SPECS.find((c) => c.name === selectedClass)?.specs || []).map((spec) => {
                    const classKey = WOW_CLASSES_SPECS.find((c) => c.name === selectedClass)?.key || "";
                    const activeColor = CLASS_COLORS_HEX[classKey] || "#a855f7";
                    const isSelected = selectedSpec === spec;
                    return (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => setSelectedSpec(spec)}
                        className="text-[10px] sm:text-xs font-black px-4 py-1.5 rounded-full border transition-all cursor-pointer"
                        style={{
                          borderColor: isSelected ? activeColor : "rgba(39,39,42,0.8)",
                          color: isSelected ? "#ffffff" : "#a1a1aa",
                          backgroundColor: isSelected ? activeColor : "rgba(9,9,11,0.5)",
                          boxShadow: isSelected ? `0 0 12px -3px ${activeColor}` : "none",
                        }}
                      >
                        {spec}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Setup Launch Card */}
              <form onSubmit={handleTrainPreset} className="pt-4 border-t border-zinc-900">
                <div className="border border-zinc-900 bg-zinc-950/45 rounded-xl p-4 text-center space-y-4 relative overflow-hidden">
                  <p className="text-xs font-bold text-zinc-400">
                    Ready to Train:{" "}
                    <span
                      className="font-black font-serif uppercase tracking-widest text-sm"
                      style={{
                        color: CLASS_COLORS_HEX[WOW_CLASSES_SPECS.find((c) => c.name === selectedClass)?.key || ""] || "#a855f7"
                      }}
                    >
                      {selectedSpec} {selectedClass}
                    </span>
                  </p>

                  <button
                    type="submit"
                    className="w-full max-w-xs mx-auto py-3 text-xs font-extrabold font-serif uppercase tracking-wider rounded-xl cursor-pointer active:scale-95 transition-all flex items-center justify-center space-x-2 border"
                    style={{
                      backgroundColor: CLASS_COLORS_HEX[WOW_CLASSES_SPECS.find((c) => c.name === selectedClass)?.key || ""] || "#a855f7",
                      color: "#ffffff",
                      borderColor: CLASS_COLORS_HEX[WOW_CLASSES_SPECS.find((c) => c.name === selectedClass)?.key || ""] || "#a855f7",
                      boxShadow: `0 4px 15px -3px ${CLASS_COLORS_HEX[WOW_CLASSES_SPECS.find((c) => c.name === selectedClass)?.key || ""] || "#a855f7"}40`,
                    }}
                  >
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="size-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                    </svg>
                    <span>Launch Preset Demo</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Import Panel */
            <div className="space-y-4 relative z-10 animate-fade-in-up">
              {/* Addon Link Block */}
              <div className="bg-zinc-950/50 border border-zinc-850 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-extrabold font-serif text-amber-500 uppercase tracking-wider">
                  1. Get the PullPrep Addon
                </h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Download the official addon to export your real character specs, keybind configurations, and action bars from the game.
                </p>
                <a
                  href="https://github.com/PullPrep/PullPrep-Addon"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 text-[10px] font-black uppercase text-amber-500 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  <svg fill="currentColor" viewBox="0 0 24 24" className="size-3.5">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                  </svg>
                  <span>Download on GitHub</span>
                </a>
              </div>

              {/* Paste Form */}
              <form onSubmit={handleImport} className="space-y-4 flex flex-col pt-2">
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest block">
                    2. Paste Export Code
                  </label>
                  <textarea
                    value={importString}
                    onChange={(e) => setImportString(e.target.value)}
                    placeholder="Paste Base64 addon string (copied using /pp in-game)..."
                    className="w-full h-20 bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 text-[10px] text-zinc-300 font-mono focus:border-amber-500/50 focus:outline-none placeholder-zinc-700 resize-none transition-all"
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
                  className={`w-full py-3 text-xs font-black font-serif uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2 border shadow-lg ${
                    isSuccess
                      ? "bg-emerald-600 border-emerald-500 text-white shadow-emerald-500/20"
                      : "bg-amber-500 border-amber-600 hover:bg-amber-400 text-zinc-950 hover:shadow-amber-500/10 active:scale-98"
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
            </div>
          )}
        </div>

        {/* Quest-log style Instruction Footers */}
        <div className="w-full max-w-2xl mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-center select-none">
          <div className="border border-zinc-900 bg-zinc-950/20 p-4 rounded-xl space-y-1">
            <span className="text-[10px] font-black font-serif text-amber-500 uppercase tracking-widest block">
              1. Choose Spec
            </span>
            <p className="text-[11px] text-zinc-500">Pick any WoW class and specialization to run custom defaults instantly.</p>
          </div>
          <div className="border border-zinc-900 bg-zinc-950/20 p-4 rounded-xl space-y-1">
            <span className="text-[10px] font-black font-serif text-amber-500 uppercase tracking-widest block">
              2. Export Addon
            </span>
            <p className="text-[11px] text-zinc-500">Run `/pp` in World of Warcraft to export your exact key bindings.</p>
          </div>
          <div className="border border-zinc-900 bg-zinc-950/20 p-4 rounded-xl space-y-1">
            <span className="text-[10px] font-black font-serif text-amber-500 uppercase tracking-widest block">
              3. Learn Rotation
            </span>
            <p className="text-[11px] text-zinc-500">Internalize reaction timings, proc queues, and optimal openers.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 bg-zinc-950/60 mt-auto text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-zinc-650">
          <span>&copy; 2026 PullPrep.com • Warcraft Rotation Arena</span>
          <span className="mt-2 sm:mt-0">Built for World of Warcraft players who strive to execute flawlessly</span>
        </div>
      </footer>
    </div>
  );
}
