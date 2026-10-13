// Centralized Cricket Game State & State Machine
// Architecture: Delegates all score and cricket rules to CricketRulesEngine

import { CricketRulesEngine, OUTCOME_TYPES, DISMISSAL_TYPES } from './rules/cricketRules.js';
import { BowlingAI } from './ai/bowlingAI.js';

export const GAME_STATES = {
  MENU: 'MENU',
  TOSS: 'TOSS',
  READY: 'READY',
  BOWLER_RUNUP: 'BOWLER_RUNUP',
  DELIVERY: 'DELIVERY',
  BALL_IN_PLAY: 'BALL_IN_PLAY',
  RESULT: 'RESULT',
  OVER_CHANGE: 'OVER_CHANGE',
  INNINGS_BREAK: 'INNINGS_BREAK',
  MATCH_OVER: 'MATCH_OVER',
  PAUSED: 'PAUSED'
};

export const BATTING_SHOTS = {
  DEFENSIVE: {
    id: 'DEFENSIVE',
    name: 'Defensive Block',
    key: '1',
    keyAlt: 'Q',
    exitSpeed: 5.0,
    loftAngle: -0.05,
    shotAngle: Math.PI,
    description: 'Dead bat drop on pitch. Safe from catching.'
  },
  STRAIGHT_DRIVE: {
    id: 'STRAIGHT_DRIVE',
    name: 'Straight Drive',
    key: '2',
    keyAlt: 'W',
    exitSpeed: 28.0,
    loftAngle: 0.08,
    shotAngle: Math.PI,
    description: 'Crisp ground punch straight past bowler.'
  },
  COVER_DRIVE: {
    id: 'COVER_DRIVE',
    name: 'Cover Drive',
    key: '3',
    keyAlt: 'E',
    exitSpeed: 30.0,
    loftAngle: 0.12,
    shotAngle: Math.PI * 0.65,
    description: 'Classical drive piercing through extra cover.'
  },
  PULL_SHOT: {
    id: 'PULL_SHOT',
    name: 'Pull Shot',
    key: '4',
    keyAlt: 'A',
    exitSpeed: 33.0,
    loftAngle: 0.22,
    shotAngle: -Math.PI * 0.55,
    description: 'Cross-bat power stroke over mid-wicket on short balls.'
  },
  CUT_SHOT: {
    id: 'CUT_SHOT',
    name: 'Square Cut',
    key: '5',
    keyAlt: 'D',
    exitSpeed: 29.0,
    loftAngle: 0.06,
    shotAngle: Math.PI * 0.3,
    description: 'Horizontal cut through gully and point on wide deliveries.'
  },
  LOFTED_ATTACK: {
    id: 'LOFTED_ATTACK',
    name: 'Lofted Attack',
    key: '6',
    keyAlt: 'L',
    exitSpeed: 41.0,
    loftAngle: 0.56,
    shotAngle: Math.PI,
    description: 'Aggressive high-launch boundary attack for a SIX!'
  }
};

