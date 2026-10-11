using System;
using UnityEngine;

namespace CricketLegends.Core
{
    /// <summary>
    /// Type-safe event payloads for decoupled inter-system communication.
    /// Eliminates tight couplings between MatchManager, FieldingAI, HUD, and Audio.
    /// </summary>
    public static class CricketEvents
    {
        // State Event
        public static event Action<GameState, GameState> StateChanged;

        // Match Lifecycle Events
        public static event Action<string, string, int> MatchStarted; // teamA, teamB, totalOvers
        public static event Action<int, int> InningsCompleted; // inningsNumber, runs
        public static event Action<string, string> MatchEnded; // winningTeam, resultReason

        // Delivery Lifecycle Events
        public static event Action<int, int> DeliveryStarted; // overNumber, ballNumberInOver
        public static event Action<Vector3, float> BallDelivered; // releasePosition, speedKmh
        public static event Action<Vector3, Vector3, string> BallPitched; // bouncePosition, bounceVelocity, lengthType
        public static event Action<string, string, float> ShotExecuted; // shotType, timingQuality, exitSpeed
        public static event Action<Vector3, Vector3> BallHit; // contactPoint, exitVelocity
        public static event Action<DeliveryResultData> DeliveryCompleted;

        // Scoring & Wickets
        public static event Action<int, int, int, int> ScoreUpdated; // totalRuns, totalWickets, overs, ballsInOver
        public static event Action<string, string, string> WicketFallen; // dismissedBatter, bowler, dismissalType

        // Public Invocation Helpers (null-safe)
        public static void FireStateChanged(GameState oldState, GameState newState) => StateChanged?.Invoke(oldState, newState);
        public static void FireMatchStarted(string a, string b, int overs) => MatchStarted?.Invoke(a, b, overs);
        public static void FireInningsCompleted(int innings, int runs) => InningsCompleted?.Invoke(innings, runs);
        public static void FireMatchEnded(string winner, string reason) => MatchEnded?.Invoke(winner, reason);
        public static void FireDeliveryStarted(int over, int ball) => DeliveryStarted?.Invoke(over, ball);
        public static void FireBallDelivered(Vector3 pos, float speed) => BallDelivered?.Invoke(pos, speed);
        public static void FireBallPitched(Vector3 pos, Vector3 vel, string len) => BallPitched?.Invoke(pos, vel, len);
        public static void FireShotExecuted(string shot, string timing, float speed) => ShotExecuted?.Invoke(shot, timing, speed);
        public static void FireBallHit(Vector3 pt, Vector3 vel) => BallHit?.Invoke(pt, vel);
        public static void FireDeliveryCompleted(DeliveryResultData data) => DeliveryCompleted?.Invoke(data);
        public static void FireScoreUpdated(int runs, int wkts, int ovs, int balls) => ScoreUpdated?.Invoke(runs, wkts, ovs, balls);
        public static void FireWicketFallen(string batter, string bowler, string type) => WicketFallen?.Invoke(batter, bowler, type);

        /// <summary>
        /// Clears all static event listeners to prevent memory leaks across scene reloads.
        /// </summary>
        public static void ClearAllListeners()
        {
            StateChanged = null;
            MatchStarted = null;
            InningsCompleted = null;
            MatchEnded = null;
            DeliveryStarted = null;
            BallDelivered = null;
            BallPitched = null;
            ShotExecuted = null;
            BallHit = null;
            DeliveryCompleted = null;
            ScoreUpdated = null;
            WicketFallen = null;
        }
    }

    [System.Serializable]
    public struct DeliveryResultData
    {
        public int DeliveryId;
        public int RunsScored;
        public bool IsWicket;
        public bool IsLegalBall;
        public bool IsBoundaryFour;
        public bool IsBoundarySix;
        public string DismissalType; // Bowled, Caught, LBW, RunOut, Stumped, None
        public string Description;
    }
}
