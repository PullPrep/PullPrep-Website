"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Spell,
  Scenario,
  CastRecord,
  SessionStats,
  DEMON_HUNTER_SPELLS,
  TRAINING_SCENARIOS,
  evaluatePress,
  compileStats,
  ROTATIONS_DB,
  checkMissingCoreSpells,
  ImportedBuild,
  ImportedBar,
  ImportedButton,
  getScenariosForSpec,
  SPELL_GROUP_MAPPINGS,
  generateDefaultBuild,
  WOW_CLASSES_SPECS,
  CLASS_COLORS_HEX,
  isRealSpell,
  SPELL_COOLDOWNS
} from "@/lib/trainingEngine";


// Web Audio API Synthesizer for premium instant feedback
class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private heartbeatInterval: any = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playCorrect() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, this.ctx.currentTime); // C5
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playPerfect() {
    this.init();
    if (!this.ctx) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, this.ctx.currentTime); // E5
    osc1.frequency.setValueAtTime(987.77, this.ctx.currentTime + 0.05); // B5
    
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
    osc2.frequency.setValueAtTime(783.99, this.ctx.currentTime + 0.05); // G5
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
    
    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + 0.18);
    osc2.stop(this.ctx.currentTime + 0.18);
  }

  playIncorrect() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = "triangle";
    osc.frequency.setValueAtTime(130, this.ctx.currentTime); // C3 low buzz
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  startHeartbeat(isMuted: boolean) {
    this.stopHeartbeat();
    if (isMuted) return;

    this.init();
    if (!this.ctx) return;

    const playThump = () => {
      if (!this.ctx || this.ctx.state === "suspended") return;
      const now = this.ctx.currentTime;

      // Double beat pattern: lub-dub
      const beats = [0, 0.22];
      beats.forEach((delay) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.type = "sine";
        osc.frequency.setValueAtTime(55, now + delay); // Low pitch thump at 55 Hz
        
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(0.35, now + delay + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.22);

        osc.start(now + delay);
        osc.stop(now + delay + 0.25);
      });
    };

    playThump();
    this.heartbeatInterval = setInterval(playThump, 1000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

interface EncounterAlert {
  type: "interrupt" | "health" | "defensive" | "dispel";
  prompt: string;
  key: string;
  expiresAt: number;
}

const getSpellColor = (name: string): string => {
  const lowercase = name.toLowerCase();
  if (lowercase.includes("chaos strike") || lowercase.includes("fracture") || lowercase.includes("shear")) return "#ef4444";
  if (lowercase.includes("blade dance") || lowercase.includes("soul cleave")) return "#10b981";
  if (lowercase.includes("eye beam") || lowercase.includes("fel devastation") || lowercase.includes("spirit bomb")) return "#8b5cf6";
  if (lowercase.includes("metamorphosis")) return "#eab308";
  return "#a855f7"; // default purple
};

const getSpellIconSVG = (name: string) => {
  const lowercase = name.toLowerCase();
  
  // 1. Fire
  if (["fire", "burn", "ignite", "blast", "pyro", "combustion", "lava", "immolate", "incinerate", "phoenix", "brand"].some(k => lowercase.includes(k))) {
    return (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-7 text-amber-500">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-2.133-1A3.75 3.75 0 0 0 12 18Z" />
      </svg>
    );
  }
  
  // 2. Frost/Ice
  if (["frost", "ice", "blizzard", "frozen", "chill", "cold", "flurry", "veins"].some(k => lowercase.includes(k))) {
    return (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-7 text-sky-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18M12 9l-3-3M12 9l3-3M12 15l-3 3M12 15l3 3M9 12l-3-3M9 12l-3 3M15 12l3-3M15 12l3 3" />
      </svg>
    );
  }
  
  // 3. Lightning/Storm
  if (["lightning", "storm", "chain", "thunder", "elemental", "wind", "glaive"].some(k => lowercase.includes(k))) {
    return (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-7 text-cyan-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5 10.5 2.25 12 10.5h8.25L13.5 21.75 12 13.5H3.75Z" />
      </svg>
    );
  }

  // 4. Arcane/Astral/Lunar
  if (["arcane", "star", "moon", "celestial", "eclipse", "supernova", "barrage", "stellar", "astral", "elune", "convoke"].some(k => lowercase.includes(k))) {
    return (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-7 text-violet-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.982-5.096c.86-.487 1.018-1.666.294-2.39L14.73 9.967c-.724-.724-1.903-.566-2.39.294L9.813 15.904z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.071 4.929a10 10 0 0 0-14.142 14.142" />
      </svg>
    );
  }

  // 5. Nature/Heal
  if (["nature", "rejuvenation", "regrowth", "wild", "growth", "leaf", "bloom", "healing", "life", "fungal", "wrath", "herb"].some(k => lowercase.includes(k))) {
    return (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-7 text-emerald-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-1.2 3.6-4.8 6-8 6 4 10 8 12 8 12s4-2 8-12c-3.2 0-6.8-2.4-8-6Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v13" />
      </svg>
    );
  }

  // 6. Shadow/Void/Necromancy/Death
  if (["shadow", "death", "void", "agony", "corruption", "plague", "necrotic", "unholy", "dark", "reaper", "soul", "mind", "vampiric", "demon", "fiend"].some(k => lowercase.includes(k))) {
    return (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-7 text-fuchsia-500">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a5 5 0 0 0-5 5v3a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1v1a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-1h1a3 3 0 0 0 3-3v-2a3 3 0 0 0-3-3V7a5 5 0 0 0-5-5Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h.01M15 12h.01M10 16h4" />
      </svg>
    );
  }

  // 7. Holy/Light
  if (["holy", "light", "divine", "flash", "smite", "lay on hands", "crusader", "justice", "retribution", "judgment", "shield", "consecration"].some(k => lowercase.includes(k))) {
    return (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-7 text-yellow-300">
        <circle cx="12" cy="12" r="4" strokeLinecap="round" strokeLinejoin="round" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    );
  }

  // 8. Interrupt/Silence
  if (["kick", "pummel", "disrupt", "silence", "freeze", "shear", "counterspell", "interrupt"].some(k => lowercase.includes(k))) {
    return (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-7 text-red-500">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.03V3m0 18v-3.75M12 15.75h.007v.008H12v-.008Z" />
      </svg>
    );
  }

  // 9. Defensive/Barrier
  if (["shield", "barrier", "block", "wall", "ward", "armor", "carapace", "shell", "barkskin", "blur", "resolve", "fortitude", "protection"].some(k => lowercase.includes(k))) {
    return (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-7 text-blue-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.746 3.746 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
      </svg>
    );
  }

  // 10. Physical/Combat/Default Swords
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-7 text-zinc-400">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-9-9 9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14L8 18l-3-3 4-4 3 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21l3-3m-3 0l3 3" />
    </svg>
  );
};function TunnelVisionOrb({
  active,
  onOrbRedTrigger,
  onOrbClicked,
}: {
  active: boolean;
  onOrbRedTrigger: (maxPoints: number) => void;
  onOrbClicked: (score: number) => void;
}) {
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [isRed, setIsRed] = useState(false);
  const [pointsAvailable, setPointsAvailable] = useState(10);
  
  const velRef = useRef({ dx: 0.15, dy: 0.12 });
  const posRef = useRef({ x: 50, y: 50 });
  const isRedRef = useRef(false);
  const nextChangeTimeRef = useRef(0);
  const redExpiresRef = useRef(0);

  useEffect(() => {
    if (!active) return;

    // Randomize initial velocities and paths
    const angle = Math.random() * Math.PI * 2;
    velRef.current = {
      dx: Math.cos(angle) * 0.18,
      dy: Math.sin(angle) * 0.18,
    };

    nextChangeTimeRef.current = Date.now() + 5000 + Math.random() * 5000; // turn red in 5-10s

    let animFrame: number;
    let pointTimer: any;

    const update = () => {
      let { x, y } = posRef.current;
      let { dx, dy } = velRef.current;

      x += dx;
      y += dy;

      // Bounce on border boundaries
      if (x <= 4 || x >= 96) {
        dx = -dx;
        x = Math.max(4, Math.min(96, x));
      }
      if (y <= 4 || y >= 96) {
        dy = -dy;
        y = Math.max(4, Math.min(96, y));
      }

      velRef.current = { dx, dy };
      posRef.current = { x, y };
      setPos({ x, y });

      const now = Date.now();
      // Handle random red trigger
      if (!isRedRef.current && now >= nextChangeTimeRef.current) {
        isRedRef.current = true;
        setIsRed(true);
        setPointsAvailable(10);
        redExpiresRef.current = now + 10000; // 10s to click

        onOrbRedTrigger(10);

        // Start countdown timer for points
        let pts = 10;
        if (pointTimer) clearInterval(pointTimer);
        pointTimer = setInterval(() => {
          pts -= 1;
          setPointsAvailable(pts);
          if (pts <= 0) {
            clearInterval(pointTimer);
            isRedRef.current = false;
            setIsRed(false);
            nextChangeTimeRef.current = Date.now() + 8000 + Math.random() * 7000;
          }
        }, 1000);
      }

      // Handle red timeout expiration
      if (isRedRef.current && now >= redExpiresRef.current) {
        isRedRef.current = false;
        setIsRed(false);
        if (pointTimer) clearInterval(pointTimer);
        nextChangeTimeRef.current = now + 8000 + Math.random() * 7000;
      }

      animFrame = requestAnimationFrame(update);
    };

    animFrame = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animFrame);
      if (pointTimer) clearInterval(pointTimer);
    };
  }, [active, onOrbRedTrigger, onOrbClicked]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isRed) return;

    onOrbClicked(pointsAvailable);
    setIsRed(false);
    isRedRef.current = false;
    nextChangeTimeRef.current = Date.now() + 8000 + Math.random() * 7000;
  };

  return (
    <div
      onClick={handleClick}
      className={`absolute w-6 h-6 rounded-full cursor-pointer pointer-events-auto transition-all active:scale-90 flex items-center justify-center font-mono text-[9px] font-black z-40 select-none ${
        isRed
          ? "bg-rose-600 border-2 border-rose-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.7)]"
          : "bg-white/80 hover:bg-white border border-zinc-400 text-zinc-800 shadow-[0_0_10px_rgba(255,255,255,0.4)]"
      }`}
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {isRed ? pointsAvailable : ""}
    </div>
  );
}

