using System;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using CricketLegends.Core;
using CricketLegends.Gameplay;
using CricketLegends.Rules;
using CricketLegends.Physics;
using CricketLegends.SaveSystem;

namespace CricketLegends.Tests
{
    [TestFixture]
    public class RegressionAndIntegrationTests
    {
        private GameObject _engineHolder;
        private CricketRulesEngine _rulesEngine;
        private MatchConfiguration _config;
        private List<DeliveryResultData> _completedDeliveries;

        [SetUp]
        public void SetUp()
        {
            _engineHolder = new GameObject("Test_RegressionHolder");
            _rulesEngine = _engineHolder.AddComponent<CricketRulesEngine>();

            _config = ScriptableObject.CreateInstance<MatchConfiguration>();
            _config.TotalOvers = 2;
            _config.MaxWickets = 10;
            _config.HomeTeamName = "Mumbai Blasters";
            _config.AwayTeamName = "London Monarchs";

            _completedDeliveries = new List<DeliveryResultData>();
            CricketEvents.DeliveryCompleted += OnDeliveryCompleted;
        }

        [TearDown]
        public void TearDown()
        {
            CricketEvents.DeliveryCompleted -= OnDeliveryCompleted;
            if (_engineHolder != null)
            {
                UnityEngine.Object.DestroyImmediate(_engineHolder);
            }
            if (_config != null)
            {
                UnityEngine.Object.DestroyImmediate(_config);
            }
        }

        private void OnDeliveryCompleted(DeliveryResultData data)
        {
            _completedDeliveries.Add(data);
        }

