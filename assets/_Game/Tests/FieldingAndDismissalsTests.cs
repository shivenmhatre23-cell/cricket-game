using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using CricketLegends.Core;
using CricketLegends.Physics;
using CricketLegends.Presentation;
using CricketLegends.AI;
using CricketLegends.Rules;

namespace CricketLegends.Tests
{
    public class FieldingAndDismissalsTests
    {
        private GameObject _testRoot;
        private CricketBall _ball;
        private CricketRulesValidator _validator;
        private RunOutTracker _runTracker;
        private WicketsController _strikerWickets;
        private WicketsController _bowlerWickets;
        private FielderController _fielder;

        [SetUp]
        public void SetUp()
        {
            _testRoot = new GameObject("TestRoot_FieldingAndDismissals");

            // Cricket ball
            GameObject ballObj = new GameObject("Ball");
            ballObj.transform.SetParent(_testRoot.transform);
            _ball = ballObj.AddComponent<CricketBall>();

            // Rules validator
            GameObject validatorObj = new GameObject("RulesValidator");
            validatorObj.transform.SetParent(_testRoot.transform);
            _validator = validatorObj.AddComponent<CricketRulesValidator>();

            // Run out tracker
            GameObject trackerObj = new GameObject("RunOutTracker");
            trackerObj.transform.SetParent(_testRoot.transform);
            _runTracker = trackerObj.AddComponent<RunOutTracker>();

            // Wickets
            GameObject strikerWicketsObj = new GameObject("StrikerWickets");
            strikerWicketsObj.transform.SetParent(_testRoot.transform);
            _strikerWickets = strikerWicketsObj.AddComponent<WicketsController>();
            _strikerWickets.ConfigureEnd(WicketEnd.StrikerEnd);

            GameObject bowlerWicketsObj = new GameObject("BowlerWickets");
            bowlerWicketsObj.transform.SetParent(_testRoot.transform);
            _bowlerWickets = bowlerWicketsObj.AddComponent<WicketsController>();
            _bowlerWickets.ConfigureEnd(WicketEnd.BowlerEnd);

            // Fielder
            GameObject fielderObj = new GameObject("Fielder");
            fielderObj.transform.SetParent(_testRoot.transform);
            _fielder = fielderObj.AddComponent<FielderController>();
            _fielder.Configure("Cover", new Vector3(12f, 0f, 5f));
        }

        [TearDown]
        public void TearDown()
        {
            CricketEvents.ClearAllListeners();
            if (_testRoot != null)
            {
                Object.DestroyImmediate(_testRoot);
            }
        }

        [Test]
        public void Catching_AirborneUnbouncedBall_WithinReach_RecordsCaughtDismissal()
        {
            // Position fielder at (5, 0, 10)
            _fielder.Configure("Extra Cover", new Vector3(5f, 0f, 10f));

            // Position ball airborne at chest height, close to fielder (5.2, 1.4, 10.1)
            _ball.transform.position = new Vector3(5.2f, 1.4f, 10.1f);
            _ball.SetStateForTesting(BallState.Struck, bounceCount: 0);

            // Reaction time 0.4s (> 0.15s threshold)
            var catchResult = CatchingBehaviour.EvaluateCatchAttempt(_ball, _fielder.transform.position, 0.4f, fielderCatchSkill: 1.0f);
            Assert.AreEqual(CatchAttemptResult.Success, catchResult);

            // Validate through CricketRulesValidator
            bool wasCaught = _validator.ValidateCaught(_ball, _fielder, 0.4f, "Cummins");
            Assert.IsTrue(wasCaught);
            Assert.IsTrue(_validator.IsDismissalRecorded);
            Assert.AreEqual(DismissalType.Caught, _validator.CurrentDismissal.Type);
            Assert.AreEqual("Cummins", _validator.CurrentDismissal.Bowler);
            Assert.AreEqual("Extra Cover", _validator.CurrentDismissal.Fielder);
        }

        [Test]
        public void Catching_BouncedBall_RejectsCaughtDismissal()
        {
            // Fielder is directly at the ball location
            _fielder.Configure("Mid-Off", new Vector3(5f, 0f, 10f));
            _ball.transform.position = new Vector3(5f, 0.5f, 10f);

            // Ball has already bounced on turf!
            _ball.SetStateForTesting(BallState.Pitched, bounceCount: 1);

            var catchResult = CatchingBehaviour.EvaluateCatchAttempt(_ball, _fielder.transform.position, 0.5f);
            Assert.AreEqual(CatchAttemptResult.IneligibleBounced, catchResult);

            bool wasCaught = _validator.ValidateCaught(_ball, _fielder, 0.5f);
            Assert.IsFalse(wasCaught);
            Assert.IsFalse(_validator.IsDismissalRecorded);
        }

