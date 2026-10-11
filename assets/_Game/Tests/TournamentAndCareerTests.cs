using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using CricketLegends.Core;
using CricketLegends.Gameplay;
using CricketLegends.SaveSystem;

namespace CricketLegends.Tests
{
    public class TournamentAndCareerTests
    {
        private GameObject _testRoot;
        private TournamentManager _tournamentManager;
        private CareerManager _careerManager;
        private List<TeamData> _leagueTeams;

        [SetUp]
        public void SetUp()
        {
            _testRoot = new GameObject("TestRoot_TournamentAndCareer");

            GameObject tmObj = new GameObject("TournamentManager");
            tmObj.transform.SetParent(_testRoot.transform);
            _tournamentManager = tmObj.AddComponent<TournamentManager>();

            GameObject cmObj = new GameObject("CareerManager");
            cmObj.transform.SetParent(_testRoot.transform);
            _careerManager = cmObj.AddComponent<CareerManager>();

            _leagueTeams = TeamData.CreateDefaultFictionalLeague();
            SaveManager.ClearStorageForTesting();
        }

        [TearDown]
        public void TearDown()
        {
            SaveManager.ClearStorageForTesting();
            if (_testRoot != null)
            {
                Object.DestroyImmediate(_testRoot);
            }
        }

        [Test]
        public void KnockoutTournament_ProgressesFromSemifinalsToFinalAndCrownsChampion()
        {
            // Pick 4 teams for a Semi-Final -> Final knockout cup
            var teams = new List<TeamData> { _leagueTeams[0], _leagueTeams[1], _leagueTeams[2], _leagueTeams[3] };
            _tournamentManager.InitializeKnockout(teams, matchOvers: 2, "Champions Knockout Cup");

            Assert.AreEqual(2, _tournamentManager.Fixtures.Count); // SF1 and SF2
            Assert.IsFalse(_tournamentManager.IsTournamentComplete);

            // Semi-Final 1: Team 0 vs Team 1 -> Team 0 wins
            var sf1 = _tournamentManager.Fixtures[0];
            bool res1 = _tournamentManager.RecordMatchResult(sf1.FixtureId, 24, 1, 2.0f, 18, 3, 2.0f, sf1.HomeTeamId, "Won by 6 runs");
            Assert.IsTrue(res1);

            // Semi-Final 2: Team 2 vs Team 3 -> Team 3 wins
            var sf2 = _tournamentManager.Fixtures[1];
            bool res2 = _tournamentManager.RecordMatchResult(sf2.FixtureId, 15, 2, 2.0f, 16, 0, 1.4f, sf2.AwayTeamId, "Won by 4 wickets");
            Assert.IsTrue(res2);

            // After both SFs complete, Final must be automatically scheduled!
            Assert.AreEqual(3, _tournamentManager.Fixtures.Count);
            var finalFixture = _tournamentManager.Fixtures[2];
            Assert.AreEqual("Final", finalFixture.StageName);
            Assert.AreEqual(sf1.HomeTeamId, finalFixture.HomeTeamId);
            Assert.AreEqual(sf2.AwayTeamId, finalFixture.AwayTeamId);

            // Play Final: Team 0 vs Team 3 -> Team 0 wins the trophy!
            bool finalRes = _tournamentManager.RecordMatchResult(finalFixture.FixtureId, 32, 1, 2.0f, 25, 4, 2.0f, finalFixture.HomeTeamId, "Won by 7 runs");
            Assert.IsTrue(finalRes);

            // Tournament complete & champion crowned
            Assert.IsTrue(_tournamentManager.IsTournamentComplete);
            Assert.AreEqual(sf1.HomeTeamId, _tournamentManager.ChampionTeamId);
        }

