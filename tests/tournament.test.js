import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TournamentManager } from '../src/tournament/tournamentManager.js';

describe('Tournament Mode & League Progression Test Suite', () => {
  it('1. Initializes with 4 teams, 7 fixtures, and clean standings', () => {
    const tm = new TournamentManager();
    assert.equal(tm.standings.length, 4);
    assert.equal(tm.fixtures.length, 7);
    assert.equal(tm.currentMatchIndex, 0);
    assert.equal(tm.isCompleted, false);
    assert.equal(tm.champion, null);

    // Initial points for all teams should be 0
    tm.standings.forEach(row => {
      assert.equal(row.played, 0);
      assert.equal(row.won, 0);
      assert.equal(row.points, 0);
    });
  });

  it('2. Records match wins and ties with correct points and runs', () => {
    const tm = new TournamentManager();
    
    // Match 1: India vs Australia, India wins
    tm.recordMatchResult({
      teamA: 'India',
      teamB: 'Australia',
      runsA: 28,
      runsB: 20,
      winner: 'India'
    });

    const india = tm.standings.find(s => s.name === 'India');
    const aus = tm.standings.find(s => s.name === 'Australia');

    assert.equal(india.played, 1);
    assert.equal(india.won, 1);
    assert.equal(india.points, 2);
    assert.equal(india.runsScored, 28);
    assert.equal(india.runsConceded, 20);

    assert.equal(aus.played, 1);
    assert.equal(aus.lost, 1);
    assert.equal(aus.points, 0);
    assert.equal(aus.runsScored, 20);
    assert.equal(aus.runsConceded, 28);

    // Match 2: England vs Pakistan, Tie
    tm.recordMatchResult({
      teamA: 'England',
      teamB: 'Pakistan',
      runsA: 15,
      runsB: 15,
      winner: 'TIE'
    });

    const eng = tm.standings.find(s => s.name === 'England');
    const pak = tm.standings.find(s => s.name === 'Pakistan');

    assert.equal(eng.points, 1);
    assert.equal(eng.tied, 1);
    assert.equal(pak.points, 1);
    assert.equal(pak.tied, 1);
  });

  it('3. Standings are ranked by points then Net Run Rate (NRR)', () => {
    const tm = new TournamentManager();
    
    // Play remaining matches with India dominant
    tm.recordMatchResult({ teamA: 'India', teamB: 'Australia', runsA: 40, runsB: 10, winner: 'India' });
    tm.recordMatchResult({ teamA: 'England', teamB: 'Pakistan', runsA: 25, runsB: 15, winner: 'England' });
    tm.recordMatchResult({ teamA: 'India', teamB: 'England', runsA: 35, runsB: 20, winner: 'India' });

    assert.equal(tm.standings[0].name, 'India');
    assert.equal(tm.standings[0].points, 4);
    assert(parseFloat(tm.standings[0].nrr) > 0);
  });

  it('4. Grand Final automatically pits top 2 teams after league stage', () => {
    const tm = new TournamentManager();
    
    // Play all 6 league matches
    tm.recordMatchResult({ teamA: 'India', teamB: 'Australia', runsA: 30, runsB: 20, winner: 'India' });
    tm.recordMatchResult({ teamA: 'England', teamB: 'Pakistan', runsA: 25, runsB: 26, winner: 'Pakistan' });
    tm.recordMatchResult({ teamA: 'India', teamB: 'England', runsA: 40, runsB: 25, winner: 'India' });
    tm.recordMatchResult({ teamA: 'Australia', teamB: 'Pakistan', runsA: 18, runsB: 35, winner: 'Pakistan' });
    tm.recordMatchResult({ teamA: 'India', teamB: 'Pakistan', runsA: 32, runsB: 28, winner: 'India' });
    tm.recordMatchResult({ teamA: 'Australia', teamB: 'England', runsA: 20, runsB: 21, winner: 'England' });

    assert.equal(tm.currentMatchIndex, 6);
    const finalFixture = tm.getCurrentFixture();
    assert.equal(finalFixture.id, 7);
    assert.equal(finalFixture.stage, '🏆 Grand Final');
    // Top 2 should be India and Pakistan
    assert.equal(finalFixture.teamA, 'India');
    assert.equal(finalFixture.teamB, 'Pakistan');

    // Play Grand Final
    tm.recordMatchResult({
      teamA: 'India',
      teamB: 'Pakistan',
      runsA: 36,
      runsB: 30,
      winner: 'India'
    });

    assert.equal(tm.isCompleted, true);
    assert.equal(tm.champion, 'India');
  });

  it('5. Validates corrupted save data gracefully and resets without crash', () => {
    const tm = new TournamentManager();

    // Invalid objects
    assert.equal(tm.validateTournamentData(null), false);
    assert.equal(tm.validateTournamentData('invalid string'), false);
    assert.equal(tm.validateTournamentData({}), false);
    assert.equal(tm.validateTournamentData({ currentMatchIndex: 'not a number' }), false);
    assert.equal(tm.validateTournamentData({ currentMatchIndex: 0, standings: [] }), false);

    // Valid object
    const valid = {
      currentMatchIndex: 2,
      standings: [{}, {}, {}, {}],
      fixtures: [{}, {}, {}, {}, {}, {}, {}],
      isCompleted: false,
      champion: null
    };
    assert.equal(tm.validateTournamentData(valid), true);
  });
});
