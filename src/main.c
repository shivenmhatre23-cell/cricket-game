#include "raylib.h"
#include "raymath.h"
#include "cricket.h"
#include "physics.h"
#include "render_3d.h"
#include "ui.h"
#include "audio_synth.h"
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <string.h>

static Team g_teams[TEAM_COUNT];
static MatchState g_match;
static GameState g_state = STATE_TEAM_SELECT;

static int g_selectedTeam1 = 0;
static int g_selectedTeam2 = 1;
static int g_tossChoice = 0;
static int g_coinResult = 0;
static bool g_tossDecided = false;
static float g_tossTimer = 0.0f;

static void InitTeamsData(void) {
    /* 1. India */
    strcpy(g_teams[0].name, "India");
    g_teams[0].primaryColor = (Color){ 25, 95, 205, 255 };    /* Royal Blue */
    g_teams[0].secondaryColor = (Color){ 245, 120, 20, 255 }; /* Orange */
    g_teams[0].accentColor = (Color){ 245, 120, 20, 255 };
    const char *indPlayers[11] = {
        "Rohit Sharma", "Virat Kohli", "Suryakumar Yadav", "Hardik Pandya",
        "Rishabh Pant", "Ravindra Jadeja", "Axar Patel", "Kuldeep Yadav",
        "Jasprit Bumrah", "Mohammed Shami", "Mohammed Siraj"
    };
    for (int i = 0; i < 11; i++) {
        strcpy(g_teams[0].players[i].name, indPlayers[i]);
        g_teams[0].players[i].battingRating = (i < 5) ? 92.0f - i * 3.0f : 45.0f;
        g_teams[0].players[i].bowlingRating = (i >= 5) ? 90.0f - (10 - i) * 2.0f : 30.0f;
        g_teams[0].players[i].speedRating = (i == 8) ? 146.0f : (i == 9) ? 142.0f : (i == 10) ? 140.0f : 125.0f;
    }

    /* 2. Australia */
    strcpy(g_teams[1].name, "Australia");
    g_teams[1].primaryColor = (Color){ 235, 195, 25, 255 };  /* Canary Yellow */
    g_teams[1].secondaryColor = (Color){ 20, 110, 50, 255 };  /* Deep Green */
    g_teams[1].accentColor = (Color){ 20, 110, 50, 255 };
    const char *ausPlayers[11] = {
        "Travis Head", "David Warner", "Mitchell Marsh", "Steve Smith",
        "Glenn Maxwell", "Marcus Stoinis", "Tim David", "Pat Cummins",
        "Mitchell Starc", "Adam Zampa", "Josh Hazlewood"
    };
    for (int i = 0; i < 11; i++) {
        strcpy(g_teams[1].players[i].name, ausPlayers[i]);
        g_teams[1].players[i].battingRating = (i < 6) ? 90.0f - i * 3.0f : 50.0f;
        g_teams[1].players[i].bowlingRating = (i >= 6) ? 92.0f - (10 - i) * 2.0f : 35.0f;
        g_teams[1].players[i].speedRating = (i == 8) ? 148.0f : (i == 7) ? 143.0f : (i == 10) ? 140.0f : 128.0f;
    }

    /* 3. England */
    strcpy(g_teams[2].name, "England");
    g_teams[2].primaryColor = (Color){ 210, 35, 45, 255 };   /* England Red */
    g_teams[2].secondaryColor = (Color){ 20, 35, 95, 255 };   /* Navy */
    g_teams[2].accentColor = (Color){ 20, 35, 95, 255 };
    const char *engPlayers[11] = {
        "Jos Buttler", "Phil Salt", "Harry Brook", "Jonny Bairstow",
        "Liam Livingstone", "Moeen Ali", "Sam Curran", "Chris Jordan",
        "Jofra Archer", "Adil Rashid", "Mark Wood"
    };
    for (int i = 0; i < 11; i++) {
        strcpy(g_teams[2].players[i].name, engPlayers[i]);
        g_teams[2].players[i].battingRating = (i < 6) ? 88.0f - i * 3.0f : 48.0f;
        g_teams[2].players[i].bowlingRating = (i >= 6) ? 89.0f - (10 - i) * 2.0f : 35.0f;
        g_teams[2].players[i].speedRating = (i == 10) ? 152.0f : (i == 8) ? 147.0f : 130.0f;
    }

    /* 4. South Africa */
    strcpy(g_teams[3].name, "South Africa");
    g_teams[3].primaryColor = (Color){ 25, 115, 60, 255 };   /* Proteas Green */
    g_teams[3].secondaryColor = (Color){ 245, 195, 30, 255 };/* Gold */
    g_teams[3].accentColor = (Color){ 245, 195, 30, 255 };
    const char *saPlayers[11] = {
        "Quinton de Kock", "Reeza Hendricks", "Aiden Markram", "Heinrich Klaasen",
        "David Miller", "Tristan Stubbs", "Marco Jansen", "Keshav Maharaj",
        "Kagiso Rabada", "Anrich Nortje", "Tabraiz Shamsi"
    };
    for (int i = 0; i < 11; i++) {
        strcpy(g_teams[3].players[i].name, saPlayers[i]);
        g_teams[3].players[i].battingRating = (i < 6) ? 89.0f - i * 2.5f : 45.0f;
        g_teams[3].players[i].bowlingRating = (i >= 6) ? 91.0f - (10 - i) * 2.0f : 30.0f;
        g_teams[3].players[i].speedRating = (i == 9) ? 150.0f : (i == 8) ? 145.0f : 132.0f;
    }

    /* 5. Pakistan */
    strcpy(g_teams[4].name, "Pakistan");
    g_teams[4].primaryColor = (Color){ 10, 95, 55, 255 };    /* Dark Green */
    g_teams[4].secondaryColor = (Color){ 80, 190, 110, 255 };
    g_teams[4].accentColor = (Color){ 240, 240, 240, 255 };
    const char *pakPlayers[11] = {
        "Babar Azam", "Mohammad Rizwan", "Fakhar Zaman", "Saim Ayub",
        "Iftikhar Ahmed", "Shadab Khan", "Imad Wasim", "Shaheen Afridi",
        "Naseem Shah", "Haris Rauf", "Mohammad Amir"
    };
    for (int i = 0; i < 11; i++) {
        strcpy(g_teams[4].players[i].name, pakPlayers[i]);
        g_teams[4].players[i].battingRating = (i < 5) ? 87.0f - i * 3.0f : 42.0f;
        g_teams[4].players[i].bowlingRating = (i >= 5) ? 93.0f - (10 - i) * 2.0f : 30.0f;
        g_teams[4].players[i].speedRating = (i == 9) ? 149.0f : (i == 7) ? 144.0f : 134.0f;
    }

    /* 6. New Zealand */
    strcpy(g_teams[5].name, "New Zealand");
    g_teams[5].primaryColor = (Color){ 30, 30, 35, 255 };     /* Black Caps */
    g_teams[5].secondaryColor = (Color){ 40, 160, 180, 255 };  /* Teal */
    g_teams[5].accentColor = (Color){ 40, 160, 180, 255 };
    const char *nzPlayers[11] = {
        "Finn Allen", "Devon Conway", "Kane Williamson", "Daryl Mitchell",
        "Glenn Phillips", "James Neesham", "Mitchell Santner", "Matt Henry",
        "Tim Southee", "Lockie Ferguson", "Trent Boult"
    };
    for (int i = 0; i < 11; i++) {
        strcpy(g_teams[5].players[i].name, nzPlayers[i]);
        g_teams[5].players[i].battingRating = (i < 6) ? 87.0f - i * 2.5f : 46.0f;
        g_teams[5].players[i].bowlingRating = (i >= 6) ? 89.0f - (10 - i) * 2.0f : 32.0f;
        g_teams[5].players[i].speedRating = (i == 9) ? 148.0f : 135.0f;
    }

    /* 7. West Indies */
    strcpy(g_teams[6].name, "West Indies");
    g_teams[6].primaryColor = (Color){ 130, 25, 45, 255 };    /* Maroon */
    g_teams[6].secondaryColor = (Color){ 245, 195, 30, 255 }; /* Gold */
    g_teams[6].accentColor = (Color){ 245, 195, 30, 255 };
    const char *wiPlayers[11] = {
        "Brandon King", "Johnson Charles", "Nicholas Pooran", "Rovman Powell",
        "Sherfane Rutherford", "Andre Russell", "Romario Shepherd", "Akeal Hosein",
        "Gudakesh Motie", "Alzarri Joseph", "Shamar Joseph"
    };
    for (int i = 0; i < 11; i++) {
        strcpy(g_teams[6].players[i].name, wiPlayers[i]);
        g_teams[6].players[i].battingRating = (i < 6) ? 88.0f - i * 2.0f : 50.0f;
        g_teams[6].players[i].bowlingRating = (i >= 5) ? 87.0f - (10 - i) * 2.0f : 30.0f;
        g_teams[6].players[i].speedRating = (i == 10) ? 150.0f : (i == 9) ? 144.0f : 130.0f;
    }

    /* 8. Sri Lanka */
    strcpy(g_teams[7].name, "Sri Lanka");
    g_teams[7].primaryColor = (Color){ 20, 55, 140, 255 };    /* Royal Blue */
    g_teams[7].secondaryColor = (Color){ 235, 180, 25, 255 }; /* Yellow */
    g_teams[7].accentColor = (Color){ 235, 180, 25, 255 };
    const char *slPlayers[11] = {
        "Pathum Nissanka", "Kusal Mendis", "Kamindu Mendis", "Charith Asalanka",
        "Angelo Mathews", "Dasun Shanaka", "Wanindu Hasaranga", "Maheesh Theekshana",
        "Dunith Wellalage", "Matheesha Pathirana", "Dilshan Madushanka"
    };
    for (int i = 0; i < 11; i++) {
        strcpy(g_teams[7].players[i].name, slPlayers[i]);
        g_teams[7].players[i].battingRating = (i < 5) ? 85.0f - i * 2.5f : 44.0f;
        g_teams[7].players[i].bowlingRating = (i >= 5) ? 88.0f - (10 - i) * 2.0f : 30.0f;
        g_teams[7].players[i].speedRating = (i == 9) ? 148.0f : 132.0f;
    }

    /* 9. Bangladesh */
    strcpy(g_teams[8].name, "Bangladesh");
    g_teams[8].primaryColor = (Color){ 20, 100, 60, 255 };    /* Green */
    g_teams[8].secondaryColor = (Color){ 220, 35, 45, 255 };   /* Red */
    g_teams[8].accentColor = (Color){ 220, 35, 45, 255 };
    const char *banPlayers[11] = {
        "Tanzid Hasan", "Litton Das", "Najmul Hossain Shanto", "Towhid Hridoy",
        "Shakib Al Hasan", "Mahmudullah", "Jaker Ali", "Rishad Hossain",
        "Taskin Ahmed", "Mustafizur Rahman", "Shoriful Islam"
    };
    for (int i = 0; i < 11; i++) {
        strcpy(g_teams[8].players[i].name, banPlayers[i]);
        g_teams[8].players[i].battingRating = (i < 5) ? 82.0f - i * 2.5f : 40.0f;
        g_teams[8].players[i].bowlingRating = (i >= 5) ? 86.0f - (10 - i) * 2.0f : 30.0f;
        g_teams[8].players[i].speedRating = (i == 8) ? 142.0f : 130.0f;
    }

    /* 10. Afghanistan */
    strcpy(g_teams[9].name, "Afghanistan");
    g_teams[9].primaryColor = (Color){ 30, 85, 185, 255 };    /* Blue */
    g_teams[9].secondaryColor = (Color){ 210, 35, 45, 255 };  /* Red */
    g_teams[9].accentColor = (Color){ 240, 240, 240, 255 };
    const char *afgPlayers[11] = {
        "Rahmanullah Gurbaz", "Ibrahim Zadran", "Gulbadin Naib", "Azmatullah Omarzai",
        "Mohammad Nabi", "Najibullah Zadran", "Rashid Khan", "Karim Janat",
        "Noor Ahmad", "Naveen-ul-Haq", "Fazalhaq Farooqi"
    };
    for (int i = 0; i < 11; i++) {
        strcpy(g_teams[9].players[i].name, afgPlayers[i]);
        g_teams[9].players[i].battingRating = (i < 5) ? 85.0f - i * 2.5f : 42.0f;
        g_teams[9].players[i].bowlingRating = (i >= 5) ? 91.0f - (10 - i) * 2.0f : 30.0f;
        g_teams[9].players[i].speedRating = (i == 10) ? 141.0f : 128.0f;
    }
}

