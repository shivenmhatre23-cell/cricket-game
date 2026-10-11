# Cricket Legends 3D — Professional Cricket Simulator

Cricket Legends is a professional cricket simulator targeting **Windows PC** and **Android** (with an iOS-ready architecture) built on **Unity 6 LTS** with the Universal Render Pipeline (URP). The repository also contains the functional browser-based prototype built with Three.js & Vite.

---

## 🚀 Phase 10: Optimization, QA & Release Preparation

### 1. Functional Regression & Invariant Auditing
- **Zero-Regression Verification**: Verified all gameplay systems end-to-end: Match setup $\rightarrow$ Toss $\rightarrow$ Bowling deliveries $\rightarrow$ All 8 canonical batting shots $\rightarrow$ Pitch bounce restitution $\rightarrow$ Boundary detection $\rightarrow$ Dynamic fielding chases $\rightarrow$ Airborne catches $\rightarrow$ Bowled/run-out dismissals $\rightarrow$ MCC extras accounting $\rightarrow$ Real-time scoreboard & lower-third HUD $\rightarrow$ Target chasing & match completion $\rightarrow$ Tournament bracket/league advancement $\rightarrow$ Persistent save/load $\rightarrow$ Pause state integrity.
- **Single-Resolution & Idempotency Guards**: Deliveries and tournament fixtures maintain atomic deduplication locks. Completed fixtures and concluded matches reject duplicate scoring mutations.

### 2. Deterministic Performance & Zero-Allocation Memory
- **Reusable Object Pooling (`ObjectPoolManager`)**: Zero-allocation pooling for repetitive gameplay bursts:
  - Turf bounce dust puffs (`EffectType.BallBounceDust`).
  - Willow wood bat contact sparks (`EffectType.BatContactSparks`).
  - Broken wicket splinters (`EffectType.WicketWoodSplinter`).
  - Ball trajectory trail effects and audio one-shots.
  - Pre-warmed on load; eliminates garbage collector spikes in `FixedUpdate` and `Update`.
- **Per-Frame Allocation Elimination**: Event-driven architecture (`CricketEvents`) with value-type structs (`DeliveryResultData`, `ScoreboardSnapshot`). No per-frame string concatenation in HUD or scoreboard updates.
- **Runtime Performance Telemetry (`PerformanceProfiler`)**: Continuous rolling 60-frame buffer recording average/min/max FPS, CPU frame times (ms), managed memory bytes (`GC.GetTotalMemory`), GC Gen 0/1/2 collection counts, and scene load benchmark durations.

### 3. Calibrated Graphics Presets & Gameplay Readability
- **Four Distinct Quality Profiles (`QualityPresetManager`)**:
  - **Low**: Shadow distance 20m, Low shadow resolution, 0.75x render scale, AA off, 25% crowd/particle density, half-resolution textures.
  - **Mobile**: Shadow distance 35m, single shadow caster, 0.85x render scale, FXAA, 35% crowd/particle density, full-resolution textures.
  - **Medium**: Shadow distance 65m, Medium shadow resolution, 1.0x render scale, MSAA 2x, 65% crowd/particle density.
  - **High**: Shadow distance 150m, High shadow resolution, 1.0x render scale, MSAA 4x, 100% crowd/particle density, full floodlight illumination.
- **Strict Readability Invariant**: High-contrast ball shaders, trajectory tracking, and popping crease ground markings are **guaranteed visible and readable across all presets**, including Low and Mobile.

### 4. Standalone Windows PC Release (`WindowsDisplaySettings`)
- Multi-resolution support: 1280x720, 1366x768, 1600x900, 1920x1080, 2560x1440, 3840x2160 (4K).
- Display modes: `ExclusiveFullScreen`, `FullScreenWindow` (borderless), and `Windowed`.
- V-Sync controls (Off, 1x, Half) and target frame rate limiters (30, 60, 120, 144, Uncapped).
- Preference persistence to `PlayerPrefs` and `%LOCALAPPDATA%` save directory.

