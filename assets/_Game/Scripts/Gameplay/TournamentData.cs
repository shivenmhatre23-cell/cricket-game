using System;
using System.Collections.Generic;
using UnityEngine;

namespace CricketLegends.Gameplay
{
    public enum TournamentFormatType
    {
        Knockout,
        RoundRobinLeague
    }

    [Serializable]
    public class TournamentFixture
    {
        public int FixtureId;
        public string StageName; // "Round 1", "Quarter-Final", "Semi-Final", "Final"
        public string HomeTeamId;
        public string AwayTeamId;
        public bool IsCompleted;

        // Results
        public int HomeScore;
        public int HomeWickets;
        public float HomeOvers;
        public int AwayScore;
        public int AwayWickets;
        public float AwayOvers;
        public string WinnerTeamId;
        public string ResultReason;

        public TournamentFixture(int id, string stage, string home, string away)
        {
            FixtureId = id;
            StageName = stage;
            HomeTeamId = home;
            AwayTeamId = away;
            IsCompleted = false;
            HomeScore = 0;
            HomeWickets = 0;
            HomeOvers = 0f;
            AwayScore = 0;
            AwayWickets = 0;
            AwayOvers = 0f;
            WinnerTeamId = null;
            ResultReason = "Scheduled";
        }
    }

    [Serializable]
    public class TeamStanding : IComparable<TeamStanding>
    {
        public string TeamId;
        public string TeamName;
        public int MatchesPlayed;
        public int Wins;
        public int Losses;
        public int Ties;
        public int Points;
        public int RunsScored;
        public float OversFaced;
        public int RunsConceded;
        public float OversBowled;

        public float NetRunRate
        {
            get
            {
                float forRate = OversFaced > 0f ? (RunsScored / OversFaced) : 0f;
                float againstRate = OversBowled > 0f ? (RunsConceded / OversBowled) : 0f;
                return forRate - againstRate;
            }
        }

        public TeamStanding(string teamId, string teamName)
        {
            TeamId = teamId;
            TeamName = teamName;
            MatchesPlayed = 0;
            Wins = 0;
            Losses = 0;
            Ties = 0;
            Points = 0;
            RunsScored = 0;
            OversFaced = 0f;
            RunsConceded = 0f;
            OversBowled = 0f;
        }

        public void RecordMatch(int scored, float oversFaced, int conceded, float oversBowled, int pointsDelta, bool isWin, bool isLoss, bool isTie)
        {
            MatchesPlayed++;
            RunsScored += scored;
            OversFaced += oversFaced;
            RunsConceded += conceded;
            OversBowled += oversBowled;
            Points += pointsDelta;

            if (isWin) Wins++;
            if (isLoss) Losses++;
            if (isTie) Ties++;
        }

        public int CompareTo(TeamStanding other)
        {
            if (other == null) return 1;

            // 1. Primary: Points descending
            if (Points != other.Points) return other.Points.CompareTo(Points);

            // 2. Secondary: Net Run Rate descending
            float nrrDiff = NetRunRate - other.NetRunRate;
            if (Mathf.Abs(nrrDiff) > 0.001f) return nrrDiff > 0f ? -1 : 1;

            // 3. Tertiary: Wins descending
            if (Wins != other.Wins) return other.Wins.CompareTo(Wins);

            // 4. Quaternary: Alphabetical
            return string.Compare(TeamName, other.TeamName, StringComparison.Ordinal);
        }
    }
}
