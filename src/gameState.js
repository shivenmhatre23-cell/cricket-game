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
    players: [
      { name: 'R. Sharma (C)', role: 'BAT' },
      { name: 'S. Gill', role: 'BAT' },
      { name: 'V. Kohli', role: 'BAT' },
      { name: 'S. Yadav', role: 'BAT' },
      { name: 'H. Pandya', role: 'ALL' },
      { name: 'R. Pant (WK)', role: 'WK' },
      { name: 'R. Jadeja', role: 'ALL' },
      { name: 'A. Patel', role: 'ALL' },
      { name: 'K. Yadav', role: 'BOWL' },
      { name: 'J. Bumrah', role: 'BOWL' },
      { name: 'M. Siraj', role: 'BOWL' }
    ]
  },
  {
    name: 'Australia',
    shortName: 'AUS',
    color: '#fbc02d',
    players: [
      { name: 'T. Head', role: 'BAT' },
      { name: 'D. Warner', role: 'BAT' },
      { name: 'M. Marsh (C)', role: 'ALL' },
      { name: 'G. Maxwell', role: 'ALL' },
      { name: 'M. Stoinis', role: 'ALL' },
      { name: 'T. David', role: 'BAT' },
      { name: 'M. Wade (WK)', role: 'WK' },
      { name: 'P. Cummins', role: 'BOWL' },
      { name: 'M. Starc', role: 'BOWL' },
      { name: 'A. Zampa', role: 'BOWL' },
      { name: 'J. Hazlewood', role: 'BOWL' }
    ]
  },
  {
    name: 'England',
    shortName: 'ENG',
    color: '#c62828',
    players: [
      { name: 'J. Buttler (C/WK)', role: 'WK' },
      { name: 'P. Salt', role: 'BAT' },
      { name: 'W. Jacks', role: 'ALL' },
      { name: 'J. Bairstow', role: 'BAT' },
      { name: 'H. Brook', role: 'BAT' },
      { name: 'M. Ali', role: 'ALL' },
      { name: 'L. Livingstone', role: 'ALL' },
      { name: 'S. Curran', role: 'ALL' },
      { name: 'J. Archer', role: 'BOWL' },
      { name: 'A. Rashid', role: 'BOWL' },
      { name: 'M. Wood', role: 'BOWL' }
    ]
  },
  {
    name: 'Pakistan',
    shortName: 'PAK',
    color: '#2e7d32',
    players: [
      { name: 'B. Azam (C)', role: 'BAT' },
      { name: 'M. Rizwan (WK)', role: 'WK' },
      { name: 'F. Zaman', role: 'BAT' },
      { name: 'U. Khan', role: 'BAT' },
      { name: 'I. Ahmed', role: 'ALL' },
      { name: 'S. Khan', role: 'ALL' },
      { name: 'I. Wasim', role: 'ALL' },
      { name: 'S. Afridi', role: 'BOWL' },
      { name: 'N. Shah', role: 'BOWL' },
      { name: 'H. Rauf', role: 'BOWL' },
      { name: 'M. Amir', role: 'BOWL' }
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
    this.rulesEngine.initRosters();
    if (this.bowlingAI && typeof this.bowlingAI.reset === 'function') {
      this.bowlingAI.reset();
    }
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
