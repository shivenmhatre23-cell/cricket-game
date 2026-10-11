using System;
using UnityEngine;
using CricketLegends.Gameplay;
using CricketLegends.Physics;
using CricketLegends.Players;
using CricketLegends.Presentation;
using CricketLegends.Rules;

namespace CricketLegends.AI
{
    /// <summary>
    /// Autonomous batting intelligence for computer-controlled batsmen when the user bowls.
    /// Estimates delivery trajectory, selects suitable shot presets from the 8 canonical shots,
    /// tunes aggression based on match situation, and executes strokes via the BatsmanController.
    /// STRICT INVARIANT: Uses the exact same collision detection, physics restitution,
    /// and timing systems as human players. Never teleports or forces dismissals.
    /// </summary>
    public class BattingDecisionMaker : MonoBehaviour
    {
        [Header("Controller Dependency")]
        [SerializeField] private BatsmanController _batsmanController;

        [Header("Configuration")]
        [SerializeField] private DifficultyLevel _difficulty = DifficultyLevel.Medium;
        [SerializeField] private TacticalAggression _aggression = TacticalAggression.Moderate;

        [Header("Tuned Parameters (Documented Difficulty Calibration)")]
        [SerializeField] private float _reactionDelay = 0.22f; // Seconds before downswing trigger
        [SerializeField] private float _mistakeProbability = 0.10f;

        private BowlingDelivery _incomingDelivery;
        private CricketBall _activeBall;
        private float _deliveryFlightTimer = 0f;
        private bool _hasInitiatedSwing = false;

        public DifficultyLevel Difficulty => _difficulty;
        public TacticalAggression Aggression => _aggression;
        public float ReactionDelay => _reactionDelay;
        public float MistakeProbability => _mistakeProbability;

        private void Awake()
        {
            if (_batsmanController == null)
            {
                _batsmanController = GetComponent<BatsmanController>();
            }
        }

        private void OnEnable()
        {
            CricketEvents.BallDelivered += HandleBallDelivered;
            CricketEvents.DeliveryCompleted += HandleDeliveryCompleted;
        }

        private void OnDisable()
        {
            CricketEvents.BallDelivered -= HandleBallDelivered;
            CricketEvents.DeliveryCompleted -= HandleDeliveryCompleted;
        }

        public void Configure(BatsmanController controller, DifficultyLevel difficulty)
        {
            _batsmanController = controller;
            _difficulty = difficulty;

            switch (difficulty)
            {
                case DifficultyLevel.Easy:
                    _reactionDelay = 0.35f;
                    _mistakeProbability = 0.25f; // Frequent edges/mistimings
                    break;

                case DifficultyLevel.Hard:
                    _reactionDelay = 0.12f;
                    _mistakeProbability = 0.03f; // Elite precision
                    break;

                case DifficultyLevel.Medium:
                default:
                    _reactionDelay = 0.22f;
                    _mistakeProbability = 0.10f;
                    break;
            }
        }

        public void SetAggression(TacticalAggression aggression)
        {
            _aggression = aggression;
        }

        private void HandleBallDelivered(Vector3 releasePos, float speedKmh)
        {
            _activeBall = FindFirstObjectByType<CricketBall>();
            if (_activeBall != null)
            {
                _incomingDelivery = _activeBall.CurrentDelivery;
            }

            _deliveryFlightTimer = 0f;
            _hasInitiatedSwing = false;

            // Evaluate incoming trajectory and select optimal stroke
            DecideShotSelection();
        }

        private void HandleDeliveryCompleted(DeliveryResultData result)
        {
            _incomingDelivery = null;
            _activeBall = null;
            _hasInitiatedSwing = false;
        }

        private void Update()
        {
            if (_activeBall == null || _hasInitiatedSwing || _batsmanController == null) return;

            _deliveryFlightTimer += Time.deltaTime;

            // Trigger shot execution when ball approaches popping crease strike zone
            float ballZ = _activeBall.transform.position.z;
            float strikeCreaseZ = PitchCoordinates.StrikerPoppingCreaseZ;

            // Ball is approaching strike zone within trigger window
            if (ballZ >= (strikeCreaseZ - 2.8f) && _deliveryFlightTimer >= _reactionDelay)
            {
                _hasInitiatedSwing = true;
                _batsmanController.TryExecuteShot();
            }
        }

