import * as THREE from 'three';
import { World } from '../world/physics.js';
import { Builder, makeMaterials } from '../world/builder.js';
import { Atmosphere } from '../world/atmosphere.js';
import { FX } from './fx.js';
import { Player } from './player.js';
import { Arsenal } from './weapons.js';
import { Actors } from './actors.js';
import { Combat } from './combat.js';
import { HUD } from './hud.js';
import { audio } from '../core/audio.js';

class Cancel extends Error {}

// Holds one running mission: world, actors, player, scripting runtime and checkpoints.
export class Game {
  constructor(engine, input, opts) {
    this.engine = engine; this.input = input; this.difficulty = opts.difficulty; this.onEnd = opts.onEnd;
    this.scene = engine.scene; this.camera = engine.camera; this.t = 0; this.alarm = false; this.paused = false; this.over = false;
    this.token = 0; this.waiters = []; this.checkpoint = 0; this.startTime = 0; this.shakeT = 0;
  }
  async load(mission, onProgress) {
    this.mission = mission;
    const e = this.engine; const q = e.quality;
    // clear scene (keep camera)
    for (const c of [...this.scene.children]) if (c !== this.camera) this.scene.remove(c);
    this.camera.children.slice().forEach((c) => this.camera.remove(c));
    this.world = new World(); this.M = makeMaterials(q);
    this.builder = new Builder(this.scene, this.world, this.M, q);
    this.hud = new HUD(this);
    this.fx = new FX(this.scene, this.world, q);
    this.atmo = new Atmosphere(e, mission.atmosphere); this.atmo.world = this.world;
    this.world.seaLevel = mission.atmosphere.seaLevel ?? -1.4;
    onProgress && onProgress(0.3, 'Building ' + mission.place);
    await new Promise((r) => setTimeout(r, 30));
    mission.build(this, this.builder);
    this.builder.finalize(); this.builder.finalizeContainers();
    this.atmo.buildLampFx(this.builder.fx, this.builder.lights);
    onProgress && onProgress(0.7, 'Mapping routes');
    await new Promise((r) => setTimeout(r, 30));
    const nb = mission.navBounds; this.world.buildNav(nb[0], nb[1], nb[2], nb[3], 1.5);
    this.hud.buildMinimap(this.world, mission.mapBounds || nb, mission.minimapExtra);
    this.player = new Player(this); this.arsenal = new Arsenal(this); this.actors = new Actors(this); this.combat = new Combat(this);
    this.lightAt = (p) => { let L = 0; for (const s of this.builder.lights) { const d = s.pos.distanceTo(p); if (d < s.dist * 0.6 && s.on !== false) L = Math.max(L, 1 - d / (s.dist * 0.6)); } return L + (this.atmo.flash || 0); };
    // warm up shaders
    e.renderer.compile(this.scene, this.camera);
    onProgress && onProgress(1, 'Ready');
  }
  start(fromCheckpoint = 0) {
    this.token++; this.over = false; this.alarm = false; this.paused = false; this.hud.clearTalk(); this.hud.timer(null); this.hud.prompt(null); this.hud.marker(null);
    this.actors.clear(); this.combat.nades.forEach((n) => this.scene.remove(n.m)); this.combat.nades.length = 0; this.combat.bodies.length = 0;
    this.checkpoint = fromCheckpoint; if (fromCheckpoint === 0) { this.startTime = this.t; this.combat.stats = { kills: 0, heads: 0, knife: 0, takedowns: 0 }; }
    this.player.disabled = false; this.player.hideGun = false; this.hud.bars(false); this.hud.fade(false, 0.6);
    this.input.reset();
    this.mission.reset && this.mission.reset(this);
    const segs = this.mission.segments; const tok = this.token;
    const S = this.script(tok);
    (async () => {
      try {
        for (let i = fromCheckpoint; i < segs.length; i++) {
          this.segIndex = i; if (segs[i].checkpoint && i !== fromCheckpoint) { this.checkpoint = i; this.hud.popup('CHECKPOINT', 'good'); }
          if (i === fromCheckpoint) { segs[i].start && segs[i].start(this, S); segs[i].setup && segs[i].setup(this, S); }
          await segs[i].run(this, S);
          if (segs[i + 1] && segs[i + 1].setup) segs[i + 1].setup(this, S);
        }
        if (tok === this.token) this.finish(true);
      } catch (err) { if (!(err instanceof Cancel)) { console.error(err); this.onError && this.onError(err); } }
    })();
  }
  // async scripting helpers bound to a run token
  script(tok) {
    const G = this;
    const chk = () => { if (tok !== G.token) throw new Cancel(); };
    const until = (fn) => new Promise((res, rej) => { G.waiters.push({ fn, res, rej, tok }); });
    const S = {
      until: async (fn) => { chk(); await until(fn); chk(); },
      wait: async (s) => { chk(); const end = G.t + s; await until(() => G.t >= end); chk(); },
      talk: async (lines) => { chk(); let done = false; G.hud.say(lines, () => (done = true)); await until(() => done); chk(); },
      talkBg: (lines) => G.hud.say(lines),
      obj: (text, sub) => G.hud.objective(text, sub),
      reach: async (pos, r = 3, label = '') => { chk(); G.hud.marker(pos, label); await until(() => G.player.pos.distanceTo(V(pos.x, G.player.pos.y, pos.z)) < r && Math.abs(G.player.pos.y - pos.y) < 3); G.hud.marker(null); chk(); },
      hold: async (pos, text, secs, r = 2.2, onTick) => {
        chk(); G.hud.marker(pos, ''); let p = 0;
        await until(() => {
          const near = G.player.pos.distanceTo(pos) < r && !G.player.swimming;
          if (near) { const busyReady = G.input.use; G.hud.prompt((G.input.touch ? 'Hold USE · ' : 'Hold E · ') + text, p); if (busyReady) { p += G.dt / secs; onTick && onTick(p); } }
          else if (G._promptOwner === pos) G.hud.prompt(null);
          if (near) G._promptOwner = pos;
          return p >= 1;
        });
        G.hud.prompt(null); G.hud.marker(null); chk();
      },
      killAll: async (list) => { chk(); await until(() => list.every((a) => !a.alive)); chk(); },
      spawn: (o) => G.actors.spawn(o),
      chk,
    };
    return S;
  }
  finish(win) {
    if (this.over) return; this.over = true; this.token++;
    const time = this.t - this.startTime; const st = this.combat.stats;
    const acc = this.arsenal.shots ? Math.round((this.arsenal.hits / this.arsenal.shots) * 100) : 0;
    setTimeout(() => this.onEnd && this.onEnd(win, { time, kills: st.kills, heads: st.heads, takedowns: st.takedowns, acc }), win ? 200 : 2200);
  }
  onPlayerDeath() {
    this.hud.fade(true, 1.8); this.player.disabled = true; audio.setMusic(0);
    this.finish(false);
  }
  update(dt) {
    if (this.paused) return;
    dt = Math.min(dt, 0.05); this.dt = dt; this.t += dt;
    this.input.updateKeys();
    this.player.update(dt, this.input);
    this.arsenal.update(dt, this.input, this.player);
    this.actors.update(dt);
    this.combat.update(dt);
    this.mission.update && this.mission.update(this, dt);
    this.fx.update(dt);
    this.atmo.update(dt, this.camera, this.t);
    this.shakeT = Math.max(0, (this.shakeT || 0) - dt); this.shake = this.shakeT;
    this.hud.update(dt);
    // resolve script waiters
    for (let i = this.waiters.length - 1; i >= 0; i--) {
      const w = this.waiters[i];
      if (w.tok !== this.token) { this.waiters.splice(i, 1); w.rej(new Cancel()); continue; }
      let ok = false; try { ok = w.fn(); } catch (e) { ok = false; }
      if (ok) { this.waiters.splice(i, 1); w.res(); }
    }
    audio.listener = this.camera;
    this.input.endFrame();
  }
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
