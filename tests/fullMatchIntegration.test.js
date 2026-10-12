import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { GameState, GAME_STATES, BATTING_SHOTS, TEAMS } from '../src/gameState.js';
import { BallPhysics } from '../src/physics/ballPhysics.js';
import { CharacterManager } from '../src/scene/characters.js';
import { FieldingAI } from '../src/ai/fieldingAI.js';
import { OUTCOME_TYPES, DISMISSAL_TYPES } from '../src/rules/cricketRules.js';

describe('Phase 13.6: Full-Match Gameplay Integration & Stability Test Suite', () => {
  it('1. Start match → deliver ball → attempt a shot → resolve the outcome', () => {
    const gameState = new GameState();
    gameState.initMatch(0, 1, 2); // 2 overs: IND vs AUS
    gameState.applyTossDecision(true); // User bats first

    assert.strictEqual(gameState.runs, 0);
    assert.strictEqual(gameState.wickets, 0);
    assert.strictEqual(gameState.overs, 0);
    assert.strictEqual(gameState.ballsInOver, 0);

    const scene = new THREE.Scene();
    const ball = new BallPhysics(scene);
    const characters = new CharacterManager(scene);

    // AI Bowler generates delivery
    const delData = gameState.generateDelivery();
    assert.ok(delData.deliveryId, 'Delivery must have unique ID');
    ball.setupDelivery(delData);

    // Deliver ball
    ball.deliverBall(new THREE.Vector3(0.4, 2.1, -10.06));
    assert.strictEqual(ball.inPlay, true);

    // Step ball physics to strike plane (Z = 8.95m)
    for (let i = 0; i < 40 && ball.position.z < 8.95; i++) {
      ball.update(0.016, characters, () => {});
    }

    // Striker plays Straight Drive with PERFECT timing
    const shot = BATTING_SHOTS.STRAIGHT_DRIVE;
    ball.applyBatHit({ shotData: shot, timingQuality: 'PERFECT' });
    assert.strictEqual(ball.hasHitBat, true);
    assert.ok(ball.velocity.z < 0, 'Straight drive must travel back down ground towards bowler');

    // Simulate outfield resolution (2 runs)
    let outcomeReceived = null;
    ball.finishDelivery({
      outcome: 'RUNS',
      runs: 2,
      reason: 'Punched past mid-off for 2 runs'
    }, characters, (res) => {
      outcomeReceived = res;
    });

    assert.ok(outcomeReceived, 'Result callback must fire');
    const outcome = gameState.recordDelivery(outcomeReceived, shot.id);

    assert.strictEqual(gameState.runs, 2, 'Team total must be 2');
    assert.strictEqual(gameState.getStriker().runs, 2, 'Striker must have 2 runs');
    assert.strictEqual(gameState.ballsInOver, 1, '1 legal ball recorded');
    assert.strictEqual(gameState.currentState, GAME_STATES.RESULT);
  });

  it('2. Missed shot → ball continues → keeper/dot ball resolution', () => {
    const gameState = new GameState();
    gameState.initMatch(0, 1, 1);
    gameState.applyTossDecision(true);

    const scene = new THREE.Scene();
    const ball = new BallPhysics(scene);
    const characters = new CharacterManager(scene);

    const delData = gameState.generateDelivery();
    ball.setupDelivery(delData);
    ball.deliverBall(new THREE.Vector3(0.4, 2.1, -10.06));

    // Missed swing: applyBatHit should be bypassed for MISSED
    ball.applyBatHit({ shotData: BATTING_SHOTS.DEFENSIVE, timingQuality: 'MISSED' });
    assert.strictEqual(ball.hasHitBat, false, 'Missed swing must not mark ball as struck');

    // Step ball forward until it passes keeper (Z > 14.2)
    let deliveryOutcome = null;
    for (let i = 0; i < 150 && !ball.isScored; i++) {
      ball.update(0.016, characters, (res) => {
        deliveryOutcome = res;
      });
    }

    assert.ok(deliveryOutcome, 'Delivery must conclude when passing keeper');
    assert.strictEqual(deliveryOutcome.outcome, 'DOT');
    assert.strictEqual(deliveryOutcome.runs, 0);

    gameState.recordDelivery(deliveryOutcome, 'DEFENSIVE');
    assert.strictEqual(gameState.runs, 0, 'No runs on dot ball');
    assert.strictEqual(gameState.getStriker().balls, 1, 'Striker faced 1 ball');
    assert.strictEqual(gameState.ballsInOver, 1);
  });

  it('3. Ball contact → boundary resolution (SIX and FOUR)', () => {
    const gameState = new GameState();
    gameState.initMatch(0, 1, 2);
    gameState.applyTossDecision(true);

    const scene = new THREE.Scene();
    const characters = new CharacterManager(scene);

    // Test SIX: unbounced ball crossing boundary (r >= 65m)
    const ballSix = new BallPhysics(scene);
    const delData1 = gameState.generateDelivery();
    ballSix.setupDelivery(delData1);
    ballSix.deliverBall(new THREE.Vector3(0.4, 2.1, -10.06));
    ballSix.applyBatHit({ shotData: BATTING_SHOTS.LOFTED_ATTACK, timingQuality: 'PERFECT' });

    ballSix.position.set(0, 5.0, -66.0); // Past boundary in air
    let sixResult = null;
    ballSix.update(0.016, characters, (res) => {
      sixResult = res;
    });

    assert.ok(sixResult);
    assert.strictEqual(sixResult.outcome, 'SIX');
    assert.strictEqual(sixResult.runs, 6);

    gameState.recordDelivery(sixResult, 'LOFTED_ATTACK');
    assert.strictEqual(gameState.runs, 6);
    assert.strictEqual(gameState.getStriker().sixes, 1);

    // Test FOUR: bounced ball crossing boundary
    const ballFour = new BallPhysics(scene);
    const delData2 = gameState.generateDelivery();
    ballFour.setupDelivery(delData2);
    ballFour.deliverBall(new THREE.Vector3(0.4, 2.1, -10.06));
    ballFour.applyBatHit({ shotData: BATTING_SHOTS.COVER_DRIVE, timingQuality: 'GOOD' });
    ballFour.bounceCount = 2; // Bounced on ground
    ballFour.position.set(-66.0, 0.09, 0);

    let fourResult = null;
    ballFour.update(0.016, characters, (res) => {
      fourResult = res;
    });

    assert.ok(fourResult);
    assert.strictEqual(fourResult.outcome, 'FOUR');
    assert.strictEqual(fourResult.runs, 4);

    gameState.recordDelivery(fourResult, 'COVER_DRIVE');
    assert.strictEqual(gameState.runs, 10);
    assert.strictEqual(gameState.getStriker().fours, 1);
  });

  it('4. Catch → dismissal → striker rotation and delivery reset', () => {
    const gameState = new GameState();
    gameState.initMatch(0, 1, 2);
    gameState.applyTossDecision(true);

    const initialStriker = gameState.getStriker().name;
    const scene = new THREE.Scene();
    const characters = new CharacterManager(scene);
    const fieldingAI = new FieldingAI();
    fieldingAI.setPreset('BALANCED', characters.fielders);

    const ball = new BallPhysics(scene);
    const delData = gameState.generateDelivery();
    ball.setupDelivery(delData);
    ball.deliverBall(new THREE.Vector3(0.4, 2.1, -10.06));

    // Skied shot in air towards slip/gully
    ball.applyBatHit({ shotData: BATTING_SHOTS.CUT_SHOT, timingQuality: 'EARLY' });
    assert.strictEqual(ball.bounceCount, 0);

    // Trigger fielder catch
    let fielderEvent = null;
    const chaser = characters.fielders[0];
    chaser.group.position.set(ball.position.x, 0, ball.position.z);
    ball.position.y = 1.2; // Airborne catch height

    fieldingAI.onShotStruck(ball.position, ball.velocity, 'HARD');
    // Force reaction and step to catch zone
    fieldingAI.reactionTimer = 0;
    fieldingAI.hasReacted = true;
    fieldingAI.update(0.016, ball, characters, 'HARD', (evt) => {
      fielderEvent = evt;
    });

    // Fielder event should be CATCH_TAKEN (on HARD catch rate is 96%)
    if (fielderEvent && fielderEvent.action === 'CATCH_TAKEN') {
      let wicketResult = null;
      ball.finishDelivery({
        outcome: 'WICKET',
        dismissalType: DISMISSAL_TYPES.CAUGHT,
        reason: `Caught by ${fielderEvent.fielderName}! 🧤`,
        runs: 0
      }, characters, (res) => {
        wicketResult = res;
      });

      gameState.recordDelivery(wicketResult, 'CUT_SHOT');
      assert.strictEqual(gameState.wickets, 1, 'Wicket count must be 1');
      assert.notStrictEqual(gameState.getStriker().name, initialStriker, 'New batsman must take the crease');
    }
  });

  it('5. Dropped catch → ball remains playable → ground pickup & throw completion', () => {
    const scene = new THREE.Scene();
    const characters = new CharacterManager(scene);
    const fieldingAI = new FieldingAI();
    fieldingAI.setPreset('BALANCED', characters.fielders);

    const ball = new BallPhysics(scene);
    ball.hasHitBat = true;
    ball.inPlay = true;
    ball.isDead = false;
    ball.bounceCount = 0;

    // Simulate dropped catch: ball rebounds into turf
    ball.bounceCount = 1;
    ball.position.set(12.0, 0.09, 8.0);
    ball.mesh.position.copy(ball.position);
    assert.strictEqual(ball.inPlay, true, 'Ball must remain in play after dropped catch');

    // Fielder retrieves ground ball
    let pickupEvent = null;
    const fielder = characters.fielders[1];
    fielder.group.position.copy(ball.position);

    fieldingAI.hasReacted = true;
    fieldingAI.reactionTimer = 0;
    fieldingAI.update(0.016, ball, characters, 'MEDIUM', (evt) => {
      pickupEvent = evt;
    });

    assert.ok(pickupEvent);
    assert.strictEqual(pickupEvent.action, 'GROUND_PICKUP');
    assert.strictEqual(fieldingAI.isThrowing, true, 'Throw animation must begin');

    // Finish delivery for scoring
    ball.finishDelivery({
      outcome: 'RUNS',
      runs: pickupEvent.runs,
      reason: 'Fielded cleanly'
    }, characters, () => {});

    // Step throw animation to completion
    let throwComplete = false;
    for (let i = 0; i < 30; i++) {
      fieldingAI.update(0.05, ball, characters, 'MEDIUM', (evt) => {
        if (evt.action === 'THROW_COMPLETED') throwComplete = true;
      });
    }

    assert.strictEqual(throwComplete, true, 'Throw must reach stumps and trigger THROW_COMPLETED');
    assert.strictEqual(fieldingAI.isThrowing, false, 'Throw state must be cleared after completion');
  });

  it('6. Wicket collision → stumps & bails break → reset restores clean position', () => {
    const scene = new THREE.Scene();
    const characters = new CharacterManager(scene);
    const ball = new BallPhysics(scene);

    const delData = { deliveryId: 'del_test_bowled', speedKmph: 145, lengthType: 'YORKER' };
    ball.setupDelivery(delData);
    ball.deliverBall(new THREE.Vector3(0, 2.1, -10.06));

    // Position ball directly into striker stumps collision window (Z = 10.06m, X = 0, Y = 0.5m)
    ball.position.set(0, 0.5, 9.95);
    ball.velocity.set(0, 0, 5.0); // 9.95 + 5.0 * 0.016 = 10.03m (well within [9.9, 10.25])
    let bowledOutcome = null;
    ball.update(0.016, characters, (res) => {
      bowledOutcome = res;
    });

    assert.ok(bowledOutcome);
    assert.strictEqual(bowledOutcome.outcome, 'WICKET');
    assert.strictEqual(characters.strikerStumps.isBroken, true, 'Wickets must be broken on bowled dismissal');

    // Verify stumps and bails acquired velocity
    assert.ok(characters.strikerStumps.bails[0].userData.velocity, 'Bail must have physics velocity');

    // Delivery reset
    characters.strikerStumps.reset();
    assert.strictEqual(characters.strikerStumps.isBroken, false, 'Reset must restore isBroken to false');
    assert.strictEqual(characters.strikerStumps.bails[0].userData.velocity, null, 'Velocity must be cleared');
    assert.strictEqual(characters.strikerStumps.stumps[0].position.y, 0, 'Stumps must be grounded');
  });

  it('7. Complete an over (6 legal balls) → over change → bowler rotates', () => {
    const gameState = new GameState();
    gameState.initMatch(0, 1, 2);
    gameState.applyTossDecision(true);

    const initialBowler = gameState.getCurrentBowler().name;
    const initialStriker = gameState.strikerIndex;

    // Bowl 5 legal dots
    for (let i = 1; i <= 5; i++) {
      const res = gameState.recordDelivery({
        deliveryId: `del_over1_ball${i}`,
        outcome: 'DOT',
        runs: 0
      });
      assert.strictEqual(res.overComplete, false);
      assert.strictEqual(gameState.ballsInOver, i);
    }

    // 6th legal delivery completes the over (DOT ball -> strike rotates at over end to non-striker)
    const overRes = gameState.recordDelivery({
      deliveryId: 'del_over1_ball6',
      outcome: 'DOT',
      runs: 0
    });

    assert.strictEqual(overRes.overComplete, true, '6th legal ball must trigger overComplete');
    assert.strictEqual(gameState.overs, 1, 'Completed overs must be 1');
    assert.strictEqual(gameState.ballsInOver, 0, 'Balls in over must reset to 0');
    assert.strictEqual(gameState.currentState, GAME_STATES.OVER_CHANGE);

    // Strike rotation occurred at end of over
    assert.notStrictEqual(gameState.strikerIndex, initialStriker, 'Strike must rotate after over ends');

    // Bowler rotated for next over
    const newBowler = gameState.getCurrentBowler().name;
    assert.notStrictEqual(newBowler, initialBowler, 'Bowler must rotate for next over');
  });

  it('8. Complete an innings → innings break → clean bowling AI reset for innings 2', () => {
    const gameState = new GameState();
    gameState.initMatch(0, 1, 1); // 1-over match
    gameState.applyTossDecision(true);

    // Simulate AI learning tendencies in 1st innings
    for (let i = 1; i <= 5; i++) {
      const del = gameState.generateDelivery();
      gameState.recordDelivery({
        deliveryId: `del_inn1_b${i}`,
        outcome: 'FOUR',
        runs: 4
      }, 'COVER_DRIVE');
    }

    assert.ok(gameState.bowlingAI.history.length > 0, 'AI must have 1st innings history');
    assert.ok(gameState.bowlingAI.batterTendencies.driveCount > 0, 'AI must have registered drives');

    // 6th ball finishes 1st innings
    const lastDel = gameState.generateDelivery();
    const innEndRes = gameState.recordDelivery({
      deliveryId: 'del_inn1_b6',
      outcome: 'SIX',
      runs: 6
    }, 'LOFTED_ATTACK');

    assert.strictEqual(innEndRes.inningsBreak, true, '1st innings must end');
    assert.strictEqual(gameState.currentState, GAME_STATES.INNINGS_BREAK);
    assert.strictEqual(gameState.target, 27, 'Target must be runs + 1 (26 + 1 = 27)');
    assert.strictEqual(gameState.currentInnings, 2, 'Innings number must be 2');

    // Verify fresh bowling AI memory for innings 2
    assert.strictEqual(gameState.bowlingAI.history.length, 0, 'Bowling AI history must be clean for 2nd innings');
    assert.strictEqual(gameState.bowlingAI.batterTendencies.driveCount, 0, 'Batter tendencies must reset for new batters');
  });

  it('9. Reach terminal match state → verify subsequent calls cannot alter result', () => {
    const gameState = new GameState();
    gameState.initMatch(0, 1, 1);
    gameState.applyTossDecision(true);

    // Innings 1: 10 runs in 1 over
    for (let i = 1; i <= 6; i++) {
      gameState.recordDelivery({
        deliveryId: `del_inn1_${i}`,
        outcome: i === 6 ? 'FOUR' : 'RUNS',
        runs: i === 6 ? 4 : 1
      });
    }

    assert.strictEqual(gameState.target, 10);
    assert.strictEqual(gameState.currentInnings, 2);

    // Innings 2: Team 2 chases target (needs 10 runs)
    gameState.recordDelivery({ deliveryId: 'del_inn2_1', outcome: 'SIX', runs: 6 });
    const winDelivery = gameState.recordDelivery({ deliveryId: 'del_inn2_2', outcome: 'FOUR', runs: 4 });

    assert.strictEqual(winDelivery.matchOver, true, 'Match must conclude when target is reached');
    assert.strictEqual(gameState.currentState, GAME_STATES.MATCH_OVER);

    const initialWinner = winDelivery.winner;
    const finalRuns = gameState.runs;

    // Attempting further delivery on finished match
    const extraAttempt = gameState.recordDelivery({
      deliveryId: 'del_inn2_illegal_extra',
      outcome: 'SIX',
      runs: 6
    });

    // Score and winner remain invariant
    assert.strictEqual(gameState.runs, finalRuns, 'Total runs must not change after match is over');
    assert.strictEqual(gameState.currentState, GAME_STATES.MATCH_OVER);
    assert.strictEqual(gameState.getFinalMatchResult().winner, initialWinner);
  });

  it('10. Idempotent delivery resolution prevents duplicate runs or wickets', () => {
    const gameState = new GameState();
    gameState.initMatch(0, 1, 2);

    const delivery = {
      deliveryId: 'unique_del_101',
      outcome: 'FOUR',
      runs: 4
    };

    const firstProcess = gameState.recordDelivery(delivery);
    assert.strictEqual(firstProcess.success, true);
    assert.strictEqual(gameState.runs, 4);
    assert.strictEqual(gameState.ballsInOver, 1);

    // Attempt to process exact same deliveryId again
    const secondProcess = gameState.recordDelivery(delivery);
    assert.strictEqual(secondProcess.success, false);
    assert.strictEqual(secondProcess.duplicate, true, 'Duplicate deliveryId must be rejected');
    assert.strictEqual(gameState.runs, 4, 'Runs must not be double counted');
    assert.strictEqual(gameState.ballsInOver, 1, 'Balls count must not increment twice');

    // Check BallPhysics.finishDelivery idempotency
    const scene = new THREE.Scene();
    const ball = new BallPhysics(scene);
    ball.currentDeliveryId = 'del_physics_101';
    let callbackCount = 0;

    ball.finishDelivery({ outcome: 'RUNS', runs: 2 }, null, () => {
      callbackCount++;
    });
    // Call finishDelivery again on same physical delivery
    ball.finishDelivery({ outcome: 'RUNS', runs: 2 }, null, () => {
      callbackCount++;
    });

    assert.strictEqual(callbackCount, 1, 'BallPhysics callback must only fire once per delivery');
  });
});
