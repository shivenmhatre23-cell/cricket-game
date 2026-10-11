using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using CricketLegends.Core;
using CricketLegends.Gameplay;
using CricketLegends.Input;
using CricketLegends.Rules;
using CricketLegends.UI;

namespace CricketLegends.Tests
{
    public class BroadcastUIAndControlsTests
    {
        private GameObject _testRoot;
        private ScreenManager _screenManager;
        private InputService _inputService;
        private TouchInputOverlay _touchOverlay;
        private BroadcastHUD _hud;
        private PauseMenuScreen _pauseMenu;
        private CricketRulesEngine _rulesEngine;

        [SetUp]
        public void SetUp()
        {
            _testRoot = new GameObject("TestRoot_BroadcastUIAndControls");

            // Screen Manager
            GameObject smObj = new GameObject("ScreenManager");
            smObj.transform.SetParent(_testRoot.transform);
            _screenManager = smObj.AddComponent<ScreenManager>();

            // Input Service
            GameObject inputObj = new GameObject("InputService");
            inputObj.transform.SetParent(_testRoot.transform);
            _inputService = inputObj.AddComponent<InputService>();

            // Touch Overlay
            GameObject touchObj = new GameObject("TouchInputOverlay");
            touchObj.transform.SetParent(_testRoot.transform);
            touchObj.AddComponent<RectTransform>();
            _touchOverlay = touchObj.AddComponent<TouchInputOverlay>();

            // Rules Engine
            var config = MatchConfiguration.CreateExhibition(overs: 2, maxWickets: 10, home: "India", away: "Australia");
            GameObject engineObj = new GameObject("RulesEngine");
            engineObj.transform.SetParent(_testRoot.transform);
            _rulesEngine = engineObj.AddComponent<CricketRulesEngine>();
            _rulesEngine.InitializeMatch(config);

            // Register screens
            CreateAndRegisterScreen<MainMenuScreen>(ScreenId.MainMenu);
            CreateAndRegisterScreen<TeamSelectionScreen>(ScreenId.TeamSelection);
            CreateAndRegisterScreen<MatchConfigurationScreen>(ScreenId.MatchConfiguration);
            CreateAndRegisterScreen<TossScreen>(ScreenId.Toss);
            CreateAndRegisterScreen<InningsBreakScreen>(ScreenId.InningsBreak);
            CreateAndRegisterScreen<MatchResultScreen>(ScreenId.MatchResult);
            CreateAndRegisterScreen<SettingsScreen>(ScreenId.Settings);
            CreateAndRegisterScreen<HowToPlayScreen>(ScreenId.HowToPlay);

            // HUD
            GameObject hudObj = new GameObject("BroadcastHUD");
            hudObj.transform.SetParent(_testRoot.transform);
            _hud = hudObj.AddComponent<BroadcastHUD>();
            _hud.BindRulesEngine(_rulesEngine);
            _screenManager.RegisterScreen(_hud);

            // Pause Menu
            GameObject pauseObj = new GameObject("PauseMenuScreen");
            pauseObj.transform.SetParent(_testRoot.transform);
            _pauseMenu = pauseObj.AddComponent<PauseMenuScreen>();
            _screenManager.RegisterScreen(_pauseMenu);
        }

        private T CreateAndRegisterScreen<T>(ScreenId id) where T : ScreenBase
        {
            GameObject obj = new GameObject(id.ToString());
            obj.transform.SetParent(_testRoot.transform);
            T screen = obj.AddComponent<T>();
            screen.SetScreenIdForTesting(id);
            _screenManager.RegisterScreen(screen);
            return screen;
        }

        [TearDown]
        public void TearDown()
        {
            Time.timeScale = 1.0f;
            CricketEvents.ClearAllListeners();
            if (_testRoot != null)
            {
                Object.DestroyImmediate(_testRoot);
            }
        }

        [Test]
        public void ScreenManager_OpensAndClosesScreens_MaintainsNavigationHistory()
        {
            // Initial screen
            _screenManager.SwitchToScreen(ScreenId.MainMenu);
            Assert.AreEqual(ScreenId.MainMenu, _screenManager.ActiveScreenId);

            // Navigate MainMenu -> TeamSelection
            _screenManager.SwitchToScreen(ScreenId.TeamSelection);
            Assert.AreEqual(ScreenId.TeamSelection, _screenManager.ActiveScreenId);
            Assert.AreEqual(1, _screenManager.HistoryCount);

            // Navigate TeamSelection -> MatchConfiguration
            _screenManager.SwitchToScreen(ScreenId.MatchConfiguration);
            Assert.AreEqual(ScreenId.MatchConfiguration, _screenManager.ActiveScreenId);
            Assert.AreEqual(2, _screenManager.HistoryCount);

            // GoBack returns to TeamSelection
            bool wentBack = _screenManager.GoBack();
            Assert.IsTrue(wentBack);
            Assert.AreEqual(ScreenId.TeamSelection, _screenManager.ActiveScreenId);

            // GoBack returns to MainMenu
            wentBack = _screenManager.GoBack();
            Assert.IsTrue(wentBack);
            Assert.AreEqual(ScreenId.MainMenu, _screenManager.ActiveScreenId);
        }

