// Computer-Controlled Bowling AI Engine
// Match-aware tactical delivery selection, bowling profiles, sequence building, and difficulty tuning
// Zero hidden cheats — strictly modifies physical parameters within fair cricket limits

export const BOWLING_PROFILES = {
  FAST_BOWLER: {
    id: 'FAST_BOWLER',
    name: 'Express Fast',
    baseSpeed: 144,
    speedRange: [136, 154],
    preferredLengths: ['GOOD', 'SHORT', 'YORKER', 'BOUNCER'],
    swingCapability: 0.18,
    spinCapability: 0,
    tactics: 'Aggressive pace, bouncer shock balls, yorkers in death overs'
  },
  SWING_BOWLER: {
    id: 'SWING_BOWLER',
    name: 'Swing Maestro',
    baseSpeed: 132,
    speedRange: [124, 138],
    preferredLengths: ['FULL', 'GOOD', 'GOOD', 'YORKER'],
    swingCapability: 0.48, // Pronounced late curve in the air
    spinCapability: 0,
    tactics: 'Probing 4th-stump channel, drawing false strokes and outside edges'
  },
  SPIN_BOWLER: {
    id: 'SPIN_BOWLER',
    name: 'Crafty Spinner',
    baseSpeed: 94,
    speedRange: [84, 102],
    preferredLengths: ['FULL', 'GOOD', 'GOOD', 'SHORT'],
    swingCapability: 0.08,
    spinCapability: 0.55, // Sharp drift and lateral turn off pitch
    tactics: 'Flighted loop, tempting lofted strokes into waiting deep fielders'
  },
  DEFENSIVE_BOWLER: {
    id: 'DEFENSIVE_BOWLER',
    name: 'Disciplined Seamer',
    baseSpeed: 128,
    speedRange: [122, 134],
    preferredLengths: ['GOOD', 'GOOD', 'FULL'],
    swingCapability: 0.15,
    spinCapability: 0,
    tactics: 'Stump-to-stump accuracy, choking scoring, drying up boundary boundaries'
  }
};

export class BowlingAI {
  constructor() {
    this.history = []; // last deliveries and shot outcomes
    this.batterTendencies = {
      loftedCount: 0,
      defensiveCount: 0,
      driveCount: 0,
      pullCount: 0,
      cutCount: 0
    };
  }

  // Clean reset of memory between innings or matches
  reset() {
    this.history = [];
    this.batterTendencies = {
      loftedCount: 0,
      defensiveCount: 0,
      driveCount: 0,
      pullCount: 0,
      cutCount: 0
    };
  }

  recordDeliveryOutcome(delivery, outcome, shotUsed) {
    this.history.push({ delivery, outcome, shotUsed });
    if (this.history.length > 12) this.history.shift();

    if (shotUsed) {
      if (shotUsed === 'LOFTED_ATTACK') this.batterTendencies.loftedCount++;
      else if (shotUsed === 'DEFENSIVE') this.batterTendencies.defensiveCount++;
      else if (shotUsed === 'STRAIGHT_DRIVE' || shotUsed === 'COVER_DRIVE') this.batterTendencies.driveCount++;
      else if (shotUsed === 'PULL_SHOT') this.batterTendencies.pullCount++;
      else if (shotUsed === 'CUT_SHOT') this.batterTendencies.cutCount++;
    }
  }

  // Determine bowler profile based on active bowler index or match role
  getBowlerProfile(bowlerIndex = 9) {
    if (bowlerIndex === 9) return BOWLING_PROFILES.FAST_BOWLER;
    if (bowlerIndex === 8) return BOWLING_PROFILES.SWING_BOWLER;
    if (bowlerIndex === 10) return BOWLING_PROFILES.SPIN_BOWLER;
    return BOWLING_PROFILES.DEFENSIVE_BOWLER;
  }