export const TEAMS = [
  {
    name: 'India',
    shortName: 'IND',
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
      { name: 'V. Kohli', number: 18, role: 'BAT', face: { skin: '#d59868', beard: 'STYLED_BEARD', hair: '#140e09', eyes: '#2c1e13' } },
      { name: 'S. Yadav', number: 63, role: 'BAT', face: { skin: '#cf9060', beard: 'CHIN_STUBBLE', hair: '#1a120b', eyes: '#2c1e13' } },
      { name: 'H. Pandya', number: 33, role: 'ALL', face: { skin: '#c88856', beard: 'GOATEE_STUBBLE', hair: '#140e09', eyes: '#2c1e13' } },
      { name: 'R. Pant (WK)', number: 17, role: 'WK', face: { skin: '#d89e70', beard: 'CLEAN_SHAVEN', hair: '#1a120b', eyes: '#2c1e13' } },
      { name: 'R. Jadeja', number: 8, role: 'ALL', face: { skin: '#bf7d48', beard: 'WARRIOR_BEARD', hair: '#120c08', eyes: '#2c1e13' } },
      { name: 'A. Patel', number: 20, role: 'ALL', face: { skin: '#ca8a58', beard: 'LIGHT_STUBBLE', hair: '#1a120b', eyes: '#2c1e13' } },
      { name: 'K. Yadav', number: 23, role: 'BOWL', face: { skin: '#d69d6e', beard: 'CLEAN_SHAVEN', hair: '#1a120b', eyes: '#2c1e13' } },
      { name: 'J. Bumrah', number: 93, role: 'BOWL', face: { skin: '#c48250', beard: 'LIGHT_BEARD', hair: '#140e09', eyes: '#2c1e13' } },
      { name: 'M. Siraj', number: 73, role: 'BOWL', face: { skin: '#b87542', beard: 'TRIMMED_BEARD', hair: '#140e09', eyes: '#2c1e13' } }
    ]
  },
  {
    name: 'Australia',
    shortName: 'AUS',
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
      { name: 'T. Head', number: 62, role: 'BAT', face: { skin: '#f0c8a0', beard: 'MOUSTACHE', hair: '#c89d55', eyes: '#3a5f78' } },
      { name: 'D. Warner', number: 31, role: 'BAT', face: { skin: '#edc49a', beard: 'CLEAN_SHAVEN', hair: '#d4af66', eyes: '#41729f' } },
      { name: 'M. Marsh (C)', number: 8, role: 'ALL', face: { skin: '#e8bc92', beard: 'STUBBLE', hair: '#4a3320', eyes: '#3d4d3d' } },
      { name: 'G. Maxwell', number: 32, role: 'ALL', face: { skin: '#eecbb0', beard: 'LIGHT_STUBBLE', hair: '#422c1b', eyes: '#3b556b' } },
      { name: 'M. Stoinis', number: 17, role: 'ALL', face: { skin: '#e2b284', beard: 'CHISELED_STUBBLE', hair: '#382517', eyes: '#46322b' } },
      { name: 'T. David', number: 85, role: 'BAT', face: { skin: '#d29662', beard: 'FULL_TRIMMED', hair: '#1f150e', eyes: '#2c1e13' } },
      { name: 'M. Wade (WK)', number: 13, role: 'WK', face: { skin: '#ecc4a2', beard: 'CLEAN_SHAVEN', hair: '#443021', eyes: '#3a536b' } },
      { name: 'P. Cummins', number: 30, role: 'BOWL', face: { skin: '#f2ccaa', beard: 'CLEAN_SHAVEN', hair: '#8d6d48', eyes: '#3f6782' } },
      { name: 'M. Starc', number: 56, role: 'BOWL', face: { skin: '#ecc6a4', beard: 'LIGHT_BEARD', hair: '#3a2719', eyes: '#344c34' } },
      { name: 'A. Zampa', number: 88, role: 'BOWL', face: { skin: '#f4d0b2', beard: 'CLEAN_SHAVEN', hair: '#dfba6c', eyes: '#416a8c' } },
      { name: 'J. Hazlewood', number: 38, role: 'BOWL', face: { skin: '#ebc29c', beard: 'CLEAN_SHAVEN', hair: '#442e1d', eyes: '#3c5a70' } }
    ]
  },
  {
    name: 'England',
    shortName: 'ENG',
    color: '#c62828',
    kit: {
      primary: '#c62828',
      secondary: '#1565c0',
      accent: '#0d47a1',
      pants: '#0d47a1',
      pads: '#c62828',
      helmet: '#0d47a1',
      text: '#ffffff',
      countryText: 'ENGLAND'
    },
    players: [
      { name: 'J. Buttler (C/WK)', number: 63, role: 'WK', face: { skin: '#f0c8aa', beard: 'LIGHT_STUBBLE', hair: '#4a3424', eyes: '#3d5c7a' } },
      { name: 'P. Salt', number: 28, role: 'BAT', face: { skin: '#ecc4a2', beard: 'CLEAN_SHAVEN', hair: '#483424', eyes: '#42586b' } },
      { name: 'W. Jacks', number: 44, role: 'ALL', face: { skin: '#f4ceb4', beard: 'CLEAN_SHAVEN', hair: '#7b5e40', eyes: '#466782' } },
      { name: 'J. Bairstow', number: 51, role: 'BAT', face: { skin: '#f8d2b8', beard: 'RED_BEARD', hair: '#b8542c', eyes: '#416b8c' } },
      { name: 'H. Brook', number: 88, role: 'BAT', face: { skin: '#f2ccb0', beard: 'CLEAN_SHAVEN', hair: '#72573c', eyes: '#3c5a75' } },
      { name: 'M. Ali', number: 18, role: 'ALL', face: { skin: '#caa078', beard: 'FULL_BEARD', hair: '#18120c', eyes: '#2c1e13' } },
      { name: 'L. Livingstone', number: 23, role: 'ALL', face: { skin: '#eed0b6', beard: 'LIGHT_STUBBLE', hair: '#503827', eyes: '#3f586f' } },
      { name: 'S. Curran', number: 58, role: 'ALL', face: { skin: '#f6d4be', beard: 'CLEAN_SHAVEN', hair: '#cbb06d', eyes: '#436c8e' } },
      { name: 'J. Archer', number: 22, role: 'BOWL', face: { skin: '#6d4528', beard: 'CLEAN_SHAVEN', hair: '#120d09', eyes: '#251b14' } },
      { name: 'A. Rashid', number: 95, role: 'BOWL', face: { skin: '#c89e76', beard: 'FULL_BEARD', hair: '#18120c', eyes: '#2c1e13' } },
      { name: 'M. Wood', number: 33, role: 'BOWL', face: { skin: '#eed0b4', beard: 'CLEAN_SHAVEN', hair: '#4c3524', eyes: '#3d586d' } }
    ]
  },
  {
    name: 'Pakistan',
    shortName: 'PAK',
    color: '#2e7d32',
    kit: {
      primary: '#1b5e20',
      secondary: '#00e676',
      accent: '#ffd54f',
      pants: '#1b5e20',
      pads: '#1b5e20',
      helmet: '#1b5e20',
      text: '#ffffff',
      countryText: 'PAKISTAN'
    },
    players: [
      { name: 'B. Azam (C)', number: 56, role: 'BAT', face: { skin: '#d8a072', beard: 'STYLED_STUBBLE', hair: '#16100b', eyes: '#2c1e13' } },
      { name: 'M. Rizwan (WK)', number: 16, role: 'WK', face: { skin: '#dfa87a', beard: 'TRIMMED_BEARD', hair: '#1a120b', eyes: '#2c1e13' } },
      { name: 'F. Zaman', number: 39, role: 'BAT', face: { skin: '#d49868', beard: 'MOUSTACHE_STUBBLE', hair: '#18110b', eyes: '#2c1e13' } },
      { name: 'U. Khan', number: 92, role: 'BAT', face: { skin: '#cf9262', beard: 'FULL_TRIMMED', hair: '#1a120b', eyes: '#2c1e13' } },
      { name: 'I. Ahmed', number: 95, role: 'ALL', face: { skin: '#c48652', beard: 'FULL_BEARD', hair: '#18120c', eyes: '#2c1e13' } },
      { name: 'S. Khan', number: 7, role: 'ALL', face: { skin: '#dca476', beard: 'TRIMMED_BEARD', hair: '#18110b', eyes: '#2c1e13' } },
      { name: 'I. Wasim', number: 9, role: 'ALL', face: { skin: '#d69e70', beard: 'LIGHT_STUBBLE', hair: '#1a120b', eyes: '#2c1e13' } },
      { name: 'S. Afridi', number: 10, role: 'BOWL', face: { skin: '#e2ab7e', beard: 'CHIN_STRAP', hair: '#18110b', eyes: '#2c1e13' } },
      { name: 'N. Shah', number: 71, role: 'BOWL', face: { skin: '#dfa678', beard: 'CLEAN_SHAVEN', hair: '#1a120b', eyes: '#2c1e13' } },
      { name: 'H. Rauf', number: 150, role: 'BOWL', face: { skin: '#c88a56', beard: 'TRIMMED_BEARD', hair: '#16100a', eyes: '#2c1e13' } },
      { name: 'M. Amir', number: 5, role: 'BOWL', face: { skin: '#d09462', beard: 'LIGHT_BEARD', hair: '#18110b', eyes: '#2c1e13' } }
    ]
  }
];

