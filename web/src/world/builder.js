import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Assets } from '../core/assets.js';

function chainTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256); x.strokeStyle = '#fff'; x.lineWidth = 3;
  for (let i = -256; i < 512; i += 21) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 256, 256); x.stroke(); x.beginPath(); x.moveTo(i, 256); x.lineTo(i + 256, 0); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.6, 0.6); return t;
}

// ---------- material library ----------
export function makeMaterials(q) {
  const T = (n, s) => Assets.tex(n, { srgb: s });
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const env = 0.35;
  const M = {
    asphalt: std({ map: T('asph_c.jpg', 1), normalMap: T('asph_n.jpg'), roughnessMap: T('asph_r.jpg'), roughness: 0.9, metalness: 0.0, envMapIntensity: 0.9, normalScale: new THREE.Vector2(0.8, 0.8) }),
    concrete: std({ map: T('concrete_c.jpg', 1), normalMap: T('concrete_n.jpg'), roughnessMap: T('concrete_r.jpg'), roughness: 0.95, envMapIntensity: env, color: 0x9a9a96 }),
    concreteDark: std({ map: T('concrete_c.jpg', 1), normalMap: T('concrete_n.jpg'), roughness: 0.9, envMapIntensity: env, color: 0x5d5f60 }),
    container: std({ map: T('cont_c.jpg', 1), normalMap: T('cont_n.jpg'), roughnessMap: T('cont_r.jpg'), roughness: 0.75, metalness: 0.35, envMapIntensity: 0.6 }),
    corr: std({ map: T('corr_c.jpg', 1), normalMap: T('corr_n.jpg'), roughnessMap: T('corr_r.jpg'), roughness: 0.8, metalness: 0.5, envMapIntensity: 0.55 }),
    hull: std({ map: T('ship_c.jpg', 1), normalMap: T('ship_n.jpg'), roughness: 0.6, metalness: 0.4, envMapIntensity: 0.6 }),
    hullRed: std({ map: T('hull_c.jpg', 1), normalMap: T('hull_n.jpg'), roughness: 0.55, metalness: 0.3, envMapIntensity: 0.6 }),
    deck: std({ map: T('deck_c.jpg', 1), normalMap: T('deck_n.jpg'), roughness: 0.55, metalness: 0.55, envMapIntensity: 0.7, color: 0x8a8f8a }),
    plank: std({ map: T('plank_c.jpg', 1), normalMap: T('plank_n.jpg'), roughness: 0.6, envMapIntensity: 0.6 }),
    rock: std({ map: T('rock_c.jpg', 1), normalMap: T('rock_n.jpg'), roughness: 0.7, envMapIntensity: 0.5, normalScale: new THREE.Vector2(1.5, 1.5) }),
    mud: std({ map: T('mud_c.jpg', 1), normalMap: T('mud_n.jpg'), roughness: 0.75, envMapIntensity: 0.5 }),
    panel: std({ map: T('panel_c.jpg', 1), normalMap: T('panel_n.jpg'), roughnessMap: T('panel_r.jpg'), roughness: 0.8, envMapIntensity: env }),
    floor: std({ map: T('floor_c.jpg', 1), normalMap: T('floor_n.jpg'), roughnessMap: T('floor_r.jpg'), roughness: 0.6, envMapIntensity: 0.5 }),
    ceil: std({ map: T('ceil_c.jpg', 1), normalMap: T('ceil_n.jpg'), roughness: 0.9, envMapIntensity: 0.3 }),
    yellow: std({ color: 0xc89a22, roughnessMap: T('grunge.jpg'), roughness: 0.7, metalness: 0.45, envMapIntensity: 0.6 }),
    red: std({ color: 0x8a2018, roughnessMap: T('grunge.jpg'), roughness: 0.7, metalness: 0.3, envMapIntensity: 0.5 }),
    white: std({ color: 0xb8b8b0, roughnessMap: T('grunge.jpg'), roughness: 0.6, metalness: 0.2, envMapIntensity: 0.5 }),
    steel: std({ color: 0x55595c, roughnessMap: T('grunge.jpg'), roughness: 0.5, metalness: 0.85, envMapIntensity: 0.8 }),
    darkMetal: std({ color: 0x23272a, roughnessMap: T('grunge.jpg'), roughness: 0.55, metalness: 0.7, envMapIntensity: 0.7 }),
    rubber: std({ color: 0x151515, roughness: 0.9 }),
    wood: std({ map: T('plank_c.jpg', 1), color: 0xa08060, roughness: 0.8 }),
    tarp: std({ map: T('fabric.jpg', 1), normalMap: T('fabric_n.jpg'), color: 0x2c4a36, roughness: 0.75, envMapIntensity: 0.6 }),
    tarpBlue: std({ map: T('fabric.jpg', 1), normalMap: T('fabric_n.jpg'), color: 0x23476e, roughness: 0.7, envMapIntensity: 0.6 }),
    glassLit: std({ color: 0x111111, emissive: 0xffc777, emissiveIntensity: 1.6, roughness: 0.2 }),
    glassCold: std({ color: 0x0b0f12, emissive: 0x9fd6ff, emissiveIntensity: 0.9, roughness: 0.2 }),
    glassDark: std({ color: 0x0a0d10, roughness: 0.08, metalness: 0.9, envMapIntensity: 1.2 }),
    lampWarm: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.75, 0.42).multiplyScalar(6) }),
    lampCold: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.9, 1.0).multiplyScalar(5) }),
    lampRed: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.1, 0.05).multiplyScalar(6) }),
    screen: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.8, 1.0).multiplyScalar(1.6) }),
    black: std({ color: 0x050505, roughness: 1 }),
    fenceMesh: std({ color: 0x8a9096, metalness: 0.8, roughness: 0.4, alphaMap: chainTex(), alphaTest: 0.5, side: THREE.DoubleSide, envMapIntensity: 0.8 }),
  };
  // world-scale texel density: UVs are in metres, so set repeat per material
  const rep = { asphalt: 1 / 6, concrete: 1 / 4, concreteDark: 1 / 4, container: 1 / 6, corr: 1 / 4, hull: 1 / 8, hullRed: 1 / 8, deck: 1 / 4, plank: 1 / 3, rock: 1 / 5, mud: 1 / 6, panel: 1 / 3, floor: 1 / 4, ceil: 1 / 3, tarp: 1 / 2, tarpBlue: 1 / 2, wood: 1 / 2, yellow: 1 / 3, red: 1 / 3, white: 1 / 3, steel: 1 / 3, darkMetal: 1 / 3 };
  for (const k in rep) {
    const m = M[k];
    for (const slot of ['map', 'normalMap', 'roughnessMap']) if (m[slot]) { m[slot] = m[slot].clone(); m[slot].repeat.set(rep[k], rep[k]); m[slot].needsUpdate = true; }
  }
  return M;
}

