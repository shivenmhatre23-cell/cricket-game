#ifndef RENDER_3D_H
#define RENDER_3D_H

#include "cricket.h"

void Render3D_Init(void);
void Render3D_Close(void);
void Render3D_DrawScene(MatchState *match);
void Render3D_UpdateCamera(MatchState *match, float dt);

#endif /* RENDER_3D_H */
