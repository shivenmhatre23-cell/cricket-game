using System;
using UnityEngine;
using CricketLegends.Core;
using CricketLegends.Gameplay;
using CricketLegends.Presentation;

namespace CricketLegends.Physics
{
    public enum BallState
    {
        HeldInHand,
        InFlight,
        Pitched,
        Struck,
        Fielded,
        Dead
    }

    /// <summary>
    /// Physical simulation component for the cricket ball.
    /// Manages Rigidbody dynamics, aerodynamics (swing/spin), bounce restitution,
    /// and prevents duplicate outcome scoring.
    /// </summary>
    [RequireComponent(typeof(Rigidbody))]
    [RequireComponent(typeof(SphereCollider))]
    public class CricketBall : MonoBehaviour
    {
        [Header("Physical State")]
        [SerializeField] private BallState _state = BallState.HeldInHand;
        [SerializeField] private int _deliveryId = 0;
        [SerializeField] private int _bounceCount = 0;
        [SerializeField] private bool _isOutcomeResolved = false;

        [Header("Delivery Tracking")]
        [SerializeField] private BowlingDelivery _currentDelivery;
        [SerializeField] private Vector3 _firstBouncePosition;
        [SerializeField] private Vector3 _lastContactPoint;
        [SerializeField] private string _lastContactObject = "None";

        [Header("Debug Visualization")]
        [SerializeField] private bool _showDebugGizmos = true;
        [SerializeField] private Color _trajectoryColor = Color.cyan;

        private Rigidbody _rigidbody;
        private SphereCollider _sphereCollider;
        private PhysicMaterial _physicsMaterial;

        // Public Properties
        public BallState State => _state;
        public int DeliveryId => _deliveryId;
        public int BounceCount => _bounceCount;
        public bool IsOutcomeResolved => _isOutcomeResolved;
        public Vector3 Position => transform.position;
        public Vector3 Velocity => _rigidbody != null ? _rigidbody.linearVelocity : Vector3.zero;
        public Vector3 FirstBouncePosition => _firstBouncePosition;
        public Vector3 LastContactPoint => _lastContactPoint;
        public BowlingDelivery CurrentDelivery => _currentDelivery;

        public event Action<Vector3, Vector3> OnPitchBounced;
        public event Action<Collision> OnBatStruck;
        public event Action<Collision> OnWicketsHit;

        private void Awake()
        {
            SetupPhysicsComponents();
        }

        private void SetupPhysicsComponents()
        {
            _rigidbody = GetComponent<Rigidbody>();
            _sphereCollider = GetComponent<SphereCollider>();

            // MCC Official Standard Specifications
            _rigidbody.mass = 0.160f; // 160 grams
            _rigidbody.linearDamping = 0.05f; // Slight air resistance
            _rigidbody.angularDamping = 0.08f;
            _rigidbody.interpolation = RigidbodyInterpolation.Interpolate;
            _rigidbody.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;

            _sphereCollider.radius = 0.036f; // 7.2 cm diameter

            // Setup Physics Material for realistic turf restitution
            _physicsMaterial = new PhysicMaterial("Mat_CricketBall_Physics")
            {
                bounciness = 0.62f,
                bounceCombine = PhysicMaterialCombine.Multiply,
                dynamicFriction = 0.35f,
                staticFriction = 0.40f,
                frictionCombine = PhysicMaterialCombine.Average
            };
            _sphereCollider.material = _physicsMaterial;

            // Set tag for reliable detection
            gameObject.tag = CollisionLayers.TagBall;
        }

        private void FixedUpdate()
        {
            // Apply aerodynamic lateral swing while ball is in initial flight (prior to pitch contact)
            if (_state == BallState.InFlight && _currentDelivery != null)
            {
                float swingAccel = _currentDelivery.SwingAmount;
                if (Mathf.Abs(swingAccel) > 0.01f)
                {
                    // Apply continuous lateral Magnus/seam force in FixedUpdate (F = m * a)
                    Vector3 swingForce = new Vector3(swingAccel * _rigidbody.mass, 0f, 0f);
                    _rigidbody.AddForce(swingForce, ForceMode.Force);
                }
            }

            // Boundary containment check
            if (_state == BallState.InFlight || _state == BallState.Pitched || _state == BallState.Struck)
            {
                if (PitchCoordinates.IsBeyondBoundary(transform.position) && !_isOutcomeResolved)
                {
                    ResolveBoundaryOutcome();
                }
            }
        }

