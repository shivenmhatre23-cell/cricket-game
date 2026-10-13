import * as THREE from 'three';

/**
 * RiggedAnimationController
 * Reusable, gameplay-synchronized skeletal animation controller for the 83-bone
 * rigged cricket player model (Ready Player Me / Sketchfab hierarchy).
 *
 * Designed to provide:
 * 1. Safe additive rotation offsets relative to bind/rest pose (preventing rotation drift).
 * 2. Dedicated kinematic batting swing curves for 6 distinct cricket shots.
 * 3. 4-phase bowling action with authoritative ball release synchronization.
 * 4. Stance management, graceful bone fallback, and zero-allocation updates.
 */
export class RiggedAnimationController {
  constructor(playerObj) {
    this.player = playerObj;
    this.bones = playerObj?.riggedBones || {};
    this.restRotations = new Map();
    this.boneEntries = [];

    // Cache initial bind-pose rotations for all discovered bones
    for (const [name, bone] of Object.entries(this.bones)) {
      if (bone && bone.isBone) {
        const restRot = bone.userData?.initialRot ? bone.userData.initialRot.clone() : bone.rotation.clone();
        this.restRotations.set(name, restRot);
        bone.userData.restRot = restRot;
        this.boneEntries.push({ name, bone, rest: restRot });
      }
    }

    // State machine
    this.activeAnimation = null; // 'BAT_SWING' | 'BOWLING_ACTION' | null
    this.currentStance = 'IDLE';
    this.progress = 0;
    this.isPlaying = false;
    this.lastTriggerTime = 0;

    // Fast bone lookup references to eliminate string hashing and traversal
    this.hips = this.bones['Hips_01'];
    this.spine = this.bones['Spine_02'];
    this.spine1 = this.bones['Spine1_03'];
    this.spine2 = this.bones['Spine2_04'];
    this.neck = this.bones['Neck_05'];
    this.head = this.bones['Head_06'];

    this.leftShoulder = this.bones['LeftShoulder_010'];
    this.leftArm = this.bones['LeftArm_011'];
    this.leftForearm = this.bones['LeftForeArm_012'];
    this.leftHand = this.bones['LeftHand_013'];

    this.rightShoulder = this.bones['RightShoulder_033'];
    this.rightArm = this.bones['RightArm_034'];
    this.rightForearm = this.bones['RightForeArm_035'];
    this.rightHand = this.bones['RightHand_036'];

    this.leftUpLeg = this.bones['LeftUpLeg_057'];
    this.leftLeg = this.bones['LeftLeg_058'];
    this.leftFoot = this.bones['LeftFoot_059'];

    this.rightUpLeg = this.bones['RightUpLeg_062'];
    this.rightLeg = this.bones['RightLeg_063'];
    this.rightFoot = this.bones['RightFoot_064'];
  }

  // Safely apply Euler offset relative to the cached rest pose (zero-allocation direct lookup)
  applyOffset(bone, dx = 0, dy = 0, dz = 0) {
    if (!bone) return;
    const rest = bone.userData?.restRot || this.restRotations.get(bone.name);
    if (!rest) return;
    bone.rotation.set(rest.x + dx, rest.y + dy, rest.z + dz);
  }

  // Reset all bones to rest pose (fast array loop without Object.entries allocations)
  resetToRest() {
    const entries = this.boneEntries;
    for (let i = 0, l = entries.length; i < l; i++) {
      const entry = entries[i];
      if (entry.bone && entry.rest) {
        entry.bone.rotation.set(entry.rest.x, entry.rest.y, entry.rest.z);
      }
    }
    this.activeAnimation = null;
    this.isPlaying = false;
    this.progress = 0;
  }

