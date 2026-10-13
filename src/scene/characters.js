import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { RiggedAnimationController } from './riggedAnimationController.js';

// Procedural Face Material Generator with distinct facial features, complexion, and beards
export function createFaceMaterial(playerData) {
  const skinColor = playerData?.face?.skin || '#dcae86';
  const beardType = playerData?.face?.beard || 'CLEAN_SHAVEN';
  const hairColor = playerData?.face?.hair || '#1a120b';
  const eyeColor = playerData?.face?.eyes || '#2c1e13';

  if (typeof document === 'undefined') {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(skinColor),
      roughness: 0.8
    });
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Base skin complexion
  ctx.fillStyle = skinColor;
  ctx.fillRect(0, 0, 256, 256);

  // Soft facial depth gradient (jaw / cheek contouring)
  const grad = ctx.createRadialGradient(128, 110, 30, 128, 128, 120);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.0)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Hairline & Temples
  ctx.fillStyle = hairColor;
  ctx.beginPath();
  ctx.moveTo(30, 0);
  ctx.lineTo(226, 0);
  ctx.lineTo(220, 52);
  ctx.quadraticCurveTo(128, 42, 36, 52);
  ctx.closePath();
  ctx.fill();

  // Sideburns
  ctx.fillRect(32, 50, 18, 55);
  ctx.fillRect(206, 50, 18, 55);

  // Eyebrows
  ctx.fillStyle = hairColor;
  ctx.lineWidth = 5;
  ctx.strokeStyle = hairColor;
  // Left eyebrow
  ctx.beginPath();
  ctx.moveTo(68, 92);
  ctx.quadraticCurveTo(95, 84, 116, 91);
  ctx.stroke();

  // Right eyebrow
  ctx.beginPath();
  ctx.moveTo(140, 91);
  ctx.quadraticCurveTo(161, 84, 188, 92);
  ctx.stroke();

  // Eyes (Sclera + Iris + Pupil + Highlight)
  const drawEye = (cx, cy) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Iris
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Eye catchlight glint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(cx - 1.5, cy - 1.5, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Upper eyelid line
    ctx.strokeStyle = 'rgba(20, 15, 10, 0.7)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, cy - 1, 14, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  };
  drawEye(92, 106);
  drawEye(164, 106);

  // Nose bridge & nostrils
  ctx.strokeStyle = 'rgba(60, 35, 15, 0.25)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(128, 98);
  ctx.lineTo(124, 142);
  ctx.lineTo(132, 142);
  ctx.stroke();

  ctx.fillStyle = 'rgba(50, 25, 10, 0.35)';
  ctx.beginPath();
  ctx.ellipse(120, 145, 3.5, 2, 0, 0, Math.PI * 2);
  ctx.ellipse(136, 145, 3.5, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Lips
  ctx.fillStyle = 'rgba(160, 70, 60, 0.55)';
  ctx.beginPath();
  ctx.ellipse(128, 172, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(100, 35, 30, 0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(114, 172);
  ctx.lineTo(142, 172);
  ctx.stroke();

  // Unique Facial Hair / Beard Styles
  ctx.fillStyle = hairColor;
  ctx.strokeStyle = hairColor;

  if (beardType === 'STYLED_BEARD') {
    // Signature Virat Kohli trimmed chiseled beard
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(48, 120);
    ctx.quadraticCurveTo(128, 226, 208, 120);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(128, 194, 22, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(128, 162, 19, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (beardType === 'FULL_TRIMMED') {
    // Rohit Sharma / Tim David full trimmed beard
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(44, 115);
    ctx.quadraticCurveTo(128, 230, 212, 115);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(128, 192, 28, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(128, 162, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (beardType === 'WARRIOR_BEARD') {
    // Ravindra Jadeja dense Rajputana beard
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(42, 110);
    ctx.quadraticCurveTo(128, 236, 214, 110);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(128, 196, 34, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(100, 165);
    ctx.quadraticCurveTo(128, 155, 156, 165);
    ctx.stroke();
  } else if (beardType === 'GOATEE_STUBBLE') {
    // Hardik Pandya goatee & soul patch
    ctx.beginPath();
    ctx.ellipse(128, 194, 15, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(128, 163, 16, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(20, 15, 10, 0.28)';
    ctx.fillRect(52, 140, 152, 50);
  } else if (beardType === 'MOUSTACHE') {
    // Travis Head classic moustache
    ctx.beginPath();
    ctx.ellipse(128, 160, 24, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (beardType === 'MOUSTACHE_STUBBLE') {
    ctx.beginPath();
    ctx.ellipse(128, 161, 21, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(20, 15, 10, 0.25)';
    ctx.fillRect(60, 160, 136, 40);
  } else if (beardType === 'FULL_BEARD') {
    // Moeen Ali / Adil Rashid / Iftikhar Ahmed
    ctx.beginPath();
    ctx.ellipse(128, 196, 40, 36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(128, 160, 25, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (beardType === 'RED_BEARD') {
    // Jonny Bairstow ginger beard
    ctx.fillStyle = '#b8542c';
    ctx.beginPath();
    ctx.ellipse(128, 192, 28, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(128, 162, 19, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (beardType.includes('STUBBLE') || beardType.includes('LIGHT')) {
    ctx.fillStyle = 'rgba(20, 15, 10, 0.24)';
    ctx.beginPath();
    ctx.ellipse(128, 185, 36, 26, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.75,
    metalness: 0.05
  });
}

// Procedural Multi-Face Jersey Material with authentic team front & back player name / big number
export function createJerseyMaterials(playerData, teamData) {
  const team = teamData || {
    name: 'India',
    color: '#1565c0',
    kit: {
      primary: '#1565c0',
      secondary: '#ff6f00',
      accent: '#0d47a1',
      text: '#ffffff',
      countryText: 'INDIA'
    }
  };
  const kit = team.kit || {
    primary: team.color || '#1565c0',
    secondary: '#ff6f00',
    accent: '#0d47a1',
    text: '#ffffff',
    countryText: team.name?.toUpperCase() || 'CRICKET'
  };

  const playerName = playerData?.name || 'PLAYER';
  let displaySurname = playerName.replace(/\s*\(.*?\)\s*/g, '').trim();
  const nameParts = displaySurname.split(/\s+/);
  if (nameParts.length > 1) {
    displaySurname = nameParts[nameParts.length - 1].toUpperCase();
  } else {
    displaySurname = displaySurname.toUpperCase();
  }
  const jerseyNumber = playerData?.number !== undefined ? String(playerData.number) : '00';

  if (typeof document === 'undefined') {
    const fallbackMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(kit.primary),
      roughness: 0.65
    });
    return [fallbackMat, fallbackMat, fallbackMat, fallbackMat, fallbackMat, fallbackMat];
  }

  // --- Front Material (Chest with Country Name, Crest, Collar) ---
  const frontCanvas = document.createElement('canvas');
  frontCanvas.width = 256;
  frontCanvas.height = 256;
  const fctx = frontCanvas.getContext('2d');

  fctx.fillStyle = kit.primary;
  fctx.fillRect(0, 0, 256, 256);

  // Subtle athletic jersey honeycomb / angled stripe pattern
  fctx.fillStyle = kit.secondary;
  fctx.globalAlpha = 0.22;
  for (let i = 0; i < 256; i += 28) {
    fctx.fillRect(i, 0, 6, 256);
  }
  fctx.globalAlpha = 1.0;

  // Collar V-neck chevron
  fctx.fillStyle = kit.secondary;
  fctx.beginPath();
  fctx.moveTo(90, 0);
  fctx.lineTo(128, 48);
  fctx.lineTo(166, 0);
  fctx.closePath();
  fctx.fill();

  fctx.fillStyle = kit.accent;
  fctx.beginPath();
  fctx.moveTo(104, 0);
  fctx.lineTo(128, 32);
  fctx.lineTo(152, 0);
  fctx.closePath();
  fctx.fill();

  // Left chest: National Cricket Emblem / Crest badge
  fctx.fillStyle = kit.secondary;
  fctx.beginPath();
  fctx.arc(64, 82, 14, 0, Math.PI * 2);
  fctx.fill();
  fctx.fillStyle = '#ffffff';
  fctx.beginPath();
  fctx.arc(64, 82, 9, 0, Math.PI * 2);
  fctx.fill();
  fctx.fillStyle = kit.accent;
  fctx.font = 'bold 11px sans-serif';
  fctx.textAlign = 'center';
  fctx.textBaseline = 'middle';
  fctx.fillText('★', 64, 82);

  // Right chest: small jersey number
  fctx.fillStyle = kit.text;
  fctx.font = '900 16px monospace';
  fctx.textAlign = 'center';
  fctx.textBaseline = 'middle';
  fctx.fillText(jerseyNumber, 192, 82);

  // Country Name in bold varsity letters across chest
  fctx.fillStyle = kit.text;
  fctx.font = '900 32px sans-serif';
  fctx.textAlign = 'center';
  fctx.textBaseline = 'middle';
  fctx.shadowColor = 'rgba(0,0,0,0.6)';
  fctx.shadowBlur = 4;
  fctx.fillText(kit.countryText || team.name.toUpperCase(), 128, 140);
  fctx.shadowBlur = 0;

  // Lower waist trim band
  fctx.fillStyle = kit.secondary;
  fctx.fillRect(0, 242, 256, 14);

  const frontTexture = new THREE.CanvasTexture(frontCanvas);
  const frontMat = new THREE.MeshStandardMaterial({ map: frontTexture, roughness: 0.65 });

  // --- Back Material (Player Name + Large Jersey Number) ---
  const backCanvas = document.createElement('canvas');
  backCanvas.width = 256;
  backCanvas.height = 256;
  const bctx = backCanvas.getContext('2d');

  bctx.fillStyle = kit.primary;
  bctx.fillRect(0, 0, 256, 256);

  // Upper back yoke band
  bctx.fillStyle = kit.secondary;
  bctx.fillRect(0, 0, 256, 24);

  // Player Surname in arched bold capital letters
  bctx.fillStyle = kit.text;
  bctx.font = '900 28px sans-serif';
  bctx.textAlign = 'center';
  bctx.textBaseline = 'middle';
  bctx.shadowColor = 'rgba(0,0,0,0.6)';
  bctx.shadowBlur = 4;
  bctx.fillText(displaySurname, 128, 58);

  // Giant 2-Digit Jersey Number
  bctx.font = '900 96px sans-serif';
  bctx.lineWidth = 6;
  bctx.strokeStyle = kit.accent;
  bctx.strokeText(jerseyNumber, 128, 150);
  bctx.fillText(jerseyNumber, 128, 150);
  bctx.shadowBlur = 0;

  // Lower waist band
  bctx.fillStyle = kit.secondary;
  bctx.fillRect(0, 242, 256, 14);

  const backTexture = new THREE.CanvasTexture(backCanvas);
  const backMat = new THREE.MeshStandardMaterial({ map: backTexture, roughness: 0.65 });

  // --- Sides Material with Athletic Racing Stripe ---
  const sideCanvas = document.createElement('canvas');
  sideCanvas.width = 128;
  sideCanvas.height = 256;
  const sctx = sideCanvas.getContext('2d');
  sctx.fillStyle = kit.primary;
  sctx.fillRect(0, 0, 128, 256);
  sctx.fillStyle = kit.secondary;
  sctx.fillRect(52, 0, 24, 256);
  sctx.fillStyle = kit.accent;
  sctx.fillRect(60, 0, 8, 256);
  const sideTexture = new THREE.CanvasTexture(sideCanvas);
  const sideMat = new THREE.MeshStandardMaterial({ map: sideTexture, roughness: 0.65 });

  // Top & Bottom
  const capMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(kit.primary), roughness: 0.65 });

  // Order for Three.js BoxGeometry: [right(+x), left(-x), top(+y), bottom(-y), front(+z), back(-z)]
  return [sideMat, sideMat, capMat, capMat, frontMat, backMat];
}

// Crisp Jersey Back Badge with Player Surname & Large 2-digit Number for Rigged Humanoid Model
export function createJerseyBackBadge(playerData, teamData) {
  const kit = teamData?.kit || {
    primary: teamData?.color || '#1565c0',
    secondary: '#ff6f00',
    accent: '#0d47a1',
    text: '#ffffff'
  };

  const playerName = playerData?.name
    ? playerData.name.replace(/\s*\(C\)|\s*\(WK\)/gi, '').split('. ').pop()?.toUpperCase() || 'PLAYER'
    : 'LEGEND';
  const playerNumber = playerData?.number !== undefined ? String(playerData.number) : '07';

  if (typeof document === 'undefined') {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(kit.primary),
      roughness: 0.65
    });
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Background in team kit primary color
  ctx.fillStyle = kit.primary;
  ctx.fillRect(0, 0, 256, 256);

  // Border & trim in secondary accent color
  ctx.strokeStyle = kit.secondary;
  ctx.lineWidth = 10;
  ctx.strokeRect(6, 6, 244, 244);

  // Top header bar
  ctx.fillStyle = kit.secondary;
  ctx.fillRect(0, 0, 256, 20);

  // Player Surname
  ctx.fillStyle = kit.text || '#ffffff';
  ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 4;
  ctx.fillText(playerName, 128, 64);

  // Big 2-digit Jersey Number
  ctx.font = '900 120px "Segoe UI", Arial, sans-serif';
  ctx.shadowBlur = 6;
  ctx.fillText(playerNumber, 128, 165);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.strokeText(playerNumber, 128, 165);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.65,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });
}

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
  grillRod: new THREE.CylinderGeometry(0.005, 0.005, 0.16, 6),
  jerseyBadge: new THREE.PlaneGeometry(0.24, 0.28)
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

    // Optional Character Model System: 'PROCEDURAL' (default) or 'RIGGED_GLB'
    this.modelMode = 'PROCEDURAL';
    this.cachedExternalModel = null;
    this.isExternalModelLoading = false;
    this.externalModelLoadError = null;

    // Running Between Wickets Locomotion System
    this.initRunningBetweenWickets();

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

    const wicketSet = {
      group,
      stumps,
      bails: [bail1, bail2],
      isBroken: false,
      breakWickets: (impactDir = new THREE.Vector3(0, 2, 5)) => {
        wicketSet.isBroken = true;
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
        wicketSet.isBroken = false;
        stumps.forEach(stump => {
          stump.position.copy(stump.userData.initialPos);
          stump.rotation.copy(stump.userData.initialRot);
          stump.userData.velocity = null;
          if (stump.userData.rotVel) stump.userData.rotVel.set(0, 0, 0);
        });
        [bail1, bail2].forEach(bail => {
          bail.position.copy(bail.userData.initialPos);
          bail.rotation.copy(bail.userData.initialRot);
          bail.userData.velocity = null;
          if (bail.userData.rotVel) bail.userData.rotVel.set(0, 0, 0);
        });
      }
    };
    return wicketSet;
  }

  // --- 2. Fully Articulated Humanoid Player Builder ---
  buildPlayer({ jerseyMaterial, isBatsman = false, hasPads = false, isUmpire = false, isKeeper = false, playerData = null, teamData = null }) {
    const group = new THREE.Group();
    const mats = this.sharedMaterials;

    const kit = teamData?.kit || {
      primary: teamData?.color || '#1565c0',
      secondary: '#ff6f00',
      accent: '#0d47a1',
      pants: '#0d47a1',
      pads: '#0d47a1',
      helmet: '#0d47a1',
      text: '#ffffff'
    };

    // Pelvis / Hips Root
    const hips = new THREE.Group();
    hips.position.y = 0.95;
    group.add(hips);

    // Torso (Jersey with authentic country front and player name + big number back)
    const torsoMat = (playerData && teamData)
      ? createJerseyMaterials(playerData, teamData)
      : (isUmpire ? mats.umpireShirt : (jerseyMaterial || this.battingKitMat));

    const torsoMesh = new THREE.Mesh(GEOMETRY_CACHE.torso, torsoMat);
    torsoMesh.castShadow = true;
    hips.add(torsoMesh);

    // Head & Helmet Joint
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.62;
    hips.add(headGroup);

    // Head Face with distinct player complexion, eyes, eyebrows, nose, and styled beard
    const headMat = playerData ? createFaceMaterial(playerData) : mats.skin;
    const headMesh = new THREE.Mesh(GEOMETRY_CACHE.head, headMat);
    headGroup.add(headMesh);

    let helmetMesh = null;
    let visor = null;

    if (!isUmpire) {
      // Cricket Helmet with peak visor and face grille in team helmet color
      const helmetColorMat = kit.helmet
        ? new THREE.MeshStandardMaterial({ color: new THREE.Color(kit.helmet), roughness: 0.4 })
        : mats.helmet;

      helmetMesh = new THREE.Mesh(GEOMETRY_CACHE.helmet, helmetColorMat);
      helmetMesh.position.set(0, 0.02, -0.01);
      headGroup.add(helmetMesh);

      visor = new THREE.Mesh(GEOMETRY_CACHE.visor, helmetColorMat);
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

    // Legs with Hip and Knee articulations in team pants color
    const pantsMat = (!isUmpire && kit.pants)
      ? new THREE.MeshStandardMaterial({ color: new THREE.Color(kit.pants), roughness: 0.85 })
      : mats.pants;

    const padMat = (hasPads && kit.pads)
      ? new THREE.MeshStandardMaterial({ color: new THREE.Color(kit.pads), roughness: 0.55 })
      : mats.pad;

    const padsList = [];

    const createLeg = (xOffset) => {
      const hipJoint = new THREE.Group();
      hipJoint.position.set(xOffset, 0, 0);

      const thigh = new THREE.Mesh(GEOMETRY_CACHE.thigh, pantsMat);
      thigh.castShadow = true;
      hipJoint.add(thigh);

      const kneeJoint = new THREE.Group();
      kneeJoint.position.y = -0.46;
      hipJoint.add(kneeJoint);

      const shin = new THREE.Mesh(GEOMETRY_CACHE.shin, pantsMat);
      shin.castShadow = true;
      kneeJoint.add(shin);

      // Cricket Batting / Keeper Pads in team kit color
      if (hasPads) {
        const padMesh = new THREE.Mesh(GEOMETRY_CACHE.pad, padMat);
        padMesh.position.set(0, -0.2, 0.06);
        padMesh.castShadow = true;
        kneeJoint.add(padMesh);

        const kneeRoll = new THREE.Mesh(GEOMETRY_CACHE.padKneeRoll, padMat);
        kneeRoll.position.set(0, -0.02, 0.1);
        kneeJoint.add(kneeRoll);

        padsList.push(padMesh, kneeRoll);
      }

      // Shoes
      const shoe = new THREE.Mesh(GEOMETRY_CACHE.shoe, mats.shoe);
      shoe.position.set(0, -0.44, 0.05);
      shoe.castShadow = true;
      kneeJoint.add(shoe);

      hips.add(hipJoint);
      return { hip: hipJoint, knee: kneeJoint, thigh, shin };
    };

    const leftLeg = createLeg(-0.13);
    const rightLeg = createLeg(0.13);

    // Arms with Shoulder and Elbow articulations
    const sleeveMat = (!isUmpire && kit.primary)
      ? new THREE.MeshStandardMaterial({ color: new THREE.Color(kit.primary), roughness: 0.65 })
      : (isUmpire ? mats.umpireShirt : jerseyMaterial);

    const createArm = (xOffset) => {
      const shoulderJoint = new THREE.Group();
      shoulderJoint.position.set(xOffset, 0.5, 0);

      const bicep = new THREE.Mesh(GEOMETRY_CACHE.bicep, sleeveMat);
      bicep.castShadow = true;
      shoulderJoint.add(bicep);

      const elbowJoint = new THREE.Group();
      elbowJoint.position.y = -0.34;
      shoulderJoint.add(elbowJoint);

      const forearm = new THREE.Mesh(GEOMETRY_CACHE.forearm, mats.skin);
      forearm.castShadow = true;
      elbowJoint.add(forearm);

      // Glove / Hand
      const glove = new THREE.Mesh(GEOMETRY_CACHE.glove, hasPads ? padMat : mats.skin);
      glove.position.y = -0.32;
      glove.castShadow = true;
      elbowJoint.add(glove);

      hips.add(shoulderJoint);
      return { shoulder: shoulderJoint, elbow: elbowJoint, bicep, glove };
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
      headMesh,
      helmetMesh,
      visor,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      bat,
      isBatsman,
      isUmpire,
      isKeeper,
      sleeves: [leftArm.bicep, rightArm.bicep],
      pants: [leftLeg.thigh, leftLeg.shin, rightLeg.thigh, rightLeg.shin],
      pads: padsList,
      userData: {
        player: playerData,
        team: teamData
      }
    };
  }

  // --- 3. Instantiate Pitch & Field Lineups ---
  initPlayers() {
    const defaultInd = {
      name: 'India',
      color: '#1565c0',
      kit: {
        primary: '#1565c0',
        secondary: '#ff6f00',
        accent: '#0d47a1',
        pants: '#0d47a1',
        pads: '#0d47a1',
        helmet: '#0d47a1',
        text: '#ffffff',
        countryText: 'INDIA'
      },
      players: [
        { name: 'R. Sharma (C)', number: 45, role: 'BAT', face: { skin: '#d89b6a', beard: 'FULL_TRIMMED', hair: '#1a120b', eyes: '#2c1e13' } },
        { name: 'S. Gill', number: 77, role: 'BAT', face: { skin: '#dfa87a', beard: 'CLEAN_SHAVEN', hair: '#1a120b', eyes: '#2c1e13' } },
        { name: 'V. Kohli', number: 18, role: 'BAT', face: { skin: '#d59868', beard: 'STYLED_BEARD', hair: '#140e09', eyes: '#2c1e13' } }
      ]
    };

    const defaultAus = {
      name: 'Australia',
      color: '#fbc02d',
      kit: {
        primary: '#fbc02d',
        secondary: '#1b5e20',
        accent: '#004d40',
        pants: '#1b5e20',
        pads: '#fbc02d',
        helmet: '#1b5e20',
        text: '#1b5e20',
        countryText: 'AUSTRALIA'
      },
      players: [
        { name: 'P. Cummins', number: 30, role: 'BOWL', face: { skin: '#f2ccaa', beard: 'CLEAN_SHAVEN', hair: '#8d6d48', eyes: '#3f6782' } },
        { name: 'M. Wade (WK)', number: 13, role: 'WK', face: { skin: '#ecc4a2', beard: 'CLEAN_SHAVEN', hair: '#443021', eyes: '#3a536b' } }
      ]
    };

    // Striker Batsman positioned inside popping crease (default V. Kohli #18)
    this.batter = this.buildPlayer({
      jerseyMaterial: this.battingKitMat,
      isBatsman: true,
      hasPads: true,
      playerData: defaultInd.players[2],
      teamData: defaultInd
    });
    this.batter.group.position.set(0.1, 0, 9.15);
    this.batter.group.rotation.y = Math.PI; // Face bowler (-Z)
    this.setBatsmanStance();

    // Non-Striker Batsman at non-striker popping crease (default R. Sharma #45)
    this.nonStriker = this.buildPlayer({
      jerseyMaterial: this.battingKitMat,
      isBatsman: true,
      hasPads: true,
      playerData: defaultInd.players[0],
      teamData: defaultInd
    });
    this.nonStriker.group.position.set(1.2, 0, -8.6);
    this.nonStriker.group.rotation.y = 0; // Face striker (+Z)
    this.setNonStrikerStance();

    // Bowler starting run-up at Z = -24m (default P. Cummins #30)
    this.bowler = this.buildPlayer({
      jerseyMaterial: this.bowlingKitMat,
      isBatsman: false,
      hasPads: false,
      playerData: defaultAus.players[0],
      teamData: defaultAus
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
      isKeeper: true,
      playerData: defaultAus.players[1],
      teamData: defaultAus
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

    this.fielders = fielderPlacements.map((pos) => {
      const f = this.buildPlayer({
        jerseyMaterial: this.bowlingKitMat,
        isBatsman: false,
        hasPads: false,
        teamData: defaultAus
      });
      f.group.position.set(pos.x, 0, pos.z);
      f.group.lookAt(0, 0.9, 9.15); // Look towards striker
      f.name = pos.name;
      f.basePos = new THREE.Vector3(pos.x, 0, pos.z);
      this.setFielderStance(f);
      return f;
    });

    // Check and load external player GLTF model if dropped in public/models
    this.loadExternalPlayerModel();
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
    this.applyRiggedStance(b, 'BATSMAN_STANCE');
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
    this.applyRiggedStance(ns, 'NON_STRIKER_STANCE');
  }

  setBowlerReadyStance() {
    const bw = this.bowler;
    if (!bw) return;
    this.safePos(bw.hips, 0, 0.95, 0);
    this.safeRot(bw.hips, 0, 0, 0);
    this.safeRot(bw.leftLeg?.hip, 0, 0, 0);
    this.safeRot(bw.leftLeg?.knee, 0, 0, 0);
    this.safeRot(bw.rightLeg?.hip, 0, 0, 0);
    this.safeRot(bw.rightLeg?.knee, 0, 0, 0);
    this.safeRot(bw.leftArm?.shoulder, 0.2, 0, 0);
    this.safeRot(bw.leftArm?.elbow, -0.3, 0, 0);
    this.safeRot(bw.rightArm?.shoulder, 0.2, 0, 0);
    this.safeRot(bw.rightArm?.elbow, -0.3, 0, 0);
    this.applyRiggedStance(bw, 'BOWLER_READY');
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
    this.applyRiggedStance(k, 'KEEPER_CROUCH');
  }

  setFielderStance(fielder) {
    if (!fielder) return;
    this.safePos(fielder.hips, 0, 0.88, 0);
    this.safeRot(fielder.hips, 0, 0, 0);
    this.safeRot(fielder.leftLeg?.hip, -0.25, 0, 0.1);
    this.safeRot(fielder.rightLeg?.hip, -0.25, 0, -0.1);
    this.safeRot(fielder.leftLeg?.knee, 0.35, 0, 0);
    this.safeRot(fielder.rightLeg?.knee, 0.35, 0, 0);
    this.safeRot(fielder.leftArm?.shoulder, 0.4, 0, -0.1);
    this.safeRot(fielder.rightArm?.shoulder, 0.4, 0, 0.1);
    this.safeRot(fielder.leftArm?.elbow, -0.3, 0, 0);
    this.safeRot(fielder.rightArm?.elbow, -0.3, 0, 0);
    this.applyRiggedStance(fielder, 'FIELDER_READY');
  }

  // Smooth running stride articulation for chasing fielders
  animateFielderRun(fielder, delta, sprintSpeed = 7.4) {
    if (!fielder) return;
    fielder.runCycle = (fielder.runCycle || 0) + delta * sprintSpeed * 1.8;
    const stride = Math.sin(fielder.runCycle);

    if (this.modelMode === 'RIGGED_GLB' && fielder.animController) {
      fielder.animController.playLocomotion(fielder.runCycle, sprintSpeed, false);
      return;
    }

    this.safePos(fielder.hips, 0, 0.88 + Math.abs(stride) * 0.05, 0);
    this.safeRot(fielder.leftLeg?.hip, stride * 0.65, 0, 0);
    this.safeRot(fielder.leftLeg?.knee, Math.max(0, -stride * 0.6), 0, 0);
    this.safeRot(fielder.rightLeg?.hip, -stride * 0.65, 0, 0);
    this.safeRot(fielder.rightLeg?.knee, Math.max(0, stride * 0.6), 0, 0);

    this.safeRot(fielder.leftArm?.shoulder, -stride * 0.6, 0, 0.1);
    this.safeRot(fielder.rightArm?.shoulder, stride * 0.6, 0, -0.1);
    this.safeRot(fielder.leftArm?.elbow, -0.5, 0, 0);
    this.safeRot(fielder.rightArm?.elbow, -0.5, 0, 0);
  }

  // Cupped hands catch pose
  setFielderCatchStance(fielder) {
    if (!fielder) return;
    if (this.modelMode === 'RIGGED_GLB' && fielder.animController) {
      fielder.animController.playFielderCatch(1.0);
      return;
    }
    this.safePos(fielder.hips, 0, 0.82, 0);
    this.safeRot(fielder.hips, 0.15, 0, 0);
    this.safeRot(fielder.leftLeg?.hip, -0.3, 0, 0.1);
    this.safeRot(fielder.rightLeg?.hip, -0.3, 0, -0.1);
    this.safeRot(fielder.leftLeg?.knee, 0.45, 0, 0);
    this.safeRot(fielder.rightLeg?.knee, 0.45, 0, 0);
    this.safeRot(fielder.leftArm?.shoulder, 0.7, 0, -0.3);
    this.safeRot(fielder.rightArm?.shoulder, 0.7, 0, 0.3);
    this.safeRot(fielder.leftArm?.elbow, -0.8, 0, 0);
    this.safeRot(fielder.rightArm?.elbow, -0.8, 0, 0);
  }

  // Ground ball pickup animation
  animateFielderPickup(fielder, progress = 0.5) {
    if (!fielder) return;
    const p = Math.max(0, Math.min(1.0, progress));
    if (this.modelMode === 'RIGGED_GLB' && fielder.animController) {
      fielder.animController.playFielderPickup(p);
      return;
    }
    const bend = Math.sin(p * Math.PI);
    this.safePos(fielder.hips, 0, 0.88 - bend * 0.35, 0);
    this.safeRot(fielder.hips, bend * 0.45, 0, 0);
    this.safeRot(fielder.rightArm?.shoulder, 0.4 + bend * 0.8, 0, 0);
    this.safeRot(fielder.rightArm?.elbow, -0.3 - bend * 0.3, 0, 0);
    this.safeRot(fielder.leftLeg?.knee, 0.35 + bend * 0.4, 0, 0);
  }

  // Overarm return throw animation
  animateFielderThrow(fielder, progress = 0.5) {
    if (!fielder) return;
    const p = Math.max(0, Math.min(1.0, progress));
    if (this.modelMode === 'RIGGED_GLB' && fielder.animController) {
      fielder.animController.playFielderThrow(p);
      return;
    }
    const throwSwing = Math.sin(p * Math.PI);
    this.safeRot(fielder.rightArm?.shoulder, 0.4 - p * 1.8, 0, 0.2);
    this.safeRot(fielder.rightArm?.elbow, -0.3 - (1 - p) * 0.4, 0, 0);
    this.safeRot(fielder.leftArm?.shoulder, 0.2 + throwSwing * 0.4, 0, -0.2);
  }

  // Wicketkeeper tracks ball approaching and passing striker crease
  animateKeeper(ballPos, delta) {
    const k = this.keeper;
    if (!k) return;

    if (ballPos && ballPos.z > 7.5 && ballPos.z < 13.5) {
      // Ball approaching or passing keeper: track laterally and rise slightly
      const targetX = Math.max(-1.2, Math.min(1.2, ballPos.x));
      k.group.position.x = THREE.MathUtils.lerp(k.group.position.x, targetX * 0.7, Math.min(1.0, delta * 6.0));
      if (this.modelMode === 'RIGGED_GLB' && k.animController) {
        k.animController.playKeeperReaction(1.0, ballPos.x);
        return;
      }
      this.safePos(k.hips, 0, 0.78, 0);
      this.safeRot(k.leftArm?.shoulder, 0.6, 0, -0.15);
      this.safeRot(k.rightArm?.shoulder, 0.6, 0, 0.15);
    } else {
      // Return smoothly to crouch stance
      k.group.position.x = THREE.MathUtils.lerp(k.group.position.x, 0, Math.min(1.0, delta * 4.0));
      this.setKeeperStance();
    }
  }

  // --- Running Between Wickets Locomotion System ---
  initRunningBetweenWickets() {
    this.runningBetweenWickets = {
      active: false,
      targetRuns: 0,
      currentRun: 0,
      progress: 0, // 0.0 to 1.0 along pitch
      speed: 6.4,
      strikerLaneX: -0.35,
      nonStrikerLaneX: 0.95,
      creaseNearZ: 9.15,
      creaseFarZ: -8.6,
      direction: 1 // 1: striker runs towards -Z, non-striker towards +Z
    };
  }

  startRunningBetweenWickets(runs = 1) {
    if (runs <= 0 || !this.batter || !this.nonStriker) return;
    if (!this.runningBetweenWickets) this.initRunningBetweenWickets();

    this.runningBetweenWickets.active = true;
    this.runningBetweenWickets.targetRuns = runs;
    this.runningBetweenWickets.currentRun = 0;
    this.runningBetweenWickets.progress = 0;
    this.runningBetweenWickets.direction = 1;

    // Orient players in sprint direction along their lanes
    this.batter.group.rotation.y = Math.PI; // Striker runs towards non-striker end (-Z)
    this.nonStriker.group.rotation.y = 0;    // Non-striker runs towards striker end (+Z)
  }

  updateRunningBetweenWickets(delta) {
    const rbw = this.runningBetweenWickets;
    if (!rbw || !rbw.active) return;
    if (!this.batter || !this.nonStriker) return;

    const pitchLength = Math.abs(rbw.creaseNearZ - rbw.creaseFarZ); // ~17.75m
    const step = (rbw.speed / pitchLength) * delta;
    rbw.progress += step;

    const p = Math.min(1.0, rbw.progress);

    // Compute actual Z positions along pitch for both batsmen
    if (rbw.direction === 1) {
      // Striker runs near -> far; Non-striker runs far -> near
      this.batter.group.position.z = THREE.MathUtils.lerp(rbw.creaseNearZ, rbw.creaseFarZ, p);
      this.batter.group.position.x = THREE.MathUtils.lerp(0.1, rbw.strikerLaneX, Math.min(1.0, p * 3.0));

      this.nonStriker.group.position.z = THREE.MathUtils.lerp(rbw.creaseFarZ, rbw.creaseNearZ, p);
      this.nonStriker.group.position.x = THREE.MathUtils.lerp(1.2, rbw.nonStrikerLaneX, Math.min(1.0, p * 3.0));
    } else {
      // Striker runs far -> near; Non-striker runs near -> far
      this.batter.group.position.z = THREE.MathUtils.lerp(rbw.creaseFarZ, rbw.creaseNearZ, p);
      this.batter.group.position.x = THREE.MathUtils.lerp(rbw.strikerLaneX, 0.1, Math.min(1.0, p * 3.0));

      this.nonStriker.group.position.z = THREE.MathUtils.lerp(rbw.creaseNearZ, rbw.creaseFarZ, p);
      this.nonStriker.group.position.x = THREE.MathUtils.lerp(rbw.nonStrikerLaneX, 1.2, Math.min(1.0, p * 3.0));
    }

    // Animate running stride on both batsmen
    this.animateBatterRun(this.batter, delta, rbw.speed);
    this.animateBatterRun(this.nonStriker, delta, rbw.speed);

    // Check completion of current run
    if (rbw.progress >= 1.0) {
      rbw.currentRun++;
      if (rbw.currentRun < rbw.targetRuns) {
        // Turn for next run!
        rbw.progress = 0;
        rbw.direction = -rbw.direction;
        if (rbw.direction === 1) {
          this.batter.group.rotation.y = Math.PI;
          this.nonStriker.group.rotation.y = 0;
        } else {
          this.batter.group.rotation.y = 0;
          this.nonStriker.group.rotation.y = Math.PI;
        }
      } else {
        // All runs completed! Stop and settle at creases
        this.stopRunningBetweenWickets(false);
      }
    }
  }

  animateBatterRun(playerObj, delta, sprintSpeed = 6.4) {
    if (!playerObj) return;
    playerObj.runCycle = (playerObj.runCycle || 0) + delta * sprintSpeed * 1.8;
    const stride = Math.sin(playerObj.runCycle);

    if (this.modelMode === 'RIGGED_GLB' && playerObj.animController) {
      playerObj.animController.playLocomotion(playerObj.runCycle, sprintSpeed, true);
      return;
    }

    // Procedural runner articulation
    this.safePos(playerObj.hips, 0, 0.9 + Math.abs(stride) * 0.05, 0);
    this.safeRot(playerObj.leftLeg?.hip, stride * 0.6, 0, 0);
    this.safeRot(playerObj.leftLeg?.knee, Math.max(0, -stride * 0.55), 0, 0);
    this.safeRot(playerObj.rightLeg?.hip, -stride * 0.6, 0, 0);
    this.safeRot(playerObj.rightLeg?.knee, Math.max(0, stride * 0.55), 0, 0);
    this.safeRot(playerObj.leftArm?.shoulder, -stride * 0.5, 0, -0.15);
    this.safeRot(playerObj.rightArm?.shoulder, 0.45 + stride * 0.2, 0, 0.15);
  }

  stopRunningBetweenWickets(resetToDefaultCreases = false) {
    const rbw = this.runningBetweenWickets;
    if (rbw) rbw.active = false;

    if (resetToDefaultCreases) {
      if (this.batter) {
        this.batter.group.position.set(0.1, 0, 9.15);
        this.batter.group.rotation.y = Math.PI * 0.5;
        this.resetBatter();
      }
      if (this.nonStriker) {
        this.nonStriker.group.position.set(1.2, 0, -8.6);
        this.nonStriker.group.rotation.y = 0;
        this.setNonStrikerStance();
      }
    } else {
      // Settle batsmen at their respective end
      if (this.batter) {
        this.batter.group.rotation.y = Math.PI * 0.5;
        this.resetBatter();
      }
      if (this.nonStriker) {
        this.nonStriker.group.rotation.y = 0;
        this.setNonStrikerStance();
      }
    }
  }

  resetRunningBetweenWickets() {
    this.stopRunningBetweenWickets(true);
  }

  resetAllPlayerStances() {
    if (this.batter) this.resetBatter();
    if (this.nonStriker) this.setNonStrikerStance();
    if (this.bowler) this.setBowlerReadyStance();
    if (this.keeper) this.setKeeperStance();
    if (this.fielders) {
      this.fielders.forEach(f => this.setFielderStance(f));
    }
  }

  // --- 5. Dynamic Bat Swing Animation for 6 Distinct Shots ---
  playBatSwing(progress, shotKey = 'STRAIGHT_DRIVE', shotAngle = Math.PI, timingQuality = null) {
    const b = this.batter;
    if (!b) return;

    // Dispatch to skeletal animation controller when rigged model is active
    if (this.modelMode === 'RIGGED_GLB' && b.animController) {
      b.animController.playBatSwing(progress, shotKey, shotAngle, timingQuality);
    }

    if (!b.bat) return;

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
    if (this.modelMode === 'RIGGED_GLB' && this.batter?.riggedBat) {
      const pos = new THREE.Vector3();
      this.batter.riggedBat.getWorldPosition(pos);
      return pos;
    }
    if (!this.batter || !this.batter.bat) return new THREE.Vector3(0.1, 0.7, 9.15);
    const pos = new THREE.Vector3();
    this.batter.bat.getWorldPosition(pos);
    return pos;
  }

  resetBatter() {
    this.setBatsmanStance();
    if (this.batter?.animController) {
      this.batter.animController.applyStance('BATSMAN_STANCE');
    }
  }

  // --- 6. Dynamic Bowling Delivery Animation for 4 Distinct Bowling Styles ---
  getBowlerStartZ(profileId = 'FAST_BOWLER') {
    if (profileId === 'SPIN_BOWLER') return -16.0;
    if (profileId === 'DEFENSIVE_BOWLER') return -20.0;
    if (profileId === 'SWING_BOWLER') return -22.0;
    return -24.0;
  }

  getBowlerRunupSpeed(profileId = 'FAST_BOWLER') {
    if (profileId === 'SPIN_BOWLER') return 1.35;
    if (profileId === 'SWING_BOWLER') return 1.50;
    if (profileId === 'DEFENSIVE_BOWLER') return 1.45;
    return 1.65;
  }

  getBowlerHandPosition() {
    // When rigged model is active, synchronize to the real skeletal bowling hand bone
    if (this.modelMode === 'RIGGED_GLB' && this.bowler?.riggedBones) {
      const handBone = this.bowler.riggedBones['RightHand_036'] || this.bowler.riggedBones['RightForeArm_035'];
      if (handBone) {
        const pos = new THREE.Vector3();
        if (this.bowler.group && typeof this.bowler.group.updateMatrixWorld === 'function') {
          this.bowler.group.updateMatrixWorld(true);
        }
        handBone.getWorldPosition(pos);
        return pos;
      }
    }

    if (!this.bowler || !this.bowler.rightArm || !this.bowler.rightArm.glove) {
      return new THREE.Vector3(0.4, 2.1, -10.06);
    }
    const pos = new THREE.Vector3();
    if (this.bowler.group && typeof this.bowler.group.updateMatrixWorld === 'function') {
      this.bowler.group.updateMatrixWorld(true);
    }
    this.bowler.rightArm.glove.getWorldPosition(pos);
    return pos;
  }

  getBowlerReleasePosition() {
    return this.getBowlerHandPosition();
  }

  playBowlerAction(progress, profileId = 'FAST_BOWLER') {
    const bw = this.bowler;
    if (!bw || !bw.group) return;

    // Dispatch to skeletal animation controller when rigged model is active
    if (this.modelMode === 'RIGGED_GLB' && bw.animController) {
      bw.animController.playBowlingAction(progress, profileId);
    }

    const p = Math.max(0, Math.min(1.0, progress));
    const startZ = this.getBowlerStartZ(profileId);
    const creaseZ = -10.06;

    if (p <= 0) {
      bw.group.position.set(0.8, 0, startZ);
      this.setBowlerReadyStance();
      return;
    }

    if (p >= 1.0) {
      bw.group.position.set(0.8, 0, -9.5);
      this.setBowlerReadyStance();
      return;
    }

    const bPos = bw.group.position;
    const isSpin = profileId === 'SPIN_BOWLER';
    const isSwing = profileId === 'SWING_BOWLER';

    if (p < 0.70) {
      // Phase 1: Approach Run-up
      const runNorm = p / 0.70;
      bPos.z = THREE.MathUtils.lerp(startZ, -12.5, runNorm);

      const strideFreq = isSpin ? 4.5 : 6.5;
      const strideCycle = Math.sin(runNorm * Math.PI * strideFreq);
      const bobAmount = isSpin ? 0.06 : 0.12;
      bPos.y = Math.abs(strideCycle) * bobAmount;

      const legAmp = isSpin ? 0.45 : 0.65;
      this.safeRot(bw.leftLeg?.hip, strideCycle * legAmp, 0, 0);
      this.safeRot(bw.leftLeg?.knee, Math.max(0, -strideCycle * legAmp * 0.9), 0, 0);
      this.safeRot(bw.rightLeg?.hip, -strideCycle * legAmp, 0, 0);
      this.safeRot(bw.rightLeg?.knee, Math.max(0, strideCycle * legAmp * 0.9), 0, 0);

      const armAmp = isSpin ? 0.4 : 0.65;
      this.safeRot(bw.leftArm?.shoulder, -strideCycle * armAmp, 0, 0.2);
      this.safeRot(bw.rightArm?.shoulder, strideCycle * armAmp, 0, -0.2);
      this.safeRot(bw.leftArm?.elbow, -0.5, 0, 0);
      this.safeRot(bw.rightArm?.elbow, -0.5, 0, 0);
      this.safeRot(bw.hips, 0, isSpin ? strideCycle * 0.08 : 0, 0);
    } else if (p < 0.88) {
      // Phase 2: Gather & Bound into Delivery Stride
      const t = (p - 0.70) / 0.18;
      bPos.z = THREE.MathUtils.lerp(-12.5, creaseZ, t);

      const leapHeight = isSpin ? 0.18 : (isSwing ? 0.28 : 0.35);
      bPos.y = Math.sin(t * Math.PI) * leapHeight;

      // Front Arm: reaches high to sight target
      this.safeRot(bw.leftArm?.shoulder, 0.4 + t * 1.35, 0, 0.15);
      this.safeRot(bw.leftArm?.elbow, -0.3 * (1 - t), 0, 0);

      // Bowling Arm: circular windmill cocking behind back
      this.safeRot(bw.rightArm?.shoulder, 0.3 - t * 2.8, 0, -0.15);
      this.safeRot(bw.rightArm?.elbow, -0.1, 0, 0);

      // Legs in gather
      this.safeRot(bw.leftLeg?.hip, 0.5 * (1 - t) - 0.2 * t, 0, 0);
      this.safeRot(bw.leftLeg?.knee, 0.4 * (1 - t), 0, 0);
      this.safeRot(bw.rightLeg?.hip, -0.4 * (1 - t) + 0.3 * t, 0, 0);
      this.safeRot(bw.rightLeg?.knee, 0.3 * t, 0, 0);

      // Torso alignment
      const sideRot = isSwing ? 0.35 : (isSpin ? 0.25 : 0.18);
      this.safeRot(bw.hips, 0.1 * t, sideRot * Math.sin(t * Math.PI), 0);
    } else if (p <= 0.92) {
      // Phase 3: Delivery Stride & Ball Release Point
      const t = (p - 0.88) / 0.04;
      bPos.z = creaseZ;
      bPos.y = Math.max(0, (1 - t) * 0.08);

      // Front arm pulls down vigorously into the ribs
      this.safeRot(bw.leftArm?.shoulder, 1.75 - t * 2.1, 0, 0.2);
      this.safeRot(bw.leftArm?.elbow, -0.6 * t, 0, 0);

      // Bowling arm sweeps through high vertical release apex
      this.safeRot(bw.rightArm?.shoulder, -2.5 - t * 2.2, 0, -0.1);
      this.safeRot(bw.rightArm?.elbow, -0.05, 0, 0);

      // Planted front leg
      this.safeRot(bw.leftLeg?.hip, -0.2 - t * 0.15, 0, 0);
      this.safeRot(bw.leftLeg?.knee, 0.15, 0, 0);
      this.safeRot(bw.rightLeg?.hip, 0.3 + t * 0.3, 0, 0);
      this.safeRot(bw.rightLeg?.knee, 0.3 * (1 - t), 0, 0);

      // Torso flexes forward
      this.safeRot(bw.hips, 0.25 * t, 0, 0);
    } else {
      // Phase 4: Follow-Through & Deceleration
      const t = (p - 0.92) / 0.08;
      bPos.z = THREE.MathUtils.lerp(creaseZ, -9.5, t);
      bPos.y = 0;

      // Arm wraps across left hip
      this.safeRot(bw.rightArm?.shoulder, -4.7 - (1 - t) * 0.6 + t * 4.9, 0, 0.3 * (1 - t));
      this.safeRot(bw.rightArm?.elbow, -0.4 * (1 - t) - 0.3 * t, 0, 0);
      this.safeRot(bw.leftArm?.shoulder, -0.35 * (1 - t) + 0.2 * t, 0, 0);
      this.safeRot(bw.leftArm?.elbow, -0.6 * (1 - t) - 0.3 * t, 0, 0);

      // Rear leg drives through
      this.safeRot(bw.rightLeg?.hip, 0.6 * (1 - t), 0, 0);
      this.safeRot(bw.leftLeg?.hip, -0.35 * (1 - t), 0, 0);

      // Torso recovers to upright
      this.safeRot(bw.hips, 0.25 * (1 - t), 0, 0);
    }
  }

  // Update characters, wicketkeeper, running between wickets, physical wickets and bails
  update(delta, ballPos = null) {
    this.updateRunningBetweenWickets(delta);

    if (this.keeper && ballPos) {
      this.animateKeeper(ballPos, delta);
    }

    [this.strikerStumps, this.nonStrikerStumps].forEach(wicketSet => {
      if (!wicketSet) return;
      wicketSet.stumps.forEach(stump => {
        if (stump.userData.velocity) {
          stump.userData.velocity.y -= 9.8 * delta;
          stump.position.addScaledVector(stump.userData.velocity, delta);
          if (stump.position.y < 0) {
            stump.position.y = 0;
            stump.userData.velocity.set(0, 0, 0);
            if (stump.userData.rotVel) stump.userData.rotVel.set(0, 0, 0);
          }
          if (stump.userData.rotVel) {
            stump.rotation.x += stump.userData.rotVel.x * delta;
            stump.rotation.z += stump.userData.rotVel.z * delta;
          }
        }
      });
      wicketSet.bails.forEach(bail => {
        if (bail.userData.velocity) {
          bail.userData.velocity.y -= 9.8 * delta;
          bail.position.addScaledVector(bail.userData.velocity, delta);
          if (bail.position.y < 0) {
            bail.position.y = 0;
            bail.userData.velocity.set(0, 0, 0);
            if (bail.userData.rotVel) bail.userData.rotVel.set(0, 0, 0);
          }
          if (bail.userData.rotVel) {
            bail.rotation.x += bail.userData.rotVel.x * delta;
            bail.rotation.y += bail.userData.rotVel.y * delta;
          }
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

  // Model Mode Selection: 'PROCEDURAL' (default) or 'RIGGED_GLB'
  setModelMode(mode) {
    const targetMode = mode === 'RIGGED_GLB' ? 'RIGGED_GLB' : 'PROCEDURAL';
    this.modelMode = targetMode;

    const wrappers = this.getAllPlayerWrappers();
    wrappers.forEach(p => {
      if (this.modelMode === 'RIGGED_GLB') {
        if (!p.riggedModel && this.cachedExternalModel) {
          this.attachRiggedModelToPlayer(p);
        }
        if (p.riggedModel) {
          if (p.hips) p.hips.visible = false;
          p.riggedModel.visible = true;
        } else if (p.hips) {
          p.hips.visible = true; // Fallback to procedural while loading or on error
        }
      } else {
        if (p.hips) p.hips.visible = true;
        if (p.riggedModel) p.riggedModel.visible = false;
      }
    });

    return this.modelMode;
  }

  getModelMode() {
    return this.modelMode;
  }

  // Get all active player wrapper objects (batter, nonStriker, bowler, keeper, fielders)
  getAllPlayerWrappers() {
    const list = [];
    if (this.batter) list.push(this.batter);
    if (this.nonStriker) list.push(this.nonStriker);
    if (this.bowler) list.push(this.bowler);
    if (this.keeper) list.push(this.keeper);
    if (Array.isArray(this.fielders)) {
      list.push(...this.fielders);
    }
    return list;
  }

  // Asynchronously load external Sketchfab 3D Player Model (Indian Cricket Player Rigged) without blocking startup
  loadExternalPlayerModel() {
    if (typeof window === 'undefined' || typeof document === 'undefined' || !this.scene) return;

    this.isExternalModelLoading = true;
    this.externalModelLoadError = null;

    try {
      const loader = new GLTFLoader();
      const modelCandidates = [
        '/models/indian_cricket_player.glb',
        '/models/indian_cricket_player_rigged.glb',
        '/models/player.glb'
      ];

      const tryLoadCandidate = (index) => {
        if (index >= modelCandidates.length) {
          this.isExternalModelLoading = false;
          return;
        }

        loader.load(
          modelCandidates[index],
          (gltf) => {
            this.isExternalModelLoading = false;
            const externalModel = gltf.scene;

            // Normalize shadows and cache source model for safe per-player cloning
            externalModel.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            this.cachedExternalModel = externalModel;
            this.attachRiggedModelToAll();

            // If user or settings already opted into RIGGED_GLB mode, activate visibility
            if (this.modelMode === 'RIGGED_GLB') {
              this.setModelMode('RIGGED_GLB');
            }
          },
          undefined,
          (err) => {
            this.externalModelLoadError = err;
            tryLoadCandidate(index + 1);
          }
        );
      };

      tryLoadCandidate(0);
    } catch (err) {
      this.isExternalModelLoading = false;
      this.externalModelLoadError = err;
      // Retain procedural characters on any loader error
    }
  }

  // Attach an independent, safely cloned rigged model instance to a player wrapper
  attachRiggedModelToPlayer(playerObj) {
    if (!playerObj || !this.cachedExternalModel) return null;
    if (playerObj.riggedModel) return playerObj.riggedModel;

    // Clone safely using SkeletonUtils to ensure each player has an independent skeleton and bone hierarchy
    const cloned = typeof cloneSkeleton === 'function'
      ? cloneSkeleton(this.cachedExternalModel)
      : this.cachedExternalModel.clone(true);

    const bonesMap = {};
    cloned.traverse((child) => {
      if (child.isBone) {
        bonesMap[child.name] = child;
        if (!child.userData.initialRot) {
          child.userData.initialRot = child.rotation.clone();
        }
      }
      if (child.isMesh) {
        // Targeted optimization: disable shadow pass for minor interior meshes (teeth, eyes, glasses)
        if (child.name?.includes('Teeth') || child.name?.includes('Eye') || child.name?.includes('Glasses')) {
          child.castShadow = false;
          child.receiveShadow = false;
        } else {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      }
    });

    playerObj.riggedBones = bonesMap;
    playerObj.riggedModel = cloned;
    playerObj.animController = new RiggedAnimationController(playerObj);

    // Attach Batsman Bat to Right Hand bone if character is a batsman
    if (playerObj.isBatsman) {
      const rightHandBone = bonesMap['RightHand_036'] || bonesMap['RightForeArm_035'];
      if (rightHandBone) {
        const batGroup = new THREE.Group();
        const blade = new THREE.Mesh(GEOMETRY_CACHE.batBlade, this.sharedMaterials.batWood);
        blade.castShadow = true;
        batGroup.add(blade);
        const spine = new THREE.Mesh(GEOMETRY_CACHE.batSpine, this.sharedMaterials.batWood);
        blade.add(spine);
        const handle = new THREE.Mesh(GEOMETRY_CACHE.batHandle, this.sharedMaterials.batGrip);
        handle.castShadow = true;
        batGroup.add(handle);

        batGroup.position.set(0, -0.06, 0.05);
        batGroup.rotation.x = Math.PI * 0.15;
        rightHandBone.add(batGroup);
        playerObj.riggedBat = batGroup;
      }
    }

    // Attach Batting / Keeper Pads to leg bones
    if (playerObj.isBatsman || playerObj.isKeeper) {
      const leftShin = bonesMap['LeftLeg_058'];
      const rightShin = bonesMap['RightLeg_063'];
      const kitPads = playerObj.userData?.team?.kit?.pads;
      const padMat = kitPads
        ? new THREE.MeshStandardMaterial({ color: new THREE.Color(kitPads), roughness: 0.55 })
        : this.sharedMaterials.pad;

      playerObj.riggedPads = [];
      if (leftShin) {
        const padL = new THREE.Mesh(GEOMETRY_CACHE.pad, padMat);
        padL.position.set(0, -0.2, 0.07);
        padL.castShadow = true;
        leftShin.add(padL);
        playerObj.riggedPads.push(padL);
      }
      if (rightShin) {
        const padR = new THREE.Mesh(GEOMETRY_CACHE.pad, padMat);
        padR.position.set(0, -0.2, 0.07);
        padR.castShadow = true;
        rightShin.add(padR);
        playerObj.riggedPads.push(padR);
      }
    }

    // Attach Jersey Back Badge (Player surname & 2-digit number) using shared GEOMETRY_CACHE
    const spineBone = bonesMap['Spine2_04'] || bonesMap['Spine1_03'];
    if (spineBone) {
      const badgeMat = createJerseyBackBadge(playerObj.userData?.player, playerObj.userData?.team);
      const badgeMesh = new THREE.Mesh(GEOMETRY_CACHE.jerseyBadge, badgeMat);
      badgeMesh.position.set(0, 0.02, -0.115);
      badgeMesh.rotation.y = Math.PI; // Face outwards toward the back
      spineBone.add(badgeMesh);
      playerObj.riggedJerseyBadge = badgeMesh;
    }

    // Add to player's main world group (shares position, orientation, and physics anchor)
    playerObj.group.add(cloned);

    // Apply initial role-appropriate stance to the animation controller
    if (playerObj.isBatsman) {
      playerObj.animController.applyStance('BATSMAN_STANCE');
    } else if (playerObj.isKeeper) {
      playerObj.animController.applyStance('KEEPER_CROUCH');
    } else if (playerObj === this.bowler) {
      playerObj.animController.applyStance('BOWLER_READY');
    } else if (playerObj === this.nonStriker) {
      playerObj.animController.applyStance('NON_STRIKER_STANCE');
    } else {
      playerObj.animController.applyStance('FIELDER_READY');
    }

    // Apply team kit appearance
    this.applyRiggedPlayerAppearance(playerObj, playerObj.userData?.player, playerObj.userData?.team);

    // Set initial visibility according to current model mode
    cloned.visible = (this.modelMode === 'RIGGED_GLB');
    if (this.modelMode === 'RIGGED_GLB' && playerObj.hips) {
      playerObj.hips.visible = false;
    }

    return cloned;
  }

  // Attach rigged model to all active players when asset finishes loading
  attachRiggedModelToAll() {
    const wrappers = this.getAllPlayerWrappers();
    wrappers.forEach(p => {
      this.attachRiggedModelToPlayer(p);
    });
  }

  // Apply appearance, team colors, and jersey badge to the rigged model instance
  applyRiggedPlayerAppearance(playerObj, playerData, teamData) {
    if (!playerObj || !playerObj.riggedModel) return;

    const teamKit = teamData?.kit;
    const isIndia = teamData?.name === 'India' || teamData?.code === 'IND';

    playerObj.riggedModel.traverse((child) => {
      if (child.isMesh && child.material) {
        // Wolf3D_Outfit_Top (Jersey / Shirt)
        if (child.material.name === 'Wolf3D_Outfit_Top' || child.name?.includes('Outfit_Top')) {
          if (!isIndia && teamKit?.primary) {
            if (!child.userData.customMat) {
              child.userData.originalMat = child.material;
              child.userData.customMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(teamKit.primary),
                roughness: 0.7,
                metalness: 0.05
              });
            } else {
              child.userData.customMat.color.set(teamKit.primary);
            }
            child.material = child.userData.customMat;
          } else if (child.userData.originalMat) {
            child.material = child.userData.originalMat;
          }
        }

        // Wolf3D_Outfit_Bottom (Trousers / Pants)
        if (child.material.name === 'Wolf3D_Outfit_Bottom' || child.name?.includes('Outfit_Bottom')) {
          if (!isIndia && teamKit?.pants) {
            if (!child.userData.customMat) {
              child.userData.originalMat = child.material;
              child.userData.customMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(teamKit.pants),
                roughness: 0.85
              });
            } else {
              child.userData.customMat.color.set(teamKit.pants);
            }
            child.material = child.userData.customMat;
          } else if (child.userData.originalMat) {
            child.material = child.userData.originalMat;
          }
        }
      }
    });

    // Update jersey back badge with live player data & team colors
    if (playerObj.riggedJerseyBadge) {
      if (playerObj.riggedJerseyBadge.material?.map) {
        playerObj.riggedJerseyBadge.material.map.dispose();
      }
      if (playerObj.riggedJerseyBadge.material) {
        playerObj.riggedJerseyBadge.material.dispose();
      }
      playerObj.riggedJerseyBadge.material = createJerseyBackBadge(playerData, teamData);
    }

    // Update pad colors if present
    if (playerObj.riggedPads && playerObj.riggedPads.length > 0 && teamKit?.pads) {
      const padMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(teamKit.pads),
        roughness: 0.55
      });
      playerObj.riggedPads.forEach(p => {
        if (p) p.material = padMat;
      });
    }
  }

  // Safe animation adapter: delegates to RiggedAnimationController for kinematic stability
  applyRiggedStance(playerObj, stanceType) {
    if (!playerObj) return;
    if (playerObj.animController) {
      playerObj.animController.applyStance(stanceType);
    }
  }

  // Dispose per-instance cloned materials and generated badge textures cleanly
  disposePlayerRiggedModel(playerObj) {
    if (!playerObj || !playerObj.riggedModel) return;

    if (playerObj.animController) {
      playerObj.animController.resetToRest();
      playerObj.animController = null;
    }

    if (playerObj.riggedJerseyBadge) {
      if (playerObj.riggedJerseyBadge.material?.map) {
        playerObj.riggedJerseyBadge.material.map.dispose();
      }
      if (playerObj.riggedJerseyBadge.material) {
        playerObj.riggedJerseyBadge.material.dispose();
      }
      playerObj.riggedJerseyBadge = null;
    }

    playerObj.riggedModel.traverse((child) => {
      if (child.isMesh && child.userData.customMat) {
        child.userData.customMat.dispose();
        child.userData.customMat = null;
      }
    });

    if (playerObj.group && playerObj.riggedModel) {
      playerObj.group.remove(playerObj.riggedModel);
    }
    playerObj.riggedModel = null;
    playerObj.riggedBones = null;
  }

  // Apply complete individual player identity: authentic name & big number jersey, custom face & beard, team kit
  applyPlayerIdentity(playerObj, playerData, teamData) {
    if (!playerObj) return;

    playerObj.userData.player = playerData;
    playerObj.userData.team = teamData;

    // Update rigged 3D model appearance if attached
    if (playerObj.riggedModel) {
      this.applyRiggedPlayerAppearance(playerObj, playerData, teamData);
    }

    // 1. Update Torso Jersey Materials (Front country chest + Back name and big number)
    if (playerObj.torso) {
      playerObj.torso.material = createJerseyMaterials(playerData, teamData);
    }

    // 2. Update Head Face Material (Skin tone, eyes, eyebrows, nose, mouth, custom beard)
    if (playerObj.headMesh) {
      playerObj.headMesh.material = createFaceMaterial(playerData);
    }

    const kit = teamData?.kit || {
      primary: teamData?.color || '#1565c0',
      secondary: '#ff6f00',
      accent: '#0d47a1',
      pants: '#0d47a1',
      pads: '#0d47a1',
      helmet: '#0d47a1',
      text: '#ffffff'
    };

    // 3. Update Sleeves
    if (playerObj.sleeves && playerObj.sleeves.length > 0) {
      const sleeveMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(kit.primary),
        roughness: 0.65
      });
      playerObj.sleeves.forEach(s => {
        if (s) s.material = sleeveMat;
      });
    }

    // 4. Update Pants
    if (playerObj.pants && playerObj.pants.length > 0) {
      const pantsMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(kit.pants || kit.accent || kit.primary),
        roughness: 0.85
      });
      playerObj.pants.forEach(p => {
        if (p) p.material = pantsMat;
      });
    }

    // 5. Update Helmet & Visor
    if (playerObj.helmetMesh) {
      const helmetMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(kit.helmet || kit.accent || kit.primary),
        roughness: 0.4
      });
      playerObj.helmetMesh.material = helmetMat;
      if (playerObj.visor) playerObj.visor.material = helmetMat;
    }

    // 6. Update Pads (if character has pads)
    if (playerObj.pads && playerObj.pads.length > 0) {
      const padMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(kit.pads || kit.primary),
        roughness: 0.55
      });
      playerObj.pads.forEach(p => {
        if (p) p.material = padMat;
      });
    }
  }

  // Update active 3D characters to match match state rosters (striker, non-striker, bowler, keeper, fielders)
  updateActivePlayers(gameState) {
    if (!gameState) return;

    const battingTeam = gameState.battingTeam;
    const bowlingTeam = gameState.bowlingTeam;

    if (!battingTeam || !bowlingTeam) return;

    // Batters
    const striker = gameState.getStriker();
    const nonStriker = gameState.getNonStriker();

    if (this.batter) {
      this.applyPlayerIdentity(this.batter, striker, battingTeam);
    }
    if (this.nonStriker) {
      this.applyPlayerIdentity(this.nonStriker, nonStriker, battingTeam);
    }

    // Bowler
    const bowler = gameState.getCurrentBowler();
    if (this.bowler) {
      this.applyPlayerIdentity(this.bowler, bowler, bowlingTeam);
    }

    // Wicketkeeper (find player with role 'WK' in bowling team)
    const keeperData = bowlingTeam.players?.find(p => p.role === 'WK') ||
      bowlingTeam.players?.[5] ||
      { name: 'Keeper', number: 1, role: 'WK' };

    if (this.keeper) {
      this.applyPlayerIdentity(this.keeper, keeperData, bowlingTeam);
    }

    // Fielders: assign each of the 10 fielders to a unique player from the bowling team
    if (this.fielders && this.fielders.length > 0 && bowlingTeam.players) {
      const available = bowlingTeam.players.filter(p => p.name !== bowler?.name && p.name !== keeperData.name);
      this.fielders.forEach((f, idx) => {
        const pData = available[idx % available.length] || bowlingTeam.players[idx % bowlingTeam.players.length];
        this.applyPlayerIdentity(f, pData, bowlingTeam);
      });
    }

    this.setTeamColors(battingTeam.color || battingTeam.kit?.primary, bowlingTeam.color || bowlingTeam.kit?.primary);
  }
}

