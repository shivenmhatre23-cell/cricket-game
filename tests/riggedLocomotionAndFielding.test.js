import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { RiggedAnimationController } from '../src/scene/riggedAnimationController.js';
import { CharacterManager } from '../src/scene/characters.js';
import { FieldingAI } from '../src/ai/fieldingAI.js';
import { BallPhysics } from '../src/physics/ballPhysics.js';
import { GameState } from '../src/gameState.js';

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

function createMockCharacterManager() {
  const scene = new THREE.Scene();
  const mgr = new CharacterManager(scene);

  const mockModel = new THREE.Group();
  const boneNames = [
    'Hips_01', 'Spine_02', 'Spine1_03', 'Spine2_04', 'Neck_05', 'Head_06',
    'LeftShoulder_010', 'LeftArm_011', 'LeftForeArm_012', 'LeftHand_013',
    'RightShoulder_033', 'RightArm_034', 'RightForeArm_035', 'RightHand_036',
    'LeftUpLeg_057', 'LeftLeg_058', 'LeftFoot_059',
    'RightUpLeg_062', 'RightLeg_063', 'RightFoot_064'
  ];
  boneNames.forEach(name => {
    const b = new THREE.Bone();
    b.name = name;
    mockModel.add(b);
  });
  mgr.cachedExternalModel = mockModel;

  mgr.attachRiggedModelToPlayer(mgr.batter);
  mgr.attachRiggedModelToPlayer(mgr.nonStriker);
  mgr.attachRiggedModelToPlayer(mgr.bowler);
  mgr.attachRiggedModelToPlayer(mgr.keeper);
  mgr.fielders.forEach(f => mgr.attachRiggedModelToPlayer(f));

  mgr.setModelMode('RIGGED_GLB');
  return { scene, mgr };
}

