import * as THREE from 'three';
import { audio } from '../core/audio.js';

const V = new THREE.Vector3();
export class Combat {
  constructor(G) { this.G = G; this.nades = []; this.bodies = []; this.stats = { kills: 0, heads: 0, knife: 0, takedowns: 0 }; this.nadeGeo = new THREE.SphereGeometry(0.05, 8, 6); this.nadeMat = new THREE.MeshStandardMaterial({ color: 0x3c4630, roughness: 0.6 }); }

  fireRay(o, d, range, opt) {
    const G = this.G;
    const wh = G.world.raycast(o, d, range);
    const maxT = wh ? wh.t : range;
    const ah = opt.from === 'enemy' ? null : G.actors.raycast(o, d, maxT, opt.shooter);
    const res = { end: o.clone().addScaledVector(d, ah ? ah.t : maxT), actorHit: false, killed: false, head: false };
    if (ah) {
      const a = ah.actor; if (opt.from === 'player' && a.team !== 'enemy') return res; // no friendly fire
      res.actorHit = true; res.head = ah.part === 'head';
      const dmg = opt.dmg * (res.head ? opt.headMul || 2 : 1) * (opt.from === 'player' ? [1.4, 1.1, 1][G.difficulty] : 1);
      G.fx.blood(res.end, d);
      audio.play('flesh', res.end, 0.6);
      res.killed = a.hurt(dmg, d, opt.from, res.head);
      if (res.killed && opt.from === 'player') { this.stats.kills++; if (res.head) this.stats.heads++; G.player.kills++; }
    } else if (wh) {
      G.fx.impact(wh, d);
      // explosive barrels / tagged objects
      if (wh.box && wh.box.tag && G.onShootTag) G.onShootTag(wh.box, wh.point);
    }
    return res;
  }

