import * as THREE from 'three';
import { Assets } from '../core/assets.js';
import { audio } from '../core/audio.js';

// Night sky, distant skyline, sea, rain, lamp glow sprites/cones/pools, dynamic light pool and lightning.
export class Atmosphere {
  constructor(engine, opts) {
    this.e = engine; const scene = engine.scene; const q = engine.quality; this.q = q; this.opts = opts;
    this.group = new THREE.Group(); scene.add(this.group);
    scene.background = new THREE.Color(opts.fogColor ?? 0x0b1116);
    scene.fog = new THREE.FogExp2(opts.fogColor ?? 0x0b1116, opts.fogDensity ?? 0.011);
    scene.environment = Assets.env; scene.environmentIntensity = opts.envIntensity ?? 0.35;

    // lights
    this.hemi = new THREE.HemisphereLight(opts.skyLight ?? 0x5d7a99, opts.groundLight ?? 0x1a1410, opts.hemi ?? 0.55); scene.add(this.hemi);
    this.moon = new THREE.DirectionalLight(opts.moonColor ?? 0x9fb8d8, opts.moon ?? 0.9);
    this.moon.position.set(-60, 120, -40);
    if (q > 0) {
      this.moon.castShadow = true; const s = q === 2 ? 2048 : 1024; this.moon.shadow.mapSize.set(s, s);
      const c = this.moon.shadow.camera; c.left = c.bottom = -45; c.right = c.top = 45; c.near = 10; c.far = 300; this.moon.shadow.bias = -0.0006; this.moon.shadow.normalBias = 0.04;
    }
    scene.add(this.moon); scene.add(this.moon.target);
    this.moonOff = this.moon.position.clone();

    // sky dome (gradient + cloud texture)
    const skyTex = Assets.tex('sky.jpg');
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { tex: { value: skyTex }, top: { value: new THREE.Color(opts.skyTop ?? 0x05080c) }, hor: { value: new THREE.Color(opts.skyHor ?? 0x1c2833) }, flash: { value: 0 }, glow: { value: new THREE.Color(opts.cityGlow ?? 0x3a2a1c) } },
      vertexShader: `varying vec3 vP; void main(){ vP=normalize(position); vec4 p=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*p; gl_Position.z=gl_Position.w; }`,
      fragmentShader: `uniform sampler2D tex; uniform vec3 top,hor,glow; uniform float flash; varying vec3 vP;
        void main(){ float h=clamp(vP.y,0.,1.); vec3 c=mix(hor,top,pow(h,.45));
          float u=atan(vP.z,vP.x)/6.2832+.5; vec3 cl=texture2D(tex,vec2(u*2.,clamp(h*1.6,0.,1.))).rgb; c+=cl*.55*(1.-h*.6);
          c+=glow*pow(1.-h,8.)*.9; c+=vec3(.6,.7,.9)*flash*(.4+cl.r);
          gl_FragColor=vec4(c,1.); }`,
    });
    this.skyMat = skyMat;
    const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat); sky.renderOrder = -10; sky.frustumCulled = false; this.sky = sky; this.group.add(sky);

    // skyline ring
    if (opts.skyline !== false) {
      const t = Assets.tex('skyline.png'); t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1);
      const sk = new THREE.Mesh(new THREE.CylinderGeometry(700, 700, 90, 48, 1, true), new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.BackSide, fog: false, depthWrite: false, color: 0x8899aa }));
      sk.position.y = 20; sk.renderOrder = -9; this.group.add(sk); this.skyline = sk;
    }

    // sea
    if (opts.sea !== false) {
      const wn = Assets.tex('water_n.jpg', { srgb: false }).clone(); wn.repeat.set(60, 60); wn.needsUpdate = true;
      const wn2 = Assets.tex('water_n.jpg', { srgb: false }).clone(); wn2.repeat.set(23, 23); wn2.needsUpdate = true;
      const wm = new THREE.MeshStandardMaterial({ color: opts.waterColor ?? 0x06141a, roughness: 0.06, metalness: 0.15, normalMap: wn, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.3, transparent: true, opacity: 0.93 });
      this.waterTex = [wn, wn2];
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), wm); sea.rotation.x = -Math.PI / 2; sea.position.y = opts.seaLevel ?? -1.4; sea.receiveShadow = q > 0; this.group.add(sea); this.sea = sea;
      // underside (seen from below while swimming)
      const under = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshBasicMaterial({ color: 0x0c3a44, transparent: true, opacity: 0.85, side: THREE.BackSide, fog: true }));
      under.rotation.x = -Math.PI / 2; under.position.y = sea.position.y - 0.01; this.group.add(under);
      // sea floor
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshStandardMaterial({ map: Assets.tex('mud_c.jpg', { repeat: [300, 300] }), color: 0x445a50, roughness: 1 }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = -9; this.group.add(floor);
    }

    // rain (GPU animated streaks around the camera)
    if (opts.rain) {
      const N = q === 2 ? 6000 : q === 1 ? 4000 : 2000; const B = 46, H = 26;
      const pos = new Float32Array(N * 6), off = new Float32Array(N * 6);
      for (let i = 0; i < N; i++) { const x = Math.random() * B, y = Math.random() * H, z = Math.random() * B; for (let k = 0; k < 2; k++) { pos.set([x, y, z], i * 6 + k * 3); off.set([k, Math.random(), 0], i * 6 + k * 3); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aOff', new THREE.BufferAttribute(off, 3));
      const m = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, fog: false,
        uniforms: { time: { value: 0 }, cam: { value: new THREE.Vector3() }, B: { value: B }, H: { value: H }, wind: { value: new THREE.Vector2(2.5, 1.0) }, col: { value: new THREE.Color(0.65, 0.72, 0.8) }, op: { value: opts.rain } },
        vertexShader: `attribute vec3 aOff; uniform float time,B,H; uniform vec3 cam; uniform vec2 wind; varying float vA;
          void main(){ vec3 p=position; float sp=17.+aOff.y*6.; p.y=mod(p.y-time*sp,H); p.x=mod(p.x-cam.x+time*wind.x,B); p.z=mod(p.z-cam.z+time*wind.y,B);
            vec3 w=vec3(cam.x+p.x-B*.5, cam.y+p.y-H*.45, cam.z+p.z-B*.5); w.xz+=wind*aOff.x*.03; w.y+=aOff.x*.38;
            vec4 mv=modelViewMatrix*vec4(w,1.); vA=aOff.x>.5?0.:1.; float dd=length(mv.xyz); vA*=smoothstep(26.,6.,dd)*smoothstep(1.2,3.5,dd); gl_Position=projectionMatrix*mv; }`,
        fragmentShader: `uniform vec3 col; uniform float op; varying float vA; void main(){ gl_FragColor=vec4(col,vA*.13*op); }`,
      });
      this.rain = new THREE.LineSegments(g, m); this.rain.frustumCulled = false; this.group.add(this.rain);
    }
    this.lightningT = 8 + Math.random() * 10; this.flash = 0; this.thunderAt = 0;
  }

  // Lamp visuals from builder registry: glow sprites, volumetric cones and ground pools (all additive, instanced as points/meshes).
  buildLampFx(fx, lights) {
    const add = THREE.AdditiveBlending;
    // glows as sprites
    const glowTex = Assets.tex('glow.png');
    for (const g of fx.glows) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: g.color.clone().multiplyScalar(1.6), blending: add, depthWrite: false, transparent: true, fog: false }));
      s.position.copy(g.pos); s.scale.setScalar(g.size); this.group.add(s);
    }
    // cones
    const coneTex = Assets.tex('cone.png'); const coneGeo = new THREE.CylinderGeometry(0.25, 1, 1, 20, 1, true); coneGeo.translate(0, -0.5, 0);
    const M4 = new THREE.Matrix4(), Qi = new THREE.Quaternion(), S3 = new THREE.Vector3();
    if (fx.cones.length) {
      const im = new THREE.InstancedMesh(coneGeo, new THREE.MeshBasicMaterial({ map: coneTex, blending: add, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true }), fx.cones.length);
      fx.cones.forEach((c, i) => { M4.compose(c.pos, Qi, S3.set(c.r, c.h, c.r)); im.setMatrixAt(i, M4); im.setColorAt(i, c.color.clone().multiplyScalar(this.q === 0 ? 0.07 : 0.1)); });
      im.frustumCulled = false; this.group.add(im); this.cones = im;
    }
    // ground pools
    const poolTex = Assets.tex('pool.png'); const pg = new THREE.PlaneGeometry(1, 1); pg.rotateX(-Math.PI / 2);
    if (fx.pools.length) {
      const im = new THREE.InstancedMesh(pg, new THREE.MeshBasicMaterial({ map: poolTex, blending: add, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), fx.pools.length);
      fx.pools.forEach((p, i) => { M4.compose(p.pos, Qi, S3.set(p.r * 2, 1, p.r * 2)); im.setMatrixAt(i, M4); im.setColorAt(i, p.color.clone().multiplyScalar(0.42)); });
      im.frustumCulled = false; im.renderOrder = 1; this.group.add(im);
    }
    // dynamic point-light pool: real lights follow the nearest lamps
    this.sources = lights;
    const n = this.q === 2 ? 10 : this.q === 1 ? 7 : 4;
    this.pool = [];
    for (let i = 0; i < n; i++) { const l = new THREE.PointLight(0xffffff, 0, 20, 1.6); l.userData.src = null; this.e.scene.add(l); this.pool.push(l); }
    this.poolT = 0;
  }

  update(dt, cam, t) {
    if (this.rain) {
      const u = this.rain.material.uniforms; u.time.value = t; u.cam.value.copy(cam.position);
      this.roofT = (this.roofT || 0) - dt;
      if (this.roofT <= 0 && this.world) { this.roofT = 0.25; this.indoor = this.world.ceiling(cam.position.x, cam.position.z, cam.position.y - 0.2, 0.1) < cam.position.y + 25; }
      const under = cam.position.y < (this.opts.seaLevel ?? -1.4); u.op.value += ((this.indoor || under ? 0 : this.opts.rain) - u.op.value) * Math.min(1, dt * (under ? 30 : 3));
      this.rain.visible = u.op.value > 0.02;
    }
    if (this.waterTex) { this.waterTex[0].offset.set(t * 0.012, t * 0.006); }
    // underwater: thick teal fog
    const uw = cam.position.y < (this.opts.seaLevel ?? -1.4) - 0.05;
    if (uw !== this._uw) { this._uw = uw; const sc = this.e.scene; sc.fog.color.set(uw ? 0x0a3540 : this.opts.fogColor ?? 0x0b1116); sc.fog.density = uw ? 0.075 : this.opts.fogDensity ?? 0.011; sc.background.set(uw ? 0x0a3540 : this.opts.fogColor ?? 0x0b1116); this.sky.visible = !uw; if (this.skyline) this.skyline.visible = !uw; }
    // moon shadow follows camera
    const tgt = cam.position; this.moon.target.position.set(Math.round(tgt.x / 4) * 4, 0, Math.round(tgt.z / 4) * 4);
    this.moon.position.copy(this.moon.target.position).add(this.moonOff);
    this.sky.position.copy(cam.position); if (this.skyline) { this.skyline.position.x = cam.position.x; this.skyline.position.z = cam.position.z; }
    // light pool assignment
    if (this.pool) {
      this.poolT -= dt;
      if (this.poolT <= 0) {
        this.poolT = 0.2;
        const p = cam.position; const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
        const scored = this.sources.map((s) => { const d = s.pos.distanceTo(p); const v = s.pos.clone().sub(p).normalize().dot(fwd); return [d - v * 8 - (s.prio || 0), s]; }).sort((a, b) => a[0] - b[0]).slice(0, this.pool.length).map((x) => x[1]);
        const free = this.pool.filter((l) => !scored.includes(l.userData.src));
        for (const l of this.pool) if (l.userData.src && !scored.includes(l.userData.src)) l.userData.src = null;
        for (const s of scored) if (!this.pool.some((l) => l.userData.src === s)) { const l = free.shift(); if (l) { l.userData.src = s; l.position.copy(s.pos); l.color.copy(s.color); l.distance = s.dist; l.intensity = 0; } }
      }
      for (const l of this.pool) { const s = l.userData.src; const target = s ? s.intensity * (s.on === false ? 0 : 1) : 0; l.intensity += (target - l.intensity) * Math.min(1, dt * 4); if (s) l.position.copy(s.pos); }
    }
    // lightning
    if (this.opts.lightning) {
      this.lightningT -= dt;
      if (this.lightningT <= 0) { this.lightningT = 12 + Math.random() * 18; this.flash = 1; this.thunderAt = t + 0.8 + Math.random() * 2.2; }
      if (this.thunderAt && t > this.thunderAt) { this.thunderAt = 0; audio.play('thunder', null, 0.9); }
      const f = this.flash > 0 ? (this.flash > 0.7 || (this.flash > 0.35 && this.flash < 0.5) ? this.flash : this.flash * 0.3) : 0;
      this.skyMat.uniforms.flash.value = f; this.hemi.intensity = (this.opts.hemi ?? 0.55) + f * 2.2;
      this.flash = Math.max(0, this.flash - dt * 1.6);
    }
  }
}
