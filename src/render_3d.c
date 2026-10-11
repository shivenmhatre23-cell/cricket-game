#include "render_3d.h"
#include <math.h>

#define PI_F 3.14159265358979323846f

void Render3D_Init(void) {
    /* Ready for procedural 3D drawing */
}

void Render3D_Close(void) {
    /* Cleanup if any loaded models */
}

static void DrawCricketGround(void) {
    /* Outfield lawn with 10 alternating circular cut bands */
    int bands = 12;
    for (int b = bands; b >= 1; b--) {
        float r = (BOUNDARY_RADIUS + 8.0f) * ((float)b / (float)bands);
        Color grassColor = (b % 2 == 0) ? (Color){ 42, 128, 52, 255 } : (Color){ 36, 114, 46, 255 };
        DrawCircle3D((Vector3){ 0.0f, -0.05f, 0.0f }, r, (Vector3){ 1.0f, 0.0f, 0.0f }, 90.0f, grassColor);
    }

    /* 30-yard fielding restriction circle (radius ~ 27.4m) */
    DrawCircle3D((Vector3){ 0.0f, -0.04f, 0.0f }, 27.4f, (Vector3){ 1.0f, 0.0f, 0.0f }, 90.0f, Fade(WHITE, 0.55f));

    /* Boundary Rope */
    DrawCircle3D((Vector3){ 0.0f, -0.03f, 0.0f }, BOUNDARY_RADIUS, (Vector3){ 1.0f, 0.0f, 0.0f }, 90.0f, RAYWHITE);
    DrawCircle3D((Vector3){ 0.0f, -0.025f, 0.0f }, BOUNDARY_RADIUS + 0.35f, (Vector3){ 1.0f, 0.0f, 0.0f }, 90.0f, (Color){ 220, 20, 30, 255 });

    /* Boundary advertising wedges along perimeter */
    int wedgeCount = 36;
    for (int i = 0; i < wedgeCount; i++) {
        float ang = 2.0f * PI_F * (float)i / (float)wedgeCount;
        float wx = cosf(ang) * (BOUNDARY_RADIUS + 0.6f);
        float wz = sinf(ang) * (BOUNDARY_RADIUS + 0.6f);
        Color adCol = (i % 3 == 0) ? (Color){ 0, 102, 204, 255 } : (i % 3 == 1) ? (Color){ 220, 40, 40, 255 } : (Color){ 240, 180, 0, 255 };
        DrawCube((Vector3){ wx, 0.2f, wz }, 1.8f, 0.4f, 0.5f, adCol);
    }

    /* Cricket Pitch (Clay/turf surface) */
    DrawCube((Vector3){ 0.0f, -0.01f, 0.0f }, 3.05f, 0.08f, 22.0f, (Color){ 208, 178, 134, 255 });
    DrawCube((Vector3){ 0.0f, 0.035f, 0.0f }, 2.65f, 0.01f, 20.12f, (Color){ 224, 196, 154, 255 });

    /* Crease Lines (Regulation white markings) */
    /* Striker End */
    DrawLine3D((Vector3){ -1.8f, 0.045f, BATTER_CREASE_Z }, (Vector3){ 1.8f, 0.045f, BATTER_CREASE_Z }, WHITE);
    DrawLine3D((Vector3){ -1.8f, 0.045f, STUMPS_Z }, (Vector3){ 1.8f, 0.045f, STUMPS_Z }, WHITE);
    DrawLine3D((Vector3){ -1.32f, 0.045f, BATTER_CREASE_Z }, (Vector3){ -1.32f, 0.045f, STUMPS_Z + 1.2f }, WHITE);
    DrawLine3D((Vector3){ 1.32f, 0.045f, BATTER_CREASE_Z }, (Vector3){ 1.32f, 0.045f, STUMPS_Z + 1.2f }, WHITE);

    /* Bowler End */
    DrawLine3D((Vector3){ -1.8f, 0.045f, BOWLER_CREASE_Z }, (Vector3){ 1.8f, 0.045f, BOWLER_CREASE_Z }, WHITE);
    DrawLine3D((Vector3){ -1.8f, 0.045f, BOWLER_STUMPS_Z }, (Vector3){ 1.8f, 0.045f, BOWLER_STUMPS_Z }, WHITE);
    DrawLine3D((Vector3){ -1.32f, 0.045f, BOWLER_CREASE_Z }, (Vector3){ -1.32f, 0.045f, BOWLER_STUMPS_Z - 1.2f }, WHITE);
    DrawLine3D((Vector3){ 1.32f, 0.045f, BOWLER_CREASE_Z }, (Vector3){ 1.32f, 0.045f, BOWLER_STUMPS_Z - 1.2f }, WHITE);
}

