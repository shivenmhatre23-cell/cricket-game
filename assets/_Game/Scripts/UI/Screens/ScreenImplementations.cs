using System;
using UnityEngine;
using CricketLegends.Core;
using CricketLegends.Gameplay;
using CricketLegends.Rules;

namespace CricketLegends.UI
{
    /// <summary>
    /// Professional sports-game main menu interface.
    /// </summary>
    public class MainMenuScreen : ScreenBase
    {
        private void Awake() => SetScreenIdForTesting(ScreenId.MainMenu);

        public void OnClickPlayExhibition()
        {
            ScreenManager.Instance?.SwitchToScreen(ScreenId.TeamSelection);
        }

        public void OnClickSettings()
        {
            ScreenManager.Instance?.SwitchToScreen(ScreenId.Settings);
        }

        public void OnClickHowToPlay()
        {
            ScreenManager.Instance?.SwitchToScreen(ScreenId.HowToPlay);
        }

        public void OnClickQuit()
        {
            CricketLogger.LogInfo(LogChannel.UI, "Quitting application.");
            Application.Quit();
        }
    }

    /// <summary>
    /// Team selection interface for international squads.
    /// </summary>
    public class TeamSelectionScreen : ScreenBase
    {
        [SerializeField] private string _selectedHomeTeam = "India";
        [SerializeField] private string _selectedAwayTeam = "Australia";

        public string SelectedHomeTeam => _selectedHomeTeam;
        public string SelectedAwayTeam => _selectedAwayTeam;

        private void Awake() => SetScreenIdForTesting(ScreenId.TeamSelection);

        public void SetTeams(string home, string away)
        {
            _selectedHomeTeam = home;
            _selectedAwayTeam = away;
        }

        public void OnClickProceedToConfiguration()
        {
            ScreenManager.Instance?.SwitchToScreen(ScreenId.MatchConfiguration);
        }

        public void OnClickBack() => ScreenManager.Instance?.GoBack();
    }

    /// <summary>
    /// Match configuration screen for format, overs, and difficulty.
    /// </summary>
    public class MatchConfigurationScreen : ScreenBase
    {
        [SerializeField] private int _overs = 2;
        [SerializeField] private DifficultyLevel _difficulty = DifficultyLevel.Medium;

        public int Overs => _overs;
        public DifficultyLevel Difficulty => _difficulty;

        private void Awake() => SetScreenIdForTesting(ScreenId.MatchConfiguration);

        public void SetOvers(int overs) => _overs = Mathf.Clamp(overs, 1, 50);
        public void SetDifficulty(DifficultyLevel difficulty) => _difficulty = difficulty;

        public void OnClickProceedToToss()
        {
            ScreenManager.Instance?.SwitchToScreen(ScreenId.Toss);
        }

        public void OnClickBack() => ScreenManager.Instance?.GoBack();
    }

    /// <summary>
    /// Official match toss interface.
    /// </summary>
    public class TossScreen : ScreenBase
    {
        [SerializeField] private string _tossWinner = "India";
        [SerializeField] private string _tossDecision = "Bat";

        public string TossWinner => _tossWinner;
        public string TossDecision => _tossDecision;

        private void Awake() => SetScreenIdForTesting(ScreenId.Toss);

        public void ConductToss(string homeTeam, string awayTeam, string electedDecision = "Bat")
        {
            _tossWinner = UnityEngine.Random.value < 0.5f ? homeTeam : awayTeam;
            _tossDecision = electedDecision;
            CricketLogger.LogInfo(LogChannel.UI, $"Toss: {_tossWinner} won the toss and elected to {_tossDecision}.");
        }

        public void OnClickStartMatch()
        {
            ScreenManager.Instance?.SwitchToScreen(ScreenId.InMatchHUD);
        }
    }

    /// <summary>
    /// In-game pause menu preserving match state and pausing gameplay timers.
    /// </summary>
    public class PauseMenuScreen : ScreenBase
    {
        private float _previousTimeScale = 1.0f;

        private void Awake() => SetScreenIdForTesting(ScreenId.PauseMenu);

