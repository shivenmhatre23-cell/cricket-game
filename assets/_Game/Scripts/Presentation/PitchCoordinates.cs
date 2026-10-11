using UnityEngine;

namespace CricketLegends.Presentation
{
    /// <summary>
    /// Canonical pitch and ground coordinate definitions for Cricket Legends.
    /// Standard World Units: 1 unit = 1 meter.
    /// Pitch Origin (0,0,0) is at the exact center of the pitch turf.
    /// +Z points towards the Striker's wicket (Batting End).
    /// -Z points towards the Bowler's wicket (Bowling End).
    /// +X is Off-side for a Right-Handed Batter (RHB).
    /// -X is Leg-side for a Right-Handed Batter (RHB).
    /// </summary>
    public static class PitchCoordinates
    {
        // --- 1. Pitch & Wicket Dimensions ---
        public const float PitchLengthWicketToWicket = 20.12f; // 22 yards
        public const float PitchHalfLength = PitchLengthWicketToWicket * 0.5f; // 10.06m
        public const float PitchTotalTurfLength = 22.56f; // Total prepared strip
        public const float PitchTurfWidth = 3.05f; // 10 feet
        public const float PitchTurfThickness = 0.05f;

        // Crease Offsets (MCC Standard)
        public const float PoppingCreaseOffsetFromWicket = 1.22f; // 4 feet
        public const float StrikerPoppingCreaseZ = PitchHalfLength - PoppingCreaseOffsetFromWicket; // +8.84m
        public const float BowlerPoppingCreaseZ = -PitchHalfLength + PoppingCreaseOffsetFromWicket; // -8.84m

        public const float BowlingCreaseWidth = 2.64f; // 8 feet 8 inches
        public const float ReturnCreaseHalfWidth = BowlingCreaseWidth * 0.5f; // 1.32m
        public const float CreaseLineWidth = 0.06f; // 6 cm painted line

        // Wicket Specification
        public const float StumpHeight = 0.711f; // 28 inches
        public const float StumpRadius = 0.0175f; // ~3.5 cm diameter
        public const float StumpSpacing = 0.09f; // Distance between stump centers
        public const float WicketTotalWidth = 0.2286f; // 9 inches
        public const float BailLength = 0.111f; // ~4 3/8 inches
        public const float BailRadius = 0.0075f;

        // Ground & Boundary
        public const float ThirtyYardCircleRadius = 27.43f; // 30 yards
        public const float BoundaryRadiusX = 66.0f; // Oval minor radius
        public const float BoundaryRadiusZ = 72.0f; // Oval major radius
        public const float BoundaryRopeRadius = 0.06f; // Thick braided rope

        // Stadium Bowl
        public const float StadiumStandsInnerRadius = 72.0f;
        public const float StadiumStandsOuterRadius = 96.0f;
        public const float StadiumStandsHeight = 22.0f;
        public const float FloodlightDistance = 95.0f;
        public const float FloodlightTowerHeight = 44.0f;

        // --- 2. Key World Positions ---
        public static readonly Vector3 PitchCenter = Vector3.zero;
        public static readonly Vector3 StrikerWicketsPosition = new Vector3(0f, 0f, PitchHalfLength);
        public static readonly Vector3 BowlerWicketsPosition = new Vector3(0f, 0f, -PitchHalfLength);

        public static readonly Vector3 StrikerCreasePosition = new Vector3(0f, 0f, StrikerPoppingCreaseZ);
        public static readonly Vector3 BowlerCreasePosition = new Vector3(0f, 0f, BowlerPoppingCreaseZ);

        // Player Spawn Coordinates
        public static readonly Vector3 BatterDefaultStancePosition = new Vector3(0.12f, 0f, 9.15f);
        public static readonly Vector3 NonStrikerDefaultPosition = new Vector3(-1.10f, 0f, -9.00f);
        public static readonly Vector3 BowlerRunupStartPosition = new Vector3(0.80f, 0f, -25.0f);
        public static readonly Vector3 BowlerDeliveryReleasePosition = new Vector3(0.70f, 1.95f, -9.80f);
        public static readonly Vector3 BowlerEndUmpirePosition = new Vector3(0f, 0f, -12.5f);
        public static readonly Vector3 SquareLegUmpirePosition = new Vector3(-15.0f, 0f, 8.84f);

        /// <summary>
        /// Calculates whether a world position has crossed the boundary oval.
        /// </summary>
        public static bool IsBeyondBoundary(Vector3 position)
        {
            float normX = position.x / BoundaryRadiusX;
            float normZ = position.z / BoundaryRadiusZ;
            return (normX * normX + normZ * normZ) >= 1.0f;
        }

        /// <summary>
        /// Calculates whether a ball contact occurred within the batting contact zone.
        /// </summary>
        public static bool IsInBattingStrikeZone(Vector3 ballPosition)
        {
            return ballPosition.z >= (StrikerPoppingCreaseZ - 0.5f) &&
                   ballPosition.z <= (PitchHalfLength + 0.5f) &&
                   ballPosition.y >= 0.05f &&
                   ballPosition.y <= 1.85f &&
                   Mathf.Abs(ballPosition.x) <= 1.2f;
        }
    }
}
