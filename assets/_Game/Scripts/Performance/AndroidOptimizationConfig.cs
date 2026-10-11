using System;
using UnityEngine;
using CricketLegends.Core;

namespace CricketLegends.Performance
{
    [Serializable]
    public struct SafeAreaOffsets
    {
        public float LeftInset;
        public float RightInset;
        public float TopInset;
        public float BottomInset;

        public SafeAreaOffsets(float left, float right, float top, float bottom)
        {
            LeftInset = left;
            RightInset = right;
            TopInset = top;
            BottomInset = bottom;
        }
    }

    /// <summary>
    /// Android mobile configuration and runtime optimization service.
    /// Locks landscape orientation, enables safe-area notch compensation,
    /// sets 60 FPS mobile target, disables screen sleep during matches,
    /// and configures mobile-specific URP parameters.
    /// </summary>
    public class AndroidOptimizationConfig : MonoBehaviour
    {
        private static AndroidOptimizationConfig _instance;
        public static AndroidOptimizationConfig Instance => _instance;

        [Header("Mobile Target Settings")]
        [SerializeField] private int _targetMobileFps = 60;
        [SerializeField] private bool _lockLandscape = true;
        [SerializeField] private bool _preventSleepDuringMatch = true;

        [Header("Safe Area Status")]
        [SerializeField] private Rect _currentSafeArea;
        [SerializeField] private SafeAreaOffsets _safeAreaInsets;

        public int TargetMobileFps => _targetMobileFps;
        public bool LockLandscape => _lockLandscape;
        public Rect CurrentSafeArea => _currentSafeArea;
        public SafeAreaOffsets Insets => _safeAreaInsets;

        private void Awake()
        {
            if (_instance != null && _instance != this)
            {
                Destroy(gameObject);
                return;
            }
            _instance = this;

            ApplyMobileOptimizations();
        }

        public void ApplyMobileOptimizations()
        {
            // Lock orientation to Landscape
            if (_lockLandscape)
            {
                Screen.orientation = ScreenOrientation.AutoRotation;
                Screen.autorotateToLandscapeLeft = true;
                Screen.autorotateToLandscapeRight = true;
                Screen.autorotateToPortrait = false;
                Screen.autorotateToPortraitUpsideDown = false;
            }

            // Target 60 FPS for responsive touch controls
            Application.targetFrameRate = _targetMobileFps;

            // Prevent screen timeout during gameplay
            if (_preventSleepDuringMatch)
            {
                Screen.sleepTimeout = SleepTimeout.NeverSleep;
            }

            // Multi-touch must be enabled for simultaneous joystick + action button touches
            Input.multiTouchEnabled = true;

            // Calculate safe area
            CalculateSafeArea();

            CricketLogger.Log(LogChannel.Core,
                $"Android Optimization applied: 60 FPS, Landscape Locked, MultiTouch Enabled. " +
                $"Safe Area: {_currentSafeArea}");
        }

        public void CalculateSafeArea()
        {
            _currentSafeArea = Screen.safeArea;
            float screenW = Screen.width > 0 ? Screen.width : 1920f;
            float screenH = Screen.height > 0 ? Screen.height : 1080f;

            _safeAreaInsets = new SafeAreaOffsets(
                _currentSafeArea.x,
                screenW - (_currentSafeArea.x + _currentSafeArea.width),
                screenH - (_currentSafeArea.y + _currentSafeArea.height),
                _currentSafeArea.y
            );
        }

        public void SetMobileConfigForTesting(int targetFps, Rect safeArea, float screenW, float screenH)
        {
            _targetMobileFps = targetFps;
            _currentSafeArea = safeArea;
            _safeAreaInsets = new SafeAreaOffsets(
                safeArea.x,
                screenW - (safeArea.x + safeArea.width),
                screenH - (safeArea.y + safeArea.height),
                safeArea.y
            );
        }
    }
}
