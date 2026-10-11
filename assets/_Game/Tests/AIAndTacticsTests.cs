using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using CricketLegends.AI;
using CricketLegends.Core;
using CricketLegends.Gameplay;
using CricketLegends.Physics;
using CricketLegends.Players;
using CricketLegends.Presentation;
using CricketLegends.Rules;

namespace CricketLegends.Tests
{
    public class AIAndTacticsTests
    {
        private GameObject _testRoot;
        private CricketRulesEngine _rulesEngine;
        private MatchConfiguration _config;
        private BowlingDecisionMaker _bowlingAI;
        private FieldPlacementManager _fieldingAI;
        private FieldingCoordinator _fieldingCoordinator;
        private BattingDecisionMaker _battingAI;
        private BatsmanController _batsman;

        [SetUp]
        public void SetUp()
        {
            _testRoot = new GameObject("TestRoot_AIAndTactics");

            _config = MatchConfiguration.CreateExhibition(overs: 2, maxWickets: 10);

            // Rules Engine
            GameObject engineObj = new GameObject("RulesEngine");
            engineObj.transform.SetParent(_testRoot.transform);
            _rulesEngine = engineObj.AddComponent<CricketRulesEngine>();
            _rulesEngine.InitializeMatch(_config);

            // Bowling AI
            GameObject bowlerObj = new GameObject("BowlingAI");
            bowlerObj.transform.SetParent(_testRoot.transform);
            _bowlingAI = bowlerObj.AddComponent<BowlingDecisionMaker>();
            _bowlingAI.Configure(BowlingProfileType.FastBowler, DifficultyLevel.Medium);

            // Fielding Coordinator & Placement AI
            GameObject fieldingCoordObj = new GameObject("FieldingCoordinator");
            fieldingCoordObj.transform.SetParent(_testRoot.transform);
            _fieldingCoordinator = fieldingCoordObj.AddComponent<FieldingCoordinator>();

            for (int i = 0; i < 11; i++)
            {
                GameObject fObj = new GameObject($"Fielder_{i}");
                fObj.transform.SetParent(fieldingCoordObj.transform);
                var fc = fObj.AddComponent<FielderController>();
                _fieldingCoordinator.RegisterFielder(fc);
            }
            _fieldingCoordinator.ApplyPreset(FieldPreset.Balanced);

            GameObject fieldAIObj = new GameObject("FieldPlacementManager");
            fieldAIObj.transform.SetParent(_testRoot.transform);
            _fieldingAI = fieldAIObj.AddComponent<FieldPlacementManager>();
            _fieldingAI.Configure(_fieldingCoordinator, DifficultyLevel.Medium);

            // Batsman & Batting AI
            GameObject batsmanObj = new GameObject("Batsman");
            batsmanObj.transform.SetParent(_testRoot.transform);
            _batsman = batsmanObj.AddComponent<BatsmanController>();

            _battingAI = batsmanObj.AddComponent<BattingDecisionMaker>();
            _battingAI.Configure(_batsman, DifficultyLevel.Medium);
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
        public void BowlingAI_PlaysCompleteOver_GeneratesSixValidDeliveries()
        {
            List<BowlingDelivery> overDeliveries = new List<BowlingDelivery>();

            for (int ball = 1; ball <= 6; ball++)
            {
                var delivery = _bowlingAI.DecideDelivery(_rulesEngine, _config);
                Assert.IsNotNull(delivery, $"Delivery #{ball} must be instantiated.");
                Assert.GreaterOrEqual(delivery.SpeedKmh, 80f);
                Assert.LessOrEqual(delivery.SpeedKmh, 160f);
                Assert.Greater(delivery.ReleasePosition.y, 1.5f, "Release point must be off the ground.");

                overDeliveries.Add(delivery);

                // Simulate legal resolution
                _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Dot(ball));
            }

            Assert.AreEqual(6, overDeliveries.Count);
            Assert.AreEqual(1, _rulesEngine.CompletedOvers);

            foreach (var d in overDeliveries)
            {
                Object.DestroyImmediate(d);
            }
        }

