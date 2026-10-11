using System;
using System.Collections.Generic;
using UnityEngine;
using CricketLegends.Core;

namespace CricketLegends.Performance
{
    [Serializable]
    public struct ResolutionOption
    {
        public int Width;
        public int Height;
        public int RefreshRate;

        public ResolutionOption(int width, int height, int refreshRate = 60)
        {
            Width = width;
            Height = height;
            RefreshRate = refreshRate;
        }

        public override string ToString() => $"{Width} x {Height} ({RefreshRate}Hz)";
    }

    /// <summary>
    /// PC standalone display, resolution, fullscreen, and refresh rate manager.
    /// Handles display settings, VSync, target frame rate, and preferences persistence.
    /// </summary>
    public class WindowsDisplaySettings : MonoBehaviour
    {
        private static WindowsDisplaySettings _instance;
        public static WindowsDisplaySettings Instance => _instance;

        private const string PrefKeyWidth = "CL_Display_Width";
        private const string PrefKeyHeight = "CL_Display_Height";
        private const string PrefKeyMode = "CL_Display_Mode";
        private const string PrefKeyVSync = "CL_Display_VSync";
        private const string PrefKeyTargetFps = "CL_Display_TargetFps";

        [Header("Current Settings")]
        [SerializeField] private int _currentWidth = 1920;
        [SerializeField] private int _currentHeight = 1080;
        [SerializeField] private FullScreenMode _currentMode = FullScreenMode.FullScreenWindow;
        [SerializeField] private int _vSyncCount = 1;
        [SerializeField] private int _targetFrameRate = 60;

        public int CurrentWidth => _currentWidth;
        public int CurrentHeight => _currentHeight;
        public FullScreenMode CurrentMode => _currentMode;
        public int VSyncCount => _vSyncCount;
        public int TargetFrameRate => _targetFrameRate;

        public static readonly List<ResolutionOption> StandardResolutions = new List<ResolutionOption>
        {
            new ResolutionOption(1280, 720, 60),
            new ResolutionOption(1366, 768, 60),
            new ResolutionOption(1600, 900, 60),
            new ResolutionOption(1920, 1080, 60),
            new ResolutionOption(1920, 1080, 144),
            new ResolutionOption(2560, 1440, 60),
            new ResolutionOption(2560, 1440, 144),
            new ResolutionOption(3840, 2160, 60)
        };

        private void Awake()
        {
            if (_instance != null && _instance != this)
            {
                Destroy(gameObject);
                return;
            }
            _instance = this;

            LoadSettings();
        }

        /// <summary>
        /// Applies display resolution and fullscreen mode to the application.
        /// </summary>
        public void ApplyResolution(int width, int height, FullScreenMode mode)
        {
            if (width < 640 || height < 480)
            {
                width = 1280;
                height = 720;
            }

            _currentWidth = width;
            _currentHeight = height;
            _currentMode = mode;

            Screen.SetResolution(width, height, mode);
            CricketLogger.Log(LogChannel.Presentation,
                $"Applied Resolution: {width}x{height}, Mode: {mode}");

            SaveSettings();
        }

        public void ApplyVSync(int count)
        {
            _vSyncCount = Mathf.Clamp(count, 0, 2);
            QualitySettings.vSyncCount = _vSyncCount;
            SaveSettings();
        }

        public void ApplyTargetFrameRate(int fps)
        {
            _targetFrameRate = fps;
            Application.targetFrameRate = fps;
            SaveSettings();
        }

        public void SaveSettings()
        {
            PlayerPrefs.SetInt(PrefKeyWidth, _currentWidth);
            PlayerPrefs.SetInt(PrefKeyHeight, _currentHeight);
            PlayerPrefs.SetInt(PrefKeyMode, (int)_currentMode);
            PlayerPrefs.SetInt(PrefKeyVSync, _vSyncCount);
            PlayerPrefs.SetInt(PrefKeyTargetFps, _targetFrameRate);
            PlayerPrefs.Save();
        }

        public void LoadSettings()
        {
            _currentWidth = PlayerPrefs.GetInt(PrefKeyWidth, Screen.width > 0 ? Screen.width : 1920);
            _currentHeight = PlayerPrefs.GetInt(PrefKeyHeight, Screen.height > 0 ? Screen.height : 1080);
            _currentMode = (FullScreenMode)PlayerPrefs.GetInt(PrefKeyMode, (int)FullScreenMode.FullScreenWindow);
            _vSyncCount = PlayerPrefs.GetInt(PrefKeyVSync, 1);
            _targetFrameRate = PlayerPrefs.GetInt(PrefKeyTargetFps, 60);

            QualitySettings.vSyncCount = _vSyncCount;
            Application.targetFrameRate = _targetFrameRate;
        }

        public void SetSettingsForTesting(int width, int height, FullScreenMode mode, int vSync, int targetFps)
        {
            _currentWidth = width;
            _currentHeight = height;
            _currentMode = mode;
            _vSyncCount = vSync;
            _targetFrameRate = targetFps;
        }
    }
}
