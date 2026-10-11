# Cricket Legends — Phase 8: Broadcast UI & Cross-Platform Controls Checklist

## Broadcast UI Screens
- [x] Create `MainMenuScreen` (Play, Settings, How to Play, Quit).
- [x] Create `TeamSelectionScreen` (International team squads).
- [x] Create `MatchConfigurationScreen` (Overs, Wickets, Difficulty, Environment).
- [x] Create `TossScreen` (Coin flip, winner declaration, bat/bowl decision).
- [x] Create `BroadcastHUD` (Lower-third, over strip, event banners, unobstructed action).
- [x] Create `PauseMenuScreen` (Resume, Scorecard, Settings, Main Menu with time-scale freeze).
- [x] Create `InningsBreakScreen` (1st innings total, target, target run rate, start 2nd innings).
- [x] Create `MatchResultScreen` (Official result announcement, victory margins, scorecard view).
- [x] Create `SettingsScreen` (Audio volumes, graphics quality, mobile controls toggle).
- [x] Create `HowToPlayScreen` (Controls guide for PC keyboard and mobile touch).
- [x] Create `ScreenManager` (Stack-based screen navigation, overlays, back button).

## In-Match Broadcast HUD
- [x] Live score, wickets, and overs display.
- [x] Striker & non-striker cards with individual runs, balls faced, and boundary counts.
- [x] Current bowler with figures (overs, maidens, runs, wickets, economy).
- [x] Target score and Required Run Rate (RRR) during chase.
- [x] Ball-by-ball over sequence strip (`[ . | 1 | 4 | W | 6 ]`).
- [x] Event notification banners for boundaries and wickets (`ShowBanner`).
- [x] Unobstructed pitch framing: Pitch corridor, release point, and creases remain clear.
- [x] Text safety truncation (`FormatPlayerName`) preventing mobile layout overflows.

## Shared Cross-Platform Input Architecture
- [x] Unified `IInputService` interface shared across PC and Mobile.
- [x] PC `InputService` supporting configurable keybindings and runtime rebinding.
- [x] Mobile `TouchInputOverlay` supporting safe-area notch layout.
- [x] Virtual touch directional joystick for shot aiming.
- [x] Responsive touch buttons for Attack, Defend, Loft, Run, Cancel Run, and Pause.
- [x] Pointer gating (`IsPointerOverUI`): Prevents touches on HUD/UI from triggering in-world swings.
- [x] Zero duplicate gameplay code between PC and Mobile.

## Accessibility & Usability
- [x] Resolution scaling across aspect ratios (16:9, 18:9, 21:9, 4:3).
- [x] High-contrast broadcast visual language with accessible icon backing.
- [x] Generous touch hit areas ($\ge 44\times 44\text{ dp}$).
- [x] Restrained animations with rapid menu navigation.
- [x] TimeScale suspension during pause preserving zero score mutation.

## Automated Acceptance Tests (`BroadcastUIAndControlsTests.cs`)
- [x] `ScreenManager_OpensAndClosesScreens_MaintainsNavigationHistory`
- [x] `CrossPlatformInput_TouchAndKeyboardInvokeSameGameplayActions`
- [x] `TouchJoystick_GeneratesNormalizedAimVector`
- [x] `PauseMenu_FreezesTimeScale_PreservesMatchStateWithoutAccidentalScoreMutation`
- [x] `BroadcastHUD_TruncatesLongPlayerNames_PreventsOverflow`
- [x] `BroadcastHUD_DisplaysLowerThirdFormattedString`
- [x] `BroadcastHUD_EventBannersTriggerOnBoundariesAndWickets`
- [x] Web test suite passing 17/17 (`npm test`).
- [x] Web production build clean compile (`npm run build`).
