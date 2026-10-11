using System;
using System.Collections.Generic;
using UnityEngine;

namespace CricketLegends.Core
{
    /// <summary>
    /// Central state machine controlling match progression and lifecycle.
    /// Strictly validates all state transitions and prevents illegal jumps.
    /// </summary>
    public class GameStateManager : MonoBehaviour
    {
        [SerializeField] private GameState _initialState = GameState.MainMenu;
        [SerializeField] private bool _enableVerboseLogging = true;

        private GameState _currentState;
        private GameState _previousState;
        private float _timeInCurrentState;

        public GameState CurrentState => _currentState;
        public GameState PreviousState => _previousState;
        public float TimeInCurrentState => _timeInCurrentState;

        /// <summary>
        /// Invoked whenever a valid state transition occurs: (oldState, newState).
        /// </summary>
        public event Action<GameState, GameState> OnStateChanged;

        // Valid transition table mapping from current state to allowable target states
        private static readonly Dictionary<GameState, HashSet<GameState>> ValidTransitions =
            new Dictionary<GameState, HashSet<GameState>>
            {
                [GameState.MainMenu] = new HashSet<GameState>
                {
                    GameState.Toss,
                    GameState.Ready // For practice nets or quick launch bypass
                },
                [GameState.Toss] = new HashSet<GameState>
                {
                    GameState.Ready,
                    GameState.MainMenu
                },
                [GameState.Ready] = new HashSet<GameState>
                {
                    GameState.Bowling,
                    GameState.Paused,
                    GameState.MainMenu
                },
                [GameState.Bowling] = new HashSet<GameState>
                {
                    GameState.BallInPlay,
                    GameState.Ready, // Bowler dead ball / reset
                    GameState.Paused
                },
                [GameState.BallInPlay] = new HashSet<GameState>
                {
                    GameState.DeliveryResult,
                    GameState.Paused
                },
                [GameState.DeliveryResult] = new HashSet<GameState>
                {
                    GameState.Ready, // Next ball in over
                    GameState.InningsBreak, // End of 1st innings
                    GameState.MatchOver, // Target chased or match complete
                    GameState.Paused,
                    GameState.MainMenu
                },
                [GameState.InningsBreak] = new HashSet<GameState>
                {
                    GameState.Ready, // Begin 2nd innings chase
                    GameState.Paused,
                    GameState.MainMenu
                },
                [GameState.MatchOver] = new HashSet<GameState>
                {
                    GameState.MainMenu,
                    GameState.Ready, // Rematch
                    GameState.Toss
                },
                [GameState.Paused] = new HashSet<GameState>
                {
                    // Paused can resume to whatever state was active when paused, or quit to MainMenu
                    GameState.MainMenu,
                    GameState.Toss,
                    GameState.Ready,
                    GameState.Bowling,
                    GameState.BallInPlay,
                    GameState.DeliveryResult,
                    GameState.InningsBreak,
                    GameState.MatchOver
                }
            };

        private void Awake()
        {
            _currentState = _initialState;
            _previousState = _initialState;
            _timeInCurrentState = 0f;
        }

        private void Update()
        {
            _timeInCurrentState += Time.deltaTime;
        }

        /// <summary>
        /// Attempts to transition to a new game state.
        /// Returns true if the transition was valid and completed; false if rejected.
        /// </summary>
        public bool TryChangeState(GameState newState)
        {
            if (newState == _currentState)
            {
                if (_enableVerboseLogging)
                {
                    CricketLogger.LogDiagnostic(LogChannel.Core, $"Already in state [{newState}]. Transition ignored.");
                }
                return true;
            }

            if (!IsValidTransition(_currentState, newState))
            {
                CricketLogger.LogWarning(LogChannel.Core,
                    $"REJECTED INVALID TRANSITION: Cannot change state from [{_currentState}] to [{newState}].");
                return false;
            }

            ExecuteStateTransition(newState);
            return true;
        }

        /// <summary>
        /// Forces pause mode, storing the pre-pause state for resume.
        /// </summary>
        public bool Pause()
        {
            if (_currentState == GameState.Paused)
            {
                CricketLogger.LogDiagnostic(LogChannel.Core, "Match is already paused.");
                return false;
            }

            return TryChangeState(GameState.Paused);
        }

        /// <summary>
        /// Resumes from pause mode back to the state before pausing.
        /// </summary>
        public bool Resume()
        {
            if (_currentState != GameState.Paused)
            {
                CricketLogger.LogWarning(LogChannel.Core, "Cannot resume: Current state is not Paused.");
                return false;
            }

            return TryChangeState(_previousState);
        }

        public bool IsValidTransition(GameState fromState, GameState toState)
        {
            if (!ValidTransitions.TryGetValue(fromState, out var allowedTargets))
            {
                return false;
            }

            return allowedTargets.Contains(toState);
        }

        private void ExecuteStateTransition(GameState newState)
        {
            GameState oldState = _currentState;
            _previousState = oldState;
            _currentState = newState;
            _timeInCurrentState = 0f;

            if (_enableVerboseLogging)
            {
                CricketLogger.LogInfo(LogChannel.Core, $"State Transition: [{oldState}] ➔ [{newState}]");
            }

            OnStateChanged?.Invoke(oldState, newState);
        }
    }
}
