import * as THREE from 'three';

// Visually polished 3D Cricket Oval Stadium with PBR materials, instanced crowd, and authentic pitch markings
export function createStadium(scene) {
  const stadiumGroup = new THREE.Group();
  stadiumGroup.name = 'Stadium';

  // --- 1. Authentic Cricket Oval Outfield ---
  // Cricket grounds are typically elliptical ovals (approx 66m x 72m)
  const ovalRadiusX = 66.0;
  const ovalRadiusZ = 72.0;
  const numRings = 14;

  // Concentric mown grass rings with alternating lush green shades
  for (let i = 0; i < numRings; i++) {
    const fractionInner = i / numRings;
    const fractionOuter = (i + 1) / numRings;

    // Use ring geometry with scaling for oval shape
    const ringGeo = new THREE.RingGeometry(
      fractionInner === 0 ? 0.2 : fractionInner * 70,
      fractionOuter * 70,
      72
    );
    ringGeo.rotateX(-Math.PI / 2);

    // Apply slight elliptical scaling
    ringGeo.scale(ovalRadiusX / 70.0, 1.0, ovalRadiusZ / 70.0);

    const grassColor = i % 2 === 0 ? 0x2e7d32 : 0x388e3c;
    const ringMat = new THREE.MeshStandardMaterial({
      color: grassColor,
      roughness: 0.88,
      metalness: 0.02,
      side: THREE.DoubleSide
    });

    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.receiveShadow = true;
    ringMesh.position.y = 0;
    stadiumGroup.add(ringMesh);
  }

  // Underneath ground base plate
  const baseGroundGeo = new THREE.CircleGeometry(115, 64);
  baseGroundGeo.rotateX(-Math.PI / 2);
  const baseGroundMat = new THREE.MeshStandardMaterial({
    color: 0x1b5e20,
    roughness: 0.95
  });
  const baseGround = new THREE.Mesh(baseGroundGeo, baseGroundMat);
  baseGround.position.y = -0.05;
  baseGround.receiveShadow = true;
  stadiumGroup.add(baseGround);

  // --- 2. 30-Yard Fielding Circle & White Marker Discs ---
  const thirtyYardRadius = 27.43; // 30 yards = 27.43 meters
  const circlePoints = [];
  const markerCount = 20;
  const markerGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.03, 16);
  const markerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  for (let i = 0; i <= 64; i++) {
    const theta = (i / 64) * Math.PI * 2;
    circlePoints.push(new THREE.Vector3(Math.cos(theta) * thirtyYardRadius, 0.02, Math.sin(theta) * thirtyYardRadius));
  }
  const circleLineGeo = new THREE.BufferGeometry().setFromPoints(circlePoints);
  const circleLineMat = new THREE.LineDashedMaterial({
    color: 0xffffff,
    dashSize: 1.5,
    gapSize: 1.5,
    transparent: true,
    opacity: 0.45
  });
  const circleLine = new THREE.Line(circleLineGeo, circleLineMat);
  circleLine.computeLineDistances();
  stadiumGroup.add(circleLine);

  // 30-yard white disc markers
  for (let m = 0; m < markerCount; m++) {
    const angle = (m / markerCount) * Math.PI * 2;
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(Math.cos(angle) * thirtyYardRadius, 0.022, Math.sin(angle) * thirtyYardRadius);
    stadiumGroup.add(marker);
  }

  // --- 3. Central Pitch Turf Strip & Infield Apron ---
  // Infield turf square (protects central pitch area)
  const apronGeo = new THREE.PlaneGeometry(8.5, 26.0);
  apronGeo.rotateX(-Math.PI / 2);
  const apronMat = new THREE.MeshStandardMaterial({
    color: 0x43a047,
    roughness: 0.9,
    metalness: 0.02
  });
  const apronMesh = new THREE.Mesh(apronGeo, apronMat);
  apronMesh.position.set(0, 0.01, 0);
  apronMesh.receiveShadow = true;
  stadiumGroup.add(apronMesh);

  // Rectangular central pitch strip (3.05m width x 20.12m length + run-offs)
  const pitchLength = 22.56;
  const pitchWidth = 3.15;
  const pitchGeo = new THREE.PlaneGeometry(pitchWidth, pitchLength);
  pitchGeo.rotateX(-Math.PI / 2);

  // Procedural pitch texture (clay, wear patches, subtle cracks, footmarks)
  const pitchCanvas = document.createElement('canvas');
  pitchCanvas.width = 512;
  pitchCanvas.height = 1024;
  const pctx = pitchCanvas.getContext('2d');

  // Base hard clay/straw yellow soil
  pctx.fillStyle = '#cfb989';
  pctx.fillRect(0, 0, 512, 1024);

  // Subtle grass edging blending on edges
  const grassEdgeGrad = pctx.createLinearGradient(0, 0, 512, 0);
  grassEdgeGrad.addColorStop(0, 'rgba(67, 160, 71, 0.35)');
  grassEdgeGrad.addColorStop(0.1, 'rgba(67, 160, 71, 0.05)');
  grassEdgeGrad.addColorStop(0.9, 'rgba(67, 160, 71, 0.05)');
  grassEdgeGrad.addColorStop(1, 'rgba(67, 160, 71, 0.35)');
  pctx.fillStyle = grassEdgeGrad;
  pctx.fillRect(0, 0, 512, 1024);

  // Compacted clay cracks & pitch grain lines
  pctx.strokeStyle = 'rgba(168, 140, 92, 0.22)';
  pctx.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    const y = Math.random() * 1024;
    pctx.beginPath();
    pctx.moveTo(30 + Math.random() * 50, y);
    pctx.lineTo(430 + Math.random() * 50, y + (Math.random() - 0.5) * 15);
    pctx.stroke();
  }

  // Bowler footmark wear indentations (near popping/bowling creases)
  function drawFootmarks(cy) {
    pctx.fillStyle = 'rgba(138, 110, 70, 0.4)';
    for (let f = 0; f < 8; f++) {
      const fx = 256 + (Math.random() - 0.5) * 160;
      const fy = cy + (Math.random() - 0.5) * 60;
      pctx.beginPath();
      pctx.ellipse(fx, fy, 16 + Math.random() * 10, 8 + Math.random() * 6, Math.random() * 0.5, 0, Math.PI * 2);
      pctx.fill();
    }
  }
  drawFootmarks(140); // North end crease
  drawFootmarks(884); // South end crease

  // Pitch good-length bounce wear patch (where deliveries pitch repeatedly)
  pctx.fillStyle = 'rgba(150, 125, 80, 0.25)';
  pctx.beginPath();
  pctx.ellipse(256, 420, 70, 110, 0, 0, Math.PI * 2);
  pctx.fill();
  pctx.beginPath();
  pctx.ellipse(256, 604, 70, 110, 0, 0, Math.PI * 2);
  pctx.fill();

  const pitchTexture = new THREE.CanvasTexture(pitchCanvas);
  pitchTexture.anisotropy = 4;
  const pitchMat = new THREE.MeshStandardMaterial({
    map: pitchTexture,
    roughness: 0.92,
    metalness: 0.01
  });

  const pitch = new THREE.Mesh(pitchGeo, pitchMat);
  pitch.position.set(0, 0.02, 0);
  pitch.receiveShadow = true;
  stadiumGroup.add(pitch);

  // --- 4. Official MCC Pitch Markings (White Creases) ---
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  function createCrease(w, l, x, z) {
    const geo = new THREE.PlaneGeometry(w, l);
    geo.rotateX(-Math.PI / 2);
    const line = new THREE.Mesh(geo, lineMat);
    line.position.set(x, 0.026, z);
    stadiumGroup.add(line);
  }

  // Popping Creases (1.22m / 4ft in front of bowling crease at Z = +/- 8.84m, 3.66m long)
  createCrease(3.66, 0.075, 0, 8.84);
  createCrease(3.66, 0.075, 0, -8.84);

  // Bowling Creases (passes through stumps at Z = +/- 10.06m, 2.64m long)
  createCrease(2.64, 0.06, 0, 10.06);
  createCrease(2.64, 0.06, 0, -10.06);

  // Return Creases (perpendicular to popping crease, running back past bowling crease)
  createCrease(0.06, 2.44, -1.32, 9.45);
  createCrease(0.06, 2.44, 1.32, 9.45);
  createCrease(0.06, 2.44, -1.32, -9.45);
  createCrease(0.06, 2.44, 1.32, -9.45);

  // Protected Area Warning Markings (5ft mark lines along pitch)
  createCrease(0.3, 0.05, -1.0, 7.32);
  createCrease(0.3, 0.05, 1.0, 7.32);
  createCrease(0.3, 0.05, -1.0, -7.32);
  createCrease(0.3, 0.05, 1.0, -7.32);

  // --- 5. 3D Boundary Rope & Sponsor Cushions (Toblerones) ---
  const boundaryRadius = 65.0;
  const ropeCurve = new THREE.EllipseCurve(0, 0, boundaryRadius, boundaryRadius, 0, 2 * Math.PI, false, 0);
  const ropePoints = ropeCurve.getPoints(120).map(p => new THREE.Vector3(p.x, 0.12, p.y));
  const ropeGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ropePoints, true), 120, 0.12, 8, true);
  const ropeMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f5,
    roughness: 0.65,
    metalness: 0.05
  });
  const boundaryRope = new THREE.Mesh(ropeGeo, ropeMat);
  boundaryRope.castShadow = true;
  boundaryRope.receiveShadow = true;
  stadiumGroup.add(boundaryRope);

  // Triangular advertising wedges (Toblerones) around boundary
  const tobleroneGeo = new THREE.CylinderGeometry(0.32, 0.32, 2.2, 3);
  const tobleroneMat1 = new THREE.MeshStandardMaterial({ color: 0x0055ff, roughness: 0.4 });
  const tobleroneMat2 = new THREE.MeshStandardMaterial({ color: 0xff3300, roughness: 0.4 });

  const wedgeCount = 44;
  for (let i = 0; i < wedgeCount; i++) {
    const angle = (i / wedgeCount) * Math.PI * 2;
    const r = boundaryRadius + 0.55;
    const wedge = new THREE.Mesh(tobleroneGeo, i % 2 === 0 ? tobleroneMat1 : tobleroneMat2);
    wedge.position.set(Math.sin(angle) * r, 0.18, Math.cos(angle) * r);
    wedge.rotation.y = angle + Math.PI / 2;
    wedge.rotation.z = Math.PI / 2;
    wedge.castShadow = true;
    stadiumGroup.add(wedge);
  }

  // --- 6. Sight Screens (North & South ends behind stumps) ---
  function createSightScreen(zPos) {
    const screenGroup = new THREE.Group();

    // Large white louvered slat board
    const screenGeo = new THREE.BoxGeometry(8.0, 5.0, 0.25);
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85
    });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.y = 2.6;
    screen.castShadow = true;
    screenGroup.add(screen);

    // Dark support scaffold legs
    const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 3.2);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.5 });
    const leg1 = new THREE.Mesh(legGeo, legMat);
    leg1.position.set(-3.6, 1.6, -0.2);
    const leg2 = new THREE.Mesh(legGeo, legMat);
    leg2.position.set(3.6, 1.6, -0.2);
    screenGroup.add(leg1, leg2);

    screenGroup.position.set(0, 0, zPos);
    return screenGroup;
  }

  stadiumGroup.add(createSightScreen(-62.5));
  stadiumGroup.add(createSightScreen(62.5));

  // --- 7. Grandstands with Aisles, Tiered Seating & Instanced Crowd ---
  const standTiers = 3;
  const innerStandR = 72;
  const numSectors = 12; // 12 stadium bays separated by gangways / aisles
  const aisleAngle = 0.08; // gap between bays

  const tierMat = new THREE.MeshStandardMaterial({
    color: 0x37474f,
    roughness: 0.85,
    metalness: 0.1,
    side: THREE.DoubleSide
  });

  // Construct tiered concrete bays with aisles
  for (let tier = 0; tier < standTiers; tier++) {
    const tierR = innerStandR + tier * 7.5;
    const tierHeight = 2.0 + tier * 5.2;

    for (let s = 0; s < numSectors; s++) {
      const startAngle = (s / numSectors) * Math.PI * 2 + aisleAngle / 2;
      const sweepAngle = (Math.PI * 2 / numSectors) - aisleAngle;

      const bayGeo = new THREE.CylinderGeometry(
        tierR + 7.0,
        tierR,
        4.8,
        16,
        1,
        true,
        startAngle,
        sweepAngle
      );
      const bayMesh = new THREE.Mesh(bayGeo, tierMat);
      bayMesh.position.y = tierHeight + 2.4;
      bayMesh.receiveShadow = true;
      stadiumGroup.add(bayMesh);
    }
  }

  // High-Performance Instanced Spectator Crowd (Single draw call for 700+ fans!)
  const totalSpectators = 720;
  const fanGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.75, 6);
  fanGeo.translate(0, 0.375, 0);

  const fanMat = new THREE.MeshStandardMaterial({
    roughness: 0.8,
    metalness: 0.05
  });

  const crowdInstanced = new THREE.InstancedMesh(fanGeo, fanMat, totalSpectators);
  crowdInstanced.castShadow = false; // Disable spectator shadows for 60 FPS performance on laptops
  crowdInstanced.receiveShadow = true;

  // Distinct team fan color palettes for stadium sections
  const sectionColors = [
    new THREE.Color(0x1565c0), // Team Blue Section
    new THREE.Color(0xfbc02d), // Team Gold Section
    new THREE.Color(0xc62828), // Red Section
    new THREE.Color(0x2e7d32), // Green Section
    new THREE.Color(0xffffff), // White fan shirts
    new THREE.Color(0xff6f00)  // Orange fan shirts
  ];

  const dummy = new THREE.Object3D();
  let fanIndex = 0;

  for (let tier = 0; tier < standTiers; tier++) {
    const tierR = innerStandR + tier * 7.5;
    const tierHeight = 2.0 + tier * 5.2;
    const countInTier = totalSpectators / standTiers;

    for (let c = 0; c < countInTier; c++) {
      const angle = (c / countInTier) * Math.PI * 2;
      // Skip gangway aisles
      const sectorFraction = ((angle % ((Math.PI * 2) / numSectors)) / ((Math.PI * 2) / numSectors));
      if (sectorFraction < 0.1 || sectorFraction > 0.9) continue;

      const dist = tierR + 2.4 + (c % 3) * 1.5;
      const cx = Math.sin(angle) * dist;
      const cz = Math.cos(angle) * dist;
      const cy = tierHeight + 1.2 + (c % 3) * 1.0;

      dummy.position.set(cx, cy, cz);
      dummy.scale.set(1.0, 1.0 + (Math.random() - 0.5) * 0.2, 1.0);
      dummy.rotation.y = angle + Math.PI; // Look towards pitch center
      dummy.updateMatrix();

      crowdInstanced.setMatrixAt(fanIndex, dummy.matrix);

      // Section-based team colors
      const sectionIdx = Math.floor((angle / (Math.PI * 2)) * sectionColors.length) % sectionColors.length;
      crowdInstanced.setColorAt(fanIndex, sectionColors[sectionIdx]);

      fanIndex++;
    }
  }

  crowdInstanced.count = fanIndex;
  crowdInstanced.instanceMatrix.needsUpdate = true;
  if (crowdInstanced.instanceColor) crowdInstanced.instanceColor.needsUpdate = true;
  stadiumGroup.add(crowdInstanced);

  // Stadium Perimeter Concrete Wall
  const outerWallGeo = new THREE.CylinderGeometry(innerStandR + 24, innerStandR + 22, 22, 64, 1, true);
  const outerWallMat = new THREE.MeshStandardMaterial({
    color: 0x212121,
    roughness: 0.92,
    side: THREE.DoubleSide
  });
  const outerWall = new THREE.Mesh(outerWallGeo, outerWallMat);
  outerWall.position.y = 11;
  stadiumGroup.add(outerWall);

  // Stadium Roof Ring Canopy
  const roofGeo = new THREE.RingGeometry(innerStandR + 4, innerStandR + 26, 64);
  roofGeo.rotateX(-Math.PI / 2);
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x263238,
    roughness: 0.6,
    metalness: 0.2,
    side: THREE.DoubleSide
  });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 22.8;
  roof.castShadow = true;
  stadiumGroup.add(roof);

  // --- 8. Four Realistic Floodlight Towers ---
  const floodlightAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
  const towerDist = 95;

  floodlightAngles.forEach((ang) => {
    const tx = Math.sin(ang) * towerDist;
    const tz = Math.cos(ang) * towerDist;
    const towerHeight = 44;

    const towerGroup = new THREE.Group();
    towerGroup.position.set(tx, 0, tz);

    // Lattice Mast
    const mastGeo = new THREE.CylinderGeometry(0.7, 1.8, towerHeight, 6);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.6, metalness: 0.4 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.y = towerHeight / 2;
    mast.castShadow = true;
    towerGroup.add(mast);

    // Floodlight Head Array
    const headGeo = new THREE.BoxGeometry(8.2, 5.0, 1.2);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x263238 });
    const lightHead = new THREE.Mesh(headGeo, headMat);
    lightHead.position.y = towerHeight + 2;
    lightHead.lookAt(0, 10, 0);
    towerGroup.add(lightHead);

    // Emissive glowing light bulbs panel
    const bulbsGeo = new THREE.PlaneGeometry(7.5, 4.4);
    const bulbsMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide
    });
    const bulbs = new THREE.Mesh(bulbsGeo, bulbsMat);
    bulbs.position.z = 0.65;
    lightHead.add(bulbs);

    // Efficient spotlight with tuned attenuation
    const spotLight = new THREE.SpotLight(0xfff5e6, 2600, 190, Math.PI / 4.2, 0.4, 1.3);
    spotLight.position.set(tx, towerHeight + 2, tz);
    spotLight.target.position.set(0, 0, 0);
    scene.add(spotLight.target);
    scene.add(spotLight);

    if (!stadiumGroup.userData.spotLights) stadiumGroup.userData.spotLights = [];
    stadiumGroup.userData.spotLights.push(spotLight);

    stadiumGroup.add(towerGroup);
  });

  // --- 9. Stadium LED Video Board ---
  const boardGroup = new THREE.Group();
  boardGroup.position.set(-66, 14.5, -34);
  boardGroup.rotation.y = Math.PI * 0.38;

  const boardFrameGeo = new THREE.BoxGeometry(16, 9, 1.4);
  const boardFrameMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const boardFrame = new THREE.Mesh(boardFrameGeo, boardFrameMat);
  boardGroup.add(boardFrame);

  const boardCanvas = document.createElement('canvas');
  boardCanvas.width = 512;
  boardCanvas.height = 256;
  const bctx = boardCanvas.getContext('2d');
  bctx.fillStyle = '#070c18';
  bctx.fillRect(0, 0, 512, 256);
  bctx.fillStyle = '#ffaa00';
  bctx.font = 'bold 36px sans-serif';
  bctx.textAlign = 'center';
  bctx.fillText('CRICKET LEGENDS 3D', 256, 60);
  bctx.fillStyle = '#00e5ff';
  bctx.font = 'bold 48px monospace';
  bctx.fillText('LIVE MATCH BROADCAST', 256, 138);
  bctx.fillStyle = '#81c784';
  bctx.font = 'bold 26px sans-serif';
  bctx.fillText('OFFICIAL STADIUM ARENA', 256, 205);

  const boardTex = new THREE.CanvasTexture(boardCanvas);
  const screenFaceGeo = new THREE.PlaneGeometry(15, 8);
  const screenFaceMat = new THREE.MeshBasicMaterial({ map: boardTex });
  const screenFace = new THREE.Mesh(screenFaceGeo, screenFaceMat);
  screenFace.position.z = 0.75;
  boardGroup.add(screenFace);
  stadiumGroup.add(boardGroup);

  scene.add(stadiumGroup);
  return stadiumGroup;
}
