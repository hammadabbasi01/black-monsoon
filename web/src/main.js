import * as THREE from 'three';
import { Engine } from './core/engine.js';
import { Assets } from './core/assets.js';
import { audio } from './core/audio.js';
import { Input } from './core/input.js';
import { Game } from './game/game.js';
import { Intel, ACT1_INTRO } from './story/intro.js';
import { M1 } from './missions/m1_harbor.js';

const $ = (id) => document.getElementById(id);
const store = { get(k, d) { try { const v = localStorage.getItem('bm.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('bm.' + k, JSON.stringify(v)); } catch (e) {} } };

const ACT1 = [
  { m: M1, ready: true },
  { num: '02', title: 'Deep Water', blurb: 'Dive the wreck of the Sable Queen off Kesh Point. Knife only, forty metres down.', ready: false },
  { num: '03', title: 'Ghost Ridge', blurb: 'Sniper overwatch above a mountain village, then a fighting extraction through smoke.', ready: false },
  { num: '04', title: 'Monsoon Gate', blurb: "Full assault on Varga's compound. End of Act 1.", ready: false },
];

const engine = new Engine($('c'));
const input = new Input($('c'));
const intel = new Intel();
let game = null, state = 'menu', selected = 0;
let quality = store.get('quality', input.touch ? 0 : 1), difficulty = store.get('difficulty', 1), voices = store.get('voices', 1);
input.sens = store.get('sens', 1); audio.setVolume(store.get('vol', 0.8)); audio.voices = !!voices;
engine.setQuality(quality); Assets.setRenderer(engine.renderer);

// ---------- menu wiring ----------
function seg(id, attr, val, cb) { const el = $(id); el.querySelectorAll('button').forEach((b) => { b.setAttribute('aria-pressed', String(+b.dataset[attr] === val)); b.onclick = () => { el.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); cb(+b.dataset[attr]); }; }); }
seg('qSeg', 'q', quality, (v) => { quality = v; store.set('quality', v); engine.setQuality(v); });
seg('dSeg', 'd', difficulty, (v) => { difficulty = v; store.set('difficulty', v); });
seg('vSeg', 'v', voices, (v) => { voices = v; audio.voices = !!v; store.set('voices', v); });
$('ctrlText').innerHTML = input.touch
  ? 'Left thumb: move (push up hard to sprint). Right side: look. FIRE, AIM, RELOAD, FRAG, SMOKE, KNIFE, SWAP, CROUCH, JUMP and LIGHT buttons. Hold USE for objectives.'
  : '<kbd>WASD</kbd> move · <kbd>Shift</kbd> sprint · <kbd>Mouse</kbd> aim · <kbd>LMB</kbd> fire · <kbd>RMB</kbd> aim down sights · <kbd>R</kbd> reload · <kbd>Q</kbd>/wheel swap · <kbd>V</kbd> knife · <kbd>G</kbd> frag · <kbd>T</kbd> smoke · <kbd>C</kbd> crouch · <kbd>Space</kbd> jump / swim up · <kbd>F</kbd> torch · <kbd>E</kbd> use · <kbd>Esc</kbd> pause';
const list = $('missionList');
const done = store.get('done', {});
ACT1.forEach((it, i) => {
  const b = document.createElement('button'); b.className = 'mrow'; b.disabled = !it.ready;
  const m = it.m || it; b.innerHTML = `<span class="n">${m.num}</span><span><span class="t">${m.title}</span><span class="p">${m.blurb}</span></span><span class="s">${it.ready ? (done[m.id] ? 'Complete' : m.length) : 'Coming next'}</span>`;
  b.setAttribute('aria-pressed', String(i === selected)); b.onclick = () => { selected = i; list.querySelectorAll('.mrow').forEach((x, j) => x.setAttribute('aria-pressed', String(j === i))); };
  list.appendChild(b);
});
$('sens').value = input.sens; $('sens').oninput = (e) => { input.sens = +e.target.value; store.set('sens', input.sens); };
$('vol').value = audio.vol; $('vol').oninput = (e) => { audio.setVolume(+e.target.value); store.set('vol', audio.vol); };

function setLoad(p, txt) { $('loadBar').firstElementChild.style.width = p * 100 + '%'; if (txt) $('loadTxt').textContent = txt; }
function showErr(e) { $('errBox').textContent = 'Something went wrong: ' + (e && e.message ? e.message : e); console.error(e); }

// ---------- boot ----------
async function boot() {
  try {
    setLoad(0.02, 'Loading textures…');
    const tex = ['asph_c.jpg', 'asph_n.jpg', 'asph_r.jpg', 'concrete_c.jpg', 'concrete_n.jpg', 'concrete_r.jpg', 'cont_c.jpg', 'cont_n.jpg', 'cont_r.jpg', 'corr_c.jpg', 'corr_n.jpg', 'corr_r.jpg', 'ship_c.jpg', 'ship_n.jpg', 'hull_c.jpg', 'hull_n.jpg', 'deck_c.jpg', 'deck_n.jpg', 'plank_c.jpg', 'plank_n.jpg', 'rock_c.jpg', 'rock_n.jpg', 'mud_c.jpg', 'mud_n.jpg', 'panel_c.jpg', 'panel_n.jpg', 'panel_r.jpg', 'floor_c.jpg', 'floor_n.jpg', 'floor_r.jpg', 'ceil_c.jpg', 'ceil_n.jpg', 'fabric.jpg', 'fabric_n.jpg', 'grunge.jpg', 'flash.png', 'glow.png', 'smoke.png', 'hole.png', 'cone.png', 'pool.png', 'sky.jpg', 'skyline.png', 'water_n.jpg'];
    await Assets.preloadTextures(tex, (p) => setLoad(0.05 + p * 0.5, 'Loading textures…'));
    setLoad(0.6, 'Loading soldiers…'); await Assets.loadModel('soldier', 'soldier.json');
    setLoad(0.8, 'Loading night sky…'); await Assets.loadEnv(engine.renderer, 'night_env.png');
    setLoad(1, 'Ready.'); $('playBtn').disabled = false; $('introBtn').disabled = false;
    setTimeout(() => ($('loadBox').style.visibility = 'hidden'), 600);
  } catch (e) { showErr(e); }
}

// ---------- flow ----------
function show(id) { for (const s of ['menu', 'end', 'pause']) $(s).hidden = s !== id; }
let pendingLoad = null;
async function loadMission(m) {
  game = new Game(engine, input, { difficulty, onEnd: endMission });
  game.onError = showErr;
  await game.load(m, (p, t) => setLoad(p, t));
  renderSatellite(m);
  return game;
}
function renderSatellite(m) {
  try {
    const [x0, z0, x1, z1] = [-200, -170, 200, 230]; const size = 768;
    const cam = new THREE.OrthographicCamera(x0, x1, -z0, -z1, 1, 400); cam.position.set(0, 200, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0);
    cam.left = x0; cam.right = x1; cam.top = -z0; cam.bottom = -z1; cam.updateProjectionMatrix();
    const rt = new THREE.WebGLRenderTarget(size, size); const r = engine.renderer; const fog = engine.scene.fog; engine.scene.fog = null;
    const prevExp = r.toneMappingExposure; r.toneMappingExposure = 2.4;
    r.setRenderTarget(rt); r.render(engine.scene, cam); r.setRenderTarget(null); engine.scene.fog = fog; r.toneMappingExposure = prevExp;
    const px = new Uint8Array(size * size * 4); r.readRenderTargetPixels(rt, 0, 0, size, size, px); rt.dispose();
    const c = document.createElement('canvas'); c.width = c.height = size; const ctx = c.getContext('2d'); const id = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) id.data.set(px.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
    ctx.putImageData(id, 0, 0); intel.sat = c;
  } catch (e) { console.warn('sat', e); }
}

async function startPlay(withIntro) {
  audio.init(); audio.setAmbience(0, 0);
  const it = ACT1[selected]; if (!it.ready) return;
  $('menu').hidden = true; state = 'loading';
  const firstTime = !store.get('seenIntro', false);
  const wantIntro = withIntro || (selected === 0 && firstTime);
  if (wantIntro) {
    let introDone = false; let loaded = null;
    intel.play(ACT1_INTRO, () => { introDone = true; store.set('seenIntro', true); if (loaded) begin(); });
    await new Promise((r) => setTimeout(r, 300));
    try { await loadMission(it.m); } catch (e) { intel.finish(); $('menu').hidden = false; showErr(e); return; }
    loaded = true; if (introDone) begin();
  } else {
    $('menu').hidden = false; $('loadBox').style.visibility = 'visible';
    try { await loadMission(it.m); } catch (e) { showErr(e); return; }
    $('menu').hidden = true; begin();
  }
}
function begin(cp = 0) {
  state = 'play'; input.enabled = true; game.hud.show(true); $('touch').hidden = !input.touch;
  if (!input.touch) $('c').requestPointerLock?.();
  if (input.touch) { try { document.documentElement.requestFullscreen?.(); screen.orientation?.lock?.('landscape').catch(() => {}); } catch (e) {} }
  game.start(cp);
}
function endMission(win, st) {
  state = 'end'; input.enabled = false; document.exitPointerLock?.(); $('touch').hidden = true; audio.setMusic(0);
  if (win) { const d = store.get('done', {}); d[game.mission.id] = true; store.set('done', d); }
  $('endEyebrow').textContent = win ? 'Act 1 · Mission 01 complete' : 'Mission failed';
  $('endBig').textContent = win ? 'QUIET HARBOR' : 'K.I.A.'; $('endBig').className = 'endbig' + (win ? '' : ' fail');
  $('endText').textContent = win ? '"Monsoon was never on the Kestrel Dawn. Varga sank it with the Sable Queen off Kesh Point — forty-two metres down. Next: Deep Water." — Maj. Sana Mirza, Oracle' : '"Get up, Falcon. That\'s an order." — Capt. Rogers';
  const m = Math.floor(st.time / 60), s = Math.floor(st.time % 60);
  $('endStats').innerHTML = `<div><b>${m}:${String(s).padStart(2, '0')}</b><span>Time</span></div><div><b>${st.kills}</b><span>Kills</span></div><div><b>${st.heads}</b><span>Headshots</span></div><div><b>${st.acc}%</b><span>Accuracy</span></div>`;
  const btns = $('endBtns'); btns.innerHTML = '';
  const mk = (t, cls, fn) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = t; b.onclick = fn; btns.appendChild(b); };
  if (!win) mk('Retry from checkpoint', '', () => { show(null); begin(game.checkpoint); });
  mk(win ? 'Play again' : 'Restart mission', win ? '' : 'ghost', () => { show(null); begin(0); });
  mk('Main menu', 'ghost', () => { show('menu'); game.hud.show(false); state = 'menu'; menuCam = true; });
  game.hud.show(false); show('end');
}
function pause(on) {
  if (!game || state === 'end') return;
  if (on) { state = 'paused'; game.paused = true; input.enabled = false; input.reset(); document.exitPointerLock?.(); $('pauseTitle').textContent = game.mission.title; show('pause'); audio.hush(); }
  else { state = 'play'; game.paused = false; input.enabled = true; show(null); if (!input.touch) $('c').requestPointerLock?.(); }
}
$('playBtn').onclick = () => startPlay(false);
$('introBtn').onclick = () => startPlay(true);
$('pauseBtn').onclick = () => pause(true);
$('resumeBtn').onclick = () => pause(false);
$('cpBtn').onclick = () => { show(null); game.paused = false; begin(game.checkpoint); };
$('restartBtn').onclick = () => { show(null); game.paused = false; begin(0); };
$('quitBtn').onclick = () => { game.paused = false; game.token++; game.hud.show(false); $('touch').hidden = true; state = 'menu'; show('menu'); audio.setMusic(0); audio.stopAll(); menuCam = true; };
addEventListener('keydown', (e) => { if ((e.code === 'Escape' || e.code === 'KeyP') && state === 'paused') pause(false); });
$('c').addEventListener('click', () => { if (state === 'play' && !input.touch && !input.locked) $('c').requestPointerLock?.(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') pause(true); });

// portrait warning on phones
function checkRotate() { $('rotate').hidden = !(input.touch && innerHeight > innerWidth && state === 'play'); }
addEventListener('resize', checkRotate);

// ---------- loop ----------
let menuCam = true;
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  if (window.__bmManual) return;
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (state === 'play' && game) {
    if (input.took('pause')) { pause(true); }
    else game.update(dt);
    engine.render(dt);
  } else if (state === 'paused' || state === 'end') {
    if (game) engine.render(0);
  } else if (state === 'menu') {
    // idle render: slow orbit over whatever is loaded
    if (game && game.world) { const t = now / 1000; engine.camera.position.set(-120 + Math.sin(t * 0.05) * 60, 26, 10 + Math.cos(t * 0.05) * 40); engine.camera.lookAt(-40, 0, -20); game.atmo.update(dt, engine.camera, t); game.fx.update(dt); engine.render(dt); }
    else engine.renderer.clear();
  }
  checkRotate();
}
requestAnimationFrame(frame);
boot();
// debug hooks for automated playtests
window.__bm = { get game() { return game; }, engine, input, startPlay, begin, ACT1, intel, store };
