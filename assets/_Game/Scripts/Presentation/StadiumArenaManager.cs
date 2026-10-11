using UnityEngine;
using CricketLegends.Cameras;
using CricketLegends.Core;
using CricketLegends.Gameplay;
using CricketLegends.Input;
using CricketLegends.Physics;
using CricketLegends.Players;

namespace CricketLegends.Presentation
{
    /// <summary>
    /// Master presentation coordinator for the 3D Stadium scene.
    /// Wires together the StadiumBuilder, StadiumLightingManager, CameraDirector,
    /// CricketBall, BowlerController, and BatsmanController into a unified gameplay simulation.
    /// </summary>
    public class StadiumArenaManager : MonoBehaviour
    {
        [Header("Presentation Subsystems")]
        [SerializeField] private StadiumBuilder _stadiumBuilder;
        [SerializeField] private StadiumLightingManager _lightingManager;
        [SerializeField] private CameraDirector _cameraDirector;
        [SerializeField] private InputService _inputService;

        [Header("Gameplay Entities")]
        [SerializeField] private CricketBall _ball;
        [SerializeField] private BatsmanController _batsmanController;
        [SerializeField] private BowlerController _bowlerController;

        [Header("Spawned Player Models")]
        [SerializeField] private PlaceholderPlayerRig _strikerBatter;
        [SerializeField] private PlaceholderPlayerRig _bowlerPlayer;
        [SerializeField] private PlaceholderPlayerRig _wicketKeeper;

        [Header("Environment")]
        [SerializeField] private StadiumAtmosphere _initialAtmosphere = StadiumAtmosphere.DaySunny;

        public StadiumBuilder StadiumBuilder => _stadiumBuilder;
        public StadiumLightingManager LightingManager => _lightingManager;
        public CameraDirector CameraDirector => _cameraDirector;
        public BatsmanController BatsmanController => _batsmanController;
        public BowlerController BowlerController => _bowlerController;
        public CricketBall Ball => _ball;

        private void Awake()
        {
            ValidateSubsystems();
            SpawnPlayerModelsAndBall();
            WireGameplayAndInput();
        }

        private void Start()
        {
            if (_lightingManager != null)
            {
                _lightingManager.SetAtmosphere(_initialAtmosphere);
            }
        }

        private void ValidateSubsystems()
        {
            if (_stadiumBuilder == null)
            {
                _stadiumBuilder = GetComponentInChildren<StadiumBuilder>();
                if (_stadiumBuilder == null)
                {
                    GameObject sObj = new GameObject("Stadium_Builder");
                    sObj.transform.SetParent(transform);
                    _stadiumBuilder = sObj.AddComponent<StadiumBuilder>();
                }
            }

            if (_lightingManager == null)
            {
                _lightingManager = GetComponentInChildren<StadiumLightingManager>();
                if (_lightingManager == null)
                {
                    GameObject lObj = new GameObject("Stadium_Lighting_Manager");
                    lObj.transform.SetParent(transform);
                    _lightingManager = lObj.AddComponent<StadiumLightingManager>();

                    Light dirLight = FindFirstObjectByType<Light>();
                    if (dirLight != null && dirLight.type == LightType.Directional)
                    {
                        _lightingManager.SetSunLightReference(dirLight);
                    }
                }
            }

            if (_cameraDirector == null)
            {
                _cameraDirector = FindFirstObjectByType<CameraDirector>();
                if (_cameraDirector == null)
                {
                    Camera cam = Camera.main;
                    if (cam != null)
                    {
                        _cameraDirector = cam.gameObject.AddComponent<CameraDirector>();
                    }
                }
            }

            if (_inputService == null)
            {
                _inputService = FindFirstObjectByType<InputService>();
            }
        }

