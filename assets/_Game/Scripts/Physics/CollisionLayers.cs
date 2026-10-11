using UnityEngine;

namespace CricketLegends.Physics
{
    /// <summary>
    /// Centralized layer names and collision filtering masks for Cricket Legends.
    /// Prevents the cricket ball from checking collisions against irrelevant decorative geometry.
    /// </summary>
    public static class CollisionLayers
    {
        public const string LayerBall = "CricketBall";
        public const string LayerBat = "CricketBat";
        public const string LayerPitch = "CricketPitch";
        public const string LayerStumps = "CricketStumps";
        public const string LayerField = "CricketField";
        public const string LayerPlayers = "CricketPlayers";
        public const string LayerTriggerZones = "CricketTriggerZones";

        public const string TagBall = "CricketBall";
        public const string TagBat = "CricketBat";
        public const string TagPitch = "CricketPitch";
        public const string TagStumps = "CricketStumps";
        public const string TagBoundary = "BoundaryRope";

        /// <summary>
        /// LayerMask containing all valid surfaces the ball can physically collide with during play.
        /// </summary>
        public static int GetBallCollisionMask()
        {
            int mask = 0;
            int lPitch = LayerMask.NameToLayer(LayerPitch);
            int lField = LayerMask.NameToLayer(LayerField);
            int lBat = LayerMask.NameToLayer(LayerBat);
            int lStumps = LayerMask.NameToLayer(LayerStumps);
            int lPlayers = LayerMask.NameToLayer(LayerPlayers);

            if (lPitch != -1) mask |= (1 << lPitch);
            if (lField != -1) mask |= (1 << lField);
            if (lBat != -1) mask |= (1 << lBat);
            if (lStumps != -1) mask |= (1 << lStumps);
            if (lPlayers != -1) mask |= (1 << lPlayers);

            // Default layer fallback if custom layers are not yet assigned in ProjectSettings
            if (mask == 0)
            {
                mask = ~0; // All layers by default
            }

            return mask;
        }

        public static bool IsPitchSurface(GameObject obj)
        {
            if (obj == null) return false;
            return obj.CompareTag(TagPitch) ||
                   obj.layer == LayerMask.NameToLayer(LayerPitch) ||
                   obj.name.Contains("Pitch");
        }

        public static bool IsWicketsSurface(GameObject obj)
        {
            if (obj == null) return false;
            return obj.CompareTag(TagStumps) ||
                   obj.layer == LayerMask.NameToLayer(LayerStumps) ||
                   obj.name.Contains("Stump") ||
                   obj.name.Contains("Bail") ||
                   obj.name.Contains("Wicket");
        }

        public static bool IsBatSurface(GameObject obj)
        {
            if (obj == null) return false;
            return obj.CompareTag(TagBat) ||
                   obj.layer == LayerMask.NameToLayer(LayerBat) ||
                   obj.name.Contains("Bat");
        }
    }
}
