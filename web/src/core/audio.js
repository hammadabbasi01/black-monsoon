// Procedural audio: every sound is synthesised with WebAudio so the game ships with no audio files.
import * as THREE from 'three';

const V = new THREE.Vector3();
export class Audio {
  constructor() {
    this.ctx = null; this.vol = 0.8; this.voices = true; this.listener = null; this.uw = false;
  }
  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = this.ctx = new C();
    this.master = ctx.createGain(); this.master.gain.value = this.vol;
    this.lp = ctx.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 20000;
    this.comp = ctx.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 4;
    this.master.connect(this.lp); this.lp.connect(this.comp); this.comp.connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.connect(this.master);
    this.amb = ctx.createGain(); this.amb.gain.value = 0.0; this.amb.connect(this.master);
    this.mus = ctx.createGain(); this.mus.gain.value = 0.0; this.mus.connect(this.master);
    // shared noise buffer
    const len = ctx.sampleRate * 2; const b = ctx.createBuffer(1, len, ctx.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = b;
    // simple reverb impulse
    const ir = ctx.createBuffer(2, ctx.sampleRate * 1.8, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const x = ir.getChannelData(c); for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / x.length, 3); }
    this.verb = ctx.createConvolver(); this.verb.buffer = ir; this.verbG = ctx.createGain(); this.verbG.gain.value = 0.35;
    this.verb.connect(this.verbG); this.verbG.connect(this.master);
    this.startAmbience();
  }
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; }
  setUnderwater(on) {
    if (!this.ctx || this.uw === on) return; this.uw = on;
    this.lp.frequency.setTargetAtTime(on ? 600 : 20000, this.ctx.currentTime, 0.08);
  }

  _src(dur = 1) { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; return s; }
  _out(pos, vol = 1, range = 60) {
    // returns a node to connect into: handles distance falloff + stereo pan relative to listener
    const ctx = this.ctx; const g = ctx.createGain(); let p = null;
    if (pos && this.listener) {
      V.copy(pos).sub(this.listener.position); const dist = V.length();
      const fall = Math.max(0, 1 / (1 + Math.pow(dist / (range * 0.25), 1.6)));
      g.gain.value = vol * fall;
      V.applyQuaternion(this.listener.quaternion.clone().invert()).normalize();
      if (ctx.createStereoPanner) { p = ctx.createStereoPanner(); p.pan.value = THREE.MathUtils.clamp(V.x, -1, 1) * 0.8; g.connect(p); p.connect(this.sfx); }
      else g.connect(this.sfx);
      if (dist > 25) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = Math.max(700, 9000 - dist * 45); f.connect(g); const s = ctx.createGain(); s.gain.value = 0.2; g.connect(s); s.connect(this.verb); return f; }
    } else { g.gain.value = vol; g.connect(this.sfx); }
    const s = ctx.createGain(); s.gain.value = 0.12; g.connect(s); s.connect(this.verb);
    return g;
  }
  _env(node, t, a, peak, dec) { const g = node.gain; g.setValueAtTime(0.0001, t); g.linearRampToValueAtTime(peak, t + a); g.exponentialRampToValueAtTime(0.0001, t + a + dec); }

  burst(out, { f0 = 2000, f1 = 400, q = 0.8, type = 'lowpass', dur = 0.25, vol = 1, attack = 0.002 }) {
    const ctx = this.ctx, t = ctx.currentTime;
    const s = this._src(); const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ctx.createGain(); this._env(g, t, attack, vol, dur);
    s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  tone(out, { f0 = 120, f1 = 40, dur = 0.3, vol = 0.8, type = 'sine', attack = 0.002 }) {
    const ctx = this.ctx, t = ctx.currentTime; const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain(); this._env(g, t, attack, vol, dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
  }

  play(name, pos = null, vol = 1) {
    if (!this.ctx) return;
    const r = { shotRifle: 140, shotEnemy: 160, shotSup: 18, shotPistol: 14, shotSniper: 300, boom: 400, impact: 25, step: 12, body: 20 }[name] || 50;
    const o = this._out(pos, vol, r);
    switch (name) {
      case 'shotRifle': case 'shotEnemy':
        this.burst(o, { f0: 7000, f1: 300, dur: 0.22, vol: 1.1 }); this.tone(o, { f0: 160, f1: 45, dur: 0.18, vol: 1.0 });
        this.burst(o, { f0: 1200, f1: 200, dur: 0.6, vol: 0.25, type: 'bandpass', attack: 0.02 }); break;
      case 'shotSup':
        this.burst(o, { f0: 3500, f1: 600, dur: 0.09, vol: 0.55, type: 'bandpass', q: 1.2 }); this.tone(o, { f0: 220, f1: 90, dur: 0.06, vol: 0.25 });
        this.burst(o, { f0: 9000, f1: 4000, dur: 0.03, vol: 0.25, type: 'highpass' }); break;
      case 'shotPistol':
        this.burst(o, { f0: 2600, f1: 500, dur: 0.08, vol: 0.5, type: 'bandpass', q: 1.4 }); this.tone(o, { f0: 300, f1: 120, dur: 0.05, vol: 0.2 }); break;
      case 'shotSniper':
        this.burst(o, { f0: 9000, f1: 200, dur: 0.35, vol: 1.3 }); this.tone(o, { f0: 120, f1: 30, dur: 0.45, vol: 1.2 });
        this.burst(o, { f0: 900, f1: 120, dur: 1.6, vol: 0.35, attack: 0.05 }); break;
      case 'whisperShot':
        this.burst(o, { f0: 5000, f1: 300, dur: 0.12, vol: 0.5 }); this.burst(o, { f0: 600, f1: 100, dur: 1.0, vol: 0.15, attack: 0.08 }); break;
      case 'boom':
        this.tone(o, { f0: 90, f1: 22, dur: 1.4, vol: 1.6 }); this.burst(o, { f0: 4000, f1: 60, dur: 1.6, vol: 1.3 }); this.burst(o, { f0: 400, f1: 40, dur: 3.0, vol: 0.6, attack: 0.1 }); break;
      case 'impact': this.burst(o, { f0: 3000 + Math.random() * 3000, f1: 800, dur: 0.05, vol: 0.4, type: 'bandpass', q: 3 }); break;
      case 'impactMetal': this.tone(o, { f0: 1800 + Math.random() * 1200, f1: 1400, dur: 0.18, vol: 0.18, type: 'triangle' }); this.burst(o, { f0: 5000, f1: 2000, dur: 0.04, vol: 0.3, type: 'bandpass', q: 2 }); break;
      case 'flesh': this.burst(o, { f0: 900, f1: 200, dur: 0.07, vol: 0.6, q: 1 }); break;
      case 'whiz': this.burst(o, { f0: 5000, f1: 1500, dur: 0.12, vol: 0.35, type: 'bandpass', q: 6 }); break;
      case 'step': this.burst(o, { f0: 900 + Math.random() * 500, f1: 200, dur: 0.07, vol: 0.22 * vol, q: 0.7 }); this.burst(o, { f0: 5000, f1: 2500, dur: 0.05, vol: 0.05 * vol, type: 'highpass' }); break;
      case 'stepMetal': this.tone(o, { f0: 240 + Math.random() * 60, f1: 120, dur: 0.12, vol: 0.12, type: 'triangle' }); this.burst(o, { f0: 1500, f1: 300, dur: 0.06, vol: 0.18 }); break;
      case 'splash': this.burst(o, { f0: 2500, f1: 200, dur: 0.6, vol: 0.9 }); this.burst(o, { f0: 600, f1: 100, dur: 0.9, vol: 0.5, attack: 0.05 }); break;
      case 'swim': this.burst(o, { f0: 900, f1: 250, dur: 0.4, vol: 0.25, attack: 0.08 }); break;
      case 'reload': this.tone(o, { f0: 900, f1: 600, dur: 0.05, vol: 0.18, type: 'square' }); setTimeout(() => this.ctx && this.tone(this._out(null, vol), { f0: 1300, f1: 900, dur: 0.05, vol: 0.2, type: 'square' }), 380); break;
      case 'click': this.tone(o, { f0: 2400, f1: 1800, dur: 0.03, vol: 0.18, type: 'square' }); break;
      case 'knife': this.burst(o, { f0: 6000, f1: 1500, dur: 0.16, vol: 0.4, type: 'bandpass', q: 2 }); break;
      case 'stab': this.burst(o, { f0: 700, f1: 150, dur: 0.12, vol: 0.8 }); this.tone(o, { f0: 120, f1: 60, dur: 0.1, vol: 0.4 }); break;
      case 'body': this.tone(o, { f0: 90, f1: 40, dur: 0.25, vol: 0.6 }); this.burst(o, { f0: 600, f1: 100, dur: 0.2, vol: 0.4 }); break;
      case 'pin': this.tone(o, { f0: 3000, f1: 2600, dur: 0.06, vol: 0.2, type: 'triangle' }); break;
      case 'bounce': this.tone(o, { f0: 1600, f1: 900, dur: 0.08, vol: 0.2, type: 'triangle' }); break;
      case 'smoke': this.burst(o, { f0: 3000, f1: 1500, dur: 2.4, vol: 0.35, type: 'highpass', attack: 0.1 }); break;
      case 'hit': this.tone(o, { f0: 1700, f1: 1600, dur: 0.05, vol: 0.25, type: 'square' }); break;
      case 'kill': this.tone(o, { f0: 1200, f1: 1150, dur: 0.12, vol: 0.25, type: 'square' }); break;
      case 'hurt': this.burst(o, { f0: 400, f1: 80, dur: 0.25, vol: 0.7 }); this.tone(o, { f0: 70, f1: 40, dur: 0.3, vol: 0.6 }); break;
      case 'radio': this.burst(o, { f0: 3000, f1: 2000, dur: 0.12, vol: 0.15, type: 'bandpass', q: 2 }); this.tone(o, { f0: 1500, f1: 1500, dur: 0.04, vol: 0.06, type: 'square' }); break;
      case 'beep': this.tone(o, { f0: 1800, f1: 1800, dur: 0.08, vol: 0.12, type: 'sine' }); break;
      case 'type': this.burst(o, { f0: 4000, f1: 2500, dur: 0.02, vol: 0.12, type: 'bandpass', q: 4 }); break;
      case 'thunder': this.burst(o, { f0: 300, f1: 30, dur: 4.5, vol: 0.9, attack: 0.15 }); this.tone(o, { f0: 50, f1: 25, dur: 3, vol: 0.6, attack: 0.3 }); break;
      case 'horn': { const t = this.ctx.currentTime; [55, 110, 82.4].forEach((f) => { const os = this.ctx.createOscillator(); os.type = 'sawtooth'; os.frequency.value = f; const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.18, t + 0.4); g.gain.setValueAtTime(0.18, t + 2.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.6); const lf = this.ctx.createBiquadFilter(); lf.type = 'lowpass'; lf.frequency.value = 500; os.connect(lf); lf.connect(g); g.connect(o); os.start(t); os.stop(t + 3.7); }); break; }
      case 'alarm': { const t = this.ctx.currentTime; const os = this.ctx.createOscillator(); os.type = 'square'; const g = this.ctx.createGain(); g.gain.value = 0.07; for (let i = 0; i < 6; i++) { os.frequency.setValueAtTime(660, t + i * 0.7); os.frequency.linearRampToValueAtTime(880, t + i * 0.7 + 0.35); os.frequency.linearRampToValueAtTime(660, t + i * 0.7 + 0.7); } const lf = this.ctx.createBiquadFilter(); lf.type = 'lowpass'; lf.frequency.value = 1800; os.connect(lf); lf.connect(g); g.connect(o); os.start(t); os.stop(t + 4.2); break; }
      case 'heartbeat': this.tone(o, { f0: 60, f1: 40, dur: 0.15, vol: 0.5 }); setTimeout(() => this.ctx && this.tone(this._out(null, vol), { f0: 55, f1: 38, dur: 0.15, vol: 0.4 }), 180); break;
      case 'engine': this.tone(o, { f0: 70, f1: 60, dur: 1.2, vol: 0.4, type: 'sawtooth' }); break;
    }
  }

  startAmbience() {
    const ctx = this.ctx;
    // rain: two filtered noise layers
    const mk = (type, f, q, g) => { const s = this._src(); const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const gg = ctx.createGain(); gg.gain.value = g; s.connect(fl); fl.connect(gg); gg.connect(this.amb); s.start(0, Math.random()); return gg; };
    this.rainHi = mk('highpass', 5000, 0.5, 0.18);
    this.rainLo = mk('bandpass', 900, 0.4, 0.22);
    this.waves = mk('lowpass', 300, 0.6, 0.35);
    // swell on waves
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12; const lg = ctx.createGain(); lg.gain.value = 0.15; lfo.connect(lg); lg.connect(this.waves.gain); lfo.start();
    // music: low drone + pulse; intensity controlled by setMusic()
    const drone = ctx.createOscillator(); drone.type = 'sawtooth'; drone.frequency.value = 43.65;
    const drone2 = ctx.createOscillator(); drone2.type = 'sawtooth'; drone2.frequency.value = 65.4; drone2.detune.value = 8;
    const df = ctx.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 180; df.Q.value = 3;
    const dg = ctx.createGain(); dg.gain.value = 0.25; drone.connect(df); drone2.connect(df); df.connect(dg); dg.connect(this.mus); drone.start(); drone2.start();
    this.droneF = df;
    const pulse = ctx.createOscillator(); pulse.type = 'square'; pulse.frequency.value = 2.2;
    const pg = ctx.createGain(); pg.gain.value = 0; const pf = ctx.createBiquadFilter(); pf.type = 'lowpass'; pf.frequency.value = 110;
    const po = ctx.createOscillator(); po.type = 'triangle'; po.frequency.value = 55; const pm = ctx.createGain(); pm.gain.value = 0;
    pulse.connect(pm.gain); po.connect(pm); pm.connect(pf); pf.connect(pg); pg.connect(this.mus); pulse.start(); po.start();
    this.pulseG = pg;
  }
  setAmbience(rain, waves = 0.5) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    this.amb.gain.setTargetAtTime(1, t, 0.5);
    this.rainHi.gain.setTargetAtTime(0.18 * rain, t, 0.5); this.rainLo.gain.setTargetAtTime(0.22 * rain, t, 0.5); this.waves.gain.setTargetAtTime(0.35 * waves, t, 0.5);
  }
  setMusic(level) { // 0 silent, 1 tension, 2 combat
    if (!this.ctx) return; const t = this.ctx.currentTime;
    this.mus.gain.setTargetAtTime(level === 0 ? 0 : level === 1 ? 0.35 : 0.5, t, 1.2);
    this.pulseG.gain.setTargetAtTime(level === 2 ? 0.5 : 0, t, 0.6);
    this.droneF.frequency.setTargetAtTime(level === 2 ? 320 : 170, t, 1.5);
  }
  stopAll() { if (!this.ctx) return; const t = this.ctx.currentTime; this.amb.gain.setTargetAtTime(0, t, 0.3); this.mus.gain.setTargetAtTime(0, t, 0.3); }

  // ---- voice-over (browser speech) ----
  say(who, text) {
    if (!this.voices || !('speechSynthesis' in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      const all = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
      const female = all.filter((v) => /female|samantha|victoria|karen|moira|tessa|zira|susan|serena|fiona|google uk english female|en-gb-x-gba|en-us-x-sfg|en-us-x-tpf/i.test(v.name));
      const male = all.filter((v) => /male|daniel|alex|fred|george|david|mark|arthur|google uk english male|en-gb-x-rjs|en-us-x-iom|en-us-x-tpd/i.test(v.name) && !/female/i.test(v.name));
      const cfg = {
        rogers: { pool: male, idx: 0, pitch: 0.72, rate: 0.98 }, oracle: { pool: female, idx: 0, pitch: 1.0, rate: 1.0 },
        whisper: { pool: female, idx: 1, pitch: 1.15, rate: 1.04 }, anvil: { pool: male, idx: 1, pitch: 0.9, rate: 1.06 },
        falcon: { pool: male, idx: 2, pitch: 0.85, rate: 1.0 }, enemy: { pool: male, idx: 3, pitch: 0.6, rate: 1.1 }, varga: { pool: male, idx: 1, pitch: 0.55, rate: 0.9 },
      }[who] || { pool: all, idx: 0, pitch: 1, rate: 1 };
      const pool = cfg.pool.length ? cfg.pool : all;
      if (pool.length) u.voice = pool[cfg.idx % pool.length];
      u.pitch = cfg.pitch; u.rate = cfg.rate; u.volume = Math.min(1, this.vol + 0.1);
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) { /* speech unavailable */ }
  }
  hush() { try { 'speechSynthesis' in window && speechSynthesis.cancel(); } catch (e) {} }
}
export const audio = new Audio();
