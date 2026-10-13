// Centralized Pure Cricket Match Rules Engine
// Independent of DOM / Graphics — 100% unit testable

export const DISMISSAL_TYPES = {
  BOWLED: 'Bowled',
  CAUGHT: 'Caught',
  RUN_OUT: 'Run Out',
  STUMPED: 'Stumped',
  LBW: 'LBW'
};

export const OUTCOME_TYPES = {
  DOT: 'DOT',
  RUNS: 'RUNS',
  FOUR: 'FOUR',
  SIX: 'SIX',
  WIDE: 'WIDE',
  NO_BALL: 'NO_BALL',
  LEG_BYE: 'LEG_BYE',
  WICKET: 'WICKET'
};

export class CricketRulesEngine {
  constructor({ totalOvers = 2, team1, team2 } = {}) {
    this.totalOvers = totalOvers;
    this.team1 = team1;
    this.team2 = team2;

    this.currentInningsNumber = 1;
    this.battingTeam = team1;
    this.bowlingTeam = team2;
    this.target = null;

    // Innings Score State
    this.runs = 0;
    this.wickets = 0;
    this.completedOvers = 0;
    this.legalBallsInOver = 0;
    this.totalLegalBalls = 0;
    this.totalDeliveriesBowled = 0; // includes extras

    // Extras breakdown
    this.extras = {
      wides: 0,
      noBalls: 0,
      legByes: 0,
      byes: 0,
      total: 0
    };

    // Strike and Bowler
    this.strikerIndex = 0;
    this.nonStrikerIndex = 1;
    this.currentBowlerIndex = 9;
    this.previousBowlerIndex = null;
    this.currentOverRunsConceded = 0;

    // Over ball badges & last ball display
    this.thisOverBalls = [];
    this.lastDeliveryResult = null;

    // Deduplication set to strictly prevent duplicate scoring
    this.processedDeliveries = new Set();
    this.isMatchOver = false;

    // Roster Stats
    this.innings1Card = null;
    this.innings2Card = null;
    this.initRosters();
  }

  resetMatch() {
    this.currentInningsNumber = 1;
    this.battingTeam = this.team1;
    this.bowlingTeam = this.team2;
    this.target = null;
    this.isMatchOver = false;
    this.innings1Card = null;
    this.innings2Card = null;
    this.resetInningsState();
  }

  resetInningsState() {
    this.runs = 0;
    this.wickets = 0;
    this.completedOvers = 0;
    this.legalBallsInOver = 0;
    this.totalLegalBalls = 0;
    this.totalDeliveriesBowled = 0;
    this.extras = { wides: 0, noBalls: 0, legByes: 0, byes: 0, total: 0 };
    this.thisOverBalls = [];
    this.lastDeliveryResult = null;
    this.strikerIndex = 0;
    this.nonStrikerIndex = 1;
    this.currentBowlerIndex = 9;
    this.previousBowlerIndex = null;
    this.currentOverRunsConceded = 0;
    this.processedDeliveries.clear();
    this.initRosters();
  }

  initRosters() {
    this.batterStats = this.battingTeam.players.map((p, idx) => ({
      index: idx,
      name: p.name,
      number: p.number,
      face: p.face,
      role: p.role,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
      dismissal: 'Not out'
    }));

    this.bowlerStats = this.bowlingTeam.players.map((p, idx) => ({
      index: idx,
      name: p.name,
      number: p.number,
      face: p.face,
      role: p.role,
      legalBalls: 0,
      overs: 0,
      maidens: 0,
      runsConceded: 0,
      wickets: 0
    }));
  }

  getStriker() {
    return this.batterStats[this.strikerIndex];
  }

  getNonStriker() {
    return this.batterStats[this.nonStrikerIndex];
  }

  getCurrentBowler() {
    return this.bowlerStats[this.currentBowlerIndex];
  }

