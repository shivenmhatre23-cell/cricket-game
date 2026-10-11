using System;
using UnityEngine;
using CricketLegends.Core;
using CricketLegends.Physics;
using CricketLegends.Presentation;

namespace CricketLegends.AI
{
    public enum FielderState
    {
        Ready,
        Reacting,
        Chasing,
        Catching,
        PickingUp,
        Throwing,
        Returning
    }

    /// <summary>
    /// Individual fielder component executing motor actions, pursuit, catch attempts,
    /// ground gathering, and return throws. Reusable across all 11 fielding positions.
    /// </summary>
    public class FielderController : MonoBehaviour
    {
        [Header("Identity & Role")]
        [SerializeField] private string _roleName = "Cover";
        [SerializeField] private Vector3 _homePosition;
        [SerializeField] private bool _isWicketkeeper = false;
        [SerializeField] private bool _isBowler = false;

        [Header("Physical Attributes")]
        [SerializeField] private float _reactionDelay = 0.25f; // Seconds before starting sprint
        [SerializeField] private float _sprintSpeed = 7.5f;   // 7.5 m/s (~27 km/h)
        [SerializeField] private float _catchSkill = 0.88f;

        [Header("State")]
        [SerializeField] private FielderState _currentState = FielderState.Ready;
        [SerializeField] private bool _isAssignedFielder = false;
        [SerializeField] private Vector3 _targetInterceptPoint;

        private float _reactionTimer = 0f;
        private Vector3 _currentVelocity = Vector3.zero;
        private CricketBall _activeBall;

        public string RoleName => _roleName;
        public Vector3 HomePosition => _homePosition;
        public bool IsWicketkeeper => _isWicketkeeper;
        public bool IsBowler => _isBowler;
        public FielderState CurrentState => _currentState;
        public bool IsAssignedFielder => _isAssignedFielder;

        public event Action<FielderController, CricketBall> OnCatchTaken;
        public event Action<FielderController, CricketBall> OnCatchDropped;
        public event Action<FielderController, CricketBall, ThrowTargetEnd> OnBallThrown;

        private void Awake()
        {
            if (_homePosition == Vector3.zero)
            {
                _homePosition = transform.position;
            }
        }

        public void Configure(string role, Vector3 homePos, bool isKeeper = false, bool isBowler = false)
        {
            _roleName = role;
            _homePosition = homePos;
            _isWicketkeeper = isKeeper;
            _isBowler = isBowler;
            transform.position = homePos;
            transform.LookAt(PitchCoordinates.StrikerWicketsPosition);
        }

        public void AssignToChase(Vector3 targetPoint, CricketBall ball)
        {
            _isAssignedFielder = true;
            _targetInterceptPoint = targetPoint;
            _activeBall = ball;
            _reactionTimer = 0f;
            _currentState = FielderState.Reacting;
        }

        public void Unassign()
        {
            _isAssignedFielder = false;
            _activeBall = null;
            if (_currentState != FielderState.Ready)
            {
                _currentState = FielderState.Returning;
            }
        }

        private void Update()
        {
            UpdateFielderStateMachine();
        }

        private void UpdateFielderStateMachine()
        {
            switch (_currentState)
            {
                case FielderState.Ready:
                    // Waiting in fielding stance facing striker
                    transform.LookAt(PitchCoordinates.StrikerWicketsPosition);
                    break;

                case FielderState.Reacting:
                    _reactionTimer += Time.deltaTime;
                    if (_reactionTimer >= _reactionDelay)
                    {
                        _currentState = FielderState.Chasing;
                    }
                    break;

                case FielderState.Chasing:
                    ExecuteChase();
                    break;

                case FielderState.Returning:
                    ExecuteReturn();
                    break;
            }
        }

        private void ExecuteChase()
        {
            if (_activeBall != null)
            {
                // Dynamic pursuit towards ball
                _targetInterceptPoint = BallChaseBehaviour.CalculateInterceptPoint(
                    transform.position,
                    _activeBall.Position,
                    _activeBall.Velocity,
                    _sprintSpeed
                );
            }

            // Move toward intercept point
            transform.position = BallChaseBehaviour.MoveTowardTarget(
                transform.position,
                _targetInterceptPoint,
                ref _currentVelocity,
                Time.deltaTime,
                _sprintSpeed
            );

            if (_currentVelocity.sqrMagnitude > 0.1f)
            {
                transform.LookAt(transform.position + _currentVelocity);
            }

            if (_activeBall == null) return;

            // 1. Check for Catch if ball is airborne
            if (_activeBall.BounceCount == 0 && (_activeBall.State == BallState.InFlight || _activeBall.State == BallState.Struck))
            {
                var catchResult = CatchingBehaviour.EvaluateCatchAttempt(_activeBall, transform.position, _reactionTimer, _catchSkill);
                if (catchResult == CatchAttemptResult.Success)
                {
                    _currentState = FielderState.Catching;
                    _currentVelocity = Vector3.zero;
                    CricketLogger.LogInfo(LogChannel.AI, $"CATCH TAKEN! {_roleName} took a brilliant catch! 🧤");
                    OnCatchTaken?.Invoke(this, _activeBall);
                    return;
                }
                else if (catchResult == CatchAttemptResult.Dropped)
                {
                    CricketLogger.LogInfo(LogChannel.AI, $"DROPPED CATCH! {_roleName} fumbled the catch! 😱");
                    OnCatchDropped?.Invoke(this, _activeBall);
                    // Ball continues to bounce, fielder resumes ground chase
                }
            }

            // 2. Check for Ground Pickup if ball has bounced
            if (_activeBall.BounceCount > 0)
            {
                var pickupResult = PickupBehaviour.EvaluatePickup(_activeBall, transform.position);
                if (pickupResult == PickupResult.CleanPickup)
                {
                    _currentState = FielderState.PickingUp;
                    _currentVelocity = Vector3.zero;
                    CricketLogger.LogInfo(LogChannel.AI, $"{_roleName} cleanly fielded the ball on the ground.");
                    ExecuteThrow();
                }
            }
        }

        private void ExecuteThrow()
        {
            _currentState = FielderState.Throwing;

            // Select optimal throw end (Default to Striker End or Keeper)
            ThrowTargetEnd targetEnd = ThrowController.SelectOptimalThrowTarget(transform.position, 0.4f);
            Vector3 targetPos = ThrowController.GetTargetWorldPosition(targetEnd);

            if (_activeBall != null)
            {
                Vector3 throwVel = ThrowController.CalculateThrowVelocity(transform.position + Vector3.up * 1.5f, targetPos);
                _activeBall.ApplyBatImpulse(throwVel); // Launch ball toward stumps
                OnBallThrown?.Invoke(this, _activeBall, targetEnd);
            }

            _currentState = FielderState.Returning;
        }

        private void ExecuteReturn()
        {
            transform.position = Vector3.MoveTowards(transform.position, _homePosition, 3.5f * Time.deltaTime);
            transform.LookAt(_homePosition);

            if (Vector3.Distance(transform.position, _homePosition) < 0.1f)
            {
                transform.position = _homePosition;
                _currentState = FielderState.Ready;
            }
        }

        public void ResetToHomePosition()
        {
            _currentState = FielderState.Ready;
            _isAssignedFielder = false;
            _currentVelocity = Vector3.zero;
            _reactionTimer = 0f;
            _activeBall = null;
            transform.position = _homePosition;
            transform.LookAt(PitchCoordinates.StrikerWicketsPosition);
        }
    }
}
