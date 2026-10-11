#include "physics.h"
#include "audio_synth.h"
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <string.h>

#define GRAVITY -9.81f
#define PITCH_RESTITUTION_Y 0.52f
#define PITCH_FRICTION_XZ 0.88f
#define GRASS_FRICTION_DECEL 4.5f

static void SetupFielders(MatchState *match) {
    /* 11 players in standard balanced ODI/T20 field */
    /* 0: Bowler, 1: Wicketkeeper */
    match->fielders[0].position = (Vector3){ 0.0f, 0.0f, BOWLER_CREASE_Z };
    strcpy(match->fielders[0].positionName, "Bowler");

    match->fielders[1].position = (Vector3){ 0.0f, 0.0f, 10.6f };
    strcpy(match->fielders[1].positionName, "Wicketkeeper");

    match->fielders[2].position = (Vector3){ -2.4f, 0.0f, 11.2f };
    strcpy(match->fielders[2].positionName, "First Slip");

    match->fielders[3].position = (Vector3){ -13.5f, 0.0f, 7.0f };
    strcpy(match->fielders[3].positionName, "Point");

    match->fielders[4].position = (Vector3){ -22.0f, 0.0f, 0.0f };
    strcpy(match->fielders[4].positionName, "Cover");

    match->fielders[5].position = (Vector3){ -8.0f, 0.0f, -6.0f };
    strcpy(match->fielders[5].positionName, "Mid-Off");

    match->fielders[6].position = (Vector3){ 8.0f, 0.0f, -6.0f };
    strcpy(match->fielders[6].positionName, "Mid-On");

    match->fielders[7].position = (Vector3){ 18.0f, 0.0f, 1.0f };
    strcpy(match->fielders[7].positionName, "Mid-Wicket");

    match->fielders[8].position = (Vector3){ 14.0f, 0.0f, 8.0f };
    strcpy(match->fielders[8].positionName, "Square Leg");

    match->fielders[9].position = (Vector3){ 9.0f, 0.0f, 18.0f };
    strcpy(match->fielders[9].positionName, "Fine Leg");

    match->fielders[10].position = (Vector3){ -14.0f, 0.0f, 22.0f };
    strcpy(match->fielders[10].positionName, "Third Man");

    for (int i = 0; i < TOTAL_FIELDERS; i++) {
        match->fielders[i].active = true;
        match->fielders[i].hasBall = false;
        match->fielders[i].angleDeg = 0.0f;
    }
}

void Physics_InitMatch(MatchState *match) {
    match->strikerStumps.middleStump = (Vector3){ 0.0f, 0.0f, STUMPS_Z };
    match->strikerStumps.bailsDislodged = false;
    match->strikerStumps.bail1Y = 0.75f;
    match->strikerStumps.bail2Y = 0.75f;
    match->strikerStumps.bail1Vel = Vector3Zero();
    match->strikerStumps.bail2Vel = Vector3Zero();

    match->nonStrikerStumps.middleStump = (Vector3){ 0.0f, 0.0f, BOWLER_STUMPS_Z };
    match->nonStrikerStumps.bailsDislodged = false;

    SetupFielders(match);
    Physics_ResetDelivery(match);
}

void Physics_ResetDelivery(MatchState *match) {
    CricketBall *ball = &match->ball;
    memset(ball, 0, sizeof(CricketBall));
    ball->radius = 0.075f;
    ball->position = (Vector3){ 0.0f, 2.3f, BOWLER_CREASE_Z - 3.5f };
    ball->velocity = Vector3Zero();
    ball->stage = BALL_STAGE_WAITING;
    ball->active = false;
    ball->hasBounced = false;
    ball->hitByBat = false;
    ball->trailCount = 0;

    match->isRunning = false;
    match->runsAttempted = 0;
    match->runsCompleted = 0;
    match->strikerRunProgress = 0.0f;
    match->nonStrikerRunProgress = 0.0f;
    match->runReturning = false;
    match->runoutOccurred = false;

    match->chasingFielderIdx = -1;
    match->ballThrown = false;
    match->throwVelocity = Vector3Zero();

    match->chosenShot = SHOT_NONE;
    match->lastTiming = TIMING_NONE;

    /* Bowler default pitch target (good length, off-stump) */
    if (match->isPlayerBatting) {
        /* AI Bowler picks pitch target based on rating */
        float offOffset = ((float)rand() / (float)RAND_MAX * 0.7f - 0.35f);
        float lengthZ = 3.2f + ((float)rand() / (float)RAND_MAX * 3.5f);
        match->bowlingPitchTarget = (Vector3){ offOffset, 0.05f, lengthZ };
        match->selectedDelivery = (DeliveryType)(rand() % 6);
    } else {
        /* Player bowler defaults */
        if (Vector3Length(match->bowlingPitchTarget) < 0.1f) {
            match->bowlingPitchTarget = (Vector3){ -0.1f, 0.05f, 4.5f };
        }
    }
}