        public override void Open()
        {
            base.Open();
            _previousTimeScale = Time.timeScale;
            Time.timeScale = 0f; // Freeze game simulation
            CricketLogger.LogInfo(LogChannel.UI, "Game Paused: TimeScale set to 0.");
        }

        public override void Close()
        {
            base.Close();
            Time.timeScale = _previousTimeScale > 0f ? _previousTimeScale : 1.0f;
            CricketLogger.LogInfo(LogChannel.UI, "Game Resumed: TimeScale restored.");
        }

        public void OnClickResume()
        {
            ScreenManager.Instance?.CloseOverlay(ScreenId.PauseMenu);
        }

        public void OnClickViewScorecard()
        {
            ScreenManager.Instance?.OpenOverlay(ScreenId.Scorecard);
        }

        public void OnClickSettings()
        {
            ScreenManager.Instance?.SwitchToScreen(ScreenId.Settings);
        }

        public void OnClickExitToMainMenu()
        {
            Close();
            ScreenManager.Instance?.SwitchToScreen(ScreenId.MainMenu);
        }
    }

    /// <summary>
    /// Innings break presentation displaying target and run rate requirements.
    /// </summary>
    public class InningsBreakScreen : ScreenBase
    {
        private void Awake() => SetScreenIdForTesting(ScreenId.InningsBreak);

        public void OnClickStartSecondInnings()
        {
            Close();
            ScreenManager.Instance?.SwitchToScreen(ScreenId.InMatchHUD);
        }
    }

    /// <summary>
    /// Match conclusion screen displaying official results and celebrations.
    /// </summary>
    public class MatchResultScreen : ScreenBase
    {
        [SerializeField] private string _resultText = "Match Completed";

        public string ResultText => _resultText;

        private void Awake() => SetScreenIdForTesting(ScreenId.MatchResult);

        public void SetResultText(string result) => _resultText = result;

        public void OnClickViewFullScorecard()
        {
            ScreenManager.Instance?.OpenOverlay(ScreenId.Scorecard);
        }

        public void OnClickReturnToMainMenu()
        {
            Close();
            ScreenManager.Instance?.SwitchToScreen(ScreenId.MainMenu);
        }
    }

    /// <summary>
    /// Settings interface managing audio, graphics, and mobile controls.
    /// </summary>
    public class SettingsScreen : ScreenBase
    {
        [Range(0f, 1f)] public float MasterVolume = 1.0f;
        [Range(0f, 1f)] public float SfxVolume = 0.85f;
        public int GraphicsQuality = 2; // 0 = Low, 1 = Medium, 2 = High
        public bool ShowOnScreenTouchControls = true;

        private void Awake() => SetScreenIdForTesting(ScreenId.Settings);

        public void OnClickBack() => ScreenManager.Instance?.GoBack();
    }

    /// <summary>
    /// How to Play guide detailing controls for PC and Mobile.
    /// </summary>
    public class HowToPlayScreen : ScreenBase
    {
        private void Awake() => SetScreenIdForTesting(ScreenId.HowToPlay);

        public string GetPCControlsHelp()
        {
            return "PC CONTROLS:\n" +
                   "• Space / Enter: Execute Shot / Bowl delivery\n" +
                   "• A / D or Arrow Keys: Aim shot direction\n" +
                   "• W: Quick attacking stroke toggle\n" +
                   "• S: Quick defensive stroke toggle\n" +
                   "• 1-8: Direct shot presets (Drive, Cut, Pull, Loft)\n" +
                   "• R: Call run between wickets | X: Cancel run\n" +
                   "• C: Cycle broadcast cameras | Esc: Pause menu";
        }

        public string GetMobileControlsHelp()
        {
            return "MOBILE CONTROLS:\n" +
                   "• Virtual Joystick: Aim shot direction\n" +
                   "• SWING button: Execute stroke\n" +
                   "• ATTACK / DEFEND buttons: Toggle shot style\n" +
                   "• LOFT button: Aerial boundary attack\n" +
                   "• RUN / CANCEL buttons: Running between wickets\n" +
                   "• PAUSE button: In-game pause menu";
        }

        public void OnClickBack() => ScreenManager.Instance?.GoBack();
    }
}