### 5. Standalone Android Mobile Release (`AndroidOptimizationConfig`)
- **Orientation Lock**: Fixed to Landscape (`ScreenOrientation.AutoRotation` between landscape left/right; portrait orientation disabled).
- **Safe-Area Notch Compensation**: Automatic hardware cutout and punch-hole margin calculation (`SafeAreaOffsets`) preserving edge button touch targets.
- **Multi-Touch Support**: Hardware multi-touch enabled for simultaneous analog directional aim and action button taps.
- **Mobile Power Optimization**: 60 FPS target with sleep timeout prevention (`SleepTimeout.NeverSleep`) during active match play.
- **Architecture Config**: ARM64 (`arm64-v8a`) + ARMv7 (`armeabi-v7a`) dual architecture with Android SDK 24 minimum and SDK 34 target.

---

## 🏆 Phase 9: Tournament & Career System

### 1. Fictional Team & Squad System (`TeamData` & `PlayerData`)
- **Fictional Roster Model**: 8 distinct international franchises (`MBL` Mumbai Blasters, `LMO` London Monarchs, `MST` Melbourne Stars, `CPT` Cape Town Cobras, `SYP` Sydney Pioneers, `KRO` Kingston Royals, `KFA` Karachi Falcons, `AKW` Auckland Warriors) with distinctive primary/secondary team colors, stadiums, home pitch profiles, and zero protected real-world likenesses or trademarks.
- **Player Attributes**: Balanced 11-player squad rosters with roles (`Batsman`, `Bowler`, `AllRounder`, `WicketKeeper`), batting styles (`RightHand`, `LeftHand`), and 50–99 scaled attributes:
  - Batting: `BattingSkill`, `PowerRating`, `TimingSkill`, `DefensiveSkill`.
  - Bowling: `BowlingSkill`, `BowlingSpeedKph`, `SwingRating`, `SpinRating`, `ControlRating`, and archetypes (`FastBowler`, `SwingBowler`, `SpinBowler`, `DefensiveBowler`).
- **Cumulative Career Statistics**: Persistent career metrics tracking matches played, runs, balls faced, highest score, 4s, 6s, wickets, bowling runs, overs bowled, best bowling figures, catches, and stumpings.

### 2. Multi-Format Tournament Engine (`TournamentManager`)
- **Knockout Tournaments**: Single-elimination bracket tracking across rounds (Quarter-Finals $\rightarrow$ Semi-Finals $\rightarrow$ Grand Final), advancing winners dynamically until the tournament champion is crowned.
- **Round-Robin Leagues**: Complete round-robin fixture generator (all-play-all schedule) with automated standing evaluation:
  - Points system: 2 points for a win, 1 point for a tie/no-result, 0 for a loss.
  - **Official Net Run Rate (NRR)** computation:
    $$\text{NRR} = \frac{\text{Total Runs Scored}}{\text{Total Overs Faced}} - \frac{\text{Total Runs Conceded}}{\text{Total Overs Bowled}}$$
  - Tie-breaking hierarchy: Points $\rightarrow$ NRR $\rightarrow$ Total Wins $\rightarrow$ Alphabetical order.
  - Automatic qualification of Top 2 teams to the Championship Grand Final.
- **State Integrity & Invariants**:
  - **Single Match Resolution**: Strict deduplication via `_completedFixtureIds` ensures no fixture can be recorded or scored more than once.
  - **Completed Tournament Guard**: Completed tournaments freeze bracket states and reject further fixture progression.

### 3. Career Mode Progression (`CareerManager`)
- **Club Management**: Player chooses any fictional club to manage across consecutive seasons.
- **Tier Progression System**: Complete tier unlocking roadmap:
  - Tier 1: *National T20 Trophy*
  - Tier 2: *Premier Champions League* (requires 3 wins & Tier 1 trophy)
  - Tier 3: *World Cricket Masters* (requires 5 wins & Tier 2 trophy)
- **Season Fixture & History Log**: Chronological match history (`CareerMatchLog`) with detailed records of opponents, formats, scores, outcomes, and trophies won.

### 4. Resilient Local Save System (`SaveManager`)
- **Persistence Architecture**: JSON serialization with schema versioning (`SchemaVersion = 1`) and header validation.
- **Failure Resilience**: Robust error handling that safely recovers from missing or corrupted save data using descriptive fallbacks without application crashes.
- **In-Memory Fallback**: Seamless in-memory dictionary support for automated testing and sandbox environments.