        [Test]
        public void CrossPlatformInput_TouchAndKeyboardInvokeSameGameplayActions()
        {
            int shotActionCount = 0;
            int runActionCount = 0;
            int defenseActionCount = 0;
            int attackActionCount = 0;

            _inputService.OnActionTriggered += () => shotActionCount++;
            _inputService.OnRunCalled += () => runActionCount++;
            _inputService.OnDefensiveSelected += () => defenseActionCount++;
            _inputService.OnAttackingSelected += () => attackActionCount++;

            // 1. Invoke via Touch Overlay
            _touchOverlay.OnTouchExecuteShot();
            _touchOverlay.OnTouchCallRun();
            _touchOverlay.OnTouchDefend();
            _touchOverlay.OnTouchAttack();

            Assert.AreEqual(1, shotActionCount);
            Assert.AreEqual(1, runActionCount);
            Assert.AreEqual(1, defenseActionCount);
            Assert.AreEqual(1, attackActionCount);

            // 2. Invoke via PC Keyboard Service methods
            _inputService.ExecuteShot();
            _inputService.CallRun();
            _inputService.SelectDefensiveShot();
            _inputService.SelectAttackingShot();

            Assert.AreEqual(2, shotActionCount, "Keyboard and touch must trigger identical action handlers.");
            Assert.AreEqual(2, runActionCount);
            Assert.AreEqual(2, defenseActionCount);
            Assert.AreEqual(2, attackActionCount);
        }

        [Test]
        public void TouchJoystick_GeneratesNormalizedAimVector()
        {
            // Center tap
            _touchOverlay.OnJoystickPointerDown(new Vector2(100f, 100f));
            Assert.IsTrue(_touchOverlay.IsDraggingJoystick);

            // Drag to upper right
            _touchOverlay.OnJoystickDrag(new Vector2(160f, 160f));
            Vector2 aim = _touchOverlay.TouchAimDirection;
            Assert.Greater(aim.x, 0f);
            Assert.Greater(aim.y, 0f);
            Assert.LessOrEqual(aim.magnitude, 1.0f);

            // Release
            _touchOverlay.OnJoystickPointerUp();
            Assert.IsFalse(_touchOverlay.IsDraggingJoystick);
            Assert.AreEqual(Vector2.zero, _touchOverlay.TouchAimDirection);
        }

        [Test]
        public void PauseMenu_FreezesTimeScale_PreservesMatchStateWithoutAccidentalScoreMutation()
        {
            _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Runs(1, 4, four: true));
            int prePauseScore = _rulesEngine.TotalRuns;
            int prePauseBalls = _rulesEngine.LegalBallsInOver;

            // Open Pause Menu
            _pauseMenu.Open();
            Assert.IsTrue(_pauseMenu.IsOpen);
            Assert.AreEqual(0f, Time.timeScale, "Pausing must freeze Time.timeScale to 0.");

            // Match state must be completely untouched
            Assert.AreEqual(prePauseScore, _rulesEngine.TotalRuns);
            Assert.AreEqual(prePauseBalls, _rulesEngine.LegalBallsInOver);

            // Resume game
            _pauseMenu.Close();
            Assert.IsFalse(_pauseMenu.IsOpen);
            Assert.AreEqual(1.0f, Time.timeScale, "Resuming must restore nominal Time.timeScale.");
            Assert.AreEqual(prePauseScore, _rulesEngine.TotalRuns);
        }

        [Test]
        public void BroadcastHUD_TruncatesLongPlayerNames_PreventsOverflow()
        {
            string shortName = "V. Kohli";
            Assert.AreEqual("V. Kohli", BroadcastHUD.FormatPlayerName(shortName, 14));

            string longName = "Marnus Labuschagne";
            string formatted = BroadcastHUD.FormatPlayerName(longName, 12);
            Assert.LessOrEqual(formatted.Length, 12);
            Assert.That(formatted, Does.EndWith("…"));

            string nullName = BroadcastHUD.FormatPlayerName(null);
            Assert.AreEqual("Player", nullName);
        }

        [Test]
        public void BroadcastHUD_DisplaysLowerThirdFormattedString()
        {
            _hud.Open();
            _rulesEngine.ResolveDelivery(DeliveryOutcomeInput.Runs(1, 4, four: true));

            string lowerThird = _hud.GetLowerThirdFormattedString();
            Assert.IsNotNull(lowerThird);
            Assert.That(lowerThird, Does.Contain("4/0"));
            Assert.That(lowerThird, Does.Contain("CRR:"));
            Assert.That(lowerThird, Does.Contain("This Over: [4]"));
        }

        [Test]
        public void BroadcastHUD_EventBannersTriggerOnBoundariesAndWickets()
        {
            _hud.Open();

            // Trigger Boundary 6
            _hud.ShowBanner("🚀 MAXIMUM SIX!");
            Assert.IsTrue(_hud.IsBannerActive);
            Assert.AreEqual("🚀 MAXIMUM SIX!", _hud.BannerText);
        }
    }
}
