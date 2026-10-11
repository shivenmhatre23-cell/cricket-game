#include "ui.h"
#include "physics.h"
#include <stdio.h>
#include <math.h>
#include <string.h>

#define PI_F 3.14159265358979323846f

void UI_Init(void) {
    /* UI initialized */
}

/* 1. Radar Minimap (Top-Left as in Real Cricket screenshot) */
static void DrawRadarMinimap(MatchState *match) {
    float cx = 65.0f;
    float cy = 65.0f;
    float radius = 50.0f;

    /* Dark green/black circular ground radar */
    DrawCircle((int)cx, (int)cy, radius, Fade((Color){ 10, 24, 16, 255 }, 0.88f));
    DrawCircleLines((int)cx, (int)cy, radius, Fade(WHITE, 0.45f));
    DrawCircleLines((int)cx, (int)cy, radius * 0.55f, Fade(WHITE, 0.22f)); /* 30 yard circle */

    /* Pitch rectangle in center */
    DrawRectangle((int)cx - 2, (int)cy - 10, 4, 20, (Color){ 200, 180, 140, 255 });

    /* Draw 11 fielders as glowing blue dots */
    for (int i = 0; i < TOTAL_FIELDERS; i++) {
        Vector3 fp = match->fielders[i].position;
        float fx = cx + (fp.x / BOUNDARY_RADIUS) * (radius - 5.0f);
        float fy = cy + (fp.z / BOUNDARY_RADIUS) * (radius - 5.0f);
        DrawCircle((int)fx, (int)fy, 2.5f, (Color){ 0, 195, 255, 255 });
    }

    /* Draw Batsmen as small yellow dots */
    DrawCircle((int)cx + (int)(match->batsmanXOffset * 6.0f), (int)cy + 8, 2.8f, (Color){ 255, 215, 0, 255 });
    DrawCircle((int)cx + 3, (int)cy - 8, 2.8f, (Color){ 255, 215, 0, 255 });

    /* Draw Ball as red/white dot when in play */
    if (match->ball.active || match->ball.stage == BALL_STAGE_IN_PLAY) {
        float bx = cx + (match->ball.position.x / BOUNDARY_RADIUS) * (radius - 4.0f);
        float by = cy + (match->ball.position.z / BOUNDARY_RADIUS) * (radius - 4.0f);
        DrawCircle((int)bx, (int)by, 3.2f, (Color){ 255, 40, 40, 255 });
    }
}

/* 2. Iconic 8-Pointed Star Compass (Mid-Left as in Real Cricket screenshot) */
static void DrawStarCompass(MatchState *match, int screenHeight) {
    float cx = 65.0f;
    float cy = (float)screenHeight * 0.52f;
    float outerR = 52.0f;
    float innerR = 24.0f;

    /* Check mouse click or drag on star compass to aim */
    Vector2 mouse = GetMousePosition();
    if (IsMouseButtonDown(MOUSE_BUTTON_LEFT)) {
        float distToCenter = Vector2Distance(mouse, (Vector2){ cx, cy });
        if (distToCenter < outerR + 15.0f && distToCenter > 8.0f) {
            float mouseAngle = atan2f(mouse.y - cy, mouse.x - cx) * RAD2DEG;
            /* Convert to cricket shot angle (Straight = 0, Off = 90, Leg = -90) */
            match->shotAngleDeg = mouseAngle + 90.0f;
        }
    }

    /* Outer dark backdrop circle */
    DrawCircle((int)cx, (int)cy, outerR + 4.0f, Fade((Color){ 10, 18, 30, 255 }, 0.75f));

    /* 8 Star Points */
    int points = 8;
    for (int i = 0; i < points; i++) {
        float a1 = 2.0f * PI_F * (float)i / (float)points - (PI_F * 0.5f);
        float aNext = 2.0f * PI_F * (float)(i + 0.5f) / (float)points - (PI_F * 0.5f);
        float aPrev = 2.0f * PI_F * (float)(i - 0.5f) / (float)points - (PI_F * 0.5f);

        Vector2 pTip = { cx + cosf(a1) * outerR, cy + sinf(a1) * outerR };
        Vector2 pInner1 = { cx + cosf(aNext) * innerR, cy + sinf(aNext) * innerR };
        Vector2 pInner2 = { cx + cosf(aPrev) * innerR, cy + sinf(aPrev) * innerR };

        /* Check if this point matches the current aiming direction */
        float pointDeg = (float)i * 45.0f;
        if (pointDeg > 180.0f) pointDeg -= 360.0f;
        float diff = fabsf(match->shotAngleDeg - pointDeg);
        if (diff > 180.0f) diff = 360.0f - diff;

        bool isAimed = (diff < 25.0f);
        Color ptColor = isAimed ? (Color){ 255, 220, 50, 255 } : (Color){ 0, 160, 240, 255 };

        DrawTriangle(pTip, pInner1, (Vector2){ cx, cy }, ptColor);
        DrawTriangle(pTip, (Vector2){ cx, cy }, pInner2, ptColor);
        DrawLineEx(pTip, pInner1, 1.5f, WHITE);
        DrawLineEx(pTip, pInner2, 1.5f, WHITE);
    }

    /* Inner circle hub */
    DrawCircle((int)cx, (int)cy, innerR, (Color){ 12, 28, 48, 255 });
    DrawCircleLines((int)cx, (int)cy, innerR, (Color){ 0, 200, 255, 255 });
    DrawCircle((int)cx, (int)cy, 6, (Color){ 255, 215, 0, 255 });

    /* Arrow indicator pointing to current shot angle */
    float rad = (match->shotAngleDeg - 90.0f) * DEG2RAD;
    Vector2 tip = { cx + cosf(rad) * (outerR + 2.0f), cy + sinf(rad) * (outerR + 2.0f) };
    DrawLineEx((Vector2){ cx, cy }, tip, 3.5f, (Color){ 255, 230, 40, 255 });
}

