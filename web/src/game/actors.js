import * as THREE from 'three';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { Assets } from '../core/assets.js';
import { twoBoneIK } from './ik.js';
import { audio } from '../core/audio.js';

const V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3(), Q1 = new THREE.Quaternion(), E1 = new THREE.Euler();
const lerpAng = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };

// Rifle hold: the gun is placed in actor space and both arms are solved onto it with two-bone IK.
const HOLD = { aim: [0.17, 1.33, -0.2], low: [0.13, 1.08, -0.16], rGrip: [0, -0.06, 0.1], lGrip: [0, -0.03, -0.26], poleR: [0.7, -0.2, 0.5], poleL: [-0.6, -0.5, -0.1] };
const tR = new THREE.Vector3(), tL = new THREE.Vector3(), pR = new THREE.Vector3(), pL = new THREE.Vector3();
let gunProto = null;
function enemyGun() {
  if (gunProto) return gunProto.clone();
  const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: 0x1c1d1f, metalness: 0.7, roughness: 0.45 }); const t = new THREE.MeshStandardMaterial({ color: 0x3a362c, roughness: 0.8 });
  const b = (w, h, d, x, y, z, mm = m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mm); o.position.set(x, y, z); g.add(o); };
  b(0.05, 0.07, 0.34, 0, 0, 0); b(0.05, 0.05, 0.26, 0, 0.005, -0.28); b(0.02, 0.02, 0.2, 0, 0.01, -0.5); b(0.03, 0.14, 0.06, 0, -0.09, -0.06, t); b(0.04, 0.06, 0.24, 0, -0.01, 0.27, t); b(0.03, 0.09, 0.04, 0, -0.07, 0.1);
  g.userData.muzzle = new THREE.Vector3(0, 0.01, -0.62);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  gunProto = g; return g.clone();
}

