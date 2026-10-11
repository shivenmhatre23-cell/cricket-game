using System.Collections.Generic;
using UnityEngine;

namespace CricketLegends.Physics
{
    /// <summary>
    /// Utility calculating launch velocities and predicting ballistic ball trajectories
    /// considering gravity, swing aerodynamics, and pitch impact points.
    /// </summary>
    public static class BallTrajectoryPredictor
    {
        /// <summary>
        /// Solves for the 3D release velocity vector required to deliver the ball from releasePos
        /// to strike targetPitchPos with total scalar speed launchSpeed.
        /// </summary>
        public static Vector3 CalculateLaunchVelocity(
            Vector3 releasePos,
            Vector3 targetPitchPos,
            float launchSpeed,
            float lateralSwingAcceleration = 0f)
        {
            float g = UnityEngine.Physics.gravity.y; // -9.81 m/s^2
            float dz = targetPitchPos.z - releasePos.z;
            float dy = targetPitchPos.y - releasePos.y;
            float dx = targetPitchPos.x - releasePos.x;

            if (dz <= 0.5f) dz = 1.0f;

            // Initial estimate for forward vz
            float vz = launchSpeed * 0.96f;

            // Iterative refinement (converges in 3 iterations)
            for (int i = 0; i < 4; i++)
            {
                float t = dz / Mathf.Max(1.0f, vz);
                float vy = (dy - 0.5f * g * t * t) / t;
                float vx = (dx - 0.5f * lateralSwingAcceleration * t * t) / t;

                float speedSquared = launchSpeed * launchSpeed;
                float remainingVzSquared = speedSquared - (vx * vx + vy * vy);

                if (remainingVzSquared > 0)
                {
                    vz = Mathf.Sqrt(remainingVzSquared);
                }
                else
                {
                    vz = launchSpeed * 0.90f;
                }
            }

            float finalTime = dz / Mathf.Max(1.0f, vz);
            float finalVy = (dy - 0.5f * g * finalTime * finalTime) / finalTime;
            float finalVx = (dx - 0.5f * lateralSwingAcceleration * finalTime * finalTime) / finalTime;

            return new Vector3(finalVx, finalVy, vz);
        }

        /// <summary>
        /// Samples predicted trajectory points at regular intervals for editor debug gizmos.
        /// </summary>
        public static Vector3[] SampleTrajectory(
            Vector3 startPos,
            Vector3 initialVelocity,
            float swingAcceleration,
            float maxTime = 1.2f,
            int sampleCount = 30)
        {
            Vector3[] points = new Vector3[sampleCount];
            float dt = maxTime / (sampleCount - 1);
            Vector3 g = UnityEngine.Physics.gravity;

            Vector3 currentPos = startPos;
            Vector3 currentVel = initialVelocity;

            for (int i = 0; i < sampleCount; i++)
            {
                points[i] = currentPos;

                Vector3 accel = g + new Vector3(swingAcceleration, 0, 0);
                currentVel += accel * dt;
                currentPos += currentVel * dt;

                // Stop if ball hits pitch level
                if (currentPos.y <= 0.02f && i > 5)
                {
                    points[i].y = 0.02f;
                    break;
                }
            }

            return points;
        }
    }
}
