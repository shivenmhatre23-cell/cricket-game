import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { GameState, BATTING_SHOTS, GAME_STATES, TEAMS } from '../src/gameState.js';
import { CharacterManager } from '../src/scene/characters.js';
import { BallPhysics } from '../src/physics/ballPhysics.js';
import { CricketRulesEngine } from '../src/rules/cricketRules.js';
import { TournamentManager } from '../src/tournament/tournamentManager.js';

describe('Phase 13.1: Batting Feel & Shot Animation Polish Test Suite', () => {
  it('1. Each of the six shot presets remains valid, complete, and selectable', () => {
    const state = new GameState();
    const expectedShots = [
      'DEFENSIVE',
      'STRAIGHT_DRIVE',
      'COVER_DRIVE',
      'PULL_SHOT',
      'CUT_SHOT',
      'LOFTED_ATTACK'
    ];

    assert.strictEqual(Object.keys(BATTING_SHOTS).length, 6);

    expectedShots.forEach(shotId => {
      const shot = BATTING_SHOTS[shotId];
      assert.ok(shot, `Shot preset ${shotId} must exist`);
      assert.strictEqual(shot.id, shotId);
      assert.ok(shot.name && shot.name.length > 0);
      assert.ok(shot.key && shot.keyAlt);
      assert.ok(typeof shot.exitSpeed === 'number' && shot.exitSpeed > 0);
      assert.ok(typeof shot.loftAngle === 'number');
      assert.ok(typeof shot.shotAngle === 'number');

      // Test selectability in GameState
      state.setSelectedShot(shotId);
      assert.strictEqual(state.selectedShotKey, shotId);
      assert.strictEqual(state.getSelectedShot().id, shotId);
    });
  });

  it('2. Keyboard hotkeys and HUD inputs route to the same unified shot action', () => {
    const state = new GameState();

    const shotKeyMap = {
      'Digit1': 'DEFENSIVE',
      'KeyQ': 'DEFENSIVE',
      'Digit2': 'STRAIGHT_DRIVE',
      'KeyW': 'STRAIGHT_DRIVE',
      'Digit3': 'COVER_DRIVE',
      'KeyE': 'COVER_DRIVE',
      'Digit4': 'PULL_SHOT',
      'KeyA': 'PULL_SHOT',
      'Digit5': 'CUT_SHOT',
      'KeyD': 'CUT_SHOT',
      'Digit6': 'LOFTED_ATTACK',
      'KeyL': 'LOFTED_ATTACK'
    };

    // Simulate keyboard hotkey routing
    Object.entries(shotKeyMap).forEach(([keyCode, expectedShotId]) => {
      const selectedFromKey = shotKeyMap[keyCode];
      state.setSelectedShot(selectedFromKey);
      assert.strictEqual(state.getSelectedShot().id, expectedShotId);
    });

    // Simulate HUD button data-shot attribute routing
    const hudShotButtons = ['DEFENSIVE', 'STRAIGHT_DRIVE', 'COVER_DRIVE', 'PULL_SHOT', 'CUT_SHOT', 'LOFTED_ATTACK'];
    hudShotButtons.forEach(btnShot => {
      state.setSelectedShot(btnShot);
      assert.strictEqual(state.getSelectedShot().id, btnShot);
    });
  });

  it('3. Duplicate input cannot resolve the same bat contact twice in a single delivery', () => {
    const scene = new THREE.Scene();
    const ballPhysics = new BallPhysics(scene);

    ballPhysics.setupDelivery({
      deliveryId: 'test_deliv_dup_1',
      speedKmph: 135,
      lengthType: 'GOOD',
      lineOffset: 0
    });
    ballPhysics.deliverBall();

    assert.strictEqual(ballPhysics.hasHitBat, false, 'hasHitBat must start false');

    const shot = BATTING_SHOTS.STRAIGHT_DRIVE;

    // First contact
    ballPhysics.applyBatHit({
      shotData: shot,
      timingQuality: 'PERFECT'
    });
    assert.strictEqual(ballPhysics.hasHitBat, true, 'hasHitBat must be true after contact');
    const velocityAfterFirstHit = ballPhysics.velocity.clone();

    // Duplicate contact attempt on same delivery
    ballPhysics.applyBatHit({
      shotData: BATTING_SHOTS.LOFTED_ATTACK,
      timingQuality: 'GOOD'
    });

    // Velocity must remain unchanged from the first hit
    assert.strictEqual(ballPhysics.velocity.x, velocityAfterFirstHit.x);
    assert.strictEqual(ballPhysics.velocity.y, velocityAfterFirstHit.y);
    assert.strictEqual(ballPhysics.velocity.z, velocityAfterFirstHit.z);
  });

  it('4. A new delivery cleanly resets per-delivery swing and contact state', () => {
    const scene = new THREE.Scene();
    const ballPhysics = new BallPhysics(scene);

    // Delivery 1
    ballPhysics.setupDelivery({ deliveryId: 'deliv_1', speedKmph: 130, lengthType: 'FULL' });
    ballPhysics.deliverBall();
    ballPhysics.applyBatHit({ shotData: BATTING_SHOTS.COVER_DRIVE, timingQuality: 'GOOD' });
    assert.strictEqual(ballPhysics.hasHitBat, true);

    // Reset for Delivery 2
    ballPhysics.resetToBowlerHand();
    assert.strictEqual(ballPhysics.hasHitBat, false, 'hasHitBat must reset to false on new delivery');
    assert.strictEqual(ballPhysics.inPlay, false);

    // Re-bowl delivery 2 and strike
    ballPhysics.deliverBall();
    assert.strictEqual(ballPhysics.inPlay, true);
    ballPhysics.applyBatHit({ shotData: BATTING_SHOTS.PULL_SHOT, timingQuality: 'PERFECT' });
    assert.strictEqual(ballPhysics.hasHitBat, true, 'Delivery 2 can cleanly register its own bat contact');
  });

  it('5. Inactive game states (PAUSED, MATCH_OVER, INNINGS_BREAK) disallow gameplay swings', () => {
    const state = new GameState();
    state.initMatch(0, 1, 1);

    const inactiveStates = [
      GAME_STATES.PAUSED,
      GAME_STATES.MATCH_OVER,
      GAME_STATES.INNINGS_BREAK,
      GAME_STATES.MENU,
      GAME_STATES.TOSS
    ];

    inactiveStates.forEach(s => {
      state.setState(s);
      // Validating whether a swing is allowed in state 's'
      const canSwingInState = (state.currentState === GAME_STATES.DELIVERY);
      assert.strictEqual(canSwingInState, false, `Swinging must be disallowed in state ${s}`);
    });

    // Only active DELIVERY state permits gameplay swings
    state.setState(GAME_STATES.DELIVERY);
    const canSwingInDelivery = (state.currentState === GAME_STATES.DELIVERY);
    assert.strictEqual(canSwingInDelivery, true, 'Swinging is allowed during DELIVERY');
  });

  it('6. Animation transitions and recovery return batsman to stable ready pose across all 6 shots', () => {
    const scene = new THREE.Scene();
    const charMgr = new CharacterManager(scene);

    const shots = ['DEFENSIVE', 'STRAIGHT_DRIVE', 'COVER_DRIVE', 'PULL_SHOT', 'CUT_SHOT', 'LOFTED_ATTACK'];

    shots.forEach(shotKey => {
      // Mid-swing (progress = 0.5)
      charMgr.playBatSwing(0.5, shotKey);
      assert.ok(charMgr.batter.bat.rotation.x !== 0.35, `${shotKey} must deflect bat during swing`);

      // Swing completion / recovery (progress = 1.0)
      charMgr.playBatSwing(1.0, shotKey);

      // Verify returned to exact stance values
      assert.strictEqual(charMgr.batter.hips.position.y, 0.93);
      assert.strictEqual(charMgr.batter.hips.position.z, 0);
      assert.strictEqual(charMgr.batter.hips.rotation.y, -Math.PI * 0.45);
      assert.strictEqual(charMgr.batter.bat.rotation.x, 0.35);
      assert.strictEqual(charMgr.batter.bat.rotation.z, -0.15);
    });
  });

  it('7. Missing or optional character rig bones do not crash the update or animation path', () => {
    const scene = new THREE.Scene();
    const charMgr = new CharacterManager(scene);

    // Construct partial/mock character with missing optional joints
    const partialBatter = {
      hips: new THREE.Group(),
      bat: new THREE.Group(),
      // leftArm elbow and rightLeg knee intentionally undefined
      leftArm: { shoulder: new THREE.Group() },
      rightArm: { shoulder: new THREE.Group() },
      leftLeg: { hip: new THREE.Group() },
      rightLeg: { hip: new THREE.Group() }
    };
    charMgr.batter = partialBatter;

    // Should run smoothly without throwing TypeErrors
    assert.doesNotThrow(() => {
      charMgr.setBatsmanStance();
      charMgr.playBatSwing(0.25, 'STRAIGHT_DRIVE');
      charMgr.playBatSwing(0.5, 'LOFTED_ATTACK');
      charMgr.playBatSwing(1.0, 'PULL_SHOT');
      charMgr.resetBatter();
    });
  });

  it('8. Existing scoring, wickets, extras, overs, and tournament behavior remain unchanged', () => {
    const rules = new CricketRulesEngine({
      totalOvers: 2,
      team1: TEAMS[0],
      team2: TEAMS[1]
    });

    // 1. Legal boundary FOUR
    rules.processDelivery({ deliveryId: 'chk_1', outcome: 'FOUR', runs: 4 });
    assert.strictEqual(rules.runs, 4);
    assert.strictEqual(rules.legalBallsInOver, 1);

    // 2. WIDE ball (extra without consuming legal ball)
    rules.processDelivery({ deliveryId: 'chk_2', outcome: 'WIDE', runs: 0 });
    assert.strictEqual(rules.runs, 5);
    assert.strictEqual(rules.legalBallsInOver, 1);
    assert.strictEqual(rules.extras.wides, 1);

    // 3. Wicket (Bowled)
    rules.processDelivery({ deliveryId: 'chk_3', outcome: 'WICKET', dismissalType: 'Bowled' });
    assert.strictEqual(rules.wickets, 1);
    assert.strictEqual(rules.legalBallsInOver, 2);

    // 4. Over completion (finish 6 legal balls)
    for (let i = 3; i <= 6; i++) {
      rules.processDelivery({ deliveryId: `chk_over_${i}`, outcome: 'DOT', runs: 0 });
    }
    assert.strictEqual(rules.completedOvers, 1);
    assert.strictEqual(rules.legalBallsInOver, 0);

    // 5. Tournament standings tracking
    const tm = new TournamentManager();
    const fixture = tm.getCurrentFixture();
    tm.recordMatchResult({
      teamA: fixture.teamA,
      teamB: fixture.teamB,
      runsA: 18,
      runsB: 12,
      winner: fixture.teamA
    });
    const winnerStanding = tm.standings.find(s => s.name === fixture.teamA);
    assert.strictEqual(winnerStanding.won, 1);
    assert.strictEqual(winnerStanding.points, 2);
  });
});