        [Test]
        public void Regression_FullMatchLifecycle_TossToTargetChaseAndCompletion()
        {
            // 1. Initialize Match & Toss
            _rulesEngine.InitializeMatch(_config);
            Assert.AreEqual(1, _rulesEngine.CurrentInnings);
            Assert.AreEqual("Mumbai Blasters", _rulesEngine.BattingTeamName);
            Assert.AreEqual("London Monarchs", _rulesEngine.BowlingTeamName);

            // 2. Play 1st Innings: Over 1 (6 legal deliveries + 1 Wide)
            // Ball 1: Dot ball
            _rulesEngine.ProcessDelivery(new DeliveryResultData
            {
                DeliveryId = 101,
                IsLegalDelivery = true,
                RunsScored = 0
            });
            // Ball 2: Single (strike rotates)
            _rulesEngine.ProcessDelivery(new DeliveryResultData
            {
                DeliveryId = 102,
                IsLegalDelivery = true,
                RunsScored = 1
            });
            // Ball 3: Boundary Four
            _rulesEngine.ProcessDelivery(new DeliveryResultData
            {
                DeliveryId = 103,
                IsLegalDelivery = true,
                RunsScored = 4,
                IsBoundaryFour = true
            });
            // Ball 4: Wide ball (1 extra run, does NOT consume legal delivery)
            _rulesEngine.ProcessDelivery(new DeliveryResultData
            {
                DeliveryId = 104,
                IsLegalDelivery = false,
                Extra = ExtraType.Wide,
                RunsScored = 1
            });
            // Ball 5: Boundary Six
            _rulesEngine.ProcessDelivery(new DeliveryResultData
            {
                DeliveryId = 105,
                IsLegalDelivery = true,
                RunsScored = 6,
                IsBoundarySix = true
            });
            // Ball 6: Bowled dismissal
            _rulesEngine.ProcessDelivery(new DeliveryResultData
            {
                DeliveryId = 106,
                IsLegalDelivery = true,
                IsWicket = true,
                WicketType = DismissalType.Bowled
            });
            // Ball 7 (6th legal ball): Dot ball completing Over 1
            _rulesEngine.ProcessDelivery(new DeliveryResultData
            {
                DeliveryId = 107,
                IsLegalDelivery = true,
                RunsScored = 0
            });

            Assert.AreEqual(1, _rulesEngine.CompletedOvers, "Over 1 should be complete");
            Assert.AreEqual(12, _rulesEngine.TotalRuns, "0 + 1 + 4 + 1(wd) + 6 + 0 + 0 = 12 runs");
            Assert.AreEqual(1, _rulesEngine.TotalWickets);

            // Over 2: 6 legal dots/singles to conclude 1st Innings (2 Overs total)
            for (int i = 1; i <= 6; i++)
            {
                _rulesEngine.ProcessDelivery(new DeliveryResultData
                {
                    DeliveryId = 200 + i,
                    IsLegalDelivery = true,
                    RunsScored = i == 6 ? 2 : 1
                });
            }

            Assert.AreEqual(2, _rulesEngine.CompletedOvers);
            Assert.AreEqual(19, _rulesEngine.TotalRuns, "12 + 1+1+1+1+1+2 = 19 runs");
            Assert.IsTrue(_rulesEngine.IsInningsComplete, "1st Innings should complete after 2 overs");

            // 3. Innings Break & Target Setting
            _rulesEngine.StartSecondInnings();
            Assert.AreEqual(2, _rulesEngine.CurrentInnings);
            Assert.AreEqual(20, _rulesEngine.TargetScore, "Target must be 1st innings total + 1 (19 + 1 = 20)");
            Assert.AreEqual("London Monarchs", _rulesEngine.BattingTeamName);
            Assert.AreEqual("Mumbai Blasters", _rulesEngine.BowlingTeamName);

            // 4. Second Innings: Chase the target
            // Hits 6, 6, 4, 4 = 20 runs in 4 balls
            _rulesEngine.ProcessDelivery(new DeliveryResultData
            {
                DeliveryId = 301,
                IsLegalDelivery = true,
                RunsScored = 6,
                IsBoundarySix = true
            });
            _rulesEngine.ProcessDelivery(new DeliveryResultData
            {
                DeliveryId = 302,
                IsLegalDelivery = true,
                RunsScored = 6,
                IsBoundarySix = true
            });
            _rulesEngine.ProcessDelivery(new DeliveryResultData
            {
                DeliveryId = 303,
                IsLegalDelivery = true,
                RunsScored = 4,
                IsBoundaryFour = true
            });
            _rulesEngine.ProcessDelivery(new DeliveryResultData
            {
                DeliveryId = 304,
                IsLegalDelivery = true,
                RunsScored = 4,
                IsBoundaryFour = true
            });

            // 5. Match Result Evaluation
            Assert.IsTrue(_rulesEngine.IsMatchComplete, "Match must be complete after successfully chasing target");
            Assert.AreEqual("London Monarchs won by 10 wickets", _rulesEngine.MatchResultSummary);
        }

        [Test]
        public void Regression_BattingShots_AllPresets_ProducePhysicalTrajectories()
        {
            // Verify all 8 canonical batting shots calculate valid physical exit trajectories
            ShotType[] shots = (ShotType[])Enum.GetValues(typeof(ShotType));
            Assert.AreEqual(8, shots.Length, "Must support all 8 canonical shots");

            Vector3 incomingBallVelocity = new Vector3(0f, -2.5f, -32f); // 32 m/s delivery

            for (int i = 0; i < shots.Length; i++)
            {
                ShotType shot = shots[i];
                BattingShotConfig config = BattingShotData.GetDefaultConfig(shot);

                Assert.IsNotNull(config, $"Config for {shot} must not be null");
                Assert.Greater(config.PowerMultiplier, 0.1f);
                Assert.Greater(config.ContactWindowSeconds, 0.05f);

                // Calculate physics restitution
                Vector3 exitVelocity = BatCollisionResolver.CalculateExitVelocity(
                    incomingBallVelocity,
                    config,
                    aimDirectionDegrees: 0f,
                    timingQuality: TimingQuality.Perfect
                );

                Assert.Greater(exitVelocity.magnitude, 1.0f, $"Exit velocity for {shot} must be physically positive");
                // Attacking shots must have higher power multiplier than defensive
                if (shot == ShotType.LoftedAttack || shot == ShotType.StraightDrive)
                {
                    Assert.Greater(config.PowerMultiplier, 1.0f);
                }
                else if (shot == ShotType.ForwardDefense || shot == ShotType.BackFootDefense)
                {
                    Assert.Less(config.PowerMultiplier, 0.6f);
                }
            }
        }

