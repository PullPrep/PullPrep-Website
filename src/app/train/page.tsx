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
} from "@/lib/trainingEngine";

// Web Audio API Synthesizer for premium instant feedback
class SoundSynthesizer {
  private ctx: AudioContext | null = null;

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

const getSpellColor = (name: string): string => {
  const lowercase = name.toLowerCase();
  if (lowercase.includes("chaos strike")) return "#ef4444";
  if (lowercase.includes("blade dance")) return "#10b981";
  if (lowercase.includes("eye beam")) return "#8b5cf6";
  if (lowercase.includes("metamorphosis")) return "#eab308";
  return "#a855f7"; // default purple
};

const getSpellIconSVG = (name: string) => {
  const lowercase = name.toLowerCase();
  if (lowercase.includes("metamorphosis")) {
    return (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
      </svg>
    );
  }
  if (lowercase.includes("eye beam")) {
    return (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    );
  }
  if (lowercase.includes("blade dance")) {
    return (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 6-6m0 0 6 6m-6-6v12m0 3.75a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
      </svg>
    );
  }
  if (lowercase.includes("chaos strike")) {
    return (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
      </svg>
    );
  }
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.982-5.096c.86-.487 1.018-1.666.294-2.39L14.73 9.967c-.724-.724-1.903-.566-2.39.294L9.813 15.904z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 21h6.75M9 21a2.25 2.25 0 01-2.25-2.25v-6M18 10.5h.008v.008H18V10.5zm-3-3h.008v.008H15V7.5z" />
    </svg>
  );
};

