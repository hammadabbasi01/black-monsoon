import * as THREE from 'three';

// Axis-aligned collision world with a spatial hash, ray casts, capsule movement and a ground-level nav grid.
const CELL = 8;
export class World {
  constructor() {
    this.boxes = []; this.grid = new Map(); this.stamp = 0;
    this.seaLevel = -1.4; this.isSea = () => false; this.baseGround = () => 0;
    this.ladders = []; // {min,max,dir:Vector3 facing out}
    this.waterVolumes = []; // extra
  }
  key(i, j) { return i * 73856093 ^ j * 19349663; }
  addBox(min, max, opts = {}) {
    const b = { min: min.clone(), max: max.clone(), mat: opts.mat || 'concrete', bullet: opts.bullet !== false, nav: opts.nav !== false, solid: opts.solid !== false, id: this.boxes.length, tag: opts.tag, s: 0 };
    this.boxes.push(b);
    const i0 = Math.floor(min.x / CELL), i1 = Math.floor(max.x / CELL), j0 = Math.floor(min.z / CELL), j1 = Math.floor(max.z / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const k = this.key(i, j); let c = this.grid.get(k); if (!c) this.grid.set(k, (c = [])); c.push(b);
    }
    return b;
  }
  removeBox(b) { b.solid = false; b.bullet = false; }
  query(x0, z0, x1, z1, out = []) {
    out.length = 0; const s = ++this.stamp;
    const i0 = Math.floor(x0 / CELL), i1 = Math.floor(x1 / CELL), j0 = Math.floor(z0 / CELL), j1 = Math.floor(z1 / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const c = this.grid.get(this.key(i, j)); if (!c) continue;
      for (const b of c) if (b.s !== s) { b.s = s; out.push(b); }
    }
    return out;
  }

