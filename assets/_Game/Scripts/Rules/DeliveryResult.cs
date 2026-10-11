using System;

namespace CricketLegends.Rules
{
    /// <summary>
    /// Input parameters describing the raw physical outcome of a delivery
    /// prior to rules engine processing.
    /// </summary>
    [Serializable]
    public struct DeliveryOutcomeInput
    {
        public int DeliveryId;
        public int BatterRuns; // 0, 1, 2, 3, 4, 6
        public ExtraType ExtraType;
        public int ExtraRuns; // Additional runs on wide/no-ball or bye count
        public bool IsWicket;
        public DismissalType DismissalType;
        public string DismissedBatter;
        public string FielderName;
        public int CompletedRuns;
        public bool IsBoundaryFour;
        public bool IsBoundarySix;
        public string Description;

        public static DeliveryOutcomeInput Dot(int id) =>
            new DeliveryOutcomeInput { DeliveryId = id, BatterRuns = 0, Description = "Dot ball" };

        public static DeliveryOutcomeInput Runs(int id, int runs, bool four = false, bool six = false) =>
            new DeliveryOutcomeInput
            {
                DeliveryId = id,
                BatterRuns = runs,
                CompletedRuns = (four || six) ? 0 : runs,
                IsBoundaryFour = four,
                IsBoundarySix = six,
                Description = four ? "FOUR!" : (six ? "SIX!" : $"{runs} run(s)")
            };

        public static DeliveryOutcomeInput Wide(int id, int additionalRuns = 0) =>
            new DeliveryOutcomeInput
            {
                DeliveryId = id,
                ExtraType = ExtraType.Wide,
                ExtraRuns = additionalRuns,
                Description = additionalRuns > 0 ? $"Wide + {additionalRuns} runs" : "Wide"
            };

        public static DeliveryOutcomeInput NoBall(int id, int batterRuns = 0, bool four = false, bool six = false) =>
            new DeliveryOutcomeInput
            {
                DeliveryId = id,
                ExtraType = ExtraType.NoBall,
                BatterRuns = batterRuns,
                CompletedRuns = (four || six) ? 0 : batterRuns,
                IsBoundaryFour = four,
                IsBoundarySix = six,
                Description = batterRuns > 0 ? $"No-ball + {batterRuns} runs" : "No-ball"
            };

        public static DeliveryOutcomeInput Bye(int id, int runs) =>
            new DeliveryOutcomeInput
            {
                DeliveryId = id,
                ExtraType = ExtraType.Bye,
                ExtraRuns = runs,
                CompletedRuns = runs,
                Description = $"{runs} bye(s)"
            };

        public static DeliveryOutcomeInput LegBye(int id, int runs) =>
            new DeliveryOutcomeInput
            {
                DeliveryId = id,
                ExtraType = ExtraType.LegBye,
                ExtraRuns = runs,
                CompletedRuns = runs,
                Description = $"{runs} leg-bye(s)"
            };

        public static DeliveryOutcomeInput Wicket(int id, DismissalType type, string dismissed = "Striker", string fielder = null) =>
            new DeliveryOutcomeInput
            {
                DeliveryId = id,
                IsWicket = true,
                DismissalType = type,
                DismissedBatter = dismissed,
                FielderName = fielder,
                Description = $"OUT ({type})"
            };
    }

    /// <summary>
    /// Immutable record representing the fully adjudicated outcome of a delivery.
    /// Strictly immutable to guarantee that subsequent ball events cannot mutate an already resolved delivery.
    /// </summary>
    [Serializable]
    public readonly struct DeliveryResult
    {
        public int DeliveryId { get; }
        public string StrikerName { get; }
        public string NonStrikerName { get; }
        public string BowlerName { get; }
        public int BatterRuns { get; }
        public ExtraType ExtraType { get; }
        public int ExtraRuns { get; }
        public int TotalTeamRuns { get; }
        public bool IsLegalBall { get; }
        public bool IsWicket { get; }
        public DismissalType DismissalType { get; }
        public string DismissedBatter { get; }
        public string FielderName { get; }
        public int CompletedRuns { get; }
        public bool IsBoundaryFour { get; }
        public bool IsBoundarySix { get; }
        public bool StrikeRotated { get; }
        public string Description { get; }

        public DeliveryResult(
            int deliveryId,
            string strikerName,
            string nonStrikerName,
            string bowlerName,
            int batterRuns,
            ExtraType extraType,
            int extraRuns,
            int totalTeamRuns,
            bool isLegalBall,
            bool isWicket,
            DismissalType dismissalType,
            string dismissedBatter,
            string fielderName,
            int completedRuns,
            bool isBoundaryFour,
            bool isBoundarySix,
            bool strikeRotated,
            string description)
        {
            DeliveryId = deliveryId;
            StrikerName = strikerName;
            NonStrikerName = nonStrikerName;
            BowlerName = bowlerName;
            BatterRuns = batterRuns;
            ExtraType = extraType;
            ExtraRuns = extraRuns;
            TotalTeamRuns = totalTeamRuns;
            IsLegalBall = isLegalBall;
            IsWicket = isWicket;
            DismissalType = dismissalType;
            DismissedBatter = dismissedBatter;
            FielderName = fielderName;
            CompletedRuns = completedRuns;
            IsBoundaryFour = isBoundaryFour;
            IsBoundarySix = isBoundarySix;
            StrikeRotated = strikeRotated;
            Description = description;
        }

        public override string ToString()
        {
            string scoreDesc = TotalTeamRuns > 0 ? $"+{TotalTeamRuns}" : "0";
            if (IsWicket) scoreDesc = $"W ({DismissalType})";
            if (ExtraType == ExtraType.Wide) scoreDesc = $"{ExtraRuns}wd";
            if (ExtraType == ExtraType.NoBall) scoreDesc = BatterRuns > 0 ? $"nb+{BatterRuns}" : "1nb";
            return $"Ball #{DeliveryId} [{BowlerName} to {StrikerName}]: {scoreDesc} ({Description})";
        }
    }
}