export default function Train() {
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

  // Active key pressed tracking for UI visualizer
  const [pressedKeys, setPressedKeys] = useState<Record<string, boolean>>({});

  const synthRef = useRef<SoundSynthesizer | null>(null);
  const gameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef({ gameState, elapsedTime, activeStepIndex, activeSpell, activePromptTime, casts, combo, lastCastTime });

  // Update ref to read latest states inside timers/listeners
  useEffect(() => {
    stateRef.current = { gameState, elapsedTime, activeStepIndex, activeSpell, activePromptTime, casts, combo, lastCastTime };
  }, [gameState, elapsedTime, activeStepIndex, activeSpell, activePromptTime, casts, combo, lastCastTime]);

  // Lazy initialize Synthesizer
  useEffect(() => {
    synthRef.current = new SoundSynthesizer();
    return () => {
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    };
  }, []);

  const [activeBuild, setActiveBuild] = useState<ImportedBuild | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("pullprep_active_build");
    if (saved) {
      try {
        setActiveBuild(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved build", e);
      }
    }
  }, []);

  const getSpellKeybind = (spellId: number): string => {
    if (activeBuild) {
      for (const bar of activeBuild.actionBars) {
        for (const btn of bar.buttons) {
          if (btn.id === spellId && btn.key) {
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
    };
    const targetId = idMap[spellId] || spellId;
    return `/icons/${targetId}.jpg`;
  };

  const getMappedSpell = (havocSpellId: number): Spell => {
    const defaultSpell = DEMON_HUNTER_SPELLS[havocSpellId];
    if (!activeBuild) return defaultSpell;

    const isVengeance = activeBuild.class?.toUpperCase() === "DEMONHUNTER" && activeBuild.spec?.toLowerCase().includes("vengeance");
    if (!isVengeance) return defaultSpell;

    // Search terms for Vengeance counterpart spells
    let searchNames: string[] = [];
    let fallbackId = havocSpellId;
    let fallbackName = defaultSpell.name;
    let fallbackColor = defaultSpell.color;
    let fallbackIcon = defaultSpell.icon;

    if (havocSpellId === 191427) { // Metamorphosis
      searchNames = ["metamorphosis"];
      fallbackId = 187827;
      fallbackName = "Metamorphosis";
    } else if (havocSpellId === 198013) { // Eye Beam -> Fel Devastation
      searchNames = ["fel devastation", "eye beam"];
      fallbackId = 212084;
      fallbackName = "Fel Devastation";
      fallbackColor = "#10b981"; // green
      fallbackIcon = "eye-beam";
    } else if (havocSpellId === 188499) { // Blade Dance -> Soul Cleave / Spirit Bomb
      searchNames = ["soul cleave", "spirit bomb", "blade dance"];
      fallbackId = 228477;
      fallbackName = "Soul Cleave";
      fallbackColor = "#ef4444"; // red
      fallbackIcon = "blade-dance";
    } else if (havocSpellId === 162794) { // Chaos Strike -> Fracture / Shear
      searchNames = ["fracture", "shear", "chaos strike"];
      fallbackId = 227084;
      fallbackName = "Fracture";
      fallbackColor = "#eab308"; // yellow/orange
      fallbackIcon = "chaos-strike";
    }

    // Try to find the spell on their bars
    for (const bar of activeBuild.actionBars) {
      for (const btn of bar.buttons) {
        if (btn.type !== "empty" && btn.name) {
          const nameLower = btn.name.toLowerCase();
          if (searchNames.some(sName => nameLower.includes(sName))) {
            return {
              id: btn.id,
              name: btn.name,
              keybind: btn.key,
              icon: fallbackIcon,
              color: fallbackColor,
              description: btn.name,
            };
          }
        }
      }
    }

    // Fallback if not found on their bar
    return {
      id: fallbackId,
      name: fallbackName,
      keybind: getSpellKeybind(fallbackId) || defaultSpell.keybind,
      icon: fallbackIcon,
      color: fallbackColor,
      description: fallbackName,
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
    setLastCastTime(null);

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

    let steps = [...selectedScenario.steps];
    
    // For Proc Reaction drills, generate steps dynamically
    if (selectedScenario.isProcReaction) {
      steps = [];
      const numSteps = Math.floor(selectedScenario.duration / 2);
      let currTime = 1.0;
      for (let i = 0; i < numSteps; i++) {
        // Random spell: CS, BD, EB
        const spellIds = [162794, 188499, 198013];
        const randomId = spellIds[Math.floor(Math.random() * spellIds.length)];
        steps.push({ time: currTime, spellId: randomId });
        currTime += 1.8 + Math.random() * 1.5; // spaced 1.8s to 3.3s
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

      // Check if we need to show the next step
      const { activeStepIndex: curIdx, casts: currentCasts } = stateRef.current;
      const nextStepIndex = curIdx === null ? 0 : curIdx + 1;

      if (nextStepIndex < steps.length) {
        const nextStep = steps[nextStepIndex];
        if (currentElapsed >= nextStep.time) {
          // Check if previous step was missed
          if (curIdx !== null) {
            const wasHit = currentCasts.some((c) => c.stepIndex === curIdx);
            if (!wasHit) {
              // Register missed press
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
              setLastPressResult({ key: getMappedSpell(prevStep.spellId).keybind, status: "missed" });
            }
          }

          setActiveStepIndex(nextStepIndex);
          setActiveSpell(getMappedSpell(nextStep.spellId));
          setActivePromptTime(currentElapsed);
        }
      }
    }, 20); // 50 ticks per second
  };

  const endGame = () => {
    if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    setGameState("finished");
    
    // Evaluate final stats
    const { casts: finalCasts } = stateRef.current;
    
    // Calculate total downtime
    // Downtime = elapsed time spent while a key prompt was active, minus the reaction time
    let totalDowntime = 0;
    const promptWindow = 1.0; // 1 second window to respond
    
    // Simple downtime representation: sum up gaps of inactivity
    const maxReaction = 1.0;
    finalCasts.forEach(c => {
      if (c.status === "missed") {
        totalDowntime += maxReaction;
      } else if (c.reactionTime !== null) {
        const reactionSeconds = c.reactionTime / 1000;
        if (reactionSeconds > 0.45) {
          totalDowntime += (reactionSeconds - 0.45); // delays beyond perfect window
        }
      }
    });

    const stats = compileStats(finalCasts, selectedScenario, totalDowntime);
    setFinalStats(stats);
    setActiveSpell(null);
    setActiveStepIndex(null);
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
  };

  // Listen to keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore standalone modifier presses
      if (["Shift", "Control", "Alt"].includes(e.key)) return;

      const pressedWoWKey = getWoWKeyString(e);
      const validBinds = getActiveKeybinds();
      if (!validBinds.has(pressedWoWKey)) return;

      e.preventDefault();
      
      // Update visualizer state
      setPressedKeys((prev) => ({ ...prev, [pressedWoWKey]: true }));

      const {
        gameState: currentGameState,
        activeSpell: currentSpell,
        activeStepIndex: currentIndex,
        activePromptTime: currentPromptTime,
        casts: currentCasts,
        lastCastTime: currentLastCastTime
      } = stateRef.current;

      if (currentGameState !== "running") return;

      const elapsed = stateRef.current.elapsedTime;
      const steps = selectedScenario.steps;
      const gcdDuration = 1.5;
      const queueWindow = 0.25; // 250ms

      // Determine if GCD is active
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

      // 1. Identify which step/spell is being targeted
      let targetStepIndex = currentIndex;
      let targetSpell = currentSpell;
      let targetPromptTime = currentPromptTime;

      const nextStepIndex = currentIndex === null ? 0 : currentIndex + 1;

      // Check if user is queueing the next step ahead of schedule (only for fixed rotations)
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

      // 2. Handle GCD lockout
      if (isGcdActive) {
        // If they pressed the correct target keybind during lockout, ignore (allow spamming)
        // If they pressed an incorrect keybind, register as incorrect
        if (targetSpell && pressedWoWKey !== expectedKeybind) {
          registerIncorrectPress(pressedWoWKey);
        }
        return;
      }

      // 3. Evaluate the cast
      if (targetSpell && targetStepIndex !== null) {
        // Check if this step was already responded to
        const alreadyResponded = currentCasts.some((c) => c.stepIndex === targetStepIndex);
        if (alreadyResponded) {
          registerIncorrectPress(pressedWoWKey);
          return;
        }

        const timeDiff = actualCastTime - (targetPromptTime || 0);

        // Override targetSpell keybind with dynamic keybind before passing to evaluatePress
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
          setCombo(0);
          playSound("incorrect");
        }
      } else {
        registerIncorrectPress(pressedWoWKey);
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
  }, [selectedScenario, activeBuild]);

  const registerIncorrectPress = (key: string) => {
    const elapsed = stateRef.current.elapsedTime;
    const actualSpellId = activeBuild
      ? (activeBuild.actionBars.flatMap(bar => bar.buttons).find(btn => btn.key === key)?.id || null)
      : (Object.values(DEMON_HUNTER_SPELLS).find((s) => s.keybind === key)?.id || null);

    const newRecord: CastRecord = {
      stepIndex: -1, // Penalty
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

  // Stats for real-time dashboard
  const totalStepsEvaluated = casts.length;
  const correctCasts = casts.filter((c) => ["perfect", "early", "late"].includes(c.status)).length;
  const currentAccuracy = totalStepsEvaluated > 0 ? Math.round((correctCasts / totalStepsEvaluated) * 100) : 100;
  const validReactions = casts.filter((c) => c.reactionTime !== null).map((c) => c.reactionTime as number);
  const currentAvgReaction = validReactions.length > 0 ? Math.round(validReactions.reduce((a, b) => a + b, 0) / validReactions.length) : 0;

  // GCD calculations
  const gcdDuration = 1.5;
  const timeSinceLastCast = lastCastTime !== null ? elapsedTime - lastCastTime : Infinity;
  const isGcdActive = gameState === "running" && timeSinceLastCast < gcdDuration;
  const gcdPercent = isGcdActive ? ((gcdDuration - timeSinceLastCast) / gcdDuration) * 100 : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col relative">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-violet-900/5 blur-[120px] pointer-events-none" />
      
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
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
              title={isMuted ? "Unmute Sounds" : "Mute Sounds"}
            >
              {isMuted ? (
                <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                </svg>
              ) : (
                <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                </svg>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Simulator Workspace */}
      <main className="flex-grow max-w-5xl mx-auto px-4 py-8 w-full flex flex-col justify-between items-center relative z-10 space-y-8">
        
        {/* Top Header Panel: Real-time HUD */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-4 bg-zinc-900/40 border border-zinc-850 p-4 rounded-2xl backdrop-blur-sm">
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
        <div className="w-full flex-grow flex flex-col justify-center items-center py-12 min-h-[240px]">
          {gameState === "idle" && (
            <div className="text-center space-y-6 max-w-md">
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white">Select Drill & Launch</h2>
                <p className="text-zinc-400 text-sm">Choose a practice drill. Place your fingers on keys 1, 2, 3, and 4. Press Start when ready.</p>
              </div>

              <div className="flex flex-col space-y-2">
                {TRAINING_SCENARIOS.map((scen) => (
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

              <button
                onClick={startCountdown}
                className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-lg shadow-violet-500/25 active:scale-98 transition-all"
              >
                Start Training Simulator
              </button>
            </div>
          )}

          {gameState === "countdown" && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                Prepare Hands (Keys 1-4)
              </span>
              <span className="text-8xl font-black text-violet-400 animate-ping">
                {countdown}
              </span>
            </div>
          )}

          {gameState === "running" && (
            <div className="flex flex-col items-center justify-center space-y-8">
              {activeSpell ? (
                <div className="flex flex-col items-center space-y-4">
                  {/* Glowing Target Ring */}
                  <div className={`w-28 h-28 rounded-2xl bg-zinc-900 border-2 border-zinc-800 flex flex-col items-center justify-center relative shadow-2xl transition-all ${
                    selectedScenario.isProcReaction ? "proc-highlight" : "spell-highlight"
                  }`}>
                    {/* SVG abstract icon inside target based on spell identifier */}
                    <div className="w-12 h-12 flex items-center justify-center relative">
                      {!failedIcons[activeSpell.id] ? (
                        <img
                          src={getSpellIconUrl(activeSpell.id)}
                          alt={activeSpell.name}
                          onError={() => setFailedIcons(prev => ({ ...prev, [activeSpell.id]: true }))}
                          className="w-full h-full rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ color: activeSpell.color }}>
                          {activeSpell.icon === "metamorphosis" && (
                            <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-10">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                            </svg>
                          )}
                          {activeSpell.icon === "eye-beam" && (
                            <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-10">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                          )}
                          {activeSpell.icon === "blade-dance" && (
                            <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-10">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 6-6m0 0 6 6m-6-6v12m0 3.75a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
                            </svg>
                          )}
                          {activeSpell.icon === "chaos-strike" && (
                            <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-10">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                            </svg>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-black mt-2 uppercase tracking-widest text-zinc-300">
                      {activeSpell.name}
                    </span>
                    <span className={`absolute top-1.5 right-2 px-1.5 py-0.5 rounded-md font-mono text-[10px] font-black border transition-all ${
                      pressedKeys[activeSpell.keybind]
                        ? "bg-violet-600 border-violet-500 text-white scale-95 shadow-md shadow-violet-500/20"
                        : "bg-zinc-950/90 border-zinc-800 text-zinc-200"
                    }`}>
                      Key: {activeSpell.keybind}
                    </span>
                  </div>

                  <div className="text-center space-y-1">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                      Simulated Prompt
                    </span>
                    <h3 className="text-2xl font-black text-white">
                      Press Key: <span className="text-violet-400 font-mono text-3xl px-2 py-0.5 rounded bg-violet-950/40 border border-violet-900">{activeSpell.keybind}</span>
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

          {gameState === "finished" && finalStats && (
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

              {/* Detailed Breakdown Tables */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-zinc-950/30 p-4 rounded-xl border border-zinc-850 space-y-2">
                  <span className="font-bold text-zinc-400 block uppercase tracking-wider">Pressed Distribution</span>
                  <div className="space-y-1.5 font-semibold text-zinc-300">
                    <div className="flex justify-between">
                      <span>Perfect Time (150-450ms)</span>
                      <span className="text-violet-400">{finalStats.perfectPressed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Early Cast (&lt;150ms)</span>
                      <span className="text-amber-400">{finalStats.earlyPressed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Late Cast (450-850ms)</span>
                      <span className="text-zinc-400">{finalStats.latePressed}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-950/30 p-4 rounded-xl border border-zinc-850 space-y-2">
                  <span className="font-bold text-zinc-400 block uppercase tracking-wider">Errors and Speed</span>
                  <div className="space-y-1.5 font-semibold text-zinc-300">
                    <div className="flex justify-between">
                      <span>Incorrect Key Pressed</span>
                      <span className="text-rose-500">{finalStats.incorrectPressed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Missed GCD Triggers</span>
                      <span className="text-rose-500">{finalStats.missedPressed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fastest Reaction Time</span>
                      <span className="text-emerald-400 font-mono">{finalStats.bestReactionTime}ms</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Restart buttons */}
              <div className="flex space-x-4 pt-4 border-t border-zinc-800">
                <button
                  onClick={startCountdown}
                  className="flex-grow py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold rounded-xl active:scale-98 transition-all"
                >
                  Practice Scenario Again
                </button>
                <button
                  onClick={resetGame}
                  className="px-6 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-350 hover:text-white font-bold rounded-xl active:scale-98 transition-all"
                >
                  Change Scenario
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Panel: Visual WoW Action Bar */}
        <div className="w-full flex flex-col items-center space-y-6 pt-4 border-t border-zinc-900">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {activeBuild && activeBuild.actionBars.find(bar => bar.barName === "ActionBar1") ? (
              activeBuild.actionBars.find(bar => bar.barName === "ActionBar1")?.buttons.map((btn) => {
                const isSpellActive = activeSpell?.id === btn.id;
                return (
                  <div
                    key={btn.slot}
                    className={`w-16 h-16 rounded-xl bg-zinc-900 border flex flex-col items-center justify-center relative cursor-default transition-all select-none ${
                      isSpellActive
                        ? selectedScenario.isProcReaction
                          ? "proc-highlight border-emerald-500/80 scale-105"
                          : "spell-highlight border-violet-500/80 scale-105"
                        : "border-zinc-850 hover:border-zinc-750 opacity-90"
                    }`}
                    style={{
                      boxShadow: isSpellActive
                        ? `0 0 15px 1px ${selectedScenario.isProcReaction ? '#10b981' : '#8b5cf6'}20`
                        : "none",
                    }}
                  >
                    {btn.type !== "empty" ? (
                      <>
                        <div className="w-7 h-7 flex items-center justify-center relative">
                          {!failedIcons[btn.id] ? (
                            <img
                              src={getSpellIconUrl(btn.id)}
                              alt={btn.name}
                              onError={() => setFailedIcons(prev => ({ ...prev, [btn.id]: true }))}
                              className="w-full h-full rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ color: getSpellColor(btn.name) }}>
                              {getSpellIconSVG(btn.name)}
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] font-black text-zinc-400 mt-1 uppercase tracking-wide truncate max-w-full px-1">
                          {btn.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-[8px] font-bold text-zinc-700">EMPTY</span>
                    )}
                    
                    {/* Action bind key */}
                    {btn.key && (
                      <span className={`absolute -top-1.5 -right-1.5 z-10 px-1.5 py-0.5 rounded-md font-mono text-[10px] font-black border transition-all ${
                        pressedKeys[btn.key]
                          ? "bg-violet-600 border-violet-500 text-white scale-95 shadow-md shadow-violet-500/20"
                          : "bg-zinc-950/90 border-zinc-850 text-zinc-200 shadow-sm"
                      }`}>
                        {btn.key}
                      </span>
                    )}

                    {/* GCD Swipe Overlay */}
                    {isGcdActive && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: `conic-gradient(rgba(9, 9, 11, 0.75) ${gcdPercent}%, transparent ${gcdPercent}%)`,
                          transform: 'rotate(-90deg)',
                          borderRadius: 'inherit',
                        }}
                      />
                    )}
                  </div>
                );
              })
            ) : (
              Object.values(DEMON_HUNTER_SPELLS).map((spell) => {
                const isActive = activeSpell?.id === spell.id;
                return (
                  <div
                    key={spell.id}
                    className={`w-16 h-16 rounded-xl bg-zinc-900 border flex flex-col items-center justify-center relative cursor-default transition-all select-none ${
                      isActive
                        ? selectedScenario.isProcReaction
                          ? "proc-highlight border-emerald-500/80 scale-105"
                          : "spell-highlight border-violet-500/80 scale-105"
                        : "border-zinc-850 hover:border-zinc-750 opacity-90"
                    }`}
                    style={{
                      boxShadow: isActive
                        ? `0 0 15px 1px ${selectedScenario.isProcReaction ? '#10b981' : '#8b5cf6'}20`
                        : "none",
                    }}
                  >
                    {/* SVG Art representation of spells */}
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
                          {spell.icon === "metamorphosis" && (
                            <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-7">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                            </svg>
                          )}
                          {spell.icon === "eye-beam" && (
                            <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-7">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                          )}
                          {spell.icon === "blade-dance" && (
                            <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-7">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 6-6m0 0 6 6m-6-6v12m0 3.75a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
                            </svg>
                          )}
                          {spell.icon === "chaos-strike" && (
                            <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-7">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                            </svg>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] font-black text-zinc-400 mt-1 uppercase tracking-wide truncate max-w-full px-1">
                      {spell.name}
                    </span>
                    
                    {/* Action bind key */}
                    {spell.keybind && (
                      <span className={`absolute -top-1.5 -right-1.5 z-10 px-1.5 py-0.5 rounded-md font-mono text-[10px] font-black border transition-all ${
                        pressedKeys[spell.keybind]
                          ? "bg-violet-600 border-violet-500 text-white scale-95 shadow-md shadow-violet-500/20"
                          : "bg-zinc-950/90 border-zinc-850 text-zinc-200 shadow-sm"
                      }`}>
                        {spell.keybind}
                      </span>
                    )}

                    {/* GCD Swipe Overlay */}
                    {isGcdActive && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: `conic-gradient(rgba(9, 9, 11, 0.75) ${gcdPercent}%, transparent ${gcdPercent}%)`,
                          transform: 'rotate(-90deg)',
                          borderRadius: 'inherit',
                        }}
                      />
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
              {([191427, 198013, 188499, 162794].map(id => getMappedSpell(id).keybind)).map((k) => (
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
      </main>
    </div>
  );
}
