using UnityEngine;
using CricketLegends.Physics;
using CricketLegends.Presentation;

namespace CricketLegends.AI
{
    public enum ThrowTargetEnd
    {
        StrikerEnd,
        BowlerEnd,
        Wicketkeeper
    }

    /// <summary>
    /// Calculates throw trajectory from fielder back to the wickets or wicketkeeper.
    /// Supports tactical decision making for run-out targeting.
    /// </summary>
    public static class ThrowController
    {
        public const float StandardThrowSpeed = 28.0f; // 28 m/s = ~100 km/h return throw

        /// <summary>
        /// Determines the optimal wicket to throw toward based on runner progress.
        /// </summary>
        public static ThrowTargetEnd SelectOptimalThrowTarget(
            Vector3 fielderPosition,
            float strikerRunProgress) // 0.0 at striker crease, 1.0 at bowler crease
        {
            // If runner is in first half of run (0.0 to 0.5), throw to striker end
            // If runner is in second half of run (0.5 to 1.0), throw to bowler end
            if (strikerRunProgress < 0.5f)
            {
                return ThrowTargetEnd.StrikerEnd;
            }
            return ThrowTargetEnd.BowlerEnd;
        }

        public static Vector3 GetTargetWorldPosition(ThrowTargetEnd target)
        {
            switch (target)
            {
                case ThrowTargetEnd.StrikerEnd:
                    return PitchCoordinates.StrikerWicketsPosition + Vector3.up * 0.40f;
                case ThrowTargetEnd.BowlerEnd:
                    return PitchCoordinates.BowlerWicketsPosition + Vector3.up * 0.40f;
                case ThrowTargetEnd.Wicketkeeper:
                default:
                    return new Vector3(0f, 1.10f, 15.6f);
            }
        }

        /// <summary>
        /// Calculates ballistic throw velocity from fielder position to target stumps.
        /// </summary>
        public static Vector3 CalculateThrowVelocity(
            Vector3 releasePosition,
            Vector3 targetPosition,
            float throwSpeed = StandardThrowSpeed)
        {
            float g = UnityEngine.Physics.gravity.y;
            Vector3 delta = targetPosition - releasePosition;
            float horizontalDistance = new Vector2(delta.x, delta.z).magnitude;

            if (horizontalDistance < 1.0f)
            {
                return delta.normalized * throwSpeed;
            }

            // Estimate flat throw flight time
            float time = horizontalDistance / throwSpeed;
            float vx = delta.x / time;
            float vz = delta.z / time;
            float vy = (delta.y - 0.5f * g * time * time) / time;

            return new Vector3(vx, vy, vz);
        }
    }
}