        [Test]
        public void Catching_OutOfReach_ReturnsOutOfReach()
        {
            _fielder.Configure("Deep Point", new Vector3(40f, 0f, 10f));
            // Ball is 25 meters away
            _ball.transform.position = new Vector3(15f, 1.5f, 10f);
            _ball.SetStateForTesting(BallState.Struck, bounceCount: 0);

            var catchResult = CatchingBehaviour.EvaluateCatchAttempt(_ball, _fielder.transform.position, 0.5f);
            Assert.AreEqual(CatchAttemptResult.OutOfReach, catchResult);

            bool wasCaught = _validator.ValidateCaught(_ball, _fielder, 0.5f);
            Assert.IsFalse(wasCaught);
            Assert.IsFalse(_validator.IsDismissalRecorded);
        }

        [Test]
        public void Dismissals_Bowled_WhenStumpsBrokenOnStrikerEnd()
        {
            _ball.SetStateForTesting(BallState.InFlight, bounceCount: 1);
            _strikerWickets.SetBroken(true);

            bool wasBowled = _validator.ValidateBowled(_ball, _strikerWickets, "Starc");
            Assert.IsTrue(wasBowled);
            Assert.IsTrue(_validator.IsDismissalRecorded);
            Assert.AreEqual(DismissalType.Bowled, _validator.CurrentDismissal.Type);
            Assert.AreEqual("Starc", _validator.CurrentDismissal.Bowler);
        }

        [Test]
        public void Dismissals_SingleDismissalInvariant_RejectsSubsequentDismissalOnSameBall()
        {
            // First dismissal: Batter is Bowled
            _ball.SetStateForTesting(BallState.InFlight, bounceCount: 1);
            _strikerWickets.SetBroken(true);
            bool bowledResult = _validator.ValidateBowled(_ball, _strikerWickets, "Starc");
            Assert.IsTrue(bowledResult);
            Assert.AreEqual(DismissalType.Bowled, _validator.CurrentDismissal.Type);

            // Subsequent event on the same delivery: Bowler end wickets broken during scramble
            _runTracker.StartRun();
            _runTracker.UpdateRunnerPositions(strikerZ: 2.0f, nonStrikerZ: 5.0f);
            _bowlerWickets.SetBroken(true);

            // Attempting to award Run Out MUST be rejected under the single dismissal invariant
            bool runOutResult = _validator.ValidateRunOut(WicketEnd.BowlerEnd, _runTracker, "Mid-On");
            Assert.IsFalse(runOutResult, "Secondary dismissal on the same delivery must be strictly rejected!");

            // Original dismissal remains Bowled
            Assert.AreEqual(DismissalType.Bowled, _validator.CurrentDismissal.Type);
            Assert.AreEqual("Starc", _validator.CurrentDismissal.Bowler);
        }

        [Test]
        public void RunOut_WhenRunnerOutsideCrease_AwardsRunOut()
        {
            _runTracker.StartRun(); // Running 1st run: Striker is running to Bowler End (safe if Z <= -8.84m)
            _runTracker.UpdateRunnerPositions(strikerZ: -2.5f, nonStrikerZ: 5.0f); // Striker is at Z = -2.5m, outside crease!

            // Bowler end wickets broken
            bool isSafe = _runTracker.IsRunnerSafeAtEnd(WicketEnd.BowlerEnd);
            Assert.IsFalse(isSafe);

            bool wasRunOut = _validator.ValidateRunOut(WicketEnd.BowlerEnd, _runTracker, "Direct Hit - Point");
            Assert.IsTrue(wasRunOut);
            Assert.IsTrue(_validator.IsDismissalRecorded);
            Assert.AreEqual(DismissalType.RunOut, _validator.CurrentDismissal.Type);
            Assert.AreEqual("Striker", _validator.CurrentDismissal.DismissedBatter);
            Assert.IsNull(_validator.CurrentDismissal.Bowler, "Bowler must NOT be credited with wicket for a Run Out under MCC laws.");
            Assert.AreEqual("Direct Hit - Point", _validator.CurrentDismissal.Fielder);
        }

