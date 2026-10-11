using System.Collections.Generic;
using UnityEngine;
using CricketLegends.Core;
using CricketLegends.Physics;
using CricketLegends.Presentation;

namespace CricketLegends.AI
{
    /// <summary>
    /// Central coordinator for the fielding team.
    /// Manages presets, selects optimal fielder when a shot is struck,
    /// and resets all 11 fielders between deliveries.
    /// Eliminates duplicated decision-making across individual fielders.
    /// </summary>
    public class FieldingCoordinator : MonoBehaviour
    {
        [Header("Configuration")]
        [SerializeField] private FieldPreset _currentPreset = FieldPreset.Balanced;
        [SerializeField] private List<FielderController> _fielders = new List<FielderController>();
        [SerializeField] private FielderController _activeAssignedFielder = null;

        public FieldPreset CurrentPreset => _currentPreset;
        public IReadOnlyList<FielderController> Fielders => _fielders;
        public FielderController ActiveFielder => _activeAssignedFielder;

        private void OnEnable()
        {
            CricketEvents.BallHit += HandleBallHit;
            CricketEvents.DeliveryStarted += HandleDeliveryStarted;
            CricketEvents.DeliveryCompleted += HandleDeliveryCompleted;
        }

        private void OnDisable()
        {
            CricketEvents.BallHit -= HandleBallHit;
            CricketEvents.DeliveryStarted -= HandleDeliveryStarted;
            CricketEvents.DeliveryCompleted -= HandleDeliveryCompleted;
        }

        public void RegisterFielder(FielderController fielder)
        {
            if (!_fielders.Contains(fielder))
            {
                _fielders.Add(fielder);
                fielder.OnCatchTaken += HandleCatchTaken;
                fielder.OnCatchDropped += HandleCatchDropped;
            }
        }

        public void ApplyPreset(FieldPreset preset)
        {
            _currentPreset = preset;
            var presetData = FieldingPositionsData.GetFieldPreset(preset);

            for (int i = 0; i < _fielders.Count && i < presetData.Count; i++)
            {
                _fielders[i].Configure(
                    presetData[i].RoleName,
                    presetData[i].LocalPosition,
                    presetData[i].IsWicketkeeper,
                    presetData[i].IsBowler
                );
            }

            CricketLogger.LogInfo(LogChannel.AI, $"Fielding Coordinator applied preset: [{preset}]");
        }

        /// <summary>
        /// Evaluates struck ball trajectory and assigns optimal fielder to chase.
        /// </summary>
        public FielderController EvaluateAndAssignFielder(CricketBall ball)
        {
            if (ball == null || _fielders.Count == 0) return null;

            Vector3 ballPos = ball.Position;
            Vector3 ballVel = ball.Velocity;

            // Estimate intercept area
            Vector3 estimatedGroundIntercept = BallChaseBehaviour.CalculateInterceptPoint(
                Vector3.zero,
                ballPos,
                ballVel
            );

            // Find closest fielder with shortest intercept time
            FielderController bestFielder = null;
            float shortestDistance = float.MaxValue;

            foreach (var fielder in _fielders)
            {
                float dist = Vector2.Distance(
                    new Vector2(fielder.transform.position.x, fielder.transform.position.z),
                    new Vector2(estimatedGroundIntercept.x, estimatedGroundIntercept.z)
                );

                if (dist < shortestDistance)
                {
                    shortestDistance = dist;
                    bestFielder = fielder;
                }
            }

            // Assign best fielder
            if (_activeAssignedFielder != null && _activeAssignedFielder != bestFielder)
            {
                _activeAssignedFielder.Unassign();
            }

            _activeAssignedFielder = bestFielder;
            if (_activeAssignedFielder != null)
            {
                _activeAssignedFielder.AssignToChase(estimatedGroundIntercept, ball);
                CricketLogger.LogDiagnostic(LogChannel.AI,
                    $"Assigned [{_activeAssignedFielder.RoleName}] to chase ball (Dist: {shortestDistance:F1}m)");
            }

            return _activeAssignedFielder;
        }

        private void HandleBallHit(Vector3 contactPoint, Vector3 exitVelocity)
        {
            CricketBall ball = FindFirstObjectByType<CricketBall>();
            if (ball != null)
            {
                EvaluateAndAssignFielder(ball);
            }
        }

        private void HandleCatchTaken(FielderController fielder, CricketBall ball)
        {
            CricketEvents.FireWicketFallen("Striker", "Bowler", $"Caught by {fielder.RoleName}");
        }

        private void HandleCatchDropped(FielderController fielder, CricketBall ball)
        {
            CricketLogger.LogInfo(LogChannel.AI, $"Catch dropped by {fielder.RoleName}! Play continues.");
        }

        private void HandleDeliveryStarted(int over, int ball)
        {
            ResetAllFielders();
        }

        private void HandleDeliveryCompleted(DeliveryResultData result)
        {
            ResetAllFielders();
        }

        public void ResetAllFielders()
        {
            _activeAssignedFielder = null;
            foreach (var f in _fielders)
            {
                if (f != null)
                {
                    f.ResetToHomePosition();
                }
            }
        }
    }
}
