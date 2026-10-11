import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { BallPhysics } from '../src/physics/ballPhysics.js';
import { CameraManager, CAMERA_MODES } from '../src/scene/cameras.js';
import { BATTING_SHOTS, GameState, GAME_STATES } from '../src/gameState.js';

describe('Phase 13.3: Ball Flight, Bat Contact & Impact Feedback Test Suite', () => {
  it('1. Ball visual mesh position strictly follows physics position during flight and after bounce', () => {
    const scene = new THREE.Scene();
    const ball = new BallPhysics(scene);

    ball.setupDelivery({
      deliveryId: 'test_sync_1',
      speedKmph: 140,
      profileId: 'FAST_BOWLER',
      bowlingType: 'Express Fast',
      lineOffset: 0,
      lengthType: 'GOOD'
    });

    ball.deliverBall(new THREE.Vector3(0.4, 2.15, -10.06));

    // Step physics across multiple frames
    for (let i = 0; i < 20; i++) {
      ball.update(0.016, null, null);
      assert.strictEqual(ball.mesh.position.x, ball.position.x);
      assert.strictEqual(ball.mesh.position.y, ball.position.y);
      assert.strictEqual(ball.mesh.position.z, ball.position.z);
    }
  });

  it('2. Differentiated flight presentation: seam orientation and trail reflect bowling profiles', () => {
    const scene = new THREE.Scene();
    const ball = new BallPhysics(scene);

    // Fast Bowler: upright seam (Z rotation 0)
    ball.setupDelivery({ profileId: 'FAST_BOWLER', bowlingType: 'Express Fast', speedKmph: 148 });
    ball.deliverBall();
    assert.strictEqual(ball.seamMesh.rotation.z, 0);
    assert.strictEqual(ball.trailLine.material.color.getHex(), 0xffffff);

    // Swing Bowler: canted seam
    ball.resetToBowlerHand();
    ball.setupDelivery({ profileId: 'SWING_BOWLER', bowlingType: 'Swing Maestro', speedKmph: 130, swing: 0.35 });
    ball.deliverBall();
    assert.notStrictEqual(ball.seamMesh.rotation.z, 0);
    assert.strictEqual(ball.trailLine.material.color.getHex(), 0x80d8ff);

    // Spin Bowler: high-RPM cocked seam orientation
    ball.resetToBowlerHand();
    ball.setupDelivery({ profileId: 'SPIN_BOWLER', bowlingType: 'Crafty Spinner', speedKmph: 92, swing: 0.4 });
    ball.deliverBall();
    assert.ok(Math.abs(ball.seamMesh.rotation.x - 0.45) < 0.01);
    assert.strictEqual(ball.trailLine.material.color.getHex(), 0xffcc80);
  });

  it('3. Pitch bounce triggers turf impact feedback and cleans pre-bounce prediction marker', () => {
    const scene = new THREE.Scene();
    const ball = new BallPhysics(scene);

    ball.setupDelivery({ speedKmph: 130, lengthType: 'GOOD' });
    ball.deliverBall();
    assert.strictEqual(ball.bounceMarker.visible, true);
    assert.strictEqual(ball.bouncePuffMesh.visible, false);

    // Force ball to ground plane
    ball.position.y = 0.05;
    ball.update(0.016, null, null);

    assert.strictEqual(ball.hasBounced, true);
    assert.strictEqual(ball.bounceMarker.visible, false, 'Pre-bounce marker should hide after pitch bounce');
    assert.strictEqual(ball.bouncePuffMesh.visible, true, 'Turf bounce puff should trigger on pitch contact');
    assert.ok(ball.bouncePuffTimer > 0);
  });

  it('4. Contact feedback (sparks, flash ring, trail boost) occurs only for valid contact and distinguishes timing', () => {
    const scene = new THREE.Scene();
    const ball = new BallPhysics(scene);

    ball.deliverBall();

    // PERFECT contact
    ball.applyBatHit({
      shotData: BATTING_SHOTS.STRAIGHT_DRIVE,
      timingQuality: 'PERFECT'
    });

    assert.strictEqual(ball.hasHitBat, true);
    assert.strictEqual(ball.impactMesh.visible, true);
    assert.strictEqual(ball.impactMesh.material.color.getHex(), 0xffea00, 'Gold ring for PERFECT');
    assert.strictEqual(ball.sparkMesh.visible, true, 'Sparks emit on sweet spot contact');
    assert.strictEqual(ball.trailLine.material.color.getHex(), 0xffffff);
    assert.strictEqual(ball.trailLine.material.opacity, 0.75);
  });

  it('5. Edge contacts (EARLY / LATE) trigger orange friction ring and snick feedback', () => {
    const scene = new THREE.Scene();
    const ball = new BallPhysics(scene);

    ball.deliverBall();

    // LATE outside edge
    ball.applyBatHit({
      shotData: BATTING_SHOTS.CUT_SHOT,
      timingQuality: 'LATE'
    });

    assert.strictEqual(ball.hasHitBat, true);
    assert.strictEqual(ball.impactMesh.visible, true);
    assert.strictEqual(ball.impactMesh.material.color.getHex(), 0xff9800, 'Amber/orange friction ring for edge');
    assert.strictEqual(ball.sparkMesh.visible, true);
  });

  it('6. Missed shots strictly do NOT trigger hit effects, sparks, or bat impact', () => {
    const scene = new THREE.Scene();
    const ball = new BallPhysics(scene);

    ball.deliverBall();

    // Apply MISSED
    ball.applyBatHit({
      shotData: BATTING_SHOTS.STRAIGHT_DRIVE,
      timingQuality: 'MISSED'
    });

    assert.strictEqual(ball.hasHitBat, false, 'hasHitBat must remain false on miss');
    assert.strictEqual(ball.impactMesh.visible, false, 'Impact mesh must NOT show on miss');
    assert.strictEqual(ball.sparkMesh.visible, false, 'Sparks must NOT emit on miss');
  });

  it('7. Idempotency guard: a single delivery cannot trigger duplicate impact effects or sounds', () => {
    const scene = new THREE.Scene();
    const ball = new BallPhysics(scene);

    ball.deliverBall();

    ball.applyBatHit({
      shotData: BATTING_SHOTS.STRAIGHT_DRIVE,
      timingQuality: 'PERFECT'
    });

    const initialVel = ball.velocity.clone();
    const initialTimer = ball.impactTimer;

    // Second hit attempt on same delivery must be ignored
    ball.applyBatHit({
      shotData: BATTING_SHOTS.PULL_SHOT,
      timingQuality: 'GOOD'
    });

    assert.strictEqual(ball.velocity.x, initialVel.x);
    assert.strictEqual(ball.velocity.y, initialVel.y);
    assert.strictEqual(ball.velocity.z, initialVel.z);
    assert.strictEqual(ball.impactTimer, initialTimer);
  });

  it('8. Camera micro-trauma applies only on crisp contact and is cleared on delivery reset', () => {
    const camera = new THREE.PerspectiveCamera();
    const cameraManager = new CameraManager(camera, null);

    assert.strictEqual(cameraManager.shakeTimer, 0);

    // Apply micro-shake on PERFECT hit
    cameraManager.applyImpactShake(0.065, 0.12);
    assert.ok(cameraManager.shakeTimer > 0);
    assert.strictEqual(cameraManager.shakeIntensity, 0.065);

    // Advance camera update
    cameraManager.update(0.016, null, null);
    assert.ok(cameraManager.shakeTimer < 0.12);

    // Delivery reset clears shake
    cameraManager.resetToDeliveryStart();
    assert.strictEqual(cameraManager.shakeTimer, 0);
    assert.strictEqual(cameraManager.shakeIntensity, 0);
  });

  it('9. State reset clears all active particle, puff, and visual impact timers', () => {
    const scene = new THREE.Scene();
    const ball = new BallPhysics(scene);

    ball.deliverBall();
    ball.applyBatHit({
      shotData: BATTING_SHOTS.STRAIGHT_DRIVE,
      timingQuality: 'PERFECT'
    });
    ball.showBouncePuff(new THREE.Vector3(0, 0, 4.4));

    assert.ok(ball.impactTimer > 0);
    assert.ok(ball.sparkTimer > 0);
    assert.ok(ball.bouncePuffTimer > 0);

    ball.resetToBowlerHand();

    assert.strictEqual(ball.impactTimer, 0);
    assert.strictEqual(ball.sparkTimer, 0);
    assert.strictEqual(ball.bouncePuffTimer, 0);
    assert.strictEqual(ball.impactMesh.visible, false);
    assert.strictEqual(ball.sparkMesh.visible, false);
    assert.strictEqual(ball.bouncePuffMesh.visible, false);
  });
});
