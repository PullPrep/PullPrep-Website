import deathknight_blood_rotation from "./rotations/deathknight_blood.json";
import deathknight_frost_rotation from "./rotations/deathknight_frost.json";
import deathknight_unholy_rotation from "./rotations/deathknight_unholy.json";
import demonhunter_havoc_rotation from "./rotations/demonhunter_havoc.json";
import demonhunter_vengeance_rotation from "./rotations/demonhunter_vengeance.json";
import druid_balance_rotation from "./rotations/druid_balance.json";
import druid_feral_rotation from "./rotations/druid_feral.json";
import druid_guardian_rotation from "./rotations/druid_guardian.json";
import druid_restoration_rotation from "./rotations/druid_restoration.json";
import evoker_augmentation_rotation from "./rotations/evoker_augmentation.json";
import evoker_devastation_rotation from "./rotations/evoker_devastation.json";
import evoker_preservation_rotation from "./rotations/evoker_preservation.json";
import hunter_beastmastery_rotation from "./rotations/hunter_beastmastery.json";
import hunter_marksmanship_rotation from "./rotations/hunter_marksmanship.json";
import hunter_survival_rotation from "./rotations/hunter_survival.json";
import mage_arcane_rotation from "./rotations/mage_arcane.json";
import mage_fire_rotation from "./rotations/mage_fire.json";
import mage_frost_rotation from "./rotations/mage_frost.json";
import monk_brewmaster_rotation from "./rotations/monk_brewmaster.json";
import monk_mistweaver_rotation from "./rotations/monk_mistweaver.json";
import monk_windwalker_rotation from "./rotations/monk_windwalker.json";
import paladin_holy_rotation from "./rotations/paladin_holy.json";
import paladin_protection_rotation from "./rotations/paladin_protection.json";
import paladin_retribution_rotation from "./rotations/paladin_retribution.json";
import priest_discipline_rotation from "./rotations/priest_discipline.json";
import priest_holy_rotation from "./rotations/priest_holy.json";
import priest_shadow_rotation from "./rotations/priest_shadow.json";
import rogue_assassination_rotation from "./rotations/rogue_assassination.json";
import rogue_outlaw_rotation from "./rotations/rogue_outlaw.json";
import rogue_subtlety_rotation from "./rotations/rogue_subtlety.json";
import shaman_elemental_rotation from "./rotations/shaman_elemental.json";
import shaman_enhancement_rotation from "./rotations/shaman_enhancement.json";
import shaman_restoration_rotation from "./rotations/shaman_restoration.json";
import warlock_affliction_rotation from "./rotations/warlock_affliction.json";
import warlock_demonology_rotation from "./rotations/warlock_demonology.json";
import warlock_destruction_rotation from "./rotations/warlock_destruction.json";
import warrior_arms_rotation from "./rotations/warrior_arms.json";
import warrior_fury_rotation from "./rotations/warrior_fury.json";
import warrior_protection_rotation from "./rotations/warrior_protection.json";

import havocRotation from "./rotations/demonhunter_havoc.json";
import vengeanceRotation from "./rotations/demonhunter_vengeance.json";

export interface Spell {
  id: number;
  name: string;
  keybind: string;
  icon: string; // Thematic identifier
  color: string; // Hex color for effects
  description: string;
}

export interface TrainingStep {
  time: number; // Time in seconds from start of scenario when this spell should be cast
  spellId: number;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  duration: number; // in seconds
  steps: TrainingStep[];
  isProcReaction?: boolean; // if true, spawns random procs rather than fixed timeline
}

export interface CastRecord {
  stepIndex: number;
  expectedSpellId: number;
  actualSpellId: number | null;
  expectedTime: number;
  actualTime: number | null;
  reactionTime: number | null; // in ms
  status: "perfect" | "early" | "late" | "missed" | "incorrect";
}

export interface ModifierDelayDetails {
  baseAvg: number;
  modAvg: number;
  shiftAvg: number;
  ctrlAvg: number;
  altAvg: number;
}

