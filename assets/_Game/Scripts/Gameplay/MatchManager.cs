using System;
using UnityEngine;
using CricketLegends.Core;
using CricketLegends.Rules;

namespace CricketLegends.Gameplay
{
    /// <summary>
    /// Core coordinator for cricket match progression, scores, and delivery lifecycle.
    /// Strictly guarantees that ONLY ONE delivery can be active at a time.
    /// Integrates with the centralized CricketRulesEngine for official scoring and rules.
    /// </summary>
    public class MatchManager : MonoBehaviour
    {
        [Header("Service References")]
        [SerializeField] private GameStateManager _gameStateManager;
        [SerializeField] private MatchConfiguration _matchConfig;
        [SerializeField] private CricketRulesEngine _rulesEngine;

        [Header("Match Progression State")]
        [SerializeField] private int _currentInnings = 1;
        [SerializeField] private int _totalRuns = 0;
        [SerializeField] private int _totalWickets = 0;
        [SerializeField] private int _completedOvers = 0;
        [SerializeField] private int _legalBallsInOver = 0;
        [SerializeField] private int _targetScore = 0;
        [SerializeField] private bool _isMatchOver = false;

        [Header("Active Delivery Tracking")]
        [SerializeField] private bool _isDeliveryActive = false;
        [SerializeField] private int _activeDeliveryId = 0;

        // Public Properties
        public int CurrentInnings => _rulesEngine != null ? _rulesEngine.CurrentInningsIndex : _currentInnings;
        public int TotalRuns => _rulesEngine != null ? _rulesEngine.TotalRuns : _totalRuns;
        public int TotalWickets => _rulesEngine != null ? _rulesEngine.TotalWickets : _totalWickets;
        public int CompletedOvers => _rulesEngine != null ? _rulesEngine.CompletedOvers : _completedOvers;
        public int LegalBallsInOver => _rulesEngine != null ? _rulesEngine.LegalBallsInOver : _legalBallsInOver;
        public int TargetScore => _rulesEngine != null ? _rulesEngine.TargetScore : _targetScore;
        public bool IsMatchOver => _rulesEngine != null ? _rulesEngine.IsMatchOver : _isMatchOver;
        public bool IsDeliveryActive => _isDeliveryActive;
        public int ActiveDeliveryId => _activeDeliveryId;
        public MatchConfiguration Configuration => _matchConfig;
        public CricketRulesEngine RulesEngine => _rulesEngine;

        public void Initialize(GameStateManager stateManager, MatchConfiguration config)
        {
            _gameStateManager = stateManager != null ? stateManager : _gameStateManager;
            _matchConfig = config != null ? config : _matchConfig;

            if (_rulesEngine == null)
            {
                _rulesEngine = GetComponent<CricketRulesEngine>();
                if (_rulesEngine == null)
                {
                    _rulesEngine = gameObject.AddComponent<CricketRulesEngine>();
                }
            }

            ResetMatch();
        }

        public void ResetMatch()
        {
            _currentInnings = 1;
            _totalRuns = 0;
            _totalWickets = 0;
            _completedOvers = 0;
            _legalBallsInOver = 0;
            _targetScore = 0;
            _isMatchOver = false;
            _isDeliveryActive = false;
            _activeDeliveryId = 0;

            if (_rulesEngine != null)
            {
                _rulesEngine.InitializeMatch(_matchConfig);
            }

            CricketLogger.LogInfo(LogChannel.Gameplay, "MatchManager reset to initial state.");
        }

        /// <summary>
        /// Initiates bowler run-up and delivery.
        /// STRICT INVARIANT: Rejects invocation if a delivery is already active.
        /// </summary>
        public bool TryStartDelivery()
        {
            if (IsMatchOver)
            {
                CricketLogger.LogWarning(LogChannel.Gameplay, "Cannot start delivery: Match is already over.");
                return false;
            }

            if (_isDeliveryActive)
            {
                CricketLogger.LogWarning(LogChannel.Gameplay,
                    $"DELIVERY REJECTED: Delivery #{_activeDeliveryId} is currently active. Only one delivery is permitted at a time.");
                return false;
            }

            if (_gameStateManager != null && _gameStateManager.CurrentState != GameState.Ready)
            {
                CricketLogger.LogWarning(LogChannel.Gameplay,
                    $"Cannot bowl: GameState must be Ready, currently in [{_gameStateManager.CurrentState}].");
                return false;
            }

            _isDeliveryActive = true;
            _activeDeliveryId++;

            CricketLogger.LogInfo(LogChannel.Gameplay,
                $"Delivery #{_activeDeliveryId} started for Over {CompletedOvers}.{LegalBallsInOver + 1}.");

            _gameStateManager?.TryChangeState(GameState.Bowling);
            CricketEvents.FireDeliveryStarted(CompletedOvers, LegalBallsInOver + 1);

            return true;
        }

