// Computer-Controlled Bowling AI Engine
// Realistic tactical delivery selection, bowling profiles, and difficulty tuning
// Zero hidden cheats — strictly modifies physical parameters within fair limits

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
    const { runs, wickets, overs, totalOvers, currentInnings, target } = matchSituation;

    // 1. Difficulty Configuration
    let accuracy = 0.85; // 0 (wild) to 1.0 (pinpoint)
    let strategicWeight = 0.7; // How smartly AI counters batter
    let lineSpread = 0.22; // In meters

    if (difficulty === 'EASY') {
      accuracy = 0.65;
      strategicWeight = 0.35;
      lineSpread = 0.42;
    } else if (difficulty === 'HARD') {
      accuracy = 0.96;
      strategicWeight = 0.95;
      lineSpread = 0.12;
    }

    // 2. Tactical Decision Making based on match context
    let chosenLength = 'GOOD';
    let chosenLine = 0.0; // 0 = middle stump, -0.35 = outside off, +0.3 = leg stump
    const isDeathOvers = overs >= Math.max(1, totalOvers - 1);
    const lastEvent = this.history.length > 0 ? this.history[this.history.length - 1] : null;

    // Counter batter aggression
    const batterIsAggressive = this.batterTendencies.loftedCount >= 2 || (lastEvent && (lastEvent.outcome.outcome === 'SIX' || lastEvent.outcome.outcome === 'FOUR'));

    if (Math.random() < strategicWeight) {
      if (batterIsAggressive) {
        // Counter high-launch lofting: bowl wide outside off yorker or surprise bouncer
        if (profile.id === 'FAST_BOWLER') {
          chosenLength = Math.random() > 0.45 ? 'YORKER' : 'BOUNCER';
          chosenLine = Math.random() > 0.5 ? -0.32 : -0.15; // wide of off stump
        } else if (profile.id === 'SPIN_BOWLER') {
          chosenLength = 'SHORT'; // pull length back
          chosenLine = -0.38; // flight wide outside off
        } else {
          chosenLength = 'YORKER';
          chosenLine = -0.25;
        }
      } else if (isDeathOvers && currentInnings === 2 && target && (target - runs) < 18) {
        // Pressure situation: bowl yorkers on stumps or tight good length
        chosenLength = Math.random() > 0.35 ? 'YORKER' : 'GOOD';
        chosenLine = 0.0; // target the base of stumps
      } else if (this.batterTendencies.cutCount > 2) {
        // Batter loves cutting: cramp them for room on middle and leg stump
        chosenLength = 'GOOD';
        chosenLine = 0.22;
      } else if (this.batterTendencies.driveCount > 2) {
        // Batter loves driving: vary length to short or throw wide enticing bait
        chosenLength = 'SHORT';
        chosenLine = -0.35;
      } else {
        // Standard tactical delivery from preferred profile lengths
        const lenChoices = profile.preferredLengths;
        chosenLength = lenChoices[Math.floor(Math.random() * lenChoices.length)];
        chosenLine = (Math.random() - 0.5) * 0.4;
      }
    } else {
      // Unpredictable natural variation
      const lenChoices = profile.preferredLengths;
      chosenLength = lenChoices[Math.floor(Math.random() * lenChoices.length)];
      chosenLine = (Math.random() - 0.5) * 0.5;
    }

    // 3. Speed calculation
    const [minSpd, maxSpd] = profile.speedRange;
    let baseSpeed = minSpd + Math.random() * (maxSpd - minSpd);
    if (difficulty === 'EASY') baseSpeed = Math.max(minSpd, baseSpeed - 8);
    else if (difficulty === 'HARD') baseSpeed = Math.min(maxSpd, baseSpeed + 4);

    // 4. Accuracy Noise (Realistic human deviation)
    const deviationFactor = (1.0 - accuracy);
    const actualLine = chosenLine + (Math.random() - 0.5) * lineSpread * deviationFactor;

    // 5. Swing or Spin calculation
    let swingVal = 0;
    if (profile.swingCapability > 0) {
      // Inswing (positive) or Outswing (negative)
      const swingSign = Math.random() > 0.5 ? 1 : -1;
      swingVal = swingSign * profile.swingCapability * (0.6 + Math.random() * 0.4);
    } else if (profile.spinCapability > 0) {
      const turnSign = Math.random() > 0.5 ? 1 : -1;
      swingVal = turnSign * profile.spinCapability * 0.5;
    }

    return {
      profileId: profile.id,
      profileName: profile.name,
      speedKmph: Math.round(baseSpeed),
      lengthType: chosenLength,
      lineOffset: parseFloat(actualLine.toFixed(2)),
      swing: parseFloat(swingVal.toFixed(2)),
      bowlingType: profile.name,
      tacticalNote: batterIsAggressive ? 'Defending boundary' : 'Attacking stumps'
    };
  }
}
