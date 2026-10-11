using System;
using System.Collections.Generic;
using UnityEngine;
using CricketLegends.Core;

namespace CricketLegends.Gameplay
{
    [Serializable]
    public class CareerMatchLog
    {
        public int MatchNumber;
        public string OpponentName;
        public string TournamentName;
        public bool PlayerWon;
        public string ResultSummary;
        public string DateString;

        public CareerMatchLog(int matchNum, string opponent, string tournament, bool won, string summary)
        {
            MatchNumber = matchNum;
            OpponentName = opponent;
            TournamentName = tournament;
            PlayerWon = won;
            ResultSummary = summary;
            DateString = DateTime.Now.ToString("yyyy-MM-dd");
        }
    }

    /// <summary>
    /// Local offline career mode manager.
    /// Tracks manager profile, career win/loss records, trophy cabinets,
    /// tournament tier unlocks, and match histories.
    /// Free of pay-to-win mechanics and external online dependencies.
    /// </summary>
    public class CareerManager : MonoBehaviour
    {
        public static CareerManager Instance { get; private set; }

        [Header("Career Profile")]
        [SerializeField] private string _managerName = "Coach";
        [SerializeField] private string _selectedTeamId = "T_MBL";
        [SerializeField] private string _selectedTeamName = "Mumbai Blasters";
        [SerializeField] private int _careerMatchesPlayed = 0;
        [SerializeField] private int _careerMatchesWon = 0;
        [SerializeField] private int _careerTrophiesWon = 0;

        [Header("Unlocked Tournament Tiers")]
        [SerializeField] private int _unlockedTier = 1; // Tier 1 = Challenger, Tier 2 = Premier, Tier 3 = Champions

        [Header("Career Match History")]
        [SerializeField] private List<CareerMatchLog> _matchHistory = new List<CareerMatchLog>();

        public string ManagerName => _managerName;
        public string SelectedTeamId => _selectedTeamId;
        public string SelectedTeamName => _selectedTeamName;
        public int MatchesPlayed => _careerMatchesPlayed;
        public int MatchesWon => _careerMatchesWon;
        public int TrophiesWon => _careerTrophiesWon;
        public int UnlockedTier => _unlockedTier;
        public IReadOnlyList<CareerMatchLog> MatchHistory => _matchHistory;

        public float WinPercentage => _careerMatchesPlayed > 0 ? (_careerMatchesWon * 100f / _careerMatchesPlayed) : 0f;

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

        public void StartNewCareer(string managerName, string teamId, string teamName)
        {
            _managerName = managerName;
            _selectedTeamId = teamId;
            _selectedTeamName = teamName;
            _careerMatchesPlayed = 0;
            _careerMatchesWon = 0;
            _careerTrophiesWon = 0;
            _unlockedTier = 1;
            _matchHistory.Clear();

            CricketLogger.LogInfo(LogChannel.Gameplay,
                $"Started new career for [{managerName}] with team [{teamName}].");
        }

        public void RecordCareerMatch(string opponent, string tournament, bool won, string summary)
        {
            _careerMatchesPlayed++;
            if (won) _careerMatchesWon++;

            var log = new CareerMatchLog(_careerMatchesPlayed, opponent, tournament, won, summary);
            _matchHistory.Add(log);

            CricketLogger.LogInfo(LogChannel.Gameplay,
                $"Career match recorded #{_careerMatchesPlayed}: {(won ? "WON" : "LOST")} vs {opponent}.");
        }

        public void RecordTournamentTrophy(string tournamentName, int tournamentTier)
        {
            _careerTrophiesWon++;
            if (tournamentTier >= _unlockedTier && _unlockedTier < 3)
            {
                _unlockedTier = tournamentTier + 1;
                CricketLogger.LogInfo(LogChannel.Gameplay,
                    $"🏆 TROPHY WON: [{tournamentName}]! Unlocked Tournament Tier {_unlockedTier}!");
            }
        }

        public bool IsTournamentUnlocked(int tier)
        {
            return tier <= _unlockedTier;
        }

        public void RestoreFromSave(
            string manager,
            string teamId,
            string teamName,
            int matches,
            int wins,
            int trophies,
            int tier,
            List<CareerMatchLog> history)
        {
            _managerName = manager;
            _selectedTeamId = teamId;
            _selectedTeamName = teamName;
            _careerMatchesPlayed = matches;
            _careerMatchesWon = wins;
            _careerTrophiesWon = trophies;
            _unlockedTier = tier;
            _matchHistory = new List<CareerMatchLog>(history);

            CricketLogger.LogInfo(LogChannel.Gameplay, $"Career state restored for [{_managerName}].");
        }
    }
}