export class GameState {
  constructor() {
    this.currentState = GAME_STATES.MENU;
    this.previousState = GAME_STATES.MENU;

    // Match Options
    this.totalOvers = 2;
    this.userTeamIndex = 0;
    this.opponentTeamIndex = 1;
    this.difficulty = 'MEDIUM';

    this.selectedShotKey = 'STRAIGHT_DRIVE';
    this.shotDirectionIndex = 0;
    this.currentDeliveryData = null;

    // Centralized Rules Engine
    this.rulesEngine = null;
    this.bowlingAI = new BowlingAI();

    this.initMatch(0, 1, 2);
  }

  initMatch(userTeamIdx = 0, oppTeamIdx = 1, oversCount = 2) {
    this.userTeamIndex = userTeamIdx;
    this.opponentTeamIndex = oppTeamIdx;
    this.totalOvers = oversCount;

    const team1 = TEAMS[this.userTeamIndex];
    const team2 = TEAMS[this.opponentTeamIndex];

    this.rulesEngine = new CricketRulesEngine({
      totalOvers: this.totalOvers,
      team1,
      team2
    });

    if (this.bowlingAI && typeof this.bowlingAI.reset === 'function') {
      this.bowlingAI.reset();
    }
  }

  resetInnings() {
    if (this.rulesEngine && typeof this.rulesEngine.resetMatch === 'function') {
      this.rulesEngine.resetMatch();
    } else {
      this.initMatch(this.userTeamIndex, this.opponentTeamIndex, this.totalOvers);
    }
    if (this.bowlingAI && typeof this.bowlingAI.reset === 'function') {
      this.bowlingAI.reset();
    }
  }

