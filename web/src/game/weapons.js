import * as THREE from 'three';
import { Assets } from '../core/assets.js';
import { audio } from '../core/audio.js';

export const DEFS = {
  rifle: { name: 'MK-4 Carbine · SD', slot: 0, mag: 30, reserve: 180, rpm: 750, auto: true, dmg: 34, head: 2.6, spread: 0.022, adsSpread: 0.0018, recoil: 0.012, adsFov: 50, sound: 'shotSup', loudSound: 'shotRifle', suppressed: true, reload: 2.1, range: 220 },
  pistol: { name: 'P-9 · Suppressed', slot: 1, mag: 15, reserve: 75, rpm: 420, auto: false, dmg: 48, head: 3, spread: 0.018, adsSpread: 0.004, recoil: 0.02, adsFov: 58, sound: 'shotPistol', suppressed: true, reload: 1.5, range: 80 },
  sniper: { name: 'R-338 Longbow', slot: 2, mag: 5, reserve: 30, rpm: 48, auto: false, dmg: 320, head: 2, spread: 0.06, adsSpread: 0.0, recoil: 0.06, adsFov: 13, scope: true, sound: 'shotSniper', suppressed: false, reload: 2.8, range: 600, bolt: 1.0 },
  shotgun: { name: 'M-1014 Breacher', slot: 0, mag: 7, reserve: 35, rpm: 160, auto: false, dmg: 22, pellets: 9, head: 1.5, spread: 0.07, adsSpread: 0.05, recoil: 0.05, adsFov: 62, sound: 'shotRifle', suppressed: false, reload: 3.0, range: 40 },
};

// ---------- procedural viewmodel construction ----------
function mats() {
  const g = Assets.tex('grunge.jpg');
  return {
    metal: new THREE.MeshStandardMaterial({ color: 0x2a2e33, metalness: 0.55, roughness: 0.45, roughnessMap: g, envMapIntensity: 2.2 }),
    metal2: new THREE.MeshStandardMaterial({ color: 0x4a4f55, metalness: 0.6, roughness: 0.35, roughnessMap: g, envMapIntensity: 2.2 }),
    poly: new THREE.MeshStandardMaterial({ color: 0x302d29, metalness: 0.05, roughness: 0.7, roughnessMap: g, envMapIntensity: 1.6 }),
    tan: new THREE.MeshStandardMaterial({ color: 0x8a7656, metalness: 0.05, roughness: 0.75, roughnessMap: g, envMapIntensity: 1.6 }),
    glove: new THREE.MeshStandardMaterial({ color: 0x45483f, roughness: 0.85, map: Assets.tex('fabric.jpg'), normalMap: Assets.tex('fabric_n.jpg', { srgb: false }), envMapIntensity: 0.6 }),
    sleeve: new THREE.MeshStandardMaterial({ color: 0x6b7254, roughness: 0.9, map: Assets.tex('fabric.jpg'), normalMap: Assets.tex('fabric_n.jpg', { srgb: false }), envMapIntensity: 0.6 }),
    skin: new THREE.MeshStandardMaterial({ color: 0x8a6448, roughness: 0.6 }),
    blade: new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 1, roughness: 0.2, envMapIntensity: 1.5 }),
    lens: new THREE.MeshStandardMaterial({ color: 0x0a1418, metalness: 0.9, roughness: 0.05, envMapIntensity: 2 }),
    dot: new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.3, 0.2), fog: false }),
    glass: new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.5, roughness: 0.05, transparent: true, opacity: 0.25, envMapIntensity: 2 }),
  };
}
const B = (w, h, d, m, x, y, z, parent, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); parent.add(o); return o; };
const C = (r, l, m, x, y, z, parent, seg = 14, r2 = null) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r2 ?? r, r, l, seg), m); o.rotation.x = Math.PI / 2; o.position.set(x, y, z); parent.add(o); return o; };
const CAP = (r, l, m, parent) => { const o = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 10), m); parent.add(o); return o; };

