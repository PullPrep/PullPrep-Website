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
  SPELL_GROUP_MAPPINGS
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

interface EncounterAlert {
  type: "interrupt" | "health" | "defensive";
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
  if (lowercase.includes("metamorphosis")) {
    return (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
      </svg>
    );
  }
  if (lowercase.includes("eye beam") || lowercase.includes("fel devastation")) {
    return (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    );
  }
  if (lowercase.includes("blade dance") || lowercase.includes("soul cleave") || lowercase.includes("spirit bomb")) {
    return (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 6-6m0 0 6 6m-6-6v12m0 3.75a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
      </svg>
    );
  }
  if (lowercase.includes("chaos strike") || lowercase.includes("fracture") || lowercase.includes("shear")) {
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
    isGuidedMode
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
      isGuidedMode
    };
  }, [gameState, elapsedTime, activeStepIndex, activeSpell, activePromptTime, casts, combo, lastCastTime, activeAlert, isHardcore, isGuidedMode]);

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

  useEffect(() => {
    const specScenarios = getScenariosForSpec(activeBuild?.spec);
    setScenarios(specScenarios);
    if (specScenarios.length > 0) {
      setSelectedScenario(specScenarios[0]);
    }
  }, [activeBuild]);

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
    };
    const targetId = idMap[spellId] || spellId;
    return `/icons/${targetId}.jpg`;
  };

  const getMappedSpell = (spellId: number): Spell => {
    const defaultSpell = DEMON_HUNTER_SPELLS[spellId] || {
      id: spellId,
      name: `Spell ${spellId}`,
      keybind: "",
      icon: "chaos-strike",
      color: "#a855f7",
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
    const availableCategories: ("interrupt" | "health" | "defensive")[] = [];
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
      defensive: `Incoming Big Damage! Cast ${bind.name}!`
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
    setFinalStats(stats);
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
  const activeCoreSpells = ROTATIONS_DB[specKey]?.coreSpells || [
    { id: 191427, name: "Metamorphosis" },
    { id: 198013, name: "Eye Beam" },
    { id: 188499, name: "Blade Dance" },
    { id: 162794, name: "Chaos Strike" }
  ];
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
        <div className="absolute inset-0 pointer-events-none border-[12px] border-rose-600/80 animate-pulse z-40" style={{ boxShadow: "inset 0 0 80px rgba(225,29,72,0.45)" }} />
      )}

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

              {/* Simulator Modes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl w-full select-none mx-auto">
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
                    className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${
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
                    className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${
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
                  "text-indigo-400"
                }`}>
                  {activeAlert.type === "health" ? "SURVIVAL ALERT!" :
                   activeAlert.type === "interrupt" ? "INTERRUPT MECHANIC!" :
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
                <div className="flex flex-col items-center space-y-4">
                  {/* Glowing Target Ring */}
                  <div className={`w-28 h-28 rounded-2xl bg-zinc-900 border-2 border-zinc-800 flex flex-col items-center justify-center relative shadow-2xl transition-all ${
                    isGuidedMode || selectedScenario.isProcReaction ? "proc-highlight" : "spell-highlight"
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
                    {!isHardcore && (
                      <span className={`absolute top-1.5 right-2 px-1.5 py-0.5 rounded-md font-mono text-[10px] font-black border transition-all ${
                        pressedKeys[activeSpell.keybind]
                          ? isGuidedMode
                            ? "bg-emerald-600 border-emerald-500 text-white scale-95 shadow-md shadow-emerald-500/20"
                            : "bg-violet-600 border-violet-500 text-white scale-95 shadow-md shadow-violet-500/20"
                          : "bg-zinc-950/90 border-zinc-800 text-zinc-200"
                      }`}>
                        Key: {activeSpell.keybind}
                      </span>
                    )}
                  </div>

                  <div className="text-center space-y-1">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                      Simulated Prompt
                    </span>
                    <h3 className="text-2xl font-black text-white">
                      {isHardcore ? (
                        <span className="text-rose-500 font-extrabold uppercase tracking-widest text-lg animate-pulse">HARDCORE MEMORY TEST</span>
                      ) : (
                        <>Press Key: <span className={`${isGuidedMode ? 'text-emerald-400 bg-emerald-950/40 border-emerald-900' : 'text-violet-400 bg-violet-950/40 border-violet-900'} font-mono text-3xl px-2 py-0.5 rounded border`}>{activeSpell.keybind}</span></>
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
              activeBuild && activeBuild.actionBars.find(bar => bar.barName === "ActionBar1") ? (
                activeBuild.actionBars.find(bar => bar.barName === "ActionBar1")?.buttons.map((btn) => {
                  const isSpellActive = activeSpell?.id === btn.id;
                  return (
                    <div
                      key={btn.slot}
                      className={`w-16 h-16 rounded-xl bg-zinc-900 border flex flex-col items-center justify-center relative cursor-default transition-all select-none ${
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
                          ? isGuidedMode || selectedScenario.isProcReaction
                            ? "proc-highlight border-emerald-500/80 scale-105"
                            : "spell-highlight border-violet-500/80 scale-105"
                          : "border-zinc-850 hover:border-zinc-750 opacity-90"
                      }`}
                      style={{
                        boxShadow: isActive
                          ? `0 0 15px 1px ${isGuidedMode || selectedScenario.isProcReaction ? '#10b981' : '#8b5cf6'}20`
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
              )
            )}
          </div>
     
          {/* Interactive Keyboard Visualizer HUD */}
          <div className="flex flex-col items-center space-y-1.5">
            <span className="text-[9px] text-zinc-600 font-extrabold uppercase tracking-widest">
              Keyboard Monitor (Real-time)
            </span>
            <div className="flex flex-wrap items-center justify-center gap-1.5 font-mono text-xs text-zinc-500">
              {Array.from(new Set(activeCoreSpells.map((core: any) => getMappedSpell(core.id).keybind).filter(Boolean))).map((k) => (
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