/* 3. Move Batsman & Handedness Widget (Above Star Compass as in screenshot) */
static void DrawMoveBatsmanWidget(MatchState *match, int screenHeight) {
    float x = 12.0f;
    float y = (float)screenHeight * 0.52f - 95.0f;

    /* RHB Badge */
    DrawRectangleRounded((Rectangle){ x, y, 50, 24 }, 0.3f, 4, Fade((Color){ 20, 30, 45, 255 }, 0.9f));
    DrawText("RHB", (int)x + 12, (int)y + 6, 12, WHITE);

    /* Move Batsman Slider Bar */
    Rectangle barRect = { x, y + 28, 110, 24 };
    DrawRectangleRounded(barRect, 0.3f, 4, Fade((Color){ 200, 35, 45, 255 }, 0.95f));

    /* Arrow Buttons */
    Rectangle leftArrow = { x, y + 28, 24, 24 };
    Rectangle rightArrow = { x + 86, y + 28, 24, 24 };
    DrawText("<", (int)leftArrow.x + 8, (int)leftArrow.y + 5, 14, WHITE);
    DrawText(">", (int)rightArrow.x + 8, (int)rightArrow.y + 5, 14, WHITE);
    DrawText("MOVE BATSMAN", (int)x + 24, (int)y + 34, 9, WHITE);

    /* Click handlers */
    Vector2 mouse = GetMousePosition();
    if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
        if (CheckCollisionPointRec(mouse, leftArrow)) {
            match->batsmanXOffset = fmaxf(-0.35f, match->batsmanXOffset - 0.12f);
        } else if (CheckCollisionPointRec(mouse, rightArrow)) {
            match->batsmanXOffset = fminf(0.35f, match->batsmanXOffset + 0.12f);
        }
    }
}

/* 4. Real Cricket Timing Meter (Top-Right as in screenshot) */
static void DrawRealCricketTimingMeter(MatchState *match, int screenWidth) {
    float w = 180.0f;
    float h = 18.0f;
    float x = (float)screenWidth - w - 24.0f;
    float y = 18.0f;

    /* 3 Sections: EARLY (yellow), PERFECT (green), LATE (red) */
    float partW = w / 3.0f;

    /* Early (Yellow) */
    DrawRectangle((int)x, (int)y, (int)partW, (int)h, (Color){ 235, 180, 25, 255 });
    DrawText("EARLY", (int)x + 12, (int)y + 4, 10, BLACK);

    /* Perfect (Green) */
    DrawRectangle((int)(x + partW), (int)y, (int)partW, (int)h, (Color){ 45, 205, 85, 255 });
    DrawText("PERFECT", (int)(x + partW) + 8, (int)y + 4, 10, WHITE);

    /* Late (Red) */
    DrawRectangle((int)(x + partW * 2), (int)y, (int)partW, (int)h, (Color){ 225, 45, 45, 255 });
    DrawText("LATE", (int)(x + partW * 2) + 14, (int)y + 4, 10, WHITE);

    DrawRectangleLines((int)x, (int)y, (int)w, (int)h, WHITE);

    /* Dynamic Needle when ball is in flight */
    if (match->ball.stage == BALL_STAGE_BOWLED || match->ball.stage == BALL_STAGE_BOUNCED) {
        float prog = (match->ball.position.z - BOWLER_CREASE_Z) / (BATTER_CREASE_Z - BOWLER_CREASE_Z);
        if (prog < 0.0f) prog = 0.0f;
        if (prog > 1.0f) prog = 1.0f;
        float needleX = x + prog * w;
        DrawRectangle((int)needleX - 2, (int)y - 4, 5, (int)h + 8, WHITE);
    }
}

