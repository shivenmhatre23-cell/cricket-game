import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { CameraManager, CAMERA_MODES, CAMERA_NAMES } from '../src/scene/cameras.js';
import { createStadium } from '../src/scene/stadium.js';

describe('Narendra Modi Stadium & Cinematic Pre-Match Intro Animation Test Suite', () => {
  it('1. Narendra Modi Stadium creates authentic twin-tier stands, crowd, roof, and jumbotrons', () => {
    const scene = new THREE.Scene();
    const stadium = createStadium(scene);

    assert.ok(stadium, 'Stadium group should be created');
    assert.strictEqual(stadium.name, 'NarendraModiStadium');

    // Verify instanced crowd with expanded capacity (1,200 fans)
    const crowdMesh = stadium.children.find(c => c.isInstancedMesh);
    assert.ok(crowdMesh, 'Stadium must feature an instanced spectator crowd');
    assert.ok(crowdMesh.count >= 1000, `Spectator crowd should feature 1000+ fans, got ${crowdMesh.count}`);

    // Verify floodlight spot lights are added
    assert.ok(stadium.userData.spotLights, 'Spotlight array should be tracked');
    assert.strictEqual(stadium.userData.spotLights.length, 4, 'Should feature 4 corner tower floodlight arrays');

    // Verify children count indicates rich multi-tier geometry
    assert.ok(stadium.children.length > 50, 'Stadium must contain multi-tier geometry, roof, trusses, and boards');
  });

  it('2. CAMERA_MODES includes CINEMATIC_INTRO mode and is listed in CAMERA_NAMES', () => {
    assert.strictEqual(CAMERA_MODES.CINEMATIC_INTRO, 5);
    assert.strictEqual(CAMERA_NAMES[5], 'Stadium Broadcast Intro Cam');
  });

  it('3. CameraManager.startIntro initializes fly-around animation state cleanly', () => {
    const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 600);
    const cameraManager = new CameraManager(camera, null);

    assert.strictEqual(cameraManager.currentMode, CAMERA_MODES.BROADCAST_BATTING);

    let completed = false;
    cameraManager.startIntro(6.0, () => {
      completed = true;
    });

    assert.strictEqual(cameraManager.currentMode, CAMERA_MODES.CINEMATIC_INTRO);
    assert.strictEqual(cameraManager.introProgress, 0);
    assert.strictEqual(cameraManager.introDuration, 6.0);
    assert.strictEqual(completed, false);
  });

  it('4. CameraManager.update advances cinematic intro progress across all 3 Acts and completes cleanly', () => {
    const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 600);
    const cameraManager = new CameraManager(camera, null);

    let introCompleted = false;
    cameraManager.startIntro(4.0, () => {
      introCompleted = true;
    });

    // Act 1: High wide aerial orbit (p ~ 0.25)
    cameraManager.update(1.0, null, null);
    assert.strictEqual(cameraManager.currentMode, CAMERA_MODES.CINEMATIC_INTRO);
    assert.ok(camera.position.y > 35, `Act 1 camera height should be high aerial overview (>35m), got ${camera.position.y}`);

    // Act 2: Lower grandstand crowd swoop (p ~ 0.50)
    cameraManager.update(1.0, null, null);
    assert.strictEqual(cameraManager.currentMode, CAMERA_MODES.CINEMATIC_INTRO);
    assert.ok(camera.position.y < 35, `Act 2 camera should swoop down across grandstands (<35m), got ${camera.position.y}`);

    // Act 3 & Completion: Glide along pitch and settle into batting view
    cameraManager.update(2.1, null, null); // Reaches p >= 1.0
    assert.strictEqual(introCompleted, true, 'Intro completion callback must be triggered');
    assert.strictEqual(cameraManager.currentMode, CAMERA_MODES.BROADCAST_BATTING, 'Camera must reset to broadcast batting view');
  });

  it('5. CameraManager.skipIntro immediately skips animation, settles batting cam, and fires callback', () => {
    const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 600);
    const cameraManager = new CameraManager(camera, null);

    let skippedFired = false;
    cameraManager.startIntro(10.0, () => {
      skippedFired = true;
    });

    assert.strictEqual(cameraManager.currentMode, CAMERA_MODES.CINEMATIC_INTRO);

    // Skip immediately
    cameraManager.skipIntro();

    assert.strictEqual(cameraManager.currentMode, CAMERA_MODES.BROADCAST_BATTING);
    assert.strictEqual(skippedFired, true, 'Callback must fire upon skip');
    assert.strictEqual(camera.position.z, 13.0, 'Camera should snap directly to batting cam Z position');
    assert.strictEqual(camera.position.y, 2.3, 'Camera should snap directly to batting cam Y position');
  });
});
