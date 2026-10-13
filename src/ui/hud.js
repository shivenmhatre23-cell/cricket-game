// Real Cricket 24 Broadcast HUD, Shot Controls, Radar, and Timing Meter

import { BATTING_SHOTS } from '../gameState.js';

export class HUD {
  constructor(gameState, onAction) {
    this.gameState = gameState;
    this.onAction = onAction;

    this.container = document.getElementById('hud-container');
    this.timingValue = 0;
    this.feedbackText = '';

    this.buildHTML();
    this.attachEventListeners();
  }

  buildHTML() {
    const selectedShot = this.gameState.getSelectedShot();

    this.container.innerHTML = `
      <!-- TOP BROADCAST SCOREBOARD BAR -->
      <div class="score-banner">
        <div class="score-main">
          <div class="team-badge" id="bat-team-badge">IND</div>
          <div class="score-digits" id="score-digits">0 / 0</div>
          <div class="overs-info" id="overs-info">OVERS: 0.0 / 2</div>
        </div>

        <div class="match-context" id="match-context">
          <div class="crr-text" id="crr-text">CRR: 0.00</div>
          <div class="target-text" id="target-text">1st INNINGS</div>
        </div>

        <!-- BATSMEN & BOWLER STATS STRIP -->
        <div class="players-strip">
          <div class="batter-card striker-card" id="striker-card">
            <span class="bat-icon">🏏</span>
            <span class="p-name" id="striker-name">R. Sharma*</span>
            <span class="p-score" id="striker-score">0 (0)</span>
          </div>
          <div class="batter-card non-striker-card" id="non-striker-card">
            <span class="p-name" id="non-striker-name">S. Gill</span>
            <span class="p-score" id="non-striker-score">0 (0)</span>
          </div>
          <div class="bowler-card" id="bowler-card">
            <span class="bowl-icon">⚾</span>
            <span class="p-name" id="bowler-name">P. Cummins</span>
            <span class="p-figures" id="bowler-figures">0.0-0-0-0</span>
          </div>
        </div>

        <!-- THIS OVER BALL BADGES -->
        <div class="this-over-tracker" id="this-over-tracker">
          <span class="over-label">THIS OVER:</span>
          <div class="ball-badges-row" id="ball-badges-row"></div>
        </div>
      </div>

      <!-- PRACTICE NETS SESSION BANNER -->
      <div class="practice-banner hidden" id="practice-banner">
        <div class="practice-title">🎯 PRACTICE NETS</div>
        <div class="practice-metrics">
          <span class="p-metric">Balls: <strong id="p-balls">0</strong></span>
          <span class="p-metric">Runs: <strong id="p-runs">0</strong></span>
          <span class="p-metric">Clean Hits: <strong id="p-hits">0</strong></span>
          <span class="p-metric">Misses: <strong id="p-misses">0</strong></span>
          <span class="p-metric">SR: <strong id="p-sr">0.0</strong></span>
        </div>
        <button id="p-rebowl-btn" class="hud-pill-btn action-pill" style="margin-left: 8px;">
          <span class="icon">🔄</span> Re-Bowl <span class="hotkey">[R]</span>
        </button>
      </div>

      <!-- CAMERA & CONTROLS QUICK INFO (TOP RIGHT) -->
      <div class="camera-hud-badge">
        <button id="cam-toggle-btn" class="hud-pill-btn">
          <span class="icon">🎥</span> <span id="cam-name-label">Broadcast Batting Cam</span> <span class="hotkey">[C]</span>
        </button>
        <button id="pause-btn" class="hud-pill-btn">
          <span class="icon">⏸️</span> Pause <span class="hotkey">[ESC]</span>
        </button>
      </div>

      <!-- LEFT BATTING SHOT SELECTOR (6 DISTINCT SHOTS) -->
      <div class="batting-control-dock">
        <div class="dock-header">BATTING SHOT ACTION</div>
        
        <div class="shots-grid">
          ${Object.values(BATTING_SHOTS).map(shot => `
            <button class="shot-action-btn ${shot.id === selectedShot.id ? 'active' : ''}" data-shot="${shot.id}">
              <span class="shot-key-badge">${shot.key}</span>
              <span class="shot-btn-name">${shot.name}</span>
            </button>
          `).join('')}
        </div>

        <!-- CURRENT SELECTED SHOT CARD -->
        <div class="selected-shot-info" id="selected-shot-info">
          <div class="selected-shot-title" id="shot-title">${selectedShot.name}</div>
          <div class="selected-shot-desc" id="shot-desc">${selectedShot.description}</div>
          <div class="selected-shot-hotkey">Press <kbd>${selectedShot.key}</kbd> or <kbd>${selectedShot.keyAlt}</kbd> to select</div>
        </div>
      </div>

      <!-- RIGHT BOWLING INFO & DIFFICULTY DOCK -->
      <div class="bowling-control-dock">
        <div class="dock-header">INCOMING DELIVERY</div>
        <div class="delivery-status-box" id="delivery-status-box">
          <div class="deliv-stat-row">
            <span>PACE:</span> <strong id="hud-deliv-pace">136 km/h</strong>
          </div>
          <div class="deliv-stat-row">
            <span>LENGTH:</span> <strong id="hud-deliv-len">GOOD LENGTH</strong>
          </div>
          <div class="deliv-stat-row">
            <span>LINE:</span> <strong id="hud-deliv-line">OFF STUMP</strong>
          </div>
        </div>

        <div class="dock-header" style="margin-top: 8px;">DIFFICULTY</div>
        <div class="difficulty-toggle-row">
          <button class="diff-btn ${this.gameState.difficulty === 'EASY' ? 'active' : ''}" data-diff="EASY">EASY</button>
          <button class="diff-btn ${this.gameState.difficulty === 'MEDIUM' ? 'active' : ''}" data-diff="MEDIUM">MED</button>
          <button class="diff-btn ${this.gameState.difficulty === 'HARD' ? 'active' : ''}" data-diff="HARD">HARD</button>
        </div>

        <div class="dock-header" style="margin-top: 8px;">FIELD TACTICS</div>
        <div class="difficulty-toggle-row">
          <button class="field-preset-btn active" data-field="BALANCED">BALANCED</button>
          <button class="field-preset-btn" data-field="ATTACKING">ATTACK</button>
          <button class="field-preset-btn" data-field="DEFENSIVE">DEFEND</button>
        </div>
      </div>

      <!-- TIMING GAUGE (BOTTOM CENTER) -->
      <div class="timing-meter-container" id="timing-meter-container">
        <div class="meter-feedback" id="meter-feedback">READY TO STRIKE</div>
        <div class="timing-bar-track">
          <div class="zone zone-early">EARLY</div>
          <div class="zone zone-good">GOOD</div>
          <div class="zone zone-perfect">PERFECT</div>
          <div class="zone zone-good">GOOD</div>
          <div class="zone zone-late">LATE</div>
          <div class="timing-needle" id="timing-needle"></div>
        </div>
        <div class="delivery-action-callout" id="delivery-action-callout">
          PRESS <kbd>SPACE</kbd> TO DELIVER / PLAY SHOT
        </div>
      </div>

      <!-- BOTTOM RIGHT RADAR MINIMAP -->
      <div class="radar-minimap-card">
        <canvas id="radar-canvas" width="160" height="160"></canvas>
      </div>
    `;

    this.radarCanvas = document.getElementById('radar-canvas');
    this.radarCtx = this.radarCanvas.getContext('2d');
  }

