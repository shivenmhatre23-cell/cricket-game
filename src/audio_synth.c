#include "audio_synth.h"
#include <stdlib.h>
#include <math.h>

#define SAMPLE_RATE 44100
#define PI_F 3.14159265358979323846f

static Sound s_batHitSolid = { 0 };
static Sound s_batHitEdge = { 0 };
static Sound s_ballBounce = { 0 };
static Sound s_stumpsHit = { 0 };
static Sound s_crowdCheer = { 0 };
static Sound s_appeal = { 0 };
static Sound s_boundarySiren = { 0 };
static Sound s_uiClick = { 0 };
static bool s_initialized = false;

static Sound CreateSoundFromSamples(short *samples, int frameCount) {
    Wave wave = { 0 };
    wave.frameCount = frameCount;
    wave.sampleRate = SAMPLE_RATE;
    wave.sampleSize = 16;
    wave.channels = 1;
    wave.data = samples;
    Sound sound = LoadSoundFromWave(wave);
    UnloadWave(wave);
    return sound;
}

static Sound GenBatHit(bool edge) {
    int frames = (int)(SAMPLE_RATE * 0.12f);
    short *data = (short *)malloc(frames * sizeof(short));
    if (!data) return (Sound){ 0 };

    float baseFreq = edge ? 2400.0f : 1250.0f;
    for (int i = 0; i < frames; i++) {
        float t = (float)i / SAMPLE_RATE;
        float decay = expf(-t * (edge ? 50.0f : 40.0f));
        float noise = ((float)rand() / (float)RAND_MAX * 2.0f - 1.0f) * 0.35f;
        float tone1 = sinf(2.0f * PI_F * baseFreq * t);
        float tone2 = sinf(2.0f * PI_F * (baseFreq * 0.45f) * t) * 0.4f;
        float tone3 = sinf(2.0f * PI_F * (baseFreq * 1.8f) * t) * 0.2f;
        float sample = (tone1 + tone2 + tone3 + noise) * decay * 28000.0f;
        if (sample > 32767.0f) sample = 32767.0f;
        if (sample < -32768.0f) sample = -32768.0f;
        data[i] = (short)sample;
    }
    return CreateSoundFromSamples(data, frames);
}

static Sound GenBallBounce(void) {
    int frames = (int)(SAMPLE_RATE * 0.08f);
    short *data = (short *)malloc(frames * sizeof(short));
    if (!data) return (Sound){ 0 };

    for (int i = 0; i < frames; i++) {
        float t = (float)i / SAMPLE_RATE;
        float freq = 200.0f - t * 1200.0f;
        if (freq < 70.0f) freq = 70.0f;
        float decay = expf(-t * 60.0f);
        float sample = sinf(2.0f * PI_F * freq * t) * decay * 26000.0f;
        data[i] = (short)sample;
    }
    return CreateSoundFromSamples(data, frames);
}

static Sound GenStumpsHit(void) {
    int frames = (int)(SAMPLE_RATE * 0.35f);
    short *data = (short *)malloc(frames * sizeof(short));
    if (!data) return (Sound){ 0 };

    for (int i = 0; i < frames; i++) {
        float t = (float)i / SAMPLE_RATE;
        float decay = expf(-t * 18.0f);
        float wood1 = sinf(2.0f * PI_F * 920.0f * t);
        float wood2 = sinf(2.0f * PI_F * 680.0f * t) * 0.7f;
        float clatter = sinf(2.0f * PI_F * 1450.0f * t * (1.0f + 0.3f * sinf(60.0f * t))) * 0.5f;
        float noise = ((float)rand() / (float)RAND_MAX * 2.0f - 1.0f) * 0.4f * expf(-t * 35.0f);
        float sample = (wood1 + wood2 + clatter + noise) * decay * 29000.0f;
        if (sample > 32767.0f) sample = 32767.0f;
        if (sample < -32768.0f) sample = -32768.0f;
        data[i] = (short)sample;
    }
    return CreateSoundFromSamples(data, frames);
}

static Sound GenCrowdCheer(void) {
    int frames = (int)(SAMPLE_RATE * 1.8f);
    short *data = (short *)malloc(frames * sizeof(short));
    if (!data) return (Sound){ 0 };

    float lastNoise = 0.0f;
    for (int i = 0; i < frames; i++) {
        float t = (float)i / SAMPLE_RATE;
        /* Swell up then gradual fade */
        float env = 0.0f;
        if (t < 0.35f) {
            env = t / 0.35f;
        } else {
            env = expf(-(t - 0.35f) * 1.6f);
        }
        float white = ((float)rand() / (float)RAND_MAX * 2.0f - 1.0f);
        /* Low-pass filter for crowd roar */
        lastNoise = lastNoise * 0.85f + white * 0.15f;
        float whistle = sinf(2.0f * PI_F * (1800.0f + 250.0f * sinf(12.0f * t)) * t) * 0.12f * env;
        float sample = (lastNoise * 1.8f + whistle) * env * 22000.0f;
        if (sample > 32767.0f) sample = 32767.0f;
        if (sample < -32768.0f) sample = -32768.0f;
        data[i] = (short)sample;
    }
    return CreateSoundFromSamples(data, frames);
}

