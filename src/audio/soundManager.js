// Synthetic procedural cricket audio engine using Web Audio API
// Zero external asset dependencies - works instantly and reliably offline

class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGainNode = null;
    this.sfxGainNode = null;
    this.ambientGain = null;
    this.initialized = false;
    this.masterVolume = 1.0;
    this.sfxVolume = 1.0;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      
      this.masterGainNode = this.ctx.createGain();
      this.masterGainNode.gain.value = this.masterVolume;
      this.masterGainNode.connect(this.ctx.destination);

      this.sfxGainNode = this.ctx.createGain();
      this.sfxGainNode.gain.value = this.sfxVolume;
      this.sfxGainNode.connect(this.masterGainNode);

      this.initialized = true;
      this.startCrowdMurmur();
    } catch (e) {
      console.warn("Web Audio not supported or blocked", e);
    }
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGainNode && this.ctx) {
      this.masterGainNode.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  setSfxVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (this.sfxGainNode && this.ctx) {
      this.sfxGainNode.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  getDestination() {
    return this.sfxGainNode || (this.ctx ? this.ctx.destination : null);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Realistic wooden bat impact
  playBatHit(power = 1.0, isSweet = true) {
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    
    // 1. Initial sharp wooden 'crack' / transient
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = isSweet ? 'triangle' : 'square';
    osc.frequency.setValueAtTime(isSweet ? 480 : 320, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);
    
    gain.gain.setValueAtTime(0.8 * power, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isSweet ? 0.12 : 0.09));
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);

    // 2. High-frequency click snap
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(1400, t);
    clickOsc.frequency.exponentialRampToValueAtTime(200, t + 0.025);
    clickGain.gain.setValueAtTime(0.6 * power, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    clickOsc.connect(clickGain);
    clickGain.connect(this.ctx.destination);
    clickOsc.start(t);
    clickOsc.stop(t + 0.04);

    // 3. Wooden body resonance noise burst
    this.playNoiseBurst(0.06, 0.4 * power, 800, 1800);
  }

  // Pitch bounce thump
  playPitchBounce(volume = 0.5) {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.07);
    
    gain.gain.setValueAtTime(volume * 0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  // Stumps hit / wood clatter
  playStumpsHit() {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Multiple distinct wooden clatters
    [0, 0.03, 0.07, 0.12].forEach((offset, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      const freqs = [720, 560, 880, 420];
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freqs[idx], t + offset);
      osc.frequency.exponentialRampToValueAtTime(180, t + offset + 0.08);

      gain.gain.setValueAtTime(0, t);
      gain.gain.setValueAtTime(0.6 / (idx + 1), t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + offset);
      osc.stop(t + offset + 0.12);
    });

    this.playCheer(1.2, 2.5);
  }

  // Bowler delivery whoosh
  playWhoosh() {
    if (!this.ctx) return;
    this.resume();
    this.playNoiseBurst(0.18, 0.25, 200, 900);
  }

  // Crowd cheer (e.g., 4s, 6s, Wickets)
  playCheer(intensity = 1.0, duration = 3.0) {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;

    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter to make it sound like a large stadium crowd roar
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, t);
    filter.frequency.exponentialRampToValueAtTime(750, t + 0.6);
    filter.frequency.exponentialRampToValueAtTime(400, t + duration);
    filter.Q.value = 1.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.5 * intensity, t + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + duration);
  }

  // UI button click
  playClick() {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, t);
    osc.frequency.exponentialRampToValueAtTime(350, t + 0.04);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  // Umpire boundary four / six signal chime
  playBoundaryFanfare(isSix = false) {
    if (!this.ctx) return;
    this.resume();
    const notes = isSix ? [440, 554, 659, 880] : [523, 659, 784];
    const duration = isSix ? 0.18 : 0.14;
    notes.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * duration;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration * 1.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + duration * 1.6);
    });
    this.playCheer(isSix ? 1.0 : 0.7, isSix ? 3.5 : 2.5);
  }

  // Stadium background murmur
  startCrowdMurmur() {
    if (!this.ctx || this.ambientGain) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 280;

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.06;

    noise.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientGain.connect(this.ctx.destination);

    noise.start();
  }

  playNoiseBurst(duration, gainVal, lowFreq, highFreq) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime((lowFreq + highFreq) / 2, t);
    filter.Q.value = 1.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    source.start(t);
    source.stop(t + duration);
  }
}

export const soundManager = new SoundManager();