export interface TransitionFatigue {
  fromSpell: string;
  toSpell: string;
  delayMs: number;
}

export interface SessionStats {
  accuracy: number;
  totalPressed: number;
  correctPressed: number;
  incorrectPressed: number;
  missedPressed: number;
  perfectPressed: number;
  earlyPressed: number;
  latePressed: number;
  avgReactionTime: number; // in ms
  bestReactionTime: number; // in ms
  worstReactionTime: number; // in ms
  totalDowntime: number; // in seconds
  feedback: string[];
  modifierDelays?: ModifierDelayDetails;
  transitionFatigues?: TransitionFatigue[];
  keybindAudits?: string[];
}

export interface ImportedButton {
  slot: number;
  type: string;
  id: number;
  name: string;
  key: string;
  icon: number;
}

export interface ImportedBar {
  barName: string;
  buttons: ImportedButton[];
}

export interface ImportedBuild {
  class: string;
  spec: string;
  actionBars: ImportedBar[];
}

// Database of spec JSON profiles
export const ROTATIONS_DB: Record<string, any> = {
  "deathknight_blood": deathknight_blood_rotation,
  "deathknight_frost": deathknight_frost_rotation,
  "deathknight_unholy": deathknight_unholy_rotation,
  "demonhunter_havoc": demonhunter_havoc_rotation,
  "demonhunter_vengeance": demonhunter_vengeance_rotation,
  "druid_balance": druid_balance_rotation,
  "druid_feral": druid_feral_rotation,
  "druid_guardian": druid_guardian_rotation,
  "druid_restoration": druid_restoration_rotation,
  "evoker_augmentation": evoker_augmentation_rotation,
  "evoker_devastation": evoker_devastation_rotation,
  "evoker_preservation": evoker_preservation_rotation,
  "hunter_beastmastery": hunter_beastmastery_rotation,
  "hunter_marksmanship": hunter_marksmanship_rotation,
  "hunter_survival": hunter_survival_rotation,
  "mage_arcane": mage_arcane_rotation,
  "mage_fire": mage_fire_rotation,
  "mage_frost": mage_frost_rotation,
  "monk_brewmaster": monk_brewmaster_rotation,
  "monk_mistweaver": monk_mistweaver_rotation,
  "monk_windwalker": monk_windwalker_rotation,
  "paladin_holy": paladin_holy_rotation,
  "paladin_protection": paladin_protection_rotation,
  "paladin_retribution": paladin_retribution_rotation,
  "priest_discipline": priest_discipline_rotation,
  "priest_holy": priest_holy_rotation,
  "priest_shadow": priest_shadow_rotation,
  "rogue_assassination": rogue_assassination_rotation,
  "rogue_outlaw": rogue_outlaw_rotation,
  "rogue_subtlety": rogue_subtlety_rotation,
  "shaman_elemental": shaman_elemental_rotation,
  "shaman_enhancement": shaman_enhancement_rotation,
  "shaman_restoration": shaman_restoration_rotation,
  "warlock_affliction": warlock_affliction_rotation,
  "warlock_demonology": warlock_demonology_rotation,
  "warlock_destruction": warlock_destruction_rotation,
  "warrior_arms": warrior_arms_rotation,
  "warrior_fury": warrior_fury_rotation,
  "warrior_protection": warrior_protection_rotation,
};

