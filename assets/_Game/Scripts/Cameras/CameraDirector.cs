using System;
using UnityEngine;
using CricketLegends.Core;
using CricketLegends.Presentation;

namespace CricketLegends.Cameras
{
    public enum CameraViewMode
    {
        BattingBroadcast,
        BowlerRunUp,
        BallFollow,
        BoundaryShot,
        DismissalView
    }

    /// <summary>
    /// Professional sports broadcast camera director for Cricket Legends.
    /// Manages multiple cinematic angles and smooth interpolations.
    /// Responds reactively to CricketEvents without modifying match state.
    /// </summary>
    public class CameraDirector : MonoBehaviour
    {
        [Header("Target Tracking")]
        [SerializeField] private Transform _ballTransform;
        [SerializeField] private Transform _strikerTransform;
        [SerializeField] private Transform _bowlerTransform;

        [Header("Active Mode & Settings")]
        [SerializeField] private CameraViewMode _currentMode = CameraViewMode.BattingBroadcast;
        [SerializeField] private Camera _managedCamera;
        [SerializeField] private float _transitionDuration = 0.45f;
        [SerializeField] private float _minCameraHeight = 0.5f;

        [Header("Presets Configuration")]
        [SerializeField] private Vector3 _battingBroadcastPos = new Vector3(0.35f, 2.65f, 15.20f);
        [SerializeField] private Vector3 _battingBroadcastLook = new Vector3(0.10f, 1.15f, -9.50f);
        [SerializeField] private float _battingFov = 48f;

        [SerializeField] private Vector3 _bowlerRunupPos = new Vector3(1.20f, 3.10f, -28.50f);
        [SerializeField] private Vector3 _bowlerRunupLook = new Vector3(0.00f, 1.00f, 9.50f);
        [SerializeField] private float _bowlerRunupFov = 52f;

        [SerializeField] private Vector3 _boundaryCamPos = new Vector3(36.0f, 16.0f, 10.0f);
        [SerializeField] private float _boundaryFov = 55f;

        [SerializeField] private Vector3 _dismissalPos = new Vector3(2.20f, 1.35f, 11.60f);
        [SerializeField] private Vector3 _dismissalLook = new Vector3(0.00f, 0.45f, 10.06f);
        [SerializeField] private float _dismissalFov = 38f;

        // Transition Smoothing State
        private Vector3 _targetPosition;
        private Quaternion _targetRotation;
        private float _targetFov = 50f;
        private Vector3 _positionVelocity;
        private float _fovVelocity;

        public CameraViewMode CurrentMode => _currentMode;
        public Camera ManagedCamera => _managedCamera;

        private void Awake()
        {
            if (_managedCamera == null)
            {
                _managedCamera = GetComponent<Camera>();
                if (_managedCamera == null)
                {
                    _managedCamera = Camera.main;
                }
            }

            SetMode(CameraViewMode.BattingBroadcast, immediate: true);
        }

        private void OnEnable()
        {
            // Subscribe to gameplay events
            CricketEvents.DeliveryStarted += HandleDeliveryStarted;
            CricketEvents.BallDelivered += HandleBallDelivered;
            CricketEvents.ShotExecuted += HandleShotExecuted;
            CricketEvents.WicketFallen += HandleWicketFallen;
            CricketEvents.DeliveryCompleted += HandleDeliveryCompleted;
        }

        private void OnDisable()
        {
            CricketEvents.DeliveryStarted -= HandleDeliveryStarted;
            CricketEvents.BallDelivered -= HandleBallDelivered;
            CricketEvents.ShotExecuted -= HandleShotExecuted;
            CricketEvents.WicketFallen -= HandleWicketFallen;
            CricketEvents.DeliveryCompleted -= HandleDeliveryCompleted;
        }

        private void LateUpdate()
        {
            UpdateTargetTransform();
            ApplyCameraDamping();
        }

        public void CycleNextMode()
        {
            int nextModeIndex = ((int)_currentMode + 1) % Enum.GetValues(typeof(CameraViewMode)).Length;
            SetMode((CameraViewMode)nextModeIndex, immediate: false);
        }

        public void SetMode(CameraViewMode mode, bool immediate = false)
        {
            _currentMode = mode;
            CricketLogger.LogDiagnostic(LogChannel.UI, $"Camera Mode set to: [{mode}]");

            UpdateTargetTransform();

            if (immediate && _managedCamera != null)
            {
                _managedCamera.transform.position = _targetPosition;
                _managedCamera.transform.rotation = _targetRotation;
                _managedCamera.fieldOfView = _targetFov;
            }
        }

