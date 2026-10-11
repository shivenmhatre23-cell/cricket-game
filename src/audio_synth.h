#ifndef AUDIO_SYNTH_H
#define AUDIO_SYNTH_H

#include "raylib.h"

void AudioSynth_Init(void);
void AudioSynth_Close(void);

void AudioSynth_PlayBatHit(float power, bool isEdge);
void AudioSynth_PlayBallBounce(void);
void AudioSynth_PlayStumpsHit(void);
void AudioSynth_PlayCrowdCheer(float intensity);
void AudioSynth_PlayAppeal(void);
void AudioSynth_PlayFourSiren(void);
void AudioSynth_PlaySixCelebration(void);
void AudioSynth_PlayUIClick(void);

#endif /* AUDIO_SYNTH_H */
