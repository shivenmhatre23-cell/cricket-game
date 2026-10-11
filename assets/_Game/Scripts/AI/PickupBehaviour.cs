using UnityEngine;
using CricketLegends.Physics;

namespace CricketLegends.AI
{
    public enum PickupResult
    {
        CleanPickup,
        Fumbled,
        TooFar
    }

    /// <summary>
    /// Reusable ground gathering and pickup logic for rolling or bounced balls.
    /// </summary>
    public static class PickupBehaviour
    {
        public const float PickupRadius = 1.60f; // Maximum reach for ground gathering

        public static PickupResult EvaluatePickup(
            CricketBall ball,
            Vector3 fielderPosition,
            float fielderFieldingSkill = 0.92f)
        {
            if (ball == null) return PickupResult.TooFar;

            Vector3 ballPos = ball.Position;
            float horizontalDist = Vector2.Distance(
                new Vector2(fielderPosition.x, fielderPosition.z),
                new Vector2(ballPos.x, ballPos.z)
            );

            if (horizontalDist > PickupRadius || ballPos.y > 0.90f)
            {
                return PickupResult.TooFar;
            }

            // High ball rolling speeds increase fumble risk
            float ballGroundSpeed = new Vector2(ball.Velocity.x, ball.Velocity.z).magnitude;
            float fumbleRisk = Mathf.Clamp01((ballGroundSpeed - 12f) / 20f) * 0.25f;

            float cleanPickupProbability = Mathf.Clamp01(fielderFieldingSkill - fumbleRisk);
            bool clean = UnityEngine.Random.value <= cleanPickupProbability;

            return clean ? PickupResult.CleanPickup : PickupResult.Fumbled;
        }
    }
}
