import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { RiggedAnimationController } from '../src/scene/riggedAnimationController.js';
import { CharacterManager } from '../src/scene/characters.js';

function createMockRiggedPlayer(role = 'BATSMAN') {
  const group = new THREE.Group();
  const bonesMap = {};

  const boneNames = [
    'Hips_01', 'Spine_02', 'Spine1_03', 'Spine2_04', 'Neck_05', 'Head_06',
    'LeftShoulder_010', 'LeftArm_011', 'LeftForeArm_012', 'LeftHand_013',
    'RightShoulder_033', 'RightArm_034', 'RightForeArm_035', 'RightHand_036',
    'LeftUpLeg_057', 'LeftLeg_058', 'LeftFoot_059',
    'RightUpLeg_062', 'RightLeg_063', 'RightFoot_064'
  ];

  boneNames.forEach(name => {
    const bone = new THREE.Bone();
    bone.name = name;
    // Set some initial non-zero rotation to test rest pose preservation
    bone.rotation.set(0.01, 0.02, 0.03);
    bonesMap[name] = bone;
    group.add(bone);
  });

  const playerObj = {
    group,
    riggedBones: bonesMap,
    isBatsman: role === 'BATSMAN',
    isKeeper: role === 'KEEPER'
  };

  playerObj.animController = new RiggedAnimationController(playerObj);
  return playerObj;
}

