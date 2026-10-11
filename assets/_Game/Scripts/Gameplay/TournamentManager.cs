using System;
using System.Collections.Generic;
using UnityEngine;
using CricketLegends.Core;

namespace CricketLegends.Gameplay
{
    /// <summary>
    /// Central tournament progression service managing Knockout and Round-Robin tournaments.
    /// Manages fixture schedules, standings tables, NRR rankings, and bracket progressions.
    /// STRICT INVARIANT: Match results are recorded exactly once.
    /// STRICT INVARIANT: A completed tournament cannot advance twice.
    /// </summary>
    public class TournamentManager : MonoBehaviour
    {
        public static TournamentManager Instance { get; private set; }

        [Header("Tournament State")]
        [SerializeField] private string _tournamentName = "Cricket Legends Trophy";
        [SerializeField] private TournamentFormatType _format = TournamentFormatType.RoundRobinLeague;
        [SerializeField] private int _matchOvers = 2;
        [SerializeField] private bool _isTournamentComplete = false;
        [SerializeField] private string _championTeamId = null;

        [Header("Participants & Schedule")]
        [SerializeField] private List<TeamStanding> _standings = new List<TeamStanding>();
        [SerializeField] private List<TournamentFixture> _fixtures = new List<TournamentFixture>();

        private readonly HashSet<int> _completedFixtureIds = new HashSet<int>();
        private readonly Dictionary<string, TeamData> _teamDatabase = new Dictionary<string, TeamData>();
        private int _nextFixtureId = 1;

        public string TournamentName => _tournamentName;
        public TournamentFormatType Format => _format;
        public int MatchOvers => _matchOvers;
        public bool IsTournamentComplete => _isTournamentComplete;
        public string ChampionTeamId => _championTeamId;
        public IReadOnlyList<TeamStanding> Standings => _standings;
        public IReadOnlyList<TournamentFixture> Fixtures => _fixtures;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
            }
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        public void InitializeRoundRobin(List<TeamData> teams, int matchOvers = 2, string tournamentName = "Premier League")
        {
            _tournamentName = tournamentName;
            _format = TournamentFormatType.RoundRobinLeague;
            _matchOvers = matchOvers;
            _isTournamentComplete = false;
            _championTeamId = null;

            _standings.Clear();
            _fixtures.Clear();
            _completedFixtureIds.Clear();
            _teamDatabase.Clear();
            _nextFixtureId = 1;

            if (teams == null || teams.Count < 2) return;

            foreach (var t in teams)
            {
                _standings.Add(new TeamStanding(t.TeamId, t.TeamName));
                _teamDatabase[t.TeamId] = t;
            }

            // Generate pairwise league fixtures
            for (int i = 0; i < teams.Count; i++)
            {
                for (int j = i + 1; j < teams.Count; j++)
                {
                    _fixtures.Add(new TournamentFixture(_nextFixtureId++, "League Stage", teams[i].TeamId, teams[j].TeamId));
                }
            }

            CricketLogger.LogInfo(LogChannel.Gameplay,
                $"Round-Robin Tournament initialized: {teams.Count} teams, {_fixtures.Count} fixtures scheduled.");
        }

        public void InitializeKnockout(List<TeamData> teams, int matchOvers = 2, string tournamentName = "Knockout Cup")
        {
            _tournamentName = tournamentName;
            _format = TournamentFormatType.Knockout;
            _matchOvers = matchOvers;
            _isTournamentComplete = false;
            _championTeamId = null;

            _standings.Clear();
            _fixtures.Clear();
            _completedFixtureIds.Clear();
            _teamDatabase.Clear();
            _nextFixtureId = 1;

            if (teams == null || teams.Count < 2) return;

            foreach (var t in teams)
            {
                _standings.Add(new TeamStanding(t.TeamId, t.TeamName));
                _teamDatabase[t.TeamId] = t;
            }

            string initialStage = teams.Count >= 8 ? "Quarter-Final" : (teams.Count >= 4 ? "Semi-Final" : "Final");

            for (int i = 0; i < teams.Count; i += 2)
            {
                if (i + 1 < teams.Count)
                {
                    _fixtures.Add(new TournamentFixture(_nextFixtureId++, initialStage, teams[i].TeamId, teams[i + 1].TeamId));
                }
            }

            CricketLogger.LogInfo(LogChannel.Gameplay,
                $"Knockout Tournament initialized: {teams.Count} teams, stage [{initialStage}].");
        }

        public TournamentFixture GetNextUnplayedFixture()
        {
            if (_isTournamentComplete) return null;
            return _fixtures.Find(f => !f.IsCompleted);
        }