export class Actor {
  constructor(G, opts) {
    this.G = G; this.team = opts.team || 'enemy'; this.name = opts.name || '';
    const src = Assets.models.soldier;
    this.root = new THREE.Group(); G.scene.add(this.root);
    this.model = skClone(src.scene); this.root.add(this.model);
    const tint = new THREE.Color(opts.tint ?? (this.team === 'enemy' ? 0x4a4a4e : 0x9aa384));
    this.model.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false; o.material = o.material.clone(); if (o.material.color) o.material.color.multiply(tint); o.material.envMapIntensity = 0.7; }
      if (o.isBone) { if (o.name === 'mixamorigRightHand') this.handR = o; if (o.name === 'mixamorigHead') this.head = o; if (o.name === 'mixamorigSpine2') this.chest = o; }
    });
    this.B = {}; this.model.traverse((o) => { if (o.isBone) this.B[o.name.replace('mixamorig', '')] = o; });
    this.mixer = new THREE.AnimationMixer(this.model);
    this.acts = {};
    for (const c of src.animations) { if (c.name === 'TPose') continue; const a = this.mixer.clipAction(c); a.play(); a.setEffectiveWeight(0); this.acts[c.name] = a; }
    this.acts.Idle.setEffectiveWeight(1); this.anim = 'Idle'; this.mixer.setTime(Math.random() * 3);
    // gear
    this.gun = enemyGun(); this.root.add(this.gun); this.aimPitch = 0;
    if (this.head) {
      const hm = new THREE.MeshStandardMaterial({ color: this.team === 'enemy' ? 0x1d1f21 : 0x4b5038, roughness: 0.7, metalness: 0.1 });
      if (opts.hat === 'boonie') { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.09, 14), hm); h.position.set(0, 0.16, 0.0); const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.012, 18), hm); brim.position.y = -0.03; h.add(brim); h.scale.setScalar(100); h.position.multiplyScalar(100); this.head.add(h); }
      else if (opts.hat !== 'none') { const h = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hm); h.position.set(0, 0.12, 0.01); h.scale.set(100, 100, 108); h.position.multiplyScalar(100); this.head.add(h); }
    }
    if (opts.flashlight) {
      const sl = new THREE.SpotLight(0xfff0d0, 0, 26, 0.38, 0.5, 1.5); this.light = sl; this.lightOn = true;
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 2.6, 9, 16, 1, true), new THREE.MeshBasicMaterial({ map: Assets.tex('cone.png'), color: new THREE.Color(0.16, 0.15, 0.13), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      cone.geometry.translate(0, -4.5, 0); cone.rotation.x = -Math.PI / 2 - 0.12; this.cone = cone;
      this.lamp = new THREE.Group(); this.lamp.add(cone); this.root.add(this.lamp); this.lamp.position.set(0.15, 1.35, -0.3);
    }
    this.pos = new THREE.Vector3(); this.yaw = 0; this.vel = new THREE.Vector3();
    this.hp = opts.hp ?? 100; this.alive = true; this.state = opts.state || 'idle';
    this.alert = 0; this.detect = 0; this.aimW = 0; this.target = null; this.lastKnown = null; this.lastSeenT = -99; this.canSeeT = false;
    this.path = null; this.pathI = 0; this.goal = null; this.repathT = 0; this.thinkT = Math.random() * 0.3;
    this.burst = 0; this.burstT = 0; this.aimT = 0; this.flinch = 0; this.lastFireT = -99; this.moveT = 0; this.nadeT = 8 + Math.random() * 10; this.searchT = 0;
    this.patrol = opts.patrol || null; this.patrolI = 0; this.waitT = 0; this.speed = 0;
    this.accuracy = opts.accuracy ?? 1; this.zone = opts.zone || null; this.godMode = !!opts.god; this.crouch = false; this.dieT = 0;
    this.guardYaw = opts.yaw ?? 0; this.look = opts.look ?? 0.6; this.sleepy = !!opts.sleepy; this.noFlee = true;
    this.hold = null; // ally: scripted hold position
    this.tag = opts.tag; this.onDeath = opts.onDeath; this.dormant = !!opts.dormant;
    this.setPos(opts.pos, opts.yaw ?? 0);
    if (this.dormant) this.root.visible = false;
  }
  setPos(p, yaw = this.yaw) { this.pos.copy(p); this.yaw = yaw; this.root.position.copy(p); this.root.rotation.y = yaw; }
  activate() { this.dormant = false; this.root.visible = true; }
  get eye() { return V1.set(this.pos.x, this.pos.y + (this.crouch ? 1.1 : 1.6), this.pos.z); }
  fwd(out = V2) { return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }

  play(name, fade = 0.25) {
    if (this.anim === name) return; const a = this.acts[name], b = this.acts[this.anim]; if (!a) return;
    a.enabled = true; a.setEffectiveTimeScale(1); a.setEffectiveWeight(1); a.time = b ? b.time * (a.getClip().duration / b.getClip().duration) : 0; b && b.crossFadeTo(a, fade, true); this.anim = name;
  }
  applyAim(w) {
    // blend gun between low-ready and shouldered, then solve both arms onto it
    const g = this.gun; if (!g || g.parent !== this.root) return;
    const a = HOLD.aim, l = HOLD.low;
    g.position.set(l[0] + (a[0] - l[0]) * w, l[1] + (a[1] - l[1]) * w, l[2] + (a[2] - l[2]) * w);
    g.rotation.set(-0.55 * (1 - w) + this.aimPitch * w, 0.12 * (1 - w), 0.25 * (1 - w));
    this.root.updateMatrixWorld(true);
    g.localToWorld(tR.set(...HOLD.rGrip)); g.localToWorld(tL.set(...HOLD.lGrip));
    this.root.localToWorld(pR.set(...HOLD.poleR)); this.root.localToWorld(pL.set(...HOLD.poleL));
    const B = this.B; twoBoneIK(B.RightArm, B.RightForeArm, B.RightHand, tR, pR, 1); twoBoneIK(B.LeftArm, B.LeftForeArm, B.LeftHand, tL, pL, 1);
  }
  hurt(dmg, dir, from, head) {
    if (!this.alive || this.godMode) return false;
    this.hp -= dmg; if (this.team === 'enemy' && from === 'player') { this.state = 'combat'; this.alert = 1; this.lastKnown = this.G.player.pos.clone(); this.lastSeenT = this.G.t; this.target = this.G.player; }
    if (this.hp <= 0) { this.die(dir, head); return true; }
    this.flinch = 0.25; return false;
  }
  die(dir, head) {
    this.alive = false; this.state = 'dead'; this.dieT = 0; this.dieDir = dir ? Math.atan2(dir.x, dir.z) : Math.random() * 6; this.fallSide = Math.random() < 0.5 ? -1 : 1;
    if (this.light) { this.light.intensity = 0; this.lamp.visible = false; }
    audio.play('body', this.pos, 0.8); this.G.combat.onDeath(this);
    if (this.onDeath) this.onDeath(this);
  }
  remove() { this.G.scene.remove(this.root); if (this.light) this.G.scene.remove(this.light); }

  moveTo(target, run, dt) {
    const W = this.G.world; const p = this.pos;
    if (!this.goal || this.goal.distanceToSquared(target) > 1 || this.repathT <= 0) {
      this.goal = target.clone(); this.repathT = 2.5;
      const onNav = p.y < 0.6 && target.y < 0.6;
      this.path = onNav ? W.findPath(p.x, p.z, target.x, target.z) : null; this.pathI = 0;
      if (!this.path) this.path = [target.clone()];
    }
    this.repathT -= dt;
    let wp = this.path[this.pathI];
    while (wp && Math.hypot(wp.x - p.x, wp.z - p.z) < 0.6) { this.pathI++; wp = this.path[this.pathI]; }
    if (!wp) { this.speed = 0; return true; }
    const dx = wp.x - p.x, dz = wp.z - p.z; const l = Math.hypot(dx, dz);
    const sp = run ? 4.6 : 1.6; this.speed = sp;
    const before = p.clone();
    W.slide(p, (dx / l) * sp * dt, (dz / l) * sp * dt, 0.32, 1.7);
    // separation from other actors
    for (const o of this.G.actors.list) { if (o === this || !o.alive) continue; const ox = p.x - o.pos.x, oz = p.z - o.pos.z; const d2 = ox * ox + oz * oz; if (d2 < 0.5 && d2 > 1e-4) { const d = Math.sqrt(d2); W.slide(p, (ox / d) * (0.71 - d) * 0.5, (oz / d) * (0.71 - d) * 0.5, 0.32, 1.7); } }
    const moved = p.distanceTo(before);
    if (moved < sp * dt * 0.2) { this.stuck = (this.stuck || 0) + dt; if (this.stuck > 1.2) { this.repathT = 0; this.stuck = 0; this.pathI++; } } else this.stuck = 0;
    const g = W.ground(p.x, p.z, p.y + 0.3, 0.3); p.y += (g - p.y) * Math.min(1, dt * 12);
    this.faceYaw = Math.atan2(-dx, -dz);
    return false;
  }

  update(dt) {
    const G = this.G;
    if (this.dormant) return;
    if (!this.alive) { this.updateDeath(dt); return; }
    this.thinkT -= dt;
    if (this.team === 'enemy') this.thinkEnemy(dt); else this.thinkAlly(dt);
    // animation selection
    const moving = this.speed > 0.1;
    this.play(moving ? (this.speed > 3 ? 'Run' : 'Walk') : 'Idle');
    if (this.faceYaw !== undefined) this.yaw = lerpAng(this.yaw, this.faceYaw, Math.min(1, dt * (this.state === 'combat' ? 9 : 4)));
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
    const dist = this.pos.distanceTo(G.camera.position);
    if (dist < 90 || this.state === 'combat') {
      this.mixer.update(dt); const wantAim = (this.state === 'combat' || this.state === 'aim') ? (this.speed > 3 ? 0.5 : 1) : this.state === 'suspicious' ? 0.6 : 0;
      this.aimW += (wantAim - this.aimW) * Math.min(1, dt * 5);
      if (this.aimTarget) { const dy = this.aimTarget.y - (this.pos.y + 1.35), dh = Math.hypot(this.aimTarget.x - this.pos.x, this.aimTarget.z - this.pos.z); this.aimPitch += (THREE.MathUtils.clamp(Math.atan2(dy, dh), -0.9, 0.9) - this.aimPitch) * Math.min(1, dt * 6); }
      if (dist < 70) this.applyAim(this.aimW);
    }
    this.root.visible = dist < 260;
    if (this.light && this.lightOn) {
      // flashlight follows facing
      if (!this.light.parent) { G.scene.add(this.light); G.scene.add(this.light.target); }
      const f = this.fwd(); this.light.position.set(this.pos.x + f.x * 0.4, this.pos.y + 1.35, this.pos.z + f.z * 0.4); this.light.target.position.set(this.pos.x + f.x * 10, this.pos.y + 0.2, this.pos.z + f.z * 10);
      this.light.intensity = dist < 60 ? 45 : 0; this.lamp.visible = true; this.lamp.rotation.y = 0;
    }
    this.speed = 0;
  }
  updateDeath(dt) {
    if (this.dieT > 1.2) return;
    this.dieT += dt; const k = Math.min(1, this.dieT / 0.55); const e = k * k * (3 - 2 * k);
    // collapse: fall backward relative to shot direction, crumple
    this.root.rotation.set(0, this.yaw, 0);
    const fall = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(Math.cos(this.dieDir), 0, -Math.sin(this.dieDir)), -e * 1.45 * this.fallSide * 0 + e * 1.45);
    this.root.quaternion.premultiply(fall);
    const g = this.G.world.ground(this.pos.x, this.pos.z, this.pos.y + 0.3); this.root.position.set(this.pos.x, g + Math.sin(k * Math.PI) * 0.12 + 0.08 * e, this.pos.z);
    if (k < 1) this.mixer.update(dt * 0.5);
    if (this.dieT > 0.25 && this.gun && this.gun.parent === this.root) { const wp = new THREE.Vector3(); this.gun.getWorldPosition(wp); this.root.remove(this.gun); this.G.scene.add(this.gun); this.gun.position.copy(wp).setY(g + 0.05); this.gun.rotation.set(0, Math.random() * 6, Math.PI / 2); }
  }

  // ---------- enemy brain ----------
  perceive(dt) {
    const G = this.G, P = G.player; if (P.dead) return false;
    const toP = V1.copy(P.pos).sub(this.pos); const dist = toP.length(); toP.y = 0; toP.normalize();
    const f = this.fwd(V2); const dot = f.dot(toP);
    const range = (this.state === 'combat' ? 75 : 42) * (G.lightAt ? 0.6 + G.lightAt(P.pos) * 0.8 : 1) * (P.lightOn ? 1.6 : 1) * (P.crouch ? 0.7 : 1);
    let sees = false;
    if (dist < range && (dot > (this.state === 'combat' ? -0.2 : 0.42) || dist < 2.5)) {
      const eye = new THREE.Vector3(this.pos.x, this.pos.y + 1.6, this.pos.z), pe = new THREE.Vector3(P.pos.x, P.pos.y + (P.crouch ? 0.9 : 1.4), P.pos.z);
      sees = G.world.lineClear(eye, pe) && !G.fx.isSmoked(eye, pe) && !(P.under && dist > 4);
    }
    this.canSeeT = sees;
    if (sees) {
      this.lastKnown = P.pos.clone(); this.lastSeenT = G.t; this.target = P;
      if (this.state !== 'combat') {
        const rate = (1.8 - dist / range) * (P.speed01 > 0.5 ? 1.4 : 0.8) * [0.6, 0.85, 1.15][G.difficulty] * (this.sleepy ? 0.5 : 1) * (dist < 6 ? 3 : 1);
        this.detect += dt * Math.max(0.15, rate) * 2.0;
      }
    } else this.detect = Math.max(0, this.detect - dt * 0.2);
    return sees;
  }
  becomeAlert(pos, spread = true) {
    if (!this.alive || this.dormant) return;
    if (this.state !== 'combat') { this.state = 'combat'; this.aimT = 0.6 + Math.random() * 0.6; this.say(); }
    this.alert = 1; if (pos) this.lastKnown = pos.clone(); this.target = this.G.player; this.lastSeenT = Math.max(this.lastSeenT, this.G.t - 2);
    if (spread) this.G.combat.alertNearby(this, 26);
    this.G.onEnemyAlert && this.G.onEnemyAlert(this);
  }
  say() { const lines = ['Contact!', 'Intruder!', 'Over there!', 'Enemy spotted!', 'Open fire!']; if (Math.random() < 0.35) this.G.hud.bark(lines[Math.floor(Math.random() * lines.length)], this.pos); }
  hear(pos, kind) {
    if (!this.alive || this.dormant) return;
    if (kind === 'gunshot' || kind === 'explosion') { this.becomeAlert(this.G.player.pos, true); return; }
    if (this.state === 'combat') return;
    this.state = 'suspicious'; this.investigate = pos.clone(); this.searchT = 8; this.detect = Math.max(this.detect, 0.4);
  }
  thinkEnemy(dt) {
    const G = this.G, P = G.player;
    if (this.thinkT <= 0) { this.thinkT = 0.12; this._sees = this.perceive(0.12); if (this.state !== 'combat' && this.detect >= 1) this.becomeAlert(P.pos); else if (this.state === 'idle' || this.state === 'patrol') { if (this.detect > 0.45) { this.state = 'suspicious'; this.investigate = P.pos.clone(); this.searchT = 7; } else this.checkBodies(); } }
    const sees = this._sees;
    if (this.flinch > 0) this.flinch -= dt;
    switch (this.state) {
      case 'idle': {
        this.faceYaw = this.guardYaw + Math.sin(G.t * 0.35 + this.pos.x) * this.look; break;
      }
      case 'patrol': {
        if (!this.patrol) { this.state = 'idle'; break; }
        if (this.waitT > 0) { this.waitT -= dt; this.faceYaw = this.patrol[this.patrolI].w ?? this.faceYaw; break; }
        const wp = this.patrol[this.patrolI];
        if (this.moveTo(V3.set(wp.x, wp.y || 0, wp.z), false, dt) || this.pos.distanceTo(V3.set(wp.x, this.pos.y, wp.z)) < 0.7) { this.waitT = wp.wait ?? 2 + Math.random() * 2; this.patrolI = (this.patrolI + 1) % this.patrol.length; this.goal = null; }
        break;
      }
      case 'suspicious': {
        if (this.investigate) {
          G.hud.suspicion(this);
          const reached = this.moveTo(this.investigate, false, dt) || this.pos.distanceTo(this.investigate) < 1.5;
          if (reached) { this.searchT -= dt; this.faceYaw = this.yaw + Math.sin(G.t * 1.3) * 0.08; if (this.searchT <= 0) { this.state = this.patrol ? 'patrol' : 'idle'; this.investigate = null; this.detect = 0; this.goal = null; } }
        }
        break;
      }
      case 'combat': {
        const tgt = this.lastKnown || P.pos; const d = this.pos.distanceTo(P.pos);
        const toT = V1.copy(tgt).sub(this.pos);
        this.aimTarget = V3.set(P.pos.x, P.pos.y + 1.2, P.pos.z).clone();
        if (sees) {
          this.faceYaw = Math.atan2(-toT.x, -toT.z);
          this.aimT -= dt;
          // shooting rhythm
          if (this.aimT <= 0 && this.flinch <= 0) {
            this.burstT -= dt;
            if (this.burst > 0 && this.burstT <= 0) { this.shoot(); this.burst--; this.burstT = 0.11 + Math.random() * 0.05; }
            else if (this.burst <= 0 && this.burstT <= 0) { this.burst = 2 + Math.floor(Math.random() * 4); this.burstT = 0.6 + Math.random() * 1.0; }
          }
          // reposition occasionally
          this.moveT -= dt;
          if (this.moveT <= 0) {
            this.moveT = 3 + Math.random() * 4;
            const side = new THREE.Vector3(-toT.z, 0, toT.x).normalize().multiplyScalar((Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 5));
            const adv = d > 30 ? toT.clone().setY(0).normalize().multiplyScalar(6) : d < 7 ? toT.clone().setY(0).normalize().multiplyScalar(-4) : new THREE.Vector3();
            const c = this.pos.clone().add(side).add(adv);
            this.dest = G.world.navOk(c.x, c.z) || this.pos.y > 0.6 ? c : null;
            this.crouch = false; this.holdStill = Math.random() < 0.3;
          }
          if (this.dest && !this.holdStill) { if (this.moveTo(this.dest, d > 20, dt)) this.dest = null; this.faceYaw = Math.atan2(-toT.x, -toT.z); }
        } else {
          this.aimT = Math.max(this.aimT, 0.4);
          const lost = G.t - this.lastSeenT;
          // throw a grenade at a hiding player
          this.nadeT -= dt;
          if (this.nadeT <= 0 && lost > 1.5 && lost < 6 && d > 9 && d < 32 && G.difficulty > 0 && this.lastKnown) { this.nadeT = 14 + Math.random() * 14; G.combat.throwGrenade(this.eye.clone(), G.combat.lobVelocity(this.eye, this.lastKnown), 'frag', 'enemy'); }
          if (lost > 1.0 && this.lastKnown) {
            const reached = this.moveTo(this.lastKnown, lost < 12, dt) || this.pos.distanceTo(this.lastKnown) < 2;
            if (reached) { // search around
              this.searchT -= dt; if (this.searchT <= 0) { this.searchT = 4; const r = new THREE.Vector3((Math.random() - 0.5) * 16, 0, (Math.random() - 0.5) * 16).add(this.pos); this.lastKnown = G.world.navOk(r.x, r.z) ? r : this.lastKnown; }
            }
          }
          if (lost > 45) { this.state = 'suspicious'; this.investigate = this.pos.clone(); this.searchT = 6; }
        }
        break;
      }
    }
  }
  checkBodies() {
    if (Math.random() > 0.2) return;
    for (const b of this.G.combat.bodies) {
      if (b.found) continue; const d = b.pos.distanceTo(this.pos); if (d > 16) continue;
      const to = V1.copy(b.pos).sub(this.pos).setY(0).normalize(); if (this.fwd(V2).dot(to) < 0.3) continue;
      if (this.G.world.lineClear(new THREE.Vector3(this.pos.x, this.pos.y + 1.6, this.pos.z), new THREE.Vector3(b.pos.x, b.pos.y + 0.3, b.pos.z))) { b.found = true; this.G.hud.bark('Man down! We have intruders!', this.pos); this.becomeAlert(b.pos); return; }
    }
  }
  muzzlePos(out) { if (this.gun && this.gun.parent) { out.copy(this.gun.userData.muzzle); this.gun.localToWorld(out); } else out.copy(this.pos).setY(this.pos.y + 1.4); return out; }
  shoot() {
    const G = this.G, P = G.player; const mz = this.muzzlePos(new THREE.Vector3());
    const pe = new THREE.Vector3(P.pos.x, P.pos.y + (P.crouch ? 0.85 : 1.35), P.pos.z); const d = mz.distanceTo(pe);
    let hitP = [0.14, 0.24, 0.36][G.difficulty] * this.accuracy;
    hitP *= THREE.MathUtils.clamp(1.25 - d / 70, 0.25, 1.2); if (P.crouch) hitP *= 0.75; if (P.speed01 > 0.5) hitP *= 0.75; if (P.sprinting) hitP *= 0.7; if (P.swimming) hitP *= 0.5;
    if (G.t - this.lastSeenT > 0.3) hitP *= 0.3;
    const willHit = Math.random() < hitP;
    const aim = pe.clone(); if (!willHit) aim.add(new THREE.Vector3((Math.random() - 0.5) * 2.2, (Math.random() - 0.3) * 1.6, (Math.random() - 0.5) * 2.2));
    const dir = aim.sub(mz).normalize();
    const res = G.combat.fireRay(mz, dir, 150, { dmg: 0, from: 'enemy', shooter: this });
    G.fx.tracer(mz.clone(), willHit ? pe : res.end); G.fx.muzzle(mz, dir, 0.8, true); this.lastFireT = G.t;
    audio.play('shotEnemy', this.pos, 0.8);
    if (willHit && !P.dead) { P.hurt(10 + Math.random() * 8, this.pos); }
    else if (pe.distanceTo(res.end) < 4 || Math.random() < 0.25) audio.play('whiz', pe, 0.5);
    G.combat.noise(this.pos, 60, 'enemyfire', this);
  }

  // ---------- ally brain ----------
  thinkAlly(dt) {
    const G = this.G, P = G.player;
    let target = null, best = 1e9;
    if (this.thinkT <= 0) {
      this.thinkT = 0.25;
      if (!this.passive) for (const e of G.actors.list) {
        if (e.team !== 'enemy' || !e.alive || e.dormant || e.state !== 'combat') continue; const d = e.pos.distanceTo(this.pos); if (d > 55 || d > best) continue;
        if (G.world.lineClear(new THREE.Vector3(this.pos.x, this.pos.y + 1.6, this.pos.z), new THREE.Vector3(e.pos.x, e.pos.y + 1.3, e.pos.z))) { best = d; target = e; }
      }
      this.enemyT = target;
    }
    const e = this.enemyT;
    // movement: hold point or follow player
    let dest = this.hold;
    if (!dest && this.follow !== false) { const d = this.pos.distanceTo(P.pos); if (d > 5.5) dest = P.pos.clone().add(new THREE.Vector3(Math.sin(P.yaw + 2.4) * 2.5, 0, Math.cos(P.yaw + 2.4) * 2.5)); }
    if (dest && this.pos.distanceTo(dest) > 1.2) { this.moveTo(dest, this.pos.distanceTo(dest) > 7 || this.runAlways, dt); }
    if (e && e.alive) {
      const to = V1.copy(e.pos).sub(this.pos); this.faceYaw = Math.atan2(-to.x, -to.z); this.state = 'aim'; this.aimTarget = new THREE.Vector3(e.pos.x, e.pos.y + 1.2, e.pos.z);
      this.burstT -= dt;
      if (this.burstT <= 0) { this.burstT = 0.9 + Math.random() * 1.2; this.allyShoot(e); }
    } else { this.state = this.hold || this.speed > 0.1 ? 'idle' : 'idle'; if (this.hold && this.holdYaw !== undefined && this.speed < 0.1) this.faceYaw = this.holdYaw; }
    // keep up: teleport if hopelessly far and unseen
    if (!this.hold && this.follow !== false && this.pos.distanceTo(P.pos) > 45) {
      const behind = P.pos.clone().add(new THREE.Vector3(Math.sin(P.yaw) * 4, 0, Math.cos(P.yaw) * 4));
      if (G.world.navOk(behind.x, behind.z)) { this.pos.copy(behind); this.goal = null; }
    }
  }
  allyShoot(e) {
    const G = this.G; const mz = this.muzzlePos(new THREE.Vector3()); const pe = new THREE.Vector3(e.pos.x, e.pos.y + 1.3, e.pos.z);
    const dir = pe.clone().sub(mz).normalize(); G.fx.tracer(mz.clone(), pe); G.fx.muzzle(mz, dir, 0.6, true); audio.play(this.suppressed ? 'shotSup' : 'shotRifle', this.pos, 0.6);
    if (Math.random() < (this.killChance ?? 0.28)) e.hurt(60, dir, 'ally');
  }
}

