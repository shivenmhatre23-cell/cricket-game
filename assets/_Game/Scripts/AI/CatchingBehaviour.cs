using UnityEngine;
using CricketLegends.Physics;

namespace CricketLegends.AI
{
    public enum CatchAttemptResult
    {
        Success,
        Dropped,
        OutOfReach,
        IneligibleBounced
    }

    /// <summary>
    /// Reusable logic determining fielder catch eligibility, reachable volume,
    /// and catch success probability.
    /// </summary>
    public static class CatchingBehaviour
    {
        public const float MaxCatchRadius = 1.85f; // Reachable catch sphere around fielder
        public const float MinCatchHeight = 0.20f; // Ankle height low scoop
        public const float MaxCatchHeight = 2.45f; // Overhead leap reach

        /// <summary>
        /// Evaluates whether a fielder can execute a legal catch on the current ball.
        /// STRICT INVARIANT: A ball that has bounced cannot result in a caught dismissal.
        /// </summary>
        public static CatchAttemptResult EvaluateCatchAttempt(
            CricketBall ball,
            Vector3 fielderPosition,
            float reactionTimeElapsed,
            float fielderCatchSkill = 0.90f)
        {
            if (ball == null) return CatchAttemptResult.OutOfReach;

            // 1. Strict Eligibility Check: Ball must be airborne and unbounced!
            if (ball.BounceCount > 0 || ball.State == BallState.Pitched)
            {
                return CatchAttemptResult.IneligibleBounced;
            }

            // Ball must be in flight following a bat strike
            if (ball.State != BallState.Struck && ball.State != BallState.InFlight)
            {
                return CatchAttemptResult.IneligibleBounced;
            }

            // 2. Reachable Catch Volume Check
            Vector3 ballPos = ball.Position;
            float horizontalDistance = Vector2.Distance(
                new Vector2(fielderPosition.x, fielderPosition.z),
                new Vector2(ballPos.x, ballPos.z)
            );

            if (horizontalDistance > MaxCatchRadius)
            {
                return CatchAttemptResult.OutOfReach;
            }

            if (ballPos.y < MinCatchHeight || ballPos.y > MaxCatchHeight)
            {
                return CatchAttemptResult.OutOfReach;
            }

            // 3. Reaction Time Check (Fielder must have had at least 0.15s to react)
            if (reactionTimeElapsed < 0.15f)
            {
                return CatchAttemptResult.OutOfReach;
            }

            // 4. Catch Difficulty & Probability Evaluation
            float ballSpeed = ball.Velocity.magnitude;
            float speedPenalty = Mathf.Clamp01((ballSpeed - 18f) / 25f) * 0.35f;
            float distancePenalty = (horizontalDistance / MaxCatchRadius) * 0.20f;

            float catchProbability = Mathf.Clamp01(fielderCatchSkill - speedPenalty - distancePenalty);

            // Deterministic check: random roll against catch probability
            bool catchSucceeded = UnityEngine.Random.value <= catchProbability;

            return catchSucceeded ? CatchAttemptResult.Success : CatchAttemptResult.Dropped;
        }
    }
}
