import { CAUGHT_AUDIO_VIDEO_URL } from './types';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private coinCombo = 0;
  private lastCoinTime = 0;
  private caughtClip: HTMLVideoElement | null = null;
  private clipPrimed = false;

  constructor() {
    if (typeof document !== 'undefined') {
      const video = document.createElement('video');
      video.src = CAUGHT_AUDIO_VIDEO_URL;
      video.preload = 'auto';
      video.playsInline = true;
      video.volume = 1.0;
      this.caughtClip = video;
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.caughtClip) {
      this.caughtClip.muted = muted;
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public unlock(): void {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (this.caughtClip && !this.clipPrimed) {
      this.clipPrimed = true;
      this.caughtClip.muted = true;
      void this.caughtClip
        .play()
        .then(() => {
          if (this.caughtClip) {
            this.caughtClip.pause();
            this.caughtClip.currentTime = 0;
            this.caughtClip.muted = this.muted;
          }
        })
        .catch(() => {
          this.clipPrimed = false;
        });
    }
  }

  private ensureReady(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) this.unlock();
    if (!this.ctx || this.ctx.state !== 'running') return null;
    return this.ctx;
  }

  public playLaneSwitch(): void {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.065);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.075);
  }

  public playJump(superJump = false): void {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(superJump ? 260 : 210, now);
    osc.frequency.exponentialRampToValueAtTime(superJump ? 680 : 490, now + 0.16);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playLand(): void {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(125, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.08);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playRoll(): void {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.14);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(340, now + 0.13);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(now);
  }

  public playCoin(): void {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (now - this.lastCoinTime < 0.45) {
      this.coinCombo = Math.min(this.coinCombo + 1, 10);
    } else {
      this.coinCombo = 0;
    }
    this.lastCoinTime = now;

    const pentatonic = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
    const semitones = pentatonic[this.coinCombo] ?? 0;
    const baseFreq = 784 * Math.pow(2, semitones / 12);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.setValueAtTime(baseFreq * 1.25, now + 0.045);
    gain.gain.setValueAtTime(0.085, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playPowerUp(): void {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.055;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.19);
    });
  }

  public playStumble(): void {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Low thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.22);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);

    // Chaser whistle chirp
    const whistle = ctx.createOscillator();
    const wGain = ctx.createGain();
    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(1320, now + 0.06);
    whistle.frequency.linearRampToValueAtTime(1580, now + 0.16);
    whistle.frequency.linearRampToValueAtTime(1240, now + 0.28);
    wGain.gain.setValueAtTime(0.06, now + 0.06);
    wGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    whistle.connect(wGain).connect(ctx.destination);
    whistle.start(now + 0.06);
    whistle.stop(now + 0.31);
  }

  public playTrainHorn(): void {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [220, 277.18];
    freqs.forEach((f) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.9, now + 0.38);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(750, now);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(filter).connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.42);
    });
  }

  public stopCaughtClip(): void {
    if (!this.caughtClip) return;
    this.caughtClip.pause();
    this.caughtClip.currentTime = 0;
  }

  public playCaughtClip(): void {
    if (this.muted || !this.caughtClip) return;
    this.caughtClip.muted = false;
    this.caughtClip.volume = 1.0;
    this.caughtClip.currentTime = 0;
    void this.caughtClip.play().catch(() => {
      // Ignored if browser blocked autoplay before user gesture
    });
  }

  public playCaught(): void {
    const ctx = this.ensureReady();
    if (ctx) {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(52, now + 0.16);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
    }

    // Play the video's audio clip when Ruhul catches Hujur
    this.playCaughtClip();
  }

  public dispose(): void {
    this.stopCaughtClip();
    if (this.caughtClip) {
      this.caughtClip.src = '';
      this.caughtClip = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