  // Apply stance pose to the skeletal rig
  applyStance(stanceType) {
    if (this.currentStance === stanceType && !this.isPlaying && !this.activeAnimation) {
      return;
    }
    this.currentStance = stanceType;
    this.resetToRest();

    switch (stanceType) {
      case 'BATSMAN_STANCE':
        // Athletic balanced ready stance: knees flexed, chest forward, bat held high
        this.applyOffset(this.spine, 0, -0.22, 0);
        this.applyOffset(this.spine2, 0.05, -0.15, 0);
        this.applyOffset(this.leftUpLeg, -0.15, 0, 0.05);
        this.applyOffset(this.leftLeg, 0.25, 0, 0);
        this.applyOffset(this.rightUpLeg, -0.1, 0, -0.05);
        this.applyOffset(this.rightLeg, 0.2, 0, 0);
        this.applyOffset(this.leftArm, 0.35, 0, -0.2);
        this.applyOffset(this.leftForearm, -0.25, 0, 0);
        this.applyOffset(this.rightArm, 0.4, 0, 0.15);
        this.applyOffset(this.rightForearm, -0.3, 0, 0);
        this.applyOffset(this.head, 0, 0.35, 0); // Head sighting towards bowler
        break;

      case 'NON_STRIKER_STANCE':
        this.applyOffset(this.leftArm, 0.2, 0, 0);
        this.applyOffset(this.rightArm, 0.2, 0, 0);
        break;

      case 'BOWLER_READY':
        // Upright, balanced athletic stance
        this.applyOffset(this.leftArm, 0.1, 0, 0);
        this.applyOffset(this.rightArm, 0.1, 0, 0);
        break;

      case 'KEEPER_CROUCH':
        // Low center of gravity behind stumps
        this.applyOffset(this.spine, 0.18, 0, 0);
        this.applyOffset(this.leftUpLeg, -0.42, 0, 0.15);
        this.applyOffset(this.leftLeg, 0.7, 0, 0);
        this.applyOffset(this.rightUpLeg, -0.42, 0, -0.15);
        this.applyOffset(this.rightLeg, 0.7, 0, 0);
        this.applyOffset(this.leftArm, 0.35, 0, -0.2);
        this.applyOffset(this.rightArm, 0.35, 0, 0.2);
        break;

      case 'FIELDER_READY':
        this.applyOffset(this.spine, 0.1, 0, 0);
        this.applyOffset(this.leftUpLeg, -0.2, 0, 0.05);
        this.applyOffset(this.leftLeg, 0.3, 0, 0);
        this.applyOffset(this.rightUpLeg, -0.2, 0, -0.05);
        this.applyOffset(this.rightLeg, 0.3, 0, 0);
        this.applyOffset(this.leftArm, 0.25, 0, -0.1);
        this.applyOffset(this.rightArm, 0.25, 0, 0.1);
        break;
    }
  }

