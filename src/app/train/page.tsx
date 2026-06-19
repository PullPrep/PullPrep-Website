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
  SPELL_COOLDOWNS,
  getSpellResourceInfo,
  getSpellCastTime
} from "@/lib/trainingEngine";

interface HealerPlayer {
  id: string;
  name: string;
  role: "tank" | "healer" | "dps";
  subRole: "melee" | "ranged";
  class: string;
  health: number;
  maxHealth: number;
  buffs: { name: string; expiresAt: number }[];
}

interface HealerSpell {
  id: number;
  name: string;
  keybind: string;
  icon: string;
  color: string;
  description: string;
  manaCost: number;
  healAmount: number;
  isAoE?: boolean;
  cooldown?: number;
  hotDuration?: number;
  resourceCost?: { type: string; amount: number };
  resourceGen?: { type: string; amount: number };
  castTime?: number;
}

interface FloatingHeal {
  id: string;
  playerId: string;
  text: string;
  time: number;
}

const HEALER_SPELLS_BY_SPEC: Record<string, HealerSpell[]> = {
  "Priest_Holy": [
    { id: 2061, name: "Flash Heal", keybind: "1", icon: "flash-heal", color: "#38bdf8", description: "A fast but expensive heal.", manaCost: 11000, healAmount: 30 },
    { id: 2060, name: "Heal", keybind: "2", icon: "heal", color: "#0284c7", description: "A slow but efficient heal.", manaCost: 6000, healAmount: 45 },
    { id: 139, name: "Renew", keybind: "3", icon: "renew", color: "#34d399", description: "Heals over time (15s).", manaCost: 6000, healAmount: 8, hotDuration: 15 },
    { id: 596, name: "Prayer of Healing", keybind: "4", icon: "prayer-of-healing", color: "#a855f7", description: "Heals the 5 lowest raid members.", manaCost: 20000, healAmount: 18, isAoE: true },
    { id: 2050, name: "HW: Serenity", keybind: "5", icon: "holy-word-serenity", color: "#fbbf24", description: "A massive instant heal. 8s cooldown.", manaCost: 6250, healAmount: 80, cooldown: 8 },
    { id: 47788, name: "Guardian Spirit", keybind: "E", icon: "guardian-spirit", color: "#f43f5e", description: "Saves target from death & heals 100%. 25s cooldown.", manaCost: 2250, healAmount: 100, cooldown: 25 }
  ],
  "Priest_Discipline": [
    { id: 2061, name: "Flash Heal", keybind: "1", icon: "flash-heal", color: "#38bdf8", description: "A fast but expensive heal.", manaCost: 11000, healAmount: 30 },
    { id: 17, name: "Shield", keybind: "2", icon: "shield", color: "#eab308", description: "Shields target for 35% health.", manaCost: 6000, healAmount: 35 },
    { id: 139, name: "Renew", keybind: "3", icon: "renew", color: "#34d399", description: "Heals over time (15s).", manaCost: 6000, healAmount: 8, hotDuration: 15 },
    { id: 596, name: "Radiance", keybind: "4", icon: "radiance", color: "#a855f7", description: "Heals the 5 lowest raid members.", manaCost: 32500, healAmount: 18, isAoE: true },
    { id: 2050, name: "Penance", keybind: "5", icon: "penance", color: "#fbbf24", description: "Channel to heal a target. 8s cooldown.", manaCost: 8000, healAmount: 60, cooldown: 8 },
    { id: 47788, name: "Pain Suppression", keybind: "E", icon: "pain-suppression", color: "#f43f5e", description: "Reduces damage taken & heals target 100%. 25s cooldown.", manaCost: 4000, healAmount: 100, cooldown: 25 }
  ],
  "Druid_Restoration": [
    { id: 8936, name: "Regrowth", keybind: "1", icon: "regrowth", color: "#10b981", description: "Heals instantly and leaves a short HoT.", manaCost: 12000, healAmount: 25, hotDuration: 6 },
    { id: 50464, name: "Nourish", keybind: "2", icon: "nourish", color: "#059669", description: "Efficient heal, stronger on targets with HoTs.", manaCost: 6000, healAmount: 40 },
    { id: 774, name: "Rejuvenation", keybind: "3", icon: "rejuvenation", color: "#34d399", description: "Classic heal over time (12s).", manaCost: 8000, healAmount: 6, hotDuration: 12 },
    { id: 48438, name: "Wild Growth", keybind: "4", icon: "wild-growth", color: "#6ee7b7", description: "Heals up to 5 injured targets over 7s.", manaCost: 22000, healAmount: 15, isAoE: true, hotDuration: 7, cooldown: 7 },
    { id: 18562, name: "Swiftmend", keybind: "5", icon: "swiftmend", color: "#10b981", description: "Consumes a HoT to heal instantly. 6s cooldown.", manaCost: 4000, healAmount: 60, cooldown: 6 },
    { id: 102342, name: "Ironbark", keybind: "E", icon: "ironbark", color: "#f59e0b", description: "Reduces damage taken & heals target 100%. 25s cooldown.", manaCost: 4000, healAmount: 100, cooldown: 25 }
  ],
  "Paladin_Holy": [
    { id: 19750, name: "Flash of Light", keybind: "1", icon: "flash-of-light", color: "#fef08a", description: "A quick, costly beam of healing light.", manaCost: 11000, healAmount: 28 },
    { id: 82326, name: "Holy Light", keybind: "2", icon: "holy-light", color: "#eab308", description: "A large, slow, efficient healing spell.", manaCost: 6000, healAmount: 45 },
    { id: 20473, name: "Holy Shock", keybind: "3", icon: "holy-shock", color: "#facc15", description: "Instant shock that heals or damages. 5s cooldown.", manaCost: 7000, healAmount: 30, cooldown: 5 },
    { id: 85673, name: "Word of Glory", keybind: "4", icon: "word-of-glory", color: "#fbbf24", description: "Consumes Holy Power to heal a target.", manaCost: 0, healAmount: 50 },
    { id: 85222, name: "Light of Dawn", keybind: "5", icon: "light-of-dawn", color: "#fef08a", description: "Sends a wave of healing to 5 allies.", manaCost: 0, healAmount: 18, isAoE: true },
    { id: 633, name: "Lay on Hands", keybind: "E", icon: "lay-on-hands", color: "#fbbf24", description: "Heals target for 100% of their health. 30s cooldown.", manaCost: 0, healAmount: 100, cooldown: 30 }
  ],
  "Shaman_Restoration": [
    { id: 8004, name: "Healing Surge", keybind: "1", icon: "healing-surge", color: "#38bdf8", description: "Fast, high-cost wave of water healing.", manaCost: 11000, healAmount: 32 },
    { id: 77472, name: "Healing Wave", keybind: "2", icon: "healing-wave", color: "#0284c7", description: "Slow, low-cost water healing.", manaCost: 6000, healAmount: 42 },
    { id: 61295, name: "Riptide", keybind: "3", icon: "riptide", color: "#22d3ee", description: "Instant heal and HoT (15s). 6s cooldown.", manaCost: 4000, healAmount: 12, cooldown: 6, hotDuration: 15 },
    { id: 1064, name: "Chain Heal", keybind: "4", icon: "chain-heal", color: "#06b6d4", description: "Heals target, then jumps to 4 nearby allies.", manaCost: 20000, healAmount: 20, isAoE: true },
    { id: 73920, name: "Healing Rain", keybind: "5", icon: "healing-rain", color: "#38bdf8", description: "Heals up to 5 allies standing in target area. 10s cooldown.", manaCost: 10800, healAmount: 15, isAoE: true, cooldown: 10 },
    { id: 98008, name: "Spirit Link", keybind: "E", icon: "spirit-link", color: "#10b981", description: "Redistributes health and heals target. 25s cooldown.", manaCost: 5000, healAmount: 100, cooldown: 25 }
  ],
  "Monk_Mistweaver": [
    { id: 116670, name: "Vivify", keybind: "1", icon: "vivify", color: "#34d399", description: "Heals target and all targets with Renewing Mist.", manaCost: 8500, healAmount: 30 },
    { id: 115175, name: "Soothing Mist", keybind: "2", icon: "soothing-mist", color: "#059669", description: "Channels healing over time.", manaCost: 8000, healAmount: 35 },
    { id: 119611, name: "Renewing Mist", keybind: "3", icon: "renewing-mist", color: "#6ee7b7", description: "HoT that jumps to others if target is healed. 8s cooldown.", manaCost: 4500, healAmount: 8, cooldown: 8, hotDuration: 15 },
    { id: 124682, name: "Enveloping Mist", keybind: "4", icon: "enveloping-mist", color: "#10b981", description: "Strong HoT (6s) that increases other healing.", manaCost: 13000, healAmount: 48, hotDuration: 6 },
    { id: 191837, name: "Essence Font", keybind: "5", icon: "essence-font", color: "#a7f3d0", description: "Channels healing to up to 6 targets.", manaCost: 18000, healAmount: 16, isAoE: true },
    { id: 116849, name: "Life Cocoon", keybind: "E", icon: "life-cocoon", color: "#34d399", description: "Envelops target in a shield & heals 100%. 25s cooldown.", manaCost: 6000, healAmount: 100, cooldown: 25 }
  ],
  "Evoker_Preservation": [
    { id: 361469, name: "Living Flame", keybind: "1", icon: "living-flame", color: "#f87171", description: "Fires a blast of flame that heals an ally.", manaCost: 5000, healAmount: 28 },
    { id: 366155, name: "Reversion", keybind: "2", icon: "reversion", color: "#f87171", description: "Heals an ally over 12s. Critical heals extend it.", manaCost: 5000, healAmount: 8, hotDuration: 12 },
    { id: 364343, name: "Echo", keybind: "3", icon: "echo", color: "#c084fc", description: "Echoes your next healing spell.", manaCost: 12000, healAmount: 10 },
    { id: 355936, name: "Emerald Blossom", keybind: "4", icon: "emerald-blossom", color: "#34d399", description: "Spawns a seed that heals up to 5 allies after 2s.", manaCost: 12000, healAmount: 22, isAoE: true },
    { id: 367226, name: "Spiritbloom", keybind: "5", icon: "spiritbloom", color: "#10b981", description: "Channeled heal that targets up to 4 allies. 12s cooldown.", manaCost: 9500, healAmount: 50, cooldown: 12 },
    { id: 357170, name: "Time Dilation", keybind: "E", icon: "time-dilation", color: "#fb7185", description: "Delays damage taken and heals target 100%. 25s cooldown.", manaCost: 4000, healAmount: 100, cooldown: 25 }
  ]
};

const SPELL_DAMAGE_VALUES: Record<number, number> = {
  162794: 180000, 188499: 240000, 198013: 480000, 191427: 120000, 187827: 80000, 
  212084: 350000, 228477: 190000, 247454: 280000, 207407: 310000, 204021: 150000, 
  227084: 140000, 225919: 100000, 203720: 0, 190984: 110000, 5176: 95000, 78674: 250000, 
  194153: 200000, 133: 120000, 11366: 420000, 108853: 150000, 257520: 380000, 116: 95000, 
  44614: 210000, 31687: 80000, 84714: 350000, 85948: 140000, 47541: 180000, 55090: 110000, 
  49184: 220000, 85256: 290000, 184575: 160000, 35395: 110000, 24275: 220000
};