        [Test]
        public void RunOut_WhenRunnerGroundedInsideCrease_RejectsRunOut()
        {
            _runTracker.StartRun();
            // Striker successfully crossed the popping crease threshold at bowler end (Z <= -8.84m)
            _runTracker.UpdateRunnerPositions(strikerZ: -9.20f, nonStrikerZ: 9.20f);

            bool isSafe = _runTracker.IsRunnerSafeAtEnd(WicketEnd.BowlerEnd);
            Assert.IsTrue(isSafe, "Runner at Z = -9.2m must be safely grounded behind Z = -8.84m crease.");

            bool wasRunOut = _validator.ValidateRunOut(WicketEnd.BowlerEnd, _runTracker);
            Assert.IsFalse(wasRunOut);
            Assert.IsFalse(_validator.IsDismissalRecorded);
        }

        [Test]
        public void Stumped_WhenStrikerOutOfCreaseAndNotRunning_AwardsStumped()
        {
            // Striker stepped out of crease (Z = 8.40m, safe is Z >= 8.84m)
            float strikerZ = 8.40f;
            bool isRunning = false;
            _strikerWickets.SetBroken(true);
            _ball.SetStateForTesting(BallState.Pitched, bounceCount: 1);

            bool wasStumped = _validator.ValidateStumped(_ball, _strikerWickets, strikerZ, isRunning, "Dhoni", "Ashwin");
            Assert.IsTrue(wasStumped);
            Assert.IsTrue(_validator.IsDismissalRecorded);
            Assert.AreEqual(DismissalType.Stumped, _validator.CurrentDismissal.Type);
            Assert.AreEqual("Ashwin", _validator.CurrentDismissal.Bowler);
            Assert.AreEqual("Dhoni", _validator.CurrentDismissal.Fielder);
        }

        [Test]
        public void FieldingCoordinator_AppliesPresets_ConfiguresAll11Fielders()
        {
            GameObject coordObj = new GameObject("Coordinator");
            coordObj.transform.SetParent(_testRoot.transform);
            FieldingCoordinator coordinator = coordObj.AddComponent<FieldingCoordinator>();

            List<FielderController> fielders = new List<FielderController>();
            for (int i = 0; i < 11; i++)
            {
                GameObject fObj = new GameObject($"Fielder_{i}");
                fObj.transform.SetParent(coordObj.transform);
                var fc = fObj.AddComponent<FielderController>();
                coordinator.RegisterFielder(fc);
                fielders.Add(fc);
            }

            Assert.AreEqual(11, coordinator.Fielders.Count);

            // Test Attacking preset
            coordinator.ApplyPreset(FieldPreset.Attacking);
            Assert.AreEqual(FieldPreset.Attacking, coordinator.CurrentPreset);
            Assert.AreEqual("Bowler", fielders[0].RoleName);
            Assert.IsTrue(fielders[0].IsBowler);
            Assert.AreEqual("Wicketkeeper", fielders[1].RoleName);
            Assert.IsTrue(fielders[1].IsWicketkeeper);
            Assert.AreEqual("First Slip", fielders[2].RoleName);

            // Test Defensive preset
            coordinator.ApplyPreset(FieldPreset.Defensive);
            Assert.AreEqual(FieldPreset.Defensive, coordinator.CurrentPreset);
            Assert.AreEqual("Deep Point", fielders[2].RoleName);

            // Test Balanced preset
            coordinator.ApplyPreset(FieldPreset.Balanced);
            Assert.AreEqual(FieldPreset.Balanced, coordinator.CurrentPreset);
        }

        [Test]
        public void FieldingCoordinator_ResetAllFielders_ReturnsAllFieldersToHomePositions()
        {
            GameObject coordObj = new GameObject("Coordinator");
            coordObj.transform.SetParent(_testRoot.transform);
            FieldingCoordinator coordinator = coordObj.AddComponent<FieldingCoordinator>();

            List<FielderController> fielders = new List<FielderController>();
            for (int i = 0; i < 11; i++)
            {
                GameObject fObj = new GameObject($"Fielder_{i}");
                fObj.transform.SetParent(coordObj.transform);
                var fc = fObj.AddComponent<FielderController>();
                coordinator.RegisterFielder(fc);
                fielders.Add(fc);
            }

            coordinator.ApplyPreset(FieldPreset.Balanced);

            // Simulate fielders sprinting away to retrieve ball
            foreach (var f in fielders)
            {
                f.transform.position = new Vector3(25f, 0f, 30f);
            }

            // Reset fielders
            coordinator.ResetAllFielders();

            // Every fielder should be back at their designated home position and in Ready state
            foreach (var f in fielders)
            {
                Assert.AreEqual(f.HomePosition, f.transform.position);
                Assert.AreEqual(FielderState.Ready, f.CurrentState);
            }
        }
    }
}
