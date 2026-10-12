import * as THREE from 'three';

export const CAMERA_MODES = {
  BROADCAST_BATTING: 0,
  BOWLER_RUNUP: 1,
  BALL_FOLLOW: 2,
  TV_BROADCAST: 3,
  AERIAL_TACTICAL: 4,
  CINEMATIC_INTRO: 5
};

export const CAMERA_NAMES = [
  'Broadcast Batting Cam',
  'Bowler Action Cam',
  'Ball Follow Cam',
  'TV Broadcast Cam',
  'Tactical Aerial Cam',
  'Stadium Broadcast Intro Cam'
];

export class CameraManager {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.currentMode = CAMERA_MODES.BROADCAST_BATTING; // Default to broadcast batting view
    this.defaultMode = CAMERA_MODES.BROADCAST_BATTING;

    // Pre-allocated vectors to avoid garbage collection allocations during frames
    this.targetPos = new THREE.Vector3();
    this.targetLookAt = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();

    // Default static presets
    this.presets = {
      [CAMERA_MODES.BROADCAST_BATTING]: {
        pos: new THREE.Vector3(0.18, 2.3, 13.0),
        lookAt: new THREE.Vector3(0, 1.15, -6.0)
      },
      [CAMERA_MODES.BOWLER_RUNUP]: {
        pos: new THREE.Vector3(0.8, 3.4, -26.5),
        lookAt: new THREE.Vector3(0, 1.15, 9.15)
      },
      [CAMERA_MODES.BALL_FOLLOW]: {
        pos: new THREE.Vector3(0, 4.5, 14.0),
        lookAt: new THREE.Vector3(0, 0.5, 0)
      },
      [CAMERA_MODES.TV_BROADCAST]: {
        pos: new THREE.Vector3(-38, 16.5, 2.5),
        lookAt: new THREE.Vector3(0, 1.0, 1.5)
      },
      [CAMERA_MODES.AERIAL_TACTICAL]: {
        pos: new THREE.Vector3(0, 68, 0.1),
        lookAt: new THREE.Vector3(0, 0, 0)
      }
    };

    // Pre-match Stadium Drone Fly-around state
    this.introProgress = 0;
    this.introDuration = 7.5;
    this.onIntroComplete = null;

    // Bat impact micro-trauma state
    this.shakeIntensity = 0;
    this.shakeTimer = 0;
    this.maxShakeDuration = 0.12;