/* 5. Delivery Ball & Swing Dial (Upper-Right as in screenshot) */
static void DrawDeliverySwingDial(MatchState *match, int screenWidth) {
    float cx = (float)screenWidth - 65.0f;
    float cy = 100.0f;
    float r = 32.0f;

    /* Cricket Ball representation */
    DrawCircle((int)cx, (int)cy, r, (Color){ 215, 215, 215, 255 });
    DrawCircleLines((int)cx, (int)cy, r, Fade((Color){ 40, 40, 40, 255 }, 0.6f));
    /* Seam lines */
    DrawLine((int)cx - 18, (int)cy - 18, (int)cx + 18, (int)cy + 18, (Color){ 160, 160, 160, 255 });
    DrawLine((int)cx - 20, (int)cy - 16, (int)cx + 16, (int)cy + 20, (Color){ 160, 160, 160, 255 });

    /* Yellow Swing Arrow */
    float arrowAngle = (match->selectedDelivery == DELIVERY_OUTSWING) ? -35.0f :
                       (match->selectedDelivery == DELIVERY_INSWING)  ? 145.0f :
                       (match->selectedDelivery == DELIVERY_YORKER)  ? 90.0f :
                       (match->selectedDelivery == DELIVERY_BOUNCER) ? -90.0f : 0.0f;
    float aRad = arrowAngle * DEG2RAD;
    Vector2 arrowTip = { cx + cosf(aRad) * 26.0f, cy + sinf(aRad) * 26.0f };
    Vector2 arrowBase = { cx - cosf(aRad) * 16.0f, cy - sinf(aRad) * 16.0f };
    DrawLineEx(arrowBase, arrowTip, 6.0f, (Color){ 255, 195, 25, 255 });
    DrawCircle((int)arrowTip.x, (int)arrowTip.y, 6, (Color){ 255, 195, 25, 255 });

    /* Delivery Name */
    const char *delivNames[6] = { "OUT SWINGER", "IN SWINGER", "YORKER", "BOUNCER", "SEAM", "SLOWER" };
    const char *dName = delivNames[match->selectedDelivery % 6];
    int nw = MeasureText(dName, 12);
    DrawText(dName, (int)cx - nw / 2, (int)cy + (int)r + 8, 12, WHITE);

    /* Click to cycle delivery */
    Vector2 mouse = GetMousePosition();
    if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT) && Vector2Distance(mouse, (Vector2){ cx, cy }) < r + 10.0f) {
        match->selectedDelivery = (DeliveryType)((match->selectedDelivery + 1) % 6);
    }
}

/* 6. Batting Mode & Footwork Buttons (Right Side as in screenshot) */
static void DrawBattingRightControls(MatchState *match, int screenWidth, int screenHeight) {
    if (!match->isPlayerBatting) return;

    /* PUSH / STROKE / LOFT Bar */
    float barW = 210.0f;
    float barH = 28.0f;
    float barX = (float)screenWidth - barW - 14.0f;
    float barY = (float)screenHeight * 0.40f;

    DrawRectangleRounded((Rectangle){ barX, barY, barW, barH }, 0.3f, 4, (Color){ 175, 20, 25, 255 });

    float segW = barW / 3.0f;
    Rectangle pushRect = { barX, barY, segW, barH };
    Rectangle strokeRect = { barX + segW, barY, segW, barH };
    Rectangle loftRect = { barX + segW * 2, barY, segW, barH };

    /* Highlight active shot */
    if (match->chosenShot == SHOT_PUSH)   DrawRectangleRec(pushRect, Fade(WHITE, 0.28f));
    if (match->chosenShot == SHOT_STROKE) DrawRectangleRec(strokeRect, Fade(WHITE, 0.28f));
    if (match->chosenShot == SHOT_LOFT)   DrawRectangleRec(loftRect, Fade(WHITE, 0.28f));

    DrawText("PUSH", (int)pushRect.x + 18, (int)pushRect.y + 8, 13, WHITE);
    DrawText("STROKE", (int)strokeRect.x + 12, (int)strokeRect.y + 8, 13, WHITE);
    DrawText("LOFT", (int)loftRect.x + 18, (int)loftRect.y + 8, 13, WHITE);

    /* Three circular Footwork buttons below bar */
    float btnRadius = 24.0f;
    float col1X = (float)screenWidth - 48.0f;
    float col2X = (float)screenWidth - 108.0f;

    /* BACK FOOT (Top-Right) */
    Vector2 bfCenter = { col1X, barY + 55.0f };
    bool bfActive = (match->footwork == FOOTWORK_BACK);
    DrawCircle((int)bfCenter.x, (int)bfCenter.y, btnRadius, Fade((Color){ 20, 30, 45, 255 }, 0.85f));
    DrawCircleLines((int)bfCenter.x, (int)bfCenter.y, btnRadius, bfActive ? (Color){ 0, 220, 255, 255 } : Fade(WHITE, 0.7f));
    DrawText("BACK", (int)bfCenter.x - 14, (int)bfCenter.y - 10, 9, WHITE);
    DrawText("FOOT", (int)bfCenter.x - 14, (int)bfCenter.y + 2, 9, WHITE);

    /* ADVANCE (Middle-Left) */
    Vector2 advCenter = { col2X, barY + 80.0f };
    bool advActive = (match->footwork == FOOTWORK_ADVANCE);
    DrawCircle((int)advCenter.x, (int)advCenter.y, btnRadius, Fade((Color){ 20, 30, 45, 255 }, 0.85f));
    DrawCircleLines((int)advCenter.x, (int)advCenter.y, btnRadius, advActive ? (Color){ 0, 220, 255, 255 } : Fade(WHITE, 0.7f));
    DrawText("ADVANCE", (int)advCenter.x - 22, (int)advCenter.y - 4, 9, WHITE);

    /* FRONT FOOT (Bottom-Right) */
    Vector2 ffCenter = { col1X, barY + 115.0f };
    bool ffActive = (match->footwork == FOOTWORK_FRONT);
    DrawCircle((int)ffCenter.x, (int)ffCenter.y, btnRadius, Fade((Color){ 20, 30, 45, 255 }, 0.85f));
    DrawCircleLines((int)ffCenter.x, (int)ffCenter.y, btnRadius, ffActive ? (Color){ 0, 220, 255, 255 } : Fade(WHITE, 0.7f));
    DrawText("FRONT", (int)ffCenter.x - 16, (int)ffCenter.y - 10, 9, WHITE);
    DrawText("FOOT", (int)ffCenter.x - 14, (int)ffCenter.y + 2, 9, WHITE);

    /* Mouse Click Handling */
    Vector2 mouse = GetMousePosition();
    if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
        if (CheckCollisionPointRec(mouse, pushRect))   match->chosenShot = SHOT_PUSH;
        if (CheckCollisionPointRec(mouse, strokeRect)) match->chosenShot = SHOT_STROKE;
        if (CheckCollisionPointRec(mouse, loftRect))   match->chosenShot = SHOT_LOFT;

        if (Vector2Distance(mouse, bfCenter) < btnRadius)  match->footwork = FOOTWORK_BACK;
        if (Vector2Distance(mouse, advCenter) < btnRadius) match->footwork = FOOTWORK_ADVANCE;
        if (Vector2Distance(mouse, ffCenter) < btnRadius)  match->footwork = FOOTWORK_FRONT;
    }
}