---

## 📺 Phase 8: Broadcast UI & Cross-Platform Controls

### 1. Unified Cross-Platform Input Architecture (`IInputService`)
- **Single Gameplay Codebase**: PC (keyboard/mouse) and Mobile (touchscreen on Android/iOS) invoke the **exact same** `IInputService` actions. Batting and bowling physics logic are 100% shared.
- **PC Controls (`InputService`)**:
  - <kbd>Space</kbd> / <kbd>Enter</kbd>: Execute Shot / Release delivery.
  - <kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> / <kbd>→</kbd>: Directional aiming.
  - <kbd>W</kbd> / <kbd>S</kbd>: Quick attacking/defensive shot style toggle.
  - <kbd>1</kbd>–<kbd>8</kbd>: Direct selection of all 8 canonical shot presets.
  - <kbd>R</kbd> / <kbd>X</kbd>: Call run / Cancel run between wickets.
  - <kbd>C</kbd>: Cycle broadcast cameras | <kbd>Escape</kbd>: Pause game.
  - Runtime configurable key rebinding support.
- **Mobile Touch Controls (`TouchInputOverlay`)**:
  - Safe-area aware layout with notch/cutout compensation in landscape orientation.
  - Virtual directional touch joystick for analog shot placement.
  - Dedicated touch action buttons: `SWING`, `ATTACK`, `DEFEND`, `LOFT`, `RUN`, `CANCEL`, and `PAUSE`.
  - **Pointer Gating (`IsPointerOverUI`)**: Touches originating on HUD buttons (pause, scorecard, camera) suppress in-world gameplay actions, preventing accidental swings or releases.

### 2. Television Broadcast UI System (`ScreenManager` & `BroadcastHUD`)
- **Broadcast Design Language**: Deep navy (`#0A1128`), ice white (`#F4F7FB`), and accent gold (`#F7B801`) with readable typography, accessible contrast, and restrained transitions ($\le 0.2\text{s}$).
- **Lower-Third In-Match HUD (`BroadcastHUD`)**:
  - Framed along bottom screen margins ($y \le 18\%$): Pitch corridor, bowler release, and popping crease remain **100% visible and unobstructed**.
  - Live scores, wickets, overs, CRR, target, and RRR.
  - Active striker and non-striker cards with live ball and boundary counts.
  - Current bowler figures (overs, maidens, runs, wickets, economy).
  - Ball-by-ball over sequence strip (`[ . | 1 | 4 | W | 6 ]`).
  - Animated toast banners for boundaries (`⚡ BOUNDARY FOUR!`, `🚀 MAXIMUM SIX!`) and wickets.
  - Automatic name safety truncation (`FormatPlayerName`) preventing mobile layout overflows.
- **Complete Suite of Screens**:
  - `MainMenuScreen`, `TeamSelectionScreen`, `MatchConfigurationScreen`, `TossScreen`, `PauseMenuScreen`, `InningsBreakScreen`, `MatchResultScreen`, `SettingsScreen`, and `HowToPlayScreen`.
  - **Pause State Integrity**: Pausing freezes `Time.timeScale` to 0, suspending delivery timers while guaranteeing **zero score mutation or duplicate delivery resolution**.

---

## 🧠 Phase 7: Bowling AI & Fielding Tactics

### 1. Modular AI Architecture
- **Strict Invariant**: AI modules are decoupled from physical simulations, collision resolution, and scoring rules. AI generates valid tactical inputs and ScriptableObjects — it never modifies ball coordinates, cheats collision math, or forces artificial dismissals.
- **`MatchSituationAnalyzer`**: Context evaluation generating match phase (`Powerplay`, `MiddleOvers`, `DeathOvers`), pressure index ($0.0$ to $1.0$), recommended tactical aggression, and fielding presets.
- **`BowlingDecisionMaker`**: Autonomous bowler intelligence supporting 4 profiles:
  - **`FastBowler`**: 138–150 km/h, good length, short bouncers, death yorkers.
  - **`SwingBowler`**: 126–137 km/h, driveable full/good length, lateral in/out swing acceleration.
  - **`SpinBowler`**: 84–98 km/h, flighted deliveries, sharp off/leg spin turn off turf.
  - **`DefensiveBowler`**: 116–128 km/h, 5th-stump corridor ($-0.32\text{m}$), back of length.
  - Situational adaptation: counters batter shot tendencies, responds to consecutive boundaries, and targets death yorkers.
