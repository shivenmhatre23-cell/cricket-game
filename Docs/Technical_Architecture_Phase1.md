# Cricket Legends — Technical Architecture (Phase 1)

## 1. System Overview

Cricket Legends is architected as a modular, event-driven professional cricket simulation built on **Unity 6 LTS** using the **Universal Render Pipeline (URP)**. The runtime architecture decouples hardware input, match state orchestration, delivery physics, and scoring rules.

```mermaid
flowchart TD
    subgraph Presentation & Input
        InputService["InputService (IInputService)"]
        TouchUI["Touch / Keyboard Controls"]
        TouchUI --> InputService
    end

    subgraph Core Lifecycle
        GameBootstrap["GameBootstrap [DefaultExecutionOrder -100]"]
        GameStateManager["GameStateManager (Validated State Machine)"]
        MatchConfig["MatchConfiguration (ScriptableObject)"]
        GameBootstrap --> GameStateManager
        GameBootstrap --> MatchConfig
    end

    subgraph Match Simulation
        MatchManager["MatchManager (Delivery & Score Engine)"]
        CricketEvents["CricketEvents (Type-Safe Event Bus)"]
        MatchManager --> GameStateManager
        MatchManager --> CricketEvents
        InputService --> MatchManager
    end

    subgraph Diagnostics
        CricketLogger["CricketLogger (Channeled Diagnostic Utility)"]
        GameStateManager -.-> CricketLogger
        MatchManager -.-> CricketLogger
    end
```

---

## 2. Finite State Machine (GameStateManager)

The game simulation strictly enforces a directed state transition graph. Invalid transitions (e.g. attempting to jump from `MainMenu` directly to `BallInPlay`) are rejected with diagnostic warnings.

```mermaid
stateDiagram-v2
    [*] --> MainMenu
    MainMenu --> Toss
    MainMenu --> Ready : Quick Match / Practice
    Toss --> Ready
    Toss --> MainMenu : Cancel

    Ready --> Bowling : Bowler Run-Up
    Ready --> Paused
    Ready --> MainMenu

    Bowling --> BallInPlay : Released / Struck
    Bowling --> Ready : Dead Ball / Reset
    Bowling --> Paused

    BallInPlay --> DeliveryResult : Pickup / Boundary / Wicket
    BallInPlay --> Paused

    DeliveryResult --> Ready : Next Ball
    DeliveryResult --> InningsBreak : Overs / Wickets Complete
    DeliveryResult --> MatchOver : Target Achieved / Final Over
    DeliveryResult --> Paused

    InningsBreak --> Ready : 2nd Innings Begins
    InningsBreak --> Paused

    MatchOver --> MainMenu
    MatchOver --> Ready : Rematch

    Paused --> PreviousState : Resume
    Paused --> MainMenu : Quit Match
```

### State Definitions
| State | Description | Invariants |
|---|---|---|
| `MainMenu` | Start screen & settings hub | No match entities spawned. |
| `Toss` | Coin toss ceremony & decision | Establishes batting/bowling sides. |
| `Ready` | Fielders set, batter waiting at crease | Delivery ID prepared; waiting for bowler trigger. |
| `Bowling` | Bowler in active run-up/arm rotation | **Exactly 1 active delivery allowed.** |
| `BallInPlay` | Ball moving, timing window, fielder chase | Physics active; hit collisions evaluated. |
| `DeliveryResult`| Outcome recorded (runs, wicket, extra) | Delivery completed flag released. |
| `InningsBreak` | 1st innings complete; target established | Score reset for chasing team; sides switched. |
| `MatchOver` | Final scorecard & victory screen | Match terminated; input disabled. |
| `Paused` | Pause menu overlay active | Stores previous unpaused state for resume. |

---

## 3. Core Subsystems

### 3.1 GameBootstrap
- Executes at `[DefaultExecutionOrder(-100)]`.
- Targets 60 FPS across desktop and mobile devices.
- Validates serialized references to `GameStateManager`, `MatchManager`, `InputService`, and `MatchConfiguration`.
- Provides automatic runtime fallback instances if components are unassigned, preventing null-reference crashes.

### 3.2 MatchManager & Delivery Invariant
- **Single Active Delivery Invariant**:
  ```csharp
  if (_isDeliveryActive)
  {
      CricketLogger.LogWarning(LogChannel.Gameplay,
          $"DELIVERY REJECTED: Delivery #{_activeDeliveryId} is currently active.");
      return false;
  }
  ```
- Manages legal deliveries per over (6 legal balls), dot balls, extras, wickets, maidens, and innings completion.
- Dispatches type-safe events via `CricketEvents`.

### 3.3 MatchConfiguration (ScriptableObject)
- Configurable in the Unity Inspector without recompilation.
- Parameters:
  - `MatchFormat`: SuperOver (1), TwoOvers (2), FiveOvers (5), T20 (20), ODI (50), Custom.
  - `DifficultyLevel`: Easy, Medium, Hard.
  - `StadiumEnvironment`: DaySunny, DayOvercast, NightFloodlights.
  - `BallColor`: WhiteLeather, RedLeather, PinkLeather.
  - `Team Names` & Batting order.

### 3.4 InputService (IInputService)
- Decouples hardware input devices from gameplay.
- Cross-platform support for:
  - Windows PC (Keyboard & Mouse, Gamepad).
  - Android & iOS (Touch screen UI, on-screen buttons, analog joysticks).
- Dispatches distinct batting actions:
  - `Defensive Block`, `Straight Drive`, `Cover Drive`, `Pull Shot`, `Cut Shot`, `Lofted Attack`.