/* 7. Real Cricket Official Broadcast Scoreboard (Bottom as in screenshot) */
static void DrawRealCricketBroadcastBar(MatchState *match, int screenWidth, int screenHeight) {
    float barH = 50.0f;
    float barY = (float)screenHeight - barH - 4.0f;
    float barW = (float)screenWidth;

    /* Base Bar Background */
    DrawRectangle(0, (int)barY, (int)barW, (int)barH, Fade((Color){ 10, 16, 28, 255 }, 0.96f));

    /* Left Team Crest (Blue circle with Chakra motif) */
    DrawCircle(26, (int)barY + 25, 16, (Color){ 20, 80, 190, 255 });
    DrawCircleLines(26, (int)barY + 25, 16, (Color){ 255, 195, 30, 255 });
    DrawCircle(26, (int)barY + 25, 6, WHITE);

    /* Batsman Table (Left) */
    Team *batTeam = match->battingTeam;
    Player *striker = &batTeam->players[match->strikerIdx];
    Player *nonStriker = &batTeam->players[match->nonStrikerIdx];

    char strikerStr[48], nonStrikerStr[48];
    snprintf(strikerStr, sizeof(strikerStr), "%s*    %d (%d)", striker->name, striker->runsScored, striker->ballsFaced);
    snprintf(nonStrikerStr, sizeof(nonStrikerStr), "%s      %d (%d)", nonStriker->name, nonStriker->runsScored, nonStriker->ballsFaced);
    DrawText(strikerStr, 54, (int)barY + 10, 13, WHITE);
    DrawText(nonStrikerStr, 54, (int)barY + 28, 12, (Color){ 180, 205, 225, 255 });

    /* Center Pill Scorecard (Dark blue stadium shape with neon green/white as in screenshot) */
    float pillW = 210.0f;
    float pillH = 42.0f;
    float pillX = (barW - pillW) * 0.5f;
    float pillY = barY + 4.0f;

    DrawRectangleRounded((Rectangle){ pillX, pillY, pillW, pillH }, 0.45f, 8, (Color){ 10, 24, 75, 255 });
    DrawRectangleRoundedLines((Rectangle){ pillX, pillY, pillW, pillH }, 0.45f, 8, (Color){ 40, 120, 220, 255 });

    int innIdx = match->currentInnings - 1;
    int runs = match->score[innIdx];
    int wkts = match->wickets[innIdx];
    int balls = match->ballsBowled[innIdx];
    int ov = balls / 6;
    int b = balls % 6;
    float crr = (balls > 0) ? ((float)runs / ((float)balls / 6.0f)) : 0.0f;

    char scoreMainStr[48];
    snprintf(scoreMainStr, sizeof(scoreMainStr), "%s  %d - %d  P1  %d.%d (%d)",
             (match->currentInnings == 1) ? "IND" : "PAK", runs, wkts, ov, b, match->totalOvers);
    int smw = MeasureText(scoreMainStr, 13);
    DrawText(scoreMainStr, (int)(pillX + (pillW - smw) * 0.5f), (int)pillY + 7, 13, (Color){ 40, 235, 100, 255 });

    char rrStr[32];
    snprintf(rrStr, sizeof(rrStr), "CUR RR  %.2f", crr);
    int rrw = MeasureText(rrStr, 11);
    DrawText(rrStr, (int)(pillX + (pillW - rrw) * 0.5f), (int)pillY + 24, 11, WHITE);

    /* Bowler Details (Right) */
    Team *bowlTeam = match->bowlingTeam;
    Player *bowler = &bowlTeam->players[match->bowlerIdx];
    char bowlerNameStr[48], bowlerFigStr[48];
    snprintf(bowlerNameStr, sizeof(bowlerNameStr), "%s", bowler->name);
    snprintf(bowlerFigStr, sizeof(bowlerFigStr), "%d-%d (%d.%d)",
             bowler->runsConceded, bowler->wicketsTaken, bowler->ballsBowled / 6, bowler->ballsBowled % 6);

    DrawText(bowlerNameStr, (int)barW - 220, (int)barY + 12, 13, WHITE);
    DrawText(bowlerFigStr, (int)barW - 220, (int)barY + 28, 13, (Color){ 245, 215, 60, 255 });
}

