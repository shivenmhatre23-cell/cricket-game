import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CricketRulesEngine, OUTCOME_TYPES, DISMISSAL_TYPES } from '../src/rules/cricketRules.js';
import { TEAMS } from '../src/gameState.js';

describe('Cricket Rules Engine Test Suite', () => {
  const sampleTeam1 = TEAMS[0]; // India
  const sampleTeam2 = TEAMS[1]; // Australia

  it('1. Legal Deliveries: dots, singles, fours, sixes update batter and bowler stats', () => {
    const engine = new CricketRulesEngine({ totalOvers: 2, team1: sampleTeam1, team2: sampleTeam2 });

    // Ball 1: Dot ball
    let res = engine.processDelivery({ deliveryId: 'b1', outcome: OUTCOME_TYPES.DOT, runs: 0 });
    assert.strictEqual(res.success, true);
    assert.strictEqual(engine.runs, 0);
    assert.strictEqual(engine.totalLegalBalls, 1);
    assert.strictEqual(engine.getStriker().balls, 1);
    assert.strictEqual(engine.getStriker().runs, 0);

    // Ball 2: Single (rotate strike)
    const strikerBefore = engine.strikerIndex;
    res = engine.processDelivery({ deliveryId: 'b2', outcome: OUTCOME_TYPES.RUNS, runs: 1 });
    assert.strictEqual(engine.runs, 1);
    assert.strictEqual(engine.totalLegalBalls, 2);
    assert.notStrictEqual(engine.strikerIndex, strikerBefore); // strike rotated

    // Ball 3: Boundary Four
    res = engine.processDelivery({ deliveryId: 'b3', outcome: OUTCOME_TYPES.FOUR, runs: 4 });
    assert.strictEqual(engine.runs, 5);
    assert.strictEqual(engine.getStriker().fours, 1);

    // Ball 4: Maximum Six
    res = engine.processDelivery({ deliveryId: 'b4', outcome: OUTCOME_TYPES.SIX, runs: 6 });
    assert.strictEqual(engine.runs, 11);
    assert.strictEqual(engine.getStriker().sixes, 1);
  });

  it('2. Extras: Wide ball awards 1 run, does NOT count as legal ball or batter ball', () => {
    const engine = new CricketRulesEngine({ totalOvers: 2, team1: sampleTeam1, team2: sampleTeam2 });

    const strikerBallsBefore = engine.getStriker().balls;
    const legalBallsBefore = engine.totalLegalBalls;

    const res = engine.processDelivery({ deliveryId: 'wide_1', outcome: OUTCOME_TYPES.WIDE, runs: 0 });
    assert.strictEqual(res.success, true);
    assert.strictEqual(engine.runs, 1);
    assert.strictEqual(engine.extras.wides, 1);
    assert.strictEqual(engine.totalLegalBalls, legalBallsBefore); // legal balls unchanged
    assert.strictEqual(engine.legalBallsInOver, 0);
    assert.strictEqual(engine.getStriker().balls, strikerBallsBefore); // batter balls unchanged
  });

  it('3. Extras: No-ball awards penalty and batter runs without consuming legal delivery', () => {
    const engine = new CricketRulesEngine({ totalOvers: 2, team1: sampleTeam1, team2: sampleTeam2 });

    // No-ball with 4 off the bat (1 penalty + 4 off bat = 5 runs to team)
    const res = engine.processDelivery({ deliveryId: 'nb_1', outcome: OUTCOME_TYPES.NO_BALL, runs: 4 });
    assert.strictEqual(res.success, true);
    assert.strictEqual(engine.runs, 5);
    assert.strictEqual(engine.extras.noBalls, 1);
    assert.strictEqual(engine.getStriker().runs, 4);
    assert.strictEqual(engine.totalLegalBalls, 0); // 0 legal balls
  });

  it('4. Wickets: Bowled, Caught, LBW, Stumped credit bowler and dismiss striker', () => {
    const engine = new CricketRulesEngine({ totalOvers: 2, team1: sampleTeam1, team2: sampleTeam2 });

    // Ball 1: Clean Bowled
    const strikerBefore = engine.getStriker();
    const res = engine.processDelivery({
      deliveryId: 'w_bowled',
      outcome: OUTCOME_TYPES.WICKET,
      dismissalType: DISMISSAL_TYPES.BOWLED,
      reason: 'Clean Bowled'
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(engine.wickets, 1);
    assert.strictEqual(strikerBefore.isOut, true);
    assert.strictEqual(engine.getCurrentBowler().wickets, 1);
    assert.notStrictEqual(engine.getStriker().index, strikerBefore.index); // New batter at crease
  });

  it('5. Run-Out: completed runs count without double counting and bowler is not credited', () => {
    const engine = new CricketRulesEngine({ totalOvers: 2, team1: sampleTeam1, team2: sampleTeam2 });

    const bowlerWicketsBefore = engine.getCurrentBowler().wickets;

    // Run out while completing 1 run
    const res = engine.processDelivery({
      deliveryId: 'w_runout',
      outcome: OUTCOME_TYPES.WICKET,
      dismissalType: DISMISSAL_TYPES.RUN_OUT,
      completedRuns: 1,
      whoOut: 'STRIKER',
      reason: 'Direct Hit'
    });

    assert.strictEqual(engine.runs, 1);
    assert.strictEqual(engine.wickets, 1);
    assert.strictEqual(engine.getCurrentBowler().wickets, bowlerWicketsBefore); // Bowler not credited
  });

  it('6. Over Completion: 6 legal balls complete over, rotate strike, rotate bowler, and detect maidens', () => {
    const engine = new CricketRulesEngine({ totalOvers: 2, team1: sampleTeam1, team2: sampleTeam2 });

    const bowler1Index = engine.currentBowlerIndex;
    const strikerAtStart = engine.strikerIndex;

    // Bowl 6 dot balls (Maiden over)
    for (let i = 1; i <= 5; i++) {
      engine.processDelivery({ deliveryId: `m_ball_${i}`, outcome: OUTCOME_TYPES.DOT, runs: 0 });
    }

    // 6th legal ball
    const overRes = engine.processDelivery({ deliveryId: 'm_ball_6', outcome: OUTCOME_TYPES.DOT, runs: 0 });
    assert.strictEqual(overRes.overComplete, true);
    assert.strictEqual(engine.completedOvers, 1);
    assert.strictEqual(engine.bowlerStats[bowler1Index].maidens, 1); // Maiden counted!
    assert.notStrictEqual(engine.strikerIndex, strikerAtStart); // Strike rotated at end of over
    assert.notStrictEqual(engine.currentBowlerIndex, bowler1Index); // New bowler chosen for next over
  });

  it('7. Duplicate Delivery Deduplication: Same deliveryId is ignored', () => {
    const engine = new CricketRulesEngine({ totalOvers: 2, team1: sampleTeam1, team2: sampleTeam2 });

    const res1 = engine.processDelivery({ deliveryId: 'dup_test', outcome: OUTCOME_TYPES.SIX, runs: 6 });
    assert.strictEqual(res1.success, true);
    assert.strictEqual(engine.runs, 6);

    // Duplicate call
    const res2 = engine.processDelivery({ deliveryId: 'dup_test', outcome: OUTCOME_TYPES.SIX, runs: 6 });
    assert.strictEqual(res2.duplicate, true);
    assert.strictEqual(engine.runs, 6); // Runs remain 6, not 12
  });

  it('8. Innings Break & Target Chase: Correct target setting and win determination', () => {
    const engine = new CricketRulesEngine({ totalOvers: 1, team1: sampleTeam1, team2: sampleTeam2 });

    // Bowl 1 full over in Innings 1 (scored 12 runs)
    for (let i = 1; i <= 6; i++) {
      engine.processDelivery({ deliveryId: `inn1_${i}`, outcome: OUTCOME_TYPES.RUNS, runs: 2 });
    }

    assert.strictEqual(engine.currentInningsNumber, 2);
    assert.strictEqual(engine.target, 13); // Target is 12 + 1 = 13 runs

    // Innings 2: Team 2 chases 13 runs with two SIXes and a single
    engine.processDelivery({ deliveryId: 'inn2_1', outcome: OUTCOME_TYPES.SIX, runs: 6 });
    engine.processDelivery({ deliveryId: 'inn2_2', outcome: OUTCOME_TYPES.SIX, runs: 6 });
    const chaseRes = engine.processDelivery({ deliveryId: 'inn2_3', outcome: OUTCOME_TYPES.RUNS, runs: 1 });

    assert.strictEqual(chaseRes.matchOver, true);
    assert.strictEqual(chaseRes.winner, sampleTeam2.name);
  });
});
