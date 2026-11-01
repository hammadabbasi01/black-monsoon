import { audio } from '../core/audio.js';

// Act 1 opening: an intelligence briefing rendered as animated 2D "intel screens" with voice-over,
// in the spirit of a military-shooter mission briefing.
export const ACT1_INTRO = [
  { scene: 'boot', who: 'oracle', text: 'Captain Rogers. Seventy-two hours ago a Navy convoy was hit in the Kestrel Strait. Three sailors dead. One container missing.' },
  { scene: 'map', who: 'rogers', text: 'What was in the container, Major?' },
  { scene: 'weapon', who: 'oracle', text: 'A prototype. Codename MONSOON. An electromagnetic warhead small enough to fit in a shipping crate.' },
  { scene: 'weapon', who: 'oracle', text: 'Detonate it over a port city and every light, every hospital, every aircraft in the sky goes dark. Permanently.' },
  { scene: 'obsidian', who: 'oracle', text: 'The people who took it call themselves the Obsidian Group. Ex-special forces, mercenaries. Money from everyone, loyalty to no one.' },
  { scene: 'varga', who: 'oracle', text: 'Their commander is Anton Varga.' },
  { scene: 'varga', who: 'rogers', text: 'Varga. I watched a building fall on him in Sevastopol.' },
  { scene: 'varga2', who: 'oracle', text: "Then he walked out of it. Last night we intercepted Obsidian radio traffic. A cargo ship, the Kestrel Dawn, docked at Port Varnak." },
  { scene: 'sat', who: 'oracle', text: 'If Monsoon is on that ship, it sails at dawn. After that, we lose it.' },
  { scene: 'sat', who: 'rogers', text: "Then we go in before the sun comes up." },
  { scene: 'sat2', who: 'oracle', text: "Quietly, Captain. Varnak is neutral territory. No flags, no records. If you're caught, you were never there." },
  { scene: 'team', who: 'rogers', text: 'Falcon. You heard the Major. We go in wet, we go in quiet. Whisper takes the high ground, Anvil drives the boat.' },
  { scene: 'team', who: 'rogers', text: "Find the warhead. Find where it's going. And burn that ship to the waterline." },
  { scene: 'team2', who: 'rogers', text: "Varga thinks he's started a war nobody will see coming. We're the ones who see it." },
  { scene: 'title', who: null, text: '' },
];