        [Test]
        public void Regression_PauseAndResume_PreservesScoreAndStateWithoutDrift()
        {
            // Arrange
            _rulesEngine.InitializeMatch(_config);
            _rulesEngine.ProcessDelivery(new DeliveryResultData
            {
                DeliveryId = 501,
                IsLegalDelivery = true,
                RunsScored = 4,
                IsBoundaryFour = true
            });

            int runsBeforePause = _rulesEngine.TotalRuns;
            int oversBeforePause = _rulesEngine.CompletedOvers;
            int ballsBeforePause = _rulesEngine.TotalLegalBalls;

            // Act: Simulate game pause (timeScale = 0)
            Time.timeScale = 0f;

            // Re-attempt duplicate delivery resolution during paused state (must be rejected)
            bool duplicateHandled = _rulesEngine.ProcessDelivery(new DeliveryResultData
            {
                DeliveryId = 501, // Duplicate ID
                IsLegalDelivery = true,
                RunsScored = 6
            });

            // Resume
            Time.timeScale = 1.0f;

            // Assert
            Assert.IsFalse(duplicateHandled, "Duplicate delivery resolution during pause must be rejected");
            Assert.AreEqual(runsBeforePause, _rulesEngine.TotalRuns, "Score must not drift or mutate during pause");
            Assert.AreEqual(oversBeforePause, _rulesEngine.CompletedOvers);
            Assert.AreEqual(ballsBeforePause, _rulesEngine.TotalLegalBalls);
        }

        [Test]
        public void Regression_TournamentAndCareer_SaveAndLoad_Roundtrip()
        {
            // Arrange
            var tournamentManager = _engineHolder.AddComponent<TournamentManager>();
            var careerManager = _engineHolder.AddComponent<CareerManager>();

            var teams = TeamData.GetStandardLeagueTeams();
            tournamentManager.InitializeRoundRobinTournament(teams, oversPerMatch: 2);

            // Record a fixture outcome
            TournamentFixture fixture = tournamentManager.GetNextUnplayedFixture();
            Assert.IsNotNull(fixture);

            tournamentManager.RecordMatchResult(
                fixture.FixtureId,
                fixture.TeamAId,
                teamARuns: 45,
                teamAWickets: 2,
                teamAOvers: 2.0f,
                fixture.TeamBId,
                teamBRuns: 30,
                teamBWickets: 4,
                teamBOvers: 2.0f
            );

            careerManager.RecordMatchResult(
                opponentTeamId: fixture.TeamBId,
                userWon: true,
                isTie: false,
                format: "T20",
                userRuns: 45,
                userWickets: 2,
                opponentRuns: 30,
                opponentWickets: 4
            );

            // Act: Save and Reload
            string json = SaveManager.SerializeTournament(tournamentManager);
            Assert.IsNotNull(json);

            var roundtrippedTournament = SaveManager.DeserializeTournament(json, out string error);
            Assert.IsNull(error, $"Deserialization error: {error}");
            Assert.IsNotNull(roundtrippedTournament);

            // Assert: Standings match identically
            Assert.AreEqual(tournamentManager.Standings.Count, roundtrippedTournament.Standings.Count);
            Assert.AreEqual(tournamentManager.CurrentRound, roundtrippedTournament.CurrentRound);
            Assert.AreEqual(1, careerManager.SeasonWins);
            Assert.AreEqual(100f, careerManager.WinPercentage, 0.01f);
        }
    }
}