        /// <summary>
        /// Records the outcome of a fixture.
        /// STRICT INVARIANT: Resolves each fixture exactly once.
        /// </summary>
        public bool RecordMatchResult(
            int fixtureId,
            int homeScore, int homeWkts, float homeOvers,
            int awayScore, int awayWkts, float awayOvers,
            string winnerId, string resultReason)
        {
            if (_isTournamentComplete)
            {
                CricketLogger.LogWarning(LogChannel.Gameplay,
                    "Cannot record match: Tournament is already complete.");
                return false;
            }

            if (_completedFixtureIds.Contains(fixtureId))
            {
                CricketLogger.LogWarning(LogChannel.Gameplay,
                    $"DUPLICATE RESULT DETECTED: Fixture #{fixtureId} was already resolved. Duplicate ignored.");
                return false;
            }

            var fixture = _fixtures.Find(f => f.FixtureId == fixtureId);
            if (fixture == null || fixture.IsCompleted)
            {
                return false;
            }

            _completedFixtureIds.Add(fixtureId);
            fixture.IsCompleted = true;
            fixture.HomeScore = homeScore;
            fixture.HomeWickets = homeWkts;
            fixture.HomeOvers = homeOvers;
            fixture.AwayScore = awayScore;
            fixture.AwayWickets = awayWkts;
            fixture.AwayOvers = awayOvers;
            fixture.WinnerTeamId = winnerId;
            fixture.ResultReason = resultReason;

            // Update Standings
            bool isTie = string.IsNullOrEmpty(winnerId) || winnerId == "Tie";
            bool homeWon = !isTie && winnerId == fixture.HomeTeamId;
            bool awayWon = !isTie && winnerId == fixture.AwayTeamId;

            var homeStanding = _standings.Find(s => s.TeamId == fixture.HomeTeamId);
            var awayStanding = _standings.Find(s => s.TeamId == fixture.AwayTeamId);

            int homePoints = isTie ? 1 : (homeWon ? 2 : 0);
            int awayPoints = isTie ? 1 : (awayWon ? 2 : 0);

            homeStanding?.RecordMatch(homeScore, homeOvers, awayScore, awayOvers, homePoints, homeWon, !homeWon && !isTie, isTie);
            awayStanding?.RecordMatch(awayScore, awayOvers, homeScore, homeOvers, awayPoints, awayWon, !awayWon && !isTie, isTie);

            // Re-sort standings by Points then NRR
            _standings.Sort();

            CricketLogger.LogInfo(LogChannel.Gameplay,
                $"Fixture #{fixtureId} completed: {fixture.HomeTeamId} ({homeScore}) vs {fixture.AwayTeamId} ({awayScore}). Winner: {winnerId}");

            // Progress bracket or tournament state
            CheckAndAdvanceTournament(fixture);
            return true;
        }

        private void CheckAndAdvanceTournament(TournamentFixture justCompleted)
        {
            if (_format == TournamentFormatType.Knockout)
            {
                AdvanceKnockoutStage(justCompleted);
            }
            else // RoundRobinLeague
            {
                AdvanceRoundRobinStage();
            }
        }

        private void AdvanceKnockoutStage(TournamentFixture justCompleted)
        {
            // If Final completed, conclude tournament
            if (justCompleted.StageName == "Final")
            {
                _isTournamentComplete = true;
                _championTeamId = justCompleted.WinnerTeamId;
                CricketLogger.LogInfo(LogChannel.Gameplay, $"TOURNAMENT COMPLETE! Champion: {_championTeamId}");
                return;
            }

            // Check if current stage is fully finished
            string currentStage = justCompleted.StageName;
            var stageFixtures = _fixtures.FindAll(f => f.StageName == currentStage);
            bool allStageCompleted = stageFixtures.TrueForAll(f => f.IsCompleted);

            if (allStageCompleted)
            {
                var stageWinners = new List<string>();
                foreach (var f in stageFixtures)
                {
                    stageWinners.Add(f.WinnerTeamId);
                }

                if (stageWinners.Count >= 2)
                {
                    string nextStage = (stageWinners.Count == 2) ? "Final" : "Semi-Final";
                    for (int i = 0; i < stageWinners.Count; i += 2)
                    {
                        if (i + 1 < stageWinners.Count)
                        {
                            _fixtures.Add(new TournamentFixture(_nextFixtureId++, nextStage, stageWinners[i], stageWinners[i + 1]));
                        }
                    }
                    CricketLogger.LogInfo(LogChannel.Gameplay,
                        $"Knockout advanced to [{nextStage}] with {stageWinners.Count} teams.");
                }
            }
        }

        private void AdvanceRoundRobinStage()
        {
            // Check if all league fixtures are finished
            var leagueFixtures = _fixtures.FindAll(f => f.StageName == "League Stage");
            bool allLeagueComplete = leagueFixtures.TrueForAll(f => f.IsCompleted);

            if (allLeagueComplete)
            {
                // Check if Grand Final has already been scheduled
                var grandFinal = _fixtures.Find(f => f.StageName == "Grand Final");
                if (grandFinal == null)
                {
                    // Schedule Grand Final between top 2 teams in standings
                    if (_standings.Count >= 2)
                    {
                        string team1 = _standings[0].TeamId;
                        string team2 = _standings[1].TeamId;
                        _fixtures.Add(new TournamentFixture(_nextFixtureId++, "Grand Final", team1, team2));
                        CricketLogger.LogInfo(LogChannel.Gameplay,
                            $"League Stage complete! Grand Final scheduled between Top 2: {team1} vs {team2}.");
                    }
                }
                else if (grandFinal.IsCompleted)
                {
                    _isTournamentComplete = true;
                    _championTeamId = grandFinal.WinnerTeamId;
                    CricketLogger.LogInfo(LogChannel.Gameplay, $"TOURNAMENT COMPLETE! Champion: {_championTeamId}");
                }
            }
        }

        /// <summary>
        /// Restores state from loaded save data.
        /// </summary>
        public void RestoreFromSave(
            string tournamentName,
            TournamentFormatType format,
            int matchOvers,
            bool isComplete,
            string championId,
            List<TeamStanding> standings,
            List<TournamentFixture> fixtures)
        {
            _tournamentName = tournamentName;
            _format = format;
            _matchOvers = matchOvers;
            _isTournamentComplete = isComplete;
            _championTeamId = championId;
            _standings = new List<TeamStanding>(standings);
            _fixtures = new List<TournamentFixture>(fixtures);

            _completedFixtureIds.Clear();
            foreach (var f in _fixtures)
            {
                if (f.IsCompleted)
                {
                    _completedFixtureIds.Add(f.FixtureId);
                }
            }
            CricketLogger.LogInfo(LogChannel.Gameplay, $"Tournament restored from save: [{_tournamentName}]");
        }
    }
}
