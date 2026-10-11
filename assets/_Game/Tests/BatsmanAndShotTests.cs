using NUnit.Framework;
using UnityEngine;
using CricketLegends.Gameplay;
using CricketLegends.Physics;
using CricketLegends.Players;

namespace CricketLegends.Tests
{
    public class BatsmanAndShotTests
    {
        private GameObject _holder;
        private BatsmanController _batsman;
        private GameObject _ballHolder;
        private CricketBall _ball;

        [SetUp]
        public void SetUp()
        {
            _holder = new GameObject("Test_Batsman");
            _batsman = _holder.AddComponent<BatsmanController>();

            _ballHolder = new GameObject("Test_CricketBall");
            _ball = _ballHolder.AddComponent<CricketBall>();

            _batsman.SetBallReference(_ball);
        }

        [TearDown]
        public void TearDown()
        {
            if (_ballHolder != null) Object.DestroyImmediate(_ballHolder);
            if (_holder != null) Object.DestroyImmediate(_holder);
        }

        [Test]
        public void AllEightShotPresets_InitializeWithValidParameters()
        {
            BattingShotType[] allShots = {
                BattingShotType.ForwardDefense,
                BattingShotType.BackFootDefense,
                BattingShotType.StraightDrive,
                BattingShotType.CoverDrive,
                BattingShotType.OnDrive,
                BattingShotType.Pull,
                BattingShotType.Cut,
                BattingShotType.LoftedAttack
            };

            foreach (var shotType in allShots)
            {
                var shotData = BattingShotData.CreatePreset(shotType);

                Assert.AreEqual(shotType, shotData.ShotType);
                Assert.IsFalse(string.IsNullOrEmpty(shotData.ShotName));
                Assert.Greater(shotData.SwingDuration, 0.1f);
                Assert.Greater(shotData.BatVelocity, 5f);
                Assert.Greater(shotData.PowerMultiplier, 0.1f);
                Assert.Greater(shotData.RecoveryDuration, 0.1f);

                Object.DestroyImmediate(shotData);
            }
        }

        [Test]
        public void TimingClassification_AccuratelyDistinguishesWindows()
        {
            var driveData = BattingShotData.CreatePreset(BattingShotType.StraightDrive);

            // 1. Perfect timing (within ±0.045s)
            Assert.AreEqual(TimingQuality.Perfect, driveData.ClassifyTiming(0.00f));
            Assert.AreEqual(TimingQuality.Perfect, driveData.ClassifyTiming(0.035f));
            Assert.AreEqual(TimingQuality.Perfect, driveData.ClassifyTiming(-0.035f));

            // 2. Good timing (between 0.045s and 0.110s)
            Assert.AreEqual(TimingQuality.Good, driveData.ClassifyTiming(0.08f));
            Assert.AreEqual(TimingQuality.Good, driveData.ClassifyTiming(-0.08f));

            // 3. Early timing (between -0.110s and -0.220s)
            Assert.AreEqual(TimingQuality.Early, driveData.ClassifyTiming(-0.16f));

            // 4. Late timing (between 0.110s and 0.220s)
            Assert.AreEqual(TimingQuality.Late, driveData.ClassifyTiming(0.16f));

            // 5. Complete miss (beyond marginal window)
            Assert.AreEqual(TimingQuality.Miss, driveData.ClassifyTiming(0.35f));
            Assert.AreEqual(TimingQuality.Miss, driveData.ClassifyTiming(-0.35f));

            Object.DestroyImmediate(driveData);
        }

        [Test]
        public void WellTimedDrive_ProducesHighForwardExitVelocity()
        {
            var drive = BattingShotData.CreatePreset(BattingShotType.StraightDrive);
            Vector3 incomingVel = new Vector3(0, -3.5f, 38f); // 137 km/h incoming

            Vector3 exitVel = BatCollisionResolver.CalculateExitVelocity(
                incomingVel,
                drive,
                TimingQuality.Perfect,
                Vector2.zero,
                Vector3.zero
            );

            // Must travel forward down the ground toward bowler (-Z)
            Assert.Less(exitVel.z, -25f, "Straight drive exit velocity must be strongly directed toward -Z.");
            // Must have slight positive vertical launch
            Assert.Greater(exitVel.y, 1.0f);
            Assert.Less(exitVel.y, 8.0f);
            // Magnitude must be high (>30 m/s)
            Assert.Greater(exitVel.magnitude, 30f);

            Object.DestroyImmediate(drive);
        }