static void DrawStadiumAndCrowd(void) {
    /* Multi-tier stadium stands surrounding the ground */
    int tiers = 8;
    int segments = 64;
    float startRadius = BOUNDARY_RADIUS + 4.0f;

    for (int t = 0; t < tiers; t++) {
        float innerR = startRadius + t * 1.8f;
        float outerR = innerR + 1.7f;
        float yBottom = t * 1.2f;
        float yTop = yBottom + 1.1f;

        Color standColor = (t % 2 == 0) ? (Color){ 75, 85, 95, 255 } : (Color){ 60, 70, 80, 255 };

        for (int s = 0; s < segments; s++) {
            float a1 = 2.0f * PI_F * (float)s / (float)segments;
            float a2 = 2.0f * PI_F * (float)(s + 1) / (float)segments;

            Vector3 p1 = { cosf(a1) * innerR, yBottom, sinf(a1) * innerR };
            Vector3 p2 = { cosf(a2) * innerR, yBottom, sinf(a2) * innerR };
            Vector3 p3 = { cosf(a2) * outerR, yTop, sinf(a2) * outerR };
            Vector3 p4 = { cosf(a1) * outerR, yTop, sinf(a1) * outerR };

            DrawTriangle3D(p1, p2, p3, standColor);
            DrawTriangle3D(p1, p3, p4, standColor);

            /* Crowd clusters on seats */
            if ((s + t) % 3 != 0) {
                float midA = (a1 + a2) * 0.5f;
                float midR = (innerR + outerR) * 0.5f;
                float cx = cosf(midA) * midR;
                float cz = sinf(midA) * midR;
                Color jersey = ((s + t * 3) % 4 == 0) ? (Color){ 220, 50, 50, 255 } :
                               ((s + t * 3) % 4 == 1) ? (Color){ 40, 110, 220, 255 } :
                               ((s + t * 3) % 4 == 2) ? (Color){ 240, 200, 40, 255 } : (Color){ 240, 240, 240, 255 };
                DrawCube((Vector3){ cx, yTop + 0.35f, cz }, 0.45f, 0.65f, 0.45f, jersey);
                DrawSphere((Vector3){ cx, yTop + 0.85f, cz }, 0.18f, (Color){ 225, 185, 150, 255 });
            }
        }
    }

    /* 4 Majestic Floodlight Towers */
    Vector2 floodlightPos[4] = {
        { -48.0f, -48.0f }, { 48.0f, -48.0f },
        { -48.0f,  48.0f }, { 48.0f,  48.0f }
    };
    for (int f = 0; f < 4; f++) {
        float fx = floodlightPos[f].x;
        float fz = floodlightPos[f].y;
        /* Main pylon mast */
        DrawCylinder((Vector3){ fx, 0.0f, fz }, 0.8f, 0.4f, 26.0f, 8, (Color){ 140, 150, 160, 255 });
        /* Light head array */
        DrawCube((Vector3){ fx, 26.0f, fz }, 6.5f, 3.2f, 1.2f, (Color){ 80, 90, 100, 255 });
        /* Glowing floodlight bulbs */
        for (int lx = -2; lx <= 2; lx++) {
            for (int ly = -1; ly <= 1; ly++) {
                DrawSphere((Vector3){ fx + lx * 1.1f, 26.0f + ly * 0.9f, fz + 0.6f }, 0.45f, (Color){ 255, 255, 220, 255 });
            }
        }
    }
}