void Physics_StartBowlerRunup(MatchState *match) {
    match->ball.stage = BALL_STAGE_RUNUP;
    match->ball.flightTime = 0.0f;
}

void Physics_ReleaseBall(MatchState *match) {
    CricketBall *ball = &match->ball;
    float releaseX = (match->bowlingSide == 1) ? 0.75f : -0.75f;
    Vector3 releasePos = (Vector3){ releaseX, 2.3f, BOWLER_CREASE_Z };
    ball->position = releasePos;

    /* Use selected delivery */
    ball->deliveryType = match->selectedDelivery;

    /* Calculate delivery speed */
    Player *bowler = &match->bowlingTeam->players[match->bowlerIdx];
    float speedKmph = bowler->speedRating > 0 ? bowler->speedRating : 138.0f;

    if (!match->isPlayerBatting) {
        /* Player bowling: speed and line modified by release accuracy */
        float acc = match->bowlingAccuracy > 0.0f ? match->bowlingAccuracy : 0.90f;
        speedKmph *= (0.85f + 0.25f * acc);
    }

    /* Modify by delivery type */
    float targetZ = match->bowlingPitchTarget.z;
    float targetX = match->bowlingPitchTarget.x;

    if (ball->deliveryType == DELIVERY_YORKER) {
        targetZ = 7.3f;
        speedKmph += 3.5f;
    } else if (ball->deliveryType == DELIVERY_BOUNCER) {
        targetZ = 1.6f;
        speedKmph += 4.5f;
    } else if (ball->deliveryType == DELIVERY_SLOWER) {
        speedKmph *= 0.76f;
    }

    /* Convert km/h to m/s */
    float speedMs = speedKmph * (1000.0f / 3600.0f);
    ball->speedKmph = speedKmph;

    /* Ballistics: time to reach target pitch point */
    float dz = targetZ - releasePos.z;
    float flightTime = dz / speedMs;
    if (flightTime < 0.15f) flightTime = 0.15f;

    float vz = speedMs;
    float vx = (targetX - releasePos.x) / flightTime;
    float dy = 0.05f - releasePos.y;
    float vy = (dy - 0.5f * GRAVITY * flightTime * flightTime) / flightTime;

    ball->velocity = (Vector3){ vx, vy, vz };
    ball->active = true;
    ball->stage = BALL_STAGE_BOWLED;
    ball->hasBounced = false;
    ball->hitByBat = false;
    ball->flightTime = 0.0f;

    /* Swing effect */
    if (ball->deliveryType == DELIVERY_OUTSWING) {
        ball->swingAmount = -2.2f;
    } else if (ball->deliveryType == DELIVERY_INSWING) {
        ball->swingAmount = 2.2f;
    } else if (ball->deliveryType == DELIVERY_SLOWER) {
        ball->swingAmount = -0.8f;
    } else {
        ball->swingAmount = 0.0f;
    }
}

