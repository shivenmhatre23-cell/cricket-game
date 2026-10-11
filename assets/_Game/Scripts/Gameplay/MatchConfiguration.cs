using System.Collections.Generic;
using UnityEngine;

namespace CricketLegends.Gameplay
{
    public enum MatchFormat
    {
        Exhibition = 0,
        SuperOver = 1,
        TwoOvers = 2,
        FiveOvers = 5,
        T20 = 20,
        ODI = 50,
        Custom = 99
    }

    public enum DifficultyLevel
    {
        Easy,
        Medium,
        Hard
    }

    public enum StadiumEnvironment
    {
        DaySunny,
        DayOvercast,
        NightFloodlights
    }

    public enum BallColor
    {
        WhiteLeather,
        RedLeather,
        PinkLeather
    }

    /// <summary>
    /// Configurable ScriptableObject defining match parameters, teams, squads, toss, and rules.
    /// Supports short exhibition matches and longer formats through unified configuration.
    /// </summary>
    [CreateAssetMenu(fileName = "NewMatchConfiguration", menuName = "Cricket Legends/Match Configuration", order = 1)]
    public class MatchConfiguration : ScriptableObject
    {
        [Header("Match Structure")]
        [Tooltip("Standard preset or custom match format")]
        [SerializeField] private MatchFormat _format = MatchFormat.TwoOvers;

        [Tooltip("Total legal overs per innings (1 to 50)")]
        [Range(1, 50)]
        [SerializeField] private int _totalOvers = 2;

        [Tooltip("Maximum allowed wickets before team is all out")]
        [Range(1, 10)]
        [SerializeField] private int _maxWickets = 10;

        [Tooltip("Number of innings in the match (default 2 for limited overs)")]
        [Range(1, 4)]
        [SerializeField] private int _inningsCount = 2;

        [Tooltip("Optional preset target score (0 for dynamic calculation from 1st innings)")]
        [SerializeField] private int _targetScore = 0;

        [Header("Gameplay & Difficulty")]
        [Tooltip("Opponent AI bowling and fielding difficulty level")]
        [SerializeField] private DifficultyLevel _difficulty = DifficultyLevel.Medium;

        [Tooltip("Ball specification (white, red, or pink leather)")]
        [SerializeField] private BallColor _ballType = BallColor.WhiteLeather;

        [Header("Atmosphere & Stadium")]
        [Tooltip("Lighting and skybox preset")]
        [SerializeField] private StadiumEnvironment _stadiumEnvironment = StadiumEnvironment.DaySunny;

        [Header("Teams & Toss Information")]
        [Tooltip("Home team name")]
        [SerializeField] private string _homeTeamName = "India";

        [Tooltip("Away team name")]
        [SerializeField] private string _awayTeamName = "Australia";

        [Tooltip("Toss winning team")]
        [SerializeField] private string _tossWinner = "India";

        [Tooltip("Toss winner decision: Bat or Bowl")]
        [SerializeField] private string _tossDecision = "Bat";

        [Tooltip("Whether player is batting first")]
        [SerializeField] private bool _playerBattingFirst = true;

        [Header("Squads (11 players per team)")]
        [SerializeField] private List<string> _homeTeamSquad = new List<string>
        {
            "R. Sharma", "S. Gill", "V. Kohli", "S. Iyer", "KL Rahul",
            "H. Pandya", "R. Jadeja", "A. Patel", "K. Yadav", "J. Bumrah", "M. Siraj"
        };

        [SerializeField] private List<string> _awayTeamSquad = new List<string>
        {
            "D. Warner", "T. Head", "M. Marsh", "S. Smith", "M. Labuschagne",
            "G. Maxwell", "A. Carey", "P. Cummins", "M. Starc", "A. Zampa", "J. Hazlewood"
        };

        // Public Read-Only Properties
        public MatchFormat Format => _format;
        public int TotalOvers => _totalOvers;
        public int MaxWickets => _maxWickets;
        public int InningsCount => _inningsCount;
        public int TargetScore => _targetScore;
        public DifficultyLevel Difficulty => _difficulty;
        public BallColor BallType => _ballType;
        public StadiumEnvironment Environment => _stadiumEnvironment;
        public string HomeTeamName => _homeTeamName;
        public string AwayTeamName => _awayTeamName;
        public string TossWinner => _tossWinner;
        public string TossDecision => _tossDecision;
        public bool PlayerBattingFirst => _playerBattingFirst;
        public IReadOnlyList<string> HomeTeamSquad => _homeTeamSquad;
        public IReadOnlyList<string> AwayTeamSquad => _awayTeamSquad;

        public void SetOvers(int overs)
        {
            _totalOvers = Mathf.Clamp(overs, 1, 50);
        }

        public void SetMaxWickets(int wickets)
        {
            _maxWickets = Mathf.Clamp(wickets, 1, 10);
        }

        public void SetTargetScore(int target)
        {
            _targetScore = Mathf.Max(0, target);
        }

        public void SetDifficulty(DifficultyLevel difficulty)
        {
            _difficulty = difficulty;
        }

        public void SetEnvironment(StadiumEnvironment environment)
        {
            _stadiumEnvironment = environment;
        }

        public void SetTeams(string home, string away, bool playerBattingFirst)
        {
            _homeTeamName = string.IsNullOrWhiteSpace(home) ? "Team A" : home;
            _awayTeamName = string.IsNullOrWhiteSpace(away) ? "Team B" : away;
            _playerBattingFirst = playerBattingFirst;
        }

        public void SetToss(string winner, string decision)
        {
            _tossWinner = winner;
            _tossDecision = decision;
            if (_tossWinner == _homeTeamName)
            {
                _playerBattingFirst = (decision == "Bat");
            }
            else
            {
                _playerBattingFirst = (decision != "Bat");
            }
        }

        public void SetSquads(List<string> homeSquad, List<string> awaySquad)
        {
            if (homeSquad != null && homeSquad.Count > 0) _homeTeamSquad = new List<string>(homeSquad);
            if (awaySquad != null && awaySquad.Count > 0) _awayTeamSquad = new List<string>(awaySquad);
        }

        /// <summary>
        /// Factory helper to instantiate in-memory configuration without requiring asset serialization.
        /// Ideal for exhibition matches, scenarios, and automated tests.
        /// </summary>
        public static MatchConfiguration CreateExhibition(int overs = 2, int maxWickets = 10, string home = "India", string away = "Australia")
        {
            var config = ScriptableObject.CreateInstance<MatchConfiguration>();
            config._format = MatchFormat.Exhibition;
            config._totalOvers = overs;
            config._maxWickets = maxWickets;
            config._homeTeamName = home;
            config._awayTeamName = away;
            config._tossWinner = home;
            config._tossDecision = "Bat";
            config._playerBattingFirst = true;
            return config;
        }

        public bool ValidateConfiguration(out string errorMessage)
        {
            if (_totalOvers < 1 || _totalOvers > 50)
            {
                errorMessage = $"Invalid total overs: {_totalOvers}. Must be between 1 and 50.";
                return false;
            }

            if (_maxWickets < 1 || _maxWickets > 10)
            {
                errorMessage = $"Invalid max wickets: {_maxWickets}. Must be between 1 and 10.";
                return false;
            }

            if (string.IsNullOrWhiteSpace(_homeTeamName) || string.IsNullOrWhiteSpace(_awayTeamName))
            {
                errorMessage = "Team names cannot be empty.";
                return false;
            }

            errorMessage = null;
            return true;
        }
    }
}