        /// <summary>
        /// Called when the ball enters active play (released from hand or struck).
        /// </summary>
        public void MarkBallInPlay()
        {
            if (!_isDeliveryActive)
            {
                CricketLogger.LogWarning(LogChannel.Gameplay, "MarkBallInPlay called while no delivery is active.");
                return;
            }

            _gameStateManager?.TryChangeState(GameState.BallInPlay);
        }

        /// <summary>
        /// Finalizes delivery outcome using the centralized rules engine.
        /// Re-enables bowler for subsequent deliveries.
        /// </summary>
        public void ConcludeDelivery(DeliveryResultData result)
        {
            if (!_isDeliveryActive)
            {
                CricketLogger.LogWarning(LogChannel.Gameplay, "Cannot conclude delivery: No active delivery in progress.");
                return;
            }

            _isDeliveryActive = false;

            if (_rulesEngine != null)
            {
                var input = new DeliveryOutcomeInput
                {
                    DeliveryId = result.DeliveryId > 0 ? result.DeliveryId : _activeDeliveryId,
                    BatterRuns = result.RunsScored,
                    IsWicket = result.IsWicket,
                    IsBoundaryFour = result.IsBoundaryFour,
                    IsBoundarySix = result.IsBoundarySix,
                    Description = result.Description
                };

                _rulesEngine.ResolveDelivery(input);
            }
            else
            {
                // Fallback direct tracking if rules engine is not attached
                _totalRuns += result.RunsScored;
                if (result.IsWicket)
                {
                    _totalWickets++;
                    CricketEvents.FireWicketFallen("Batter", "Bowler", result.DismissalType);
                }

                if (result.IsLegalBall)
                {
                    _legalBallsInOver++;
                    if (_legalBallsInOver >= 6)
                    {
                        _completedOvers++;
                        _legalBallsInOver = 0;
                    }
                }

                CricketEvents.FireScoreUpdated(_totalRuns, _totalWickets, _completedOvers, _legalBallsInOver);
                CricketEvents.FireDeliveryCompleted(result);
                EvaluateMatchConditionsFallback();
            }

            _gameStateManager?.TryChangeState(GameState.DeliveryResult);
        }

        /// <summary>
        /// Direct rules engine conclusion overload with rich metadata (extras, dismissals, runners).
        /// </summary>
        public DeliveryResult ConcludeDelivery(DeliveryOutcomeInput input)
        {
            if (!_isDeliveryActive)
            {
                CricketLogger.LogWarning(LogChannel.Gameplay, "Cannot conclude delivery: No active delivery in progress.");
                return default;
            }

            _isDeliveryActive = false;

            if (_rulesEngine == null)
            {
                _rulesEngine = gameObject.AddComponent<CricketRulesEngine>();
                _rulesEngine.InitializeMatch(_matchConfig);
            }

            var resolvedResult = _rulesEngine.ResolveDelivery(input);
            _gameStateManager?.TryChangeState(GameState.DeliveryResult);
            return resolvedResult;
        }

        private void EvaluateMatchConditionsFallback()
        {
            int maxOvers = _matchConfig != null ? _matchConfig.TotalOvers : 2;
            int maxWickets = _matchConfig != null ? _matchConfig.MaxWickets : 10;

            bool isInningsComplete = _totalWickets >= maxWickets || _completedOvers >= maxOvers;

            if (_currentInnings == 1)
            {
                if (isInningsComplete)
                {
                    _targetScore = _totalRuns + 1;
                    CricketLogger.LogInfo(LogChannel.Gameplay, $"1st Innings completed. Target set to {_targetScore} runs.");
                    CricketEvents.FireInningsCompleted(1, _totalRuns);
                    _gameStateManager?.TryChangeState(GameState.InningsBreak);
                }
            }
            else
            {
                if (_totalRuns >= _targetScore)
                {
                    _isMatchOver = true;
                    CricketEvents.FireMatchEnded("Chasing Team", "Target Achieved");
                    _gameStateManager?.TryChangeState(GameState.MatchOver);
                }
                else if (isInningsComplete)
                {
                    _isMatchOver = true;
                    string resultText = _totalRuns == _targetScore - 1 ? "Match Tied!" : "Defending Team Won!";
                    CricketEvents.FireMatchEnded("Defending Team", resultText);
                    _gameStateManager?.TryChangeState(GameState.MatchOver);
                }
            }
        }

        public void StartSecondInnings()
        {
            if (_rulesEngine != null)
            {
                _rulesEngine.StartSecondInnings();
            }
            else
            {
                if (_currentInnings != 1) return;
                _currentInnings = 2;
                _totalRuns = 0;
                _totalWickets = 0;
                _completedOvers = 0;
                _legalBallsInOver = 0;
                _isDeliveryActive = false;
            }

            _gameStateManager?.TryChangeState(GameState.Ready);
        }
    }
}