        [Test]
        public void RoundRobinTournament_PlaysAllFixtures_TopTwoPlayGrandFinal()
        {
            // Pick 4 teams: 6 league matches scheduled
            var teams = new List<TeamData> { _leagueTeams[0], _leagueTeams[1], _leagueTeams[2], _leagueTeams[3] };
            _tournamentManager.InitializeRoundRobin(teams, matchOvers: 2, "Fictional Super League");

            Assert.AreEqual(6, _tournamentManager.Fixtures.Count);

            // Complete all 6 league fixtures
            for (int i = 0; i < 6; i++)
            {
                var f = _tournamentManager.Fixtures[i];
                // Team 0 wins all matches, Team 1 wins others
                string winner = (f.HomeTeamId == teams[0].TeamId || f.AwayTeamId == teams[0].TeamId)
                    ? teams[0].TeamId
                    : teams[1].TeamId;

                _tournamentManager.RecordMatchResult(f.FixtureId, 20, 1, 2.0f, 16, 2, 2.0f, winner, "Standard Result");
            }

            // Standings table should have 4 teams with 3 matches each
            Assert.AreEqual(4, _tournamentManager.Standings.Count);
            foreach (var s in _tournamentManager.Standings)
            {
                Assert.AreEqual(3, s.MatchesPlayed);
            }

            // Grand Final must be automatically scheduled between Top 2
            Assert.AreEqual(7, _tournamentManager.Fixtures.Count);
            var grandFinal = _tournamentManager.Fixtures[6];
            Assert.AreEqual("Grand Final", grandFinal.StageName);
            Assert.AreEqual(teams[0].TeamId, grandFinal.HomeTeamId);
            Assert.AreEqual(teams[1].TeamId, grandFinal.AwayTeamId);

            // Complete Grand Final
            _tournamentManager.RecordMatchResult(grandFinal.FixtureId, 28, 2, 2.0f, 22, 3, 2.0f, teams[0].TeamId, "Won by 6 runs");
            Assert.IsTrue(_tournamentManager.IsTournamentComplete);
            Assert.AreEqual(teams[0].TeamId, _tournamentManager.ChampionTeamId);
        }

        [Test]
        public void StandingsRanking_RanksByPointsThenNetRunRate()
        {
            var teams = new List<TeamData> { _leagueTeams[0], _leagueTeams[1] };
            _tournamentManager.InitializeRoundRobin(teams, matchOvers: 2);

            var s1 = new TeamStanding("T_1", "Team 1");
            var s2 = new TeamStanding("T_2", "Team 2");

            // Team 1: 1 match, 20 runs scored off 2 overs (Rate = 10), 10 runs conceded off 2 overs (Rate = 5) -> NRR = +5.0
            s1.RecordMatch(20, 2.0f, 10, 2.0f, 2, true, false, false);

            // Team 2: 1 match, 14 runs scored off 2 overs (Rate = 7), 12 runs conceded off 2 overs (Rate = 6) -> NRR = +1.0
            s2.RecordMatch(14, 2.0f, 12, 2.0f, 2, true, false, false);

            // Both have 2 points, but Team 1 has higher NRR (+5.0 vs +1.0)
            Assert.AreEqual(2, s1.Points);
            Assert.AreEqual(2, s2.Points);
            Assert.Greater(s1.NetRunRate, s2.NetRunRate);

            var standingsList = new List<TeamStanding> { s2, s1 };
            standingsList.Sort();

            Assert.AreEqual("T_1", standingsList[0].TeamId, "Team with higher NRR must rank first on equal points.");
            Assert.AreEqual("T_2", standingsList[1].TeamId);
        }

        [Test]
        public void DuplicateMatchResults_AreRejectedIdempotently()
        {
            var teams = new List<TeamData> { _leagueTeams[0], _leagueTeams[1] };
            _tournamentManager.InitializeRoundRobin(teams, matchOvers: 2);

            var fixture = _tournamentManager.Fixtures[0];
            bool firstResult = _tournamentManager.RecordMatchResult(fixture.FixtureId, 20, 2, 2.0f, 15, 3, 2.0f, fixture.HomeTeamId, "Won");
            Assert.IsTrue(firstResult);

            var homeStanding = _tournamentManager.Standings.Find(s => s.TeamId == fixture.HomeTeamId);
            Assert.AreEqual(1, homeStanding.MatchesPlayed);
            Assert.AreEqual(2, homeStanding.Points);

            // Attempt duplicate submission on same fixture ID
            bool duplicateResult = _tournamentManager.RecordMatchResult(fixture.FixtureId, 20, 2, 2.0f, 15, 3, 2.0f, fixture.HomeTeamId, "Won");
            Assert.IsFalse(duplicateResult, "Duplicate fixture recording must be strictly rejected!");

            // Standings must remain exactly 1 match played and 2 points
            Assert.AreEqual(1, homeStanding.MatchesPlayed);
            Assert.AreEqual(2, homeStanding.Points);
        }

