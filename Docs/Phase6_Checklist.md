# Cricket Legends — Phase 6: Match Flow & Scoring Checklist

## Match Configuration
- [x] Configurable number of overs (1 to 50).
- [x] Configurable maximum wickets (1 to 10).
- [x] Configurable 11-player squads for both teams (`MatchConfiguration`).
- [x] Configurable toss winner and decision (Bat / Bowl).
- [x] Configurable / dynamic target scores.
- [x] Unified match formats (`Exhibition`, `SuperOver`, `TwoOvers`, `FiveOvers`, `T20`, `ODI`, `Custom`).
- [x] In-memory factory helper `MatchConfiguration.CreateExhibition()`.

## Delivery Result Model
- [x] Create `DeliveryOutcomeInput` for raw physical gameplay outcomes.
- [x] Create immutable `DeliveryResult` containing all delivery metadata, runs, extras, legality, dismissal info, and strike rotation flag.
- [x] Implement explicit event-resolution pipeline.
- [x] Enforce single-resolution idempotency per `DeliveryId` (`_resolvedDeliveryIds`).

## Official Scoring & Rules Engine (`CricketRulesEngine`)
- [x] Legal delivery tracking (`LegalBallsInOver` and 6 legal balls = 1 over).
- [x] Dot balls, singles, twos, threes, fours, and sixes.
- [x] Wides: 1 extra penalty + overthrows; does not consume legal ball or count as batter ball faced; charged to bowler.
- [x] No-balls: 1 penalty + batter runs; does not consume legal ball; charged to bowler.
- [x] Edge case: No-ball combined with boundary four (5 runs total, 4 to batter, 0 legal balls).
- [x] Edge case: Wide combined with boundary overthrows (5 wides total, 0 to batter, 0 legal balls).
- [x] Byes and Leg-Byes: counted as extras, strike rotates on odd runs, not charged against bowler figures.
- [x] Dismissal protection on No-Balls: only Run-Out allowed under MCC Law 21.18.
- [x] Bowled, Caught, Stumped, LBW credit bowler; Run-Out does not credit bowler.
- [x] Dismissal tracking in `BatterStats` (`b Bowler`, `c Fielder b Bowler`, `run out`, `st Keeper b Bowler`).
- [x] Next batter automatically brought into crease from squad roster.
- [x] Strike rotation on odd runs (1, 3) and at over completion.
- [x] Bowler rotation at end of each over.
- [x] Maiden over detection and bowler figures tracking.
- [x] Innings completion when all out or overs expire.
- [x] Target score computation (1st innings total + 1).
- [x] Chasing target evaluation: Chasing team win by X wickets.
- [x] Defending team win by X runs.
- [x] Exact tie determination when scores are identical at innings conclusion.

## Scoreboard & UI Presentation
- [x] Create read-only `ScoreboardController` binding to `CricketRulesEngine`.
- [x] UI never awards runs directly; reads immutable `ScoreboardSnapshot`.
- [x] Displays: Runs/wickets, overs, striker, non-striker, bowler, latest delivery, extras, CRR, RRR, target, remaining runs/balls/wickets.
- [x] Detailed innings scorecard reporting with `InningsScorecardUI`.

## Automated NUnit Acceptance Tests (`MatchRulesAndScoringTests`)
- [x] `DotBall_AdvancesLegalBalls_AwardsNoRuns`
- [x] `Single_RotatesStrike_IncrementsScore`
- [x] `BoundaryFour_AwardsFourRuns_NoStrikeRotation`
- [x] `BoundarySix_AwardsSixRuns_NoStrikeRotation`
- [x] `Wide_AwardsOneExtra_DoesNotConsumeLegalBall_DoesNotCountAsBatterBall`
- [x] `NoBall_AwardsPenalty_AllowsBatterRuns_DoesNotConsumeLegalBall`
- [x] `ExtraWithBoundary_NoBallPlusFour_AwardsFiveRuns`
- [x] `ExtraWithBoundary_WidePlusFour_AwardsFiveWides`
- [x] `ByesAndLegByes_CountsAsExtras_NotChargedToBowler`
- [x] `Wicket_Bowled_DismissesStriker_BringsNewBatter`
- [x] `FinalLegalDeliveryOfOver_CompletesOver_RotatesBowler_RotatesStrike`
- [x] `InningsCompletion_WhenOversLimitReached_SetsTargetScore`
- [x] `InningsCompletion_WhenAllOut_SetsTargetScore`
- [x] `SuccessfulChase_AwardsMatchWinToChasingTeam`
- [x] `MatchTie_WhenScoresAreIdenticalAtInningsEnd`
- [x] `DuplicateDeliveryId_IsIgnoredIdempotently_NoDuplicateRunsOrBalls`
- [x] `ScoreboardController_DisplaysImmutableData_ReflectsRulesEngineState`
- [x] Web prototype regressions: 17/17 tests passing (`npm test`).
- [x] Web production build: Clean compile (`npm run build`).
