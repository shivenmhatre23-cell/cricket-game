# Cricket Legends — Unity 6 Setup & Onboarding Guide

## 1. Environment & Prerequisites

To open and run the Unity edition of **Cricket Legends**, install:
- **Unity Hub**: [Download Unity Hub](https://unity.com/download)
- **Unity Editor Version**: **Unity 6.0 LTS** (Specifically `6000.0.32f1` or later Unity 6 release).
- **Target Modules**:
  - Windows Build Support (IL2CPP or Mono).
  - Android Build Support (OpenJDK, Android SDK & NDK tools).

---

## 2. Opening the Project in Unity Hub

1. Open **Unity Hub**.
2. Click the **Add** dropdown in the top-right corner of the Projects tab and select **Add project from disk**.
3. Select the folder:
   ```
   C:\Users\Shiven\Documents\Games\Cricket game
   ```
4. Unity Hub will read `ProjectSettings/ProjectVersion.txt` and match it to **Unity 6 (6000.0.32f1)**.
5. Click the project to launch. Unity will automatically download and resolve the dependencies defined in `Packages/manifest.json`:
   - Universal Render Pipeline (`com.unity.render-pipelines.universal`)
   - New Input System (`com.unity.inputsystem`)
   - Unity Test Framework (`com.unity.test-framework`)
   - TextMeshPro (`com.unity.textmeshpro`)

---

## 3. Project Structure

The project is structured according to modular engineering standards:

```text
Cricket game/
├── Assets/
│   └── _Game/
│       ├── Animations/       # Player batting, bowling, fielding animations
│       ├── Audio/            # Match audio clips & ambient crowd loops
│       ├── Materials/        # PBR pitch, grass, stadium, and ball materials
│       ├── Prefabs/          # Stadium, wickets, player models, HUD prefabs
│       ├── Scenes/           # MainMenu, StadiumArena, PracticeNets scenes
│       ├── Scripts/          # Core runtime architecture
│       │   ├── AI/           # Bowling & Fielding AI controllers
│       │   ├── Core/         # GameBootstrap, GameStateManager, CricketEvents, CricketLogger
│       │   ├── Gameplay/     # MatchManager, MatchConfiguration
│       │   ├── Input/        # IInputService, InputService
│       │   ├── Physics/      # Ball trajectory, turf bounce, bat collisions
│       │   ├── Players/      # BatsmanController, BowlerController, FielderController
│       │   ├── Rules/        # Cricket rules engine & dismissal validators
│       │   ├── SaveSystem/   # Tournament and settings serialization
│       │   └── UI/           # Broadcast HUD, menus, timing meter
│       └── Tests/            # Unit & PlayMode test suites
├── Packages/
│   └── manifest.json         # URP, Input System, Test Framework
├── ProjectSettings/
│   └── ProjectVersion.txt    # Unity 6.0 LTS version lock
└── Docs/                     # Technical architecture & setup guides
```

---

## 4. Running the Test Suite in Unity

1. Inside the Unity Editor, open the Test Runner window:
   - Navigate to `Window` ➔ `General` ➔ `Test Runner`.
2. Select the **EditMode** or **PlayMode** tab.
3. Click **Run All** to execute:
   - `GameStateManagerTests` (Validates 9 states, transitions, invalid transition rejections, and pause resumption).
   - `MatchManagerTests` (Validates single active delivery invariant, over counting, and scoring).

---

## 5. Input Controls (PC & Touch)

| Key | Touch Button | Action |
|---|---|---|
| <kbd>Space</kbd> / <kbd>Enter</kbd> | On-Screen [BOWL] / [SWING] | Initiate delivery or strike ball |
| <kbd>1</kbd> / <kbd>Q</kbd> | Defensive Button | Defensive Block |
| <kbd>2</kbd> / <kbd>W</kbd> | Straight Drive Button | Straight Ground Drive |
| <kbd>3</kbd> / <kbd>E</kbd> | Cover Drive Button | Cover Drive |
| <kbd>4</kbd> / <kbd>A</kbd> | Pull Button | Pull Shot |
| <kbd>5</kbd> / <kbd>D</kbd> | Cut Button | Square Cut |
| <kbd>6</kbd> / <kbd>L</kbd> | Lofted Attack Button | Aerial Lofted Shot |
| <kbd>R</kbd> | Re-Bowl / Run Button | Instant Re-Bowl (Practice) or Call Run |
| <kbd>C</kbd> | Camera Pill | Cycle Broadcast Cameras |
| <kbd>Esc</kbd> / <kbd>P</kbd> | Pause Button | Toggle Pause Menu |
