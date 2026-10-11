using System;
using System.Collections.Generic;
using UnityEngine;
using CricketLegends.Gameplay;

namespace CricketLegends.AI
{
    /// <summary>
    /// Governs tactical parameters and decision behaviors for fielders based on difficulty level.
    /// Manages reaction delays, pursuit kinetics, catch probabilities, and return throw priorities.
    /// Strictly separated from physics and rules resolution.
    /// </summary>
    public class FielderDecisionMaker : MonoBehaviour
    {
        [Header("Tactical Parameters (Documented Difficulty Calibration)")]
        [SerializeField] private DifficultyLevel _difficulty = DifficultyLevel.Medium;
        [SerializeField] private float _reactionDelay = 0.25f;
        [SerializeField] private float _sprintSpeed = 7.5f;
        [SerializeField] private float _catchSkill = 0.88f;

        public DifficultyLevel Difficulty => _difficulty;
        public float ReactionDelay => _reactionDelay;
        public float SprintSpeed => _sprintSpeed;
        public float CatchSkill => _catchSkill;

        public void ApplyDifficultySettings(DifficultyLevel difficulty, IEnumerable<FielderController> fielders)
        {
            _difficulty = difficulty;

            switch (difficulty)
            {
                case DifficultyLevel.Easy:
                    _reactionDelay = 0.45f; // Slower human reaction
                    _sprintSpeed = 6.8f;   // 6.8 m/s (~24.5 km/h)
                    _catchSkill = 0.75f;   // More dropped catches / opportunities for player
                    break;

                case DifficultyLevel.Hard:
                    _reactionDelay = 0.15f; // Rapid reflex reaction
                    _sprintSpeed = 8.1f;   // 8.1 m/s (~29 km/h)
                    _catchSkill = 0.96f;   // Elite fielding unit
                    break;

                case DifficultyLevel.Medium:
                default:
                    _reactionDelay = 0.25f; // Balanced reaction
                    _sprintSpeed = 7.5f;   // 7.5 m/s (~27 km/h)
                    _catchSkill = 0.88f;   // Standard international standard
                    break;
            }

            if (fielders != null)
            {
                foreach (var fielder in fielders)
                {
                    if (fielder != null)
                    {
                        // Reflect difficulty parameters into fielder motor configuration
                        var fieldType = typeof(FielderController);
                        var delayField = fieldType.GetField("_reactionDelay", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                        var speedField = fieldType.GetField("_sprintSpeed", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                        var catchField = fieldType.GetField("_catchSkill", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);

                        delayField?.SetValue(fielder, _reactionDelay);
                        speedField?.SetValue(fielder, _sprintSpeed);
                        catchField?.SetValue(fielder, _catchSkill);
                    }
                }
            }

            CricketLogger.LogInfo(LogChannel.AI,
                $"FielderDecisionMaker calibrated for [{difficulty}]: Reaction={_reactionDelay:F2}s, Speed={_sprintSpeed:F1}m/s, CatchSkill={_catchSkill:F2}");
        }
    }
}