/* 8. Interactive Bowling Interface When Bowling */
static void DrawBowlingInteractiveControls(MatchState *match, int screenWidth, int screenHeight) {
    if (match->isPlayerBatting) return;

    /* Left Control Bar */
    float panelX = 16.0f;
    float panelY = (float)screenHeight * 0.45f;

    /* Over/Around Wicket Toggle */
    Rectangle sideRect = { panelX, panelY, 150, 32 };
    DrawRectangleRounded(sideRect, 0.3f, 4, (Color){ 20, 110, 190, 255 });
    const char *sideStr = (match->bowlingSide == 0) ? "OVER WICKET" : "AROUND WICKET";
    DrawText(sideStr, (int)panelX + 16, (int)panelY + 9, 13, WHITE);

    /* Bowl Now Button */
    Rectangle bowlBtn = { panelX, panelY + 44, 150, 42 };
    DrawRectangleRounded(bowlBtn, 0.35f, 4, (Color){ 40, 180, 80, 255 });
    DrawText("BOWL NOW [SPACE]", (int)panelX + 12, (int)bowlBtn.y + 14, 12, WHITE);

    /* Bowling Release / Accuracy Meter */
    float meterW = 150.0f;
    float meterH = 16.0f;
    float meterY = bowlBtn.y + 54.0f;
    DrawRectangleRounded((Rectangle){ panelX, meterY, meterW, meterH }, 0.3f, 4, (Color){ 25, 35, 45, 255 });
    /* Green accuracy center */
    DrawRectangle((int)panelX + 60, (int)meterY, 30, (int)meterH, (Color){ 40, 220, 80, 255 });
    float needleX = panelX + match->bowlingMeterValue * meterW;
    DrawRectangle((int)needleX - 2, (int)meterY - 2, 4, (int)meterH + 4, (Color){ 255, 225, 40, 255 });
    DrawText("RELEASE TIMING", (int)panelX + 22, (int)meterY + 20, 11, (Color){ 200, 220, 240, 255 });

    /* Handle Clicks */
    Vector2 mouse = GetMousePosition();
    if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
        if (CheckCollisionPointRec(mouse, sideRect)) {
            match->bowlingSide = 1 - match->bowlingSide;
        } else if (CheckCollisionPointRec(mouse, bowlBtn)) {
            if (match->ball.stage == BALL_STAGE_WAITING) {
                Physics_StartBowlerRunup(match);
            }
        }
    }
}

/* 9. Camera Switcher Button (Top Center-Right) */
static void DrawCameraSwitchButton(MatchState *match, int screenWidth) {
    float btnW = 120.0f;
    float btnH = 28.0f;
    float btnX = (float)screenWidth * 0.5f + 60.0f;
    float btnY = 16.0f;

    Rectangle camRect = { btnX, btnY, btnW, btnH };
    DrawRectangleRounded(camRect, 0.35f, 4, Fade((Color){ 14, 24, 38, 255 }, 0.85f));
    DrawRectangleRoundedLines(camRect, 0.35f, 4, Fade(WHITE, 0.5f));

    const char *camLabels[5] = { "CAM: ACTION", "CAM: PRO BAT", "CAM: TV BROAD", "CAM: CHASE", "CAM: AERIAL" };
    DrawText(camLabels[match->cameraMode % 5], (int)btnX + 12, (int)btnY + 8, 11, (Color){ 255, 225, 60, 255 });

    Vector2 mouse = GetMousePosition();
    if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT) && CheckCollisionPointRec(mouse, camRect)) {
        match->cameraMode = (GameCameraMode)((match->cameraMode + 1) % CAM_COUNT);
    }
}

