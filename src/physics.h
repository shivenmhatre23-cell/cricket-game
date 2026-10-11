#ifndef PHYSICS_H
#define PHYSICS_H

#include "cricket.h"

void Physics_InitMatch(MatchState *match);
void Physics_ResetDelivery(MatchState *match);
void Physics_StartBowlerRunup(MatchState *match);
void Physics_ReleaseBall(MatchState *match);
void Physics_Update(MatchState *match, float dt);
void Physics_ExecuteBatterShot(MatchState *match, ShotType shot, float angleDeg, Footwork footwork);
void Physics_CallRun(MatchState *match);
void Physics_StopRun(MatchState *match);

#endif /* PHYSICS_H */