export class Intel {
  constructor() {
    this.el = document.getElementById('intel'); this.cv = document.getElementById('intelCv'); this.x = this.cv.getContext('2d');
    this.sub = document.getElementById('intelSub'); this.title = document.getElementById('intelTitle'); this.hr = document.getElementById('intelR');
    document.getElementById('intelSkip').addEventListener('click', () => this.finish());
    this.sat = null; this.raf = 0;
    // fictional coastline
    this.coast = []; let y = 0.5; for (let i = 0; i <= 120; i++) { y += (Math.sin(i * 0.37) * 0.012 + Math.sin(i * 1.3) * 0.006 + (Math.random() - 0.5) * 0.01); this.coast.push([i / 120, Math.min(0.8, Math.max(0.25, y))]); }
    this.islands = Array.from({ length: 9 }, () => [0.15 + Math.random() * 0.75, 0.6 + Math.random() * 0.3, 0.008 + Math.random() * 0.02]);
  }
  play(lines, onDone) {
    this.lines = lines; this.i = -1; this.onDone = onDone; this.el.hidden = false; this.title.style.opacity = 0; this.t0 = performance.now(); this.done = false;
    const resize = () => { this.cv.width = innerWidth * Math.min(2, devicePixelRatio || 1); this.cv.height = innerHeight * Math.min(2, devicePixelRatio || 1); };
    resize(); this._rs = resize; addEventListener('resize', resize);
    this.next();
    const loop = () => { this.draw(); if (!this.done) this.raf = requestAnimationFrame(loop); };
    loop();
  }
  next() {
    clearTimeout(this.tm); this.i++;
    if (this.i >= this.lines.length) { this.finish(); return; }
    const L = this.lines[this.i]; this.sceneT = performance.now(); this.scene = L.scene;
    if (L.scene === 'title') { this.sub.innerHTML = ''; this.title.style.opacity = 1; audio.play('boom', null, 0.35); this.tm = setTimeout(() => this.next(), 4200); return; }
    const name = { oracle: 'MAJ. SANA MIRZA · ORACLE', rogers: 'CAPT. ELIAS ROGERS' }[L.who] || '';
    this.sub.innerHTML = `<b>${name}</b>${L.text}`; audio.play('radio'); audio.say(L.who, L.text);
    const dur = Math.max(3.4, L.text.length * 0.068) * 1000; this.tm = setTimeout(() => this.next(), dur);
  }
  finish() {
    if (this.done) return; this.done = true; clearTimeout(this.tm); cancelAnimationFrame(this.raf); audio.hush(); removeEventListener('resize', this._rs);
    this.el.hidden = true; this.onDone && this.onDone();
  }
  draw() {
    const c = this.cv, x = this.x, W = c.width, H = c.height, t = (performance.now() - this.t0) / 1000, st = (performance.now() - this.sceneT) / 1000;
    const g = (a) => `rgba(127,224,192,${a})`, o = (a) => `rgba(255,107,44,${a})`;
    x.fillStyle = '#020405'; x.fillRect(0, 0, W, H);
    const u = Math.min(W, H); x.lineWidth = Math.max(1, u / 700);
    // grid
    x.strokeStyle = g(0.07); for (let i = 0; i < W; i += u / 14) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } for (let j = 0; j < H; j += u / 14) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); }
    this.hr.textContent = `${new Date().toISOString().slice(0, 10)} · 23:${String(14 + Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')} ZULU`;
    const font = (s, f = 'Share Tech Mono') => (x.font = `${s * u / 100}px "${f}", monospace`);
    const typed = (s, rate = 40) => s.slice(0, Math.floor(st * rate));
    const sc = this.scene; const cx = W / 2, cy = H * 0.44;
    const ease = (k) => 1 - Math.pow(1 - Math.min(1, k), 3);
    if (sc === 'boot') {
      font(2.4); x.fillStyle = g(0.9); x.textAlign = 'left';
      const L = ['> ESTABLISHING SECURE LINK ... OK', '> AUTH: TF-EMBER / ROGERS, E.', '> SOURCE: DEFENCE INTELLIGENCE · ORACLE', '> SUBJECT: KESTREL STRAIT INCIDENT', '> CLASSIFICATION: TOP SECRET // NOFORN'];
      L.forEach((l, i) => x.fillText(typed(l, 45).slice(0, Math.max(0, Math.floor(st * 45) - i * 18)), W * 0.12, H * 0.24 + i * u * 0.05));
      if (Math.floor(st * 30) % 3 === 0 && st < 4) audio.play('type', null, 0.4);
    }
    if (sc === 'map' || sc === 'boot') {
      const a = sc === 'map' ? ease(st / 1.2) : 0.15;
      x.save(); x.globalAlpha = a; x.strokeStyle = g(0.8); x.beginPath();
      this.coast.forEach(([px, py], i) => { const X = W * 0.08 + px * W * 0.84, Y = H * 0.1 + py * H * 0.5; i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.stroke();
      x.fillStyle = g(0.06); x.lineTo(W * 0.92, H * 0.05); x.lineTo(W * 0.08, H * 0.05); x.fill();
      this.islands.forEach(([px, py, r]) => { x.beginPath(); x.arc(W * 0.08 + px * W * 0.84, H * 0.1 + py * H * 0.5, r * u, 0, 7); x.stroke(); });
      if (sc === 'map') {
        // convoy route + strike point
        x.strokeStyle = o(0.9); x.setLineDash([u * 0.01, u * 0.008]); x.beginPath(); const k = ease(st / 3);
        const pts = [[0.1, 0.75], [0.3, 0.7], [0.48, 0.62], [0.58, 0.56]]; x.moveTo(W * pts[0][0], H * pts[0][1]);
        for (let i = 1; i < pts.length; i++) { const f = Math.min(1, Math.max(0, k * 3 - (i - 1))); x.lineTo(W * (pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f), H * (pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f)); }
        x.stroke(); x.setLineDash([]);
        if (st > 2.6) { const X = W * 0.58, Y = H * 0.56, r = u * (0.02 + Math.sin(t * 6) * 0.004); x.strokeStyle = o(1); x.beginPath(); x.moveTo(X - r, Y - r); x.lineTo(X + r, Y + r); x.moveTo(X + r, Y - r); x.lineTo(X - r, Y + r); x.stroke(); x.beginPath(); x.arc(X, Y, r * 2.2, 0, 7); x.stroke(); font(1.8); x.fillStyle = o(1); x.fillText('CONVOY 7 · LOST CONTACT 03:41Z', X + r * 3, Y - r); }
        font(1.6); x.fillStyle = g(0.8); x.fillText('KESTREL STRAIT', W * 0.62, H * 0.3); x.fillText('PORT VARNAK', W * 0.74, H * 0.42);
        x.beginPath(); x.arc(W * 0.73, H * 0.43, u * 0.006, 0, 7); x.fill();
      }
      x.restore();
    }
    if (sc === 'weapon') {
      const a = ease(st / 0.8); x.save(); x.globalAlpha = a; x.translate(cx, cy); x.strokeStyle = g(0.9);
      const s = u * 0.0042; const rot = t * 0.15;
      // schematic: cylinder warhead with rings, rotating
      for (let i = -6; i <= 6; i++) { const ry = Math.cos(rot) * 14 * s; x.beginPath(); x.ellipse(i * 9 * s, 0, Math.abs(ry) + 3 * s, 16 * s, 0, 0, 7); x.stroke(); }
      x.beginPath(); x.moveTo(-54 * s, -16 * s); x.lineTo(54 * s, -16 * s); x.moveTo(-54 * s, 16 * s); x.lineTo(54 * s, 16 * s); x.stroke();
      x.beginPath(); x.moveTo(54 * s, -16 * s); x.quadraticCurveTo(80 * s, 0, 54 * s, 16 * s); x.stroke();
      for (let k = 0; k < 3; k++) { const r = ((t * 30 + k * 30) % 90) * s; x.strokeStyle = o(1 - r / (90 * s)); x.beginPath(); x.arc(0, 0, 20 * s + r, 0, 7); x.stroke(); }
      x.restore(); x.textAlign = 'left'; font(4.2, 'Big Shoulders Stencil Display'); x.fillStyle = g(1); x.fillText('PROJECT MONSOON', W * 0.1, H * 0.16);
      font(1.8); x.fillStyle = g(0.8); ['TYPE: NON-NUCLEAR EMP WARHEAD', 'YIELD: REGIONAL GRID DENIAL (~60 KM)', 'MASS: 380 KG · CRATE-PORTABLE', 'STATUS: STOLEN'].forEach((l, i) => x.fillText(typed(l, 50), W * 0.1, H * 0.22 + i * u * 0.035));
      x.save(); x.translate(W * 0.78, H * 0.2); x.rotate(-0.2); x.strokeStyle = o(0.9); x.lineWidth *= 2; x.strokeRect(-u * 0.13, -u * 0.035, u * 0.26, u * 0.07); font(3, 'Big Shoulders Stencil Display'); x.fillStyle = o(0.9); x.textAlign = 'center'; x.fillText('CLASSIFIED', 0, u * 0.012); x.restore();
    }
    if (sc === 'obsidian') {
      const a = ease(st / 0.8); x.save(); x.globalAlpha = a; x.translate(cx, cy); const s = u * 0.16;
      x.fillStyle = 'rgba(30,34,36,0.9)'; x.strokeStyle = o(0.9); x.beginPath(); for (let i = 0; i < 6; i++) { const ang = i / 6 * Math.PI * 2 + Math.PI / 6; x.lineTo(Math.cos(ang) * s, Math.sin(ang) * s); } x.closePath(); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(0, -s * 0.7); x.lineTo(s * 0.35, 0); x.lineTo(0, s * 0.75); x.lineTo(-s * 0.3, -s * 0.05); x.closePath(); x.fillStyle = '#0a0c0d'; x.fill(); x.stroke();
      x.restore(); x.textAlign = 'center'; font(5, 'Big Shoulders Stencil Display'); x.fillStyle = '#f1ede4'; x.fillText('OBSIDIAN GROUP', cx, H * 0.16);
      font(1.8); x.fillStyle = g(0.8); x.fillText(typed('PRIVATE MILITARY CONTRACTOR · EST. STRENGTH 600+ · 14 COUNTRIES', 50), cx, H * 0.21);
    }
    if (sc === 'varga' || sc === 'varga2') {
      const a = ease(st / 0.8); x.save(); x.globalAlpha = a;
      const px = W * 0.2, py = H * 0.14, pw = u * 0.32, ph = u * 0.4;
      x.fillStyle = 'rgba(20,24,26,1)'; x.fillRect(px, py, pw, ph); x.strokeStyle = g(0.6); x.strokeRect(px, py, pw, ph);
      // silhouette head
      x.fillStyle = '#05070a'; x.beginPath(); x.ellipse(px + pw / 2, py + ph * 0.4, pw * 0.2, ph * 0.22, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(px + pw / 2, py + ph * 1.02, pw * 0.42, ph * 0.38, 0, Math.PI, 0); x.fill();
      x.strokeStyle = o(0.5); for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(px, py + ph * (0.2 + i * 0.2) + Math.sin(t * 3 + i) * 3); x.lineTo(px + pw, py + ph * (0.2 + i * 0.2) + Math.sin(t * 3 + i) * 3); x.stroke(); }
      x.restore(); x.textAlign = 'left'; const tx = px + pw + u * 0.05;
      font(5.5, 'Big Shoulders Stencil Display'); x.fillStyle = '#f1ede4'; x.fillText('ANTON VARGA', tx, py + u * 0.06);
      font(1.9); x.fillStyle = g(0.85); ['ROLE: COMMANDER, OBSIDIAN GROUP', 'FORMER: SPETSNAZ / PMC "KHOR"', 'LAST SEEN: SEVASTOPOL, 2019'].forEach((l, i) => x.fillText(typed(l, 55), tx, py + u * 0.12 + i * u * 0.04));
      font(2.4); x.fillStyle = sc === 'varga2' ? g(0.35) : o(1); x.fillText('STATUS: KIA', tx, py + u * 0.29);
      if (sc === 'varga2') { x.strokeStyle = o(1); x.beginPath(); x.moveTo(tx - 4, py + u * 0.282); x.lineTo(tx + u * 0.18, py + u * 0.282); x.stroke(); x.fillStyle = o(1); font(2.8, 'Big Shoulders Stencil Display'); x.fillText('ALIVE — CONFIRMED', tx, py + u * 0.34); }
    }
    if (sc === 'sat' || sc === 'sat2') {
      const a = ease(st / 1); x.save(); x.globalAlpha = a;
      const zoom = sc === 'sat2' ? 1.9 + Math.min(1, st / 4) * 0.4 : 1 + Math.min(1, st / 6) * 0.3; const S = u * 0.82 * zoom;
      const fx = sc === 'sat2' ? 0.655 : 0.5, fy = sc === 'sat2' ? 0.775 : 0.5; // focus on the ship
      x.beginPath(); x.rect(cx - u * 0.45, cy - u * 0.38, u * 0.9, u * 0.76); x.clip();
      if (this.sat) { x.filter = 'grayscale(1) brightness(1.6) contrast(1.3)'; x.drawImage(this.sat, cx - S * fx, cy - S * fy, S, S); x.filter = 'none'; x.fillStyle = 'rgba(40,140,110,0.35)'; x.globalCompositeOperation = 'multiply'; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over'; }
      else { x.strokeStyle = g(0.3); for (let i = 0; i < 30; i++) x.strokeRect(cx - S / 2 + Math.random() * S, cy - S / 2 + Math.random() * S, u * 0.03, u * 0.06); }
      x.restore(); x.strokeStyle = g(0.6); x.strokeRect(cx - u * 0.45, cy - u * 0.38, u * 0.9, u * 0.76);
      // target box on ship
      const sx = cx + (0.655 - fx) * S, sy = cy + (0.775 - fy) * S; const bw = S * 0.07, bh = S * 0.34;
      x.strokeStyle = o(Math.sin(t * 8) > 0 ? 1 : 0.6); x.lineWidth *= 2; x.strokeRect(sx - bw / 2, sy - bh / 2, bw, bh); x.lineWidth /= 2;
      font(1.8); x.fillStyle = o(1); x.textAlign = 'left'; x.fillText('KESTREL DAWN · 130M · REG. PANAMA (FALSE)', sx + bw / 2 + 8, sy - bh / 2 + u * 0.02);
      font(1.6); x.fillStyle = g(0.9); x.fillText('SAT PASS KH-9 · PORT VARNAK · THERMAL 41 HOSTILES', cx - u * 0.44, cy - u * 0.4);
    }
    if (sc === 'team' || sc === 'team2') {
      const cards = [['FALCON', 'SGT. RAHIM DURRANI', 'POINT · CQB'], ['ROGERS', 'CAPT. ELIAS ROGERS', 'TEAM LEAD'], ['WHISPER', 'LT. MARA QUINN', 'SNIPER · OVERWATCH'], ['ANVIL', 'SGT. DIEGO REYES', 'DEMOLITIONS · BOAT']];
      const cw = Math.min(u * 0.3, W * 0.21), ch = u * 0.36, gap = u * 0.02; const total = cards.length * cw + (cards.length - 1) * gap; let x0 = cx - total / 2;
      cards.forEach((cd, i) => {
        const k = ease((st - i * 0.25) / 0.6); if (k <= 0) return; const X = x0 + i * (cw + gap), Y = cy - ch / 2 + (1 - k) * 30;
        x.globalAlpha = k; x.fillStyle = i === 0 ? 'rgba(255,107,44,0.14)' : 'rgba(20,26,28,0.85)'; x.fillRect(X, Y, cw, ch); x.strokeStyle = i === 0 ? o(1) : g(0.5); x.strokeRect(X, Y, cw, ch);
        x.fillStyle = '#05070a'; x.beginPath(); x.ellipse(X + cw / 2, Y + ch * 0.36, cw * 0.18, ch * 0.16, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(X + cw / 2, Y + ch * 0.72, cw * 0.36, ch * 0.2, 0, Math.PI, 0); x.fill();
        x.textAlign = 'center'; font(3.6, 'Big Shoulders Stencil Display'); x.fillStyle = i === 0 ? o(1) : '#f1ede4'; x.fillText(cd[0], X + cw / 2, Y + ch * 0.83);
        font(1.3); x.fillStyle = g(0.85); x.fillText(cd[1], X + cw / 2, Y + ch * 0.9); x.fillText(cd[2], X + cw / 2, Y + ch * 0.95); x.globalAlpha = 1;
      });
      if (sc === 'team2') { font(2); x.fillStyle = o(0.9); x.textAlign = 'center'; x.fillText('OPERATION BLACK MONSOON · AUTHORISED', cx, cy + ch / 2 + u * 0.06); }
    }
    // scanline flicker
    x.fillStyle = `rgba(127,224,192,${0.015 + Math.random() * 0.01})`; x.fillRect(0, (t * 120 % 1) * H, W, H * 0.02);
  }
}