void UI_DrawBroadcastHUD(MatchState *match, int screenWidth, int screenHeight) {
    /* 1. Radar Minimap */
    DrawRadarMinimap(match);

    /* 2. Star Compass (Shot Direction) */
    DrawStarCompass(match, screenHeight);

    /* 3. Move Batsman Widget */
    DrawMoveBatsmanWidget(match, screenHeight);

    /* 4. Real Cricket Timing Meter */
    DrawRealCricketTimingMeter(match, screenWidth);

    /* 5. Delivery Ball Swing Dial */
    DrawDeliverySwingDial(match, screenWidth);

    /* 6. Batting Action Controls */
    DrawBattingRightControls(match, screenWidth, screenHeight);

    /* 7. Interactive Bowling Controls */
    DrawBowlingInteractiveControls(match, screenWidth, screenHeight);

    /* 8. Camera Switcher Button */
    DrawCameraSwitchButton(match, screenWidth);

    /* 9. Real Cricket Broadcast Bar */
    DrawRealCricketBroadcastBar(match, screenWidth, screenHeight);

    /* Event Banner (FOUR, SIX, WICKET, OUT) */
    if (match->eventBannerTimer > 0.0f) {
        float popW = 540.0f;
        float popH = 58.0f;
        float popX = ((float)screenWidth - popW) * 0.5f;
        float popY = 110.0f;
        DrawRectangleRounded((Rectangle){ popX, popY, popW, popH }, 0.35f, 8, Fade(match->eventBannerColor, 0.95f));
        DrawRectangleRoundedLines((Rectangle){ popX, popY, popW, popH }, 0.35f, 8, WHITE);
        int textW = MeasureText(match->eventBanner, 24);
        DrawText(match->eventBanner, (int)(popX + (popW - textW) * 0.5f), (int)popY + 16, 24, WHITE);
    }

    /* Timing Feedback Banner */
    if (match->timingBannerTimer > 0.0f) {
        Color tColor = (match->lastTiming == TIMING_PERFECT) ? (Color){ 40, 230, 110, 255 } :
                       (match->lastTiming == TIMING_GOOD)    ? (Color){ 80, 200, 240, 255 } :
                       (match->lastTiming == TIMING_EARLY)   ? (Color){ 240, 190, 40, 255 } :
                       (match->lastTiming == TIMING_LATE)    ? (Color){ 240, 140, 40, 255 } : (Color){ 230, 50, 50, 255 };
        float twX = (float)screenWidth * 0.5f - 110.0f;
        float twY = (float)screenHeight - 115.0f;
        DrawRectangleRounded((Rectangle){ twX, twY, 220, 32 }, 0.40f, 6, Fade((Color){ 10, 18, 28, 255 }, 0.92f));
        DrawRectangleRoundedLines((Rectangle){ twX, twY, 220, 32 }, 0.40f, 6, tColor);
        int twMeasure = MeasureText(match->timingFeedback, 15);
        DrawText(match->timingFeedback, (int)(twX + (220 - twMeasure) * 0.5f), (int)twY + 8, 15, tColor);
    }
}

void UI_DrawBattingControls(MatchState *match, int screenWidth, int screenHeight) {
    /* Integrated inside UI_DrawBroadcastHUD for clean Real Cricket styling */
}

void UI_DrawBowlingControls(MatchState *match, int screenWidth, int screenHeight) {
    /* Integrated inside UI_DrawBroadcastHUD for clean Real Cricket styling */
}

void UI_DrawRunningControls(MatchState *match, int screenWidth, int screenHeight) {
    if (match->ball.stage != BALL_STAGE_IN_PLAY) return;

    float rX = (float)screenWidth * 0.5f - 130.0f;
    float rY = (float)screenHeight - 120.0f;

    /* [R] RUN BUTTON */
    Rectangle runBtn = { rX, rY, 120, 38 };
    DrawRectangleRounded(runBtn, 0.35f, 6, Fade((Color){ 30, 180, 80, 255 }, 0.95f));
    DrawRectangleRoundedLines(runBtn, 0.35f, 6, WHITE);
    DrawText("RUN! [R]", (int)rX + 28, (int)rY + 11, 16, WHITE);

    /* [S] STOP / GROUND BAT */
    Rectangle stopBtn = { rX + 140, rY, 120, 38 };
    DrawRectangleRounded(stopBtn, 0.35f, 6, Fade((Color){ 220, 60, 40, 255 }, 0.95f));
    DrawRectangleRoundedLines(stopBtn, 0.35f, 6, WHITE);
    DrawText("STOP [S]", (int)rX + 168, (int)rY + 11, 16, WHITE);

    Vector2 mouse = GetMousePosition();
    if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
        if (CheckCollisionPointRec(mouse, runBtn))  Physics_CallRun(match);
        if (CheckCollisionPointRec(mouse, stopBtn)) Physics_StopRun(match);
    }

    if (match->isRunning) {
        char runProgStr[32];
        snprintf(runProgStr, sizeof(runProgStr), "RUNNING... [%d COMPLETED]", match->runsCompleted);
        DrawText(runProgStr, (int)rX + 20, (int)rY - 22, 15, (Color){ 255, 225, 45, 255 });
    }
}