static void DrawStumpsSet(Vector3 pos, Stumps *stumps) {
    Color woodColor = (Color){ 215, 170, 105, 255 };
    float stumpHeight = 0.72f;
    float stumpRadius = 0.022f;

    /* 3 Stumps: Off, Middle, Leg */
    for (int i = -1; i <= 1; i++) {
        float x = pos.x + (float)i * 0.11f;
        DrawCylinder((Vector3){ x, 0.0f, pos.z }, stumpRadius, stumpRadius, stumpHeight, 8, woodColor);
    }

    /* 2 Bails on top */
    if (!stumps->bailsDislodged) {
        DrawCube((Vector3){ pos.x - 0.055f, stumpHeight + 0.015f, pos.z }, 0.10f, 0.02f, 0.025f, (Color){ 240, 195, 120, 255 });
        DrawCube((Vector3){ pos.x + 0.055f, stumpHeight + 0.015f, pos.z }, 0.10f, 0.02f, 0.025f, (Color){ 240, 195, 120, 255 });
    } else {
        /* Dislodged flying bails */
        DrawCube((Vector3){ pos.x - 0.15f, stumps->bail1Y, pos.z + 0.2f }, 0.10f, 0.02f, 0.025f, (Color){ 240, 195, 120, 255 });
        DrawCube((Vector3){ pos.x + 0.15f, stumps->bail2Y, pos.z + 0.2f }, 0.10f, 0.02f, 0.025f, (Color){ 240, 195, 120, 255 });
    }
}

static void DrawPlayerFigure(Vector3 pos, float rotationY, Color jerseyCol, Color accentCol,
                             bool hasBat, bool isWicketKeeper, AnimationState anim, float animTime) {
    Vector3 base = pos;
    Color skin = (Color){ 220, 175, 140, 255 };
    Color trousers = (Color){ 240, 240, 240, 255 };
    Color pads = (Color){ 245, 245, 245, 255 };
    Color gloves = (Color){ 40, 40, 40, 255 };
    Color helmet = accentCol;

    /* Rotation matrix application or simple yaw */
    float rad = rotationY * DEG2RAD;
    float dirZ = cosf(rad);

    /* Shoes / Spikes */
    DrawCube((Vector3){ base.x - 0.14f, 0.06f, base.z }, 0.12f, 0.10f, 0.26f, (Color){ 40, 40, 40, 255 });
    DrawCube((Vector3){ base.x + 0.14f, 0.06f, base.z }, 0.12f, 0.10f, 0.26f, (Color){ 40, 40, 40, 255 });

    /* Legs & Pads */
    if (hasBat || isWicketKeeper) {
        /* Batting / Keeper leg pads */
        DrawCylinder((Vector3){ base.x - 0.14f, 0.10f, base.z }, 0.09f, 0.09f, 0.65f, 8, pads);
        DrawCylinder((Vector3){ base.x + 0.14f, 0.10f, base.z }, 0.09f, 0.09f, 0.65f, 8, pads);
    } else {
        /* Fielder / Bowler trousers */
        DrawCylinder((Vector3){ base.x - 0.14f, 0.10f, base.z }, 0.08f, 0.07f, 0.65f, 8, trousers);
        DrawCylinder((Vector3){ base.x + 0.14f, 0.10f, base.z }, 0.08f, 0.07f, 0.65f, 8, trousers);
    }

    /* Torso & Jersey */
    DrawCylinder((Vector3){ base.x, 0.75f, base.z }, 0.22f, 0.24f, 0.65f, 8, jerseyCol);
    /* Number / collar stripe */
    DrawCube((Vector3){ base.x, 1.15f, base.z + dirZ * 0.22f }, 0.22f, 0.15f, 0.06f, accentCol);

    /* Arms & Gloves */
    DrawCylinder((Vector3){ base.x - 0.26f, 0.85f, base.z }, 0.065f, 0.065f, 0.45f, 8, jerseyCol);
    DrawCylinder((Vector3){ base.x + 0.26f, 0.85f, base.z }, 0.065f, 0.065f, 0.45f, 8, jerseyCol);
    DrawSphere((Vector3){ base.x - 0.26f, 0.82f, base.z + dirZ * 0.15f }, 0.075f, gloves);
    DrawSphere((Vector3){ base.x + 0.26f, 0.82f, base.z + dirZ * 0.15f }, 0.075f, gloves);

    /* Head & Helmet */
    DrawCylinder((Vector3){ base.x, 1.40f, base.z }, 0.07f, 0.07f, 0.10f, 8, skin);
    DrawSphere((Vector3){ base.x, 1.58f, base.z }, 0.16f, helmet);
    /* Helmet grill & visor */
    DrawCube((Vector3){ base.x, 1.58f, base.z + dirZ * 0.16f }, 0.18f, 0.14f, 0.08f, (Color){ 70, 75, 80, 255 });

    /* Cricket Bat */
    if (hasBat) {
        float batAngle = (anim == ANIM_BAT_DRIVE) ? 45.0f :
                         (anim == ANIM_BAT_LOFT)  ? 75.0f :
                         (anim == ANIM_BAT_PULL)  ? -60.0f : 15.0f;
        float batRad = batAngle * DEG2RAD;

        Vector3 batHandle = { base.x + 0.22f, 0.80f, base.z - 0.05f };
        /* Grip */
        DrawCylinder(batHandle, 0.022f, 0.022f, 0.28f, 6, (Color){ 240, 240, 240, 255 });
        /* Blade */
        Vector3 batBlade = { batHandle.x + sinf(batRad) * 0.25f, batHandle.y - 0.35f, batHandle.z - cosf(batRad) * 0.2f };
        DrawCube(batBlade, 0.11f, 0.65f, 0.045f, (Color){ 205, 155, 95, 255 });
        /* Sponsor sticker */
        DrawCube(batBlade, 0.09f, 0.22f, 0.052f, accentCol);
    }
}