function arm(M, parent, from, to, r = 0.045) {
  // sleeve capsule between two points + glove at "to"
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to); const d = b.clone().sub(a); const L = d.length();
  const s = CAP(r, L, M.sleeve, parent); s.position.copy(a).addScaledVector(d, 0.5); s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return s;
}
function hand(M, parent, x, y, z, rx = 0, ry = 0, rz = 0) {
  const h = new THREE.Group(); h.position.set(x, y, z); h.rotation.set(rx, ry, rz); parent.add(h);
  B(0.07, 0.035, 0.09, M.glove, 0, 0, 0, h);
  for (let i = 0; i < 4; i++) B(0.014, 0.018, 0.06, M.glove, -0.026 + i * 0.017, -0.012, -0.06, h, 0.6);
  B(0.02, 0.02, 0.05, M.glove, 0.04, 0, -0.025, h, 0, -0.5);
  return h;
}

function buildRifle(M) {
  const g = new THREE.Group();
  B(0.048, 0.065, 0.3, M.metal, 0, 0, 0, g); // receiver
  B(0.04, 0.02, 0.27, M.metal2, 0, 0.042, -0.02, g); // top rail
  for (let i = 0; i < 12; i++) B(0.044, 0.006, 0.01, M.metal, 0, 0.055, 0.1 - i * 0.022, g);
  B(0.054, 0.058, 0.24, M.poly, 0, 0.002, -0.27, g); // handguard
  for (let i = 0; i < 6; i++) B(0.056, 0.012, 0.025, M.metal, 0, -0.01, -0.18 - i * 0.035, g);
  C(0.011, 0.12, M.metal, 0, 0.004, -0.44, g);
  C(0.021, 0.17, M.metal, 0, 0.004, -0.56, g, 16); // suppressor
  C(0.022, 0.02, M.metal2, 0, 0.004, -0.48, g, 16);
  B(0.03, 0.15, 0.07, M.poly, 0, -0.1, -0.05, g, 0.22); // magazine
  B(0.032, 0.1, 0.04, M.poly, 0, -0.07, 0.11, g, -0.35); // grip
  B(0.045, 0.06, 0.2, M.tan, 0, -0.01, 0.25, g); // stock
  B(0.05, 0.08, 0.03, M.rubber || M.poly, 0, -0.015, 0.355, g);
  B(0.012, 0.03, 0.12, M.metal, 0, 0.008, 0.16, g); // buffer tube
  // holo sight
  const s = new THREE.Group(); s.position.set(0, 0.075, -0.02); g.add(s);
  B(0.044, 0.012, 0.07, M.metal, 0, -0.012, 0, s);
  B(0.006, 0.046, 0.06, M.metal, -0.021, 0.012, 0, s); B(0.006, 0.046, 0.06, M.metal, 0.021, 0.012, 0, s);
  B(0.048, 0.006, 0.06, M.metal, 0, 0.037, 0, s);
  B(0.036, 0.04, 0.002, M.glass, 0, 0.014, 0.0, s);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.0018, 12), M.dot); dot.position.set(0, 0.014, 0.001); s.add(dot);
  B(0.02, 0.02, 0.06, M.poly, 0, -0.045, -0.3, g); // fore grip stub
  g.userData.sightY = 0.075 + 0.014; g.userData.muzzle = new THREE.Vector3(0, 0.004, -0.66);
  g.userData.mag = g.children[g.children.findIndex((c) => c.geometry && c.geometry.parameters && c.geometry.parameters.height === 0.15)];
  return g;
}
function buildPistol(M) {
  const g = new THREE.Group();
  B(0.032, 0.034, 0.19, M.metal2, 0, 0.012, -0.03, g); // slide
  for (let i = 0; i < 6; i++) B(0.034, 0.024, 0.004, M.metal, 0, 0.012, 0.03 + i * 0.008, g);
  B(0.03, 0.025, 0.15, M.poly, 0, -0.016, -0.02, g); // frame
  B(0.03, 0.11, 0.045, M.poly, 0, -0.07, 0.04, g, -0.22); // grip
  C(0.016, 0.15, M.metal, 0, 0.012, -0.2, g, 14); // suppressor
  B(0.004, 0.008, 0.004, M.dot, 0, 0.032, -0.11, g); B(0.012, 0.008, 0.004, M.metal, 0, 0.032, 0.05, g);
  B(0.02, 0.015, 0.03, M.poly, 0, -0.035, -0.035, g); // trigger guard
  g.userData.sightY = 0.034; g.userData.muzzle = new THREE.Vector3(0, 0.012, -0.28);
  g.userData.slide = g.children[0];
  return g;
}
function buildSniper(M) {
  const g = new THREE.Group();
  B(0.05, 0.07, 0.34, M.metal, 0, 0, 0, g);
  B(0.06, 0.075, 0.5, M.tan, 0, -0.01, -0.3, g); // forend
  C(0.014, 0.42, M.metal, 0, 0.01, -0.72, g); C(0.022, 0.08, M.metal2, 0, 0.01, -0.95, g, 8); // brake
  B(0.05, 0.08, 0.32, M.tan, 0, -0.025, 0.3, g); B(0.05, 0.12, 0.035, M.poly, 0, -0.045, 0.46, g);
  B(0.032, 0.11, 0.045, M.tan, 0, -0.08, 0.12, g, -0.3);
  B(0.035, 0.09, 0.08, M.poly, 0, -0.07, -0.04, g);
  // scope
  C(0.022, 0.34, M.metal, 0, 0.085, -0.04, g, 18); C(0.03, 0.08, M.metal, 0, 0.085, -0.24, g, 18, 0.024); C(0.027, 0.06, M.metal, 0, 0.085, 0.14, g, 18, 0.022);
  B(0.026, 0.03, 0.035, M.metal, 0, 0.11, -0.04, g); B(0.035, 0.022, 0.026, M.metal, 0.028, 0.085, -0.04, g);
  B(0.02, 0.04, 0.02, M.metal, 0, 0.045, -0.12, g); B(0.02, 0.04, 0.02, M.metal, 0, 0.045, 0.04, g);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.027, 18), M.lens); lens.position.set(0, 0.085, -0.281); lens.rotation.y = Math.PI; g.add(lens);
  B(0.012, 0.012, 0.06, M.metal2, 0.035, 0.02, 0.06, g, 0, 0, 0.3); // bolt handle
  g.userData.sightY = 0.085; g.userData.muzzle = new THREE.Vector3(0, 0.01, -1.0); g.userData.bolt = g.children[g.children.length - 1];
  return g;
}
function buildKnife(M) {
  const g = new THREE.Group();
  const bl = new THREE.Shape(); bl.moveTo(0, 0); bl.lineTo(0.2, 0.006); bl.lineTo(0.235, 0.022); bl.lineTo(0.2, 0.032); bl.lineTo(0, 0.03); bl.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(bl, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.001, bevelSegments: 1 });
  const blade = new THREE.Mesh(geo, M.blade); blade.rotation.y = Math.PI / 2; blade.position.set(0, -0.015, 0); g.add(blade);
  B(0.022, 0.03, 0.12, M.poly, 0, 0, 0.065, g); B(0.05, 0.04, 0.012, M.metal, 0, 0, 0.002, g);
  return g;
}
function buildGrenade(M, smoke) {
  const g = new THREE.Group();
  if (smoke) { C(0.03, 0.1, new THREE.MeshStandardMaterial({ color: 0x5a6150, roughness: 0.6 }), 0, 0, 0, g).rotation.x = 0; B(0.02, 0.02, 0.015, M.metal, 0, 0.06, 0, g); }
  else { const s = new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 10), new THREE.MeshStandardMaterial({ color: 0x3c4630, roughness: 0.55, metalness: 0.2 })); s.scale.y = 1.2; g.add(s); B(0.02, 0.03, 0.015, M.metal, 0, 0.045, 0, g); }
  return g;
}

