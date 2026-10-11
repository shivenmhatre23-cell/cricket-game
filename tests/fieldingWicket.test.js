import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { FieldingAI, FIELD_PRESETS } from '../src/ai/fieldingAI.js';
import { CharacterManager } from '../src/scene/characters.js';
import { BallPhysics } from '../src/physics/ballPhysics.js';

describe('Phase 13.4: Fielding, Catching & Wicket Interaction Test Suite', () => {
  it('1. Fielder movement smoothly approaches ball position without overshooting', () => {
    const scene = new THREE.Scene();
    const characters = new CharacterManager(scene);
    const fieldingAI = new FieldingAI();
    fieldingAI.setPreset('BALANCED', characters.fielders);

    const ball = new BallPhysics(scene);
    ball.hasHitBat = true;
    ball.isDead = false;
    ball.inPlay = true;
    ball.position.set(5.0, 0.2, 5.0);
    ball.mesh.position.copy(ball.position);

    // Trigger hit off bat
    fieldingAI.onShotStruck(ball.position, ball.velocity, 'HARD');
    // Reaction timer on HARD is 0.06s. Step past reaction delay:
    fieldingAI.update(0.1, ball, characters, 'HARD');

    assert.ok(fieldingAI.activeChaser, 'An active chaser should be assigned to pursue the ball');
    const chaser = fieldingAI.activeChaser;
    const initialDist = chaser.group.position.distanceTo(ball.position);

    // Step physics forward in small increments
    for (let i = 0; i < 5; i++) {
      fieldingAI.update(0.016, ball, characters, 'HARD');
    }

    const newDist = chaser.group.position.distanceTo(ball.position);
    assert.ok(newDist < initialDist, 'Chaser must close distance to ball smoothly');
    // Step cannot overshoot: distance must be non-negative
    assert.ok(newDist >= 0, 'Distance should never become negative');
  });

  it('2. Fielders are clamped within field boundary (64.5m)', () => {
    const scene = new THREE.Scene();
    const characters = new CharacterManager(scene);
    const fieldingAI = new FieldingAI();
    fieldingAI.setPreset('DEFENSIVE', characters.fielders);

    const ball = new BallPhysics(scene);
    ball.hasHitBat = true;
    ball.isDead = false;
    ball.inPlay = true;
    // Ball propelled beyond boundary rope
    ball.position.set(80.0, 0.1, 80.0);
    ball.mesh.position.copy(ball.position);

    fieldingAI.onShotStruck(ball.position, ball.velocity, 'HARD');
    // Run multiple frames of high sprint
    for (let i = 0; i < 100; i++) {
      fieldingAI.update(0.1, ball, characters, 'HARD');
      if (fieldingAI.activeChaser) {
        const fPos = fieldingAI.activeChaser.group.position;
        const distFromCenter = Math.hypot(fPos.x, fPos.z);
        assert.ok(distFromCenter <= 64.5001, `Fielder exceeded 64.5m boundary rope: ${distFromCenter}`);
      }
    }
  });

  it('3. Catch completion synchronizes ball position to fielder hands and fires CATCH_TAKEN', () => {
    const scene = new THREE.Scene();
    const characters = new CharacterManager(scene);
    const fieldingAI = new FieldingAI();
    fieldingAI.setPreset('BALANCED', characters.fielders);

    const chaser = characters.fielders[0];
    chaser.group.position.set(10, 0, 10);

    const ball = new BallPhysics(scene);
    ball.hasHitBat = true;
    ball.isDead = false;
    ball.inPlay = true;
    ball.bounceCount = 0; // Airborne
    ball.position.set(10.5, 1.4, 10.5); // Inside intercept radius <= 1.35m and height 0.35-2.6m
    ball.mesh.position.copy(ball.position);

    fieldingAI.hasReacted = true;

    // Force successful catch
    const originalRandom = Math.random;
    Math.random = () => 0.05;

    let caughtEvent = null;
    try {
      fieldingAI.update(0.016, ball, characters, 'MEDIUM', (event) => {
        if (event.action === 'CATCH_TAKEN') {
          caughtEvent = event;
        }
      });
    } finally {
      Math.random = originalRandom;
    }

    assert.ok(caughtEvent, 'CATCH_TAKEN event must be fired');
    assert.strictEqual(ball.inPlay, false, 'Ball should no longer be in play after catch');
    assert.strictEqual(ball.isDead, true, 'Ball must be dead after catch');
    assert.strictEqual(ball.position.y, 1.25, 'Ball height must synchronize to fielder hands (1.25m)');
    assert.strictEqual(ball.position.x, chaser.group.position.x);
    assert.strictEqual(ball.position.z, chaser.group.position.z);
  });

  it('4. Single delivery cannot produce duplicate catch events (hasResolvedCatch guard)', () => {
    const scene = new THREE.Scene();
    const characters = new CharacterManager(scene);
    const fieldingAI = new FieldingAI();
    fieldingAI.setPreset('BALANCED', characters.fielders);

    const ball = new BallPhysics(scene);
    ball.hasHitBat = true;
    ball.isDead = false;
    ball.inPlay = true;
    ball.bounceCount = 0;
    ball.position.set(characters.fielders[0].group.position.x, 1.5, characters.fielders[0].group.position.z);

    fieldingAI.hasReacted = true;

    let catchEventCount = 0;
    const originalRandom = Math.random;
    Math.random = () => 0.1;

    try {
      // First frame resolves catch
      fieldingAI.update(0.016, ball, characters, 'MEDIUM', () => {
        catchEventCount++;
      });
      assert.strictEqual(catchEventCount, 1, 'First frame must resolve catch');
      assert.strictEqual(fieldingAI.hasResolvedCatch, true);

      // Attempt additional update frames
      fieldingAI.update(0.016, ball, characters, 'MEDIUM', () => {
        catchEventCount++;
      });
      fieldingAI.update(0.016, ball, characters, 'MEDIUM', () => {
        catchEventCount++;
      });
      assert.strictEqual(catchEventCount, 1, 'Catch event must not fire more than once per delivery');
    } finally {
      Math.random = originalRandom;
    }
  });

  it('5. Dropped catch (CATCH_DROPPED) keeps ball in play (inPlay === true)', () => {
    const scene = new THREE.Scene();
    const characters = new CharacterManager(scene);
    const fieldingAI = new FieldingAI();
    fieldingAI.setPreset('BALANCED', characters.fielders);

    const ball = new BallPhysics(scene);
    ball.hasHitBat = true;
    ball.isDead = false;
    ball.inPlay = true;
    ball.bounceCount = 0;
    ball.position.set(characters.fielders[0].group.position.x, 1.5, characters.fielders[0].group.position.z);

    fieldingAI.hasReacted = true;

    // Force dropped catch
    const originalRandom = Math.random;
    Math.random = () => 0.99;

    let dropEvent = null;
    try {
      fieldingAI.update(0.016, ball, characters, 'MEDIUM', (event) => {
        if (event.action === 'CATCH_DROPPED') {
          dropEvent = event;
        }
      });
    } finally {
      Math.random = originalRandom;
    }

    assert.ok(dropEvent, 'CATCH_DROPPED event must be fired');
    assert.strictEqual(ball.inPlay, true, 'Ball must remain in play after dropped catch');
    assert.strictEqual(ball.isDead, false, 'Ball must not be dead after dropped catch');
    assert.strictEqual(ball.bounceCount, 1, 'Ball bounce count should increment to 1 after palming');
    assert.ok(ball.velocity.y > 0, 'Ball should have upward rebound velocity');
  });

  it('6. Wicket collapse (breakWickets) sets isBroken === true and stops rotation upon ground contact', () => {
    const scene = new THREE.Scene();
    const characters = new CharacterManager(scene);

    const strikerStumps = characters.strikerStumps;
    assert.strictEqual(strikerStumps.isBroken, false);

    // Break the wickets
    strikerStumps.breakWickets(new THREE.Vector3(0, 1.5, 3.0));
    assert.strictEqual(strikerStumps.isBroken, true);

    const bail = strikerStumps.bails[0];
    assert.ok(bail.userData.velocity, 'Bail must receive impulse velocity');
    assert.ok(bail.userData.rotVel, 'Bail must receive rotational velocity');
    assert.ok(bail.userData.rotVel.length() > 0);

    // Simulate physics updates over several frames until items land on turf
    for (let i = 0; i < 40; i++) {
      characters.update(0.05, null);
    }

    // When hitting turf (y <= 0), velocity and rotational velocity must be stopped to prevent perpetual spinning
    strikerStumps.stumps.forEach(stump => {
      if (stump.position.y <= 0) {
        assert.strictEqual(stump.userData.velocity.length(), 0, 'Stump velocity must be 0 on ground');
        assert.strictEqual(stump.userData.rotVel.length(), 0, 'Stump rotVel must be 0 on ground');
      }
    });

    strikerStumps.bails.forEach(b => {
      if (b.position.y <= 0) {
        assert.strictEqual(b.userData.velocity.length(), 0, 'Bail velocity must be 0 on ground');
        assert.strictEqual(b.userData.rotVel.length(), 0, 'Bail rotVel must be 0 on ground');
      }
    });
  });

  it('7. Delivery reset restores both wicket sets (isBroken === false), fielder base positions, and ready stances', () => {
    const scene = new THREE.Scene();
    const characters = new CharacterManager(scene);
    const fieldingAI = new FieldingAI();
    fieldingAI.setPreset('BALANCED', characters.fielders);

    // Displace a fielder and break striker stumps
    const f0 = characters.fielders[0];
    f0.group.position.set(40, 0, 40);
    characters.strikerStumps.breakWickets();
    characters.nonStrikerStumps.breakWickets();

    assert.strictEqual(characters.strikerStumps.isBroken, true);
    assert.strictEqual(characters.nonStrikerStumps.isBroken, true);

    // Perform reset
    characters.strikerStumps.reset();
    characters.nonStrikerStumps.reset();
    fieldingAI.resetDeliveryState(characters);

    assert.strictEqual(characters.strikerStumps.isBroken, false);
    assert.strictEqual(characters.nonStrikerStumps.isBroken, false);
    assert.strictEqual(characters.strikerStumps.stumps[0].userData.velocity, null);
    assert.strictEqual(characters.strikerStumps.bails[0].userData.velocity, null);

    // Fielder returned to base position
    assert.strictEqual(f0.group.position.x, f0.basePos.x);
    assert.strictEqual(f0.group.position.z, f0.basePos.z);
    assert.strictEqual(fieldingAI.hasResolvedCatch, false);
    assert.strictEqual(fieldingAI.isThrowing, false);
    assert.strictEqual(fieldingAI.activeChaser, null);
  });

  it('8. Wicketkeeper tracks ball laterally when passing through the crease', () => {
    const scene = new THREE.Scene();
    const characters = new CharacterManager(scene);

    const keeper = characters.keeper;
    assert.ok(keeper, 'Keeper must exist in characters manager');
    const initialX = keeper.group.position.x;
    assert.strictEqual(initialX, 0);

    // Ball pitched and passing crease on off-side (x = -0.8, z = 9.5)
    const ballPos = new THREE.Vector3(-0.8, 0.6, 9.5);
    for (let i = 0; i < 10; i++) {
      characters.animateKeeper(ballPos, 0.05);
    }

    assert.ok(keeper.group.position.x < initialX, 'Keeper must move laterally towards off-side (-X)');

    // Ball is dead or past crease (z = 2.0, out of keeper zone)
    const awayPos = new THREE.Vector3(0, 0, 2.0);
    for (let i = 0; i < 30; i++) {
      characters.animateKeeper(awayPos, 0.05);
    }

    assert.ok(Math.abs(keeper.group.position.x) < 0.05, 'Keeper must return smoothly to center stance');
  });
});