  // Pure delivery processor
  processDelivery(delivery) {
    if (this.isMatchOver) {
      return { success: false, matchOver: true, reason: 'Match is already completed' };
    }

    if (!delivery || !delivery.deliveryId) {
      return { success: false, reason: 'Invalid delivery or missing deliveryId' };
    }

    // Deduplication check
    if (this.processedDeliveries.has(delivery.deliveryId)) {
      return { success: false, duplicate: true, reason: 'Delivery already processed' };
    }
    this.processedDeliveries.add(delivery.deliveryId);

    this.totalDeliveriesBowled++;
    const outcome = delivery.outcome || OUTCOME_TYPES.DOT;
    const runsOffBat = delivery.runs || 0;
    const striker = this.getStriker();
    const bowler = this.getCurrentBowler();

    let isLegalBall = true;
    let runsScoredThisBall = 0;
    let badgeText = '0';
    let dismissalDetail = null;

    switch (outcome) {
      case OUTCOME_TYPES.WIDE:
        isLegalBall = false;
        const widePenalty = 1 + runsOffBat;
        this.runs += widePenalty;
        bowler.runsConceded += widePenalty;
        this.extras.wides += widePenalty;
        this.extras.total += widePenalty;
        this.currentOverRunsConceded += widePenalty;
        runsScoredThisBall = widePenalty;
        badgeText = widePenalty > 1 ? `${widePenalty}WD` : 'WD';
        break;

      case OUTCOME_TYPES.NO_BALL:
        isLegalBall = false;
        const nbPenalty = 1 + runsOffBat;
        this.runs += nbPenalty;
        striker.runs += runsOffBat;
        if (runsOffBat === 4) striker.fours++;
        if (runsOffBat === 6) striker.sixes++;
        bowler.runsConceded += nbPenalty;
        this.extras.noBalls += 1;
        this.extras.total += 1;
        this.currentOverRunsConceded += nbPenalty;
        runsScoredThisBall = nbPenalty;
        badgeText = runsOffBat > 0 ? `${runsOffBat}NB` : 'NB';
        if (runsOffBat % 2 === 1) this.rotateStrike();
        break;

      case OUTCOME_TYPES.LEG_BYE:
        isLegalBall = true;
        striker.balls++;
        this.runs += runsOffBat;
        this.extras.legByes += runsOffBat;
        this.extras.total += runsOffBat;
        runsScoredThisBall = runsOffBat;
        badgeText = `${runsOffBat}LB`;
        if (runsOffBat % 2 === 1) this.rotateStrike();
        break;

      case OUTCOME_TYPES.WICKET:
        isLegalBall = true;
        striker.balls++;
        this.wickets++;

        const dismissalType = delivery.dismissalType || DISMISSAL_TYPES.BOWLED;
        dismissalDetail = delivery.reason || dismissalType;

        if (dismissalType === DISMISSAL_TYPES.RUN_OUT) {
          // Completed runs prior to run out
          const completedRuns = delivery.completedRuns || 0;
          this.runs += completedRuns;
          striker.runs += completedRuns;
          // Bowler does NOT receive credit for a run out
          const isStrikerOut = delivery.whoOut !== 'NON_STRIKER';
          if (isStrikerOut) {
            striker.isOut = true;
            striker.dismissal = `Run out (${dismissalDetail})`;
            this.bringInNextBatter(true);
          } else {
            const nonStriker = this.getNonStriker();
            nonStriker.isOut = true;
            nonStriker.dismissal = `Run out (${dismissalDetail})`;
            this.bringInNextBatter(false);
          }
          if (completedRuns % 2 === 1) this.rotateStrike();
          badgeText = completedRuns > 0 ? `${completedRuns}W` : 'W';
        } else {
          // Bowler credited wicket (Bowled, Caught, Stumped, LBW)
          bowler.wickets++;
          striker.isOut = true;
          striker.dismissal = dismissalDetail;
          this.bringInNextBatter(true);
          badgeText = 'W';
        }
        break;

      case OUTCOME_TYPES.FOUR:
        isLegalBall = true;
        striker.balls++;
        striker.runs += 4;
        striker.fours++;
        this.runs += 4;
        bowler.runsConceded += 4;
        this.currentOverRunsConceded += 4;
        runsScoredThisBall = 4;
        badgeText = '4';
        break;

      case OUTCOME_TYPES.SIX:
        isLegalBall = true;
        striker.balls++;
        striker.runs += 6;
        striker.sixes++;
        this.runs += 6;
        bowler.runsConceded += 6;
        this.currentOverRunsConceded += 6;
        runsScoredThisBall = 6;
        badgeText = '6';
        break;

      case OUTCOME_TYPES.RUNS:
      case OUTCOME_TYPES.DOT:
      default:
        isLegalBall = true;
        striker.balls++;
        striker.runs += runsOffBat;
        this.runs += runsOffBat;
        bowler.runsConceded += runsOffBat;
        this.currentOverRunsConceded += runsOffBat;
        runsScoredThisBall = runsOffBat;
        badgeText = `${runsOffBat}`;
        if (runsOffBat % 2 === 1) {
          this.rotateStrike();
        }
        break;
    }

    if (isLegalBall) {
      this.legalBallsInOver++;
      this.totalLegalBalls++;
      bowler.legalBalls++;
    }

    this.thisOverBalls.push(badgeText);
    this.lastDeliveryResult = {
      outcome,
      runs: runsScoredThisBall,
      badgeText,
      isLegalBall,
      dismissalDetail
    };

    // --- CHECK INNINGS / MATCH OUTCOME ---

    // 1. Target chased in 2nd innings
    if (this.currentInningsNumber === 2 && this.target !== null && this.runs >= this.target) {
      this.isMatchOver = true;
      const matchResult = this.finalizeMatch();
      return {
        success: true,
        matchOver: true,
        winner: this.battingTeam.name,
        margin: `${10 - this.wickets} wickets`,
        matchResult
      };
    }

    // 2. All Out (10 wickets)
    if (this.wickets >= 10) {
      return this.handleInningsEnd('All Out');
    }

    // 3. Over Completion (6 legal deliveries)
    if (this.legalBallsInOver >= 6) {
      this.completedOvers++;
      bowler.overs++;
      // Check Maiden Over (6 legal balls, 0 runs conceded)
      if (this.currentOverRunsConceded === 0) {
        bowler.maidens++;
      }

      this.legalBallsInOver = 0;
      this.currentOverRunsConceded = 0;
      this.thisOverBalls = [];
      this.rotateStrike(); // Strike rotates at end of over

      // Check Overs Limit Reached
      if (this.completedOvers >= this.totalOvers) {
        return this.handleInningsEnd('Overs Completed');
      }

      // Rotate Bowler for next over
      this.rotateBowler();

      return {
        success: true,
        overComplete: true,
        completedOvers: this.completedOvers,
        newBowler: this.getCurrentBowler().name
      };
    }

    return {
      success: true,
      overComplete: false,
      runsScoredThisBall,
      totalRuns: this.runs,
      totalWickets: this.wickets
    };
  }