static void StartNewMatch(void) {
    memset(&g_match, 0, sizeof(MatchState));
    g_match.totalOvers = 5; /* 5 Overs dynamic match */
    g_match.difficulty = 1;
    g_match.currentInnings = 1;
    g_match.cameraMode = CAM_BEHIND_BOWLER; /* Matches Real Cricket screenshot! */
    g_match.chosenShot = SHOT_STROKE;
    g_match.footwork = FOOTWORK_FRONT;
    g_match.selectedDelivery = DELIVERY_OUTSWING;
    g_match.bowlingPitchTarget = (Vector3){ 0.15f, 0.05f, 5.2f };
    g_match.bowlingMeterGoingUp = true;

    /* Setup Batting and Bowling teams */
    if (g_match.isPlayerBatting) {
        g_match.battingTeam = &g_teams[g_selectedTeam1];
        g_match.bowlingTeam = &g_teams[g_selectedTeam2];
    } else {
        g_match.battingTeam = &g_teams[g_selectedTeam2];
        g_match.bowlingTeam = &g_teams[g_selectedTeam1];
    }

    g_match.strikerIdx = 0;
    g_match.nonStrikerIdx = 1;
    g_match.bowlerIdx = 10; /* Opening pace bowler */
    g_match.nextBatterIdx = 2;

    Physics_InitMatch(&g_match);
    Physics_ResetDelivery(&g_match);

    /* If AI is bowling, start run-up automatically */
    if (g_match.isPlayerBatting) {
        Physics_StartBowlerRunup(&g_match);
    }
}

