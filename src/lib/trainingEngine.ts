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
  resourceCost?: { type: string; amount: number };
  resourceGen?: { type: string; amount: number };
  castTime?: number;
}

export interface ResourceModifier {
  type: "holy_power" | "combo_points" | "soul_shards" | "astral_power" | "insanity" | "maelstrom";
  amount: number;
}

export function getSpellResourceInfo(spellId: number, spellName: string): {
  cost?: ResourceModifier;
  gen?: ResourceModifier;
} | null {
  const name = spellName.toLowerCase();
  
  // --- PALADIN (Holy Power) ---
  if (
    name.includes("holy shock") || 
    name.includes("crusader strike") || 
    name.includes("judgment") || 
    name.includes("hammer of wrath") || 
    name.includes("blade of justice")
  ) {
    return { gen: { type: "holy_power", amount: 1 } };
  }
  if (
    name.includes("word of glory") || 
    name.includes("light of dawn") || 
    name.includes("shield of the righteous") || 
    name.includes("templar's verdict") || 
    name.includes("final verdict") || 
    name.includes("divine storm")
  ) {
    return { cost: { type: "holy_power", amount: 3 } };
  }
  
  // --- ROGUE / FERAL DRUID (Combo Points) ---
  if (
    name.includes("mutilate") || 
    name.includes("garrote") || 
    name.includes("sinister strike") || 
    name.includes("ambush") || 
    name.includes("backstab") || 
    name.includes("shred") || 
    name.includes("rake")
  ) {
    const amount = (name.includes("mutilate") || name.includes("shred")) ? 2 : 1;
    return { gen: { type: "combo_points", amount } };
  }
  if (
    name.includes("envenom") || 
    name.includes("rupture") || 
    name.includes("eviscerate") || 
    name.includes("kidney shot") || 
    name.includes("slice and dice") || 
    name.includes("ferocious bite") || 
    name.includes("rip")
  ) {
    return { cost: { type: "combo_points", amount: 5 } };
  }
  
  // --- WARLOCK (Soul Shards) ---
  if (
    name.includes("incinerate") || 
    name.includes("conflagrate") || 
    name.includes("shadow bolt") || 
    name.includes("demonbolt")
  ) {
    return { gen: { type: "soul_shards", amount: 1 } };
  }
  if (
    name.includes("chaos bolt") || 
    name.includes("hand of gul'dan") || 
    name.includes("unstable affliction") || 
    name.includes("rain of fire")
  ) {
    const amount = name.includes("chaos bolt") ? 2 : (name.includes("hand of gul'dan") ? 3 : 1);
    return { cost: { type: "soul_shards", amount } };
  }
  
  // --- BALANCE DRUID (Astral Power) ---
  if (name.includes("wrath")) {
    return { gen: { type: "astral_power", amount: 8 } };
  }
  if (name.includes("starfire")) {
    return { gen: { type: "astral_power", amount: 10 } };
  }
  if (name.includes("starsurge")) {
    return { cost: { type: "astral_power", amount: 30 } };
  }
  if (name.includes("starfall")) {
    return { cost: { type: "astral_power", amount: 50 } };
  }
  
  // --- SHADOW PRIEST (Insanity) ---
  if (name.includes("mind blast")) {
    return { gen: { type: "insanity", amount: 8 } };
  }
  if (name.includes("mind flay") || name.includes("mind spike")) {
    return { gen: { type: "insanity", amount: 12 } };
  }
  if (name.includes("vampiric touch") || name.includes("shadow word: pain")) {
    return { gen: { type: "insanity", amount: 4 } };
  }
  if (name.includes("devouring plague") || name.includes("devuring plague")) {
    return { cost: { type: "insanity", amount: 50 } };
  }
  
  // --- ELEMENTAL SHAMAN (Maelstrom) ---
  if (name.includes("lightning bolt")) {
    return { gen: { type: "maelstrom", amount: 8 } };
  }
  if (name.includes("lava burst")) {
    return { gen: { type: "maelstrom", amount: 10 } };
  }
  if (name.includes("earth shock") || name.includes("elemental blast")) {
    return { cost: { type: "maelstrom", amount: 60 } };
  }
  if (name.includes("earthquake")) {
    return { cost: { type: "maelstrom", amount: 60 } };
  }
  
  return null;
}