        [Test]
        public void DefensiveShot_ProducesLowDeadBatExitVelocity()
        {
            var defense = BattingShotData.CreatePreset(BattingShotType.ForwardDefense);
            Vector3 incomingVel = new Vector3(0, -3f, 36f);

            Vector3 exitVel = BatCollisionResolver.CalculateExitVelocity(
                incomingVel,
                defense,
                TimingQuality.Perfect,
                Vector2.zero,
                Vector3.zero
            );

            // Defensive block deadens momentum: speed should be gentle (< 12 m/s)
            Assert.Less(exitVel.magnitude, 12f, "Defensive shot must substantially deaden outgoing velocity.");

            Object.DestroyImmediate(defense);
        }

        [Test]
        public void LoftedShot_ProducesHighElevationLaunchAngle()
        {
            var lofted = BattingShotData.CreatePreset(BattingShotType.LoftedAttack);
            Vector3 incomingVel = new Vector3(0, -3f, 35f);

            Vector3 exitVel = BatCollisionResolver.CalculateExitVelocity(
                incomingVel,
                lofted,
                TimingQuality.Perfect,
                Vector2.zero,
                Vector3.zero
            );

            // Lofted attack has 38° elevation angle -> substantial vertical vy
            Assert.Greater(exitVel.y, 15f, "Lofted attack must produce strong vertical lift for a boundary hit.");
            Assert.Greater(exitVel.magnitude, 35f);

            Object.DestroyImmediate(lofted);
        }

        [Test]
        public void EarlyAndLateShots_DispenseVelocityTowardLegAndOffSides()
        {
            var drive = BattingShotData.CreatePreset(BattingShotType.StraightDrive);
            Vector3 incomingVel = new Vector3(0, -3f, 35f);

            // Early shot -> Skews toward Leg-side (+X)
            Vector3 earlyExit = BatCollisionResolver.CalculateExitVelocity(
                incomingVel,
                drive,
                TimingQuality.Early,
                Vector2.zero,
                Vector3.zero
            );
            Assert.Greater(earlyExit.x, 0f, "Early shot must skew toward leg-side.");
            Assert.Less(earlyExit.magnitude, 28f, "Early shot must suffer power degradation.");

            // Late shot -> Skews toward Off-side (-X)
            Vector3 lateExit = BatCollisionResolver.CalculateExitVelocity(
                incomingVel,
                drive,
                TimingQuality.Late,
                Vector2.zero,
                Vector3.zero
            );
            Assert.Less(lateExit.x, 0f, "Late shot must skew toward off-side.");

            Object.DestroyImmediate(drive);
        }

        [Test]
        public void SingleBatContactInvariant_CannotRegisterDuplicateHitsPerDelivery()
        {
            var delivery = BowlingDelivery.CreatePreset(DeliveryLength.GoodLength, 135f);
            _ball.LaunchDelivery(delivery, 1);

            // Position ball at strike zone (Z = 8.95m, Y = 0.5m)
            _ball.transform.position = new Vector3(0.12f, 0.50f, 8.95f);

            _batsman.SelectShot(BattingShotType.StraightDrive);
            bool executed = _batsman.TryExecuteShot();
            Assert.IsTrue(executed);
            Assert.IsTrue(_batsman.HasHitCurrentDelivery, "Ball must be struck when in contact zone.");

            // Attempting second hit while already struck MUST not trigger new impulse
            bool secondHitAttempt = _batsman.TryExecuteShot();
            Assert.IsFalse(secondHitAttempt, "Second bat swing while active must be rejected.");

            Object.DestroyImmediate(delivery);
        }

        [Test]
        public void DeliveryOutsideContactZone_DoesNotTriggerBatContact()
        {
            var delivery = BowlingDelivery.CreatePreset(DeliveryLength.GoodLength, 135f);
            _ball.LaunchDelivery(delivery, 1);

            // Position ball far wide outside off-stump (X = 3.5m)
            _ball.transform.position = new Vector3(3.5f, 0.50f, 8.95f);

            _batsman.SelectShot(BattingShotType.StraightDrive);
            _batsman.TryExecuteShot();

            // Ball is wide and unreachable -> no contact
            Assert.IsFalse(_batsman.HasHitCurrentDelivery);

            Object.DestroyImmediate(delivery);
        }

        [Test]
        public void Batsman_ReturnsToReadyStanceAfterDelivery()
        {
            Assert.AreEqual(BatsmanState.Ready, _batsman.CurrentState);

            _batsman.TryExecuteShot();
            Assert.AreEqual(BatsmanState.BatSwing, _batsman.CurrentState);

            // Reset back to ready stance
            _batsman.ResetToReadyStance();
            Assert.AreEqual(BatsmanState.Ready, _batsman.CurrentState);
            Assert.IsFalse(_batsman.HasHitCurrentDelivery);
        }
    }
}
