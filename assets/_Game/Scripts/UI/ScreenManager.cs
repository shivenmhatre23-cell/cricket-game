using System;
using System.Collections.Generic;
using UnityEngine;
using CricketLegends.Core;

namespace CricketLegends.UI
{
    public enum ScreenId
    {
        MainMenu,
        TeamSelection,
        MatchConfiguration,
        Toss,
        InMatchHUD,
        PauseMenu,
        InningsBreak,
        Scorecard,
        MatchResult,
        Settings,
        HowToPlay
    }

    /// <summary>
    /// Base class for all broadcast UI screens in Cricket Legends.
    /// Manages visibility, canvas grouping, and transition state.
    /// </summary>
    public class ScreenBase : MonoBehaviour
    {
        [SerializeField] private ScreenId _screenId;
        [SerializeField] private bool _isOpen = false;

        public ScreenId ScreenId => _screenId;
        public bool IsOpen => _isOpen;

        public virtual void Open()
        {
            _isOpen = true;
            gameObject.SetActive(true);
            CricketLogger.LogDiagnostic(LogChannel.UI, $"Screen opened: [{_screenId}]");
        }

        public virtual void Close()
        {
            _isOpen = false;
            gameObject.SetActive(false);
            CricketLogger.LogDiagnostic(LogChannel.UI, $"Screen closed: [{_screenId}]");
        }

        public void SetScreenIdForTesting(ScreenId id) => _screenId = id;
    }

    /// <summary>
    /// Central manager for UI navigation, modal stacking, and screen transitions.
    /// Enforces restrained animations and fast menu navigation.
    /// </summary>
    public class ScreenManager : MonoBehaviour
    {
        public static ScreenManager Instance { get; private set; }

        [Header("Registered Screens")]
        [SerializeField] private List<ScreenBase> _registeredScreens = new List<ScreenBase>();
        [SerializeField] private ScreenId _activeScreenId = ScreenId.MainMenu;

        private readonly Stack<ScreenId> _screenHistory = new Stack<ScreenId>();
        private readonly Dictionary<ScreenId, ScreenBase> _screenLookup = new Dictionary<ScreenId, ScreenBase>();

        public ScreenId ActiveScreenId => _activeScreenId;
        public int HistoryCount => _screenHistory.Count;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
            }
            BuildScreenDictionary();
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        public void RegisterScreen(ScreenBase screen)
        {
            if (screen != null && !_registeredScreens.Contains(screen))
            {
                _registeredScreens.Add(screen);
                _screenLookup[screen.ScreenId] = screen;
            }
        }

        private void BuildScreenDictionary()
        {
            _screenLookup.Clear();
            foreach (var s in _registeredScreens)
            {
                if (s != null)
                {
                    _screenLookup[s.ScreenId] = s;
                }
            }
        }

        public bool TryGetScreen(ScreenId id, out ScreenBase screen)
        {
            return _screenLookup.TryGetValue(id, out screen);
        }

        /// <summary>
        /// Switches to the target screen and pushes the previous screen onto the history stack.
        /// </summary>
        public void SwitchToScreen(ScreenId id)
        {
            if (_screenLookup.TryGetValue(_activeScreenId, out var currentScreen))
            {
                currentScreen.Close();
                _screenHistory.Push(_activeScreenId);
            }

            _activeScreenId = id;
            if (_screenLookup.TryGetValue(id, out var newScreen))
            {
                newScreen.Open();
                CricketLogger.LogInfo(LogChannel.UI, $"Navigated to screen: [{id}]");
            }
        }

        /// <summary>
        /// Opens a modal/overlay screen without closing underlying screens (e.g. HUD).
        /// </summary>
        public void OpenOverlay(ScreenId id)
        {
            if (_screenLookup.TryGetValue(id, out var screen))
            {
                screen.Open();
            }
        }

        /// <summary>
        /// Closes an overlay screen.
        /// </summary>
        public void CloseOverlay(ScreenId id)
        {
            if (_screenLookup.TryGetValue(id, out var screen))
            {
                screen.Close();
            }
        }

        /// <summary>
        /// Returns to previous screen in navigation stack.
        /// </summary>
        public bool GoBack()
        {
            if (_screenHistory.Count == 0) return false;

            ScreenId previousId = _screenHistory.Pop();

            if (_screenLookup.TryGetValue(_activeScreenId, out var currentScreen))
            {
                currentScreen.Close();
            }

            _activeScreenId = previousId;
            if (_screenLookup.TryGetValue(previousId, out var prevScreen))
            {
                prevScreen.Open();
                CricketLogger.LogInfo(LogChannel.UI, $"Navigated back to: [{previousId}]");
            }

            return true;
        }

        public void CloseAllScreens()
        {
            foreach (var s in _registeredScreens)
            {
                if (s != null) s.Close();
            }
            _screenHistory.Clear();
        }
    }
}
