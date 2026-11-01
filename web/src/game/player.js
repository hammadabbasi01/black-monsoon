import * as THREE from 'three';
import { audio } from '../core/audio.js';

const UP = new THREE.Vector3(0, 1, 0);
export class Player {
  constructor(G) {
    this.G = G; this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0; this.recoilP = 0; this.recoilY = 0;
    this.r = 0.32; this.eye = 1.62; this.eyeCur = 1.62; this.crouch = false; this.sprinting = false; this.onGround = true; this.airborne = false;
    this.hp = 100; this.maxHp = 100; this.lastHurt = -10; this.dead = false; this.god = false;
    this.swimming = false; this.under = false; this.o2 = 1; this.speed01 = 0; this.stepT = 0; this.shake = 0;
    this.disabled = false; this.hideGun = false; this.mantle = null; this.ladder = null; this.flashlight = null; this.lightOn = false;
    this.kills = 0; this.t = 0;
    const fl = new THREE.SpotLight(0xfff2dd, 0, 38, 0.42, 0.55, 1.4); fl.position.set(0.22, -0.08, -0.8); fl.target.position.set(0.05, -0.45, -6); G.camera.add(fl); G.camera.add(fl.target); this.flashlight = fl;
  }
  spawn(p, yaw = 0) { this.pos.copy(p); this.vel.set(0, 0, 0); this.yaw = yaw; this.pitch = 0; this.hp = this.maxHp; this.dead = false; this.crouch = false; this.mantle = null; this.ladder = null; this.o2 = 1; this.swimming = false; }
  addRecoil(p, y) { this.recoilP += p; this.recoilY += y; }
  hurt(dmg, from) {
    if (this.dead || this.god) return;
    const diff = this.G.difficulty; dmg *= [0.45, 0.8, 1.25][diff];
    this.hp -= dmg; this.lastHurt = this.t; this.shake = Math.min(1, this.shake + dmg / 40);
    audio.play('hurt', null, 0.5);
    if (from) this.G.hud.damageFrom(from, this);
    if (this.hp <= 0) { this.hp = 0; this.dead = true; this.G.onPlayerDeath(); }
  }
  get eyePos() { return new THREE.Vector3(this.pos.x, this.pos.y + this.eyeCur, this.pos.z); }

  update(dt, inp) {
    const G = this.G, W = G.world; this.t += dt;
    // regen (CoD style)
    if (!this.dead && this.t - this.lastHurt > 4 && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + dt * 28);
    // look
    if (!this.disabled) {
      const adsSlow = G.arsenal ? 1 - G.arsenal.ads * (G.arsenal.def.scope ? 0.82 : 0.4) : 1;
      this.yaw -= inp.look.x * adsSlow; this.pitch -= inp.look.y * adsSlow;
    }
    // recoil recovery
    const rp = this.recoilP * Math.min(1, dt * 14), ry = this.recoilY * Math.min(1, dt * 14);
    this.pitch += rp; this.yaw += ry; this.recoilP -= rp; this.recoilY -= ry;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.45, 1.45);

    if (inp.took('crouch')) this.crouch = !this.crouch;
    if (inp.took('light')) { this.lightOn = !this.lightOn; audio.play('click'); }
    this.flashlight.intensity = this.lightOn ? 40 : 0;

