// Computer-Controlled Fielding AI Engine
// Realistic movement, reaction delay, catch attempts, pickups, and return throws

import * as THREE from 'three';

export const FIELD_PRESETS = {
  BALANCED: [
    { name: '1st Slip', x: -2.6, z: 12.2, role: 'SLIP' },
    { name: 'Gully', x: -9.5, z: 9.8, role: 'RING' },
    { name: 'Point', x: -18.5, z: 6.5, role: 'RING' },
    { name: 'Cover', x: -22.5, z: -2.0, role: 'RING' },
    { name: 'Mid Off', x: -8.0, z: -14.0, role: 'RING' },
    { name: 'Mid On', x: 8.0, z: -14.0, role: 'RING' },
    { name: 'Mid Wicket', x: 22.5, z: -2.5, role: 'RING' },
    { name: 'Square Leg', x: 20.0, z: 8.5, role: 'RING' },
    { name: 'Fine Leg', x: 16.5, z: 24.5, role: 'DEEP' },
    { name: 'Third Man', x: -18.5, z: 26.0, role: 'DEEP' }
  ],
  ATTACKING: [
    { name: '1st Slip', x: -2.4, z: 12.0, role: 'SLIP' },
    { name: '2nd Slip', x: -4.2, z: 11.5, role: 'SLIP' },
    { name: 'Gully', x: -8.0, z: 9.0, role: 'RING' },
    { name: 'Silly Point', x: -6.5, z: 7.0, role: 'CLOSE' },
    { name: 'Short Leg', x: 6.5, z: 7.0, role: 'CLOSE' },
    { name: 'Cover', x: -18.0, z: -2.0, role: 'RING' },
    { name: 'Mid Off', x: -6.5, z: -12.0, role: 'RING' },
    { name: 'Mid On', x: 6.5, z: -12.0, role: 'RING' },
    { name: 'Mid Wicket', x: 16.0, z: -2.0, role: 'RING' },
    { name: 'Fine Leg', x: 12.0, z: 22.0, role: 'RING' }
  ],
  DEFENSIVE: [
    { name: 'Deep Point', x: -38.0, z: 12.0, role: 'DEEP' },
    { name: 'Deep Cover', x: -45.0, z: -10.0, role: 'DEEP' },
    { name: 'Long Off', x: -24.0, z: -46.0, role: 'DEEP' },
    { name: 'Long On', x: 24.0, z: -46.0, role: 'DEEP' },
    { name: 'Deep Mid Wicket', x: 44.0, z: -12.0, role: 'DEEP' },
    { name: 'Deep Square Leg', x: 38.0, z: 15.0, role: 'DEEP' },
    { name: 'Deep Fine Leg', x: 26.0, z: 42.0, role: 'DEEP' },
    { name: 'Third Man', x: -26.0, z: 42.0, role: 'DEEP' },
    { name: 'Cover', x: -18.0, z: -2.0, role: 'RING' },
    { name: 'Mid Wicket', x: 18.0, z: -2.0, role: 'RING' }
  ]
};

export class FieldingAI {
  constructor() {
    this.currentPreset = 'BALANCED';
    this.fielders = [];
    this.activeChaser = null;
    this.reactionTimer = 0;
    this.hasReacted = false;
    this.isThrowing = false;
    this.throwProgress = 0;
    this.throwStart = new THREE.Vector3();
    this.throwTarget = new THREE.Vector3();
    this.hasResolvedCatch = false;
  }

  // Set field placement preset
  setPreset(presetKey = 'BALANCED', fielders = []) {
    this.currentPreset = presetKey;
    const layout = FIELD_PRESETS[presetKey] || FIELD_PRESETS.BALANCED;

    fielders.forEach((f, idx) => {
      if (layout[idx]) {
        f.basePos.set(layout[idx].x, 0, layout[idx].z);
        f.group.position.copy(f.basePos);
        f.name = layout[idx].name;
        f.group.lookAt(0, 0.9, 9.15); // Look towards striker
      }
    });
  }

  // Reset fielding state and return all fielders to ready stance
  resetDeliveryState(characters) {
    this.activeChaser = null;
    this.reactionTimer = 0;
    this.hasReacted = false;
    this.isThrowing = false;
    this.throwProgress = 0;
    this.hasResolvedCatch = false;

    if (characters && characters.fielders) {
      characters.fielders.forEach(f => {
        if (f.basePos) {
          f.group.position.copy(f.basePos);
          f.group.lookAt(0, 0.9, 9.15);
        }
        if (typeof characters.setFielderStance === 'function') {
          characters.setFielderStance(f);
        }
      });
    }
  }

  // Called immediately when a shot is struck off the bat
  onShotStruck(ballPosition, ballVelocity, difficulty = 'MEDIUM') {
    this.activeChaser = null;
    this.isThrowing = false;
    this.throwProgress = 0;
    this.hasResolvedCatch = false;

    // Reaction delay based on difficulty
    if (difficulty === 'EASY') this.reactionTimer = 0.32; // 320ms reaction delay
    else if (difficulty === 'HARD') this.reactionTimer = 0.06; // 60ms reaction delay
    else this.reactionTimer = 0.16; // 160ms reaction delay

    this.hasReacted = false;
  }

