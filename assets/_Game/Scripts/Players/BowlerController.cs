using System;
using UnityEngine;
using CricketLegends.Core;
using CricketLegends.Gameplay;
using CricketLegends.Physics;
using CricketLegends.Presentation;

namespace CricketLegends.Players
{
    public enum BowlerState
    {
        Idle,
        RunUp,
        Delivery,
        FollowThrough,
        Reset
    }

    /// <summary>
    /// Controls bowler approach, run-up stride, arm gather, precision ball release,
    /// and follow-through mechanics.
    /// Strictly guarantees the ball is released only once per delivery sequence.
    /// </summary>
    public class BowlerController : MonoBehaviour
    {
        [Header("State")]
        [SerializeField] private BowlerState _currentState = BowlerState.Idle;
        [SerializeField] private bool _hasReleasedBall = false;

        [Header("Subsystems & Entities")]
        [SerializeField] private CricketBall _ball;
        [SerializeField] private BowlingDelivery _currentDelivery;
        [SerializeField] private Transform _handReleasePoint;

        [Header("Run-Up Configuration")]
        [SerializeField] private Vector3 _runupStartPos = PitchCoordinates.BowlerRunupStartPosition; // (0.8, 0, -25.0)
        [SerializeField] private Vector3 _creaseReleasePos = new Vector3(0.65f, 0f, -10.06f);
        [SerializeField] private Vector3 _followThroughEndPos = new Vector3(0.50f, 0f, -7.50f);
        [SerializeField] private float _runupDuration = 1.6f;
        [SerializeField] private float _followThroughDuration = 0.8f;

        private float _stateTimer = 0f;
        private int _deliveryCounter = 0;

        public BowlerState CurrentState => _currentState;
        public bool HasReleasedBall => _hasReleasedBall;
        public CricketBall Ball => _ball;

        public event Action<BowlingDelivery> OnBallReleased;
        public event Action OnBowlerSequenceCompleted;

        private void Awake()
        {
            ResetToIdle();
        }

        private void Update()
        {
            UpdateBowlerSequence();
        }

        public void StartDeliverySequence(BowlingDelivery delivery)
        {
            if (_currentState != BowlerState.Idle)
            {
                CricketLogger.LogWarning(LogChannel.Players,
                    $"Cannot start bowling sequence: Bowler is currently in [{_currentState}] state.");
                return;
            }

            _currentDelivery = delivery != null ? delivery : BowlingDelivery.CreatePreset(DeliveryLength.GoodLength);
            _deliveryCounter++;
            _hasReleasedBall = false;
            _stateTimer = 0f;

            // Reset ball to bowler's hand
            if (_ball != null)
            {
                Vector3 handPos = _handReleasePoint != null ? _handReleasePoint.position : transform.position + new Vector3(0, 1.8f, 0);
                _ball.ResetToHand(handPos);
            }

            _currentState = BowlerState.RunUp;
            CricketLogger.LogInfo(LogChannel.Players,
                $"Bowler run-up started for Delivery #{_deliveryCounter} ({_currentDelivery.Length}, {_currentDelivery.SpeedKmh} km/h).");
        }

        private void UpdateBowlerSequence()
        {
            switch (_currentState)
            {
                case BowlerState.RunUp:
                    _stateTimer += Time.deltaTime;
                    float runProgress = Mathf.Clamp01(_stateTimer / _runupDuration);

                    // Interpolate bowler position along pitch run-up track
                    transform.position = Vector3.Lerp(_runupStartPos, _creaseReleasePos, runProgress);

                    // Minor running stride bounce
                    float verticalBounce = Mathf.Abs(Mathf.Sin(runProgress * Mathf.PI * 6f)) * 0.12f;
                    transform.position += Vector3.up * verticalBounce;

                    // Update ball position in hand during run-up
                    if (_ball != null && !_hasReleasedBall)
                    {
                        Vector3 handPos = _handReleasePoint != null ? _handReleasePoint.position : transform.position + new Vector3(0.2f, 1.6f, 0);
                        _ball.transform.position = handPos;
                    }

                    // Trigger release stride at the popping crease (at 90% progress)
                    if (runProgress >= 0.92f && !_hasReleasedBall)
                    {
                        ExecuteBallRelease();
                        _currentState = BowlerState.Delivery;
                    }
                    break;

                case BowlerState.Delivery:
                    _stateTimer += Time.deltaTime;
                    if (_stateTimer >= _runupDuration)
                    {
                        _stateTimer = 0f;
                        _currentState = BowlerState.FollowThrough;
                    }
                    break;

                case BowlerState.FollowThrough:
                    _stateTimer += Time.deltaTime;
                    float followProgress = Mathf.Clamp01(_stateTimer / _followThroughDuration);
                    transform.position = Vector3.Lerp(_creaseReleasePos, _followThroughEndPos, followProgress);

                    if (followProgress >= 1.0f)
                    {
                        _currentState = BowlerState.Reset;
                        OnBowlerSequenceCompleted?.Invoke();
                    }
                    break;

                case BowlerState.Reset:
                    // Waiting for next ball instruction or automatic reset
                    break;
            }
        }

        private void ExecuteBallRelease()
        {
            if (_hasReleasedBall) return;
            _hasReleasedBall = true;

            if (_ball != null && _currentDelivery != null)
            {
                // Launch ball with calibrated physics velocity
                _ball.LaunchDelivery(_currentDelivery, _deliveryCounter);
                OnBallReleased?.Invoke(_currentDelivery);
            }
            else
            {
                CricketLogger.LogWarning(LogChannel.Players, "ExecuteBallRelease: Ball or Delivery is null!");
            }
        }

        /// <summary>
        /// Resets the bowler back to run-up start line for the next ball.
        /// </summary>
        public void ResetToIdle()
        {
            _currentState = BowlerState.Idle;
            _hasReleasedBall = false;
            _stateTimer = 0f;
            transform.position = _runupStartPos;
            transform.rotation = Quaternion.identity; // Facing forward (+Z)

            if (_ball != null)
            {
                Vector3 handPos = transform.position + new Vector3(0.2f, 1.6f, 0);
                _ball.ResetToHand(handPos);
            }
        }

        public void SetBallReference(CricketBall ball)
        {
            _ball = ball;
        }

        public void SetHandReleasePoint(Transform hand)
        {
            _handReleasePoint = hand;
        }
    }
}
