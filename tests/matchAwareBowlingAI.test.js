import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BowlingAI, BOWLING_PROFILES } from '../src/ai/bowlingAI.js';
import { GameState, GAME_STATES } from '../src/gameState.js';

describe('Phase 13.5: AI Decision-Making & Cricket Match Realism Test Suite', () => {
  it('1. Death overs & tight chase containment: AI selects yorkers and boundary-saving lines under RRR pressure', () => {
    const ai = new BowlingAI();

    // Deterministic single-call check with controlled random
    const origRandom = Math.random;
    try {
      Math.random = () => 0.1; // Passes strategic check and selects yorker
      const delivery = ai.selectDelivery({
        bowlerIndex: 9,
        difficulty: 'HARD',
        matchSituation: {
          runs: 35,
          wickets: 2,
          overs: 1,
          totalOvers: 2,
          currentInnings: 2,
          target: 50,
          requiredRunRate: '15.00'
        }
      });

      assert.strictEqual(delivery.tacticType, 'DEATH_CONTAINMENT');
      assert.strictEqual(delivery.tacticalNote, 'Death overs — boundary containment');
      assert.strictEqual(delivery.lengthType, 'YORKER');
    } finally {
      Math.random = origRandom;
    }

    // Statistical check across trials
    let deathTacticCount = 0;
    let yorkerOrSlowerCount = 0;
    const trials = 30;

    for (let i = 0; i < trials; i++) {
      const delivery = ai.selectDelivery({
        bowlerIndex: 9,
        difficulty: 'HARD',
        matchSituation: {
          runs: 35,
          wickets: 2,
          overs: 1,
          totalOvers: 2,
          currentInnings: 2,
          target: 50,
          requiredRunRate: '15.00'
        }
      });

      if (delivery.tacticType === 'DEATH_CONTAINMENT') {
        deathTacticCount++;
        assert.ok(['YORKER', 'BOUNCER', 'GOOD'].includes(delivery.lengthType));
      }

      if (delivery.lengthType === 'YORKER' || delivery.isSlowerBall) {
        yorkerOrSlowerCount++;
      }
    }

    assert.ok(deathTacticCount >= 26, `Expected at least 26/30 trials to trigger death containment, got ${deathTacticCount}`);
    assert.ok(yorkerOrSlowerCount >= 16, 'Significant majority of death deliveries should be yorkers or slower balls');
  });

  it('2. Dot-ball pressure trap: consecutive dots trigger 4th-stump corridor bait or flighted variation', () => {
    const ai = new BowlingAI();

    const origRandom = Math.random;
    try {
      Math.random = () => 0.1;
      const delivery = ai.selectDelivery({
        bowlerIndex: 9,
        difficulty: 'HARD',
        matchSituation: {
          runs: 10,
          wickets: 0,
          overs: 0,
          ballsInOver: 3,
          totalOvers: 2,
          currentInnings: 1,
          thisOverBalls: ['0', '0', '0']
        }
      });

      assert.strictEqual(delivery.tacticType, 'DOT_PRESSURE_TRAP');
      assert.strictEqual(delivery.tacticalNote, 'Pressure trap — enticing false stroke');
      assert.strictEqual(delivery.lengthType, 'GOOD');
      assert.ok(delivery.lineOffset < -0.15, 'Line should probe 4th-stump channel outside off');
      assert.ok(delivery.swing < 0, 'Should swing away from right-handed batsman towards slip');
    } finally {
      Math.random = origRandom;
    }
  });

  it('3. Tailender targeting: Bowler attacks stumps and ribcage with fast yorkers or bouncers', () => {
    const ai = new BowlingAI();

    const origRandom = Math.random;
    try {
      Math.random = () => 0.1;
      const delivery = ai.selectDelivery({
        bowlerIndex: 9,
        difficulty: 'HARD',
        matchSituation: {
          runs: 28,
          wickets: 6,
          overs: 1,
          totalOvers: 2,
          currentInnings: 1,
          strikerIndex: 9
        }
      });

      assert.strictEqual(delivery.tacticType, 'TAILENDER_ATTACK');
      assert.strictEqual(delivery.tacticalNote, 'Attacking tailender stumps');
      assert.ok(['YORKER', 'BOUNCER'].includes(delivery.lengthType));
      assert.ok(delivery.speedKmph >= 136, 'Should bowl with full pace against tailender');
    } finally {
      Math.random = origRandom;
    }
  });

  it('4. Countering specific batter tendencies: cut, pull, and drive habits alter delivery tactics', () => {
    const ai = new BowlingAI();

    const origRandom = Math.random;
    try {
      Math.random = () => 0.1;

      // Scenario A: Batter loves pulling short balls (pullCount = 3)
      ai.batterTendencies.pullCount = 3;
      const pullCounter = ai.selectDelivery({
        bowlerIndex: 9,
        difficulty: 'HARD',
        matchSituation: { runs: 15, wickets: 1, overs: 0, totalOvers: 2, currentInnings: 1 }
      });
      assert.strictEqual(pullCounter.tacticType, 'COUNTER_PULL');
      assert.ok(['FULL', 'YORKER'].includes(pullCounter.lengthType), 'Must pitch up against pullers, refusing short balls');
      assert.ok(pullCounter.lineOffset < -0.20, 'Must bowl wide outside off stump');

      // Scenario B: Batter loves square cuts (cutCount = 3)
      ai.reset();
      ai.batterTendencies.cutCount = 3;
      const cutCounter = ai.selectDelivery({
        bowlerIndex: 9,
        difficulty: 'HARD',
        matchSituation: { runs: 15, wickets: 1, overs: 0, totalOvers: 2, currentInnings: 1 }
      });
      assert.strictEqual(cutCounter.tacticType, 'CRAMP_CUTTER');
      assert.ok(cutCounter.lineOffset > 0.15, 'Must cramp cutter on middle/leg stump');

      // Scenario C: Batter drives on the front foot (driveCount = 3)
      ai.reset();
      ai.batterTendencies.driveCount = 3;
      const driveCounter = ai.selectDelivery({
        bowlerIndex: 9,
        difficulty: 'HARD',
        matchSituation: { runs: 15, wickets: 1, overs: 0, totalOvers: 2, currentInnings: 1 }
      });
      assert.strictEqual(driveCounter.tacticType, 'COUNTER_DRIVE');
      assert.strictEqual(driveCounter.lengthType, 'SHORT', 'Must pull length back against front-foot driver');
    } finally {
      Math.random = origRandom;
    }
  });

  it('5. Repetition prevention: AI avoids bowling the same length three times consecutively', () => {
    const ai = new BowlingAI();

    // Record two consecutive SHORT deliveries in history
    ai.recordDeliveryOutcome({ deliveryId: 'd1', lengthType: 'SHORT' }, { outcome: 'RUNS', runs: 1 }, 'PULL_SHOT');
    ai.recordDeliveryOutcome({ deliveryId: 'd2', lengthType: 'SHORT' }, { outcome: 'RUNS', runs: 1 }, 'PULL_SHOT');

    // Next delivery under standard match conditions
    const delivery = ai.selectDelivery({
      bowlerIndex: 9,
      difficulty: 'HARD',
      matchSituation: { runs: 10, wickets: 0, overs: 0, totalOvers: 2, currentInnings: 1 }
    });

    // Should vary away from repeating the third consecutive SHORT ball
    assert.notStrictEqual(delivery.lengthType, 'SHORT', 'Should not repeat SHORT length three times consecutively');
    assert.ok(['GOOD', 'YORKER', 'BOUNCER', 'FULL'].includes(delivery.lengthType));
  });

  it('6. Spin bowler craft: Crafty Spinner utilizes lateral turn, flighted loop, and drift', () => {
    const ai = new BowlingAI();

    const origRandom = Math.random;
    try {
      Math.random = () => 0.1;
      const delivery = ai.selectDelivery({
        bowlerIndex: 10, // Spin bowler
        difficulty: 'HARD',
        matchSituation: {
          runs: 12,
          wickets: 0,
          overs: 0,
          ballsInOver: 2,
          totalOvers: 2,
          currentInnings: 1,
          thisOverBalls: ['0', '0']
        }
      });

      assert.strictEqual(delivery.profileId, 'SPIN_BOWLER');
      assert.strictEqual(delivery.tacticType, 'DOT_PRESSURE_TRAP');
      assert.ok(delivery.speedKmph <= 92, 'Flighted bait delivery should be slow and looped');
      assert.ok(Math.abs(delivery.swing) >= 0.20, 'Spin bowler must exhibit legitimate lateral drift/turn');
    } finally {
      Math.random = origRandom;
    }
  });

  it('7. Disguised slower ball variation: Fast bowler drops pace cleanly below baseline', () => {
    const ai = new BowlingAI();

    const origRandom = Math.random;
    try {
      // Roll 0.1 for strategicWeight (< 0.95), then 0.70 for deathRoll (between 0.60 and 0.85)
      let callCount = 0;
      Math.random = () => {
        callCount++;
        if (callCount === 1) return 0.1; // strategic check
        if (callCount === 2) return 0.70; // deathRoll: slower ball branch
        return 0.5;
      };

      const delivery = ai.selectDelivery({
        bowlerIndex: 9,
        difficulty: 'HARD',
        matchSituation: {
          runs: 35,
          wickets: 2,
          overs: 1,
          totalOvers: 2,
          currentInnings: 2,
          target: 45
        }
      });

      assert.strictEqual(delivery.isSlowerBall, true);
      assert.strictEqual(delivery.lengthType, 'GOOD');
      assert.ok(delivery.speedKmph <= 126, `Slower ball speed (${delivery.speedKmph}) must be well below express pace`);
      assert.ok(delivery.speedKmph >= 116, `Slower ball speed (${delivery.speedKmph}) must remain physically reasonable`);
    } finally {
      Math.random = origRandom;
    }
  });

  it('8. Innings reset & clean state isolation: GameState.resetInnings clears AI memory cleanly', () => {
    const gameState = new GameState();
    gameState.initMatch(0, 1, 2);

    // Build tendencies
    gameState.bowlingAI.batterTendencies.loftedCount = 4;
    gameState.bowlingAI.history.push({ delivery: { lengthType: 'SHORT' }, outcome: { outcome: 'SIX' } });

    assert.strictEqual(gameState.bowlingAI.batterTendencies.loftedCount, 4);
    assert.strictEqual(gameState.bowlingAI.history.length, 1);

    // Reset innings
    gameState.resetInnings();

    assert.strictEqual(gameState.bowlingAI.batterTendencies.loftedCount, 0);
    assert.strictEqual(gameState.bowlingAI.history.length, 0);
  });
});
