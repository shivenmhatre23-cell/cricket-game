using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using CricketLegends.Core;
using CricketLegends.Gameplay;
using CricketLegends.Rules;
using CricketLegends.UI;

namespace CricketLegends.Tests
{
    public class MatchRulesAndScoringTests
    {
        private GameObject _testRoot;
        private CricketRulesEngine _rulesEngine;
        private MatchConfiguration _config;
        private ScoreboardController _scoreboard;

        [SetUp]
        public void SetUp()
        {
            _testRoot = new GameObject("TestRoot_MatchRulesAndScoring");

            // Create match config: 2 overs, 10 wickets, Team India vs Team Australia
            _config = MatchConfiguration.CreateExhibition(overs: 2, maxWickets: 10, home: "India", away: "Australia");

            GameObject engineObj = new GameObject("RulesEngine");
            engineObj.transform.SetParent(_testRoot.transform);
            _rulesEngine = engineObj.AddComponent<CricketRulesEngine>();
            _rulesEngine.InitializeMatch(_config);

            GameObject sbObj = new GameObject("Scoreboard");
            sbObj.transform.SetParent(_testRoot.transform);
            _scoreboard = sbObj.AddComponent<ScoreboardController>();
            _scoreboard.BindRulesEngine(_rulesEngine);
        }

        [TearDown]
        public void TearDown()
        {
            CricketEvents.ClearAllListeners();
            if (_config != null)
            {
                Object.DestroyImmediate(_config);
            }
            if (_testRoot != null)
            {
                Object.DestroyImmediate(_testRoot);
            }
        }

        [Test]
        public void DotBall_AdvancesLegalBalls_AwardsNoRuns()
        {
            string initialStriker = _rulesEngine.StrikerName;

            var result = _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Dot(1));

            Assert.AreEqual(1, result.DeliveryId);
            Assert.AreEqual(0, result.TotalTeamRuns);
            Assert.IsTrue(result.IsLegalBall);
            Assert.AreEqual(0, _rulesEngine.TotalRuns);
            Assert.AreEqual(1, _rulesEngine.LegalBallsInOver);
            Assert.AreEqual(0, _rulesEngine.CompletedOvers);
            Assert.AreEqual(initialStriker, _rulesEngine.StrikerName, "Strike should not rotate on a dot ball.");
        }

        [Test]
        public void Single_RotatesStrike_IncrementsScore()
        {
            string initialStriker = _rulesEngine.StrikerName;
            string initialNonStriker = _rulesEngine.NonStrikerName;

            var result = _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Runs(1, runs: 1));