// Predefined WoW spells for Demon Hunter (fallback database)
export const DEMON_HUNTER_SPELLS: Record<number, Spell> = {
  162794: {
    id: 162794,
    name: "Chaos Strike",
    keybind: "1",
    icon: "chaos-strike",
    color: "#ef4444", // Red
    description: "Slashes your target for physical damage. Generates Fury on critical hits.",
  },
  188499: {
    id: 188499,
    name: "Blade Dance",
    keybind: "2",
    icon: "blade-dance",
    color: "#10b981", // Emerald
    description: "Strikes all nearby enemies. Standard rotational filler.",
  },
  198013: {
    id: 198013,
    name: "Eye Beam",
    keybind: "3",
    icon: "eye-beam",
    color: "#8b5cf6", // Purple
    description: "Deals massive chaos damage over a short channel.",
  },
  191427: {
    id: 191427,
    name: "Metamorphosis",
    keybind: "4",
    icon: "metamorphosis",
    color: "#eab308", // Amber
    description: "Leap into the air and transform into a demon, empowering your abilities.",
  },
  // Vengeance Spells
  187827: {
    id: 187827,
    name: "Metamorphosis",
    keybind: "4",
    icon: "metamorphosis",
    color: "#eab308", // Amber
    description: "Transform into a demon, increasing current and maximum health by 50% and armor by 200%.",
  },
  212084: {
    id: 212084,
    name: "Fel Devastation",
    keybind: "3",
    icon: "eye-beam",
    color: "#8b5cf6", // Purple
    description: "Unleash the fel within, damaging enemies in front of you and healing yourself.",
  },
  228477: {
    id: 228477,
    name: "Soul Cleave",
    keybind: "2",
    icon: "blade-dance",
    color: "#10b981", // Emerald
    description: "Viciously strike enemies in front of you, dealing physical damage and healing yourself.",
  },
  247454: {
    id: 247454,
    name: "Spirit Bomb",
    keybind: "5",
    icon: "spirit-bomb",
    color: "#a855f7", // Fuchsia
    description: "Consume up to 5 Soul Fragments to damage enemies and apply Frailty, healing you for 8% of damage dealt.",
  },
  207407: {
    id: 207407,
    name: "Soul Carver",
    keybind: "6",
    icon: "soul-carver",
    color: "#f43f5e", // Rose
    description: "Carve into the target's soul, dealing fire damage and spawning Soul Fragments.",
  },
  204021: {
    id: 204021,
    name: "Fiery Brand",
    keybind: "E",
    icon: "fiery-brand",
    color: "#f97316", // Orange
    description: "Brand an enemy, dealing fire damage and reducing the damage they deal to you by 40%.",
  },
  227084: {
    id: 227084,
    name: "Fracture",
    keybind: "1",
    icon: "chaos-strike",
    color: "#ef4444", // Red
    description: "Slam your target, dealing physical damage and carving 2 Soul Fragments from them.",
  },
  225919: {
    id: 225919,
    name: "Shear",
    keybind: "1",
    icon: "chaos-strike",
    color: "#ef4444", // Red
    description: "Shear your target, dealing physical damage and having a chance to spawn a Soul Fragment.",
  },
  203720: {
    id: 203720,
    name: "Demon Spikes",
    keybind: "Q",
    icon: "demon-spikes",
    color: "#06b6d4", // Cyan
    description: "Surge with fel power, increasing your armor and parry chance.",
  }
};

// Mutually exclusive spells or alternate IDs (e.g. Fracture vs Shear)
export const SPELL_GROUP_MAPPINGS: Record<number, number[]> = {
  227084: [227084, 225919, 263642, 203782], // Fracture/Shear group
  225919: [227084, 225919, 263642, 203782],
  263642: [227084, 225919, 263642, 203782],
  203782: [227084, 225919, 263642, 203782],
  // Cross-spec fallback mappings for common mappings
  191427: [191427, 187827],
  187827: [191427, 187827],
  198013: [198013, 212084],
  212084: [198013, 212084],
  188499: [188499, 228477, 247454],
  228477: [188499, 228477, 247454],
  162794: [162794, 227084, 225919]
};