export class Actors {
  constructor(G) { this.G = G; this.list = []; }
  spawn(opts) { const a = new Actor(this.G, opts); this.list.push(a); return a; }
  update(dt) { for (const a of this.list) a.update(dt); }
  enemies() { return this.list.filter((a) => a.team === 'enemy' && a.alive && !a.dormant); }
  clear() { for (const a of this.list) a.remove(); this.list.length = 0; }
  // ray vs hit spheres
  raycast(o, d, maxD, ignore) {
    let best = null;
    for (const a of this.list) {
      if (!a.alive || a === ignore || a.dormant) continue;
      const base = a.pos; const cr = a.crouch ? 0.65 : 1;
      if (Math.abs(base.x - o.x) > maxD + 2 && Math.abs(base.z - o.z) > maxD + 2) continue;
      const parts = [['head', 0, 1.66 * cr, 0.16], ['body', 0, 1.3 * cr, 0.3], ['body', 0, 0.95 * cr, 0.27], ['body', 0, 0.5 * cr, 0.22]];
      const f = a.fwd(V2);
      for (const [part, , y, r] of parts) {
        const c = V3.set(base.x + f.x * (part === 'head' ? 0.03 : 0), base.y + y, base.z + f.z * (part === 'head' ? 0.03 : 0));
        const oc = V1.copy(o).sub(c); const b = oc.dot(d); const cc = oc.lengthSq() - r * r; const h = b * b - cc; if (h < 0) continue;
        const t = -b - Math.sqrt(h); if (t < 0 || t > maxD) continue;
        if (!best || t < best.t) best = { t, actor: a, part };
      }
    }
    return best;
  }
}
