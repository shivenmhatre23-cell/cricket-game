import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Visually authentic 3D Narendra Modi Stadium (Ahmedabad)
// Twin-tier stadium bowl, signature saffron & royal blue seating, tensile PTFE membrane roof canopy,
// radial cantilever trusses, 360-degree LED roof light ring, giant jumbotron video boards,
// and dense instanced spectator crowd (1200+ fans).
export function createStadium(scene) {
  const stadiumGroup = new THREE.Group();
  stadiumGroup.name = 'NarendraModiStadium';

  // --- 1. Authentic Cricket Oval Outfield ---
  // Ground dimensions: 66m x 72m international standard oval
  const ovalRadiusX = 66.0;
  const ovalRadiusZ = 72.0;
  const numRings = 14;

  // Concentric mown grass rings with alternating lush green shades
  for (let i = 0; i < numRings; i++) {
    const fractionInner = i / numRings;
    const fractionOuter = (i + 1) / numRings;

    const ringGeo = new THREE.RingGeometry(
      fractionInner === 0 ? 0.2 : fractionInner * 70,
      fractionOuter * 70,
      72
    );
    ringGeo.rotateX(-Math.PI / 2);
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
  const baseGroundGeo = new THREE.CircleGeometry(125, 64);
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
  const thirtyYardRadius = 27.43;
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

  for (let m = 0; m < markerCount; m++) {
    const angle = (m / markerCount) * Math.PI * 2;
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(Math.cos(angle) * thirtyYardRadius, 0.022, Math.sin(angle) * thirtyYardRadius);
    stadiumGroup.add(marker);
  }

  // --- 3. Central Pitch Turf Strip & Infield Apron ---
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

  // Rectangular central pitch strip (Ahmedabad Red/Clay soil characteristic)
  const pitchLength = 22.56;
  const pitchWidth = 3.15;
  const pitchGeo = new THREE.PlaneGeometry(pitchWidth, pitchLength);
  pitchGeo.rotateX(-Math.PI / 2);

  let pitchMat;
  if (typeof document !== 'undefined') {
    const pitchCanvas = document.createElement('canvas');
    pitchCanvas.width = 512;
    pitchCanvas.height = 1024;
    const pctx = pitchCanvas.getContext('2d');

    pctx.fillStyle = '#cbb27f';
    pctx.fillRect(0, 0, 512, 1024);

    // Subtle grass blending on edges
    const grassEdgeGrad = pctx.createLinearGradient(0, 0, 512, 0);
    grassEdgeGrad.addColorStop(0, 'rgba(67, 160, 71, 0.35)');
    grassEdgeGrad.addColorStop(0.1, 'rgba(67, 160, 71, 0.05)');
    grassEdgeGrad.addColorStop(0.9, 'rgba(67, 160, 71, 0.05)');
    grassEdgeGrad.addColorStop(1, 'rgba(67, 160, 71, 0.35)');
    pctx.fillStyle = grassEdgeGrad;
    pctx.fillRect(0, 0, 512, 1024);

    // Compacted clay cracks & pitch grain lines
    pctx.strokeStyle = 'rgba(150, 120, 75, 0.22)';
    pctx.lineWidth = 1;
    for (let i = 0; i < 40; i++) {
      const y = Math.random() * 1024;
      pctx.beginPath();
      pctx.moveTo(30 + Math.random() * 50, y);
      pctx.lineTo(430 + Math.random() * 50, y + (Math.random() - 0.5) * 15);
      pctx.stroke();
    }

    function drawFootmarks(cy) {
      pctx.fillStyle = 'rgba(128, 98, 55, 0.4)';
      for (let f = 0; f < 8; f++) {
        const fx = 256 + (Math.random() - 0.5) * 160;
        const fy = cy + (Math.random() - 0.5) * 60;
        pctx.beginPath();
        pctx.ellipse(fx, fy, 16 + Math.random() * 10, 8 + Math.random() * 6, Math.random() * 0.5, 0, Math.PI * 2);
        pctx.fill();
      }
    }
    drawFootmarks(140);
    drawFootmarks(884);

    // Pitch good-length bounce wear patches
    pctx.fillStyle = 'rgba(140, 112, 68, 0.25)';
    pctx.beginPath();
    pctx.ellipse(256, 420, 70, 110, 0, 0, Math.PI * 2);
    pctx.fill();
    pctx.beginPath();
    pctx.ellipse(256, 604, 70, 110, 0, 0, Math.PI * 2);
    pctx.fill();

    const pitchTexture = new THREE.CanvasTexture(pitchCanvas);
    pitchTexture.anisotropy = 4;
    pitchMat = new THREE.MeshStandardMaterial({
      map: pitchTexture,
      roughness: 0.92,
      metalness: 0.01
    });
  } else {
    pitchMat = new THREE.MeshStandardMaterial({
      color: 0xcbb27f,
      roughness: 0.92,
      metalness: 0.01
    });
  }

  const pitch = new THREE.Mesh(pitchGeo, pitchMat);
  pitch.position.set(0, 0.02, 0);
  pitch.receiveShadow = true;
  stadiumGroup.add(pitch);

  // --- 4. Official Pitch Markings ---
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  function createCrease(w, l, x, z) {
    const geo = new THREE.PlaneGeometry(w, l);
    geo.rotateX(-Math.PI / 2);
    const line = new THREE.Mesh(geo, lineMat);
    line.position.set(x, 0.026, z);
    stadiumGroup.add(line);
  }

  // Popping Creases (Z = +/- 8.84m)
  createCrease(3.66, 0.075, 0, 8.84);
  createCrease(3.66, 0.075, 0, -8.84);

  // Bowling Creases (Z = +/- 10.06m)
  createCrease(2.64, 0.06, 0, 10.06);
  createCrease(2.64, 0.06, 0, -10.06);

  // Return Creases
  createCrease(0.06, 2.44, -1.32, 9.45);
  createCrease(0.06, 2.44, 1.32, 9.45);
  createCrease(0.06, 2.44, -1.32, -9.45);
  createCrease(0.06, 2.44, 1.32, -9.45);

  // Protected Area Warning Markings
  createCrease(0.3, 0.05, -1.0, 7.32);
  createCrease(0.3, 0.05, 1.0, 7.32);
  createCrease(0.3, 0.05, -1.0, -7.32);
  createCrease(0.3, 0.05, 1.0, -7.32);

  // --- 5. Boundary Rope & Toblerones ---
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

  // Sight Screens
  function createSightScreen(zPos) {
    const screenGroup = new THREE.Group();
    const screenGeo = new THREE.BoxGeometry(8.0, 5.0, 0.25);
    const screenMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.y = 2.6;
    screen.castShadow = true;
    screenGroup.add(screen);

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

  // --- 6. NARENDRA MODI STADIUM: Iconic Twin-Tier Grandstand Bowl ---
  // Lower Tier: Royal Blue & Saffron Orange seating bays (Motera signature)
  // Upper Tier: Saffron Orange, Golden Yellow, and White seating bands
  // VIP Ribbon: Corporate Hospitality Suites with glass front
  const numSectors = 16;
  const aisleAngle = 0.055;

  const matLowerBlue = new THREE.MeshStandardMaterial({ color: 0x0d47a1, roughness: 0.65, side: THREE.DoubleSide });
  const matLowerOrange = new THREE.MeshStandardMaterial({ color: 0xe65100, roughness: 0.65, side: THREE.DoubleSide });
  const matUpperOrange = new THREE.MeshStandardMaterial({ color: 0xf57c00, roughness: 0.65, side: THREE.DoubleSide });
  const matUpperGold = new THREE.MeshStandardMaterial({ color: 0xffb300, roughness: 0.65, side: THREE.DoubleSide });
  const matConcrete = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.88, side: THREE.DoubleSide });
  const matVipGlass = new THREE.MeshStandardMaterial({ color: 0x1a237e, metalness: 0.7, roughness: 0.15, transparent: true, opacity: 0.8 });

  // 6A. Lower Seating Tier (radius 72m to 86m, height 1.8m to 9.5m)
  for (let s = 0; s < numSectors; s++) {
    const startAngle = (s / numSectors) * Math.PI * 2 + aisleAngle / 2;
    const sweepAngle = (Math.PI * 2 / numSectors) - aisleAngle;
    const tierGeo = new THREE.CylinderGeometry(86, 72, 7.8, 16, 1, true, startAngle, sweepAngle);
    const tierMat = s % 2 === 0 ? matLowerBlue : matLowerOrange;
    const tierMesh = new THREE.Mesh(tierGeo, tierMat);
    tierMesh.position.y = 5.2;
    tierMesh.receiveShadow = true;
    stadiumGroup.add(tierMesh);
  }

  // 6B. VIP Hospitality Suites / Corporate Ribbon (radius 86m to 88m, height 9.5m to 12.5m)
  const vipGeo = new THREE.CylinderGeometry(88.2, 86.2, 3.2, 48, 1, true);
  const vipMesh = new THREE.Mesh(vipGeo, matVipGlass);
  vipMesh.position.y = 10.8;
  stadiumGroup.add(vipMesh);

  // 6C. Upper Seating Tier (radius 88m to 104m, height 12.5m to 24.5m)
  for (let s = 0; s < numSectors; s++) {
    const startAngle = (s / numSectors) * Math.PI * 2 + aisleAngle / 2;
    const sweepAngle = (Math.PI * 2 / numSectors) - aisleAngle;
    const tierGeo = new THREE.CylinderGeometry(104, 88.5, 12.0, 16, 1, true, startAngle, sweepAngle);
    const tierMat = (s % 3 === 0) ? matUpperOrange : (s % 3 === 1 ? matUpperGold : matLowerBlue);
    const tierMesh = new THREE.Mesh(tierGeo, tierMat);
    tierMesh.position.y = 18.5;
    tierMesh.receiveShadow = true;
    stadiumGroup.add(tierMesh);
  }

  // 6D. Exterior Concrete Perimeter Façade & Architectural Columns
  const outerWallGeo = new THREE.CylinderGeometry(106, 104, 25, 48, 1, true);
  const outerWallMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.9, side: THREE.DoubleSide });
  const outerWall = new THREE.Mesh(outerWallGeo, outerWallMat);
  outerWall.position.y = 12.5;
  stadiumGroup.add(outerWall);

  // Exterior vertical architectural columns
  const columnGeo = new THREE.CylinderGeometry(0.85, 1.1, 26, 8);
  const columnMat = new THREE.MeshStandardMaterial({ color: 0xdce775, roughness: 0.5, metalness: 0.2 });
  const columnCount = 32;
  for (let i = 0; i < columnCount; i++) {
    const ang = (i / columnCount) * Math.PI * 2;
    const col = new THREE.Mesh(columnGeo, columnMat);
    col.position.set(Math.sin(ang) * 105.5, 13.0, Math.cos(ang) * 105.5);
    stadiumGroup.add(col);
  }

  // --- 7. Narendra Modi Stadium: Iconic White PTFE Tensile Membrane Roof & Cantilever Trusses ---
  const roofInnerR = 74.0;
  const roofOuterR = 106.5;
  const roofHeight = 25.8;

  // Main white tensile canopy membrane
  const roofGeo = new THREE.RingGeometry(roofInnerR, roofOuterR, 64);
  roofGeo.rotateX(-Math.PI / 2);
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0xfafafa,
    roughness: 0.35,
    metalness: 0.05,
    side: THREE.DoubleSide
  });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = roofHeight;
  roof.castShadow = true;
  stadiumGroup.add(roof);

  // Outer structural ring truss beam
  const ringBeamCurve = new THREE.EllipseCurve(0, 0, roofOuterR, roofOuterR, 0, 2 * Math.PI, false, 0);
  const ringBeamPoints = ringBeamCurve.getPoints(64).map(p => new THREE.Vector3(p.x, roofHeight + 0.6, p.y));
  const ringBeamGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ringBeamPoints, true), 64, 0.45, 8, true);
  const trussMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.5, metalness: 0.6 });
  const ringBeam = new THREE.Mesh(ringBeamGeo, trussMat);
  stadiumGroup.add(ringBeam);

  // Radial cantilever steel truss struts extending inward over the stands
  const trussCount = 32;
  const strutGeo = new THREE.CylinderGeometry(0.2, 0.3, roofOuterR - roofInnerR, 6);
  strutGeo.rotateZ(Math.PI / 2);
  for (let i = 0; i < trussCount; i++) {
    const ang = (i / trussCount) * Math.PI * 2;
    const midR = (roofInnerR + roofOuterR) / 2;
    const strut = new THREE.Mesh(strutGeo, trussMat);
    strut.position.set(Math.sin(ang) * midR, roofHeight - 0.4, Math.cos(ang) * midR);
    strut.rotation.y = -ang + Math.PI / 2;
    stadiumGroup.add(strut);
  }

  // Continuous 360-degree LED Roof Floodlight Ring (Motera's shadow-free lighting rim)
  const lightRingCurve = new THREE.EllipseCurve(0, 0, roofInnerR + 1.2, roofInnerR + 1.2, 0, 2 * Math.PI, false, 0);
  const lightRingPoints = lightRingCurve.getPoints(64).map(p => new THREE.Vector3(p.x, roofHeight - 0.7, p.y));
  const lightRingGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lightRingPoints, true), 64, 0.22, 8, true);
  const lightRingMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lightRing = new THREE.Mesh(lightRingGeo, lightRingMat);
  stadiumGroup.add(lightRing);

  // --- 8. Dense Instanced Spectator Crowd (1,200 Fans Across Lower & Upper Tiers) ---
  const totalSpectators = 1200;
  const fanGeo = new THREE.CylinderGeometry(0.26, 0.30, 0.75, 6);
  fanGeo.translate(0, 0.375, 0);

  const fanMat = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.05 });
  const crowdInstanced = new THREE.InstancedMesh(fanGeo, fanMat, totalSpectators);
  crowdInstanced.castShadow = false;
  crowdInstanced.receiveShadow = true;

  // Narendra Modi Stadium fan color palette: India Blue, Saffron Orange, Gold, White, Green
  const fanColors = [
    new THREE.Color(0x1565c0), // Royal Blue (India fans)
    new THREE.Color(0xff6f00), // Saffron Orange
    new THREE.Color(0xffb300), // Golden Yellow
    new THREE.Color(0xffffff), // White fan shirt
    new THREE.Color(0x2e7d32), // Forest Green
    new THREE.Color(0xd32f2f)  // Crimson Red
  ];

  const dummy = new THREE.Object3D();
  let fanIndex = 0;

  // Populate Lower Tier (fans close to boundary)
  const lowerFanCount = Math.floor(totalSpectators * 0.45);
  for (let i = 0; i < lowerFanCount; i++) {
    const angle = (i / lowerFanCount) * Math.PI * 2;
    const sectorFraction = ((angle % ((Math.PI * 2) / numSectors)) / ((Math.PI * 2) / numSectors));
    if (sectorFraction < 0.08 || sectorFraction > 0.92) continue; // Skip gangway stairs

    const row = i % 4;
    const dist = 73.5 + row * 2.8;
    const cy = 2.4 + row * 1.8;

    dummy.position.set(Math.sin(angle) * dist, cy, Math.cos(angle) * dist);
    dummy.scale.set(1.0, 1.0 + (Math.random() - 0.5) * 0.25, 1.0);
    dummy.rotation.y = angle + Math.PI; // Face towards pitch center
    dummy.updateMatrix();

    crowdInstanced.setMatrixAt(fanIndex, dummy.matrix);
    const colorIdx = (Math.floor(angle * 3) + row) % fanColors.length;
    crowdInstanced.setColorAt(fanIndex, fanColors[colorIdx]);
    fanIndex++;
  }

  // Populate Upper Tier (massive roaring upper bowl)
  const upperFanCount = totalSpectators - lowerFanCount;
  for (let i = 0; i < upperFanCount; i++) {
    const angle = (i / upperFanCount) * Math.PI * 2;
    const sectorFraction = ((angle % ((Math.PI * 2) / numSectors)) / ((Math.PI * 2) / numSectors));
    if (sectorFraction < 0.08 || sectorFraction > 0.92) continue;

    const row = i % 5;
    const dist = 89.5 + row * 2.6;
    const cy = 13.5 + row * 2.0;

    dummy.position.set(Math.sin(angle) * dist, cy, Math.cos(angle) * dist);
    dummy.scale.set(1.0, 1.0 + (Math.random() - 0.5) * 0.25, 1.0);
    dummy.rotation.y = angle + Math.PI;
    dummy.updateMatrix();

    crowdInstanced.setMatrixAt(fanIndex, dummy.matrix);
    const colorIdx = (Math.floor(angle * 2.5) + row + 1) % fanColors.length;
    crowdInstanced.setColorAt(fanIndex, fanColors[colorIdx]);
    fanIndex++;
  }

  crowdInstanced.count = fanIndex;
  crowdInstanced.instanceMatrix.needsUpdate = true;
  if (crowdInstanced.instanceColor) crowdInstanced.instanceColor.needsUpdate = true;
  stadiumGroup.add(crowdInstanced);

  // --- 9. Four Iconic Corner Floodlight Lattice Towers ---
  const floodlightAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
  const towerDist = 112;

  floodlightAngles.forEach((ang) => {
    const tx = Math.sin(ang) * towerDist;
    const tz = Math.cos(ang) * towerDist;
    const towerHeight = 48;

    const towerGroup = new THREE.Group();
    towerGroup.position.set(tx, 0, tz);

    const mastGeo = new THREE.CylinderGeometry(0.8, 2.2, towerHeight, 6);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x607d8b, roughness: 0.6, metalness: 0.4 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.y = towerHeight / 2;
    mast.castShadow = true;
    towerGroup.add(mast);

    const headGeo = new THREE.BoxGeometry(9.0, 5.5, 1.2);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x212121 });
    const lightHead = new THREE.Mesh(headGeo, headMat);
    lightHead.position.y = towerHeight + 2;
    lightHead.lookAt(0, 10, 0);
    towerGroup.add(lightHead);

    const bulbsGeo = new THREE.PlaneGeometry(8.2, 4.8);
    const bulbsMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const bulbs = new THREE.Mesh(bulbsGeo, bulbsMat);
    bulbs.position.z = 0.65;
    lightHead.add(bulbs);

    const spotLight = new THREE.SpotLight(0xfff8ee, 2800, 210, Math.PI / 4.2, 0.4, 1.25);
    spotLight.position.set(tx, towerHeight + 2, tz);
    spotLight.target.position.set(0, 0, 0);
    scene.add(spotLight.target);
    scene.add(spotLight);

    if (!stadiumGroup.userData.spotLights) stadiumGroup.userData.spotLights = [];
    stadiumGroup.userData.spotLights.push(spotLight);

    stadiumGroup.add(towerGroup);
  });

  // --- 10. Giant High-Definition Video Scoreboards (North & South Ends) ---
  function createJumbotronBoard(posX, posY, posZ, rotY, titleText, subText, statText) {
    const boardGroup = new THREE.Group();
    boardGroup.position.set(posX, posY, posZ);
    boardGroup.rotation.y = rotY;

    const boardFrameGeo = new THREE.BoxGeometry(18, 9.6, 1.4);
    const boardFrameMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const boardFrame = new THREE.Mesh(boardFrameGeo, boardFrameMat);
    boardGroup.add(boardFrame);

    let screenFaceMat;
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      // High-tech digital scoreboard graphic
      ctx.fillStyle = '#060d1a';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#ff6f00';
      ctx.lineWidth = 4;
      ctx.strokeRect(6, 6, 500, 244);

      ctx.fillStyle = '#ff9800';
      ctx.font = '900 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(titleText, 256, 58);

      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 44px monospace';
      ctx.fillText(subText, 256, 136);

      ctx.fillStyle = '#81c784';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(statText, 256, 206);

      const boardTex = new THREE.CanvasTexture(canvas);
      screenFaceMat = new THREE.MeshBasicMaterial({ map: boardTex });
    } else {
      screenFaceMat = new THREE.MeshBasicMaterial({ color: 0x060d1a });
    }

    const screenFaceGeo = new THREE.PlaneGeometry(16.8, 8.6);
    const screenFace = new THREE.Mesh(screenFaceGeo, screenFaceMat);
    screenFace.position.z = 0.75;
    boardGroup.add(screenFace);

    return boardGroup;
  }

  // North Stand Jumbotron
  stadiumGroup.add(createJumbotronBoard(
    -70, 16.5, -36,
    Math.PI * 0.35,
    '🏟️ NARENDRA MODI STADIUM',
    'AHMEDABAD • CAPACITY: 132,000',
    'WORLD\'S LARGEST CRICKET STADIUM'
  ));

  // South Stand Jumbotron
  stadiumGroup.add(createJumbotronBoard(
    70, 16.5, 36,
    -Math.PI * 0.65,
    'CRICKET LEGENDS 3D',
    'LIVE MATCH BROADCAST',
    'PITCH: HARD BOUNCY RED/BLACK CLAY'
  ));

  // --- 11. Custom GLTF/GLB Model Support (Sketchfab Integration) ---
  // If the user places the downloaded 3D model into public/models/narendra_modi_stadium.glb
  // or public/models/stadium.glb, load it seamlessly into the stadium scene
  loadCustomStadiumModel(stadiumGroup);

  scene.add(stadiumGroup);
  return stadiumGroup;
}

