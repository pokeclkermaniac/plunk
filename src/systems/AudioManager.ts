/**
 * All sound is synthesized with the Web Audio API at runtime: no audio files, no licensing.
 * Two "sound packs": 'toy' (soft, plasticky) and 'chip' (square-wave chiptune flavour).
 */
type Pack = 'toy' | 'chip';

export type Sfx =
  | 'bubble'
  | 'click'
  | 'clack'
  | 'tick'
  | 'bonk'
  | 'chime'
  | 'fanfare'
  | 'bounce'
  | 'clang'
  | 'thunk'
  | 'swish'
  | 'whoosh'
  | 'hothands'
  | 'bomb'
  | 'warning'
  | 'jingle'
  | 'golden'
  | 'ui';

class AudioManagerImpl {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private noiseBuf: AudioBuffer | null = null;
  pack: Pack = 'toy';
  private vol = { master: 0.8, music: 0.5, sfx: 0.9, mute: false };
  private musicTimer: number | null = null;
  private musicOn = false;
  private nextBeat = 0;
  private beat = 0;
  intensity = 0;
  private lastPlayed = new Map<string, number>();

  /** Must be called from a user gesture on iOS. Safe to call many times. */
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus.connect(this.master);
      // Gentle limiter so stacked bubbles never clip.
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -10;
      comp.ratio.value = 6;
      this.master.connect(comp).connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolumes();
      if (this.musicOn) this.startMusicLoop();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setVolumes(v: { master: number; music: number; sfx: number; mute: boolean }): void {
    this.vol = { ...v };
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.vol.mute ? 0 : this.vol.master, t, 0.02);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx, t, 0.02);
    this.musicBus.gain.setTargetAtTime(this.vol.music * 0.55, t, 0.05);
  }

  // ── primitives ─────────────────────────────────────────────────
  private tone(
    freq: number,
    dur: number,
    opts: {
      type?: OscillatorType;
      gain?: number;
      to?: number;
      delay?: number;
      attack?: number;
      bus?: GainNode;
      filter?: number;
    } = {},
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? (this.pack === 'chip' ? 'square' : 'sine');
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t0 + dur);
    const peak = (opts.gain ?? 0.3) * (this.pack === 'chip' && !opts.type ? 0.45 : 1);
    const a = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node: AudioNode = osc;
    if (opts.filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.filter;
      osc.connect(f);
      node = f;
    }
    node.connect(g).connect(opts.bus ?? this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private noise(
    dur: number,
    opts: { gain?: number; freq?: number; q?: number; type?: BiquadFilterType; delay?: number; to?: number; bus?: GainNode } = {},
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuf) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.5 + Math.random();
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? 'bandpass';
    f.frequency.setValueAtTime(opts.freq ?? 1000, t0);
    if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
    f.Q.value = opts.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.3, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(opts.bus ?? this.sfxBus);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.05);
  }

  /** Throttle identical sounds so mashing doesn't turn into mush. */
  private throttle(key: string, ms: number): boolean {
    const now = performance.now();
    if (now - (this.lastPlayed.get(key) ?? 0) < ms) return false;
    this.lastPlayed.set(key, now);
    return true;
  }

  play(name: Sfx, param = 0): void {
    if (!this.ctx || this.vol.mute) return;
    const r = (a: number, b: number) => a + Math.random() * (b - a);
    const chip = this.pack === 'chip';
    switch (name) {
      case 'bubble': {
        // Gurgle: a burst of rising blips plus filtered noise. Randomised every time.
        this.noise(0.35, { freq: r(500, 900), to: r(1500, 2500), q: 2, gain: 0.18 });
        const n = 4 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) {
          const f = r(280, 700);
          this.tone(f, r(0.05, 0.1), { to: f * r(1.6, 2.6), gain: r(0.06, 0.14), delay: i * r(0.025, 0.06) });
        }
        break;
      }
      case 'click':
        this.noise(0.04, { freq: 3000, q: 4, gain: 0.25 });
        this.tone(r(180, 220), 0.05, { type: chip ? 'square' : 'triangle', gain: 0.15, to: 90 });
        break;
      case 'clack':
        if (!this.throttle('clack', 40)) return;
        this.tone(r(820, 920), 0.09, { type: chip ? 'square' : 'triangle', gain: 0.3, to: 600 });
        this.noise(0.05, { freq: 2500, q: 3, gain: 0.25 });
        this.tone(r(1600, 1800), 0.05, { gain: 0.1, delay: 0.06 });
        break;
      case 'tick':
        if (!this.throttle('tick', 60)) return;
        this.tone(r(1800, 2300), 0.03, { type: 'triangle', gain: 0.07 * Math.min(1, 0.3 + param) });
        break;
      case 'bonk':
        this.tone(220, 0.25, { type: chip ? 'square' : 'sawtooth', gain: 0.18, to: 110, filter: 900 });
        this.tone(165, 0.3, { type: 'triangle', gain: 0.2, to: 80, delay: 0.05 });
        break;
      case 'chime': {
        // Rising streak tones: param = streak count.
        const base = 523.25 * Math.pow(2, Math.min(param - 1, 8) / 6);
        this.tone(base, 0.25, { type: chip ? 'square' : 'triangle', gain: 0.18 });
        this.tone(base * 1.5, 0.3, { gain: 0.1, delay: 0.05 });
        break;
      }
      case 'fanfare': {
        const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
        notes.forEach((f, i) =>
          this.tone(f, i === notes.length - 1 ? 0.6 : 0.16, {
            type: chip ? 'square' : 'triangle',
            gain: 0.2,
            delay: i * 0.1,
          }),
        );
        notes.forEach((f, i) => this.tone(f * 2, 0.2, { gain: 0.05, delay: i * 0.1 + 0.02 }));
        break;
      }
      case 'golden':
        [987.77, 1318.5, 1975.5].forEach((f, i) => this.tone(f, 0.3, { gain: 0.12, delay: i * 0.06 }));
        break;
      case 'bounce':
        if (!this.throttle('bounce', 70)) return;
        this.tone(r(110, 140), 0.12, { type: 'sine', gain: 0.25 * Math.min(1, param), to: 60 });
        break;
      case 'clang':
        if (!this.throttle('clang', 60)) return;
        this.tone(r(600, 680), 0.35, { type: chip ? 'square' : 'triangle', gain: 0.14, to: 560 });
        this.tone(r(1500, 1700), 0.25, { gain: 0.07 });
        break;
      case 'thunk':
        if (!this.throttle('thunk', 70)) return;
        this.tone(r(150, 180), 0.12, { type: 'triangle', gain: 0.25, to: 90 });
        this.noise(0.06, { freq: 600, q: 1, gain: 0.15 });
        break;
      case 'swish':
        this.noise(0.4, { freq: 3500, to: 1200, q: 0.8, gain: 0.3, type: 'bandpass' });
        this.tone(1318.5, 0.3, { gain: 0.07, delay: 0.1 });
        break;
      case 'whoosh':
        this.noise(0.7, { freq: 300, to: 2500, q: 0.7, gain: 0.3 });
        break;
      case 'hothands':
        [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          this.tone(f, 0.18, { type: 'square', gain: 0.1, delay: i * 0.07, filter: 3000 }),
        );
        break;
      case 'bomb':
        this.noise(0.5, { freq: 900, to: 120, q: 0.6, gain: 0.5, type: 'lowpass' });
        this.tone(120, 0.4, { type: 'sine', gain: 0.4, to: 40 });
        break;
      case 'warning':
        this.tone(880, 0.08, { type: 'square', gain: 0.08, filter: 2500 });
        break;
      case 'jingle':
        [659.25, 783.99, 880, 1046.5, 1318.5].forEach((f, i) =>
          this.tone(f, 0.25, { type: chip ? 'square' : 'triangle', gain: 0.16, delay: i * 0.12 }),
        );
        break;
      case 'ui':
        this.tone(660, 0.06, { type: 'triangle', gain: 0.12 });
        break;
    }
  }

  // ── lo-fi music loop ───────────────────────────────────────────
  startMusic(): void {
    this.musicOn = true;
    if (this.ctx) this.startMusicLoop();
  }

  stopMusic(): void {
    this.musicOn = false;
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  private startMusicLoop(): void {
    if (this.musicTimer !== null || !this.ctx) return;
    this.nextBeat = this.ctx.currentTime + 0.1;
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 50);
  }

  private scheduleMusic(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const bpm = 76 + this.intensity * 30;
    const spb = 60 / bpm / 2; // eighth notes
    // Fmaj7 – Em7 – Dm7 – Cmaj7 (a lazy descending lo-fi progression)
    const chords = [
      [174.61, 220, 261.63, 329.63],
      [164.81, 196, 246.94, 293.66],
      [146.83, 174.61, 220, 261.63],
      [130.81, 164.81, 196, 246.94],
    ];
    while (this.nextBeat < ctx.currentTime + 0.3) {
      const t = this.nextBeat - ctx.currentTime;
      const step = this.beat % 32;
      const chord = chords[Math.floor(step / 8)];
      const bus = this.musicBus;
      const wave: OscillatorType = this.pack === 'chip' ? 'square' : 'triangle';
      if (step % 8 === 0) {
        for (const f of chord) this.tone(f, spb * 7.5, { type: wave, gain: 0.05, delay: t, attack: 0.12, bus, filter: 1100 });
        this.tone(chord[0] / 2, spb * 3, { type: 'sine', gain: 0.16, delay: t, bus });
      }
      if (step % 8 === 4) this.tone(chord[0] / 2, spb * 2, { type: 'sine', gain: 0.12, delay: t, bus });
      // little melody blips
      if (step % 4 === 2 && Math.random() < 0.55) {
        const f = chord[1 + Math.floor(Math.random() * 3)] * 2;
        this.tone(f, spb * 1.5, { type: this.pack === 'chip' ? 'square' : 'sine', gain: 0.04, delay: t, bus, filter: 2500 });
      }
      // drums: soft kick, snare-ish noise, hats
      if (step % 4 === 0) this.tone(95, 0.18, { type: 'sine', gain: 0.22, to: 45, delay: t, bus });
      if (step % 8 === 4) this.noise(0.12, { freq: 1800, q: 0.8, gain: 0.07, delay: t, bus });
      if (step % 2 === 1 || this.intensity > 0) this.noise(0.03, { freq: 8000, q: 1, gain: 0.025, type: 'highpass', delay: t, bus });
      this.nextBeat += spb;
      this.beat++;
    }
  }
}

export const AudioManager = new AudioManagerImpl();
