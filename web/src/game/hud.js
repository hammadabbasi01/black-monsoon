import * as THREE from 'three';
import { audio } from '../core/audio.js';

const $ = (id) => document.getElementById(id);
const WHO = { rogers: ['ROGERS', '#ffb08a'], oracle: ['ORACLE', '#7fe0c0'], whisper: ['WHISPER', '#c7a6ff'], anvil: ['ANVIL', '#ffd36b'], falcon: ['FALCON', '#9fd3ff'], enemy: ['OBSIDIAN', '#ff6b5e'], varga: ['VARGA', '#ff4b3e'], pa: ['PA SYSTEM', '#bbbbbb'] };

export class HUD {
  constructor(G) {
    this.G = G; this.el = {}; for (const id of ['hud', 'objBox', 'objText', 'objSub', 'compStrip', 'radio', 'rWho', 'rText', 'cross', 'hitm', 'marker', 'allyTag', 'prompt', 'popup', 'wName', 'wAmmo', 'wNade', 'hpBar', 'o2Bar', 'vig', 'uw', 'dmgArrow', 'nadeWarn', 'timerBox', 'title', 'blackout', 'bars', 'scope', 'sus', 'mm', 'bUse']) this.el[id] = $(id);
    this.queue = []; this.lineT = 0; this.cur = null; this.hitT = 0; this.popT = 0; this.dmgT = 0; this.markerPos = null; this.markerLabel = '';
    // compass strip
    const strip = this.el.compStrip; strip.innerHTML = '';
    const names = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
    for (let a = -360; a <= 720; a += 15) { const s = document.createElement('span'); const n = ((a % 360) + 360) % 360; s.textContent = names[n] || '·'; s.style.left = a * 2 + 'px'; if (!names[n]) s.style.opacity = 0.5; strip.appendChild(s); }
    this.compObj = document.createElement('div'); this.compObj.id = 'compObj'; $('compass').appendChild(this.compObj);
    this.mmCtx = this.el.mm.getContext('2d');
    this.mmBg = null;
  }
  show(on) { this.el.hud.hidden = !on; }
  objective(text, sub = '') { this.el.objText.textContent = text; this.el.objSub.textContent = sub; this.el.objBox.classList.remove('flash'); void this.el.objBox.offsetWidth; this.el.objBox.classList.add('flash'); if (text) audio.play('beep'); }
  objSub(s) { this.el.objSub.textContent = s; }
  marker(pos, label = '') { this.markerPos = pos ? pos.clone() : null; this.markerLabel = label; }
  // dialogue: [who, text, seconds?]
  say(lines, onDone) {
    for (const l of lines) this.queue.push({ who: l[0], text: l[1], dur: l[2] || Math.max(2.4, l[1].length * 0.062) });
    if (onDone) this.queue.push({ cb: onDone });
  }
  get talking() { return !!this.cur || this.queue.length > 0; }
  clearTalk() { this.queue.length = 0; this.cur = null; this.el.radio.hidden = true; audio.hush(); }
  bark(text, pos) { if (this.G.player.pos.distanceTo(pos) < 30 && !this.cur) { this.queue.unshift({ who: 'enemy', text, dur: 1.6, bark: true }); } }
  popup(text, cls = '', dur = 1) { const p = this.el.popup; p.textContent = text; p.className = ''; void p.offsetWidth; p.className = 'show ' + cls; }
  hitmark(kill) { const h = this.el.hitm; h.className = 'on' + (kill ? ' kill' : ''); this.hitT = kill ? 0.3 : 0.15; }
  damageFrom(src, P) { const a = Math.atan2(src.x - P.pos.x, src.z - P.pos.z); const rel = a - Math.atan2(-Math.sin(P.yaw), -Math.cos(P.yaw)); this.el.dmgArrow.style.transform = `rotate(${-rel}rad)`; this.el.dmgArrow.style.opacity = 1; this.dmgT = 1.2; }
  nadeWarn(n) { this.el.nadeWarn.hidden = !n; if (n) { const P = this.G.player; const a = Math.atan2(n.pos.x - P.pos.x, n.pos.z - P.pos.z); const rel = a - Math.atan2(-Math.sin(P.yaw), -Math.cos(P.yaw)); this.el.nadeWarn.style.transform = `rotate(${-rel}rad)`; } }
  prompt(text, prog = null) { const p = this.el.prompt; if (!text) { p.hidden = true; this.el.bUse.hidden = true; return; } p.hidden = false; p.firstElementChild.textContent = text; p.lastElementChild.style.display = prog == null ? 'none' : 'block'; if (prog != null) p.lastElementChild.firstElementChild.style.width = prog * 100 + '%'; if (this.G.input.touch) this.el.bUse.hidden = false; }
  timer(s) { const t = this.el.timerBox; if (s == null) { t.hidden = true; return; } t.hidden = false; const m = Math.floor(s / 60), ss = Math.floor(s % 60); t.textContent = `${m}:${String(ss).padStart(2, '0')}`; }
  titleCard(lines, dur = 7) { const t = this.el.title; t.innerHTML = `<b>${lines[0]}</b>` + lines.slice(1).join('\n'); t.style.opacity = 0; t.style.transition = 'opacity 1.2s'; requestAnimationFrame(() => (t.style.opacity = 1)); clearTimeout(this._tt); this._tt = setTimeout(() => (t.style.opacity = 0), dur * 1000); }
  fade(on, secs = 0.8) { this.el.blackout.style.transition = `opacity ${secs}s`; this.el.blackout.style.opacity = on ? 1 : 0; }
  bars(on) { this.el.bars.classList.toggle('on', on); }
  suspicion(a) { this._susA = a; }
  buildMinimap(world, bounds, extra) {
    // pre-render a top-down map of colliders
    const S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
    const [x0, z0, x1, z1] = bounds; const sc = S / Math.max(x1 - x0, z1 - z0);
    x.fillStyle = '#0b2530'; x.fillRect(0, 0, S, S);
    x.fillStyle = '#1b2226'; for (let i = 0; i < S; i += 4) for (let j = 0; j < S; j += 4) { const wx = x0 + i / sc, wz = z0 + j / sc; if (!world.isSea(wx, wz)) x.fillRect(i, j, 4, 4); }
    for (const b of world.boxes) { if (!b.solid || b.max.y < 0.8 || b.mat === 'none') continue; const h = Math.min(1, b.max.y / 12); x.fillStyle = `rgba(${150 + h * 60},${155 + h * 60},${160 + h * 60},${0.35 + h * 0.4})`; x.fillRect((b.min.x - x0) * sc, (b.min.z - z0) * sc, (b.max.x - b.min.x) * sc, (b.max.z - b.min.z) * sc); }
    extra && extra(x, sc, x0, z0);
    this.mmBg = c; this.mmB = { x0, z0, sc };
  }
  update(dt) {
    const G = this.G, P = G.player, cam = G.camera, el = this.el;
    // dialogue queue
    if (this.cur) { this.lineT -= dt; if (this.lineT <= 0) { this.cur = null; el.radio.hidden = true; } }
    if (!this.cur && this.queue.length) {
      const n = this.queue.shift();
      if (n.cb) n.cb(); else {
        this.cur = n; this.lineT = n.dur; const w = WHO[n.who] || [n.who.toUpperCase(), '#fff'];
        el.rWho.textContent = w[0]; el.rWho.style.color = w[1]; el.rText.textContent = n.text; el.radio.hidden = false;
        if (!n.bark) { audio.play('radio'); audio.say(n.who, n.text); }
      }
    }
    if (this.hitT > 0) { this.hitT -= dt; if (this.hitT <= 0) el.hitm.className = ''; }
    if (this.dmgT > 0) { this.dmgT -= dt; if (this.dmgT <= 0) el.dmgArrow.style.opacity = 0; }
    // health vignette
    const hpk = 1 - P.hp / P.maxHp; el.vig.style.opacity = Math.min(1, hpk * 1.3);
    el.hpBar.firstElementChild.style.width = (P.hp / P.maxHp) * 100 + '%';
    if (G.engine.grade) { G.engine.grade.uniforms.dmg.value = Math.max(0, hpk - 0.25); G.engine.grade.uniforms.uw.value = P.under ? 1 : 0; }
    el.uw.style.opacity = P.under ? 1 : 0;
    el.o2Bar.hidden = !(P.under || P.o2 < 0.99); el.o2Bar.firstElementChild.style.width = P.o2 * 100 + '%';
    if (hpk > 0.6 && Math.floor(G.t * 1.2) !== Math.floor((G.t - dt) * 1.2)) audio.play('heartbeat', null, hpk);
    // weapon panel
    const A = G.arsenal; if (A) {
      const d = A.def, am = A.ammo[A.cur];
      el.wName.textContent = P.swimming ? 'Combat knife' : d.name; el.wAmmo.firstElementChild.textContent = P.swimming ? '—' : am.mag; el.wAmmo.lastElementChild.textContent = P.swimming ? '' : '/ ' + am.res;
      el.wAmmo.classList.toggle('low', am.mag <= d.mag * 0.25);
      el.wNade.textContent = `FRAG ×${A.frags}  ·  SMOKE ×${A.smokes}${A.reloadT > 0 ? '  ·  RELOADING' : ''}`;
      const scoped = !!(d.scope && A.ads > 0.85 && !P.swimming); el.scope.classList.toggle('on', scoped);
      el.cross.style.opacity = A.ads > 0.5 || P.sprinting ? 0 : 1;
      const spr = 8 + (P.speed01 * 10 + (A.recoil || 0) * 20); const c = el.cross.children; c[0].style.top = -spr - 8 + 'px'; c[1].style.top = spr + 'px'; c[2].style.left = -spr - 8 + 'px'; c[3].style.left = spr + 'px';
    }
    // compass
    const heading = ((-P.yaw * 180 / Math.PI) % 360 + 360) % 360; el.compStrip.style.transform = `translateX(${-heading * 2}px)`;
    const W2 = innerWidth, H2 = innerHeight;
    if (this.markerPos) {
      const to = this.markerPos.clone().sub(P.pos); const ang = Math.atan2(to.x, -to.z) * 180 / Math.PI; let rel = ((ang - heading + 540) % 360) - 180;
      this.compObj.hidden = false; this.compObj.style.left = `calc(50% + ${THREE.MathUtils.clamp(rel * 2, -180, 180)}px)`;
      const v = this.markerPos.clone().project(cam); const m = el.marker;
      if (v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1) { m.hidden = false; m.style.left = ((v.x + 1) / 2) * W2 + 'px'; m.style.top = ((1 - v.y) / 2) * H2 + 'px'; m.lastElementChild.textContent = `${this.markerLabel ? this.markerLabel + ' · ' : ''}${Math.round(to.length())}m`; }
      else m.hidden = true;
    } else { this.compObj.hidden = true; el.marker.hidden = true; }
    // ally tag
    const ally = G.rogers; if (ally && ally.alive && !ally.dormant) { const v = ally.pos.clone().setY(ally.pos.y + 2.05).project(cam); const t = el.allyTag; const d = ally.pos.distanceTo(P.pos); if (v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && d > 3) { t.hidden = false; t.style.left = ((v.x + 1) / 2) * W2 + 'px'; t.style.top = ((1 - v.y) / 2) * H2 + 'px'; t.style.opacity = d > 60 ? 0.4 : 1; } else t.hidden = true; }
    // suspicion meter (highest detect among enemies not in combat)
    let det = 0; for (const a of G.actors.list) if (a.team === 'enemy' && a.alive && !a.dormant && a.state !== 'combat') det = Math.max(det, a.detect); el.sus.hidden = det < 0.05 || G.alarm; el.sus.firstElementChild.style.width = Math.min(1, det) * 100 + '%';
    this.drawMinimap();
  }
  drawMinimap() {
    if (!this.mmBg) return; const G = this.G, P = G.player, x = this.mmCtx, S = 300; const { x0, z0, sc } = this.mmB; const zoom = 2.2;
    x.save(); x.clearRect(0, 0, S, S); x.translate(S / 2, S / 2); x.rotate(P.yaw); x.scale(zoom, zoom);
    x.drawImage(this.mmBg, -(P.pos.x - x0) * sc, -(P.pos.z - z0) * sc);
    const dot = (p, c, r = 3.2) => { x.fillStyle = c; x.beginPath(); x.arc((p.x - P.pos.x) * sc, (p.z - P.pos.z) * sc, r / zoom * 2, 0, 7); x.fill(); };
    for (const a of G.actors.list) { if (!a.alive || a.dormant) continue; if (a.team === 'enemy') { if (a.state === 'combat' || a.shownOnMap || (G.t - a.lastFireT < 2)) dot(a.pos, '#ff4b3e'); } else dot(a.pos, '#7cc6ff'); }
    if (this.markerPos) { x.save(); x.translate((this.markerPos.x - P.pos.x) * sc, (this.markerPos.z - P.pos.z) * sc); x.rotate(-P.yaw); x.strokeStyle = '#ff6b2c'; x.lineWidth = 2 / zoom * 2; x.strokeRect(-4, -4, 8, 8); x.restore(); }
    x.restore();
    x.fillStyle = '#ece7db'; x.beginPath(); x.moveTo(S / 2, S / 2 - 9); x.lineTo(S / 2 + 6, S / 2 + 7); x.lineTo(S / 2 - 6, S / 2 + 7); x.closePath(); x.fill();
  }
}