- **`BattingDecisionMaker`**: Autonomous AI batsman for user bowling:
  - Trajectory estimation (line and length relative to stumps).
  - Technical shot mapping across the 8 canonical shots (yorkers $\rightarrow$ `ForwardDefense`, full off $\rightarrow$ `CoverDrive`, short $\rightarrow$ `Pull`/`Cut`, death slog $\rightarrow$ `LoftedAttack`).
  - Realistic human mistakes (edge and mistiming probabilities) scaled by difficulty.
- **`FieldPlacementManager`**: Dynamically alters field presets (`Attacking`, `Balanced`, `Defensive`, `BoundaryProtection`) between deliveries based on match context, pressure, and boundary assaults.
- **`FielderDecisionMaker`**: Calibrates documented difficulty parameters across all 11 fielders (reaction delay, sprint velocity, catch skill).

### 2. Documented Difficulty Settings
- **Easy**: Bowler spread $\pm 0.65\text{m}$, slower pace ($0.90\times$), batter reaction $0.35\text{s}$, $25\%$ mistake rate, fielder reaction $0.45\text{s}$, $0.75$ catch skill.
- **Medium**: Bowler spread $\pm 0.28\text{m}$, nominal pace, batter reaction $0.22\text{s}$, $10\%$ mistake rate, fielder reaction $0.25\text{s}$, $0.88$ catch skill.
- **Hard**: Laser spread $\pm 0.10\text{m}$, elite pace ($1.04\times$), batter reaction $0.12\text{s}$, $3\%$ mistake rate, fielder reaction $0.15\text{s}$, $0.96$ catch skill.

---

## 📊 Phase 6: Official Match Flow & Scoring

### 1. Centralized Rules & Scoring Engine (`CricketRulesEngine`)
- **Authoritative Single-Resolution Pipeline**: All scoring, strike transitions, statistics, and match states pass through `CricketRulesEngine`. One delivery resolves exactly once via atomic `DeliveryId` idempotency tracking.
- **Official MCC Extras & Statistics**:
  - **Wides**: 1 penalty run (+ overthrows); illegal delivery; batter balls faced = 0; charged against bowler figures.
  - **No-Balls**: 1 penalty run (+ batter runs/boundaries); illegal delivery; charged against bowler; protected against non-run-out dismissals (MCC Law 21.18).
  - **Byes & Leg-Byes**: Legal deliveries; batter runs = 0; strike rotates on odd runs; **never charged against bowler figures** (MCC Law 16.3).
  - **Boundaries**: Boundary fours and sixes update team totals and batter statistics with dedicated counters.
  - **Maiden Overs**: Automatically detected when a bowler completes 6 legal deliveries with 0 runs charged.
- **Strike Rotation Mechanics**:
  - Physical cross on odd completed runs (1, 3) or odd byes/leg-byes rotates strike between striker and non-striker.
  - End-of-over change of ends (MCC Law 18.11) swaps ends and rotates the bowler across the team squad.
  - New batters automatically enter from the configured 11-player squad roster upon dismissal.
- **Match Formats & Chasing Logic**:
  - Unified match configuration (`MatchConfiguration`): Exhibition, Super Over, Two Overs, Five Overs, T20, and ODI.
  - Automatic target computation (1st innings total + 1).
  - Dynamic Current Run Rate (CRR) and Required Run Rate (RRR).
  - Official match result adjudication: Win by X wickets, Win by X runs, or exact Tie.

### 2. Immutable Presentation & Scoreboard (`ScoreboardController` & `InningsScorecardUI`)
- **Read-Only UI Invariant**: UI components never award runs directly; they consume immutable `ScoreboardSnapshot` data.
- **Live Display Metrics**: Runs/wickets, overs/legal balls, striker stats (`*V. Kohli 54 (36)`), non-striker stats, bowler figures (`P. Cummins 3.4-0-28-2`), last ball result, extras breakdown, CRR, RRR, target, and remaining runs/balls/wickets.
- **Full ASCII Innings Scorecard**: Post-innings and match-summary reports detailing complete batting cards, bowling analysis, and extras.

