using System;
using UnityEngine;
using CricketLegends.Core;
using CricketLegends.Gameplay;
using CricketLegends.Input;
using CricketLegends.Physics;
using CricketLegends.Presentation;

namespace CricketLegends.Players
{
    public enum BatsmanState
    {
        Waiting,
        Ready,
        Footwork,
        BatSwing,
        BallContact,
        FollowThrough,
        Recovering,
        Dismissed
    }

    /// <summary>
    /// Master controller for the batsman:
    /// - Manages 8 distinct batting shots
    /// - Evaluates millisecond timing error and contact windows
    /// - Drives physical bat-ball collision impulse calculations
    /// - Animates stance, backlift, downswing, follow-through, and recovery
    /// </summary>
    public class BatsmanController : MonoBehaviour
    {
        [Header("State")]
        [SerializeField] private BatsmanState _currentState = BatsmanState.Ready;
        [SerializeField] private bool _hasHitCurrentDelivery = false;
        [SerializeField] private TimingQuality _lastTimingQuality = TimingQuality.Miss;

        [Header("Active Shot Configuration")]
        [SerializeField] private BattingShotType _selectedShotType = BattingShotType.StraightDrive;
        [SerializeField] private BattingShotData _currentShotData;
        [SerializeField] private Vector2 _aimDirection = Vector2.zero;

        [Header("Scene References")]
        [SerializeField] private CricketBall _ball;
        [SerializeField] private PlaceholderPlayerRig _playerRig;
        [SerializeField] private Transform _batBladeTransform;

        [Header("Crease Stance Parameters")]
        [SerializeField] private Vector3 _stancePosition = PitchCoordinates.BatterDefaultStancePosition;
        [SerializeField] private float _strikeZoneZ = 8.95f; // Ideal impact plane at popping crease
        [SerializeField] private float _strikeZoneRadius = 1.15f;

        private float _swingTimer = 0f;
        private float _recoveryTimer = 0f;

        public BatsmanState CurrentState => _currentState;
        public BattingShotType SelectedShotType => _selectedShotType;
        public BattingShotData CurrentShotData => _currentShotData;
        public TimingQuality LastTimingQuality => _lastTimingQuality;
        public bool HasHitCurrentDelivery => _hasHitCurrentDelivery;

        public event Action<BattingShotData, TimingQuality> OnShotAttempted;
        public event Action<Vector3, TimingQuality> OnBallStruck;

        private void Awake()
        {
            if (_playerRig == null)
            {
                _playerRig = GetComponent<PlaceholderPlayerRig>();
            }

            // Load default shot preset
            SelectShot(_selectedShotType);
            ResetToReadyStance();
        }

        private void OnEnable()
        {
            CricketEvents.DeliveryStarted += HandleDeliveryStarted;
            CricketEvents.WicketFallen += HandleWicketFallen;
        }

        private void OnDisable()
        {
            CricketEvents.DeliveryStarted -= HandleDeliveryStarted;
            CricketEvents.WicketFallen -= HandleWicketFallen;
        }

        private void Update()
        {
            UpdateBattingLifecycle();
        }

        public void SelectShot(BattingShotType shotType)
        {
            _selectedShotType = shotType;
            _currentShotData = BattingShotData.CreatePreset(shotType);
            CricketLogger.LogDiagnostic(LogChannel.Players, $"Batsman selected shot: [{_currentShotData.ShotName}]");
        }

        public void AdjustAim(Vector2 aim)
        {
            _aimDirection = Vector2.ClampMagnitude(aim, 1.0f);
        }

        /// <summary>
        /// Initiates the batting stroke timing check and downswing.
        /// </summary>
        public bool TryExecuteShot()
        {
            if (_currentState != BatsmanState.Ready && _currentState != BatsmanState.Footwork)
            {
                CricketLogger.LogDiagnostic(LogChannel.Players,
                    $"Cannot swing bat: Batter is currently in [{_currentState}].");
                return false;
            }

            _hasHitCurrentDelivery = false;
            _swingTimer = 0f;
            _currentState = BatsmanState.BatSwing;

            // 1. Calculate timing error relative to incoming delivery
            float timingError = EvaluateTimingError();
            _lastTimingQuality = _currentShotData.ClassifyTiming(timingError);

            CricketLogger.LogInfo(LogChannel.Players,
                $"Shot Executed: [{_currentShotData.ShotName}] | Timing: [{_lastTimingQuality}] (Error: {timingError:F3}s)");

            OnShotAttempted?.Invoke(_currentShotData, _lastTimingQuality);

            // 2. Immediate physical contact check if ball is inside the contact zone
            CheckAndResolveBallContact();

            return true;
        }

