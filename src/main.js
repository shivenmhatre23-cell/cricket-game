import * as THREE from 'three';
import { createStadium } from './scene/stadium.js';
import { CharacterManager } from './scene/characters.js';
import { BallPhysics } from './physics/ballPhysics.js';
import { CameraManager, CAMERA_MODES } from './scene/cameras.js';
import { GameState, GAME_STATES, BATTING_SHOTS } from './gameState.js';
import { FieldingAI } from './ai/fieldingAI.js';
import { HUD } from './ui/hud.js';
import { MenuManager } from './ui/menus.js';
import { soundManager } from './audio/soundManager.js';

class CricketGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.clock = new THREE.Clock();

    // 1. Scene & Renderer Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x82b1ff);
    this.scene.fog = new THREE.FogExp2(0x82b1ff, 0.0032);

    this.camera = new THREE.PerspectiveCamera(
      52,
      window.innerWidth / window.innerHeight,
      0.1,
      600
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    // 2. Lighting Setup
    this.setupLighting();

    // 3. Game Systems & AI Opponent
    this.gameState = new GameState();
    this.stadium = createStadium(this.scene);
    this.characters = new CharacterManager(this.scene);
    this.ballPhysics = new BallPhysics(this.scene);
    this.cameraManager = new CameraManager(this.camera, this.canvas);
    this.fieldingAI = new FieldingAI();

    // 4. UI Systems
    this.hud = new HUD(this.gameState, (action, data) => this.handleUIAction(action, data));
    this.menuManager = new MenuManager(
      this.gameState,
      () => this.startNewMatch(),
      () => this.restartMatch()
    );

    // Wire Menu callbacks for Settings and Practice Nets
    this.menuManager.onSettingsChange = (settings) => this.applySettings(settings);
    this.menuManager.onStartPractice = () => this.startPracticeMode();

    // Practice Mode Session Tracker
    this.isPracticeMode = false;
    this.practiceStats = {
      ballsFaced: 0,
      runsScored: 0,
      sweetHits: 0,
      misses: 0
    };

    // Delivery & Animation tracking
    this.runupProgress = 0;
    this.swingProgress = 0;
    this.isSwinging = false;
    this.hasAttemptedShot = false;
    this.hasDeliveredBall = false;
    this.lastTimingQuality = null;
    this.currentShotData = this.gameState.getSelectedShot();

    // Setup input listeners & window resize
    this.setupKeyboardControls();
    window.addEventListener('resize', () => this.onWindowResize());

    // Initialize character kit colors for current teams
    this.updateTeamColors();

    // Show initial main menu
    this.menuManager.showMainMenu();

    // Start main game loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLighting() {
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x334433, 0.75);
    this.hemiLight.position.set(0, 100, 0);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.45);
    this.sunLight.position.set(50, 75, 40);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 170;
    this.sunLight.shadow.camera.left = -45;
    this.sunLight.shadow.camera.right = 45;
    this.sunLight.shadow.camera.top = 45;
    this.sunLight.shadow.camera.bottom = -45;
    this.sunLight.shadow.bias = -0.0006;
    this.scene.add(this.sunLight);
  }

  updateTeamColors() {
    const battingColor = this.gameState.battingTeam?.color || '#1565c0';
    const bowlingColor = this.gameState.bowlingTeam?.color || '#2e7d32';
    this.characters.setTeamColors(battingColor, bowlingColor);
    if (typeof this.characters.updateActivePlayers === 'function') {
      this.characters.updateActivePlayers(this.gameState);
    }
  }

  startNewMatch() {
    soundManager.init();
    this.isPracticeMode = false;
    this.hud.setPracticeMode(false);
    this.updateTeamColors();
    this.resetDeliveryState();
    this.hud.updateScoreboard();

    // Cinematic Stadium Intro: Show Narendra Modi Stadium fly-around with spectators before match starts
    this.playStadiumIntro();
  }

  playStadiumIntro() {
    this.showStadiumIntroBanner();
    soundManager.playCheer(0.85, 7.5);
    this.hud.updateCameraLabel('Stadium Broadcast Intro');
    this.hud.setActionCallout('🏟️ NARENDRA MODI STADIUM — PRESS <kbd>SPACE</kbd> OR CLICK TO SKIP INTRO');

    this.cameraManager.startIntro(7.5, () => {
      this.onStadiumIntroComplete();
    });
  }

  showStadiumIntroBanner() {
    let banner = document.getElementById('stadium-intro-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'stadium-intro-banner';
      banner.className = 'stadium-intro-banner';
      banner.innerHTML = `
        <div class="intro-badge">VENUE SPOTLIGHT</div>
        <div class="intro-venue-name">NARENDRA MODI STADIUM</div>
        <div class="intro-venue-details">AHMEDABAD, GUJARAT • CAPACITY: 132,000 • LARGEST CRICKET STADIUM IN THE WORLD</div>
        <div class="intro-pitch-info"><span>PITCH:</span> Hard Bouncy Red/Black Soil Clay &nbsp;|&nbsp; <span>ATMOSPHERE:</span> Roaring Full House</div>
        <div class="intro-skip-hint">PRESS <kbd>SPACE</kbd> OR CLICK TO SKIP INTRO</div>
      `;
      banner.addEventListener('click', () => {
        this.cameraManager.skipIntro();
      });
      const hudContainer = document.getElementById('hud-container');
      if (hudContainer) hudContainer.appendChild(banner);
    } else {
      banner.classList.remove('fade-out');
      banner.style.display = 'block';
    }
  }

  hideStadiumIntroBanner() {
    const banner = document.getElementById('stadium-intro-banner');
    if (banner) {
      banner.classList.add('fade-out');
      setTimeout(() => {
        if (banner && banner.parentNode) {
          banner.parentNode.removeChild(banner);
        }
      }, 500);
    }
  }

  onStadiumIntroComplete() {
    this.hideStadiumIntroBanner();
    this.hud.updateCameraLabel(this.cameraManager.getModeName());
    this.gameState.setState(GAME_STATES.READY);
    const callout = this.gameState.isUserBatting()
      ? 'PRESS <kbd>SPACE</kbd> TO DELIVER / PLAY SHOT'
      : 'USER BOWLING — PRESS <kbd>SPACE</kbd> TO BOWL DELIVERY';
    this.hud.setActionCallout(callout);
  }

  startPracticeMode() {
    soundManager.init();
    this.hideStadiumIntroBanner();
    this.cameraManager.skipIntro();
    this.isPracticeMode = true;
    this.practiceStats = {
      ballsFaced: 0,
      runsScored: 0,
      sweetHits: 0,
      misses: 0
    };
    this.hud.setPracticeMode(true);
    this.hud.updatePracticeStats(this.practiceStats);
    this.updateTeamColors();
    this.resetDeliveryState();
    this.hud.updateCameraLabel(this.cameraManager.getModeName());
    this.gameState.setState(GAME_STATES.READY);
    this.hud.setActionCallout('PRACTICE NETS READY — PRESS <kbd>SPACE</kbd> TO BOWL OR <kbd>R</kbd> TO RE-BOWL');
  }

  rebowlDelivery() {
    const s = this.gameState.currentState;
    if (s === GAME_STATES.PAUSED ||
        s === GAME_STATES.MATCH_OVER ||
        s === GAME_STATES.INNINGS_BREAK ||
        s === GAME_STATES.MENU ||
        s === GAME_STATES.TOSS) {
      return;
    }
    this.hideStadiumIntroBanner();
    this.cameraManager.skipIntro();
    this.resetDeliveryState();
    this.gameState.setState(GAME_STATES.READY);
    const msg = this.isPracticeMode
      ? 'PRESS <kbd>SPACE</kbd> TO BOWL OR <kbd>R</kbd> TO RE-BOWL'
      : (this.gameState.isUserBatting()
          ? 'PRESS <kbd>SPACE</kbd> TO DELIVER / PLAY SHOT'
          : 'USER BOWLING — PRESS <kbd>SPACE</kbd> TO BOWL DELIVERY');
    this.hud.setActionCallout(msg);
  }

  restartMatch() {
    this.hideStadiumIntroBanner();
    this.cameraManager.skipIntro();
    this.gameState.resetInnings();
    this.updateTeamColors();
    this.resetDeliveryState();
    this.hud.updateScoreboard();
    this.gameState.setState(GAME_STATES.READY);
    const callout = this.gameState.isUserBatting()
      ? 'PRESS <kbd>SPACE</kbd> TO DELIVER / PLAY SHOT'
      : 'USER BOWLING — PRESS <kbd>SPACE</kbd> TO BOWL DELIVERY';
    this.hud.setActionCallout(callout);
  }

  resetDeliveryState() {
    this.runupProgress = 0;
    this.swingProgress = 0;
    this.isSwinging = false;
    this.hasAttemptedShot = false;
    this.hasDeliveredBall = false;
    this.lastTimingQuality = null;
    this.characters.resetRunningBetweenWickets?.();
    this.characters.resetAllPlayerStances?.();
    this.characters.strikerStumps.reset();
    this.characters.nonStrikerStumps?.reset();

    // Synchronize 3D player models with active striker, non-striker, bowler, and fielders
    if (typeof this.characters.updateActivePlayers === 'function') {
      this.characters.updateActivePlayers(this.gameState);
    }

    // Reset Fielding AI & fielders to base positions and ready stances
    this.fieldingAI.resetDeliveryState(this.characters);

    // Generate new tactical delivery data with BowlingAI
    const deliveryData = this.gameState.generateDelivery();
    const profileId = deliveryData.profileId || 'FAST_BOWLER';
    this.ballPhysics.setupDelivery(deliveryData);

    // Reset Bowler to start of run-up for profile
    const startZ = this.characters.getBowlerStartZ(profileId);
    this.characters.bowler.group.position.set(0.8, 0, startZ);
    this.characters.bowler.group.rotation.y = 0;
    this.characters.setBowlerReadyStance();

    // Reset ball into bowler's bowling hand
    const handPos = this.characters.getBowlerHandPosition();
    this.ballPhysics.resetToBowlerHand(handPos);

    // Reset Fielders to current preset positions
    this.fieldingAI.setPreset(this.fieldingAI.currentPreset, this.characters.fielders);

    this.hud.updateDeliveryHUD(deliveryData);

    // Smooth camera reset
    this.cameraManager.resetToDeliveryStart();
    this.hud.updateCameraLabel(this.cameraManager.getModeName());
    this.hud.updateTimingMeter(0.5);
  }

  // Unified shot selection path for keyboard hotkeys and HUD button clicks
  selectBattingShot(shotKey) {
    const s = this.gameState.currentState;
    if (s === GAME_STATES.PAUSED ||
        s === GAME_STATES.MATCH_OVER ||
        s === GAME_STATES.INNINGS_BREAK ||
        s === GAME_STATES.MENU ||
        s === GAME_STATES.TOSS) {
      return;
    }
    if (BATTING_SHOTS[shotKey]) {
      this.hud.selectShot(shotKey);
      soundManager.playClick();
    }
  }

  handleUIAction(action, data) {
    if (action === 'CYCLE_CAMERA') {
      this.cameraManager.nextMode();
      this.hud.updateCameraLabel(this.cameraManager.getModeName());
      soundManager.playClick();
    } else if (action === 'TOGGLE_PAUSE') {
      const s = this.gameState.currentState;
      if (s === GAME_STATES.MATCH_OVER ||
          s === GAME_STATES.MENU ||
          s === GAME_STATES.TOSS) {
        return;
      }
      if (s === GAME_STATES.PAUSED) {
        this.gameState.setState(this.gameState.previousState);
        this.menuManager.hideModal();
      } else {
        this.gameState.setState(GAME_STATES.PAUSED);
        this.menuManager.showPauseMenu(() => {
          this.gameState.setState(this.gameState.previousState);
        });
      }
    } else if (action === 'UPDATE_DIFFICULTY') {
      const deliveryData = this.gameState.generateDelivery();
      this.ballPhysics.setupDelivery(deliveryData);
      this.hud.updateDeliveryHUD(deliveryData);
    } else if (action === 'SET_FIELD_PRESET') {
      this.fieldingAI.setPreset(data, this.characters.fielders);
      soundManager.playClick();
    } else if (action === 'RE_BOWL') {
      this.rebowlDelivery();
    } else if (action === 'SELECT_SHOT') {
      this.selectBattingShot(data);
    } else if (action === 'TRIGGER_ACTION') {
      this.handleSpacePress();
    }
  }

  setupKeyboardControls() {
    window.addEventListener('keydown', (e) => {
      soundManager.init();

      if (e.repeat) return; // Prevent OS key auto-repeat from triggering multiple actions

      if (e.code === 'Space') {
        e.preventDefault();
        this.handleSpacePress();
        return;
      } else if (e.code === 'KeyR') {
        this.rebowlDelivery();
        return;
      } else if (e.code === 'KeyC') {
        this.handleUIAction('CYCLE_CAMERA');
        return;
      } else if (e.code === 'Escape') {
        this.handleUIAction('TOGGLE_PAUSE');
        return;
      }

      // 6 Distinct Batting Shot Hotkeys
      const shotKeyMap = {
        'Digit1': 'DEFENSIVE',
        'KeyQ': 'DEFENSIVE',
        'Digit2': 'STRAIGHT_DRIVE',
        'KeyW': 'STRAIGHT_DRIVE',
        'Digit3': 'COVER_DRIVE',
        'KeyE': 'COVER_DRIVE',
        'Digit4': 'PULL_SHOT',
        'KeyA': 'PULL_SHOT',
        'Digit5': 'CUT_SHOT',
        'KeyD': 'CUT_SHOT',
        'Digit6': 'LOFTED_ATTACK',
        'KeyL': 'LOFTED_ATTACK'
      };

      if (shotKeyMap[e.code]) {
        this.selectBattingShot(shotKeyMap[e.code]);
      }
    });

    // Clicking canvas during cinematic intro skips straight to match
    if (this.canvas) {
      this.canvas.addEventListener('click', () => {
        soundManager.init();
        if (this.cameraManager && this.cameraManager.currentMode === CAMERA_MODES.CINEMATIC_INTRO) {
          this.cameraManager.skipIntro();
        }
      });
    }
  }

  handleSpacePress() {
    // If cinematic stadium intro is active, space skips it immediately to start match
    if (this.cameraManager && this.cameraManager.currentMode === CAMERA_MODES.CINEMATIC_INTRO) {
      this.cameraManager.skipIntro();
      return;
    }

    const s = this.gameState.currentState;

    // Respect paused and inactive states
    if (s === GAME_STATES.PAUSED ||
        s === GAME_STATES.MATCH_OVER ||
        s === GAME_STATES.INNINGS_BREAK ||
        s === GAME_STATES.MENU ||
        s === GAME_STATES.TOSS) {
      return;
    }

    if (s === GAME_STATES.READY) {
      // Start Bowler Run-up
      this.gameState.setState(GAME_STATES.BOWLER_RUNUP);
      const runupMsg = this.gameState.isUserBatting()
        ? 'BOWLER RUNNING IN — TIMING ACTIVE: PRESS <kbd>SPACE</kbd> TO STRIKE'
        : 'BOWLING RUN-UP — RELEASING DELIVERY';
      this.hud.setActionCallout(runupMsg);
    } else if (s === GAME_STATES.BOWLER_RUNUP) {
      // Repeated Space presses during run-up must not duplicate release or alter state
      return;
    } else if (s === GAME_STATES.DELIVERY) {
      // Batsman executes shot if user is batting or in practice mode
      if (this.gameState.isUserBatting() || this.isPracticeMode) {
        this.executeShot();
      }
    } else if (s === GAME_STATES.RESULT || s === GAME_STATES.OVER_CHANGE) {
      // Advance to next delivery
      this.resetDeliveryState();
      this.gameState.setState(GAME_STATES.READY);
      const nextMsg = this.gameState.isUserBatting()
        ? 'PRESS <kbd>SPACE</kbd> TO DELIVER / PLAY SHOT'
        : 'USER BOWLING — PRESS <kbd>SPACE</kbd> TO BOWL DELIVERY';
      this.hud.setActionCallout(nextMsg);
      this.hud.updateScoreboard();
    }
  }

  // AI-controlled batsman shot execution when user is bowling
  executeAIBattingShot() {
    if (this.isSwinging || this.hasAttemptedShot || !this.ballPhysics.inPlay) return;

    // AI selects context-appropriate shot based on delivery length and line
    const delivery = this.ballPhysics.currentDelivery || {};
    const length = delivery.length || 'GOOD';
    const lineX = this.ballPhysics.position.x;

    let chosenShotKey = 'STRAIGHT_DRIVE';
    if (length === 'SHORT' || length === 'BOUNCER') {
      chosenShotKey = 'PULL_SHOT';
    } else if (lineX < -0.2) {
      chosenShotKey = 'COVER_DRIVE';
    } else if (lineX > 0.25) {
      chosenShotKey = 'CUT_SHOT';
    } else if (length === 'YORKER') {
      chosenShotKey = 'DEFENSIVE';
    } else if (Math.random() < 0.25) {
      chosenShotKey = 'LOFTED_ATTACK';
    }

    this.gameState.setSelectedShot(chosenShotKey);
    this.executeShot();
  }

  // Precise timing window & bat collision evaluation (at most once per delivery)
  executeShot() {
    if (this.isSwinging || this.hasAttemptedShot || !this.ballPhysics.inPlay) return;

    this.hasAttemptedShot = true;
    this.isSwinging = true;
    this.swingProgress = 0;
    this.currentShotData = this.gameState.getSelectedShot();

    // Calculate timing relative to ideal strike plane (Z = 8.95m)
    const idealContactZ = 8.95;
    const ballPos = this.ballPhysics.position;
    const ballVz = Math.max(26.0, Math.abs(this.ballPhysics.velocity.z));

    const timeDelta = (ballPos.z - idealContactZ) / ballVz;

    let timingQuality = 'GOOD';
    let feedback = 'GOOD TIMING! 🟢';

    if (Math.abs(timeDelta) <= 0.045) {
      timingQuality = 'PERFECT';
      feedback = 'PERFECT TIMING! 🚀 (Pure Sweet Spot)';
    } else if (Math.abs(timeDelta) <= 0.110) {
      timingQuality = 'GOOD';
      feedback = 'GOOD TIMING! 🟢 (Solid Placement)';
    } else if (timeDelta < -0.110 && timeDelta >= -0.220) {
      timingQuality = 'EARLY';
      feedback = 'EARLY SHOT! ⚠️ (Leading Edge Risk)';
    } else if (timeDelta > 0.110 && timeDelta <= 0.220) {
      timingQuality = 'LATE';
      feedback = 'LATE CUT! ⚠️ (Outside Edge Risk)';
    } else {
      timingQuality = 'MISSED';
      feedback = 'MISSED! ❌ (Beaten by Pace)';
    }

    this.lastTimingQuality = timingQuality;
    this.hud.showFeedback(feedback, timingQuality);

    // Apply audio and collision based on result
    if (timingQuality === 'MISSED') {
      soundManager.playWhoosh();
    } else {
      this.ballPhysics.applyBatHit({
        shotData: this.currentShotData,
        timingQuality
      });

      // Subtle camera micro-trauma on crisp impact
      if (timingQuality === 'PERFECT') {
        this.cameraManager.applyImpactShake(0.065, 0.12);
      } else if (timingQuality === 'GOOD' || this.currentShotData.id === 'LOFTED_ATTACK') {
        this.cameraManager.applyImpactShake(0.035, 0.09);
      }

      // Alert Fielding AI of struck shot
      this.fieldingAI.onShotStruck(
        this.ballPhysics.position,
        this.ballPhysics.velocity,
        this.gameState.difficulty
      );

      // Start running between wickets for scoring strokes
      if (this.currentShotData?.id !== 'DEFENSIVE') {
        this.characters.startRunningBetweenWickets?.(1);
      }

      // Switch to dynamic ball follow cam for powerful or lofted shots
      if (timingQuality === 'PERFECT' || this.currentShotData.id === 'LOFTED_ATTACK') {
        if (this.cameraManager.currentMode === CAMERA_MODES.BROADCAST_BATTING || this.cameraManager.currentMode === CAMERA_MODES.BOWLER_RUNUP) {
          this.cameraManager.setMode(CAMERA_MODES.BALL_FOLLOW);
          this.hud.updateCameraLabel(this.cameraManager.getModeName());
        }
      }
    }
  }

  // Handle Fielding AI events (catches, drops, pickups)
  handleFielderEvent(event) {
    if (event.action === 'CATCH_TAKEN') {
      soundManager.playCheer(1.0, 3.0);
      this.characters.stopRunningBetweenWickets?.(true);
      this.ballPhysics.finishDelivery({
        outcome: 'WICKET',
        dismissalType: 'Caught',
        reason: `Caught by ${event.fielderName}! 🧤`,
        runs: 0
      }, this.characters, (res) => this.onDeliveryResult(res));
    } else if (event.action === 'CATCH_DROPPED') {
      this.hud.showFeedback(`DROPPED CATCH! 😱 Fumbled by ${event.fielderName}`, 'EARLY');
      this.characters.startRunningBetweenWickets?.(1);
    } else if (event.action === 'GROUND_PICKUP') {
      this.characters.startRunningBetweenWickets?.(event.runs);
      this.ballPhysics.finishDelivery({
        outcome: 'RUNS',
        reason: `Fielded cleanly by ${event.fielderName}`,
        runs: event.runs
      }, this.characters, (res) => this.onDeliveryResult(res));
    } else if (event.action === 'THROW_COMPLETED') {
      soundManager.playPitchBounce(0.5);
    }
  }

  onDeliveryResult(result) {
    if (result.outcome === 'WICKET' || result.outcome === 'SIX' || result.outcome === 'FOUR' || result.outcome === 'DOT') {
      this.characters.stopRunningBetweenWickets?.(true);
    }

    if (this.lastTimingQuality && !result.timingQuality) {
      result.timingQuality = this.lastTimingQuality;
    }

    if (this.isPracticeMode) {
      this.practiceStats.ballsFaced++;
      const runs = result.runs || 0;
      this.practiceStats.runsScored += runs;
      if (result.outcome === 'WICKET' || result.timingQuality === 'MISSED') {
        this.practiceStats.misses++;
      } else if (runs > 0 || result.timingQuality === 'PERFECT' || result.timingQuality === 'GOOD') {
        this.practiceStats.sweetHits++;
      }
      this.hud.updatePracticeStats(this.practiceStats);

      let resultMsg = `${result.reason} (+${runs} runs)`;
      if (result.outcome === 'WICKET') resultMsg = `💥 OUT! ${result.reason}`;
      else if (result.outcome === 'SIX') resultMsg = `🚀 MAXIMUM! SIX RUNS!`;
      else if (result.outcome === 'FOUR') resultMsg = `⚡ BOUNDARY! FOUR RUNS!`;

      this.hud.showFeedback(resultMsg, result.outcome);
      this.hud.setActionCallout('PRESS <kbd>SPACE</kbd> OR <kbd>R</kbd> FOR NEXT PRACTICE BALL');
      return;
    }

    const outcome = this.gameState.recordDelivery(result, this.currentShotData?.id);
    this.hud.updateScoreboard();

    let resultMsg = `${result.reason} (+${result.runs} runs)`;
    if (result.outcome === 'WICKET') resultMsg = `💥 OUT! ${result.reason}`;
    else if (result.outcome === 'SIX') resultMsg = `🚀 MAXIMUM! SIX RUNS!`;
    else if (result.outcome === 'FOUR') resultMsg = `⚡ BOUNDARY! FOUR RUNS!`;

    this.hud.showFeedback(resultMsg, result.outcome);
    this.hud.setActionCallout('PRESS <kbd>SPACE</kbd> OR <kbd>ENTER</kbd> FOR NEXT BALL');

    // Handle innings break or match finish
    if (outcome.matchFinished || outcome.matchOver) {
      setTimeout(() => {
        this.menuManager.showMatchSummary(outcome);
      }, 1500);
    } else if (outcome.inningsBreak) {
      setTimeout(() => {
        this.menuManager.showInningsBreak(outcome.target, () => {
          this.updateTeamColors();
          this.resetDeliveryState();
          this.gameState.setState(GAME_STATES.READY);
          this.hud.updateScoreboard();
          const nextCallout = this.gameState.isUserBatting()
            ? 'INNINGS 2: CHASE BEGINS — PRESS <kbd>SPACE</kbd> TO DELIVER / PLAY SHOT'
            : 'INNINGS 2: DEFEND TARGET — PRESS <kbd>SPACE</kbd> TO BOWL DELIVERY';
          this.hud.setActionCallout(nextCallout);
        });
      }, 1500);
    }
  }

  applySettings(settings) {
    if (!settings) return;

    if (typeof settings.masterVolume === 'number') {
      soundManager.setMasterVolume(settings.masterVolume);
    }
    if (typeof settings.sfxVolume === 'number') {
      soundManager.setSfxVolume(settings.sfxVolume);
    }

    if (settings.characterModel && this.characters && typeof this.characters.setModelMode === 'function') {
      this.characters.setModelMode(settings.characterModel);
    }

    if (settings.isNightMode) {
      this.scene.background.setHex(0x060c18);
      this.scene.fog = new THREE.FogExp2(0x081020, 0.0045);
      if (this.sunLight) {
        this.sunLight.intensity = 0.22;
        this.sunLight.color.setHex(0x90a4ae);
      }
      if (this.hemiLight) {
        this.hemiLight.intensity = 0.25;
        this.hemiLight.color.setHex(0x1a237e);
        this.hemiLight.groundColor.setHex(0x0a1420);
      }
      if (this.stadium?.userData?.spotLights) {
        this.stadium.userData.spotLights.forEach(sl => { sl.intensity = 4500; });
      }
    } else {
      this.scene.background.setHex(0x82b1ff);
      this.scene.fog = new THREE.FogExp2(0x82b1ff, 0.0032);
      if (this.sunLight) {
        this.sunLight.intensity = 1.45;
        this.sunLight.color.setHex(0xfffaed);
      }
      if (this.hemiLight) {
        this.hemiLight.intensity = 0.75;
        this.hemiLight.color.setHex(0xffffff);
        this.hemiLight.groundColor.setHex(0x334433);
      }
      if (this.stadium?.userData?.spotLights) {
        this.stadium.userData.spotLights.forEach(sl => { sl.intensity = 500; });
      }
    }

    if (settings.graphicsQuality === 'LOW') {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
    } else if (settings.graphicsQuality === 'MEDIUM') {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = true;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.08);

    if (this.gameState.currentState !== GAME_STATES.PAUSED) {
      const profileId = this.gameState.currentDeliveryData?.profileId || 'FAST_BOWLER';

      // 1. Bowler Run-up, Delivery Stride & Follow-through
      if (this.gameState.currentState === GAME_STATES.BOWLER_RUNUP ||
          (this.gameState.currentState === GAME_STATES.DELIVERY && this.runupProgress < 1.0)) {
        const runupSpeed = this.characters.getBowlerRunupSpeed(profileId);
        this.runupProgress += delta * runupSpeed;

        this.characters.playBowlerAction(this.runupProgress, profileId);

        // Before ball release apex (progress < 0.88), ball stays glued to bowler's bowling hand
        if (!this.hasDeliveredBall) {
          const handPos = this.characters.getBowlerHandPosition();
          this.ballPhysics.attachToHand(handPos);

          // Authoritative release event at delivery stride apex (0.88)
          if (this.runupProgress >= 0.88) {
            this.hasDeliveredBall = true;
            this.gameState.setState(GAME_STATES.DELIVERY);
            const releasePos = this.characters.getBowlerReleasePosition();
            this.ballPhysics.deliverBall(releasePos);
          }
        }

        if (this.runupProgress >= 1.0) {
          this.runupProgress = 1.0;
          this.characters.setBowlerReadyStance();
        }
      }

      // 2. Bat swing animation for chosen shot
      if (this.isSwinging) {
        this.swingProgress += delta * 3.6;
        if (this.swingProgress >= 1.0) {
          this.swingProgress = 1.0;
          this.isSwinging = false;
          this.characters.resetBatter();
        } else {
          this.characters.playBatSwing(
            this.swingProgress,
            this.currentShotData?.id || 'STRAIGHT_DRIVE',
            this.currentShotData?.shotAngle || Math.PI,
            this.lastTimingQuality
          );
        }
      }

      // 3. Timing needle animation during delivery approach & AI batsman swing
      if (this.gameState.currentState === GAME_STATES.DELIVERY && this.ballPhysics.inPlay) {
        const progress = (this.ballPhysics.position.z + 10.0) / 19.15;
        this.hud.updateTimingMeter(progress);

        // Computer batsman autonomously swings when user is bowling
        if (!this.gameState.isUserBatting() && !this.isPracticeMode && !this.isSwinging) {
          const ballZ = this.ballPhysics.position.z;
          // Strike plane is at Z = 8.95m; AI swings within realistic contact window
          if (ballZ >= 8.5 && ballZ <= 9.2) {
            this.executeAIBattingShot();
          }
        }
      }

      // 4. Ball physics, collisions & boundary checks
      this.ballPhysics.update(delta, this.characters, (res) => this.onDeliveryResult(res));

      // 5. Fielding AI updates (reaction delay, chase, catch attempts, pickups)
      this.fieldingAI.update(
        delta,
        this.ballPhysics,
        this.characters,
        this.gameState.difficulty,
        (evt) => this.handleFielderEvent(evt)
      );

      // 6. Stumps and bails physics & wicketkeeper tracking
      this.characters.update(delta, this.ballPhysics.position);

      // 7. Camera smooth interpolation
      this.cameraManager.update(delta, this.ballPhysics, this.characters);

      // 8. Radar Minimap 2D update
      this.hud.drawRadar(this.ballPhysics, this.characters);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate and launch game
window.addEventListener('DOMContentLoaded', () => {
  window.__cricketGame = new CricketGame();
});
