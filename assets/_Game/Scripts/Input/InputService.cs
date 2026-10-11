using System;
using System.Collections.Generic;
using UnityEngine;
using CricketLegends.Core;
using CricketLegends.Gameplay;

namespace CricketLegends.Input
{
    /// <summary>
    /// Core input service handling keyboard and mouse inputs on PC.
    /// Implements IInputService and supports runtime key rebinding.
    /// </summary>
    public class InputService : MonoBehaviour, IInputService
    {
        [Header("Configurable Key Bindings")]
        [SerializeField] private KeyCode _executeShotKey = KeyCode.Space;
        [SerializeField] private KeyCode _pauseKey = KeyCode.Escape;
        [SerializeField] private KeyCode _quickAttackKey = KeyCode.W;
        [SerializeField] private KeyCode _quickDefenseKey = KeyCode.S;
        [SerializeField] private KeyCode _cameraKey = KeyCode.C;
        [SerializeField] private KeyCode _runKey = KeyCode.R;
        [SerializeField] private KeyCode _cancelRunKey = KeyCode.X;
        [SerializeField] private KeyCode _rebowlKey = KeyCode.T;

        [Header("State")]
        [SerializeField] private ShotType _selectedShot = ShotType.StraightDrive;
        [SerializeField] private BattingShotType _selectedBattingShot = BattingShotType.StraightDrive;
        [SerializeField] private Vector2 _aimDirection = Vector2.zero;
        [SerializeField] private float _creaseOffset = 0f;
        [SerializeField] private Vector2 _bowlingTargetOffset = Vector2.zero;
        [SerializeField] private DeliveryLength _selectedBowlingLength = DeliveryLength.GoodLength;
        [SerializeField] private DeliveryLine _selectedBowlingLine = DeliveryLine.OffStump;

        private readonly Dictionary<string, KeyCode> _rebindableKeys = new Dictionary<string, KeyCode>();

        // Properties
        public ShotType SelectedShot => _selectedShot;
        public BattingShotType SelectedBattingShot => _selectedBattingShot;
        public Vector2 AimDirection => _aimDirection;
        public float BatterCreaseOffset => _creaseOffset;
        public Vector2 BowlingTargetOffset => _bowlingTargetOffset;
        public DeliveryLength SelectedBowlingLength => _selectedBowlingLength;
        public DeliveryLine SelectedBowlingLine => _selectedBowlingLine;

        // Events
        public event Action OnActionTriggered;
        public event Action<ShotType> OnShotSelected;
        public event Action<BattingShotType> OnBattingShotSelected;
        public event Action<Vector2> OnAimAdjusted;
        public event Action OnDefensiveSelected;
        public event Action OnAttackingSelected;
        public event Action OnRunCalled;
        public event Action OnCancelRunCalled;
        public event Action<Vector2> OnBowlingTargetAdjusted;
        public event Action<DeliveryLength> OnBowlingLengthSelected;
        public event Action<DeliveryLine> OnBowlingLineSelected;
        public event Action<int> OnBowlingDeliverySelected;
        public event Action OnCameraCycled;
        public event Action OnPauseToggled;
        public event Action OnRebowlTriggered;

        private void Awake()
        {
            InitializeBindings();
        }

        private void InitializeBindings()
        {
            _rebindableKeys["ExecuteShot"] = _executeShotKey;
            _rebindableKeys["Pause"] = _pauseKey;
            _rebindableKeys["Attack"] = _quickAttackKey;
            _rebindableKeys["Defend"] = _quickDefenseKey;
            _rebindableKeys["Camera"] = _cameraKey;
            _rebindableKeys["Run"] = _runKey;
            _rebindableKeys["CancelRun"] = _cancelRunKey;
        }

        public void RebindKey(string actionName, KeyCode newKey)
        {
            if (_rebindableKeys.ContainsKey(actionName))
            {
                _rebindableKeys[actionName] = newKey;
                if (actionName == "ExecuteShot") _executeShotKey = newKey;
                else if (actionName == "Pause") _pauseKey = newKey;
                else if (actionName == "Attack") _quickAttackKey = newKey;
                else if (actionName == "Defend") _quickDefenseKey = newKey;
                else if (actionName == "Run") _runKey = newKey;
                else if (actionName == "CancelRun") _cancelRunKey = newKey;
                CricketLogger.LogInfo(LogChannel.Input, $"Action [{actionName}] rebound to key [{newKey}].");
            }
        }

        public KeyCode GetBoundKey(string actionName)
        {
            return _rebindableKeys.TryGetValue(actionName, out var key) ? key : KeyCode.None;
        }

        private void Update()
        {
            ProcessKeyboardInputs();
        }