  melee() {
    const G = this.G, P = G.player; const f = new THREE.Vector3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw));
    let best = null, bd = 2.6;
    for (const a of G.actors.list) {
      if (a.team !== 'enemy' || !a.alive || a.dormant) continue;
      V.copy(a.pos).sub(P.pos); const dy = Math.abs(V.y); V.y = 0; const d = V.length(); if (d > bd || dy > 1.5) continue;
      if (V.normalize().dot(f) < 0.55) continue; best = a; bd = d;
    }
    if (!best) return;
    const behind = best.fwd(V).dot(f) > 0.2; const silent = best.state !== 'combat' || behind;
    audio.play('stab', best.pos, 1);
    G.fx.blood(new THREE.Vector3(best.pos.x, best.pos.y + 1.3, best.pos.z), f);
    best.hp = 1; best.hurt(999, f, silent ? 'knife' : 'player');
    this.stats.knife++; this.stats.kills++; P.kills++;
    G.hud.hitmark(true); G.hud.popup(silent ? 'SILENT TAKEDOWN' : 'KNIFE KILL', 'good', 1);
    if (silent) this.stats.takedowns++;
  }

  onDeath(a) {
    this.bodies.push({ pos: a.pos.clone(), found: false, actor: a });
    if (this.G.onActorDeath) this.G.onActorDeath(a);
  }
  // Sound propagation: wakes enemies within radius
  noise(pos, radius, kind, src) {
    if (kind === 'enemyfire') { for (const a of this.G.actors.list) if (a !== src && a.team === 'enemy' && a.alive && !a.dormant && a.state !== 'combat' && a.pos.distanceTo(pos) < 40 && (!a.zone || a.zone === src.zone)) a.becomeAlert(this.G.player.pos, false); return; }
    for (const a of this.G.actors.list) {
      if (a.team !== 'enemy' || !a.alive || a.dormant) continue;
      if (a.pos.distanceTo(pos) < radius) a.hear(pos, kind);
    }
  }
  alertNearby(src, r) { for (const a of this.G.actors.list) if (a !== src && a.team === 'enemy' && a.alive && !a.dormant && a.state !== 'combat' && a.pos.distanceTo(src.pos) < r) a.becomeAlert(src.lastKnown, false); }

  lobVelocity(from, to) {
    const d = to.clone().sub(from); const h = Math.hypot(d.x, d.z); const t = THREE.MathUtils.clamp(h / 14, 0.6, 1.6);
    return new THREE.Vector3(d.x / t, (d.y + 0.5 * 16 * t * t) / t, d.z / t);
  }
  throwGrenade(pos, vel, kind, owner) {
    const m = new THREE.Mesh(this.nadeGeo, this.nadeMat); m.position.copy(pos); m.castShadow = true; this.G.scene.add(m);
    this.nades.push({ m, pos: pos.clone(), vel: vel.clone(), kind, owner, fuse: kind === 'frag' ? (owner === 'enemy' ? 3.2 : 3.0) : 1.6, landed: false });
  }
  update(dt) {
    const G = this.G, W = G.world;
    let warn = false;
    for (let i = this.nades.length - 1; i >= 0; i--) {
      const n = this.nades[i]; n.fuse -= dt;
      const inWater = W.isSea(n.pos.x, n.pos.z) && n.pos.y < W.seaLevel;
      n.vel.y -= (inWater ? 3 : 16) * dt; if (inWater) n.vel.multiplyScalar(1 - dt * 3);
      const step = n.vel.clone().multiplyScalar(dt); const L = step.length();
      if (L > 0.0001) {
        const h = W.raycast(n.pos, step.clone().normalize(), L + 0.06, 'solid');
        if (h && !h.box.water) { n.pos.copy(h.point).addScaledVector(h.normal, 0.06); const vn = h.normal.clone().multiplyScalar(n.vel.dot(h.normal)); n.vel.sub(vn.multiplyScalar(1.45)).multiplyScalar(0.5); if (n.vel.length() > 1.5) audio.play('bounce', n.pos, 0.6); n.landed = true; }
        else n.pos.add(step);
      }
      const g = W.ground(n.pos.x, n.pos.z, n.pos.y + 0.1, 0.05); if (n.pos.y < g + 0.05) { n.pos.y = g + 0.05; n.vel.y *= -0.3; n.vel.x *= 0.6; n.vel.z *= 0.6; n.landed = true; }
      n.m.position.copy(n.pos);
      if (n.kind === 'frag' && n.owner === 'enemy' && n.pos.distanceTo(G.player.pos) < 7) warn = n;
      if (n.fuse <= 0) {
        G.scene.remove(n.m); this.nades.splice(i, 1);
        if (n.kind === 'smoke') { G.fx.smokeGrenade(n.pos); continue; }
        this.explode(n.pos, 7.5, 260, n.owner);
      }
    }
    G.hud.nadeWarn(warn);
  }
  explode(p, radius, dmg, owner) {
    const G = this.G; G.fx.explosion(p, radius > 9 ? 2 : 1);
    this.noise(p, 120, 'explosion');
    const pd = G.player.pos.distanceTo(p);
    if (pd < radius * 2.5) G.shakeT = Math.max(G.shakeT || 0, 0.8 * (1 - pd / (radius * 2.5)));
    if (pd < radius && G.world.lineClear(p.clone().setY(p.y + 0.3), G.player.eyePos)) G.player.hurt(dmg * Math.pow(1 - pd / radius, 1.3) * (owner === 'enemy' ? 0.85 : 0.55), p);
    for (const a of G.actors.list) {
      if (!a.alive || a.dormant) continue; const d = a.pos.distanceTo(p); if (d > radius) continue;
      if (!G.world.lineClear(p.clone().setY(p.y + 0.3), new THREE.Vector3(a.pos.x, a.pos.y + 1, a.pos.z))) continue;
      const killed = a.team === 'enemy' && a.hurt(dmg * (1 - d / radius) + 20, a.pos.clone().sub(p).normalize(), owner === 'player' ? 'player' : 'env');
      if (killed && owner === 'player') { this.stats.kills++; G.player.kills++; G.hud.hitmark(true); }
    }
  }
}