  resetMatch() {
    this.resetInnings();
    this.setState(GAME_STATES.READY);
  }

  applyTossDecision(userBatsFirst = true) {
    const battingTeamIdx = userBatsFirst ? this.userTeamIndex : this.opponentTeamIndex;
    const bowlingTeamIdx = userBatsFirst ? this.opponentTeamIndex : this.userTeamIndex;

    const team1 = TEAMS[battingTeamIdx];
    const team2 = TEAMS[bowlingTeamIdx];

    this.rulesEngine = new CricketRulesEngine({
      totalOvers: this.totalOvers,
      team1,
      team2
    });

    if (this.bowlingAI && typeof this.bowlingAI.reset === 'function') {
      this.bowlingAI.reset();
    }
  }

  swapBattingSides() {
    const isUserCurrentlyBatting = this.rulesEngine.battingTeam === TEAMS[this.userTeamIndex];
    this.applyTossDecision(!isUserCurrentlyBatting);
  }

  isUserBatting() {
    return this.rulesEngine.battingTeam?.name === TEAMS[this.userTeamIndex]?.name;
  }

  setState(newState) {
    this.previousState = this.currentState;
    this.currentState = newState;
  }

  // Delegated getters from rulesEngine
  get runs() { return this.rulesEngine.runs; }
  get wickets() { return this.rulesEngine.wickets; }
  get overs() { return this.rulesEngine.completedOvers; }
  get ballsInOver() { return this.rulesEngine.legalBallsInOver; }
  get currentInnings() { return this.rulesEngine.currentInningsNumber; }
  get battingTeam() { return this.rulesEngine.battingTeam; }
  get bowlingTeam() { return this.rulesEngine.bowlingTeam; }
  get target() { return this.rulesEngine.target; }
  get thisOverBalls() { return this.rulesEngine.thisOverBalls; }
  get strikerIndex() { return this.rulesEngine.strikerIndex; }
  get nonStrikerIndex() { return this.rulesEngine.nonStrikerIndex; }
  get currentBowlerIndex() { return this.rulesEngine.currentBowlerIndex; }
  get batsmanStats() { return this.rulesEngine.batterStats; }
  get bowlerStats() { return this.rulesEngine.bowlerStats; }

