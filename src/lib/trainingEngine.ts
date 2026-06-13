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
}

// Predefined WoW spells for Demon Hunter
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
};

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
  totalDowntime: number
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
  };
}