static void DrawUmpire(Vector3 pos) {
    Color trousers = (Color){ 20, 20, 20, 255 };
    Color shirt = (Color){ 240, 70, 160, 255 }; /* Distinctive pink umpire shirt from screenshot! */
    Color hat = (Color){ 25, 25, 25, 255 };
    Color skin = (Color){ 220, 175, 140, 255 };

    DrawCylinder((Vector3){ pos.x - 0.12f, 0.08f, pos.z }, 0.07f, 0.07f, 0.70f, 8, trousers);
    DrawCylinder((Vector3){ pos.x + 0.12f, 0.08f, pos.z }, 0.07f, 0.07f, 0.70f, 8, trousers);
    DrawCylinder((Vector3){ pos.x, 0.78f, pos.z }, 0.22f, 0.23f, 0.68f, 8, shirt);
    DrawCylinder((Vector3){ pos.x - 0.25f, 0.85f, pos.z }, 0.06f, 0.06f, 0.45f, 8, shirt);
    DrawCylinder((Vector3){ pos.x + 0.25f, 0.85f, pos.z }, 0.06f, 0.06f, 0.45f, 8, shirt);
    DrawSphere((Vector3){ pos.x, 1.58f, pos.z }, 0.15f, skin);
    DrawCylinder((Vector3){ pos.x, 1.68f, pos.z }, 0.25f, 0.25f, 0.04f, 12, hat);
    DrawCylinder((Vector3){ pos.x, 1.72f, pos.z }, 0.16f, 0.15f, 0.12f, 12, hat);
}

static void DrawCocaColaBoard(void) {
    /* Large red Coca-Cola sponsorship board behind striker stumps at boundary */
    Vector3 boardPos = { 0.0f, 1.4f, 52.0f };
    DrawCube(boardPos, 24.0f, 2.6f, 0.5f, (Color){ 220, 20, 30, 255 });
    DrawCube((Vector3){ 0.0f, 1.4f, 51.7f }, 21.0f, 0.22f, 0.52f, WHITE);
    DrawCube((Vector3){ 0.0f, 1.8f, 51.7f }, 15.0f, 0.16f, 0.52f, WHITE);
}