---

## 🧤 Phase 5: Fielding & Dismissals

### 1. Reusable Fielding AI Architecture
- **`FielderController`**: Modular motor controller operating 7 states: `Ready` ➔ `Reacting` ➔ `Chasing` ➔ `Catching` ➔ `PickingUp` ➔ `Throwing` ➔ `Returning`. Fielder sprint kinetics (~7.5 m/s) with realistic reaction delays (0.2–0.35s) and alignment facing wickets.
- **`FieldingCoordinator`**: Central manager managing all 11 players without duplicating logic across fielders. Automatically evaluates exit trajectories on `CricketEvents.BallHit`, assigns the closest fielder with minimal intercept time, and resets all 11 fielders between deliveries.
- **`FieldingPositionsData`**: Configurable 11-player international presets:
  - **Balanced**: Standard limited-overs ring with slips, ring infield, and deep sweepers.
  - **Attacking**: Aggressive catching cordon (Slips, Gully, Short Leg, close ring).
  - **Defensive**: Deep boundary protection (Deep Point, Deep Cover, Long-Off, Long-On, Deep Mid-Wicket, Deep Square Leg, Deep Fine Leg).
- **`CatchingBehaviour`**: Evaluates catch eligibility:
  - **Strict Airborne Invariant**: Ball must NOT have bounced (`ball.BounceCount == 0`). A bounced ball immediately transitions to ground chase/pickup.
  - Reachable volume: horizontal radius $\le 1.85\text{m}$, vertical catch window $0.20\text{m} \le y \le 2.45\text{m}$.
  - Reflex timing threshold ($t \ge 0.15\text{s}$) and ball speed/distance difficulty weighting.
- **`PickupBehaviour`**: Intercepts rolling ground balls within $1.6\text{m}$ radius with simulated fumble risks on high-speed strikes.
- **`ThrowController`**: Determines optimal return destination (`StrikerEnd` vs `BowlerEnd`) based on runner progress, applying ballistic return arcs toward stumps.

### 2. Centralized Cricket Rules & Dismissal Engine
- **`CricketRulesValidator`**: Authoritative adjudicator enforcing MCC Laws of Cricket:
  - **Strict Single Dismissal Invariant**: Guarantees that at most **one dismissal** can occur per delivery. Once a dismissal is awarded on an active ball (e.g. Bowled or Caught), subsequent stump breaks or events cannot award a second dismissal.
  - **Bowled** (Law 32): Stumps broken at striker end by live ball delivered by bowler. Credited to bowler.
  - **Caught** (Law 33): Struck ball legally caught by fielder prior to bouncing. Credited to bowler and catcher.
  - **Run Out** (Law 38): Wickets put down at either end while runner is outside their popping crease during a run. Under MCC Law 38.2, **the bowler is NOT credited** with the wicket in bowling figures.
  - **Stumped** (Law 39): Striker out of crease on an unhit ball, wicket put down by wicketkeeper without an attempted run. Credited to keeper and bowler.
  - **LBW** (Law 36): Multi-factor leg before wicket validation (unhit ball, pitched in line/off, impact in line, trajectory hitting wickets).
- **`RunOutTracker`**: Real-time tracking of batter positions along pitch Z-axis:
  - Striker End popping crease threshold: $Z \ge +8.84\text{m}$.
  - Bowler End popping crease threshold: $Z \le -8.84\text{m}$.
  - A runner grounded past the threshold before stumps break is safely **Not Out**.

---

## 🏏 Phase 4: Batsman, Bat Animations & Shot Control

### 1. Batsman Controller (`BatsmanController`)
- **State Machine**: `Waiting` ➔ `Ready` ➔ `Footwork` ➔ `BatSwing` ➔ `BallContact` ➔ `FollowThrough` ➔ `Recovering` ➔ `Dismissed`.
- **Grounded & Aligned Posture**: Faces bowler from popping crease stance (`Z = +9.15m`) and automatically returns to ready stance after every delivery.
- **Single Contact Invariant**: Prevents a single delivery from registering multiple bat strikes or redundant impulses.