        private void ProcessKeyboardInputs()
        {
            // 1. Primary Action: Execute Shot or Release Ball
            if (UnityEngine.Input.GetKeyDown(_executeShotKey) || UnityEngine.Input.GetKeyDown(KeyCode.Return))
            {
                ExecuteShot();
            }

            // 2. Aim Adjustment: A / D or Arrow Keys
            float horizontalAim = 0f;
            if (UnityEngine.Input.GetKey(KeyCode.A) || UnityEngine.Input.GetKey(KeyCode.LeftArrow)) horizontalAim -= 1.0f;
            if (UnityEngine.Input.GetKey(KeyCode.D) || UnityEngine.Input.GetKey(KeyCode.RightArrow)) horizontalAim += 1.0f;

            float verticalAim = UnityEngine.Input.GetAxisRaw("Vertical");
            Vector2 newAim = new Vector2(horizontalAim, verticalAim).normalized;
            if (newAim != _aimDirection)
            {
                AdjustShotDirection(newAim);
            }

            // 3. Quick Mode Toggles
            if (UnityEngine.Input.GetKeyDown(_quickAttackKey)) SelectAttackingShot();
            else if (UnityEngine.Input.GetKeyDown(_quickDefenseKey)) SelectDefensiveShot();

            // 4. Number Keys (1..8) selecting canonical shot presets
            if (UnityEngine.Input.GetKeyDown(KeyCode.Alpha1)) SelectBattingShot(BattingShotType.ForwardDefense);
            else if (UnityEngine.Input.GetKeyDown(KeyCode.Alpha2)) SelectBattingShot(BattingShotType.BackFootDefense);
            else if (UnityEngine.Input.GetKeyDown(KeyCode.Alpha3)) SelectBattingShot(BattingShotType.StraightDrive);
            else if (UnityEngine.Input.GetKeyDown(KeyCode.Alpha4)) SelectBattingShot(BattingShotType.CoverDrive);
            else if (UnityEngine.Input.GetKeyDown(KeyCode.Alpha5)) SelectBattingShot(BattingShotType.OnDrive);
            else if (UnityEngine.Input.GetKeyDown(KeyCode.Alpha6)) SelectBattingShot(BattingShotType.Pull);
            else if (UnityEngine.Input.GetKeyDown(KeyCode.Alpha7)) SelectBattingShot(BattingShotType.Cut);
            else if (UnityEngine.Input.GetKeyDown(KeyCode.Alpha8)) SelectBattingShot(BattingShotType.LoftedAttack);

            // 5. Running Controls
            if (UnityEngine.Input.GetKeyDown(_runKey)) CallRun();
            if (UnityEngine.Input.GetKeyDown(_cancelRunKey)) CancelRun();

            // 6. Utility Hotkeys
            if (UnityEngine.Input.GetKeyDown(_cameraKey)) OnCameraCycled?.Invoke();
            if (UnityEngine.Input.GetKeyDown(_rebowlKey)) OnRebowlTriggered?.Invoke();
            if (UnityEngine.Input.GetKeyDown(_pauseKey)) PauseGame();
        }

        public void ExecuteShot() => OnActionTriggered?.Invoke();

        public void SelectBattingShot(BattingShotType shot)
        {
            _selectedBattingShot = shot;
            _selectedShot = MapToLegacyShotType(shot);
            OnBattingShotSelected?.Invoke(shot);
            OnShotSelected?.Invoke(_selectedShot);
        }

        public void SelectShot(ShotType shot)
        {
            _selectedShot = shot;
            _selectedBattingShot = MapFromLegacyShotType(shot);
            OnShotSelected?.Invoke(shot);
            OnBattingShotSelected?.Invoke(_selectedBattingShot);
        }

        public void AdjustShotDirection(Vector2 direction)
        {
            _aimDirection = direction;
            OnAimAdjusted?.Invoke(direction);
        }

        public void SelectDefensiveShot()
        {
            BattingShotType target = (_selectedBattingShot == BattingShotType.ForwardDefense)
                ? BattingShotType.BackFootDefense
                : BattingShotType.ForwardDefense;
            SelectBattingShot(target);
            OnDefensiveSelected?.Invoke();
        }

        public void SelectAttackingShot()
        {
            BattingShotType target = (_selectedBattingShot == BattingShotType.StraightDrive)
                ? BattingShotType.LoftedAttack
                : BattingShotType.StraightDrive;
            SelectBattingShot(target);
            OnAttackingSelected?.Invoke();
        }

        public void CallRun() => OnRunCalled?.Invoke();
        public void CancelRun() => OnCancelRunCalled?.Invoke();

        public void AdjustBowlingTarget(Vector2 target)
        {
            _bowlingTargetOffset = target;
            OnBowlingTargetAdjusted?.Invoke(target);
        }

        public void SelectBowlingLength(DeliveryLength length)
        {
            _selectedBowlingLength = length;
            OnBowlingLengthSelected?.Invoke(length);
        }

        public void SelectBowlingLine(DeliveryLine line)
        {
            _selectedBowlingLine = line;
            OnBowlingLineSelected?.Invoke(line);
        }

        public void SelectBowlingDelivery(int deliveryIndex)
        {
            OnBowlingDeliverySelected?.Invoke(deliveryIndex);
        }

        public void PauseGame()
        {
            CricketLogger.LogInfo(LogChannel.Input, "Pause key triggered.");
            OnPauseToggled?.Invoke();
        }

        private ShotType MapToLegacyShotType(BattingShotType shot)
        {
            switch (shot)
            {
                case BattingShotType.ForwardDefense:
                case BattingShotType.BackFootDefense:
                    return ShotType.Defensive;
                case BattingShotType.StraightDrive:
                case BattingShotType.OnDrive:
                    return ShotType.StraightDrive;
                case BattingShotType.CoverDrive:
                    return ShotType.CoverDrive;
                case BattingShotType.Pull:
                    return ShotType.PullShot;
                case BattingShotType.Cut:
                    return ShotType.CutShot;
                case BattingShotType.LoftedAttack:
                default:
                    return ShotType.LoftedAttack;
            }
        }

        private BattingShotType MapFromLegacyShotType(ShotType shot)
        {
            switch (shot)
            {
                case ShotType.Defensive: return BattingShotType.ForwardDefense;
                case ShotType.StraightDrive: return BattingShotType.StraightDrive;
                case ShotType.CoverDrive: return BattingShotType.CoverDrive;
                case ShotType.PullShot: return BattingShotType.Pull;
                case ShotType.CutShot: return BattingShotType.Cut;
                case ShotType.LoftedAttack:
                default:
                    return BattingShotType.LoftedAttack;
            }
        }
    }
}