  attachEventListeners() {
    // Shot Selection Buttons (1..6)
    const shotBtns = this.container.querySelectorAll('.shot-action-btn');
    shotBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const shotKey = btn.dataset.shot;
        this.selectShot(shotKey);
        if (this.onAction) this.onAction('SELECT_SHOT', shotKey);
      });
    });

    // Delivery Action Callout / Strike button click
    const calloutEl = document.getElementById('delivery-action-callout');
    if (calloutEl) {
      calloutEl.addEventListener('click', () => {
        if (this.onAction) this.onAction('TRIGGER_ACTION');
      });
    }

    // Difficulty buttons
    const diffBtns = this.container.querySelectorAll('.diff-btn');
    diffBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        diffBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.gameState.difficulty = btn.dataset.diff;
        if (this.onAction) this.onAction('UPDATE_DIFFICULTY');
      });
    });

    // Field preset buttons
    const fieldBtns = this.container.querySelectorAll('.field-preset-btn');
    fieldBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        fieldBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.onAction) this.onAction('SET_FIELD_PRESET', btn.dataset.field);
      });
    });

    // Camera toggle
    document.getElementById('cam-toggle-btn').addEventListener('click', () => {
      if (this.onAction) this.onAction('CYCLE_CAMERA');
    });

    // Pause button
    document.getElementById('pause-btn').addEventListener('click', () => {
      if (this.onAction) this.onAction('TOGGLE_PAUSE');
    });

    // Re-Bowl button (Practice Nets)
    const rebowlBtn = document.getElementById('p-rebowl-btn');
    if (rebowlBtn) {
      rebowlBtn.addEventListener('click', () => {
        if (this.onAction) this.onAction('RE_BOWL');
      });
    }
  }

  selectShot(shotKey) {
    this.gameState.setSelectedShot(shotKey);
    const shotObj = this.gameState.getSelectedShot();

    const shotBtns = this.container.querySelectorAll('.shot-action-btn');
    shotBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.shot === shotKey);
    });

    const titleEl = document.getElementById('shot-title');
    const descEl = document.getElementById('shot-desc');
    if (titleEl) titleEl.textContent = shotObj.name;
    if (descEl) descEl.textContent = shotObj.description;
  }

  updateDeliveryHUD(delivData) {
    if (!delivData) return;
    const paceEl = document.getElementById('hud-deliv-pace');
    const lenEl = document.getElementById('hud-deliv-len');
    const lineEl = document.getElementById('hud-deliv-line');

    if (paceEl) paceEl.textContent = `${delivData.speedKmph} km/h`;
    if (lenEl) lenEl.textContent = `${delivData.lengthType} LENGTH`;
    if (lineEl) {
      let lineText = 'MIDDLE STUMP';
      if (delivData.lineOffset < -0.1) lineText = 'OUTSIDE OFF';
      else if (delivData.lineOffset > 0.1) lineText = 'DOWN LEG';
      lineEl.textContent = lineText;
    }
  }

  updateCameraLabel(cameraName) {
    const lbl = document.getElementById('cam-name-label');
    if (lbl) lbl.textContent = cameraName;
  }

  showFeedback(text, type = 'GOOD') {
    const fb = document.getElementById('meter-feedback');
    if (!fb) return;
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
      this.feedbackTimeout = null;
    }
    fb.textContent = text;
    fb.className = `meter-feedback active type-${type.toLowerCase()}`;
    this.feedbackTimeout = setTimeout(() => {
      fb.classList.remove('active');
      this.feedbackTimeout = null;
    }, 2500);
  }

  updateTimingMeter(needleProgress) {
    const needle = document.getElementById('timing-needle');
    if (!needle) return;
    const pct = Math.max(0, Math.min(100, needleProgress * 100));
    needle.style.left = `${pct}%`;
  }

  // Draw 2D Cricket Minimap Radar
  drawRadar(ball, characters) {
    if (!this.radarCtx) return;
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = (w * 0.44) / 65.0;

    ctx.clearRect(0, 0, w, h);

    // Outfield boundary
    ctx.beginPath();
    ctx.arc(cx, cy, 65.0 * scale, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(27, 94, 32, 0.7)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // 30-yard circle
    ctx.beginPath();
    ctx.arc(cx, cy, 27.4 * scale, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pitch rectangle
    const pitchW = 3.2 * scale;
    const pitchH = 20.12 * scale;
    ctx.fillStyle = '#cfb989';
    ctx.fillRect(cx - pitchW / 2, cy - pitchH / 2, pitchW, pitchH);

    // Striker (Yellow Dot)
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(cx, cy + 9.15 * scale, 3, 0, Math.PI * 2);
    ctx.fill();

    // Fielders (Cyan Dots)
    if (characters && characters.fielders) {
      ctx.fillStyle = '#00e5ff';
      characters.fielders.forEach(f => {
        const fx = cx + f.group.position.x * scale;
        const fy = cy + f.group.position.z * scale;
        ctx.beginPath();
        ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Ball (Red Pulsing Dot)
    if (ball && ball.inPlay) {
      const bx = cx + ball.mesh.position.x * scale;
      const by = cy + ball.mesh.position.z * scale;
      ctx.fillStyle = '#ff1744';
      ctx.beginPath();
      ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Refresh scoreboard stats
  updateScoreboard() {
    const s = this.gameState;
    const batBadge = document.getElementById('bat-team-badge');
    const scoreDigits = document.getElementById('score-digits');
    const oversInfo = document.getElementById('overs-info');
    const crrText = document.getElementById('crr-text');
    const targetText = document.getElementById('target-text');

    if (batBadge) batBadge.textContent = s.battingTeam.shortName;
    if (scoreDigits) scoreDigits.textContent = `${s.runs} / ${s.wickets}`;
    if (oversInfo) oversInfo.textContent = `OVERS: ${s.overs}.${s.ballsInOver} / ${s.totalOvers}`;
    if (crrText) crrText.textContent = `CRR: ${s.getCurrentRunRate()}`;

    if (targetText) {
      if (s.currentInnings === 2 && s.target !== null) {
        const needed = Math.max(0, s.target - s.runs);
        targetText.textContent = `TARGET: ${s.target} (NEED ${needed} RUNS)`;
      } else {
        targetText.textContent = `1st INNINGS`;
      }
    }

    // Striker stats
    const striker = s.getStriker();
    if (striker) {
      document.getElementById('striker-name').textContent = `${striker.name}*`;
      document.getElementById('striker-score').textContent = `${striker.runs} (${striker.balls}) [${striker.fours}x4, ${striker.sixes}x6]`;
    }

    // Non-striker stats
    const nonStriker = s.getNonStriker();
    if (nonStriker) {
      document.getElementById('non-striker-name').textContent = nonStriker.name;
      document.getElementById('non-striker-score').textContent = `${nonStriker.runs} (${nonStriker.balls})`;
    }

    // Bowler figures
    const bowler = s.getCurrentBowler();
    if (bowler) {
      document.getElementById('bowler-name').textContent = bowler.name;
      document.getElementById('bowler-figures').textContent = `${bowler.overs}.${s.ballsInOver}-${bowler.maidens}-${bowler.runsConceded}-${bowler.wickets}`;
    }

    // This Over badges
    const badgesRow = document.getElementById('ball-badges-row');
    if (badgesRow) {
      badgesRow.innerHTML = s.thisOverBalls.map(badge => {
        let cls = 'badge-dot';
        if (badge === '4') cls = 'badge-four';
        else if (badge === '6') cls = 'badge-six';
        else if (badge.includes('W') && !badge.includes('WD')) cls = 'badge-wicket';
        else if (badge.includes('WD') || badge.includes('NB')) cls = 'badge-run';
        else if (badge !== '0') cls = 'badge-run';
        return `<span class="over-badge ${cls}">${badge}</span>`;
      }).join('');
    }
  }

  setActionCallout(text) {
    const el = document.getElementById('delivery-action-callout');
    if (el) el.innerHTML = text;
  }

  setPracticeMode(enabled) {
    const pBanner = document.getElementById('practice-banner');
    const sBanner = document.querySelector('.score-banner');
    if (pBanner) pBanner.classList.toggle('hidden', !enabled);
    if (sBanner) sBanner.classList.toggle('hidden', enabled);
  }

  updatePracticeStats(stats) {
    const ballsEl = document.getElementById('p-balls');
    const runsEl = document.getElementById('p-runs');
    const hitsEl = document.getElementById('p-hits');
    const missesEl = document.getElementById('p-misses');
    const srEl = document.getElementById('p-sr');

    if (ballsEl) ballsEl.textContent = stats.ballsFaced;
    if (runsEl) runsEl.textContent = stats.runsScored;
    if (hitsEl) hitsEl.textContent = stats.sweetHits;
    if (missesEl) missesEl.textContent = stats.misses;
    if (srEl) {
      const sr = stats.ballsFaced > 0 ? ((stats.runsScored / stats.ballsFaced) * 100).toFixed(1) : '0.0';
      srEl.textContent = sr;
    }
  }
}