  // Ray vs boxes (slab test), walking the hash along the ray. Returns {t, point, normal, box} or null.
  raycast(o, d, maxD, filter = 'bullet') {
    let best = null, bestT = maxD; const s = ++this.stamp;
    const steps = Math.ceil(maxD / (CELL * 0.5));
    const inv = new THREE.Vector3(1 / d.x, 1 / d.y, 1 / d.z);
    let lastKey = null;
    for (let n = 0; n <= steps; n++) {
      const t0 = Math.min(maxD, n * CELL * 0.5);
      if (t0 > bestT + CELL) break;
      const px = o.x + d.x * t0, pz = o.z + d.z * t0;
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        const ci = Math.floor(px / CELL) + di, cj = Math.floor(pz / CELL) + dj; const k = this.key(ci, cj);
        const c = this.grid.get(k); if (!c) continue;
        for (const b of c) {
          if (b.s === s) continue; b.s = s;
          if (filter === 'bullet' ? !b.bullet : !b.solid) continue;
          let tmin = (b.min.x - o.x) * inv.x, tmax = (b.max.x - o.x) * inv.x; if (tmin > tmax) [tmin, tmax] = [tmax, tmin];
          let ty0 = (b.min.y - o.y) * inv.y, ty1 = (b.max.y - o.y) * inv.y; if (ty0 > ty1) [ty0, ty1] = [ty1, ty0];
          if (tmin > ty1 || ty0 > tmax) continue; tmin = Math.max(tmin, ty0); tmax = Math.min(tmax, ty1);
          let tz0 = (b.min.z - o.z) * inv.z, tz1 = (b.max.z - o.z) * inv.z; if (tz0 > tz1) [tz0, tz1] = [tz1, tz0];
          if (tmin > tz1 || tz0 > tmax) continue; tmin = Math.max(tmin, tz0); tmax = Math.min(tmax, tz1);
          if (tmax < 0) continue; const t = tmin < 0 ? 0 : tmin;
          if (t < bestT) { bestT = t; best = b; }
        }
      }
      lastKey = n;
    }
    // ground / sea floor plane
    if (d.y < -1e-4) {
      // approximate: land ground at 0 or water surface
      const tg = (0 - o.y) / d.y;
      if (tg > 0 && tg < bestT) {
        const gx = o.x + d.x * tg, gz = o.z + d.z * tg;
        if (!this.isSea(gx, gz)) { bestT = tg; best = { ground: true, mat: 'ground' }; }
        else { const tw = (this.seaLevel - o.y) / d.y; if (tw > 0 && tw < bestT) { bestT = tw; best = { water: true, mat: 'water' }; } }
      } else if (o.y > this.seaLevel) {
        const tw = (this.seaLevel - o.y) / d.y; if (tw > 0 && tw < bestT) { const gx = o.x + d.x * tw, gz = o.z + d.z * tw; if (this.isSea(gx, gz)) { bestT = tw; best = { water: true, mat: 'water' }; } }
      }
    }
    if (!best) return null;
    const point = o.clone().addScaledVector(d, bestT);
    const normal = new THREE.Vector3(0, 1, 0);
    if (best.min) {
      const e = 0.02; const b = best;
      if (Math.abs(point.x - b.min.x) < e) normal.set(-1, 0, 0); else if (Math.abs(point.x - b.max.x) < e) normal.set(1, 0, 0);
      else if (Math.abs(point.z - b.min.z) < e) normal.set(0, 0, -1); else if (Math.abs(point.z - b.max.z) < e) normal.set(0, 0, 1);
      else if (Math.abs(point.y - b.min.y) < e) normal.set(0, -1, 0);
    }
    return { t: bestT, point, normal, box: best };
  }
  lineClear(a, b) {
    const d = b.clone().sub(a); const l = d.length(); if (l < 0.01) return true; d.divideScalar(l);
    const h = this.raycast(a, d, l - 0.05); return !h || h.box.water;
  }

  // Highest walkable surface under (x,z) that is not above feet+step.
  ground(x, z, feet, r = 0.3, step = 0.55) {
    let g = this.isSea(x, z) ? -9 : this.baseGround(x, z);
    const c = this.query(x - r, z - r, x + r, z + r, this._q || (this._q = []));
    for (const b of c) {
      if (!b.solid) continue;
      if (x + r <= b.min.x || x - r >= b.max.x || z + r <= b.min.z || z - r >= b.max.z) continue;
      if (b.max.y <= feet + step && b.max.y > g) g = b.max.y;
    }
    return g;
  }
  ceiling(x, z, feet, r = 0.3) {
    let c0 = Infinity; const c = this.query(x - r, z - r, x + r, z + r, this._q2 || (this._q2 = []));
    for (const b of c) {
      if (!b.solid) continue; if (x + r <= b.min.x || x - r >= b.max.x || z + r <= b.min.z || z - r >= b.max.z) continue;
      if (b.min.y > feet + 0.1 && b.min.y < c0) c0 = b.min.y;
    }
    return c0;
  }
  // Move a vertical capsule (feet at pos.y) horizontally with sliding; boxes that are short enough are stepped over.
  slide(pos, dx, dz, r, h, step = 0.55) {
    const q = this._q3 || (this._q3 = []);
    const tryAxis = (ax, delta) => {
      if (delta === 0) return;
      const nx = ax === 0 ? pos.x + delta : pos.x, nz = ax === 1 ? pos.z + delta : pos.z;
      const c = this.query(nx - r - 0.1, nz - r - 0.1, nx + r + 0.1, nz + r + 0.1, q);
      let blocked = false;
      for (const b of c) {
        if (!b.solid) continue;
        if (nx + r <= b.min.x || nx - r >= b.max.x || nz + r <= b.min.z || nz - r >= b.max.z) continue;
        if (b.max.y <= pos.y + step || b.min.y >= pos.y + h) continue;
        blocked = true;
        if (ax === 0) pos.x = delta > 0 ? Math.min(nx, b.min.x - r - 0.001) : Math.max(nx, b.max.x + r + 0.001);
        else pos.z = delta > 0 ? Math.min(nz, b.min.z - r - 0.001) : Math.max(nz, b.max.z + r + 0.001);
        break;
      }
      if (!blocked) { if (ax === 0) pos.x = nx; else pos.z = nz; }
      return blocked;
    };
    // sub-step for large moves
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / (r * 0.8)));
    let hit = false;
    for (let i = 0; i < n; i++) { hit = tryAxis(0, dx / n) || hit; hit = tryAxis(1, dz / n) || hit; }
    return hit;
  }
  ladderAt(p) {
    for (const l of this.ladders) if (p.x > l.min.x && p.x < l.max.x && p.z > l.min.z && p.z < l.max.z && p.y > l.min.y - 0.2 && p.y < l.max.y) return l;
    return null;
  }

  // ---------- navigation grid (ground layer) ----------
  buildNav(x0, z0, x1, z1, cell = 1.5) {
    const w = Math.ceil((x1 - x0) / cell), h = Math.ceil((z1 - z0) / cell);
    const g = new Uint8Array(w * h); const q = [];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const x = x0 + (i + 0.5) * cell, z = z0 + (j + 0.5) * cell;
      if (this.isSea(x, z)) continue;
      let ok = 1; const rr = 0.45;
      for (const b of this.query(x - cell / 2 - rr, z - cell / 2 - rr, x + cell / 2 + rr, z + cell / 2 + rr, q)) {
        if (!b.solid || !b.nav) continue;
        if (x + rr <= b.min.x || x - rr >= b.max.x || z + rr <= b.min.z || z - rr >= b.max.z) continue;
        if (b.max.y > 0.55 && b.min.y < 1.6) { ok = 0; break; }
      }
      g[j * w + i] = ok;
    }
    this.nav = { x0, z0, cell, w, h, g };
  }
  navOk(x, z) { const n = this.nav; if (!n) return false; const i = Math.floor((x - n.x0) / n.cell), j = Math.floor((z - n.z0) / n.cell); return i >= 0 && j >= 0 && i < n.w && j < n.h && n.g[j * n.w + i] === 1; }
  findPath(ax, az, bx, bz, maxNodes = 6000) {
    const n = this.nav; if (!n) return null;
    const ci = (x) => Math.floor((x - n.x0) / n.cell), cj = (z) => Math.floor((z - n.z0) / n.cell);
    let si = ci(ax), sj = cj(az), ti = ci(bx), tj = cj(bz);
    const inb = (i, j) => i >= 0 && j >= 0 && i < n.w && j < n.h;
    const near = (i, j) => { if (inb(i, j) && n.g[j * n.w + i]) return [i, j]; for (let r = 1; r < 4; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (inb(i + di, j + dj) && n.g[(j + dj) * n.w + i + di]) return [i + di, j + dj]; return null; };
    const s = near(si, sj), t = near(ti, tj); if (!s || !t) return null;
    [si, sj] = s; [ti, tj] = t;
    const W = n.w; const start = sj * W + si, goal = tj * W + ti;
    const gS = new Map(), came = new Map(); const open = [[0, start]]; gS.set(start, 0);
    const hh = (k) => { const i = k % W, j = (k / W) | 0; const dx = Math.abs(i - ti), dy = Math.abs(j - tj); return dx + dy - 0.6 * Math.min(dx, dy); };
    let count = 0; let found = false;
    while (open.length && count++ < maxNodes) {
      // binary-heap-lite: pop min
      let mi = 0; for (let k = 1; k < open.length; k++) if (open[k][0] < open[mi][0]) mi = k;
      const [, cur] = open[mi]; open[mi] = open[open.length - 1]; open.pop();
      if (cur === goal) { found = true; break; }
      const ci0 = cur % W, cj0 = (cur / W) | 0; const gc = gS.get(cur);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue; const i = ci0 + di, j = cj0 + dj; if (!inb(i, j) || !n.g[j * W + i]) continue;
        if (di && dj && (!n.g[cj0 * W + i] || !n.g[j * W + ci0])) continue;
        const k = j * W + i; const ng = gc + (di && dj ? 1.414 : 1);
        if (ng < (gS.has(k) ? gS.get(k) : Infinity)) { gS.set(k, ng); came.set(k, cur); open.push([ng + hh(k), k]); }
      }
    }
    if (!found) return null;
    const pts = []; let k = goal;
    while (k !== undefined && k !== start) { pts.push(new THREE.Vector3(n.x0 + ((k % W) + 0.5) * n.cell, 0, n.z0 + (((k / W) | 0) + 0.5) * n.cell)); k = came.get(k); }
    pts.reverse();
    // string-pull: drop points with clear straight line
    const out = []; let a = new THREE.Vector3(ax, 0, az);
    for (let i = 0; i < pts.length; i++) {
      if (i === pts.length - 1 || !this._navLine(a, pts[i + 1])) { out.push(pts[i]); a = pts[i]; }
    }
    return out;
  }
  _navLine(a, b) {
    const d = Math.hypot(b.x - a.x, b.z - a.z); const st = Math.ceil(d / (this.nav.cell * 0.5));
    for (let i = 1; i < st; i++) { const t = i / st; if (!this.navOk(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false; }
    return true;
  }
}