  // Update fielders chasing ball
  update(delta, ball, characters, difficulty = 'MEDIUM', onFielderAction) {
    if (!ball || !ball.hasHitBat) return;
    if (ball.isDead && !this.isThrowing) return;

    // 1. Reaction Delay Countdown
    if (!this.hasReacted) {
      this.reactionTimer -= delta;
      if (this.reactionTimer <= 0) {
        this.hasReacted = true;
      } else {
        return;
      }
    }

    // 2. Animate Throw if ball is already retrieved
    if (this.isThrowing) {
      this.throwProgress += delta * 2.8; // throw flight time ~0.35s
      const currentPos = new THREE.Vector3().lerpVectors(this.throwStart, this.throwTarget, Math.min(1.0, this.throwProgress));
      // Parabolic arc for throw
      currentPos.y += Math.sin(this.throwProgress * Math.PI) * 2.2;
      ball.position.copy(currentPos);
      ball.mesh.position.copy(currentPos);

      if (this.throwProgress >= 1.0) {
        this.isThrowing = false;
        ball.inPlay = false;
        ball.isDead = true;

        if (onFielderAction) {
          onFielderAction({
            action: 'THROW_COMPLETED',
            target: this.throwTarget
          });
        }
      }
      return;
    }

    // 3. Find closest fielder to intercept ball
    if (!characters || !characters.fielders || characters.fielders.length === 0) return;
    const sprintSpeed = difficulty === 'EASY' ? 6.2 : (difficulty === 'HARD' ? 8.6 : 7.4);

    let closest = null;
    let minDist = Infinity;

    characters.fielders.forEach(f => {
      const d = f.group.position.distanceTo(ball.position);
      if (d < minDist) {
        minDist = d;
        closest = f;
      }
    });

    if (closest) {
      this.activeChaser = closest;
      const fPos = closest.group.position;
      const bPos = ball.position;

      const toBall = new THREE.Vector3(bPos.x - fPos.x, 0, bPos.z - fPos.z);
      const horizontalDist = toBall.length();

      if (horizontalDist > 1.35) {
        toBall.normalize();
        // Prevent sudden overshooting by capping step to remaining distance
        const step = Math.min(horizontalDist - 0.5, sprintSpeed * delta);
        if (step > 0) {
          fPos.addScaledVector(toBall, step);
        }

        // Clamp fielder within boundary rope (radius 64.5m)
        const distFromCenter = Math.hypot(fPos.x, fPos.z);
        if (distFromCenter > 64.5) {
          fPos.x = (fPos.x / distFromCenter) * 64.5;
          fPos.z = (fPos.z / distFromCenter) * 64.5;
        }

        closest.group.lookAt(bPos.x, 0.9, bPos.z);

        // Animate running stride
        if (characters && typeof characters.animateFielderRun === 'function') {
          characters.animateFielderRun(closest, delta, sprintSpeed);
        }
      } else {
        // --- Intercept Zone Reached! ---
        const isAirborne = ball.bounceCount === 0 && bPos.y >= 0.35 && bPos.y <= 2.6;

        if (isAirborne && !this.hasResolvedCatch) {
          this.hasResolvedCatch = true;
          // --- Catch Attempt! ---
          let catchChance = 0.88;
          if (difficulty === 'EASY') catchChance = 0.70; // 30% drop rate on easy
          else if (difficulty === 'HARD') catchChance = 0.96; // 96% catch rate on hard

          const caught = Math.random() < catchChance;

          if (caught) {
            // SUCCESSFUL CATCH!
            ball.inPlay = false;
            ball.isDead = true;

            // Ball to hands synchronization
            ball.position.set(fPos.x, 1.25, fPos.z);
            ball.mesh.position.copy(ball.position);

            if (characters && typeof characters.setFielderCatchStance === 'function') {
              characters.setFielderCatchStance(closest);
            }

            if (onFielderAction) {
              onFielderAction({
                action: 'CATCH_TAKEN',
                fielderName: closest.name
              });
            }
          } else {
            // DROPPED CATCH! Ball rebounds softly off palms and rolls
            ball.bounceCount = 1;
            ball.velocity.multiplyScalar(0.35);
            ball.velocity.y = 1.6;
            if (onFielderAction) {
              onFielderAction({
                action: 'CATCH_DROPPED',
                fielderName: closest.name
              });
            }
          }
        } else if (!isAirborne) {
          // --- Ground Ball Pickup & Throw ---
          ball.inPlay = false;
          this.isThrowing = true;
          this.throwProgress = 0;
          this.throwStart.copy(bPos);

          // Ball to fielder hands
          ball.position.set(fPos.x, 0.5, fPos.z);
          ball.mesh.position.copy(ball.position);

          // Choose closest wickets to throw to (Keeper wickets at Z=10.06 or Bowler wickets at Z=-10.06)
          const distToStrikerWickets = bPos.distanceTo(new THREE.Vector3(0, 0.7, 10.06));
          const distToBowlerWickets = bPos.distanceTo(new THREE.Vector3(0, 0.7, -10.06));

          if (distToStrikerWickets < distToBowlerWickets) {
            this.throwTarget.set(0, 0.7, 10.06);
          } else {
            this.throwTarget.set(0, 0.7, -10.06);
          }

          closest.group.lookAt(this.throwTarget);

          // Calculate completed runs based on distance
          const distFromPitch = Math.sqrt(bPos.x * bPos.x + bPos.z * bPos.z);
          const completedRuns = distFromPitch > 36.0 ? 2 : 1;

          if (onFielderAction) {
            onFielderAction({
              action: 'GROUND_PICKUP',
              fielderName: closest.name,
              runs: completedRuns
            });
          }
        }
      }
    }
  }
}