        /// <summary>
        /// Estimates delivery trajectory (line and length) and chooses the appropriate shot.
        /// </summary>
        public BattingShotType DecideShotSelection()
        {
            if (_batsmanController == null) return BattingShotType.ForwardDefense;

            DeliveryLength length = _incomingDelivery != null ? _incomingDelivery.Length : DeliveryLength.GoodLength;
            float lineOffset = _incomingDelivery != null ? _incomingDelivery.LateralLineOffset : -0.10f;

            // 1. Check for realistic human error
            bool makeMistake = UnityEngine.Random.value < _mistakeProbability;
            if (makeMistake)
            {
                // Misjudge length or attempt high-risk stroke
                var mistakeShot = UnityEngine.Random.value < 0.5f ? BattingShotType.LoftedAttack : BattingShotType.Cut;
                _batsmanController.SelectShot(mistakeShot);
                _batsmanController.AdjustAim(UnityEngine.Random.insideUnitCircle * 0.4f);
                return mistakeShot;
            }

            // 2. High Aggression Overrides (Death overs or high RRR)
            if (_aggression == TacticalAggression.MaxAggression && (length == DeliveryLength.Full || length == DeliveryLength.GoodLength))
            {
                _batsmanController.SelectShot(BattingShotType.LoftedAttack);
                _batsmanController.AdjustAim(Vector2.zero);
                return BattingShotType.LoftedAttack;
            }

            // 3. Technical Line and Length Shot Mapping
            BattingShotType chosenShot;
            Vector2 aim = Vector2.zero;

            switch (length)
            {
                case DeliveryLength.Yorker:
                    // Block yorkers with Forward Defense
                    chosenShot = BattingShotType.ForwardDefense;
                    break;

                case DeliveryLength.Full:
                    if (lineOffset < -0.15f)
                    {
                        // Outside off stump -> Cover Drive
                        chosenShot = BattingShotType.CoverDrive;
                        aim = new Vector2(-0.3f, 0f);
                    }
                    else if (lineOffset > 0.10f)
                    {
                        // On pads / leg stump -> On Drive
                        chosenShot = BattingShotType.OnDrive;
                        aim = new Vector2(0.2f, 0f);
                    }
                    else
                    {
                        // Stumps / middle -> Straight Drive
                        chosenShot = (_aggression >= TacticalAggression.High)
                            ? BattingShotType.LoftedAttack
                            : BattingShotType.StraightDrive;
                    }
                    break;

                case DeliveryLength.GoodLength:
                    if (lineOffset < -0.25f && _aggression >= TacticalAggression.Moderate)
                    {
                        chosenShot = BattingShotType.Cut;
                        aim = new Vector2(-0.5f, 0f);
                    }
                    else if (_aggression == TacticalAggression.Low)
                    {
                        chosenShot = BattingShotType.ForwardDefense;
                    }
                    else
                    {
                        chosenShot = UnityEngine.Random.value < 0.6f ? BattingShotType.ForwardDefense : BattingShotType.StraightDrive;
                    }
                    break;

                case DeliveryLength.Short:
                    if (lineOffset < -0.15f)
                    {
                        // Short outside off -> Square Cut
                        chosenShot = BattingShotType.Cut;
                        aim = new Vector2(-0.6f, 0f);
                    }
                    else
                    {
                        // Short on body -> Pull Shot
                        chosenShot = BattingShotType.Pull;
                        aim = new Vector2(0.5f, 0f);
                    }
                    break;

                case DeliveryLength.Bouncer:
                default:
                    if (lineOffset > -0.10f && _aggression >= TacticalAggression.Moderate)
                    {
                        // Bouncer on body -> Pull Shot
                        chosenShot = BattingShotType.Pull;
                        aim = new Vector2(0.6f, 0f);
                    }
                    else
                    {
                        // Duck/defend bouncer
                        chosenShot = BattingShotType.BackFootDefense;
                    }
                    break;
            }

            _batsmanController.SelectShot(chosenShot);
            _batsmanController.AdjustAim(aim);
            return chosenShot;
        }
    }
}