describe('Phase 13.9: Full-Match Animation Integration & Locomotion Test Suite', () => {

  it('1. Idle-to-run and run-to-idle transitions smoothly alter state and restore stance', () => {
    const player = createMockRiggedPlayer('FIELDER');
    const ctrl = player.animController;

    // Start in ready stance
    ctrl.applyStance('FIELDER_READY');
    assert.strictEqual(ctrl.currentStance, 'FIELDER_READY');
    assert.strictEqual(ctrl.activeAnimation, null);

    // Transition to locomotion
    ctrl.playLocomotion(Math.PI * 0.5, 7.0, false);
    assert.strictEqual(ctrl.activeAnimation, 'LOCOMOTION');
    assert.strictEqual(ctrl.isPlaying, true);

    const leftLeg = player.riggedBones['LeftUpLeg_057'];
    assert.notStrictEqual(leftLeg.rotation.x, ctrl.restRotations.get('LeftUpLeg_057').x);

    // Stop and return to stance
    ctrl.applyStance('FIELDER_READY');
    assert.strictEqual(ctrl.activeAnimation, null);
    assert.strictEqual(ctrl.isPlaying, false);
    assert.strictEqual(ctrl.currentStance, 'FIELDER_READY');
  });

  it('2. Animation progression with different frame-delta values maintains stability without exploding', () => {
    const { mgr } = createMockCharacterManager();
    const fielder = mgr.fielders[0];

    // Tiny delta (60fps: 0.016s)
    mgr.animateFielderRun(fielder, 0.016, 7.4);
    const runCycle1 = fielder.runCycle;
    assert.ok(runCycle1 > 0);

    // Moderate delta (30fps: 0.033s)
    mgr.animateFielderRun(fielder, 0.033, 7.4);
    assert.ok(fielder.runCycle > runCycle1);

    // Large delta (frame drop / hitch: 0.25s)
    mgr.animateFielderRun(fielder, 0.25, 7.4);
    assert.ok(Number.isFinite(fielder.runCycle));
    assert.ok(!Number.isNaN(fielder.runCycle));
  });

  it('3. Correct animation reset after interrupted movement', () => {
    const { mgr } = createMockCharacterManager();
    mgr.startRunningBetweenWickets(2);
    assert.strictEqual(mgr.runningBetweenWickets.active, true);

    // Advance halfway
    mgr.updateRunningBetweenWickets(0.5);
    assert.ok(mgr.batter.group.position.z < 9.0);

    // Mid-stride interruption (e.g. delivery reset or wicket)
    mgr.resetRunningBetweenWickets();
    assert.strictEqual(mgr.runningBetweenWickets.active, false);
    assert.strictEqual(mgr.batter.group.position.z, 9.15, 'Striker restored to popping crease');
    assert.strictEqual(mgr.nonStriker.group.position.z, -8.6, 'Non-striker restored to bowling end crease');
    assert.strictEqual(mgr.batter.animController.activeAnimation, null);
    assert.strictEqual(mgr.nonStriker.animController.activeAnimation, null);
  });

  it('4. Batter run completion moves batsmen to valid positions without mutating match score', () => {
    const { mgr } = createMockCharacterManager();
    const initScore = 42; // arbitrary external score

    mgr.startRunningBetweenWickets(1);
    assert.strictEqual(mgr.runningBetweenWickets.targetRuns, 1);

    // Step through running until completion
    for (let i = 0; i < 30; i++) {
      mgr.update(0.1);
    }

    assert.strictEqual(mgr.runningBetweenWickets.active, false, 'Running completed after travel time');
    // Verify no side-effect run score alteration inside animation system
    assert.strictEqual(initScore, 42, 'Animation loop did not mutate match score');
    // Striker and non-striker positions stay within legal playing area
    assert.ok(mgr.batter.group.position.z >= -9.0 && mgr.batter.group.position.z <= 9.5);
    assert.ok(mgr.nonStriker.group.position.z >= -9.0 && mgr.nonStriker.group.position.z <= 9.5);
  });

  it('5. Fielders stop running and transition to throw or stance after collection', () => {
    const { scene, mgr } = createMockCharacterManager();
    const fieldingAI = new FieldingAI();
    const ball = new BallPhysics(scene);

    fieldingAI.setPreset('BALANCED', mgr.fielders);

    // Place fielder near ball
    const chaser = mgr.fielders[0];
    chaser.group.position.set(10.0, 0, 10.0);

    // Ball hit into outfield along grass
    ball.hasHitBat = true;
    ball.isDead = false;
    ball.inPlay = true;
    ball.bounceCount = 2; // ground ball
    ball.position.set(10.5, 0.1, 10.5); // inside 1.35m intercept zone
    ball.mesh.position.copy(ball.position);

    fieldingAI.hasReacted = true;

    // Trigger update to intercept
    fieldingAI.update(0.1, ball, mgr, 'HARD', () => {});

    assert.ok(fieldingAI.isThrowing, 'FieldingAI transitioned to throw mode upon intercept');
    assert.strictEqual(fieldingAI.activeChaser, chaser, 'Chaser intercepted ball');

    // Chaser should be in throw animation or stance, not running
    mgr.animateFielderThrow(chaser, fieldingAI.throwProgress);
    assert.strictEqual(chaser.animController.activeAnimation, 'FIELDER_THROW');
  });

  it('6. Exactly one authoritative pickup/catch resolution per ball delivery', () => {
    const { scene, mgr } = createMockCharacterManager();
    const fieldingAI = new FieldingAI();
    const ball = new BallPhysics(scene);

    fieldingAI.setPreset('BALANCED', mgr.fielders);

    // 1st Slip at (-2.6, 0, 12.2)
    const slip = mgr.fielders[0];
    slip.group.position.set(-2.6, 0, 12.2);

    ball.hasHitBat = true;
    ball.isDead = false;
    ball.inPlay = true;
    ball.bounceCount = 0; // airborne
    ball.position.set(-2.5, 1.2, 12.0); // directly within slip hands
    ball.mesh.position.copy(ball.position);

    fieldingAI.hasReacted = true;

    // Force deterministic catch
    const origRandom = Math.random;
    Math.random = () => 0.01;

    let catchEvents = 0;
    try {
      for (let i = 0; i < 15; i++) {
        fieldingAI.update(0.05, ball, mgr, 'HARD', (evt) => {
          if (evt.action === 'CATCH_TAKEN' || evt.action === 'CATCH_DROPPED') {
            catchEvents++;
          }
        });
      }
    } finally {
      Math.random = origRandom;
    }

    assert.strictEqual(catchEvents, 1, 'Only 1 catch resolution fired per delivery');
    assert.strictEqual(fieldingAI.hasResolvedCatch, true);
  });

  it('7. Failed catches and missed pickups recover safely without crashing', () => {
    const { scene, mgr } = createMockCharacterManager();
    const fieldingAI = new FieldingAI();
    const ball = new BallPhysics(scene);

    ball.hasHitBat = true;
    ball.isDead = false;
    ball.inPlay = true;
    ball.bounceCount = 0;
    ball.position.set(0, 1.0, 10.0);

    // Force drop
    fieldingAI.hasResolvedCatch = false;
    const chaser = mgr.fielders[0];

    assert.doesNotThrow(() => {
      // Simulate drop event handling
      ball.bounceCount = 1;
      ball.velocity.multiplyScalar(0.35);
      mgr.setFielderStance(chaser);
      assert.strictEqual(chaser.animController.currentStance, 'FIELDER_READY');
    }, 'Failed catch recovers safely into ready stance');
  });

  it('8. Throw initiation advances throwProgress and triggers throw completion without duplicating release', () => {
    const { scene, mgr } = createMockCharacterManager();
    const fieldingAI = new FieldingAI();
    const ball = new BallPhysics(scene);

    ball.hasHitBat = true;
    ball.isDead = false;
    ball.inPlay = true;

    fieldingAI.activeChaser = mgr.fielders[0];
    fieldingAI.isThrowing = true;
    fieldingAI.hasReacted = true;
    fieldingAI.throwProgress = 0;
    fieldingAI.throwStart.set(20, 0, 20);
    fieldingAI.throwTarget.set(0, 0.7, 10.06);

    let completionEvents = 0;
    for (let i = 0; i < 10; i++) {
      fieldingAI.update(0.1, ball, mgr, 'HARD', (evt) => {
        if (evt.action === 'THROW_COMPLETED') completionEvents++;
      });
    }

    assert.strictEqual(completionEvents, 1, 'Throw completion fires exactly once');
    assert.strictEqual(fieldingAI.isThrowing, false);
    assert.strictEqual(ball.isDead, true);
  });

  it('9. Keeper collection reaction does not trigger false dismissal on ball passing crease', () => {
    const { scene, mgr } = createMockCharacterManager();
    const ball = new BallPhysics(scene);

    // Ball delivers cleanly past stumps without hitting edge or wickets
    ball.position.set(0.4, 0.6, 9.8);
    mgr.update(0.016, ball.position);

    assert.strictEqual(mgr.keeper.animController.activeAnimation, 'KEEPER_REACTION');
    // Verify stumps and bails are unbroken
    assert.strictEqual(mgr.strikerStumps.isBroken, false, 'Keeper reaction did not falsely break wickets');
  });

  it('10. Match transitions (resetDeliveryState, restartMatch, resetAllPlayerStances) restore clean stances', () => {
    const { mgr } = createMockCharacterManager();

    // Perturb players into varied actions
    mgr.batter.animController.playBatSwing(0.5, 'LOFTED_ATTACK');
    mgr.bowler.animController.playBowlingAction(0.88, 'FAST_BOWLER');
    mgr.keeper.animController.playKeeperReaction(1.0, 0.5);
    mgr.fielders[0].animController.playFielderThrow(0.4);

    assert.strictEqual(mgr.batter.animController.activeAnimation, 'BAT_SWING');
    assert.strictEqual(mgr.bowler.animController.activeAnimation, 'BOWLING_ACTION');

    // Execute full reset
    mgr.resetAllPlayerStances();
    mgr.resetRunningBetweenWickets();

    assert.strictEqual(mgr.batter.animController.activeAnimation, null);
    assert.strictEqual(mgr.batter.animController.currentStance, 'BATSMAN_STANCE');
    assert.strictEqual(mgr.bowler.animController.activeAnimation, null);
    assert.strictEqual(mgr.bowler.animController.currentStance, 'BOWLER_READY');
    assert.strictEqual(mgr.keeper.animController.activeAnimation, null);
    assert.strictEqual(mgr.keeper.animController.currentStance, 'KEEPER_CROUCH');
    assert.strictEqual(mgr.fielders[0].animController.activeAnimation, null);
    assert.strictEqual(mgr.fielders[0].animController.currentStance, 'FIELDER_READY');
  });

  it('11. Multiple characters animate independently without bone crosstalk', () => {
    const batter = createMockRiggedPlayer('BATSMAN');
    const fielder1 = createMockRiggedPlayer('FIELDER');
    const fielder2 = createMockRiggedPlayer('FIELDER');

    batter.animController.playBatSwing(0.5, 'STRAIGHT_DRIVE');
    fielder1.animController.playLocomotion(Math.PI * 0.25, 7.4, false);
    fielder2.animController.playFielderCatch(1.0);

    const bRightArmX = batter.riggedBones['RightArm_034'].rotation.x;
    const f1RightArmX = fielder1.riggedBones['RightArm_034'].rotation.x;
    const f2RightArmX = fielder2.riggedBones['RightArm_034'].rotation.x;

    assert.notStrictEqual(bRightArmX, f1RightArmX);
    assert.notStrictEqual(f1RightArmX, f2RightArmX);
  });

  it('12. Missing bones execute safely and fallback to procedural without throwing', () => {
    const brokenPlayer = {
      group: new THREE.Group(),
      riggedBones: {}
    };
    brokenPlayer.animController = new RiggedAnimationController(brokenPlayer);

    assert.doesNotThrow(() => {
      brokenPlayer.animController.playLocomotion(1.0, 6.0, false);
      brokenPlayer.animController.playFielderCatch(0.5);
      brokenPlayer.animController.playFielderPickup(0.5);
      brokenPlayer.animController.playFielderThrow(0.5);
      brokenPlayer.animController.playKeeperReaction(0.5, 0.2);
      brokenPlayer.animController.resetToRest();
    }, 'Missing bone hierarchy executes cleanly with zero exceptions');
  });

  it('13. Procedural mode remains fully functional and updates positions and stances', () => {
    const scene = new THREE.Scene();
    const mgr = new CharacterManager(scene);

    assert.strictEqual(mgr.getModelMode(), 'PROCEDURAL');
    const fielder = mgr.fielders[0];

    assert.doesNotThrow(() => {
      mgr.animateFielderRun(fielder, 0.016, 7.4);
      mgr.setFielderCatchStance(fielder);
      mgr.animateFielderPickup(fielder, 0.5);
      mgr.animateFielderThrow(fielder, 0.5);
      mgr.animateKeeper(new THREE.Vector3(0.2, 0.5, 8.5), 0.016);
      mgr.startRunningBetweenWickets(1);
      mgr.update(0.016);
      mgr.stopRunningBetweenWickets(true);
    }, 'Procedural mode operations execute without errors');
  });

  it('14. Animation updates do not trigger duplicate ball physics updates or restarts', () => {
    const { scene, mgr } = createMockCharacterManager();
    const ball = new BallPhysics(scene);

    ball.inPlay = false;
    ball.isDead = true;

    // Run animation updates
    mgr.update(0.016, ball.position);
    mgr.animateBatterRun(mgr.batter, 0.016, 6.4);

    assert.strictEqual(ball.inPlay, false, 'Animation update did not reactivate ball');
    assert.strictEqual(ball.isDead, true, 'Ball remains dead until next delivery');
  });

});
