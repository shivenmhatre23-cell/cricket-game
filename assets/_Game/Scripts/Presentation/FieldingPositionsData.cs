using System.Collections.Generic;
using UnityEngine;

namespace CricketLegends.Presentation
{
    public enum FieldPreset
    {
        Balanced,
        Attacking,
        Defensive,
        BoundaryProtection
    }

    [System.Serializable]
    public struct FielderPlacement
    {
        public string RoleName;
        public Vector3 LocalPosition;
        public bool IsWicketkeeper;
        public bool IsBowler;

        public FielderPlacement(string name, Vector3 pos, bool isKeeper = false, bool isBowler = false)
        {
            RoleName = name;
            LocalPosition = pos;
            IsWicketkeeper = isKeeper;
            IsBowler = isBowler;
        }
    }

    /// <summary>
    /// Configurable 11-player fielding placement database for Balanced, Attacking, and Defensive strategies.
    /// All coordinates are in meters relative to pitch center (0,0,0).
    /// </summary>
    public static class FieldingPositionsData
    {
        public static List<FielderPlacement> GetFieldPreset(FieldPreset preset)
        {
            switch (preset)
            {
                case FieldPreset.Attacking:
                    return new List<FielderPlacement>
                    {
                        new FielderPlacement("Bowler", new Vector3(0.8f, 0f, -10.5f), false, true),
                        new FielderPlacement("Wicketkeeper", new Vector3(0.0f, 0f, 15.5f), true),
                        new FielderPlacement("First Slip", new Vector3(2.4f, 0f, 15.2f)),
                        new FielderPlacement("Second Slip", new Vector3(3.8f, 0f, 14.8f)),
                        new FielderPlacement("Gully", new Vector3(8.5f, 0f, 12.0f)),
                        new FielderPlacement("Short Leg", new Vector3(-3.2f, 0f, 9.5f)),
                        new FielderPlacement("Cover", new Vector3(18.0f, 0f, 5.0f)),
                        new FielderPlacement("Mid-Off", new Vector3(9.0f, 0f, -7.0f)),
                        new FielderPlacement("Mid-On", new Vector3(-8.5f, 0f, -7.0f)),
                        new FielderPlacement("Mid-Wicket", new Vector3(-16.0f, 0f, 4.0f)),
                        new FielderPlacement("Deep Fine Leg", new Vector3(-32.0f, 0f, 38.0f))
                    };

                case FieldPreset.Defensive:
                    return new List<FielderPlacement>
                    {
                        new FielderPlacement("Bowler", new Vector3(0.8f, 0f, -10.5f), false, true),
                        new FielderPlacement("Wicketkeeper", new Vector3(0.0f, 0f, 16.5f), true),
                        new FielderPlacement("Deep Point", new Vector3(45.0f, 0f, 18.0f)),
                        new FielderPlacement("Deep Cover", new Vector3(42.0f, 0f, -10.0f)),
                        new FielderPlacement("Long-Off", new Vector3(18.0f, 0f, -48.0f)),
                        new FielderPlacement("Long-On", new Vector3(-18.0f, 0f, -48.0f)),
                        new FielderPlacement("Deep Mid-Wicket", new Vector3(-44.0f, 0f, -5.0f)),
                        new FielderPlacement("Deep Square Leg", new Vector3(-48.0f, 0f, 20.0f)),
                        new FielderPlacement("Deep Fine Leg", new Vector3(-25.0f, 0f, 48.0f)),
                        new FielderPlacement("Third Man", new Vector3(30.0f, 0f, 44.0f)),
                        new FielderPlacement("Cover Point", new Vector3(16.0f, 0f, 8.0f))
                    };

                case FieldPreset.BoundaryProtection:
                    return new List<FielderPlacement>
                    {
                        new FielderPlacement("Bowler", new Vector3(0.8f, 0f, -10.5f), false, true),
                        new FielderPlacement("Wicketkeeper", new Vector3(0.0f, 0f, 16.5f), true),
                        new FielderPlacement("Deep Backward Point", new Vector3(38.0f, 0f, 28.0f)),
                        new FielderPlacement("Deep Cover", new Vector3(45.0f, 0f, 0.0f)),
                        new FielderPlacement("Long-Off", new Vector3(22.0f, 0f, -50.0f)),
                        new FielderPlacement("Straight Long-On", new Vector3(0.0f, 0f, -54.0f)),
                        new FielderPlacement("Wide Long-On", new Vector3(-22.0f, 0f, -50.0f)),
                        new FielderPlacement("Deep Mid-Wicket", new Vector3(-46.0f, 0f, 0.0f)),
                        new FielderPlacement("Deep Square Leg", new Vector3(-44.0f, 0f, 26.0f)),
                        new FielderPlacement("Deep Fine Leg", new Vector3(-26.0f, 0f, 50.0f)),
                        new FielderPlacement("Third Man", new Vector3(28.0f, 0f, 48.0f))
                    };

                case FieldPreset.Balanced:
                default:
                    return new List<FielderPlacement>
                    {
                        new FielderPlacement("Bowler", new Vector3(0.8f, 0f, -10.5f), false, true),
                        new FielderPlacement("Wicketkeeper", new Vector3(0.0f, 0f, 16.0f), true),
                        new FielderPlacement("First Slip", new Vector3(2.5f, 0f, 15.5f)),
                        new FielderPlacement("Point", new Vector3(16.5f, 0f, 11.0f)),
                        new FielderPlacement("Cover", new Vector3(18.0f, 0f, 2.0f)),
                        new FielderPlacement("Mid-Off", new Vector3(9.5f, 0f, -8.0f)),
                        new FielderPlacement("Mid-On", new Vector3(-9.5f, 0f, -8.0f)),
                        new FielderPlacement("Mid-Wicket", new Vector3(-17.5f, 0f, 3.0f)),
                        new FielderPlacement("Square Leg", new Vector3(-16.0f, 0f, 11.5f)),
                        new FielderPlacement("Deep Fine Leg", new Vector3(-28.0f, 0f, 42.0f)),
                        new FielderPlacement("Deep Extra Cover", new Vector3(36.0f, 0f, -14.0f))
                    };
            }
        }
    }
}
