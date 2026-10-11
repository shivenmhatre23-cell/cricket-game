using UnityEngine;
using CricketLegends.Gameplay;

namespace CricketLegends.Physics
{
    /// <summary>
    /// Computes physical impulse and exit trajectory for bat-ball collisions.
    /// Uses Newtonian coefficient of restitution (e), bat velocity, power multipliers,
    /// and timing degradations instead of arbitrary position teleportation.
    /// </summary>
    public static class BatCollisionResolver
    {
        public const float WillowRestitution = 0.62f; // Willow wood on leather ball coefficient

        /// <summary>
        /// Calculates the 3D outgoing velocity vector following bat-ball contact.
        /// </summary>
        public static Vector3 CalculateExitVelocity(
            Vector3 incomingBallVelocity,
            BattingShotData shotData,
            TimingQuality timingQuality,
            Vector2 playerAimDirection,
            Vector3 contactPoint)
        {
            if (timingQuality == TimingQuality.Miss || shotData == null)
            {
                return incomingBallVelocity; // Complete miss, ball retains natural trajectory
            }

            // 1. Determine timing scale and angle dispersion
            float timingSpeedFactor = 1.0f;
            float angleDispersion = 0f;
            float loftDispersion = 0f;

            switch (timingQuality)
            {
                case TimingQuality.Perfect:
                    timingSpeedFactor = 1.00f;
                    angleDispersion = 0f;
                    loftDispersion = 0f;
                    break;

                case TimingQuality.Good:
                    timingSpeedFactor = 0.86f;
                    angleDispersion = Random.Range(-3.5f, 3.5f);
                    loftDispersion = Random.Range(-1.5f, 1.5f);
                    break;

                case TimingQuality.Early:
                    // Early shot: leading edge risk, squirts towards leg-side with elevated popup
                    timingSpeedFactor = 0.52f;
                    angleDispersion = Random.Range(14f, 26f); // Skew towards leg side
                    loftDispersion = Random.Range(8f, 18f);   // Pop-up catch danger
                    break;

                case TimingQuality.Late:
                    // Late cut/edge: squirts off thick outside edge towards slips/gully
                    timingSpeedFactor = 0.58f;
                    angleDispersion = Random.Range(-18f, -30f); // Skew towards off side/slips
                    loftDispersion = Random.Range(-4f, 4f);
                    break;
            }

            // 2. Linear exit speed via coefficient of restitution (e):
            // V_exit = (e * V_ball_in + (1 + e) * V_bat) * PowerMultiplier * TimingFactor
            float incomingSpeed = incomingBallVelocity.magnitude;
            float batSpeed = shotData.BatVelocity;
            float e = WillowRestitution;

            float baseExitSpeed = (incomingSpeed * e + batSpeed * (1.0f + e)) * shotData.PowerMultiplier * timingSpeedFactor;

            // Cap exit speed within realistic cricket bounds (8 m/s for soft defensive drop, 45 m/s for maximum six)
            baseExitSpeed = Mathf.Clamp(baseExitSpeed, 6f, 46f);

            // 3. Direction Vector Calculation
            // Combined horizontal azimuth angle (degrees relative to -Z, which points down the ground towards bowler)
            // Note: Bat strikes toward bowler's end (-Z direction in world space)
            float playerAzimuthAdjust = playerAimDirection.x * 20f;
            float totalAzimuth = shotData.BaseAzimuthAngle + playerAzimuthAdjust + angleDispersion;
            float totalLoft = Mathf.Clamp(shotData.LoftAngle + loftDispersion + playerAimDirection.y * 6f, 1.5f, 48f);

            // Convert spherical angles to Cartesian direction (Facing -Z as straight down the pitch)
            float radAzimuth = totalAzimuth * Mathf.Deg2Rad;
            float radLoft = totalLoft * Mathf.Deg2Rad;

            // X = lateral displacement (Off/Leg)
            // Y = vertical loft
            // Z = forward drive (-Z towards bowler/field)
            float vx = Mathf.Sin(radAzimuth) * Mathf.Cos(radLoft);
            float vy = Mathf.Sin(radLoft);
            float vz = -Mathf.Cos(radAzimuth) * Mathf.Cos(radLoft); // Negative Z is down the pitch toward bowler

            Vector3 exitDirection = new Vector3(vx, vy, vz).normalized;
            return exitDirection * baseExitSpeed;
        }
    }
}
