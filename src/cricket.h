#ifndef CRICKET_H
#define CRICKET_H

#include "raylib.h"
#include "raymath.h"
#include <stdbool.h>
#include <stdint.h>

#define MAX_OVERS 20
#define BALLS_PER_OVER 6
#define MAX_WICKETS 10
#define TOTAL_FIELDERS 11
#define SQUAD_SIZE 11
#define TEAM_COUNT 10
#define BOUNDARY_RADIUS 56.0f
#define PITCH_HALF_LENGTH 8.8f
#define BATTER_CREASE_Z 8.0f
#define BOWLER_CREASE_Z -8.0f
#define STUMPS_Z 8.8f
#define BOWLER_STUMPS_Z -8.8f

typedef enum {
    PLAYER_ROLE_BATTER,
    PLAYER_ROLE_WICKETKEEPER,
    PLAYER_ROLE_ALLROUNDER,
    PLAYER_ROLE_BOWLER
} PlayerRole;

typedef enum {
    ANIM_IDLE,
    ANIM_BAT_STANCE,
    ANIM_BAT_DEFENSE,
    ANIM_BAT_DRIVE,
    ANIM_BAT_PULL,
    ANIM_BAT_CUT,
    ANIM_BAT_LOFT,
    ANIM_RUNNING,
    ANIM_BOWLER_RUNUP,
    ANIM_BOWLER_RELEASE,
    ANIM_FIELDER_CROUCH,
    ANIM_FIELDER_CHASE,
    ANIM_FIELDER_THROW,
    ANIM_CELEBRATE
} AnimationState;

typedef struct {
    char name[48];
    char roleStr[24];
    PlayerRole role;
    int runsScored;
    int ballsFaced;
    int fours;
    int sixes;
    int wicketsTaken;
    int runsConceded;
    int ballsBowled;
    int maidenOvers;
    bool isOut;
    char dismissal[48];
    float battingRating;   /* 30 - 99 */
    float bowlingRating;   /* 30 - 99 */
    float speedRating;     /* km/h peak */
    Vector3 position;
    Vector3 targetPos;
    float rotationY;
    AnimationState animState;
    float animTimer;
} Player;

typedef struct {
    char name[32];
    Color primaryColor;
    Color secondaryColor;
    Color accentColor;
    Player players[SQUAD_SIZE];
} Team;

typedef enum {
    STATE_TEAM_SELECT,
    STATE_MATCH_SETTINGS,
    STATE_TOSS_CHOICE,
    STATE_COIN_SPIN,
    STATE_TOSS_DECISION,
    STATE_TOSS_RESULT,
    STATE_MATCH,
    STATE_INNINGS_BREAK,
    STATE_GAME_OVER
} GameState;

typedef enum {
    SHOT_NONE = 0,
    SHOT_PUSH = 1,
    SHOT_STROKE = 2,
    SHOT_LOFT = 3
} ShotType;

typedef enum {
    FOOTWORK_FRONT = 0,
    FOOTWORK_BACK = 1,
    FOOTWORK_ADVANCE = 2
} Footwork;

typedef enum {
    TIMING_NONE,
    TIMING_PERFECT,
    TIMING_GOOD,
    TIMING_EARLY,
    TIMING_LATE,
    TIMING_MISS,
    TIMING_EDGED
} TimingGrade;

typedef enum {
    DELIVERY_OUTSWING = 0,
    DELIVERY_INSWING = 1,
    DELIVERY_YORKER = 2,
    DELIVERY_BOUNCER = 3,
    DELIVERY_SEAM = 4,
    DELIVERY_SLOWER = 5
} DeliveryType;

typedef enum {
    BALL_STAGE_WAITING,
    BALL_STAGE_RUNUP,
    BALL_STAGE_BOWLED,
    BALL_STAGE_BOUNCED,
    BALL_STAGE_IN_PLAY,
    BALL_STAGE_BEATEN,
    BALL_STAGE_DEAD
} BallStage;

