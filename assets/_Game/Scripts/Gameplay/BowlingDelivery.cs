using System;
using UnityEngine;
using CricketLegends.Presentation;

namespace CricketLegends.Gameplay
{
    public enum DeliveryLength
    {
        Yorker,
        Full,
        GoodLength,
        Short,
        Bouncer
    }

    public enum DeliveryLine
    {
        OutsideOff,
        OffStump,
        MiddleStump,
        LegStump,
        DownLeg
    }

    /// <summary>
    /// Configurable data model defining all physical and tactical parameters of a bowling delivery.
    /// Can be instantiated as a ScriptableObject asset or generated procedurally by Bowling AI.
    /// </summary>
    [CreateAssetMenu(fileName = "NewBowlingDelivery", menuName = "Cricket Legends/Bowling Delivery", order = 2)]
    public class BowlingDelivery : ScriptableObject
    {
        [Header("Pace & Trajectory")]
        [Tooltip("Initial ball speed at release in kilometers per hour (e.g. 135 km/h)")]
        [Range(80f, 160f)]
        [SerializeField] private float _speedKmh = 135f;

        [Tooltip("Length classification relative to batsman popping crease")]
        [SerializeField] private DeliveryLength _length = DeliveryLength.GoodLength;

        [Tooltip("Horizontal line classification relative to the stumps")]
        [SerializeField] private DeliveryLine _line = DeliveryLine.OffStump;

        [Tooltip("Exact horizontal line offset in meters from pitch center (Negative = Off, Positive = Leg)")]
        [SerializeField] private float _lateralLineOffset = -0.15f;

        [Header("Release Mechanics")]
        [Tooltip("World position of bowler's hand at the instant of release")]
        [SerializeField] private Vector3 _releasePosition = new Vector3(0.65f, 1.95f, -9.80f);

        [Tooltip("Calculated or intended pitch contact point on the turf")]
        [SerializeField] private Vector3 _intendedPitchLocation = new Vector3(-0.15f, 0.03f, 4.50f);

        [Header("Aerodynamics & Rebound")]
        [Tooltip("Continuous lateral swing acceleration in m/s^2 before pitch contact (Negative = Out-swing, Positive = In-swing)")]
        [Range(-12f, 12f)]
        [SerializeField] private float _swingAmount = 0f;

        [Tooltip("Lateral angular spin deviation applied off the pitch bounce in m/s (Negative = Off-break/Away, Positive = Leg-break/In)")]
        [Range(-8f, 8f)]
        [SerializeField] private float _spinDeviation = 0f;

        [Tooltip("Vertical bounce restitution multiplier (1.0 = standard clay pitch bounce)")]
        [Range(0.6f, 1.4f)]
        [SerializeField] private float _bounceMultiplier = 1.0f;

        [Header("Accuracy & Spread")]
        [Tooltip("Maximum random pitch landing spread radius in meters based on bowler difficulty")]
        [Range(0f, 1.5f)]
        [SerializeField] private float _landingSpreadRadius = 0.25f;

        // Public Properties
        public float SpeedKmh => _speedKmh;
        public float SpeedMps => _speedKmh / 3.6f; // Conversion to SI meters per second
        public DeliveryLength Length => _length;
        public DeliveryLine Line => _line;
        public float LateralLineOffset => _lateralLineOffset;
        public Vector3 ReleasePosition => _releasePosition;
        public Vector3 IntendedPitchLocation => _intendedPitchLocation;
        public float SwingAmount => _swingAmount;
        public float SpinDeviation => _spinDeviation;
        public float BounceMultiplier => _bounceMultiplier;
        public float LandingSpreadRadius => _landingSpreadRadius;

        public void SetSpeed(float kmh) => _speedKmh = Mathf.Clamp(kmh, 80f, 160f);
        public void SetLength(DeliveryLength len) => _length = len;
        public void SetLine(DeliveryLine line, float offset)
        {
            _line = line;
            _lateralLineOffset = offset;
        }
        public void SetReleasePosition(Vector3 pos) => _releasePosition = pos;
        public void SetIntendedPitchLocation(Vector3 pos) => _intendedPitchLocation = pos;
        public void SetSwing(float swing) => _swingAmount = Mathf.Clamp(swing, -12f, 12f);
        public void SetSpin(float spin) => _spinDeviation = Mathf.Clamp(spin, -8f, 8f);

        /// <summary>
        /// Factory creating a configured runtime delivery instance with standard presets.
        /// </summary>
        public static BowlingDelivery CreatePreset(
            DeliveryLength length,
            float speedKmh = 135f,
            float lineOffset = -0.10f,
            float swing = 0f,
            float spin = 0f)
        {
            var delivery = CreateInstance<BowlingDelivery>();
            delivery._length = length;
            delivery._speedKmh = speedKmh;
            delivery._lateralLineOffset = lineOffset;
            delivery._swingAmount = swing;
            delivery._spinDeviation = spin;
            delivery._releasePosition = new Vector3(0.65f, 1.95f, -PitchCoordinates.PitchHalfLength + 0.26f);

            // Calculate standard pitch landing Z based on length preset
            float pitchZ = GetStandardPitchZForLength(length);
            delivery._intendedPitchLocation = new Vector3(lineOffset, 0.03f, pitchZ);

            return delivery;
        }

        public static float GetStandardPitchZForLength(DeliveryLength length)
        {
            switch (length)
            {
                case DeliveryLength.Yorker:
                    return 8.0f; // Pitches right at batter's feet (0.8m in front of popping crease)
                case DeliveryLength.Full:
                    return 6.2f; // Full driveable length
                case DeliveryLength.GoodLength:
                    return 4.4f; // Classic corridor of uncertainty
                case DeliveryLength.Short:
                    return 2.4f; // Back of a length / pullable
                case DeliveryLength.Bouncer:
                default:
                    return 0.5f; // Pitched halfway, rises steeply past chest
            }
        }
    }
}
