using System;
using System.Collections.Generic;
using System.Text;

namespace CricketLegends.Rules
{
    /// <summary>
    /// Explicit breakdown of all extras conceded during an innings.
    /// </summary>
    [Serializable]
    public struct ExtrasBreakdown
    {
        public int Wides;
        public int NoBalls;
        public int Byes;
        public int LegByes;
        public int Penalties;

        public int TotalExtras => Wides + NoBalls + Byes + LegByes + Penalties;

        public override string ToString() =>
            $"Total: {TotalExtras} (w {Wides}, nb {NoBalls}, b {Byes}, lb {LegByes}, pen {Penalties})";
    }

    /// <summary>
    /// Full scorecard for a completed or ongoing innings, containing
    /// team score, overs, all batter stats, bowler figures, extras, and delivery history.
    /// </summary>
    [Serializable]
    public class InningsScorecard
    {
        public int InningsNumber;
        public string BattingTeam;
        public string BowlingTeam;
        public int TotalRuns;
        public int TotalWickets;
        public int LegalBalls;
        public int MaxOvers;
        public int MaxWickets;
        public ExtrasBreakdown Extras;
        public List<BatterStats> Batters = new List<BatterStats>();
        public List<BowlerStats> Bowlers = new List<BowlerStats>();
        public List<DeliveryResult> DeliveryHistory = new List<DeliveryResult>();
        public bool IsComplete;
        public string CompletionReason;

        public string OversString => $"{LegalBalls / 6}.{LegalBalls % 6}";
        public float OversFloat => (LegalBalls / 6) + ((LegalBalls % 6) / 6f);
        public float CurrentRunRate => OversFloat > 0f ? (TotalRuns / OversFloat) : 0f;

        public InningsScorecard(int inningsNum, string battingTeam, string bowlingTeam, int maxOvers, int maxWickets)
        {
            InningsNumber = inningsNum;
            BattingTeam = battingTeam;
            BowlingTeam = bowlingTeam;
            TotalRuns = 0;
            TotalWickets = 0;
            LegalBalls = 0;
            MaxOvers = maxOvers;
            MaxWickets = maxWickets;
            Extras = default;
            IsComplete = false;
            CompletionReason = "In Progress";
        }

        public string GenerateScorecardSummary()
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine($"================================================================================");
            sb.AppendLine($" INNINGS {InningsNumber}: {BattingTeam.ToUpper()} ({TotalRuns}/{TotalWickets} in {OversString} ov) - RR: {CurrentRunRate:F2}");
            sb.AppendLine($"================================================================================");
            sb.AppendLine(" BATTING:");
            sb.AppendLine($" {"Batter",-18} {"Runs",-5} {"Balls",-6} {"4s",-4} {"6s",-4} {"SR",-7} {"Dismissal"}");
            sb.AppendLine($" {"------------------",-18} {"----",-5} {"-----",-6} {"---",-4} {"---",-4} {"------",-7} {"--------------------"}");

            foreach (var b in Batters)
            {
                sb.AppendLine($" {b.PlayerName,-18} {b.Runs,-5} {b.BallsFaced,-6} {b.Fours,-4} {b.Sixes,-4} {b.StrikeRate,6:F1} {b.DismissalText}");
            }

            sb.AppendLine();
            sb.AppendLine($" EXTRAS: {Extras}");
            sb.AppendLine($" TOTAL:  {TotalRuns}/{TotalWickets} ({OversString} Overs, RR: {CurrentRunRate:F2})");
            sb.AppendLine();
            sb.AppendLine(" BOWLING:");
            sb.AppendLine($" {"Bowler",-18} {"Overs",-6} {"Mdns",-5} {"Runs",-5} {"Wkts",-5} {"Econ",-6}");
            sb.AppendLine($" {"------------------",-18} {"-----",-6} {"----",-5} {"----",-5} {"----",-5} {"------",-6}");

            foreach (var bw in Bowlers)
            {
                sb.AppendLine($" {bw.PlayerName,-18} {bw.OversString,-6} {bw.Maidens,-5} {bw.RunsConceded,-5} {bw.Wickets,-5} {bw.EconomyRate,6:F2}");
            }

            sb.AppendLine($"================================================================================");
            if (IsComplete)
            {
                sb.AppendLine($" Status: Completed ({CompletionReason})");
            }
            return sb.ToString();
        }
    }
}
