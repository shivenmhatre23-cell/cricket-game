# Cricket Legends — Phase 5: Fielding & Dismissals Checklist

## Architecture & Components
- [x] Create modular `FielderController` with state machine (`Ready`, `Reacting`, `Chasing`, `Catching`, `PickingUp`, `Throwing`, `Returning`).
- [x] Create `FieldingPositionsData` supporting 11-player presets (`Balanced`, `Attacking`, `Defensive`).
- [x] Create `BallChaseBehaviour` with boundary-clamped interception prediction and sprint kinetics (~7.5 m/s).
- [x] Create `CatchingBehaviour` enforcing strict unbounced airborne invariant (`BounceCount == 0`) and reach volume.
- [x] Create `PickupBehaviour` for ground gathering with fumble risk on high-velocity ground balls.
- [x] Create `ThrowController` calculating ballistic launch vectors toward target stumps (`StrikerEnd` vs `BowlerEnd`).
- [x] Create `FieldingCoordinator` managing 11 fielders, shot assignment on `CricketEvents.BallHit`, and delivery resets.

## Cricket Rules & Dismissal Engine
- [x] Create `RunOutTracker` calculating runner positions along pitch Z-axis and safe popping crease threshold crossing.
- [x] Create `CricketRulesValidator` centralizing dismissal adjudication (`Bowled`, `Caught`, `RunOut`, `Stumped`, `LBW`).
- [x] Implement strict **Single Dismissal per Delivery** invariant (`_isDismissalRecorded`).
- [x] Award zero wickets to bowler figures on Run-Out dismissals per MCC Law 38.
- [x] Integrate with `WicketsController` for bail dislodgement and broken wicket events.

## Automated Verification & Testing
- [x] Unit test: Airborne unbounced ball within reach volume records Caught dismissal (`Catching_AirborneUnbouncedBall_WithinReach_RecordsCaughtDismissal`).
- [x] Unit test: Bounced ball (`BounceCount > 0`) strictly rejects Caught dismissal (`Catching_BouncedBall_RejectsCaughtDismissal`).
- [x] Unit test: Ball out of reach volume returns `OutOfReach` (`Catching_OutOfReach_ReturnsOutOfReach`).
- [x] Unit test: Striker-end stumps broken causes Bowled dismissal (`Dismissals_Bowled_WhenStumpsBrokenOnStrikerEnd`).
- [x] Unit test: Single dismissal invariant rejects subsequent dismissal on same ball (`Dismissals_SingleDismissalInvariant_RejectsSubsequentDismissalOnSameBall`).
- [x] Unit test: Runner out of crease awards Run Out with no bowler credit (`RunOut_WhenRunnerOutsideCrease_AwardsRunOut`).
- [x] Unit test: Grounded runner safely inside crease rejects Run Out (`RunOut_WhenRunnerGroundedInsideCrease_RejectsRunOut`).
- [x] Unit test: Striker out of crease without run attempt awards Stumped (`Stumped_WhenStrikerOutOfCreaseAndNotRunning_AwardsStumped`).
- [x] Unit test: `FieldingCoordinator` correctly applies 11-player presets (`FieldingCoordinator_AppliesPresets_ConfiguresAll11Fielders`).
- [x] Unit test: `FieldingCoordinator` resets all fielders to ready stances at home positions (`FieldingCoordinator_ResetAllFielders_ReturnsAllFieldersToHomePositions`).
- [x] Regression testing: Web edition unit test suite passing 17/17 (`npm test`).
- [x] Regression testing: Web production build cleanly compiling (`npm run build`).
