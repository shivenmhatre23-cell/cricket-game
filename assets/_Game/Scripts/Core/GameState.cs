namespace CricketLegends.Core
{
    /// <summary>
    /// Explicit high-level lifecycle states for the Cricket Legends match simulation.
    /// State transitions are strictly validated by GameStateManager.
    /// </summary>
    public enum GameState
    {
        /// <summary>Main Hub / Menus active before match start.</summary>
        MainMenu,

        /// <summary>Match toss ceremony and decision phase.</summary>
        Toss,

        /// <summary>Fielders in position, batter ready, waiting for bowler runup trigger.</summary>
        Ready,

        /// <summary>Bowler running in and delivering ball.</summary>
        Bowling,

        /// <summary>Ball released into air/pitch/bat contact window and active fielding chase.</summary>
        BallInPlay,

        /// <summary>Delivery completed: umpire scoring, run calculation, boundary/wicket callouts.</summary>
        DeliveryResult,

        /// <summary>Innings 1 complete: target established, changing sides.</summary>
        InningsBreak,

        /// <summary>Match completed: scorecard summary, result declared.</summary>
        MatchOver,

        /// <summary>Gameplay paused: pause menu active. Preserves resume state.</summary>
        Paused
    }
}
