# Cricket Legends — Phase 7: Bowling AI & Fielding Tactics Checklist

## Modular AI Architecture
- [x] Create `MatchSituationAnalyzer` (match phase, pressure index, batting/bowling aggression, field recommendations).
- [x] Create `BowlingDecisionMaker` (profiles, line, length, pace, swing/spin variations, situational counters).
- [x] Create `FieldPlacementManager` (dynamic shifts across `Attacking`, `Balanced`, `Defensive`, `BoundaryProtection`).
- [x] Create `FielderDecisionMaker` (difficulty calibration across all 11 fielders).
- [x] Create `BattingDecisionMaker` (autonomous AI batter for user bowling, trajectory estimation, canonical shot selection, realistic mistakes).
- [x] Enforce strict decoupling: AI never mutates scores, collision math, or teleports balls.

## Bowling AI Profiles & Tactics
- [x] `FastBowler` (138–150 km/h, good length, bouncers, death yorkers).
- [x] `SwingBowler` (126–137 km/h, full/good length, lateral in-swing/out-swing).
- [x] `SpinBowler` (84–98 km/h, full/good length, off-break/leg-break pitch spin deviation).
- [x] `DefensiveBowler` (116–128 km/h, wide 5th-stump channel, back of length).
- [x] Situational counter-tactics: Alter length after conceding boundaries.
- [x] Counter batter shot tendencies (e.g. pitch fuller against pull/cut lovers).

## Batting AI Intelligence
- [x] Estimates delivery line and length relative to stumps.
- [x] Maps yorkers to `ForwardDefense`.
- [x] Maps full deliveries to `CoverDrive`, `StraightDrive`, or `OnDrive`.
- [x] Maps short/bouncers to `Pull` or `Cut`.
- [x] Adjusts aggression (e.g. `LoftedAttack` in death overs or high RRR).
- [x] Uses standard `BatsmanController` and physical `BatCollisionResolver` (zero shortcuts).

## Fielding Tactics & Dynamic Presets
- [x] Implement `FieldPreset.BoundaryProtection` in `FieldingPositionsData`.
- [x] `FieldPlacementManager` dynamically shifts field preset between deliveries.
- [x] Shifts to `BoundaryProtection` on consecutive boundaries or death overs.
- [x] Shifts to `Attacking` in powerplay or when wickets tumble.

## Documented Difficulty Settings
- [x] `Easy`: Slower speeds ($0.90\times$), wider spread ($\pm 0.65\text{m}$), slower batter/fielder reaction ($0.35\text{s}$–$0.45\text{s}$), $25\%$ mistake rate.
- [x] `Medium`: Nominal speeds ($1.00\times$), standard spread ($\pm 0.28\text{m}$), $0.22\text{s}$–$0.25\text{s}$ reaction, $10\%$ mistake rate.
- [x] `Hard`: Elite speeds ($1.04\times$), laser spread ($\pm 0.10\text{m}$), $0.12\text{s}$–$0.15\text{s}$ reaction, $3\%$ mistake rate.
- [x] Verify all difficulty levels remain beatable.

## Automated Acceptance Tests (`AIAndTacticsTests.cs`)
- [x] `BowlingAI_PlaysCompleteOver_GeneratesSixValidDeliveries`
- [x] `BowlingAI_ProfilesProduceDistinctPaceAndVariations`
- [x] `BattingAI_ChoosesAppropriateShotForDeliveryType`
- [x] `BattingAI_AdjustsAggressionToMatchSituation`
- [x] `FieldPlacementManager_DynamicallyShiftsPresetBetweenDeliveries`
- [x] `DifficultySettings_DocumentedParametersScaleCorrectly`
- [x] `AIDecisionMakers_DoNotBypassCollisionOrRulesEngine`
- [x] Web test suite passing 17/17 (`npm test`).
- [x] Web production build clean compile (`npm run build`).
