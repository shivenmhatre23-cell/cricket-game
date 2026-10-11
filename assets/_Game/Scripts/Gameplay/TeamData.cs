using System;
using System.Collections.Generic;
using UnityEngine;
using CricketLegends.AI;

namespace CricketLegends.Gameplay
{
    /// <summary>
    /// Configurable data model defining fictional team identity, colors, emblem, and squad roster.
    /// ScriptableObject capable or in-memory serializable.
    /// </summary>
    [Serializable]
    public class TeamData
    {
        public string TeamId;
        public string TeamName;
        public string ShortCode;
        public Color PrimaryColor;
        public Color SecondaryColor;
        public string EmblemName;
        public List<PlayerData> Squad = new List<PlayerData>();

        public TeamData(string id, string name, string shortCode, Color primary, Color secondary, string emblem)
        {
            TeamId = id;
            TeamName = name;
            ShortCode = shortCode;
            PrimaryColor = primary;
            SecondaryColor = secondary;
            EmblemName = emblem;
        }

        public IReadOnlyList<string> GetPlayerNames()
        {
            var names = new List<string>();
            foreach (var p in Squad)
            {
                names.Add(p.Name);
            }
            return names;
        }

        /// <summary>
        /// Generates an 8-team fictional league database without real-world likenesses or protected trademarks.
        /// </summary>
        public static List<TeamData> CreateDefaultFictionalLeague()
        {
            var teams = new List<TeamData>();

            // 1. Mumbai Blasters (MBL)
            var mbl = new TeamData("T_MBL", "Mumbai Blasters", "MBL", new Color(0.04f, 0.15f, 0.38f), new Color(0.95f, 0.75f, 0.10f), "Emblem_Blasters");
            PopulateSquad(mbl, "Blaster", BowlingProfileType.FastBowler);
            teams.Add(mbl);

            // 2. London Monarchs (LMO)
            var lmo = new TeamData("T_LMO", "London Monarchs", "LMO", new Color(0.12f, 0.23f, 0.54f), new Color(0.85f, 0.10f, 0.20f), "Emblem_Monarchs");
            PopulateSquad(lmo, "Monarch", BowlingProfileType.SwingBowler);
            teams.Add(lmo);

            // 3. Melbourne Strikers (MST)
            var mst = new TeamData("T_MST", "Melbourne Strikers", "MST", new Color(0.06f, 0.45f, 0.25f), new Color(0.20f, 0.20f, 0.20f), "Emblem_Strikers");
            PopulateSquad(mst, "Striker", BowlingProfileType.FastBowler);
            teams.Add(mst);

            // 4. Cape Town Titans (CPT)
            var cpt = new TeamData("T_CPT", "Cape Town Titans", "CPT", new Color(0.08f, 0.50f, 0.55f), new Color(0.95f, 0.45f, 0.10f), "Emblem_Titans");
            PopulateSquad(cpt, "Titan", BowlingProfileType.DefensiveBowler);
            teams.Add(cpt);

            // 5. Sydney Phantoms (SYP)
            var syp = new TeamData("T_SYP", "Sydney Phantoms", "SYP", new Color(0.55f, 0.10f, 0.55f), new Color(0.10f, 0.85f, 0.85f), "Emblem_Phantoms");
            PopulateSquad(syp, "Phantom", BowlingProfileType.SpinBowler);
            teams.Add(syp);

            // 6. Kolkata Royals (KRO)
            var kro = new TeamData("T_KRO", "Kolkata Royals", "KRO", new Color(0.30f, 0.12f, 0.45f), new Color(0.90f, 0.80f, 0.20f), "Emblem_Royals");
            PopulateSquad(kro, "Royal", BowlingProfileType.SpinBowler);
            teams.Add(kro);

            // 7. Karachi Falcons (KFA)
            var kfa = new TeamData("T_KFA", "Karachi Falcons", "KFA", new Color(0.05f, 0.35f, 0.15f), new Color(0.80f, 0.80f, 0.80f), "Emblem_Falcons");
            PopulateSquad(kfa, "Falcon", BowlingProfileType.FastBowler);
            teams.Add(kfa);

            // 8. Auckland Waves (AKW)
            var akw = new TeamData("T_AKW", "Auckland Waves", "AKW", new Color(0.15f, 0.55f, 0.85f), new Color(0.95f, 0.95f, 0.95f), "Emblem_Waves");
            PopulateSquad(akw, "Wave", BowlingProfileType.SwingBowler);
            teams.Add(akw);

            return teams;
        }

        private static void PopulateSquad(TeamData team, string prefix, BowlingProfileType leadBowlerProfile)
        {
            team.Squad.Clear();
            string[] firstNames = { "Alex", "Devon", "Marcus", "Rohan", "Sam", "Liam", "Zack", "Chris", "Tariq", "Noah", "Leo" };
            PlayerRole[] roles = {
                PlayerRole.Batsman, PlayerRole.Batsman, PlayerRole.Batsman, PlayerRole.Batsman,
                PlayerRole.WicketKeeper, PlayerRole.AllRounder, PlayerRole.AllRounder,
                PlayerRole.Bowler, PlayerRole.Bowler, PlayerRole.Bowler, PlayerRole.Bowler
            };

            for (int i = 0; i < 11; i++)
            {
                int batSkill = 65 + (i < 5 ? (5 - i) * 5 : 0);
                int bowlSkill = 55 + (i >= 6 ? (i - 5) * 8 : 0);
                var profile = (i >= 7) ? leadBowlerProfile : BowlingProfileType.DefensiveBowler;

                team.Squad.Add(new PlayerData(
                    $"{team.TeamId}_P{i + 1}",
                    $"{firstNames[i]} {prefix}",
                    roles[i],
                    batSkill,
                    bowlSkill,
                    profile
                ));
            }
        }
    }
}
