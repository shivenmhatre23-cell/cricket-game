using System;
using UnityEngine;
using CricketLegends.AI;

namespace CricketLegends.Gameplay
{
    public enum PlayerRole
    {
        Batsman,
        Bowler,
        AllRounder,
        WicketKeeper
    }

    /// <summary>
    /// Configurable data model defining individual fictional player attributes and career statistics.
    /// Strictly separated from visual presentation assets.
    /// </summary>
    [Serializable]
    public class PlayerData
    {
        public string PlayerId;
        public string Name;
        public PlayerRole Role;
        public int BattingSkill; // 50 to 99
        public int BowlingSkill; // 50 to 99
        public BowlingProfileType BowlingProfile;

        // Cumulative Career Statistics
        public int CareerMatches;
        public int CareerRuns;
        public int CareerWickets;
        public int CareerFours;
        public int CareerSixes;
        public int HighestScore;

        public PlayerData(string id, string name, PlayerRole role, int batSkill, int bowlSkill, BowlingProfileType profile)
        {
            PlayerId = id;
            Name = name;
            Role = role;
            BattingSkill = Mathf.Clamp(batSkill, 50, 99);
            BowlingSkill = Mathf.Clamp(bowlSkill, 50, 99);
            BowlingProfile = profile;

            CareerMatches = 0;
            CareerRuns = 0;
            CareerWickets = 0;
            CareerFours = 0;
            CareerSixes = 0;
            HighestScore = 0;
        }

        public void RecordMatchStats(int runsScored, int wicketsTaken, int fours, int sixes)
        {
            CareerMatches++;
            CareerRuns += runsScored;
            CareerWickets += wicketsTaken;
            CareerFours += fours;
            CareerSixes += sixes;
            if (runsScored > HighestScore)
            {
                HighestScore = runsScored;
            }
        }
    }
}