// Scan character layout for missing core spells
export function checkMissingCoreSpells(
  importedBuild: ImportedBuild | null,
  specKey: string
): { id: number; name: string }[] {
  if (!importedBuild) return [];
  const rotationData = ROTATIONS_DB[specKey];
  if (!rotationData || !rotationData.coreSpells) return [];

  // Get all bound spell IDs in the player's bars
  const boundSpellIds = new Set<number>();
  importedBuild.actionBars.forEach((bar) => {
    bar.buttons.forEach((btn) => {
      if (btn.type !== "empty" && btn.id) {
        boundSpellIds.add(btn.id);
      }
    });
  });

  const missing: { id: number; name: string }[] = [];

  rotationData.coreSpells.forEach((core: { id: number; name: string }) => {
    const alternates = SPELL_GROUP_MAPPINGS[core.id];
    if (alternates) {
      const isAnyBound = alternates.some((altId) => boundSpellIds.has(altId));
      if (!isAnyBound) {
        if (!missing.some(m => SPELL_GROUP_MAPPINGS[m.id]?.includes(core.id))) {
          missing.push(core);
        }
      }
    } else {
      if (!boundSpellIds.has(core.id)) {
        missing.push(core);
      }
    }
  });

  return missing;
}

// Audit keybind layout to detect awkward placements
export function auditKeybindLayout(
  importedBuild: ImportedBuild | null,
  specKey: string
): string[] {
  if (!importedBuild) return [];
  const rotationData = ROTATIONS_DB[specKey];
  if (!rotationData || !rotationData.coreSpells) return [];

  const audits: string[] = [];
  const awkwardKeys = ["8", "9", "0", "-", "=", "[", "]", "F9", "F10", "F11", "F12"];

  importedBuild.actionBars.forEach((bar) => {
    bar.buttons.forEach((btn) => {
      if (btn.type !== "empty" && btn.key) {
        const keyUpper = btn.key.toUpperCase();
        const isAwkward = awkwardKeys.some(awk => keyUpper.includes(awk));
        
        // Find if this button is a core spell
        const isCore = rotationData.coreSpells.some((core: any) => 
          core.id === btn.id || SPELL_GROUP_MAPPINGS[core.id]?.includes(btn.id)
        );

        if (isCore && isAwkward) {
          audits.push(
            `Core spell '${btn.name}' is bound to '${btn.key}'. Consider placing highly active rotational spells closer to WASD (keys 1-5, Q, E, R, F) for better uptime.`
          );
        }

        // Check Interrupts
        const isInterrupt = rotationData.interrupts?.includes(btn.id) || 
          btn.name.toLowerCase().includes("disrupt") || 
          btn.name.toLowerCase().includes("kick") || 
          btn.name.toLowerCase().includes("pummel");
          
        if (isInterrupt) {
          const hasMultipleModifiers = (btn.key.includes("CTRL") && btn.key.includes("ALT")) || 
                                       (btn.key.includes("CTRL") && btn.key.includes("SHIFT")) ||
                                       (btn.key.includes("ALT") && btn.key.includes("SHIFT"));
          if (hasMultipleModifiers || isAwkward) {
            audits.push(
              `Interrupt '${btn.name}' is bound to '${btn.key}'. For fast reaction to boss casts, consider a single key close to WASD or a mouse button.`
            );
          }
        }
      }
    });
  });

  return audits;
}

// Predefined Training Scenarios
export const TRAINING_SCENARIOS: Scenario[] = [
  {
    id: "dh-opener",
    name: "Havoc Demon Hunter Opener",
    description: "Practice the perfect single-target Havoc DH opener sequence. Build keybind muscle memory.",
    duration: 15,
    steps: [
      { time: 0.5, spellId: 191427 }, // Metamorphosis
      { time: 2.0, spellId: 198013 }, // Eye Beam
      { time: 3.5, spellId: 188499 }, // Blade Dance
      { time: 5.0, spellId: 162794 }, // Chaos Strike
      { time: 6.5, spellId: 162794 }, // Chaos Strike
      { time: 8.0, spellId: 188499 }, // Blade Dance
      { time: 9.5, spellId: 162794 }, // Chaos Strike
      { time: 11.0, spellId: 198013 }, // Eye Beam
      { time: 12.5, spellId: 188499 }, // Blade Dance
    ],
  },
  {
    id: "proc-reaction",
    name: "Proc Reaction Speed Drill",
    description: "React to randomized, rapid spell procs. Hit the highlighted button as fast as you can.",
    duration: 20,
    isProcReaction: true,
    steps: [], // Will be generated dynamically
  },
];

