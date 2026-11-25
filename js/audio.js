// WebAudio synth: every sound is generated, no files.
export class Sound {
  constructor() { this.ctx = null; this.vol = 0.8; this.musicOn = true; this.musicVol = 1; this.musicGain = null; this.started = false; this._noise = null; this.lastPlay = {}; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = this.vol;
    this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 5;
    this.master.connect(this.comp); this.comp.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.gain.value = 1; this.sfx.connect(this.master);
    this.musicGain = c.createGain(); this.musicGain.gain.value = this.musicOn ? 0.32 * this.musicVol : 0; this.musicGain.connect(this.master);
    const len = c.sampleRate * 1.5; const b = c.createBuffer(1, len, c.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this._noise = b;
    this.startMusic();
  }
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); }
  setMusic(on) { this.musicOn = on; if (this.musicGain) this.musicGain.gain.setTargetAtTime(on ? 0.32 * this.musicVol : 0, this.ctx.currentTime, 0.2); }
  setMusicVol(v) { this.musicVol = v; this.setMusic(this.musicOn); }
  setIntensity(x) { this.intensity = x; }
  throttle(name, ms) { const n = performance.now(); if (this.lastPlay[name] && n - this.lastPlay[name] < ms) return true; this.lastPlay[name] = n; return false; }
  noise(t, dur, { type = 'lowpass', f0 = 3000, f1 = 300, q = 1, gain = 0.5, attack = 0.002, dest = null, rate = 1 } = {}) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this._noise; s.playbackRate.value = rate;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfx); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  tone(t, dur, { type = 'sine', f0 = 440, f1 = null, gain = 0.3, attack = 0.004, dest = null, detune = 0 } = {}) {
    const c = this.ctx, o = c.createOscillator(); o.type = type; o.detune.value = detune;
    o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + dur + 0.05);
  }
  pan(x) { const c = this.ctx; if (!c.createStereoPanner) return this.sfx; const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, x)); p.connect(this.sfx); return p; }
  play(name, opt = {}) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + 0.005; const r = 0.94 + Math.random() * 0.12;
    const dist = opt.dist ?? 0; const att = Math.max(0.05, 1 / (1 + dist * 0.08));
    const dest = opt.pan !== undefined ? this.pan(opt.pan) : null;
    switch (name) {
      case 'rifle':
        this.noise(t, 0.11, { f0: 5200 * r, f1: 700, gain: 0.42, dest });
        this.tone(t, 0.09, { type: 'square', f0: 190 * r, f1: 60, gain: 0.28, dest });
        this.tone(t, 0.05, { type: 'sawtooth', f0: 1600 * r, f1: 400, gain: 0.06, dest });
        break;
      case 'shotgun':
        this.noise(t, 0.32, { f0: 3500 * r, f1: 160, gain: 0.7, dest });
        this.tone(t, 0.22, { type: 'sine', f0: 120 * r, f1: 38, gain: 0.7, dest });
        this.noise(t + 0.38, 0.06, { type: 'bandpass', f0: 1800, f1: 1500, q: 6, gain: 0.25 });
        this.noise(t + 0.48, 0.05, { type: 'bandpass', f0: 1300, f1: 1100, q: 6, gain: 0.25 });
        break;
      case 'pistol':
        this.noise(t, 0.09, { f0: 6500 * r, f1: 900, gain: 0.38, dest });
        this.tone(t, 0.07, { type: 'triangle', f0: 420 * r, f1: 110, gain: 0.3, dest });
        break;
      case 'empty': this.noise(t, 0.03, { type: 'bandpass', f0: 2500, f1: 2400, q: 8, gain: 0.3 }); break;
      case 'reload':
        this.noise(t, 0.05, { type: 'bandpass', f0: 1500, f1: 1400, q: 5, gain: 0.3 });
        this.noise(t + 0.35, 0.06, { type: 'bandpass', f0: 900, f1: 800, q: 5, gain: 0.35 });
        this.tone(t + 0.36, 0.05, { type: 'square', f0: 300, f1: 250, gain: 0.08 });
        break;
      case 'reloadEnd':
        this.noise(t, 0.05, { type: 'bandpass', f0: 2200, f1: 2000, q: 6, gain: 0.35 });
        this.tone(t + 0.02, 0.06, { type: 'square', f0: 520, f1: 480, gain: 0.07 });
        break;
      case 'swap': this.noise(t, 0.12, { type: 'bandpass', f0: 800, f1: 2400, q: 3, gain: 0.25 }); break;
      case 'hit': if (this.throttle('hit', 30)) return; this.tone(t, 0.06, { type: 'square', f0: 1900, f1: 1500, gain: 0.07 }); break;
      case 'head': this.tone(t, 0.18, { type: 'sine', f0: 2600, f1: 2500, gain: 0.16 }); this.tone(t, 0.12, { type: 'triangle', f0: 1300, gain: 0.08 }); break;
      case 'kill':
        this.tone(t, 0.1, { type: 'square', f0: 880, gain: 0.08 }); this.tone(t + 0.07, 0.16, { type: 'square', f0: 1320, gain: 0.08 });
        break;
      case 'metal': if (this.throttle('metal', 25)) return; this.tone(t, 0.12, { type: 'triangle', f0: 1200 * r, f1: 700, gain: 0.07 * att, dest }); this.noise(t, 0.05, { type: 'highpass', f0: 4000, f1: 3000, gain: 0.08 * att, dest }); break;
      case 'impact': if (this.throttle('imp', 20)) return; this.noise(t, 0.07, { type: 'bandpass', f0: 1800 * r, f1: 600, q: 2, gain: 0.12 * att, dest }); break;
      case 'wood': this.noise(t, 0.09, { type: 'bandpass', f0: 600 * r, f1: 300, q: 2, gain: 0.3 * att, dest }); break;
      case 'crate': this.noise(t, 0.4, { f0: 1600, f1: 120, gain: 0.55 * att, dest }); this.tone(t, 0.2, { type: 'triangle', f0: 160, f1: 60, gain: 0.3 * att, dest }); break;
      case 'explode':
        this.noise(t, 0.9, { f0: 2400, f1: 60, gain: 0.95 * att, dest, rate: 0.7 });
        this.tone(t, 0.6, { type: 'sine', f0: 90, f1: 28, gain: 0.9 * att, dest });
        this.noise(t + 0.05, 0.5, { type: 'highpass', f0: 3000, f1: 1500, gain: 0.12 * att, dest });
        break;
      case 'robotDie':
        this.tone(t, 0.45, { type: 'sawtooth', f0: 700 * r, f1: 70, gain: 0.16 * att, dest });
        this.noise(t, 0.35, { f0: 3000, f1: 200, gain: 0.4 * att, dest });
        break;
      case 'eshot': if (this.throttle('es', 40)) return; this.tone(t, 0.16, { type: 'sawtooth', f0: 900 * r, f1: 220, gain: 0.11 * att, dest }); this.tone(t, 0.12, { type: 'sine', f0: 1800 * r, f1: 500, gain: 0.05 * att, dest }); break;
      case 'bossShot': this.tone(t, 0.3, { type: 'sawtooth', f0: 300, f1: 80, gain: 0.25 * att, dest }); this.noise(t, 0.2, { f0: 1500, f1: 200, gain: 0.25 * att, dest }); break;
      case 'slam': this.tone(t, 0.8, { type: 'sine', f0: 70, f1: 25, gain: 1 }); this.noise(t, 0.7, { f0: 900, f1: 50, gain: 0.8 }); break;
      case 'charge': this.tone(t, 0.7, { type: 'sawtooth', f0: 80, f1: 600, gain: 0.12 * att, dest }); break;
      case 'buzz': if (this.throttle('buzz', 300)) return; this.tone(t, 0.3, { type: 'sawtooth', f0: 140 * r, f1: 160, gain: 0.05 * att, dest }); break;
      case 'hurt': if (this.throttle('hurt', 90)) return; this.tone(t, 0.18, { type: 'sine', f0: 160, f1: 60, gain: 0.5 }); this.noise(t, 0.12, { f0: 900, f1: 200, gain: 0.25 }); break;
      case 'shieldHit': if (this.throttle('sh', 90)) return; this.tone(t, 0.18, { type: 'triangle', f0: 900, f1: 300, gain: 0.18 }); this.noise(t, 0.1, { type: 'highpass', f0: 5000, f1: 3000, gain: 0.12 }); break;
      case 'pickup': this.tone(t, 0.12, { type: 'triangle', f0: 660, gain: 0.18 }); this.tone(t + 0.08, 0.12, { type: 'triangle', f0: 990, gain: 0.18 }); this.tone(t + 0.16, 0.2, { type: 'triangle', f0: 1320, gain: 0.16 }); break;
      case 'jump': this.noise(t, 0.12, { type: 'bandpass', f0: 500, f1: 900, q: 1.5, gain: 0.12 }); break;
      case 'land': this.noise(t, 0.12, { f0: 700, f1: 150, gain: 0.25 }); break;
      case 'dash': this.noise(t, 0.3, { type: 'bandpass', f0: 400, f1: 3000, q: 1.2, gain: 0.35 }); this.tone(t, 0.25, { type: 'sine', f0: 200, f1: 600, gain: 0.1 }); break;
      case 'step': this.noise(t, 0.06, { f0: 600 * r, f1: 200, gain: 0.07 }); break;
      case 'spawn': this.tone(t, 0.5, { type: 'sine', f0: 200, f1: 900, gain: 0.08 * att, dest }); break;
      case 'wave':
        [0, 0.18, 0.36].forEach((d, i) => { this.tone(t + d, 0.32, { type: 'sawtooth', f0: [220, 277, 330][i], gain: 0.12 }); this.tone(t + d, 0.32, { type: 'square', f0: [110, 138, 165][i], gain: 0.06 }); });
        break;
      case 'waveClear': [0, 0.12, 0.24, 0.36].forEach((d, i) => this.tone(t + d, 0.3, { type: 'triangle', f0: [523, 659, 784, 1046][i], gain: 0.16 })); break;
      case 'boss': this.tone(t, 1.8, { type: 'sawtooth', f0: 55, f1: 45, gain: 0.35 }); this.tone(t, 1.8, { type: 'sawtooth', f0: 82, f1: 70, gain: 0.25, detune: 12 }); this.noise(t, 1.2, { f0: 400, f1: 80, gain: 0.3 }); break;
      case 'streak': this.tone(t, 0.25, { type: 'square', f0: 660, f1: 1320, gain: 0.08 }); break;
      case 'ui': this.tone(t, 0.06, { type: 'triangle', f0: 880, gain: 0.12 }); break;
      case 'gameover': [0, 0.25, 0.5].forEach((d, i) => this.tone(t + d, 0.5, { type: 'sawtooth', f0: [330, 262, 196][i], gain: 0.14 })); break;
      case 'heart': this.tone(t, 0.12, { type: 'sine', f0: 60, f1: 40, gain: 0.5 }); this.tone(t + 0.18, 0.12, { type: 'sine', f0: 55, f1: 38, gain: 0.35 }); break;
    }
  }
  // ---- procedural synthwave loop ----
  startMusic() {
    if (this.started) return; this.started = true;
    const c = this.ctx; this.step = 0; this.nextT = c.currentTime + 0.2; this.bpm = 112;
    this.intensity = 0;
    const del = c.createDelay(); del.delayTime.value = 60 / this.bpm * 0.75; const fb = c.createGain(); fb.gain.value = 0.28;
    const wet = c.createGain(); wet.gain.value = 0.3; del.connect(fb); fb.connect(del); del.connect(wet); wet.connect(this.musicGain);
    this.mDelay = del;
    const tick = () => {
      if (!this.ctx) return;
      while (this.nextT < c.currentTime + 0.25) { this.musicStep(this.step, this.nextT); this.nextT += 60 / this.bpm / 4; this.step++; }
    };
    this.musicTimer = setInterval(tick, 60);
  }
  musicStep(s, t) {
    if (!this.musicOn) return;
    const d = this.musicGain, prog = [[45, 52, 57], [41, 48, 53], [43, 50, 55], [40, 47, 52]]; // Am F G Em
    const bar = Math.floor(s / 16) % 4, st = s % 16, ch = prog[bar];
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
    const I = this.intensity || 0;
    // bass: driving 8ths
    if (st % 2 === 0) this.tone(t, 0.18, { type: 'sawtooth', f0: mtof(ch[0] - 12 + (st % 8 === 6 ? 12 : 0)), gain: 0.16, dest: d });
    // kick
    if (st % 4 === 0) { this.tone(t, 0.25, { type: 'sine', f0: 150, f1: 40, gain: 0.55, dest: d }); }
    // snare
    if (st % 8 === 4) this.noise(t, 0.16, { type: 'bandpass', f0: 2200, f1: 1200, q: 0.8, gain: 0.25, dest: d });
    // hats
    if (I > 0.2 || st % 2 === 1) this.noise(t, 0.03, { type: 'highpass', f0: 8000, f1: 7000, gain: st % 2 ? 0.07 : 0.035, dest: d });
    // arp
    const arp = [0, 1, 2, 1, 0, 2, 1, 2];
    if (st % 2 === 0 || I > 0.5) { const n = ch[arp[(st >> (I > 0.5 ? 0 : 1)) % 8]] + 12 + (st >= 8 ? 12 : 0); this.tone(t, 0.14, { type: 'square', f0: mtof(n), gain: 0.035, dest: this.mDelay }); this.tone(t, 0.14, { type: 'square', f0: mtof(n), gain: 0.03, dest: d }); }
    // pad on bar start
    if (st === 0) ch.forEach(n => this.tone(t, 60 / this.bpm * 4, { type: 'triangle', f0: mtof(n + 12), gain: 0.03, attack: 0.4, dest: d }));
  }
}
