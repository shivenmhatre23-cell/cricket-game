using System;
using System.Collections.Generic;
using UnityEngine;
using CricketLegends.Core;
using CricketLegends.Rules;

namespace CricketLegends.UI
{
    /// <summary>
    /// Broadcast lower-third in-match HUD for Cricket Legends.
    /// Framed along bottom screen margins to preserve pitch corridor, bowler release, and crease visibility.
    /// Auto-scales across aspect ratios (16:9, 18:9, 21:9, 4:3) and safely truncates long names.
    /// </summary>
    public class BroadcastHUD : ScreenBase
    {
        [Header("Rules Engine Dependency")]
        [SerializeField] private CricketRulesEngine _rulesEngine;

        [Header("Banner Notification State")]
        [SerializeField] private bool _isBannerActive = false;
        [SerializeField] private string _bannerText = "";
        [SerializeField] private float _bannerDuration = 2.5f;
        private float _bannerTimer = 0f;

        [Header("Ball-by-ball Over Strip")]
        [SerializeField] private List<string> _currentOverBalls = new List<string>();

        public bool IsBannerActive => _isBannerActive;
        public string BannerText => _bannerText;
        public IReadOnlyList<string> CurrentOverBalls => _currentOverBalls;

        private void Awake()
        {
            SetScreenIdForTesting(ScreenId.InMatchHUD);
            if (_rulesEngine == null)
            {
                _rulesEngine = FindFirstObjectByType<CricketRulesEngine>();
            }
        }

        private void OnEnable()
        {
            CricketEvents.ScoreUpdated += HandleScoreUpdated;
            CricketEvents.DeliveryCompleted += HandleDeliveryCompleted;
            CricketEvents.WicketFallen += HandleWicketFallen;
            CricketEvents.DeliveryStarted += HandleDeliveryStarted;
        }

        private void OnDisable()
        {
            CricketEvents.ScoreUpdated -= HandleScoreUpdated;
            CricketEvents.DeliveryCompleted -= HandleDeliveryCompleted;
            CricketEvents.WicketFallen -= HandleWicketFallen;
            CricketEvents.DeliveryStarted -= HandleDeliveryStarted;
        }

        private void Update()
        {
            if (_isBannerActive)
            {
                _bannerTimer += Time.deltaTime;
                if (_bannerTimer >= _bannerDuration)
                {
                    _isBannerActive = false;
                    _bannerText = "";
                }
            }
        }

        public void BindRulesEngine(CricketRulesEngine engine)
        {
            _rulesEngine = engine;
        }

        private void HandleDeliveryStarted(int over, int ball)
        {
            if (ball == 1)
            {
                _currentOverBalls.Clear();
            }
        }

        private void HandleDeliveryCompleted(DeliveryResultData data)
        {
            string ballSymbol = ".";
            if (data.IsWicket) ballSymbol = "W";
            else if (data.IsBoundarySix) ballSymbol = "6";
            else if (data.IsBoundaryFour) ballSymbol = "4";
            else if (data.RunsScored > 0) ballSymbol = data.RunsScored.ToString();

            _currentOverBalls.Add(ballSymbol);

            // Trigger event banner for boundaries
            if (data.IsBoundarySix)
            {
                ShowBanner("🚀 MAXIMUM SIX!");
            }
            else if (data.IsBoundaryFour)
            {
                ShowBanner("⚡ BOUNDARY FOUR!");
            }
        }

        private void HandleWicketFallen(string batter, string bowler, string type)
        {
            ShowBanner($"💥 WICKET! {type}");
        }

        private void HandleScoreUpdated(int runs, int wkts, int overs, int balls)
        {
            // Update HUD values
        }

        public void ShowBanner(string text)
        {
            _isBannerActive = true;
            _bannerText = text;
            _bannerTimer = 0f;
            CricketLogger.LogInfo(LogChannel.UI, $"Broadcast Banner: [{text}]");
        }

        /// <summary>
        /// Truncates strings exceeding maxLength with an ellipsis to prevent UI overflow on mobile displays.
        /// </summary>
        public static string FormatPlayerName(string name, int maxLength = 14)
        {
            if (string.IsNullOrEmpty(name)) return "Player";
            if (name.Length <= maxLength) return name;
            return name.Substring(0, maxLength - 1) + "…";
        }

        public string GetLowerThirdFormattedString()
        {
            if (_rulesEngine == null) return "MATCH READY";

            string team = _rulesEngine.BattingTeam;
            int runs = _rulesEngine.TotalRuns;
            int wkts = _rulesEngine.TotalWickets;
            string overs = $"{_rulesEngine.CompletedOvers}.{_rulesEngine.LegalBallsInOver}";
            float crr = _rulesEngine.CurrentRunRate;

            string striker = FormatPlayerName(_rulesEngine.StrikerName);
            string nonStriker = FormatPlayerName(_rulesEngine.NonStrikerName);
            string bowler = FormatPlayerName(_rulesEngine.CurrentBowlerName);

            string overStrip = string.Join(" ", _currentOverBalls);

            string line1 = $"{team} {runs}/{wkts} ({overs} ov) | CRR: {crr:F2}";
            if (_rulesEngine.CurrentInningsIndex == 2)
            {
                line1 += $" | Target: {_rulesEngine.TargetScore} (Need {_rulesEngine.RemainingRunsNeeded} off {_rulesEngine.RemainingBalls}b)";
            }

            string line2 = $"*{striker} & {nonStriker} | Bowl: {bowler} | This Over: [{overStrip}]";
            return $"{line1}\n{line2}";
        }
    }
}