  // --- Dynamic Batting Swing Animation (Phase 3) ---
  playBatSwing(progress, shotKey = 'STRAIGHT_DRIVE', shotAngle = Math.PI, timingQuality = null) {
    const p = Math.max(0, Math.min(1.0, progress));
    this.progress = p;

    // Terminal boundaries restore clean batting stance
    if (p <= 0 || p >= 1.0) {
      this.applyStance('BATSMAN_STANCE');
      this.activeAnimation = null;
      this.isPlaying = false;
      return;
    }

    this.activeAnimation = 'BAT_SWING';
    this.isPlaying = true;

    // Continuous swing power curve (sinusoidal bell peaking at contact point)
    const swing = Math.sin(p * Math.PI);

    // Edge feedback tilt for mistimed early or late shots
    let edgeTilt = 0;
    if (timingQuality === 'EARLY') {
      edgeTilt = swing * 0.18;
    } else if (timingQuality === 'LATE') {
      edgeTilt = -swing * 0.18;
    }

    // Common head and shoulder stabilization
    this.applyOffset(this.head, 0, 0.35 * (1 - swing * 0.3), 0);

    switch (shotKey) {
      case 'DEFENSIVE':
        // Compact defensive block: stride forward, soft hands, angled bat down into turf
        this.applyOffset(this.spine, 0.12 * swing, -0.22 + 0.1 * swing, 0);
        this.applyOffset(this.leftUpLeg, -0.15 - swing * 0.3, 0, 0.05);
        this.applyOffset(this.leftLeg, 0.25 + swing * 0.25, 0, 0);
        this.applyOffset(this.rightUpLeg, -0.1, 0, -0.05);
        this.applyOffset(this.rightLeg, 0.2, 0, 0);
        this.applyOffset(this.leftArm, 0.35 - swing * 0.55, 0, -0.2 - swing * 0.25);
        this.applyOffset(this.leftForearm, -0.25 - swing * 0.25, 0, 0);
        this.applyOffset(this.rightArm, 0.4 - swing * 0.55, 0, 0.15 + swing * 0.25);
        this.applyOffset(this.rightForearm, -0.3 - swing * 0.25, 0, 0);
        this.applyOffset(this.rightHand, 0, edgeTilt, -swing * 0.2);
        break;

      case 'STRAIGHT_DRIVE':
        // Classical straight drive: high front elbow, pendulum down the V, full follow-through
        this.applyOffset(this.spine, 0.08 * swing, -0.22 + swing * 0.45, 0);
        this.applyOffset(this.leftUpLeg, -0.15 - swing * 0.35, 0, 0.05);
        this.applyOffset(this.leftLeg, 0.25 + swing * 0.3, 0, 0);
        this.applyOffset(this.rightUpLeg, -0.1, 0, -0.05);
        this.applyOffset(this.leftArm, 0.35 - swing * 1.35, 0, -0.2 - swing * 0.2);
        this.applyOffset(this.leftForearm, -0.25 - swing * 0.4, 0, 0);
        this.applyOffset(this.rightArm, 0.4 - swing * 1.4, 0, 0.15 + swing * 0.45);
        this.applyOffset(this.rightForearm, -0.3 - swing * 0.4, 0, 0);
        this.applyOffset(this.rightHand, -swing * 0.3, edgeTilt, 0);
        break;

      case 'COVER_DRIVE':
        // Leaning off-drive through extra cover: open hips and shoulders, high elbow flow
        this.applyOffset(this.spine, 0.15 * swing, -0.22 - swing * 0.4, 0);
        this.applyOffset(this.leftUpLeg, -0.15 - swing * 0.32, 0, 0.05 + swing * 0.25);
        this.applyOffset(this.leftLeg, 0.25 + swing * 0.28, 0, 0);
        this.applyOffset(this.leftArm, 0.35 - swing * 1.25, 0, -0.2 - swing * 0.35);
        this.applyOffset(this.leftForearm, -0.25 - swing * 0.3, 0, 0);
        this.applyOffset(this.rightArm, 0.4 - swing * 1.3, 0, 0.15 - swing * 0.25);
        this.applyOffset(this.rightForearm, -0.3 - swing * 0.35, 0, 0);
        this.applyOffset(this.rightHand, -swing * 0.25, -swing * 0.3 + edgeTilt, 0);
        break;

      case 'PULL_SHOT':
        // Horizontal cross-bat pull: swivel on back foot towards mid-wicket
        this.applyOffset(this.spine, 0, -0.22 + swing * 0.95, 0);
        this.applyOffset(this.leftUpLeg, -0.15 + swing * 0.15, swing * 0.4, 0.05);
        this.applyOffset(this.rightUpLeg, -0.1 + swing * 0.25, 0, -0.05);
        this.applyOffset(this.leftArm, 0.35 - swing * 0.8, swing * 0.6, -0.2);
        this.applyOffset(this.rightArm, 0.4 - swing * 0.9, swing * 0.7, 0.15);
        this.applyOffset(this.rightForearm, -0.3 - swing * 0.3, 0, 0);
        this.applyOffset(this.rightHand, 0, swing * 0.5 + edgeTilt, 0);
        break;

      case 'CUT_SHOT':
        // Back-foot square cut: rock back & across, high-to-low slashing arc through off-side
        this.applyOffset(this.spine, 0, -0.22 - swing * 0.38, 0);
        this.applyOffset(this.leftUpLeg, -0.15 + swing * 0.1, 0, 0.05);
        this.applyOffset(this.rightUpLeg, -0.1 + swing * 0.28, 0, -0.05);
        this.applyOffset(this.leftArm, 0.35 - swing * 1.1, -swing * 0.3, -0.2);
        this.applyOffset(this.rightArm, 0.4 - swing * 1.25, -swing * 0.4, 0.15 + swing * 0.25);
        this.applyOffset(this.rightForearm, -0.3 - swing * 0.35, 0, 0);
        this.applyOffset(this.rightHand, -swing * 0.3, -swing * 0.4 + edgeTilt, 0);
        break;

      case 'LOFTED_ATTACK':
      default:
        // Explosive upward swing through the line: launching bat high into the sky
        this.applyOffset(this.spine, -swing * 0.18, -0.22 + (shotAngle - Math.PI) * 0.6 * swing, 0);
        this.applyOffset(this.leftUpLeg, -0.15 - swing * 0.3, 0, 0.05);
        this.applyOffset(this.leftLeg, 0.25 + swing * 0.25, 0, 0);
        this.applyOffset(this.leftArm, 0.35 - swing * 1.6, 0, -0.2 + swing * 0.3);
        this.applyOffset(this.leftForearm, -0.25 - swing * 0.45, 0, 0);
        this.applyOffset(this.rightArm, 0.4 - swing * 1.65, 0, 0.15 - swing * 0.2);
        this.applyOffset(this.rightForearm, -0.3 - swing * 0.55, 0, 0);
        this.applyOffset(this.rightHand, -swing * 0.45, edgeTilt, 0);
        break;
    }
  }