void UI_DrawTeamSelect(Team *teams, int teamCount, int *selectedTeam1, int *selectedTeam2, int screenWidth, int screenHeight) {
    DrawRectangle(0, 0, screenWidth, screenHeight, (Color){ 12, 18, 28, 255 });

    /* Header */
    DrawText("RC 24 - CHOOSE YOUR TEAM", screenWidth / 2 - 200, 36, 30, (Color){ 245, 205, 50, 255 });
    DrawText("Click a country with your mouse or press keys [0 - 9]",
             screenWidth / 2 - 180, 78, 14, (Color){ 180, 205, 230, 255 });

    /* Team Grid */
    float gridStartX = (float)screenWidth * 0.5f - 400.0f;
    float gridStartY = 120.0f;

    for (int i = 0; i < teamCount; i++) {
        int col = i / 5;
        int row = i % 5;
        float cardX = gridStartX + (float)col * 410.0f;
        float cardY = gridStartY + (float)row * 72.0f;

        bool isP1 = (*selectedTeam1 == i);
        Color borderCol = isP1 ? (Color){ 255, 215, 0, 255 } : Fade(WHITE, 0.25f);

        DrawRectangleRounded((Rectangle){ cardX, cardY, 390, 62 }, 0.25f, 6, Fade(teams[i].primaryColor, 0.85f));
        DrawRectangleRoundedLines((Rectangle){ cardX, cardY, 390, 62 }, 0.25f, 6, borderCol);

        char tLabel[48];
        snprintf(tLabel, sizeof(tLabel), "[%d] %s", i, teams[i].name);
        DrawText(tLabel, (int)cardX + 24, (int)cardY + 12, 22, WHITE);

        char starPlayer[48];
        snprintf(starPlayer, sizeof(starPlayer), "Captain: %s", teams[i].players[0].name);
        DrawText(starPlayer, (int)cardX + 24, (int)cardY + 38, 13, (Color){ 230, 235, 240, 255 });
    }

    DrawText("Click ANY TEAM CARD to Start!", screenWidth / 2 - 120, screenHeight - 50, 16, (Color){ 245, 210, 50, 255 });
}

void UI_DrawTossScreen(MatchState *match, int tossChoice, int coinResult, bool tossDecided, float tossTimer, int screenWidth, int screenHeight) {
    DrawRectangle(0, 0, screenWidth, screenHeight, Fade((Color){ 8, 14, 24, 255 }, 0.85f));

    float boxW = 600.0f;
    float boxH = 340.0f;
    float boxX = ((float)screenWidth - boxW) * 0.5f;
    float boxY = ((float)screenHeight - boxH) * 0.5f;

    DrawRectangleRounded((Rectangle){ boxX, boxY, boxW, boxH }, 0.20f, 8, Fade((Color){ 16, 26, 40, 255 }, 0.96f));
    DrawRectangleRoundedLines((Rectangle){ boxX, boxY, boxW, boxH }, 0.20f, 8, (Color){ 240, 195, 45, 255 });

    DrawText("THE OFFICIAL TOSS CEREMONY", (int)boxX + 130, (int)boxY + 28, 24, (Color){ 245, 205, 50, 255 });

    const char *batName = match->battingTeam ? match->battingTeam->name : "Team 1";
    const char *bowlName = match->bowlingTeam ? match->bowlingTeam->name : "Team 2";
    char vsStr[128];
    snprintf(vsStr, sizeof(vsStr), "%s  vs  %s", batName, bowlName);
    DrawText(vsStr, (int)boxX + 210, (int)boxY + 70, 20, WHITE);

    if (tossChoice == 0) {
        DrawText("CHOOSE COIN SIDE:", (int)boxX + 205, (int)boxY + 130, 18, (Color){ 200, 220, 240, 255 });
        DrawRectangleRounded((Rectangle){ boxX + 120, boxY + 180, 160, 48 }, 0.3f, 6, (Color){ 30, 110, 190, 255 });
        DrawText("[1] HEADS", (int)boxX + 155, (int)boxY + 195, 18, WHITE);

        DrawRectangleRounded((Rectangle){ boxX + 320, boxY + 180, 160, 48 }, 0.3f, 6, (Color){ 190, 80, 30, 255 });
        DrawText("[2] TAILS", (int)boxX + 360, (int)boxY + 195, 18, WHITE);
    } else if (!tossDecided) {
        char spinStr[32];
        int dots = (int)(tossTimer * 4.0f) % 4;
        snprintf(spinStr, sizeof(spinStr), "Flipping coin%s", (dots == 1) ? "." : (dots == 2) ? ".." : (dots == 3) ? "..." : "");
        DrawText(spinStr, (int)boxX + 225, (int)boxY + 160, 22, (Color){ 255, 215, 0, 255 });
    } else {
        const char *landText = (coinResult == 0) ? "Landed on: HEADS!" : "Landed on: TAILS!";
        DrawText(landText, (int)boxX + 215, (int)boxY + 130, 22, (Color){ 255, 225, 45, 255 });

        if (match->isPlayerBatting) {
            DrawText("YOU WON THE TOSS & BAT FIRST!", (int)boxX + 140, (int)boxY + 175, 20, (Color){ 40, 230, 100, 255 });
        } else {
            DrawText("OPPONENT WON TOSS & ELECTED TO BAT FIRST!", (int)boxX + 85, (int)boxY + 175, 19, (Color){ 240, 160, 40, 255 });
        }

        DrawText("Press [SPACE] or [CLICK] to Take the Field!", (int)boxX + 120, (int)boxY + 260, 16, WHITE);
    }
}

