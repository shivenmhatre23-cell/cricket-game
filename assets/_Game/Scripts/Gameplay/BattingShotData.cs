using System;
using System.Collections.Generic;
using UnityEngine;

namespace CricketLegends.Gameplay
{
    public enum BattingShotType
    {
        ForwardDefense = 1,
        BackFootDefense = 2,
        StraightDrive = 3,
        CoverDrive = 4,
        OnDrive = 5,
        Pull = 6,
        Cut = 7,
        LoftedAttack = 8
    }

    public enum TimingQuality
    {
        Perfect,
        Good,
        Early,
        Late,
        Miss
    }

    public enum FootworkType
    {
        FrontFoot,
        BackFoot
    }

    /// <summary>
    /// Configurable data model defining physical and animation parameters for an individual batting shot.
    /// Used by BatsmanController and BatCollisionResolver to calculate exit velocity, angles, and contact windows.
    /// </summary>
    [CreateAssetMenu(fileName = "NewBattingShot", menuName = "Cricket Legends/Batting Shot Data", order = 3)]
    public class BattingShotData : ScriptableObject
    {
        [Header("Shot Identity")]
        [SerializeField] private string _shotName = "Straight Drive";
        [SerializeField] private BattingShotType _shotType = BattingShotType.StraightDrive;
        [SerializeField] private FootworkType _footwork = FootworkType.FrontFoot;
        [SerializeField] private bool _isAttacking = true;

        [Header("Swing Timing & Durations")]
        [Tooltip("Total duration of the bat swing phase in seconds")]
        [Range(0.15f, 0.65f)]
        [SerializeField] private float _swingDuration = 0.32f;

        [Tooltip("Ideal contact time point within the swing (fraction from 0.0 to 1.0)")]
        [Range(0.2f, 0.8f)]
        [SerializeField] private float _idealContactPointNormalized = 0.52f;

        [Tooltip("Half-window for Perfect timing in seconds")]
        [Range(0.02f, 0.08f)]
        [SerializeField] private float _perfectWindow = 0.045f;

        [Tooltip("Half-window for Good timing in seconds")]
        [Range(0.06f, 0.16f)]
        [SerializeField] private float _goodWindow = 0.110f;

        [Tooltip("Half-window for Early/Late contact in seconds")]
        [Range(0.12f, 0.28f)]
        [SerializeField] private float _marginalWindow = 0.220f;

        [Header("Ballistic Power & Angles")]
        [Tooltip("Average bat linear speed at moment of impact in m/s")]
        [Range(5f, 40f)]
        [SerializeField] private float _batVelocityAtContact = 26f;

        [Tooltip("Base shot direction in horizontal degrees relative to pitch (0 = Straight, Negative = Off-side, Positive = Leg-side)")]
        [Range(-90f, 90f)]
        [SerializeField] private float _baseAzimuthAngle = 0f;

        [Tooltip("Vertical launch loft angle in degrees (0 = along the ground, 45 = high maximum arc)")]
        [Range(0f, 48f)]
        [SerializeField] private float _loftAngle = 6f;

        [Tooltip("Exit power multiplier applied to outgoing momentum")]
        [Range(0.1f, 2.0f)]
        [SerializeField] private float _powerMultiplier = 1.15f;

        [Header("Recovery")]
        [Tooltip("Duration of follow-through recovery back to ready stance")]
        [Range(0.2f, 0.8f)]
        [SerializeField] private float _recoveryDuration = 0.38f;

        // Public Properties
        public string ShotName => _shotName;
        public BattingShotType ShotType => _shotType;
        public FootworkType Footwork => _footwork;
        public bool IsAttacking => _isAttacking;
        public float SwingDuration => _swingDuration;
        public float IdealContactNormalized => _idealContactPointNormalized;
        public float PerfectWindow => _perfectWindow;
        public float GoodWindow => _goodWindow;
        public float MarginalWindow => _marginalWindow;
        public float BatVelocity => _batVelocityAtContact;
        public float BaseAzimuthAngle => _baseAzimuthAngle;
        public float LoftAngle => _loftAngle;
        public float PowerMultiplier => _powerMultiplier;
        public float RecoveryDuration => _recoveryDuration;