  // --- Dynamic Bowling Delivery Animation (Phase 4) ---
  playBowlingAction(progress, profileId = 'FAST_BOWLER') {
    const p = Math.max(0, Math.min(1.0, progress));
    this.progress = p;

    // Terminal boundaries restore clean bowler ready stance
    if (p <= 0 || p >= 1.0) {
      this.applyStance('BOWLER_READY');
      this.activeAnimation = null;
      this.isPlaying = false;
      return;
    }

    this.activeAnimation = 'BOWLING_ACTION';
    this.isPlaying = true;

    const isSpin = profileId === 'SPIN_BOWLER';
    const isSwing = profileId === 'SWING_BOWLER';

    if (p < 0.70) {
      // Phase 1: Approach Run-up (0.0 to 0.70)
      const runNorm = p / 0.70;
      const strideFreq = isSpin ? 4.5 : 6.5;
      const strideCycle = Math.sin(runNorm * Math.PI * strideFreq);
      const legAmp = isSpin ? 0.45 : 0.65;
      const armAmp = isSpin ? 0.4 : 0.65;

      // Leg stride alternation
      this.applyOffset(this.leftUpLeg, strideCycle * legAmp, 0, 0);
      this.applyOffset(this.leftLeg, Math.max(0, -strideCycle * legAmp * 0.9), 0, 0);
      this.applyOffset(this.rightUpLeg, -strideCycle * legAmp, 0, 0);
      this.applyOffset(this.rightLeg, Math.max(0, strideCycle * legAmp * 0.9), 0, 0);

      // Arm pump alternation
      this.applyOffset(this.leftArm, -strideCycle * armAmp, 0, 0.2);
      this.applyOffset(this.rightArm, strideCycle * armAmp, 0, -0.2);
      this.applyOffset(this.leftForearm, -0.4, 0, 0);
      this.applyOffset(this.rightForearm, -0.4, 0, 0);

      // Torso rhythm
      this.applyOffset(this.spine, 0, isSpin ? strideCycle * 0.08 : 0, 0);

    } else if (p < 0.88) {
      // Phase 2: Gather & Windmill Coil into Delivery Stride (0.70 to 0.88)
      const t = (p - 0.70) / 0.18;

      // Front arm sights high toward batsman
      this.applyOffset(this.leftArm, -0.8 * t, 0, 0.25 * t);
      this.applyOffset(this.leftForearm, -0.2 * (1 - t), 0, 0);

      // Bowling arm sweeps circular backswing behind torso
      this.applyOffset(this.rightArm, 0.4 + t * 1.5, 0, -0.4 * t);
      this.applyOffset(this.rightForearm, -0.15, 0, 0);

      // Legs in gather bound
      this.applyOffset(this.leftUpLeg, 0.45 * (1 - t) - 0.2 * t, 0, 0);
      this.applyOffset(this.leftLeg, 0.35 * (1 - t), 0, 0);
      this.applyOffset(this.rightUpLeg, -0.35 * (1 - t) + 0.3 * t, 0, 0);
      this.applyOffset(this.rightLeg, 0.3 * t, 0, 0);

      // Chest turns side-on
      const sideTurn = isSwing ? 0.35 : (isSpin ? 0.25 : 0.2);
      this.applyOffset(this.spine, 0.1 * t, sideTurn * Math.sin(t * Math.PI), 0);

    } else if (p <= 0.92) {
      // Phase 3: Delivery Stride Apex & Ball Release (0.88 to 0.92)
      // Synchronized with ball release point at p = 0.88
      const t = (p - 0.88) / 0.04;

      // Bowling arm sweeps through high vertical overarm apex
      this.applyOffset(this.rightArm, -1.6 - t * 0.5, 0, -0.1);
      this.applyOffset(this.rightForearm, 0, 0, 0);

      // Front arm pulls vigorously down into the ribs
      this.applyOffset(this.leftArm, 0.7 - t * 0.9, 0, 0.25);
      this.applyOffset(this.leftForearm, -0.6 * t, 0, 0);

      // Front leg plants firmly at the crease
      this.applyOffset(this.leftUpLeg, -0.25 - t * 0.1, 0, 0);
      this.applyOffset(this.leftLeg, 0.15, 0, 0);
      this.applyOffset(this.rightUpLeg, 0.35 + t * 0.2, 0, 0);
      this.applyOffset(this.rightLeg, 0.25 * (1 - t), 0, 0);

      // Torso flexes forward into delivery
      this.applyOffset(this.spine, 0.3 * t, 0, 0);

    } else {
      // Phase 4: Follow-Through & Deceleration (0.92 to 1.0)
      const t = (p - 0.92) / 0.08;

      // Bowling arm finishes wrap across left hip
      this.applyOffset(this.rightArm, -1.8 + t * 1.9, 0, 0.3 * (1 - t));
      this.applyOffset(this.rightForearm, -0.35 * (1 - t) - 0.2 * t, 0, 0);
      this.applyOffset(this.leftArm, -0.2 * (1 - t) + 0.1 * t, 0, 0);

      // Rear leg drives forward absorbing momentum
      this.applyOffset(this.rightUpLeg, 0.5 * (1 - t), 0, 0);
      this.applyOffset(this.leftUpLeg, -0.3 * (1 - t), 0, 0);

      // Torso recovers to upright
      this.applyOffset(this.spine, 0.3 * (1 - t), 0, 0);
    }
  }