const HEALER_SPECS = [
  { className: "Priest", specName: "Holy" },
  { className: "Priest", specName: "Discipline" },
  { className: "Druid", specName: "Restoration" },
  { className: "Paladin", specName: "Holy" },
  { className: "Shaman", specName: "Restoration" },
  { className: "Monk", specName: "Mistweaver" },
  { className: "Evoker", specName: "Preservation" }
];

const getHealerSpells = (cls: string, spec: string): HealerSpell[] => {
  const key = `${cls}_${spec}`.replace(" ", "");
  const baseSpells = HEALER_SPELLS_BY_SPEC[key] || HEALER_SPELLS_BY_SPEC["Priest_Holy"];
  return baseSpells.map((s) => {
    const resInfo = getSpellResourceInfo(s.id, s.name);
    const castTime = getSpellCastTime(s.id, s.name);
    return {
      ...s,
      castTime,
      resourceCost: resInfo?.cost,
      resourceGen: resInfo?.gen
    };
  });
};

const generateHealerRoster = (size: number, playerClass?: string): HealerPlayer[] => {
  const roster: HealerPlayer[] = [];
  let numTanks = 1;
  let numHealers = 1;
  let numDps = 3;
  if (size === 10) {
    numTanks = 2;
    numHealers = 2;
    numDps = 6;
  } else if (size === 15) {
    numTanks = 2;
    numHealers = 3;
    numDps = 10;
  } else if (size === 20) {
    numTanks = 2;
    numHealers = 4;
    numDps = 14;
  }

  const FANTASY_NAMES = [
    "Turalyon", "Alleria", "Grommash", "Uther", "Jaina", "Arthas", "Thrall", "Sylvanas", "Illidan", "Malfurion",
    "Tyrande", "Khadgar", "Varian", "Anduin", "Baine", "Voljin", "Saurfang", "Genn", "Moira", "Velen",
    "Maiev", "Liadrin", "Chen", "Yrel", "Garrosh", "Kaelthas", "Akama", "Valeera", "Shaw", "Rexxar",
    "Rokhan", "Eitrigg", "Nazgrel", "Drekthar", "Darion", "Sally", "Bolvar", "Tirion", "Kargath", "Blackhand",
    "Guldan", "Orgrim", "Durotan", "Draka", "Garona", "Medivh", "Llane", "Lothar", "Antonidas", "Vereesa",
    "Falstad", "Muradin", "Brann", "Magni", "Garithos", "KelThuzad", "Anubarak"
  ];

  const shuffledNames = [...FANTASY_NAMES].sort(() => Math.random() - 0.5);
  let nameIndex = 0;
  const getName = () => {
    const rawName = shuffledNames[nameIndex++] || `Player${nameIndex}`;
    return rawName.substring(0, 12);
  };

  for (let i = 0; i < numTanks; i++) {
    roster.push({
      id: `tank-${i}`,
      name: getName(),
      role: "tank",
      subRole: "melee",
      class: Math.random() > 0.5 ? "warrior" : "deathknight",
      health: 100,
      maxHealth: 100,
      buffs: []
    });
  }

  for (let i = 0; i < numHealers; i++) {
    roster.push({
      id: `healer-${i}`,
      name: i === 0 ? "You" : getName(),
      role: "healer",
      subRole: "ranged",
      class: i === 0 ? (playerClass ? playerClass.toLowerCase().replace(/\s+/g, "") : "priest") : "priest",
      health: 100,
      maxHealth: 100,
      buffs: []
    });
  }

  for (let i = 0; i < numDps; i++) {
    const isMelee = i < Math.ceil(numDps * 0.25);
    const dpsClass = isMelee 
      ? ["rogue", "warrior", "demonhunter", "monk", "deathknight"][Math.floor(Math.random() * 5)]
      : ["mage", "warlock", "hunter", "priest", "druid", "shaman"][Math.floor(Math.random() * 6)];
    roster.push({
      id: `dps-${i}`,
      name: getName(),
      role: "dps",
      subRole: isMelee ? "melee" : "ranged",
      class: dpsClass,
      health: 100,
      maxHealth: 100,
      buffs: []
    });
  }

  return roster;
};

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
};

const formatKeybind = (key: string): string => {
  if (!key) return "";
  return key
    .replace(/CTRL-/gi, "C-")
    .replace(/SHIFT-/gi, "S-")
    .replace(/ALT-/gi, "A-");
};

