"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  WOW_CLASSES_SPECS,
  generateDefaultBuild,
  CLASS_COLORS_HEX
} from "@/lib/trainingEngine";

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

interface Loadout {
  id: string;
  userId: number;
  name: string;
  class: string;
  spec: string;
  data: string; // base64 config
  createdAt: number;
}

interface Session {
  loggedIn: boolean;
  user: {
    id: number;
    battletag: string;
  } | null;
}

export default function Dashboard() {
  const [activeBuild, setActiveBuild] = useState<ImportedBuild | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>("Demon Hunter");
  const [selectedSpec, setSelectedSpec] = useState<string>("Havoc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [importString, setImportString] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Auth & Loadouts States
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [savedLoadouts, setSavedLoadouts] = useState<Loadout[]>([]);
  const [newLoadoutName, setNewLoadoutName] = useState("");
  const [isSavingLoadout, setIsSavingLoadout] = useState(false);

  // DB-driven Dashboard States
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [progressHistory, setProgressHistory] = useState<any[]>([]);
  const [slowestKeys, setSlowestKeys] = useState<any[]>([]);

  // Fetch session & load active build from localStorage on mount
  useEffect(() => {
    // 1. Load active build
    const saved = localStorage.getItem("pullprep_active_build");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setActiveBuild(parsed);
        setSelectedClass(parsed.class);
        setSelectedSpec(parsed.spec);
      } catch (e) {
        console.error("Failed to parse saved build", e);
      }
    } else {
      setSelectedClass("Demon Hunter");
      setSelectedSpec("Havoc");
      const defaultBuild = generateDefaultBuild("Demon Hunter", "Havoc");
      setActiveBuild(defaultBuild);
      localStorage.setItem("pullprep_active_build", JSON.stringify(defaultBuild));
    }

    // 2. Fetch session and global leaderboard
    fetchLeaderboard();
    checkSession();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.leaderboard);
      }
    } catch (e) {
      console.error("Failed to fetch leaderboard", e);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/sessions");
      const data = await res.json();
      if (data.success) {
        setProgressHistory(data.history || []);
        setSlowestKeys(data.slowestKeys || []);
      }
    } catch (e) {
      console.error("Failed to fetch user progress history", e);
    }
  };

  const handleClassChange = (className: string) => {
    setSelectedClass(className);
    const cls = WOW_CLASSES_SPECS.find(c => c.name === className);
    const firstSpec = cls && cls.specs.length > 0 ? cls.specs[0] : "";
    setSelectedSpec(firstSpec);
    if (className && firstSpec) {
      const newBuild = generateDefaultBuild(className, firstSpec);
      setActiveBuild(newBuild);
      localStorage.setItem("pullprep_active_build", JSON.stringify(newBuild));
    }
  };

  const handleSpecChange = (specName: string) => {
    setSelectedSpec(specName);
    if (selectedClass && specName) {
      const newBuild = generateDefaultBuild(selectedClass, specName);
      setActiveBuild(newBuild);
      localStorage.setItem("pullprep_active_build", JSON.stringify(newBuild));
    }
  };

  const checkSession = async () => {
    setIsLoadingSession(true);
    try {
      const res = await fetch("/api/auth/session");
      const data: Session = await res.json();
      setSession(data);
      if (data.loggedIn) {
        fetchLoadouts();
        fetchDashboardData();
      }
    } catch (e) {
      console.error("Failed to fetch session", e);
    } finally {
      setIsLoadingSession(false);
    }
  };

  const fetchLoadouts = async () => {
    try {
      const res = await fetch("/api/loadouts");
      const data = await res.json();
      if (data.loadouts) {
        setSavedLoadouts(data.loadouts);
      }
    } catch (e) {
      console.error("Failed to fetch loadouts", e);
    }
  };

  const handleImport = () => {
    setErrorMessage("");
    if (!importString.trim()) {
      setErrorMessage("Please paste an export string first.");
      return;
    }

    try {
      // Decode Base64
      const decoded = atob(importString.trim());
      const parsed = JSON.parse(decoded) as ImportedBuild;

      // Validate basic structure
      if (!parsed.class || !parsed.spec || !Array.isArray(parsed.actionBars)) {
        throw new Error("Invalid structure");
      }

      // Save to local storage
      localStorage.setItem("pullprep_active_build", JSON.stringify(parsed));
      setActiveBuild(parsed);
      setSelectedClass(parsed.class);
      setSelectedSpec(parsed.spec);
      setIsModalOpen(false);
      setImportString("");
    } catch (e) {
      setErrorMessage("Failed to parse string. Make sure you copied the entire string from the WoW addon exporter.");
    }
  };

  const handleClearBuild = () => {
    if (confirm("Are you sure you want to clear your active WoW configuration?")) {
      localStorage.removeItem("pullprep_active_build");
      setActiveBuild(null);
    }
  };

  const handleSaveActiveAsLoadout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBuild || !newLoadoutName.trim()) return;

    setIsSavingLoadout(true);
    try {
      const b64 = btoa(JSON.stringify(activeBuild));
      const res = await fetch("/api/loadouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLoadoutName.trim(), data: b64 }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNewLoadoutName("");
        fetchLoadouts();
      } else {
        alert(data.error || "Failed to save loadout");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving character setup");
    } finally {
      setIsSavingLoadout(false);
    }
  };

  const handleSelectLoadout = (loadout: Loadout) => {
    try {
      const decoded = atob(loadout.data);
      const parsed = JSON.parse(decoded) as ImportedBuild;
      localStorage.setItem("pullprep_active_build", JSON.stringify(parsed));
      setActiveBuild(parsed);
      setSelectedClass(parsed.class);
      setSelectedSpec(parsed.spec);
    } catch (e) {
      console.error("Failed to load layout", e);
    }
  };

  const handleDeleteLoadout = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent selecting
    if (!confirm("Are you sure you want to delete this saved loadout?")) return;

    try {
      const res = await fetch(`/api/loadouts/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSavedLoadouts((prev) => prev.filter((l) => l.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to format class display names
  const classColors: Record<string, string> = {
    DEMONHUNTER: "from-emerald-600 to-zinc-900 border-emerald-500/30 text-emerald-400",
    MAGE: "from-sky-600 to-zinc-900 border-sky-500/30 text-sky-400",
    WARRIOR: "from-amber-700 to-zinc-900 border-amber-600/30 text-amber-550",
    ROGUE: "from-yellow-600 to-zinc-900 border-yellow-500/30 text-yellow-400",
    DEATHKNIGHT: "from-red-700 to-zinc-900 border-red-650/30 text-red-500",
    PALADIN: "from-pink-600 to-zinc-900 border-pink-500/30 text-pink-400",
    DRUID: "from-orange-600 to-zinc-900 border-orange-500/30 text-orange-400",
    HUNTER: "from-green-600 to-zinc-900 border-green-500/30 text-green-400",
    PRIEST: "from-zinc-400 to-zinc-900 border-zinc-300/30 text-zinc-100",
    SHAMAN: "from-blue-600 to-zinc-900 border-blue-500/30 text-blue-400",
    WARLOCK: "from-violet-700 to-zinc-900 border-violet-600/30 text-violet-400",
    MONK: "from-teal-600 to-zinc-900 border-teal-500/30 text-teal-400",
    EVOKER: "from-cyan-600 to-zinc-900 border-cyan-500/30 text-cyan-400",
  };

  const currentClassKey = activeBuild?.class?.toUpperCase() || "";
  const currentClassStyle = classColors[currentClassKey] || "from-violet-600 to-zinc-900 border-violet-500/30 text-violet-400";

  // Count total buttons imported
  const totalSpells = activeBuild
    ? activeBuild.actionBars.reduce((sum, bar) => sum + bar.buttons.filter(b => b.type !== "empty").length, 0)
    : 4;

  const isActiveBuildMatch = (loadout: Loadout): boolean => {
    if (!activeBuild) return false;
    // Basic match check: same spec and class, and matching serialized base64 configuration data
    try {
      const decoded = atob(loadout.data);
      const parsed = JSON.parse(decoded) as ImportedBuild;
      return (
        parsed.class.toLowerCase() === activeBuild.class.toLowerCase() &&
        parsed.spec.toLowerCase() === activeBuild.spec.toLowerCase() &&
        parsed.actionBars.length === activeBuild.actionBars.length
      );
    } catch (e) {
      return false;
    }
  };

  const getClassTag = (cls: string) => {
    const key = cls.toUpperCase().replace(/ /g, "");
    return classColors[key] || "from-violet-600 to-zinc-900 border-violet-500/30 text-violet-400";
  };

  const getRecommendation = (key: string, spellName: string) => {
    const keyClean = key.toUpperCase().replace(/(SHIFT-|CTRL-|ALT-)/g, "");
    const easyKeys = ["1", "2", "3", "4", "5", "Q", "W", "E", "R", "T", "A", "S", "D", "F", "G", "Z", "X", "C", "V", "SPACE"];
    if (!easyKeys.includes(keyClean)) {
      return `Key "${key}" is far from movement keys (WASD). Rebind ${spellName} to a closer key like E, Q, R, or F to reduce finger travel and reaction times.`;
    }
    return `Spell ${spellName} on "${key}" is close to WASD but reaction time is high. Consider practicing this transition or mapping it to a more natural finger index slot.`;
  };

  const renderChart = () => {
    if (progressHistory.length === 0) {
      return (
        <div className="h-44 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20 text-center px-4 py-8">
          <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-8 text-zinc-600 mb-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.008 1.24l.885 1.77a2.25 2.25 0 0 0 2.007 1.2411h1.98a2.25 2.25 0 0 0 2.007-1.24l.885-1.77a2.25 2.25 0 0 1 2.007-1.24h3.86m-18 0h18M2.25 13.5v-2.25a2.25 2.25 0 0 1 2.25-2.25h15a2.25 2.25 0 0 1 2.25 2.25v2.25m-18 0A2.25 2.25 0 0 0 2.25 15.75v2.25a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25v-2.25a2.25 2.25 0 0 0-2.25-2.25" />
          </svg>
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wide">No History Recorded</span>
          <p className="text-[10px] text-zinc-500 max-w-xs mt-1 leading-snug">
            Complete some rotation or opener practice drills to populate your accuracy improvement curve.
          </p>
        </div>
      );
    }

    const n = progressHistory.length;
    // Map accuracy from 0-100% to Y coordinate from 130 to 20
    const points = progressHistory.map((s, index) => {
      const x = n > 1 ? 15 + (index * 470) / (n - 1) : 250;
      const y = 130 - (s.accuracy / 100) * 110;
      return { x, y, accuracy: s.accuracy, label: `S${index + 1}` };
    });

    let dArea = "";
    let dLine = "";

    if (n === 1) {
      dArea = `M 230,${points[0].y} L 270,${points[0].y} L 270,140 L 230,140 Z`;
      dLine = `M 230,${points[0].y} L 270,${points[0].y}`;
    } else {
      dArea = `M ${points[0].x},${points[0].y} ` + points.slice(1).map(p => `L ${p.x},${p.y}`).join(" ") + ` L ${points[n-1].x},140 L ${points[0].x},140 Z`;
      dLine = `M ${points[0].x},${points[0].y} ` + points.slice(1).map(p => `L ${p.x},${p.y}`).join(" ");
    }

    return (
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
          <path d={dArea} fill="url(#chart-grad)" />

          {/* Smooth Line Path */}
          <path d={dLine} fill="none" stroke="#8b5cf6" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data Point Circles & Text */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle cx={p.x} cy={p.y} r="5" fill="#fafafa" stroke="#8b5cf6" strokeWidth="2" />
              <text x={p.x} y="145" fill="#71717a" fontSize="9" fontWeight="bold" textAnchor={n > 1 && idx === n - 1 ? "end" : "middle"}>
                {p.label}
              </text>
              <text x={p.x + 5} y={p.y - 8} fill="#a855f7" fontSize="9" fontWeight="extrabold">
                {p.accuracy}%
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col relative animate-fade-in">
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
                <svg fill="currentColor" viewBox="0 0 24 24" className="size-4">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
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

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8 relative z-10">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white font-sans">Player Dashboard</h1>
            <p className="text-zinc-400 text-sm">Monitor your muscle memory progress and manage character configurations.</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 text-xs font-black bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg shadow-md shadow-violet-500/10 active:scale-95 transition-all cursor-pointer"
            >
              Import WoW Setup
            </button>
            <Link
              href="/train"
              className="px-5 py-2.5 text-xs font-black bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white text-zinc-300 rounded-lg shadow-sm active:scale-95 transition-all"
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
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-tr ${currentClassStyle} flex items-center justify-center shadow-lg border`}>
                  <span className="font-extrabold text-lg uppercase">
                    {activeBuild ? activeBuild.class.substring(0, 2) : "DH"}
                  </span>
                </div>
                <div>
                  <h2 className="font-black text-lg text-white">
                    {activeBuild ? "Imported Character" : "IllidariPro"}
                  </h2>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wide uppercase ${
                    activeBuild ? "bg-zinc-800/80 border border-zinc-700 text-zinc-300" : "bg-emerald-950/50 border border-emerald-900/60 text-emerald-400"
                  }`}>
                    {activeBuild ? `${activeBuild.spec} ${activeBuild.class}` : "HAVOC DEMON HUNTER"}
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-zinc-850 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-bold uppercase">Active Spec</span>
                  <span className="text-zinc-200 font-semibold">
                    {activeBuild ? activeBuild.spec : "Havoc (Rotational Core)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-bold uppercase">Action Bars</span>
                  <span className="text-zinc-200 font-semibold">{totalSpells} Active Spells</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-bold uppercase">Import Status</span>
                  <span className="text-zinc-400 font-semibold italic">
                    {activeBuild ? "Imported Custom Setup" : "Predefined MVP Template"}
                  </span>
                </div>

                {/* Class & Spec Selector Presets */}
                <div className="pt-3 border-t border-zinc-850 space-y-2">
                  <span className="text-zinc-500 font-bold uppercase block text-[10px] tracking-wide">Change Class & Spec</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <select
                        value={selectedClass}
                        onChange={(e) => handleClassChange(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-[11px] text-zinc-200 focus:border-violet-500 focus:outline-none cursor-pointer"
                      >
                        {WOW_CLASSES_SPECS.map(c => (
                          <option key={c.key} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <select
                        value={selectedSpec}
                        onChange={(e) => handleSpecChange(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-[11px] text-zinc-200 focus:border-violet-500 focus:outline-none cursor-pointer"
                      >
                        {(WOW_CLASSES_SPECS.find(c => c.name === selectedClass)?.specs || []).map(spec => (
                          <option key={spec} value={spec}>{spec}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Character Setups & Database Loadouts */}
            <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-2xl backdrop-blur-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-sm text-white uppercase tracking-wider">Saved Loadouts</h3>
                <span className="text-[10px] font-extrabold text-violet-400">
                  {session?.loggedIn ? `${savedLoadouts.length} SAVED` : "LOCAL ONLY"}
                </span>
              </div>

              <div className="space-y-3">
                {/* Active local setup status */}
                <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-850/80 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                    <div>
                      <span className="font-bold text-xs block text-white">
                        {activeBuild ? `${activeBuild.spec} ${activeBuild.class}` : "Default DH Spec"}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {activeBuild ? "Active Temporary Setup" : "MVP Standard Template"}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-1.5 py-0.5 rounded">
                    ACTIVE
                  </span>
                </div>

                {/* Show saved loadouts if logged in */}
                {session?.loggedIn ? (
                  savedLoadouts.map((loadout) => {
                    const isSelected = isActiveBuildMatch(loadout);
                    return (
                      <div
                        key={loadout.id}
                        onClick={() => handleSelectLoadout(loadout)}
                        className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all hover:bg-zinc-900/40 ${
                          isSelected
                            ? "bg-zinc-900/80 border-violet-500/40"
                            : "bg-zinc-950/30 border-zinc-850"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-violet-400" : "bg-zinc-600"}`} />
                          <div>
                            <span className="font-bold text-xs block text-white">{loadout.name}</span>
                            <span className="text-[9px] text-zinc-500 uppercase tracking-wide">
                              {loadout.spec} {loadout.class}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {isSelected && (
                            <span className="text-[9px] font-black text-violet-400 bg-violet-950/40 border border-violet-900/60 px-1 py-0.5 rounded uppercase tracking-wider">
                              LOADED
                            </span>
                          )}
                          <button
                            onClick={(e) => handleDeleteLoadout(loadout.id, e)}
                            className="p-1 text-zinc-600 hover:text-rose-500 rounded hover:bg-rose-950/20 transition-all"
                            title="Delete Loadout"
                          >
                            <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 bg-zinc-950/40 border border-zinc-850 rounded-xl text-center space-y-2">
                    <span className="text-[10px] text-zinc-500 font-extrabold uppercase block tracking-wider">Multi-character Sync</span>
                    <p className="text-[10px] text-zinc-400 leading-snug">
                      Sign in with your Battle.net account to persist your characters in the cloud and switch profiles seamlessly.
                    </p>
                    <a
                      href="/api/auth/login"
                      className="inline-block px-3 py-1.5 text-[10px] font-black text-sky-400 bg-sky-950/40 border border-sky-900/50 hover:bg-sky-900/30 hover:text-sky-300 rounded-lg transition-all"
                    >
                      Login to Battle.net
                    </a>
                  </div>
                )}

                {/* Save Current Layout Form */}
                {session?.loggedIn && activeBuild && (
                  <form
                    onSubmit={handleSaveActiveAsLoadout}
                    className="pt-3 border-t border-zinc-850 space-y-2"
                  >
                    <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide block">
                      Save Active Setup as Loadout
                    </span>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        required
                        value={newLoadoutName}
                        onChange={(e) => setNewLoadoutName(e.target.value)}
                        placeholder="e.g. My Mythic+ Spec"
                        className="flex-grow bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-650 focus:border-violet-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isSavingLoadout}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {isSavingLoadout ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </form>
                )}

                <div
                  onClick={() => setIsModalOpen(true)}
                  className="p-3 border border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl text-center cursor-pointer transition-colors group"
                >
                  <span className="text-xs text-zinc-500 group-hover:text-zinc-400 font-bold block">
                    + Import New WoW Build
                  </span>
                  <span className="text-[9px] text-zinc-600 block mt-1">Requires Addon Base64 String</span>
                </div>

                {activeBuild && (
                  <button
                    onClick={handleClearBuild}
                    className="w-full py-2 text-xs font-bold bg-zinc-950 hover:bg-rose-950/20 text-zinc-500 hover:text-rose-450 border border-zinc-900 hover:border-rose-900/40 rounded-xl transition-all cursor-pointer"
                  >
                    Clear Active Setup
                  </button>
                )}
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
                  <span className="text-xs text-zinc-400">Your performance curve over the last 10 sessions</span>
                </div>
                <div className="flex items-center space-x-3 text-xs">
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                    <span className="text-zinc-400">Active Drills</span>
                  </span>
                </div>
              </div>

              {renderChart()}
            </div>

            {/* Rotational Pain Points / Keybind Coaching */}
            <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-2xl backdrop-blur-sm space-y-4">
              <div>
                <h3 className="font-black text-sm text-white uppercase tracking-wider">Rotational Pain Points</h3>
                <p className="text-xs text-zinc-400">Coaching diagnostics identifying your historically slowest actions</p>
              </div>

              {slowestKeys.length === 0 ? (
                <div className="p-4 bg-zinc-950/30 border border-zinc-850 rounded-xl text-center space-y-1">
                  <span className="text-[10px] text-zinc-500 font-extrabold uppercase block tracking-wider">No Diagnostic Data</span>
                  <p className="text-[10px] text-zinc-400 leading-snug">
                    Complete training drills with multiple spell inputs to evaluate reaction time patterns.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {slowestKeys.map((item, idx) => {
                    const reaction = item.avg_time_ms;
                    // target 300ms. If speed > 600, show danger.
                    const barColor = reaction >= 600 ? "bg-rose-500" : reaction >= 450 ? "bg-amber-500" : "bg-yellow-500";
                    const textColor = reaction >= 600 ? "text-rose-400" : reaction >= 450 ? "text-amber-400" : "text-yellow-400";
                    return (
                      <div key={idx} className="bg-zinc-950/40 border border-zinc-850/80 p-3.5 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-black text-zinc-300 font-mono">
                              {item.key}
                            </span>
                            <span className="font-bold text-white">{item.spell}</span>
                          </div>
                          <span className={`font-extrabold font-mono ${textColor}`}>
                            {reaction}ms avg
                          </span>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${Math.min(100, (reaction / 1000) * 100)}%` }}
                          />
                        </div>

                        <p className="text-[10px] text-zinc-400 leading-relaxed">
                          💡 <span className="font-bold text-zinc-300">Advice:</span> {getRecommendation(item.key, item.spell)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
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
                    {progressHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-zinc-550 italic">
                          No recent sessions. Set up your character and run a training sim!
                        </td>
                      </tr>
                    ) : (
                      progressHistory.slice().reverse().map((session) => {
                        const dateFormatted = new Date(session.createdAt).toLocaleDateString() + " " + new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        return (
                          <tr key={session.id} className="hover:bg-zinc-900/20 transition-colors">
                            <td className="py-3 font-extrabold text-white">
                              {session.spec} {session.class} ({session.drillType})
                            </td>
                            <td className="py-3 text-zinc-400">{dateFormatted}</td>
                            <td className="py-3 text-center">
                              <span className={`font-extrabold ${session.accuracy >= 90 ? 'text-emerald-400' : session.accuracy >= 80 ? 'text-amber-400' : 'text-rose-400'}`}>
                                {session.accuracy}%
                              </span>
                            </td>
                            <td className="py-3 text-center text-zinc-300 font-mono">{session.avgReactionMs}ms</td>
                            <td className="py-3 text-right">
                              <span className={`inline-block font-black px-2 py-0.5 rounded text-[10px] ${
                                session.scoreGrade === 'S' ? 'bg-violet-950 text-violet-400 border border-violet-900' :
                                session.scoreGrade === 'A' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                                session.scoreGrade === 'B' ? 'bg-amber-950 text-amber-400 border border-amber-900' :
                                'bg-zinc-800 text-zinc-400'
                              }`}>
                                {session.scoreGrade}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Weekly High Scores Leaderboard */}
            <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-2xl backdrop-blur-sm space-y-4">
              <div>
                <h3 className="font-black text-sm text-white uppercase tracking-wider">This Week's High Scores</h3>
                <p className="text-xs text-zinc-400">Weekly leaderboard across all players (past 7 days)</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-850 text-zinc-500 uppercase font-black tracking-wider">
                      <th className="pb-3 font-bold w-12 text-center">Rank</th>
                      <th className="pb-3 font-bold">Player</th>
                      <th className="pb-3 font-bold">Class / Spec</th>
                      <th className="pb-3 font-bold text-center">Drill</th>
                      <th className="pb-3 font-bold text-center">Accuracy</th>
                      <th className="pb-3 font-bold text-center">Reaction</th>
                      <th className="pb-3 font-bold text-right">Zone Awareness</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {leaderboard.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-zinc-500 italic">
                          No high scores recorded this week. Be the first to claim a rank!
                        </td>
                      </tr>
                    ) : (
                      leaderboard.map((item, idx) => {
                        const rankStyle = idx === 0 ? "text-yellow-400 bg-yellow-950/40 border-yellow-800/60" :
                                          idx === 1 ? "text-zinc-300 bg-zinc-800/40 border-zinc-700/60" :
                                          idx === 2 ? "text-amber-600 bg-amber-950/40 border-amber-900/60" :
                                          "text-zinc-500 border-transparent";
                        
                        const classStyle = getClassTag(item.class);

                        return (
                          <tr key={item.id} className="hover:bg-zinc-900/20 transition-colors">
                            <td className="py-3 text-center">
                              <span className={`inline-block w-6 h-6 leading-6 text-[10px] font-black rounded-full border text-center ${rankStyle}`}>
                                {idx + 1}
                              </span>
                            </td>
                            <td className="py-3 font-extrabold text-white">
                              {item.battletag}
                            </td>
                            <td className="py-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wide uppercase border bg-gradient-to-tr ${classStyle}`}>
                                {item.spec} {item.class}
                              </span>
                            </td>
                            <td className="py-3 text-center text-zinc-300 font-bold capitalize">
                              {item.drillType}
                            </td>
                            <td className="py-3 text-center font-extrabold text-emerald-400">
                              {item.accuracy}%
                            </td>
                            <td className="py-3 text-center text-zinc-300 font-mono">
                              {item.avgReactionMs}ms
                            </td>
                            <td className="py-3 text-right text-zinc-300 font-mono">
                              {item.peripheralScore > 0 ? `${item.peripheralScore}%` : "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Import Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 max-w-lg w-full rounded-2xl p-6 shadow-2xl relative space-y-4">
            <div>
              <h2 className="text-xl font-black text-white font-sans">Import WoW Character Configuration</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Paste the Base64 export string generated by the PullPrep Addon inside World of Warcraft (using the command <code className="text-violet-400 font-mono">/pp</code> or <code className="text-violet-400 font-mono">/pullprep</code>).
              </p>
            </div>

            <textarea
              value={importString}
              onChange={(e) => setImportString(e.target.value)}
              placeholder="Paste Base64 addon string here..."
              className="w-full h-44 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300 font-mono focus:border-violet-500 focus:outline-none resize-none"
            />

            {errorMessage && (
              <p className="text-xs text-rose-500 bg-rose-950/20 border border-rose-900/50 p-2.5 rounded-lg">
                ⚠️ {errorMessage}
              </p>
            )}

            <div className="flex space-x-3 pt-2">
              <button
                onClick={handleImport}
                className="flex-grow py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold rounded-xl text-xs active:scale-98 transition-all cursor-pointer"
              >
                Validate and Import Setup
              </button>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setErrorMessage("");
                  setImportString("");
                }}
                className="px-5 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl text-xs active:scale-98 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