  getSelectedShot() {
    return BATTING_SHOTS[this.selectedShotKey] || BATTING_SHOTS.STRAIGHT_DRIVE;
  }

  setSelectedShot(shotKey) {
    if (BATTING_SHOTS[shotKey]) {
      this.selectedShotKey = shotKey;
    }
  }

  getStriker() {
    return this.rulesEngine.getStriker();
  }

  getNonStriker() {
    return this.rulesEngine.getNonStriker();
  }

  getCurrentBowler() {
    return this.rulesEngine.getCurrentBowler();
  }

  getCurrentRunRate() {
    return this.rulesEngine.getScoreboardSnapshot().currentRunRate;
  }

  getRequiredRunRate() {
    return this.rulesEngine.getScoreboardSnapshot().requiredRunRate;
  }

  getScoreboardSnapshot() {
    return this.rulesEngine.getScoreboardSnapshot();
  }

  // AI-controlled strategic delivery generator
  generateDelivery() {
    const deliveryId = `del_${this.currentInnings}_${this.overs}_${this.ballsInOver}_${Date.now()}`;

    const aiChoice = this.bowlingAI.selectDelivery({
      bowlerIndex: this.currentBowlerIndex,
      difficulty: this.difficulty,
      matchSituation: {
        runs: this.runs,
        wickets: this.wickets,
        overs: this.overs,
        ballsInOver: this.ballsInOver,
        totalOvers: this.totalOvers,
        currentInnings: this.currentInnings,
        target: this.target,
        strikerIndex: this.strikerIndex,
        strikerRuns: this.getStriker()?.runs || 0,
        strikerBalls: this.getStriker()?.balls || 0,
        thisOverBalls: this.thisOverBalls ? [...this.thisOverBalls] : [],
        requiredRunRate: this.getRequiredRunRate(),
        currentRunRate: this.getCurrentRunRate()
      }
    });

    this.currentDeliveryData = {
      deliveryId,
      ...aiChoice
    };

    return this.currentDeliveryData;
  }

  // Record delivery: pure delegation to CricketRulesEngine and learning in BowlingAI
  recordDelivery(result, shotUsed = null) {
    const res = this.rulesEngine.processDelivery(result);

    if (this.currentDeliveryData) {
      this.bowlingAI.recordDeliveryOutcome(this.currentDeliveryData, result, shotUsed);
    }

    if (res.matchOver) {
      this.setState(GAME_STATES.MATCH_OVER);
    } else if (res.inningsBreak) {
      if (this.bowlingAI && typeof this.bowlingAI.reset === 'function') {
        this.bowlingAI.reset();
      }
      this.setState(GAME_STATES.INNINGS_BREAK);
    } else if (res.overComplete) {
      this.setState(GAME_STATES.OVER_CHANGE);
    } else {
      this.setState(GAME_STATES.RESULT);
    }

    return res;
  }

  getFinalMatchResult() {
    return this.rulesEngine.finalizeMatch();
  }
}
