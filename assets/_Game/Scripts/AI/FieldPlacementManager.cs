using System;
using UnityEngine;
using CricketLegends.Gameplay;
using CricketLegends.Presentation;
using CricketLegends.Rules;

namespace CricketLegends.AI
{
    /// <summary>
    /// Autonomous manager of team fielding strategies.
    /// Dynamically shifts field presets (Attacking, Balanced, Defensive, BoundaryProtection)
    /// between deliveries based on match situation, batter dominance, and difficulty settings.
    /// </summary>
    public class FieldPlacementManager : MonoBehaviour
    {
        [Header("Coordinator Link")]
        [SerializeField] private FieldingCoordinator _fieldingCoordinator;

        [Header("State")]
        [SerializeField] private FieldPreset _activePreset = FieldPreset.Balanced;
        [SerializeField] private DifficultyLevel _difficulty = DifficultyLevel.Medium;
        [SerializeField] private int _consecutiveBoundaries = 0;

        public FieldPreset ActivePreset => _activePreset;
        public DifficultyLevel Difficulty => _difficulty;

        private void Awake()
        {
            if (_fieldingCoordinator == null)
            {
                _fieldingCoordinator = FindFirstObjectByType<FieldingCoordinator>();
            }
        }

        public void Configure(FieldingCoordinator coordinator, DifficultyLevel difficulty)
        {
            _fieldingCoordinator = coordinator;
            _difficulty = difficulty;
        }

        public void RecordDeliveryResult(DeliveryResult result)
        {
            if (result.IsBoundaryFour || result.IsBoundarySix)
            {
                _consecutiveBoundaries++;
            }
            else
            {
                _consecutiveBoundaries = 0;
            }
        }

        /// <summary>
        /// Evaluates match situation and shifts field preset if tactically warranted.
        /// Called prior to each delivery.
        /// </summary>
        public FieldPreset EvaluateAndApplyFieldPlacement(CricketRulesEngine rulesEngine, MatchConfiguration config)
        {
            var situation = MatchSituationAnalyzer.Analyze(rulesEngine, config);
            FieldPreset desiredPreset = FieldPreset.Balanced;

            // 1. Reactive boundary protection if batter is dominating
            if (_consecutiveBoundaries >= (_difficulty == DifficultyLevel.Hard ? 1 : 2))
            {
                desiredPreset = FieldPreset.BoundaryProtection;
            }
            // 2. Death overs or extreme required run rate
            else if (situation.Phase == MatchPhase.DeathOvers || situation.RequiredRunRate > 11f)
            {
                desiredPreset = FieldPreset.BoundaryProtection;
            }
            // 3. Wicket hunting: New batter at crease, or early overs with high wickets
            else if (situation.RemainingWickets <= 3 || (situation.Phase == MatchPhase.Powerplay && rulesEngine.TotalRuns < 15))
            {
                desiredPreset = FieldPreset.Attacking;
            }
            // 4. Middle overs with steady scoring
            else if (situation.PressureIndex > 0.6f)
            {
                desiredPreset = FieldPreset.Defensive;
            }
            else
            {
                desiredPreset = FieldPreset.Balanced;
            }

            // Easy difficulty AI is slower to adapt tactically
            if (_difficulty == DifficultyLevel.Easy && UnityEngine.Random.value < 0.35f)
            {
                desiredPreset = FieldPreset.Balanced;
            }

            // Apply change if preset shifted
            if (desiredPreset != _activePreset)
            {
                _activePreset = desiredPreset;
                if (_fieldingCoordinator != null)
                {
                    _fieldingCoordinator.ApplyPreset(_activePreset);
                }
                CricketLogger.LogInfo(LogChannel.AI,
                    $"Tactical Field Shift: Applied preset [{_activePreset}] based on match situation (Phase: {situation.Phase}, Pressure: {situation.PressureIndex:F2}).");
            }

            return _activePreset;
        }
    }
}