void Physics_ExecuteBatterShot(MatchState *match, ShotType shot, float angleDeg, Footwork footwork) {
    CricketBall *ball = &match->ball;
    if (ball->stage != BALL_STAGE_BOWLED && ball->stage != BALL_STAGE_BOUNCED) {
        return;
    }

    match->chosenShot = shot;
    match->shotAngleDeg = angleDeg;
    match->footwork = footwork;

    /* Calculate timing based on ball Z distance to batter sweet-spot (Z = 7.8f) */
    float zDist = ball->position.z - 7.8f;
    float absDist = fabsf(zDist);

    TimingGrade grade;
    float exitSpeedFactor = 1.0f;
    bool isEdge = false;

    if (absDist < 0.35f) {
        grade = TIMING_PERFECT;
        strcpy(match->timingFeedback, "PERFECT TIMING! *");
        exitSpeedFactor = 1.35f;
    } else if (absDist < 0.75f) {
        grade = TIMING_GOOD;
        strcpy(match->timingFeedback, "GOOD TIMING");
        exitSpeedFactor = 1.05f;
    } else if (zDist < -0.75f && zDist > -1.4f) {
        grade = TIMING_EARLY;
        strcpy(match->timingFeedback, "EARLY SHOT");
        exitSpeedFactor = 0.65f;
        if (rand() % 100 < 35) isEdge = true;
    } else if (zDist > 0.75f && zDist < 1.4f) {
        grade = TIMING_LATE;
        strcpy(match->timingFeedback, "LATE SHOT");
        exitSpeedFactor = 0.60f;
        if (rand() % 100 < 40) isEdge = true;
    } else {
        grade = TIMING_MISS;
        strcpy(match->timingFeedback, "BEATEN!");
        match->lastTiming = grade;
        match->timingBannerTimer = 1.5f;
        AudioSynth_PlayAppeal();
        return;
    }

    match->lastTiming = grade;
    match->timingBannerTimer = 1.6f;

    Player *striker = &match->battingTeam->players[match->strikerIdx];
    float batterPower = (striker->battingRating / 100.0f);
    float baseExitSpeed = 26.0f * batterPower * exitSpeedFactor;

    AudioSynth_PlayBatHit(batterPower * exitSpeedFactor, isEdge);

    /* Record wagon wheel */
    ShotWagonRecord *rec = &match->wagonWheel.records[match->wagonWheel.count % 128];
    rec->start = (Vector3){ 0.0f, 0.2f, BATTER_CREASE_Z };
    rec->isAerial = (shot == SHOT_LOFT);

    ball->hitByBat = true;
    ball->stage = BALL_STAGE_IN_PLAY;

    /* Calculate trajectory */
    float rad = (angleDeg - 90.0f) * DEG2RAD;
    if (isEdge) {
        /* Deflect towards slips/third man */
        rad += (rand() % 2 == 0 ? 0.7f : -0.7f);
        baseExitSpeed *= 0.55f;
    }

    float vx = cosf(rad) * baseExitSpeed;
    float vz = sinf(rad) * baseExitSpeed;
    float vy = 0.5f;

    /* Footwork modifiers */
    if (footwork == FOOTWORK_ADVANCE) {
        baseExitSpeed *= 1.15f;
    } else if (footwork == FOOTWORK_BACK) {
        /* Better control against short balls */
        if (ball->position.z < 6.0f) baseExitSpeed *= 1.10f;
    }

    if (shot == SHOT_LOFT) {
        if (grade == TIMING_PERFECT) {
            vy = 16.5f + batterPower * 4.5f;
            vx *= 1.30f;
            vz *= 1.30f;
        } else if (grade == TIMING_GOOD) {
            vy = 13.8f;
        } else {
            /* Skier catch candidate */
            vy = 18.0f;
            vx *= 0.45f;
            vz *= 0.45f;
        }
    } else if (shot == SHOT_STROKE) {
        vy = 1.2f + (float)rand() / (float)RAND_MAX * 0.8f;
        baseExitSpeed *= 1.10f;
        vx = cosf(rad) * baseExitSpeed;
        vz = sinf(rad) * baseExitSpeed;
    } else if (shot == SHOT_PUSH) {
        vx *= 0.22f;
        vz *= 0.22f;
        vy = 0.4f;
    }

    ball->velocity = (Vector3){ vx, vy, vz };
    ball->hasBounced = false;

    /* Find closest fielder to intercept */
    float minFielderDist = 999.0f;
    int bestFielder = -1;
    for (int i = 0; i < TOTAL_FIELDERS; i++) {
        float d = Vector3Distance(match->fielders[i].position, ball->position);
        if (d < minFielderDist) {
            minFielderDist = d;
            bestFielder = i;
        }
    }
    match->chasingFielderIdx = bestFielder;
}

void Physics_CallRun(MatchState *match) {
    if (match->ball.stage == BALL_STAGE_IN_PLAY && !match->runoutOccurred) {
        match->isRunning = true;
    }
}

void Physics_StopRun(MatchState *match) {
    if (match->isRunning) {
        /* Only stop if close to either crease */
        if (match->strikerRunProgress > 0.85f || match->strikerRunProgress < 0.15f) {
            match->isRunning = false;
        }
    }
}

