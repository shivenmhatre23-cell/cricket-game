import * as THREE from 'three';

// Shared Geometries Cache to optimize memory and draw calls across all players
const GEOMETRY_CACHE = {
  torso: new THREE.BoxGeometry(0.44, 0.56, 0.26),
  chestPlate: new THREE.BoxGeometry(0.42, 0.28, 0.04),
  head: new THREE.SphereGeometry(0.13, 16, 16),
  helmet: new THREE.SphereGeometry(0.142, 16, 16),
  visor: new THREE.BoxGeometry(0.18, 0.02, 0.12),
  thigh: new THREE.CylinderGeometry(0.075, 0.065, 0.46, 10),
  shin: new THREE.CylinderGeometry(0.065, 0.055, 0.46, 10),
  shoe: new THREE.BoxGeometry(0.12, 0.08, 0.24),
  pad: new THREE.BoxGeometry(0.17, 0.52, 0.13),
  padKneeRoll: new THREE.CylinderGeometry(0.09, 0.09, 0.16, 8),
  bicep: new THREE.CylinderGeometry(0.06, 0.052, 0.34, 10),
  forearm: new THREE.CylinderGeometry(0.052, 0.046, 0.32, 10),
  glove: new THREE.BoxGeometry(0.1, 0.12, 0.11),
  batBlade: new THREE.BoxGeometry(0.125, 0.68, 0.045),
  batSpine: new THREE.BoxGeometry(0.08, 0.45, 0.03),
  batHandle: new THREE.CylinderGeometry(0.018, 0.018, 0.32, 10),
  stump: new THREE.CylinderGeometry(0.022, 0.022, 0.711, 12),
  bail: new THREE.CylinderGeometry(0.01, 0.01, 0.11, 8),
  hatBrim: new THREE.CylinderGeometry(0.24, 0.24, 0.02, 16),
  hatTop: new THREE.CylinderGeometry(0.14, 0.14, 0.12, 16),
  grillRod: new THREE.CylinderGeometry(0.005, 0.005, 0.16, 6)
};

// Adjust geometry anchor pivots for natural joint rotation
GEOMETRY_CACHE.torso.translate(0, 0.28, 0);
GEOMETRY_CACHE.thigh.translate(0, -0.23, 0);
GEOMETRY_CACHE.shin.translate(0, -0.23, 0);
GEOMETRY_CACHE.bicep.translate(0, -0.17, 0);
GEOMETRY_CACHE.forearm.translate(0, -0.16, 0);
GEOMETRY_CACHE.batBlade.translate(0, -0.34, 0);
GEOMETRY_CACHE.batSpine.translate(0, -0.25, -0.02);
GEOMETRY_CACHE.batHandle.translate(0, 0.12, 0);
GEOMETRY_CACHE.stump.translate(0, 0.355, 0);
GEOMETRY_CACHE.bail.rotateZ(Math.PI / 2);
GEOMETRY_CACHE.padKneeRoll.rotateZ(Math.PI / 2);
GEOMETRY_CACHE.grillRod.rotateX(Math.PI / 2);

