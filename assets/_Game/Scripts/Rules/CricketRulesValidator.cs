using System;
using UnityEngine;
using CricketLegends.Core;
using CricketLegends.Physics;
using CricketLegends.Presentation;
using CricketLegends.AI;

namespace CricketLegends.Rules
{
    public enum DismissalType
    {
        None,
        Bowled,
        Caught,
        RunOut,
        Stumped,
        LBW,
        HitWicket
    }

    [System.Serializable]
    public struct DismissalRecord
    {
        public DismissalType Type;
        public string DismissedBatter;
        public string Bowler;
        public string Fielder;
        public string Description;
        public float Timestamp;

        public DismissalRecord(DismissalType type, string batter, string bowler, string fielder, string desc)
        {
            Type = type;
            DismissedBatter = batter;
            Bowler = bowler;
            Fielder = fielder;
            Description = desc;
            Timestamp = Time.time;
        }
    }

    /// <summary>
    /// Centralized cricket rules engine for validating dismissals (Bowled, Caught, RunOut, Stumped, LBW)
    /// under MCC Laws of Cricket.
    /// STRICT INVARIANT: Enforces that at most ONE dismissal can occur per delivery.
    /// Once a dismissal is awarded on an active ball, subsequent dismissal events on that ball are rejected.
    /// </summary>
    public class CricketRulesValidator : MonoBehaviour
    {
        public static CricketRulesValidator Instance { get; private set; }

        [Header("State")]
        [SerializeField] private bool _isDismissalRecorded = false;
        [SerializeField] private DismissalRecord _currentDismissal;

        [Header("Connected Trackers (Optional in test harnesses)")]
        [SerializeField] private RunOutTracker _runOutTracker;

        public bool IsDismissalRecorded => _isDismissalRecorded;
        public DismissalRecord CurrentDismissal => _currentDismissal;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
            }
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        private void OnEnable()
        {
            CricketEvents.DeliveryStarted += HandleDeliveryStarted;
            CricketEvents.DeliveryCompleted += HandleDeliveryCompleted;
        }

        private void OnDisable()
        {
            CricketEvents.DeliveryStarted -= HandleDeliveryStarted;
            CricketEvents.DeliveryCompleted -= HandleDeliveryCompleted;
        }

        private void HandleDeliveryStarted(int over, int ball)
        {
            ResetForNewDelivery();
        }

        private void HandleDeliveryCompleted(DeliveryResultData result)
        {
            // Retain record until next delivery starts
        }

        /// <summary>
        /// Resets dismissal tracking state for a new delivery.
        /// </summary>
        public void ResetForNewDelivery()
        {
            _isDismissalRecorded = false;
            _currentDismissal = default;
            CricketLogger.LogDiagnostic(LogChannel.Gameplay, "CricketRulesValidator reset for new delivery.");
        }

        /// <summary>
        /// Attempts to record a dismissal for the active delivery.
        /// Enforces single-dismissal invariant: Rejects if a dismissal was already registered.
        /// </summary>
        public bool TryRecordDismissal(DismissalType type, string batter, string bowler, string fielder, string description)
        {
            if (_isDismissalRecorded)
            {
                CricketLogger.LogWarning(LogChannel.Gameplay,
                    $"DISMISSAL REJECTED: Batter already dismissed ({_currentDismissal.Type}) on this delivery. Cannot award duplicate dismissal ({type}).");
                return false;
            }

            _isDismissalRecorded = true;
            _currentDismissal = new DismissalRecord(type, batter, bowler, fielder, description);

            CricketLogger.LogInfo(LogChannel.Gameplay,
                $"OUT! Dismissal: {type} | Batter: {batter} | Bowler: {bowler ?? "None"} | Description: {description}");

            CricketEvents.FireWicketFallen(batter, bowler, $"{type}: {description}");
            return true;
        }

