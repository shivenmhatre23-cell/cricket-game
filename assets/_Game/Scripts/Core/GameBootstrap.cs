using UnityEngine;
using CricketLegends.Gameplay;
using CricketLegends.Input;

namespace CricketLegends.Core
{
    /// <summary>
    /// Initializer and dependency coordinator for Cricket Legends.
    /// Executes at the very start of the game to wire subsystems and validate references.
    /// </summary>
    [DefaultExecutionOrder(-100)]
    public class GameBootstrap : MonoBehaviour
    {
        [Header("Core Subsystems")]
        [SerializeField] private GameStateManager _gameStateManager;
        [SerializeField] private MatchManager _matchManager;
        [SerializeField] private InputService _inputService;

        [Header("Configuration")]
        [SerializeField] private MatchConfiguration _defaultMatchConfiguration;
        [SerializeField] private GameState _launchState = GameState.MainMenu;

        [Header("Engine & Performance Settings")]
        [SerializeField] private int _targetFrameRate = 60;
        [SerializeField] private bool _enableVsyncOnDesktop = true;

        private void Awake()
        {
            InitializeEnginePerformance();
            ValidateDependencies();
            InitializeSubsystems();
        }

        private void Start()
        {
            LaunchInitialState();
        }

        private void InitializeEnginePerformance()
        {
            Application.targetFrameRate = _targetFrameRate;
            QualitySettings.vSyncCount = Application.isMobilePlatform ? 0 : (_enableVsyncOnDesktop ? 1 : 0);

            CricketLogger.LogInfo(LogChannel.Core,
                $"Game Engine Initialized: Target FPS={_targetFrameRate}, VSync={QualitySettings.vSyncCount}, Platform={Application.platform}");
        }

        private void ValidateDependencies()
        {
            // 1. GameStateManager
            if (_gameStateManager == null)
            {
                _gameStateManager = FindFirstObjectByType<GameStateManager>();
                if (_gameStateManager == null)
                {
                    CricketLogger.LogWarning(LogChannel.Core,
                        "GameStateManager not assigned in GameBootstrap. Creating runtime fallback instance.");
                    GameObject smObj = new GameObject("GameStateManager [Runtime]");
                    _gameStateManager = smObj.AddComponent<GameStateManager>();
                }
            }

            // 2. MatchManager
            if (_matchManager == null)
            {
                _matchManager = FindFirstObjectByType<MatchManager>();
                if (_matchManager == null)
                {
                    CricketLogger.LogWarning(LogChannel.Core,
                        "MatchManager not assigned in GameBootstrap. Creating runtime fallback instance.");
                    GameObject mmObj = new GameObject("MatchManager [Runtime]");
                    _matchManager = mmObj.AddComponent<MatchManager>();
                }
            }

            // 3. InputService
            if (_inputService == null)
            {
                _inputService = FindFirstObjectByType<InputService>();
                if (_inputService == null)
                {
                    CricketLogger.LogWarning(LogChannel.Core,
                        "InputService not assigned in GameBootstrap. Creating runtime fallback instance.");
                    GameObject inpObj = new GameObject("InputService [Runtime]");
                    _inputService = inpObj.AddComponent<InputService>();
                }
            }

            // 4. MatchConfiguration
            if (_defaultMatchConfiguration == null)
            {
                CricketLogger.LogWarning(LogChannel.Core,
                    "No MatchConfiguration assigned to GameBootstrap. Creating transient default configuration.");
                _defaultMatchConfiguration = ScriptableObject.CreateInstance<MatchConfiguration>();
            }
        }

        private void InitializeSubsystems()
        {
            _matchManager?.Initialize(_gameStateManager, _defaultMatchConfiguration);

            CricketLogger.LogInfo(LogChannel.Core, "All Cricket Legends core subsystems initialized successfully.");
        }

        private void LaunchInitialState()
        {
            if (_gameStateManager != null)
            {
                CricketLogger.LogInfo(LogChannel.Core, $"Launching game into state: [{_launchState}]");
                _gameStateManager.TryChangeState(_launchState);
            }
        }
    }
}