export class CharacterManager {
  constructor(scene) {
    this.scene = scene;
    this.strikerStumps = null;
    this.nonStrikerStumps = null;
    this.batter = null;
    this.bowler = null;
    this.nonStriker = null;
    this.umpire = null;
    this.keeper = null;
    this.fielders = [];

    // Shared base materials
    this.sharedMaterials = {
      skin: new THREE.MeshStandardMaterial({ color: 0xdcae86, roughness: 0.8 }),
      pants: new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.85 }),
      pad: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }),
      shoe: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }),
      helmet: new THREE.MeshStandardMaterial({ color: 0x0d47a1, roughness: 0.4 }),
      batWood: new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.45, metalness: 0.05 }),
      batGrip: new THREE.MeshStandardMaterial({ color: 0xe53935, roughness: 0.6 }),
      grill: new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 }),
      woodStump: new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.4, metalness: 0.1 }),
      umpireShirt: new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.8 }),
      umpireHat: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })
    };

    // Team Kit Materials
    this.battingKitMat = new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.65 }); // Royal Blue
    this.bowlingKitMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.65 }); // Forest Green

    this.initStumps();
    this.initPlayers();
  }

  // --- 1. Authentic Wickets at both ends ---
  initStumps() {
    this.strikerStumps = this.createWicketSet(10.06);
    this.nonStrikerStumps = this.createWicketSet(-10.06);
  }

  createWicketSet(zPos) {
    const group = new THREE.Group();
    group.position.set(0, 0, zPos);

    const stumps = [];
    const xOffsets = [-0.114, 0, 0.114]; // Off, Middle, Leg stumps (total width 22.86cm)

    xOffsets.forEach((x, idx) => {
      const stump = new THREE.Mesh(GEOMETRY_CACHE.stump, this.sharedMaterials.woodStump);
      stump.position.set(x, 0, 0);
      stump.castShadow = true;
      stump.userData = { initialPos: stump.position.clone(), initialRot: stump.rotation.clone(), name: `stump_${idx}` };
      group.add(stump);
      stumps.push(stump);
    });

    // Two bails resting across stumps
    const bail1 = new THREE.Mesh(GEOMETRY_CACHE.bail, this.sharedMaterials.woodStump);
    bail1.position.set(-0.057, 0.715, 0);
    bail1.castShadow = true;
    bail1.userData = { initialPos: bail1.position.clone(), initialRot: bail1.rotation.clone(), name: 'bail_1' };

    const bail2 = new THREE.Mesh(GEOMETRY_CACHE.bail, this.sharedMaterials.woodStump);
    bail2.position.set(0.057, 0.715, 0);
    bail2.castShadow = true;
    bail2.userData = { initialPos: bail2.position.clone(), initialRot: bail2.rotation.clone(), name: 'bail_2' };

    group.add(bail1, bail2);
    this.scene.add(group);

    return {
      group,
      stumps,
      bails: [bail1, bail2],
      isBroken: false,
      breakWickets: (impactDir = new THREE.Vector3(0, 2, 5)) => {
        [bail1, bail2].forEach((bail, i) => {
          bail.userData.velocity = impactDir.clone().multiplyScalar(1.2 + i * 0.4).add(new THREE.Vector3((i - 0.5) * 2, 2.8, 0));
          bail.userData.rotVel = new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10);
        });
        stumps.forEach((stump, i) => {
          stump.userData.velocity = impactDir.clone().multiplyScalar(0.4 + i * 0.2).add(new THREE.Vector3((i - 1) * 0.6, 1.4, 0));
          stump.userData.rotVel = new THREE.Vector3(Math.random() * 5, 0, Math.random() * 5);
        });
      },
      reset: () => {
        stumps.forEach(stump => {
          stump.position.copy(stump.userData.initialPos);
          stump.rotation.copy(stump.userData.initialRot);
          stump.userData.velocity = null;
        });
        [bail1, bail2].forEach(bail => {
          bail.position.copy(bail.userData.initialPos);
          bail.rotation.copy(bail.userData.initialRot);
          bail.userData.velocity = null;
        });
      }
    };
  }

  // --- 2. Fully Articulated Humanoid Player Builder ---
  buildPlayer({ jerseyMaterial, isBatsman = false, hasPads = false, isUmpire = false, isKeeper = false }) {
    const group = new THREE.Group();
    const mats = this.sharedMaterials;

    // Pelvis / Hips Root
    const hips = new THREE.Group();
    hips.position.y = 0.95;
    group.add(hips);

    // Torso (Jersey)
    const torsoMesh = new THREE.Mesh(GEOMETRY_CACHE.torso, isUmpire ? mats.umpireShirt : jerseyMaterial);
    torsoMesh.castShadow = true;
    hips.add(torsoMesh);

    // Head & Helmet Joint
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.62;
    hips.add(headGroup);

    const headMesh = new THREE.Mesh(GEOMETRY_CACHE.head, mats.skin);
    headGroup.add(headMesh);

    if (!isUmpire) {
      // Cricket Helmet with peak visor and face grille
      const helmetMesh = new THREE.Mesh(GEOMETRY_CACHE.helmet, mats.helmet);
      helmetMesh.position.set(0, 0.02, -0.01);
      headGroup.add(helmetMesh);

      const visor = new THREE.Mesh(GEOMETRY_CACHE.visor, mats.helmet);
      visor.position.set(0, 0.02, 0.14);
      headGroup.add(visor);

      // Grille bars
      [-0.05, 0, 0.05].forEach(gx => {
        const grill = new THREE.Mesh(GEOMETRY_CACHE.grillRod, mats.grill);
        grill.position.set(gx, -0.06, 0.13);
        headGroup.add(grill);
      });
    } else {
      // Umpire wide-brim sun hat
      const brim = new THREE.Mesh(GEOMETRY_CACHE.hatBrim, mats.umpireHat);
      brim.position.y = 0.1;
      const top = new THREE.Mesh(GEOMETRY_CACHE.hatTop, mats.umpireHat);
      top.position.y = 0.16;
      headGroup.add(brim, top);
    }

    // Legs with Hip and Knee articulations
    const createLeg = (xOffset) => {
      const hipJoint = new THREE.Group();
      hipJoint.position.set(xOffset, 0, 0);

      const thigh = new THREE.Mesh(GEOMETRY_CACHE.thigh, mats.pants);
      thigh.castShadow = true;
      hipJoint.add(thigh);

      const kneeJoint = new THREE.Group();
      kneeJoint.position.y = -0.46;
      hipJoint.add(kneeJoint);

      const shin = new THREE.Mesh(GEOMETRY_CACHE.shin, mats.pants);
      shin.castShadow = true;
      kneeJoint.add(shin);

      // Cricket Batting / Keeper Pads
      if (hasPads) {
        const padMesh = new THREE.Mesh(GEOMETRY_CACHE.pad, mats.pad);
        padMesh.position.set(0, -0.2, 0.06);
        padMesh.castShadow = true;
        kneeJoint.add(padMesh);

        const kneeRoll = new THREE.Mesh(GEOMETRY_CACHE.padKneeRoll, mats.pad);
        kneeRoll.position.set(0, -0.02, 0.1);
        kneeJoint.add(kneeRoll);
      }

      // Shoes
      const shoe = new THREE.Mesh(GEOMETRY_CACHE.shoe, mats.shoe);
      shoe.position.set(0, -0.44, 0.05);
      shoe.castShadow = true;
      kneeJoint.add(shoe);

      hips.add(hipJoint);
      return { hip: hipJoint, knee: kneeJoint };
    };

    const leftLeg = createLeg(-0.13);
    const rightLeg = createLeg(0.13);

    // Arms with Shoulder and Elbow articulations
    const createArm = (xOffset) => {
      const shoulderJoint = new THREE.Group();
      shoulderJoint.position.set(xOffset, 0.5, 0);

      const bicep = new THREE.Mesh(GEOMETRY_CACHE.bicep, isUmpire ? mats.umpireShirt : jerseyMaterial);
      bicep.castShadow = true;
      shoulderJoint.add(bicep);

      const elbowJoint = new THREE.Group();
      elbowJoint.position.y = -0.34;
      shoulderJoint.add(elbowJoint);

      const forearm = new THREE.Mesh(GEOMETRY_CACHE.forearm, mats.skin);
      forearm.castShadow = true;
      elbowJoint.add(forearm);

      // Glove / Hand
      const glove = new THREE.Mesh(GEOMETRY_CACHE.glove, hasPads ? mats.pad : mats.skin);
      glove.position.y = -0.32;
      glove.castShadow = true;
      elbowJoint.add(glove);

      hips.add(shoulderJoint);
      return { shoulder: shoulderJoint, elbow: elbowJoint, glove };
    };

    const leftArm = createArm(-0.25);
    const rightArm = createArm(0.25);

    // Cricket Bat for Batsman
    let bat = null;
    if (isBatsman) {
      const batGroup = new THREE.Group();

      const blade = new THREE.Mesh(GEOMETRY_CACHE.batBlade, mats.batWood);
      blade.castShadow = true;
      batGroup.add(blade);

      const spine = new THREE.Mesh(GEOMETRY_CACHE.batSpine, mats.batWood);
      blade.add(spine);

      const handle = new THREE.Mesh(GEOMETRY_CACHE.batHandle, mats.batGrip);
      handle.castShadow = true;
      batGroup.add(handle);

      // Attach bat to right hand
      rightArm.glove.add(batGroup);
      batGroup.position.set(0, -0.06, 0.05);
      batGroup.rotation.x = Math.PI * 0.15;
      bat = batGroup;
    }

    this.scene.add(group);

    return {
      group,
      hips,
      torso: torsoMesh,
      head: headGroup,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      bat,
      isBatsman,
      isUmpire,
      isKeeper
    };
  }

  // --- 3. Instantiate Pitch & Field Lineups ---
  initPlayers() {
    // Striker Batsman positioned accurately inside popping crease (at Z = 9.15m)
    this.batter = this.buildPlayer({
      jerseyMaterial: this.battingKitMat,
      isBatsman: true,
      hasPads: true
    });
    this.batter.group.position.set(0.1, 0, 9.15);
    this.batter.group.rotation.y = Math.PI; // Face the bowler (-Z)
    this.setBatsmanStance();

    // Non-Striker Batsman at non-striker popping crease (Z = -8.6m)
    this.nonStriker = this.buildPlayer({
      jerseyMaterial: this.battingKitMat,
      isBatsman: true,
      hasPads: true
    });
    this.nonStriker.group.position.set(1.2, 0, -8.6);
    this.nonStriker.group.rotation.y = 0; // Face striker (+Z)
    this.setNonStrikerStance();

    // Bowler starting run-up at Z = -24m
    this.bowler = this.buildPlayer({
      jerseyMaterial: this.bowlingKitMat,
      isBatsman: false,
      hasPads: false
    });
    this.bowler.group.position.set(0.8, 0, -24.0);
    this.bowler.group.rotation.y = 0; // Facing striker
    this.setBowlerReadyStance();

    // Umpire standing behind non-striker stumps at Z = -11.6m
    this.umpire = this.buildPlayer({
      jerseyMaterial: this.sharedMaterials.umpireShirt,
      isBatsman: false,
      hasPads: false,
      isUmpire: true
    });
    this.umpire.group.position.set(0, 0, -11.6);
    this.umpire.group.rotation.y = 0;

    // Wicketkeeper standing behind striker stumps at Z = 11.8m
    this.keeper = this.buildPlayer({
      jerseyMaterial: this.bowlingKitMat,
      isBatsman: false,
      hasPads: true,
      isKeeper: true
    });
    this.keeper.group.position.set(0, 0, 11.8);
    this.keeper.group.rotation.y = Math.PI;
    this.setKeeperStance();

    // 10 Fielders placed in authentic cricket fielding positions
    const fielderPlacements = [
      { name: '1st Slip', x: -2.6, z: 12.2 },
      { name: 'Gully', x: -9.5, z: 9.8 },
      { name: 'Point', x: -18.5, z: 6.5 },
      { name: 'Cover', x: -22.5, z: -2.0 },
      { name: 'Mid Off', x: -8.0, z: -14.0 },
      { name: 'Mid On', x: 8.0, z: -14.0 },
      { name: 'Mid Wicket', x: 22.5, z: -2.5 },
      { name: 'Square Leg', x: 20.0, z: 8.5 },
      { name: 'Fine Leg', x: 16.5, z: 24.5 },
      { name: 'Third Man', x: -18.5, z: 26.0 }
    ];

    this.fielders = fielderPlacements.map(pos => {
      const f = this.buildPlayer({
        jerseyMaterial: this.bowlingKitMat,
        isBatsman: false,
        hasPads: false
      });
      f.group.position.set(pos.x, 0, pos.z);
      f.group.lookAt(0, 0.9, 9.15); // Look towards striker
      f.name = pos.name;
      f.basePos = new THREE.Vector3(pos.x, 0, pos.z);
      this.setFielderStance(f);
      return f;
    });
  }

  // Safe joint transforms preventing crashes on missing optional bones
  safeRot(joint, x, y, z) {
    if (joint && joint.rotation) {
      if (typeof x === 'number') joint.rotation.x = x;
      if (typeof y === 'number') joint.rotation.y = y;
      if (typeof z === 'number') joint.rotation.z = z;
    }
  }

  safePos(joint, x, y, z) {
    if (joint && joint.position) {
      if (typeof x === 'number') joint.position.x = x;
      if (typeof y === 'number') joint.position.y = y;
      if (typeof z === 'number') joint.position.z = z;
    }
  }

  // --- 4. Authentic Cricket Poses ---
  setBatsmanStance() {
    const b = this.batter;
    if (!b) return;

    this.safePos(b.hips, 0, 0.93, 0);
    this.safeRot(b.hips, 0, -Math.PI * 0.45, 0);

    this.safeRot(b.leftLeg?.hip, -0.15, 0, 0.05);
    this.safeRot(b.leftLeg?.knee, 0.2, 0, 0);
    this.safeRot(b.rightLeg?.hip, 0.1, 0, -0.05);
    this.safeRot(b.rightLeg?.knee, 0.15, 0, 0);

    this.safeRot(b.leftArm?.shoulder, 0.65, 0, -0.35);
    this.safeRot(b.leftArm?.elbow, -0.4, 0, 0);
    this.safeRot(b.rightArm?.shoulder, 0.8, 0, 0.2);
    this.safeRot(b.rightArm?.elbow, -0.3, 0, 0);

    if (b.bat) {
      this.safeRot(b.bat, 0.35, 0, -0.15);
    }
  }

  setNonStrikerStance() {
    const ns = this.nonStriker;
    if (!ns) return;
    this.safePos(ns.hips, 0, 0.95, 0);
    this.safeRot(ns.leftArm?.shoulder, 0.3, 0, 0);
    this.safeRot(ns.rightArm?.shoulder, 0.4, 0, 0);
    if (ns.bat) {
      this.safeRot(ns.bat, 0.8, 0, 0);
    }
  }

  setBowlerReadyStance() {
    const bw = this.bowler;
    if (!bw) return;
    this.safePos(bw.hips, 0, 0.95, 0);
    this.safeRot(bw.leftLeg?.hip, 0, 0, 0);
    this.safeRot(bw.rightLeg?.hip, 0, 0, 0);
    this.safeRot(bw.leftArm?.shoulder, 0.2, 0, 0);
    this.safeRot(bw.rightArm?.shoulder, 0.2, 0, 0);
  }

  setKeeperStance() {
    const k = this.keeper;
    if (!k) return;
    this.safePos(k.hips, 0, 0.68, 0);
    this.safeRot(k.leftLeg?.hip, -0.75, 0, 0.2);
    this.safeRot(k.rightLeg?.hip, -0.75, 0, -0.2);
    this.safeRot(k.leftLeg?.knee, 1.1, 0, 0);
    this.safeRot(k.rightLeg?.knee, 1.1, 0, 0);
    this.safeRot(k.leftArm?.shoulder, 0.5, 0, -0.2);
    this.safeRot(k.rightArm?.shoulder, 0.5, 0, 0.2);
    this.safeRot(k.leftArm?.elbow, -0.6, 0, 0);
    this.safeRot(k.rightArm?.elbow, -0.6, 0, 0);
  }

  setFielderStance(fielder) {
    if (!fielder) return;
    this.safePos(fielder.hips, 0, 0.88, 0);
    this.safeRot(fielder.leftLeg?.hip, -0.25, 0, 0.1);
    this.safeRot(fielder.rightLeg?.hip, -0.25, 0, -0.1);
    this.safeRot(fielder.leftLeg?.knee, 0.35, 0, 0);
    this.safeRot(fielder.rightLeg?.knee, 0.35, 0, 0);
    this.safeRot(fielder.leftArm?.shoulder, 0.4, 0, -0.1);
    this.safeRot(fielder.rightArm?.shoulder, 0.4, 0, 0.1);
  }

  // --- 5. Dynamic Bat Swing Animation for 6 Distinct Shots ---
  playBatSwing(progress, shotKey = 'STRAIGHT_DRIVE', shotAngle = Math.PI, timingQuality = null) {
    const b = this.batter;
    if (!b || !b.bat) return;

    // Normalizing and clamping progress to [0, 1]
    const p = Math.max(0, Math.min(1, progress));
    if (p <= 0 || p >= 1) {
      this.setBatsmanStance();
      return;
    }

    const swing = Math.sin(p * Math.PI);

    // Subtle edge / bat angle feedback on mistimed or missed shots
    let edgeOffset = 0;
    if (timingQuality === 'EARLY') {
      edgeOffset = swing * 0.16; // Closed face, leading edge tilt
    } else if (timingQuality === 'LATE') {
      edgeOffset = -swing * 0.16; // Open face, outside edge tilt
    }

    switch (shotKey) {
      case 'DEFENSIVE':
        // Compact defensive block: stride forward, soft hands, angled bat down into turf
        this.safePos(b.hips, 0, 0.93, -swing * 0.12);
        this.safeRot(b.hips, swing * 0.06, -Math.PI * 0.45, 0);
        this.safeRot(b.leftLeg?.hip, -0.15 - swing * 0.35, 0, 0.05);
        this.safeRot(b.leftLeg?.knee, 0.2 + swing * 0.25, 0, 0);
        this.safeRot(b.rightLeg?.hip, 0.1, 0, -0.05);
        this.safeRot(b.leftArm?.shoulder, 0.65 - swing * 0.9, 0, -0.35 + swing * 0.1);
        this.safeRot(b.leftArm?.elbow, -0.4 - swing * 0.2, 0, 0);
        this.safeRot(b.rightArm?.shoulder, 0.8 - swing * 0.85, 0, 0.2);
        this.safeRot(b.rightArm?.elbow, -0.3 - swing * 0.15, 0, 0);
        this.safeRot(b.bat, 0.35 - swing * 0.85, 0, -0.15 + swing * 0.08 + edgeOffset);
        break;

      case 'STRAIGHT_DRIVE':
        // Classical straight drive: high front elbow, vertical bat face down the V
        this.safePos(b.hips, 0, 0.93, -swing * 0.14);
        this.safeRot(b.hips, 0, -Math.PI * 0.45 + swing * 0.22, 0);
        this.safeRot(b.leftLeg?.hip, -0.15 - swing * 0.38, 0, 0.05);
        this.safeRot(b.leftLeg?.knee, 0.2 + swing * 0.3, 0, 0);
        this.safeRot(b.leftArm?.shoulder, 0.65 - swing * 2.1, 0, -0.35 + swing * 0.15);
        this.safeRot(b.leftArm?.elbow, -0.4 - swing * 0.45, 0, 0);
        this.safeRot(b.rightArm?.shoulder, 0.8 - swing * 2.15, 0, 0.2);
        this.safeRot(b.rightArm?.elbow, -0.3 - swing * 0.45, 0, 0);
        this.safeRot(b.bat, 0.35 - swing * 2.45, 0, -0.15 + swing * 0.12 + edgeOffset);
        break;

      case 'COVER_DRIVE':
        // Leaning off-drive: hips and torso open to covers, high elbow presentation
        this.safePos(b.hips, swing * 0.12, 0.93, -swing * 0.1);
        this.safeRot(b.hips, 0, -Math.PI * 0.45 - swing * 0.55, 0);
        this.safeRot(b.leftLeg?.hip, -0.15 - swing * 0.32, 0, 0.05 + swing * 0.35);
        this.safeRot(b.leftLeg?.knee, 0.2 + swing * 0.28, 0, 0);
        this.safeRot(b.leftArm?.shoulder, 0.65 - swing * 1.9, 0, -0.35 - swing * 0.25);
        this.safeRot(b.leftArm?.elbow, -0.4 - swing * 0.35, 0, 0);
        this.safeRot(b.rightArm?.shoulder, 0.8 - swing * 2.05, 0, 0.2 - swing * 0.3);
        this.safeRot(b.rightArm?.elbow, -0.3 - swing * 0.35, 0, 0);
        this.safeRot(b.bat, 0.35 - swing * 2.3, 0, -0.15 - swing * 0.65 + edgeOffset);
        break;

      case 'PULL_SHOT':
        // Horizontal cross-bat pull: swivel on back foot towards mid-wicket
        this.safePos(b.hips, 0, 0.93, swing * 0.14);
        this.safeRot(b.hips, 0, -Math.PI * 0.45 + swing * 1.15, 0);
        this.safeRot(b.leftLeg?.hip, -0.15 + swing * 0.12, swing * 0.55, 0.05);
        this.safeRot(b.rightLeg?.hip, 0.1 + swing * 0.22, 0, -0.05);
        this.safeRot(b.leftArm?.shoulder, 0.65 - swing * 1.25, swing * 0.75, -0.35);
        this.safeRot(b.rightArm?.shoulder, 0.8 - swing * 1.35, swing * 0.85, 0.2);
        this.safeRot(b.rightArm?.elbow, -0.3 - swing * 0.3, 0, 0);
        this.safeRot(b.bat, 0.35 - swing * 1.5, 0, -0.15 + swing * 1.05 + edgeOffset);
        break;

      case 'CUT_SHOT':
        // Back-foot square cut: rock back & across, high-to-low slashing arc through off-side
        this.safePos(b.hips, swing * 0.12, 0.93, swing * 0.16);
        this.safeRot(b.hips, 0, -Math.PI * 0.45 - swing * 0.42, 0);
        this.safeRot(b.leftLeg?.hip, -0.15 + swing * 0.1, 0, 0.05);
        this.safeRot(b.rightLeg?.hip, 0.1 + swing * 0.25, 0, -0.05);
        this.safeRot(b.leftArm?.shoulder, 0.65 - swing * 1.55, -swing * 0.35, -0.35);
        this.safeRot(b.rightArm?.shoulder, 0.8 - swing * 1.85, -swing * 0.45, 0.2 + swing * 0.2);
        this.safeRot(b.rightArm?.elbow, -0.3 - swing * 0.35, 0, 0);
        this.safeRot(b.bat, 0.35 - swing * 2.1, 0, -0.15 - swing * 0.95 + edgeOffset);
        break;

      case 'LOFTED_ATTACK':
      default:
        // High aggressive aerial swing: explosive upward launch into the sky
        this.safePos(b.hips, 0, 0.93 + swing * 0.06, -swing * 0.08);
        this.safeRot(b.hips, -swing * 0.18, -Math.PI * 0.45 + (shotAngle - Math.PI) * 0.7 * swing, 0);
        this.safeRot(b.leftLeg?.hip, -0.15 - swing * 0.35, 0, 0.05);
        this.safeRot(b.leftLeg?.knee, 0.2 + swing * 0.25, 0, 0);
        this.safeRot(b.leftArm?.shoulder, 0.65 - swing * 2.7, 0, -0.35 + swing * 0.2);
        this.safeRot(b.leftArm?.elbow, -0.4 - swing * 0.5, 0, 0);
        this.safeRot(b.rightArm?.shoulder, 0.8 - swing * 2.9, 0, 0.2 - swing * 0.15);
        this.safeRot(b.rightArm?.elbow, -0.3 - swing * 0.75, 0, 0);
        this.safeRot(b.bat, 0.35 - swing * 3.35, 0, -0.15 + swing * 0.45 + edgeOffset);
        break;
    }
  }

  // Calculate bat sweet spot world position for collision check
  getBatSweetSpot() {
    if (!this.batter || !this.batter.bat) return new THREE.Vector3(0.1, 0.7, 9.15);
    const pos = new THREE.Vector3();
    this.batter.bat.getWorldPosition(pos);
    return pos;
  }

  resetBatter() {
    this.setBatsmanStance();
  }

  // Update physical wickets and bails
  update(delta) {
    [this.strikerStumps, this.nonStrikerStumps].forEach(wicketSet => {
      if (!wicketSet) return;
      wicketSet.stumps.forEach(stump => {
        if (stump.userData.velocity) {
          stump.userData.velocity.y -= 9.8 * delta;
          stump.position.addScaledVector(stump.userData.velocity, delta);
          if (stump.position.y < 0) {
            stump.position.y = 0;
            stump.userData.velocity.set(0, 0, 0);
          }
          stump.rotation.x += stump.userData.rotVel.x * delta;
          stump.rotation.z += stump.userData.rotVel.z * delta;
        }
      });
      wicketSet.bails.forEach(bail => {
        if (bail.userData.velocity) {
          bail.userData.velocity.y -= 9.8 * delta;
          bail.position.addScaledVector(bail.userData.velocity, delta);
          if (bail.position.y < 0) {
            bail.position.y = 0;
            bail.userData.velocity.set(0, 0, 0);
          }
          bail.rotation.x += bail.userData.rotVel.x * delta;
          bail.rotation.y += bail.userData.rotVel.y * delta;
        }
      });
    });
  }

  setTeamColors(battingColor, bowlingColor) {
    if (battingColor && this.battingKitMat) {
      this.battingKitMat.color.set(battingColor);
    }
    if (bowlingColor && this.bowlingKitMat) {
      this.bowlingKitMat.color.set(bowlingColor);
    }
  }
}

