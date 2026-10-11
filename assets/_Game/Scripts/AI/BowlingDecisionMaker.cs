using System;
using System.Collections.Generic;
using UnityEngine;
using CricketLegends.Gameplay;
using CricketLegends.Physics;
using CricketLegends.Rules;

namespace CricketLegends.AI
{
    public enum BowlingProfileType
    {
        FastBowler,
        SwingBowler,
        SpinBowler,
        DefensiveBowler
    }

    /// <summary>
    /// Autonomous bowling intelligence selecting delivery type, line, length, speed,
    /// and aerodynamic swing/spin variation based on bowler profile, batter tendencies,
    /// match situation, and difficulty settings.
    /// STRICT INVARIANT: AI outputs genuine BowlingDelivery data for physical execution.
    /// Never mutates ball coordinates, scores, or forces fake dismissals.
    /// </summary>
    public class BowlingDecisionMaker : MonoBehaviour
    {
        [Header("Profile Configuration")]
        [SerializeField] private BowlingProfileType _profile = BowlingProfileType.FastBowler;
        [SerializeField] private DifficultyLevel _difficulty = DifficultyLevel.Medium;

        [Header("Tactical Memory")]
        [SerializeField] private List<BattingShotType> _observedBatterShots = new List<BattingShotType>();
        [SerializeField] private int _consecutiveBoundariesConceded = 0;

        public BowlingProfileType Profile => _profile;
        public DifficultyLevel Difficulty => _difficulty;

        public void Configure(BowlingProfileType profile, DifficultyLevel difficulty)
        {
            _profile = profile;
            _difficulty = difficulty;
        }

        public void RecordBatterShot(BattingShotType shot)
        {
            _observedBatterShots.Add(shot);
            if (_observedBatterShots.Count > 10)
            {
                _observedBatterShots.RemoveAt(0);
            }
        }

        public void RecordPreviousDeliveryOutcome(DeliveryResult result)
        {
            if (result.IsBoundaryFour || result.IsBoundarySix)
            {
                _consecutiveBoundariesConceded++;
            }
            else
            {
                _consecutiveBoundariesConceded = 0;
            }
        }

        /// <summary>
        /// Selects the optimal bowling delivery for the next ball based on match situation,
        /// profile archetype, observed batter habits, and configured difficulty.
        /// </summary>
        public BowlingDelivery DecideDelivery(CricketRulesEngine rulesEngine, MatchConfiguration config)
        {
            var situation = MatchSituationAnalyzer.Analyze(rulesEngine, config);

            float speedKmh;
            DeliveryLength length;
            DeliveryLine line;
            float lineOffset;
            float swing = 0f;
            float spin = 0f;

            // 1. Base Parameters by Profile Archetype
            switch (_profile)
            {
                case BowlingProfileType.SwingBowler:
                    speedKmh = UnityEngine.Random.Range(126f, 137f);
                    length = UnityEngine.Random.value < 0.65f ? DeliveryLength.Full : DeliveryLength.GoodLength;
                    line = DeliveryLine.OffStump;
                    lineOffset = -0.12f;
                    // Alternates between out-swing and in-swing
                    swing = UnityEngine.Random.value < 0.60f ? -4.5f : 3.8f;
                    break;

                case BowlingProfileType.SpinBowler:
                    speedKmh = UnityEngine.Random.Range(84f, 98f);
                    length = UnityEngine.Random.value < 0.50f ? DeliveryLength.GoodLength : DeliveryLength.Full;
                    line = UnityEngine.Random.value < 0.50f ? DeliveryLine.MiddleStump : DeliveryLine.OffStump;
                    lineOffset = (line == DeliveryLine.MiddleStump) ? 0.0f : -0.15f;
                    // Sharp lateral spin off the pitch
                    spin = UnityEngine.Random.value < 0.55f ? -3.2f : 2.8f;
                    break;

                case BowlingProfileType.DefensiveBowler:
                    speedKmh = UnityEngine.Random.Range(116f, 128f);
                    length = DeliveryLength.GoodLength;
                    line = DeliveryLine.OutsideOff;
                    lineOffset = -0.32f; // Bowl in fifth-stump channel to deny hitting zones
                    swing = -1.5f;
                    break;

                case BowlingProfileType.FastBowler:
                default:
                    speedKmh = UnityEngine.Random.Range(138f, 150f);
                    length = UnityEngine.Random.value < 0.50f ? DeliveryLength.GoodLength : DeliveryLength.Short;
                    line = UnityEngine.Random.value < 0.50f ? DeliveryLine.OffStump : DeliveryLine.MiddleStump;
                    lineOffset = (line == DeliveryLine.MiddleStump) ? 0.0f : -0.10f;
                    swing = UnityEngine.Random.Range(-1.5f, 1.5f);
                    break;
            }

            // 2. Situational Adaptation
            // If just conceded boundary, change length to disrupt batter rhythm
            if (_consecutiveBoundariesConceded >= 1)
            {
                if (length == DeliveryLength.Full)
                {
                    length = DeliveryLength.Bouncer; // Surprise bouncer
                }
                else
                {
                    length = DeliveryLength.Yorker; // Pinpoint yorker at toes
                }
            }
            // Death overs: Bowl yorkers or wide lines
            else if (situation.Phase == MatchPhase.DeathOvers)
            {
                if (UnityEngine.Random.value < 0.65f)
                {
                    length = DeliveryLength.Yorker;
                    lineOffset = UnityEngine.Random.value < 0.5f ? -0.05f : -0.35f; // Yorker on middle or wide yorker
                }
            }
            // Batter tendency counter-measures (Hard & Medium difficulty)
            else if (_difficulty != DifficultyLevel.Easy && _observedBatterShots.Count > 0)
            {
                var latestShot = _observedBatterShots[_observedBatterShots.Count - 1];
                if (latestShot == BattingShotType.Pull || latestShot == BattingShotType.Cut)
                {
                    // Batter punished short ball -> pitch it full outside off
                    length = DeliveryLength.Full;
                    lineOffset = -0.25f;
                }
                else if (latestShot == BattingShotType.CoverDrive || latestShot == BattingShotType.StraightDrive)
                {
                    // Batter driving well -> drop it back of length
                    length = DeliveryLength.Short;
                }
            }

            // 3. Difficulty Scaling (Documented parameters only)
            float spreadRadius;
            switch (_difficulty)
            {
                case DifficultyLevel.Easy:
                    speedKmh *= 0.90f; // 10% slower
                    spreadRadius = 0.65f; // Wider landing spread
                    swing *= 0.60f;
                    spin *= 0.60f;
                    break;

                case DifficultyLevel.Hard:
                    speedKmh *= 1.04f; // Elite fast pace
                    spreadRadius = 0.10f; // Laser pinpoint precision
                    swing *= 1.25f;
                    spin *= 1.25f;
                    break;

                case DifficultyLevel.Medium:
                default:
                    spreadRadius = 0.28f;
                    break;
            }

            // 4. Construct ScriptableObject Delivery Instance
            var delivery = BowlingDelivery.CreatePreset(length, speedKmh, lineOffset, swing, spin);
            delivery.SetLine(line, lineOffset);

            return delivery;
        }
    }
}