static Sound GenAppeal(void) {
    int frames = (int)(SAMPLE_RATE * 0.65f);
    short *data = (short *)malloc(frames * sizeof(short));
    if (!data) return (Sound){ 0 };

    for (int i = 0; i < frames; i++) {
        float t = (float)i / SAMPLE_RATE;
        float env = (t < 0.15f) ? (t / 0.15f) : expf(-(t - 0.15f) * 5.0f);
        float pitch = 380.0f + 180.0f * sinf(t * 14.0f);
        float formant = sinf(2.0f * PI_F * pitch * t) + 0.5f * sinf(2.0f * PI_F * pitch * 2.0f * t);
        float sample = formant * env * 24000.0f;
        if (sample > 32767.0f) sample = 32767.0f;
        if (sample < -32768.0f) sample = -32768.0f;
        data[i] = (short)sample;
    }
    return CreateSoundFromSamples(data, frames);
}

static Sound GenBoundarySiren(void) {
    int frames = (int)(SAMPLE_RATE * 1.0f);
    short *data = (short *)malloc(frames * sizeof(short));
    if (!data) return (Sound){ 0 };

    for (int i = 0; i < frames; i++) {
        float t = (float)i / SAMPLE_RATE;
        float tone = (fmodf(t, 0.25f) < 0.125f) ? 880.0f : 1174.6f;
        float env = expf(-t * 0.8f);
        float sample = sinf(2.0f * PI_F * tone * t) * env * 20000.0f;
        data[i] = (short)sample;
    }
    return CreateSoundFromSamples(data, frames);
}

static Sound GenUIClick(void) {
    int frames = (int)(SAMPLE_RATE * 0.04f);
    short *data = (short *)malloc(frames * sizeof(short));
    if (!data) return (Sound){ 0 };

    for (int i = 0; i < frames; i++) {
        float t = (float)i / SAMPLE_RATE;
        float sample = sinf(2.0f * PI_F * 1760.0f * t) * expf(-t * 90.0f) * 18000.0f;
        data[i] = (short)sample;
    }
    return CreateSoundFromSamples(data, frames);
}

void AudioSynth_Init(void) {
    if (s_initialized) return;
    if (!IsAudioDeviceReady()) {
        InitAudioDevice();
    }
    s_batHitSolid = GenBatHit(false);
    s_batHitEdge = GenBatHit(true);
    s_ballBounce = GenBallBounce();
    s_stumpsHit = GenStumpsHit();
    s_crowdCheer = GenCrowdCheer();
    s_appeal = GenAppeal();
    s_boundarySiren = GenBoundarySiren();
    s_uiClick = GenUIClick();
    s_initialized = true;
}

void AudioSynth_Close(void) {
    if (!s_initialized) return;
    UnloadSound(s_batHitSolid);
    UnloadSound(s_batHitEdge);
    UnloadSound(s_ballBounce);
    UnloadSound(s_stumpsHit);
    UnloadSound(s_crowdCheer);
    UnloadSound(s_appeal);
    UnloadSound(s_boundarySiren);
    UnloadSound(s_uiClick);
    if (IsAudioDeviceReady()) {
        CloseAudioDevice();
    }
    s_initialized = false;
}

void AudioSynth_PlayBatHit(float power, bool isEdge) {
    if (!s_initialized) return;
    Sound snd = isEdge ? s_batHitEdge : s_batHitSolid;
    SetSoundVolume(snd, fminf(1.0f, 0.4f + power * 0.6f));
    PlaySound(snd);
}

void AudioSynth_PlayBallBounce(void) {
    if (!s_initialized) return;
    SetSoundVolume(s_ballBounce, 0.7f);
    PlaySound(s_ballBounce);
}

void AudioSynth_PlayStumpsHit(void) {
    if (!s_initialized) return;
    SetSoundVolume(s_stumpsHit, 1.0f);
    PlaySound(s_stumpsHit);
}

void AudioSynth_PlayCrowdCheer(float intensity) {
    if (!s_initialized) return;
    SetSoundVolume(s_crowdCheer, fminf(1.0f, intensity));
    PlaySound(s_crowdCheer);
}

void AudioSynth_PlayAppeal(void) {
    if (!s_initialized) return;
    SetSoundVolume(s_appeal, 0.85f);
    PlaySound(s_appeal);
}

void AudioSynth_PlayFourSiren(void) {
    if (!s_initialized) return;
    SetSoundVolume(s_boundarySiren, 0.75f);
    PlaySound(s_boundarySiren);
}

void AudioSynth_PlaySixCelebration(void) {
    if (!s_initialized) return;
    AudioSynth_PlayFourSiren();
    AudioSynth_PlayCrowdCheer(1.0f);
}

void AudioSynth_PlayUIClick(void) {
    if (!s_initialized) return;
    SetSoundVolume(s_uiClick, 0.5f);
    PlaySound(s_uiClick);
}
