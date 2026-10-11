// Local Tournament Manager with League Table, Knockout Progression, and LocalStorage Persistence

import { TEAMS } from '../gameState.js';

const STORAGE_KEY = 'cricket_legends_tournament_v1';

export class TournamentManager {
  constructor() {
    this.teams = TEAMS;
    this.currentMatchIndex = 0;
    this.standings = [];
    this.fixtures = [];
    this.isCompleted = false;
    this.champion = null;

    this.loadOrInitialize();
  }

  loadOrInitialize() {
    const saved = this.loadFromStorage();
    if (saved && this.validateTournamentData(saved)) {
      this.currentMatchIndex = saved.currentMatchIndex;
      this.standings = saved.standings;
      this.fixtures = saved.fixtures;
      this.isCompleted = saved.isCompleted;
      this.champion = saved.champion;
    } else {
      this.resetTournament();
    }
  }

  resetTournament() {
    this.currentMatchIndex = 0;
    this.isCompleted = false;
    this.champion = null;

    // Initialize points table
    this.standings = this.teams.map(t => ({
      name: t.name,
      shortName: t.shortName,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      points: 0,
      runsScored: 0,
      runsConceded: 0,
      nrr: '+0.00'
    }));

    // Generate round-robin fixtures (6 matches) + 1 Grand Final (match 7)
    this.fixtures = [
      { id: 1, teamA: 'India', teamB: 'Australia', stage: 'League Stage', played: false, winner: null },
      { id: 2, teamA: 'England', teamB: 'Pakistan', stage: 'League Stage', played: false, winner: null },
      { id: 3, teamA: 'India', teamB: 'England', stage: 'League Stage', played: false, winner: null },
      { id: 4, teamA: 'Australia', teamB: 'Pakistan', stage: 'League Stage', played: false, winner: null },
      { id: 5, teamA: 'India', teamB: 'Pakistan', stage: 'League Stage', played: false, winner: null },
      { id: 6, teamA: 'Australia', teamB: 'England', stage: 'League Stage', played: false, winner: null },
      { id: 7, teamA: 'TBD', teamB: 'TBD', stage: '🏆 Grand Final', played: false, winner: null }
    ];

    this.saveToStorage();
  }

  getCurrentFixture() {
    if (this.currentMatchIndex >= this.fixtures.length) return null;
    const fix = this.fixtures[this.currentMatchIndex];
    if (fix.id === 7 && fix.teamA === 'TBD') {
      // Setup Finalists from top 2 teams in points table
      this.sortStandings();
      fix.teamA = this.standings[0].name;
      fix.teamB = this.standings[1].name;
      this.saveToStorage();
    }
    return fix;
  }

  recordMatchResult({ teamA, teamB, runsA, runsB, winner }) {
    const fixture = this.fixtures[this.currentMatchIndex];
    if (!fixture) return;

    fixture.played = true;
    fixture.winner = winner;

    if (fixture.id < 7) {
      // League Stage: Update Points Table
      const rowA = this.standings.find(s => s.name === teamA);
      const rowB = this.standings.find(s => s.name === teamB);

      if (rowA && rowB) {
        rowA.played++;
        rowB.played++;
        rowA.runsScored += runsA;
        rowA.runsConceded += runsB;
        rowB.runsScored += runsB;
        rowB.runsConceded += runsA;

        if (winner === teamA) {
          rowA.won++;
          rowA.points += 2;
          rowB.lost++;
        } else if (winner === teamB) {
          rowB.won++;
          rowB.points += 2;
          rowA.lost++;
        } else {
          rowA.tied++;
          rowB.tied++;
          rowA.points += 1;
          rowB.points += 1;
        }

        // Calculate simple NRR
        rowA.nrr = ((rowA.runsScored - rowA.runsConceded) / Math.max(1, rowA.played * 2)).toFixed(2);
        rowB.nrr = ((rowB.runsScored - rowB.runsConceded) / Math.max(1, rowB.played * 2)).toFixed(2);
      }

      this.sortStandings();
    } else {
      // Grand Final
      this.isCompleted = true;
      this.champion = winner;
    }

    this.currentMatchIndex++;
    if (this.currentMatchIndex === 6) {
      // Set finalists
      this.sortStandings();
      this.fixtures[6].teamA = this.standings[0].name;
      this.fixtures[6].teamB = this.standings[1].name;
    }

    this.saveToStorage();
  }

  sortStandings() {
    this.standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return parseFloat(b.nrr) - parseFloat(a.nrr);
    });
  }

  saveToStorage() {
    try {
      if (typeof localStorage === 'undefined') return;
      const data = {
        currentMatchIndex: this.currentMatchIndex,
        standings: this.standings,
        fixtures: this.fixtures,
        isCompleted: this.isCompleted,
        champion: this.champion
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  loadFromStorage() {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Corrupted tournament save data, resetting:', e);
      return null;
    }
  }

  validateTournamentData(data) {
    if (!data || typeof data !== 'object') return false;
    if (typeof data.currentMatchIndex !== 'number') return false;
    if (!Array.isArray(data.standings) || data.standings.length !== 4) return false;
    if (!Array.isArray(data.fixtures) || data.fixtures.length !== 7) return false;
    return true;
  }
}