  // --- 5. Locomotion & Running Animation (Phase 13.9) ---
  playLocomotion(cycleTime, speed = 6.0, isBatsman = false) {
    this.activeAnimation = 'LOCOMOTION';
    this.isPlaying = true;

    const strideCycle = Math.sin(cycleTime);
    const speedNorm = Math.min(1.4, Math.max(0.6, speed / 6.5));
    const legAmp = 0.62 * speedNorm;
    const armAmp = 0.58 * speedNorm;

    // Leg stride alternation
    this.applyOffset(this.leftUpLeg, strideCycle * legAmp, 0, 0);
    this.applyOffset(this.leftLeg, Math.max(0, -strideCycle * legAmp * 0.95), 0, 0);
    this.applyOffset(this.rightUpLeg, -strideCycle * legAmp, 0, 0);
    this.applyOffset(this.rightLeg, Math.max(0, strideCycle * legAmp * 0.95), 0, 0);

    if (isBatsman) {
      // Batsman carries bat anchored to right hand in athletic sprint
      this.applyOffset(this.rightArm, 0.45 + strideCycle * 0.18, 0, 0.15);
      this.applyOffset(this.rightForearm, -0.4, 0, 0);
      this.applyOffset(this.leftArm, -strideCycle * armAmp * 0.9, 0, -0.15);
      this.applyOffset(this.leftForearm, -0.35, 0, 0);
    } else {
      // Fielder sprint with opposing arm pumps
      this.applyOffset(this.leftArm, -strideCycle * armAmp, 0, 0.15);
      this.applyOffset(this.leftForearm, -0.4, 0, 0);
      this.applyOffset(this.rightArm, strideCycle * armAmp, 0, -0.15);
      this.applyOffset(this.rightForearm, -0.4, 0, 0);
    }

    // Athletic torso rhythm: forward lean proportional to speed and subtle twist
    this.applyOffset(this.spine, 0.12 * speedNorm, strideCycle * 0.05, 0);
    this.applyOffset(this.head, -0.06 * speedNorm, 0, 0);
  }

