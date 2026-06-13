import Link from "next/link";

export default function Home() {
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

          {/* Interactive Graphic Representation */}
          <div className="lg:col-span-5 relative flex justify-center items-center">
            <div className="w-full max-w-[420px] aspect-square rounded-3xl bg-zinc-900/50 border border-zinc-800/80 p-6 shadow-2xl relative backdrop-blur-sm overflow-hidden flex flex-col justify-between">
              {/* Grid Decorative overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e_1px,transparent_1px)] bg-[size:24px_24px] opacity-10 pointer-events-none" />

              {/* Graphic Title */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <span className="text-xs font-bold text-zinc-500 tracking-widest uppercase">
                  Active Simulator Feed
                </span>
                <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-red-950/60 border border-red-800/50 text-[10px] text-red-400 font-extrabold tracking-wider animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span>LIVE FEED</span>
                </span>
              </div>

              {/* Central Visualizer */}
              <div className="my-8 flex flex-col items-center justify-center space-y-4 relative py-4">
                <div className="w-24 h-24 rounded-2xl bg-violet-950/40 border-2 border-violet-500 flex flex-col items-center justify-center shadow-lg shadow-violet-500/20 relative z-10 spell-highlight">
                  <div className="w-10 h-10 text-violet-400 flex items-center justify-center">
                    {/* Glowing eye SVG */}
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-black text-violet-300 mt-2 uppercase tracking-wide">
                    Eye Beam
                  </span>
                  <div className="absolute top-1 right-2 px-1 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-white font-extrabold">
                    3
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest block">
                    Next Action Prompt
                  </span>
                  <span className="text-lg font-black text-white tracking-tight">
                    PRESS KEYBIND: <span className="text-violet-400 bg-violet-950/60 border border-violet-900 px-2 py-0.5 rounded font-mono text-xl">3</span>
                  </span>
                </div>
              </div>

              {/* Graphic Stats */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-zinc-800">
                <div className="bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-850 text-center">
                  <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">
                    Accuracy
                  </span>
                  <span className="text-sm font-black text-emerald-400">98.4%</span>
                </div>
                <div className="bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-850 text-center">
                  <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">
                    Speed
                  </span>
                  <span className="text-sm font-black text-zinc-100">0.28s</span>
                </div>
                <div className="bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-850 text-center">
                  <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">
                    Combo
                  </span>
                  <span className="text-sm font-black text-violet-400">18x</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

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
