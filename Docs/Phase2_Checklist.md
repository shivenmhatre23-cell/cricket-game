# Cricket Legends — Phase 2 Checklist & Acceptance Status

## 1. Ground & Stadium Geometry
- [x] Canonical pitch coordinate conventions defined in meters ([`PitchCoordinates.cs`](file:///c:/Users/Shiven/Documents/Games/Cricket%20game/Assets/_Game/Scripts/Presentation/PitchCoordinates.cs)).
- [x] Official MCC dimensions: 20.12m between wickets, 22.56m turf length, 3.05m width.
- [x] Striker wicket at `Z = +10.06m`, Bowler wicket at `Z = -10.06m`.
- [x] Popping creases at `Z = +8.84m` and `Z = -8.84m` (1.22m offset).
- [x] Bowling creases (2.64m) and return creases (`X = ±1.32m`).
- [x] Two sets of 3 stumps and 2 bails with physical dislodgement ([`WicketsController.cs`](file:///c:/Users/Shiven/Documents/Games/Cricket%20game/Assets/_Game/Scripts/Presentation/WicketsController.cs)).
- [x] 30-yard fielding circle with 20 white disc markers.
- [x] Clearly visible boundary rope oval (66m x 72m).
- [x] Tiered grandstand seating bowl with concrete tiers and low-overhead crowd bands.
- [x] Four tall floodlight towers at ground perimeter.

## 2. Visual Presentation & URP Materials
- [x] Daytime lighting as default with warm sunlight and soft ambient sky.
- [x] Configurable night-time lighting with 4 high-powered floodlight spotlight arrays.
- [x] URP Lit materials for grass (two-tone alternating bands), pitch, creases, wood, boundary rope, and concrete.
- [x] Single shadow-casting light setup with mobile shadow distance / cascade downscaling.
- [x] Runtime day/night toggling via [`StadiumLightingManager.cs`](file:///c:/Users/Shiven/Documents/Games/Cricket%20game/Assets/_Game/Scripts/Presentation/StadiumLightingManager.cs).

## 3. Broadcast Camera System
- [x] [`CameraDirector.cs`](file:///c:/Users/Shiven/Documents/Games/Cricket%20game/Assets/_Game/Scripts/Cameras/CameraDirector.cs) with 5 distinct broadcast perspectives:
  - `BattingBroadcast` (behind striker looking down pitch)
  - `BowlerRunUp` (trailing bowler run-up)
  - `BallFollow` (dynamic ball pursuit)
  - `BoundaryShot` (elevated grandstand boundary chase)
  - `DismissalView` (dramatic close-up replay on broken stumps)
- [x] Smooth transitions via `SmoothDamp` and `Slerp` with ground safety clamp.
- [x] Event-driven reactive camera changes responding to `CricketEvents`.
- [x] Input-driven manual camera cycling (`C` hotkey or touch toggle).

## 4. Temporary Player Models
- [x] Proportional 1.82m tall articulated humanoid silhouettes ([`PlaceholderPlayerRig.cs`](file:///c:/Users/Shiven/Documents/Games/Cricket%20game/Assets/_Game/Scripts/Players/PlaceholderPlayerRig.cs)).
- [x] Hierarchical bone transforms: Hips, Spine, Head, LeftArm, RightArm, LeftLeg, RightLeg, BatMount.
- [x] Crouched batting stance with willow bat mounted to hands.
- [x] Upright bowler delivery pose.
- [x] Structured for 100% seamless drop-in replacement with skinned humanoid FBX models.

## 5. Fielding Positions Data
- [x] 11-player placement definitions for Balanced, Attacking, and Defensive configurations ([`FieldingPositionsData.cs`](file:///c:/Users/Shiven/Documents/Games/Cricket%20game/Assets/_Game/Scripts/Presentation/FieldingPositionsData.cs)).
- [x] All fielders verified within the boundary oval.

## 6. Testing & Acceptance
- [x] Unit test suite covering pitch dimensions, boundary bounds, fielding presets, wickets break/reset, and camera modes ([`StadiumAndCameraTests.cs`](file:///c:/Users/Shiven/Documents/Games/Cricket%20game/Assets/_Game/Tests/StadiumAndCameraTests.cs)).
- [x] Verified zero regressions on Phase 1 test suite.
- [x] Technical architecture specification documented ([`Docs/Phase2_Architecture_And_Stadium_Spec.md`](file:///c:/Users/Shiven/Documents/Games/Cricket%20game/Docs/Phase2_Architecture_And_Stadium_Spec.md)).
