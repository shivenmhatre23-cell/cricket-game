# Cricket Legends — Phase 9: Tournament & Career System Checklist

## Team System
- [x] Create `PlayerData` model with skills (50–99), roles, and career statistics.
- [x] Create `TeamData` with fictional names, primary/secondary colors, emblems, and squads.
- [x] Create 8 default fictional teams (MBL, LMO, MST, CPT, SYP, KRO, KFA, AKW).
- [x] Zero real-world player likenesses or protected trademarks used.

## Tournament Formats & Progression
- [x] Create `TournamentFormatType` (`Knockout` and `RoundRobinLeague`).
- [x] Create `TournamentFixture` tracking scores, wickets, overs, and winners.
- [x] Create `TeamStanding` with official Net Run Rate (NRR) computation and tie-breaking comparisons.
- [x] Implement `TournamentManager` central progression service.
- [x] Automatic bracket scheduling (Semi-Finals $\rightarrow$ Final for Knockout).
- [x] Automatic Grand Final scheduling between Top 2 teams in Round-Robin.
- [x] Strict invariant: Fixture results are recorded **exactly once** (`_completedFixtureIds`).
- [x] Strict invariant: A completed tournament cannot advance twice.

## Local Career Progression
- [x] Create `CareerManager` managing team selection and season schedules.
- [x] Track career matches played, matches won, win percentage, and trophy cabinet.
- [x] Tournament tier unlock progression (Tier 1 $\rightarrow$ Tier 2 $\rightarrow$ Tier 3).
- [x] Viewable match history logs (`CareerMatchLog`).
- [x] 100% offline, free of pay-to-win mechanics or online dependencies.

## Local Persistence & Graceful Recovery
- [x] JSON serialization with `SaveHeader` (`SchemaVersion = 1`).
- [x] Validate loaded schema version, standings, and fixtures data.
- [x] Handle missing, corrupted, or outdated save files gracefully without crash.
- [x] In-memory fallback storage for unit testing without disk I/O dependency.

## Automated Acceptance Tests (`TournamentAndCareerTests.cs`)
- [x] `KnockoutTournament_ProgressesFromSemifinalsToFinalAndCrownsChampion`
- [x] `RoundRobinTournament_PlaysAllFixtures_TopTwoPlayGrandFinal`
- [x] `StandingsRanking_RanksByPointsThenNetRunRate`
- [x] `DuplicateMatchResults_AreRejectedIdempotently`
- [x] `CompletedTournament_CannotAccidentallyAdvanceTwice`
- [x] `SaveAndLoad_RestoresTournamentStateIdentically`
- [x] `CorruptedOrMissingSave_IsHandledGracefullyWithoutCrashing`
- [x] `CareerManager_TracksMatchHistory_AndUnlocksTiers`
- [x] Web test suite passing 17/17 (`npm test`).
- [x] Web production build clean compile (`npm run build`).