    // Initialize camera position
    const initPreset = this.presets[this.currentMode];
    this.camera.position.copy(initPreset.pos);
    this.currentLookAt.copy(initPreset.lookAt);
    this.camera.lookAt(this.currentLookAt);
  }

  setMode(mode) {
    if (this.presets[mode] !== undefined || mode === CAMERA_MODES.CINEMATIC_INTRO) {
      this.currentMode = mode;
    }
  }

  nextMode() {
    // Only cycle gameplay modes 0-4
    const gameplayModesCount = 5;
    this.currentMode = (this.currentMode + 1) % gameplayModesCount;
    return this.currentMode;
  }

  getModeName() {
    return CAMERA_NAMES[this.currentMode] || 'Broadcast Batting Cam';
  }

  // Pre-match Cinematic Drone Fly-around showing the whole Narendra Modi Stadium & spectators
  startIntro(duration = 7.5, onComplete = null) {
    this.currentMode = CAMERA_MODES.CINEMATIC_INTRO;
    this.introProgress = 0;
    this.introDuration = Math.max(1.0, duration);
    this.onIntroComplete = onComplete;
  }

  skipIntro() {
    if (this.currentMode === CAMERA_MODES.CINEMATIC_INTRO) {
      this.currentMode = this.defaultMode;
      this.camera.position.copy(this.presets[this.defaultMode].pos);
      this.currentLookAt.copy(this.presets[this.defaultMode].lookAt);
      this.camera.lookAt(this.currentLookAt);

      if (typeof this.onIntroComplete === 'function') {
        const cb = this.onIntroComplete;
        this.onIntroComplete = null;
        cb();
      }
    }
  }

  // Apply subtle micro-shake impulse upon bat impact
  applyImpactShake(intensity = 0.05, duration = 0.10) {
    this.shakeIntensity = Math.min(0.12, intensity);
    this.shakeTimer = Math.min(0.20, duration);
    this.maxShakeDuration = Math.max(0.01, duration);
  }

  // Smoothly resets camera when a new ball / delivery starts
  resetToDeliveryStart() {
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    // If was in dynamic ball follow cam, return to batting broadcast
    if (this.currentMode === CAMERA_MODES.BALL_FOLLOW) {
      this.currentMode = this.defaultMode;
    }
  }

  update(delta, ball, characters) {
    const desiredPos = this.targetPos;
    const desiredLookAt = this.targetLookAt;

    switch (this.currentMode) {
      case CAMERA_MODES.CINEMATIC_INTRO: {
        this.introProgress += delta / this.introDuration;
        if (this.introProgress >= 1.0) {
          this.skipIntro();
          return;
        }

        const p = Math.min(1.0, this.introProgress);

        if (p < 0.40) {
          // Act 1 (0 to 0.40): High sweeping drone orbit around Narendra Modi Stadium exterior & roof canopy
          const t = p / 0.40;
          const easeT = 0.5 - 0.5 * Math.cos(t * Math.PI); // Smooth S-curve
          const angle = -1.35 + easeT * 1.6; // ~90 degree panoramic arc
          const radius = THREE.MathUtils.lerp(120, 95, easeT);
          const height = THREE.MathUtils.lerp(58, 38, easeT);

          desiredPos.set(Math.sin(angle) * radius, height, Math.cos(angle) * radius);
          desiredLookAt.set(0, 6.0, 0); // Focus on pitch and stadium center
        } else if (p < 0.75) {
          // Act 2 (0.40 to 0.75): Swooping low across the cheering grandstand crowd & giant video boards
          const t = (p - 0.40) / 0.35;
          const easeT = 0.5 - 0.5 * Math.cos(t * Math.PI);

          const startPos = new THREE.Vector3(Math.sin(0.25) * 95, 38, Math.cos(0.25) * 95);
          const endPos = new THREE.Vector3(-12, 6.8, -32);
          desiredPos.lerpVectors(startPos, endPos, easeT);

          const startLook = new THREE.Vector3(0, 6.0, 0);
          const endLook = new THREE.Vector3(0, 1.2, 5.0);
          desiredLookAt.lerpVectors(startLook, endLook, easeT);
        } else {
          // Act 3 (0.75 to 1.0): Glide along pitch corridor from bowler's end directly into batting broadcast cam
          const t = (p - 0.75) / 0.25;
          const easeT = t * t * (3 - 2 * t); // Smoothstep

          const startPos = new THREE.Vector3(-12, 6.8, -32);
          const endPos = this.presets[CAMERA_MODES.BROADCAST_BATTING].pos;
          desiredPos.lerpVectors(startPos, endPos, easeT);

          const startLook = new THREE.Vector3(0, 1.2, 5.0);
          const endLook = this.presets[CAMERA_MODES.BROADCAST_BATTING].lookAt;
          desiredLookAt.lerpVectors(startLook, endLook, easeT);
        }
        break;
      }

      case CAMERA_MODES.BROADCAST_BATTING:
        desiredPos.copy(this.presets[CAMERA_MODES.BROADCAST_BATTING].pos);
        // Track incoming ball smoothly if within pitch corridor
        if (ball && ball.inPlay && ball.mesh.position.z < 8.5) {
          desiredLookAt.set(ball.mesh.position.x * 0.35, 1.1, ball.mesh.position.z);
        } else {
          desiredLookAt.copy(this.presets[CAMERA_MODES.BROADCAST_BATTING].lookAt);
        }
        break;

      case CAMERA_MODES.BOWLER_RUNUP:
        // Dynamically follows bowler during run-up towards the crease
        if (characters && characters.bowler) {
          const bowlerZ = characters.bowler.group.position.z;
          desiredPos.set(0.8, 3.4, bowlerZ - 3.5);
          desiredLookAt.set(0, 1.15, 9.15); // Look towards striker's wickets
        } else {
          desiredPos.copy(this.presets[CAMERA_MODES.BOWLER_RUNUP].pos);
          desiredLookAt.copy(this.presets[CAMERA_MODES.BOWLER_RUNUP].lookAt);
        }
        break;

      case CAMERA_MODES.TV_BROADCAST:
        desiredPos.copy(this.presets[CAMERA_MODES.TV_BROADCAST].pos);
        if (ball && ball.inPlay) {
          desiredLookAt.lerpVectors(new THREE.Vector3(0, 1.0, 0), ball.mesh.position, 0.65);
        } else {
          desiredLookAt.copy(this.presets[CAMERA_MODES.TV_BROADCAST].lookAt);
        }
        break;

      case CAMERA_MODES.BALL_FOLLOW:
        if (ball && ball.inPlay) {
          const bPos = ball.mesh.position;
          // Position camera behind and elevated above ball trajectory
          desiredPos.set(
            bPos.x * 0.75,
            Math.max(bPos.y + 4.2, 3.2),
            bPos.z + 8.2
          );
          desiredLookAt.copy(bPos);
        } else {
          desiredPos.copy(this.presets[CAMERA_MODES.BROADCAST_BATTING].pos);
          desiredLookAt.copy(this.presets[CAMERA_MODES.BROADCAST_BATTING].lookAt);
        }
        break;

      case CAMERA_MODES.AERIAL_TACTICAL:
        desiredPos.copy(this.presets[CAMERA_MODES.AERIAL_TACTICAL].pos);
        desiredLookAt.copy(this.presets[CAMERA_MODES.AERIAL_TACTICAL].lookAt);
        break;
    }

    // Anti-Clipping Guard: Ensure camera never penetrates pitch turf or ground
    desiredPos.y = Math.max(desiredPos.y, 1.35);

    // Subtle impact micro-shake impulse
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - delta);
      const traumaRatio = this.shakeTimer / this.maxShakeDuration;
      const currentShake = traumaRatio * this.shakeIntensity;
      desiredPos.x += (Math.random() - 0.5) * currentShake;
      desiredPos.y += (Math.random() - 0.5) * currentShake * 0.6;
    }

    // Smooth dampening interpolation (use higher rate for cinematic intro to track spline accurately)
    const lerpSpeed = this.currentMode === CAMERA_MODES.CINEMATIC_INTRO
      ? Math.min(delta * 8.0, 1.0)
      : Math.min(delta * 5.2, 1.0);

    this.camera.position.lerp(desiredPos, lerpSpeed);
    this.currentLookAt.lerp(desiredLookAt, lerpSpeed);
    this.camera.lookAt(this.currentLookAt);
  }
}