  // Select strategic delivery based on profile, match situation, and difficulty
  selectDelivery({
    bowlerIndex = 9,
    difficulty = 'MEDIUM',
    matchSituation = {}
  }) {
    const profile = this.getBowlerProfile(bowlerIndex);
    const {
      runs = 0,
      wickets = 0,
      overs = 0,
      ballsInOver = 0,
      totalOvers = 2,
      currentInnings = 1,
      target = null,
      strikerIndex = 0,
      strikerRuns = 0,
      strikerBalls = 0,
      thisOverBalls = [],
      requiredRunRate = null,
      currentRunRate = null
    } = matchSituation;

    // 1. Difficulty Configuration
    let accuracy = 0.85; // 0 (wild) to 1.0 (pinpoint)
    let strategicWeight = 0.70; // Probability AI counters situation vs natural variation
    let lineSpread = 0.22; // In meters

    if (difficulty === 'EASY') {
      accuracy = 0.65;
      strategicWeight = 0.35;
      lineSpread = 0.40;
    } else if (difficulty === 'HARD') {
      accuracy = 0.98;
      strategicWeight = 1.0;
      lineSpread = 0.12;
    }

    // 2. Tactical Context Extraction
    let chosenLength = 'GOOD';
    let chosenLine = 0.0; // 0 = middle stump, -0.35 = outside off, +0.3 = leg stump
    let tacticalNote = 'Attacking stumps';
    let tacticType = 'STANDARD_TACTIC';
    let isSlowerBall = false;
    let isFlighted = false;

    const isDeathOvers = overs >= Math.max(1, totalOvers - 1);
    const lastEvent = this.history.length > 0 ? this.history[this.history.length - 1] : null;
    const isLastBoundary = lastEvent && (lastEvent.outcome?.outcome === 'SIX' || lastEvent.outcome?.outcome === 'FOUR');

    // Count consecutive dots in current over or history
    let consecutiveDots = 0;
    if (Array.isArray(thisOverBalls) && thisOverBalls.length > 0) {
      for (let i = thisOverBalls.length - 1; i >= 0; i--) {
        if (thisOverBalls[i] === '0' || thisOverBalls[i] === 'DOT') consecutiveDots++;
        else break;
      }
    } else if (this.history.length > 0) {
      for (let i = this.history.length - 1; i >= 0; i--) {
        const out = this.history[i]?.outcome?.outcome;
        if (out === 'DOT' || this.history[i]?.outcome?.runs === 0) consecutiveDots++;
        else break;
      }
    }

    const isChasing = currentInnings === 2 && target !== null;
    const runsNeeded = isChasing ? Math.max(0, target - runs) : null;
    const numRRR = typeof requiredRunRate === 'string' ? parseFloat(requiredRunRate) : (typeof requiredRunRate === 'number' ? requiredRunRate : null);
    const isHighPressureChase = isChasing && (
      (numRRR !== null && numRRR >= 9.0) ||
      (runsNeeded !== null && runsNeeded <= 20 && isDeathOvers) ||
      (runsNeeded !== null && runsNeeded < 18)
    );

    const isTailender = typeof strikerIndex === 'number' && strikerIndex >= 8;
    const isNewBatter = typeof strikerBalls === 'number' && strikerBalls <= 2 && (wickets > 0 || overs > 0);

    // Batter aggression: lofted tendencies or boundary hit on last ball
    const batterIsAggressive = this.batterTendencies.loftedCount >= 2 || isLastBoundary;

    // 3. Strategic Decision Tree
    if (Math.random() < strategicWeight) {
      if (batterIsAggressive) {
        // --- PRIORITY 1: Counter Batter Aggression ---
        tacticType = 'COUNTER_AGGRESSION';
        tacticalNote = 'Defending boundary'; // Strict exact string for backwards compatibility

        if (profile.id === 'FAST_BOWLER') {
          chosenLength = Math.random() > 0.45 ? 'YORKER' : 'BOUNCER';
          chosenLine = Math.random() > 0.5 ? -0.32 : -0.15;
        } else if (profile.id === 'SPIN_BOWLER') {
          chosenLength = 'SHORT'; // Pull length back
          chosenLine = -0.38; // Flight wide outside off
          isFlighted = false;
        } else {
          chosenLength = 'YORKER';
          chosenLine = -0.25;
        }
      } else if (isHighPressureChase || (isDeathOvers && !isTailender)) {
        // --- PRIORITY 2: Death Overs & Tight Chase Boundary Containment ---
        tacticType = 'DEATH_CONTAINMENT';
        tacticalNote = 'Death overs — boundary containment';

        if (profile.id === 'FAST_BOWLER') {
          const deathRoll = Math.random();
          if (deathRoll < 0.60) {
            // Pinpoint yorker or wide yorker outside off
            chosenLength = 'YORKER';
            chosenLine = Math.random() > 0.45 ? -0.28 : 0.0;
          } else if (deathRoll < 0.85) {
            // Slower ball cutter wide of off stump
            chosenLength = 'GOOD';
            chosenLine = -0.26;
            isSlowerBall = true;
          } else {
            // Heavy bouncer cramped for room
            chosenLength = 'BOUNCER';
            chosenLine = 0.12;
          }
        } else if (profile.id === 'SWING_BOWLER') {
          chosenLength = 'YORKER';
          chosenLine = -0.22;
        } else if (profile.id === 'SPIN_BOWLER') {
          chosenLength = 'SHORT';
          chosenLine = -0.32;
        } else {
          chosenLength = 'YORKER';
          chosenLine = -0.05;
        }
      } else if (isTailender) {
        // --- PRIORITY 3: Tailender Attack (Stumps & Body) ---
        tacticType = 'TAILENDER_ATTACK';
        tacticalNote = 'Attacking tailender stumps';

        if (profile.id === 'FAST_BOWLER') {
          chosenLength = Math.random() > 0.4 ? 'YORKER' : 'BOUNCER';
          chosenLine = Math.random() > 0.35 ? 0.0 : 0.08; // Target middle stump directly
        } else if (profile.id === 'SPIN_BOWLER') {
          chosenLength = 'FULL';
          chosenLine = 0.0;
        } else {
          chosenLength = 'FULL';
          chosenLine = -0.05;
        }
      } else if (consecutiveDots >= 2) {
        // --- PRIORITY 4: Dot-Ball Pressure Trap ---
        tacticType = 'DOT_PRESSURE_TRAP';
        tacticalNote = 'Pressure trap — enticing false stroke';

        if (profile.id === 'FAST_BOWLER' || profile.id === 'SWING_BOWLER') {
          // Corridor of uncertainty on 4th stump with away-swing
          chosenLength = 'GOOD';
          chosenLine = -0.24;
        } else if (profile.id === 'SPIN_BOWLER') {
          // Slower tossed up bait outside off
          chosenLength = 'FULL';
          chosenLine = -0.28;
          isFlighted = true;
        } else {
          chosenLength = 'GOOD';
          chosenLine = 0.0;
        }
      } else if (this.batterTendencies.cutCount >= 2) {
        // --- PRIORITY 5: Batter Tendency Counters ---
        tacticType = 'CRAMP_CUTTER';
        tacticalNote = 'Cramping batter for room';
        chosenLength = 'GOOD';
        chosenLine = 0.22; // In to middle/leg stump
      } else if (this.batterTendencies.pullCount >= 2) {
        tacticType = 'COUNTER_PULL';
        tacticalNote = 'Full pitch counter to pull';
        chosenLength = Math.random() > 0.5 ? 'FULL' : 'YORKER';
        chosenLine = -0.30;
      } else if (this.batterTendencies.driveCount >= 2) {
        tacticType = 'COUNTER_DRIVE';
        tacticalNote = 'Short pitch counter to drive';
        chosenLength = 'SHORT';
        chosenLine = -0.34;
      } else if (this.batterTendencies.defensiveCount >= 3) {
        tacticType = 'ATTACK_BLOCKER';
        tacticalNote = 'Attacking stumps of defensive batsman';
        chosenLength = 'FULL';
        chosenLine = 0.0;
      } else if (isNewBatter) {
        // --- PRIORITY 6: Probing New Batter ---
        tacticType = 'CORRIDOR_PROBE';
        tacticalNote = 'Probing corridor of uncertainty';
        chosenLength = 'GOOD';
        chosenLine = -0.18;
      } else {
        // --- PRIORITY 7: Profile Preferred Tactic with Anti-Monotony Guard ---
        tacticType = 'STANDARD_TACTIC';
        tacticalNote = 'Attacking stumps';
        const lenChoices = profile.preferredLengths;
        chosenLength = lenChoices[Math.floor(Math.random() * lenChoices.length)];

        // Anti-repetition: if last delivery in history had the exact same length, try to vary
        if (lastEvent && lastEvent.delivery?.lengthType === chosenLength && lenChoices.length > 1) {
          const alternateChoices = lenChoices.filter(l => l !== chosenLength);
          if (alternateChoices.length > 0) {
            chosenLength = alternateChoices[Math.floor(Math.random() * alternateChoices.length)];
          }
        }
        chosenLine = (Math.random() - 0.5) * 0.35;
      }
    } else {
      // Natural Variation
      tacticType = 'NATURAL_VARIATION';
      tacticalNote = 'Natural profile variation';
      const lenChoices = profile.preferredLengths;
      chosenLength = lenChoices[Math.floor(Math.random() * lenChoices.length)];
      chosenLine = (Math.random() - 0.5) * 0.45;
    }

    // 4. Speed Calculation & Disguised Pace Variation
    const [minSpd, maxSpd] = profile.speedRange;
    let baseSpeed = minSpd + Math.random() * (maxSpd - minSpd);

    if (isSlowerBall && (profile.id === 'FAST_BOWLER' || profile.id === 'SWING_BOWLER')) {
      // Realistic change-of-pace drop (off-cutter / knuckle ball)
      baseSpeed = Math.max(116, minSpd - 18 + Math.random() * 6);
    } else if (profile.id === 'SPIN_BOWLER') {
      if (isFlighted) {
        baseSpeed = minSpd + Math.random() * 4; // Slow looped flight (84-88 km/h)
      } else if (tacticType === 'COUNTER_AGGRESSION') {
        baseSpeed = maxSpd - Math.random() * 4; // Flatter dart (98-102 km/h)
      }
    } else {
      if (difficulty === 'EASY') {
        // Scale within lower 60% of speed bracket
        baseSpeed = minSpd + Math.random() * (maxSpd - minSpd) * 0.6;
        baseSpeed = Math.max(minSpd, baseSpeed - 8);
      } else if (difficulty === 'HARD') {
        // Scale within upper bracket
        baseSpeed = minSpd + (maxSpd - minSpd) * 0.4 + Math.random() * (maxSpd - minSpd) * 0.6;
        baseSpeed = Math.min(maxSpd, baseSpeed + 4);
      }
    }

    // 5. Accuracy Noise (Realistic human execution error)
    const deviationFactor = (1.0 - accuracy);
    const actualLine = chosenLine + (Math.random() - 0.5) * lineSpread * deviationFactor;

    // 6. Swing & Spin Calculation
    let swingVal = 0;
    if (profile.id === 'SPIN_BOWLER' || profile.spinCapability > profile.swingCapability) {
      // Crafty Spinner: sharp lateral drift and turn
      const turnSign = Math.random() > 0.5 ? 1 : -1;
      const flightBonus = isFlighted ? 1.3 : 1.0;
      swingVal = turnSign * profile.spinCapability * 0.5 * flightBonus;
    } else if (profile.swingCapability > 0) {
      // Swing Bowler / Fast Bowler seam
      const swingSign = (tacticType === 'DOT_PRESSURE_TRAP' || tacticType === 'CORRIDOR_PROBE')
        ? -1 // Outswing away from batsman towards slip
        : (Math.random() > 0.5 ? 1 : -1);
      swingVal = swingSign * profile.swingCapability * (0.6 + Math.random() * 0.4);
    }

    // Anti-monotony guarantee: prevent bowling 3 consecutive deliveries of the exact same length
    if (this.history.length >= 2) {
      const prev1 = this.history[this.history.length - 1]?.delivery?.lengthType;
      const prev2 = this.history[this.history.length - 2]?.delivery?.lengthType;
      if (prev1 && prev1 === prev2 && chosenLength === prev1) {
        const alternates = profile.preferredLengths.filter(l => l !== chosenLength);
        if (alternates.length > 0) {
          chosenLength = alternates[Math.floor(Math.random() * alternates.length)];
        } else {
          chosenLength = chosenLength === 'SHORT' ? 'GOOD' : 'SHORT';
        }
      }
    }

    // Enforce strictly valid cricket lengths supported by game physics
    const validLengths = ['YORKER', 'FULL', 'GOOD', 'SHORT', 'BOUNCER'];
    if (!validLengths.includes(chosenLength)) {
      chosenLength = 'GOOD';
    }

    return {
      profileId: profile.id,
      profileName: profile.name,
      speedKmph: Math.round(baseSpeed),
      lengthType: chosenLength,
      lineOffset: parseFloat(actualLine.toFixed(2)),
      swing: parseFloat(swingVal.toFixed(2)),
      bowlingType: profile.name,
      tacticalNote: batterIsAggressive ? 'Defending boundary' : tacticalNote,
      tacticType,
      isSlowerBall
    };
  }
}
