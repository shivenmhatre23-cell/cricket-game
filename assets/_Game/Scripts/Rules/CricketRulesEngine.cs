using System;
using System.Collections.Generic;
using UnityEngine;
using CricketLegends.Core;
using CricketLegends.Gameplay;

namespace CricketLegends.Rules
{
    /// <summary>
    /// Centralized, authoritative rules engine governing match progression,
    /// official scoring, strike rotation, statistics, extras, and winner determination.
    /// STRICT INVARIANT: All score modifications MUST pass through this engine.
    /// STRICT INVARIANT: One delivery must resolve exactly once (idempotent resolution pipeline).
    /// </summary>
    public class CricketRulesEngine : MonoBehaviour
    {
        public static CricketRulesEngine Instance { get; private set; }

        [Header("Configuration")]
        [SerializeField] private MatchConfiguration _config;

        [Header("Match Progression")]
        [SerializeField] private int _currentInningsIndex = 1;
        [SerializeField] private int _targetScore = 0;
        [SerializeField] private bool _isMatchOver = false;
        [SerializeField] private string _winningTeam = null;
        [SerializeField] private string _matchResultReason = null;

        [Header("Active Innings Live State")]
        [SerializeField] private string _battingTeam;
        [SerializeField] private string _bowlingTeam;
        [SerializeField] private int _totalRuns = 0;
        [SerializeField] private int _totalWickets = 0;
        [SerializeField] private int _completedOvers = 0;
        [SerializeField] private int _legalBallsInOver = 0;
        [SerializeField] private ExtrasBreakdown _extras;

        // Player Tracking
        private string _strikerName;
        private string _nonStrikerName;
        private string _currentBowlerName;
        private int _nextBatterIndex = 2;
        private int _currentBowlerIndex = 10;

        // Scorecards
        private InningsScorecard _innings1Scorecard;
        private InningsScorecard _innings2Scorecard;

        // Idempotency: Resolved Delivery IDs
        private readonly HashSet<int> _resolvedDeliveryIds = new HashSet<int>();
        private readonly List<DeliveryResult> _deliveryHistory = new List<DeliveryResult>();
        private DeliveryResult _latestDeliveryResult;

        // Public Properties
        public MatchConfiguration Configuration => _config;
        public int CurrentInningsIndex => _currentInningsIndex;
        public int TotalRuns => _totalRuns;
        public int TotalWickets => _totalWickets;
        public int CompletedOvers => _completedOvers;
        public int LegalBallsInOver => _legalBallsInOver;
        public int TotalLegalBalls => (_completedOvers * 6) + _legalBallsInOver;
        public int TargetScore => _targetScore;
        public bool IsMatchOver => _isMatchOver;
        public string WinningTeam => _winningTeam;
        public string MatchResultReason => _matchResultReason;
        public string BattingTeam => _battingTeam;
        public string BowlingTeam => _bowlingTeam;
        public string StrikerName => _strikerName;
        public string NonStrikerName => _nonStrikerName;
        public string CurrentBowlerName => _currentBowlerName;
        public ExtrasBreakdown Extras => _extras;
        public DeliveryResult LatestDeliveryResult => _latestDeliveryResult;
        public InningsScorecard FirstInningsScorecard => _innings1Scorecard;
        public InningsScorecard SecondInningsScorecard => _innings2Scorecard;
        public InningsScorecard CurrentInningsScorecard => _currentInningsIndex == 1 ? _innings1Scorecard : _innings2Scorecard;

        public float CurrentRunRate
        {
            get
            {
                float overs = _completedOvers + (_legalBallsInOver / 6f);
                return overs > 0f ? (_totalRuns / overs) : 0f;
            }
        }

        public float RequiredRunRate
        {
            get
            {
                if (_currentInningsIndex != 2 || _targetScore <= 0) return 0f;
                int runsNeeded = Mathf.Max(0, _targetScore - _totalRuns);
                int maxBalls = (_config != null ? _config.TotalOvers : 2) * 6;
                int ballsRemaining = Mathf.Max(0, maxBalls - TotalLegalBalls);
                if (ballsRemaining == 0) return runsNeeded > 0 ? 99.9f : 0f;
                return (runsNeeded / (ballsRemaining / 6f));
            }
        }

        public int RemainingRunsNeeded => _currentInningsIndex == 2 ? Mathf.Max(0, _targetScore - _totalRuns) : 0;
        public int RemainingBalls
        {
            get
            {
                int maxBalls = (_config != null ? _config.TotalOvers : 2) * 6;
                return Mathf.Max(0, maxBalls - TotalLegalBalls);
            }
        }
        public int RemainingWickets
        {
            get
            {
                int maxWkts = _config != null ? _config.MaxWickets : 10;
                return Mathf.Max(0, maxWkts - _totalWickets);
            }
        }

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

