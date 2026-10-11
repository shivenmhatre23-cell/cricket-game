#ifndef UI_H
#define UI_H

#include "cricket.h"

void UI_Init(void);
void UI_DrawBroadcastHUD(MatchState *match, int screenWidth, int screenHeight);
void UI_DrawBattingControls(MatchState *match, int screenWidth, int screenHeight);
void UI_DrawBowlingControls(MatchState *match, int screenWidth, int screenHeight);
void UI_DrawRunningControls(MatchState *match, int screenWidth, int screenHeight);
void UI_DrawTeamSelect(Team *teams, int teamCount, int *selectedTeam1, int *selectedTeam2, int screenWidth, int screenHeight);
void UI_DrawMatchSettings(MatchState *match, int screenWidth, int screenHeight);
void UI_DrawTossScreen(MatchState *match, int tossChoice, int coinResult, bool tossDecided, float tossTimer, int screenWidth, int screenHeight);
void UI_DrawScorecard(MatchState *match, int screenWidth, int screenHeight);

#endif /* UI_H */