// Box geometry with UVs in world metres so every surface tiles at the same density.
export function boxGeo(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]); }
  return g;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3(), _e = new THREE.Euler();

export class Builder {
  constructor(scene, world, M, q) {
    this.scene = scene; this.world = world; this.M = M; this.q = q;
    this.parts = new Map(); // matKey -> geometries[]
    this.root = new THREE.Group(); scene.add(this.root);
    this.lights = []; // {pos,color,intensity,dist}
    this.fx = { glows: [], cones: [], pools: [] };
    this.dynamic = [];
  }
  add(key, geo) { let a = this.parts.get(key); if (!a) this.parts.set(key, (a = [])); a.push(geo); }
  // Solid box: visual + collider. pos = centre of box base (x, yBottom, z).
  box(key, x, y, z, w, h, d, opt = {}) {
    const g = boxGeo(w, h, d);
    if (opt.ry) { g.rotateY(opt.ry); }
    g.translate(x, y + h / 2, z);
    if (key) this.add(key, g);
    if (opt.collide !== false) {
      if (opt.ry && Math.abs(Math.sin(opt.ry * 2)) > 0.01) {
        // rotated boxes get an approximate AABB of their footprint
        const c = Math.abs(Math.cos(opt.ry)), s = Math.abs(Math.sin(opt.ry)); const hw = (w * c + d * s) / 2, hd = (w * s + d * c) / 2;
        this.world.addBox(new THREE.Vector3(x - hw, y, z - hd), new THREE.Vector3(x + hw, y + h, z + hd), opt);
      } else {
        const sw = opt.ry && Math.abs(Math.sin(opt.ry)) > 0.7; const W = sw ? d : w, D = sw ? w : d;
        this.world.addBox(new THREE.Vector3(x - W / 2, y, z - D / 2), new THREE.Vector3(x + W / 2, y + h, z + D / 2), opt);
      }
    }
    return g;
  }
  // Visual-only arbitrary geometry placed by transform.
  geo(key, g, x, y, z, rx = 0, ry = 0, rz = 0, s = 1) {
    _e.set(rx, ry, rz); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(s, s, s); _m.compose(_p, _q, _s);
    g.applyMatrix4(_m); this.add(key, g); return g;
  }
  cyl(key, x, y, z, r, h, seg = 12, opt = {}) {
    const g = new THREE.CylinderGeometry(opt.r2 ?? r, r, h, seg, 1, !!opt.open);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * r, uv.getY(i) * h);
    if (opt.rx || opt.rz) { g.rotateX(opt.rx || 0); g.rotateZ(opt.rz || 0); }
    g.translate(x, y + (opt.rx || opt.rz ? 0 : h / 2), z); this.add(key, g);
    if (opt.collide) this.world.addBox(new THREE.Vector3(x - r, y, z - r), new THREE.Vector3(x + r, y + h, z + r), opt);
    return g;
  }
  finalize() {
    for (const [key, geos] of this.parts) {
      // strip to common attributes
      const clean = geos.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const a of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(a)) n.deleteAttribute(a); return n; });
      // chunk merged geometry so frustum culling still helps on big maps
      const chunks = new Map();
      for (const g of clean) { g.computeBoundingBox(); const c = g.boundingBox.getCenter(_p); const k = Math.floor(c.x / 60) + ':' + Math.floor(c.z / 60); let a = chunks.get(k); if (!a) chunks.set(k, (a = [])); a.push(g); }
      for (const a of chunks.values()) {
        const merged = mergeGeometries(a, false); if (!merged) continue;
        const mesh = new THREE.Mesh(merged, this.M[key]);
        const glowy = /^lamp|^glass|^screen/.test(key);
        mesh.castShadow = !glowy && this.q > 0; mesh.receiveShadow = !glowy;
        mesh.matrixAutoUpdate = false; mesh.updateMatrix();
        this.root.add(mesh);
      }
    }
    this.parts.clear();
  }

  // ---------- prefabs ----------
  lamp(x, z, h = 9, color = 'warm', dir = 0, opt = {}) {
    const M = this.M;
    if (!opt.noPole) {
      this.cyl('steel', x, 0, z, 0.12, h, 8, { collide: true, r2: 0.08, mat: 'metal' });
      const ax = Math.sin(dir) * 1.4, az = Math.cos(dir) * 1.4;
      this.box('steel', x + ax / 2, h - 0.12, z + az / 2, 0.12, 0.12, 1.5, { ry: dir, collide: false });
      this.box('darkMetal', x + ax, h - 0.25, z + az, 0.5, 0.18, 0.7, { ry: dir, collide: false });
      this.box(color === 'cold' ? 'lampCold' : color === 'red' ? 'lampRed' : 'lampWarm', x + ax, h - 0.3, z + az, 0.38, 0.06, 0.55, { ry: dir, collide: false });
      x += ax; z += az; h -= 0.35;
    }
    const col = color === 'cold' ? new THREE.Color(0.7, 0.85, 1.0) : color === 'red' ? new THREE.Color(1, 0.15, 0.08) : new THREE.Color(1.0, 0.7, 0.38);
    this.lights.push({ pos: new THREE.Vector3(x, h - 0.4, z), color: col, intensity: opt.intensity ?? 60, dist: opt.dist ?? 26 });
    this.fx.glows.push({ pos: new THREE.Vector3(x, h, z), color: col, size: opt.glow ?? 2.4 });
    if (!opt.noCone) this.fx.cones.push({ pos: new THREE.Vector3(x, h, z), color: col, h: h - (opt.floor ?? 0), r: h * 0.45 });
    this.fx.pools.push({ pos: new THREE.Vector3(x, (opt.floor ?? 0) + 0.03, z), color: col, r: opt.pool ?? h * 0.95 });
  }
  container(x, y, z, ry = 0, long = true, tint = null) {
    const w = 2.44, h = 2.6, d = long ? 12.2 : 6.1;
    const g = this.box(null, x, y, z, w, h, d, { ry, mat: 'metal' });
    const g2 = boxGeo(w, h, d); g2.rotateY(ry); g2.translate(x, y + h / 2, z);
    const col = tint || new THREE.Color().setHSL([0.02, 0.58, 0.08, 0.33, 0.6, 0.0][Math.floor(Math.random() * 6)], 0.45, 0.32 + Math.random() * 0.1);
    const n = g2.attributes.position.count; const c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
    g2.setAttribute('color', new THREE.BufferAttribute(c, 3));
    (this.containers || (this.containers = [])).push(g2);
  }
  finalizeContainers() {
    if (!this.containers) return;
    const geos = this.containers.map((g) => g.index ? g.toNonIndexed() : g);
    const mat = this.M.container.clone(); mat.vertexColors = true;
    const chunks = new Map();
    for (const g of geos) { g.computeBoundingBox(); const c = g.boundingBox.getCenter(_p); const k = Math.floor(c.x / 60) + ':' + Math.floor(c.z / 60); let a = chunks.get(k); if (!a) chunks.set(k, (a = [])); a.push(g); }
    for (const a of chunks.values()) { const m = new THREE.Mesh(mergeGeometries(a), mat); m.castShadow = m.receiveShadow = true; m.matrixAutoUpdate = false; this.root.add(m); }
    this.containers = null;
  }
  crate(x, y, z, s = 1.2, key = 'wood', ry = 0) { this.box(key, x, y, z, s, s, s, { ry, mat: 'wood' }); }
  barrel(x, y, z, key = 'red') { this.cyl(key, x, y, z, 0.32, 0.95, 12, { collide: true, mat: 'metal' }); }
  ladder(x, y0, y1, z, face = 0) {
    // face: direction player faces while climbing (yaw); rails + rungs visual; ladder volume for climbing
    const dx = Math.sin(face), dz = Math.cos(face); const px = -dz * 0.25, pz = dx * 0.25;
    this.cyl('steel', x + px, y0, z + pz, 0.03, y1 - y0, 6); this.cyl('steel', x - px, y0, z - pz, 0.03, y1 - y0, 6);
    for (let y = y0 + 0.3; y < y1; y += 0.32) this.box('steel', x, y, z, Math.abs(dz) > 0.5 ? 0.5 : 0.04, 0.04, Math.abs(dz) > 0.5 ? 0.04 : 0.5, { collide: false });
    this.world.ladders.push({ min: new THREE.Vector3(x - 0.6, y0, z - 0.6), max: new THREE.Vector3(x + 0.6, y1 + 0.2, z + 0.6), top: y1, face });
  }
  stairs(x, y0, z, dir, width, rise, run = 0.32, step = 0.22, key = 'concrete') {
    // dir: 0=+z,1=+x,2=-z,3=-x ; builds solid steps going up from (x,y0,z)
    const n = Math.ceil(rise / step); const hs = rise / n;
    for (let i = 0; i < n; i++) {
      const o = i * run + run / 2; const xx = x + (dir === 1 ? o : dir === 3 ? -o : 0), zz = z + (dir === 0 ? o : dir === 2 ? -o : 0);
      const w = dir % 2 === 0 ? width : run, d = dir % 2 === 0 ? run : width;
      this.box(key, xx, y0, zz, w, hs * (i + 1), d, { mat: 'concrete' });
    }
  }
}