static void DrawPitchTargetMarker(MatchState *match) {
    if (match->ball.stage == BALL_STAGE_WAITING || match->ball.stage == BALL_STAGE_RUNUP) {
        Vector3 target = match->bowlingPitchTarget;
        Color markerCol = (Color){ 30, 144, 255, 230 }; /* Cyan / Blue splash as in screenshot */
        float pulse = 0.40f + 0.08f * sinf((float)GetTime() * 8.0f);
        DrawCircle3D(target, pulse, (Vector3){ 1.0f, 0.0f, 0.0f }, 90.0f, Fade(markerCol, 0.65f));
        DrawCircle3D(target, pulse * 0.7f, (Vector3){ 1.0f, 0.0f, 0.0f }, 90.0f, markerCol);
        DrawCircle3D(target, 0.12f, (Vector3){ 1.0f, 0.0f, 0.0f }, 90.0f, WHITE);
    }
}

static void DrawBallAndTrail(MatchState *match) {
    CricketBall *ball = &match->ball;

    /* Motion Trail */
    if (ball->trailCount > 1) {
        for (int i = 0; i < ball->trailCount - 1; i++) {
            float alpha = (float)i / (float)ball->trailCount;
            Color trailCol = ball->hitByBat ? Fade((Color){ 255, 220, 50, 255 }, alpha * 0.85f)
                                            : Fade((Color){ 240, 50, 50, 255 }, alpha * 0.75f);
            DrawLine3D(ball->trail[i], ball->trail[i + 1], trailCol);
        }
    }

    /* Red / White Cricket Ball with Seam */
    if (ball->active || ball->stage == BALL_STAGE_IN_PLAY) {
        Color ballColor = (Color){ 220, 35, 35, 255 };
        DrawSphere(ball->position, ball->radius, ballColor);
        /* White seam circle */
        DrawCircle3D(ball->position, ball->radius + 0.005f, (Vector3){ 0.0f, 1.0f, 0.0f }, 45.0f, Fade(WHITE, 0.8f));
    }
}

void Render3D_UpdateCamera(MatchState *match, float dt) {
    Camera3D *cam = &match->camera;
    cam->up = (Vector3){ 0.0f, 1.0f, 0.0f };
    cam->projection = CAMERA_PERSPECTIVE;

    switch (match->cameraMode) {
        case CAM_BEHIND_BOWLER:
            /* Exactly matches user's screenshot! Bowler & umpire in foreground, looking down pitch */
            cam->position = (Vector3){ 0.0f, 3.6f, -14.2f };
            cam->target = (Vector3){ 0.0f, 1.1f, 8.0f };
            cam->fovy = 46.0f;
            break;

        case CAM_BATTER_PRO:
            /* Behind striker looking down pitch towards bowler */
            cam->position = (Vector3){ match->batsmanXOffset * 0.5f, 3.2f, 13.0f };
            cam->target = (Vector3){ 0.0f, 1.2f, -5.0f };
            cam->fovy = 50.0f;
            break;

        case CAM_BROADCAST:
            /* Elevated TV press box view */
            cam->position = (Vector3){ -26.0f, 13.0f, 0.0f };
            cam->target = (Vector3){ 0.0f, 1.0f, 0.0f };
            cam->fovy = 52.0f;
            break;

        case CAM_BALL_TRACKER:
            /* Dynamic Follow Ball when in play */
            if (match->ball.stage == BALL_STAGE_IN_PLAY) {
                Vector3 bpos = match->ball.position;
                cam->target = bpos;
                cam->position = (Vector3){ bpos.x + 8.0f, bpos.y + 6.0f, bpos.z + 10.0f };
                cam->fovy = 55.0f;
            } else {
                cam->position = (Vector3){ 0.0f, 3.6f, -14.2f };
                cam->target = (Vector3){ 0.0f, 1.1f, 8.0f };
                cam->fovy = 46.0f;
            }
            break;

        case CAM_AERIAL:
            /* Bird's eye tactical view */
            cam->position = (Vector3){ 0.01f, 52.0f, 0.01f };
            cam->target = (Vector3){ 0.0f, 0.0f, 0.0f };
            cam->fovy = 58.0f;
            break;

        default:
            break;
    }
}

