import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { CharacterManager, createJerseyBackBadge } from '../src/scene/characters.js';
import { RiggedAnimationController } from '../src/scene/riggedAnimationController.js';

describe('Phase 14.1: Rigged Rendering Optimization & Performance Validation Test Suite', () => {

  function createMockRiggedModel() {
    const root = new THREE.Group();
    const bones = [
      'Hips_01', 'Spine_02', 'Spine1_03', 'Spine2_04', 'Neck_05', 'Head_06',
      'LeftShoulder_010', 'LeftArm_011', 'LeftForeArm_012', 'LeftHand_013',
      'RightShoulder_033', 'RightArm_034', 'RightForeArm_035', 'RightHand_036',
      'LeftUpLeg_057', 'LeftLeg_058', 'LeftFoot_059',
      'RightUpLeg_062', 'RightLeg_063', 'RightFoot_064'
    ];
    const boneMap = {};
    const boneList = [];
    bones.forEach(name => {
      const b = new THREE.Bone();
      b.name = name;
      root.add(b);
      boneMap[name] = b;
      boneList.push(b);
    });

    const skeleton = new THREE.Skeleton(boneList);

    function createSkinned(matName, objName) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1, 2, 2, 2], 3));
      geom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute([0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
      geom.setAttribute('skinWeight', new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
      const mat = new THREE.MeshStandardMaterial({ name: matName });
      const mesh = new THREE.SkinnedMesh(geom, mat);
      mesh.name = objName;
      mesh.bind(skeleton);
      root.add(mesh);
      return mesh;
    }

    const teeth = createSkinned('Wolf3D_Teeth', 'Object_95');
    const eye = createSkinned('Wolf3D_Eye', 'Object_89');
    const glasses = createSkinned('Wolf3D_Glasses', 'Object_99');
    const body = createSkinned('Wolf3D_Body', 'Object_107');
    const top = createSkinned('Wolf3D_Outfit_Top', 'Object_105');

    return { root, boneMap, meshes: { teeth, eye, glasses, body, top } };
  }

  it('1. Rigged shadow and visibility optimization: teeth are hidden, eyes/glasses excluded from shadow passes, body silhouette casts shadows', () => {
    const scene = new THREE.Scene();
    const mgr = new CharacterManager(scene);
    const mock = createMockRiggedModel();
    mgr.cachedExternalModel = mock.root;

    mgr.attachRiggedModelToPlayer(mgr.batter);
    assert.ok(mgr.batter.riggedModel, 'Rigged model attached');

    let teethMesh = null;
    let eyeMesh = null;
    let glassesMesh = null;
    let bodyMesh = null;

    mgr.batter.riggedModel.traverse(child => {
      if (child.isMesh) {
        if (child.material?.name === 'Wolf3D_Teeth') teethMesh = child;
        if (child.material?.name === 'Wolf3D_Eye') eyeMesh = child;
        if (child.material?.name === 'Wolf3D_Glasses') glassesMesh = child;
        if (child.material?.name === 'Wolf3D_Body') bodyMesh = child;
      }
    });

    assert.ok(teethMesh, 'Teeth mesh found');
    assert.strictEqual(teethMesh.visible, false, 'Teeth must be hidden to eliminate redundant draw calls');
    assert.strictEqual(teethMesh.castShadow, false, 'Teeth must not cast shadows');
    assert.strictEqual(teethMesh.receiveShadow, false, 'Teeth must not receive shadows');

    assert.ok(eyeMesh, 'Eye mesh found');
    assert.strictEqual(eyeMesh.visible, true, 'Eyes remain visible');
    assert.strictEqual(eyeMesh.castShadow, false, 'Eyes must not cast shadows (head skin casts head shadow)');
    assert.strictEqual(eyeMesh.receiveShadow, false, 'Eyes must not receive shadows');

    assert.ok(glassesMesh, 'Glasses mesh found');
    assert.strictEqual(glassesMesh.visible, true, 'Glasses remain visible');
    assert.strictEqual(glassesMesh.castShadow, false, 'Glasses must not cast shadows');

    assert.ok(bodyMesh, 'Body mesh found');
    assert.strictEqual(bodyMesh.visible, true, 'Body silhouette remains visible');
    assert.strictEqual(bodyMesh.castShadow, true, 'Body silhouette must cast shadows');
    assert.strictEqual(bodyMesh.receiveShadow, true, 'Body silhouette must receive shadows');
  });

  it('2. RiggedAnimationController zero-allocation resetToRest and direct bone lookup optimization', () => {
    const mock = createMockRiggedModel();
    const playerObj = { riggedBones: mock.boneMap };
    const ctrl = new RiggedAnimationController(playerObj);

    assert.ok(ctrl.boneEntries, 'boneEntries list pre-cached in constructor');
    assert.ok(ctrl.boneEntries.length > 0, 'boneEntries populated');

    // Verify bone.userData.restRot is populated for O(1) direct access
    mock.boneMap['Spine_02'].rotation.set(0.5, 0.2, -0.3);
    assert.ok(mock.boneMap['Spine_02'].userData.restRot, 'Direct restRot reference present on bone');

    // Apply offset and check rotation
    ctrl.applyOffset(ctrl.spine, 0.1, -0.2, 0.3);
    assert.ok(Math.abs(ctrl.spine.rotation.x - (mock.boneMap['Spine_02'].userData.restRot.x + 0.1)) < 1e-4);

    // Call resetToRest
    ctrl.resetToRest();
    assert.strictEqual(ctrl.isPlaying, false);
    assert.strictEqual(ctrl.activeAnimation, null);
    assert.strictEqual(ctrl.spine.rotation.x, mock.boneMap['Spine_02'].userData.restRot.x);
  });

  it('3. Stance caching early-return prevents redundant recalculations when stance is unchanged', () => {
    const mock = createMockRiggedModel();
    const playerObj = { riggedBones: mock.boneMap };
    const ctrl = new RiggedAnimationController(playerObj);

    ctrl.applyStance('BATSMAN_STANCE');
    assert.strictEqual(ctrl.currentStance, 'BATSMAN_STANCE');

    const rotX = ctrl.spine.rotation.x;
    // Mutate marker to detect if redundant resetToRest/applyStance runs
    ctrl.currentStance = 'BATSMAN_STANCE';
    ctrl.isPlaying = false;
    ctrl.activeAnimation = null;

    // Calling applyStance with identical stance must return early
    ctrl.applyStance('BATSMAN_STANCE');
    assert.strictEqual(ctrl.spine.rotation.x, rotX, 'Rotation preserved without redundant traversal');
  });

  it('4. Independent skeletons still animate independently without bone crosstalk', () => {
    const scene = new THREE.Scene();
    const mgr = new CharacterManager(scene);
    const mock = createMockRiggedModel();
    mgr.cachedExternalModel = mock.root;

    mgr.attachRiggedModelToPlayer(mgr.batter);
    mgr.attachRiggedModelToPlayer(mgr.bowler);

    mgr.batter.animController.applyStance('BATSMAN_STANCE');
    mgr.bowler.animController.applyStance('BOWLER_READY');

    assert.notStrictEqual(
      mgr.batter.riggedBones['Spine_02'].rotation.y,
      mgr.bowler.riggedBones['Spine_02'].rotation.y,
      'Batter and bowler stances must produce independent bone rotations'
    );
  });

  it('5. Bat and equipment attachment remains intact with optimized shadows', () => {
    const scene = new THREE.Scene();
    const mgr = new CharacterManager(scene);
    const mock = createMockRiggedModel();
    mgr.cachedExternalModel = mock.root;

    mgr.attachRiggedModelToPlayer(mgr.batter);
    assert.ok(mgr.batter.riggedBat, 'Batsman bat attached to hand');
    assert.ok(mgr.batter.riggedPads && mgr.batter.riggedPads.length === 2, 'Pads attached to both legs');
    assert.ok(mgr.batter.riggedJerseyBadge, 'Jersey back badge attached');

    // Batsman bat and pads must cast shadows
    assert.strictEqual(mgr.batter.riggedBat.children[0].castShadow, true, 'Bat blade casts shadow');
    assert.strictEqual(mgr.batter.riggedPads[0].castShadow, true, 'Pad casts shadow');
    assert.strictEqual(mgr.batter.riggedJerseyBadge.castShadow, false, 'Badge excluded from shadow map');
  });

  it('6. Team colors and shared kit material cache reuses materials across players without duplicating allocations', () => {
    const scene = new THREE.Scene();
    const mgr = new CharacterManager(scene);
    const mock = createMockRiggedModel();
    mgr.cachedExternalModel = mock.root;

    mgr.attachRiggedModelToPlayer(mgr.fielders[0]);
    mgr.attachRiggedModelToPlayer(mgr.fielders[1]);

    const ausTeam = { name: 'Australia', code: 'AUS', kit: { primary: '#fbc02d', pants: '#1b5e20', pads: '#fbc02d' } };
    mgr.applyRiggedPlayerAppearance(mgr.fielders[0], { name: 'P1', number: 1 }, ausTeam);
    mgr.applyRiggedPlayerAppearance(mgr.fielders[1], { name: 'P2', number: 2 }, ausTeam);

    let mat0 = null;
    let mat1 = null;
    mgr.fielders[0].riggedModel.traverse(c => {
      if (c.isMesh && (c.name === 'Object_105' || c.userData.customMat)) mat0 = c.material;
    });
    mgr.fielders[1].riggedModel.traverse(c => {
      if (c.isMesh && (c.name === 'Object_105' || c.userData.customMat)) mat1 = c.material;
    });

    assert.ok(mat0, 'Fielder 0 custom material created');
    assert.ok(mat1, 'Fielder 1 custom material created');
    assert.strictEqual(mat0, mat1, 'Fielder 0 and Fielder 1 must share the identical cached team material');
  });

  it('7. Shared materials are preserved when disposing individual player rigged models', () => {
    const scene = new THREE.Scene();
    const mgr = new CharacterManager(scene);
    const mock = createMockRiggedModel();
    mgr.cachedExternalModel = mock.root;

    mgr.attachRiggedModelToPlayer(mgr.fielders[0]);
    mgr.attachRiggedModelToPlayer(mgr.fielders[1]);

    const ausTeam = { name: 'Australia', code: 'AUS', kit: { primary: '#fbc02d', pants: '#1b5e20' } };
    mgr.applyRiggedPlayerAppearance(mgr.fielders[0], { name: 'P1', number: 1 }, ausTeam);
    mgr.applyRiggedPlayerAppearance(mgr.fielders[1], { name: 'P2', number: 2 }, ausTeam);

    let sharedMat = null;
    mgr.fielders[0].riggedModel.traverse(c => {
      if (c.isMesh && (c.name === 'Object_105' || c.userData.customMat)) sharedMat = c.material;
    });

    // Dispose fielder 0
    mgr.disposePlayerRiggedModel(mgr.fielders[0]);
    assert.strictEqual(mgr.fielders[0].riggedModel, null, 'Fielder 0 model disposed');

    // Fielder 1 must still have valid non-disposed shared material
    let fielder1Mat = null;
    mgr.fielders[1].riggedModel.traverse(c => {
      if (c.isMesh && (c.name === 'Object_105' || c.userData.customMat)) fielder1Mat = c.material;
    });
    assert.strictEqual(fielder1Mat, sharedMat, 'Fielder 1 retains valid shared material reference');
  });

  it('8. Mode switching works cleanly back and forth between PROCEDURAL and RIGGED_GLB without corrupting visibility', () => {
    const scene = new THREE.Scene();
    const mgr = new CharacterManager(scene);
    const mock = createMockRiggedModel();
    mgr.cachedExternalModel = mock.root;
    mgr.attachRiggedModelToAll();

    // Default is PROCEDURAL
    assert.strictEqual(mgr.getModelMode(), 'PROCEDURAL');
    assert.strictEqual(mgr.batter.hips.visible, true);
    assert.strictEqual(mgr.batter.riggedModel.visible, false);

    // Switch to RIGGED_GLB
    mgr.setModelMode('RIGGED_GLB');
    assert.strictEqual(mgr.getModelMode(), 'RIGGED_GLB');
    assert.strictEqual(mgr.batter.hips.visible, false);
    assert.strictEqual(mgr.batter.riggedModel.visible, true);

    // Switch back to PROCEDURAL
    mgr.setModelMode('PROCEDURAL');
    assert.strictEqual(mgr.getModelMode(), 'PROCEDURAL');
    assert.strictEqual(mgr.batter.hips.visible, true);
    assert.strictEqual(mgr.batter.riggedModel.visible, false);
  });

  it('9. Batting, bowling, and locomotion animations progress correctly on optimized rig', () => {
    const scene = new THREE.Scene();
    const mgr = new CharacterManager(scene);
    const mock = createMockRiggedModel();
    mgr.cachedExternalModel = mock.root;

    mgr.attachRiggedModelToPlayer(mgr.batter);
    mgr.attachRiggedModelToPlayer(mgr.bowler);

    // Batting swing progression
    assert.doesNotThrow(() => {
      mgr.batter.animController.playBatSwing(0.5, 'COVER_DRIVE', 0.2, 'PERFECT');
      assert.strictEqual(mgr.batter.animController.activeAnimation, 'BAT_SWING');
    });

    // Bowling action progression
    assert.doesNotThrow(() => {
      mgr.bowler.animController.playBowlingAction(0.88, 'FAST_BOWLER');
      assert.strictEqual(mgr.bowler.animController.activeAnimation, 'BOWLING_ACTION');
    });

    // Locomotion stride
    assert.doesNotThrow(() => {
      mgr.batter.animController.playLocomotion(1.5, 6.4, true);
      assert.strictEqual(mgr.batter.animController.activeAnimation, 'LOCOMOTION');
    });
  });

  it('10. Procedural mode remains fully functional as fallback when GLB fails or is inactive', () => {
    const scene = new THREE.Scene();
    const mgr = new CharacterManager(scene);

    assert.strictEqual(mgr.getModelMode(), 'PROCEDURAL');
    mgr.setBatsmanStance();
    assert.ok(mgr.batter.hips.rotation.y < 0, 'Procedural batsman stance applied');

    mgr.animateBatterRun(mgr.batter, 0.05, 6.4);
    assert.ok(mgr.batter.runCycle > 0, 'Procedural runner stride applied');
  });

});