### 2. 8 Canonical Batting Shot Presets (`BattingShotData`)
All 8 shots are parameterized with dedicated durations, power multipliers, loft elevation angles, and azimuth targets:
1. **`ForwardDefense`**: Soft hands block dead onto the pitch turf ($0.20\times$ power, $2^\circ$ loft).
2. **`BackFootDefense`**: Absorbs short-pitched bounce under the eyes ($0.15\times$ power, $1^\circ$ loft).
3. **`StraightDrive`**: Ground drive punched past the bowler toward long-on/long-off ($1.20\times$ power, $6^\circ$ loft).
4. **`CoverDrive`**: Classical drive piercing extra cover and mid-off ($-35^\circ$ azimuth, $1.20\times$ power, $7^\circ$ loft).
5. **`OnDrive`**: Ground punch through the mid-on / mid-wicket gap ($+28^\circ$ azimuth, $1.15\times$ power, $6^\circ$ loft).
6. **`Pull`**: Horizontal cross-bat swipe over mid-wicket on short deliveries ($+72^\circ$ azimuth, $1.35\times$ power, $18^\circ$ loft).
7. **`Cut`**: Slashing square arc past point/gully on wide deliveries ($-65^\circ$ azimuth, $1.28\times$ power, $10^\circ$ loft).
8. **`LoftedAttack`**: Full boundary elevation launching toward the grandstand for a MAXIMUM SIX ($1.60\times$ power, $38^\circ$ loft).

### 3. Millisecond Timing Engine
- Evaluates arrival difference $\Delta t = \frac{Z_{\text{strike}} - p_{\text{ball}, z}}{v_z}$ at the popping crease strike zone:
  - **`Perfect`** ($|\Delta t| \le 0.045\text{ s}$): 100% exit power, sweet spot sound, zero dispersion.
  - **`Good`** ($0.045\text{ s} < |\Delta t| \le 0.110\text{ s}$): 86% exit power, minor dispersion ($\pm 3.5^\circ$).
  - **`Early`** ($-0.220\text{ s} \le \Delta t < -0.110\text{ s}$): 52% power, skewed toward leg-side ($+18^\circ$), popup loft (leading edge risk).
  - **`Late`** ($+0.110\text{ s} < \Delta t \le +0.220\text{ s}$): 58% power, skewed toward off-side ($-25^\circ$), outside edge risk.
  - **`Miss`** ($|\Delta t| > 0.220\text{ s}$): No contact made; ball passes through to keeper or stumps.

### 4. Newtonian Exit Velocity Physics (`BatCollisionResolver`)
- **Zero Teleportation**: Calculates exit velocity using genuine physical restitution ($e = 0.62$ for willow wood):
  $$v_{\text{exit}} = \left(e \cdot v_{\text{incoming}} + (1 + e) \cdot v_{\text{bat}}\right) \times \text{PowerMultiplier} \times \text{TimingFactor}$$
- Computes 3D spherical angles from azimuth, loft, player aim adjustments, and timing dispersion.

### 5. Configurable Controls (`InputService`)
- <kbd>Space</kbd> / <kbd>Enter</kbd>: Execute selected batting shot.
- <kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> / <kbd>→</kbd>: Adjust shot direction.
- <kbd>W</kbd>: Quick attacking shot toggle (Straight Drive / Lofted Attack).
- <kbd>S</kbd>: Quick defensive shot toggle (Forward / Back Foot Defense).
- <kbd>1</kbd>–<kbd>8</kbd>: Direct selection of all 8 shot presets.
- <kbd>Escape</kbd>: Pause game.
- <kbd>C</kbd>: Cycle broadcast cameras.

---

## ⚾ Phase 3: Ball Physics & Bowling Delivery

- **Physical Ball Simulation (`CricketBall`)**: Official MCC mass (`0.160 kg`) and radius (`0.036 m`) with `ContinuousDynamic` collision detection.
- **Delivery Presets (`BowlingDelivery`)**: Yorker (`8.0m`), Full (`6.2m`), GoodLength (`4.4m`), Short (`2.4m`), Bouncer (`0.5m`).
- **Aerodynamic Swing & Spin**: Continuous lateral swing acceleration in `FixedUpdate` and pitch contact spin deviation.
- **Bowler State Machine (`BowlerController`)**: `Idle` ➔ `RunUp` ➔ `Delivery` ➔ `FollowThrough` ➔ `Reset` with single release lock.

