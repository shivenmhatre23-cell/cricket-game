using System;
using UnityEngine;
using CricketLegends.Gameplay;

namespace CricketLegends.Input
{
    public enum ShotType
    {
        Defensive = 1,
        StraightDrive = 2,
        CoverDrive = 3,
        PullShot = 4,
        CutShot = 5,
        LoftedAttack = 6
    }

    /// <summary>
    /// Abstract cross-platform gameplay input interface for PC, Android, and iOS.
    /// Exposes uniform actions for batting, bowling, running, camera, and menus.
    /// </summary>
    public interface IInputService
    {
        // Properties
        ShotType SelectedShot { get; }
        BattingShotType SelectedBattingShot { get; }
        Vector2 AimDirection { get; }
        float BatterCreaseOffset { get; }
        Vector2 BowlingTargetOffset { get; }
        DeliveryLength SelectedBowlingLength { get; }
        DeliveryLine SelectedBowlingLine { get; }

        // Batting Events
        event Action OnActionTriggered;
        event Action<ShotType> OnShotSelected;
        event Action<BattingShotType> OnBattingShotSelected;
        event Action<Vector2> OnAimAdjusted;
        event Action OnDefensiveSelected;
        event Action OnAttackingSelected;

        // Running Events
        event Action OnRunCalled;
        event Action OnCancelRunCalled;

        // Bowling Events
        event Action<Vector2> OnBowlingTargetAdjusted;
        event Action<DeliveryLength> OnBowlingLengthSelected;
        event Action<DeliveryLine> OnBowlingLineSelected;
        event Action<int> OnBowlingDeliverySelected;

        // System Events
        event Action OnCameraCycled;
        event Action OnPauseToggled;
        event Action OnRebowlTriggered;

        // Invocation Methods
        void SelectShot(ShotType shot);
        void SelectBattingShot(BattingShotType shot);
        void AdjustShotDirection(Vector2 direction);
        void ExecuteShot();
        void SelectDefensiveShot();
        void SelectAttackingShot();
        void CallRun();
        void CancelRun();
        void AdjustBowlingTarget(Vector2 target);
        void SelectBowlingLength(DeliveryLength length);
        void SelectBowlingLine(DeliveryLine line);
        void SelectBowlingDelivery(int deliveryIndex);
        void PauseGame();
    }
}