    const sea = W.isSea(this.pos.x, this.pos.z);
    const waterY = W.seaLevel;
    const wasSwim = this.swimming;
    this.swimming = sea && this.pos.y + 1.15 < waterY && !this.mantle;
    if (this.swimming && !wasSwim) { audio.play('splash', this.pos, 1); G.fx.splash(new THREE.Vector3(this.pos.x, waterY, this.pos.z), 1.2); this.crouch = false; }
    this.under = sea && this.pos.y + this.eyeCur < waterY - 0.05;
    audio.setUnderwater(this.under);
    if (this.under) { this.o2 -= dt / 32; if (this.o2 <= 0) { this.o2 = 0; if (Math.floor(this.t * 2) !== Math.floor((this.t - dt) * 2)) this.hurt(14); } }
    else this.o2 = Math.min(1, this.o2 + dt * 0.5);

    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)), right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    let mx = this.disabled ? 0 : inp.move.x, my = this.disabled ? 0 : inp.move.y; const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }

    // mantle in progress
    if (this.mantle) {
      const m = this.mantle; m.t += dt / m.dur; const k = Math.min(1, m.t);
      this.pos.lerpVectors(m.from, m.to, k); this.pos.y = m.from.y + (m.to.y - m.from.y) * Math.min(1, k * 1.6);
      if (k >= 1) { this.mantle = null; this.vel.set(0, 0, 0); }
      this.speed01 = 0.3; this.updateCamera(dt); return;
    }
    // ladder
    const lad = W.ladderAt(this.pos);
    if (lad && (my !== 0 || this.ladder)) {
      this.ladder = lad; this.vel.set(0, 0, 0);
      const toward = new THREE.Vector3(-Math.sin(lad.face), 0, -Math.cos(lad.face));
      const facing = fwd.dot(toward) > -0.2 ? 1 : -1; // looking at the ladder: forward = up
      this.pos.y += my * facing * 3.2 * dt;
      if (this.pos.y >= lad.top - 0.05 && my * facing > 0) { this.pos.y = lad.top; this.pos.addScaledVector(toward, 0.9); this.ladder = null; }
      const g = W.ground(this.pos.x, this.pos.z, this.pos.y, this.r, 0.1);
      if (this.pos.y <= g && my * facing < 0) { this.pos.y = g; this.ladder = null; }
      if (Math.abs(mx) > 0.6) { this.pos.addScaledVector(right, mx * 0.6); this.ladder = null; }
      if (inp.took('jump')) { this.ladder = null; this.vel.copy(toward).multiplyScalar(-3); }
      if (Math.floor(this.pos.y * 3) !== Math.floor((this.pos.y - my * dt * 3.2) * 3)) audio.play('stepMetal', this.pos, 0.6);
      this.sprinting = false; this.speed01 = 0.3; this.updateCamera(dt); return;
    }
    this.ladder = null;

    if (this.swimming) {
      // 3D swimming: look direction steers depth when submerged
      const look = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
      const speed = (inp.sprint ? 4.4 : 3.0);
      const wish = new THREE.Vector3();
      const surf = this.pos.y + this.eyeCur > waterY - 0.25;
      if (surf && look.y > -0.35) { wish.addScaledVector(fwd, my); } else wish.addScaledVector(look, my);
      wish.addScaledVector(right, mx);
      if (!this.disabled && inp.keys.has('Space') || inp.pressed.has('jump')) wish.y += 1;
      if (this.crouch) { wish.y -= 1; }
      this.vel.lerp(wish.multiplyScalar(speed), Math.min(1, dt * 3));
      // buoyancy: float to surface when idle
      const targetY = waterY - this.eyeCur + 0.12;
      if (this.pos.y < targetY && !this.crouch && !(my > 0 && look.y < -0.3)) this.vel.y += (wish.y === 0 && my === 0 ? 1.6 : 0.9) * dt;
      if (this.pos.y > targetY && this.vel.y > 0) { this.vel.y = 0; this.pos.y = targetY; }
      this.pos.y += this.vel.y * dt;
      const floor = W.ground(this.pos.x, this.pos.z, this.pos.y, this.r);
      if (this.pos.y < floor) this.pos.y = floor;
      const hit = W.slide(this.pos, this.vel.x * dt, this.vel.z * dt, this.r, 1.7, 0.4);
      if (hit && my > 0) this.tryMantle(fwd, 3.3);
      this.speed01 = Math.min(1, this.vel.length() / 3);
      this.stepT += dt * this.speed01; if (this.stepT > 0.9) { this.stepT = 0; audio.play('swim', this.pos, 0.5); }
      this.sprinting = false; this.onGround = false; this.airborne = false;
      this.updateCamera(dt); return;
    }

    // ground movement
    this.sprinting = !this.disabled && inp.sprint && my > 0.3 && !this.crouch && !(G.arsenal && G.arsenal.ads > 0.3);
    if (this.sprinting && this.crouch) this.crouch = false;
    const base = this.crouch ? 2.0 : 3.7; const speed = this.sprinting ? 6.6 : base * (G.arsenal ? 1 - G.arsenal.ads * 0.4 : 1);
    const wish = fwd.clone().multiplyScalar(my).addScaledVector(right, mx).multiplyScalar(speed);
    const accel = this.onGround ? 14 : 3;
    this.vel.x += (wish.x - this.vel.x) * Math.min(1, dt * accel); this.vel.z += (wish.z - this.vel.z) * Math.min(1, dt * accel);
    if (this.onGround && inp.took('jump') && !this.disabled) { if (this.crouch) this.crouch = false; else { this.vel.y = 5.2; this.onGround = false; } }
    this.vel.y -= 16 * dt;
    const h = this.crouch ? 1.15 : 1.75;
    const hit = W.slide(this.pos, this.vel.x * dt, this.vel.z * dt, this.r, h);
    if (hit && my > 0.5 && !this.disabled) this.tryMantle(fwd, 1.25);
    this.pos.y += this.vel.y * dt;
    const g = W.ground(this.pos.x, this.pos.z, Math.max(this.pos.y, this.pos.y - this.vel.y * dt), this.r);
    const ceil = W.ceiling(this.pos.x, this.pos.z, this.pos.y, this.r);
    if (this.pos.y + h > ceil && this.vel.y > 0) { this.vel.y = 0; this.pos.y = ceil - h; }
    if (this.pos.y <= g + 0.02 || (this.onGround && this.pos.y - g < 0.6 && this.vel.y <= 0)) {
      if (!this.onGround && this.vel.y < -9) { this.hurt((-this.vel.y - 9) * 9); audio.play('step', this.pos, 2); }
      this.pos.y = g; this.vel.y = 0; this.onGround = true;
    } else this.onGround = false;
    this.airborne = !this.onGround;
    // don't allow standing up into ceilings
    if (!this.crouch) { const c2 = W.ceiling(this.pos.x, this.pos.z, this.pos.y, this.r); if (c2 - this.pos.y < 1.7) this.crouch = true; }
    const hs = Math.hypot(this.vel.x, this.vel.z); this.speed01 = Math.min(1, hs / 3.7);
    if (this.onGround && hs > 0.5) {
      this.stepT += dt * hs / (this.sprinting ? 2.4 : 2.0);
      if (this.stepT > 1) { this.stepT = 0; const metal = this.G.surfaceAt ? this.G.surfaceAt(this.pos) === 'metal' : false; audio.play(metal ? 'stepMetal' : 'step', null, this.crouch ? 0.35 : this.sprinting ? 1.2 : 0.8); G.combat.noise(this.pos, this.crouch ? 1.5 : this.sprinting ? 12 : 5, 'step'); }
    }
    this.updateCamera(dt);
  }
  tryMantle(fwd, reach) {
    const W = this.G.world; const p = this.pos.clone().addScaledVector(fwd, this.r + 0.45);
    const top = W.ground(p.x, p.z, this.pos.y + reach, 0.2, 0);
    if (top > this.pos.y + 0.4 && top <= this.pos.y + reach) {
      const c = W.ceiling(p.x, p.z, top, 0.25); if (c - top < 1.2) return;
      this.mantle = { from: this.pos.clone(), to: new THREE.Vector3(p.x, top, p.z), t: 0, dur: 0.45 + (top - this.pos.y) * 0.12 };
      if (c - top < 1.75) this.crouch = true;
      audio.play('step', null, 1);
    }
  }
  updateCamera(dt) {
    const cam = this.G.camera; const target = this.swimming ? 1.5 : this.crouch ? 1.05 : 1.62;
    this.eyeCur += (target - this.eyeCur) * Math.min(1, dt * 10);
    const bob = this.onGround && !this.swimming ? Math.sin(this.t * (this.sprinting ? 13 : 9)) * 0.035 * this.speed01 * (this.G.arsenal ? 1 - this.G.arsenal.ads * 0.8 : 1) : 0;
    const swimBob = this.swimming && !this.under ? Math.sin(this.t * 1.7) * 0.08 : 0;
    this.shake = Math.max(0, this.shake - dt * 2.5);
    const sh = this.shake * 0.04 + (this.G.shake || 0) * 0.08;
    cam.position.set(this.pos.x + (Math.random() - 0.5) * sh, this.pos.y + this.eyeCur + bob + swimBob + (Math.random() - 0.5) * sh, this.pos.z + (Math.random() - 0.5) * sh);
    cam.rotation.set(this.pitch, this.yaw, (this.sprinting ? Math.sin(this.t * 6.5) * 0.012 : 0) + (this.swimming ? Math.sin(this.t * 1.2) * 0.02 : 0), 'YXZ');
    const ar = this.G.arsenal; const fov = ar ? THREE.MathUtils.lerp(this.G.engine.baseFov, ar.def.adsFov, ar.ads) : this.G.engine.baseFov;
    const f2 = fov + (this.sprinting ? 6 : 0);
    if (Math.abs(cam.fov - f2) > 0.05) { cam.fov += (f2 - cam.fov) * Math.min(1, dt * 14); cam.updateProjectionMatrix(); }
  }
}
