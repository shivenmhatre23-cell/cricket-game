using System;
using UnityEngine;
using CricketLegends.Core;
using CricketLegends.Rules;

namespace CricketLegends.UI
{
    /// <summary>
    /// Displays comprehensive post-innings and post-match scorecard summaries.
    /// Never mutates game or scoring state.
    /// </summary>
    public class InningsScorecardUI : MonoBehaviour
    {
        [Header("State")]
        [SerializeField] private bool _isVisible = false;
        [SerializeField] private string _currentReportText;

        public bool IsVisible => _isVisible;
        public string CurrentReportText => _currentReportText;

        private void OnEnable()
        {
            CricketEvents.InningsCompleted += HandleInningsCompleted;
            CricketEvents.MatchEnded += HandleMatchEnded;
        }

        private void OnDisable()
        {
            CricketEvents.InningsCompleted -= HandleInningsCompleted;
            CricketEvents.MatchEnded -= HandleMatchEnded;
        }

        private void HandleInningsCompleted(int inningsNumber, int totalRuns)
        {
            ShowInningsSummary(inningsNumber);
        }

        private void HandleMatchEnded(string winningTeam, string resultReason)
        {
            ShowFullMatchSummary(winningTeam, resultReason);
        }

        public void ShowInningsSummary(int inningsNumber)
        {
            var engine = CricketRulesEngine.Instance;
            if (engine == null) return;

            var scorecard = (inningsNumber == 1) ? engine.FirstInningsScorecard : engine.SecondInningsScorecard;
            if (scorecard != null)
            {
                _currentReportText = scorecard.GenerateScorecardSummary();
                _isVisible = true;
                CricketLogger.LogInfo(LogChannel.UI, $"Scorecard UI displayed for Innings {inningsNumber}.\n{_currentReportText}");
            }
        }

        public void ShowFullMatchSummary(string winner, string reason)
        {
            var engine = CricketRulesEngine.Instance;
            if (engine == null) return;

            System.Text.StringBuilder sb = new System.Text.StringBuilder();
            sb.AppendLine("================================================================================");
            sb.AppendLine($"                          CRICKET LEGENDS — MATCH RESULT                        ");
            sb.AppendLine($" RESULT: {reason.ToUpper()}");
            sb.AppendLine("================================================================================");

            if (engine.FirstInningsScorecard != null)
            {
                sb.AppendLine(engine.FirstInningsScorecard.GenerateScorecardSummary());
            }

            if (engine.SecondInningsScorecard != null)
            {
                sb.AppendLine(engine.SecondInningsScorecard.GenerateScorecardSummary());
            }

            _currentReportText = sb.ToString();
            _isVisible = true;
            CricketLogger.LogInfo(LogChannel.UI, $"Full match scorecard displayed.\n{_currentReportText}");
        }

        public void Hide()
        {
            _isVisible = false;
        }
    }
}
