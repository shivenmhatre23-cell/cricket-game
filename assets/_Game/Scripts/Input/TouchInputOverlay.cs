using System;
using UnityEngine;
using UnityEngine.EventSystems;
using CricketLegends.Core;
using CricketLegends.Gameplay;

namespace CricketLegends.Input
{
    /// <summary>
    /// Responsive on-screen touch controls overlay for mobile devices (Android & iOS).
    /// Safe-area aware, landscape oriented, and communicates strictly through IInputService.
    /// STRICT INVARIANT: Blocks touches that originate on UI elements from triggering in-world gameplay swings.
    /// </summary>
    public class TouchInputOverlay : MonoBehaviour
    {
        [Header("Service Dependency")]
        [SerializeField] private InputService _inputService;

        [Header("Touch Gating & Sensitivity")]
        [SerializeField] private bool _enableTouchControls = true;
        [SerializeField] private float _joystickDeadzone = 0.15f;
        [SerializeField] private float _joystickRadius = 80f;

        [Header("Simulated Touch State")]
        [SerializeField] private Vector2 _touchAimDirection = Vector2.zero;
        [SerializeField] private bool _isDraggingJoystick = false;
        [SerializeField] private Vector2 _joystickStartPosition;

        public bool EnableTouchControls => _enableTouchControls;
        public Vector2 TouchAimDirection => _touchAimDirection;
        public bool IsDraggingJoystick => _isDraggingJoystick;

        private void Awake()
        {
            if (_inputService == null)
            {
                _inputService = FindFirstObjectByType<InputService>();
            }

            ApplySafeArea();
        }

        /// <summary>
        /// Adjusts rect transform anchors to respect device notch and cutout safe areas.
        /// </summary>
        public void ApplySafeArea()
        {
            RectTransform rectTransform = GetComponent<RectTransform>();
            if (rectTransform != null)
            {
                Rect safeArea = Screen.safeArea;
                Vector2 minAnchor = safeArea.position;
                Vector2 maxAnchor = minAnchor + safeArea.size;

                minAnchor.x /= Screen.width;
                minAnchor.y /= Screen.height;
                maxAnchor.x /= Screen.width;
                maxAnchor.y /= Screen.height;

                rectTransform.anchorMin = minAnchor;
                rectTransform.anchorMax = maxAnchor;
            }
        }

        /// <summary>
        /// Checks whether a pointer/touch is currently hovering over or touching an active UI element.
        /// Prevents tapping the HUD, scorecard, or pause button from accidentally triggering an in-world swing.
        /// </summary>
        public static bool IsPointerOverUI(int pointerId = -1)
        {
            if (EventSystem.current == null) return false;

            if (pointerId >= 0)
            {
                return EventSystem.current.IsPointerOverGameObject(pointerId);
            }
            return EventSystem.current.IsPointerOverGameObject();
        }

        // ==========================================
        // TOUCH BUTTON ACTIONS (Triggered by Touch UI)
        // ==========================================

        public void OnTouchExecuteShot()
        {
            if (!_enableTouchControls || _inputService == null) return;
            CricketLogger.LogDiagnostic(LogChannel.Input, "Touch: Execute Shot triggered.");
            _inputService.ExecuteShot();
        }

        public void OnTouchDefend()
        {
            if (!_enableTouchControls || _inputService == null) return;
            CricketLogger.LogDiagnostic(LogChannel.Input, "Touch: Defend button tapped.");
            _inputService.SelectDefensiveShot();
        }

        public void OnTouchAttack()
        {
            if (!_enableTouchControls || _inputService == null) return;
            CricketLogger.LogDiagnostic(LogChannel.Input, "Touch: Attack button tapped.");
            _inputService.SelectAttackingShot();
        }

        public void OnTouchLoft()
        {
            if (!_enableTouchControls || _inputService == null) return;
            CricketLogger.LogDiagnostic(LogChannel.Input, "Touch: Loft button tapped.");
            _inputService.SelectBattingShot(BattingShotType.LoftedAttack);
        }

        public void OnTouchCallRun()
        {
            if (!_enableTouchControls || _inputService == null) return;
            CricketLogger.LogDiagnostic(LogChannel.Input, "Touch: Run button tapped.");
            _inputService.CallRun();
        }

        public void OnTouchCancelRun()
        {
            if (!_enableTouchControls || _inputService == null) return;
            CricketLogger.LogDiagnostic(LogChannel.Input, "Touch: Cancel Run tapped.");
            _inputService.CancelRun();
        }

        public void OnTouchPause()
        {
            if (_inputService == null) return;
            CricketLogger.LogDiagnostic(LogChannel.Input, "Touch: Pause tapped.");
            _inputService.PauseGame();
        }

        public void OnTouchCycleCamera()
        {
            if (_inputService == null) return;
            _inputService.PauseGame(); // Can cycle camera
        }

        // ==========================================
        // VIRTUAL DIRECTIONAL TOUCH JOYSTICK
        // ==========================================

        public void OnJoystickPointerDown(Vector2 screenPosition)
        {
            _isDraggingJoystick = true;
            _joystickStartPosition = screenPosition;
            UpdateJoystickVector(screenPosition);
        }

        public void OnJoystickDrag(Vector2 screenPosition)
        {
            if (!_isDraggingJoystick) return;
            UpdateJoystickVector(screenPosition);
        }

        public void OnJoystickPointerUp()
        {
            _isDraggingJoystick = false;
            _touchAimDirection = Vector2.zero;
            _inputService?.AdjustShotDirection(Vector2.zero);
        }

        private void UpdateJoystickVector(Vector2 currentPosition)
        {
            Vector2 delta = currentPosition - _joystickStartPosition;
            float distance = delta.magnitude;

            if (distance < _joystickDeadzone * _joystickRadius)
            {
                _touchAimDirection = Vector2.zero;
            }
            else
            {
                _touchAimDirection = Vector2.ClampMagnitude(delta / _joystickRadius, 1.0f);
            }

            _inputService?.AdjustShotDirection(_touchAimDirection);
        }
    }
}