  bringInNextBatter(isStriker) {
    const nextIndex = Math.max(this.strikerIndex, this.nonStrikerIndex) + 1;
    if (nextIndex < this.batterStats.length) {
      if (isStriker) {
        this.strikerIndex = nextIndex;
      } else {
        this.nonStrikerIndex = nextIndex;
      }
    }
  }

  rotateStrike() {
    const temp = this.strikerIndex;
    this.strikerIndex = this.nonStrikerIndex;
    this.nonStrikerIndex = temp;
  }

  rotateBowler() {
    this.previousBowlerIndex = this.currentBowlerIndex;
    // Pick another frontline bowler from squad (indices 8, 9, 10)
    const options = [8, 9, 10].filter(i => i !== this.previousBowlerIndex);
    this.currentBowlerIndex = options[Math.floor(Math.random() * options.length)] || 9;
  }

  handleInningsEnd(reason) {
    if (this.currentInningsNumber === 1) {
      // Archive Innings 1 scorecard snapshot
      this.innings1Card = this.generateInningsScorecardSnapshot();

      this.target = this.runs + 1;
      this.currentInningsNumber = 2;

      // Swap batting and fielding teams
      const temp = this.battingTeam;
      this.battingTeam = this.bowlingTeam;
      this.bowlingTeam = temp;

      // Reset innings state
      this.resetInningsState();

      return {
        success: true,
        inningsBreak: true,
        target: this.target,
        reason
      };
    } else {
      // Innings 2 ended -> Match Finished
      this.isMatchOver = true;
      this.innings2Card = this.generateInningsScorecardSnapshot();
      const matchResult = this.finalizeMatch();
      return {
        success: true,
        matchOver: true,
        ...matchResult
      };
    }
  }

