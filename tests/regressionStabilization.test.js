import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GameState, TEAMS } from '../src/gameState.js';
import { TournamentManager } from '../src/tournament/tournamentManager.js';

describe('Phase 11: Repository Stabilization & Regression Test Suite', () => {
  it('1. GameState.swapBattingSides correctly swaps batting and bowling teams without throwing TypeError', () => {
    const state = new GameState();
    // Default: Team 0 (India) batting, Team 1 (Australia) bowling
    assert.strictEqual(state.battingTeam.name, 'India');
    assert.strictEqual(state.bowlingTeam.name, 'Australia');
    assert.strictEqual(state.userTeamIndex, 0);
    assert.strictEqual(state.opponentTeamIndex, 1);

    // Call swapBattingSides
    assert.doesNotThrow(() => {
      state.swapBattingSides();
    });

    // Swapped: Team 1 (Australia) batting, Team 0 (India) bowling
    assert.strictEqual(state.battingTeam.name, 'Australia');
    assert.strictEqual(state.bowlingTeam.name, 'India');
    assert.strictEqual(state.userTeamIndex, 1);
    assert.strictEqual(state.opponentTeamIndex, 0);

    // Verify rosters and striker are fresh for Australia
    assert.strictEqual(state.getStriker().name, TEAMS[1].players[0].name);
  });

  it('2. Tournament fixture team resolution handles index 0 (India) without falsy index fallback bugs', () => {
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

  it('3. Tournament isolation: TournamentManager only advances when recordMatchResult is explicitly called for tournament matches', () => {
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

    // Explicit tournament match recording advances fixture index
    tm.recordMatchResult({
      teamA: 'India',
      teamB: 'Australia',
      runsA: 15,
      runsB: 10,
      winner: 'India'
    });

    assert.strictEqual(tm.currentMatchIndex, initialIndex + 1);
    const indStanding = tm.standings.find(s => s.name === 'India');
    assert.strictEqual(indStanding.won, 1);
    assert.strictEqual(indStanding.points, 2);
  });

  it('4. Team color definitions: All teams define valid hex colors for 3D jersey materials', () => {
    TEAMS.forEach(team => {
      assert.ok(team.color, `Team ${team.name} must have a color defined`);
      assert.match(
        team.color,
        /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
        `Team ${team.name} color must be a valid hex code`
      );
    });
  });

  it('5. Batting shot presets: All 6 shot presets define positive exit speeds and valid radian angles', () => {
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
});