// Seamless GLTF Loader for User-Provided Sketchfab Models
function loadCustomStadiumModel(stadiumGroup) {
  if (typeof window === 'undefined') return;

  const loader = new GLTFLoader();
  const modelPaths = ['/models/narendra_modi_stadium.glb', '/models/stadium.glb'];

  function tryLoadNext(idx) {
    if (idx >= modelPaths.length) return;
    const path = modelPaths[idx];

    loader.load(
      path,
      (gltf) => {
        const customModel = gltf.scene;
        customModel.name = 'CustomSketchfabStadium';
        // Auto-scale to match 65m boundary radius
        const bbox = new THREE.Box3().setFromObject(customModel);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const maxHoriz = Math.max(size.x, size.z);
        if (maxHoriz > 0) {
          const targetDiameter = 180; // Stadium bowl exterior diameter
          const scale = targetDiameter / maxHoriz;
          customModel.scale.set(scale, scale, scale);
        }
        customModel.position.set(0, 0, 0);
        stadiumGroup.add(customModel);
        console.log(`[Stadium] Successfully loaded custom Sketchfab model from ${path}`);
      },
      undefined,
      () => {
        // Model not yet downloaded in public/models/ - proceed with procedural replica
        tryLoadNext(idx + 1);
      }
    );
  }

  tryLoadNext(0);
}
