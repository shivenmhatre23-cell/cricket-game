using System;

namespace CricketLegends.Rules
{
    /// <summary>
    /// Tracks individual batting performance metrics according to official cricket statistics conventions.
    /// </summary>
    [Serializable]
    public class BatterStats
    {
        public string PlayerName;
        public int Runs;
        public int BallsFaced;
        public int Fours;
        public int Sixes;
        public bool IsOut;
        public DismissalType DismissalType;
        public string DismissalBowler;
        public string DismissalFielder;
        public string DismissalText;

        public float StrikeRate => BallsFaced > 0 ? (Runs * 100f / BallsFaced) : 0f;

        public BatterStats(string name)
        {
            PlayerName = name;
            Runs = 0;
            BallsFaced = 0;
            Fours = 0;
            Sixes = 0;
            IsOut = false;
            DismissalType = DismissalType.None;
            DismissalBowler = null;
            DismissalFielder = null;
            DismissalText = "not out";
        }

        public void RecordRuns(int runs, bool facedLegalBall, bool isFour, bool isSix)
        {
            Runs += runs;
            if (facedLegalBall) BallsFaced++;
            if (isFour) Fours++;
            if (isSix) Sixes++;
        }

        public void RecordFacedDeliveryWithoutRuns(bool facedLegalBall)
        {
            if (facedLegalBall) BallsFaced++;
        }

        public void RecordDismissal(DismissalType type, string bowler, string fielder)
        {
            IsOut = true;
            DismissalType = type;
            DismissalBowler = bowler;
            DismissalFielder = fielder;
            BallsFaced++; // Ball that dismissed the batter counts as a ball faced

            switch (type)
            {
                case DismissalType.Bowled:
                    DismissalText = $"b {bowler}";
                    break;
                case DismissalType.Caught:
                    DismissalText = !string.IsNullOrEmpty(fielder) ? $"c {fielder} b {bowler}" : $"c & b {bowler}";
                    break;
                case DismissalType.RunOut:
                    DismissalText = !string.IsNullOrEmpty(fielder) ? $"run out ({fielder})" : "run out";
                    break;
                case DismissalType.Stumped:
                    DismissalText = $"st {fielder} b {bowler}";
                    break;
                case DismissalType.LBW:
                    DismissalText = $"lbw b {bowler}";
                    break;
                case DismissalType.HitWicket:
                    DismissalText = $"hit wicket b {bowler}";
                    break;
                default:
                    DismissalText = "out";
                    break;
            }
        }

        public override string ToString() =>
            $"{PlayerName,-15} {Runs,3} ({BallsFaced,2}b {Fours}x4 {Sixes}x6) SR: {StrikeRate:F1} | {DismissalText}";
    }

    /// <summary>
    /// Tracks individual bowling performance metrics under MCC statistical standards.
    /// Crucially: Byes and Leg-Byes are NOT charged against bowler figures,
    /// and Run-Outs are NOT credited to the bowler as wickets.
    /// </summary>
    [Serializable]
    public class BowlerStats
    {
        public string PlayerName;
        public int LegalBallsBowled;
        public int Maidens;
        public int RunsConceded; // Runs charged directly to bowler
        public int Wickets;      // Wickets credited to bowler (excludes Run Outs)
        public int Wides;
        public int NoBalls;

        // Current over tracking for maiden calculation
        public int CurrentOverLegalBalls;
        public int CurrentOverRunsConceded;

        public string OversString => $"{LegalBallsBowled / 6}.{LegalBallsBowled % 6}";
        public float OversFloat => (LegalBallsBowled / 6) + ((LegalBallsBowled % 6) / 6f);
        public float EconomyRate => LegalBallsBowled > 0 ? (RunsConceded / (LegalBallsBowled / 6f)) : 0f;

        public BowlerStats(string name)
        {
            PlayerName = name;
            LegalBallsBowled = 0;
            Maidens = 0;
            RunsConceded = 0;
            Wickets = 0;
            Wides = 0;
            NoBalls = 0;
            CurrentOverLegalBalls = 0;
            CurrentOverRunsConceded = 0;
        }

        public void RecordDelivery(int runsChargedToBowler, bool isLegal, bool isWicketCredited, ExtraType extra)
        {
            RunsConceded += runsChargedToBowler;
            CurrentOverRunsConceded += runsChargedToBowler;

            if (isLegal)
            {
                LegalBallsBowled++;
                CurrentOverLegalBalls++;
            }

            if (extra == ExtraType.Wide) Wides++;
            if (extra == ExtraType.NoBall) NoBalls++;

            if (isWicketCredited)
            {
                Wickets++;
            }
        }

        public void FinalizeOverIfCompleted()
        {
            if (CurrentOverLegalBalls >= 6)
            {
                if (CurrentOverRunsConceded == 0)
                {
                    Maidens++;
                }
                CurrentOverLegalBalls = 0;
                CurrentOverRunsConceded = 0;
            }
        }

        public override string ToString() =>
            $"{PlayerName,-15} {OversString,4}-{Maidens,1}-{RunsConceded,3}-{Wickets,1} (Econ: {EconomyRate:F2})";
    }
}