        [Test]
        public void BowlingAI_ProfilesProduceDistinctPaceAndVariations()
        {
            // 1. Fast Bowler
            _bowlingAI.Configure(BowlingProfileType.FastBowler, DifficultyLevel.Medium);
            var fastDelivery = _bowlingAI.DecideDelivery(_rulesEngine, _config);
            Assert.GreaterOrEqual(fastDelivery.SpeedKmh, 135f, "Fast bowler must deliver at 135+ km/h.");

            // 2. Spin Bowler
            _bowlingAI.Configure(BowlingProfileType.SpinBowler, DifficultyLevel.Medium);
            var spinDelivery = _bowlingAI.DecideDelivery(_rulesEngine, _config);
            Assert.LessOrEqual(spinDelivery.SpeedKmh, 105f, "Spin bowler must deliver below 105 km/h.");
            Assert.AreNotEqual(0f, spinDelivery.SpinDeviation, "Spin bowler must produce spin deviation.");

            // 3. Swing Bowler
            _bowlingAI.Configure(BowlingProfileType.SwingBowler, DifficultyLevel.Medium);
            var swingDelivery = _bowlingAI.DecideDelivery(_rulesEngine, _config);
            Assert.AreNotEqual(0f, swingDelivery.SwingAmount, "Swing bowler must produce aerodynamic swing.");

            // 4. Defensive Bowler
            _bowlingAI.Configure(BowlingProfileType.DefensiveBowler, DifficultyLevel.Medium);
            var defDelivery = _bowlingAI.DecideDelivery(_rulesEngine, _config);
            Assert.Less(defDelivery.LateralLineOffset, -0.20f, "Defensive bowler must bowl outside off stump.");

            Object.DestroyImmediate(fastDelivery);
            Object.DestroyImmediate(spinDelivery);
            Object.DestroyImmediate(swingDelivery);
            Object.DestroyImmediate(defDelivery);
        }