        /// <summary>
        /// Evaluates timing difference (tInput - tExpected) into TimingQuality classification.
        /// </summary>
        public TimingQuality ClassifyTiming(float timeError)
        {
            float absErr = Mathf.Abs(timeError);

            if (absErr <= _perfectWindow)
            {
                return TimingQuality.Perfect;
            }
            if (absErr <= _goodWindow)
            {
                return TimingQuality.Good;
            }
            if (timeError < -_goodWindow && timeError >= -_marginalWindow)
            {
                return TimingQuality.Early;
            }
            if (timeError > _goodWindow && timeError <= _marginalWindow)
            {
                return TimingQuality.Late;
            }

            return TimingQuality.Miss;
        }

        /// <summary>
        /// Factory creating standard configured data asset for each of the 8 canonical shots.
        /// </summary>
        public static BattingShotData CreatePreset(BattingShotType type)
        {
            var data = CreateInstance<BattingShotData>();
            data._shotType = type;

            switch (type)
            {
                case BattingShotType.ForwardDefense:
                    data._shotName = "Forward Defense";
                    data._footwork = FootworkType.FrontFoot;
                    data._isAttacking = false;
                    data._swingDuration = 0.28f;
                    data._batVelocityAtContact = 8f;
                    data._baseAzimuthAngle = 0f;
                    data._loftAngle = 2f;
                    data._powerMultiplier = 0.20f;
                    data._recoveryDuration = 0.30f;
                    break;

                case BattingShotType.BackFootDefense:
                    data._shotName = "Back Foot Defense";
                    data._footwork = FootworkType.BackFoot;
                    data._isAttacking = false;
                    data._swingDuration = 0.26f;
                    data._batVelocityAtContact = 7f;
                    data._baseAzimuthAngle = 0f;
                    data._loftAngle = 1f;
                    data._powerMultiplier = 0.15f;
                    data._recoveryDuration = 0.28f;
                    break;

                case BattingShotType.StraightDrive:
                    data._shotName = "Straight Drive";
                    data._footwork = FootworkType.FrontFoot;
                    data._isAttacking = true;
                    data._swingDuration = 0.32f;
                    data._batVelocityAtContact = 28f;
                    data._baseAzimuthAngle = 0f;
                    data._loftAngle = 6f;
                    data._powerMultiplier = 1.20f;
                    data._recoveryDuration = 0.40f;
                    break;

                case BattingShotType.CoverDrive:
                    data._shotName = "Cover Drive";
                    data._footwork = FootworkType.FrontFoot;
                    data._isAttacking = true;
                    data._swingDuration = 0.33f;
                    data._batVelocityAtContact = 28f;
                    data._baseAzimuthAngle = -35f; // Pierces extra-cover
                    data._loftAngle = 7f;
                    data._powerMultiplier = 1.20f;
                    data._recoveryDuration = 0.40f;
                    break;

                case BattingShotType.OnDrive:
                    data._shotName = "On Drive";
                    data._footwork = FootworkType.FrontFoot;
                    data._isAttacking = true;
                    data._swingDuration = 0.32f;
                    data._batVelocityAtContact = 26f;
                    data._baseAzimuthAngle = 28f; // Mid-on / mid-wicket gap
                    data._loftAngle = 6f;
                    data._powerMultiplier = 1.15f;
                    data._recoveryDuration = 0.38f;
                    break;

                case BattingShotType.Pull:
                    data._shotName = "Pull Shot";
                    data._footwork = FootworkType.BackFoot;
                    data._isAttacking = true;
                    data._swingDuration = 0.34f;
                    data._batVelocityAtContact = 31f;
                    data._baseAzimuthAngle = 72f; // Square leg / mid-wicket
                    data._loftAngle = 18f;
                    data._powerMultiplier = 1.35f;
                    data._recoveryDuration = 0.44f;
                    break;

                case BattingShotType.Cut:
                    data._shotName = "Square Cut";
                    data._footwork = FootworkType.BackFoot;
                    data._isAttacking = true;
                    data._swingDuration = 0.30f;
                    data._batVelocityAtContact = 29f;
                    data._baseAzimuthAngle = -65f; // Point / third man
                    data._loftAngle = 10f;
                    data._powerMultiplier = 1.28f;
                    data._recoveryDuration = 0.38f;
                    break;

                case BattingShotType.LoftedAttack:
                default:
                    data._shotName = "Lofted Attack";
                    data._footwork = FootworkType.FrontFoot;
                    data._isAttacking = true;
                    data._swingDuration = 0.36f;
                    data._batVelocityAtContact = 36f;
                    data._baseAzimuthAngle = 0f;
                    data._loftAngle = 38f; // High aerial maximum launch for SIX
                    data._powerMultiplier = 1.60f;
                    data._recoveryDuration = 0.48f;
                    break;
            }

            return data;
        }
    }
}