describe('Phase 13.8: Rigged Batting & Bowling Animation Test Suite', () => {

  it('1. RiggedAnimationController caches rest rotations and restores them accurately on resetToRest', () => {
    const player = createMockRiggedPlayer('BATSMAN');
    const ctrl = player.animController;

    const rArm = player.riggedBones['RightArm_034'];
    assert.strictEqual(ctrl.restRotations.size, 20, 'Caches all 20 discovered bones');
    assert.strictEqual(ctrl.restRotations.get('RightArm_034').x, 0.01);

    // Mutate bone
    rArm.rotation.set(1.5, -0.8, 0.4);
    assert.strictEqual(rArm.rotation.x, 1.5);

    // Reset
    ctrl.resetToRest();
    assert.ok(Math.abs(rArm.rotation.x - 0.01) < 1e-5, 'Restores rest x rotation');
    assert.ok(Math.abs(rArm.rotation.y - 0.02) < 1e-5, 'Restores rest y rotation');
    assert.ok(Math.abs(rArm.rotation.z - 0.03) < 1e-5, 'Restores rest z rotation');
    assert.strictEqual(ctrl.activeAnimation, null);
    assert.strictEqual(ctrl.isPlaying, false);
  });

  it('2. Stance transitions apply expected offsets and isolate bones between players', () => {
    const batter = createMockRiggedPlayer('BATSMAN');
    const bowler = createMockRiggedPlayer('BOWLER');

    batter.animController.applyStance('BATSMAN_STANCE');
    bowler.animController.applyStance('BOWLER_READY');

    assert.strictEqual(batter.animController.currentStance, 'BATSMAN_STANCE');
    assert.strictEqual(bowler.animController.currentStance, 'BOWLER_READY');

    // Batter spine and legs should be flexed
    const bSpine = batter.riggedBones['Spine_02'];
    const bwSpine = bowler.riggedBones['Spine_02'];
    assert.notStrictEqual(bSpine.rotation.y, bwSpine.rotation.y, 'Batter and bowler stances differ');

    // Modifying batter does not alter bowler
    const bwInitArmX = bowler.riggedBones['RightArm_034'].rotation.x;
    batter.animController.applyStance('KEEPER_CROUCH');
    assert.strictEqual(bowler.riggedBones['RightArm_034'].rotation.x, bwInitArmX, 'Bowler remains unmutated');
  });

  it('3. Batting swing progression across all 6 shots produces valid kinematics and recovers at boundary values', () => {
    const player = createMockRiggedPlayer('BATSMAN');
    const ctrl = player.animController;

    const shotKeys = ['DEFENSIVE', 'STRAIGHT_DRIVE', 'COVER_DRIVE', 'PULL_SHOT', 'CUT_SHOT', 'LOFTED_ATTACK'];

    for (const shot of shotKeys) {
      // Mid-swing (apex contact window p = 0.5)
      ctrl.playBatSwing(0.5, shot, Math.PI, 'PERFECT');
      assert.strictEqual(ctrl.activeAnimation, 'BAT_SWING');
      assert.strictEqual(ctrl.isPlaying, true);
      assert.strictEqual(ctrl.progress, 0.5);

      const rArm = player.riggedBones['RightArm_034'];
      const restArm = ctrl.restRotations.get('RightArm_034');
      assert.notStrictEqual(rArm.rotation.x, restArm.x, `${shot} modifies right arm`);

      // Recovery at p = 1.0
      ctrl.playBatSwing(1.0, shot);
      assert.strictEqual(ctrl.activeAnimation, null);
      assert.strictEqual(ctrl.isPlaying, false);
      assert.strictEqual(ctrl.currentStance, 'BATSMAN_STANCE');

      // Boundary p = 0.0
      ctrl.playBatSwing(0.0, shot);
      assert.strictEqual(ctrl.activeAnimation, null);
      assert.strictEqual(ctrl.isPlaying, false);
    }
  });

  it('4. Batting swing applies edge tilt for EARLY and LATE timing quality', () => {
    const pEarly = createMockRiggedPlayer('BATSMAN');
    const pLate = createMockRiggedPlayer('BATSMAN');

    pEarly.animController.playBatSwing(0.5, 'STRAIGHT_DRIVE', Math.PI, 'EARLY');
    pLate.animController.playBatSwing(0.5, 'STRAIGHT_DRIVE', Math.PI, 'LATE');

    const earlyHand = pEarly.riggedBones['RightHand_036'];
    const lateHand = pLate.riggedBones['RightHand_036'];

    assert.ok(earlyHand.rotation.y > lateHand.rotation.y, 'EARLY shot has positive edge tilt compared to LATE');
  });

  it('5. Bowling action traverses 4 phases and aligns release apex at p = 0.88', () => {
    const bowler = createMockRiggedPlayer('BOWLER');
    const ctrl = bowler.animController;

    // Phase 1: Run-up (p = 0.35)
    ctrl.playBowlingAction(0.35, 'FAST_BOWLER');
    assert.strictEqual(ctrl.activeAnimation, 'BOWLING_ACTION');
    assert.strictEqual(ctrl.isPlaying, true);
    const runLeg = bowler.riggedBones['LeftUpLeg_057'].rotation.x;

    // Phase 2: Gather & Windmill Coil (p = 0.80)
    ctrl.playBowlingAction(0.80, 'FAST_BOWLER');
    const gatherArm = bowler.riggedBones['RightArm_034'].rotation.x;
    assert.ok(gatherArm > 0.4, 'Right arm winds up behind torso during gather');

    // Phase 3: Delivery Stride Apex & Release (p = 0.88)
    ctrl.playBowlingAction(0.88, 'FAST_BOWLER');
    const releaseArm = bowler.riggedBones['RightArm_034'].rotation.x;
    assert.ok(releaseArm < -1.0, 'Right arm is high overhead at release apex (p = 0.88)');

    // Phase 4: Follow-Through (p = 0.95)
    ctrl.playBowlingAction(0.95, 'FAST_BOWLER');
    const ftArm = bowler.riggedBones['RightArm_034'].rotation.x;
    assert.notStrictEqual(ftArm, releaseArm, 'Follow through decelerates and rotates across body');

    // Terminal recovery (p = 1.0)
    ctrl.playBowlingAction(1.0, 'FAST_BOWLER');
    assert.strictEqual(ctrl.activeAnimation, null);
    assert.strictEqual(ctrl.isPlaying, false);
    assert.strictEqual(ctrl.currentStance, 'BOWLER_READY');
  });

  it('6. Bowling action handles different bowling profiles (SPIN_BOWLER, SWING_BOWLER)', () => {
    const spinBowler = createMockRiggedPlayer('BOWLER');
    const fastBowler = createMockRiggedPlayer('BOWLER');

    spinBowler.animController.playBowlingAction(0.3, 'SPIN_BOWLER');
    fastBowler.animController.playBowlingAction(0.3, 'FAST_BOWLER');

    // Stride frequencies differ between spin and fast
    const spinLeg = spinBowler.riggedBones['LeftUpLeg_057'].rotation.x;
    const fastLeg = fastBowler.riggedBones['LeftUpLeg_057'].rotation.x;
    assert.notStrictEqual(spinLeg, fastLeg, 'Spin and fast bowlers exhibit distinct run-up stride kinematics');
  });

  it('7. Missing bones and undefined references do not crash animation updates', () => {
    // Player with incomplete bone hierarchy
    const player = {
      group: new THREE.Group(),
      riggedBones: {
        'RightArm_034': new THREE.Bone()
      }
    };
    player.animController = new RiggedAnimationController(player);

    assert.doesNotThrow(() => {
      player.animController.applyStance('BATSMAN_STANCE');
      player.animController.playBatSwing(0.5, 'STRAIGHT_DRIVE');
      player.animController.playBowlingAction(0.88, 'FAST_BOWLER');
      player.animController.resetToRest();
    }, 'Incomplete bone hierarchy executes safely without throwing');
  });

  it('8. CharacterManager integrates rigged batting and bowling in RIGGED_GLB mode', () => {
    const scene = new THREE.Scene();
    const mgr = new CharacterManager(scene);

    // Mock cachedExternalModel with necessary bones
    const mockModel = new THREE.Group();
    const bones = [
      'Hips_01', 'Spine_02', 'Spine1_03', 'Spine2_04', 'Neck_05', 'Head_06',
      'LeftShoulder_010', 'LeftArm_011', 'LeftForeArm_012', 'LeftHand_013',
      'RightShoulder_033', 'RightArm_034', 'RightForeArm_035', 'RightHand_036',
      'LeftUpLeg_057', 'LeftLeg_058', 'LeftFoot_059',
      'RightUpLeg_062', 'RightLeg_063', 'RightFoot_064'
    ];
    bones.forEach(name => {
      const b = new THREE.Bone();
      b.name = name;
      mockModel.add(b);
    });
    mgr.cachedExternalModel = mockModel;

    mgr.attachRiggedModelToPlayer(mgr.batter);
    mgr.attachRiggedModelToPlayer(mgr.bowler);
    mgr.setModelMode('RIGGED_GLB');

    // Test playBatSwing dispatch
    mgr.playBatSwing(0.5, 'COVER_DRIVE', Math.PI * 0.9, 'PERFECT');
    assert.strictEqual(mgr.batter.animController.activeAnimation, 'BAT_SWING');

    // Test resetBatter restores stance
    mgr.resetBatter();
    assert.strictEqual(mgr.batter.animController.activeAnimation, null);
    assert.strictEqual(mgr.batter.animController.currentStance, 'BATSMAN_STANCE');

    // Test playBowlerAction dispatch
    mgr.playBowlerAction(0.88, 'FAST_BOWLER');
    assert.strictEqual(mgr.bowler.animController.activeAnimation, 'BOWLING_ACTION');

    // Test getBowlerHandPosition uses rigged hand bone in RIGGED_GLB mode
    const handPos = mgr.getBowlerHandPosition();
    assert.ok(handPos instanceof THREE.Vector3);

    // Test getBatSweetSpot uses rigged bat
    const sweetSpot = mgr.getBatSweetSpot();
    assert.ok(sweetSpot instanceof THREE.Vector3);
  });

  it('9. Clamping out-of-range progress values guarantees robust execution', () => {
    const player = createMockRiggedPlayer('BATSMAN');
    const ctrl = player.animController;

    assert.doesNotThrow(() => {
      ctrl.playBatSwing(-0.5, 'STRAIGHT_DRIVE');
      ctrl.playBatSwing(1.8, 'STRAIGHT_DRIVE');
      ctrl.playBowlingAction(-0.2, 'FAST_BOWLER');
      ctrl.playBowlingAction(2.5, 'FAST_BOWLER');
    }, 'Out-of-range progress values clamp gracefully');
  });

});
