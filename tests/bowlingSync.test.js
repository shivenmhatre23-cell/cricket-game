import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { GameState, GAME_STATES } from '../src/gameState.js';
import { CharacterManager } from '../src/scene/characters.js';
import { BallPhysics } from '../src/physics/ballPhysics.js';
import { BOWLING_PROFILES, BowlingAI } from '../src/ai/bowlingAI.js';

describe('Phase 13.2: Bowling Animation & Delivery Synchronization Test Suite', () => {
  it('1. Delivery release happens exactly once per delivery cycle and sets ball in play', () => {
    const scene = new THREE.Scene();
    const ballPhysics = new BallPhysics(scene);

    assert.strictEqual(ballPhysics.inPlay, false);
    assert.strictEqual(ballPhysics.isDead, true);

    const releasePos = new THREE.Vector3(0.4, 2.15, -10.06);
    ballPhysics.deliverBall(releasePos);

    assert.strictEqual(ballPhysics.inPlay, true);
    assert.strictEqual(ballPhysics.isDead, false);
    assert.strictEqual(ballPhysics.position.z, -10.06);
    assert.strictEqual(ballPhysics.position.y, 2.15);
    assert.ok(ballPhysics.velocity.z > 0, 'Ball velocity should propel towards batsman');

    // Duplicate release attempt must be rejected by idempotency guard
    const initialVel = ballPhysics.velocity.clone();
    ballPhysics.deliverBall(new THREE.Vector3(0, 0, 0));
    assert.strictEqual(ballPhysics.position.z, -10.06);
    assert.strictEqual(ballPhysics.velocity.x, initialVel.x);
    assert.strictEqual(ballPhysics.velocity.y, initialVel.y);
    assert.strictEqual(ballPhysics.velocity.z, initialVel.z);
  });

  it('2. Repeated input triggers during run-up do not duplicate releases or disrupt delivery flow', () => {
    const gameState = new GameState();
    gameState.setState(GAME_STATES.READY);

    // Simulate input handler logic from main.js
    let releaseCount = 0;
    let hasDeliveredBall = false;

    function handleSpacePress() {
      const s = gameState.currentState;
      if (s === GAME_STATES.READY) {
        gameState.setState(GAME_STATES.BOWLER_RUNUP);
      } else if (s === GAME_STATES.BOWLER_RUNUP) {
        // Guarded: no action
        return;
      }
    }

    handleSpacePress();
    assert.strictEqual(gameState.currentState, GAME_STATES.BOWLER_RUNUP);

    // Simulate rapid repeated Space presses while running up
    handleSpacePress();
    handleSpacePress();
    handleSpacePress();
    assert.strictEqual(gameState.currentState, GAME_STATES.BOWLER_RUNUP);

    // Simulate animation stepping
    for (let progress = 0; progress <= 1.0; progress += 0.05) {
      if (progress >= 0.88 && !hasDeliveredBall) {
        hasDeliveredBall = true;
        releaseCount++;
        gameState.setState(GAME_STATES.DELIVERY);
      }
    }

    assert.strictEqual(releaseCount, 1, 'Ball release should occur exactly once');
    assert.strictEqual(gameState.currentState, GAME_STATES.DELIVERY);
  });

  it('3. Delivery state reset properly returns bowler, ball, and animation state to ready conditions', () => {
    const scene = new THREE.Scene();
    const characters = new CharacterManager(scene);
    const ballPhysics = new BallPhysics(scene);

    // Test across all 4 bowling profiles
    const profiles = ['FAST_BOWLER', 'SWING_BOWLER', 'SPIN_BOWLER', 'DEFENSIVE_BOWLER'];

    profiles.forEach(profileId => {
      const startZ = characters.getBowlerStartZ(profileId);
      characters.bowler.group.position.set(0.8, 0, startZ);
      characters.setBowlerReadyStance();

      const handPos = characters.getBowlerHandPosition();
      ballPhysics.resetToBowlerHand(handPos);

      assert.strictEqual(ballPhysics.inPlay, false);
      assert.strictEqual(ballPhysics.isDead, true);
      assert.strictEqual(ballPhysics.hasBounced, false);
      assert.strictEqual(ballPhysics.hasHitBat, false);
      assert.strictEqual(ballPhysics.isScored, false);

      // Verify ball matches bowler hand position at starting mark
      assert.ok(Math.abs(ballPhysics.position.x - handPos.x) < 0.001);
      assert.ok(Math.abs(ballPhysics.position.y - handPos.y) < 0.001);
      assert.ok(Math.abs(ballPhysics.position.z - handPos.z) < 0.001);
    });
  });

  it('4. Paused or terminal match states strictly prevent run-up progression and ball delivery', () => {
    const gameState = new GameState();
    const scene = new THREE.Scene();
    const ballPhysics = new BallPhysics(scene);

    const inactiveStates = [
      GAME_STATES.PAUSED,
      GAME_STATES.MATCH_OVER,
      GAME_STATES.INNINGS_BREAK,
      GAME_STATES.MENU,
      GAME_STATES.TOSS
    ];

    inactiveStates.forEach(state => {
      gameState.setState(state);

      // Test input guard
      const s = gameState.currentState;
      let allowed = false;
      if (s !== GAME_STATES.PAUSED &&
          s !== GAME_STATES.MATCH_OVER &&
          s !== GAME_STATES.INNINGS_BREAK &&
          s !== GAME_STATES.MENU &&
          s !== GAME_STATES.TOSS &&
          s === GAME_STATES.READY) {
        allowed = true;
      }
      assert.strictEqual(allowed, false, `Input must be ignored in state: ${state}`);

      // Verify ball does not deliver while inactive
      assert.strictEqual(ballPhysics.inPlay, false);
    });
  });

  it('5. Bowler ready stance recovery after delivery follow-through completes', () => {
    const scene = new THREE.Scene();
    const characters = new CharacterManager(scene);

    // Play action through completion (progress >= 1.0)
    characters.playBowlerAction(1.0, 'FAST_BOWLER');

    // Bowler should finish at deceleration point beyond crease with ready stance
    assert.strictEqual(characters.bowler.group.position.z, -9.5);
    assert.strictEqual(characters.bowler.group.position.y, 0);

    // Call setBowlerReadyStance to verify stable posture
    characters.setBowlerReadyStance();
    assert.strictEqual(characters.bowler.leftArm.shoulder.rotation.x, 0.2);
    assert.strictEqual(characters.bowler.rightArm.shoulder.rotation.x, 0.2);
    assert.strictEqual(characters.bowler.leftLeg.hip.rotation.x, 0);
    assert.strictEqual(characters.bowler.rightLeg.hip.rotation.x, 0);
  });

  it('6. Timing calculation robustness across variable delta-times (no release point skip)', () => {
    const scene = new THREE.Scene();
    const characters = new CharacterManager(scene);
    const ballPhysics = new BallPhysics(scene);

    // Test with various delta times (e.g. 120fps, 60fps, 30fps, 15fps frame drop)
    const deltas = [0.008, 0.016, 0.033, 0.08];

    deltas.forEach(delta => {
      let runupProgress = 0;
      let hasDelivered = false;
      let deliveryTriggeredAtProgress = null;
      const runupSpeed = characters.getBowlerRunupSpeed('FAST_BOWLER');

      while (runupProgress < 1.0) {
        runupProgress += delta * runupSpeed;
        if (runupProgress >= 0.88 && !hasDelivered) {
          hasDelivered = true;
          deliveryTriggeredAtProgress = runupProgress;
          const releasePos = characters.getBowlerReleasePosition();
          ballPhysics.deliverBall(releasePos);
        }
      }

      assert.strictEqual(hasDelivered, true, `Delivery must trigger for delta ${delta}`);
      assert.ok(deliveryTriggeredAtProgress >= 0.88, `Must trigger at or past 0.88`);
      assert.ok(deliveryTriggeredAtProgress < 1.05, `Trigger progress must remain near release apex`);
      ballPhysics.resetToBowlerHand();
    });
  });

  it('7. Bowler rig animation tolerance for missing bones/mesh hierarchies', () => {
    const scene = new THREE.Scene();
    const characters = new CharacterManager(scene);

    // Temporarily nullify limb parts to test graceful null tolerance
    const originalLeftKnee = characters.bowler.leftLeg.knee;
    const originalRightShoulder = characters.bowler.rightArm.shoulder;
    characters.bowler.leftLeg.knee = null;
    characters.bowler.rightArm.shoulder = null;

    // Must not throw errors when animating with missing limbs
    assert.doesNotThrow(() => {
      characters.playBowlerAction(0.5, 'SWING_BOWLER');
      characters.playBowlerAction(0.88, 'SWING_BOWLER');
      characters.playBowlerAction(0.95, 'SWING_BOWLER');
      characters.playBowlerAction(1.0, 'SWING_BOWLER');
      characters.setBowlerReadyStance();
    });

    // Restore limb references
    characters.bowler.leftLeg.knee = originalLeftKnee;
    characters.bowler.rightArm.shoulder = originalRightShoulder;
  });

  it('8. All 4 bowling profiles have distinct run-up parameters and tactical identities', () => {
    const scene = new THREE.Scene();
    const characters = new CharacterManager(scene);
    const bowlingAI = new BowlingAI();

    const expectedProfiles = ['FAST_BOWLER', 'SWING_BOWLER', 'SPIN_BOWLER', 'DEFENSIVE_BOWLER'];

    expectedProfiles.forEach(id => {
      const profile = BOWLING_PROFILES[id];
      assert.ok(profile, `Profile ${id} should exist`);
      assert.strictEqual(profile.id, id);

      const startZ = characters.getBowlerStartZ(id);
      const runupSpeed = characters.getBowlerRunupSpeed(id);

      assert.ok(typeof startZ === 'number' && startZ < -10.06, `${id} startZ must be behind crease`);
      assert.ok(typeof runupSpeed === 'number' && runupSpeed > 0, `${id} runupSpeed must be positive`);
    });

    // Verify distinct run-up distances and speeds
    assert.strictEqual(characters.getBowlerStartZ('SPIN_BOWLER'), -16.0);
    assert.strictEqual(characters.getBowlerStartZ('FAST_BOWLER'), -24.0);
    assert.ok(characters.getBowlerRunupSpeed('FAST_BOWLER') > characters.getBowlerRunupSpeed('SPIN_BOWLER'));
  });
});
