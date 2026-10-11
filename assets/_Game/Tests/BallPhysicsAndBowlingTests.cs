using NUnit.Framework;
using UnityEngine;
using CricketLegends.Gameplay;
using CricketLegends.Physics;
using CricketLegends.Players;
using CricketLegends.Presentation;

namespace CricketLegends.Tests
{
    public class BallPhysicsAndBowlingTests
    {
        private GameObject _ballHolder;
        private CricketBall _ball;

        [SetUp]
        public void SetUp()
        {
            _ballHolder = new GameObject("Test_CricketBall");
            _ball = _ballHolder.AddComponent<CricketBall>();
        }

        [TearDown]
        public void TearDown()
        {
            if (_ballHolder != null)
            {
                Object.DestroyImmediate(_ballHolder);
            }
        }

        [Test]
        public void DeliveryPresets_ProduceValidLengthsAndPitchLocations()
        {
            DeliveryLength[] lengths = {
                DeliveryLength.Yorker,
                DeliveryLength.Full,
                DeliveryLength.GoodLength,
                DeliveryLength.Short,
                DeliveryLength.Bouncer
            };

            float previousPitchZ = 100f;

            foreach (var len in lengths)
            {
                var delivery = BowlingDelivery.CreatePreset(len, 135f, -0.10f);

                Assert.AreEqual(len, delivery.Length);
                Assert.AreEqual(135f, delivery.SpeedKmh);
                Assert.AreEqual(135f / 3.6f, delivery.SpeedMps, 0.001f);

                // Yorker should pitch furthest down the pitch, followed by Full, GoodLength, Short, and Bouncer
                float currentZ = delivery.IntendedPitchLocation.z;
                Assert.Less(currentZ, previousPitchZ, $"Preset {len} must pitch shorter than preceding length.");
                previousPitchZ = currentZ;

                Object.DestroyImmediate(delivery);
            }
        }

        [Test]
        public void LaunchVelocity_MatchesConfiguredPaceAndForwardProgress()
        {
            Vector3 releasePos = new Vector3(0.65f, 1.95f, -9.80f);
            Vector3 pitchTarget = new Vector3(0f, 0.03f, 4.50f);
            float speedKmh = 144f; // 40 m/s
            float speedMps = speedKmh / 3.6f;

            Vector3 launchVel = BallTrajectoryPredictor.CalculateLaunchVelocity(releasePos, pitchTarget, speedMps, 0f);

            // Total velocity magnitude must closely match speedMps
            Assert.AreEqual(speedMps, launchVel.magnitude, 0.15f);

            // Forward velocity along Z must be positive and dominate
            Assert.Greater(launchVel.z, 30f);

            // Vertical velocity must be directed downward toward pitch level
            Assert.Less(launchVel.y, 0f);
        }

        [Test]
        public void CricketBall_LaunchesAndResetsCleanly()
        {
            Assert.AreEqual(BallState.HeldInHand, _ball.State);
            Assert.AreEqual(0, _ball.BounceCount);
            Assert.IsFalse(_ball.IsOutcomeResolved);

            var delivery = BowlingDelivery.CreatePreset(DeliveryLength.GoodLength, 135f);

            // Launch Ball
            bool launched = _ball.LaunchDelivery(delivery, 1);
            Assert.IsTrue(launched);
            Assert.AreEqual(BallState.InFlight, _ball.State);
            Assert.AreEqual(1, _ball.DeliveryId);
            Assert.Greater(_ball.Velocity.z, 25f);

            // Reset Ball back to hand
            Vector3 handPos = new Vector3(0.8f, 1.8f, -25.0f);
            _ball.ResetToHand(handPos);

            Assert.AreEqual(BallState.HeldInHand, _ball.State);
            Assert.AreEqual(0, _ball.BounceCount);
            Assert.AreEqual(Vector3.zero, _ball.Velocity);
            Assert.AreEqual(handPos, _ball.Position);

            Object.DestroyImmediate(delivery);
        }