        private void SpawnPlayerModelsAndBall()
        {
            GameObject entitiesRoot = new GameObject("Gameplay_Entities");
            entitiesRoot.transform.SetParent(transform);

            // 1. Cricket Ball
            if (_ball == null)
            {
                GameObject ballObj = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                ballObj.name = "Cricket_Ball";
                ballObj.transform.SetParent(entitiesRoot.transform);
                ballObj.transform.localScale = Vector3.one * (0.036f * 2f);
                _ball = ballObj.AddComponent<CricketBall>();
                _ball.ResetToHand(PitchCoordinates.BowlerRunupStartPosition + new Vector3(0.2f, 1.8f, 0));
            }

            // 2. Striker Batsman at Batting Crease
            if (_strikerBatter == null)
            {
                GameObject batterObj = new GameObject("Player_Striker_Batsman");
                batterObj.transform.SetParent(entitiesRoot.transform);
                batterObj.transform.position = PitchCoordinates.BatterDefaultStancePosition;
                _strikerBatter = batterObj.AddComponent<PlaceholderPlayerRig>();
                _strikerBatter.SetKitColor(new Color(0.10f, 0.45f, 0.90f)); // Royal Blue Kit

                _batsmanController = batterObj.AddComponent<BatsmanController>();
                _batsmanController.SetBallReference(_ball);
            }

            // 3. Bowler at Run-up Start
            if (_bowlerPlayer == null)
            {
                GameObject bowlerObj = new GameObject("Player_Bowler");
                bowlerObj.transform.SetParent(entitiesRoot.transform);
                bowlerObj.transform.position = PitchCoordinates.BowlerRunupStartPosition;
                _bowlerPlayer = bowlerObj.AddComponent<PlaceholderPlayerRig>();
                _bowlerPlayer.SetKitColor(new Color(0.85f, 0.75f, 0.15f)); // Gold Kit

                _bowlerController = bowlerObj.AddComponent<BowlerController>();
                _bowlerController.SetBallReference(_ball);
            }

            // 4. Wicketkeeper behind stumps
            if (_wicketKeeper == null)
            {
                GameObject keeperObj = new GameObject("Player_Wicketkeeper");
                keeperObj.transform.SetParent(entitiesRoot.transform);
                keeperObj.transform.position = new Vector3(0f, 0f, 15.8f);
                _wicketKeeper = keeperObj.AddComponent<PlaceholderPlayerRig>();
                _wicketKeeper.SetKitColor(new Color(0.85f, 0.75f, 0.15f));
            }
        }

        private void WireGameplayAndInput()
        {
            if (_cameraDirector != null)
            {
                Transform strikerTransform = _strikerBatter != null ? _strikerBatter.transform : null;
                Transform bowlerTransform = _bowlerPlayer != null ? _bowlerPlayer.transform : null;
                Transform ballTransform = _ball != null ? _ball.transform : null;
                _cameraDirector.SetTrackingTargets(ballTransform, strikerTransform, bowlerTransform);
            }

            if (_inputService != null)
            {
                if (_cameraDirector != null)
                {
                    _inputService.OnCameraCycled += () => _cameraDirector.CycleNextMode();
                }

                if (_batsmanController != null)
                {
                    _inputService.OnActionTriggered += () =>
                    {
                        // If bowler is ready and ball is idle, trigger delivery; if ball is in flight, swing bat!
                        if (_ball != null && (_ball.State == BallState.InFlight || _ball.State == BallState.Pitched))
                        {
                            _batsmanController.TryExecuteShot();
                        }
                        else if (_bowlerController != null && _bowlerController.CurrentState == BowlerState.Idle)
                        {
                            var delivery = BowlingDelivery.CreatePreset(DeliveryLength.GoodLength, 136f);
                            _bowlerController.StartDeliverySequence(delivery);
                        }
                    };

                    _inputService.OnBattingShotSelected += (shot) => _batsmanController.SelectShot(shot);
                    _inputService.OnAimAdjusted += (aim) => _batsmanController.AdjustAim(aim);
                }

                if (_bowlerController != null)
                {
                    _inputService.OnRebowlTriggered += () =>
                    {
                        _bowlerController.ResetToIdle();
                        _batsmanController?.ResetToReadyStance();
                    };
                }
            }
        }

        public void ToggleDayNightAtmosphere()
        {
            if (_lightingManager == null) return;

            StadiumAtmosphere next = (_lightingManager.CurrentAtmosphere == StadiumAtmosphere.DaySunny)
                ? StadiumAtmosphere.NightFloodlights
                : StadiumAtmosphere.DaySunny;

            _lightingManager.SetAtmosphere(next);
        }
    }
}