function TunnelVisionOrb({
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

  // Extended Features States
  const [trainingMode, setTrainingMode] = useState<"dps" | "healer">("dps");
  const [selectedArena, setSelectedArena] = useState<string>("none");
  const [healerRaidSize, setHealerRaidSize] = useState<number>(10);
  const [healerRoster, setHealerRoster] = useState<HealerPlayer[]>([]);
  const [healerMana, setHealerMana] = useState<number>(260000);
  const [mouseoverPlayerId, setMouseoverPlayerId] = useState<string | null>(null);
  const [floatingHeals, setFloatingHeals] = useState<FloatingHeal[]>([]);
  const [isKeybindModeActive, setIsKeybindModeActive] = useState<boolean>(false);
  const [hoveredSpellId, setHoveredSpellId] = useState<number | null>(null);
  const [bossHealth, setBossHealth] = useState<number>(100);
  const [bossFlash, setBossFlash] = useState<boolean>(false);
  const [healerSpellCooldowns, setHealerSpellCooldowns] = useState<Record<number, number>>({});
  const [secondaryResourceVal, setSecondaryResourceVal] = useState<number>(0);
  const [wastedResources, setWastedResources] = useState<number>(0);
  const [resourceErrorText, setResourceErrorText] = useState<string | null>(null);

  const [currentCast, setCurrentCast] = useState<{
    spellId: number;
    name: string;
    icon: string;
    startTime: number;
    duration: number;
    targetId: string | null;
    stepIndex: number;
    evaluation?: any;
  } | null>(null);
  const [isInterrupted, setIsInterrupted] = useState<boolean>(false);

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
    orbScoreEarned,
    trainingMode,
    healerRoster,
    healerMana,
    mouseoverPlayerId,
    healerSpellCooldowns,
    isKeybindModeActive,
    hoveredSpellId,
    secondaryResourceVal,
    wastedResources,
    currentCast,
    isInterrupted,
    healerRaidSize
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
      orbScoreEarned,
      trainingMode,
      healerRoster,
      healerMana,
      mouseoverPlayerId,
      healerSpellCooldowns,
      isKeybindModeActive,
      hoveredSpellId,
      secondaryResourceVal,
      wastedResources,
      currentCast,
      isInterrupted,
      healerRaidSize
    };
  }, [
    gameState, elapsedTime, activeStepIndex, activeSpell, activePromptTime, casts, combo, lastCastTime, activeAlert, isHardcore, isGuidedMode, orbTotalPossible, orbScoreEarned,
    trainingMode, healerRoster, healerMana, mouseoverPlayerId, healerSpellCooldowns, isKeybindModeActive, hoveredSpellId, secondaryResourceVal, wastedResources,
    currentCast, isInterrupted, healerRaidSize
  ]);

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
    let firstSpec = "";
    if (cls && cls.specs.length > 0) {
      if (trainingMode === "healer") {
        const healerSpec = cls.specs.find(s => HEALER_SPECS.some(h => h.className === className && h.specName === s));
        firstSpec = healerSpec || cls.specs[0];
      } else {
        firstSpec = cls.specs[0];
      }
    }
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
    if (trainingMode === "healer") {
      const healerScen: Scenario = {
        id: "healer-triage",
        name: "Raid Grid Triage Challenge",
        description: "Keep tanks alive and heal incoming sporadic bursts across the group.",
        duration: drillDuration,
        steps: []
      };
      setScenarios([healerScen]);
      setSelectedScenario(healerScen);
    } else {
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
    }
  }, [activeBuild, drillDuration, trainingMode]);

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
    if (trainingMode === "healer") {
      return healerSpellCooldowns[spellId] || 0;
    }
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

  const getCooldownPercent = (spellId: number, remainingCd: number): number => {
    if (trainingMode === "healer") {
      const hSpells = getHealerSpells(selectedClass, selectedSpec);
      const hSpell = hSpells.find(s => s.id === spellId);
      const total = hSpell?.cooldown || 0;
      return total > 0 ? (remainingCd / total) * 100 : 0;
    }
    const cdVal = SPELL_COOLDOWNS[spellId] || 0;
    if (cdVal === 0) return 0;
    return (remainingCd / cdVal) * 100;
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

  const getSpecResourceConfig = () => {
    const c = (activeBuild?.class || selectedClass).toLowerCase().replace(/ /g, "");
    const s = (activeBuild?.spec || selectedSpec).toLowerCase().replace(/ /g, "");
    
    if (c === "paladin") {
      return { type: "holy_power" as const, max: 5, start: 0, label: "Holy Power" };
    }
    if (c === "rogue" || (c === "druid" && s === "feral")) {
      return { type: "combo_points" as const, max: 5, start: 0, label: "Combo Points" };
    }
    if (c === "warlock") {
      return { type: "soul_shards" as const, max: 5, start: 3, label: "Soul Shards" };
    }
    if (c === "druid" && s === "balance") {
      return { type: "astral_power" as const, max: 100, start: 0, label: "Astral Power" };
    }
    if (c === "priest" && s === "shadow") {
      return { type: "insanity" as const, max: 100, start: 0, label: "Insanity" };
    }
    if (c === "shaman" && (s === "elemental" || s === "enhancement")) {
      return { type: "maelstrom" as const, max: 100, start: 0, label: "Maelstrom" };
    }
    if (c === "warrior" || (c === "druid" && s === "guardian")) {
      return { type: "rage" as const, max: 100, start: 0, label: "Rage" };
    }
    if (c === "hunter") {
      return { type: "focus" as const, max: 120, start: 120, label: "Focus" };
    }
    if (c === "deathknight") {
      return { type: "runic_power" as const, max: 100, start: 0, label: "Runic Power" };
    }
    if (c === "monk" && s === "windwalker") {
      return { type: "chi" as const, max: 5, start: 0, label: "Chi" };
    }
    if (c === "monk" && s === "brewmaster") {
      return { type: "energy" as const, max: 100, start: 100, label: "Energy" };
    }
    if (c === "mage" && s === "arcane") {
      return { type: "arcane_charges" as const, max: 4, start: 0, label: "Arcane Charges" };
    }
    if (c === "demonhunter" && s === "havoc") {
      return { type: "fury" as const, max: 120, start: 0, label: "Fury" };
    }
    if (c === "demonhunter" && s === "vengeance") {
      return { type: "pain" as const, max: 100, start: 0, label: "Pain" };
    }
    if (c === "evoker" && (s === "augmentation" || s === "devastation")) {
      return { type: "essence" as const, max: 6, start: 6, label: "Essence" };
    }
    return { type: "none" as const, max: 0, start: 0, label: "" };
  };

  const renderResourceHUD = () => {
    if (gameState !== "running") return null;
    
    const config = getSpecResourceConfig();
    if (config.type === "none") return null;
    
    const val = secondaryResourceVal;
    
    if (config.type === "holy_power") {
      return (
        <div className="flex flex-col items-center space-y-1.5 select-none animate-fade-in-up">
          <div className="flex items-center space-x-1.5">
            {[1, 2, 3, 4, 5].map((i) => {
              const active = val >= i;
              return (
                <div 
                  key={i} 
                  className={`w-7 h-7 rotate-45 border transition-all duration-200 relative overflow-hidden ${
                    active
                      ? "bg-gradient-to-br from-amber-300 to-yellow-500 border-amber-300 shadow-[0_0_12px_#f59e0b] scale-105"
                      : "bg-zinc-950/80 border-zinc-800"
                  }`}
                >
                  {active && (
                    <div className="absolute top-0 left-0 w-full h-1/2 bg-white/25 -rotate-45 translate-x-[-25%]" />
                  )}
                </div>
              );
            })}
          </div>
          <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest font-mono">
            Holy Power: {val} / 5
          </span>
        </div>
      );
    }
    
    if (config.type === "combo_points") {
      return (
        <div className="flex flex-col items-center space-y-1.5 select-none animate-fade-in-up">
          <div className="flex items-center space-x-1.5 bg-zinc-950/90 border border-zinc-800/80 rounded-full px-2.5 py-1 backdrop-blur-sm">
            {[1, 2, 3, 4, 5].map((i) => {
              const active = val >= i;
              return (
                <div 
                  key={i} 
                  className={`w-4 h-4 rounded-full border transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-br from-red-500 to-rose-600 border-red-400 shadow-[0_0_8px_#f43f5e] scale-110"
                      : "bg-zinc-900 border-zinc-800"
                  }`}
                />
              );
            })}
          </div>
          <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest font-mono">
            Combo Points: {val} / 5
          </span>
        </div>
      );
    }
    
    if (config.type === "soul_shards") {
      return (
        <div className="flex flex-col items-center space-y-1.5 select-none animate-fade-in-up">
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4, 5].map((i) => {
              const active = val >= i;
              return (
                <div 
                  key={i} 
                  className={`w-6 h-8 border transition-all duration-300 relative overflow-hidden ${
                    active
                      ? "bg-gradient-to-b from-purple-500 to-indigo-700 border-purple-400 shadow-[0_0_10px_#a855f7] scale-102"
                      : "bg-zinc-950/80 border-zinc-850"
                  }`}
                  style={{
                    clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"
                  }}
                >
                  {active && (
                    <div className="absolute inset-0 bg-gradient-to-t from-violet-600/30 to-purple-400/50 animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
          <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest font-mono">
            Soul Shards: {val} / 5
          </span>
        </div>
      );
    }

    if (config.type === "chi") {
      return (
        <div className="flex flex-col items-center space-y-1.5 select-none animate-fade-in-up">
          <div className="flex items-center space-x-1.5 bg-zinc-950/90 border border-zinc-800/80 rounded-full px-2.5 py-1 backdrop-blur-sm">
            {[1, 2, 3, 4, 5].map((i) => {
              const active = val >= i;
              return (
                <div 
                  key={i} 
                  className={`w-4 h-4 rounded-full border transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-br from-emerald-400 to-teal-500 border-emerald-300 shadow-[0_0_8px_#34d399] scale-110"
                      : "bg-zinc-900 border-zinc-800"
                  }`}
                />
              );
            })}
          </div>
          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest font-mono">
            Chi: {val} / 5
          </span>
        </div>
      );
    }

    if (config.type === "arcane_charges") {
      return (
        <div className="flex flex-col items-center space-y-1.5 select-none animate-fade-in-up">
          <div className="flex items-center space-x-1.5">
            {[1, 2, 3, 4].map((i) => {
              const active = val >= i;
              return (
                <div 
                  key={i} 
                  className={`w-5 h-5 rounded border transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-br from-cyan-400 to-blue-500 border-cyan-300 shadow-[0_0_8px_#38bdf8] scale-105"
                      : "bg-zinc-950/80 border-zinc-850"
                  }`}
                />
              );
            })}
          </div>
          <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest font-mono">
            Arcane Charges: {val} / 4
          </span>
        </div>
      );
    }

    if (config.type === "essence") {
      return (
        <div className="flex flex-col items-center space-y-1.5 select-none animate-fade-in-up">
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4, 5, 6].map((i) => {
              const active = val >= i;
              return (
                <div 
                  key={i} 
                  className={`w-4 h-6 border transition-all duration-300 relative overflow-hidden ${
                    active
                      ? "bg-gradient-to-b from-teal-400 to-emerald-600 border-teal-300 shadow-[0_0_8px_#2dd4bf] scale-102"
                      : "bg-zinc-950/80 border-zinc-850"
                  }`}
                  style={{
                    clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"
                  }}
                >
                  {active && (
                    <div className="absolute inset-0 bg-gradient-to-t from-teal-500/20 to-emerald-400/45 animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
          <span className="text-[9px] font-black text-teal-400 uppercase tracking-widest font-mono">
            Essence: {val} / 6
          </span>
        </div>
      );
    }

    if (config.type === "runes") {
      return (
        <div className="flex flex-col items-center space-y-1.5 select-none animate-fade-in-up">
          <div className="flex items-center space-x-1.5">
            {[1, 2, 3, 4, 5, 6].map((i) => {
              const active = val >= i;
              return (
                <div 
                  key={i} 
                  className={`w-5 h-5 rotate-45 border transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-br from-cyan-500 to-blue-600 border-cyan-400 shadow-[0_0_8px_#06b6d4] scale-105"
                      : "bg-zinc-950/80 border-zinc-800"
                  }`}
                />
              );
            })}
          </div>
          <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest font-mono">
            Runes: {val} / 6
          </span>
        </div>
      );
    }
    
    if (
      config.type === "astral_power" || 
      config.type === "insanity" || 
      config.type === "maelstrom" || 
      config.type === "rage" || 
      config.type === "energy" || 
      config.type === "focus" || 
      config.type === "runic_power" || 
      config.type === "fury" || 
      config.type === "pain"
    ) {
      let gradient = "from-cyan-500 to-blue-600";
      let textColor = "text-cyan-400";
      
      if (config.type === "insanity") {
        gradient = "from-purple-600 to-fuchsia-800";
        textColor = "text-fuchsia-400";
      } else if (config.type === "maelstrom") {
        gradient = "from-blue-500 to-indigo-600";
        textColor = "text-blue-400";
      } else if (config.type === "rage") {
        gradient = "from-red-600 to-red-800";
        textColor = "text-red-500";
      } else if (config.type === "energy") {
        gradient = "from-yellow-400 to-amber-500";
        textColor = "text-yellow-400";
      } else if (config.type === "focus") {
        gradient = "from-orange-500 to-amber-600";
        textColor = "text-orange-400";
      } else if (config.type === "runic_power") {
        gradient = "from-cyan-400 to-teal-600";
        textColor = "text-cyan-400";
      } else if (config.type === "fury") {
        gradient = "from-purple-500 to-pink-600";
        textColor = "text-purple-400";
      } else if (config.type === "pain") {
        gradient = "from-purple-600 to-rose-700";
        textColor = "text-rose-400";
      }
      
      return (
        <div className="flex flex-col items-center space-y-1 select-none animate-fade-in-up w-64">
          <div className="w-full h-4 bg-zinc-950/90 border border-zinc-800 rounded-md overflow-hidden relative backdrop-blur-sm">
            <div 
              className={`h-full bg-gradient-to-r ${gradient} transition-all duration-200`}
              style={{ width: `${(val / config.max) * 100}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-black text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
              {val} / {config.max}
            </span>
          </div>
          <span className={`text-[8.5px] font-black uppercase tracking-widest font-mono ${textColor}`}>
            {config.label}
          </span>
        </div>
      );
    }
    
    return null;
  };

  const getRawMappedSpell = (spellId: number): Spell => {
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

    if (trainingMode === "healer") {
      const hSpells = getHealerSpells(selectedClass, selectedSpec);
      const hSpell = hSpells.find(s => s.id === spellId);
      if (hSpell) {
        return {
          id: hSpell.id,
          name: hSpell.name,
          keybind: hSpell.keybind,
          icon: hSpell.icon,
          color: hSpell.color,
          description: hSpell.description,
          castTime: hSpell.castTime
        };
      }
    }

    if (!activeBuild) return {
      ...defaultSpell,
      castTime: getSpellCastTime(spellId, defaultSpell.name)
    };

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
            castTime: getSpellCastTime(btn.id, btn.name || matchedDefault.name)
          };
        }
      }
    }

    return {
      ...defaultSpell,
      keybind: getSpellKeybind(spellId) || defaultSpell.keybind,
      castTime: getSpellCastTime(spellId, defaultSpell.name)
    };
  };

  const getMappedSpell = (spellId: number): Spell => {
    const baseSpell = getRawMappedSpell(spellId);
    const resInfo = getSpellResourceInfo(baseSpell.id, baseSpell.name);
    if (resInfo) {
      if (resInfo.cost) baseSpell.resourceCost = resInfo.cost;
      if (resInfo.gen) baseSpell.resourceGen = resInfo.gen;
    }
    return baseSpell;
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

  const cancelActiveCast = () => {
    const activeC = stateRef.current.currentCast;
    if (!activeC) return;
    
    setIsInterrupted(true);
    setCurrentCast(null);
    stateRef.current.currentCast = null;
    playSound("incorrect");
    
    setTimeout(() => {
      setIsInterrupted(false);
    }, 1000);

    if (stateRef.current.trainingMode !== "healer") {
      setCombo(0);
      
      const elapsed = stateRef.current.elapsedTime;
      const newRecord: CastRecord = {
        stepIndex: activeC.stepIndex,
        expectedSpellId: activeC.spellId,
        actualSpellId: null,
        expectedTime: elapsed,
        actualTime: elapsed,
        reactionTime: null,
        status: "incorrect",
      };
      setCasts((prev) => [...prev, newRecord]);
      setLastPressResult({ key: "WASD", status: "incorrect" });
      
      if (stateRef.current.isHardcore) {
        setWipedReason("incorrect");
        endGame();
      } else {
        const steps = selectedScenario.steps;
        const nextIdx = activeC.stepIndex + 1;
        if (nextIdx < steps.length) {
          const nextStep = steps[nextIdx];
          const gap = nextStep.time - steps[activeC.stepIndex].time;
          const nextExpectedTime = elapsed + gap;

          setActiveStepIndex(nextIdx);
          setActiveSpell(getMappedSpell(nextStep.spellId));
          setActivePromptTime(nextExpectedTime);
        } else {
          setActiveStepIndex(nextIdx);
          setActiveSpell(null);
          setActivePromptTime(null);
        }
      }
    }
  };

  const completeHealerCast = (spell: HealerSpell, targetId: string | null) => {
    const elapsed = stateRef.current.elapsedTime;
    const currentMana = stateRef.current.healerMana;
    const currentResourceVal = stateRef.current.secondaryResourceVal;

    if (currentMana < spell.manaCost) {
      playSound("incorrect");
      return;
    }

    if (stateRef.current.healerSpellCooldowns[spell.id] > 0) {
      playSound("incorrect");
      return;
    }

    if (spell.resourceCost) {
      const cost = spell.resourceCost.amount;
      if (currentResourceVal < cost) {
        const resLabel = getSpecResourceConfig().label;
        setResourceErrorText(`Not enough ${resLabel}!`);
        playSound("incorrect");
        setTimeout(() => {
          setResourceErrorText(null);
        }, 1200);
        return;
      }
    }

    setHealerMana(m => {
      const nm = Math.max(0, m - spell.manaCost);
      stateRef.current.healerMana = nm;
      return nm;
    });
    if (spell.cooldown !== undefined) {
      const cdVal = spell.cooldown;
      setHealerSpellCooldowns(prev => {
        const next = { ...prev, [spell.id]: cdVal };
        stateRef.current.healerSpellCooldowns = next;
        return next;
      });
    }

    if (spell.resourceCost) {
      setSecondaryResourceVal(prev => {
        const val = Math.max(0, prev - spell.resourceCost!.amount);
        stateRef.current.secondaryResourceVal = val;
        return val;
      });
    } else if (spell.resourceGen) {
      const gen = spell.resourceGen;
      const maxVal = getSpecResourceConfig().max;
      setSecondaryResourceVal(prev => {
        const prevVal = prev;
        const nextVal = prevVal + gen.amount;
        let finalVal = nextVal;
        if (prevVal >= maxVal) {
          setWastedResources(w => w + gen.amount);
          finalVal = maxVal;
        } else if (nextVal > maxVal) {
          setWastedResources(w => w + (nextVal - maxVal));
          finalVal = maxVal;
        }
        stateRef.current.secondaryResourceVal = finalVal;
        return finalVal;
      });
    }

    if (spell.isAoE) {
      setHealerRoster((prev) => {
        const sorted = [...prev]
          .filter(p => p.health > 0)
          .sort((a, b) => a.health - b.health);
        const lowestIds = new Set(sorted.slice(0, 5).map(p => p.id));
        
        return prev.map((player) => {
          if (lowestIds.has(player.id)) {
            const textId = Math.random().toString();
            setFloatingHeals(f => [...f, { id: textId, playerId: player.id, text: `+${spell.healAmount}%`, time: Date.now() }]);
            return {
              ...player,
              health: Math.min(100, player.health + spell.healAmount)
            };
          }
          return player;
        });
      });
      playSound("perfect");
      setCombo(c => c + 1);

      const newRecord: CastRecord = {
        stepIndex: -1,
        expectedSpellId: spell.id,
        actualSpellId: spell.id,
        expectedTime: elapsed,
        actualTime: elapsed,
        reactionTime: 200,
        status: "perfect"
      };
      setCasts((prev) => [...prev, newRecord]);
    } else {
      if (targetId) {
        setHealerRoster((prev) => {
          return prev.map((player) => {
            if (player.id === targetId && player.health > 0) {
              const textId = Math.random().toString();
              setFloatingHeals(f => [...f, { id: textId, playerId: player.id, text: `+${spell.healAmount}%`, time: Date.now() }]);
              
              let newBuffs = [...player.buffs];
              if (spell.hotDuration) {
                newBuffs = newBuffs.filter(b => b.name !== spell.name);
                newBuffs.push({ name: spell.name, expiresAt: elapsed + spell.hotDuration });
              }

              return {
                ...player,
                health: Math.min(100, player.health + spell.healAmount),
                buffs: newBuffs
              };
            }
            return player;
          });
        });
        playSound("perfect");
        setCombo(c => c + 1);

        const newRecord: CastRecord = {
          stepIndex: -1,
          expectedSpellId: spell.id,
          actualSpellId: spell.id,
          expectedTime: elapsed,
          actualTime: elapsed,
          reactionTime: 200,
          status: "perfect"
        };
        setCasts((prev) => [...prev, newRecord]);
      } else {
        playSound("incorrect");
      }
    }
  };

  const completeRotationCast = (spell: Spell, stepIndex: number, evaluation: any) => {
    const elapsed = stateRef.current.elapsedTime;
    const currentCasts = stateRef.current.casts;
    const currentResourceVal = stateRef.current.secondaryResourceVal;
    const steps = selectedScenario.steps;

    const newRecord: CastRecord = {
      stepIndex,
      expectedSpellId: spell.id,
      actualSpellId: evaluation.actualSpellId || spell.id,
      expectedTime: evaluation.expectedTime,
      actualTime: evaluation.actualTime,
      reactionTime: evaluation.reactionTimeMs,
      status: evaluation.status,
    };

    setCasts((prev) => [...prev, newRecord]);

    const isHitCorrect = ["perfect", "early", "late"].includes(evaluation.status);
    const totalCorrect = currentCasts.filter(c => ["perfect", "early", "late"].includes(c.status)).length + (isHitCorrect ? 1 : 0);
    setBossHealth(Math.max(0, 100 - (totalCorrect / Math.max(1, steps.length)) * 100));

    if (isHitCorrect) {
      if (spell.resourceCost) {
        setSecondaryResourceVal(prev => {
          const val = Math.max(0, prev - spell.resourceCost!.amount);
          stateRef.current.secondaryResourceVal = val;
          return val;
        });
      } else if (spell.resourceGen) {
        const gen = spell.resourceGen;
        const maxVal = getSpecResourceConfig().max;
        setSecondaryResourceVal(prev => {
          const prevVal = prev;
          const nextVal = prevVal + gen.amount;
          let finalVal = nextVal;
          if (prevVal >= maxVal) {
            setWastedResources(w => w + gen.amount);
            finalVal = maxVal;
          } else if (nextVal > maxVal) {
            setWastedResources(w => w + (nextVal - maxVal));
            finalVal = maxVal;
          }
          stateRef.current.secondaryResourceVal = finalVal;
          return finalVal;
        });
      }
    }

    if (evaluation.status === "perfect") {
      setBossFlash(true);
      setTimeout(() => setBossFlash(false), 150);
    }

    if (!selectedScenario.isProcReaction) {
      const nextIdx = stepIndex + 1;
      if (nextIdx < steps.length) {
        const nextStep = steps[nextIdx];
        const gap = nextStep.time - steps[stepIndex].time;
        const nextExpectedTime = evaluation.actualTime + gap;

        setActiveStepIndex(nextIdx);
        setActiveSpell(getMappedSpell(nextStep.spellId));
        setActivePromptTime(nextExpectedTime);
      } else {
        setActiveStepIndex(nextIdx);
        setActiveSpell(null);
        setActivePromptTime(null);
      }
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
    setCurrentCast(null);
    setIsInterrupted(false);
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

    const resConfig = getSpecResourceConfig();
    setSecondaryResourceVal(resConfig.start);
    setWastedResources(0);

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

    if (trainingMode === "healer") {
      const initialRoster = generateHealerRoster(healerRaidSize, selectedClass);
      setHealerRoster(initialRoster);
      setHealerMana(260000);
      stateRef.current.healerMana = 260000;
      setFloatingHeals([]);
      setHealerSpellCooldowns({});
      stateRef.current.healerSpellCooldowns = {};
      stateRef.current.currentCast = null;
      stateRef.current.lastCastTime = null;
    }

    setBossHealth(100);
    setBossFlash(false);

    // Set first step active immediately when game starts (only for opener/sustained)!
    if (trainingMode !== "healer" && !selectedScenario.isProcReaction && steps.length > 0) {
      setActiveStepIndex(0);
      setActiveSpell(getMappedSpell(steps[0].spellId));
      setActivePromptTime(steps[0].time); // e.g. 0.5s or 1.0s
    } else {
      setActiveStepIndex(null);
      setActiveSpell(null);
      setActivePromptTime(null);
    }

    const startTime = Date.now();
    let lastSecTick = 0;
    let nextDamageTime = 1.0;
    
    gameIntervalRef.current = setInterval(() => {
      const currentElapsed = (Date.now() - startTime) / 1000;
      setElapsedTime(currentElapsed);

      if (currentElapsed >= selectedScenario.duration) {
        endGame();
        return;
      }

      // Check active cast completion
      const activeC = stateRef.current.currentCast;
      if (activeC) {
        if (currentElapsed >= activeC.startTime + activeC.duration) {
          setCurrentCast(null);
          stateRef.current.currentCast = null;
          
          if (stateRef.current.trainingMode === "healer") {
            const hSpells = getHealerSpells(selectedClass, selectedSpec);
            const healerSpell = hSpells.find(s => s.id === activeC.spellId);
            if (healerSpell) {
              completeHealerCast(healerSpell, activeC.targetId);
            }
          } else {
            const rotSpell = getMappedSpell(activeC.spellId);
            if (rotSpell) {
              completeRotationCast(rotSpell, activeC.stepIndex, (activeC as any).evaluation);
            }
          }
        }
      }

      if (trainingMode === "healer") {
        // --- Healer Grid Mode loop ---
        const currentSec = Math.floor(currentElapsed);
        
        // HoTs and CD tick once per second
        if (currentSec > lastSecTick) {
          lastSecTick = currentSec;
          
          setHealerMana((prev) => Math.min(260000, prev + 2000));

          setHealerSpellCooldowns((prev) => {
            const nextCd: Record<number, number> = {};
            Object.entries(prev).forEach(([idStr, val]) => {
              if (val > 1) {
                nextCd[Number(idStr)] = val - 1;
              }
            });
            stateRef.current.healerSpellCooldowns = nextCd;
            return nextCd;
          });

          setHealerRoster((prevRoster) => {
            return prevRoster.map((player) => {
              if (player.health <= 0) return player;
              
              const activeHots = player.buffs.filter(b => b.expiresAt > currentElapsed);
              let healFromHots = 0;
              if (activeHots.length > 0) {
                healFromHots = activeHots.length * 4;
                const textId = Math.random().toString();
                setFloatingHeals(f => [...f, { id: textId, playerId: player.id, text: `+${healFromHots}%`, time: Date.now() }]);
              }
              
              return {
                ...player,
                health: Math.min(100, player.health + healFromHots),
                buffs: activeHots
              };
            });
          });
        }

        // Random raid damage spikes
        if (currentElapsed >= nextDamageTime) {
          const currentSize = stateRef.current.healerRaidSize;
          
          let spikeMin = 1.5;
          let spikeRand = 1.5;
          let minSpiked = 1;
          let maxSpiked = 3;
          let tankDmgBase = 7;
          let tankDmgRand = 9;
          let nonTankDmgBase = 12;
          let nonTankDmgRand = 21;
          let autoDmgBase = 3;
          let autoDmgRand = 4;

          if (currentSize === 5) {
            spikeMin = 1.6;
            spikeRand = 1.6;
            minSpiked = 1;
            maxSpiked = 2;
            tankDmgBase = 9;
            tankDmgRand = 11;
            nonTankDmgBase = 15;
            nonTankDmgRand = 21;
            autoDmgBase = 4;
            autoDmgRand = 5;
          } else if (currentSize === 15) {
            spikeMin = 1.1;
            spikeRand = 1.1;
            minSpiked = 2;
            maxSpiked = 4;
            tankDmgBase = 8;
            tankDmgRand = 10;
            nonTankDmgBase = 14;
            nonTankDmgRand = 22;
            autoDmgBase = 4;
            autoDmgRand = 4;
          } else if (currentSize === 20) {
            spikeMin = 0.75;
            spikeRand = 0.75;
            minSpiked = 3;
            maxSpiked = 6;
            tankDmgBase = 10;
            tankDmgRand = 13;
            nonTankDmgBase = 17;
            nonTankDmgRand = 23;
            autoDmgBase = 5;
            autoDmgRand = 5;
          }

          nextDamageTime = currentElapsed + spikeMin + Math.random() * spikeRand;

          setHealerRoster((prevRoster) => {
            if (prevRoster.length === 0) return prevRoster;

            const numTargets = Math.floor(Math.random() * (maxSpiked - minSpiked + 1)) + minSpiked;
            const updated = [...prevRoster];

            for (let t = 0; t < numTargets; t++) {
              const alive = updated.filter(p => p.health > 0);
              if (alive.length === 0) break;
              
              const target = alive[Math.floor(Math.random() * alive.length)];
              const idx = updated.findIndex(p => p.id === target.id);
              
              let dmg = 0;
              if (target.role === "tank") {
                dmg = Math.floor(Math.random() * tankDmgRand) + tankDmgBase;
              } else {
                dmg = Math.floor(Math.random() * nonTankDmgRand) + nonTankDmgBase;
              }

              updated[idx] = {
                ...target,
                health: Math.max(0, target.health - dmg)
              };
            }

            // Steady tank auto attack damage
            const tanks = updated.filter(p => p.role === "tank" && p.health > 0);
            tanks.forEach((tank) => {
              const idx = updated.findIndex(p => p.id === tank.id);
              const autoDmg = Math.floor(Math.random() * autoDmgRand) + autoDmgBase;
              updated[idx] = {
                ...updated[idx],
                health: Math.max(0, updated[idx].health - autoDmg)
              };
            });

            // Wipe check
            const totalAlive = updated.filter(p => p.health > 0).length;
            const totalDead = updated.length - totalAlive;
            const tanksAlive = updated.filter(p => p.role === "tank" && p.health > 0).length;
            const totalTanks = updated.filter(p => p.role === "tank").length;

            const threshold = updated.length <= 5 ? 1 : updated.length <= 10 ? 2 : updated.length <= 15 ? 3 : 4;
            
            if (tanksAlive === 0 && totalTanks > 0) {
              setTimeout(() => {
                setWipedReason("A tank died!");
                endGame();
              }, 0);
            } else if (totalDead > threshold) {
              setTimeout(() => {
                setWipedReason("Too many raid members died!");
                endGame();
              }, 0);
            }

            return updated;
          });
        }

        // Clean up old float heal texts
        setFloatingHeals((prev) => prev.filter(f => Date.now() - f.time < 1000));

      } else {
        // --- Normal DPS / Tank Rotation loop ---
        // Passive resource regeneration
        const currentSec = Math.floor(currentElapsed);
        if (currentSec > lastSecTick) {
          lastSecTick = currentSec;
          const config = getSpecResourceConfig();
          if (config.type === "energy" || config.type === "focus") {
            setSecondaryResourceVal(prev => {
              const val = Math.min(config.max, prev + 10);
              stateRef.current.secondaryResourceVal = val;
              return val;
            });
          } else if (config.type === "essence") {
            if (currentSec % 5 === 0) {
              setSecondaryResourceVal(prev => {
                const val = Math.min(config.max, prev + 1);
                stateRef.current.secondaryResourceVal = val;
                return val;
              });
            }
          }
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
        const { activeStepIndex: curIdx, casts: currentCasts, activePromptTime: curPromptTime } = stateRef.current;

        if (selectedScenario.isProcReaction) {
          // --- Proc Reaction: Original absolute time-based check ---
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
        } else {
          // --- Opener / Sustained: New dynamic user-driven check ---
          if (curIdx !== null && curIdx < steps.length && curPromptTime !== null) {
            const missThreshold = curIdx === 0 ? 5.0 : 1.2;
            if (currentElapsed >= curPromptTime + missThreshold) {
              const prevStep = steps[curIdx];
              
              // Log missed cast
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

              const nextIdx = curIdx + 1;
              if (nextIdx < steps.length) {
                const nextStep = steps[nextIdx];
                const gap = nextStep.time - prevStep.time;
                const nextExpectedTime = curPromptTime + gap;

                setActiveStepIndex(nextIdx);
                setActiveSpell(getMappedSpell(nextStep.spellId));
                setActivePromptTime(nextExpectedTime);
                setLastCastTime(curPromptTime);
              } else {
                setActiveStepIndex(nextIdx);
                setActiveSpell(null);
                setActivePromptTime(null);
              }
            }
          }
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

    if (wastedResources > 0) {
      const resConfig = getSpecResourceConfig();
      stats.feedback.push(`Resource Waste: You generated ${wastedResources} excess ${resConfig.label} while already at maximum capacity. Try to cast your spenders before overflowing!`);
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
    setCurrentCast(null);
    setIsInterrupted(false);
    synthRef.current?.stopHeartbeat();
    stateRef.current.healerSpellCooldowns = {};
    stateRef.current.currentCast = null;
    stateRef.current.lastCastTime = null;
  };

  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["Shift", "Control", "Alt"].includes(e.key)) return;

      const pressedWoWKey = getWoWKeyString(e);

      // WASD movement cancellation check
      const movementKeys = ["W", "A", "S", "D"];
      if (movementKeys.includes(e.key.toUpperCase())) {
        const activeC = stateRef.current.currentCast;
        if (activeC) {
          e.preventDefault();
          cancelActiveCast();
          return;
        }
      }

      // Check if Keybind Mode is active
      if (stateRef.current.isKeybindModeActive && stateRef.current.gameState === "idle") {
        const hSpellId = stateRef.current.hoveredSpellId;
        if (hSpellId !== null) {
          e.preventDefault();
          const targetKey = e.key === "Escape" ? "" : pressedWoWKey;
          
          if (activeBuild) {
            const updatedBuild = { ...activeBuild };
            let found = false;
            updatedBuild.actionBars.forEach((bar) => {
              bar.buttons.forEach((btn) => {
                if (btn.id === hSpellId) {
                  btn.key = targetKey;
                  found = true;
                }
              });
            });
            if (found) {
              setActiveBuild(updatedBuild);
              localStorage.setItem("pullprep_active_build", JSON.stringify(updatedBuild));
              playSound("perfect");
            }
          }
          return;
        }
      }

      let validBinds = getActiveKeybinds();
      if (stateRef.current.trainingMode === "healer") {
        const hSpells = getHealerSpells(selectedClass, selectedSpec);
        validBinds = new Set(hSpells.map(s => s.keybind.toUpperCase()));
      }

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
        isHardcore: hcActive,
        trainingMode: currentMode,
        healerMana: currentMana,
        healerSpellCooldowns: currentCds,
        mouseoverPlayerId: currentTargetId,
        secondaryResourceVal: currentResourceVal,
        currentCast: activeC
      } = stateRef.current;

      if (currentGameState !== "running") return;

      // Gate new spell casts while currently casting
      if (activeC) {
        return;
      }

      const elapsed = stateRef.current.elapsedTime;
      const steps = selectedScenario.steps;

      // --- 1. Healer Grid Mode Casts ---
      if (currentMode === "healer") {
        const hSpells = getHealerSpells(selectedClass, selectedSpec);
        const spell = hSpells.find(s => s.keybind.toUpperCase() === pressedWoWKey);
        
        if (spell) {
          if (currentMana < spell.manaCost) {
            playSound("incorrect");
            return;
          }
          if (currentCds[spell.id] > 0) {
            playSound("incorrect");
            return;
          }

          // Resource gating check
          if (spell.resourceCost) {
            const cost = spell.resourceCost.amount;
            if (currentResourceVal < cost) {
              const resLabel = getSpecResourceConfig().label;
              setResourceErrorText(`Not enough ${resLabel}!`);
              playSound("incorrect");
              setTimeout(() => {
                setResourceErrorText(null);
              }, 1200);
              return;
            }
          }

          const castTime = spell.castTime || 0;
          if (castTime > 0) {
            const newCast = {
              spellId: spell.id,
              name: spell.name,
              icon: spell.icon,
              startTime: elapsed,
              duration: castTime,
              targetId: currentTargetId,
              stepIndex: -1
            };
            setCurrentCast(newCast);
            stateRef.current.currentCast = newCast;
            setLastCastTime(elapsed);
            stateRef.current.lastCastTime = elapsed;
          } else {
            completeHealerCast(spell, currentTargetId);
          }
        }
        return;
      }

      // Stress Tempo Accelerator: GCD speeds up with combo streak (up to 20% speedup at 50 combo)
      const baseGcd = 1.5;
      const gcdDuration = baseGcd * (1 - Math.min(0.2, (combo / 50) * 0.2));
      const queueWindow = 0.3;

      // 2. Handle Mechanic Alerts press
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

      // 3. Normal Rotational check
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

      if (!selectedScenario.isProcReaction && nextStepIndex < steps.length && currentIndex !== null) {
        const nextStep = steps[nextStepIndex];
        const currentStep = steps[currentIndex];
        const gap = nextStep.time - currentStep.time;
        const nextExpectedTime = (currentPromptTime || 0) + gap;
        const timeUntilNext = nextExpectedTime - elapsed;
        if (timeUntilNext > 0 && timeUntilNext <= queueWindow) {
          targetStepIndex = nextStepIndex;
          targetSpell = getMappedSpell(nextStep.spellId);
          targetPromptTime = nextExpectedTime;
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

        const castTime = getSpellCastTime(targetSpell.id, targetSpell.name);
        if (castTime > 0) {
          let isResourceValid = true;
          if (pressedWoWKey === expectedKeybind && targetSpell && targetSpell.resourceCost) {
            const cost = targetSpell.resourceCost.amount;
            if (currentResourceVal < cost) {
              isResourceValid = false;
              const resLabel = getSpecResourceConfig().label;
              setResourceErrorText(`Not enough ${resLabel}!`);
              playSound("incorrect");
              setTimeout(() => {
                setResourceErrorText(null);
              }, 1200);
              return;
            }
          }

          let timeDiff = actualCastTime - (targetPromptTime || 0);
          if (!selectedScenario.isProcReaction && targetStepIndex === 0) {
            timeDiff = 0.2;
          }
          const spellWithCustomBind = {
            ...targetSpell,
            keybind: expectedKeybind
          };
          const { status, reactionTimeMs } = evaluatePress(spellWithCustomBind, pressedWoWKey, timeDiff);

          if (status === "incorrect") {
            if (hcActive) {
              setWipedReason("incorrect");
              endGame();
            } else {
              registerIncorrectPress(pressedWoWKey);
            }
            return;
          }

          const actualSpellId = activeBuild 
            ? (activeBuild.actionBars.flatMap(bar => bar.buttons).find(btn => btn.key === pressedWoWKey)?.id || null)
            : (Object.values(DEMON_HUNTER_SPELLS).find((s) => s.keybind === pressedWoWKey)?.id || null);

          setCurrentCast({
            spellId: targetSpell.id,
            name: targetSpell.name,
            icon: targetSpell.icon,
            startTime: elapsed,
            duration: castTime,
            targetId: null,
            stepIndex: targetStepIndex,
            evaluation: {
              status,
              reactionTimeMs,
              pressedKey: pressedWoWKey,
              actualSpellId,
              expectedTime: !selectedScenario.isProcReaction ? steps[targetStepIndex]?.time : (targetPromptTime || 0),
              actualTime: actualCastTime,
            }
          });

          setLastCastTime(actualCastTime);
          setLastPressResult({ key: pressedWoWKey, status });

          if (status === "perfect") {
            setCombo((prev) => prev + 1);
            playSound("perfect");
          } else if (status === "early" || status === "late") {
            setCombo((prev) => prev + 1);
            playSound("correct");
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
          let timeDiff = actualCastTime - (targetPromptTime || 0);
          if (!selectedScenario.isProcReaction && targetStepIndex === 0) {
            timeDiff = 0.2;
          }
          const spellWithCustomBind = {
            ...targetSpell,
            keybind: expectedKeybind
          };
          const { status, reactionTimeMs } = evaluatePress(spellWithCustomBind, pressedWoWKey, timeDiff);

          let isResourceValid = true;
          let finalStatus = status;

          if (pressedWoWKey === expectedKeybind && targetSpell && targetSpell.resourceCost) {
            const cost = targetSpell.resourceCost.amount;
            if (currentResourceVal < cost) {
              isResourceValid = false;
              finalStatus = "incorrect";

              const resLabel = getSpecResourceConfig().label;
              setResourceErrorText(`Not enough ${resLabel}!`);
              playSound("incorrect");

              setTimeout(() => {
                setResourceErrorText(null);
              }, 1200);
            }
          }

          const actualSpellId = activeBuild 
            ? (activeBuild.actionBars.flatMap(bar => bar.buttons).find(btn => btn.key === pressedWoWKey)?.id || null)
            : (Object.values(DEMON_HUNTER_SPELLS).find((s) => s.keybind === pressedWoWKey)?.id || null);

          const evaluation = {
            status: finalStatus,
            reactionTimeMs,
            pressedKey: pressedWoWKey,
            actualSpellId,
            expectedTime: !selectedScenario.isProcReaction ? steps[targetStepIndex]?.time : (targetPromptTime || 0),
            actualTime: actualCastTime,
          };

          setLastPressResult({ key: pressedWoWKey, status: finalStatus });

          if (finalStatus === "perfect") {
            setCombo((prev) => prev + 1);
            playSound("perfect");
            setLastCastTime(actualCastTime);
          } else if (finalStatus === "early" || finalStatus === "late") {
            setCombo((prev) => prev + 1);
            playSound("correct");
            setLastCastTime(actualCastTime);
          } else {
            if (hcActive) {
              setWipedReason("incorrect");
              endGame();
              return;
            } else {
              setCombo(0);
              if (isResourceValid) {
                playSound("incorrect");
              }
            }
          }

          completeRotationCast(targetSpell, targetStepIndex, evaluation);
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
  const renderCastBar = () => {
    if (!currentCast && !isInterrupted) return null;

    let spellName = "";
    let spellIcon = "";
    let elapsedCast = 0;
    let duration = 0;
    let progressPercent = 0;
    let isCastInterrupted = isInterrupted;

    if (currentCast) {
      spellName = currentCast.name;
      spellIcon = getSpellIconUrl(currentCast.spellId);
      duration = currentCast.duration;
      elapsedCast = Math.min(duration, elapsedTime - currentCast.startTime);
      progressPercent = (elapsedCast / duration) * 100;
    } else {
      spellName = "Interrupted";
      progressPercent = 100;
    }

    return (
      <div className="w-full max-w-sm bg-zinc-950/95 border-2 border-zinc-800 rounded-lg p-1 shadow-[0_4px_20px_rgba(0,0,0,0.8)] animate-fade-in-up mb-4 relative z-30 select-none">
        <div className="flex items-center space-x-2 relative h-8">
          {spellIcon ? (
            <div className="w-8 h-8 rounded border border-zinc-700 overflow-hidden shrink-0">
              <img src={spellIcon} alt={spellName} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded border border-zinc-700 bg-rose-950 flex items-center justify-center shrink-0">
              <span className="text-[10px]">🛑</span>
            </div>
          )}
          
          <div className="flex-grow h-full bg-zinc-900/90 rounded border border-zinc-850 overflow-hidden relative">
            <div 
              className={`h-full transition-all duration-75 ${
                isCastInterrupted 
                  ? "bg-gradient-to-r from-red-600 to-rose-700 animate-pulse" 
                  : "bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-400"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
            
            <span className="absolute left-2.5 inset-y-0 flex items-center text-xs font-black text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,1)] uppercase tracking-wide">
              {spellName}
            </span>
            
            {!isCastInterrupted && duration > 0 && (
              <span className="absolute right-2.5 inset-y-0 flex items-center text-[10px] font-mono font-black text-amber-200 drop-shadow-[0_1.5px_2px_rgba(0,0,0,1)]">
                {elapsedCast.toFixed(1)} / {duration.toFixed(1)}s
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const specKey = activeBuild ? `${activeBuild.class.toLowerCase().replace(' ', '')}_${activeBuild.spec.toLowerCase().replace(' ', '')}` : "demonhunter_havoc";
  const healerSpells = getHealerSpells(selectedClass, selectedSpec);
  const activeCoreSpells = trainingMode === "healer"
    ? healerSpells.map(s => ({ id: s.id, name: s.name }))
    : (ROTATIONS_DB[specKey]?.coreSpells || [
        { id: 191427, name: "Metamorphosis" },
        { id: 198013, name: "Eye Beam" },
        { id: 188499, name: "Blade Dance" },
        { id: 162794, name: "Chaos Strike" }
      ]).filter((s: any) => isRealSpell(s.id, s.name));
  const missingSpells = checkMissingCoreSpells(activeBuild, specKey);

  return (
    <div 
      className="min-h-screen text-zinc-100 flex flex-col relative transition-all duration-500"
      style={{
        backgroundColor: "#09090b",
        backgroundImage: selectedArena !== "none" ? `url('/arenas/${selectedArena}.png')` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >
      {/* Red WoW Error Text overlay (e.g. Not enough Holy Power) */}
      {resourceErrorText && (
        <div className="absolute top-[35%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none animate-bounce">
          <span className="text-red-500 font-extrabold text-sm uppercase tracking-widest font-mono drop-shadow-[0_1.5px_2px_rgba(0,0,0,1)] text-center block">
            ⚠️ {resourceErrorText}
          </span>
        </div>
      )}
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
        @keyframes floatUp {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-40px); opacity: 0; }
        }
        .animate-float-up {
          animation: floatUp 0.8s forwards ease-out;
        }
      `}</style>

      {/* Background radial vignette overlay to maintain action bar readability */}
      {selectedArena !== "none" && (
        <div 
          className="absolute inset-0 pointer-events-none z-0" 
          style={{
            background: "radial-gradient(circle, rgba(9,9,11,0.3) 0%, rgba(9,9,11,0.85) 100%)"
          }}
        />
      )}

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
      <header className="border-b border-zinc-900 bg-zinc-950/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-8 h-8 rounded bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <span className="font-serif font-black text-zinc-950 text-base">P</span>
              </div>
              <span className="font-serif font-black text-lg tracking-wider text-amber-500">
                PULLPREP<span className="text-zinc-400">.COM</span>
              </span>
            </Link>
          </div>
          <nav className="flex items-center space-x-6">
            <Link
              href="/dashboard"
              className="text-xs font-bold font-serif uppercase tracking-wider text-zinc-400 hover:text-amber-400 transition-colors"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      {/* Content wrapper */}
      <div className="flex-grow flex flex-col justify-between max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6 relative z-10">
        
        {/* Real-time feedback bar */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 bg-zinc-950/90 border border-zinc-800/80 p-3 rounded-2xl backdrop-blur-md">
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

              {/* Mode Selector */}
              <div className="p-1.5 bg-zinc-950 rounded-xl border border-zinc-880/80 flex space-x-1 w-full select-none">
                <button
                  type="button"
                  onClick={() => {
                    setTrainingMode("dps");
                    const saved = localStorage.getItem("pullprep_active_build");
                    if (saved) {
                      try {
                        const parsed = JSON.parse(saved);
                        setActiveBuild(parsed);
                        setSelectedClass(parsed.class);
                        setSelectedSpec(parsed.spec);
                      } catch (e) {}
                    }
                  }}
                  className={`flex-grow py-2 text-xs font-black rounded-lg uppercase transition-all cursor-pointer ${
                    trainingMode === "dps"
                      ? "bg-violet-600 text-white shadow"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  ⚔️ Rotation (DPS/Tank)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTrainingMode("healer");
                    const isHealer = HEALER_SPECS.some(
                      (h) => h.className === selectedClass && h.specName === selectedSpec
                    );
                    if (!isHealer) {
                      setSelectedClass("Priest");
                      setSelectedSpec("Holy");
                      const newBuild = generateDefaultBuild("Priest", "Holy");
                      setActiveBuild(newBuild);
                    }
                  }}
                  className={`flex-grow py-2 text-xs font-black rounded-lg uppercase transition-all cursor-pointer ${
                    trainingMode === "healer"
                      ? "bg-violet-600 text-white shadow"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  💚 Triage (Healer Grid)
                </button>
              </div>

              {/* Class & Spec Selector */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/90 backdrop-blur-md text-left space-y-3">
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
                      {WOW_CLASSES_SPECS
                        .filter(c => trainingMode === "dps" || c.specs.some(s => HEALER_SPECS.some(h => h.className === c.name && h.specName === s)))
                        .map(c => (
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
                      {(WOW_CLASSES_SPECS.find(c => c.name === selectedClass)?.specs || [])
                        .filter(s => trainingMode === "dps" || HEALER_SPECS.some(h => h.className === selectedClass && h.specName === s))
                        .map(spec => (
                          <option key={spec} value={spec}>{spec}</option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Healer Grid Options & Boss Background Arena Selector */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/90 backdrop-blur-md text-left space-y-3">
                <div className="flex items-center space-x-2 text-violet-400 font-extrabold text-xs uppercase tracking-wider">
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="size-4 text-violet-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                  </svg>
                  <span>Simulation Options</span>
                </div>
                <div className={`grid ${trainingMode === "healer" ? "grid-cols-2" : "grid-cols-1"} gap-3`}>
                  {trainingMode === "healer" && (
                    <div>
                      <label className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide block mb-1">Raid Size</label>
                      <select
                        value={healerRaidSize}
                        onChange={(e) => setHealerRaidSize(Number(e.target.value))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:border-violet-500 focus:outline-none cursor-pointer"
                      >
                        <option value={5}>5-Man (Mythic+)</option>
                        <option value={10}>10-Man (Normal)</option>
                        <option value={15}>15-Man (Heroic)</option>
                        <option value={20}>20-Man (Mythic)</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide block mb-2">Select Arena Background</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "none", name: "None", desc: "Dark Theme", gradient: "from-zinc-950 to-zinc-900 border-zinc-850" },
                        { id: "lura", name: "L'ura", desc: "Void Realm", gradient: "from-purple-950/60 to-fuchsia-950/60 border-purple-900/50" },
                        { id: "ragnaros", name: "Ragnaros", desc: "Firelands", gradient: "from-red-950/60 to-amber-950/60 border-red-900/50" },
                        { id: "lichking", name: "Lich King", desc: "Icecrown", gradient: "from-cyan-950/60 to-blue-950/60 border-cyan-900/50" }
                      ].map((arena) => {
                        const isSelected = selectedArena === arena.id;
                        return (
                          <button
                            type="button"
                            key={arena.id}
                            onClick={() => setSelectedArena(arena.id)}
                            className={`group relative h-14 rounded-xl border text-left p-2.5 overflow-hidden transition-all duration-300 cursor-pointer ${
                              isSelected
                                ? "border-violet-500 ring-2 ring-violet-500/20 scale-102 bg-zinc-900/90 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                                : "hover:border-zinc-750 bg-zinc-950/85 hover:bg-zinc-900/60 border-zinc-850"
                            }`}
                          >
                            <div className={`absolute inset-0 bg-gradient-to-br ${arena.gradient} opacity-15 group-hover:opacity-30 transition-opacity`} />
                            
                            <div className="relative z-10 flex flex-col justify-between h-full">
                              <span className="font-extrabold text-[11px] text-zinc-200 group-hover:text-white transition-colors">{arena.name}</span>
                              <span className="text-[9px] text-zinc-500 font-bold group-hover:text-zinc-400 transition-colors leading-none">{arena.desc}</span>
                            </div>
                            
                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse z-10" />
                            )}
                          </button>
                        );
                      })}
                    </div>
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
                        ? "bg-violet-950/85 border-violet-500/80 text-white"
                        : "bg-zinc-950/85 border-zinc-850 text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200"
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
                  <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-950/90 backdrop-blur-md w-full">
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
                  <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-850 bg-zinc-950/90 backdrop-blur-md w-full">
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
                  <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-950/90 backdrop-blur-md w-full">
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
                  <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-950/90 backdrop-blur-md w-full">
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
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-950/90 backdrop-blur-md w-full sm:col-span-2 gap-3">
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
            <div className="flex flex-col items-center justify-center space-y-8 w-full">
              {trainingMode === "healer" ? (
                /* Healer Raid Grid Mode UI */
                <div className="w-full max-w-2xl space-y-4 animate-fade-in-up">
                  {/* Mana Bar & Target info */}
                  <div className="flex justify-between items-center bg-zinc-950/95 border border-zinc-800 rounded-xl p-3 backdrop-blur-md">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-zinc-500 font-extrabold uppercase tracking-widest block">Mana</span>
                      <div className="w-48 h-4 bg-zinc-900 border border-zinc-800 rounded overflow-hidden relative">
                        <div 
                          className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-200"
                          style={{ width: `${(healerMana / 260000) * 100}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-black text-white">
                          {Math.round(healerMana).toLocaleString()} / 260,000
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide block">Mouseover Target</span>
                      <span className="text-xs font-black text-white font-mono">
                        {mouseoverPlayerId 
                          ? healerRoster.find(p => p.id === mouseoverPlayerId)?.name || "Unknown"
                          : "None"}
                      </span>
                    </div>
                  </div>

                  {/* Raid Grid */}
                  <div className="grid grid-cols-5 gap-2">
                    {healerRoster.map((player) => {
                      const barColor = CLASS_COLORS_HEX[player.class.toLowerCase()] || "#10b981";
                      const isDead = player.health <= 0;
                      const isHovered = mouseoverPlayerId === player.id;
                      const isLowHealth = player.health < 35 && !isDead;
                      
                      return (
                        <div
                          key={player.id}
                          onMouseEnter={() => setMouseoverPlayerId(player.id)}
                          onMouseLeave={() => setMouseoverPlayerId(null)}
                          className={`relative h-16 rounded-xl overflow-hidden border transition-all duration-150 cursor-pointer pointer-events-auto flex flex-col justify-between p-2 select-none ${
                            isDead ? "bg-zinc-950 border-zinc-900 opacity-40" :
                            isLowHealth ? "border-rose-600 shadow-[0_0_12px_rgba(244,63,94,0.4)] animate-pulse bg-black" :
                            isHovered ? "border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)] bg-black" : "bg-black border-zinc-800"
                          }`}
                        >
                          {/* Floating heals text */}
                          {floatingHeals
                            .filter(f => f.playerId === player.id)
                            .map(f => (
                              <span 
                                key={f.id} 
                                className="absolute inset-0 flex items-center justify-center font-black font-mono text-emerald-400 text-sm drop-shadow-[0_1.5px_2px_rgba(0,0,0,1)] animate-float-up z-20 pointer-events-none"
                              >
                                {f.text}
                              </span>
                            ))}

                          {/* Health Bar backdrop & filler */}
                          {!isDead && (
                            <div 
                              className="absolute left-0 top-0 bottom-0 opacity-80 transition-all duration-100"
                              style={{ 
                                width: `${player.health}%`, 
                                backgroundColor: barColor 
                              }}
                            />
                          )}

                          {/* Top Row: Role icon & HoT indicators */}
                          <div className="flex justify-between items-center z-10 w-full relative">
                            {/* Role Icon */}
                            <span className="text-[10px] drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.9)]">
                              {player.role === "tank" && "🛡️"}
                              {player.role === "healer" && "➕"}
                              {player.role === "dps" && (player.subRole === "melee" ? "⚔️" : "🏹")}
                            </span>
                            {/* HoT Dots */}
                            <div className="flex space-x-0.5">
                              {player.buffs.map((b, idx) => (
                                <span 
                                  key={idx} 
                                  className="w-1.5 h-1.5 rounded-full bg-emerald-400 border border-emerald-500 shadow-sm animate-pulse" 
                                  title={b.name}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Bottom Row: Name and Health Percent */}
                          <div className="flex justify-between items-end z-10 w-full relative">
                            <span 
                              className="text-[11px] font-black tracking-wide truncate max-w-[65px] text-white drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.95)]"
                            >
                              {player.name}
                            </span>
                            <span className="text-[10px] font-mono font-black text-white drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.95)]">
                              {isDead ? "DEAD" : `${player.health.toFixed(0)}%`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* DPS / Tank Rotation Mode UI */
                <>
                  {/* Boss Unit Frame */}
                  <div 
                    className={`flex items-center space-x-3 bg-zinc-950/95 border border-zinc-800/80 p-3 rounded-2xl shadow-xl w-80 relative transition-all duration-150 z-20 ${
                      bossFlash ? "border-rose-500 bg-rose-950/30 shadow-rose-500/20 scale-102" : ""
                    }`}
                  >
                    {/* Portrait / Skull */}
                    <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-lg font-black shrink-0 relative overflow-hidden">
                      <span className="text-xl">💀</span>
                      <span className="absolute -bottom-1 -right-1 bg-zinc-950 border border-zinc-800 rounded-full px-1 py-0.5 text-[8px] font-mono font-bold text-red-500">
                        ??
                      </span>
                    </div>
                    {/* Name and Health */}
                    <div className="flex-grow space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-white uppercase tracking-wider">
                          {selectedArena === "lura" ? "L'ura" : selectedArena === "ragnaros" ? "Ragnaros" : selectedArena === "lichking" ? "The Lich King" : "Training Dummy"}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {bossHealth.toFixed(0)}%
                        </span>
                      </div>
                      {/* Health Bar */}
                      <div className="w-full h-3 bg-zinc-900 border border-zinc-850 rounded-md overflow-hidden relative">
                        <div 
                          className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-200"
                          style={{ width: `${bossHealth}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {activeSpell ? (
                    <div className="flex flex-col items-center space-y-4 w-full max-w-xl">
                      {/* Sequence Lane Container */}
                      <div className="w-full bg-zinc-950/95 border border-zinc-800 rounded-3xl p-4 flex flex-col items-center relative overflow-hidden backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.5)] animate-fade-in-up">
                        
                        {/* Horizontal Connector Dotted Line */}
                        <div className="absolute top-[48px] left-[12%] right-[12%] border-t-2 border-dashed border-zinc-800/40 z-0" />
                        
                        {/* Spell Timeline Row */}
                        <div className="flex items-center justify-center space-x-6 relative z-10 w-full select-none">
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
                                      {formatKeybind(spell.keybind) || "Unbound"}
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
                            <>Press Key: <span className={`${isGuidedMode ? 'text-emerald-400 bg-emerald-950/40 border-emerald-900' : 'text-violet-400 bg-violet-950/40 border-violet-900'} font-mono text-2xl px-2 py-0.5 rounded border`}>{formatKeybind(activeSpell.keybind) || "Unbound"}</span></>
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
                </>
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
            <div className="w-full max-w-2xl bg-zinc-950/95 border border-zinc-800 p-8 rounded-3xl space-y-8 backdrop-blur-md relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-44 h-44 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="text-center border-b border-zinc-800 pb-4">
                <span className="inline-block px-3 py-0.5 rounded bg-violet-950/50 border border-violet-900/60 text-[10px] text-violet-400 font-extrabold tracking-widest uppercase mb-2">
                  Session Feedback Complete
                </span>
                <h2 className="text-3xl font-black text-white">Simulation Metrics</h2>
              </div>

              {/* Main Score Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-zinc-900/90 p-4 rounded-xl border border-zinc-800 text-center">
                  <span className="text-[10px] text-zinc-500 font-extrabold uppercase block tracking-wider">Accuracy</span>
                  <span className={`text-2xl font-black block mt-1 ${
                    finalStats.accuracy >= 90 ? 'text-emerald-400' : finalStats.accuracy >= 75 ? 'text-amber-400' : 'text-rose-500'
                  }`}>{finalStats.accuracy}%</span>
                </div>
                <div className="bg-zinc-900/90 p-4 rounded-xl border border-zinc-800 text-center">
                  <span className="text-[10px] text-zinc-500 font-extrabold uppercase block tracking-wider">Avg Speed</span>
                  <span className="text-2xl font-black text-white block mt-1 font-mono">{finalStats.avgReactionTime}ms</span>
                </div>
                <div className="bg-zinc-900/90 p-4 rounded-xl border border-zinc-800 text-center">
                  <span className="text-[10px] text-zinc-500 font-extrabold uppercase block tracking-wider">Downtime</span>
                  <span className="text-2xl font-black text-amber-500 block mt-1 font-mono">{finalStats.totalDowntime}s</span>
                </div>
                <div className="bg-zinc-900/90 p-4 rounded-xl border border-zinc-800 text-center">
                  <span className="text-[10px] text-zinc-500 font-extrabold uppercase block tracking-wider">Perfect Hits</span>
                  <span className="text-2xl font-black text-violet-400 block mt-1 font-mono">{finalStats.perfectPressed}</span>
                </div>
              </div>

              {/* Details! Damage/Healing Meter Panel */}
              {(() => {
                const formatWoWNumber = (num: number): string => {
                  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
                  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
                  return num.toString();
                };

                const spellStats: Record<number, { id: number; name: string; count: number; value: number; color: string }> = {};
                let totalValue = 0;
                
                casts.forEach((c) => {
                  if (!["perfect", "early", "late"].includes(c.status)) return;
                  const spellId = c.actualSpellId || c.expectedSpellId;
                  if (!spellId) return;
                  
                  let name = "Unknown Spell";
                  let val = 0;
                  let color = "#a855f7";
                  
                  if (trainingMode === "healer") {
                    const hSpells = getHealerSpells(selectedClass, selectedSpec);
                    const hSpell = hSpells.find((s) => s.id === spellId);
                    if (hSpell) {
                      name = hSpell.name;
                      val = hSpell.healAmount * 15000;
                      color = hSpell.color;
                    }
                  } else {
                    const spell = getMappedSpell(spellId);
                    name = spell.name;
                    val = SPELL_DAMAGE_VALUES[spellId] || 150000;
                    color = spell.color;
                  }
                  
                  if (!spellStats[spellId]) {
                    spellStats[spellId] = { id: spellId, name, count: 0, value: 0, color };
                  }
                  spellStats[spellId].count += 1;
                  spellStats[spellId].value += val;
                  totalValue += val;
                });
                
                const sortedSpells = Object.values(spellStats).sort((a, b) => b.value - a.value);
                const psRate = totalValue / Math.max(1, selectedScenario.duration);

                return (
                  <div className="bg-zinc-950/95 border border-zinc-800 rounded-2xl overflow-hidden space-y-0.5 shadow-lg">
                    <div className="bg-zinc-900 px-4 py-2.5 flex justify-between items-center border-b border-zinc-800">
                      <span className="font-extrabold text-xs text-zinc-400 uppercase tracking-widest flex items-center space-x-1.5">
                        <span className="text-red-500 font-black">📊</span>
                        <span>Details!: {trainingMode === "healer" ? "Healing Done" : "Damage Done"}</span>
                      </span>
                      <span className="font-mono text-[10px] text-zinc-400 font-bold">
                        {trainingMode === "healer" ? `HPS: ${formatWoWNumber(psRate)}` : `DPS: ${formatWoWNumber(psRate)}`} • Total: {formatWoWNumber(totalValue)}
                      </span>
                    </div>
                    
                    <div className="p-4 space-y-1.5 max-h-60 overflow-y-auto">
                      {sortedSpells.length === 0 ? (
                        <div className="text-center py-6 text-xs text-zinc-500 font-bold">
                          No spells cast successfully during this simulation.
                        </div>
                      ) : (
                        sortedSpells.map((spell, idx) => {
                          const percent = totalValue > 0 ? (spell.value / totalValue) * 100 : 0;
                          return (
                            <div 
                              key={spell.id}
                              className="relative h-8 rounded-lg overflow-hidden flex items-center justify-between px-3 text-xs bg-zinc-900/90 border border-zinc-800 border-l-2"
                              style={{ borderLeftColor: spell.color }}
                            >
                              <div 
                                className="absolute left-0 top-0 bottom-0 opacity-15 transition-all duration-300"
                                style={{ 
                                  width: `${percent}%`, 
                                  backgroundColor: spell.color 
                                }}
                              />
                              
                              <div className="flex items-center space-x-2.5 z-10">
                                <span className="font-mono font-bold text-zinc-500 w-4">{idx + 1}.</span>
                                <div className="w-5 h-5 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                                  {!failedIcons[spell.id] ? (
                                    <img 
                                      src={getSpellIconUrl(spell.id)} 
                                      alt={spell.name}
                                      onError={() => setFailedIcons(prev => ({ ...prev, [spell.id]: true }))}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center scale-75" style={{ color: spell.color }}>
                                      {getSpellIconSVG(spell.name)}
                                    </div>
                                  )}
                                </div>
                                <span className="font-bold text-zinc-200">{spell.name}</span>
                                <span className="text-[10px] text-zinc-500 font-mono">({spell.count})</span>
                              </div>
                              
                              <div className="z-10 font-mono font-bold text-zinc-300 space-x-2 text-[10.5px]">
                                <span>{formatWoWNumber(spell.value)}</span>
                                <span className="text-zinc-500">({percent.toFixed(1)}%)</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Timeline Pace Chart */}
              {(() => {
                const duration = selectedScenario.duration;
                const pixelsPerSec = 80;
                const totalWidth = duration * pixelsPerSec;
                
                const optimalSteps = selectedScenario.steps || [];
                const playerCasts = casts || [];
                
                return (
                  <div className="bg-zinc-950/95 border border-zinc-800 rounded-2xl p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-xs text-zinc-400 uppercase tracking-widest">
                        Timeline Pacing Chart
                      </span>
                      <span className="text-[9px] text-zinc-500 font-mono">
                        Scroll horizontally to view details • 1s = 80px
                      </span>
                    </div>
                    
                    <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-zinc-950">
                      <div 
                        className="relative h-40" 
                        style={{ width: `${totalWidth}px` }}
                      >
                        {/* Time axis grid lines */}
                        {Array.from({ length: Math.ceil(duration) }).map((_, i) => (
                          <div 
                            key={i} 
                            className="absolute top-0 bottom-0 border-l border-zinc-900/60 flex flex-col justify-end pb-1"
                            style={{ left: `${i * pixelsPerSec}px` }}
                          >
                            <span className="font-mono text-[9px] text-zinc-650 pl-1">{i}s</span>
                          </div>
                        ))}
                        
                        {/* Timeline Center Divider Line */}
                        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-zinc-900 -translate-y-1/2" />
                        
                        {/* Optimal Simcraft Row (Upper Half) */}
                        <div className="absolute top-2 left-0 right-0 h-14 flex items-center">
                          <span className="absolute left-2 top-0 text-[9px] text-zinc-550 font-bold uppercase tracking-wider">
                            Optimal Simcraft
                          </span>
                          {optimalSteps.map((step, idx) => {
                            const spell = getMappedSpell(step.spellId);
                            const leftPos = step.time * pixelsPerSec;
                            return (
                              <div 
                                key={idx}
                                className="absolute flex flex-col items-center group"
                                style={{ left: `${leftPos}px`, transform: "translateX(-50%)" }}
                              >
                                <div className="w-7 h-7 rounded bg-zinc-900 border border-zinc-750 flex items-center justify-center relative shadow">
                                  {!failedIcons[spell.id] ? (
                                    <img 
                                      src={getSpellIconUrl(spell.id)} 
                                      alt={spell.name} 
                                      onError={() => setFailedIcons(prev => ({ ...prev, [spell.id]: true }))}
                                      className="w-full h-full rounded object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center scale-75" style={{ color: spell.color }}>
                                      {getSpellIconSVG(spell.name)}
                                    </div>
                                  )}
                                </div>
                                <span className="absolute -bottom-4 text-[7.5px] font-mono font-bold text-zinc-500">
                                  {step.time.toFixed(1)}s
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Player Casts Row (Lower Half) */}
                        <div className="absolute bottom-2 left-0 right-0 h-14 flex items-center">
                          <span className="absolute left-2 bottom-0 text-[9px] text-zinc-550 font-bold uppercase tracking-wider">
                            Player Casts
                          </span>
                          {playerCasts.map((cast, idx) => {
                            const spellId = cast.actualSpellId || cast.expectedSpellId;
                            if (!spellId && cast.status !== "missed") return null;
                            
                            const spell = spellId ? getMappedSpell(spellId) : null;
                            const leftPos = (cast.actualTime || cast.expectedTime) * pixelsPerSec;
                            
                            let statusBorder = "border-zinc-800";
                            if (cast.status === "perfect") {
                              statusBorder = "border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.35)]";
                            } else if (cast.status === "early" || cast.status === "late") {
                              statusBorder = "border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.35)]";
                            } else if (cast.status === "incorrect") {
                              statusBorder = "border-rose-600 shadow-[0_0_8px_rgba(220,38,38,0.35)]";
                            } else if (cast.status === "missed") {
                              statusBorder = "border-red-900 border-dashed bg-red-950/20";
                            }
                            
                            return (
                              <div 
                                key={idx}
                                className="absolute flex flex-col items-center"
                                style={{ left: `${leftPos}px`, transform: "translateX(-50%)" }}
                              >
                                <span className="absolute -top-4 text-[7.5px] font-mono font-bold text-zinc-500">
                                  {(cast.actualTime || cast.expectedTime).toFixed(1)}s
                                </span>
                                
                                <div className={`w-7 h-7 rounded border flex items-center justify-center relative shadow ${statusBorder}`}>
                                  {cast.status === "missed" ? (
                                    <span className="text-[9px] font-black text-rose-500">M</span>
                                  ) : spell ? (
                                    !failedIcons[spell.id] ? (
                                      <img 
                                        src={getSpellIconUrl(spell.id)} 
                                        alt={spell.name} 
                                        onError={() => setFailedIcons(prev => ({ ...prev, [spell.id]: true }))}
                                        className="w-full h-full rounded object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center scale-75" style={{ color: spell.color }}>
                                        {getSpellIconSVG(spell.name)}
                                      </div>
                                    )
                                  ) : (
                                    <span className="text-xs">❓</span>
                                  )}
                                  
                                  {/* Reaction time badge */}
                                  {cast.reactionTime !== null && (
                                    <span className="absolute -bottom-4 bg-zinc-950 border border-zinc-800 text-[7px] font-mono px-0.5 rounded font-black text-zinc-300">
                                      {cast.reactionTime}ms
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Coaching Feedback Notes */}
              <div className="bg-zinc-950/95 p-6 rounded-2xl border border-zinc-800 space-y-3 backdrop-blur-md">
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
                <div className="bg-zinc-900/90 p-4 rounded-xl border border-zinc-800 space-y-2 text-xs">
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
                <div className="bg-zinc-900/90 p-4 rounded-xl border border-zinc-800 space-y-2 text-xs">
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
                <div className="bg-zinc-950/95 p-6 rounded-2xl border border-amber-900/40 space-y-3 backdrop-blur-md">
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
        <div className="w-full flex flex-col items-center space-y-4 pt-4 border-t border-zinc-900">
          {renderCastBar()}
          {renderResourceHUD()}
          {gameState === "idle" && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setIsKeybindModeActive(!isKeybindModeActive)}
                className={`px-4 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                  isKeybindModeActive
                    ? "bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-500/20 animate-pulse"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {isKeybindModeActive ? "⚡ Binding Mode Active (Press Key on Hovered Slot)" : "⌨️ Quick Keybind Mode"}
              </button>
            </div>
          )}
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
                const isHoveredInBindMode = isKeybindModeActive && hoveredSpellId === spell.id;
                return (
                  <div
                    key={spell.id}
                    onMouseEnter={() => setHoveredSpellId(spell.id)}
                    onMouseLeave={() => setHoveredSpellId(null)}
                    className={`w-16 h-16 rounded-xl bg-zinc-900 border flex flex-col items-center justify-center relative select-none transition-all ${
                      pressedKeys[keybind] ? "key-pressed-visual scale-95" : ""
                    } ${
                      isHoveredInBindMode
                        ? "border-amber-400 shadow-[0_0_15px_#fbbf24] scale-102 cursor-pointer bg-zinc-800"
                        : isSpellActive
                        ? isGuidedMode || selectedScenario.isProcReaction
                          ? "proc-highlight border-emerald-500/80 scale-105"
                          : "spell-highlight border-violet-500/80 scale-105"
                        : "border-zinc-850 hover:border-zinc-750 opacity-90"
                    }`}
                    style={{
                      boxShadow: isHoveredInBindMode
                        ? "0 0 15px #fbbf24"
                        : isSpellActive
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
                        {formatKeybind(keybind)}
                      </span>
                    ) : (
                      <span className="absolute -top-1.5 -right-1.5 z-10 px-1.5 py-0.5 rounded-md font-mono text-[8px] font-black border bg-red-950/90 border-red-800 text-red-400 shadow-sm">
                        UNBOUND
                      </span>
                    )}

                    {/* Cooldown Overlay & Text */}
                    {remainingCd > 0 ? (
                      <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center pointer-events-none select-none z-20 overflow-hidden">
                        {/* Cooldown clock sweep background */}
                        <div
                          className="absolute inset-0 z-10"
                          style={{
                            background: `conic-gradient(rgba(0, 0, 0, 0.75) ${getCooldownPercent(coreSpell.id, remainingCd)}%, rgba(0, 0, 0, 0.25) ${getCooldownPercent(coreSpell.id, remainingCd)}%)`,
                            transform: 'rotate(-90deg)',
                            borderRadius: 'inherit',
                          }}
                        />
                        {/* Numeric CD text */}
                        <span className="font-mono text-base font-black text-amber-400 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.85)] z-20">
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
                    {formatKeybind(k)}
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
