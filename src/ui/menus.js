// Professional Sports Menu System: Hub, Match Config, Tournament, Practice Nets, Settings, Teams, and Scorecard

import { TEAMS } from '../gameState.js';
import { soundManager } from '../audio/soundManager.js';
import { TournamentManager } from '../tournament/tournamentManager.js';

export class MenuManager {
  constructor(gameState, onStartGame, onRestart) {
    this.gameState = gameState;
    this.onStartGame = onStartGame;
    this.onRestart = onRestart;
    this.overlay = document.getElementById('modal-overlay');
    this.tournamentManager = new TournamentManager();

    // Settings State
    this.settings = {
      masterVolume: 1.0,
      sfxVolume: 1.0,
      graphicsQuality: 'HIGH', // 'HIGH', 'MEDIUM', 'LOW'
      isNightMode: false
    };

    this.onSettingsChange = null;
    this.onStartPractice = null;
    this.isTournamentMatch = false;
  }

  // --- 1. MAIN MENU HUB ---
  showMainMenu() {
    this.overlay.className = 'modal-overlay active';
    this.overlay.innerHTML = `
      <div class="menu-card main-hub-card">
        <div class="game-logo-title">
          <div class="trophy-icon">🏆</div>
          <h1>CRICKET LEGENDS 3D</h1>
          <p class="sub-title">REAL CRICKET CHAMPIONSHIP EDITION</p>
        </div>

        <div class="hub-buttons-grid">
          <button id="hub-btn-play" class="hub-tile-btn primary-tile">
            <span class="tile-icon">🏏</span>
            <span class="tile-title">PLAY MATCH</span>
            <span class="tile-sub">Quick match with custom settings</span>
          </button>

          <button id="hub-btn-practice" class="hub-tile-btn">
            <span class="tile-icon">🎯</span>
            <span class="tile-title">PRACTICE NETS</span>
            <span class="tile-sub">Continuous batting training</span>
          </button>

          <button id="hub-btn-tournament" class="hub-tile-btn">
            <span class="tile-icon">🏆</span>
            <span class="tile-title">TOURNAMENT</span>
            <span class="tile-sub">World Championship league</span>
          </button>

          <button id="hub-btn-teams" class="hub-tile-btn">
            <span class="tile-icon">🛡️</span>
            <span class="tile-title">TEAM SELECTION</span>
            <span class="tile-sub">Squads & player profiles</span>
          </button>

          <button id="hub-btn-settings" class="hub-tile-btn">
            <span class="tile-icon">⚙️</span>
            <span class="tile-title">SETTINGS</span>
            <span class="tile-sub">Audio, graphics, and camera</span>
          </button>

          <button id="hub-btn-howtoplay" class="hub-tile-btn">
            <span class="tile-icon">📖</span>
            <span class="tile-title">HOW TO PLAY</span>
            <span class="tile-sub">Controls, shots & rules guide</span>
          </button>
        </div>

        <div class="hub-footer">
          <span>Desktop Edition • Desktop Browser • 60 FPS Optimized</span>
        </div>
      </div>
    `;

    document.getElementById('hub-btn-play').addEventListener('click', () => {
      soundManager.playClick();
      this.showMatchConfigModal();
    });

    document.getElementById('hub-btn-practice').addEventListener('click', () => {
      soundManager.playClick();
      if (this.onStartPractice) {
        this.hideModal();
        this.onStartPractice();
      }
    });

    document.getElementById('hub-btn-tournament').addEventListener('click', () => {
      soundManager.playClick();
      this.showTournamentModal();
    });

    document.getElementById('hub-btn-teams').addEventListener('click', () => {
      soundManager.playClick();
      this.showTeamSelectionModal();
    });

    document.getElementById('hub-btn-settings').addEventListener('click', () => {
      soundManager.playClick();
      this.showSettingsModal();
    });

    document.getElementById('hub-btn-howtoplay').addEventListener('click', () => {
      soundManager.playClick();
      this.showHowToPlayModal();
    });
  }