        public void InitializeMatch(MatchConfiguration config)
        {
            _config = config != null ? config : MatchConfiguration.CreateExhibition();
            _currentInningsIndex = 1;
            _targetScore = _config.TargetScore;
            _isMatchOver = false;
            _winningTeam = null;
            _matchResultReason = null;
            _resolvedDeliveryIds.Clear();
            _deliveryHistory.Clear();

            // Determine Batting Team & Bowling Team based on Toss
            if (_config.PlayerBattingFirst)
            {
                _battingTeam = _config.HomeTeamName;
                _bowlingTeam = _config.AwayTeamName;
            }
            else
            {
                _battingTeam = _config.AwayTeamName;
                _bowlingTeam = _config.HomeTeamName;
            }

            SetupInnings(1);
            CricketLogger.LogInfo(LogChannel.Gameplay,
                $"CricketRulesEngine initialized: {_battingTeam} batting first vs {_bowlingTeam} ({_config.TotalOvers} overs, {_config.MaxWickets} wickets).");
        }

        private void SetupInnings(int inningsNumber)
        {
            _currentInningsIndex = inningsNumber;
            _totalRuns = 0;
            _totalWickets = 0;
            _completedOvers = 0;
            _legalBallsInOver = 0;
            _extras = default;

            var battingSquad = GetSquadForTeam(_battingTeam);
            var bowlingSquad = GetSquadForTeam(_bowlingTeam);

            _strikerName = battingSquad.Count > 0 ? battingSquad[0] : "Striker";
            _nonStrikerName = battingSquad.Count > 1 ? battingSquad[1] : "Non-Striker";
            _nextBatterIndex = 2;

            _currentBowlerIndex = bowlingSquad.Count > 0 ? bowlingSquad.Count - 1 : 0;
            _currentBowlerName = bowlingSquad.Count > 0 ? bowlingSquad[_currentBowlerIndex] : "Bowler";

            var scorecard = new InningsScorecard(inningsNumber, _battingTeam, _bowlingTeam, _config.TotalOvers, _config.MaxWickets);

            // Populate initial batters
            foreach (var batterName in battingSquad)
            {
                scorecard.Batters.Add(new BatterStats(batterName));
            }

            // Populate initial bowlers
            foreach (var bowlerName in bowlingSquad)
            {
                scorecard.Bowlers.Add(new BowlerStats(bowlerName));
            }

            if (inningsNumber == 1)
            {
                _innings1Scorecard = scorecard;
            }
            else
            {
                _innings2Scorecard = scorecard;
            }
        }

        private IReadOnlyList<string> GetSquadForTeam(string teamName)
        {
            if (_config != null)
            {
                if (teamName == _config.HomeTeamName) return _config.HomeTeamSquad;
                if (teamName == _config.AwayTeamName) return _config.AwayTeamSquad;
            }
            return new List<string> { "Player 1", "Player 2", "Player 3", "Player 4", "Player 5", "Player 6", "Player 7", "Player 8", "Player 9", "Player 10", "Player 11" };
        }

