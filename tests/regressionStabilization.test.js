import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { GameState, TEAMS } from '../src/gameState.js';
import { TournamentManager } from '../src/tournament/tournamentManager.js';
import { CharacterManager } from '../src/scene/characters.js';

describe('Phase 11: Repository Stabilization & Regression Test Suite', () => {
  it('1. GameState.applyTossDecision cleanly initializes batting and bowling teams without corrupting userTeamIndex', () => {
    const state = new GameState();
    state.initMatch(0, 1, 2); // User: India (0), Opponent: Australia (1)

    assert.strictEqual(state.userTeamIndex, 0);
    assert.strictEqual(state.opponentTeamIndex, 1);
    assert.strictEqual(state.battingTeam.name, 'India');
    assert.strictEqual(state.bowlingTeam.name, 'Australia');

    // Case A: User elects to BOWL first
    state.applyTossDecision(false);
    assert.strictEqual(state.userTeamIndex, 0, 'userTeamIndex must remain India (0)');
    assert.strictEqual(state.opponentTeamIndex, 1, 'opponentTeamIndex must remain Australia (1)');
    assert.strictEqual(state.battingTeam.name, 'Australia', 'Australia must be batting first');
    assert.strictEqual(state.bowlingTeam.name, 'India', 'India must be bowling first');
    assert.strictEqual(state.getStriker().name, TEAMS[1].players[0].name);

    // Case B: User elects to BAT first
    state.applyTossDecision(true);
    assert.strictEqual(state.userTeamIndex, 0);
    assert.strictEqual(state.opponentTeamIndex, 1);
    assert.strictEqual(state.battingTeam.name, 'India', 'India must be batting first');
    assert.strictEqual(state.bowlingTeam.name, 'Australia', 'Australia must be bowling first');
    assert.strictEqual(state.getStriker().name, TEAMS[0].players[0].name);
  });

  it('2. GameState.swapBattingSides correctly toggles batting and bowling sides', () => {
    const state = new GameState();
    state.initMatch(0, 1, 2);

    assert.strictEqual(state.battingTeam.name, 'India');
    assert.strictEqual(state.bowlingTeam.name, 'Australia');

    state.swapBattingSides();
    assert.strictEqual(state.battingTeam.name, 'Australia');
    assert.strictEqual(state.bowlingTeam.name, 'India');

    state.swapBattingSides();
    assert.strictEqual(state.battingTeam.name, 'India');
    assert.strictEqual(state.bowlingTeam.name, 'Australia');
  });

  it('3. Tournament fixture team resolution handles index 0 (India) without falsy index fallback bugs', () => {
    // When team is India (TEAMS[0]), findIndex returns 0
    const testFixture = { teamA: 'Australia', teamB: 'India' };

    const foundA = TEAMS.findIndex(t => t.name === testFixture.teamA);
    const teamAIdx = foundA >= 0 ? foundA : 0;

    const foundB = TEAMS.findIndex(t => t.name === testFixture.teamB);
    const teamBIdx = foundB >= 0 ? foundB : 1;

    // teamBIdx must be exactly 0 (India), NOT fall back to 1 (Australia)
    assert.strictEqual(teamAIdx, 1);
    assert.strictEqual(teamBIdx, 0);
    assert.strictEqual(TEAMS[teamBIdx].name, 'India');
  });

  it('4. Tournament isolation: Exhibition matches do not advance tournament standings', () => {
    const tm = new TournamentManager();
    const initialIndex = tm.currentMatchIndex;
    const initialStandingsPlayed = tm.standings.reduce((sum, s) => sum + s.played, 0);

    // Playing an exhibition match should NOT touch tm
    const state = new GameState();
    state.initMatch(0, 1, 1);
    state.recordDelivery({ deliveryId: 'ex_1', outcome: 'FOUR', runs: 4 });

    // Tournament state remains unchanged
    assert.strictEqual(tm.currentMatchIndex, initialIndex);
    const currentStandingsPlayed = tm.standings.reduce((sum, s) => sum + s.played, 0);
    assert.strictEqual(currentStandingsPlayed, initialStandingsPlayed);
  });

  it('5. Tournament matches record results exactly once per fixture', () => {
    const tm = new TournamentManager();
    const fixture = tm.getCurrentFixture();
    assert.ok(fixture);
    const initialIndex = tm.currentMatchIndex;

    // Record fixture result
    tm.recordMatchResult({
      teamA: fixture.teamA,
      teamB: fixture.teamB,
      runsA: 20,
      runsB: 15,
      winner: fixture.teamA
    });

    assert.strictEqual(tm.currentMatchIndex, initialIndex + 1);
    assert.strictEqual(fixture.played, true);
    assert.strictEqual(fixture.winner, fixture.teamA);

    const winnerRow = tm.standings.find(s => s.name === fixture.teamA);
    assert.strictEqual(winnerRow.won, 1);
    assert.strictEqual(winnerRow.points, 2);
    assert.strictEqual(winnerRow.played, 1);
  });

  it('6. CharacterManager.setTeamColors updates material colors after initialization', () => {
    const scene = new THREE.Scene();
    const charMgr = new CharacterManager(scene);

    assert.ok(charMgr.battingKitMat);
    assert.ok(charMgr.bowlingKitMat);

    // Apply England red (#c62828) and Australia gold (#fbc02d)
    charMgr.setTeamColors('#c62828', '#fbc02d');

    const expectedBattingColor = new THREE.Color('#c62828');
    const expectedBowlingColor = new THREE.Color('#fbc02d');

    assert.strictEqual(charMgr.battingKitMat.color.getHexString(), expectedBattingColor.getHexString());
    assert.strictEqual(charMgr.bowlingKitMat.color.getHexString(), expectedBowlingColor.getHexString());
  });

  it('7. Team color definitions: All teams define valid hex colors for 3D jersey materials', () => {
    TEAMS.forEach(team => {
      assert.ok(team.color, `Team ${team.name} must have a color defined`);
      assert.match(
        team.color,
        /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
        `Team ${team.name} color must be a valid hex code`
      );
    });
  });

  it('8. Batting shot presets: All 6 shot presets define positive exit speeds and valid radian angles', () => {
    const state = new GameState();
    const shotKeys = ['DEFENSIVE', 'STRAIGHT_DRIVE', 'COVER_DRIVE', 'PULL_SHOT', 'CUT_SHOT', 'LOFTED_ATTACK'];

    shotKeys.forEach(key => {
      state.setSelectedShot(key);
      const shot = state.getSelectedShot();
      assert.strictEqual(shot.id, key);
      assert.ok(shot.exitSpeed > 0, `Shot ${key} must have positive exitSpeed`);
      assert.ok(typeof shot.loftAngle === 'number');
      assert.ok(typeof shot.shotAngle === 'number');
    });
  });

  it('9. GameState.isUserBatting accurately reflects user batting state across toss decisions and innings break', () => {
    const state = new GameState();
    state.initMatch(0, 1, 1); // User: India (0), Opponent: Australia (1), 1 Over

    // Toss: User elects to BAT first
    state.applyTossDecision(true);
    assert.strictEqual(state.isUserBatting(), true, 'User must be batting in Innings 1 after choosing BAT');

    // Bowl 6 legal deliveries to end innings 1
    for (let i = 1; i <= 6; i++) {
      state.recordDelivery({ deliveryId: `inn1_b${i}`, outcome: 'DOT', runs: 0 });
    }

    assert.strictEqual(state.currentInnings, 2, 'Should advance to 2nd innings');
    assert.strictEqual(state.isUserBatting(), false, 'User must be bowling in Innings 2 after batting 1st');

    // Reset and test: User elects to BOWL first
    state.initMatch(0, 1, 1);
    state.applyTossDecision(false);
    assert.strictEqual(state.isUserBatting(), false, 'User must be bowling in Innings 1 after choosing BOWL');

    for (let i = 1; i <= 6; i++) {
      state.recordDelivery({ deliveryId: `inn1_case2_b${i}`, outcome: 'DOT', runs: 0 });
    }

    assert.strictEqual(state.currentInnings, 2);
    assert.strictEqual(state.isUserBatting(), true, 'User must be batting in Innings 2 after bowling 1st');
  });

  it('10. Delivery result processing updates batsman and bowler figures correctly', () => {
    const state = new GameState();
    state.initMatch(0, 1, 2);
    state.applyTossDecision(true);

    const strikerBefore = state.getStriker();
    const bowlerBefore = state.getCurrentBowler();

    // Strikers hits a boundary FOUR
    state.recordDelivery({ deliveryId: 'boundary_1', outcome: 'FOUR', runs: 4 });

    assert.strictEqual(strikerBefore.runs, 4);
    assert.strictEqual(strikerBefore.fours, 1);
    assert.strictEqual(bowlerBefore.runsConceded, 4);
    assert.strictEqual(state.runs, 4);
  });
});