export default function Train() {
  const [scenarios, setScenarios] = useState<Scenario[]>(TRAINING_SCENARIOS);
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(TRAINING_SCENARIOS[0]);
  const [gameState, setGameState] = useState<"idle" | "countdown" | "running" | "finished">("idle");
  const [countdown, setCountdown] = useState<number>(3);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [activeSpell, setActiveSpell] = useState<Spell | null>(null);
  const [activePromptTime, setActivePromptTime] = useState<number | null>(null); // Time when current spell was prompted

  const [casts, setCasts] = useState<CastRecord[]>([]);
  const [combo, setCombo] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [lastPressResult, setLastPressResult] = useState<{ key: string; status: string } | null>(null);
  const [finalStats, setFinalStats] = useState<SessionStats | null>(null);
  const [failedIcons, setFailedIcons] = useState<Record<number, boolean>>({});

  const [lastCastTime, setLastCastTime] = useState<number | null>(null);
  const [drillDuration, setDrillDuration] = useState<number>(60); // default 60s

  // Tunnel Vision Mode states
  const [tunnelVisionActive, setTunnelVisionActive] = useState<boolean>(false);
  const [orbTotalPossible, setOrbTotalPossible] = useState<number>(0);
  const [orbScoreEarned, setOrbScoreEarned] = useState<number>(0);

  // Active key pressed tracking for UI visualizer
  const [pressedKeys, setPressedKeys] = useState<Record<string, boolean>>({});

  const synthRef = useRef<SoundSynthesizer | null>(null);
  const gameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Hardcore & Alerts states
  const [isHardcore, setIsHardcore] = useState<boolean>(false);
  const [isGuidedMode, setIsGuidedMode] = useState<boolean>(false);
  const [activeAlert, setActiveAlert] = useState<EncounterAlert | null>(null);
  const [wipedReason, setWipedReason] = useState<string | null>(null);
  const nextAlertTimeRef = useRef<number>(Infinity);

  // UI Panels states
  const [showAdvancedModifiers, setShowAdvancedModifiers] = useState<boolean>(false);

  const stateRef = useRef({ 
    gameState, 
    elapsedTime, 
    activeStepIndex, 
    activeSpell, 
    activePromptTime, 
    casts, 
    combo, 
    lastCastTime,
    activeAlert,
    isHardcore,
    isGuidedMode,
    orbTotalPossible,
    orbScoreEarned
  });

  // Update ref to read latest states inside timers/listeners
  useEffect(() => {
    stateRef.current = { 
      gameState, 
      elapsedTime, 
      activeStepIndex, 
      activeSpell, 
      activePromptTime, 
      casts, 
      combo, 
      lastCastTime,
      activeAlert,
      isHardcore,
      isGuidedMode,
      orbTotalPossible,
      orbScoreEarned
    };
  }, [gameState, elapsedTime, activeStepIndex, activeSpell, activePromptTime, casts, combo, lastCastTime, activeAlert, isHardcore, isGuidedMode, orbTotalPossible, orbScoreEarned]);

  // Lazy initialize Synthesizer
  useEffect(() => {
    synthRef.current = new SoundSynthesizer();
    return () => {
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    };
  }, []);

  const [activeBuild, setActiveBuild] = useState<ImportedBuild | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>("Demon Hunter");
  const [selectedSpec, setSelectedSpec] = useState<string>("Havoc");

  useEffect(() => {
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
      const defaultBuild = generateDefaultBuild("Demon Hunter", "Havoc");
      setActiveBuild(defaultBuild);
      localStorage.setItem("pullprep_active_build", JSON.stringify(defaultBuild));
    }
  }, []);

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

  useEffect(() => {
    const specScenarios = getScenariosForSpec(activeBuild?.spec, drillDuration);
    setScenarios(specScenarios);
    if (specScenarios.length > 0) {
      // Find matching type based on id suffix
      const isOpener = selectedScenario?.id?.endsWith("-opener");
      const isSustained = selectedScenario?.id?.endsWith("-sustained");
      const isReaction = selectedScenario?.id?.includes("reaction");
      
      let matched = null;
      if (isOpener) matched = specScenarios.find((s: any) => s.id.endsWith("-opener"));
      else if (isSustained) matched = specScenarios.find((s: any) => s.id.endsWith("-sustained"));
      else if (isReaction) matched = specScenarios.find((s: any) => s.id === "proc-reaction");

      setSelectedScenario(matched || specScenarios[0]);
    }
  }, [activeBuild, drillDuration]);

  const getLastCastTimeForSpell = (spellId: number): number | null => {
    const targetIds = new Set<number>([spellId]);
    const alternates = SPELL_GROUP_MAPPINGS[spellId];
    if (alternates) {
      alternates.forEach(id => targetIds.add(id));
    }
    
    let lastCast = -Infinity;
    casts.forEach((c) => {
      if (c.actualSpellId && targetIds.has(c.actualSpellId) && ["perfect", "early", "late"].includes(c.status)) {
        if (c.actualTime !== null && c.actualTime > lastCast) {
          lastCast = c.actualTime;
        }
      }
    });
    return lastCast === -Infinity ? null : lastCast;
  };

  const getRemainingCooldown = (spellId: number): number => {
    const lastCast = getLastCastTimeForSpell(spellId);
    const cdVal = SPELL_COOLDOWNS[spellId] || 0;
    if (lastCast === null || cdVal === 0) {
      // In Sustained mode, check if it started on cooldown
      const isSustained = selectedScenario?.id?.endsWith("-sustained");
      if (isSustained && cdVal > 60) {
        const initialCdRemaining = cdVal - 60;
        if (elapsedTime < initialCdRemaining) {
          return initialCdRemaining - elapsedTime;
        }
      }
      return 0;
    }
    const remaining = (lastCast + cdVal) - elapsedTime;
    return Math.max(0, remaining);
  };

  const getSpellKeybind = (spellId: number): string => {
    if (activeBuild) {
      const targetIds = new Set<number>([spellId]);
      const alternates = SPELL_GROUP_MAPPINGS[spellId];
      if (alternates) {
        alternates.forEach(id => targetIds.add(id));
      }
      for (const bar of activeBuild.actionBars) {
        for (const btn of bar.buttons) {
          if (btn.type !== "empty" && btn.id && targetIds.has(btn.id) && btn.key) {
            return btn.key;
          }
        }
      }
    }
    return DEMON_HUNTER_SPELLS[spellId]?.keybind || "";
  };

  const getSpellIconUrl = (spellId: number): string => {
    const idMap: Record<number, number> = {
      227084: 263642, // Fracture internal/talent -> Fracture spell
      225919: 203782, // Shear internal/talent -> Shear spell
      37846: 33917,   // Force of Nature -> working asset
      46832: 190984,  // Solar Eclipse -> Starfire
      48518: 5176,    // Lunar Eclipse -> Wrath
      1239669: 190984, // Eclipse -> Starfire
    };
    const targetId = idMap[spellId] || spellId;
    return `/icons/${targetId}.jpg`;
  };

  const getMappedSpell = (spellId: number): Spell => {
    const currentClassKey = activeBuild?.class?.toLowerCase().replace(/ /g, "") || "";
    const classColorHex = CLASS_COLORS_HEX[currentClassKey] || "#a855f7";

    const defaultSpell = DEMON_HUNTER_SPELLS[spellId] || {
      id: spellId,
      name: `Spell ${spellId}`,
      keybind: "",
      icon: "chaos-strike",
      color: classColorHex,
      description: `Spell ${spellId}`
    };

    if (!activeBuild) return defaultSpell;

    const targetIds = new Set<number>([spellId]);
    const alternates = SPELL_GROUP_MAPPINGS[spellId];
    if (alternates) {
      alternates.forEach(id => targetIds.add(id));
    }

    for (const bar of activeBuild.actionBars) {
      for (const btn of bar.buttons) {
        if (btn.type !== "empty" && btn.id && targetIds.has(btn.id)) {
          const matchedDefault = DEMON_HUNTER_SPELLS[btn.id] || defaultSpell;
          return {
            id: btn.id,
            name: btn.name || matchedDefault.name,
            keybind: btn.key || matchedDefault.keybind,
            icon: matchedDefault.icon,
            color: matchedDefault.color,
            description: btn.name || matchedDefault.description,
          };
        }
      }
    }

    return {
      ...defaultSpell,
      keybind: getSpellKeybind(spellId) || defaultSpell.keybind,
    };
  };

  const getWoWKeyString = (e: KeyboardEvent): string => {
    const parts: string[] = [];
    if (e.ctrlKey) parts.push("CTRL");
    if (e.altKey) parts.push("ALT");
    if (e.shiftKey) parts.push("SHIFT");
    
    let keyName = e.key.toUpperCase();
    if (keyName === " ") {
      keyName = "SPACE";
    } else if (e.shiftKey) {
      const shiftMap: Record<string, string> = {
        "!": "1", "@": "2", "#": "3", "$": "4", "%": "5",
        "^": "6", "&": "7", "*": "8", "(": "9", ")": "0",
        "_": "-", "+": "=", "{": "[", "}": "]", "|": "\\",
        ":": ";", "\"": "'", "<": ",", ">": ".", "?": "/"
      };
      if (shiftMap[keyName]) {
        keyName = shiftMap[keyName];
      }
    }
    
    parts.push(keyName);
    return parts.join("-");
  };

  const getActiveKeybinds = (): Set<string> => {
    const binds = new Set<string>();
    if (activeBuild) {
      for (const bar of activeBuild.actionBars) {
        for (const btn of bar.buttons) {
          if (btn.key) {
            binds.add(btn.key.toUpperCase());
          }
        }
      }
    } else {
      binds.add("1");
      binds.add("2");
      binds.add("3");
      binds.add("4");
    }
    return binds;
  };

  const playSound = (type: "perfect" | "correct" | "incorrect") => {
    if (isMuted || !synthRef.current) return;
    if (type === "perfect") synthRef.current.playPerfect();
    else if (type === "correct") synthRef.current.playCorrect();
    else if (type === "incorrect") synthRef.current.playIncorrect();
  };

  const triggerRandomAlert = (currentElapsed: number) => {
    if (!activeBuild) return;

    // Scan bar keys to check which reactive spells are available
    const availableCategories: ("interrupt" | "health" | "defensive" | "dispel")[] = [];
    const bindMap: Record<string, { key: string; name: string }> = {};

    activeBuild.actionBars.forEach((bar) => {
      bar.buttons.forEach((btn) => {
        if (btn.type !== "empty" && btn.key) {
          const nameLower = btn.name.toLowerCase();
          
          // Interrupts
          const isInterrupt = nameLower.includes("disrupt") || nameLower.includes("kick") || nameLower.includes("pummel") || nameLower.includes("mind freeze") || nameLower.includes("wind shear") || nameLower.includes("silence");
          if (isInterrupt && !availableCategories.includes("interrupt")) {
            availableCategories.push("interrupt");
            bindMap["interrupt"] = { key: btn.key, name: btn.name };
          }

          // Health stones/pots
          const isHealth = nameLower.includes("healthstone") || nameLower.includes("potion") || nameLower.includes("exhilaration");
          if (isHealth && !availableCategories.includes("health")) {
            availableCategories.push("health");
            bindMap["health"] = { key: btn.key, name: btn.name };
          }

          // Defensives
          const isDefensive = nameLower.includes("metamorphosis") || nameLower.includes("blur") || nameLower.includes("divine shield") || nameLower.includes("ice block") || nameLower.includes("barkskin") || nameLower.includes("astral shift") || nameLower.includes("survival instincts") || nameLower.includes("fiery brand");
          if (isDefensive && !availableCategories.includes("defensive")) {
            availableCategories.push("defensive");
            bindMap["defensive"] = { key: btn.key, name: btn.name };
          }

          // Dispels / Decurses
          const isDispel = nameLower.includes("nature's cure") || 
                           nameLower.includes("remove corruption") || 
                           nameLower.includes("purify") || 
                           nameLower.includes("mass dispel") || 
                           nameLower.includes("remove curse") || 
                           nameLower.includes("cleanse") || 
                           nameLower.includes("detox") || 
                           nameLower.includes("cleanse spirit") || 
                           nameLower.includes("purify spirit");
          if (isDispel && !availableCategories.includes("dispel")) {
            availableCategories.push("dispel");
            bindMap["dispel"] = { key: btn.key, name: btn.name };
          }
        }
      });
    });

    if (availableCategories.length === 0) {
      nextAlertTimeRef.current = currentElapsed + 6;
      return;
    }

    const category = availableCategories[Math.floor(Math.random() * availableCategories.length)];
    const bind = bindMap[category];

    const prompts = {
      interrupt: `Spell Cast! Interrupt with ${bind.name}!`,
      health: `LOW HEALTH (1%)! Use ${bind.name}!`,
      defensive: `Incoming Big Damage! Cast ${bind.name}!`,
      dispel: `Afflicted! Dispel/Decurse with ${bind.name}!`
    };

    setActiveAlert({
      type: category,
      prompt: prompts[category],
      key: bind.key.toUpperCase(),
      expiresAt: currentElapsed + 1.2
    });
  };

  const registerAlertMissed = (alert: EncounterAlert) => {
    setActiveAlert(null);
    playSound("incorrect");
    setCombo(0);

    const elapsed = stateRef.current.elapsedTime;
    const newRecord: CastRecord = {
      stepIndex: -1,
      expectedSpellId: 0,
      actualSpellId: null,
      expectedTime: elapsed,
      actualTime: elapsed,
      reactionTime: null,
      status: "missed",
    };
    setCasts((prev) => [...prev, newRecord]);
    setLastPressResult({ key: alert.key, status: "missed" });

    if (isHardcore) {
      setWipedReason("mechanic");
      endGame();
    } else {
      nextAlertTimeRef.current = elapsed + 10 + Math.random() * 8;
    }
  };

  const startCountdown = () => {
    setGameState("countdown");
    setCountdown(3);
    setCasts([]);
    setCombo(0);
    setElapsedTime(0);
    setActiveStepIndex(null);
    setActiveSpell(null);
    setActivePromptTime(null);
    setFinalStats(null);
    setLastPressResult(null);
    setLastCastTime(null);
    setActiveAlert(null);
    setWipedReason(null);
    nextAlertTimeRef.current = 8 + Math.random() * 6; // first alert around 8-14s

    const countInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countInterval);
          startGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startGame = () => {
    setGameState("running");
    setElapsedTime(0);
    setOrbTotalPossible(0);
    setOrbScoreEarned(0);
    synthRef.current?.startHeartbeat(isMuted);

    let steps = [...selectedScenario.steps];
    
    // For Proc Reaction drills, generate steps dynamically
    if (selectedScenario.isProcReaction) {
      steps = [];
      const numSteps = Math.floor(selectedScenario.duration / 2);
      let currTime = 1.0;
      const coreIds = activeCoreSpells.map((s: any) => s.id).filter((id: number) => id !== 191427 && id !== 187827);
      const spellIds = coreIds.length > 0 ? coreIds : [162794, 188499, 198013];
      for (let i = 0; i < numSteps; i++) {
        const randomId = spellIds[Math.floor(Math.random() * spellIds.length)];
        steps.push({ time: currTime, spellId: randomId });
        currTime += 1.8 + Math.random() * 1.5;
      }
      setSelectedScenario({
        ...selectedScenario,
        steps,
      });
    }

    const startTime = Date.now();
    
    gameIntervalRef.current = setInterval(() => {
      const currentElapsed = (Date.now() - startTime) / 1000;
      setElapsedTime(currentElapsed);

      if (currentElapsed >= selectedScenario.duration) {
        endGame();
        return;
      }

      // 1. Tick mechanic alerts
      const { activeAlert: curAlert } = stateRef.current;
      if (curAlert) {
        if (currentElapsed >= curAlert.expiresAt) {
          registerAlertMissed(curAlert);
          return;
        }
      } else {
        const nextAlertTime = nextAlertTimeRef.current;
        if (currentElapsed >= nextAlertTime) {
          triggerRandomAlert(currentElapsed);
        }
      }

      // 2. Check regular rotation steps
      const { activeStepIndex: curIdx, casts: currentCasts } = stateRef.current;
      const nextStepIndex = curIdx === null ? 0 : curIdx + 1;

      if (nextStepIndex < steps.length) {
        const nextStep = steps[nextStepIndex];
        if (currentElapsed >= nextStep.time) {
          if (curIdx !== null) {
            const wasHit = currentCasts.some((c) => c.stepIndex === curIdx);
            if (!wasHit) {
              const prevStep = steps[curIdx];
              setCasts((prev) => [
                ...prev,
                {
                  stepIndex: curIdx,
                  expectedSpellId: prevStep.spellId,
                  actualSpellId: null,
                  expectedTime: prevStep.time,
                  actualTime: null,
                  reactionTime: null,
                  status: "missed",
                },
              ]);
              setCombo(0);
              playSound("incorrect");
              
              if (stateRef.current.isHardcore) {
                setWipedReason("mechanic");
                endGame();
                return;
              }

              setLastPressResult({ key: getMappedSpell(prevStep.spellId).keybind, status: "missed" });
            }
          }

          setActiveStepIndex(nextStepIndex);
          setActiveSpell(getMappedSpell(nextStep.spellId));
          setActivePromptTime(currentElapsed);
        }
      }
    }, 20);
  };

  const endGame = () => {
    if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    setGameState("finished");
    setActiveSpell(null);
    setActiveStepIndex(null);
    
    synthRef.current?.stopHeartbeat();

    // Evaluate final stats
    const { casts: finalCasts } = stateRef.current;
    
    let totalDowntime = 0;
    const maxReaction = 1.0;
    finalCasts.forEach(c => {
      if (c.status === "missed") {
        totalDowntime += maxReaction;
      } else if (c.reactionTime !== null) {
        const reactionSeconds = c.reactionTime / 1000;
        if (reactionSeconds > 0.45) {
          totalDowntime += (reactionSeconds - 0.45);
        }
      }
    });

    const stats = compileStats(finalCasts, selectedScenario, totalDowntime, activeBuild);

    // Submit stats
    const drillType = selectedScenario.id.includes("opener")
      ? "opener"
      : selectedScenario.id.includes("sustained")
      ? "sustained"
      : "proc";

    // Extract slowest 3 keys from casts
    const keyMap: Record<number, { times: number[]; key: string; name: string }> = {};
    finalCasts.forEach(c => {
      if (c.reactionTime !== null && c.status !== "incorrect" && c.expectedSpellId) {
        if (!keyMap[c.expectedSpellId]) {
          const btn = activeBuild
            ? activeBuild.actionBars.flatMap(b => b.buttons).find(b => b.id === c.expectedSpellId)
            : Object.values(DEMON_HUNTER_SPELLS).find(s => s.id === c.expectedSpellId);
          keyMap[c.expectedSpellId] = {
            times: [],
            key: (btn && "key" in btn ? btn.key : (btn as any)?.keybind) || DEMON_HUNTER_SPELLS[c.expectedSpellId]?.keybind || "Unbound",
            name: btn?.name || DEMON_HUNTER_SPELLS[c.expectedSpellId]?.name || `Spell ${c.expectedSpellId}`
          };
        }
        keyMap[c.expectedSpellId].times.push(c.reactionTime);
      }
    });

    const slowestKeysList = Object.entries(keyMap).map(([idStr, details]) => {
      const avg = Math.round(details.times.reduce((a, b) => a + b, 0) / details.times.length);
      return {
        id: Number(idStr),
        key: details.key,
        spell: details.name,
        avg_time_ms: avg
      };
    }).sort((a, b) => b.avg_time_ms - a.avg_time_ms).slice(0, 3);

    const pScore = stateRef.current.orbTotalPossible > 0
      ? Math.round((stateRef.current.orbScoreEarned / stateRef.current.orbTotalPossible) * 100)
      : 0;

    if (tunnelVisionActive && pScore > 0) {
      stats.feedback.push(`Peripheral Focus: You caught ${pScore}% of the awareness orbs (${stateRef.current.orbScoreEarned}/${stateRef.current.orbTotalPossible} points).`);
    } else if (tunnelVisionActive) {
      stats.feedback.push(`Peripheral Focus: You missed 100% of the awareness orbs. Stare less at your action bars!`);
    }

    setFinalStats(stats);

    fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        class: activeBuild?.class || "Demon Hunter",
        spec: activeBuild?.spec || "Havoc",
        drillType,
        duration: selectedScenario.duration,
        accuracy: stats.accuracy,
        avgReaction: stats.avgReactionTime,
        grade: stats.accuracy >= 95 ? "S" : stats.accuracy >= 90 ? "A" : stats.accuracy >= 80 ? "B" : stats.accuracy >= 70 ? "C" : "F",
        slowestKeys: slowestKeysList,
        peripheralScore: tunnelVisionActive ? pScore : 0
      })
    }).catch(e => console.error("Failed to submit session stats", e));
  };

  const resetGame = () => {
    if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    setGameState("idle");
    setElapsedTime(0);
    setActiveSpell(null);
    setActiveStepIndex(null);
    setCasts([]);
    setCombo(0);
    setFinalStats(null);
    setLastPressResult(null);
    setLastCastTime(null);
    setActiveAlert(null);
    setWipedReason(null);
    setOrbTotalPossible(0);
    setOrbScoreEarned(0);
    synthRef.current?.stopHeartbeat();
  };

  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["Shift", "Control", "Alt"].includes(e.key)) return;

      const pressedWoWKey = getWoWKeyString(e);
      const validBinds = getActiveKeybinds();
      if (!validBinds.has(pressedWoWKey)) return;

      e.preventDefault();
      setPressedKeys((prev) => ({ ...prev, [pressedWoWKey]: true }));

      const {
        gameState: currentGameState,
        activeSpell: currentSpell,
        activeStepIndex: currentIndex,
        activePromptTime: currentPromptTime,
        casts: currentCasts,
        lastCastTime: currentLastCastTime,
        activeAlert: curAlert,
        isHardcore: hcActive
      } = stateRef.current;

      if (currentGameState !== "running") return;

      const elapsed = stateRef.current.elapsedTime;
      const steps = selectedScenario.steps;
      
      // Stress Tempo Accelerator: GCD speeds up with combo streak (up to 20% speedup at 50 combo)
      const baseGcd = 1.5;
      const gcdDuration = baseGcd * (1 - Math.min(0.2, (combo / 50) * 0.2));
      const queueWindow = 0.25;

      // 1. Handle Mechanic Alerts press
      if (curAlert) {
        if (pressedWoWKey === curAlert.key) {
          // Success resolve
          setActiveAlert(null);
          playSound("perfect");
          setCombo((prev) => prev + 1);
          setLastCastTime(elapsed);
          setLastPressResult({ key: pressedWoWKey, status: "perfect" });

          const newRecord: CastRecord = {
            stepIndex: -1,
            expectedSpellId: 999999, // alert success
            actualSpellId: null,
            expectedTime: elapsed,
            actualTime: elapsed,
            reactionTime: 300,
            status: "perfect"
          };
          setCasts((prev) => [...prev, newRecord]);
          nextAlertTimeRef.current = elapsed + 10 + Math.random() * 8;
        } else {
          // Wrong key on alert
          if (hcActive) {
            setWipedReason("incorrect");
            endGame();
          } else {
            playSound("incorrect");
            setCombo(0);
          }
        }
        return;
      }

      // 2. Normal Rotational check
      let isGcdActive = false;
      let isQueued = false;
      let actualCastTime = elapsed;

      if (currentLastCastTime !== null) {
        const gcdEndTime = currentLastCastTime + gcdDuration;
        const remainingGcd = gcdEndTime - elapsed;
        if (remainingGcd > 0) {
          if (remainingGcd <= queueWindow) {
            isQueued = true;
            actualCastTime = gcdEndTime;
          } else {
            isGcdActive = true;
          }
        }
      }

      let targetStepIndex = currentIndex;
      let targetSpell = currentSpell;
      let targetPromptTime = currentPromptTime;

      const nextStepIndex = currentIndex === null ? 0 : currentIndex + 1;

      if (!selectedScenario.isProcReaction && nextStepIndex < steps.length) {
        const nextStep = steps[nextStepIndex];
        const timeUntilNext = nextStep.time - elapsed;
        if (timeUntilNext > 0 && timeUntilNext <= queueWindow) {
          targetStepIndex = nextStepIndex;
          targetSpell = getMappedSpell(nextStep.spellId);
          targetPromptTime = nextStep.time;
        }
      }

      const expectedKeybind = targetSpell ? targetSpell.keybind : "";

      if (isGcdActive) {
        if (targetSpell && pressedWoWKey !== expectedKeybind) {
          if (hcActive) {
            setWipedReason("incorrect");
            endGame();
          } else {
            registerIncorrectPress(pressedWoWKey);
          }
        }
        return;
      }

      if (targetSpell && targetStepIndex !== null) {
        const alreadyResponded = currentCasts.some((c) => c.stepIndex === targetStepIndex);
        if (alreadyResponded) {
          if (hcActive) {
            setWipedReason("incorrect");
            endGame();
          } else {
            registerIncorrectPress(pressedWoWKey);
          }
          return;
        }

        const timeDiff = actualCastTime - (targetPromptTime || 0);
        const spellWithCustomBind = {
          ...targetSpell,
          keybind: expectedKeybind
        };

        const { status, reactionTimeMs } = evaluatePress(spellWithCustomBind, pressedWoWKey, timeDiff);

        const actualSpellId = activeBuild 
          ? (activeBuild.actionBars.flatMap(bar => bar.buttons).find(btn => btn.key === pressedWoWKey)?.id || null)
          : (Object.values(DEMON_HUNTER_SPELLS).find((s) => s.keybind === pressedWoWKey)?.id || null);

        const newRecord: CastRecord = {
          stepIndex: targetStepIndex,
          expectedSpellId: targetSpell.id,
          actualSpellId,
          expectedTime: !selectedScenario.isProcReaction ? steps[targetStepIndex]?.time : (targetPromptTime || 0),
          actualTime: actualCastTime,
          reactionTime: reactionTimeMs,
          status,
        };

        setCasts((prev) => [...prev, newRecord]);
        setLastPressResult({ key: pressedWoWKey, status });

        if (status === "perfect") {
          setCombo((prev) => prev + 1);
          playSound("perfect");
          setLastCastTime(actualCastTime);
        } else if (status === "early" || status === "late") {
          setCombo((prev) => prev + 1);
          playSound("correct");
          setLastCastTime(actualCastTime);
        } else {
          if (hcActive) {
            setWipedReason("incorrect");
            endGame();
          } else {
            setCombo(0);
            playSound("incorrect");
          }
        }
      } else {
        if (hcActive) {
          setWipedReason("incorrect");
          endGame();
        } else {
          registerIncorrectPress(pressedWoWKey);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (["Shift", "Control", "Alt"].includes(e.key)) return;
      const releasedWoWKey = getWoWKeyString(e);
      setPressedKeys((prev) => ({ ...prev, [releasedWoWKey]: false }));
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [selectedScenario, activeBuild, combo]);

  const registerIncorrectPress = (key: string) => {
    const elapsed = stateRef.current.elapsedTime;
    const actualSpellId = activeBuild
      ? (activeBuild.actionBars.flatMap(bar => bar.buttons).find(btn => btn.key === key)?.id || null)
      : (Object.values(DEMON_HUNTER_SPELLS).find((s) => s.keybind === key)?.id || null);

    const newRecord: CastRecord = {
      stepIndex: -1,
      expectedSpellId: 0,
      actualSpellId,
      expectedTime: elapsed,
      actualTime: elapsed,
      reactionTime: null,
      status: "incorrect",
    };
    setCasts((prev) => [...prev, newRecord]);
    setCombo(0);
    playSound("incorrect");
    setLastPressResult({ key, status: "incorrect" });
  };

  const totalStepsEvaluated = casts.length;
  const correctCasts = casts.filter((c) => ["perfect", "early", "late"].includes(c.status)).length;
  const currentAccuracy = totalStepsEvaluated > 0 ? Math.round((correctCasts / totalStepsEvaluated) * 100) : 100;
  const validReactions = casts.filter((c) => c.reactionTime !== null).map((c) => c.reactionTime as number);
  const currentAvgReaction = validReactions.length > 0 ? Math.round(validReactions.reduce((a, b) => a + b, 0) / validReactions.length) : 0;

  // Stress GCD Duration
  const currentGcdMax = 1.5 * (1 - Math.min(0.2, (combo / 50) * 0.2));
  const timeSinceLastCast = lastCastTime !== null ? elapsedTime - lastCastTime : Infinity;
  const isGcdActive = gameState === "running" && timeSinceLastCast < currentGcdMax;
  const gcdPercent = isGcdActive ? ((currentGcdMax - timeSinceLastCast) / currentGcdMax) * 100 : 0;

  // Spell Auditing Setup
  const specKey = activeBuild ? `${activeBuild.class.toLowerCase().replace(' ', '')}_${activeBuild.spec.toLowerCase().replace(' ', '')}` : "demonhunter_havoc";
  const activeCoreSpells = (ROTATIONS_DB[specKey]?.coreSpells || [
    { id: 191427, name: "Metamorphosis" },
    { id: 198013, name: "Eye Beam" },
    { id: 188499, name: "Blade Dance" },
    { id: 162794, name: "Chaos Strike" }
  ]).filter((s: any) => isRealSpell(s.id, s.name));
  const missingSpells = checkMissingCoreSpells(activeBuild, specKey);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col relative">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translate(0, 0); }
          10%, 30%, 50%, 70%, 90% { transform: translate(-3px, 2px); }
          20%, 40%, 60%, 80% { transform: translate(3px, -2px); }
        }
        .animate-shake {
          animation: shake 0.25s infinite;
        }
        @keyframes goldenGlow {
          0%, 100% { box-shadow: 0 0 4px #fbbf24; border-color: #fbbf24; }
          50% { box-shadow: 0 0 16px #fbbf24; border-color: #f59e0b; }
        }
        .proc-glow {
          animation: goldenGlow 1.2s infinite;
        }
      `}</style>

      {/* Low-health screen vignette alert filter */}
      {gameState === "running" && activeAlert?.type === "health" && (
        <div className="absolute inset-0 pointer-events-none z-40 alert-vignette-active" />
      )}

      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-violet-900/5 blur-[120px] pointer-events-none" />
      
      {/* Tunnel Vision Peripheral Awareness Canvas Overlay */}
      {gameState === "running" && tunnelVisionActive && (
        <div className="absolute inset-0 pointer-events-none z-30 select-none overflow-hidden">
          <TunnelVisionOrb
            active={gameState === "running"}
            onOrbRedTrigger={(maxPoints) => {
              setOrbTotalPossible((prev) => prev + maxPoints);
            }}
            onOrbClicked={(score) => {
              setOrbScoreEarned((prev) => prev + score);
            }}
          />
        </div>
      )}

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
              href="/dashboard"
              className="text-sm font-semibold text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      {/* Content wrapper */}
      <div className="flex-grow flex flex-col justify-between max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        
        {/* Real-time feedback bar */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 bg-zinc-900/25 border border-zinc-900 p-3 rounded-2xl backdrop-blur-sm">
          <div className="text-center sm:border-r border-zinc-850 py-1">
            <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest block">Timer</span>
            <span className="text-xl font-mono font-black text-white">
              {gameState === "running"
                ? (selectedScenario.duration - elapsedTime).toFixed(1) + "s"
                : selectedScenario.duration.toFixed(1) + "s"}
            </span>
          </div>

          <div className="text-center sm:border-r border-zinc-850 py-1">
            <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest block">Accuracy</span>
            <span className={`text-xl font-black ${
              currentAccuracy >= 90 ? 'text-emerald-400' : currentAccuracy >= 75 ? 'text-amber-400' : 'text-rose-500'
            }`}>
              {currentAccuracy}%
            </span>
          </div>

          <div className="text-center sm:border-r border-zinc-850 py-1">
            <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest block">Avg Reaction</span>
            <span className="text-xl font-mono font-black text-white">
              {currentAvgReaction > 0 ? `${currentAvgReaction}ms` : "0ms"}
            </span>
          </div>

          <div className="text-center py-1">
            <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest block">Combo Streak</span>
            <span className="text-xl font-black text-violet-400">{combo}x</span>
          </div>
        </div>

        {/* Center Panel: Active Prompt & Target Indicator */}
        <div className={`w-full flex-grow flex flex-col justify-center items-center py-12 min-h-[240px] ${
          activeAlert ? "animate-shake" : ""
        }`}>
          {gameState === "idle" && (
            <div className="text-center space-y-6 max-w-md w-full">
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white">Select Drill & Launch</h2>
                <p className="text-zinc-400 text-sm">Choose a practice drill. Place your fingers on your bindings and hit Start.</p>
              </div>

              {/* Class & Spec Selector */}
              <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-900/40 text-left space-y-3">
                <div className="flex items-center space-x-2 text-violet-400 font-extrabold text-xs uppercase tracking-wider">
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="size-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                  <span>Select Class & Specialization</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide block mb-1">Class</label>
                    <select
                      value={selectedClass}
                      onChange={(e) => handleClassChange(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:border-violet-500 focus:outline-none cursor-pointer"
                    >
                      {WOW_CLASSES_SPECS.map(c => (
                        <option key={c.key} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide block mb-1">Specialization</label>
                    <select
                      value={selectedSpec}
                      onChange={(e) => handleSpecChange(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:border-violet-500 focus:outline-none cursor-pointer"
                    >
                      {(WOW_CLASSES_SPECS.find(c => c.name === selectedClass)?.specs || []).map(spec => (
                        <option key={spec} value={spec}>{spec}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Spell Audit Warning Card */}
              {missingSpells.length > 0 && (
                <div className="p-4 rounded-xl border border-amber-900/50 bg-amber-950/20 text-left space-y-2 max-w-md mx-auto">
                  <div className="flex items-center space-x-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider">
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="size-4 text-amber-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    <span>Missing Core Action Bar Spells</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Your imported WoW action bar is missing the following essential rotational spells: 
                    <span className="text-amber-200 font-bold ml-1">{missingSpells.map(s => s.name).join(", ")}</span>.
                    We recommend placing them in-game and re-importing.
                  </p>
                </div>
              )}

              <div className="flex flex-col space-y-2">
                {scenarios.map((scen) => (
                  <button
                    key={scen.id}
                    onClick={() => setSelectedScenario(scen)}
                    className={`p-4 rounded-xl border text-left flex justify-between items-center transition-all ${
                      selectedScenario.id === scen.id
                        ? "bg-violet-950/20 border-violet-500/80 text-white"
                        : "bg-zinc-900/30 border-zinc-850 text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200"
                    }`}
                  >
                    <div>
                      <span className="font-extrabold text-sm block">{scen.name}</span>
                      <span className="text-[10px] text-zinc-500">{scen.description}</span>
                    </div>
                    <span className="text-xs font-black bg-zinc-900 px-2 py-0.5 rounded font-mono">
                      {scen.duration}s
                    </span>
                  </button>
                ))}
              </div>

              {/* Collapsible Advanced Gameplay Modifiers */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedModifiers(!showAdvancedModifiers)}
                  className="text-xs font-black text-zinc-500 hover:text-zinc-350 transition-colors uppercase tracking-wider flex items-center justify-center space-x-1 mx-auto cursor-pointer"
                >
                  <span>{showAdvancedModifiers ? "Hide Advanced Settings ▴" : "Show Advanced Settings ▾"}</span>
                </button>
              </div>

              {showAdvancedModifiers && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl w-full select-none mx-auto animate-fade-in-up">
                  {/* Hardcore switch */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-850 bg-zinc-900/20 w-full">
                    <div className="text-left space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-extrabold text-xs text-white uppercase tracking-wider">Hardcore Mode</span>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-rose-950/60 border border-rose-900 text-rose-400 uppercase tracking-widest">High Stakes</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 block leading-tight">Hides action bars and keybind helps. Any mistake is fatal.</span>
                    </div>
                    <button
                      onClick={() => {
                        setIsHardcore(!isHardcore);
                        if (!isHardcore) setIsGuidedMode(false);
                      }}
                      className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none cursor-pointer ${
                        isHardcore ? "bg-rose-600" : "bg-zinc-800"
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                          isHardcore ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Training Wheels switch */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-850 bg-zinc-900/20 w-full">
                    <div className="text-left space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-extrabold text-xs text-white uppercase tracking-wider">Training Wheels</span>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-950/60 border border-emerald-900 text-emerald-400 uppercase tracking-widest">Guided</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 block leading-tight">Highlights the next spell on action bars in green.</span>
                    </div>
                    <button
                      onClick={() => {
                        setIsGuidedMode(!isGuidedMode);
                        if (!isGuidedMode) setIsHardcore(false);
                      }}
                      className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none cursor-pointer ${
                        isGuidedMode ? "bg-emerald-600" : "bg-zinc-800"
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                          isGuidedMode ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Heartbeat Sound switch */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-850 bg-zinc-900/20 w-full">
                    <div className="text-left space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-extrabold text-xs text-white uppercase tracking-wider">Metronome Beat</span>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-violet-950/60 border border-violet-900 text-violet-400 uppercase tracking-widest">SFX</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 block leading-tight">Plays a low heartbeat metronome to simulate high-stress raids.</span>
                    </div>
                    <button
                      onClick={() => {
                        const newMuted = !isMuted;
                        setIsMuted(newMuted);
                        if ((gameState as string) === "running") {
                          if (newMuted) synthRef.current?.stopHeartbeat();
                          else synthRef.current?.startHeartbeat(false);
                        }
                      }}
                      className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none cursor-pointer ${
                        !isMuted ? "bg-violet-600" : "bg-zinc-800"
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                          !isMuted ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Tunnel Vision switch */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-850 bg-zinc-900/20 w-full">
                    <div className="text-left space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-extrabold text-xs text-white uppercase tracking-wider">Tunnel Vision</span>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-950/60 border border-amber-900 text-amber-450 uppercase tracking-widest">Awareness</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 block leading-tight">Spawns moving target spheres to train peripheral zone awareness.</span>
                    </div>
                    <button
                      onClick={() => setTunnelVisionActive(!tunnelVisionActive)}
                      className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none cursor-pointer ${
                        tunnelVisionActive ? "bg-amber-600" : "bg-zinc-800"
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                          tunnelVisionActive ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Sustained Duration Selector */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-zinc-850 bg-zinc-900/20 w-full sm:col-span-2 gap-3">
                    <div className="text-left space-y-0.5">
                      <span className="font-extrabold text-xs text-white uppercase tracking-wider">Rotation Drill Duration</span>
                      <span className="text-[10px] text-zinc-500 block leading-tight">Configure the length of your sustained rotation practice sessions.</span>
                    </div>
                    <div className="flex space-x-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800 shrink-0">
                      {[60, 180, 300, 600].map((dur) => (
                        <button
                          key={dur}
                          onClick={() => setDrillDuration(dur)}
                          className={`px-3 py-1 text-[10px] font-black rounded-md uppercase font-mono transition-all cursor-pointer ${
                            drillDuration === dur
                              ? "bg-violet-600 text-white shadow"
                              : "text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          {dur >= 60 ? `${dur / 60}m` : `${dur}s`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={startCountdown}
                className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-lg shadow-violet-500/25 active:scale-98 transition-all cursor-pointer"
              >
                Start Training Simulator
              </button>
            </div>
          )}

          {gameState === "countdown" && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <span className="text-8xl font-black text-violet-400 animate-ping">
                {countdown}
              </span>
            </div>
          )}

          {gameState === "running" && activeAlert && (
            <div className="flex flex-col items-center justify-center space-y-8">
              <div className={`w-32 h-32 rounded-2xl bg-zinc-950 border-4 ${
                activeAlert.type === "interrupt" ? "border-amber-500 shadow-amber-500/20" :
                activeAlert.type === "health" ? "border-rose-600 shadow-rose-600/20" :
                activeAlert.type === "dispel" ? "border-emerald-500 shadow-emerald-500/20" :
                "border-indigo-500 shadow-indigo-500/20"
              } flex flex-col items-center justify-center relative shadow-2xl transition-all`}>
                
                <div className="w-16 h-16 flex items-center justify-center text-white">
                  {activeAlert.type === "interrupt" && (
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-14 text-amber-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                  )}
                  {activeAlert.type === "health" && (
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-14 text-rose-500 animate-pulse">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                    </svg>
                  )}
                  {activeAlert.type === "defensive" && (
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-14 text-indigo-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                    </svg>
                  )}
                  {activeAlert.type === "dispel" && (
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-14 text-emerald-400 animate-pulse">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21m0 0-.813-5.096A7.5 7.5 0 1 1 18.259 8.28a7.5 7.5 0 0 1-8.446 7.624ZM12 8.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" />
                    </svg>
                  )}
                </div>

                {!isHardcore && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[10px] font-mono font-black text-zinc-300">
                    Key: {activeAlert.key}
                  </span>
                )}
              </div>

              {activeAlert.type === "interrupt" && (
                <div className="w-56 h-3.5 bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden relative">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-75"
                    style={{ width: `${Math.max(0, ((activeAlert.expiresAt - elapsedTime) / 1.2) * 100)}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] font-bold text-white uppercase tracking-widest">
                    Boss Cast
                  </span>
                </div>
              )}

              <div className="text-center space-y-1">
                <span className={`text-xs font-bold uppercase tracking-widest ${
                  activeAlert.type === "health" ? "text-rose-500 animate-pulse" :
                  activeAlert.type === "interrupt" ? "text-amber-500" :
                  activeAlert.type === "dispel" ? "text-emerald-400 animate-pulse" :
                  "text-indigo-400"
                }`}>
                  {activeAlert.type === "health" ? "SURVIVAL ALERT!" :
                   activeAlert.type === "interrupt" ? "INTERRUPT MECHANIC!" :
                   activeAlert.type === "dispel" ? "DISPEL / DECURSE!" :
                   "DEFENSIVE NEEDED!"}
                </span>
                <h3 className="text-2xl font-black text-white">
                  {activeAlert.prompt}
                </h3>
              </div>
            </div>
          )}

          {gameState === "running" && !activeAlert && (
            <div className="flex flex-col items-center justify-center space-y-8">
              {activeSpell ? (
                <div className="flex flex-col items-center space-y-4 w-full max-w-xl">
                  {/* Sequence Lane Container */}
                  <div className="w-full bg-zinc-950/60 border border-zinc-900 rounded-3xl p-4 flex flex-col items-center relative overflow-hidden backdrop-blur-sm shadow-[0_0_30px_rgba(0,0,0,0.5)] animate-fade-in-up">
                    
                    {/* Horizontal Connector Dotted Line */}
                    <div className="absolute top-[48px] left-[12%] right-[12%] border-t-2 border-dashed border-zinc-800/40 z-0" />
                    
                    {/* Spell Timeline Row */}
                    <div className="flex items-center justify-center space-x-6 relative z-10 w-full select-none">
                      {/* We show the next 4 spells */}
                      {[0, 1, 2, 3].map((offset) => {
                        const targetIdx = activeStepIndex !== null ? activeStepIndex + offset : offset;
                        const step = selectedScenario.steps[targetIdx];
                        if (!step) return null;
                        
                        const spell = getMappedSpell(step.spellId);
                        const isCurrent = offset === 0;
                        
                        return (
                          <div
                            key={targetIdx}
                            className={`flex flex-col items-center transition-all duration-300 ${
                              isCurrent
                                ? "scale-105"
                                : "opacity-45 scale-90"
                            }`}
                          >
                            <div className={`w-16 h-16 rounded-xl bg-zinc-900 border flex flex-col items-center justify-center relative shadow-lg ${
                              isCurrent
                                ? isGuidedMode || selectedScenario.isProcReaction
                                  ? "proc-highlight border-emerald-500/80"
                                  : "spell-highlight border-violet-500/80"
                                : "border-zinc-800"
                            }`}>
                              <div className="w-7 h-7 flex items-center justify-center relative">
                                {!failedIcons[spell.id] ? (
                                  <img
                                    src={getSpellIconUrl(spell.id)}
                                    alt={spell.name}
                                    onError={() => setFailedIcons(prev => ({ ...prev, [spell.id]: true }))}
                                    className="w-full h-full rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center" style={{ color: spell.color }}>
                                    {getSpellIconSVG(spell.name)}
                                  </div>
                                )}
                              </div>
                              
                              {/* Display keybind helper */}
                              {!isHardcore && (
                                <span className={`absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-md font-mono text-[9px] font-black border transition-all ${
                                  isCurrent
                                    ? "bg-violet-600 border-violet-500 text-white shadow-sm"
                                    : "bg-zinc-950 border-zinc-850 text-zinc-350"
                                }`}>
                                  {spell.keybind || "Unbound"}
                                </span>
                              )}
                            </div>
                            
                            <span className={`text-[9px] font-black uppercase mt-1.5 tracking-wider ${
                              isCurrent ? "text-zinc-200" : "text-zinc-500"
                            } truncate max-w-[75px] px-1 text-center`}>
                              {spell.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active prompt status text */}
                  <div className="text-center space-y-1">
                    <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest block">
                      {selectedScenario.isProcReaction ? "Proc Alert" : "Current Rotation Step"}
                    </span>
                    <h3 className="text-xl font-black text-white">
                      {isHardcore ? (
                        <span className="text-rose-500 font-extrabold uppercase tracking-widest text-sm animate-pulse">HARDCORE MEMORY TEST</span>
                      ) : (
                        <>Press Key: <span className={`${isGuidedMode ? 'text-emerald-400 bg-emerald-950/40 border-emerald-900' : 'text-violet-400 bg-violet-950/40 border-violet-900'} font-mono text-2xl px-2 py-0.5 rounded border`}>{activeSpell.keybind || "Unbound"}</span></>
                      )}
                    </h3>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <span className="text-xl font-black text-zinc-500 tracking-wider">
                    {selectedScenario.isProcReaction ? "WAITING FOR PROC..." : "COMMENCING ROTATION..."}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-ping inline-block mx-auto" />
                </div>
              )}

              {/* Mini HUD feedback ticker */}
              {lastPressResult && (
                <div className="text-center animate-fade-in-out">
                  <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${
                    lastPressResult.status === "perfect" ? "bg-violet-950/60 border-violet-800 text-violet-400" :
                    lastPressResult.status === "early" ? "bg-amber-950/60 border-amber-800 text-amber-400" :
                    lastPressResult.status === "late" ? "bg-amber-950/40 border-amber-900 text-amber-500" :
                    lastPressResult.status === "missed" ? "bg-red-950/50 border-red-900 text-red-500" :
                    "bg-red-950 border-red-800 text-red-400"
                  }`}>
                    {lastPressResult.status === "perfect" && `🎯 PERFECT TIMING!`}
                    {lastPressResult.status === "early" && `⚡ TOO EARLY!`}
                    {lastPressResult.status === "late" && `🐢 SLIGHTLY LATE`}
                    {lastPressResult.status === "missed" && `💨 MISSED GCD`}
                    {lastPressResult.status === "incorrect" && `❌ WRONG KEY (${lastPressResult.key})`}
                  </span>
                </div>
              )}
            </div>
          )}

          {gameState === "finished" && wipedReason && (
            <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6 flex-grow flex flex-col justify-center items-center select-none">
              <div className="w-24 h-24 rounded-full bg-rose-950/60 border-2 border-rose-500 flex items-center justify-center shadow-2xl shadow-rose-500/20 text-rose-500 animate-bounce">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-14">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12v-.008Z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h2 className="text-4xl font-black text-rose-500 tracking-wider">YOU WIPED THE RAID</h2>
                <p className="text-zinc-400 text-sm max-w-sm mx-auto">
                  {wipedReason === "mechanic" 
                    ? "You failed to respond to a critical encounter mechanic in time. Boss mechanics are fatal on Hardcore!"
                    : "You pressed the incorrect keybind. Mistakes are fatal on Hardcore!"}
                </p>
              </div>
              <button
                onClick={resetGame}
                className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm rounded-xl transition-all hover:scale-105 shadow-lg shadow-rose-500/20 uppercase tracking-wider"
              >
                Release Spirit & Retry
              </button>
            </div>
          )}

          {gameState === "finished" && finalStats && !wipedReason && (
            <div className="w-full max-w-2xl bg-zinc-900/50 border border-zinc-850 p-8 rounded-3xl space-y-8 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-44 h-44 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="text-center border-b border-zinc-800 pb-4">
                <span className="inline-block px-3 py-0.5 rounded bg-violet-950/50 border border-violet-900/60 text-[10px] text-violet-400 font-extrabold tracking-widest uppercase mb-2">
                  Session Feedback Complete
                </span>
                <h2 className="text-3xl font-black text-white">Simulation Metrics</h2>
              </div>

              {/* Main Score Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-850 text-center">
                  <span className="text-[10px] text-zinc-500 font-extrabold uppercase block tracking-wider">Accuracy</span>
                  <span className={`text-2xl font-black block mt-1 ${
                    finalStats.accuracy >= 90 ? 'text-emerald-400' : finalStats.accuracy >= 75 ? 'text-amber-400' : 'text-rose-500'
                  }`}>{finalStats.accuracy}%</span>
                </div>
                <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-850 text-center">
                  <span className="text-[10px] text-zinc-500 font-extrabold uppercase block tracking-wider">Avg Speed</span>
                  <span className="text-2xl font-black text-white block mt-1 font-mono">{finalStats.avgReactionTime}ms</span>
                </div>
                <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-850 text-center">
                  <span className="text-[10px] text-zinc-500 font-extrabold uppercase block tracking-wider">Downtime</span>
                  <span className="text-2xl font-black text-amber-500 block mt-1 font-mono">{finalStats.totalDowntime}s</span>
                </div>
                <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-850 text-center">
                  <span className="text-[10px] text-zinc-500 font-extrabold uppercase block tracking-wider">Perfect Hits</span>
                  <span className="text-2xl font-black text-violet-400 block mt-1 font-mono">{finalStats.perfectPressed}</span>
                </div>
              </div>

              {/* Coaching Feedback Notes */}
              <div className="bg-zinc-950/50 p-6 rounded-2xl border border-zinc-850 space-y-3">
                <h3 className="font-extrabold text-sm text-zinc-400 uppercase tracking-widest">Rotational Coaching</h3>
                <ul className="space-y-2.5">
                  {finalStats.feedback.map((note, index) => (
                    <li key={index} className="text-xs text-zinc-300 leading-relaxed flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Modifier Reaction Speed Averages */}
              {finalStats.modifierDelays && (
                <div className="bg-zinc-950/30 p-4 rounded-xl border border-zinc-850 space-y-2 text-xs">
                  <span className="font-bold text-zinc-400 block uppercase tracking-wider">Modifier Key Delays</span>
                  <div className="space-y-1.5 font-semibold text-zinc-300">
                    <div className="flex justify-between">
                      <span>Base Keys (No Modifier)</span>
                      <span className="text-zinc-200 font-mono">{finalStats.modifierDelays.baseAvg}ms</span>
                    </div>
                    {finalStats.modifierDelays.shiftAvg > 0 && (
                      <div className="flex justify-between">
                        <span>Shift Key Modifier</span>
                        <span className="text-violet-400 font-mono">{finalStats.modifierDelays.shiftAvg}ms</span>
                      </div>
                    )}
                    {finalStats.modifierDelays.ctrlAvg > 0 && (
                      <div className="flex justify-between">
                        <span>Ctrl Key Modifier</span>
                        <span className="text-violet-400 font-mono">{finalStats.modifierDelays.ctrlAvg}ms</span>
                      </div>
                    )}
                    {finalStats.modifierDelays.altAvg > 0 && (
                      <div className="flex justify-between">
                        <span>Alt Key Modifier</span>
                        <span className="text-violet-400 font-mono">{finalStats.modifierDelays.altAvg}ms</span>
                      </div>
                    )}
                    {finalStats.modifierDelays.modAvg > 0 && (
                      <div className="flex justify-between font-bold text-zinc-400 border-t border-zinc-850 pt-1.5">
                        <span>All Modifiers Average</span>
                        <span className="text-violet-400 font-mono">{finalStats.modifierDelays.modAvg}ms</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Transition Fatigue Warnings */}
              {finalStats.transitionFatigues && finalStats.transitionFatigues.length > 0 && (
                <div className="bg-zinc-950/30 p-4 rounded-xl border border-zinc-850 space-y-2 text-xs">
                  <span className="font-bold text-rose-400 block uppercase tracking-wider">Transition Fatigue Warning</span>
                  <p className="text-[10px] text-zinc-500">You consistently delayed the following spell transitions by more than 25% of your average speed:</p>
                  <div className="space-y-1.5 font-semibold text-zinc-300">
                    {finalStats.transitionFatigues.map((t, idx) => (
                      <div key={idx} className="flex justify-between border-b border-zinc-900 pb-1">
                        <span>{t.fromSpell} &rarr; {t.toSpell}</span>
                        <span className="text-amber-500 font-mono font-bold">{t.delayMs}ms</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Keybind layout audits warnings */}
              {finalStats.keybindAudits && finalStats.keybindAudits.length > 0 && (
                <div className="bg-zinc-950/50 p-6 rounded-2xl border border-amber-900/40 space-y-3">
                  <h3 className="font-extrabold text-sm text-amber-500 uppercase tracking-widest flex items-center space-x-1.5">
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="size-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    <span>Keybind Layout Audits</span>
                  </h3>
                  <ul className="space-y-2 text-[11px] text-zinc-300">
                    {finalStats.keybindAudits.map((audit, idx) => (
                      <li key={idx} className="leading-relaxed flex items-start space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                        <span>{audit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Restart buttons */}
              <div className="flex space-x-4 pt-4 border-t border-zinc-800">
                <button
                  onClick={startCountdown}
                  className="flex-grow py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold rounded-xl active:scale-98 transition-all"
                >
                  Restart Simulation
                </button>
                <button
                  onClick={resetGame}
                  className="px-6 py-3.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-extrabold rounded-xl active:scale-98 transition-all"
                >
                  Change Drill
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Panel: Visual WoW Action Bar */}
        <div className="w-full flex flex-col items-center space-y-6 pt-4 border-t border-zinc-900">
          <div className="flex flex-wrap items-center justify-center gap-3 w-full">
            {isHardcore && gameState === "running" ? (
              <div className="h-16 flex items-center justify-center text-xs font-bold text-zinc-600 uppercase tracking-widest border border-dashed border-zinc-850 rounded-2xl w-full max-w-2xl px-6 bg-zinc-950/20 backdrop-blur-sm select-none">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-4 mr-2 text-rose-500 animate-pulse">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                <span>Action Bar Masked (Hardcore Mode Active)</span>
              </div>
            ) : (
              activeCoreSpells.map((coreSpell: any) => {
                const spell = getMappedSpell(coreSpell.id);
                const isSpellActive = activeSpell?.id === spell.id;
                const keybind = spell.keybind;
                const remainingCd = getRemainingCooldown(coreSpell.id);
                return (
                  <div
                    key={spell.id}
                    className={`w-16 h-16 rounded-xl bg-zinc-900 border flex flex-col items-center justify-center relative cursor-default transition-all select-none ${
                      pressedKeys[keybind] ? "key-pressed-visual scale-95" : ""
                    } ${
                      isSpellActive
                        ? isGuidedMode || selectedScenario.isProcReaction
                          ? "proc-highlight border-emerald-500/80 scale-105"
                          : "spell-highlight border-violet-500/80 scale-105"
                        : "border-zinc-850 hover:border-zinc-750 opacity-90"
                    }`}
                    style={{
                      boxShadow: isSpellActive
                        ? `0 0 15px 1px ${isGuidedMode || selectedScenario.isProcReaction ? '#10b981' : '#8b5cf6'}20`
                        : "none",
                    }}
                  >
                    <div className="w-7 h-7 flex items-center justify-center relative">
                      {!failedIcons[spell.id] ? (
                        <img
                          src={getSpellIconUrl(spell.id)}
                          alt={spell.name}
                          onError={() => setFailedIcons(prev => ({ ...prev, [spell.id]: true }))}
                          className="w-full h-full rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ color: spell.color || getSpellColor(spell.name) }}>
                          {getSpellIconSVG(spell.name)}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] font-black text-zinc-400 mt-1 uppercase tracking-wide truncate max-w-full px-1 text-center">
                      {spell.name}
                    </span>
                    
                    {/* Action bind key or UNBOUND indicator */}
                    {keybind ? (
                      <span className={`absolute -top-1.5 -right-1.5 z-10 px-1.5 py-0.5 rounded-md font-mono text-[10px] font-black border transition-all ${
                        pressedKeys[keybind]
                          ? "bg-violet-600 border-violet-500 text-white scale-95 shadow-md shadow-violet-500/20"
                          : "bg-zinc-950/90 border-zinc-850 text-zinc-200 shadow-sm"
                      }`}>
                        {keybind}
                      </span>
                    ) : (
                      <span className="absolute -top-1.5 -right-1.5 z-10 px-1.5 py-0.5 rounded-md font-mono text-[8px] font-black border bg-red-950/90 border-red-800 text-red-400 shadow-sm">
                        UNBOUND
                      </span>
                    )}

                    {/* Cooldown Overlay & Text */}
                    {remainingCd > 0 ? (
                      <div className="absolute inset-0 bg-black/65 rounded-xl flex flex-col items-center justify-center pointer-events-none select-none z-20">
                        <span className="font-mono text-base font-black text-amber-400 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.85)]">
                          {remainingCd > 60 
                            ? `${Math.ceil(remainingCd / 60)}m` 
                            : remainingCd > 5 
                              ? Math.ceil(remainingCd) 
                              : remainingCd.toFixed(1)
                          }
                        </span>
                      </div>
                    ) : (
                      /* GCD Swipe Overlay */
                      isGcdActive && (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: `conic-gradient(rgba(9, 9, 11, 0.75) ${gcdPercent}%, transparent ${gcdPercent}%)`,
                            transform: 'rotate(-90deg)',
                            borderRadius: 'inherit',
                          }}
                        />
                      )
                    )}
                  </div>
                );
              })
            )}
          </div>
     
          {/* Interactive Keyboard Visualizer HUD */}
          <div className="flex flex-col items-center space-y-1.5">
            <span className="text-[9px] text-zinc-600 font-extrabold uppercase tracking-widest">
              Keyboard Monitor (Real-time)
            </span>
            <div className="flex flex-wrap items-center justify-center gap-1.5 font-mono text-xs text-zinc-500">
              {activeCoreSpells
                .map((core: any) => getMappedSpell(core.id).keybind)
                .filter((k: string, idx: number, self: string[]) => k && self.indexOf(k) === idx)
                .map((k: string) => (
                  <div
                    key={k}
                    className={`px-3 h-7 rounded border flex items-center justify-center font-extrabold transition-all select-none min-w-[28px] ${
                      pressedKeys[k]
                        ? "bg-violet-600 border-violet-500 text-white scale-90 shadow-md shadow-violet-500/20"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    {k}
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Dashboard cancel/return button */}
        {gameState !== "running" && gameState !== "countdown" && (
          <div className="pt-4 text-center">
            <Link
              href="/dashboard"
              className="text-xs font-extrabold text-zinc-500 hover:text-zinc-350 transition-colors uppercase tracking-widest flex items-center space-x-1"
            >
              <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-4 inline">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              <span>Back to Dashboard</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
