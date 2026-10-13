import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { GameState, GAME_STATES, TEAMS } from '../src/gameState.js';
import { CricketRulesEngine, OUTCOME_TYPES, DISMISSAL_TYPES } from '../src/rules/cricketRules.js';
import { CharacterManager } from '../src/scene/characters.js';
import { BallPhysics } from '../src/physics/ballPhysics.js';

describe('Phase 14.0: Full-Match Lifecycle QA & Cricket Rules Regression Suite', () => {

  it('1. Match start and toss initialization establishes correct teams, zero score, and ready state', () => {
    const gameState = new GameState();
    gameState.initMatch(0, 1, 2); // India vs Australia, 2 overs

    assert.strictEqual(gameState.runs, 0);
    assert.strictEqual(gameState.wickets, 0);
    assert.strictEqual(gameState.overs, 0);
    assert.strictEqual(gameState.ballsInOver, 0);
    assert.strictEqual(gameState.currentInnings, 1);
    assert.strictEqual(gameState.battingTeam.shortName, 'IND');
    assert.strictEqual(gameState.bowlingTeam.shortName, 'AUS');
    assert.strictEqual(gameState.target, null);

    // Toss: user chooses to bowl first
    gameState.applyTossDecision(false);
    assert.strictEqual(gameState.battingTeam.shortName, 'AUS');
    assert.strictEqual(gameState.bowlingTeam.shortName, 'IND');
    assert.strictEqual(gameState.isUserBatting(), false);

    // Toss: user chooses to bat first
    gameState.applyTossDecision(true);
    assert.strictEqual(gameState.battingTeam.shortName, 'IND');
    assert.strictEqual(gameState.bowlingTeam.shortName, 'AUS');
    assert.strictEqual(gameState.isUserBatting(), true);
  });

  it('2. Legal dot ball increments balls, records faced ball on striker, and maintains score', () => {
    const rules = new CricketRulesEngine({
      totalOvers: 2,
      team1: TEAMS[0],
      team2: TEAMS[1]
    });

    const strikerBefore = rules.getStriker();
    assert.strictEqual(strikerBefore.balls, 0);

    const res = rules.processDelivery({ deliveryId: 'del_dot_1', outcome: OUTCOME_TYPES.DOT, runs: 0 });
    assert.strictEqual(res.success, true);
    assert.strictEqual(rules.runs, 0);
    assert.strictEqual(rules.wickets, 0);
    assert.strictEqual(rules.legalBallsInOver, 1);
    assert.strictEqual(rules.getStriker().balls, 1);
    assert.strictEqual(rules.getStriker().runs, 0);
    assert.strictEqual(rules.getCurrentBowler().legalBalls, 1);
    assert.strictEqual(rules.getCurrentBowler().runsConceded, 0);
  });

  it('3. Single and multiple-run sequence rotates strike on odd runs and keeps strike on even runs', () => {
    const rules = new CricketRulesEngine({
      totalOvers: 2,
      team1: TEAMS[0],
      team2: TEAMS[1]
    });

    const initStrikerIdx = rules.strikerIndex;
    const initNonStrikerIdx = rules.nonStrikerIndex;

    // Single run (odd): strike must rotate
    rules.processDelivery({ deliveryId: 'del_run_1', outcome: OUTCOME_TYPES.RUNS, runs: 1 });
    assert.strictEqual(rules.runs, 1);
    assert.strictEqual(rules.strikerIndex, initNonStrikerIdx, 'Strike rotated on 1 run');
    assert.strictEqual(rules.nonStrikerIndex, initStrikerIdx);

    // Two runs (even): strike remains with current striker
    const currentStrikerIdx = rules.strikerIndex;
    rules.processDelivery({ deliveryId: 'del_run_2', outcome: OUTCOME_TYPES.RUNS, runs: 2 });
    assert.strictEqual(rules.runs, 3);
    assert.strictEqual(rules.strikerIndex, currentStrikerIdx, 'Strike preserved on 2 runs');

    // Three runs (odd): strike rotates again
    rules.processDelivery({ deliveryId: 'del_run_3', outcome: OUTCOME_TYPES.RUNS, runs: 3 });
    assert.strictEqual(rules.runs, 6);
    assert.strictEqual(rules.strikerIndex, initStrikerIdx, 'Strike returned to initial striker on 3 runs');
  });

  it('4. Boundary four and six award correct runs, increment boundaries, and do not rotate strike', () => {
    const rules = new CricketRulesEngine({
      totalOvers: 2,
      team1: TEAMS[0],
      team2: TEAMS[1]
    });

    const strikerIdx = rules.strikerIndex;

    // Boundary Four
    rules.processDelivery({ deliveryId: 'del_four', outcome: OUTCOME_TYPES.FOUR, runs: 4 });
    assert.strictEqual(rules.runs, 4);
    assert.strictEqual(rules.getStriker().runs, 4);
    assert.strictEqual(rules.getStriker().fours, 1);
    assert.strictEqual(rules.strikerIndex, strikerIdx, 'Four does not rotate strike');

    // Boundary Six
    rules.processDelivery({ deliveryId: 'del_six', outcome: OUTCOME_TYPES.SIX, runs: 6 });
    assert.strictEqual(rules.runs, 10);
    assert.strictEqual(rules.getStriker().runs, 10);
    assert.strictEqual(rules.getStriker().sixes, 1);
    assert.strictEqual(rules.strikerIndex, strikerIdx, 'Six does not rotate strike');
    assert.strictEqual(rules.getCurrentBowler().runsConceded, 10);
  });

  it('5. Caught dismissal credits bowler, marks striker out, and brings in next batter', () => {
    const rules = new CricketRulesEngine({
      totalOvers: 2,
      team1: TEAMS[0],
      team2: TEAMS[1]
    });

    const outBatter = rules.getStriker();
    const res = rules.processDelivery({
      deliveryId: 'del_wkt_caught',
      outcome: OUTCOME_TYPES.WICKET,
      dismissalType: DISMISSAL_TYPES.CAUGHT,
      reason: 'Caught by P. Cummins! 🧤',
      runs: 0
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(rules.wickets, 1);
    assert.strictEqual(outBatter.isOut, true);
    assert.strictEqual(outBatter.dismissal, 'Caught by P. Cummins! 🧤');
    assert.strictEqual(rules.getCurrentBowler().wickets, 1, 'Bowler credited with wicket');
    assert.strictEqual(rules.strikerIndex, 2, 'Batter #3 brought into strike');
    assert.strictEqual(rules.getStriker().isOut, false, 'New striker is not out');
  });

  it('6. Bowled dismissal breaks stumps, credits bowler, and increments wickets', () => {
    const rules = new CricketRulesEngine({
      totalOvers: 2,
      team1: TEAMS[0],
      team2: TEAMS[1]
    });

    const res = rules.processDelivery({
      deliveryId: 'del_wkt_bowled',
      outcome: OUTCOME_TYPES.WICKET,
      dismissalType: DISMISSAL_TYPES.BOWLED,
      reason: 'Clean Bowled! 💥',
      runs: 0
    });

    assert.strictEqual(rules.wickets, 1);
    assert.strictEqual(rules.getCurrentBowler().wickets, 1);
    assert.strictEqual(rules.getStriker().index, 2);
  });

  it('7. Run-out dismissal handles completed runs, does not credit bowler, and dismisses correct runner', () => {
    const rules = new CricketRulesEngine({
      totalOvers: 2,
      team1: TEAMS[0],
      team2: TEAMS[1]
    });

    // Run out of Non-Striker while attempting 2nd run (1 completed run)
    const bowlerWicketsBefore = rules.getCurrentBowler().wickets;
    const res = rules.processDelivery({
      deliveryId: 'del_wkt_runout_ns',
      outcome: OUTCOME_TYPES.WICKET,
      dismissalType: DISMISSAL_TYPES.RUN_OUT,
      whoOut: 'NON_STRIKER',
      completedRuns: 1,
      reason: 'Direct hit at non-striker end'
    });

    assert.strictEqual(rules.runs, 1, 'Completed run is awarded');
    assert.strictEqual(rules.wickets, 1);
    assert.strictEqual(rules.getCurrentBowler().wickets, bowlerWicketsBefore, 'Bowler does NOT get credit for run out');
    assert.strictEqual(rules.batterStats[1].isOut, true, 'Non-striker (index 1) marked out');
    assert.strictEqual(rules.strikerIndex, 2, 'New batter #3 enters at index 2');
    assert.strictEqual(rules.nonStrikerIndex, 0, 'Surviving batter (index 0) rotated to non-striker on odd run');
  });

  it('8. Wide and No-Ball handling awards extras, charges bowler, and does not count legal ball', () => {
    const rules = new CricketRulesEngine({
      totalOvers: 2,
      team1: TEAMS[0],
      team2: TEAMS[1]
    });

    // Wide delivery
    rules.processDelivery({ deliveryId: 'del_wide', outcome: OUTCOME_TYPES.WIDE, runs: 0 });
    assert.strictEqual(rules.runs, 1, '1 penalty run for wide');
    assert.strictEqual(rules.legalBallsInOver, 0, 'Wide does not increment legal ball count');
    assert.strictEqual(rules.extras.wides, 1);
    assert.strictEqual(rules.getCurrentBowler().runsConceded, 1);

    // No-ball with 2 runs off bat
    rules.processDelivery({ deliveryId: 'del_noball', outcome: OUTCOME_TYPES.NO_BALL, runs: 2 });
    assert.strictEqual(rules.runs, 4, '1 NB penalty + 2 runs off bat added to total');
    assert.strictEqual(rules.legalBallsInOver, 0, 'No-ball does not increment legal ball count');
    assert.strictEqual(rules.extras.noBalls, 1);
    assert.strictEqual(rules.getStriker().runs, 2, 'Striker credited with 2 runs');
  });

  it('9. Over completion (6 legal balls), maiden over detection, and bowler change', () => {
    const rules = new CricketRulesEngine({
      totalOvers: 2,
      team1: TEAMS[0],
      team2: TEAMS[1]
    });

    const bowler = rules.getCurrentBowler();
    const initialBowlerIdx = rules.currentBowlerIndex;

    // Bowl 5 dots
    for (let i = 1; i <= 5; i++) {
      rules.processDelivery({ deliveryId: `m_dot_${i}`, outcome: OUTCOME_TYPES.DOT, runs: 0 });
    }
    assert.strictEqual(rules.legalBallsInOver, 5);
    assert.strictEqual(rules.completedOvers, 0);

    // 6th dot completes a MAIDEN over
    const res = rules.processDelivery({ deliveryId: 'm_dot_6', outcome: OUTCOME_TYPES.DOT, runs: 0 });
    assert.strictEqual(res.overComplete, true);
    assert.strictEqual(rules.completedOvers, 1);
    assert.strictEqual(rules.legalBallsInOver, 0);
    assert.strictEqual(bowler.overs, 1);
    assert.strictEqual(bowler.maidens, 1, 'Maiden recorded for 6 dots');
    assert.notStrictEqual(rules.currentBowlerIndex, initialBowlerIdx, 'Bowler rotated at end of over');
  });

  it('10. Innings transition sets target, archives scorecard, and resets scores cleanly', () => {
    const rules = new CricketRulesEngine({
      totalOvers: 1, // 1 over match
      team1: TEAMS[0],
      team2: TEAMS[1]
    });

    // Score 12 runs in over 1
    for (let i = 1; i <= 5; i++) {
      rules.processDelivery({ deliveryId: `inn1_b${i}`, outcome: OUTCOME_TYPES.RUNS, runs: 2 });
    }
    const res = rules.processDelivery({ deliveryId: 'inn1_b6', outcome: OUTCOME_TYPES.RUNS, runs: 2 });

    assert.strictEqual(res.inningsBreak, true);
    assert.strictEqual(res.target, 13);
    assert.strictEqual(rules.target, 13);
    assert.strictEqual(rules.currentInningsNumber, 2);
    assert.strictEqual(rules.runs, 0, 'Innings 2 score resets to 0');
    assert.strictEqual(rules.wickets, 0, 'Innings 2 wickets reset to 0');
    assert.strictEqual(rules.completedOvers, 0);
    assert.strictEqual(rules.legalBallsInOver, 0);
    assert.strictEqual(rules.battingTeam.shortName, 'AUS', 'Australia now batting');
    assert.strictEqual(rules.bowlingTeam.shortName, 'IND', 'India now bowling');
    assert.ok(rules.innings1Card, 'Innings 1 scorecard preserved');
  });

  it('11. Successful chase in 2nd innings terminates match immediately with correct margin', () => {
    const rules = new CricketRulesEngine({
      totalOvers: 1,
      team1: TEAMS[0],
      team2: TEAMS[1]
    });

    // Innings 1: 10 runs -> Target 11
    for (let i = 1; i <= 5; i++) rules.processDelivery({ deliveryId: `i1_b${i}`, outcome: OUTCOME_TYPES.RUNS, runs: 2 });
    rules.processDelivery({ deliveryId: 'i1_b6', outcome: OUTCOME_TYPES.DOT, runs: 0 });
    assert.strictEqual(rules.target, 11);

    // Innings 2: Australia hits 6, 6 -> 12 runs (exceeds target of 11)
    rules.processDelivery({ deliveryId: 'i2_b1', outcome: OUTCOME_TYPES.SIX, runs: 6 });
    const res = rules.processDelivery({ deliveryId: 'i2_b2', outcome: OUTCOME_TYPES.SIX, runs: 6 });

    assert.strictEqual(res.matchOver, true);
    assert.strictEqual(res.winner, 'Australia');
    assert.strictEqual(res.margin, '10 wickets');
    assert.strictEqual(rules.isMatchOver, true);

    // Subsequent deliveries are rejected
    const blockedRes = rules.processDelivery({ deliveryId: 'i2_b3', outcome: OUTCOME_TYPES.FOUR, runs: 4 });
    assert.strictEqual(blockedRes.success, false);
    assert.strictEqual(blockedRes.matchOver, true);
  });

  it('12. All-out dismissal (10 wickets) terminates innings cleanly', () => {
    const rules = new CricketRulesEngine({
      totalOvers: 5,
      team1: TEAMS[0],
      team2: TEAMS[1]
    });

    for (let i = 1; i <= 9; i++) {
      rules.processDelivery({ deliveryId: `wkt_${i}`, outcome: OUTCOME_TYPES.WICKET, runs: 0 });
    }
    assert.strictEqual(rules.wickets, 9);

    const tenthWicket = rules.processDelivery({ deliveryId: 'wkt_10', outcome: OUTCOME_TYPES.WICKET, runs: 0 });
    assert.strictEqual(tenthWicket.inningsBreak, true);
    assert.strictEqual(tenthWicket.reason, 'All Out');
    assert.strictEqual(rules.currentInningsNumber, 2);
  });

  it('13. Match tie resolution when scores are equal at the conclusion of 2nd innings', () => {
    const rules = new CricketRulesEngine({
      totalOvers: 1,
      team1: TEAMS[0],
      team2: TEAMS[1]
    });

    // Innings 1: 6 runs -> Target 7
    rules.processDelivery({ deliveryId: 't_i1_b1', outcome: OUTCOME_TYPES.SIX, runs: 6 });
    for (let i = 2; i <= 6; i++) rules.processDelivery({ deliveryId: `t_i1_b${i}`, outcome: OUTCOME_TYPES.DOT, runs: 0 });
    assert.strictEqual(rules.target, 7);

    // Innings 2: Exactly 6 runs scored in 6 legal deliveries (target - 1)
    rules.processDelivery({ deliveryId: 't_i2_b1', outcome: OUTCOME_TYPES.SIX, runs: 6 });
    for (let i = 2; i <= 5; i++) rules.processDelivery({ deliveryId: `t_i2_b${i}`, outcome: OUTCOME_TYPES.DOT, runs: 0 });
    const finalBall = rules.processDelivery({ deliveryId: 't_i2_b6', outcome: OUTCOME_TYPES.DOT, runs: 0 });

    assert.strictEqual(finalBall.matchOver, true);
    assert.strictEqual(finalBall.winner, 'TIE');
    assert.strictEqual(finalBall.margin, 'Match Tied');
  });

  it('14. Full match restart cleanly resets state machine, scores, wickets, and deduplication memory', () => {
    const gameState = new GameState();
    gameState.initMatch(0, 1, 1);

    // Complete a 1-over match
    for (let i = 1; i <= 6; i++) {
      gameState.recordDelivery({ deliveryId: `r_del_${i}`, outcome: OUTCOME_TYPES.RUNS, runs: 2 });
    }
    // Innings 2: 1 ball hits six and finishes match
    gameState.recordDelivery({ deliveryId: 'r_del_inn2_1', outcome: OUTCOME_TYPES.SIX, runs: 6 });
    gameState.recordDelivery({ deliveryId: 'r_del_inn2_2', outcome: OUTCOME_TYPES.SIX, runs: 6 });
    gameState.recordDelivery({ deliveryId: 'r_del_inn2_3', outcome: OUTCOME_TYPES.SIX, runs: 6 });

    assert.strictEqual(gameState.currentState, GAME_STATES.MATCH_OVER);

    // Trigger full restart
    gameState.resetMatch();

    assert.strictEqual(gameState.currentState, GAME_STATES.READY);
    assert.strictEqual(gameState.runs, 0);
    assert.strictEqual(gameState.wickets, 0);
    assert.strictEqual(gameState.overs, 0);
    assert.strictEqual(gameState.ballsInOver, 0);
    assert.strictEqual(gameState.currentInnings, 1);
    assert.strictEqual(gameState.target, null);
    assert.strictEqual(gameState.rulesEngine.isMatchOver, false);

    // Verify delivery with previously used deliveryId can now be delivered in fresh match
    const newDeliveryRes = gameState.recordDelivery({ deliveryId: 'r_del_1', outcome: OUTCOME_TYPES.FOUR, runs: 4 });
    assert.strictEqual(newDeliveryRes.success, true, 'Restart cleared processedDeliveries deduplication guard');
    assert.strictEqual(gameState.runs, 4);
  });

});
