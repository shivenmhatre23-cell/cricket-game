using System;
using UnityEngine;
using CricketLegends.Gameplay;
using CricketLegends.Rules;

namespace CricketLegends.AI
{
    public enum MatchPhase
    {
        Powerplay,
        MiddleOvers,
        DeathOvers
    }

    public enum TacticalAggression
    {
        Low,
        Moderate,
        High,
        MaxAggression
    }

    /// <summary>
    /// Evaluates current match state, pressure index, match phase,
    /// and generates tactical aggression and fielding recommendations for AI decision-makers.
    /// Strictly decoupled from physics, collisions, and scoring mutations.
    /// </summary>
    public static class MatchSituationAnalyzer
    {
        public struct SituationReport
        {
            public MatchPhase Phase;
            public float PressureIndex; // 0.0 (calm) to 1.0 (maximum crisis/urgency)
            public TacticalAggression RecommendedBattingAggression;
            public TacticalAggression RecommendedBowlingAggression;
            public Presentation.FieldPreset RecommendedFieldPreset;
            public float RequiredRunRate;
            public float CurrentRunRate;
            public int RemainingBalls;
            public int RemainingWickets;
        }

        public static SituationReport Analyze(CricketRulesEngine rulesEngine, MatchConfiguration config)
        {
            var report = new SituationReport();
            if (rulesEngine == null) return report;

            int totalOvers = config != null ? config.TotalOvers : 2;
            int maxWkts = config != null ? config.MaxWickets : 10;
            int completedOvers = rulesEngine.CompletedOvers;
            int totalLegalBalls = rulesEngine.TotalLegalBalls;
            int totalBallsInInnings = totalOvers * 6;
            int remainingBalls = Mathf.Max(0, totalBallsInInnings - totalLegalBalls);
            int remainingWkts = Mathf.Max(0, maxWkts - rulesEngine.TotalWickets);

            report.RemainingBalls = remainingBalls;
            report.RemainingWickets = remainingWkts;
            report.CurrentRunRate = rulesEngine.CurrentRunRate;
            report.RequiredRunRate = rulesEngine.RequiredRunRate;

            // 1. Determine Match Phase
            float progressPercent = totalBallsInInnings > 0 ? (float)totalLegalBalls / totalBallsInInnings : 0f;
            if (completedOvers < 2 || progressPercent <= 0.25f)
            {
                report.Phase = MatchPhase.Powerplay;
            }
            else if (remainingBalls <= 12 || progressPercent >= 0.75f)
            {
                report.Phase = MatchPhase.DeathOvers;
            }
            else
            {
                report.Phase = MatchPhase.MiddleOvers;
            }

            // 2. Compute Pressure Index (0.0 to 1.0)
            float pressure = 0.2f;
            if (rulesEngine.CurrentInningsIndex == 1)
            {
                // In 1st innings: pressure rises if wickets tumble quickly
                float wicketsLostRatio = (float)rulesEngine.TotalWickets / maxWkts;
                pressure = Mathf.Clamp01(wicketsLostRatio * 0.8f + (progressPercent * 0.2f));
            }
            else
            {
                // In 2nd innings: pressure driven by Required Run Rate & wickets remaining
                float rrr = rulesEngine.RequiredRunRate;
                if (rrr > 14f) pressure = 1.0f;
                else if (rrr > 10f) pressure = 0.85f;
                else if (rrr > 7.5f) pressure = 0.55f;
                else pressure = 0.30f;

                if (remainingWkts <= 2) pressure = Mathf.Min(1.0f, pressure + 0.25f);
            }
            report.PressureIndex = pressure;

            // 3. Batting Aggression Recommendation
            if (rulesEngine.CurrentInningsIndex == 2)
            {
                if (report.RequiredRunRate >= 12f || (report.Phase == MatchPhase.DeathOvers && rulesEngine.RemainingRunsNeeded > 12))
                {
                    report.RecommendedBattingAggression = TacticalAggression.MaxAggression;
                }
                else if (report.RequiredRunRate >= 8f)
                {
                    report.RecommendedBattingAggression = TacticalAggression.High;
                }
                else if (remainingWkts <= 2 && rulesEngine.RemainingRunsNeeded > 20)
                {
                    report.RecommendedBattingAggression = TacticalAggression.Low; // Conserve last wicket
                }
                else
                {
                    report.RecommendedBattingAggression = TacticalAggression.Moderate;
                }
            }
            else
            {
                // 1st innings aggression
                if (report.Phase == MatchPhase.DeathOvers && remainingWkts >= 3)
                {
                    report.RecommendedBattingAggression = TacticalAggression.MaxAggression;
                }
                else if (report.Phase == MatchPhase.Powerplay && remainingWkts >= 8)
                {
                    report.RecommendedBattingAggression = TacticalAggression.High;
                }
                else if (remainingWkts <= 3)
                {
                    report.RecommendedBattingAggression = TacticalAggression.Low;
                }
                else
                {
                    report.RecommendedBattingAggression = TacticalAggression.Moderate;
                }
            }

            // 4. Fielding Preset Recommendation
            if (report.Phase == MatchPhase.DeathOvers || report.RecommendedBattingAggression == TacticalAggression.MaxAggression)
            {
                report.RecommendedFieldPreset = Presentation.FieldPreset.BoundaryProtection;
            }
            else if (report.Phase == MatchPhase.Powerplay && remainingWkts >= 7)
            {
                report.RecommendedFieldPreset = Presentation.FieldPreset.Attacking;
            }
            else if (pressure > 0.7f && remainingWkts <= 3)
            {
                report.RecommendedFieldPreset = Presentation.FieldPreset.Attacking;
            }
            else
            {
                report.RecommendedFieldPreset = Presentation.FieldPreset.Balanced;
            }

            return report;
        }
    }
}