// Evaluate reaction and return status
export function evaluatePress(
  expectedSpell: Spell,
  pressedKey: string,
  timeDiffSeconds: number
): {
  status: CastRecord["status"];
  reactionTimeMs: number;
} {
  const reactionTimeMs = Math.round(timeDiffSeconds * 1000);
  
  if (pressedKey !== expectedSpell.keybind) {
    return { status: "incorrect", reactionTimeMs };
  }

  // Timing thresholds:
  // - < 150ms: Early (anticipating/pre-casting too fast or cheating)
  // - 150ms to 400ms: Perfect (wow gcd and high reaction speed)
  // - 400ms to 800ms: Late
  // - > 800ms: Missed
  if (timeDiffSeconds < 0.15) {
    return { status: "early", reactionTimeMs };
  } else if (timeDiffSeconds <= 0.45) {
    return { status: "perfect", reactionTimeMs };
  } else if (timeDiffSeconds <= 0.85) {
    return { status: "late", reactionTimeMs };
  } else {
    return { status: "missed", reactionTimeMs };
  }
}

// Generate Scored Session Stats
export function compileStats(
  casts: CastRecord[],
  scenario: Scenario,
  totalDowntime: number,
  importedBuild?: ImportedBuild | null
): SessionStats {
  const totalSteps = scenario.isProcReaction ? casts.length : scenario.steps.length;
  
  let correct = 0;
  let incorrect = 0;
  let missed = 0;
  let perfect = 0;
  let early = 0;
  let late = 0;

  const validReactionTimes: number[] = [];

  casts.forEach((c) => {
    if (c.status === "perfect") {
      correct++;
      perfect++;
      if (c.reactionTime !== null) validReactionTimes.push(c.reactionTime);
    } else if (c.status === "late") {
      correct++;
      late++;
      if (c.reactionTime !== null) validReactionTimes.push(c.reactionTime);
    } else if (c.status === "early") {
      correct++;
      early++;
      if (c.reactionTime !== null) validReactionTimes.push(c.reactionTime);
    } else if (c.status === "incorrect") {
      incorrect++;
    } else if (c.status === "missed") {
      missed++;
    }
  });

  // Any steps that were completely ignored and have no cast record are missed
  const completedStepIndices = new Set(casts.map((c) => c.stepIndex));
  if (!scenario.isProcReaction) {
    for (let i = 0; i < scenario.steps.length; i++) {
      if (!completedStepIndices.has(i)) {
        missed++;
      }
    }
  }

  const totalPressed = correct + incorrect;
  const totalEvents = correct + incorrect + missed;
  const accuracy = totalEvents > 0 ? Math.round((correct / totalEvents) * 100) : 0;

  const avgReactionTime =
    validReactionTimes.length > 0
      ? Math.round(validReactionTimes.reduce((a, b) => a + b, 0) / validReactionTimes.length)
      : 0;
  
  const bestReactionTime =
    validReactionTimes.length > 0 ? Math.min(...validReactionTimes) : 0;
  
  const worstReactionTime =
    validReactionTimes.length > 0 ? Math.max(...validReactionTimes) : 0;

  // Generate Modifier Timing Averages
  let baseSum = 0, baseCount = 0;
  let modSum = 0, modCount = 0;
  let shiftSum = 0, shiftCount = 0;
  let ctrlSum = 0, ctrlCount = 0;
  let altSum = 0, altCount = 0;

  const getSpellKey = (spellId: number): string => {
    if (importedBuild) {
      for (const bar of importedBuild.actionBars) {
        for (const btn of bar.buttons) {
          if (btn.id === spellId && btn.key) {
            return btn.key;
          }
        }
      }
    }
    return DEMON_HUNTER_SPELLS[spellId]?.keybind || "";
  };

  casts.forEach((c) => {
    if (c.reactionTime !== null && c.status !== "incorrect") {
      const key = getSpellKey(c.expectedSpellId).toUpperCase();
      const hasShift = key.includes("SHIFT");
      const hasCtrl = key.includes("CTRL");
      const hasAlt = key.includes("ALT");
      const hasMod = hasShift || hasCtrl || hasAlt;

      if (hasMod) {
        modSum += c.reactionTime;
        modCount++;
        if (hasShift) { shiftSum += c.reactionTime; shiftCount++; }
        if (hasCtrl) { ctrlSum += c.reactionTime; ctrlCount++; }
        if (hasAlt) { altSum += c.reactionTime; altCount++; }
      } else {
        baseSum += c.reactionTime;
        baseCount++;
      }
    }
  });

  const modifierDelays: ModifierDelayDetails = {
    baseAvg: baseCount > 0 ? Math.round(baseSum / baseCount) : 0,
    modAvg: modCount > 0 ? Math.round(modSum / modCount) : 0,
    shiftAvg: shiftCount > 0 ? Math.round(shiftSum / shiftCount) : 0,
    ctrlAvg: ctrlCount > 0 ? Math.round(ctrlSum / ctrlCount) : 0,
    altAvg: altCount > 0 ? Math.round(altSum / altCount) : 0,
  };

  // Generate Transition Fatigue Diagnostics
  const getSpellName = (spellId: number): string => {
    if (importedBuild) {
      for (const bar of importedBuild.actionBars) {
        for (const btn of bar.buttons) {
          if (btn.id === spellId && btn.name) {
            return btn.name;
          }
        }
      }
    }
    return DEMON_HUNTER_SPELLS[spellId]?.name || `Spell ${spellId}`;
  };

  const transitionDelays: Record<string, { sum: number; count: number; fromName: string; toName: string }> = {};

  for (let i = 1; i < casts.length; i++) {
    const prev = casts[i-1];
    const curr = casts[i];
    if (prev.reactionTime !== null && curr.reactionTime !== null && curr.status !== "incorrect" && prev.status !== "incorrect") {
      const key = `${prev.expectedSpellId}->${curr.expectedSpellId}`;
      if (!transitionDelays[key]) {
        transitionDelays[key] = {
          sum: 0,
          count: 0,
          fromName: getSpellName(prev.expectedSpellId),
          toName: getSpellName(curr.expectedSpellId)
        };
      }
      transitionDelays[key].sum += curr.reactionTime;
      transitionDelays[key].count++;
    }
  }

  const transitionFatigues: TransitionFatigue[] = [];
  Object.entries(transitionDelays).forEach(([key, d]) => {
    const avg = Math.round(d.sum / d.count);
    if (avg > avgReactionTime * 1.25 && d.count >= 2) {
      transitionFatigues.push({
        fromSpell: d.fromName,
        toSpell: d.toName,
        delayMs: avg
      });
    }
  });

  // Keybind audits list
  const specKey = importedBuild ? `${importedBuild.class.toLowerCase().replace(' ', '')}_${importedBuild.spec.toLowerCase().replace(' ', '')}` : "";
  const keybindAudits = specKey ? auditKeybindLayout(importedBuild || null, specKey) : [];

  // Generate Personalized Feedback
  const feedback: string[] = [];

  if (accuracy >= 90) {
    feedback.push("Excellent rotation accuracy! Your muscle memory is highly accurate.");
  } else if (accuracy >= 70) {
    feedback.push("Good job! Try to slow down slightly to focus on correct key bindings.");
  } else {
    feedback.push("Need practice: Make sure your keybinds are correctly matched to your WoW UI.");
  }

  if (avgReactionTime > 0) {
    if (avgReactionTime < 250) {
      feedback.push(`Outstanding speed! Average reaction time: ${(avgReactionTime / 1000).toFixed(2)}s.`);
    } else if (avgReactionTime < 450) {
      feedback.push(`Good pacing. Average reaction time: ${(avgReactionTime / 1000).toFixed(2)}s.`);
    } else {
      feedback.push(`Your inputs were slightly delayed. Try to hit buttons immediately when highlighted.`);
    }
  }

  // Check Metamorphosis timing (spell 191427) in opener
  if (scenario.id === "dh-opener") {
    const metaCast = casts.find((c) => c.expectedSpellId === 191427);
    if (metaCast) {
      if (metaCast.status === "perfect") {
        feedback.push("Excellent Metamorphosis usage right at the opener start!");
      } else if (metaCast.reactionTime && metaCast.reactionTime > 500) {
        feedback.push(`You delayed Metamorphosis by ${(metaCast.reactionTime / 1000).toFixed(1)} seconds.`);
      }
    } else {
      feedback.push("You missed Metamorphosis entirely in the opener sequence!");
    }

    const eyeBeamCasts = casts.filter((c) => c.expectedSpellId === 198013);
    const avgEyeBeamReaction = eyeBeamCasts.length > 0
      ? eyeBeamCasts.reduce((sum, c) => sum + (c.reactionTime || 0), 0) / eyeBeamCasts.length
      : 0;
    if (avgEyeBeamReaction > 0) {
      feedback.push(`Average Eye Beam reaction: ${(avgEyeBeamReaction / 1000).toFixed(2)}s.`);
    }
  }

  if (totalDowntime > 3) {
    feedback.push(`High idle downtime: ${totalDowntime.toFixed(1)}s of inaction during active GCDs. Keep active!`);
  } else {
    feedback.push("Outstanding uptime! You maintained high activity with minimal downtime.");
  }

  return {
    accuracy,
    totalPressed,
    correctPressed: correct,
    incorrectPressed: incorrect,
    missedPressed: missed,
    perfectPressed: perfect,
    earlyPressed: early,
    latePressed: late,
    avgReactionTime,
    bestReactionTime,
    worstReactionTime,
    totalDowntime: parseFloat(totalDowntime.toFixed(1)),
    feedback,
    modifierDelays,
    transitionFatigues,
    keybindAudits
  };
}