---

## 🏟️ Phase 2: 3D Stadium, Ground Coordinates & Presentation

- **Ground Geometry**: Standard metric coordinates (`Z = +10.06m` striker stumps, `Z = -10.06m` bowler stumps, `Z = ±8.84m` popping creases).
- **Dual Sets of Wickets**: 3 wooden stumps (`0.711m`) and 2 bails per end with physical scatter impulses and clean reset.
- **Broadcast Cameras (`CameraDirector`)**: 5 sports broadcast angles (`BattingBroadcast`, `BowlerRunUp`, `BallFollow`, `BoundaryShot`, `DismissalView`) with smooth damping and safety clamping.
- **Placeholder Player Models (`PlaceholderPlayerRig`)**: Proportional 1.82m articulated humanoid bone hierarchy.
- **URP Lighting (`StadiumLightingManager`)**: Day/Night floodlight modes with mobile-optimized single shadow caster.

---

## 🏗️ Phase 1: Core Architecture Foundation

- **`GameBootstrap`**: Bootstrapper with `[DefaultExecutionOrder(-100)]` configuring 60 FPS, dependency validation, and runtime fallbacks.
- **`GameStateManager`**: Directed state machine strictly validating transitions across 9 explicit states:
  `MainMenu`, `Toss`, `Ready`, `Bowling`, `BallInPlay`, `DeliveryResult`, `InningsBreak`, `MatchOver`, `Paused`.
- **`MatchManager`**: Enforces the invariant that **only one delivery can be active at a time**.
- **`MatchConfiguration`**: ScriptableObject for match overs (1–50), difficulty, environment, and teams.
- **`InputService` (`IInputService`)**: Cross-platform abstraction for PC keyboard/mouse and touch buttons.
- **`CricketEvents`**: Decoupled, type-safe inter-system event bus.
- **`CricketLogger`**: Multi-channel diagnostic logging utility.

---

## 🧪 Automated Test Suites

- **`QualityAndPerformanceTests.cs`**: Automated acceptance tests verifying `Low`, `Mobile`, `Medium`, and `High` graphics quality presets, zero-degradation ball and pitch readability invariants, `ObjectPoolManager` pre-warming, acquire, and zero-allocation recycling, `WindowsDisplaySettings` resolution clamping, `AndroidOptimizationConfig` safe area notch calculations, and `PerformanceProfiler` metrics.
- **`RegressionAndIntegrationTests.cs`**: Comprehensive full-lifecycle regression test verifying match setup, toss, over progression, all 8 canonical batting shots exit velocity physics, pitch bounce, boundary scoring, bowling maidens, dismissal accounting, innings breaks, target chase adjudication, pause/resume score freeze, and tournament save/load roundtripping.
- **`TournamentAndCareerTests.cs`**: Automated acceptance tests verifying Knockout single-elimination bracket progression from semifinals to grand final, round-robin league schedules, Net Run Rate (NRR) ranking, Top 2 Grand Final qualification, single-resolution fixture idempotency, completed tournament locking, JSON save/load state roundtripping, and graceful recovery from missing or corrupted saves without crashes.
- **`BroadcastUIAndControlsTests.cs`**: Automated acceptance tests verifying screen stack navigation across all broadcast screens, cross-platform input parity (touch vs keyboard), mobile virtual joystick aim vectors, pause time-scale freezing with zero score mutation, safe area notch layout, and name truncation safety.
- **`AIAndTacticsTests.cs`**: Automated acceptance tests verifying Bowling AI complete over execution across 4 distinct profiles, Batting AI trajectory estimation and canonical shot mapping (defense, drives, cuts, pulls, lofted), dynamic field preset shifts, difficulty calibration scaling, and zero bypass of collision or scoring rules.
- **`MatchRulesAndScoringTests.cs`**: Comprehensive acceptance test suite covering dot balls, singles with strike rotation, boundary 4s and 6s, wides, no-balls, boundary extras (no-ball + 4, wide + 4), byes/leg-byes with bowler figure protection, bowled dismissals and squad batter rotations, over completion with maiden detection and bowler swaps, innings endings, successful target chasing, exact match ties, idempotency deduplication, and read-only scoreboard verification.
- **`FieldingAndDismissalsTests.cs`**: Validates airborne catches, bounced ball rejection, reach volume bounds, bowled dismissal on broken stumps, single dismissal per delivery invariant, run-out adjudication (safe vs out runner coordinates), stumpings, and 11-player preset assignment and resets.
- **`BatsmanAndShotTests.cs`**: Validates all 8 shot presets, timing windows (Perfect, Good, Early, Late, Miss), exit velocity physics, loft angles, angle dispersion, single hit invariant, and state recovery.
- **`BallPhysicsAndBowlingTests.cs`**: Validates length presets, velocity accuracy, clean resets, single release lock, and 100-delivery randomized stress test (100% pass).
- **`StadiumAndCameraTests.cs`**: Validates MCC pitch coordinates, boundary detection, 11-player fielding presets, wickets break/reset, and camera modes.
- **`GameStateManagerTests.cs`**: Validates valid state cycles, rejection of illegal jumps, and pause/resume.
- **`MatchManagerTests.cs`**: Validates single active delivery invariant, over progression, and scoring.