        /// <summary>
        /// Validates Bowled dismissal: The ball delivered by the bowler strikes and breaks the striker's wicket.
        /// </summary>
        public bool ValidateBowled(CricketBall ball, WicketsController strikerWickets, string bowlerName = "Bowler")
        {
            if (_isDismissalRecorded) return false;

            if (strikerWickets == null || strikerWickets.End != WicketEnd.StrikerEnd || !strikerWickets.IsBroken)
            {
                return false;
            }

            if (ball == null || ball.State == BallState.HeldInHand || ball.State == BallState.Dead)
            {
                return false;
            }

            return TryRecordDismissal(DismissalType.Bowled, "Striker", bowlerName, null, "Bowled");
        }

        /// <summary>
        /// Validates Caught dismissal: Airborne ball struck by bat is legally caught by fielder prior to bouncing.
        /// </summary>
        public bool ValidateCaught(CricketBall ball, FielderController fielder, float reactionTime = 0.5f, string bowlerName = "Bowler")
        {
            if (_isDismissalRecorded) return false;

            if (ball == null || fielder == null) return false;

            // Strict MCC requirement: Ball must NOT have bounced
            if (ball.BounceCount > 0)
            {
                return false;
            }

            var catchResult = CatchingBehaviour.EvaluateCatchAttempt(ball, fielder.transform.position, reactionTime);
            if (catchResult == CatchAttemptResult.Success)
            {
                return TryRecordDismissal(
                    DismissalType.Caught,
                    "Striker",
                    bowlerName,
                    fielder.RoleName,
                    $"Caught by {fielder.RoleName}"
                );
            }

            return false;
        }

        /// <summary>
        /// Validates Run-Out dismissal: Wickets put down while runner is out of their crease during a run.
        /// Under MCC Laws, the bowler is NOT credited with the wicket in their bowling figures.
        /// </summary>
        public bool ValidateRunOut(WicketEnd brokenEnd, RunOutTracker runTracker, string fielderName = "Fielder")
        {
            if (_isDismissalRecorded) return false;

            if (runTracker == null) return false;

            if (runTracker.AdjudicateRunOut(brokenEnd, out string dismissedBatter))
            {
                // Run out does not credit the bowler with a wicket
                return TryRecordDismissal(
                    DismissalType.RunOut,
                    dismissedBatter,
                    null,
                    fielderName,
                    $"Run out ({fielderName})"
                );
            }

            return false;
        }

        /// <summary>
        /// Validates Stumped dismissal: Batter out of crease missing delivery, wicket put down by keeper without attempted run.
        /// </summary>
        public bool ValidateStumped(CricketBall ball, WicketsController strikerWickets, float strikerZ, bool isRunning, string keeperName = "Wicketkeeper", string bowlerName = "Bowler")
        {
            if (_isDismissalRecorded) return false;

            // Must not be actively attempting a run (otherwise it is a Run Out)
            if (isRunning) return false;

            // Striker must be out of crease (safe is Z >= StrikerPoppingCreaseZ = 8.84m)
            if (strikerZ >= PitchCoordinates.StrikerPoppingCreaseZ) return false;

            // Striker wickets must be broken
            if (strikerWickets == null || strikerWickets.End != WicketEnd.StrikerEnd || !strikerWickets.IsBroken) return false;

            // Ball was not struck into outfield
            if (ball != null && ball.State == BallState.Struck) return false;

            return TryRecordDismissal(
                DismissalType.Stumped,
                "Striker",
                bowlerName,
                keeperName,
                $"Stumped by {keeperName}"
            );
        }

        /// <summary>
        /// Validates LBW (Leg Before Wicket) under MCC Law 36:
        /// 1. Ball did not hit bat first.
        /// 2. Ball pitched in line with wickets or outside off stump.
        /// 3. Point of impact with batter is in line between wickets.
        /// 4. Trajectory would have gone on to strike the wickets.
        /// </summary>
        public bool ValidateLBW(bool pitchedInLineOrOff, bool impactInLine, bool wicketsHitting, bool hitBatFirst, string bowlerName = "Bowler")
        {
            if (_isDismissalRecorded) return false;

            if (hitBatFirst) return false;
            if (!pitchedInLineOrOff) return false;
            if (!impactInLine) return false;
            if (!wicketsHitting) return false;

            return TryRecordDismissal(
                DismissalType.LBW,
                "Striker",
                bowlerName,
                null,
                "LBW"
            );
        }
    }
}