        [Test]
        public void CricketBall_ReleasesOnlyOncePerDelivery()
        {
            var delivery = BowlingDelivery.CreatePreset(DeliveryLength.Full, 130f);

            // First release succeeds
            bool firstLaunch = _ball.LaunchDelivery(delivery, 1);
            Assert.IsTrue(firstLaunch);

            // Attempting to launch second time while active MUST fail
            bool secondLaunch = _ball.LaunchDelivery(delivery, 1);
            Assert.IsFalse(secondLaunch, "Ball must reject multiple launches while in flight!");

            Object.DestroyImmediate(delivery);
        }

        [Test]
        public void BowlerController_RunUpProgressionAndSingleReleaseInvariant()
        {
            GameObject bowlerObj = new GameObject("Test_Bowler");
            var bowler = bowlerObj.AddComponent<BowlerController>();
            bowler.SetBallReference(_ball);

            Assert.AreEqual(BowlerState.Idle, bowler.CurrentState);
            Assert.IsFalse(bowler.HasReleasedBall);

            var delivery = BowlingDelivery.CreatePreset(DeliveryLength.GoodLength, 138f);
            bowler.StartDeliverySequence(delivery);

            Assert.AreEqual(BowlerState.RunUp, bowler.CurrentState);

            // Clean reset
            bowler.ResetToIdle();
            Assert.AreEqual(BowlerState.Idle, bowler.CurrentState);
            Assert.IsFalse(bowler.HasReleasedBall);

            Object.DestroyImmediate(bowlerObj);
            Object.DestroyImmediate(delivery);
        }

        [Test]
        public void StressTest_100RandomizedDeliveries_NeverStuckOrCorrupted()
        {
            DeliveryLength[] lengths = {
                DeliveryLength.Yorker,
                DeliveryLength.Full,
                DeliveryLength.GoodLength,
                DeliveryLength.Short,
                DeliveryLength.Bouncer
            };

            Vector3 releasePos = new Vector3(0.65f, 1.95f, -9.80f);

            // Execute 100 randomized deliveries
            for (int i = 0; i < 100; i++)
            {
                DeliveryLength randLength = lengths[i % lengths.Length];
                float randSpeed = Random.Range(85f, 155f);
                float randLine = Random.Range(-0.45f, 0.45f);
                float randSwing = Random.Range(-8f, 8f);
                float randSpin = Random.Range(-4f, 4f);

                var delivery = BowlingDelivery.CreatePreset(randLength, randSpeed, randLine, randSwing, randSpin);

                Vector3 targetPitchPos = delivery.IntendedPitchLocation;
                Vector3 launchVel = BallTrajectoryPredictor.CalculateLaunchVelocity(
                    releasePos,
                    targetPitchPos,
                    delivery.SpeedMps,
                    delivery.SwingAmount
                );

                // 1. Verify numbers are valid and non-NaN / non-infinite
                Assert.IsFalse(float.IsNaN(launchVel.x), $"Delivery {i}: LaunchVel X is NaN");
                Assert.IsFalse(float.IsNaN(launchVel.y), $"Delivery {i}: LaunchVel Y is NaN");
                Assert.IsFalse(float.IsNaN(launchVel.z), $"Delivery {i}: LaunchVel Z is NaN");

                // 2. Verify speed magnitude
                Assert.AreEqual(delivery.SpeedMps, launchVel.magnitude, 0.35f,
                    $"Delivery {i}: Magnitude mismatch at {randSpeed} km/h");

                // 3. Launch ball and verify flight state
                _ball.ResetToHand(releasePos);
                bool launched = _ball.LaunchDelivery(delivery, i + 1);
                Assert.IsTrue(launched, $"Delivery {i}: Launch failed.");
                Assert.AreEqual(BallState.InFlight, _ball.State);

                // 4. Reset clean for next ball
                _ball.ResetToHand(releasePos);
                Assert.AreEqual(BallState.HeldInHand, _ball.State);

                Object.DestroyImmediate(delivery);
            }
        }
    }
}
