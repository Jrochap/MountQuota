// ─────────────────────────────────────────────────────────────
//  MOUNT QUOTA — procedural sound (Web Audio, no asset files)
//  Everything is synthesised: noise + oscillators + filters, into a
//  generated "concrete hall" reverb. Ambience crossfades by era and the
//  machinery rhythm follows what the player actually owns.
// ─────────────────────────────────────────────────────────────

const rand = (a, b) => a + Math.random() * (b - a);

export class Sound {
  constructor(settings) {
    this.s = settings;
    this.ctx = null;
    this.timers = { pick: 0, stamp: 0, beep: rand(4, 8), blip: 1, zap: 1, spoon: 2, rumble: 6, crumble: 0 };
    this.lastBuy = 0;
  }

  // must be called from a user gesture (autoplay policy, esp. Safari)
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.build();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  get live() { return this.ctx && this.ctx.state === 'running' && this.s.sound; }

  build() {
    const c = this.ctx;
    this.master = c.createGain();
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    this.master.connect(comp).connect(c.destination);
    this.sfxBus = c.createGain(); this.sfxBus.connect(this.master);
    this.ambBus = c.createGain(); this.ambBus.connect(this.master);
    // concrete hall: exponentially decaying stereo noise impulse
    const len = Math.floor(c.sampleRate * 2.4), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    this.verb = c.createConvolver(); this.verb.buffer = ir;
    this.verbIn = c.createGain(); this.verbIn.gain.value = 0.5;
    this.verbIn.connect(this.verb).connect(this.master);
    // shared noise
    const nl = c.sampleRate * 2;
    this.noiseBuf = c.createBuffer(1, nl, c.sampleRate);
    const nd = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < nl; i++) nd[i] = Math.random() * 2 - 1;
    this.applyVolume();
    this.buildAmbience();
  }

  applyVolume() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, s = this.s;
    this.master.gain.setTargetAtTime(s.sound ? s.volume : 0, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(s.sfxVol, t, 0.05);
    this.ambBus.gain.setTargetAtTime(s.ambVol, t, 0.05);
  }
  suspend(hidden) {
    if (!this.ctx) return;
    if (hidden) this.ctx.suspend(); else this.ctx.resume();
  }

  // ── primitives ───────────────────────────────────────────
  env(g, t0, peak, attack, dur) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }
  route(node, verb, bus = this.sfxBus) {
    node.connect(bus);
    if (verb > 0) { const s = this.ctx.createGain(); s.gain.value = verb; node.connect(s); s.connect(this.verbIn); }
  }
  tone({ f, f2, type = 'sine', dur = 0.2, gain = 0.2, attack = 0.004, at = 0, verb = 0.15, lp, bus }) {
    const c = this.ctx, t0 = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    let n = o;
    if (lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); n = fl; }
    n.connect(g); this.env(g, t0, gain, attack, dur);
    this.route(g, verb, bus);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  noise({ dur = 0.1, gain = 0.2, type = 'bandpass', f = 1000, f2, q = 1, attack = 0.002, at = 0, verb = 0.1, bus }) {
    const c = this.ctx, t0 = c.currentTime + at;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf;
    const fl = c.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t0);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    const g = c.createGain();
    src.connect(fl).connect(g); this.env(g, t0, gain, attack, dur);
    this.route(g, verb, bus);
    src.start(t0, Math.random() * 1.5); src.stop(t0 + dur + 0.05);
  }
  bell(f, at = 0, gain = 0.1, dur = 2.6) {
    [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.93, 0.12]].forEach(([m, a]) =>
      this.tone({ f: f * m, dur: dur / Math.sqrt(m), gain: gain * a, at, attack: 0.002, verb: 0.6 }));
  }

  // ── one-shots ────────────────────────────────────────────
  play(name, ...args) { if (this.live && this[name]) this[name](...args); }

  mine() {
    this.noise({ dur: 0.13, gain: 0.45, f: rand(700, 1100), f2: 250, q: 1.2, verb: 0.25 });
    this.tone({ f: rand(130, 160), f2: 55, dur: 0.14, gain: 0.45, verb: 0.1 });
    this.tone({ f: rand(1900, 2600), type: 'triangle', dur: 0.07, gain: 0.06, verb: 0.3 });
  }
  clogged() {
    this.tone({ f: 92, type: 'square', dur: 0.16, gain: 0.08, lp: 500, verb: 0 });
    this.tone({ f: 70, type: 'square', dur: 0.16, gain: 0.08, lp: 500, at: 0.09, verb: 0 });
  }
  buy(cat) {
    const now = performance.now();
    if (now - this.lastBuy < 40) return;
    this.lastBuy = now;
    const base = { mining: 196, extraction: 247, processing: 294 }[cat] || 220;
    this.noise({ dur: 0.03, gain: 0.22, type: 'highpass', f: 2500, verb: 0.05 });
    this.tone({ f: base * rand(0.98, 1.02), type: 'square', dur: 0.08, gain: 0.06, lp: 1400, verb: 0.1 });
    this.tone({ f: 95, f2: 48, dur: 0.12, gain: 0.32, at: 0.04, verb: 0.15 });
    this.noise({ dur: 0.06, gain: 0.14, type: 'lowpass', f: 600, at: 0.04, verb: 0.15 });
  }
  denied() {
    this.tone({ f: 150, type: 'square', dur: 0.07, gain: 0.05, lp: 700, verb: 0 });
    this.tone({ f: 112, type: 'square', dur: 0.1, gain: 0.05, lp: 700, at: 0.08, verb: 0 });
  }
  select() { this.tone({ f: 880, type: 'triangle', dur: 0.05, gain: 0.06, verb: 0.1 }); }
  open() { this.noise({ dur: 0.09, gain: 0.08, f: 1800, f2: 900, q: 0.8, verb: 0.2 }); }
  research() {
    [659, 988, 1319].forEach((f, i) => this.tone({ f, type: 'triangle', dur: 0.6, gain: 0.09, at: i * 0.07, verb: 0.5 }));
  }
  skill() {
    [220, 330, 440, 554].forEach((f, i) => this.tone({ f, dur: 1.6, gain: 0.07, attack: 0.02, at: i * 0.04, verb: 0.7 }));
    this.tone({ f: 55, dur: 1.2, gain: 0.25, verb: 0.3 });
  }
  leap() {
    this.noise({ dur: 1.8, gain: 0.7, type: 'lowpass', f: 260, f2: 60, verb: 0.6 });
    this.tone({ f: 58, f2: 32, dur: 1.6, gain: 0.6, verb: 0.3 });
    [110, 165, 220, 277].forEach(f => this.tone({ f, type: 'sawtooth', dur: 2.8, gain: 0.045, attack: 0.5, at: 0.25, lp: 900, verb: 0.7 }));
  }
  gen() { this.bell(196, 0, 0.12); this.bell(196, 1.3, 0.1); this.bell(147, 2.6, 0.12, 3.4); }
  memo() {
    for (let i = 0; i < 7; i++) this.noise({ dur: 0.018, gain: 0.16, type: 'highpass', f: 3200, at: i * 0.055 + rand(0, 0.02), verb: 0.05 });
    this.tone({ f: 1568, type: 'triangle', dur: 0.8, gain: 0.08, at: 0.45, verb: 0.4 });
  }
  memoPick() {
    this.noise({ dur: 0.12, gain: 0.5, type: 'lowpass', f: 500, verb: 0.3 });
    this.tone({ f: 85, f2: 45, dur: 0.14, gain: 0.4, verb: 0.2 });
  }
  complete() {
    this.leap();
    [262, 330, 392, 523].forEach((f, i) => this.tone({ f, type: 'sawtooth', dur: i === 3 ? 2.4 : 0.5, gain: 0.06, attack: 0.02, at: 0.4 + i * 0.16, lp: 1800, verb: 0.6 }));
  }
  evolve() {
    const c = this.ctx, t0 = c.currentTime;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.setValueAtTime(200, t0); fl.frequency.exponentialRampToValueAtTime(4000, t0 + 1.6);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.5, t0 + 1.6); g.gain.setValueAtTime(0.0001, t0 + 1.62);
    src.connect(fl).connect(g); this.route(g, 0.5);
    src.start(t0); src.stop(t0 + 1.7);
    this.tone({ f: 90, f2: 900, dur: 1.6, gain: 0.12, attack: 1.4, verb: 0.5 });
    this.tone({ f: 40, dur: 1.4, gain: 0.6, at: 1.62, verb: 0.6 });
  }
  crumble(n) {
    if (!this.live || n <= 0 || this.timers.crumble > 0) return;
    this.timers.crumble = 0.07;
    this.noise({ dur: rand(0.08, 0.22), gain: Math.min(0.22, 0.05 + n * 0.012), f: rand(350, 1300), q: 0.9, verb: 0.2 });
  }

  // ── ambience ─────────────────────────────────────────────
  loopNoise() { const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; s.start(0, Math.random()); return s; }
  lfo(f, depth, target) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.value = f; g.gain.value = depth; o.connect(g).connect(target); o.start(); return o;
  }
  layer() { const g = this.ctx.createGain(); g.gain.value = 0; g.connect(this.ambBus); return g; }
  buildAmbience() {
    const c = this.ctx;
    // wind, always on
    const wf = c.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 480; wf.Q.value = 0.7;
    const wg = c.createGain(); wg.gain.value = 0.1;
    this.loopNoise().connect(wf).connect(wg).connect(this.ambBus);
    this.lfo(0.07, 260, wf.frequency); this.lfo(0.11, 0.05, wg.gain);
    this.wind = wg;

    const L = this.layers = [];
    L[0] = null;
    // II steam: low furnace rumble
    L[1] = this.layer();
    { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 120; this.loopNoise().connect(f).connect(L[1]); }
    // III diesel: two detuned saws, throbbing
    L[2] = this.layer();
    { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 190;
      const am = c.createGain(); am.gain.value = 0.6; f.connect(am).connect(L[2]); this.lfo(8.5, 0.35, am.gain);
      for (const hz of [46, 46.8]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz; o.connect(f); o.start(); } }
    // IV silicon: mains hum
    L[3] = this.layer();
    [[60, 1], [120, 0.5], [180, 0.25]].forEach(([hz, a]) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = hz; g.gain.value = a; o.connect(g).connect(L[3]); o.start(); });
    // V lasers: high whine + sub
    L[4] = this.layer();
    { const o = c.createOscillator(); o.frequency.value = 2400; this.lfo(6, 28, o.frequency);
      const g = c.createGain(); g.gain.value = 0.12; o.connect(g).connect(L[4]); o.start();
      const s = c.createOscillator(); s.frequency.value = 31; s.connect(L[4]); s.start(); }
    // VI post-physical: slow detuned pad
    L[5] = this.layer();
    [55, 82.4, 110.6, 164.4, 246.9].forEach((hz, i) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = hz; this.lfo(0.05 + i * 0.03, hz * 0.004, o.frequency); g.gain.value = 0.22 / (i + 1); o.connect(g).connect(L[5]); o.start(); });
    this.layerLevels = [0, 0.32, 0.16, 0.05, 0.05, 0.09];
  }

  // called every frame with the game state
  update(g, dt) {
    if (!this.live) return;
    const r = g.run, u = r.units, T = this.timers, t = this.ctx.currentTime;
    for (const k in T) T[k] -= dt;
    for (let e = 1; e < 6; e++) {
      const on = u.mining[e] + u.extraction[e] + u.processing[e] > 0 && !r.complete;
      this.layers[e].gain.setTargetAtTime(on ? this.layerLevels[e] : 0, t, 1.2);
    }
    if (r.complete) return;

    // Era I: distant pickaxes
    if (u.mining[0] > 0 && T.pick <= 0) {
      T.pick = 1 / Math.min(5, 0.4 + Math.sqrt(u.mining[0]) * 0.35) * rand(0.6, 1.4);
      this.tone({ f: rand(1700, 2900), type: 'triangle', dur: 0.05, gain: 0.025, verb: 0.5, bus: this.ambBus });
      this.noise({ dur: 0.03, gain: 0.03, type: 'highpass', f: 2000, verb: 0.4, bus: this.ambBus });
    }
    // Era II: stamp mill heartbeat
    if (u.processing[1] > 0 && T.stamp <= 0) {
      T.stamp = 0.62;
      this.tone({ f: 72, f2: 40, dur: 0.2, gain: 0.2, verb: 0.35, bus: this.ambBus });
      this.noise({ dur: 0.08, gain: 0.08, type: 'lowpass', f: 400, verb: 0.3, bus: this.ambBus });
    }
    // Era III: reversing trucks
    if (u.extraction[2] > 0 && T.beep <= 0) {
      T.beep = rand(6, 13);
      for (let i = 0; i < 3; i++) this.tone({ f: 1046, type: 'square', dur: 0.14, gain: 0.018, at: i * 0.32, lp: 2500, verb: 0.4, bus: this.ambBus });
    }
    // Era IV: computers thinking
    if (u.processing[3] + u.extraction[3] > 0 && T.blip <= 0) {
      T.blip = rand(0.8, 3);
      const k = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < k; i++) this.tone({ f: rand(1200, 3200), dur: 0.04, gain: 0.016, at: i * 0.07, verb: 0.2, bus: this.ambBus });
    }
    // Era V: laser discharges
    if (u.mining[4] > 0 && T.zap <= 0) {
      T.zap = rand(0.9, 2.2);
      this.tone({ f: rand(1600, 2200), f2: 180, type: 'sawtooth', dur: 0.3, gain: 0.025, lp: 3000, verb: 0.5, bus: this.ambBus });
    }
    // Era VI: the spoon scoops
    if (u.mining[5] > 0 && T.spoon <= 0) {
      T.spoon = 4;
      this.tone({ f: 70, f2: 38, dur: 2.2, gain: 0.25, attack: 0.6, verb: 0.6, bus: this.ambBus });
      this.noise({ dur: 2, gain: 0.08, type: 'lowpass', f: 1200, f2: 150, attack: 0.5, verb: 0.5, bus: this.ambBus });
    }
    // the volcano grumbles
    if (r.mtn?.id === 'volcano' && T.rumble <= 0) {
      T.rumble = rand(7, 15);
      this.noise({ dur: 2.5, gain: 0.3, type: 'lowpass', f: 90, attack: 0.4, verb: 0.4, bus: this.ambBus });
    }
  }
}