export function getScenariosForSpec(specName: string | undefined): Scenario[] {
  if (!specName) {
    return TRAINING_SCENARIOS;
  }
  const specKey = specName.toLowerCase().replace(/ /g, "");
  
  // Find matching profile in our registered rotations db
  const matchedKey = Object.keys(ROTATIONS_DB).find(k => k.endsWith(`_${specKey}`));
  if (!matchedKey) {
    return TRAINING_SCENARIOS;
  }

  const rotationData = ROTATIONS_DB[matchedKey];
  const className = rotationData.class;
  const specDisplayName = rotationData.spec;

  // Generate steps sequence dynamically from coreSpells (excluding cooldowns/interrupts/defensives from active gcd filler loop)
  const cds = new Set(rotationData.cooldowns || []);
  const interrupts = new Set(rotationData.interrupts || []);
  const defensives = new Set(rotationData.defensives || []);
  const coreSpells = rotationData.coreSpells || [];

  const cdSpells = coreSpells.filter((s: any) => cds.has(s.id));
  const fillerSpells = coreSpells.filter((s: any) => !cds.has(s.id) && !interrupts.has(s.id) && !defensives.has(s.id));
  
  const rotationFiller = fillerSpells.length > 0 ? fillerSpells : coreSpells;

  const sequence = [];
  sequence.push(...cdSpells);
  
  let fillerIdx = 0;
  while (sequence.length < 13) {
    sequence.push(rotationFiller[fillerIdx % rotationFiller.length]);
    fillerIdx++;
  }

  const steps = sequence.map((spell: any, idx: number) => ({
    time: 0.5 + idx * 1.5,
    spellId: spell.id
  }));

  return [
    {
      id: `${matchedKey}-rotation`,
      name: `${className} (${specDisplayName}) Practice Drill`,
      description: `Practice the core rotational priority and muscle memory for ${specDisplayName} ${className}.`,
      duration: 20,
      steps
    },
    {
      id: "proc-reaction",
      name: "Proc Reaction Speed Drill",
      description: "React to randomized, rapid spell procs. Hit the highlighted button as fast as you can.",
      duration: 20,
      isProcReaction: true,
      steps: []
    }
  ];
}