  // --- 6. Fielding Catch Animation ---
  playFielderCatch(progress = 1.0) {
    const p = Math.max(0, Math.min(1.0, progress));
    this.activeAnimation = 'FIELDER_CATCH';
    this.isPlaying = true;

    // Athletic base with bent knees
    this.applyOffset(this.leftUpLeg, -0.35 * p, 0, 0.1);
    this.applyOffset(this.leftLeg, 0.55 * p, 0, 0);
    this.applyOffset(this.rightUpLeg, -0.35 * p, 0, -0.1);
    this.applyOffset(this.rightLeg, 0.55 * p, 0, 0);

    // Torso forward lean
    this.applyOffset(this.spine, 0.18 * p, 0, 0);

    // Cupped hands at chest height ready to absorb ball
    this.applyOffset(this.leftArm, 0.65 * p, 0, -0.25 * p);
    this.applyOffset(this.leftForearm, -0.7 * p, 0, 0);
    this.applyOffset(this.rightArm, 0.65 * p, 0, 0.25 * p);
    this.applyOffset(this.rightForearm, -0.7 * p, 0, 0);
    this.applyOffset(this.leftHand, 0.1 * p, 0, 0.2 * p);
    this.applyOffset(this.rightHand, 0.1 * p, 0, -0.2 * p);
  }

  // --- 7. Ground Ball Pickup Animation ---
  playFielderPickup(progress = 0.5) {
    const p = Math.max(0, Math.min(1.0, progress));
    this.activeAnimation = 'FIELDER_PICKUP';
    this.isPlaying = true;

    if (p < 0.5) {
      // Phase A: Bend and reach low
      const t = p / 0.5;
      this.applyOffset(this.spine, 0.45 * t, 0, 0);
      this.applyOffset(this.leftUpLeg, -0.48 * t, 0, 0.08);
      this.applyOffset(this.leftLeg, 0.78 * t, 0, 0);
      this.applyOffset(this.rightUpLeg, 0.18 * t, 0, -0.08);
      this.applyOffset(this.rightLeg, 0.28 * t, 0, 0);
      this.applyOffset(this.rightArm, 0.92 * t, 0, 0.05);
      this.applyOffset(this.rightForearm, -0.22 * t, 0, 0);
      this.applyOffset(this.leftArm, 0.3 * t, 0, -0.1);
    } else {
      // Phase B: Scoop into body and rise
      const t = (p - 0.5) / 0.5;
      this.applyOffset(this.spine, 0.45 * (1 - t), 0, 0);
      this.applyOffset(this.leftUpLeg, -0.48 * (1 - t), 0, 0.05);
      this.applyOffset(this.leftLeg, 0.78 * (1 - t), 0, 0);
      this.applyOffset(this.rightUpLeg, 0.18 * (1 - t), 0, -0.05);
      this.applyOffset(this.rightLeg, 0.28 * (1 - t), 0, 0);
      this.applyOffset(this.rightArm, 0.92 * (1 - t) + 0.3 * t, 0, 0.1 * t);
      this.applyOffset(this.rightForearm, -0.55 * t, 0, 0);
      this.applyOffset(this.leftArm, 0.3 * (1 - t), 0, -0.05);
    }
  }