export function getSpellCastTime(spellId: number, spellName: string): number {
  const name = spellName.toLowerCase();
  
  // --- PALADIN ---
  if (name.includes("holy light")) return 2.0;
  if (name.includes("flash of light")) return 1.5;
  
  // --- PRIEST ---
  if (name === "heal") return 2.5;
  if (name.includes("flash heal")) return 1.5;
  if (name.includes("prayer of healing")) return 2.0;
  
  // --- DRUID ---
  if (name.includes("regrowth")) return 1.5;
  if (name.includes("nourish")) return 2.0;
  if (name.includes("wrath")) return 1.5;
  if (name.includes("starfire")) return 2.0;
  
  // --- SHAMAN ---
  if (name.includes("healing surge")) return 1.5;
  if (name.includes("healing wave")) return 2.5;
  if (name.includes("chain heal")) return 2.5;
  if (name.includes("lightning") && name.includes("bolt")) return 2.0;
  if (name.includes("lava burst")) return 2.0;
  
  // --- MONK ---
  if (name.includes("vivify")) return 1.5;
  if (name.includes("enveloping mist")) return 2.0;
  
  // --- WARLOCK ---
  if (name.includes("chaos bolt")) return 2.5;
  if (name.includes("incinerate")) return 2.0;
  
  return 0; // Instant cast by default
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

  const realCoreSpells = rotationData.coreSpells.filter((core: { id: number; name: string }) =>
    isRealSpell(core.id, core.name)
  );

  realCoreSpells.forEach((core: { id: number; name: string }) => {
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
          (core.id === btn.id || SPELL_GROUP_MAPPINGS[core.id]?.includes(btn.id)) && isRealSpell(core.id, core.name)
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

export const CUSTOM_OPENERS: Record<string, number[]> = {
  "druid_balance": [5176, 5176, 8921, 93402, 194223, 323764, 78674, 78674, 190984, 5176, 5176], // Wrath, Wrath, Moonfire, Sunfire, Celestial Alignment, Convoke, Starsurge, Starsurge, Starfire
  "demonhunter_havoc": [258920, 232893, 198013, 191427, 188499, 162794, 258860, 188499, 162794], // Immo Aura, Felblade, Eye Beam, Meta, Death Sweep, Annihilation, Ess Break, Death Sweep
  "demonhunter_vengeance": [204596, 227084, 204021, 212084, 247454, 228477, 227084, 228477], // Sigil of Flame, Fracture, Fiery Brand, Fel Devastation, Spirit Bomb, Soul Cleave
  "warrior_fury": [100, 152277, 107574, 1719, 184367, 385059, 23881, 85288, 184367], // Charge, Ravager, Avatar, Recklessness, Rampage, Odyn's Fury, Bloodthirst, Raging Blow, Rampage
  "mage_fire": [133, 108853, 190319, 11366, 108853, 11366, 215705, 11366, 108853, 11366], // Fireball, Fire Blast, Combustion, Pyroblast, Fire Blast, Pyroblast, Phoenix Flames, Pyroblast
  "mage_frost": [44614, 12472, 84714, 30455, 30455, 116, 44614, 30455, 30455], // Flurry, Icy Veins, Frozen Orb, Ice Lance, Ice Lance, Frostbolt, Flurry, Ice Lance
  "mage_arcane": [12051, 30451, 30451, 30451, 30451, 365350, 326059, 44425], // Evocation, Arcane Blast x4, Arcane Surge, Touch of the Magi, Arcane Barrage
  "paladin_retribution": [184575, 20271, 31884, 85256, 255937, 85256, 375576, 85256], // Blade of Justice, Judgment, Avenging Wrath, Final Verdict, Wake of Ashes, Final Verdict, Divine Toll, Final Verdict
  "priest_shadow": [589, 34914, 8092, 2944, 228260, 15407, 205065], // SW:P, VT, Mind Blast, Devouring Plague, Void Eruption, Mind Flay, Void Bolt
  "rogue_assassination": [703, 1943, 1329, 5171, 3264, 381753, 385627], // Garrote, Rupture, Mutilate, Slice and Dice, Envenom, Deathmark, Kingsbane
  "warlock_destruction": [348, 17962, 1122, 116858, 17962, 116858, 29722], // Immolate, Conflagrate, Summon Infernal, Chaos Bolt, Conflagrate, Chaos Bolt, Incinerate
  "hunter_beastmastery": [217200, 217200, 19574, 34026, 193530, 34026, 217200], // Barbed Shot, Barbed Shot, Bestial Wrath, Kill Command, Cobra Shot, Kill Command, Barbed Shot
  "shaman_elemental": [188196, 2894, 375982, 51505, 8042, 57620], // Flame Shock, Fire Elemental, Primordial Wave, Lava Burst, Earth Shock, Lightning Bolt
};

export const SPELL_COOLDOWNS: Record<number, number> = {
  // Druid
  194223: 180, // Celestial Alignment (3m)
  323764: 120, // Convoke the Spirits (2m)
  202770: 60,  // Fury of Elune (1m)
  37846: 60,   // Force of Nature (1m)
  // Shaman
  114050: 180, // Ascendance (3m)
  114051: 180, // Ascendance (3m)
  114052: 180, // Ascendance (3m)
  375982: 45,  // Primordial Wave (45s)
  51505: 8,    // Lava Burst (8s)
  // Demon Hunter
  191427: 240, // Metamorphosis (4m)
  187827: 240, // Metamorphosis (4m)
  198013: 40,  // Eye Beam (40s)
  212084: 45,  // Fel Devastation (45s)
  188499: 9,   // Blade Dance (9s)
  258920: 30,  // Immolation Aura (30s)
  323639: 90,  // The Hunt (90s)
  258860: 40,  // Essence Break (40s)
  // Warrior
  152277: 45,  // Ravager (45s)
  107574: 90,  // Avatar (90s)
  1719: 90,    // Recklessness (90s)
  385059: 45,  // Odyn's Fury (45s)
  // Mage
  190319: 120, // Combustion (2m)
  12472: 180,  // Icy Veins (3m)
  84714: 60,   // Frozen Orb (1m)
  365350: 120, // Arcane Surge (2m)
  326059: 45,  // Touch of the Magi (45s)
  12051: 180,  // Evocation (3m)
  // Paladin
  31884: 120,  // Avenging Wrath (2m)
  255937: 45,  // Wake of Ashes (45s)
  375576: 60,  // Divine Toll (1m)
  // Priest
  228260: 120, // Void Eruption / Dark Ascension (2m)
  // Rogue
  381753: 120, // Deathmark (2m)
  385627: 45,  // Kingsbane (45s)
  // Warlock
  1122: 180,   // Summon Infernal (3m)
  17962: 12,   // Conflagrate (12s)
  // Hunter
  19574: 120,  // Bestial Wrath (2m)
  34026: 6,    // Kill Command (6s)
};

export function getScenariosForSpec(specName: string | undefined, durationSeconds?: number): Scenario[] {
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

  const coreSpells = rotationData.coreSpells || [];
  const realSpells = coreSpells.filter((s: any) => isRealSpell(s.id, s.name));

  // --- 1. Generate Opener Scenario (always 20s) ---
  const openerSequence: any[] = [];
  const customOpenerIds = CUSTOM_OPENERS[matchedKey];
  
  if (customOpenerIds) {
    customOpenerIds.forEach((id) => {
      const spell = realSpells.find((s: any) => s.id === id) || { id, name: `Spell ${id}` };
      openerSequence.push(spell);
    });
  } else {
    // Cooldown-first dynamic fallback
    const cds = realSpells.filter((s: any) => {
      const nameLower = s.name.toLowerCase();
      return rotationData.cooldowns?.includes(s.id) || 
             ["metamorphosis", "alignment", "convoke", "avatar", "recklessness", "combustion", "veins", "surge", "wrath", "ascension", "eruption", "deathmark", "infernal", "elemental", "berserk", "incarnation"].some(kw => nameLower.includes(kw));
    });
    const fillers = realSpells.filter((s: any) => {
      const nameLower = s.name.toLowerCase();
      const isCd = rotationData.cooldowns?.includes(s.id) || 
                   ["metamorphosis", "alignment", "convoke", "avatar", "recklessness", "combustion", "veins", "surge", "wrath", "ascension", "eruption", "deathmark", "infernal", "elemental", "berserk", "incarnation"].some(kw => nameLower.includes(kw));
      return !isCd && !rotationData.interrupts?.includes(s.id) && !rotationData.defensives?.includes(s.id);
    });

    openerSequence.push(...cds.slice(0, 3));
    let fillerIdx = 0;
    while (openerSequence.length < 12 && fillers.length > 0) {
      openerSequence.push(fillers[fillerIdx % fillers.length]);
      fillerIdx++;
    }
  }

  const openerSteps = openerSequence.map((spell: any, idx: number) => ({
    time: 0.5 + idx * 1.5,
    spellId: spell.id
  }));

  // --- 2. Generate Sustained Rotation Scenario ---
  const duration = durationSeconds || 60;
  
  // Priority simulation respecting cooldowns, starting 60s into combat
  const cdsList = realSpells.filter((s: any) => {
    const nameLower = s.name.toLowerCase();
    return rotationData.cooldowns?.includes(s.id) || 
           SPELL_COOLDOWNS[s.id] !== undefined ||
           ["metamorphosis", "alignment", "convoke", "avatar", "recklessness", "combustion", "veins", "surge", "avenging wrath", "ascension", "eruption", "deathmark", "infernal", "elemental", "berserk", "incarnation", "bloodlust", "heroism", "time warp"].some(kw => nameLower.includes(kw));
  });

  const fillerList = realSpells.filter((s: any) => {
    const nameLower = s.name.toLowerCase();
    const isCd = rotationData.cooldowns?.includes(s.id) || 
                 SPELL_COOLDOWNS[s.id] !== undefined ||
                 ["metamorphosis", "alignment", "convoke", "avatar", "recklessness", "combustion", "veins", "surge", "avenging wrath", "ascension", "eruption", "deathmark", "infernal", "elemental", "berserk", "incarnation", "bloodlust", "heroism", "time warp"].some(kw => nameLower.includes(kw));
    return !isCd && !rotationData.interrupts?.includes(s.id) && !rotationData.defensives?.includes(s.id);
  });

  // Track simulated cooldown ends.
  // Since we start 60s in, any cooldown spell is set to: Max(0, cooldown - 60)
  const cooldownEnds: Record<number, number> = {};
  cdsList.forEach((s: any) => {
    const cdVal = SPELL_COOLDOWNS[s.id] || 120; // default to 2m
    cooldownEnds[s.id] = Math.max(0, cdVal - 60);
  });

  const rotationSteps = [];
  let simTime = 0.5;
  while (simTime < duration) {
    // Find highest priority available spell
    let castSpell = null;

    // Check CDs first
    for (const cdSpell of cdsList) {
      const cdEnd = cooldownEnds[cdSpell.id] || 0;
      if (simTime >= cdEnd) {
        castSpell = cdSpell;
        const cooldownVal = SPELL_COOLDOWNS[cdSpell.id] || 120;
        cooldownEnds[cdSpell.id] = simTime + cooldownVal;
        break;
      }
    }

    // Fall back to fillers (cycle through them in order of priority)
    if (!castSpell && fillerList.length > 0) {
      const idx = Math.floor(simTime / 1.5) % fillerList.length;
      castSpell = fillerList[idx];
    }

    if (castSpell) {
      rotationSteps.push({
        time: parseFloat(simTime.toFixed(2)),
        spellId: castSpell.id
      });
    }

    simTime += 1.5; // GCD step
  }

  return [
    {
      id: `${matchedKey}-opener`,
      name: `${className} (${specDisplayName}) Opener Drill`,
      description: `Practice the perfect single-target opening sequence to lock down the opener layout.`,
      duration: 20,
      steps: openerSteps
    },
    {
      id: `${matchedKey}-sustained`,
      name: `${className} (${specDisplayName}) Sustained Rotation`,
      description: `Filler priorities 60s in (cooldowns start on CD and refresh dynamically in real-time).`,
      duration,
      steps: rotationSteps
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

export const CLASS_COLORS_HEX: Record<string, string> = {
  "deathknight": "#c41e3a",
  "demonhunter": "#a330c9",
  "druid": "#ff7c0a",
  "evoker": "#33937f",
  "hunter": "#aad372",
  "mage": "#3fc7eb",
  "monk": "#00ff98",
  "paladin": "#f48cba",
  "priest": "#ffffff",
  "rogue": "#fff468",
  "shaman": "#0070dd",
  "warlock": "#8788ee",
  "warrior": "#c69b6d",
};

export const WOW_CLASSES_SPECS = [
  { name: "Death Knight", key: "deathknight", specs: ["Blood", "Frost", "Unholy"] },
  { name: "Demon Hunter", key: "demonhunter", specs: ["Havoc", "Vengeance"] },
  { name: "Druid", key: "druid", specs: ["Balance", "Feral", "Guardian", "Restoration"] },
  { name: "Evoker", key: "evoker", specs: ["Augmentation", "Devastation", "Preservation"] },
  { name: "Hunter", key: "hunter", specs: ["Beast Mastery", "Marksmanship", "Survival"] },
  { name: "Mage", key: "mage", specs: ["Arcane", "Fire", "Frost"] },
  { name: "Monk", key: "monk", specs: ["Brewmaster", "Mistweaver", "Windwalker"] },
  { name: "Paladin", key: "paladin", specs: ["Holy", "Protection", "Retribution"] },
  { name: "Priest", key: "priest", specs: ["Discipline", "Holy", "Shadow"] },
  { name: "Rogue", key: "rogue", specs: ["Assassination", "Outlaw", "Subtlety"] },
  { name: "Shaman", key: "shaman", specs: ["Elemental", "Enhancement", "Restoration"] },
  { name: "Warlock", key: "warlock", specs: ["Affliction", "Demonology", "Destruction"] },
  { name: "Warrior", key: "warrior", specs: ["Arms", "Fury", "Protection"] }
];

export function isRealSpell(spellId: number, name: string): boolean {
  if (spellId < 1000) return false;
  
  const lowerName = name.toLowerCase();
  const blacklistedNames = [
    "invoke external buff",
    "call action list",
    "run action list",
    "cancel action",
    "use items",
    "cycling variable",
    "retarget auto attack",
    "pick up fragment",
    "wait",
    "precombat",
    "potion",
    "flask",
    "food",
    "trinket",
    "berserking",
    "blood fury",
    "fireblood",
    "ancestral call",
    "arcane pulse",
    "arcane torrent",
    "lights judgment",
    "bag of tricks",
    "shadowmeld",
    "quaking",
    "seismic",
    "volcanic",
    "pool resource",
    // Shapeshifts, forms, stances, blessings, auras, presence, stealth, mounts
    "form",
    "stance",
    "presence",
    "aura",
    "stealth",
    "prowl",
    "blessing",
    "mount"
  ];
  
  return !blacklistedNames.some(blacklisted => lowerName.includes(blacklisted));
}

export function generateDefaultBuild(className: string, specName: string): ImportedBuild {
  const classKey = className.toLowerCase().replace(/ /g, "");
  const specKey = specName.toLowerCase().replace(/ /g, "");
  const rotationKey = `${classKey}_${specKey}`;
  const rotationData = ROTATIONS_DB[rotationKey];
  
  const coreSpells = rotationData?.coreSpells || [];
  const realSpells = coreSpells.filter((s: any) => isRealSpell(s.id, s.name));
  
  const defaultKeys = ["1", "2", "3", "4", "5", "6", "Q", "E", "R", "F", "Z", "X"];
  const buttons: ImportedButton[] = [];
  
  let slot = 1;
  realSpells.forEach((spell: any, idx: number) => {
    if (slot <= 12) {
      buttons.push({
        slot,
        type: "spell",
        id: spell.id,
        name: spell.name,
        key: defaultKeys[idx] || `${idx + 1}`,
        icon: spell.id
      });
      slot++;
    }
  });
  
  while (slot <= 12) {
    buttons.push({
      slot,
      type: "empty",
      id: 0,
      name: "",
      key: defaultKeys[slot - 1] || `${slot}`,
      icon: 0
    });
    slot++;
  }
  
  return {
    class: className,
    spec: specName,
    actionBars: [
      {
        barName: "ActionBar1",
        buttons
      }
    ]
  };
}