  // --- 2. MATCH CONFIGURATION MODAL ---
  showMatchConfigModal() {
    this.overlay.className = 'modal-overlay active';
    this.overlay.innerHTML = `
      <div class="menu-card match-config-card">
        <h2>🏏 MATCH CONFIGURATION</h2>

        <div class="config-grid">
          <div class="menu-section">
            <h3>SELECT YOUR TEAM</h3>
            <div class="team-picker">
              ${TEAMS.map((t, i) => `
                <button class="team-select-btn ${i === this.gameState.userTeamIndex ? 'selected' : ''}" data-idx="${i}">
                  <span class="flag-code">${t.shortName}</span>
                  <span class="team-name">${t.name}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <div class="menu-section">
            <h3>OPPONENT TEAM</h3>
            <div class="team-picker">
              ${TEAMS.map((t, i) => `
                <button class="opp-select-btn ${i === this.gameState.opponentTeamIndex ? 'selected' : ''}" data-idx="${i}">
                  <span class="flag-code">${t.shortName}</span>
                  <span class="team-name">${t.name}</span>
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="config-grid">
          <div class="menu-section">
            <h3>MATCH OVERS</h3>
            <div class="options-row">
              <button class="ov-btn ${this.gameState.totalOvers === 1 ? 'active' : ''}" data-overs="1">1 Over</button>
              <button class="ov-btn ${this.gameState.totalOvers === 2 ? 'active' : ''}" data-overs="2">2 Overs</button>
              <button class="ov-btn ${this.gameState.totalOvers === 5 ? 'active' : ''}" data-overs="5">5 Overs</button>
              <button class="ov-btn ${this.gameState.totalOvers === 10 ? 'active' : ''}" data-overs="10">10 Overs</button>
            </div>
          </div>

          <div class="menu-section">
            <h3>DIFFICULTY</h3>
            <div class="options-row">
              <button class="dif-btn ${this.gameState.difficulty === 'EASY' ? 'active' : ''}" data-diff="EASY">EASY</button>
              <button class="dif-btn ${this.gameState.difficulty === 'MEDIUM' ? 'active' : ''}" data-diff="MEDIUM">MED</button>
              <button class="dif-btn ${this.gameState.difficulty === 'HARD' ? 'active' : ''}" data-diff="HARD">HARD</button>
            </div>
          </div>
        </div>

        <div class="menu-section">
          <h3>STADIUM ATMOSPHERE</h3>
          <div class="options-row">
            <button class="env-btn ${!this.settings.isNightMode ? 'active' : ''}" data-env="DAY">☀️ DAY MATCH</button>
            <button class="env-btn ${this.settings.isNightMode ? 'active' : ''}" data-env="NIGHT">🌙 NIGHT (FLOODLIGHTS)</button>
          </div>
        </div>

        <div class="menu-actions">
          <button id="btn-proceed-toss" class="btn-primary-large">PROCEED TO TOSS 🪙</button>
          <button id="btn-config-back" class="btn-secondary">BACK TO MENU</button>
        </div>
      </div>
    `;

    let userTeam = this.gameState.userTeamIndex;
    let oppTeam = this.gameState.opponentTeamIndex;
    let overs = this.gameState.totalOvers;
    let diff = this.gameState.difficulty;
    let isNight = this.settings.isNightMode;

    // Team selects
    this.overlay.querySelectorAll('.team-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        soundManager.playClick();
        this.overlay.querySelectorAll('.team-select-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        userTeam = parseInt(btn.dataset.idx, 10);
      });
    });

    this.overlay.querySelectorAll('.opp-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        soundManager.playClick();
        this.overlay.querySelectorAll('.opp-select-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        oppTeam = parseInt(btn.dataset.idx, 10);
      });
    });

    // Overs
    this.overlay.querySelectorAll('.ov-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        soundManager.playClick();
        this.overlay.querySelectorAll('.ov-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        overs = parseInt(btn.dataset.overs, 10);
      });
    });

    // Diff
    this.overlay.querySelectorAll('.dif-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        soundManager.playClick();
        this.overlay.querySelectorAll('.dif-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        diff = btn.dataset.diff;
      });
    });

    // Env Day/Night
    this.overlay.querySelectorAll('.env-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        soundManager.playClick();
        this.overlay.querySelectorAll('.env-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        isNight = btn.dataset.env === 'NIGHT';
      });
    });

    document.getElementById('btn-proceed-toss').addEventListener('click', () => {
      soundManager.playClick();
      this.isTournamentMatch = false;
      this.gameState.initMatch(userTeam, oppTeam, overs);
      this.gameState.difficulty = diff;
      this.settings.isNightMode = isNight;
      if (this.onSettingsChange) this.onSettingsChange(this.settings);
      this.showTossCeremony();
    });

    document.getElementById('btn-config-back').addEventListener('click', () => {
      soundManager.playClick();
      this.showMainMenu();
    });
  }

  // --- 3. TOURNAMENT MODAL ---
  showTournamentModal() {
    this.overlay.className = 'modal-overlay active';
    const fix = this.tournamentManager.getCurrentFixture();
    const standings = this.tournamentManager.standings;

    this.overlay.innerHTML = `
      <div class="menu-card tournament-modal-card">
        <div class="trophy-banner">🏆 LEGENDS WORLD TROPHY 🏆</div>

        <div class="tournament-content-grid">
          <div class="standings-pane">
            <h3>POINTS TABLE</h3>
            <table class="sc-table">
              <thead>
                <tr>
                  <th>TEAM</th>
                  <th>P</th>
                  <th>W</th>
                  <th>L</th>
                  <th>PTS</th>
                  <th>NRR</th>
                </tr>
              </thead>
              <tbody>
                ${standings.map((s, idx) => `
                  <tr class="${idx < 2 ? 'top-team' : ''}">
                    <td class="b-name">${idx + 1}. ${s.name}</td>
                    <td>${s.played}</td>
                    <td>${s.won}</td>
                    <td>${s.lost}</td>
                    <td><strong>${s.points}</strong></td>
                    <td>${s.nrr}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="standings-note">* Top 2 teams advance to the Grand Final</div>
          </div>

          <div class="fixtures-pane">
            <h3>NEXT FIXTURE</h3>
            ${fix ? `
              <div class="fixture-box">
                <div class="fix-stage">${fix.stage} (Match ${fix.id}/7)</div>
                <div class="fix-teams">${fix.teamA} <span class="vs">VS</span> ${fix.teamB}</div>
              </div>
              <button id="btn-play-tourn-match" class="btn-primary-large" style="margin-top: 10px;">
                PLAY THIS MATCH 🏏
              </button>
            ` : `
              <div class="fixture-box">
                <div class="fix-stage">🏆 CHAMPIONSHIP COMPLETE!</div>
                <div class="winner-title">${this.tournamentManager.champion} WIN THE TROPHY!</div>
              </div>
            `}

            <button id="btn-reset-tourn" class="btn-secondary" style="margin-top: 10px;">
              RESET TOURNAMENT 🔄
            </button>
          </div>
        </div>

        <button id="btn-tourn-back" class="btn-secondary" style="margin-top: 14px;">
          BACK TO MAIN MENU
        </button>
      </div>
    `;

    const playBtn = document.getElementById('btn-play-tourn-match');
    if (playBtn && fix) {
      playBtn.addEventListener('click', () => {
        soundManager.playClick();
        const foundA = TEAMS.findIndex(t => t.name === fix.teamA);
        const teamAIdx = foundA >= 0 ? foundA : 0;
        const foundB = TEAMS.findIndex(t => t.name === fix.teamB);
        const teamBIdx = foundB >= 0 ? foundB : 1;
        this.gameState.initMatch(teamAIdx, teamBIdx, 2);
        this.isTournamentMatch = true;
        this.showTossCeremony();
      });
    }

    document.getElementById('btn-reset-tourn').addEventListener('click', () => {
      soundManager.playClick();
      this.tournamentManager.resetTournament();
      this.showTournamentModal();
    });

    document.getElementById('btn-tourn-back').addEventListener('click', () => {
      soundManager.playClick();
      this.showMainMenu();
    });
  }

  // --- 4. TEAM SELECTION & SQUAD PROFILES MODAL ---
  showTeamSelectionModal() {
    this.overlay.className = 'modal-overlay active';
    let teamIdx = this.gameState.userTeamIndex;
    const team = TEAMS[teamIdx];

    this.overlay.innerHTML = `
      <div class="menu-card team-squad-card">
        <h2>🛡️ TEAM SQUADS & ROSTERS</h2>

        <div class="team-tab-row">
          ${TEAMS.map((t, i) => `
            <button class="team-tab-btn ${i === teamIdx ? 'active' : ''}" data-idx="${i}">
              ${t.name}
            </button>
          `).join('')}
        </div>

        <div class="squad-list-grid" id="squad-list-grid">
          ${team.players.map((p, idx) => `
            <div class="player-card-tile">
              <span class="player-num">#${idx + 1}</span>
              <span class="player-name">${p.name}</span>
              <span class="player-role ${p.role.toLowerCase()}">${p.role}</span>
            </div>
          `).join('')}
        </div>

        <button id="btn-teams-back" class="btn-secondary" style="margin-top: 14px;">
          BACK TO MAIN MENU
        </button>
      </div>
    `;

    this.overlay.querySelectorAll('.team-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        soundManager.playClick();
        this.gameState.userTeamIndex = parseInt(btn.dataset.idx, 10);
        this.showTeamSelectionModal();
      });
    });

    document.getElementById('btn-teams-back').addEventListener('click', () => {
      soundManager.playClick();
      this.showMainMenu();
    });
  }

  // --- 5. SETTINGS MODAL ---
  showSettingsModal() {
    this.overlay.className = 'modal-overlay active';
    this.overlay.innerHTML = `
      <div class="menu-card settings-card">
        <h2>⚙️ GAME SETTINGS</h2>

        <div class="settings-rows-wrap">
          <div class="setting-item">
            <label>Master Volume: <span id="val-master">${Math.round(this.settings.masterVolume * 100)}%</span></label>
            <input type="range" id="slider-master" min="0" max="100" value="${Math.round(this.settings.masterVolume * 100)}" class="rc-slider">
          </div>

          <div class="setting-item">
            <label>Sound Effects: <span id="val-sfx">${Math.round(this.settings.sfxVolume * 100)}%</span></label>
            <input type="range" id="slider-sfx" min="0" max="100" value="${Math.round(this.settings.sfxVolume * 100)}" class="rc-slider">
          </div>

          <div class="setting-item">
            <label>Graphics Quality</label>
            <div class="options-row">
              <button class="gfx-btn ${this.settings.graphicsQuality === 'HIGH' ? 'active' : ''}" data-gfx="HIGH">HIGH (60 FPS)</button>
              <button class="gfx-btn ${this.settings.graphicsQuality === 'MEDIUM' ? 'active' : ''}" data-gfx="MEDIUM">MEDIUM</button>
              <button class="gfx-btn ${this.settings.graphicsQuality === 'LOW' ? 'active' : ''}" data-gfx="LOW">LOW</button>
            </div>
          </div>

          <div class="setting-item">
            <label>Match Difficulty</label>
            <div class="options-row">
              <button class="set-diff-btn ${this.gameState.difficulty === 'EASY' ? 'active' : ''}" data-diff="EASY">EASY</button>
              <button class="set-diff-btn ${this.gameState.difficulty === 'MEDIUM' ? 'active' : ''}" data-diff="MEDIUM">MEDIUM</button>
              <button class="set-diff-btn ${this.gameState.difficulty === 'HARD' ? 'active' : ''}" data-diff="HARD">HARD</button>
            </div>
          </div>
        </div>

        <button id="btn-settings-save" class="btn-primary-large" style="margin-top: 14px;">
          APPLY & RETURN 🏠
        </button>
      </div>
    `;

    const sliderMaster = document.getElementById('slider-master');
    const sliderSfx = document.getElementById('slider-sfx');

    sliderMaster.addEventListener('input', (e) => {
      const v = parseInt(e.target.value, 10);
      document.getElementById('val-master').textContent = `${v}%`;
      this.settings.masterVolume = v / 100;
      soundManager.setMasterVolume(this.settings.masterVolume);
    });

    sliderSfx.addEventListener('input', (e) => {
      const v = parseInt(e.target.value, 10);
      document.getElementById('val-sfx').textContent = `${v}%`;
      this.settings.sfxVolume = v / 100;
      soundManager.setSfxVolume(this.settings.sfxVolume);
    });

    this.overlay.querySelectorAll('.gfx-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        soundManager.playClick();
        this.overlay.querySelectorAll('.gfx-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.graphicsQuality = btn.dataset.gfx;
      });
    });

    this.overlay.querySelectorAll('.set-diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        soundManager.playClick();
        this.overlay.querySelectorAll('.set-diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.gameState.difficulty = btn.dataset.diff;
      });
    });

    document.getElementById('btn-settings-save').addEventListener('click', () => {
      soundManager.playClick();
      if (this.onSettingsChange) this.onSettingsChange(this.settings);
      this.showMainMenu();
    });
  }

  // --- 6. HOW TO PLAY & CONTROLS MODAL ---
  showHowToPlayModal() {
    this.overlay.className = 'modal-overlay active';
    this.overlay.innerHTML = `
      <div class="menu-card howtoplay-card">
        <h2>📖 HOW TO PLAY & CONTROLS GUIDE</h2>

        <div class="instructions-scroll">
          <div class="instruction-block">
            <h4>🏏 6 BATTING SHOTS (CHOOSE WITH 1..6 OR Q/W/E/A/D/L)</h4>
            <ul>
              <li><kbd>1</kbd> / <kbd>Q</kbd> <strong>Defensive Block:</strong> Dead bat drop onto the pitch. Completely safe from catches.</li>
              <li><kbd>2</kbd> / <kbd>W</kbd> <strong>Straight Drive:</strong> Crisp ground punch straight down the ground.</li>
              <li><kbd>3</kbd> / <kbd>E</kbd> <strong>Cover Drive:</strong> Classical drive piercing through extra cover and mid-off.</li>
              <li><kbd>4</kbd> / <kbd>A</kbd> <strong>Pull Shot:</strong> Horizontal cross-bat swipe over mid-wicket on short balls.</li>
              <li><kbd>5</kbd> / <kbd>D</kbd> <strong>Square Cut:</strong> Slashing arc through gully/point on wide deliveries.</li>
              <li><kbd>6</kbd> / <kbd>L</kbd> <strong>Lofted Attack 🚀:</strong> Full elevation boundary launch aiming for a towering SIX!</li>
            </ul>
          </div>

          <div class="instruction-block">
            <h4>⏱️ MILLISECOND TIMING METER</h4>
            <p>Press <kbd>Space</kbd> when the ball approaches the popping crease. Hitting inside the green/cyan zone delivers <strong>PERFECT</strong> power and trajectory. Mistimed shots can produce edges or pop up for catches!</p>
          </div>

          <div class="instruction-block">
            <h4>🎥 MULTIPLE CAMERA VIEWS</h4>
            <p>Press <kbd>C</kbd> to cycle between Broadcast Batting, Bowler Run-Up Cam, Dynamic Ball Follow Cam, TV Sideline, and Aerial Tactical Cam.</p>
          </div>
        </div>

        <button id="btn-howtoplay-back" class="btn-primary-large" style="margin-top: 14px;">
          GOT IT! 🏠
        </button>
      </div>
    `;

    document.getElementById('btn-howtoplay-back').addEventListener('click', () => {
      soundManager.playClick();
      this.showMainMenu();
    });
  }

  // --- 7. TOSS CEREMONY ---
  showTossCeremony() {
    this.overlay.className = 'modal-overlay active';
    this.overlay.innerHTML = `
      <div class="menu-card toss-card">
        <h2>🪙 MATCH TOSS CEREMONY</h2>
        <p class="toss-intro">${this.gameState.battingTeam.name} vs ${this.gameState.bowlingTeam.name}</p>

        <div class="coin-stage">
          <div class="coin-disc" id="coin-disc">🪙</div>
        </div>

        <div class="toss-choice-panel" id="toss-choice-panel">
          <h3>CALL THE TOSS:</h3>
          <div class="toss-buttons">
            <button class="btn-toss" data-call="HEADS">HEADS</button>
            <button class="btn-toss" data-call="TAILS">TAILS</button>
          </div>
        </div>

        <div class="toss-result-panel hidden" id="toss-result-panel">
          <h3 id="toss-result-text">YOU WON THE TOSS!</h3>
          <div class="toss-decision-buttons">
            <button class="btn-toss-decide" data-dec="BAT">BAT FIRST 🏏</button>
            <button class="btn-toss-decide" data-dec="BOWL">BOWL FIRST ⚾</button>
          </div>
        </div>
      </div>
    `;

    const choicePanel = document.getElementById('toss-choice-panel');
    const resultPanel = document.getElementById('toss-result-panel');
    const coin = document.getElementById('coin-disc');

    this.overlay.querySelectorAll('.btn-toss').forEach(btn => {
      btn.addEventListener('click', () => {
        soundManager.playClick();
        choicePanel.classList.add('hidden');
        coin.classList.add('spinning');

        setTimeout(() => {
          coin.classList.remove('spinning');
          const won = Math.random() > 0.4;
          resultPanel.classList.remove('hidden');

          if (won) {
            document.getElementById('toss-result-text').textContent = `🎉 ${this.gameState.battingTeam.name} WON THE TOSS!`;
          } else {
            document.getElementById('toss-result-text').textContent = `Opponent won the toss and elected to BOWL!`;
            setTimeout(() => {
              this.hideModal();
              this.onStartGame();
            }, 1800);
          }
        }, 1200);
      });
    });

    this.overlay.querySelectorAll('.btn-toss-decide').forEach(btn => {
      btn.addEventListener('click', () => {
        soundManager.playClick();
        const decision = btn.dataset.dec;
        if (decision === 'BOWL') {
          this.gameState.swapBattingSides();
        }
        this.hideModal();
        this.onStartGame();
      });
    });
  }

  // --- 8. PAUSE MENU ---
  showPauseMenu(onResume) {
    this.overlay.className = 'modal-overlay active';
    this.overlay.innerHTML = `
      <div class="menu-card pause-card">
        <h2>MATCH PAUSED</h2>
        <div class="pause-actions">
          <button id="btn-resume" class="btn-primary-large">RESUME PLAY ▶️</button>
          <button id="btn-pause-settings" class="btn-secondary">SETTINGS ⚙️</button>
          <button id="btn-restart-match" class="btn-secondary">RESTART MATCH 🔄</button>
          <button id="btn-quit-menu" class="btn-secondary">MAIN MENU 🏠</button>
        </div>
      </div>
    `;

    document.getElementById('btn-resume').addEventListener('click', () => {
      soundManager.playClick();
      this.hideModal();
      if (onResume) onResume();
    });

    document.getElementById('btn-pause-settings').addEventListener('click', () => {
      soundManager.playClick();
      this.showSettingsModal();
    });

    document.getElementById('btn-restart-match').addEventListener('click', () => {
      soundManager.playClick();
      this.gameState.resetInnings();
      this.hideModal();
      if (this.onRestart) this.onRestart();
    });

    document.getElementById('btn-quit-menu').addEventListener('click', () => {
      soundManager.playClick();
      this.showMainMenu();
    });
  }

  // --- 9. INNINGS BREAK ---
  showInningsBreak(target, onNextInnings) {
    soundManager.playCheer(0.8, 2.5);
    this.overlay.className = 'modal-overlay active';
    this.overlay.innerHTML = `
      <div class="menu-card break-card">
        <h2>🏁 INNINGS COMPLETED!</h2>
        <div class="break-target-display">
          <div class="target-title">TARGET SET</div>
          <div class="target-number">${target} RUNS</div>
          <div class="target-sub">${this.gameState.battingTeam.name} need ${target} runs in ${this.gameState.totalOvers} overs to win!</div>
        </div>

        <button id="btn-start-chase" class="btn-primary-large">START 2nd INNINGS CHASE 🏏</button>
      </div>
    `;

    document.getElementById('btn-start-chase').addEventListener('click', () => {
      soundManager.playClick();
      this.hideModal();
      if (onNextInnings) onNextInnings();
    });
  }

  // --- 10. OFFICIAL MATCH SCORECARD SUMMARY ---
  showMatchSummary(matchOutcome) {
    soundManager.playBoundaryFanfare(true);
    this.overlay.className = 'modal-overlay active';

    const matchData = this.gameState.getFinalMatchResult();
    const winner = matchOutcome.winner || matchData.winner;
    const margin = matchOutcome.margin || matchData.margin;
    const inn1 = matchData.innings1;
    const inn2 = matchData.innings2;

    // Record result into tournament if active
    const wasTournament = this.isTournamentMatch;
    if (wasTournament && this.tournamentManager) {
      this.tournamentManager.recordMatchResult({
        teamA: inn1 ? inn1.teamName : 'Team A',
        teamB: inn2 ? inn2.teamName : 'Team B',
        runsA: inn1 ? inn1.runs : 0,
        runsB: inn2 ? inn2.runs : 0,
        winner
      });
      this.isTournamentMatch = false;
    }

    this.overlay.innerHTML = `
      <div class="menu-card scorecard-modal-card">
        <div class="trophy-banner">🏆 OFFICIAL MATCH RESULT 🏆</div>
        <h2 class="winner-title">${winner} WON THE MATCH!</h2>
        <div class="winner-margin-badge">${margin ? `Victory by ${margin}` : ''}</div>

        <div class="scorecard-tabs">
          <button class="sc-tab-btn active" id="sc-tab-1">1st INNINGS (${inn1 ? inn1.teamName : ''})</button>
          <button class="sc-tab-btn" id="sc-tab-2">2nd INNINGS (${inn2 ? inn2.teamName : ''})</button>
        </div>

        <div class="scorecard-body" id="scorecard-body">
          ${this.renderInningsTable(inn1 || inn2)}
        </div>

        <div class="summary-actions">
          <button id="btn-rematch" class="btn-primary-large">
            ${wasTournament ? 'TOURNAMENT STANDINGS 🏆' : 'PLAY AGAIN 🔄'}
          </button>
          <button id="btn-menu-back" class="btn-secondary">MAIN MENU 🏠</button>
        </div>
      </div>
    `;

    const tab1 = document.getElementById('sc-tab-1');
    const tab2 = document.getElementById('sc-tab-2');
    const scBody = document.getElementById('scorecard-body');

    if (tab1 && tab2) {
      tab1.addEventListener('click', () => {
        soundManager.playClick();
        tab1.classList.add('active');
        tab2.classList.remove('active');
        if (scBody && inn1) scBody.innerHTML = this.renderInningsTable(inn1);
      });

      tab2.addEventListener('click', () => {
        soundManager.playClick();
        tab2.classList.add('active');
        tab1.classList.remove('active');
        if (scBody && inn2) scBody.innerHTML = this.renderInningsTable(inn2);
      });
    }

    document.getElementById('btn-rematch').addEventListener('click', () => {
      soundManager.playClick();
      this.hideModal();
      if (wasTournament) {
        this.showTournamentModal();
      } else if (this.onRestart) {
        this.onRestart();
      }
    });

    document.getElementById('btn-menu-back').addEventListener('click', () => {
      soundManager.playClick();
      this.showMainMenu();
    });
  }

  renderInningsTable(inn) {
    if (!inn) return '<div class="no-data">Innings in progress</div>';

    return `
      <div class="inn-header-row">
        <h3>${inn.teamName}: ${inn.runs}/${inn.wickets} (${inn.overs} Overs)</h3>
        <span class="extras-tag">Extras: ${inn.extras.total} (wd ${inn.extras.wides}, nb ${inn.extras.noBalls}, lb ${inn.extras.legByes})</span>
      </div>

      <div class="sc-table-wrap">
        <table class="sc-table">
          <thead>
            <tr>
              <th>BATTER</th>
              <th>STATUS</th>
              <th>R</th>
              <th>B</th>
              <th>4s</th>
              <th>6s</th>
              <th>SR</th>
            </tr>
          </thead>
          <tbody>
            ${inn.batters.filter(b => b.balls > 0 || b.isOut).map(b => `
              <tr>
                <td class="b-name">${b.name}</td>
                <td class="b-status">${b.dismissal}</td>
                <td><strong>${b.runs}</strong></td>
                <td>${b.balls}</td>
                <td>${b.fours}</td>
                <td>${b.sixes}</td>
                <td>${b.strikeRate}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="sc-table-wrap" style="margin-top: 10px;">
        <table class="sc-table">
          <thead>
            <tr>
              <th>BOWLER</th>
              <th>O</th>
              <th>M</th>
              <th>R</th>
              <th>W</th>
              <th>ECON</th>
            </tr>
          </thead>
          <tbody>
            ${inn.bowlers.map(bw => `
              <tr>
                <td class="b-name">${bw.name}</td>
                <td>${bw.overs}</td>
                <td>${bw.maidens}</td>
                <td><strong>${bw.runsConceded}</strong></td>
                <td><strong>${bw.wickets}</strong></td>
                <td>${bw.economy}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  hideModal() {
    this.overlay.className = 'modal-overlay';
    this.overlay.innerHTML = '';
  }
}