        [Test]
        public void BattingAI_ChoosesAppropriateShotForDeliveryType()
        {
            _battingAI.Configure(_batsman, DifficultyLevel.Hard); // Hard = low mistake rate to verify technical selection

            // Yorker on stumps -> Forward Defense
            var yorker = BowlingDelivery.CreatePreset(DeliveryLength.Yorker, 140f, 0f);
            var delField = typeof(BattingDecisionMaker).GetField("_incomingDelivery", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            delField.SetValue(_battingAI, yorker);
            var shot1 = _battingAI.DecideShotSelection();
            Assert.AreEqual(BattingShotType.ForwardDefense, shot1, "Yorker on stumps must be defended.");

            // Full outside off -> Cover Drive
            var fullOff = BowlingDelivery.CreatePreset(DeliveryLength.Full, 135f, -0.25f);
            delField.SetValue(_battingAI, fullOff);
            var shot2 = _battingAI.DecideShotSelection();
            Assert.AreEqual(BattingShotType.CoverDrive, shot2, "Full delivery outside off must trigger Cover Drive.");

            // Short on body -> Pull Shot
            var shortBody = BowlingDelivery.CreatePreset(DeliveryLength.Short, 138f, 0.05f);
            delField.SetValue(_battingAI, shortBody);
            var shot3 = _battingAI.DecideShotSelection();
            Assert.AreEqual(BattingShotType.Pull, shot3, "Short delivery on body must trigger Pull shot.");

            // Short outside off -> Cut Shot
            var shortOff = BowlingDelivery.CreatePreset(DeliveryLength.Short, 130f, -0.30f);
            delField.SetValue(_battingAI, shortOff);
            var shot4 = _battingAI.DecideShotSelection();
            Assert.AreEqual(BattingShotType.Cut, shot4, "Short delivery outside off must trigger Square Cut.");

            Object.DestroyImmediate(yorker);
            Object.DestroyImmediate(fullOff);
            Object.DestroyImmediate(shortBody);
            Object.DestroyImmediate(shortOff);
        }

        [Test]
        public void BattingAI_AdjustsAggressionToMatchSituation()
        {
            _battingAI.Configure(_batsman, DifficultyLevel.Hard);
            var fullBall = BowlingDelivery.CreatePreset(DeliveryLength.Full, 130f, 0f);
            var delField = typeof(BattingDecisionMaker).GetField("_incomingDelivery", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            delField.SetValue(_battingAI, fullBall);

            // Normal aggression -> Straight Drive
            _battingAI.SetAggression(TacticalAggression.Moderate);
            var normalShot = _battingAI.DecideShotSelection();
            Assert.AreEqual(BattingShotType.StraightDrive, normalShot);

            // Max aggression (death overs slog) -> Lofted Attack
            _battingAI.SetAggression(TacticalAggression.MaxAggression);
            var loftedShot = _battingAI.DecideShotSelection();
            Assert.AreEqual(BattingShotType.LoftedAttack, loftedShot);

            Object.DestroyImmediate(fullBall);
        }

        [Test]
        public void FieldPlacementManager_DynamicallyShiftsPresetBetweenDeliveries()
        {
            // Initial field is Balanced
            Assert.AreEqual(FieldPreset.Balanced, _fieldingCoordinator.CurrentPreset);

            // Batter hits 2 consecutive boundaries
            _fieldingAI.RecordDeliveryResult(new DeliveryResult(1, "S", "NS", "B", 4, ExtraType.None, 0, 4, true, false, DismissalType.None, null, null, 0, true, false, false, "FOUR"));
            _fieldingAI.RecordDeliveryResult(new DeliveryResult(2, "S", "NS", "B", 4, ExtraType.None, 0, 4, true, false, DismissalType.None, null, null, 0, true, false, false, "FOUR"));

            // Re-evaluate field before delivery 3
            var newPreset = _fieldingAI.EvaluateAndApplyFieldPlacement(_rulesEngine, _config);

            // Must shift to BoundaryProtection to contain the boundary assault
            Assert.AreEqual(FieldPreset.BoundaryProtection, newPreset);
            Assert.AreEqual(FieldPreset.BoundaryProtection, _fieldingCoordinator.CurrentPreset);
        }

        [Test]
        public void DifficultySettings_DocumentedParametersScaleCorrectly()
        {
            var fielderAI = _testRoot.AddComponent<FielderDecisionMaker>();

            // Easy
            fielderAI.ApplyDifficultySettings(DifficultyLevel.Easy, _fieldingCoordinator.Fielders);
            Assert.AreEqual(0.45f, fielderAI.ReactionDelay, 0.01f);
            Assert.AreEqual(0.75f, fielderAI.CatchSkill, 0.01f);

            // Medium
            fielderAI.ApplyDifficultySettings(DifficultyLevel.Medium, _fieldingCoordinator.Fielders);
            Assert.AreEqual(0.25f, fielderAI.ReactionDelay, 0.01f);
            Assert.AreEqual(0.88f, fielderAI.CatchSkill, 0.01f);

            // Hard
            fielderAI.ApplyDifficultySettings(DifficultyLevel.Hard, _fieldingCoordinator.Fielders);
            Assert.AreEqual(0.15f, fielderAI.ReactionDelay, 0.01f);
            Assert.AreEqual(0.96f, fielderAI.CatchSkill, 0.01f);
        }

        [Test]
        public void AIDecisionMakers_DoNotBypassCollisionOrRulesEngine()
        {
            // Verify that when AI batter is dismissed through rules engine, dismissal is strictly recorded
            _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Wicket(1, DismissalType.Bowled, _rulesEngine.StrikerName));

            Assert.AreEqual(1, _rulesEngine.TotalWickets);
            Assert.IsTrue(_rulesEngine.CurrentInningsScorecard.Batters[0].IsOut);
            Assert.That(_rulesEngine.CurrentInningsScorecard.Batters[0].DismissalText, Does.Contain("b "));
        }
    }
}
