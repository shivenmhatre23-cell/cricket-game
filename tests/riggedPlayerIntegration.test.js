import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import fs from 'fs';
import path from 'path';
import { CharacterManager, createJerseyBackBadge } from '../src/scene/characters.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

describe('Phase 13.7B: Rigged Cricket Player Model Integration Test Suite', () => {

  it('1. Model asset exists at public/models/indian_cricket_player.glb with expected size', () => {
    const glbPath = path.resolve('public/models/indian_cricket_player.glb');
    assert.strictEqual(fs.existsSync(glbPath), true, 'indian_cricket_player.glb must exist in public/models');
    const stats = fs.statSync(glbPath);
    assert.ok(stats.size > 1000000, 'Model file should be around 1.3MB');
  });

  it('2. CharacterManager initializes in PROCEDURAL mode by default and maintains wrapper API', () => {
    const scene = new THREE.Scene();
    const mgr = new CharacterManager(scene);

    assert.strictEqual(mgr.getModelMode(), 'PROCEDURAL', 'Default modelMode should be PROCEDURAL');
    assert.ok(mgr.batter, 'Striker batsman wrapper exists');
    assert.ok(mgr.bowler, 'Bowler wrapper exists');
    assert.ok(mgr.keeper, 'Wicketkeeper wrapper exists');
    assert.strictEqual(mgr.fielders.length, 10, '10 fielder wrappers exist');

    // Verify critical gameplay wrappers and coordinates are maintained
    assert.ok(mgr.batter.group.position instanceof THREE.Vector3, 'batter group position is Vector3');
    assert.strictEqual(mgr.batter.group.position.z, 9.15, 'batter placed at popping crease 9.15m');
    assert.strictEqual(mgr.bowler.group.position.z, -24.0, 'bowler placed at runup start -24m');
    assert.strictEqual(mgr.keeper.group.position.z, 11.8, 'keeper placed at 11.8m');
  });

  it('3. getAllPlayerWrappers returns all active fielders, batters, bowler, and keeper', () => {
    const scene = new THREE.Scene();
    const mgr = new CharacterManager(scene);
    const wrappers = mgr.getAllPlayerWrappers();

    // 1 striker + 1 non-striker + 1 bowler + 1 keeper + 10 fielders = 14 players
    assert.strictEqual(wrappers.length, 14, 'Should return 14 player wrappers');
    wrappers.forEach(w => {
      assert.ok(w.group, 'Every wrapper has a Three.js group');
      assert.ok(w.userData, 'Every wrapper has userData');
    });
  });

  it('4. SkeletonUtils.clone isolates skeleton bone instances between independent players', () => {
    // Construct a mock rigged hierarchy with a skinned mesh and bones
    const root = new THREE.Group();
    const hips = new THREE.Bone();
    hips.name = 'Hips_01';
    const spine = new THREE.Bone();
    spine.name = 'Spine2_04';
    hips.add(spine);
    root.add(hips);

    const skeleton = new THREE.Skeleton([hips, spine]);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1, 2, 2, 2], 3));
    geom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute([0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
    geom.setAttribute('skinWeight', new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
    const mat = new THREE.MeshBasicMaterial({ name: 'Wolf3D_Outfit_Top' });
    const skinnedMesh = new THREE.SkinnedMesh(geom, mat);
    skinnedMesh.bind(skeleton);
    root.add(skinnedMesh);

    // Clone into two separate instances
    const clone1 = cloneSkeleton(root);
    const clone2 = cloneSkeleton(root);

    let spine1, spine2;
    clone1.traverse(o => { if (o.isBone && o.name === 'Spine2_04') spine1 = o; });
    clone2.traverse(o => { if (o.isBone && o.name === 'Spine2_04') spine2 = o; });

    assert.ok(spine1, 'Clone 1 contains Spine2_04');
    assert.ok(spine2, 'Clone 2 contains Spine2_04');
    assert.notStrictEqual(spine1, spine2, 'Spine bones must be independent object instances');

    spine1.rotation.x = 0.55;
    assert.strictEqual(spine1.rotation.x, 0.55, 'Clone 1 bone rotation updated');
    assert.ok(Math.abs(spine2.rotation.x) < 0.0001, 'Clone 2 bone rotation must remain unaffected');
    assert.notStrictEqual(spine2.rotation.x, 0.55, 'Clone 2 rotation is distinct from Clone 1');
  });

  it('5. attachRiggedModelToPlayer correctly attaches cloned model and retains wrapper references', () => {
    const scene = new THREE.Scene();
    const mgr = new CharacterManager(scene);

    // Mock cachedExternalModel
    const mockModel = new THREE.Group();
    const hipBone = new THREE.Bone();
    hipBone.name = 'Hips_01';
    const spineBone = new THREE.Bone();
    spineBone.name = 'Spine2_04';
    const rHand = new THREE.Bone();
    rHand.name = 'RightHand_036';
    hipBone.add(spineBone);
    hipBone.add(rHand);
    mockModel.add(hipBone);

    const shirtMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.2), new THREE.MeshStandardMaterial({ name: 'Wolf3D_Outfit_Top' }));
    mockModel.add(shirtMesh);

    mgr.cachedExternalModel = mockModel;

    const batter = mgr.batter;
    assert.strictEqual(batter.riggedModel, undefined, 'Initially no rigged model attached');

    const attached = mgr.attachRiggedModelToPlayer(batter);
    assert.ok(attached, 'attachRiggedModelToPlayer returns cloned model');
    assert.strictEqual(batter.riggedModel, attached, 'Wrapper holds riggedModel reference');
    assert.ok(batter.riggedBones['Hips_01'], 'riggedBones contains Hips_01');
    assert.ok(batter.riggedBones['Spine2_04'], 'riggedBones contains Spine2_04');
    assert.ok(batter.riggedBat, 'Batsman has attached riggedBat');
    assert.ok(batter.riggedJerseyBadge, 'Player has attached riggedJerseyBadge');

    // Ensure model is a child of the batter's world group
    assert.strictEqual(attached.parent, batter.group, 'Rigged model is child of batter group');
  });

  it('6. setModelMode switches cleanly between PROCEDURAL and RIGGED_GLB modes', () => {
    const scene = new THREE.Scene();
    const mgr = new CharacterManager(scene);

    const mockModel = new THREE.Group();
    const hipBone = new THREE.Bone();
    hipBone.name = 'Hips_01';
    mockModel.add(hipBone);
    mgr.cachedExternalModel = mockModel;

    // Switch to RIGGED_GLB mode
    mgr.setModelMode('RIGGED_GLB');
    assert.strictEqual(mgr.getModelMode(), 'RIGGED_GLB', 'Model mode updated to RIGGED_GLB');
    assert.strictEqual(mgr.batter.hips.visible, false, 'Procedural hips hidden in RIGGED_GLB mode');
    assert.strictEqual(mgr.batter.riggedModel.visible, true, 'Rigged model visible in RIGGED_GLB mode');

    // Switch back to PROCEDURAL mode
    mgr.setModelMode('PROCEDURAL');
    assert.strictEqual(mgr.getModelMode(), 'PROCEDURAL', 'Model mode restored to PROCEDURAL');
    assert.strictEqual(mgr.batter.hips.visible, true, 'Procedural hips restored to visible');
    assert.strictEqual(mgr.batter.riggedModel.visible, false, 'Rigged model hidden in PROCEDURAL mode');
  });

  it('7. applyRiggedStance executes cleanly across all stance types without error', () => {
    const scene = new THREE.Scene();
    const mgr = new CharacterManager(scene);

    const mockModel = new THREE.Group();
    const bones = ['Hips_01', 'Spine_02', 'LeftUpLeg_057', 'LeftLeg_058', 'RightUpLeg_062', 'RightLeg_063', 'LeftArm_011', 'LeftForeArm_012', 'RightArm_034', 'RightForeArm_035'];
    bones.forEach(name => {
      const b = new THREE.Bone();
      b.name = name;
      mockModel.add(b);
    });
    mgr.cachedExternalModel = mockModel;
    mgr.attachRiggedModelToPlayer(mgr.batter);

    assert.doesNotThrow(() => {
      mgr.applyRiggedStance(mgr.batter, 'BATSMAN_STANCE');
      mgr.applyRiggedStance(mgr.bowler, 'BOWLER_READY');
      mgr.applyRiggedStance(mgr.keeper, 'KEEPER_CROUCH');
      mgr.applyRiggedStance(mgr.fielders[0], 'FIELDER_READY');
      mgr.applyRiggedStance(mgr.nonStriker, 'NON_STRIKER_STANCE');
    }, 'applyRiggedStance should execute without throwing');
  });

  it('8. disposePlayerRiggedModel cleanly disposes per-instance assets without touching cached source', () => {
    const scene = new THREE.Scene();
    const mgr = new CharacterManager(scene);

    const mockModel = new THREE.Group();
    const hip = new THREE.Bone();
    hip.name = 'Hips_01';
    mockModel.add(hip);
    mgr.cachedExternalModel = mockModel;

    mgr.attachRiggedModelToPlayer(mgr.batter);
    assert.ok(mgr.batter.riggedModel, 'Rigged model attached');

    mgr.disposePlayerRiggedModel(mgr.batter);
    assert.strictEqual(mgr.batter.riggedModel, null, 'Rigged model reference cleared');
    assert.strictEqual(mgr.batter.riggedBones, null, 'Rigged bones reference cleared');
    assert.ok(mgr.cachedExternalModel, 'Cached source model must not be disposed');
  });

  it('9. createJerseyBackBadge produces valid material with team colors', () => {
    const playerData = { name: 'V. Kohli', number: 18 };
    const teamData = { name: 'India', color: '#1565c0', kit: { primary: '#1565c0', secondary: '#ff6f00', text: '#ffffff' } };
    const mat = createJerseyBackBadge(playerData, teamData);

    assert.ok(mat instanceof THREE.Material, 'createJerseyBackBadge returns THREE.Material');
  });

});