typedef enum {
    CAM_BEHIND_BOWLER = 0,  /* Exactly matches user's screenshot! */
    CAM_BATTER_PRO = 1,     /* Behind Batsman */
    CAM_BROADCAST = 2,      /* TV Side Press Box */
    CAM_BALL_TRACKER = 3,   /* Dynamic Ball Tracker */
    CAM_AERIAL = 4,         /* Tactical Overhead */
    CAM_COUNT = 5
} GameCameraMode;

typedef struct {
    Vector3 position;
    Vector3 velocity;
    float radius;
    bool active;
    bool hasBounced;
    bool hitByBat;
    Vector3 bouncePoint;
    float speedKmph;
    float spinRpm;
    float swingAmount;
    Vector3 targetPitch;
    DeliveryType deliveryType;
    BallStage stage;
    float flightTime;
    Vector3 trail[64];
    int trailCount;
} CricketBall;

typedef struct {
    Vector3 start;
    Vector3 end;
    Color color;
    int runs;
    bool isAerial;
} ShotWagonRecord;

typedef struct {
    ShotWagonRecord records[128];
    int count;
} WagonWheel;

typedef struct {
    Vector3 position;
    float angleDeg;
    bool active;
    bool hasBall;
    char positionName[24];
} FielderSlot;

typedef struct {
    Vector3 middleStump;
    bool bailsDislodged;
    float bail1Y;
    float bail2Y;
    Vector3 bail1Vel;
    Vector3 bail2Vel;
} Stumps;

typedef struct {
    int totalOvers;
    int difficulty; /* 0: Easy, 1: Normal, 2: Pro */
    int currentInnings;
    int score[2];
    int wickets[2];
    int ballsBowled[2];
    int extras[2];
    int targetScore;
    int partnershipRuns;
    int partnershipBalls;
    int currentOverRuns;
    int thisOverHistory[12];
    int thisOverCount;
    bool isPlayerBatting;
    Team *battingTeam;
    Team *bowlingTeam;
    int strikerIdx;
    int nonStrikerIdx;
    int bowlerIdx;
    int nextBatterIdx;

    /* Active delivery context */
    CricketBall ball;
    Stumps strikerStumps;
    Stumps nonStrikerStumps;
    FielderSlot fielders[TOTAL_FIELDERS];

    /* Shot selection & wheel (RC Swipe) */
    float shotAngleDeg;          /* 0 = straight down ground, 90 = offside/cover, -90 = legside */
    /* Batsman positioning & Footwork */
    float batsmanXOffset;        /* -0.4 to 0.4 on batting crease */
    Footwork footwork;
    ShotType chosenShot;
    TimingGrade lastTiming;
    float timingWindowScore;     /* -1.0 to 1.0 (0.0 is perfect) */
    char timingFeedback[32];
    float timingBannerTimer;
    char eventBanner[48];
    float eventBannerTimer;
    Color eventBannerColor;

    /* Bowling selection (when player bowls) */
    DeliveryType selectedDelivery;
    Vector3 bowlingPitchTarget;
    int bowlingSide;             /* 0: Over Wicket, 1: Around Wicket */
    float bowlingMeterValue;     /* 0.0 to 1.0 */
    bool bowlingMeterGoingUp;
    bool bowlingMeterLocked;
    float bowlingAccuracy;       /* 1.0 = perfect */

    /* Running between wickets */
    bool isRunning;
    int runsAttempted;
    int runsCompleted;
    float strikerRunProgress;    /* 0.0 at striker crease, 1.0 at non-striker crease */
    float nonStrikerRunProgress; /* 0.0 at non-striker crease, 1.0 at striker crease */
    bool runReturning;
    bool runoutOccurred;

    /* Fielder chasing & throwing */
    int chasingFielderIdx;
    Vector3 throwTargetStump;
    bool ballThrown;
    Vector3 throwVelocity;

    /* Stats & Presentation */
    WagonWheel wagonWheel;
    Camera3D camera;
    GameCameraMode cameraMode;
    float crowdCheerIntensity;
    float replayTimer;
    bool isReplay;
    char commentary[128];
} MatchState;

#endif /* CRICKET_H */