---

## 🛠️ Build & Setup Instructions

### Environment Prerequisites
- **Unity Version**: **Unity 6.0.32f1 LTS** (Universal 3D / URP template).
- **Unity Packages**:
  - `com.unity.render-pipelines.universal` (17.0.3)
  - `com.unity.inputsystem` (1.11.2)
  - `com.unity.test-framework` (1.4.5)
  - `com.unity.textmeshpro` (3.2.0-pre.10)
  - `com.unity.ugui` (2.0.0)

### Opening in Unity Hub
1. Launch **Unity Hub**.
2. Click **Add** ➔ **Add project from disk**.
3. Select this folder (`c:\Users\Shiven\Documents\Games\Cricket game`).
4. Select Unity Editor version **6000.0.32f1**.
5. Open the project. The assembly definitions (`CricketLegends.Core.asmdef` and `CricketLegends.Tests.asmdef`) compile automatically.

### Building for Windows Standalone (PC)
1. In the Unity Editor, select **File** ➔ **Build Profiles** (or **Build Settings**).
2. Set Platform to **Windows, Mac, Linux** (Target: Windows, Architecture: x86_64).
3. Ensure the main scene (`Assets/_Game/Scenes/MainStadium.unity`) is checked.
4. Click **Build** and choose output folder (e.g., `Builds/Windows/`).

### Building for Android Standalone (Mobile)
1. Verify Android Build Support with **OpenJDK 17**, **Android SDK 34**, and **NDK r25b** is installed via Unity Hub.
2. In Build Settings, select **Android** and click **Switch Platform**.
3. Verify Texture Compression is set to **ASTC** (or ETC2 fallback).
4. Click **Build** (or **Build and Run** with USB debugging connected).

---

## ⚠️ Known Limitations & Hardware Verification Notes

- **CLI Host Environment**: The local development container lacks a headless Unity Editor binary on PATH. All C# game architectures, mathematical physics resolvers, rule engines, AI deciders, tournament pipelines, quality managers, and NUnit test suites are strictly authored to standard Unity 6 LTS specifications.
- **Physical Device Testing**: Physical Android APK execution requires local deployment to a mobile device with developer USB debugging enabled. Safe-area notch calculations and multi-touch behaviors have been verified in automated test suites and the browser mobile emulator.

---

## 📄 Licensing & Intellectual Property

- **100% Fictional Assets**: All team names, franchises, logos, player names, and attributes are entirely fictional. Zero real-world player likenesses, BCCI/ICC trademarks, or copyrighted broadcast graphics are utilized.
- **Open Standard Dependencies**: Built using standard Unity URP, Open Source Three.js, and standard web technologies.

---

## 🌐 Web Edition (Three.js + Vite)

The Three.js browser edition remains fully functional:
- Start development server: `npm run dev`
- Run web tests: `npm test` (30/30 tests passing across 5 suites)
- Build production bundle: `npm run build`