        /// <summary>
        /// Releases the ball from bowler's hand with calculated launch velocity.
        /// Guaranteed to only release once per delivery.
        /// </summary>
        public bool LaunchDelivery(BowlingDelivery delivery, int deliveryId)
        {
            if (_state != BallState.HeldInHand && _state != BallState.Dead)
            {
                CricketLogger.LogWarning(LogChannel.Physics,
                    $"Cannot launch ball: Already active in state [{_state}].");
                return false;
            }

            _currentDelivery = delivery;
            _deliveryId = deliveryId;
            _bounceCount = 0;
            _isOutcomeResolved = false;
            _lastContactObject = "Bowler Hand";

            // Set release transform
            transform.position = delivery.ReleasePosition;

            // Compute precision release velocity to hit target pitch point
            Vector3 targetPitchPos = delivery.IntendedPitchLocation;
            // Apply slight random spread based on accuracy parameter
            if (delivery.LandingSpreadRadius > 0.01f)
            {
                Vector2 randomOffset = UnityEngine.Random.insideUnitCircle * delivery.LandingSpreadRadius;
                targetPitchPos += new Vector3(randomOffset.x, 0f, randomOffset.y);
            }

            Vector3 launchVelocity = BallTrajectoryPredictor.CalculateLaunchVelocity(
                delivery.ReleasePosition,
                targetPitchPos,
                delivery.SpeedMps,
                delivery.SwingAmount
            );

            // Enable dynamic physics
            _rigidbody.isKinematic = false;
            _rigidbody.linearVelocity = launchVelocity;
            _rigidbody.angularVelocity = new Vector3(0, 0, -delivery.SpeedMps * 2.5f); // Backspin

            _state = BallState.InFlight;

            CricketLogger.LogInfo(LogChannel.Physics,
                $"Ball Delivered #{deliveryId}: Speed={delivery.SpeedKmh:F1} km/h, TargetZ={targetPitchPos.z:F2}m");

            CricketEvents.FireBallDelivered(transform.position, delivery.SpeedKmh);
            return true;
        }

        private void OnCollisionEnter(Collision collision)
        {
            _lastContactPoint = collision.contacts.Length > 0 ? collision.contacts[0].point : transform.position;
            _lastContactObject = collision.gameObject.name;

            // 1. Pitch Contact (First bounce)
            if (CollisionLayers.IsPitchSurface(collision.gameObject))
            {
                _bounceCount++;

                if (_bounceCount == 1 && _state == BallState.InFlight)
                {
                    _state = BallState.Pitched;
                    _firstBouncePosition = _lastContactPoint;

                    // Apply spin deviation upon pitching if delivery has spin
                    if (_currentDelivery != null && Mathf.Abs(_currentDelivery.SpinDeviation) > 0.01f)
                    {
                        Vector3 vel = _rigidbody.linearVelocity;
                        vel.x += _currentDelivery.SpinDeviation; // Sharp lateral kick off turf
                        _rigidbody.linearVelocity = vel;
                    }

                    CricketLogger.LogDiagnostic(LogChannel.Physics,
                        $"Ball Pitched at Z={_firstBouncePosition.z:F2}m, X={_firstBouncePosition.x:F2}m.");

                    CricketEvents.FireBallPitched(_firstBouncePosition, _rigidbody.linearVelocity, _currentDelivery?.Length.ToString());
                    OnPitchBounced?.Invoke(_firstBouncePosition, _rigidbody.linearVelocity);
                }
            }
            // 2. Bat Contact
            else if (CollisionLayers.IsBatSurface(collision.gameObject))
            {
                _state = BallState.Struck;
                CricketLogger.LogInfo(LogChannel.Physics, "BAT-BALL IMPACT! Struck by batsman.");
                OnBatStruck?.Invoke(collision);
                CricketEvents.FireBallHit(_lastContactPoint, _rigidbody.linearVelocity);
            }
            // 3. Wickets Contact
            else if (CollisionLayers.IsWicketsSurface(collision.gameObject))
            {
                CricketLogger.LogInfo(LogChannel.Physics, "BALL HIT WICKETS! Stumps struck.");
                OnWicketsHit?.Invoke(collision);
            }
        }