        private float EvaluateTimingError()
        {
            if (_ball == null || _ball.State == BallState.HeldInHand || _ball.State == BallState.Dead)
            {
                return 999f; // Miss, no active ball
            }

            Vector3 ballPos = _ball.Position;
            float ballVz = Mathf.Max(20f, Mathf.Abs(_ball.Velocity.z));

            // Positive error = Late, Negative error = Early
            float timeToArrival = (_strikeZoneZ - ballPos.z) / ballVz;
            return -timeToArrival;
        }

        private void UpdateBattingLifecycle()
        {
            switch (_currentState)
            {
                case BatsmanState.BatSwing:
                    _swingTimer += Time.deltaTime;
                    float swingDuration = _currentShotData != null ? _currentShotData.SwingDuration : 0.32f;
                    float progress = Mathf.Clamp01(_swingTimer / swingDuration);

                    // Animate articulated bat swing arc
                    AnimateSwingArc(progress);

                    // Continuous contact window check during active swing
                    if (!_hasHitCurrentDelivery)
                    {
                        CheckAndResolveBallContact();
                    }

                    if (progress >= 1.0f)
                    {
                        _currentState = BatsmanState.FollowThrough;
                        _recoveryTimer = 0f;
                    }
                    break;

                case BatsmanState.FollowThrough:
                case BatsmanState.Recovering:
                    _recoveryTimer += Time.deltaTime;
                    float recDuration = _currentShotData != null ? _currentShotData.RecoveryDuration : 0.40f;
                    float recProgress = Mathf.Clamp01(_recoveryTimer / recDuration);

                    if (recProgress >= 1.0f)
                    {
                        ResetToReadyStance();
                    }
                    break;
            }
        }

        private void CheckAndResolveBallContact()
        {
            if (_hasHitCurrentDelivery || _ball == null) return;
            if (_lastTimingQuality == TimingQuality.Miss) return;

            Vector3 ballPos = _ball.Position;

            // Distance to batter contact zone
            float horizontalDist = Vector2.Distance(
                new Vector2(ballPos.x, ballPos.z),
                new Vector2(_stancePosition.x, _strikeZoneZ)
            );

            // Verify ball is physically within the reach of the bat blade
            if (horizontalDist <= _strikeZoneRadius && ballPos.y >= 0.05f && ballPos.y <= 1.85f)
            {
                _hasHitCurrentDelivery = true;
                _currentState = BatsmanState.BallContact;

                // Genuine physical exit impulse calculation
                Vector3 exitVelocity = BatCollisionResolver.CalculateExitVelocity(
                    _ball.Velocity,
                    _currentShotData,
                    _lastTimingQuality,
                    _aimDirection,
                    ballPos
                );

                _ball.ApplyBatImpulse(exitVelocity);

                CricketLogger.LogInfo(LogChannel.Physics,
                    $"BAT IMPACT: Exit Velocity = {exitVelocity.magnitude:F1} m/s ({exitVelocity.magnitude * 3.6f:F0} km/h), Direction={exitVelocity.normalized}");

                OnBallStruck?.Invoke(exitVelocity, _lastTimingQuality);
                CricketEvents.FireShotExecuted(_currentShotData.ShotName, _lastTimingQuality.ToString(), exitVelocity.magnitude);
            }
        }

        private void AnimateSwingArc(float progress)
        {
            if (_playerRig == null || _playerRig.BatMount == null) return;

            // Procedural downswing and follow-through rotation
            float swingAngle = Mathf.Lerp(-40f, 75f, progress);
            _playerRig.BatMount.localRotation = Quaternion.Euler(swingAngle, _currentShotData.BaseAzimuthAngle * 0.4f, 0);
        }

        public void ResetToReadyStance()
        {
            _currentState = BatsmanState.Ready;
            _hasHitCurrentDelivery = false;
            _swingTimer = 0f;
            _recoveryTimer = 0f;

            transform.position = _stancePosition;
            transform.rotation = Quaternion.Euler(0, 90f, 0); // Side-on stance facing off-side

            if (_playerRig != null && _playerRig.BatMount != null)
            {
                _playerRig.BatMount.localRotation = Quaternion.Euler(30f, 0, 0);
            }
        }

        private void HandleDeliveryStarted(int over, int ball)
        {
            ResetToReadyStance();
        }

        private void HandleWicketFallen(string batter, string bowler, string type)
        {
            _currentState = BatsmanState.Dismissed;
        }

        public void SetBallReference(CricketBall ball)
        {
            _ball = ball;
        }
    }
}