  // --- 8. Overarm Return Throw Animation ---
  playFielderThrow(progress = 0.5) {
    const p = Math.max(0, Math.min(1.0, progress));
    this.activeAnimation = 'FIELDER_THROW';
    this.isPlaying = true;

    if (p < 0.35) {
      // Cocking / wind-up phase
      const t = p / 0.35;
      this.applyOffset(this.rightArm, 0.3 + 1.25 * t, 0, -0.35 * t);
      this.applyOffset(this.rightForearm, -0.6 * t, 0, 0);
      this.applyOffset(this.spine, 0.05, 0.32 * t, 0);
      this.applyOffset(this.leftArm, -0.5 * t, 0, 0.25 * t);
      this.applyOffset(this.leftUpLeg, -0.2 * t, 0, 0);
      this.applyOffset(this.leftLeg, 0.2 * t, 0, 0);
    } else if (p < 0.68) {
      // Forward release arc
      const t = (p - 0.35) / 0.33;
      this.applyOffset(this.rightArm, 1.55 - 2.85 * t, 0, -0.35 + 0.55 * t);
      this.applyOffset(this.rightForearm, -0.6 * (1 - t), 0, 0);
      this.applyOffset(this.spine, 0.05 + 0.28 * t, 0.32 * (1 - t), 0);
      this.applyOffset(this.leftArm, -0.5 + 1.1 * t, 0, 0.25);
      this.applyOffset(this.leftUpLeg, -0.2 - 0.15 * t, 0, 0);
      this.applyOffset(this.leftLeg, 0.25, 0, 0);
      this.applyOffset(this.rightUpLeg, 0.25 * t, 0, 0);
    } else {
      // Follow-through and deceleration
      const t = (p - 0.68) / 0.32;
      this.applyOffset(this.rightArm, -1.3 + 1.45 * t, 0, 0.2 * (1 - t));
      this.applyOffset(this.rightForearm, -0.3 * (1 - t), 0, 0);
      this.applyOffset(this.spine, 0.33 * (1 - t), 0, 0);
      this.applyOffset(this.leftArm, 0.6 * (1 - t), 0, 0.1);
      this.applyOffset(this.leftUpLeg, -0.35 * (1 - t), 0, 0);
      this.applyOffset(this.leftLeg, 0.25 * (1 - t), 0, 0);
      this.applyOffset(this.rightUpLeg, 0.25 * (1 - t), 0, 0);
    }
  }

  // --- 9. Wicketkeeper Lateral & Collection Reaction ---
  playKeeperReaction(progress = 1.0, ballX = 0) {
    const p = Math.max(0, Math.min(1.0, progress));
    this.activeAnimation = 'KEEPER_REACTION';
    this.isPlaying = true;

    const clampedX = Math.max(-1.2, Math.min(1.2, ballX));

    // Torso leans toward path of delivery
    this.applyOffset(this.spine, 0.15 * p, clampedX * 0.16 * p, 0);

    // Deep crouch legs remain agile
    this.applyOffset(this.leftUpLeg, -0.42 * p, 0, 0.15);
    this.applyOffset(this.leftLeg, 0.7 * p, 0, 0);
    this.applyOffset(this.rightUpLeg, -0.42 * p, 0, -0.15);
    this.applyOffset(this.rightLeg, 0.7 * p, 0, 0);

    // Gloves raised into catching corridor
    this.applyOffset(this.leftArm, 0.58 * p, 0, -0.2 + clampedX * 0.1 * p);
    this.applyOffset(this.leftForearm, -0.65 * p, 0, 0);
    this.applyOffset(this.rightArm, 0.58 * p, 0, 0.2 + clampedX * 0.1 * p);
    this.applyOffset(this.rightForearm, -0.65 * p, 0, 0);
    this.applyOffset(this.head, 0, clampedX * 0.25 * p, 0);
  }
}