        public void ApplyBatImpulse(Vector3 exitVelocity)
        {
            _state = BallState.Struck;
            _rigidbody.linearVelocity = exitVelocity;
            _rigidbody.angularVelocity = UnityEngine.Random.insideUnitSphere * 15f;
            _lastContactObject = "Bat";
        }

        private void ResolveBoundaryOutcome()
        {
            if (_isOutcomeResolved) return;
            _isOutcomeResolved = true;

            bool isAerialSix = _bounceCount == 0 || (_firstBouncePosition.z > PitchCoordinates.BoundaryRadiusZ);
            int runs = isAerialSix ? 6 : 4;

            CricketLogger.LogInfo(LogChannel.Gameplay,
                isAerialSix ? "🚀 MAXIMUM! Ball cleared boundary on full for SIX!" : "⚡ BOUNDARY FOUR! Ball reached boundary rope.");

            _state = BallState.Dead;
        }

        /// <summary>
        /// Resets ball to held state in bowler hand.
        /// </summary>
        public void ResetToHand(Vector3 handPosition)
        {
            _state = BallState.HeldInHand;
            _bounceCount = 0;
            _isOutcomeResolved = false;
            _lastContactObject = "Bowler Hand";

            if (_rigidbody != null)
            {
                _rigidbody.isKinematic = true;
                _rigidbody.linearVelocity = Vector3.zero;
                _rigidbody.angularVelocity = Vector3.zero;
            }

            transform.position = handPosition;
        }

        public void MarkOutcomeResolved()
        {
            _isOutcomeResolved = true;
        }

        public void SetStateForTesting(BallState state, int bounceCount = 0)
        {
            _state = state;
            _bounceCount = bounceCount;
        }

        private void OnDestroy()
        {
            if (_physicsMaterial != null)
            {
                DestroyImmediate(_physicsMaterial);
                _physicsMaterial = null;
            }
        }

#if UNITY_EDITOR
        private void OnDrawGizmos()
        {
            if (!_showDebugGizmos) return;

            // Draw current ball velocity vector
            if (Application.isPlaying && _rigidbody != null && _rigidbody.linearVelocity.sqrMagnitude > 0.1f)
            {
                Gizmos.color = Color.yellow;
                Gizmos.DrawRay(transform.position, _rigidbody.linearVelocity * 0.1f);
            }

            // Draw intended pitch mark
            if (_currentDelivery != null)
            {
                Gizmos.color = Color.red;
                Gizmos.DrawWireSphere(_currentDelivery.IntendedPitchLocation, 0.25f);

                // Sample trajectory path
                Vector3[] path = BallTrajectoryPredictor.SampleTrajectory(
                    _currentDelivery.ReleasePosition,
                    _rigidbody != null && _rigidbody.linearVelocity.sqrMagnitude > 1f ? _rigidbody.linearVelocity : Vector3.forward * 35f,
                    _currentDelivery.SwingAmount
                );

                Gizmos.color = _trajectoryColor;
                for (int i = 0; i < path.Length - 1; i++)
                {
                    Gizmos.DrawLine(path[i], path[i + 1]);
                }
            }

            // Draw first bounce position marker
            if (_bounceCount > 0)
            {
                Gizmos.color = Color.green;
                Gizmos.DrawSphere(_firstBouncePosition, 0.08f);
            }
        }
#endif
    }
}