// ---------- player arsenal ----------
export class Arsenal {
  constructor(G) {
    this.G = G; const M = (this.M = mats());
    this.root = new THREE.Group(); G.camera.add(this.root);
    // dedicated fill + rim light so the weapon reads at night (short range: barely touches the world)
    const fill = new THREE.PointLight(0xc8d4e0, 1.6, 1.4, 1.5); fill.position.set(0.35, 0.35, 0.1); this.root.add(fill);
    const rim = new THREE.PointLight(0xffb27a, 0.9, 1.2, 1.5); rim.position.set(-0.3, 0.05, -0.5); this.root.add(rim);
    this.models = { rifle: buildRifle(M), pistol: buildPistol(M), sniper: buildSniper(M) };
    this.rigs = {};
    for (const k in this.models) {
      const rig = new THREE.Group(); rig.add(this.models[k]); this.root.add(rig); rig.visible = false; this.rigs[k] = rig;
      const m = this.models[k];
      m.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; } });
      // hands
      if (k === 'pistol') { hand(M, m, 0, -0.06, 0.05, 0.25, 0, 0); hand(M, m, -0.03, -0.075, 0.03, 0.25, 0.4, 0.5); arm(M, m, [0.06, -0.25, 0.4], [0, -0.07, 0.07]); arm(M, m, [-0.14, -0.26, 0.38], [-0.035, -0.08, 0.05]); }
      else { const fz = k === 'sniper' ? -0.32 : -0.28; hand(M, m, 0, -0.075, 0.1, 0.3, 0, 0); hand(M, m, -0.01, -0.05, fz, 0.1, 0.2, 0.9); arm(M, m, [0.09, -0.26, 0.48], [0, -0.08, 0.13]); arm(M, m, [-0.16, -0.3, 0.2], [-0.025, -0.055, fz + 0.03]); }
      m.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
    }
    // knife + grenade rigs
    this.knife = new THREE.Group(); const kn = buildKnife(M); kn.rotation.set(-0.2, 0, -1.4); kn.position.set(0.02, 0.02, -0.06); this.knife.add(kn); hand(M, this.knife, 0, 0, 0, 0.2, 0, -1.2); arm(M, this.knife, [0.1, -0.2, 0.35], [0, -0.01, 0.03]);
    this.knife.visible = false; this.root.add(this.knife);
    this.nadeRig = new THREE.Group(); this.nadeModel = buildGrenade(M, false); this.smokeModel = buildGrenade(M, true); this.nadeRig.add(this.nadeModel, this.smokeModel); hand(M, this.nadeRig, 0, -0.03, 0.02, 0.4, 0, 0); arm(M, this.nadeRig, [0.06, -0.24, 0.38], [0, -0.04, 0.05]);
    this.nadeRig.visible = false; this.root.add(this.nadeRig);
    this.root.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });

    this.owned = { rifle: true, pistol: true, sniper: false };
    this.ammo = {}; for (const k in DEFS) this.ammo[k] = { mag: DEFS[k].mag, res: DEFS[k].reserve };
    this.frags = 3; this.smokes = 2;
    this.cur = 'pistol'; this.next = null; this.swapT = 0; this.reloadT = 0; this.cool = 0; this.boltT = 0;
    this.ads = 0; this.recoil = 0; this.kick = new THREE.Vector2(); this.bobT = 0; this.sway = new THREE.Vector2(); this.knifeT = 0; this.throwT = 0; this.throwKind = null;
    this.shots = 0; this.hits = 0; this.breath = 1; this.lastTrigger = false;
    this.rigs[this.cur].visible = true;
    this.muzzleWorld = new THREE.Vector3();
  }
  get def() { return DEFS[this.cur]; }
  give(k) { this.owned[k] = true; this.ammo[k].mag = DEFS[k].mag; this.ammo[k].res = DEFS[k].reserve; }
  switchTo(k) { if (!this.owned[k] || k === this.cur || this.next) return; this.next = k; this.swapT = 0.5; this.reloadT = 0; audio.play('click'); }
  cycle() { const order = ['rifle', 'pistol', 'sniper'].filter((k) => this.owned[k]); const i = order.indexOf(this.cur); this.switchTo(order[(i + 1) % order.length]); }
  refill() { for (const k in this.ammo) this.ammo[k].res = DEFS[k].reserve; this.frags = Math.max(this.frags, 3); this.smokes = Math.max(this.smokes, 2); }
  busy() { return this.swapT > 0 || this.reloadT > 0 || this.knifeT > 0 || this.throwT > 0; }

  update(dt, inp, P) {
    const G = this.G; const d = this.def;
    this.cool = Math.max(0, this.cool - dt); this.boltT = Math.max(0, this.boltT - dt);
    if (P.disabled || P.swimming) { this.root.visible = !P.swimming && !P.hideGun; this.ads = Math.max(0, this.ads - dt * 6); if (P.disabled) return; }
    else this.root.visible = !P.hideGun;
    if (P.swimming) { // swimming: knife only
      if (inp.took('knife') || (inp.fire && this.knifeT <= 0)) this.melee();
      this.animate(dt, inp, P); return;
    }
    // weapon swap
    if (inp.took('swap')) this.cycle();
    if (inp.took('w0')) this.switchTo('rifle'); if (inp.took('w1')) this.switchTo('pistol'); if (inp.took('w2')) this.switchTo('sniper');
    if (this.next) { this.swapT -= dt; if (this.swapT <= 0.25 && this.cur !== this.next) { this.rigs[this.cur].visible = false; this.cur = this.next; this.rigs[this.cur].visible = true; } if (this.swapT <= 0) { this.next = null; this.swapT = 0; } }
    // reload
    const a = this.ammo[this.cur];
    if (this.reloadT > 0) { this.reloadT -= dt; if (this.reloadT <= 0) { const n = Math.min(d.mag - a.mag, a.res); a.mag += n; a.res -= n; } }
    else if ((inp.took('reload') && a.mag < d.mag && a.res > 0) || (a.mag === 0 && a.res > 0 && inp.fire && !this.busy())) { this.reloadT = d.reload; audio.play('reload'); }
    // melee / grenades
    if (inp.took('knife') && !this.busy()) this.melee();
    if (inp.took('nade') && !this.busy() && this.frags > 0) this.startThrow('frag');
    if (inp.took('smoke') && !this.busy() && this.smokes > 0) this.startThrow('smoke');
    if (this.knifeT > 0) { this.knifeT -= dt; if (this.knifeT <= 0) { this.knife.visible = false; this.rigs[this.cur].visible = true; } }
    if (this.throwT > 0) { const before = this.throwT; this.throwT -= dt; if (before > 0.25 && this.throwT <= 0.25) this.release(); if (this.throwT <= 0) { this.nadeRig.visible = false; this.rigs[this.cur].visible = true; } }
    // ADS
    const wantAds = inp.adsActive && !this.busy() && !P.sprinting;
    this.ads += ((wantAds ? 1 : 0) - this.ads) * Math.min(1, dt * (d.scope ? 9 : 12));
    // fire
    const trig = inp.fire && !P.sprinting;
    if (trig && !this.busy() && this.cool <= 0 && this.boltT <= 0 && (d.auto || !this.lastTrigger)) {
      if (a.mag > 0) this.shoot(P); else if (!this.lastTrigger) audio.play('click');
    }
    this.lastTrigger = inp.fire;
    // sniper breath
    if (d.scope && this.ads > 0.9) this.breath = Math.max(0, this.breath - dt * 0.12); else this.breath = Math.min(1, this.breath + dt * 0.3);
    this.animate(dt, inp, P);
  }

  shoot(P) {
    const G = this.G, d = this.def, a = this.ammo[this.cur];
    a.mag--; this.cool = 60 / d.rpm; if (d.bolt) this.boltT = d.bolt; this.shots++;
    const cam = G.camera; const o = cam.getWorldPosition(new THREE.Vector3()); const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()));
    const moving = P.speed01; let sp = THREE.MathUtils.lerp(d.spread, d.adsSpread, this.ads) * (1 + moving * 1.5 + (P.crouch ? -0.3 : 0) + (P.airborne ? 2 : 0));
    if (d.scope && this.ads > 0.9) sp = 0.0006 + (1 - this.breath) * 0.004;
    if (d.scope && this.ads < 0.5) sp = d.spread;
    const pellets = d.pellets || 1; let anyHit = false, kill = false, head = false;
    this.muzzleWorld.copy(this.models[this.cur].userData.muzzle); this.models[this.cur].localToWorld(this.muzzleWorld);
    for (let i = 0; i < pellets; i++) {
      const dir = fwd.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2).multiplyScalar(sp)).normalize();
      const res = G.combat.fireRay(o, dir, d.range, { dmg: d.dmg, headMul: d.head, from: 'player', pierce: d.scope ? 1 : 0 });
      if (res.actorHit) { anyHit = true; if (res.killed) kill = true; if (res.head) head = true; }
      if (i === 0 && (!d.suppressed || Math.random() < 0.35)) G.fx.tracer(this.muzzleWorld.clone(), res.end);
    }
    if (anyHit) { this.hits++; G.hud.hitmark(kill); audio.play(kill ? 'kill' : 'hit', null, 0.6); if (kill && head) G.hud.popup('HEADSHOT', 'good', 0.9); }
    const snd = d.suppressed ? d.sound : (d.loudSound || d.sound);
    audio.play(snd, null, 0.9);
    G.combat.noise(o, d.suppressed ? (this.cur === 'pistol' ? 5 : 8) : 90, 'gunshot');
    G.fx.muzzle(this.muzzleWorld, fwd, d.suppressed ? 0.45 : this.cur === 'sniper' ? 1.6 : 1, !d.suppressed);
    // recoil
    const r = d.recoil * (1 - this.ads * 0.45) * (P.crouch ? 0.8 : 1);
    P.addRecoil(r * (0.8 + Math.random() * 0.4), (Math.random() - 0.5) * r * 0.6);
    this.recoil = Math.min(1, this.recoil + (this.cur === 'sniper' ? 1 : 0.35));
    if (this.cur === 'pistol' && this.models.pistol.userData.slide) this.models.pistol.userData.slide.position.z = 0.0;
    if (a.mag === 0 && a.res > 0) setTimeout(() => { if (this.cur && this.ammo[this.cur].mag === 0 && this.reloadT <= 0) { this.reloadT = this.def.reload; audio.play('reload'); } }, 250);
  }
  melee() {
    const G = this.G; this.knifeT = 0.45; this.knife.visible = true; for (const k in this.rigs) this.rigs[k].visible = false; audio.play('knife');
    setTimeout(() => G.combat.melee(), 120);
  }
  startThrow(kind) { this.throwT = 0.6; this.throwKind = kind; this.nadeRig.visible = true; this.nadeModel.visible = kind === 'frag'; this.smokeModel.visible = kind === 'smoke'; for (const k in this.rigs) this.rigs[k].visible = false; audio.play('pin'); }
  release() {
    const G = this.G; const cam = G.camera; const o = cam.getWorldPosition(new THREE.Vector3()); const q = cam.getWorldQuaternion(new THREE.Quaternion());
    const fwd = new THREE.Vector3(0, 0.18, -1).normalize().applyQuaternion(q);
    G.combat.throwGrenade(o.addScaledVector(fwd, 0.5), fwd.multiplyScalar(17).add(G.player.vel.clone().multiplyScalar(0.5)), this.throwKind, 'player');
    if (this.throwKind === 'frag') this.frags--; else this.smokes--;
  }
  animate(dt, inp, P) {
    const d = this.def; const rig = this.rigs[this.cur]; const m = this.models[this.cur];
    this.bobT += dt * (P.sprinting ? 13 : 9) * P.speed01;
    const bobA = (1 - this.ads * 0.9) * P.speed01;
    this.sway.x += (-inp.look.x * 0.6 - this.sway.x) * Math.min(1, dt * 10); this.sway.y += (-inp.look.y * 0.6 - this.sway.y) * Math.min(1, dt * 10);
    this.recoil = Math.max(0, this.recoil - dt * (this.cur === 'sniper' ? 2.5 : 9));
    const hip = this.cur === 'pistol' ? new THREE.Vector3(0.13, -0.11, -0.38) : this.cur === 'sniper' ? new THREE.Vector3(0.16, -0.14, -0.42) : new THREE.Vector3(0.16, -0.13, -0.41);
    const adsP = new THREE.Vector3(0, -m.userData.sightY, this.cur === 'pistol' ? -0.34 : this.cur === 'sniper' ? -0.18 : -0.26);
    const p = hip.lerp(adsP, this.ads);
    p.x += Math.sin(this.bobT) * 0.012 * bobA + this.sway.x * 0.04 * (1 - this.ads * 0.8);
    p.y += -Math.abs(Math.cos(this.bobT)) * 0.012 * bobA + this.sway.y * 0.03 * (1 - this.ads * 0.8);
    p.z += this.recoil * 0.06;
    // breathing idle
    const t = performance.now() / 1000; p.y += Math.sin(t * 1.6) * 0.002 * (1 - this.ads);
    const hipK = 1 - this.ads;
    let rx = this.recoil * 0.12 + this.sway.y * 0.2 + 0.03 * hipK, ry = this.sway.x * 0.3 + (this.cur === 'pistol' ? 0.1 : 0.06) * hipK, rz = this.sway.x * 0.2 + (P.sprinting ? 0.5 : 0) * (1 - this.ads) + (P.lean || 0) * -0.4;
    if (P.sprinting) { p.x -= 0.05; p.y -= 0.05; rx -= 0.25; ry += 0.6; }
    if (this.reloadT > 0) { const k = Math.sin(Math.min(1, (d.reload - this.reloadT) / d.reload) * Math.PI); p.y -= 0.08 * k; rx -= 0.5 * k; rz += 0.6 * k; }
    if (this.swapT > 0) { const k = Math.sin((this.swapT / 0.5) * Math.PI); p.y -= 0.25 * k; rx -= 0.6 * k; }
    if (this.boltT > 0 && this.cur === 'sniper') { const k = Math.sin((1 - this.boltT / d.bolt) * Math.PI); rz += 0.3 * k; p.y -= 0.03 * k; if (m.userData.bolt) m.userData.bolt.position.z = 0.06 + 0.08 * k; }
    rig.position.copy(p); rig.rotation.set(rx, ry, rz);
    if (m.userData.slide) m.userData.slide.position.z += (-0.03 - m.userData.slide.position.z) * Math.min(1, dt * 25);
    // scope: hide rig when fully scoped
    rig.visible = !this.next || this.cur === this.next ? (this.knifeT <= 0 && this.throwT <= 0 && !(d.scope && this.ads > 0.85)) : rig.visible;
    if (this.knifeT > 0) { const k = 1 - this.knifeT / 0.45; this.knife.position.set(0.25 - k * 0.35, -0.15 + Math.sin(k * Math.PI) * 0.06, -0.3 - Math.sin(k * Math.PI) * 0.15); this.knife.rotation.set(-0.2, 0.4 - k * 1.2, 0.2); }
    if (this.throwT > 0) { const k = 1 - this.throwT / 0.6; this.nadeRig.position.set(0.18, -0.1 + (k < 0.6 ? k * 0.15 : 0.09 - (k - 0.6) * 0.6), -0.3 + (k < 0.6 ? k * 0.2 : 0.12 - (k - 0.6) * 0.9)); this.nadeRig.rotation.set(k < 0.6 ? k : 0.6 - (k - 0.6) * 4, 0, 0); this.nadeModel.visible = this.throwKind === 'frag' && k < 0.6; this.smokeModel.visible = this.throwKind === 'smoke' && k < 0.6; }
  }
}
