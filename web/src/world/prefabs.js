import * as THREE from 'three';

// Reusable level pieces built from boxes. All functions take the Builder `b`.

// Hollow building with door openings, optional upper floor and lit windows.
// doors: [{side:'n'|'s'|'e'|'w', at: offset along wall from min corner, w, h, y}]
export function building(b, x0, z0, x1, z1, h, o = {}) {
  const t = o.t ?? 0.3, wall = o.wall || 'corr', y = o.y ?? 0;
  const doors = o.doors || [];
  const side = (s, ax0, ax1, fixed, horizontal) => {
    // wall split around door gaps
    const ds = doors.filter((d) => d.side === s).sort((a, b2) => a.at - b2.at);
    let cur = ax0;
    const seg = (a, c, yb, hh) => { if (c - a < 0.05 || hh < 0.05) return; if (horizontal) b.box(wall, (a + c) / 2, yb, fixed, c - a, hh, t, { mat: o.mat || 'metal' }); else b.box(wall, fixed, yb, (a + c) / 2, t, hh, c - a, { mat: o.mat || 'metal' }); };
    for (const d of ds) {
      const a = ax0 + d.at, c = a + d.w, dy = d.y ?? 0;
      seg(cur, a, y, h); seg(a, c, y + dy + d.h, h - dy - d.h); if (dy > 0) seg(a, c, y, dy); cur = c;
    }
    seg(cur, ax1, y, h);
  };
  if (!o.noWalls) {
    side('n', x0, x1, z0 + t / 2, true); side('s', x0, x1, z1 - t / 2, true);
  side('w', z0 + t, z1 - t, x0 + t / 2, false); side('e', z0 + t, z1 - t, x1 - t / 2, false);
  }
  if (o.roof !== false) b.box(o.roofMat || 'concreteDark', (x0 + x1) / 2, y + h, (z0 + z1) / 2, x1 - x0 + 0.6, 0.35, z1 - z0 + 0.6, { mat: 'concrete' });
  if (o.floor) b.box(o.floor, (x0 + x1) / 2, y, (z0 + z1) / 2, x1 - x0 - 0.1, 0.06, z1 - z0 - 0.1, { mat: 'concrete' });
  if (o.ceil) b.box('ceil', (x0 + x1) / 2, y + h - 0.05, (z0 + z1) / 2, x1 - x0 - 0.2, 0.05, z1 - z0 - 0.2, { collide: false });
  // windows: emissive panes stuck on the outside of long walls
  if (o.windows) {
    const wy = y + (o.windowY ?? h * 0.55), wh = o.windowH ?? 1.1;
    for (const s of o.windows) {
      const horiz = s === 'n' || s === 's'; const L = horiz ? x1 - x0 : z1 - z0; const n = Math.floor(L / (o.windowGap ?? 4));
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) * (L / n); const lit = Math.random() < (o.lit ?? 0.4); const key = lit ? (Math.random() < 0.7 ? 'glassLit' : 'glassCold') : 'glassDark';
        if (horiz) b.box(key, x0 + u, wy, s === 'n' ? z0 - 0.03 : z1 + 0.03, 1.4, wh, 0.06, { collide: false });
        else b.box(key, s === 'w' ? x0 - 0.03 : x1 + 0.03, wy, z0 + u, 0.06, wh, 1.4, { collide: false });
      }
    }
  }
}

export function crane(b, x, z, span = 30, h = 26, ry = 0) {
  // gantry crane straddling a lane along local z (legs at ±span/2 on x)
  const c = Math.cos(ry), s = Math.sin(ry); const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  for (const lx of [-span / 2, span / 2]) for (const lz of [-5, 5]) { const [px, pz] = P(lx, lz); b.box('yellow', px, 0, pz, 1.2, h, 1.2, { mat: 'metal' }); }
  for (const lx of [-span / 2, span / 2]) { const [px, pz] = P(lx, 0); b.box('yellow', px, h - 2, pz, 1.4, 1.4, 12, { ry, mat: 'metal' }); b.box('yellow', px, 1, pz, 1.6, 1.2, 12, { ry, mat: 'metal' }); }
  for (const lz of [-4, 4]) { const [px, pz] = P(0, lz); b.box('yellow', px, h, pz, span + 8, 1.6, 1.4, { ry, mat: 'metal' }); }
  const [cx, cz] = P(span * 0.15, 0); b.box('white', cx, h - 2.8, cz, 4, 2.6, 5, { ry, mat: 'metal' }); b.box('glassLit', cx + 0.2, h - 2.2, cz, 4.1, 1, 4, { ry, collide: false });
  b.box('darkMetal', cx, h - 12, cz, 0.08, 9, 0.08, { collide: false }); b.box('darkMetal', cx, h - 13, cz, 2.4, 0.5, 6, { ry, collide: false });
  b.lamp(P(-span / 2, 0)[0], P(-span / 2, 0)[1], h + 1, 'red', 0, { noPole: true, intensity: 0, glow: 1.6, noCone: true, pool: 0.01 });
}

