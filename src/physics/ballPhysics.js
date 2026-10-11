import * as THREE from 'three';
import { soundManager } from '../audio/soundManager.js';

export class BallPhysics {
  constructor(scene) {
    this.scene = scene;

    // 1. High-Detail Cricket Ball Mesh: Polished cherry-red leather with white stitched seam
    const ballGeo = new THREE.SphereGeometry(0.09, 24, 24);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xb71c1c,
      roughness: 0.28,
      metalness: 0.15
    });
    this.mesh = new THREE.Mesh(ballGeo, ballMat);
    this.mesh.castShadow = true;
    this.scene.add(this.mesh);

    // Stitched Seam Ring (oriented dynamically based on bowler profile)
    const seamGeo = new THREE.TorusGeometry(0.091, 0.007, 8, 36);
    const seamMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    this.seamMesh = new THREE.Mesh(seamGeo, seamMat);
    this.mesh.add(this.seamMesh);

    // 2. Pitch Bounce Marker (Pre-bounce prediction ring)
    const markerGeo = new THREE.RingGeometry(0.2, 0.35, 32);
    markerGeo.rotateX(-Math.PI / 2);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0xffea00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    });
    this.bounceMarker = new THREE.Mesh(markerGeo, markerMat);
    this.bounceMarker.position.set(0, 0.03, 4.4);
    this.scene.add(this.bounceMarker);

    // 2b. Pitch Bounce Puff Ring (subtle turf impact feedback on bounce)
    const puffGeo = new THREE.RingGeometry(0.08, 0.26, 24);
    puffGeo.rotateX(-Math.PI / 2);
    const puffMat = new THREE.MeshBasicMaterial({
      color: 0xddc088,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    this.bouncePuffMesh = new THREE.Mesh(puffGeo, puffMat);
    this.bouncePuffMesh.visible = false;
    this.scene.add(this.bouncePuffMesh);
    this.bouncePuffTimer = 0;

    // 3. Bat Contact Visual Impact Effect (Flash ring)
    const impactGeo = new THREE.RingGeometry(0.05, 0.35, 24);
    const impactMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    this.impactMesh = new THREE.Mesh(impactGeo, impactMat);
    this.impactMesh.visible = false;
    this.scene.add(this.impactMesh);
    this.impactTimer = 0;

    // 3b. Bat Contact Sparks (12 pre-allocated points)
    const sparkCount = 12;
    const sparkGeo = new THREE.BufferGeometry();
    this.sparkPositions = new Float32Array(sparkCount * 3);
    this.sparkVelocities = new Float32Array(sparkCount * 3);
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(this.sparkPositions, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xfff59d,
      size: 0.08,
      transparent: true,
      opacity: 0
    });
    this.sparkMesh = new THREE.Points(sparkGeo, sparkMat);
    this.sparkMesh.visible = false;
    this.scene.add(this.sparkMesh);
    this.sparkTimer = 0;

    // 4. Ball motion physics state
    this.position = new THREE.Vector3(0, 2, -10);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.inPlay = false;
    this.hasBounced = false;
    this.hasHitBat = false;
    this.hasHitPad = false;
    this.isDead = true;
    this.isScored = false; // Strictly guarantees each delivery is scored once
    this.bounceCount = 0;
    this.pitchTarget = new THREE.Vector3(0, 0, 4.4);
    this.boundaryRadius = 65.0;

    // Delivery metadata
    this.currentDeliveryId = null;
    this.deliverySpeedKmph = 136;
    this.swingAmount = 0;
    this.bowlingType = 'FAST';
    this.lengthType = 'GOOD';

    // Fielder throw state
    this.fielderHolding = null;
    this.isThrowing = false;

    // Visual trajectory trail
    this.trailPoints = [];
    this.trailLine = null;
    this.initTrail();

    this.resetToBowlerHand();
  }

  initTrail() {
    const maxTrail = 40;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxTrail * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
      linewidth: 2
    });

    this.trailLine = new THREE.Line(geometry, material);
    this.trailLine.frustumCulled = false;
    this.scene.add(this.trailLine);
  }

  updateTrail() {
    if (!this.inPlay) {
      this.trailPoints = [];
      const posAttr = this.trailLine.geometry.attributes.position;
      posAttr.array.fill(0);
      posAttr.needsUpdate = true;
      return;
    }

    this.trailPoints.push(this.mesh.position.clone());
    if (this.trailPoints.length > 40) {
      this.trailPoints.shift();
    }

    const posAttr = this.trailLine.geometry.attributes.position;
    for (let i = 0; i < this.trailPoints.length; i++) {
      posAttr.setXYZ(i, this.trailPoints[i].x, this.trailPoints[i].y, this.trailPoints[i].z);
    }
    for (let i = this.trailPoints.length; i < 40; i++) {
      posAttr.setXYZ(i, this.mesh.position.x, this.mesh.position.y, this.mesh.position.z);
    }
    posAttr.needsUpdate = true;
  }

  resetToBowlerHand(handPos = null) {
    if (handPos) {
      this.position.copy(handPos);
    } else {
      this.position.set(0.4, 2.1, -10.06);
    }
    this.mesh.position.copy(this.position);
    this.velocity.set(0, 0, 0);
    this.inPlay = false;
    this.hasBounced = false;
    this.hasHitBat = false;
    this.hasHitPad = false;
    this.isDead = true;
    this.isScored = false;
    this.bounceCount = 0;
    this.fielderHolding = null;
    this.isThrowing = false;
    this.bounceMarker.visible = true;
    this.bouncePuffTimer = 0;
    if (this.bouncePuffMesh) this.bouncePuffMesh.visible = false;
    this.sparkTimer = 0;
    if (this.sparkMesh) this.sparkMesh.visible = false;
    this.impactTimer = 0;
    if (this.impactMesh) this.impactMesh.visible = false;
    this.updateTrail();
  }

  // Follow bowler's bowling hand before delivery release
  attachToHand(pos) {
    if (this.inPlay || !pos) return;
    this.position.copy(pos);
    this.mesh.position.copy(pos);
  }

  // Configure incoming delivery parameters
  setupDelivery(deliveryData) {
    this.currentDeliveryId = deliveryData.deliveryId;
    this.deliverySpeedKmph = deliveryData.speedKmph || 136;
    this.swingAmount = deliveryData.swing || 0;
    this.bowlingType = deliveryData.bowlingType || 'FAST';
    this.bowlerProfileId = deliveryData.profileId || 'FAST_BOWLER';
    this.lengthType = deliveryData.lengthType || 'GOOD';

    // Calculate landing spot on pitch (stumps at Z = 10.06m)
    let targetZ = 4.4; // Good Length (approx 4.0m to 5.5m)
    if (this.lengthType === 'YORKER') targetZ = 8.1;
    else if (this.lengthType === 'FULL') targetZ = 6.3;
    else if (this.lengthType === 'SHORT') targetZ = 1.4;
    else if (this.lengthType === 'BOUNCER') targetZ = -0.8;

    const lineX = deliveryData.lineOffset || 0;
    this.pitchTarget.set(lineX, 0.02, targetZ);
    this.bounceMarker.position.copy(this.pitchTarget);
    this.bounceMarker.visible = true;
  }

  // Release ball from bowler's hand towards target
  deliverBall(releasePos = null) {
    // Idempotent delivery release guard
    if (this.inPlay) return;

    if (releasePos) {
      this.position.copy(releasePos);
      this.mesh.position.copy(this.position);
      this.velocity.set(0, 0, 0);
      this.hasBounced = false;
      this.hasHitBat = false;
      this.hasHitPad = false;
      this.bounceCount = 0;
      this.fielderHolding = null;
      this.isThrowing = false;
      this.bounceMarker.visible = true;
      this.updateTrail();
    } else {
      this.resetToBowlerHand();
    }

    this.inPlay = true;
    this.isDead = false;
    this.isScored = false;

    // Convert km/h to m/s
    const speedMs = this.deliverySpeedKmph / 3.6;

    const startPos = this.position.clone();
    const targetPos = this.pitchTarget.clone();

    // Time to reach pitch bounce point
    const deltaZ = targetPos.z - startPos.z;
    const timeToBounce = Math.max(deltaZ / speedMs, 0.22);

    // Initial velocity under gravity g = -9.8 m/s^2
    const vx = (targetPos.x - startPos.x) / timeToBounce;
    const vz = deltaZ / timeToBounce;
    const vy = (targetPos.y - startPos.y - 0.5 * (-9.8) * (timeToBounce * timeToBounce)) / timeToBounce;

    this.velocity.set(vx, vy, vz);

    // Dynamic seam alignment & aerodynamic trail color per bowling archetype
    if (this.seamMesh) {
      if (this.bowlerProfileId === 'SPIN_BOWLER' || this.bowlingType === 'Crafty Spinner') {
        this.seamMesh.rotation.set(0.45, 0.2, 0.6);
        if (this.trailLine) {
          this.trailLine.material.color.setHex(0xffcc80);
          this.trailLine.material.opacity = 0.55;
        }
      } else if (this.bowlerProfileId === 'SWING_BOWLER' || this.bowlingType === 'Swing Maestro') {
        const tilt = (this.swingAmount >= 0 ? 1 : -1) * 0.38;
        this.seamMesh.rotation.set(0, Math.PI / 2, tilt);
        if (this.trailLine) {
          this.trailLine.material.color.setHex(0x80d8ff);
          this.trailLine.material.opacity = 0.50;
        }
      } else {
        // Express Fast / Disciplined Seamer: pristine upright seam presentation
        this.seamMesh.rotation.set(0, Math.PI / 2, 0);
        if (this.trailLine) {
          this.trailLine.material.color.setHex(0xffffff);
          this.trailLine.material.opacity = 0.60;
        }
      }
    }

    soundManager.playWhoosh();
  }

  // Trigger differentiated visual impact effect
  showImpactEffect(pos, timingQuality = 'GOOD') {
    if (timingQuality === 'MISSED') return;

    this.impactMesh.position.copy(pos);
    this.impactMesh.rotation.x = -Math.PI / 2;
    this.impactMesh.scale.set(1, 1, 1);
    this.impactMesh.visible = true;

    if (timingQuality === 'PERFECT') {
      this.impactMesh.material.color.setHex(0xffea00); // Brilliant gold
      this.impactMesh.material.opacity = 1.0;
      this.impactTimer = 0.24;
      this.emitSparks(pos, 1.2);
    } else if (timingQuality === 'GOOD') {
      this.impactMesh.material.color.setHex(0xffffff); // Pure crisp white
      this.impactMesh.material.opacity = 0.85;
      this.impactTimer = 0.18;
      this.emitSparks(pos, 0.6);
    } else if (timingQuality === 'EARLY' || timingQuality === 'LATE') {
      // Edge snick: thin orange/amber friction ring
      this.impactMesh.material.color.setHex(0xff9800);
      this.impactMesh.material.opacity = 0.70;
      this.impactMesh.scale.set(0.7, 0.7, 0.7);
      this.impactTimer = 0.14;
      this.emitSparks(pos, 0.35);
    } else {
      // DEFENSIVE block: soft grey chalk ring
      this.impactMesh.material.color.setHex(0x90a4ae);
      this.impactMesh.material.opacity = 0.55;
      this.impactMesh.scale.set(0.5, 0.5, 0.5);
      this.impactTimer = 0.10;
    }
  }

  emitSparks(pos, speedMult = 1.0) {
    if (!this.sparkMesh) return;
    this.sparkMesh.position.copy(pos);
    this.sparkMesh.visible = true;
    this.sparkMesh.material.opacity = 0.95;
    this.sparkTimer = 0.18;

    const posAttr = this.sparkMesh.geometry.attributes.position;
    const arr = posAttr.array;
    for (let i = 0; i < 12; i++) {
      const idx = i * 3;
      arr[idx] = 0;
      arr[idx + 1] = 0;
      arr[idx + 2] = 0;

      const angle = Math.random() * Math.PI * 2;
      const speed = (1.6 + Math.random() * 2.4) * speedMult;
      this.sparkVelocities[idx] = Math.cos(angle) * speed;
      this.sparkVelocities[idx + 1] = (0.6 + Math.random() * 2.0) * speedMult;
      this.sparkVelocities[idx + 2] = Math.sin(angle) * speed;
    }
    posAttr.needsUpdate = true;
  }

  showBouncePuff(pos) {
    if (!this.bouncePuffMesh) return;
    this.bouncePuffMesh.position.set(pos.x, 0.02, pos.z);
    this.bouncePuffMesh.scale.set(1, 1, 1);
    this.bouncePuffMesh.material.opacity = 0.75;
    this.bouncePuffMesh.visible = true;
    this.bouncePuffTimer = 0.18;
  }

  // Bat strikes the ball with responsive physics
  applyBatHit({ shotData, timingQuality, customAngle = null }) {
    if (this.hasHitBat) return; // Strictly register once per delivery
    if (timingQuality === 'MISSED') return; // Strictly ignore missed shots
    this.hasHitBat = true;

    // Contact visual effect & sound
    this.showImpactEffect(this.position, timingQuality);

    // Boost post-contact trail visibility for boundary / outfield tracing
    if (this.trailLine) {
      if (timingQuality === 'PERFECT' || timingQuality === 'GOOD') {
        this.trailLine.material.color.setHex(0xffffff);
        this.trailLine.material.opacity = 0.75;
      } else {
        this.trailLine.material.color.setHex(0xb0bec5);
        this.trailLine.material.opacity = 0.40;
      }
    }

    // Base exit speed from chosen shot
    let baseSpeed = shotData.exitSpeed || 28.0;
    let verticalAngle = shotData.loftAngle || 0.1;
    const baseAngle = customAngle !== null ? customAngle : shotData.shotAngle;

    let timingMultiplier = 1.0;
    let angleDeviation = 0;
    let isSweet = true;

    switch (timingQuality) {
      case 'PERFECT':
        timingMultiplier = 1.15;
        angleDeviation = 0;
        isSweet = true;
        break;

      case 'GOOD':
        timingMultiplier = 0.95;
        angleDeviation = (Math.random() - 0.5) * 0.08;
        isSweet = true;
        break;

      case 'EARLY':
        // Early contact: closed bat face, leading edge
        timingMultiplier = 0.68;
        angleDeviation = 0.32; // pulls squarer / skies in the air
        verticalAngle += 0.25; // higher pop up (catch hazard!)
        isSweet = false;
        break;

      case 'LATE':
        // Late contact: open face, thick outside edge squirts squarer
        timingMultiplier = 0.62;
        angleDeviation = -0.32; // edges towards slip/gully/third-man
        verticalAngle = Math.max(0.04, verticalAngle - 0.05);
        isSweet = false;
        break;

      case 'MISSED':
      default:
        // Weak scuff or miss
        timingMultiplier = 0.25;
        verticalAngle = 0.02;
        isSweet = false;
        break;
    }

    // Defensive block overrides exit speed to keep ball safely dead on pitch
    if (shotData.id === 'DEFENSIVE') {
      baseSpeed = 4.2;
      verticalAngle = -0.05;
      timingMultiplier = 1.0;
      isSweet = false;
    }

    soundManager.playBatHit(timingMultiplier, isSweet, timingQuality);

    // Incoming ball velocity rebound bonus (fast deliveries rebound faster)
    const incomingRebound = Math.abs(this.velocity.z) * 0.12;
    const finalSpeed = (baseSpeed + incomingRebound) * timingMultiplier;
    const finalAngle = baseAngle + angleDeviation;

    // Direction vector in X-Z plane
    const dirX = Math.sin(finalAngle);
    const dirZ = Math.cos(finalAngle);

    const horizontalSpeed = finalSpeed * Math.cos(verticalAngle);
    this.velocity.set(
      dirX * horizontalSpeed,
      finalSpeed * Math.sin(verticalAngle),
      dirZ * horizontalSpeed
    );

    this.bounceMarker.visible = false;
  }

  // Update physics every frame
  update(delta, characters, onResult) {
    // Update impact flash fade
    if (this.impactTimer > 0) {
      this.impactTimer -= delta;
      this.impactMesh.material.opacity = Math.max(0, this.impactTimer / 0.22);
      this.impactMesh.scale.addScalar(delta * 4.0);
      if (this.impactTimer <= 0) {
        this.impactMesh.visible = false;
        this.impactMesh.scale.set(1, 1, 1);
      }
    }

    // Update sparks
    if (this.sparkTimer > 0) {
      this.sparkTimer -= delta;
      const posAttr = this.sparkMesh?.geometry?.attributes?.position;
      if (posAttr) {
        const arr = posAttr.array;
        for (let i = 0; i < 12; i++) {
          const idx = i * 3;
          arr[idx] += this.sparkVelocities[idx] * delta;
          arr[idx + 1] += (this.sparkVelocities[idx + 1] - 9.8 * delta) * delta;
          arr[idx + 2] += this.sparkVelocities[idx + 2] * delta;
        }
        posAttr.needsUpdate = true;
      }
      if (this.sparkMesh) {
        this.sparkMesh.material.opacity = Math.max(0, this.sparkTimer / 0.18);
        if (this.sparkTimer <= 0) {
          this.sparkMesh.visible = false;
        }
      }
    }

    // Update pitch bounce puff fade
    if (this.bouncePuffTimer > 0) {
      this.bouncePuffTimer -= delta;
      if (this.bouncePuffMesh) {
        this.bouncePuffMesh.material.opacity = Math.max(0, (this.bouncePuffTimer / 0.18) * 0.75);
        this.bouncePuffMesh.scale.addScalar(delta * 2.8);
        if (this.bouncePuffTimer <= 0) {
          this.bouncePuffMesh.visible = false;
          this.bouncePuffMesh.scale.set(1, 1, 1);
        }
      }
    }

    if (!this.inPlay) return;

    const gravity = -9.8;

    // 1. Aerodynamic swing deviation before bouncing
    if (!this.hasBounced && !this.hasHitBat && this.swingAmount !== 0) {
      this.velocity.x += this.swingAmount * delta * 2.8;
    }

    // 2. Velocity and gravity integration
    this.velocity.y += gravity * delta;
    this.position.addScaledVector(this.velocity, delta);
    this.mesh.position.copy(this.position);

    // Ball visual spin
    if (!this.hasHitBat) {
      if (this.bowlerProfileId === 'SPIN_BOWLER') {
        this.mesh.rotation.x += this.velocity.z * delta * 4.2;
        this.mesh.rotation.y += (this.swingAmount >= 0 ? 1 : -1) * delta * 8.5;
        this.mesh.rotation.z += delta * 5.2;
      } else if (this.bowlerProfileId === 'SWING_BOWLER') {
        this.mesh.rotation.x += this.velocity.z * delta * 3.6;
        this.mesh.rotation.y += (this.swingAmount >= 0 ? 1 : -1) * delta * 1.8;
      } else {
        this.mesh.rotation.x += this.velocity.z * delta * 4.4;
      }
    } else {
      this.mesh.rotation.x += this.velocity.z * delta * 3.5;
      this.mesh.rotation.y += this.velocity.x * delta * 3.5;
    }

    this.updateTrail();

    // 3. Ground / Pitch Bounce
    const groundY = 0.09;
    if (this.position.y <= groundY) {
      this.position.y = groundY;
      this.bounceCount++;

      if (!this.hasBounced && !this.hasHitBat) {
        this.hasBounced = true;
        this.bounceMarker.visible = false;
        this.showBouncePuff(this.position);
        soundManager.playPitchBounce(0.85);
      } else {
        soundManager.playPitchBounce(0.35);
      }

      // Restitution bounce
      const restitution = this.hasHitBat ? 0.58 : 0.68;
      this.velocity.y = -this.velocity.y * restitution;

      // Seam deviation on first bounce
      if (!this.hasHitBat && this.bounceCount === 1) {
        this.velocity.x += (Math.random() - 0.5) * 0.6;
      }

      // Grass rolling friction
      this.velocity.x *= 0.88;
      this.velocity.z *= 0.88;

      if (Math.abs(this.velocity.y) < 0.6) {
        this.velocity.y = 0;
      }
    }

    // 4. Stumps Collision Detection (Striker Wickets at Z = 10.06m)
    if (!this.hasHitBat && this.inPlay && this.position.z >= 9.9 && this.position.z <= 10.25) {
      if (Math.abs(this.position.x) < 0.22 && this.position.y < 0.78) {
        // BOWLED OUT!
        this.finishDelivery({
          outcome: 'WICKET',
          reason: 'Clean Bowled! 💥',
          runs: 0
        }, characters, onResult);
        soundManager.playStumpsHit();
        if (characters && characters.strikerStumps) {
          characters.strikerStumps.breakWickets(this.velocity);
        }
        return;
      }
    }

    // 5. Pad / Leg Collision Detection (Missing bat)
    if (!this.hasHitBat && !this.hasHitPad && this.inPlay && this.position.z >= 8.9 && this.position.z <= 9.35) {
      if (Math.abs(this.position.x - 0.1) < 0.24 && this.position.y >= 0.1 && this.position.y <= 0.85) {
        this.hasHitPad = true;
        soundManager.playPitchBounce(0.9);
        // Deflect off pads
        this.velocity.x += 1.8;
        this.velocity.y = 1.2;
        this.velocity.z *= 0.3;
      }
    }

    // 6. Boundary Rope Detection (Radius: 65.0m)
    const distFromCenter = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);
    if (this.hasHitBat && distFromCenter >= this.boundaryRadius && !this.isDead && !this.isScored) {
      const isSix = this.bounceCount === 0;
      soundManager.playBoundaryFanfare(isSix);
      this.finishDelivery({
        outcome: isSix ? 'SIX' : 'FOUR',
        reason: isSix ? 'Maximum! Sensational SIX! 🚀' : 'Races to the fence for FOUR! ⚡',
        runs: isSix ? 6 : 4
      }, characters, onResult);
      return;
    }

    // 7. Fielder Interception & Catches
    if (this.hasHitBat && characters && characters.fielders && !this.fielderHolding && !this.isScored) {
      this.updateFieldingAI(delta, characters, onResult);
    }

    // 8. Ball passed keeper without contact (Dot Ball)
    if (!this.hasHitBat && this.position.z > 14.2 && !this.isDead && !this.isScored) {
      if (this.hasHitPad) {
        this.finishDelivery({ outcome: 'RUNS', reason: 'Leg-Bye appeal turned down', runs: 0 }, characters, onResult);
      } else {
        this.finishDelivery({ outcome: 'DOT', reason: 'Beaten outside off / Dot ball', runs: 0 }, characters, onResult);
      }
    } else if (this.hasHitBat && this.velocity.length() < 0.22 && this.position.y <= groundY + 0.05 && !this.isDead && !this.isScored && !this.isThrowing) {
      // Ball rolled to a stop
      this.finishDelivery({ outcome: 'RUNS', reason: 'Dead ball on pitch', runs: 0 }, characters, onResult);
    }
  }

  // Fielder AI logic: intercept, catch, or retrieve ball
  updateFieldingAI(delta, characters, onResult) {
    let closestFielder = null;
    let minDist = Infinity;

    characters.fielders.forEach(f => {
      const d = f.group.position.distanceTo(this.position);
      if (d < minDist) {
        minDist = d;
        closestFielder = f;
      }
    });

    if (closestFielder) {
      const fielderPos = closestFielder.group.position;
      const targetPos = new THREE.Vector3(this.position.x, 0, this.position.z);
      const dir = targetPos.clone().sub(fielderPos);
      const dist = dir.length();

      if (dist > 1.25) {
        dir.normalize();
        const sprintSpeed = 7.6;
        fielderPos.addScaledVector(dir, sprintSpeed * delta);
        closestFielder.group.lookAt(targetPos);
      } else {
        // Fielder reached ball!
        this.fielderHolding = closestFielder;
        this.isThrowing = true;

        // Determine if caught on the full before touching ground
        const isCatch = this.bounceCount === 0 && this.hasHitBat && this.position.y > 0.4;
        if (isCatch) {
          soundManager.playCheer(1.0, 3.0);
          this.finishDelivery({
            outcome: 'WICKET',
            reason: `Caught by ${closestFielder.name}! 🧤`,
            runs: 0
          }, characters, onResult);
        } else {
          // Normal fielding: 1 or 2 runs depending on distance from center
          const distFromWickets = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);
          const runsTaken = distFromWickets > 38 ? 2 : 1;
          this.finishDelivery({
            outcome: 'RUNS',
            reason: `Fielded cleanly by ${closestFielder.name}`,
            runs: runsTaken
          }, characters, onResult);
        }
      }
    }
  }

  // Strictly finish delivery and invoke score callback exactly once
  finishDelivery(result, characters, onResult) {
    if (this.isScored) return;
    this.isScored = true;
    this.inPlay = false;
    this.isDead = true;

    result.deliveryId = this.currentDeliveryId;

    if (onResult) {
      onResult(result);
    }
  }
}