            Assert.AreEqual(1, result.TotalTeamRuns);
            Assert.AreEqual(1, result.BatterRuns);
            Assert.IsTrue(result.StrikeRotated);
            Assert.AreEqual(1, _rulesEngine.TotalRuns);
            Assert.AreEqual(initialNonStriker, _rulesEngine.StrikerName, "Strike must rotate on an odd completed run.");
            Assert.AreEqual(initialStriker, _rulesEngine.NonStrikerName);
        }

        [Test]
        public void BoundaryFour_AwardsFourRuns_NoStrikeRotation()
        {
            string initialStriker = _rulesEngine.StrikerName;

            var result = _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Runs(1, runs: 4, four: true));

            Assert.AreEqual(4, result.TotalTeamRuns);
            Assert.AreEqual(4, result.BatterRuns);
            Assert.IsTrue(result.IsBoundaryFour);
            Assert.IsFalse(result.StrikeRotated);
            Assert.AreEqual(4, _rulesEngine.TotalRuns);
            Assert.AreEqual(initialStriker, _rulesEngine.StrikerName, "Strike must not rotate on a boundary four.");

            var strikerStats = _rulesEngine.CurrentInningsScorecard.Batters.Find(b => b.PlayerName == initialStriker);
            Assert.AreEqual(4, strikerStats.Runs);
            Assert.AreEqual(1, strikerStats.Fours);
            Assert.AreEqual(1, strikerStats.BallsFaced);
        }

        [Test]
        public void BoundarySix_AwardsSixRuns_NoStrikeRotation()
        {
            string initialStriker = _rulesEngine.StrikerName;

            var result = _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Runs(1, runs: 6, six: true));

            Assert.AreEqual(6, result.TotalTeamRuns);
            Assert.AreEqual(6, result.BatterRuns);
            Assert.IsTrue(result.IsBoundarySix);
            Assert.IsFalse(result.StrikeRotated);
            Assert.AreEqual(6, _rulesEngine.TotalRuns);

            var strikerStats = _rulesEngine.CurrentInningsScorecard.Batters.Find(b => b.PlayerName == initialStriker);
            Assert.AreEqual(6, strikerStats.Runs);
            Assert.AreEqual(1, strikerStats.Sixes);
        }

        [Test]
        public void Wide_AwardsOneExtra_DoesNotConsumeLegalBall_DoesNotCountAsBatterBall()
        {
            string initialStriker = _rulesEngine.StrikerName;

            var result = _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Wide(1));

            Assert.AreEqual(1, result.TotalTeamRuns);
            Assert.AreEqual(0, result.BatterRuns);
            Assert.AreEqual(1, result.ExtraRuns);
            Assert.AreEqual(ExtraType.Wide, result.ExtraType);
            Assert.IsFalse(result.IsLegalBall, "Wide must NOT count as a legal delivery.");

            Assert.AreEqual(1, _rulesEngine.TotalRuns);
            Assert.AreEqual(1, _rulesEngine.Extras.Wides);
            Assert.AreEqual(0, _rulesEngine.LegalBallsInOver, "Wide delivery must not consume a legal ball.");

            var strikerStats = _rulesEngine.CurrentInningsScorecard.Batters.Find(b => b.PlayerName == initialStriker);
            Assert.AreEqual(0, strikerStats.BallsFaced, "Batter must not be credited with facing a ball on a wide.");
        }

        [Test]
        public void NoBall_AwardsPenalty_AllowsBatterRuns_DoesNotConsumeLegalBall()
        {
            string initialStriker = _rulesEngine.StrikerName;

            // Batter hits no-ball for 2 runs
            var result = _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.NoBall(1, batterRuns: 2));

            Assert.AreEqual(3, result.TotalTeamRuns, "1 penalty + 2 batter runs = 3 runs total.");
            Assert.AreEqual(2, result.BatterRuns);
            Assert.AreEqual(1, result.ExtraRuns);
            Assert.AreEqual(ExtraType.NoBall, result.ExtraType);
            Assert.IsFalse(result.IsLegalBall);

            Assert.AreEqual(3, _rulesEngine.TotalRuns);
            Assert.AreEqual(1, _rulesEngine.Extras.NoBalls);
            Assert.AreEqual(0, _rulesEngine.LegalBallsInOver);

            var strikerStats = _rulesEngine.CurrentInningsScorecard.Batters.Find(b => b.PlayerName == initialStriker);
            Assert.AreEqual(2, strikerStats.Runs);
            Assert.AreEqual(1, strikerStats.BallsFaced, "Batter faced delivery when striking the ball on a no-ball.");
        }

        [Test]
        public void ExtraWithBoundary_NoBallPlusFour_AwardsFiveRuns()
        {
            var result = _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.NoBall(1, batterRuns: 4, four: true));

            Assert.AreEqual(5, result.TotalTeamRuns, "1 penalty + 4 boundary = 5 runs total.");
            Assert.AreEqual(4, result.BatterRuns);
            Assert.IsTrue(result.IsBoundaryFour);
            Assert.IsFalse(result.IsLegalBall);
            Assert.AreEqual(5, _rulesEngine.TotalRuns);
            Assert.AreEqual(0, _rulesEngine.LegalBallsInOver);
        }

        [Test]
        public void ExtraWithBoundary_WidePlusFour_AwardsFiveWides()
        {
            var result = _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Wide(1, additionalRuns: 4));

            Assert.AreEqual(5, result.TotalTeamRuns, "1 wide + 4 overthrow = 5 wides.");
            Assert.AreEqual(0, result.BatterRuns);
            Assert.AreEqual(5, result.ExtraRuns);
            Assert.IsFalse(result.IsLegalBall);
            Assert.AreEqual(5, _rulesEngine.TotalRuns);
            Assert.AreEqual(5, _rulesEngine.Extras.Wides);
            Assert.AreEqual(0, _rulesEngine.LegalBallsInOver);
        }

        [Test]
        public void ByesAndLegByes_CountsAsExtras_NotChargedToBowler()
        {
            string bowler = _rulesEngine.CurrentBowlerName;

            // Delivery 1: 2 byes
            var byeResult = _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Bye(1, 2));
            Assert.AreEqual(2, byeResult.TotalTeamRuns);
            Assert.AreEqual(0, byeResult.BatterRuns);
            Assert.IsTrue(byeResult.IsLegalBall);

            // Delivery 2: 1 leg-bye
            var legByeResult = _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.LegBye(2, 1));
            Assert.AreEqual(1, legByeResult.TotalTeamRuns);
            Assert.IsTrue(legByeResult.IsLegalBall);

            Assert.AreEqual(3, _rulesEngine.TotalRuns);
            Assert.AreEqual(2, _rulesEngine.Extras.Byes);
            Assert.AreEqual(1, _rulesEngine.Extras.LegByes);

            var bowlerStats = _rulesEngine.CurrentInningsScorecard.Bowlers.Find(b => b.PlayerName == bowler);
            Assert.AreEqual(0, bowlerStats.RunsConceded, "Byes and leg-byes must NOT be charged against bowler figures.");
            Assert.AreEqual(2, bowlerStats.LegalBallsBowled);
        }

        [Test]
        public void Wicket_Bowled_DismissesStriker_BringsNewBatter()
        {
            string dismissedStriker = _rulesEngine.StrikerName;
            string bowler = _rulesEngine.CurrentBowlerName;

            var result = _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Wicket(1, DismissalType.Bowled, dismissedStriker));

            Assert.IsTrue(result.IsWicket);
            Assert.AreEqual(DismissalType.Bowled, result.DismissalType);
            Assert.AreEqual(1, _rulesEngine.TotalWickets);

            var batterStats = _rulesEngine.CurrentInningsScorecard.Batters.Find(b => b.PlayerName == dismissedStriker);
            Assert.IsTrue(batterStats.IsOut);
            Assert.AreEqual($"b {bowler}", batterStats.DismissalText);

            var bowlerStats = _rulesEngine.CurrentInningsScorecard.Bowlers.Find(b => b.PlayerName == bowler);
            Assert.AreEqual(1, bowlerStats.Wickets, "Bowled dismissal must be credited to bowler.");

            Assert.AreNotEqual(dismissedStriker, _rulesEngine.StrikerName, "New batter must occupy the crease following dismissal.");
        }

        [Test]
        public void FinalLegalDeliveryOfOver_CompletesOver_RotatesBowler_RotatesStrike()
        {
            string initialBowler = _rulesEngine.CurrentBowlerName;
            string initialStriker = _rulesEngine.StrikerName;
            string initialNonStriker = _rulesEngine.NonStrikerName;

            // Bowl 6 consecutive dot balls
            for (int i = 1; i <= 6; i++)
            {
                _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Dot(i));
            }

            Assert.AreEqual(1, _rulesEngine.CompletedOvers);
            Assert.AreEqual(0, _rulesEngine.LegalBallsInOver);

            // Bowler maiden check
            var bowlerStats = _rulesEngine.CurrentInningsScorecard.Bowlers.Find(b => b.PlayerName == initialBowler);
            Assert.AreEqual(1, bowlerStats.Maidens, "6 consecutive dot balls must award a Maiden over.");

            // Bowler rotation check
            Assert.AreNotEqual(initialBowler, _rulesEngine.CurrentBowlerName, "Bowler must rotate at the end of an over.");

            // Standard MCC 18.11: After change of ends at end of over, non-striker faces first ball of next over
            Assert.AreEqual(initialNonStriker, _rulesEngine.StrikerName, "Strike must rotate to non-striker at completion of over.");
            Assert.AreEqual(initialStriker, _rulesEngine.NonStrikerName);
        }

        [Test]
        public void InningsCompletion_WhenOversLimitReached_SetsTargetScore()
        {
            // Set 1 over match
            _config.SetOvers(1);
            _rulesEngine.InitializeMatch(_config);

            // Bowl 6 singles
            for (int i = 1; i <= 6; i++)
            {
                _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Runs(i, 1));
            }

            Assert.AreEqual(1, _rulesEngine.CompletedOvers);
            Assert.AreEqual(6, _rulesEngine.TotalRuns);
            Assert.AreEqual(7, _rulesEngine.TargetScore, "Target must be 1st innings total + 1 (6 + 1 = 7).");
            Assert.AreEqual(2, _rulesEngine.CurrentInningsIndex, "Engine must automatically start 2nd innings.");
        }

        [Test]
        public void InningsCompletion_WhenAllOut_SetsTargetScore()
        {
            _config.SetMaxWickets(2);
            _rulesEngine.InitializeMatch(_config);

            _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Runs(1, 4, four: true));
            _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Wicket(2, DismissalType.Bowled, _rulesEngine.StrikerName));
            _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Wicket(3, DismissalType.Caught, _rulesEngine.StrikerName, "Slip"));

            Assert.AreEqual(2, _rulesEngine.TotalWickets);
            Assert.AreEqual(5, _rulesEngine.TargetScore, "Target must be 4 + 1 = 5 runs after all out.");
            Assert.AreEqual(2, _rulesEngine.CurrentInningsIndex);
        }

        [Test]
        public void SuccessfulChase_AwardsMatchWinToChasingTeam()
        {
            _config.SetOvers(1);
            _rulesEngine.InitializeMatch(_config);

            // 1st innings: 5 runs
            _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Runs(1, 4, four: true));
            _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Runs(2, 1));
            for (int i = 3; i <= 6; i++) _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Dot(i));

            Assert.AreEqual(2, _rulesEngine.CurrentInningsIndex);
            Assert.AreEqual(6, _rulesEngine.TargetScore); // Target 6 runs

            string chasingTeam = _rulesEngine.BattingTeam;

            // 2nd innings: Chasing team scores 6 runs
            _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Runs(10, 6, six: true));

            Assert.IsTrue(_rulesEngine.IsMatchOver);
            Assert.AreEqual(chasingTeam, _rulesEngine.WinningTeam);
            Assert.That(_rulesEngine.MatchResultReason, Does.Contain("won by 10 wickets"));
        }

        [Test]
        public void MatchTie_WhenScoresAreIdenticalAtInningsEnd()
        {
            _config.SetOvers(1);
            _rulesEngine.InitializeMatch(_config);

            // 1st innings: 4 runs in 1 over
            _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Runs(1, 4, four: true));
            for (int i = 2; i <= 6; i++) _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Dot(i));

            Assert.AreEqual(2, _rulesEngine.CurrentInningsIndex);
            Assert.AreEqual(5, _rulesEngine.TargetScore); // Target 5 runs

            // 2nd innings: scores exactly 4 runs in 1 over (4 dot balls + one four + 1 dot)
            _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Runs(10, 4, four: true));
            for (int i = 11; i <= 15; i++) _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Dot(i));

            Assert.IsTrue(_rulesEngine.IsMatchOver);
            Assert.AreEqual("Tie", _rulesEngine.WinningTeam);
            Assert.That(_rulesEngine.MatchResultReason, Does.Contain("Match Tied"));
        }

        [Test]
        public void DuplicateDeliveryId_IsIgnoredIdempotently_NoDuplicateRunsOrBalls()
        {
            var del1 = _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Runs(101, 4, four: true));
            Assert.AreEqual(4, _rulesEngine.TotalRuns);
            Assert.AreEqual(1, _rulesEngine.LegalBallsInOver);

            // Resend identical delivery ID 101
            var del1Retry = _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Runs(101, 4, four: true));

            // Must return identical cached record and NOT increment totals
            Assert.AreEqual(del1.DeliveryId, del1Retry.DeliveryId);
            Assert.AreEqual(4, _rulesEngine.TotalRuns, "Duplicate delivery must NOT add additional runs.");
            Assert.AreEqual(1, _rulesEngine.LegalBallsInOver, "Duplicate delivery must NOT consume extra balls.");
        }

        [Test]
        public void ScoreboardController_DisplaysImmutableData_ReflectsRulesEngineState()
        {
            _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Runs(1, 4, four: true));
            _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Wide(2));

            _scoreboard.RefreshScoreboard();
            var snapshot = _scoreboard.CurrentSnapshot;

            Assert.AreEqual(5, snapshot.TotalRuns);
            Assert.AreEqual(0, snapshot.TotalWickets);
            Assert.AreEqual("0.1", snapshot.OversDisplay);
            Assert.That(snapshot.StrikerDisplay, Does.Contain("4 (1b"));
            Assert.That(snapshot.ExtrasDisplay, Does.Contain("w 1"));
            Assert.IsNotNull(_scoreboard.GetFormattedScoreboardText());
        }
    }
}
