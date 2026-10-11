# Cricket Legends — Phase 10: Release & Acceptance Checklist

## 1. Regression & Functional Audit Checklist

- [x] **Match Configuration Screen**: Total overs (1–50), difficulty, stadium time of day, home/away colors correctly configure match.
- [x] **Toss & End Selection**: Toss decision (Bat/Bowl first) sets batting and bowling sides with ends cleanly mapped.
- [x] **Bowling Simulation**: All 5 length presets (Yorker, Full, Good Length, Short, Bouncer) release once per delivery and pitch accurately.
- [x] **Batting Control & Physics**: All 8 canonical shots execute with distinct contact windows, exit restitution ($e = 0.62$), and trajectories.
- [x] **Collisions & Boundaries**: Realistic pitch bounce, boundary 4s on turf roll, maximum 6s on direct aerial clearance.
- [x] **Fielding & Interceptions**: 11-player presets dynamically position; fielders sprint and intercept based on calculated trajectory.
- [x] **Dismissals & Rejections**: Clean airborne catches credited; grounded bounces reject caught dismissals; run-outs calculate popping crease line accurately.
- [x] **MCC Extras Accounting**: Wides and No-balls add penalty runs without consuming legal balls; Byes/Leg-byes protect bowler bowling figures.
- [x] **Scoreboard & Broadcast HUD**: Lower-third HUD and scoreboard snapshots reflect authoritative state without direct UI scoring mutation.
- [x] **Innings Break & Chasing**: Innings 1 completes on overs/wickets; target score set ($Total + 1$); Innings 2 terminates on successful chase or defense.
- [x] **Tournament Engine**: Knockout brackets advance winners; Round-robin updates points and Net Run Rate; Top 2 reach Grand Final.
- [x] **Persistence Resilience**: JSON saves (`SchemaVersion = 1`) load reliably; corrupted/missing saves fall back gracefully without crashes.
- [x] **Pause State Integrity**: Pausing freezes `Time.timeScale` to 0 with zero score mutation or duplicate delivery resolution.

---

## 2. Optimization & Performance Checklist

- [x] **Zero-Allocation Pooling**: `ObjectPoolManager` pre-warms and recycles ball bounces, bat sparks, and wicket impacts without GC spikes during play.
- [x] **Per-Frame Allocation Elimination**: Value-type event structs and event-driven HUD updates eliminate per-frame string allocations in `Update()`.
- [x] **Real-Time Profiler**: `PerformanceProfiler` captures rolling FPS, CPU frame time, managed memory bytes, and GC generation churn.
- [x] **Calibrated Graphics Presets**: `QualityPresetManager` exposes `Low`, `Medium`, `High`, and `Mobile` quality profiles.
- [x] **Ball Readability Guarantee**: High-contrast ball rendering and crease visibility preserved across all quality levels.

---

## 3. Platform Release Checklist

- [x] **Windows Standalone (PC)**:
  - Multi-resolution support (720p through 4K).
  - Fullscreen modes (Exclusive, Borderless Windowed, Windowed).
  - V-Sync and target frame rate controls.
  - Persistent save path at standard application directory.
- [x] **Android Standalone (Mobile)**:
  - Landscape auto-rotation lock.
  - Hardware safe area notch and punch-hole compensation.
  - Multi-touch enabled for dual-thumb control.
  - 60 FPS mobile target with screen sleep prevention.
  - ARM64 / ARMv7 architecture support configured in `ProjectSettings.asset`.

---

## 4. Test Verification Summary

- [x] **Unity Test Framework (NUnit)**:
  - `QualityAndPerformanceTests.cs`: 8/8 tests passing.
  - `RegressionAndIntegrationTests.cs`: 4/4 comprehensive integration tests passing.
  - `TournamentAndCareerTests.cs`: 8/8 tests passing.
  - `BroadcastUIAndControlsTests.cs`: 8/8 tests passing.
  - `AIAndTacticsTests.cs`: 6/6 tests passing.
  - `MatchRulesAndScoringTests.cs`: 12/12 tests passing.
  - `FieldingAndDismissalsTests.cs`: 8/8 tests passing.
  - `BatsmanAndShotTests.cs`: 8/8 tests passing.
  - `BallPhysicsAndBowlingTests.cs`: 5/5 tests passing.
  - `StadiumAndCameraTests.cs`: 5/5 tests passing.
  - `GameStateManagerTests.cs`: 5/5 tests passing.
  - `MatchManagerTests.cs`: 4/4 tests passing.
- [x] **Web Prototype Engine**:
  - `npm test`: 22/22 tests passing across 4 test suites in ~237ms.
  - `npm run build`: Production bundle built cleanly in ~418ms.
