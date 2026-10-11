using System;
using UnityEngine;
using CricketLegends.Presentation;

namespace CricketLegends.Rules
{
    public enum RunningState
    {
        Stationary,
        RunningRun1,
        RunningRun2,
        RunningRun3
    }

    /// <summary>
    /// Tracks batter crease positions, running between wickets, safe crease grounding,
    /// and run-out adjudication when stumps are physically broken.
    /// </summary>
    public class RunOutTracker : MonoBehaviour
    {
        [Header("State")]
        [SerializeField] private RunningState _runningState = RunningState.Stationary;
        [SerializeField] private int _completedRuns = 0;

        [Header("Batter Positions (Z-axis in meters)")]
        [SerializeField] private float _strikerZ = 9.15f;     // Grounded inside +8.84m crease
        [SerializeField] private float _nonStrikerZ = -9.00f;  // Grounded inside -8.84m crease

        public RunningState RunningState => _runningState;
        public int CompletedRuns => _completedRuns;
        public float StrikerZ => _strikerZ;
        public float NonStrikerZ => _nonStrikerZ;

        public void StartRun()
        {
            if (_runningState == RunningState.Stationary)
            {
                _runningState = RunningState.RunningRun1;
            }
        }

        public void UpdateRunnerPositions(float strikerZ, float nonStrikerZ)
        {
            _strikerZ = strikerZ;
            _nonStrikerZ = nonStrikerZ;
        }

        /// <summary>
        /// Evaluates whether a runner is safely grounded behind the popping crease at the specified end.
        /// Striker End popping crease is at Z = +8.84m (Safe if Z >= 8.84m).
        /// Bowler End popping crease is at Z = -8.84m (Safe if Z <= -8.84m).
        /// </summary>
        public bool IsRunnerSafeAtEnd(WicketEnd end)
        {
            float safeThreshold = PitchCoordinates.StrikerPoppingCreaseZ;

            if (end == WicketEnd.StrikerEnd)
            {
                // Who is running to the striker end? During run 1, non-striker is running to striker end
                float runnerZ = (_runningState == RunningState.RunningRun1) ? _nonStrikerZ : _strikerZ;
                return runnerZ >= safeThreshold;
            }
            else // BowlerEnd
            {
                // Who is running to the bowler end? During run 1, striker is running to bowler end
                float runnerZ = (_runningState == RunningState.RunningRun1) ? _strikerZ : _nonStrikerZ;
                return runnerZ <= -safeThreshold;
            }
        }

        /// <summary>
        /// Adjudicates a Run-Out opportunity when wickets at either end are physically broken.
        /// Returns true if a runner was caught outside their crease.
        /// </summary>
        public bool AdjudicateRunOut(WicketEnd brokenEnd, out string dismissedBatterName)
        {
            dismissedBatterName = null;

            // If no runners are active between wickets, cannot be run out
            if (_runningState == RunningState.Stationary)
            {
                return false;
            }

            bool isSafe = IsRunnerSafeAtEnd(brokenEnd);
            if (!isSafe)
            {
                dismissedBatterName = (brokenEnd == WicketEnd.BowlerEnd && _runningState == RunningState.RunningRun1)
                    ? "Striker"
                    : "Non-Striker";
                return true;
            }

            return false;
        }

        public void CompleteRun()
        {
            _completedRuns++;
            _runningState = RunningState.Stationary;
        }

        public void ResetForNewDelivery()
        {
            _runningState = RunningState.Stationary;
            _completedRuns = 0;
            _strikerZ = 9.15f;
            _nonStrikerZ = -9.00f;
        }
    }
}
