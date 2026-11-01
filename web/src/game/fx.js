import * as THREE from 'three';
import { Assets } from '../core/assets.js';
import { audio } from '../core/audio.js';

// Billboard particle batch: one draw call per blend mode, CPU-simulated.
class Particles {
  constructor(scene, tex, max, blending, fog = true) {
    this.max = max; this.list = [];
    const g = new THREE.BufferGeometry();
    const corner = new Float32Array(max * 8), idx = new Uint32Array(max * 6);
    for (let i = 0; i < max; i++) { corner.set([-1, -1, 1, -1, 1, 1, -1, 1], i * 8); idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6); }
    g.setAttribute('corner', new THREE.BufferAttribute(corner, 2)); g.setIndex(new THREE.BufferAttribute(idx, 1));
    this.center = new THREE.BufferAttribute(new Float32Array(max * 12), 3); this.center.setUsage(THREE.DynamicDrawUsage);
    this.data = new THREE.BufferAttribute(new Float32Array(max * 16), 4); this.data.setUsage(THREE.DynamicDrawUsage); // size, rot, alpha, unused
    this.col = new THREE.BufferAttribute(new Float32Array(max * 12), 3); this.col.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.center); g.setAttribute('pdata', this.data); g.setAttribute('pcol', this.col);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending, fog,
      uniforms: { map: { value: tex }, ...THREE.UniformsLib.fog },
      vertexShader: `attribute vec2 corner; attribute vec4 pdata; attribute vec3 pcol; varying vec2 vUv; varying vec4 vC;
        #include <fog_pars_vertex>
        void main(){ float c=cos(pdata.y), s=sin(pdata.y); vec2 o=vec2(c*corner.x-s*corner.y, s*corner.x+c*corner.y)*pdata.x;
          vec4 mvPosition=modelViewMatrix*vec4(position,1.); mvPosition.xy+=o; gl_Position=projectionMatrix*mvPosition; vUv=corner*.5+.5; vC=vec4(pcol,pdata.z);
          #include <fog_vertex>
        }`,
      fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying vec4 vC;
        #include <fog_pars_fragment>
        void main(){ vec4 t=texture2D(map,vUv); gl_FragColor=vec4(t.rgb*vC.rgb, t.a*vC.a); if(gl_FragColor.a<.004) discard;
          #include <fog_fragment>
        }`,
    });
    this.mesh = new THREE.Mesh(g, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5; scene.add(this.mesh);
  }
  spawn(p) { if (this.list.length >= this.max) this.list.shift(); this.list.push(p); return p; }
  update(dt) {
    const L = this.list; let w = 0;
    for (let i = 0; i < L.length; i++) {
      const p = L[i]; p.age += dt; if (p.age >= p.life) continue;
      p.vel.y -= (p.grav || 0) * dt; p.vel.multiplyScalar(1 - (p.drag || 0) * dt); p.pos.addScaledVector(p.vel, dt); p.rot += (p.spin || 0) * dt;
      if (p.floor !== undefined && p.pos.y < p.floor) { p.pos.y = p.floor; p.vel.y *= -0.3; p.vel.x *= 0.6; p.vel.z *= 0.6; }
      L[w++] = p;
    }
    L.length = w;
    const C = this.center.array, D = this.data.array, K = this.col.array;
    for (let i = 0; i < w; i++) {
      const p = L[i]; const t = p.age / p.life; const size = p.s0 + (p.s1 - p.s0) * t;
      const a = p.a0 * (t < (p.fadeIn || 0.08) ? t / (p.fadeIn || 0.08) : 1) * Math.pow(1 - t, p.fadePow || 1);
      for (let k = 0; k < 4; k++) {
        C[(i * 4 + k) * 3] = p.pos.x; C[(i * 4 + k) * 3 + 1] = p.pos.y; C[(i * 4 + k) * 3 + 2] = p.pos.z;
        D[(i * 4 + k) * 4] = size; D[(i * 4 + k) * 4 + 1] = p.rot; D[(i * 4 + k) * 4 + 2] = a;
        K[(i * 4 + k) * 3] = p.c.r; K[(i * 4 + k) * 3 + 1] = p.c.g; K[(i * 4 + k) * 3 + 2] = p.c.b;
      }
    }
    this.mesh.geometry.setDrawRange(0, w * 6);
    this.center.needsUpdate = this.data.needsUpdate = this.col.needsUpdate = true;
  }
}

const tmp = new THREE.Vector3();
export class FX {
  constructor(scene, world, q) {
    this.scene = scene; this.world = world; this.q = q;
    this.add = new Particles(scene, Assets.tex('flash.png'), 500, THREE.AdditiveBlending, false);
    this.glow = new Particles(scene, Assets.tex('glow.png'), 400, THREE.AdditiveBlending, true);
    this.smoke = new Particles(scene, Assets.tex('smoke.png'), q === 0 ? 450 : 900, THREE.NormalBlending, true);
    this.smokes = []; // active smoke-grenade clouds {pos, r, t}
    // decals
    const holeTex = Assets.tex('hole.png');
    this.decalMat = new THREE.MeshStandardMaterial({ map: holeTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: 0.9, color: 0x666666 });
    this.bloodMat = new THREE.MeshBasicMaterial({ map: Assets.tex('smoke.png'), color: 0x3a0000, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, opacity: 0.85 });
    this.decalGeo = new THREE.PlaneGeometry(0.14, 0.14);
    this.decals = []; this.maxDecals = q === 0 ? 60 : 160;
    // tracers
    this.tracers = [];
    this.tracerGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 4, 1, true); this.tracerGeo.rotateX(Math.PI / 2); this.tracerGeo.translate(0, 0, 0.5);
    this.tracerMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 1.2), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    // flash light (reused)
    this.flashLight = new THREE.PointLight(0xffaa55, 0, 14, 2); scene.add(this.flashLight); this.flashT = 0;
    this.boomLight = new THREE.PointLight(0xff8833, 0, 40, 1.5); scene.add(this.boomLight); this.boomT = 0;
    this.debris = [];
  }
  muzzle(pos, dir, big = 1, light = true) {
    for (let i = 0; i < 2; i++) this.add.spawn({ pos: pos.clone().addScaledVector(dir, 0.05 + i * 0.12 * big), vel: dir.clone().multiplyScalar(2), age: 0, life: 0.05, s0: 0.22 * big * (1 - i * 0.3), s1: 0.32 * big, a0: 1, rot: Math.random() * 6, c: new THREE.Color(1, 0.75, 0.45) });
    this.smoke.spawn({ pos: pos.clone(), vel: dir.clone().multiplyScalar(0.8).add(new THREE.Vector3(0, 0.3, 0)), age: 0, life: 0.9, s0: 0.08, s1: 0.5 * big, a0: 0.18, rot: Math.random() * 6, spin: 0.5, c: new THREE.Color(0.7, 0.7, 0.7), drag: 1.5 });
    if (light) { this.flashLight.position.copy(pos); this.flashLight.intensity = 6 * big; this.flashT = 0.05; }
  }
  impact(hit, dir) {
    const p = hit.point, n = hit.normal; const mat = hit.box && hit.box.mat;
    if (mat === 'water') { this.splash(p, 0.5); return; }
    const metal = mat === 'metal';
    for (let i = 0; i < (metal ? 7 : 3); i++) {
      const v = n.clone().multiplyScalar(2 + Math.random() * 3).add(tmp.set(Math.random() - 0.5, Math.random() - 0.2, Math.random() - 0.5).multiplyScalar(4));
      this.add.spawn({ pos: p.clone(), vel: v, age: 0, life: 0.15 + Math.random() * 0.25, s0: 0.03, s1: 0.01, a0: 1, rot: 0, grav: 9, c: new THREE.Color(1, 0.7, 0.35) });
    }
    this.smoke.spawn({ pos: p.clone().addScaledVector(n, 0.05), vel: n.clone().multiplyScalar(0.8), age: 0, life: 0.8 + Math.random() * 0.4, s0: 0.08, s1: 0.7, a0: 0.45, rot: Math.random() * 6, spin: 0.6, drag: 2, c: metal ? new THREE.Color(0.6, 0.6, 0.6) : new THREE.Color(0.55, 0.5, 0.45) });
    audio.play(metal ? 'impactMetal' : 'impact', p, 0.6);
    if (hit.box && hit.box.min) this.decal(p, n, this.decalMat, 0.6 + Math.random() * 0.6);
  }
  decal(p, n, mat, s = 1) {
    const d = new THREE.Mesh(this.decalGeo, mat); d.position.copy(p).addScaledVector(n, 0.01); d.lookAt(tmp.copy(p).add(n)); d.rotateZ(Math.random() * 6); d.scale.setScalar(s);
    this.scene.add(d); this.decals.push(d); if (this.decals.length > this.maxDecals) this.scene.remove(this.decals.shift());
  }
  blood(p, dir) {
    for (let i = 0; i < 6; i++) this.smoke.spawn({ pos: p.clone(), vel: dir.clone().multiplyScalar(1.5 + Math.random() * 2).add(tmp.set(Math.random() - 0.5, Math.random() * 0.5, Math.random() - 0.5)), age: 0, life: 0.5 + Math.random() * 0.3, s0: 0.05, s1: 0.32, a0: 0.75, rot: Math.random() * 6, grav: 3, drag: 2, c: new THREE.Color(0.35, 0.02, 0.02) });
    // splat on nearby surface
    const h = this.world.raycast(p, dir.clone().setY(dir.y - 0.4).normalize(), 3);
    if (h && h.box && h.box.min !== undefined || (h && h.box.ground)) this.decal(h.point, h.normal, this.bloodMat, 3 + Math.random() * 3);
  }
  splash(p, s = 1) {
    for (let i = 0; i < 10 * s + 3; i++) this.smoke.spawn({ pos: p.clone(), vel: tmp.set((Math.random() - 0.5) * 2, 2 + Math.random() * 4 * s, (Math.random() - 0.5) * 2).clone(), age: 0, life: 0.6 + Math.random() * 0.4, s0: 0.08 * s, s1: 0.4 * s, a0: 0.5, rot: Math.random() * 6, grav: 9, c: new THREE.Color(0.75, 0.85, 0.9) });
  }
  tracer(from, to) {
    const d = to.clone().sub(from); const L = d.length(); if (L < 3) return;
    const m = new THREE.Mesh(this.tracerGeo, this.tracerMat); m.position.copy(from); m.lookAt(to); m.scale.set(1, 1, Math.min(L, 6));
    this.scene.add(m); this.tracers.push({ m, from: from.clone(), dir: d.normalize(), L, t: 0, speed: 260 });
  }
  explosion(p, big = 1) {
    audio.play('boom', p, 1.2 * big);
    for (let i = 0; i < 14 * big; i++) this.glow.spawn({ pos: p.clone().add(tmp.set(Math.random() - 0.5, Math.random() * 0.5, Math.random() - 0.5).multiplyScalar(1.5 * big)), vel: tmp.set(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).multiplyScalar(6 * big).clone(), age: 0, life: 0.35 + Math.random() * 0.4, s0: 1.2 * big, s1: 3.2 * big, a0: 1, rot: Math.random() * 6, drag: 4, c: new THREE.Color(1, 0.55 + Math.random() * 0.2, 0.2) });
    for (let i = 0; i < 18 * big; i++) this.smoke.spawn({ pos: p.clone().add(tmp.set(Math.random() - 0.5, Math.random(), Math.random() - 0.5).multiplyScalar(2 * big)), vel: tmp.set(Math.random() - 0.5, 0.4 + Math.random(), Math.random() - 0.5).multiplyScalar(3 * big).clone(), age: 0, life: 3 + Math.random() * 3, s0: 1 * big, s1: 5 * big, a0: 0.55, rot: Math.random() * 6, spin: 0.2, drag: 1.2, c: new THREE.Color(0.12, 0.11, 0.1), fadeIn: 0.05 });
    for (let i = 0; i < 30 * big; i++) this.add.spawn({ pos: p.clone(), vel: tmp.set(Math.random() - 0.5, Math.random() * 0.9, Math.random() - 0.5).normalize().multiplyScalar(8 + Math.random() * 14).clone(), age: 0, life: 0.6 + Math.random() * 0.8, s0: 0.06, s1: 0.02, a0: 1, rot: 0, grav: 12, c: new THREE.Color(1, 0.6, 0.25), floor: 0.02 });
    this.boomLight.position.copy(p).y += 1.5; this.boomLight.intensity = 120 * big; this.boomT = 0.6;
    if (p.y < this.world.seaLevel + 1 && this.world.isSea(p.x, p.z)) this.splash(p, 3);
  }
  fire(p, s = 1, life = 1) { // burning flame puffs (ship fires)
    this.glow.spawn({ pos: p.clone().add(tmp.set(Math.random() - 0.5, 0, Math.random() - 0.5).multiplyScalar(s)), vel: new THREE.Vector3(0, 2 + Math.random() * 2, 0), age: 0, life: 0.6 * life + Math.random() * 0.4, s0: 0.8 * s, s1: 0.2 * s, a0: 0.9, rot: Math.random() * 6, c: new THREE.Color(1, 0.45, 0.12) });
    if (Math.random() < 0.3) this.smoke.spawn({ pos: p.clone().add(new THREE.Vector3(0, 1.5 * s, 0)), vel: new THREE.Vector3(0.5, 2.5, 0.3), age: 0, life: 4, s0: 1 * s, s1: 4 * s, a0: 0.45, rot: Math.random() * 6, spin: 0.2, c: new THREE.Color(0.08, 0.08, 0.08) });
  }
  smokeGrenade(p) {
    audio.play('smoke', p, 1);
    const cloud = { pos: p.clone(), r: 0.5, t: 0, life: 24 }; this.smokes.push(cloud);
  }
  isSmoked(a, b) {
    for (const s of this.smokes) {
      if (s.r < 1.5) continue; // closest point on segment ab to cloud centre
      const ab = tmp.copy(b).sub(a); const t = THREE.MathUtils.clamp(s.pos.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1);
      const c = a.clone().addScaledVector(ab, t); if (c.distanceTo(s.pos) < s.r * 0.8) return true;
    }
    return false;
  }
  update(dt) {
    this.add.update(dt); this.glow.update(dt); this.smoke.update(dt);
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) this.flashLight.intensity = 0; }
    if (this.boomT > 0) { this.boomT -= dt; this.boomLight.intensity = Math.max(0, this.boomT / 0.6) * 120; }
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i]; t.t += dt * t.speed;
      if (t.t > t.L) { this.scene.remove(t.m); this.tracers.splice(i, 1); continue; }
      t.m.position.copy(t.from).addScaledVector(t.dir, t.t);
    }
    for (let i = this.smokes.length - 1; i >= 0; i--) {
      const s = this.smokes[i]; s.t += dt; s.r = Math.min(7, 0.5 + s.t * 2.2);
      if (s.t < s.life - 4 && Math.random() < dt * 14) this.smoke.spawn({ pos: s.pos.clone().add(tmp.set(Math.random() - 0.5, Math.random() * 0.6, Math.random() - 0.5).multiplyScalar(s.r * 1.2)), vel: tmp.set(Math.random() - 0.5, 0.15, Math.random() - 0.5).multiplyScalar(0.6).clone(), age: 0, life: 7, s0: 1.5, s1: 4.5, a0: 0.55, rot: Math.random() * 6, spin: 0.1, c: new THREE.Color(0.62, 0.64, 0.66), fadeIn: 0.25, fadePow: 1.5 });
      if (s.t > s.life) this.smokes.splice(i, 1);
    }
  }
}
