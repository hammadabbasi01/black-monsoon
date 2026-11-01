import * as THREE from 'three';
import { building, crane, stall, boatHull, fence, tank, gangway, railing } from '../world/prefabs.js';
import { audio } from '../core/audio.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const PI = Math.PI;
const DECK = 7;

// ---------------------------------------------------------------- map
function isSea(x, z) {
  if (x > 78 && x < 100 && z < 216) return z > 220; // pier counts as land
  return z > 60 || x < -190;
}

function build(G, b) {
  const W = G.world; W.isSea = isSea; W.baseGround = () => 0;
  const R = rng(1337);
  // ground + quay
  b.box('asphalt', 0, -0.3, -50, 380, 0.3, 220, { collide: false });
  b.box('concrete', -160, -0.29, 5, 60, 0.3, 110, { collide: false });
  b.box('concrete', 0, -9, 60, 380, 9.15, 1.2, { mat: 'concrete' }); // south quay wall
  b.box('concrete', -190, -9, -50, 1.2, 9.15, 221, { mat: 'concrete' }); // west quay wall
  for (let x = -186; x < 186; x += 9) if (x < 76 || x > 102) b.cyl('darkMetal', x, 0.15, 58.8, 0.28, 0.5, 10, { collide: true, mat: 'metal' });
  for (let z = -150; z < 56; z += 9) b.cyl('darkMetal', -188.8, 0.15, z, 0.28, 0.5, 10, { collide: true, mat: 'metal' });
  // tyre fenders on quay faces
  for (let x = -180; x < 180; x += 14) b.box('rubber', x, -1.8, 60.75, 1.2, 1.6, 0.4, { collide: false });
  // perimeter walls (north / east) + distant backdrop blocks
  b.box('concreteDark', 0, 0, -161, 382, 5, 1, { mat: 'concrete' }); b.box('concreteDark', 190.5, 0, -50, 1, 5, 222, { mat: 'concrete' });
  for (let i = 0; i < 26; i++) { const x = -200 + i * 16 + R() * 6, h = 14 + R() * 30; building(b, x, -215 - R() * 30, x + 10 + R() * 6, -175, h, { wall: 'concreteDark', roof: false, windows: ['s'], windowGap: 3, lit: 0.25, windowY: 3 + R() * 8 }); }
  for (let i = 0; i < 8; i++) { const z = -150 + i * 26; building(b, 205 + R() * 10, z, 222 + R() * 10, z + 18, 10 + R() * 18, { wall: 'concreteDark', roof: false, windows: ['w'], windowGap: 3.5, lit: 0.3 }); }

  // ===== insertion: Anvil's boat at the west seawall
  boatHull(b, -192.6, -1.3, 30, 10, 3.4, 0, 'hull');
  b.ladder(-190.75, -1.6, 0.15, 33.5, -PI / 2);
  b.lamp(-188, 47, 7, 'warm', PI * 0.75, { intensity: 35 });

  // ===== zone A: fish market
  building(b, -182, -30, -170, -20, 4.5, { doors: [{ side: 's', at: 4, w: 1.6, h: 2.4 }], wall: 'corr', windows: ['n', 'e'], lit: 0.5 });
  building(b, -162, -33, -148, -21, 5, { doors: [{ side: 's', at: 6, w: 3, h: 3.2 }], wall: 'corr', windows: ['w'], lit: 0.3 });
  building(b, -142, -38, -126, -18, 6, { doors: [{ side: 'w', at: 8, w: 1.6, h: 2.4 }, { side: 's', at: 3, w: 4, h: 4 }], wall: 'panel', floor: 'floor', windows: ['n', 'e'], lit: 0.5 });
  for (let i = 0; i < 5; i++) stall(b, -178 + i * 7.5, 6, 0, i % 2 === 1);
  for (let i = 0; i < 4; i++) stall(b, -174 + i * 8, 22, PI, i % 2 === 0);
  const crates = [[-183, 40], [-182, 41.4], [-165, 36], [-163.6, 36.4], [-140, 44], [-131, 30], [-176, -8], [-158, -10], [-158.4, -11.5], [-137, 10]];
  for (const [x, z] of crates) b.crate(x, 0, z, 1.2 + R() * 0.3, 'wood', R() * 0.6);
  b.crate(-182.5, 1.2, 40.6, 1.1);
  for (const [x, z] of [[-172, 44], [-171.3, 44.8], [-145, 14], [-128, 46]]) b.barrel(x, 0, z, R() < 0.5 ? 'red' : 'steel');
  b.box('tarpBlue', -168, 0, 30, 6, 1.4, 3, { mat: 'wood' }); // tarp-covered cargo
  b.box('tarp', -138, 0, 30, 4, 1.8, 6, { mat: 'wood' });
  // fire barrel
  b.barrel(-150, 0, 33.2, 'darkMetal'); b.lights.push({ pos: V(-150, 1.6, 33.2), color: new THREE.Color(1, 0.45, 0.15), intensity: 30, dist: 16, prio: 4, fire: true });
  // fishing boats moored on the south quay
  boatHull(b, -172, -1.3, 67, 14, 4.2, PI / 2); boatHull(b, -146, -1.3, 66, 11, 3.6, PI / 2, 'hull'); boatHull(b, -120, -1.3, 67, 13, 4, PI / 2);
  for (const [x, z, d] of [[-178, 47, PI], [-158, 47, PI], [-138, 47, PI], [-172, -6, 0], [-148, -6, 0]]) b.lamp(x, z, 7.5, 'warm', d, { intensity: 38 });
  // fence between market and yard, gate near the tower
  fence(b, -120, -150, -120, -10); fence(b, -120, 2, -120, 56);

  // ===== zone B: watch tower
  const tx = -110, tz = 12;
  for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) b.box('steel', tx + dx, 0, tz + dz, 0.3, 8, 0.3, { mat: 'metal' });
  for (const y of [2.5, 5.2]) { b.box('steel', tx, y, tz - 2, 4.3, 0.12, 0.12, { collide: false }); b.box('steel', tx, y, tz + 2, 4.3, 0.12, 0.12, { collide: false }); }
  b.box('plank', tx, 7.8, tz, 5.2, 0.25, 5.2, { mat: 'wood' });
  b.box('corr', tx, 10.6, tz, 5.4, 0.2, 5.4, { collide: false });
  for (const [dx, dz] of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]) b.box('steel', tx + dx, 8, tz + dz, 0.1, 2.6, 0.1, { collide: false });
  railing(b, tx - 2.6, tz - 2.6, tx + 2.6, tz - 2.6, 8.05); railing(b, tx - 2.6, tz + 2.6, tx + 2.6, tz + 2.6, 8.05); railing(b, tx + 2.6, tz - 2.6, tx + 2.6, tz + 2.6, 8.05);
  b.ladder(tx - 2.75, 0, 8.05, tz + 1, -PI / 2);
  b.box('darkMetal', tx + 2, 8.05, tz, 0.6, 0.9, 0.6, { mat: 'metal' }); // searchlight base

  // ===== zone C: container yard
  for (let ci = 0; ci < 12; ci++) {
    const cx = -95 + ci * 8.2; if (Math.abs(cx - -46) < 4) continue; // main N-S lane
    for (const cz of [22, 0, -24, -46, -70, -92, -114]) {
      if (cz === -24 && ci % 3 !== 0) continue; // main E-W lane
      if (R() < 0.16) continue;
      const lv = 1 + Math.floor(R() * 3); const lv2 = Math.max(1, lv - (R() < 0.5 ? 1 : 0));
      for (let i = 0; i < lv; i++) b.container(cx - 1.25, i * 2.6, cz, 0, true);
      for (let i = 0; i < lv2; i++) b.container(cx + 1.25, i * 2.6, cz, 0, true);
    }
  }
  // loose short containers in lanes
  for (const [x, z, r] of [[-60, 11, 1.57], [-30, -12, 1.2], [-86, -35, 1.57], [-12, -58, 0.3], [-70, -81, 1.57]]) b.container(x, 0, z, r, false);
  crane(b, -46, 8, 22, 24, 0); crane(b, -46, -62, 22, 24, 0);
  for (const [x, z] of [[-72, -12], [-20, -12], [-72, -82], [-20, -82]]) { b.box('steel', x, 0, z, 0.6, 18, 0.6, { mat: 'metal' }); b.lamp(x, z, 18, 'cold', 0, { noPole: true, intensity: 140, dist: 48, glow: 4, pool: 18 }); b.box('darkMetal', x, 17.6, z, 2.4, 1, 0.6, { collide: false }); b.box('lampCold', x, 17.75, z + 0.32, 2.2, 0.7, 0.02, { collide: false }); }
  for (const [x, z, d] of [[-46, 34, 0], [-46, -36, 0], [-46, -100, 0], [-8, 34, 0]]) b.lamp(x + 2, z, 9, 'warm', -PI / 2, { intensity: 45 });
  building(b, -110, -60, -104, -54, 3, { doors: [{ side: 'e', at: 2, w: 1.4, h: 2.2 }], wall: 'panel', windows: ['n'], lit: 1 }); // guard hut

  // ===== zone D: harbor master's office (2 floors)
  const ox0 = 22, ox1 = 44, oz0 = -52, oz1 = -38;
  building(b, ox0, oz0, ox1, oz1, 8, { wall: 'panel', mat: 'concrete', roofMat: 'concreteDark', floor: 'floor', ceil: true, windows: ['n', 's', 'e'], lit: 0.6, windowY: 1.4, windowGap: 3.2,
    doors: [{ side: 's', at: 4, w: 1.8, h: 2.4 }, { side: 'w', at: 6.8, w: 2.0, h: 2.4, y: 4 }, { side: 'e', at: 5, w: 1.8, h: 2.4 }] });
  building(b, ox0, oz0, ox1, oz1, 8, { roof: false, noWalls: true, windows: ['n', 's', 'e'], lit: 0.5, windowY: 5.4, windowGap: 3.2 });
  b.box('floor', (ox0 + ox1) / 2, 3.7, (oz0 + oz1) / 2, ox1 - ox0, 0.3, oz1 - oz0, { mat: 'concrete' });
  // exterior stairs + landing on the west face
  b.stairs(20.1, 0, -36.2, 2, 2.2, 4, 0.3, 0.22, 'concrete');
  b.box('concrete', 20.1, 3.7, -43.9, 2.2, 0.3, 3.6, { mat: 'concrete' }); railing(b, 18.95, -36, 18.95, -45.7, 4); railing(b, 18.95, -45.7, 21.6, -45.7, 4);
  // upper floor partitions
  b.box('panel', 26.15, 4, -46.8, 7.7, 3.8, 0.2, { mat: 'concrete' }); b.box('panel', 34.4, 4, -46.8, 5.6, 3.8, 0.2, { mat: 'concrete' });
  b.box('panel', 37.2, 4, -48.4, 0.2, 3.8, 6.8, { mat: 'concrete' }); b.box('panel', 37.2, 4, -39.6, 0.2, 3.8, 2.8, { mat: 'concrete' });
  // desks, cabinets, terminal
  for (const [x, z] of [[26, -48.5], [30, -48.5], [26, -41], [31, -41]]) { b.box('wood', x, 4, z, 1.8, 0.75, 0.9, { mat: 'wood' }); b.box('screen', x, 4.75, z - 0.2, 0.5, 0.32, 0.03, { collide: false }); }
  b.box('darkMetal', 42.2, 4, -48, 1.4, 0.8, 2.2, { mat: 'metal' }); b.box('screen', 41.6, 4.8, -48, 0.04, 0.5, 0.8, { collide: false }); b.box('darkMetal', 43.5, 4, -50.6, 0.8, 2.1, 1.6, { mat: 'metal' });
  for (const [x, z] of [[24, -50.8], [28, -50.8], [35, -50.8]]) b.box('steel', x, 4, z, 1.0, 2.0, 0.6, { mat: 'metal' });
  for (const [x, z] of [[27, -46], [40, -44]]) b.lamp(x, z, 7.85, 'cold', 0, { noPole: true, intensity: 18, dist: 12, glow: 0.8, noCone: true, pool: 4, floor: 4 });
  b.lamp(33, -44, 3.85, 'cold', 0, { noPole: true, intensity: 18, dist: 14, glow: 0.8, noCone: true, pool: 5 });
  for (const [x, z] of [[24, -42], [24, -49], [40, -42]]) b.box('wood', x, 0, z, 1.8, 0.75, 0.9, { mat: 'wood' });
  b.lamp(18, -30, 8, 'warm', PI, { intensity: 40 }); b.lamp(48, -34, 8, 'warm', -PI / 2, { intensity: 40 });
  b.box('darkMetal', 52, 0, -42, 2.4, 2.2, 5, { mat: 'metal' }); b.box('darkMetal', 52, 0, -36.8, 2.4, 1.4, 1.6, { mat: 'metal' }); // parked van

  // ===== zone E: warehouse
  const wx0 = 58, wx1 = 108, wz0 = -48, wz1 = -16;
  building(b, wx0, wz0, wx1, wz1, 12, { wall: 'corr', roofMat: 'corr', floor: 'concrete', windows: ['n', 's'], windowY: 9.5, windowH: 1.6, lit: 0.35, windowGap: 5,
    doors: [{ side: 'w', at: 12, w: 8, h: 6 }, { side: 'e', at: 12, w: 8, h: 6 }, { side: 's', at: 6, w: 1.8, h: 2.5 }] });
  // parapet on roof
  for (const [x0, z0, x1, z1] of [[wx0, wz0, wx1, wz0], [wx0, wz1, wx1, wz1]]) b.box('concreteDark', (x0 + x1) / 2, 12.35, z0, x1 - x0, 0.9, 0.3, { mat: 'concrete' });
  for (const x of [wx0, wx1]) b.box('concreteDark', x, 12.35, (wz0 + wz1) / 2, 0.3, 0.9, wz1 - wz0, { mat: 'concrete' });
  b.box('steel', 92, 12.35, -30, 6, 2, 4, { mat: 'metal' }); b.box('steel', 74, 12.35, -36, 3, 1.4, 3, { mat: 'metal' }); // roof units
  b.ladder(100, 0, 12.35, -15.65, 0);
  // catwalk + stairs
  b.box('deck', 83, 4.8, -44.6, 46, 0.2, 2.6, { mat: 'metal' }); railing(b, 69, -43.25, 106, -43.25, 5);
  for (let x = 62; x < 106; x += 8) b.box('steel', x, 0, -43.5, 0.25, 4.8, 0.25, { mat: 'metal' });
  b.stairs(60.3, 0, -41.5, 1, 1.6, 5, 0.3, 0.22, 'steel'); b.box('deck', 67.9, 4.8, -42.9, 1.6, 0.2, 3.6, { mat: 'metal' });
  // interior props
  for (const [x, z, r, lv] of [[72, -24, 0, 2], [72, -34, 0, 1], [96, -22, 1.57, 2], [84, -38, 1.57, 1]]) for (let i = 0; i < lv; i++) b.container(x, i * 2.6, z, r, false);
  for (let rx = 0; rx < 3; rx++) { const x = 78 + rx * 7; b.box('steel', x, 0, -26, 5, 0.12, 1.2, { collide: false }); for (const y of [0, 2, 4]) { b.box('steel', x, y + 1.8, -26, 5, 0.12, 1.2, { mat: 'metal' }); b.crate(x - 1.4, y, -26, 1.1); b.crate(x + 1.2, y, -26, 1.0); } b.box(null, x, 0, -26, 5, 6, 1.2, { mat: 'metal', bullet: false }); }
  for (const [x, z] of [[64, -21], [65.3, -21.5], [102, -40], [103, -38.8], [90, -40], [76, -44]]) b.crate(x, 0, z, 1.2 + R() * 0.2);
  b.box('yellow', 88, 0, -32, 1.4, 1.4, 2.6, { mat: 'metal' }); b.box('yellow', 88, 1.4, -31.6, 1.3, 1.0, 1.4, { mat: 'metal' }); b.box('darkMetal', 88, 0.1, -33.6, 1.2, 0.08, 1.2, { collide: false }); // forklift
  for (const [x, z] of [[68, -30], [83, -30], [98, -30], [75, -22], [91, -22]]) b.lamp(x, z, 11.6, 'warm', 0, { noPole: true, intensity: 45, dist: 22, glow: 1.6, pool: 9, noCone: true });
  for (const [x, z] of [[68, -30], [83, -30], [98, -30], [75, -22], [91, -22]]) { b.box('darkMetal', x, 11.4, z, 0.9, 0.25, 0.9, { collide: false }); b.box('steel', x, 11.65, z, 0.03, 0.4, 0.03, { collide: false }); }
  // sniper crate on the roof
  b.box('tan', 95, 12.35, -19, 1.6, 0.5, 0.6, { collide: false }); b.box('darkMetal', 95, 12.85, -19, 1.5, 0.05, 0.5, { collide: false });
  // ===== lot between warehouse and pier
  for (const [x, z, r, lv] of [[70, 12, 0, 2], [104, 10, 1.57, 1], [112, 30, 0, 2], [66, 36, 1.57, 1], [118, -2, 0, 1]]) for (let i = 0; i < lv; i++) b.container(x, i * 2.6, z, r, true);
  const truck = (x, z, ry) => { b.box('darkMetal', x, 0.5, z, 2.5, 2.4, 7.5, { ry, mat: 'metal' }); b.box('red', x + Math.sin(ry) * 4.6, 0.5, z + Math.cos(ry) * 4.6, 2.5, 2.2, 2.2, { ry, mat: 'metal' }); b.box('glassLit', x + Math.sin(ry) * 5.75, 1.9, z + Math.cos(ry) * 5.75, 2.2, 0.7, 0.05, { ry, collide: false }); for (const s of [-1, 1]) for (const f of [-2.5, 2.5, 4.6]) b.cyl('rubber', x + Math.cos(ry) * s * 1.1 + Math.sin(ry) * f, 0.5, z - Math.sin(ry) * s * 1.1 + Math.cos(ry) * f, 0.5, 0.4, 12, { rz: PI / 2 }); };
  truck(84, 30, 0.2); truck(122, 44, -1.4); truck(60, 0, 1.57);
  for (const [x, z] of [[78, 22], [90, 14], [96, 40], [74, 44], [108, 50]]) b.box('concrete', x, 0, z, 3, 0.9, 0.7, { ry: R() * 0.4, mat: 'concrete' });
  tank(b, 140, 20, 6, 11); tank(b, 156, 4, 6, 11); tank(b, 140, -40, 7, 13);
  fence(b, 60, 52, 82, 52); fence(b, 96, 52, 160, 52);
  building(b, 97, 46, 101, 50, 3, { doors: [{ side: 'w', at: 1, w: 1.2, h: 2.2 }], wall: 'panel', windows: ['n', 's'], lit: 1 }); // gate booth
  b.box('yellow', 89, 1, 52, 13, 0.15, 0.15, { collide: false }); // boom barrier
  for (const [x, z, d] of [[64, 6, 0], [100, 2, PI], [80, 46, 0], [118, 34, PI], [62, -12, 0], [106, -12, PI]]) b.lamp(x, z, 9, 'warm', d + PI / 2, { intensity: 50 });

  // ===== zone F: pier 4
  b.box('concrete', 89, -0.6, 138, 22, 0.6, 156, { mat: 'concrete' });
  b.box('concreteDark', 89, -9, 138, 21.6, 8.4, 154, { mat: 'concrete', bullet: true });
  for (let z = 66; z < 214; z += 10) { b.cyl('darkMetal', 78.7, 0, z, 0.3, 0.55, 10, { collide: true, mat: 'metal' }); }
  for (let z = 70; z < 214; z += 22) b.lamp(98.5, z, 9, 'cold', -PI / 2, { intensity: 55 });
  for (const [z, lv] of [[100, 2], [125, 1], [170, 2], [190, 1]]) for (let i = 0; i < lv; i++) { b.container(95, i * 2.6, z, 0, true); }
  for (const [x, z] of [[84, 90], [85.4, 90.5], [92, 150], [86, 180], [86.3, 181.4]]) b.crate(x, 0, z, 1.3);
  crane(b, 89, 120, 18, 22, PI / 2);
  // ===== the ship: KESTREL DAWN
  const sx0 = 50, sx1 = 74, sz0 = 75, sz1 = 205;
  b.box('hull', sx0 + 0.3, -6, (sz0 + sz1) / 2, 0.6, 14, sz1 - sz0, { mat: 'metal' });
  b.box('hull', sx1 - 0.3, -6, (sz0 + sz1) / 2, 0.6, 13, sz1 - sz0, { mat: 'metal' });
  b.box('hull', sx1 - 0.3, DECK, (sz0 + 139.2) / 2, 0.6, 1, 139.2 - sz0, { mat: 'metal' }); b.box('hull', sx1 - 0.3, DECK, (140.8 + sz1) / 2, 0.6, 1, sz1 - 140.8, { mat: 'metal' });
  b.box('hull', 62, -6, sz0 + 0.3, 24, 14, 0.6, { mat: 'metal' });
  // bow (stepped)
  for (const [z0, z1, hw] of [[205, 210, 10], [210, 214, 7], [214, 217, 4], [217, 219, 1.6]]) { b.box('hull', 62 - hw - 0.3, -6, (z0 + z1) / 2, 0.6, 14, z1 - z0, { mat: 'metal' }); b.box('hull', 62 + hw + 0.3, -6, (z0 + z1) / 2, 0.6, 14, z1 - z0, { mat: 'metal' }); b.box('deck', 62, DECK - 0.4, (z0 + z1) / 2, hw * 2, 0.4, z1 - z0, { mat: 'metal' }); }
  b.box('hull', 62, -6, 219.2, 3.2, 14, 0.4, { mat: 'metal' });
  b.box('hullRed', 62, -6.2, 140, 24.4, 4.4, 146, { collide: false }); // red antifouling band below waterline
  // deck with hatch hole x 58..66, z 147.9..157.5
  b.box('deck', 62, DECK - 0.4, (sz0 + 147.9) / 2, 23, 0.4, 147.9 - sz0, { mat: 'metal' });
  b.box('deck', 62, DECK - 0.4, (157.5 + sz1) / 2, 23, 0.4, sz1 - 157.5, { mat: 'metal' });
  b.box('deck', 54.25, DECK - 0.4, 152.7, 7.5, 0.4, 9.6, { mat: 'metal' }); b.box('deck', 69.75, DECK - 0.4, 152.7, 7.5, 0.4, 9.6, { mat: 'metal' });
  b.box('yellow', 58 - 0.15, DECK, 152.7, 0.3, 0.5, 9.6, { mat: 'metal' }); b.box('yellow', 66 + 0.15, DECK, 152.7, 0.3, 0.5, 9.6, { mat: 'metal' }); b.box('yellow', 62, DECK, 157.65, 8.6, 0.5, 0.3, { mat: 'metal' });
  railing(b, 57.7, 148, 57.7, 157.5, DECK + 0.5); railing(b, 66.3, 148, 66.3, 157.5, DECK + 0.5);
  b.stairs(62, 0.6, 157.4, 2, 3, DECK - 0.6, 0.3, 0.22, 'steel');
  // hold floor + interior
  b.box('deck', 62, 0, 150, 22.8, 0.6, 110, { mat: 'metal' });
  b.box('hull', 62, 0.6, 95.2, 22.8, 6, 0.4, { mat: 'metal' }); // aft bulkhead of hold
  b.box('hull', 62, -6, 140, 22.8, 6, 130, { collide: false });
  for (const [x, z, lv] of [[54, 105, 2], [54, 122, 1], [54, 140, 2], [54, 170, 2], [54, 188, 1], [70, 104, 1], [70, 124, 2], [70, 168, 1], [70, 186, 2]]) for (let i = 0; i < lv; i++) b.container(x, 0.6 + i * 2.6, z, 0, true);
  for (const [x, z] of [[61, 132], [62.4, 132.6], [65, 176], [58, 196], [66, 110]]) b.crate(x, 0.6, z, 1.3);
  // the Monsoon cradle
  b.box('darkMetal', 62, 0.6, 116, 3.4, 0.3, 5.2, { mat: 'metal' }); for (const [dx, dz] of [[-1.6, -2.5], [1.6, -2.5], [-1.6, 2.5], [1.6, 2.5]]) b.box('steel', 62 + dx, 0.6, 116 + dz, 0.15, 2.4, 0.15, { collide: false });
  b.box('tan', 62 - 1.3, 0.9, 116, 0.5, 0.6, 4.4, { mat: 'wood' }); b.box('tan', 62 + 1.3, 0.9, 116, 0.5, 0.6, 4.4, { mat: 'wood' });
  for (const [x, z] of [[52, 110], [72, 130], [52, 150], [72, 175], [52, 196], [62, 98]]) b.lamp(x, z, 5.6, 'red', 0, { noPole: true, intensity: 26, dist: 16, glow: 1.4, noCone: true, pool: 5, floor: 0.6 });
  // superstructure
  b.box('white', 62, DECK, 86, 20, 12, 18, { mat: 'metal' }); b.box('white', 62, DECK + 12, 84, 24, 3, 8, { mat: 'metal' });
  for (const y of [DECK + 2, DECK + 6, DECK + 13]) b.box(y > 15 ? 'glassLit' : 'glassCold', 62, y, 95.05, 18, 1.1, 0.06, { collide: false });
  b.box('glassLit', 62, DECK + 13, 88.05, 22, 1.1, 0.06, { collide: false });
  b.box('red', 62, DECK + 15, 80, 5, 7, 4.5, { mat: 'metal' }); b.box('darkMetal', 62, DECK + 22, 80, 5.1, 0.6, 4.6, { collide: false });
  b.box('steel', 62, DECK + 15, 86, 0.2, 9, 0.2, { collide: false }); b.lamp(62, 86, DECK + 24.2, 'red', 0, { noPole: true, intensity: 0, glow: 1.2, noCone: true, pool: 0.01 });
  // deck cargo, cranes, lights
  for (const [x, z, lv] of [[54, 112, 2], [58, 112, 1], [70, 118, 2], [55, 130, 1], [68, 134, 1], [54, 170, 2], [70, 172, 1], [57, 186, 1], [66, 192, 2]]) for (let i = 0; i < lv; i++) b.container(x, DECK + i * 2.6, z, 0, true);
  for (const z of [104, 165]) { b.cyl('yellow', 62, DECK, z, 1.1, 4, 14, { collide: true, mat: 'metal' }); b.box('yellow', 62, DECK + 4, z + 6, 0.8, 0.8, 14, { collide: false }); }
  railing(b, 50.6, 96, 50.6, 204, DECK);
  for (const [x, z] of [[52, 100], [72, 100], [52, 140], [72, 128], [52, 180], [72, 182], [62, 202]]) b.lamp(x, z, DECK + 5, 'cold', 0, { noPole: true, intensity: 34, dist: 20, glow: 1.4, noCone: true, pool: 6, floor: DECK });
  for (const [x, z] of [[52, 100], [72, 100], [52, 140], [72, 128], [52, 180], [72, 182], [62, 202]]) b.box('steel', x, DECK, z, 0.12, 5, 0.12, { collide: false });
  gangway(b, 85.5, 140, 73.4, DECK);
  // Anvil's exfil boat west of the ship
  boatHull(b, 30, -1.3, 140, 10, 3.4, 0.3, 'hull');

  // ship name decal
  const c = document.createElement('canvas'); c.width = 1024; c.height = 160; const x = c.getContext('2d'); x.fillStyle = 'rgba(0,0,0,0)'; x.fillRect(0, 0, 1024, 160); x.fillStyle = '#e8e4da'; x.font = 'bold 110px Impact, Arial Narrow, sans-serif'; x.textAlign = 'center'; x.fillText('KESTREL DAWN', 512, 120);
  const nameTex = new THREE.CanvasTexture(c); nameTex.colorSpace = THREE.SRGBColorSpace;
  for (const [px, ry] of [[49.95, -PI / 2], [74.05, PI / 2]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.2), new THREE.MeshStandardMaterial({ map: nameTex, transparent: true, roughness: 0.7 })); m.position.set(px, 4.2, 196); m.rotation.y = ry; G.scene.add(m); }

  // tower searchlight beam (animated in update)
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 3.5, 34, 20, 1, true), new THREE.MeshBasicMaterial({ map: G.M.lampCold.map, color: new THREE.Color(0.12, 0.13, 0.14), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  beam.geometry.translate(0, -17, 0); const piv = new THREE.Group(); piv.position.set(tx + 2, 9.4, tz); piv.add(beam); beam.rotation.x = -PI / 2 + 0.35; G.scene.add(piv);
  const sl = new THREE.SpotLight(0xe8f2ff, 160, 70, 0.16, 0.4, 1.2); sl.position.copy(piv.position); G.scene.add(sl); G.scene.add(sl.target);
  G.m1 = { piv, sl, fireT: 0, shipFires: [] };
}

// ---------------------------------------------------------------- helpers
function enemy(S, x, y, z, o = {}) { return S.spawn({ team: 'enemy', pos: V(x, y, z), yaw: o.yaw ?? 0, state: o.patrol ? 'patrol' : o.state || 'idle', ...o }); }
function patrol(pts) { return pts.map((p) => ({ x: p[0], y: p[1] ?? 0, z: p[2] ?? p[1], wait: p[3] })); }
const P2 = (pts) => pts.map(([x, z, w]) => ({ x, y: 0, z, wait: w }));
function syncKill(G, killer, target, delay = 0.25) {
  setTimeout(() => { if (!target.alive) return; const d = target.pos.clone().sub(killer).normalize(); audio.play(killer.y > 20 ? 'whisperShot' : 'shotSup', target.pos, 0.8); target.hurt(999, d, 'ally', true); G.fx.blood(target.pos.clone().setY(target.pos.y + 1.6), d); }, delay * 1000);
}
function rogersTo(G, p, yaw, run = false) { const r = G.rogers; r.hold = p ? p.clone() : null; r.holdYaw = yaw; r.runAlways = run; }
function setLoud(G, on) { G.rogers.suppressed = !on; }

// ---------------------------------------------------------------- mission
export const M1 = {
  id: 'm1', num: '01', title: 'Quiet Harbor', place: 'Port Varnak', time: '02:14', weather: 'Rain, thunderstorm', length: '15–20 min',
  blurb: 'Night insertion into Port Varnak. Find the Kestrel Dawn, find Monsoon, burn the ship.',
  navBounds: [-190, -160, 190, 60], mapBounds: [-200, -165, 200, 225],
  atmosphere: { rain: 1, lightning: true, fogDensity: 0.0105, seaLevel: -1.4, hemi: 0.5, moon: 0.7 },
  build,
  reset(G) {
    const S = G.script(G.token);
    G.rogers = S.spawn({ team: 'ally', name: 'Rogers', tint: 0x8c9478, hat: 'boonie', god: true, pos: V(-192.4, -0.9, 30.6), yaw: PI });
    G.rogers.suppressed = true; G.rogers.killChance = 0.32;
    const cp = G.checkpoint; G.arsenal.owned.sniper = cp >= 6; if (cp >= 6) G.arsenal.give('sniper');
    G.arsenal.refill(); for (const k in G.arsenal.ammo) G.arsenal.ammo[k].mag = { rifle: 30, pistol: 15, sniper: 5 }[k] ?? G.arsenal.ammo[k].mag;
    G.arsenal.cur = cp === 6 ? 'sniper' : cp === 0 ? 'pistol' : 'rifle'; for (const k in G.arsenal.rigs) G.arsenal.rigs[k].visible = k === G.arsenal.cur;
    G.stealth = true; G._blownLine = false; G.m1.ending = false; G.m1.shipFires = []; G.m1.seg0 = null; G.m1.hold = null; G.m1.lot1 = null;
    audio.setAmbience(1, 0.6); audio.setMusic(1);
    G.onEnemyAlert = (a) => {
      if (G.stealth && !G._blownLine) { G._blownLine = true; G.hud.say([['rogers', "We're blown! Weapons free, Falcon!"]]); setLoud(G, true); }
    };
    G.onActorDeath = (a) => { if (a.pair && a.pair.alive) syncKill(G, a.pairKiller === 'whisper' ? V(-60, 30, -60) : G.rogers.pos.clone().setY(1.5), a.pair, 0.3); };
    G.onShootTag = (box, p) => { if (box.tag === 'tank' && !box.blown) { box.blown = true; G.combat.explode(p.clone(), 14, 400, 'player'); G.hud.popup('FUEL TANK', 'good'); for (let i = 0; i < 6; i++) setTimeout(() => G.fx.explosion(p.clone().add(V((Math.random() - 0.5) * 6, Math.random() * 6, (Math.random() - 0.5) * 6)), 1), i * 250); G.m1.shipFires.push({ pos: p.clone(), s: 3 }); } };
    G.surfaceAt = (p) => (p.y > 4.5 && p.x > 49 && p.x < 75) || (p.y > 0.4 && p.x > 49 && p.x < 75 && p.z > 95) || (p.y > 4.5 && p.x > 58 && p.x < 108 && p.z < -42) ? 'metal' : 'ground';
  },
  update(G, dt) {
    const m = G.m1; if (!m) return;
    // searchlight sweep
    const a = Math.sin(G.t * 0.35) * 0.9 + PI * 0.5 + 0.2; m.piv.rotation.y = a;
    const dir = V(0, -Math.sin(0.35), -Math.cos(0.35)).applyAxisAngle(V(0, 1, 0), a); m.sl.target.position.copy(m.piv.position).addScaledVector(dir, 30);
    m.sl.intensity = m.towerLive ? 160 : 0; m.piv.visible = !!m.towerLive;
    // fire barrel + burning things
    if (Math.random() < dt * 10) G.fx.fire(V(-150, 1.0, 33.2), 0.35, 0.6);
    for (const f of m.shipFires) if (Math.random() < dt * 14 * (f.s > 2 ? 1 : 0.5)) G.fx.fire(f.pos, f.s);
    for (const l of G.builder.lights) if (l.fire) l.intensity = 26 + Math.sin(G.t * 23) * 5 + Math.random() * 6;
    // music follows combat
    let combat = false; for (const e of G.actors.list) if (e.team === 'enemy' && e.alive && !e.dormant && e.state === 'combat') { combat = true; break; }
    const lvl = combat ? 2 : 1; if (lvl !== m.music) { m.music = lvl; audio.setMusic(lvl); }
    if (!combat && G.stealth && G._blownLine && !m.calmT) m.calmT = G.t;
  },
  segments: [
    // 0 ---------------------------------------------------- insertion
    { name: 'insertion', checkpoint: true,
      start(G) { G.player.spawn(V(-192.9, -0.9, 32.8), -PI / 2 - 0.3); G.m1.towerLive = true; },
      setup(G, S) {
        const s = G.m1.seg0 = {};
        s.sentry = enemy(S, -173, 0, 53.2, { yaw: PI, sleepy: true, look: 0.25 });
        s.p1 = enemy(S, -178, 0, 16, { patrol: P2([[-178, 16, 3], [-140, 16, 2], [-140, 0, 2], [-178, 0, 3]]), flashlight: true });
        s.p2 = enemy(S, -166, 0, -12, { patrol: P2([[-166, -12, 3], [-132, -12, 2], [-132, 4, 2]]) });
        s.f1 = enemy(S, -151.3, 0, 33.2, { yaw: -PI / 2, look: 0.15 }); s.f2 = enemy(S, -148.7, 0, 33.2, { yaw: PI / 2, look: 0.15 });
        s.f1.pair = s.f2; s.f2.pair = s.f1;
        s.p3 = enemy(S, -134, 0, 40, { patrol: P2([[-134, 40, 4], [-134, 24, 3]]) });
        s.t1 = enemy(S, -111, 8.05, 11, { yaw: PI / 2, look: 0.5, accuracy: 0.8 }); s.t2 = enemy(S, -109, 8.05, 13.2, { yaw: PI * 0.6, look: 0.4, accuracy: 0.8 });
        s.t1.pair = s.t2; s.t2.pair = s.t1; s.t1.pairKiller = s.t2.pairKiller = 'whisper';
        s.t1.onDeath = s.t2.onDeath = () => { if (!s.t1.alive && !s.t2.alive) G.m1.towerLive = false; };
        G.rogers.setPos(V(-192.4, -0.9, 30.6), PI); rogersTo(G, V(-192.4, -0.9, 30.6), -PI / 2 - 0.5);
      },
      async run(G, S) {
        G.player.disabled = true; G.hud.bars(true); G.hud.fade(true, 0.01); await S.wait(0.4); G.hud.fade(false, 2.5);
        G.hud.titleCard(['QUIET HARBOR', 'Port Varnak, Kestrel Strait', 'Sgt. Rahim "Falcon" Durrani', 'Task Force Ember', '02:14 — Day 1'], 9);
        audio.play('engine', null, 0.5);
        await S.talk([
          ['anvil', "Engine's cut. We drift the last fifty metres. Seawall ladder is dead ahead."],
          ['rogers', "Listen up, Falcon. Somewhere in this port is a ship called the Kestrel Dawn. Oracle thinks Monsoon is in her hold."],
          ['oracle', "Ember, Oracle. Thermal shows roughly forty Obsidian on the docks. They're expecting trouble, not you."],
          ['rogers', "Then we keep it that way. Suppressors on. Nobody fires a loud weapon until I say so."],
          ['whisper', "Whisper in position on the north crane. I've got eyes on the fish market. Say the word."],
          ['rogers', "Up the ladder. Quiet as a prayer."],
        ]);
        G.hud.fade(true, 0.35); await S.wait(0.4);
        rogersTo(G, V(-186, 0, 36), PI / 2); G.rogers.setPos(V(-188.6, 0, 35.2), -PI / 2);
        G.hud.fade(false, 0.6); G.hud.bars(false); G.player.disabled = false;
        S.obj('Climb the seawall', 'Ladder · hold forward to climb');
        await S.reach(V(-189, 0, 33.5), 2.2, 'Ladder');
      } },
    // 1 ---------------------------------------------------- sentry + market
    { name: 'market',
      async run(G, S) {
        const s = G.m1.seg0;
        S.obj('Take out the sentry on the quay', 'Knife him from behind · V / KNIFE');
        G.hud.marker(s.sentry.pos.clone().setY(1.8), 'Sentry');
        S.talkBg([['rogers', "One sentry on the water's edge. He's half asleep. Get behind him and use your knife."]]);
        await S.until(() => !s.sentry.alive); G.hud.marker(null);
        if (!G._blownLine) await S.talk([['rogers', 'Clean. Drag nothing, leave nothing. Move.']]);
        rogersTo(G, V(-160, 0, 40), PI / 2);
        S.obj('Clear the fish market', 'Two guards at the fire barrel · patrols on the stalls');
        S.talkBg([['rogers', "Two by the fire barrel. I'll take the one on the right when you drop yours. Your shot."], ['whisper', "Patrol with a torch working the stalls. He's on a loop, you'll see him coming."]]);
        const market = [s.p1, s.p2, s.f1, s.f2, s.p3];
        await S.until(() => market.every((a) => !a.alive) || (G.player.pos.x > -126));
        if (market.some((a) => a.alive)) { market.forEach((a) => a.alive && a.becomeAlert(G.player.pos)); await S.killAll(market); }
        await S.talk([['rogers', G._blownLine ? "That's the market. Everyone in this port heard us. Stay sharp." : "Market's clear. Nobody's raised a radio. Good work."]]);
      } },
    // 2 ---------------------------------------------------- tower
    { name: 'tower', checkpoint: true,
      start(G) { G.player.spawn(V(-138, 0, 20), -PI / 2); G.rogers.setPos(V(-136, 0, 23), -PI / 2); G.m1.towerLive = true; },
      setup(G, S) {
        if (!G.m1.seg0 || !G.m1.seg0.t1) { // started from this checkpoint
          const s = G.m1.seg0 = {};
          s.t1 = enemy(S, -111, 8.05, 11, { yaw: PI / 2, look: 0.5, accuracy: 0.8 }); s.t2 = enemy(S, -109, 8.05, 13.2, { yaw: PI * 0.6, look: 0.4, accuracy: 0.8 });
          s.t1.pair = s.t2; s.t2.pair = s.t1; s.t1.pairKiller = s.t2.pairKiller = 'whisper';
          s.t1.onDeath = s.t2.onDeath = () => { if (!s.t1.alive && !s.t2.alive) G.m1.towerLive = false; };
        }
        // container yard patrols
        const y = G.m1.yard = [];
        y.push(enemy(S, -90, 0, 30, { patrol: P2([[-90, 32, 2], [-50, 32, 2], [-50, 12, 2], [-90, 12, 3]]), flashlight: true, zone: 'yard' }));
        y.push(enemy(S, -46, 0, -10, { patrol: P2([[-46, -10, 3], [-46, -50, 3]]), flashlight: true, zone: 'yard' }));
        y.push(enemy(S, -20, 0, 10, { patrol: P2([[-20, 10, 2], [-20, -36, 2], [-6, -36, 2]]), flashlight: true, zone: 'yard' }));
        y.push(enemy(S, -70, 0, -24, { patrol: P2([[-75, -24, 2], [-15, -24, 3]]), flashlight: true, zone: 'yard' }));
        y.push(enemy(S, -58, 0, 33.5, { yaw: PI, zone: 'yard', look: 0.8 }));
        y.push(enemy(S, -8, 0, -12, { yaw: -PI / 2, zone: 'yard', look: 0.7 }));
        y.push(enemy(S, -104, 0, -52, { yaw: 0, zone: 'yard', look: 0.4 }));
        y.push(enemy(S, 6, 0, -30, { patrol: P2([[6, -30, 3], [6, -60, 3]]), zone: 'yard', flashlight: true }));
      },
      async run(G, S) {
        const s = G.m1.seg0; rogersTo(G, V(-123, 0, 18), -PI / 2);
        S.obj('Reach the yard gate', 'Watch the tower');
        await S.reach(V(-126, 0, 12), 5, 'Gate');
        if (s.t1.alive || s.t2.alive) {
          S.obj('Take out the tower guards with Whisper', 'You drop one, Whisper drops the other');
          await S.talk([['whisper', "Two on the tower. Left one's yours, right one's mine. I fire when you fire."]]);
          G.hud.marker(s.t1.pos.clone().setY(10.5), 'Tower');
          await S.until(() => !s.t1.alive || !s.t2.alive);
          await S.until(() => !s.t1.alive && !s.t2.alive); G.hud.marker(null);
          await S.talk([['whisper', 'Tower clear. Searchlight is dead. You owe me a coffee, Falcon.']]);
        }
        rogersTo(G, null);
      } },
    // 3 ---------------------------------------------------- container yard
    { name: 'yard',
      async run(G, S) {
        S.obj("Cross the container yard to the harbor master's office", 'Patrols with torches · stay in the shadows');
        S.talkBg([['rogers', "Container yard. Eight of them, torches, regular loops. Stay low and let them walk past you."], ['oracle', "Harbor master's office is the two-storey block on the east side. Their manifests are on a terminal upstairs."]]);
        await S.reach(V(18, 0, -37), 5, 'Office');
        await S.talk([['rogers', 'Stairs on the west face. Up you go, I\'ve got the door.']]);
      } },
    // 4 ---------------------------------------------------- office download + defend
    { name: 'office', checkpoint: true,
      start(G) { G.player.spawn(V(12, 0, -32), -PI / 2 - 0.4); G.rogers.setPos(V(10, 0, -30), -PI / 2); },
      setup(G, S) {
        const o = G.m1.office = {};
        o.in1 = enemy(S, 33, 4, -41.5, { yaw: 0, look: 0.6, zone: 'office' });
        o.wave1 = [[70, -60], [72, -56], [66, -64], [74, -66], [60, -70], [76, -58], [68, -52], [80, -62]].map(([x, z]) => enemy(S, x, 0, z, { dormant: true, zone: 'office', state: 'idle' }));
        o.wave2 = [[34, -70], [28, -72], [40, -74], [22, -68], [46, -66], [30, -80]].map(([x, z]) => enemy(S, x, 0, z, { dormant: true, zone: 'office' }));
      },
      async run(G, S) {
        const o = G.m1.office;
        rogersTo(G, V(20.2, 4, -44.2), PI / 2);
        S.obj('Get to the terminal upstairs', 'Exterior stairs, west side');
        await S.reach(V(20, 4, -44), 2.5, 'Stairs');
        await S.until(() => !o.in1.alive || G.player.pos.x > 30);
        S.obj('Download the shipping manifests', 'Hold USE at the terminal');
        await S.hold(V(41.2, 4, -48), 'Download manifests', 10, 2.0, (p) => G.hud.objSub(`Downloading… ${Math.floor(p * 100)}%`));
        G.stealth = false; setLoud(G, true);
        await S.talk([['oracle', "Got it. Manifests are coming through… Wait. Kestrel Dawn's cargo list has been edited in the last hour."], ['rogers', "Headlights. East road. Two trucks — they knew we were here."]]);
        audio.play('alarm', V(40, 6, -60), 1); audio.play('horn', V(70, 5, 140), 0.6);
        S.obj('Defend the office', 'Obsidian reinforcements from the east');
        G.alarm = true; o.wave1.forEach((a) => { a.activate(); a.becomeAlert(G.player.pos, false); });
        S.talkBg([['rogers', 'Windows! Use the windows! Frag out if they bunch up!']]);
        await S.until(() => o.wave1.filter((a) => a.alive).length <= 2);
        S.talkBg([['whisper', 'More coming from the north lot. Six, maybe seven.']]);
        o.wave2.forEach((a) => { a.activate(); a.becomeAlert(G.player.pos, false); });
        await S.killAll([...o.wave1, ...o.wave2]);
        await S.talk([['rogers', "That's the lot. The ship's past the warehouse. We go through it, not around it."]]);
      } },
    // 5 ---------------------------------------------------- warehouse
    { name: 'warehouse', checkpoint: true,
      start(G) { G.player.spawn(V(46, 0, -30), -PI / 2); G.rogers.setPos(V(48, 0, -27), -PI / 2); G.alarm = true; G.stealth = false; },
      setup(G, S) {
        const w = G.m1.ware = [];
        for (const [x, y, z, yaw] of [[70, 0, -28, PI / 2], [76, 0, -36, PI / 2], [82, 0, -22, PI / 2], [90, 4.8, -44.5, PI / 2], [100, 4.8, -44.5, PI / 2], [95, 0, -36, PI / 2], [104, 0, -24, PI / 2], [84, 2.6, -38, PI / 2], [101, 0, -40, PI / 2], [79, 0, -30, PI / 2]]) w.push(enemy(S, x, y, z, { yaw, zone: 'ware', look: 0.3 }));
      },
      async run(G, S) {
        S.obj('Push through the warehouse', 'West loading door');
        rogersTo(G, V(55, 0, -30), -PI / 2, true);
        await S.reach(V(56, 0, -32), 6, 'Warehouse');
        G.m1.ware.forEach((a) => a.becomeAlert(G.player.pos, false)); rogersTo(G, null);
        S.talkBg([['rogers', 'Catwalk! North side, up high!']]);
        await S.until(() => G.m1.ware.filter((a) => a.alive).length === 0 || G.player.pos.x > 104);
        await S.killAll(G.m1.ware);
        await S.talk([['whisper', "Falcon, I've lost my angle on the pier. Get on that warehouse roof — there's a long gun up there with your name on it."], ['rogers', 'Ladder on the south wall. I\'ll make for the pier gate, you cover me.']]);
        S.obj('Climb to the warehouse roof', 'Ladder on the south wall');
        await S.reach(V(100, 12.35, -17), 3, 'Ladder');
        S.obj('Take the sniper rifle', 'Hold USE');
        await S.hold(V(95, 12.35, -19), 'Take R-338 Longbow', 0.6, 2.2);
        G.arsenal.give('sniper'); G.arsenal.switchTo('sniper');
      } },
    // 6 ---------------------------------------------------- overwatch
    { name: 'overwatch', checkpoint: true,
      setup(G, S) {
        G.m1.lot1 = [[84, 8], [96, 14], [106, 4], [112, 18]].map(([x, z]) => enemy(S, x, 0, z, { dormant: true, zone: 'lot', accuracy: 0.6 }));
        G.m1.lot2 = [[96, 30], [108, 36], [116, 40], [90, 44]].map(([x, z]) => enemy(S, x, 0, z, { dormant: true, zone: 'lot', accuracy: 0.6 }));
        G.m1.lot3 = [[86, 60], [94, 66], [99, 48], [84, 76], [92, 86]].map(([x, z]) => enemy(S, x, 0, z, { dormant: true, zone: 'lot', accuracy: 0.6 }));
      },
      start(G) { G.player.spawn(V(96, 12.35, -18.5), PI); G.rogers.setPos(V(66, 0, -10), PI); G.alarm = true; G.stealth = false; },
      async run(G, S) {
        const r = G.rogers; const all = [...G.m1.lot1, ...G.m1.lot2, ...G.m1.lot3];
        const left = () => all.filter((a) => a.alive).length;
        S.obj('Cover Rogers to the pier gate', `Hostiles ${all.length - left()}/${all.length}`);
        const tick = setInterval(() => G.hud.objSub(`Hostiles ${all.length - left()}/${all.length} · hold breath while scoped`), 400);
        try {
          await S.talk([['rogers', 'Moving! Talk to me, Falcon!']]);
          r.passive = false; r.follow = false; rogersTo(G, V(72, 0, 14), PI, true); G.m1.lot1.forEach((a) => { a.activate(); a.becomeAlert(G.player.pos, false); a.shownOnMap = true; });
          S.talkBg([['whisper', 'Four behind the containers past the truck. Fuel tank to the east — if they get close to it…']]);
          await S.until(() => G.m1.lot1.every((a) => !a.alive));
          S.talkBg([['rogers', 'Next cover! Go!']]); rogersTo(G, V(80, 0, 34), PI, true);
          G.m1.lot2.forEach((a) => { a.activate(); a.becomeAlert(G.player.pos, false); a.shownOnMap = true; });
          await S.until(() => G.m1.lot2.every((a) => !a.alive));
          S.talkBg([['rogers', 'Gate! They\'re on the pier — clear me a path!']]); rogersTo(G, V(86, 0, 49), PI, true);
          G.m1.lot3.forEach((a) => { a.activate(); a.becomeAlert(G.player.pos, false); a.shownOnMap = true; });
          await S.until(() => G.m1.lot3.every((a) => !a.alive));
        } finally { clearInterval(tick); }
        await S.talk([['rogers', "Gate's ours. Get down here, Falcon. We board her together."]]);
        r.follow = true;
      } },
    // 7 ---------------------------------------------------- board the ship
    { name: 'pier',
      setup(G, S) {
        G.m1.pier = [[92, 100], [84, 118], [96, 150], [86, 170]].map(([x, z]) => enemy(S, x, 0, z, { yaw: 0, zone: 'pier', look: 0.6, flashlight: Math.random() < 0.5 }));
        G.m1.deck = [[60, DECK, 120], [68, DECK, 140], [56, DECK, 150], [64, DECK, 175], [58, DECK, 104], [70, DECK, 196]].map(([x, y, z]) => enemy(S, x, y, z, { yaw: PI / 2, zone: 'deck', look: 0.8 }));
        G.m1.hold = [[56, 0.6, 160], [68, 0.6, 150], [62, 0.6, 128], [58, 0.6, 112], [66, 0.6, 100], [62, 0.6, 186]].map(([x, y, z]) => enemy(S, x, y, z, { yaw: PI, zone: 'hold', look: 0.9, flashlight: true }));
      },
      async run(G, S) {
        S.obj('Board the Kestrel Dawn', 'Gangway, mid-pier');
        rogersTo(G, null); G.m1.pier.forEach((a) => a.becomeAlert(G.player.pos, false));
        await S.reach(V(80, 0, 140), 5, 'Gangway');
        G.m1.deck.forEach((a) => a.becomeAlert(G.player.pos, false));
        S.talkBg([['rogers', 'Up the gangway! Deck is crawling!']]);
        await S.reach(V(72, DECK, 140), 3, 'Deck');
        S.obj('Clear the deck', 'Containers make good cover');
        await S.until(() => G.m1.deck.filter((a) => a.alive).length === 0);
        await S.talk([['rogers', 'Hold hatch is mid-ship. Torch on, Falcon — it\'ll be dark down there.']]);
      } },
    // 8 ---------------------------------------------------- cargo hold
    { name: 'hold', checkpoint: true,
      start(G) { G.player.spawn(V(70, DECK, 145), PI); G.rogers.setPos(V(71, DECK, 142), PI); G.alarm = true; G.stealth = false; },
      setup(G, S) {
        if (!G.m1.hold || G.m1.hold.every((a) => !a.alive && a.root.parent == null)) G.m1.hold = [[56, 0.6, 160], [68, 0.6, 150], [62, 0.6, 128], [58, 0.6, 112], [66, 0.6, 100], [62, 0.6, 186]].map(([x, y, z]) => enemy(S, x, y, z, { yaw: PI, zone: 'hold', look: 0.9, flashlight: true }));
        G.m1.reinf = [[60, DECK, 150], [64, DECK, 160], [56, DECK, 140], [68, DECK, 170]].map(([x, y, z]) => enemy(S, x, y, z, { dormant: true, zone: 'deck' }));
        G.m1.exfil = [[58, DECK, 130], [66, DECK, 120], [54, DECK, 175], [70, DECK, 165]].map(([x, y, z]) => enemy(S, x, y, z, { dormant: true, zone: 'deck' }));
      },
      async run(G, S) {
        S.obj('Search the cargo hold for Monsoon', 'Hatch stairs · F / LIGHT for torch');
        rogersTo(G, V(62, DECK, 146), 0);
        await S.reach(V(62, 0.6, 152), 4, 'Hatch');
        G.m1.hold.forEach((a) => a.becomeAlert(G.player.pos, false));
        S.talkBg([['rogers', "Contact in the hold! I'm right behind you."]]); rogersTo(G, null);
        await S.reach(V(62, 0.6, 119.5), 3.5, 'Cradle');
        await S.killAll(G.m1.hold);
        await S.talk([
          ['falcon', "Rogers. The cradle's empty. Foam's still warm from the crate."],
          ['oracle', "…Ember, the edited manifest. Monsoon was transferred at sea six days ago. To a ship called the Sable Queen."],
          ['rogers', "Then where's the Sable Queen?"],
          ['oracle', "On the bottom. Varga scuttled her off Kesh Point. Whatever he hid aboard, he wanted it under forty metres of water."],
          ['varga', "Captain Rogers. You found an empty box. Take it home — it's all you'll ever find."],
          ['rogers', "That's Varga on their PA. Falcon — charges. We burn this ship and everything he left on it."],
        ]);
      } },
    // 9 ---------------------------------------------------- charges + exfil
    { name: 'charges',
      async run(G, S) {
        const pts = [V(62, 0.6, 96.4), V(51.6, 0.6, 131), V(72.3, 0.6, 178)];
        G.m1.reinf.forEach((a) => { a.activate(); });
        for (let i = 0; i < 3; i++) {
          S.obj('Plant the charges', `${i}/3 planted`);
          await S.hold(pts[i], 'Plant charge', 3, 2.2);
          audio.play('beep', pts[i], 1); const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), G.M.lampRed); lamp.position.copy(pts[i]).setY(1.2); G.scene.add(lamp);
          if (i === 0) { G.m1.reinf.forEach((a) => a.becomeAlert(G.player.pos, false)); S.talkBg([['rogers', 'Company on the hatch!']]); }
        }
        S.obj('Get off the ship!', 'Jump overboard on the west side · swim to Anvil');
        await S.talk([['anvil', "Charges are live on my board. You've got two minutes, then she goes up whether you're on her or not!"], ['rogers', "Over the west rail, Falcon! Jump! Anvil's in the water on that side!"]]);
        G.m1.exfil.forEach((a) => { a.activate(); a.becomeAlert(G.player.pos, false); });
        rogersTo(G, V(52, DECK, 150), -PI / 2, true); G.rogers.follow = false;
        let T = 120; G.hud.timer(T);
        const boat = V(30, -1.4, 140);
        await S.until(() => { T -= G.dt; G.hud.timer(Math.max(0, T)); if (G.player.swimming) G.hud.marker(boat, 'Anvil'); else G.hud.marker(V(50.5, DECK + 1, 150), 'Jump'); return T <= 0 || (G.player.pos.distanceTo(boat) < 6); });
        G.hud.timer(null); G.hud.marker(null);
        if (T <= 0) { for (const p of pts) G.fx.explosion(p.clone().setY(3), 2.5); G.player.god = false; G.player.hurt(9999); await S.wait(30); }
      } },
    // 10 --------------------------------------------------- ending
    { name: 'ending',
      async run(G, S) {
        G.player.disabled = true; G.player.hideGun = true; G.hud.bars(true); G.player.god = true;
        G.actors.list.forEach((a) => { if (a.team === 'enemy') a.alive && (a.state = 'idle'); });
        G.rogers.setPos(V(31, -0.9, 142.5), -PI / 2); G.rogers.hold = V(31, -0.9, 142.5); G.rogers.holdYaw = -PI / 2;
        G.player.swimming = false; G.player.spawn(V(29.5, -0.9, 139.2), -PI / 2 + 0.25); G.player.disabled = true; G.player.hideGun = true;
        await S.talk([['anvil', 'Got you! Hold on to something!']]);
        audio.play('engine', null, 0.7);
        const booms = [[62, 3, 97], [52, 4, 131], [72, 4, 178], [62, 9, 150], [62, 12, 86], [60, 9, 120], [64, 9, 190]];
        for (let i = 0; i < booms.length; i++) { await S.wait(i === 0 ? 0.5 : 0.35 + Math.random() * 0.4); const p = V(...booms[i]); G.fx.explosion(p, 2.5); G.shakeT = 0.6; G.m1.shipFires.push({ pos: p.clone().setY(DECK + 0.5), s: 2.5 }); }
        G.engine.grade.uniforms.flash.value = 0.25; setTimeout(() => (G.engine.grade.uniforms.flash.value = 0), 120);
        await S.talk([
          ['rogers', "That's one less ship in Varga's navy."],
          ['oracle', "Ember, Oracle. Sable Queen's last position is confirmed. Kesh Point, forty-two metres."],
          ['rogers', "Then we're going swimming. Get some sleep, Falcon. Tomorrow we go deep."],
        ]);
        await S.wait(1.5); G.hud.fade(true, 2.5); await S.wait(2.8);
      } },
  ],
};