export function container2(b, x, z, ry, levels = 1, long = true) { for (let i = 0; i < levels; i++) b.container(x, i * 2.6, z, ry, long); }

export function stall(b, x, z, ry = 0, blue = false) {
  const c = Math.cos(ry), s = Math.sin(ry); const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  for (const [lx, lz] of [[-1.6, -1], [1.6, -1], [-1.6, 1], [1.6, 1]]) { const [px, pz] = P(lx, lz); b.cyl('steel', px, 0, pz, 0.04, 2.3, 6); }
  b.box(blue ? 'tarpBlue' : 'tarp', x, 2.3, z, 3.6, 0.06, 2.4, { ry, collide: false });
  b.box('wood', x, 0, z, 3.0, 0.9, 1.2, { ry, mat: 'wood' });
}

export function boatHull(b, x, y, z, len = 10, w = 3.4, ry = 0, key = 'hullRed') {
  // simple small boat: tapered stack of boxes
  b.box(key, x, y - 1.2, z, w, 1.6, len * 0.75, { ry, mat: 'metal' });
  const c = Math.cos(ry), s = Math.sin(ry); const bx = x + Math.sin(ry) * len * 0.42, bz = z + Math.cos(ry) * len * 0.42;
  b.box(key, bx, y - 1.0, bz, w * 0.6, 1.4, len * 0.18, { ry, mat: 'metal' });
  b.box('white', x - Math.sin(ry) * len * 0.15, y + 0.4, z - Math.cos(ry) * len * 0.15, w * 0.7, 1.6, len * 0.28, { ry, mat: 'metal' });
  b.box('glassLit', x - Math.sin(ry) * len * 0.15, y + 1.2, z - Math.cos(ry) * len * 0.15, w * 0.72, 0.4, len * 0.2, { ry, collide: false });
}

export function fence(b, x0, z0, x1, z1, h = 2.4) {
  const L = Math.hypot(x1 - x0, z1 - z0); const n = Math.ceil(L / 3); const ry = Math.atan2(x1 - x0, z1 - z0);
  for (let i = 0; i <= n; i++) { const t = i / n; b.cyl('steel', x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t, 0.04, h, 6); }
  // mesh panel: visual thin box; collider (bullets pass)
  b.box('darkMetal', (x0 + x1) / 2, h - 0.05, (z0 + z1) / 2, 0.05, 0.05, L, { ry, collide: false });
  b.box(null, (x0 + x1) / 2, 0, (z0 + z1) / 2, 0.1, h, L, { ry, bullet: false, mat: 'metal' });
  b.add('fenceMesh', (() => { const g = new THREE.PlaneGeometry(L, h); g.rotateY(ry + Math.PI / 2); g.translate((x0 + x1) / 2, h / 2, (z0 + z1) / 2); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L, uv.getY(i) * h); return g; })());
}

export function tank(b, x, z, r = 7, h = 12) {
  b.cyl('white', x, 0, z, r, h, 28, { collide: true, mat: 'metal', tag: 'tank' });
  b.cyl('steel', x, h, z, r * 0.98, 0.6, 28, { r2: r * 0.6 });
  b.ladder(x + r + 0.15, 0, h, z, -Math.PI / 2);
}

export function gangway(b, x0, z, x1, y1, w = 1.6) {
  // steps going from (x0,0,z) to (x1,y1,z), thin treads with railings
  const L = Math.abs(x1 - x0), n = Math.ceil(y1 / 0.22), run = L / n, dir = Math.sign(x1 - x0);
  for (let i = 0; i < n; i++) { const x = x0 + dir * (i + 0.5) * run; const top = (i + 1) * (y1 / n); b.box('steel', x, top - 0.12, z, run + 0.02, 0.12, w, { mat: 'metal' }); b.box(null, x, top - 0.6, z, run, 0.48, w, { mat: 'metal' }); }
  const ry = Math.atan2(0, dir); const len = Math.hypot(L, y1); const ang = Math.atan2(y1, L);
  for (const off of [-w / 2, w / 2]) { const g = new THREE.BoxGeometry(len, 0.05, 0.05); g.rotateZ(ang * dir); g.translate((x0 + x1) / 2, y1 / 2 + 1.0, z + off); b.add('steel', g); }
}

export function railing(b, x0, z0, x1, z1, y, h = 1.05) {
  const L = Math.hypot(x1 - x0, z1 - z0); const ry = Math.atan2(x1 - x0, z1 - z0);
  b.box('steel', (x0 + x1) / 2, y + h, (z0 + z1) / 2, 0.06, 0.06, L, { ry, collide: false });
  b.box('steel', (x0 + x1) / 2, y + h * 0.5, (z0 + z1) / 2, 0.04, 0.04, L, { ry, collide: false });
  const n = Math.ceil(L / 2); for (let i = 0; i <= n; i++) { const t = i / n; b.box('steel', x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t, 0.05, h, 0.05, { collide: false }); }
  b.box(null, (x0 + x1) / 2, y, (z0 + z1) / 2, 0.1, h, L, { ry, bullet: false, mat: 'metal', nav: false });
}