  finalizeMatch() {
    if (!this.innings2Card) {
      this.innings2Card = this.generateInningsScorecardSnapshot();
    }

    let winner = 'DRAW';
    let margin = '';

    if (this.runs >= this.target) {
      winner = this.battingTeam.name;
      margin = `${10 - this.wickets} wickets`;
    } else if (this.runs === this.target - 1) {
      winner = 'TIE';
      margin = 'Match Tied';
    } else {
      winner = this.bowlingTeam.name;
      const runsMargin = (this.target - 1) - this.runs;
      margin = `${runsMargin} runs`;
    }

    return {
      winner,
      margin,
      innings1: this.innings1Card,
      innings2: this.innings2Card
    };
  }

  generateInningsScorecardSnapshot() {
    return {
      teamName: this.battingTeam.name,
      shortName: this.battingTeam.shortName,
      runs: this.runs,
      wickets: this.wickets,
      overs: `${this.completedOvers}.${this.legalBallsInOver}`,
      extras: { ...this.extras },
      batters: this.batterStats.map(b => ({
        name: b.name,
        runs: b.runs,
        balls: b.balls,
        fours: b.fours,
        sixes: b.sixes,
        strikeRate: b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0',
        dismissal: b.dismissal,
        isOut: b.isOut
      })),
      bowlers: this.bowlerStats.filter(bw => bw.legalBalls > 0).map(bw => ({
        name: bw.name,
        overs: `${Math.floor(bw.legalBalls / 6)}.${bw.legalBalls % 6}`,
        maidens: bw.maidens,
        runsConceded: bw.runsConceded,
        wickets: bw.wickets,
        economy: bw.legalBalls > 0 ? ((bw.runsConceded / bw.legalBalls) * 6).toFixed(2) : '0.00'
      }))
    };
  }

  // Live scoreboard model
  getScoreboardSnapshot() {
    const striker = this.getStriker();
    const nonStriker = this.getNonStriker();
    const bowler = this.getCurrentBowler();

    const currentRR = this.totalLegalBalls > 0
      ? ((this.runs / this.totalLegalBalls) * 6).toFixed(2)
      : '0.00';

    let requiredRR = null;
    let runsNeeded = null;
    let ballsRemaining = null;

    if (this.currentInningsNumber === 2 && this.target !== null) {
      runsNeeded = Math.max(0, this.target - this.runs);
      ballsRemaining = Math.max(0, (this.totalOvers * 6) - this.totalLegalBalls);
      requiredRR = ballsRemaining > 0
        ? ((runsNeeded / ballsRemaining) * 6).toFixed(2)
        : '0.00';
    }

    return {
      innings: this.currentInningsNumber,
      battingTeamName: this.battingTeam.name,
      battingTeamShort: this.battingTeam.shortName,
      bowlingTeamName: this.bowlingTeam.name,
      bowlingTeamShort: this.bowlingTeam.shortName,
      runs: this.runs,
      wickets: this.wickets,
      oversString: `${this.completedOvers}.${this.legalBallsInOver}`,
      totalOvers: this.totalOvers,
      totalLegalBalls: this.totalLegalBalls,
      currentRunRate: currentRR,
      target: this.target,
      runsNeeded,
      ballsRemaining,
      requiredRunRate: requiredRR,
      striker: {
        name: striker ? striker.name : '',
        runs: striker ? striker.runs : 0,
        balls: striker ? striker.balls : 0,
        fours: striker ? striker.fours : 0,
        sixes: striker ? striker.sixes : 0,
        strikeRate: striker && striker.balls > 0 ? ((striker.runs / striker.balls) * 100).toFixed(1) : '0.0'
      },
      nonStriker: {
        name: nonStriker ? nonStriker.name : '',
        runs: nonStriker ? nonStriker.runs : 0,
        balls: nonStriker ? nonStriker.balls : 0
      },
      bowler: {
        name: bowler ? bowler.name : '',
        overs: bowler ? `${Math.floor(bowler.legalBalls / 6)}.${bowler.legalBalls % 6}` : '0.0',
        maidens: bowler ? bowler.maidens : 0,
        runsConceded: bowler ? bowler.runsConceded : 0,
        wickets: bowler ? bowler.wickets : 0,
        economy: bowler && bowler.legalBalls > 0 ? ((bowler.runsConceded / bowler.legalBalls) * 6).toFixed(2) : '0.00'
      },
      thisOverBadges: [...this.thisOverBalls],
      lastBall: this.lastDeliveryResult,
      extras: { ...this.extras }
    };
  }
}
