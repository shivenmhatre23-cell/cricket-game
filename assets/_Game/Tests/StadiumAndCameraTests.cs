using NUnit.Framework;
using UnityEngine;
using CricketLegends.Cameras;
using CricketLegends.Core;
using CricketLegends.Presentation;

namespace CricketLegends.Tests
{
    public class StadiumAndCameraTests
    {
        [Test]
        public void PitchCoordinates_DimensionsAdhereToMCCRules()
        {
            // Official 22 yards = 20.12 meters between bowling creases/stumps
            Assert.AreEqual(20.12f, PitchCoordinates.PitchLengthWicketToWicket, 0.001f);
            Assert.AreEqual(10.06f, PitchCoordinates.PitchHalfLength, 0.001f);

            // Striker at +10.06m, Bowler at -10.06m
            Assert.AreEqual(10.06f, PitchCoordinates.StrikerWicketsPosition.z, 0.001f);
            Assert.AreEqual(-10.06f, PitchCoordinates.BowlerWicketsPosition.z, 0.001f);

            // Popping crease is 1.22m (4 feet) in front of wicket
            Assert.AreEqual(8.84f, PitchCoordinates.StrikerPoppingCreaseZ, 0.001f);
            Assert.AreEqual(-8.84f, PitchCoordinates.BowlerPoppingCreaseZ, 0.001f);

            // Stumps height is 0.711m (28 inches)
            Assert.AreEqual(0.711f, PitchCoordinates.StumpHeight, 0.001f);
        }

        [Test]
        public void PitchCoordinates_BoundaryDetectionEvaluatesCorrectly()
        {
            // Center of pitch is not beyond boundary
            Assert.IsFalse(PitchCoordinates.IsBeyondBoundary(Vector3.zero));

            // Pitch edge is inside
            Assert.IsFalse(PitchCoordinates.IsBeyondBoundary(new Vector3(10f, 0, 10f)));

            // 30-yard circle is inside
            Assert.IsFalse(PitchCoordinates.IsBeyondBoundary(new Vector3(25f, 0, 0f)));

            // Just inside boundary
            Assert.IsFalse(PitchCoordinates.IsBeyondBoundary(new Vector3(60f, 0, 0f)));

            // Past boundary (66m X, 72m Z)
            Assert.IsTrue(PitchCoordinates.IsBeyondBoundary(new Vector3(70f, 0, 0f)));
            Assert.IsTrue(PitchCoordinates.IsBeyondBoundary(new Vector3(0f, 0, 75f)));
            Assert.IsTrue(PitchCoordinates.IsBeyondBoundary(new Vector3(55f, 0, 60f)));
        }

        [Test]
        public void FieldingPositionsData_AllPresetsContainExactly11Players()
        {
            FieldPreset[] presets = { FieldPreset.Balanced, FieldPreset.Attacking, FieldPreset.Defensive };

            foreach (var preset in presets)
            {
                var fielders = FieldingPositionsData.GetFieldPreset(preset);
                Assert.AreEqual(11, fielders.Count, $"Preset {preset} must have 11 fielders.");

                int keeperCount = 0;
                int bowlerCount = 0;

                foreach (var f in fielders)
                {
                    if (f.IsWicketkeeper) keeperCount++;
                    if (f.IsBowler) bowlerCount++;

                    // Every fielder must be placed within the boundary rope
                    Assert.IsFalse(PitchCoordinates.IsBeyondBoundary(f.LocalPosition),
                        $"Fielder {f.RoleName} is placed outside boundary in preset {preset}!");
                }

                Assert.AreEqual(1, keeperCount, $"Preset {preset} must have exactly 1 wicketkeeper.");
                Assert.AreEqual(1, bowlerCount, $"Preset {preset} must have exactly 1 bowler.");
            }
        }

        [Test]
        public void WicketsController_BreakAndResetWorksReliably()
        {
            GameObject wicketObj = new GameObject("Test_Wicket");
            var wickets = wicketObj.AddComponent<WicketsController>();
            wickets.SetupProceduralWicketStructure(null);

            Assert.IsFalse(wickets.IsBroken);

            // Break wickets
            wickets.BreakWickets(wicketObj.transform.position, new Vector3(0, 0, 25f));
            Assert.IsTrue(wickets.IsBroken);

            // Reset wickets
            wickets.ResetWickets();
            Assert.IsFalse(wickets.IsBroken);

            Object.DestroyImmediate(wicketObj);
        }

        [Test]
        public void CameraDirector_CyclesAllFiveBroadcastModes()
        {
            GameObject camObj = new GameObject("Test_CameraDirector");
            camObj.AddComponent<Camera>();
            var director = camObj.AddComponent<CameraDirector>();

            Assert.AreEqual(CameraViewMode.BattingBroadcast, director.CurrentMode);

            director.CycleNextMode();
            Assert.AreEqual(CameraViewMode.BowlerRunUp, director.CurrentMode);

            director.CycleNextMode();
            Assert.AreEqual(CameraViewMode.BallFollow, director.CurrentMode);

            director.CycleNextMode();
            Assert.AreEqual(CameraViewMode.BoundaryShot, director.CurrentMode);

            director.CycleNextMode();
            Assert.AreEqual(CameraViewMode.DismissalView, director.CurrentMode);

            director.CycleNextMode();
            Assert.AreEqual(CameraViewMode.BattingBroadcast, director.CurrentMode);

            Object.DestroyImmediate(camObj);
        }

        [Test]
        public void CameraDirector_ReactsToGameplayEvents()
        {
            GameObject camObj = new GameObject("Test_CameraDirector");
            camObj.AddComponent<Camera>();
            var director = camObj.AddComponent<CameraDirector>();

            director.SetMode(CameraViewMode.BattingBroadcast, immediate: true);

            // 1. Perfect shot fires -> triggers BallFollow view
            CricketEvents.FireShotExecuted("LoftedAttack", "PERFECT", 28f);
            Assert.AreEqual(CameraViewMode.BallFollow, director.CurrentMode);

            // 2. Wicket falls -> triggers DismissalView
            CricketEvents.FireWicketFallen("Batter", "Bowler", "Bowled");
            Assert.AreEqual(CameraViewMode.DismissalView, director.CurrentMode);

            // 3. New delivery begins -> resets to BattingBroadcast
            CricketEvents.FireDeliveryStarted(1, 1);
            Assert.AreEqual(CameraViewMode.BattingBroadcast, director.CurrentMode);

            Object.DestroyImmediate(camObj);
        }
    }
}