void UI_DrawScorecard(MatchState *match, int screenWidth, int screenHeight) {
    DrawRectangle(0, 0, screenWidth, screenHeight, Fade(BLACK, 0.88f));

    float cardW = (float)screenWidth - 80.0f;
    float cardH = (float)screenHeight - 80.0f;
    float cardX = 40.0f;
    float cardY = 40.0f;

    DrawRectangleRounded((Rectangle){ cardX, cardY, cardW, cardH }, 0.05f, 8, Fade((Color){ 12, 20, 32, 255 }, 0.98f));
    DrawRectangleRoundedLines((Rectangle){ cardX, cardY, cardW, cardH }, 0.05f, 8, (Color){ 240, 195, 45, 255 });

    DrawText("OFFICIAL MATCH SCORECARD", (int)cardX + 36, (int)cardY + 24, 26, (Color){ 245, 205, 50, 255 });

    DrawText("BATSMAN", (int)cardX + 36, (int)cardY + 70, 14, (Color){ 170, 195, 220, 255 });
    DrawText("R", (int)cardX + 280, (int)cardY + 70, 14, (Color){ 170, 195, 220, 255 });
    DrawText("B", (int)cardX + 340, (int)cardY + 70, 14, (Color){ 170, 195, 220, 255 });
    DrawText("4s", (int)cardX + 400, (int)cardY + 70, 14, (Color){ 170, 195, 220, 255 });
    DrawText("6s", (int)cardX + 460, (int)cardY + 70, 14, (Color){ 170, 195, 220, 255 });
    DrawText("SR", (int)cardX + 520, (int)cardY + 70, 14, (Color){ 170, 195, 220, 255 });

    Team *bat = match->battingTeam;
    for (int i = 0; i < SQUAD_SIZE; i++) {
        Player *p = &bat->players[i];
        float rowY = cardY + 98.0f + (float)i * 26.0f;
        float sr = (p->ballsFaced > 0) ? ((float)p->runsScored * 100.0f / (float)p->ballsFaced) : 0.0f;

        DrawText(p->name, (int)cardX + 36, (int)rowY, 14, WHITE);
        char rStr[8], bStr[8], fStr[8], sStr[8], srStr[16];
        snprintf(rStr, sizeof(rStr), "%d", p->runsScored);
        snprintf(bStr, sizeof(bStr), "%d", p->ballsFaced);
        snprintf(fStr, sizeof(fStr), "%d", p->fours);
        snprintf(sStr, sizeof(sStr), "%d", p->sixes);
        snprintf(srStr, sizeof(srStr), "%.1f", sr);

        DrawText(rStr, (int)cardX + 280, (int)rowY, 14, (Color){ 255, 225, 45, 255 });
        DrawText(bStr, (int)cardX + 340, (int)rowY, 14, WHITE);
        DrawText(fStr, (int)cardX + 400, (int)rowY, 14, (Color){ 100, 200, 255, 255 });
        DrawText(sStr, (int)cardX + 460, (int)rowY, 14, (Color){ 255, 170, 50, 255 });
        DrawText(srStr, (int)cardX + 520, (int)rowY, 14, (Color){ 200, 220, 240, 255 });
    }

    float bowlStartX = cardX + cardW * 0.58f;
    DrawText("BOWLER", (int)bowlStartX, (int)cardY + 70, 14, (Color){ 170, 195, 220, 255 });
    DrawText("O", (int)bowlStartX + 180, (int)cardY + 70, 14, (Color){ 170, 195, 220, 255 });
    DrawText("R", (int)bowlStartX + 230, (int)cardY + 70, 14, (Color){ 170, 195, 220, 255 });
    DrawText("W", (int)bowlStartX + 280, (int)cardY + 70, 14, (Color){ 170, 195, 220, 255 });
    DrawText("ECON", (int)bowlStartX + 330, (int)cardY + 70, 14, (Color){ 170, 195, 220, 255 });

    Team *bowl = match->bowlingTeam;
    int bCount = 0;
    for (int i = 0; i < SQUAD_SIZE; i++) {
        Player *p = &bowl->players[i];
        if (p->ballsBowled > 0 || bCount < 5) {
            float rowY = cardY + 98.0f + (float)bCount * 26.0f;
            float econ = (p->ballsBowled > 0) ? ((float)p->runsConceded / ((float)p->ballsBowled / 6.0f)) : 0.0f;
            int ov = p->ballsBowled / 6;
            int b = p->ballsBowled % 6;

            DrawText(p->name, (int)bowlStartX, (int)rowY, 14, WHITE);
            char ovStr[32], rcStr[8], wkStr[8], ecStr[16];
            snprintf(ovStr, sizeof(ovStr), "%d.%d", ov, b);
            snprintf(rcStr, sizeof(rcStr), "%d", p->runsConceded);
            snprintf(wkStr, sizeof(wkStr), "%d", p->wicketsTaken);
            snprintf(ecStr, sizeof(ecStr), "%.2f", econ);

            DrawText(ovStr, (int)bowlStartX + 180, (int)rowY, 14, WHITE);
            DrawText(rcStr, (int)bowlStartX + 230, (int)rowY, 14, (Color){ 255, 120, 120, 255 });
            DrawText(wkStr, (int)bowlStartX + 280, (int)rowY, 14, (Color){ 255, 225, 45, 255 });
            DrawText(ecStr, (int)bowlStartX + 330, (int)rowY, 14, (Color){ 200, 220, 240, 255 });
            bCount++;
        }
    }

    DrawText("Press [SPACE] or [R] to Play Another Match", (int)cardX + 36, (int)cardY + cardH - 36, 16, (Color){ 245, 205, 50, 255 });
}