        [Test]
        public void CompletedTournament_CannotAccidentallyAdvanceTwice()
        {
            var teams = new List<TeamData> { _leagueTeams[0], _leagueTeams[1] };
            _tournamentManager.InitializeKnockout(teams, matchOvers: 2);

            var finalFix = _tournamentManager.Fixtures[0];
            _tournamentManager.RecordMatchResult(finalFix.FixtureId, 25, 2, 2.0f, 20, 4, 2.0f, finalFix.HomeTeamId, "Won");

            Assert.IsTrue(_tournamentManager.IsTournamentComplete);
            Assert.IsNull(_tournamentManager.GetNextUnplayedFixture());

            // Attempting to record any match after tournament completion must be rejected
            bool extraAttempt = _tournamentManager.RecordMatchResult(finalFix.FixtureId, 10, 0, 1.0f, 8, 1, 1.0f, finalFix.HomeTeamId, "Invalid");
            Assert.IsFalse(extraAttempt);
        }

        [Test]
        public void SaveAndLoad_RestoresTournamentStateIdentically()
        {
            var teams = new List<TeamData> { _leagueTeams[0], _leagueTeams[1] };
            _tournamentManager.InitializeRoundRobin(teams, matchOvers: 2, "Persistent Cup");

            var f = _tournamentManager.Fixtures[0];
            _tournamentManager.RecordMatchResult(f.FixtureId, 22, 1, 2.0f, 19, 2, 2.0f, f.HomeTeamId, "Won by 3 runs");

            // Save state
            bool saved = SaveManager.SaveTournamentLocally(_tournamentManager);
            Assert.IsTrue(saved);

            // Create fresh manager and load
            GameObject freshObj = new GameObject("FreshTournamentManager");
            var freshManager = freshObj.AddComponent<TournamentManager>();

            bool loaded = SaveManager.LoadTournamentLocally(freshManager);
            Assert.IsTrue(loaded);

            Assert.AreEqual("Persistent Cup", freshManager.TournamentName);
            Assert.AreEqual(1, freshManager.Fixtures.Count);
            Assert.IsTrue(freshManager.Fixtures[0].IsCompleted);
            Assert.AreEqual(22, freshManager.Fixtures[0].HomeScore);
            Assert.AreEqual(f.HomeTeamId, freshManager.Fixtures[0].WinnerTeamId);

            Object.DestroyImmediate(freshObj);
        }

        [Test]
        public void CorruptedOrMissingSave_IsHandledGracefullyWithoutCrashing()
        {
            // 1. Missing / empty save string
            var nullData = SaveManager.DeserializeTournament(null, out string nullError);
            Assert.IsNull(nullData);
            Assert.IsNotNull(nullError);

            // 2. Corrupted JSON syntax
            string corruptedJson = "{ broken json content without closing braces...";
            var corruptedData = SaveManager.DeserializeTournament(corruptedJson, out string parseError);
            Assert.IsNull(corruptedData);
            Assert.IsNotNull(parseError);

            // 3. Schema version mismatch
            string outdatedJson = "{\"Header\":{\"SchemaVersion\":99,\"SaveDate\":\"2020\"}}";
            var outdatedData = SaveManager.DeserializeTournament(outdatedJson, out string schemaError);
            Assert.IsNull(outdatedData);
            Assert.That(schemaError, Does.Contain("Schema version mismatch"));
        }

        [Test]
        public void CareerManager_TracksMatchHistory_AndUnlocksTiers()
        {
            _careerManager.StartNewCareer("Captain Morgan", "T_MBL", "Mumbai Blasters");

            Assert.AreEqual(1, _careerManager.UnlockedTier);
            Assert.AreEqual(0, _careerManager.MatchesPlayed);
            Assert.AreEqual(0, _careerManager.TrophiesWon);

            // Record match 1: Win
            _careerManager.RecordCareerMatch("London Monarchs", "Challenger Trophy", true, "Won by 8 runs");
            Assert.AreEqual(1, _careerManager.MatchesPlayed);
            Assert.AreEqual(1, _careerManager.MatchesWon);
            Assert.AreEqual(100f, _careerManager.WinPercentage);

            // Win Tier 1 Trophy -> Unlocks Tier 2!
            _careerManager.RecordTournamentTrophy("Challenger Trophy", 1);
            Assert.AreEqual(1, _careerManager.TrophiesWon);
            Assert.AreEqual(2, _careerManager.UnlockedTier);
            Assert.IsTrue(_careerManager.IsTournamentUnlocked(2));
            Assert.IsFalse(_careerManager.IsTournamentUnlocked(3));

            // Win Tier 2 Trophy -> Unlocks Tier 3!
            _careerManager.RecordTournamentTrophy("Premier Cup", 2);
            Assert.AreEqual(2, _careerManager.TrophiesWon);
            Assert.AreEqual(3, _careerManager.UnlockedTier);
            Assert.IsTrue(_careerManager.IsTournamentUnlocked(3));
        }
    }
}