        /// <summary>
        /// Authoritative event-resolution pipeline for ball outcomes.
        /// STRICT INVARIANT: Resolves each delivery ID exactly once.
        /// If a duplicate delivery ID is received, returns the previously resolved result without re-awarding runs or wickets.
        /// </summary>
        public DeliveryResult ResolveDelivery(DeliveryOutcomeInput input)
        {
            // 1. Idempotency Check: Reject duplicate resolution
            if (_resolvedDeliveryIds.Contains(input.DeliveryId))
            {
                CricketLogger.LogWarning(LogChannel.Gameplay,
                    $"DUPLICATE DELIVERY DETECTED: Delivery #{input.DeliveryId} was already resolved. Returning cached result.");
                return _deliveryHistory.Find(d => d.DeliveryId == input.DeliveryId);
            }

            if (_isMatchOver)
            {
                CricketLogger.LogWarning(LogChannel.Gameplay, "Cannot resolve delivery: Match has already concluded.");
                return default;
            }

            _resolvedDeliveryIds.Add(input.DeliveryId);

            var activeScorecard = CurrentInningsScorecard;
            var strikerStats = GetOrCreateBatterStats(_strikerName, activeScorecard);
            var bowlerStats = GetOrCreateBowlerStats(_currentBowlerName, activeScorecard);

            // 2. Classify Extras & Legality
            int batterRuns = 0;
            int extraRuns = 0;
            int bowlerChargedRuns = 0;
            bool isLegalBall = true;
            bool isWicketCreditedToBowler = false;
            bool dismissalValid = input.IsWicket;
            string dismissedBatter = input.DismissedBatter ?? _strikerName;

            switch (input.ExtraType)
            {
                case ExtraType.Wide:
                    extraRuns = 1 + input.ExtraRuns;
                    batterRuns = 0;
                    isLegalBall = false;
                    bowlerChargedRuns = extraRuns;
                    _extras.Wides += extraRuns;

                    // On a wide, batter cannot be bowled, caught, or lbw, but can be stumped or run out
                    if (dismissalValid && input.DismissalType != DismissalType.Stumped && input.DismissalType != DismissalType.RunOut)
                    {
                        dismissalValid = false;
                        CricketLogger.LogWarning(LogChannel.Gameplay, $"Illegal dismissal ({input.DismissalType}) on a Wide delivery rejected.");
                    }
                    break;

                case ExtraType.NoBall:
                    extraRuns = 1 + input.ExtraRuns; // 1 penalty + extras
                    batterRuns = input.BatterRuns;    // Batter can hit a no-ball!
                    isLegalBall = false;
                    bowlerChargedRuns = extraRuns + batterRuns;
                    _extras.NoBalls += 1;

                    // MCC Law 21.18: Batter cannot be out off a No-ball EXCEPT Run Out!
                    if (dismissalValid && input.DismissalType != DismissalType.RunOut)
                    {
                        dismissalValid = false;
                        CricketLogger.LogWarning(LogChannel.Gameplay, $"Illegal dismissal ({input.DismissalType}) on a No-Ball rejected under MCC Law 21.18.");
                    }
                    break;

                case ExtraType.Bye:
                    extraRuns = input.CompletedRuns > 0 ? input.CompletedRuns : (input.ExtraRuns > 0 ? input.ExtraRuns : 1);
                    batterRuns = 0;
                    isLegalBall = true;
                    bowlerChargedRuns = 0; // Byes NOT charged to bowler!
                    _extras.Byes += extraRuns;
                    break;

                case ExtraType.LegBye:
                    extraRuns = input.CompletedRuns > 0 ? input.CompletedRuns : (input.ExtraRuns > 0 ? input.ExtraRuns : 1);
                    batterRuns = 0;
                    isLegalBall = true;
                    bowlerChargedRuns = 0; // Leg-byes NOT charged to bowler!
                    _extras.LegByes += extraRuns;
                    break;

                case ExtraType.Penalty:
                    extraRuns = input.ExtraRuns > 0 ? input.ExtraRuns : 5;
                    batterRuns = 0;
                    isLegalBall = false;
                    bowlerChargedRuns = 0;
                    _extras.Penalties += extraRuns;
                    break;

                case ExtraType.None:
                default:
                    batterRuns = input.BatterRuns;
                    extraRuns = 0;
                    isLegalBall = true;
                    bowlerChargedRuns = batterRuns;
                    break;
            }

            int totalTeamRunsForBall = batterRuns + extraRuns;
            _totalRuns += totalTeamRunsForBall;

            // 3. Update Batter Stats
            if (input.ExtraType != ExtraType.Wide && input.ExtraType != ExtraType.Penalty)
            {
                strikerStats.RecordRuns(batterRuns, isLegalBall, input.IsBoundaryFour, input.IsBoundarySix);
            }

            // 4. Update Wickets & Batter Status
            if (dismissalValid)
            {
                _totalWickets++;

                // Bowler gets credit for Bowled, Caught, Stumped, LBW, HitWicket (NOT Run Out)
                isWicketCreditedToBowler = (input.DismissalType != DismissalType.RunOut);

                var dismissedStats = GetOrCreateBatterStats(dismissedBatter, activeScorecard);
                dismissedStats.RecordDismissal(input.DismissalType, _currentBowlerName, input.FielderName);

                CricketLogger.LogInfo(LogChannel.Gameplay,
                    $"WICKET #{_totalWickets}! {dismissedBatter} {dismissedStats.DismissalText}. Score: {_totalRuns}/{_totalWickets}");

                // Bring in next batter if wickets remaining
                int maxWkts = _config != null ? _config.MaxWickets : 10;
                if (_totalWickets < maxWkts)
                {
                    var battingSquad = GetSquadForTeam(_battingTeam);
                    if (_nextBatterIndex < battingSquad.Count)
                    {
                        string newBatter = battingSquad[_nextBatterIndex++];
                        if (dismissedBatter == _strikerName)
                        {
                            _strikerName = newBatter;
                        }
                        else
                        {
                            _nonStrikerName = newBatter;
                        }
                        CricketLogger.LogInfo(LogChannel.Gameplay, $"New batter in: {newBatter}");
                    }
                }
            }

            // 5. Update Bowler Stats
            bowlerStats.RecordDelivery(bowlerChargedRuns, isLegalBall, isWicketCreditedToBowler, input.ExtraType);

            // 6. Strike Rotation Calculation
            // Physical runs completed: odd completed runs (1, 3) swap ends
            int effectiveRunsRunning = (input.ExtraType == ExtraType.Bye || input.ExtraType == ExtraType.LegBye)
                ? extraRuns
                : input.CompletedRuns;

            bool physicalCrossHappened = (effectiveRunsRunning % 2 == 1);
            bool strikeRotatedThisBall = physicalCrossHappened;

            if (physicalCrossHappened && !dismissalValid)
            {
                SwapStrikers();
            }

            // 7. Legal Ball & Over Completion Logic
            bool overCompleted = false;
            if (isLegalBall)
            {
                _legalBallsInOver++;
                if (_legalBallsInOver >= 6)
                {
                    overCompleted = true;
                    _completedOvers++;
                    _legalBallsInOver = 0;

                    bowlerStats.FinalizeOverIfCompleted();
                    CricketLogger.LogInfo(LogChannel.Gameplay,
                        $"OVER COMPLETE! Overs: {_completedOvers}. Score: {_totalRuns}/{_totalWickets}");

                    // At end of over, batters change ends (unless odd runs crossed on 6th ball, where change of ends restores striker!)
                    // Standard MCC 18.11: If no runs on 6th ball, non-striker faces first ball of next over.
                    SwapStrikers();

                    // Rotate Bowler for next over
                    RotateBowler();
                }
            }

            // 8. Update Active Scorecard Totals
            activeScorecard.TotalRuns = _totalRuns;
            activeScorecard.TotalWickets = _totalWickets;
            activeScorecard.LegalBalls = TotalLegalBalls;
            activeScorecard.Extras = _extras;

            // 9. Construct Immutable DeliveryResult
            var result = new DeliveryResult(
                input.DeliveryId,
                _strikerName,
                _nonStrikerName,
                _currentBowlerName,
                batterRuns,
                input.ExtraType,
                extraRuns,
                totalTeamRunsForBall,
                isLegalBall,
                dismissalValid,
                dismissalValid ? input.DismissalType : DismissalType.None,
                dismissedBatter,
                input.FielderName,
                input.CompletedRuns,
                input.IsBoundaryFour,
                input.IsBoundarySix,
                strikeRotatedThisBall,
                input.Description ?? "Delivery resolved"
            );

            _latestDeliveryResult = result;
            _deliveryHistory.Add(result);
            activeScorecard.DeliveryHistory.Add(result);

            // 10. Fire Decoupled Events
            CricketEvents.FireScoreUpdated(_totalRuns, _totalWickets, _completedOvers, _legalBallsInOver);

            var legacyPayload = new DeliveryResultData
            {
                DeliveryId = input.DeliveryId,
                RunsScored = totalTeamRunsForBall,
                IsWicket = dismissalValid,
                IsLegalBall = isLegalBall,
                IsBoundaryFour = input.IsBoundaryFour,
                IsBoundarySix = input.IsBoundarySix,
                DismissalType = dismissalValid ? input.DismissalType.ToString() : "None",
                Description = result.Description
            };
            CricketEvents.FireDeliveryCompleted(legacyPayload);

            // 11. Check Innings & Match Completion Conditions
            EvaluateInningsAndMatchState();

            return result;
        }

