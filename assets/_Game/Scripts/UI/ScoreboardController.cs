using System;
using UnityEngine;
using CricketLegends.Core;
using CricketLegends.Rules;

namespace CricketLegends.UI
{
    /// <summary>
    /// Immutable snapshot of scoreboard presentation data.
    /// UI never mutates match state or awards runs directly.
    /// </summary>
    [Serializable]
    public struct ScoreboardSnapshot
    {
        public string BattingTeam;
        public string BowlingTeam;
        public int TotalRuns;
        public int TotalWickets;
        public string OversDisplay;
        public string StrikerDisplay;
        public string NonStrikerDisplay;
        public string BowlerDisplay;
        public string LatestDeliveryText;
        public string ExtrasDisplay;
        public float CurrentRunRate;
        public float RequiredRunRate;
        public int TargetScore;
        public int RemainingRuns;
        public int RemainingBalls;
        public int RemainingWickets;
        public string MatchSituationText;
    }

    /// <summary>
    /// Scoreboard presenter subscribing to match events and reflecting the authoritative
    /// state maintained by CricketRulesEngine.
    /// STRICT INVARIANT: Read-only presentation. Never directly increments score or awards runs.
    /// </summary>
    public class ScoreboardController : MonoBehaviour
    {
        [Header("Rules Engine Dependency")]
        [SerializeField] private CricketRulesEngine _rulesEngine;

        [Header("Live Snapshot Display")]
        [SerializeField] private ScoreboardSnapshot _currentSnapshot;

        public ScoreboardSnapshot CurrentSnapshot => _currentSnapshot;

        private void Awake()
        {
            if (_rulesEngine == null)
            {
                _rulesEngine = FindFirstObjectByType<CricketRulesEngine>();
            }
        }

        private void OnEnable()
        {
            CricketEvents.ScoreUpdated += HandleScoreUpdated;
            CricketEvents.DeliveryCompleted += HandleDeliveryCompleted;
            CricketEvents.InningsCompleted += HandleInningsCompleted;
            CricketEvents.MatchEnded += HandleMatchEnded;
        }

        private void OnDisable()
        {
            CricketEvents.ScoreUpdated -= HandleScoreUpdated;
            CricketEvents.DeliveryCompleted -= HandleDeliveryCompleted;
            CricketEvents.InningsCompleted -= HandleInningsCompleted;
            CricketEvents.MatchEnded -= HandleMatchEnded;
        }

        private void Start()
        {
            RefreshScoreboard();
        }

        public void BindRulesEngine(CricketRulesEngine engine)
        {
            _rulesEngine = engine;
            RefreshScoreboard();
        }

        private void HandleScoreUpdated(int runs, int wkts, int overs, int balls)
        {
            RefreshScoreboard();
        }

        private void HandleDeliveryCompleted(DeliveryResultData data)
        {
            RefreshScoreboard();
        }

        private void HandleInningsCompleted(int innings, int runs)
        {
            RefreshScoreboard();
            CricketLogger.LogInfo(LogChannel.UI, $"Scoreboard updated for Innings {innings} break.");
        }

        private void HandleMatchEnded(string winner, string reason)
        {
            RefreshScoreboard();
            CricketLogger.LogInfo(LogChannel.UI, $"Scoreboard updated for Match Conclusion: {reason}");
        }

        /// <summary>
        /// Reads immutable state from the rules engine and updates the scoreboard snapshot.
        /// </summary>
        public void RefreshScoreboard()
        {
            if (_rulesEngine == null) return;

            var activeScorecard = _rulesEngine.CurrentInningsScorecard;
            var strikerStats = activeScorecard?.Batters.Find(b => b.PlayerName == _rulesEngine.StrikerName);
            var nonStrikerStats = activeScorecard?.Batters.Find(b => b.PlayerName == _rulesEngine.NonStrikerName);
            var bowlerStats = activeScorecard?.Bowlers.Find(b => b.PlayerName == _rulesEngine.CurrentBowlerName);

            string strikerText = strikerStats != null
                ? $"*{strikerStats.PlayerName} {strikerStats.Runs} ({strikerStats.BallsFaced}b {strikerStats.Fours}x4 {strikerStats.Sixes}x6)"
                : $"*{_rulesEngine.StrikerName} 0 (0b)";

            string nonStrikerText = nonStrikerStats != null
                ? $"{nonStrikerStats.PlayerName} {nonStrikerStats.Runs} ({nonStrikerStats.BallsFaced}b {nonStrikerStats.Fours}x4 {nonStrikerStats.Sixes}x6)"
                : $"{_rulesEngine.NonStrikerName} 0 (0b)";

            string bowlerText = bowlerStats != null
                ? $"{bowlerStats.PlayerName} {bowlerStats.OversString}-{bowlerStats.Maidens}-{bowlerStats.RunsConceded}-{bowlerStats.Wickets} (Econ: {bowlerStats.EconomyRate:F2})"
                : $"{_rulesEngine.CurrentBowlerName} 0.0-0-0-0";

            string latestDelText = _rulesEngine.LatestDeliveryResult.DeliveryId > 0
                ? _rulesEngine.LatestDeliveryResult.Description
                : "Match ready";

            string situationText = "1st Innings";
            if (_rulesEngine.IsMatchOver)
            {
                situationText = _rulesEngine.MatchResultReason;
            }
            else if (_rulesEngine.CurrentInningsIndex == 2)
            {
                situationText = $"Need {_rulesEngine.RemainingRunsNeeded} runs from {_rulesEngine.RemainingBalls} balls ({_rulesEngine.RemainingWickets} wkts remaining)";
            }

            _currentSnapshot = new ScoreboardSnapshot
            {
                BattingTeam = _rulesEngine.BattingTeam,
                BowlingTeam = _rulesEngine.BowlingTeam,
                TotalRuns = _rulesEngine.TotalRuns,
                TotalWickets = _rulesEngine.TotalWickets,
                OversDisplay = $"{_rulesEngine.CompletedOvers}.{_rulesEngine.LegalBallsInOver}",
                StrikerDisplay = strikerText,
                NonStrikerDisplay = nonStrikerText,
                BowlerDisplay = bowlerText,
                LatestDeliveryText = latestDelText,
                ExtrasDisplay = _rulesEngine.Extras.ToString(),
                CurrentRunRate = _rulesEngine.CurrentRunRate,
                RequiredRunRate = _rulesEngine.RequiredRunRate,
                TargetScore = _rulesEngine.TargetScore,
                RemainingRuns = _rulesEngine.RemainingRunsNeeded,
                RemainingBalls = _rulesEngine.RemainingBalls,
                RemainingWickets = _rulesEngine.RemainingWickets,
                MatchSituationText = situationText
            };
        }

        public string GetFormattedScoreboardText()
        {
            var s = _currentSnapshot;
            return $"{s.BattingTeam} {s.TotalRuns}/{s.TotalWickets} ({s.OversDisplay} ov) | CRR: {s.CurrentRunRate:F2}\n" +
                   $"Striker: {s.StrikerDisplay}\n" +
                   $"Non-Striker: {s.NonStrikerDisplay}\n" +
                   $"Bowler: {s.BowlerDisplay}\n" +
                   $"Last: {s.LatestDeliveryText} | Extras: {s.ExtrasDisplay}\n" +
                   $"Situation: {s.MatchSituationText}";
        }
    }
}