static void ProcessFielderCatchOrStop(MatchState *match, int fielderIdx) {
    CricketBall *ball = &match->ball;
    FielderSlot *f = &match->fielders[fielderIdx];

    /* Check for catch: ball is in air and hasn't bounced */
    if (!ball->hasBounced && ball->hitByBat && match->chosenShot == SHOT_LOFT) {
        Player *striker = &match->battingTeam->players[match->strikerIdx];
        striker->isOut = true;
        snprintf(striker->dismissal, sizeof(striker->dismissal), "c %s b %s",
                 f->positionName, match->bowlingTeam->players[match->bowlerIdx].name);
        match->wickets[match->currentInnings - 1]++;
        match->bowlingTeam->players[match->bowlerIdx].wicketsTaken++;
        ball->stage = BALL_STAGE_DEAD;
        ball->velocity = Vector3Zero();

        snprintf(match->eventBanner, sizeof(match->eventBanner), "OUT! CAUGHT BY %s!", f->positionName);
        match->eventBannerTimer = 3.0f;
        match->eventBannerColor = (Color){ 230, 45, 45, 255 };
        AudioSynth_PlayStumpsHit();
        AudioSynth_PlayCrowdCheer(0.9f);
        return;
    }

    /* Otherwise, fielder stops the ball and throws at stumps */
    ball->velocity = Vector3Zero();
    f->hasBall = true;
    match->ballThrown = true;

    /* Throw towards striker stumps or bowler stumps */
    Vector3 targetStumps = (match->strikerRunProgress > 0.5f) ?
                           match->strikerStumps.middleStump : match->nonStrikerStumps.middleStump;
    match->throwTargetStump = targetStumps;

    Vector3 toStumps = Vector3Subtract(targetStumps, f->position);
    float throwDist = Vector3Length(toStumps);
    float throwTime = throwDist / 24.0f;
    if (throwTime < 0.25f) throwTime = 0.25f;

    match->throwVelocity = (Vector3){
        toStumps.x / throwTime,
        (toStumps.y - 0.5f * GRAVITY * throwTime * throwTime) / throwTime,
        toStumps.z / throwTime
    };
    ball->velocity = match->throwVelocity;
}