int main(void) {
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_MSAA_4X_HINT);
    InitWindow(1280, 720, "Real Cricket 24 - PC Edition");
    SetWindowMinSize(960, 540);
    SetTargetFPS(60);

    srand((unsigned int)time(NULL));

    AudioSynth_Init();
    Render3D_Init();
    InitTeamsData();
    g_match.battingTeam = &g_teams[0];
    g_match.bowlingTeam = &g_teams[1];
    g_match.cameraMode = CAM_BATTER_PRO;
    Physics_InitMatch(&g_match);

    while (!WindowShouldClose()) {
        float dt = GetFrameTime();
        int screenWidth = GetScreenWidth();
        int screenHeight = GetScreenHeight();

        /* Global Audio & Camera Key bindings */
        if (IsKeyPressed(KEY_F1)) g_match.cameraMode = CAM_BEHIND_BOWLER;
        if (IsKeyPressed(KEY_F2)) g_match.cameraMode = CAM_BATTER_PRO;
        if (IsKeyPressed(KEY_F3)) g_match.cameraMode = CAM_BROADCAST;
        if (IsKeyPressed(KEY_F4)) g_match.cameraMode = CAM_BALL_TRACKER;
        if (IsKeyPressed(KEY_F5)) g_match.cameraMode = CAM_AERIAL;
        if (IsKeyPressed(KEY_C))  g_match.cameraMode = (GameCameraMode)((g_match.cameraMode + 1) % CAM_COUNT);

        switch (g_state) {
            case STATE_TEAM_SELECT: {
                int chosen = -1;
                for (int k = 0; k < TEAM_COUNT; k++) {
                    if (IsKeyPressed(KEY_ZERO + k) || IsKeyPressed(KEY_KP_0 + k)) {
                        chosen = k;
                        break;
                    }
                }
                if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
                    Vector2 mouse = GetMousePosition();
                    float gridStartX = (float)screenWidth * 0.5f - 400.0f;
                    float gridStartY = 120.0f;
                    for (int k = 0; k < TEAM_COUNT; k++) {
                        int col = k / 5;
                        int row = k % 5;
                        float cardX = gridStartX + (float)col * 410.0f;
                        float cardY = gridStartY + (float)row * 72.0f;
                        if (CheckCollisionPointRec(mouse, (Rectangle){ cardX, cardY, 390, 62 })) {
                            chosen = k;
                            break;
                        }
                    }
                }
                if (chosen >= 0 && chosen < TEAM_COUNT) {
                    AudioSynth_PlayUIClick();
                    g_selectedTeam1 = chosen;
                    /* Pick opponent */
                    do {
                        g_selectedTeam2 = rand() % TEAM_COUNT;
                    } while (g_selectedTeam2 == g_selectedTeam1);
                    g_tossChoice = 0;
                    g_tossDecided = false;
                    g_match.battingTeam = &g_teams[g_selectedTeam1];
                    g_match.bowlingTeam = &g_teams[g_selectedTeam2];
                    g_state = STATE_TOSS_CHOICE;
                }
                break;
            }

            case STATE_TOSS_CHOICE: {
                if (IsKeyPressed(KEY_ONE) || IsKeyPressed(KEY_KP_1)) {
                    AudioSynth_PlayUIClick();
                    g_tossChoice = 1; /* Heads */
                    g_tossTimer = 0.0f;
                    g_state = STATE_COIN_SPIN;
                } else if (IsKeyPressed(KEY_TWO) || IsKeyPressed(KEY_KP_2)) {
                    AudioSynth_PlayUIClick();
                    g_tossChoice = 2; /* Tails */
                    g_tossTimer = 0.0f;
                    g_state = STATE_COIN_SPIN;
                }
                break;
            }

            case STATE_COIN_SPIN: {
                g_tossTimer += dt;
                if (g_tossTimer >= 1.6f) {
                    g_coinResult = rand() % 2; /* 0: Heads, 1: Tails */
                    bool playerWon = (g_tossChoice - 1 == g_coinResult);
                    g_tossDecided = true;
                    if (playerWon) {
                        g_match.isPlayerBatting = true;
                    } else {
                        g_match.isPlayerBatting = (rand() % 2 == 0);
                    }
                    g_state = STATE_TOSS_RESULT;
                }
                break;
            }

            case STATE_TOSS_RESULT: {
                if (IsKeyPressed(KEY_SPACE) || IsKeyPressed(KEY_ENTER) || IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
                    AudioSynth_PlayUIClick();
                    StartNewMatch();
                    g_state = STATE_MATCH;
                }
                break;
            }

            case STATE_MATCH: {
                /* Update 3D Camera & Physics */
                Render3D_UpdateCamera(&g_match, dt);
                Physics_Update(&g_match, dt);

                /* Player Batting Controls */
                if (g_match.isPlayerBatting) {
                    /* Crease movement (RHB Left/Right) */
                    if (IsKeyPressed(KEY_Q)) g_match.batsmanXOffset = fmaxf(-0.35f, g_match.batsmanXOffset - 0.12f);
                    if (IsKeyPressed(KEY_E)) g_match.batsmanXOffset = fminf(0.35f, g_match.batsmanXOffset + 0.12f);

                    /* Footwork selection */
                    if (IsKeyPressed(KEY_F)) g_match.footwork = FOOTWORK_FRONT;
                    if (IsKeyPressed(KEY_B)) g_match.footwork = FOOTWORK_BACK;

                    /* Shot Style Selection */
                    if (IsKeyPressed(KEY_ONE))   g_match.chosenShot = SHOT_PUSH;
                    if (IsKeyPressed(KEY_TWO))   g_match.chosenShot = SHOT_STROKE;
                    if (IsKeyPressed(KEY_THREE)) g_match.chosenShot = SHOT_LOFT;

                    /* RC Swipe / Shot Angle Aiming */
                    if (IsKeyDown(KEY_W) || IsKeyDown(KEY_UP)) {
                        if (IsKeyDown(KEY_D) || IsKeyDown(KEY_RIGHT)) g_match.shotAngleDeg = 45.0f;       /* Cover Drive */
                        else if (IsKeyDown(KEY_A) || IsKeyDown(KEY_LEFT)) g_match.shotAngleDeg = -45.0f;   /* On Drive */
                        else g_match.shotAngleDeg = 0.0f;                                                 /* Straight */
                    } else if (IsKeyDown(KEY_D) || IsKeyDown(KEY_RIGHT)) {
                        if (IsKeyDown(KEY_S) || IsKeyDown(KEY_DOWN)) g_match.shotAngleDeg = 135.0f;      /* Late Cut */
                        else g_match.shotAngleDeg = 90.0f;                                                /* Square Cut */
                    } else if (IsKeyDown(KEY_A) || IsKeyDown(KEY_LEFT)) {
                        if (IsKeyDown(KEY_S) || IsKeyDown(KEY_DOWN)) g_match.shotAngleDeg = -135.0f;     /* Fine Leg */
                        else g_match.shotAngleDeg = -90.0f;                                               /* Pull/Square Leg */
                    }

                    /* Mouse wheel angle adjustment */
                    float wheelMove = GetMouseWheelMove();
                    if (wheelMove != 0.0f) {
                        g_match.shotAngleDeg += wheelMove * 15.0f;
                    }

                    /* Shot Trigger when ball is incoming */
                    bool shotTriggered = IsKeyPressed(KEY_J) || IsKeyPressed(KEY_K) || IsKeyPressed(KEY_L) ||
                                         IsKeyPressed(KEY_SPACE) || (IsMouseButtonPressed(MOUSE_BUTTON_LEFT) && GetMousePosition().x > screenWidth * 0.4f && GetMousePosition().y < screenHeight - 90);

                    if (shotTriggered) {
                        if (IsKeyPressed(KEY_J)) g_match.chosenShot = SHOT_PUSH;
                        if (IsKeyPressed(KEY_K)) g_match.chosenShot = SHOT_STROKE;
                        if (IsKeyPressed(KEY_L)) g_match.chosenShot = SHOT_LOFT;
                        Physics_ExecuteBatterShot(&g_match, g_match.chosenShot, g_match.shotAngleDeg, g_match.footwork);
                    }

                    /* Active Running Controls */
                    if (IsKeyPressed(KEY_R)) Physics_CallRun(&g_match);
                    if (IsKeyPressed(KEY_S)) Physics_StopRun(&g_match);
                } else {
                    /* Player Bowling Controls */
                    /* Bowling accuracy release meter oscillation */
                    if (g_match.bowlingMeterGoingUp) {
                        g_match.bowlingMeterValue += 2.0f * dt;
                        if (g_match.bowlingMeterValue >= 1.0f) {
                            g_match.bowlingMeterValue = 1.0f;
                            g_match.bowlingMeterGoingUp = false;
                        }
                    } else {
                        g_match.bowlingMeterValue -= 2.0f * dt;
                        if (g_match.bowlingMeterValue <= 0.0f) {
                            g_match.bowlingMeterValue = 0.0f;
                            g_match.bowlingMeterGoingUp = true;
                        }
                    }

                    /* Aim Pitch reticle (Line & Length) */
                    float aimSpeed = 4.2f * dt;
                    if (IsKeyDown(KEY_W) || IsKeyDown(KEY_UP))   g_match.bowlingPitchTarget.z += aimSpeed;
                    if (IsKeyDown(KEY_S) || IsKeyDown(KEY_DOWN)) g_match.bowlingPitchTarget.z -= aimSpeed;
                    if (IsKeyDown(KEY_A) || IsKeyDown(KEY_LEFT)) g_match.bowlingPitchTarget.x -= aimSpeed;
                    if (IsKeyDown(KEY_D) || IsKeyDown(KEY_RIGHT)) g_match.bowlingPitchTarget.x += aimSpeed;

                    /* Clamp target to pitch boundaries */
                    if (g_match.bowlingPitchTarget.z < 1.0f) g_match.bowlingPitchTarget.z = 1.0f;
                    if (g_match.bowlingPitchTarget.z > 7.5f) g_match.bowlingPitchTarget.z = 7.5f;
                    if (g_match.bowlingPitchTarget.x < -0.9f) g_match.bowlingPitchTarget.x = -0.9f;
                    if (g_match.bowlingPitchTarget.x > 0.9f) g_match.bowlingPitchTarget.x = 0.9f;

                    /* Select Delivery Type */
                    if (IsKeyPressed(KEY_ONE))   g_match.selectedDelivery = DELIVERY_OUTSWING;
                    if (IsKeyPressed(KEY_TWO))   g_match.selectedDelivery = DELIVERY_INSWING;
                    if (IsKeyPressed(KEY_THREE)) g_match.selectedDelivery = DELIVERY_YORKER;
                    if (IsKeyPressed(KEY_FOUR))  g_match.selectedDelivery = DELIVERY_BOUNCER;
                    if (IsKeyPressed(KEY_FIVE))  g_match.selectedDelivery = DELIVERY_SEAM;
                    if (IsKeyPressed(KEY_SIX))   g_match.selectedDelivery = DELIVERY_SLOWER;

                    /* Toggle Over / Around the Wicket */
                    if (IsKeyPressed(KEY_T)) g_match.bowlingSide = 1 - g_match.bowlingSide;

                    /* Start Bowler Run-Up with SPACE */
                    if (IsKeyPressed(KEY_SPACE) && g_match.ball.stage == BALL_STAGE_WAITING) {
                        float diff = fabsf(g_match.bowlingMeterValue - 0.5f);
                        g_match.bowlingAccuracy = fmaxf(0.2f, 1.0f - diff * 2.0f);
                        Physics_StartBowlerRunup(&g_match);
                    }

                    /* AI Batsman shot timing logic when player bowls */
                    if (g_match.ball.stage == BALL_STAGE_BOUNCED && !g_match.ball.hitByBat) {
                        if (g_match.ball.position.z >= 7.2f && g_match.ball.position.z <= 8.2f) {
                            ShotType aiShot = (rand() % 100 < 30) ? SHOT_LOFT : (rand() % 100 < 75) ? SHOT_STROKE : SHOT_PUSH;
                            float aiAngle = ((float)rand() / (float)RAND_MAX * 240.0f - 120.0f);
                            Physics_ExecuteBatterShot(&g_match, aiShot, aiAngle, FOOTWORK_FRONT);
                        }
                    }
                }

                /* Check for delivery end & next ball transition */
                CricketBall *b = &g_match.ball;
                if ((b->stage == BALL_STAGE_DEAD || b->stage == BALL_STAGE_BEATEN) && !g_match.isRunning) {
                    /* Check wicket or innings/match progression */
                    static float postDeliveryTimer = 0.0f;
                    postDeliveryTimer += dt;

                    if (postDeliveryTimer >= 2.0f) {
                        postDeliveryTimer = 0.0f;
                        int innIdx = g_match.currentInnings - 1;

                        /* If striker got out, bring next batter */
                        if (g_match.battingTeam->players[g_match.strikerIdx].isOut) {
                            if (g_match.nextBatterIdx < SQUAD_SIZE) {
                                g_match.strikerIdx = g_match.nextBatterIdx++;
                            }
                        }

                        g_match.ballsBowled[innIdx]++;
                        g_match.battingTeam->players[g_match.strikerIdx].ballsFaced++;
                        g_match.bowlingTeam->players[g_match.bowlerIdx].ballsBowled++;

                        /* Check End of Over */
                        if (g_match.ballsBowled[innIdx] % BALLS_PER_OVER == 0) {
                            /* Swap striker and non-striker ends */
                            int temp = g_match.strikerIdx;
                            g_match.strikerIdx = g_match.nonStrikerIdx;
                            g_match.nonStrikerIdx = temp;

                            /* Rotate bowler */
                            int currentBowler = g_match.bowlerIdx;
                            do {
                                g_match.bowlerIdx = 6 + (rand() % 5);
                            } while (g_match.bowlerIdx == currentBowler);
                        }

                        /* Check End of Innings or Match */
                        bool allOut = (g_match.wickets[innIdx] >= MAX_WICKETS);
                        bool oversDone = (g_match.ballsBowled[innIdx] >= g_match.totalOvers * BALLS_PER_OVER);
                        bool targetChased = (g_match.currentInnings == 2 && g_match.score[1] >= g_match.targetScore);

                        if (g_match.currentInnings == 1 && (allOut || oversDone)) {
                            /* Innings Break */
                            g_match.targetScore = g_match.score[0] + 1;
                            g_match.currentInnings = 2;
                            Team *temp = g_match.battingTeam;
                            g_match.battingTeam = g_match.bowlingTeam;
                            g_match.bowlingTeam = temp;
                            g_match.isPlayerBatting = !g_match.isPlayerBatting;
                            g_match.strikerIdx = 0;
                            g_match.nonStrikerIdx = 1;
                            g_match.bowlerIdx = 10;
                            g_match.nextBatterIdx = 2;
                            g_match.thisOverCount = 0;
                            snprintf(g_match.eventBanner, sizeof(g_match.eventBanner), "INNINGS BREAK! TARGET: %d", g_match.targetScore);
                            g_match.eventBannerTimer = 3.5f;
                            g_match.eventBannerColor = (Color){ 245, 180, 40, 255 };
                            Physics_ResetDelivery(&g_match);
                        } else if (g_match.currentInnings == 2 && (allOut || oversDone || targetChased)) {
                            /* Game Over */
                            g_state = STATE_GAME_OVER;
                        } else {
                            /* Next Ball */
                            Physics_ResetDelivery(&g_match);
                            if (g_match.isPlayerBatting) {
                                Physics_StartBowlerRunup(&g_match);
                            }
                        }
                    }
                }
                break;
            }

            case STATE_GAME_OVER: {
                if (IsKeyPressed(KEY_SPACE) || IsKeyPressed(KEY_R)) {
                    AudioSynth_PlayUIClick();
                    g_state = STATE_TEAM_SELECT;
                }
                break;
            }

            default:
                break;
        }

        /* Begin Frame Rendering */
        BeginDrawing();
        ClearBackground((Color){ 135, 206, 235, 255 }); /* Clear Stadium Sky Blue */

        if (g_state == STATE_TEAM_SELECT) {
            UI_DrawTeamSelect(g_teams, TEAM_COUNT, &g_selectedTeam1, &g_selectedTeam2, screenWidth, screenHeight);
        } else if (g_state == STATE_TOSS_CHOICE || g_state == STATE_COIN_SPIN || g_state == STATE_TOSS_RESULT) {
            /* Render 3D stadium in background of toss */
            Render3D_DrawScene(&g_match);
            UI_DrawTossScreen(&g_match, g_tossChoice, g_coinResult, g_tossDecided, g_tossTimer, screenWidth, screenHeight);
        } else if (g_state == STATE_MATCH) {
            Render3D_DrawScene(&g_match);
            UI_DrawBroadcastHUD(&g_match, screenWidth, screenHeight);
            UI_DrawBattingControls(&g_match, screenWidth, screenHeight);
            UI_DrawBowlingControls(&g_match, screenWidth, screenHeight);
            UI_DrawRunningControls(&g_match, screenWidth, screenHeight);
        } else if (g_state == STATE_GAME_OVER) {
            Render3D_DrawScene(&g_match);
            UI_DrawScorecard(&g_match, screenWidth, screenHeight);
        }

        DrawFPS(20, screenHeight - 28);
        EndDrawing();
    }

    /* Cleanup */
    Render3D_Close();
    AudioSynth_Close();
    CloseWindow();
    return 0;
}