void Render3D_DrawScene(MatchState *match) {
    BeginMode3D(match->camera);

    DrawCricketGround();
    DrawStadiumAndCrowd();
    DrawCocaColaBoard();

    /* Stumps at both ends */
    DrawStumpsSet(match->strikerStumps.middleStump, &match->strikerStumps);
    DrawStumpsSet(match->nonStrikerStumps.middleStump, &match->nonStrikerStumps);

    /* Umpire standing behind bowler stumps */
    DrawUmpire((Vector3){ 0.0f, 0.0f, -7.2f });

    /* Pitch Target Marker */
    DrawPitchTargetMarker(match);

    /* Render Batting Pair & Fielders if teams are set */
    Team *batTeam = match->battingTeam;
    Team *bowlTeam = match->bowlingTeam;

    if (batTeam && bowlTeam) {
        /* Striker position calculation (running or at crease) */
        Vector3 strikerBase = (Vector3){ match->batsmanXOffset, 0.0f, BATTER_CREASE_Z };
        Vector3 nonStrikerBase = (Vector3){ 1.0f, 0.0f, BOWLER_CREASE_Z };

        if (match->isRunning) {
            float p = match->strikerRunProgress;
            strikerBase.z = BATTER_CREASE_Z - p * (BATTER_CREASE_Z - BOWLER_CREASE_Z);
            nonStrikerBase.z = BOWLER_CREASE_Z + p * (BATTER_CREASE_Z - BOWLER_CREASE_Z);
        }

        /* Draw Striker Batter */
        AnimationState strikerAnim = match->isRunning ? ANIM_RUNNING :
                                     (match->chosenShot == SHOT_STROKE) ? ANIM_BAT_DRIVE :
                                     (match->chosenShot == SHOT_LOFT)   ? ANIM_BAT_LOFT :
                                     (match->chosenShot == SHOT_PUSH)   ? ANIM_BAT_DEFENSE : ANIM_BAT_STANCE;

        DrawPlayerFigure(strikerBase, 180.0f, batTeam->primaryColor, batTeam->accentColor,
                         true, false, strikerAnim, (float)GetTime());

        /* Draw Non-Striker Batter (Resting bat on crease at bowler end) */
        DrawPlayerFigure(nonStrikerBase, 0.0f, batTeam->primaryColor, batTeam->accentColor,
                         true, false, match->isRunning ? ANIM_RUNNING : ANIM_IDLE, (float)GetTime());

        /* Draw Bowler (Respect over/around the wicket side) */
        Player *bowler = &bowlTeam->players[match->bowlerIdx];
        Vector3 bowlerPos = bowler->position;
        if (!match->ball.active && bowler->animState != ANIM_BOWLER_RUNUP) {
            bowlerPos.x = (match->bowlingSide == 1) ? 0.75f : -0.75f;
            bowlerPos.z = BOWLER_CREASE_Z;
        }
        DrawPlayerFigure(bowlerPos, 0.0f, bowlTeam->primaryColor, bowlTeam->accentColor,
                         false, false, bowler->animState, (float)GetTime());

        /* Draw Fielders (including Wicketkeeper & Slip) */
        for (int i = 1; i < TOTAL_FIELDERS; i++) {
            FielderSlot *f = &match->fielders[i];
            bool isKeeper = (i == 1);
            DrawPlayerFigure(f->position, isKeeper ? 180.0f : f->angleDeg,
                             bowlTeam->primaryColor, bowlTeam->accentColor,
                             false, isKeeper, isKeeper ? ANIM_FIELDER_CROUCH : ANIM_IDLE, (float)GetTime());
        }
    }

    /* Ball & Trajectory */
    DrawBallAndTrail(match);

    EndMode3D();
}
