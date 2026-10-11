using UnityEngine;
using CricketLegends.Physics;
using CricketLegends.Presentation;

namespace CricketLegends.AI
{
    /// <summary>
    /// Reusable pursuit and intercept trajectory prediction for fielders chasing the ball.
    /// </summary>
    public static class BallChaseBehaviour
    {
        public const float MaxSprintSpeed = 7.6f; // Realistic sprint speed: 7.6 m/s (~27.4 km/h)
        public const float BaseAcceleration = 14.0f; // Rapid initial acceleration

        /// <summary>
        /// Predicts the ground intercept location where a fielder can meet the ball.
        /// </summary>
        public static Vector3 CalculateInterceptPoint(
            Vector3 fielderPos,
            Vector3 ballPos,
            Vector3 ballVelocity,
            float fielderSpeed = MaxSprintSpeed)
        {
            // If ball is moving slowly or stopped, intercept point is current ball position
            float ballGroundSpeed = new Vector2(ballVelocity.x, ballVelocity.z).magnitude;
            if (ballGroundSpeed < 1.5f)
            {
                return new Vector3(ballPos.x, 0f, ballPos.z);
            }

            // Estimate intercept time via iterative ray projection
            Vector3 ballDir = new Vector3(ballVelocity.x, 0f, ballVelocity.z).normalized;
            Vector3 toFielder = fielderPos - ballPos;
            float projection = Vector3.Dot(toFielder, ballDir);

            // Estimated meet distance down ball trajectory
            float leadDistance = Mathf.Clamp(projection + 6.0f, 2.0f, 60.0f);
            Vector3 projectedPoint = ballPos + ballDir * leadDistance;
            projectedPoint.y = 0f;

            // Clamp intercept point within ground boundary oval
            if (PitchCoordinates.IsBeyondBoundary(projectedPoint))
            {
                float normX = projectedPoint.x / PitchCoordinates.BoundaryRadiusX;
                float normZ = projectedPoint.z / PitchCoordinates.BoundaryRadiusZ;
                float len = Mathf.Sqrt(normX * normX + normZ * normZ);
                if (len > 0.01f)
                {
                    projectedPoint.x = (normX / len) * (PitchCoordinates.BoundaryRadiusX - 1.5f);
                    projectedPoint.z = (normZ / len) * (PitchCoordinates.BoundaryRadiusZ - 1.5f);
                }
            }

            return projectedPoint;
        }

        /// <summary>
        /// Calculates new position after moving toward target with realistic acceleration and speed limits.
        /// </summary>
        public static Vector3 MoveTowardTarget(
            Vector3 currentPos,
            Vector3 targetPos,
            ref Vector3 currentVelocity,
            float deltaTime,
            float maxSpeed = MaxSprintSpeed)
        {
            Vector3 delta = targetPos - currentPos;
            delta.y = 0f;
            float distance = delta.magnitude;

            if (distance < 0.05f)
            {
                currentVelocity = Vector3.zero;
                return currentPos;
            }

            Vector3 desiredDir = delta.normalized;
            // Decelerate smoothly when within 2 meters of target
            float targetSpeed = distance < 2.0f ? Mathf.Lerp(1.5f, maxSpeed, distance / 2.0f) : maxSpeed;
            Vector3 desiredVelocity = desiredDir * targetSpeed;

            currentVelocity = Vector3.MoveTowards(currentVelocity, desiredVelocity, BaseAcceleration * deltaTime);
            return currentPos + currentVelocity * deltaTime;
        }
    }
}