        private void SwapStrikers()
        {
            string temp = _strikerName;
            _strikerName = _nonStrikerName;
            _nonStrikerName = temp;
            CricketLogger.LogDiagnostic(LogChannel.Gameplay, $"Strike rotated: Striker is now [{_strikerName}], Non-Striker is [{_nonStrikerName}].");
        }

        private void RotateBowler()
        {
            var bowlingSquad = GetSquadForTeam(_bowlingTeam);
            if (bowlingSquad.Count <= 1) return;

            // Simple rotation: cycle through last 5 players (bowlers/all-rounders)
            int minBowlerIdx = Mathf.Max(0, bowlingSquad.Count - 5);
            _currentBowlerIndex++;
            if (_currentBowlerIndex >= bowlingSquad.Count)
            {
                _currentBowlerIndex = minBowlerIdx;
            }
            _currentBowlerName = bowlingSquad[_currentBowlerIndex];
            CricketLogger.LogInfo(LogChannel.Gameplay, $"New bowler for next over: [{_currentBowlerName}].");
        }

        private void EvaluateInningsAndMatchState()
        {
            int maxOvers = _config != null ? _config.TotalOvers : 2;
            int maxWkts = _config != null ? _config.MaxWickets : 10;

            bool isAllOut = _totalWickets >= maxWkts;
            bool isOversComplete = _completedOvers >= maxOvers;

            if (_currentInningsIndex == 1)
            {
                if (isAllOut || isOversComplete)
                {
                    _innings1Scorecard.IsComplete = true;
                    _innings1Scorecard.CompletionReason = isAllOut ? "All Out" : "Overs Completed";
                    _targetScore = _totalRuns + 1;

                    CricketLogger.LogInfo(LogChannel.Gameplay,
                        $"=== 1ST INNINGS COMPLETED === Total: {_totalRuns}/{_totalWickets} in {_completedOvers}.{_legalBallsInOver} ov. Target: {_targetScore}");

                    CricketEvents.FireInningsCompleted(1, _totalRuns);

                    // If match allows 2nd innings, transition
                    if ((_config != null ? _config.InningsCount : 2) >= 2)
                    {
                        StartSecondInnings();
                    }
                    else
                    {
                        _isMatchOver = true;
                        _winningTeam = _battingTeam;
                        _matchResultReason = $"{_battingTeam} scored {_totalRuns} runs";
                        CricketEvents.FireMatchEnded(_winningTeam, _matchResultReason);
                    }
                }
            }
            else // 2nd Innings
            {
                if (_totalRuns >= _targetScore)
                {
                    // Target successfully chased!
                    _innings2Scorecard.IsComplete = true;
                    _innings2Scorecard.CompletionReason = "Target Achieved";
                    _isMatchOver = true;
                    _winningTeam = _battingTeam;
                    int wicketsInHand = maxWkts - _totalWickets;
                    _matchResultReason = $"{_battingTeam} won by {wicketsInHand} wicket{(wicketsInHand == 1 ? "" : "s")}!";

                    CricketLogger.LogInfo(LogChannel.Gameplay, $"=== MATCH OVER === {_matchResultReason}");
                    CricketEvents.FireMatchEnded(_winningTeam, _matchResultReason);
                }
                else if (isAllOut || isOversComplete)
                {
                    // Chasing team stopped before target
                    _innings2Scorecard.IsComplete = true;
                    _innings2Scorecard.CompletionReason = isAllOut ? "All Out" : "Overs Completed";
                    _isMatchOver = true;

                    if (_totalRuns == _targetScore - 1)
                    {
                        // Exact tie!
                        _winningTeam = "Tie";
                        _matchResultReason = $"Match Tied! Scores level ({_totalRuns} runs each).";
                    }
                    else
                    {
                        int runsDefended = (_targetScore - 1) - _totalRuns;
                        _winningTeam = _bowlingTeam;
                        _matchResultReason = $"{_bowlingTeam} won by {runsDefended} run{(runsDefended == 1 ? "" : "s")}!";
                    }

                    CricketLogger.LogInfo(LogChannel.Gameplay, $"=== MATCH OVER === {_matchResultReason}");
                    CricketEvents.FireMatchEnded(_winningTeam, _matchResultReason);
                }
            }
        }

        public void StartSecondInnings()
        {
            if (_currentInningsIndex == 2) return;

            // Swap batting and bowling teams
            string prevBatting = _battingTeam;
            _battingTeam = _bowlingTeam;
            _bowlingTeam = prevBatting;

            SetupInnings(2);
            CricketLogger.LogInfo(LogChannel.Gameplay,
                $"=== 2ND INNINGS BEGAN === {_battingTeam} chasing {_targetScore} runs to win ({_config.TotalOvers} overs).");
        }

        private BatterStats GetOrCreateBatterStats(string name, InningsScorecard scorecard)
        {
            var existing = scorecard.Batters.Find(b => b.PlayerName == name);
            if (existing != null) return existing;

            var created = new BatterStats(name);
            scorecard.Batters.Add(created);
            return created;
        }

        private BowlerStats GetOrCreateBowlerStats(string name, InningsScorecard scorecard)
        {
            var existing = scorecard.Bowlers.Find(b => b.PlayerName == name);
            if (existing != null) return existing;

            var created = new BowlerStats(name);
            scorecard.Bowlers.Add(created);
            return created;
        }
    }
}