void Physics_Update(MatchState *match, float dt) {
    CricketBall *ball = &match->ball;

    /* Update event banner timer */
    if (match->eventBannerTimer > 0.0f) {
        match->eventBannerTimer -= dt;
    }
    if (match->timingBannerTimer > 0.0f) {
        match->timingBannerTimer -= dt;
    }

    /* Bowler runup progression */
    if (ball->stage == BALL_STAGE_RUNUP) {
        ball->flightTime += dt;
        Player *bowler = &match->bowlingTeam->players[match->bowlerIdx];
        bowler->animState = ANIM_BOWLER_RUNUP;
        bowler->position.z = BOWLER_CREASE_Z - 3.5f + (ball->flightTime / 0.8f) * 3.5f;

        if (ball->flightTime >= 0.8f) {
            bowler->animState = ANIM_BOWLER_RELEASE;
            Physics_ReleaseBall(match);
        }
        return;
    }

    if (!ball->active && ball->stage != BALL_STAGE_IN_PLAY) return;

    /* Record ball trail */
    if (ball->stage == BALL_STAGE_BOWLED || ball->stage == BALL_STAGE_BOUNCED || ball->stage == BALL_STAGE_IN_PLAY) {
        if (ball->trailCount < 64) {
            ball->trail[ball->trailCount++] = ball->position;
        } else {
            for (int i = 0; i < 63; i++) ball->trail[i] = ball->trail[i + 1];
            ball->trail[63] = ball->position;
        }
    }

    /* Ball motion integration */
    ball->velocity.y += GRAVITY * dt;

    /* Swing effect during delivery */
    if ((ball->stage == BALL_STAGE_BOWLED) && ball->swingAmount != 0.0f) {
        ball->velocity.x += ball->swingAmount * dt;
    }

    /* Air drag */
    ball->velocity.x *= (1.0f - 0.02f * dt);
    ball->velocity.z *= (1.0f - 0.02f * dt);

    ball->position = Vector3Add(ball->position, Vector3Scale(ball->velocity, dt));

    /* Pitch Bounce check */
    if (ball->position.y <= ball->radius) {
        ball->position.y = ball->radius;

        /* If ball was delivered and hits pitch */
        if (ball->stage == BALL_STAGE_BOWLED) {
            ball->stage = BALL_STAGE_BOUNCED;
            ball->hasBounced = true;
            ball->bouncePoint = ball->position;
            ball->velocity.y = -ball->velocity.y * PITCH_RESTITUTION_Y;
            ball->velocity.z *= PITCH_FRICTION_XZ;
            AudioSynth_PlayBallBounce();
        } else {
            /* Ground bounce in outfield */
            if (fabsf(ball->velocity.y) > 0.8f) {
                ball->velocity.y = -ball->velocity.y * 0.45f;
                AudioSynth_PlayBallBounce();
            } else {
                ball->velocity.y = 0.0f;
            }
            ball->hasBounced = true;

            /* Rolling friction */
            float speedXZ = sqrtf(ball->velocity.x * ball->velocity.x + ball->velocity.z * ball->velocity.z);
            if (speedXZ > 0.05f) {
                float decel = GRASS_FRICTION_DECEL * dt;
                float newSpeed = fmaxf(0.0f, speedXZ - decel);
                float ratio = newSpeed / speedXZ;
                ball->velocity.x *= ratio;
                ball->velocity.z *= ratio;
            } else {
                ball->velocity.x = 0.0f;
                ball->velocity.z = 0.0f;
            }
        }
    }

    /* Check Bowled if batter didn't hit and ball reaches stumps */
    if (!ball->hitByBat && ball->stage == BALL_STAGE_BOUNCED && ball->position.z >= STUMPS_Z - 0.15f) {
        if (fabsf(ball->position.x) < 0.30f && ball->position.y < 0.82f) {
            /* BOWLED! */
            match->strikerStumps.bailsDislodged = true;
            match->strikerStumps.bail1Vel = (Vector3){ 1.2f, 3.5f, 2.0f };
            match->strikerStumps.bail2Vel = (Vector3){ -1.2f, 3.2f, 2.4f };

            Player *striker = &match->battingTeam->players[match->strikerIdx];
            striker->isOut = true;
            snprintf(striker->dismissal, sizeof(striker->dismissal), "b %s",
                     match->bowlingTeam->players[match->bowlerIdx].name);
            match->wickets[match->currentInnings - 1]++;
            match->bowlingTeam->players[match->bowlerIdx].wicketsTaken++;
            ball->stage = BALL_STAGE_DEAD;

            snprintf(match->eventBanner, sizeof(match->eventBanner), "BOWLED! CLEAN CASTLED!");
            match->eventBannerTimer = 3.0f;
            match->eventBannerColor = (Color){ 235, 45, 45, 255 };
            AudioSynth_PlayStumpsHit();
            AudioSynth_PlayCrowdCheer(0.95f);
            return;
        } else {
            /* Passed to keeper */
            ball->stage = BALL_STAGE_BEATEN;
        }
    }

    /* Boundary check */
    float distFromPitchCenter = sqrtf(ball->position.x * ball->position.x + ball->position.z * ball->position.z);
    if (distFromPitchCenter >= BOUNDARY_RADIUS && ball->stage == BALL_STAGE_IN_PLAY) {
        ball->stage = BALL_STAGE_DEAD;
        ball->velocity = Vector3Zero();

        Player *striker = &match->battingTeam->players[match->strikerIdx];
        Player *bowler = &match->bowlingTeam->players[match->bowlerIdx];

        if (!ball->hasBounced) {
            /* SIX! */
            match->score[match->currentInnings - 1] += 6;
            striker->runsScored += 6;
            striker->sixes++;
            bowler->runsConceded += 6;
            match->partnershipRuns += 6;
            match->thisOverHistory[match->thisOverCount % 12] = 6;
            match->thisOverCount++;

            snprintf(match->eventBanner, sizeof(match->eventBanner), "MAXIMUM! THAT'S A HUGE SIX!");
            match->eventBannerTimer = 3.2f;
            match->eventBannerColor = (Color){ 255, 204, 30, 255 };
            AudioSynth_PlaySixCelebration();
        } else {
            /* FOUR! */
            match->score[match->currentInnings - 1] += 4;
            striker->runsScored += 4;
            striker->fours++;
            bowler->runsConceded += 4;
            match->partnershipRuns += 4;
            match->thisOverHistory[match->thisOverCount % 12] = 4;
            match->thisOverCount++;

            snprintf(match->eventBanner, sizeof(match->eventBanner), "CRACKING FOUR! RACING TO THE ROPES!");
            match->eventBannerTimer = 3.0f;
            match->eventBannerColor = (Color){ 45, 200, 245, 255 };
            AudioSynth_PlayFourSiren();
            AudioSynth_PlayCrowdCheer(0.85f);
        }
        return;
    }

    /* Fielder AI: chasing the ball in outfield */
    if (ball->stage == BALL_STAGE_IN_PLAY && !match->ballThrown) {
        int idx = match->chasingFielderIdx;
        if (idx >= 0 && idx < TOTAL_FIELDERS) {
            FielderSlot *f = &match->fielders[idx];
            Vector3 toBall = Vector3Subtract(ball->position, f->position);
            toBall.y = 0.0f;
            float dist = Vector3Length(toBall);

            if (dist > 0.9f) {
                Vector3 dir = Vector3Normalize(toBall);
                f->position = Vector3Add(f->position, Vector3Scale(dir, 7.5f * dt));
            } else {
                /* Fielder reaches ball */
                ProcessFielderCatchOrStop(match, idx);
            }
        }
    }

    /* Fielder throw towards stumps */
    if (match->ballThrown && ball->stage == BALL_STAGE_IN_PLAY) {
        float distToStumps = Vector3Distance(ball->position, match->throwTargetStump);
        if (distToStumps < 0.6f) {
            /* Ball arrives at stumps: check runout */
            ball->stage = BALL_STAGE_DEAD;
            ball->velocity = Vector3Zero();

            /* Striker crease check */
            bool strikerVulnerable = (match->isRunning && match->strikerRunProgress > 0.15f && match->strikerRunProgress < 0.85f);
            if (strikerVulnerable && rand() % 100 < 60) {
                /* RUN OUT! */
                match->runoutOccurred = true;
                Player *striker = &match->battingTeam->players[match->strikerIdx];
                striker->isOut = true;
                snprintf(striker->dismissal, sizeof(striker->dismissal), "run out (%s)",
                         match->fielders[match->chasingFielderIdx].positionName);
                match->wickets[match->currentInnings - 1]++;

                snprintf(match->eventBanner, sizeof(match->eventBanner), "RUN OUT! DIRECT HIT!");
                match->eventBannerTimer = 3.2f;
                match->eventBannerColor = (Color){ 240, 45, 45, 255 };
                AudioSynth_PlayStumpsHit();
                AudioSynth_PlayCrowdCheer(0.9f);
            }
        }
    }

    /* Running progression between wickets */
    if (match->isRunning && !match->runoutOccurred) {
        float runSpeed = 0.55f; /* complete pitch in ~1.8 seconds */
        match->strikerRunProgress += runSpeed * dt;
        match->nonStrikerRunProgress += runSpeed * dt;

        if (match->strikerRunProgress >= 1.0f) {
            /* 1 Run completed! */
            match->runsCompleted++;
            match->score[match->currentInnings - 1]++;
            match->battingTeam->players[match->strikerIdx].runsScored++;
            match->bowlingTeam->players[match->bowlerIdx].runsConceded++;
            match->partnershipRuns++;

            /* Swap ends */
            int temp = match->strikerIdx;
            match->strikerIdx = match->nonStrikerIdx;
            match->nonStrikerIdx = temp;

            match->strikerRunProgress = 0.0f;
            match->nonStrikerRunProgress = 0.0f;

            /* Check if ball is dead or returned */
            if (ball->stage == BALL_STAGE_DEAD || Vector3Length(ball->velocity) < 0.2f) {
                match->isRunning = false;
            }
        }
    }

    /* Update dislodged bails physics */
    if (match->strikerStumps.bailsDislodged) {
        match->strikerStumps.bail1Vel.y += GRAVITY * dt;
        match->strikerStumps.bail2Vel.y += GRAVITY * dt;
        match->strikerStumps.bail1Y += match->strikerStumps.bail1Vel.y * dt;
        match->strikerStumps.bail2Y += match->strikerStumps.bail2Vel.y * dt;
        if (match->strikerStumps.bail1Y < 0.05f) {
            match->strikerStumps.bail1Y = 0.05f;
            match->strikerStumps.bail1Vel = Vector3Zero();
        }
        if (match->strikerStumps.bail2Y < 0.05f) {
            match->strikerStumps.bail2Y = 0.05f;
            match->strikerStumps.bail2Vel = Vector3Zero();
        }
    }
}
