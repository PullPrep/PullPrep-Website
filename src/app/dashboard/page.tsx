import Link from "next/link";

export default function Dashboard() {
  // Mock recent sessions
  const recentSessions = [
    { id: 1, scenario: "Havoc DH Opener", date: "Today, 10:12 AM", accuracy: 96, speed: "262ms", score: "S" },
    { id: 2, scenario: "Proc Reaction Drill", date: "Yesterday, 8:40 PM", accuracy: 88, speed: "348ms", score: "A" },
    { id: 3, scenario: "Havoc DH Opener", date: "Jun 12, 4:15 PM", accuracy: 84, speed: "410ms", score: "B" },
    { id: 4, scenario: "Proc Reaction Drill", date: "Jun 11, 2:10 PM", accuracy: 92, speed: "298ms", score: "A" },
    { id: 5, scenario: "Havoc DH Opener", date: "Jun 10, 11:30 AM", accuracy: 78, speed: "490ms", score: "C" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col relative">
      {/* Decorative Blur */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-violet-900/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
                <span className="font-bold text-white text-lg tracking-wider">P</span>
              </div>
              <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-50 to-zinc-400">
                PULLPREP<span className="text-violet-500">.COM</span>
              </span>
            </Link>
          </div>
          <nav className="flex items-center space-x-6">
            <Link
              href="/"
              className="text-sm font-semibold text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Home
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

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8 relative z-10">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Player Dashboard</h1>
            <p className="text-zinc-400 text-sm">Monitor your muscle memory progress and manage character configurations.</p>
          </div>
          <div className="flex space-x-3">
            <button className="px-4 py-2 text-xs font-bold bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-not-allowed">
              Export Keybinds Addon
            </button>
            <Link
              href="/train"
              className="px-5 py-2.5 text-xs font-black bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg shadow-md shadow-violet-500/10 active:scale-95 transition-all"
            >
              Launch Practice Simulator
            </Link>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Character & Build Setup (Left Col) */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Character Card */}
            <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-2xl relative overflow-hidden backdrop-blur-sm">
              <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center space-x-4 mb-6">
                {/* Spec Icon Avatar */}
                <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-emerald-600 to-zinc-900 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                  <span className="font-extrabold text-emerald-400 text-lg">DH</span>
                </div>
                <div>
                  <h2 className="font-black text-lg text-white">IllidariPro</h2>
                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-900/60 text-[10px] text-emerald-400 font-extrabold tracking-wide">
                    HAVOC DEMON HUNTER
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-zinc-850 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-bold uppercase">Active Spec</span>
                  <span className="text-zinc-200 font-semibold">Havoc (Rotational Core)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-bold uppercase">Action Bars</span>
                  <span className="text-zinc-200 font-semibold">4 Active Spells</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-bold uppercase">Import Status</span>
                  <span className="text-zinc-400 font-semibold italic">Predefined MVP Template</span>
                </div>
              </div>
            </div>

            {/* Imported Builds List */}
            <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-2xl backdrop-blur-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-sm text-white uppercase tracking-wider">Character Setups</h3>
                <span className="text-[10px] font-extrabold text-violet-400">1 IMPORTED</span>
              </div>

              <div className="space-y-3">
                <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-850/80 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-violet-500" />
                    <div>
                      <span className="font-bold text-xs block text-white">Default DH Spec</span>
                      <span className="text-[10px] text-zinc-500">Imported 1 hour ago</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-1.5 py-0.5 rounded">
                    ACTIVE
                  </span>
                </div>

                <div className="p-3.5 border border-dashed border-zinc-800 rounded-xl text-center cursor-not-allowed group hover:border-zinc-700 transition-colors">
                  <span className="text-xs text-zinc-500 group-hover:text-zinc-400 font-bold block">
                    + Import New WoW Build
                  </span>
                  <span className="text-[9px] text-zinc-600 block mt-1">Requires Addon String (Future Release)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Practice History & Chart (Right Col) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Accuracy Over Time Graphic Chart */}
            <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-2xl backdrop-blur-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-white uppercase tracking-wider">Accuracy Improvement History</h3>
                  <span className="text-xs text-zinc-400">Your performance curve over the last 5 sessions</span>
                </div>
                <div className="flex items-center space-x-3 text-xs">
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                    <span className="text-zinc-400">Opener Drill</span>
                  </span>
                </div>
              </div>

              {/* Custom SVG Line Chart */}
              <div className="w-full bg-zinc-950/40 rounded-xl border border-zinc-850/50 p-4 relative">
                <svg className="w-full h-44 overflow-visible" viewBox="0 0 500 150">
                  {/* Grid Lines */}
                  <line x1="0" y1="30" x2="500" y2="30" stroke="#1f1f2e" strokeWidth="1" strokeDasharray="4" />
                  <line x1="0" y1="75" x2="500" y2="75" stroke="#1f1f2e" strokeWidth="1" strokeDasharray="4" />
                  <line x1="0" y1="120" x2="500" y2="120" stroke="#1f1f2e" strokeWidth="1" strokeDasharray="4" />

                  {/* SVG Gradient */}
                  <defs>
                    <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Gradient Area Fill */}
                  <path
                    d="M 10,123 L 130,111 L 250,87 L 370,45 L 490,21 L 490,150 L 10,150 Z"
                    fill="url(#chart-grad)"
                  />

                  {/* Smooth Line Path */}
                  <path
                    d="M 10,123 L 130,111 L 250,87 L 370,45 L 490,21"
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Data Point Circles */}
                  <circle cx="10" cy="123" r="5" fill="#fafafa" stroke="#8b5cf6" strokeWidth="2" />
                  <circle cx="130" cy="111" r="5" fill="#fafafa" stroke="#8b5cf6" strokeWidth="2" />
                  <circle cx="250" cy="87" r="5" fill="#fafafa" stroke="#8b5cf6" strokeWidth="2" />
                  <circle cx="370" cy="45" r="5" fill="#fafafa" stroke="#8b5cf6" strokeWidth="2" />
                  <circle cx="490" cy="21" r="5" fill="#fafafa" stroke="#8b5cf6" strokeWidth="2" />

                  {/* Text values */}
                  <text x="10" y="142" fill="#71717a" fontSize="10" fontWeight="bold" textAnchor="middle">Session 1</text>
                  <text x="130" y="142" fill="#71717a" fontSize="10" fontWeight="bold" textAnchor="middle">Session 2</text>
                  <text x="250" y="142" fill="#71717a" fontSize="10" fontWeight="bold" textAnchor="middle">Session 3</text>
                  <text x="370" y="142" fill="#71717a" fontSize="10" fontWeight="bold" textAnchor="middle">Session 4</text>
                  <text x="490" y="142" fill="#71717a" fontSize="10" fontWeight="bold" textAnchor="end">Session 5</text>

                  <text x="15" y="118" fill="#a855f7" fontSize="10" fontWeight="extrabold">78%</text>
                  <text x="135" y="106" fill="#a855f7" fontSize="10" fontWeight="extrabold">84%</text>
                  <text x="255" y="82" fill="#a855f7" fontSize="10" fontWeight="extrabold">88%</text>
                  <text x="375" y="40" fill="#a855f7" fontSize="10" fontWeight="extrabold">92%</text>
                  <text x="480" y="16" fill="#a855f7" fontSize="10" fontWeight="extrabold">96%</text>
                </svg>
              </div>
            </div>

            {/* Recent Training Sessions */}
            <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-2xl backdrop-blur-sm space-y-4">
              <h3 className="font-black text-sm text-white uppercase tracking-wider">Recent Sessions</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-850 text-zinc-500 uppercase font-black tracking-wider">
                      <th className="pb-3 font-bold">Scenario Drill</th>
                      <th className="pb-3 font-bold">Date & Time</th>
                      <th className="pb-3 font-bold text-center">Accuracy</th>
                      <th className="pb-3 font-bold text-center">Reaction Speed</th>
                      <th className="pb-3 font-bold text-right">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {recentSessions.map((session) => (
                      <tr key={session.id} className="hover:bg-zinc-900/20 transition-colors">
                        <td className="py-3 font-extrabold text-white">{session.scenario}</td>
                        <td className="py-3 text-zinc-400">{session.date}</td>
                        <td className="py-3 text-center">
                          <span className={`font-extrabold ${session.accuracy >= 90 ? 'text-emerald-400' : session.accuracy >= 80 ? 'text-amber-400' : 'text-rose-400'}`}>
                            {session.accuracy}%
                          </span>
                        </td>
                        <td className="py-3 text-center text-zinc-300 font-mono">{session.speed}</td>
                        <td className="py-3 text-right">
                          <span className={`inline-block font-black px-2 py-0.5 rounded text-[10px] ${
                            session.score === 'S' ? 'bg-violet-950 text-violet-400 border border-violet-900' :
                            session.score === 'A' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                            session.score === 'B' ? 'bg-amber-950 text-amber-400 border border-amber-900' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                            {session.score}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