        private void UpdateTargetTransform()
        {
            switch (_currentMode)
            {
                case CameraViewMode.BattingBroadcast:
                    _targetPosition = _battingBroadcastPos;
                    _targetRotation = Quaternion.LookRotation(_battingBroadcastLook - _targetPosition);
                    _targetFov = _battingFov;
                    break;

                case CameraViewMode.BowlerRunUp:
                    _targetPosition = _bowlerRunupPos;
                    _targetRotation = Quaternion.LookRotation(_bowlerRunupLook - _targetPosition);
                    _targetFov = _bowlerRunupFov;
                    break;

                case CameraViewMode.BallFollow:
                    if (_ballTransform != null)
                    {
                        Vector3 ballPos = _ballTransform.position;
                        // Dynamic trailing position behind and above ball
                        _targetPosition = ballPos + new Vector3(-3.5f, 3.2f, -6.0f);
                        _targetPosition.y = Mathf.Max(_targetPosition.y, _minCameraHeight);
                        _targetRotation = Quaternion.LookRotation((ballPos + Vector3.up * 0.2f) - _targetPosition);
                        _targetFov = 48f;
                    }
                    else
                    {
                        _targetPosition = _battingBroadcastPos;
                        _targetRotation = Quaternion.LookRotation(_battingBroadcastLook - _targetPosition);
                        _targetFov = _battingFov;
                    }
                    break;

                case CameraViewMode.BoundaryShot:
                    _targetPosition = _boundaryCamPos;
                    Vector3 lookPoint = _ballTransform != null ? _ballTransform.position : PitchCoordinates.PitchCenter;
                    _targetRotation = Quaternion.LookRotation(lookPoint - _targetPosition);
                    _targetFov = _boundaryFov;
                    break;

                case CameraViewMode.DismissalView:
                    _targetPosition = _dismissalPos;
                    _targetRotation = Quaternion.LookRotation(_dismissalLook - _targetPosition);
                    _targetFov = _dismissalFov;
                    break;
            }

            // Ground safety clamp
            _targetPosition.y = Mathf.Max(_targetPosition.y, _minCameraHeight);
        }

        private void ApplyCameraDamping()
        {
            if (_managedCamera == null) return;

            Transform camTransform = _managedCamera.transform;

            // Smooth position damp
            camTransform.position = Vector3.SmoothDamp(
                camTransform.position,
                _targetPosition,
                ref _positionVelocity,
                _transitionDuration
            );

            // Smooth rotation slerp
            camTransform.rotation = Quaternion.Slerp(
                camTransform.rotation,
                _targetRotation,
                Time.deltaTime * (1.0f / Mathf.Max(0.05f, _transitionDuration * 0.7f))
            );

            // Smooth FOV damp
            _managedCamera.fieldOfView = Mathf.SmoothDamp(
                _managedCamera.fieldOfView,
                _targetFov,
                ref _fovVelocity,
                _transitionDuration
            );
        }

        // --- Event Listeners ---
        private void HandleDeliveryStarted(int over, int ball)
        {
            // Set bowler run-up or broadcast batting cam
            SetMode(CameraViewMode.BattingBroadcast, immediate: false);
        }

        private void HandleBallDelivered(Vector3 pos, float speed)
        {
            // Keep on batting broadcast as ball races to the striker
            if (_currentMode != CameraViewMode.BattingBroadcast)
            {
                SetMode(CameraViewMode.BattingBroadcast, immediate: false);
            }
        }

        private void HandleShotExecuted(string shot, string timing, float speed)
        {
            // Transition to dynamic Ball Follow for powerful/lofted shots
            if (timing == "PERFECT" || shot == "LoftedAttack" || speed > 22f)
            {
                SetMode(CameraViewMode.BallFollow, immediate: false);
            }
        }

        private void HandleWicketFallen(string batter, string bowler, string type)
        {
            // Dramatic close-up replay angle on the broken stumps
            SetMode(CameraViewMode.DismissalView, immediate: false);
        }

        private void HandleDeliveryCompleted(DeliveryResultData result)
        {
            // If ball reached boundary, show grandstand boundary sweep
            if (result.IsBoundaryFour || result.IsBoundarySix)
            {
                SetMode(CameraViewMode.BoundaryShot, immediate: false);
            }
        }

        public void SetTrackingTargets(Transform ball, Transform striker, Transform bowler)
        {
            _ballTransform = ball;
            _strikerTransform = striker;
            _bowlerTransform = bowler;
        }
    }
}
