import * as THREE from 'three';

export const CAMERA_MODES = {
  BROADCAST_BATTING: 0,
  BOWLER_RUNUP: 1,
  BALL_FOLLOW: 2,
  TV_BROADCAST: 3,
  AERIAL_TACTICAL: 4
};

export const CAMERA_NAMES = [
  'Broadcast Batting Cam',
  'Bowler Action Cam',
  'Ball Follow Cam',
  'TV Broadcast Cam',
  'Tactical Aerial Cam'
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

    // Initialize camera position
    const initPreset = this.presets[this.currentMode];
    this.camera.position.copy(initPreset.pos);
    this.currentLookAt.copy(initPreset.lookAt);
    this.camera.lookAt(this.currentLookAt);
  }

  setMode(mode) {
    if (this.presets[mode] !== undefined) {
      this.currentMode = mode;
    }
  }

  nextMode() {
    const totalModes = Object.keys(CAMERA_MODES).length;
    this.currentMode = (this.currentMode + 1) % totalModes;
    return this.currentMode;
  }

  getModeName() {
    return CAMERA_NAMES[this.currentMode];
  }

  // Smoothly resets camera when a new ball / delivery starts
  resetToDeliveryStart() {
    // If was in dynamic ball follow cam, return to batting broadcast
    if (this.currentMode === CAMERA_MODES.BALL_FOLLOW) {
      this.currentMode = this.defaultMode;
    }
  }

  update(delta, ball, characters) {
    const desiredPos = this.targetPos;
    const desiredLookAt = this.targetLookAt;

    switch (this.currentMode) {
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

    // Smooth dampening interpolation
    const lerpSpeed = Math.min(delta * 5.2, 1.0);
    this.camera.position.lerp(desiredPos, lerpSpeed);
    this.currentLookAt.lerp(desiredLookAt, lerpSpeed);
    this.camera.lookAt(this.currentLookAt);
  }
}
