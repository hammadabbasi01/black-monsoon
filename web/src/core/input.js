// Unified input: keyboard + mouse (pointer lock) on desktop, virtual joystick + buttons on touch.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.look = { x: 0, y: 0 };
    this.move = { x: 0, y: 0 };
    this.fire = false; this.ads = false; this.use = false; this.sprint = false;
    this.touch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
    this.enabled = false; this.sens = 1;
    this.locked = false;
    this._bindDesktop();
    if (this.touch) this._bindTouch();
  }
  press(k) { this.pressed.add(k); }
  took(k) { if (this.pressed.has(k)) { this.pressed.delete(k); return true; } return false; }
  endFrame() { this.pressed.clear(); this.look.x = 0; this.look.y = 0; }

  _bindDesktop() {
    const map = { KeyR: 'reload', KeyG: 'nade', Digit4: 'smoke', KeyT: 'smoke', KeyV: 'knife', KeyQ: 'swap', Digit1: 'w0', Digit2: 'w1', Digit3: 'w2', Space: 'jump', KeyC: 'crouch', ControlLeft: 'crouch', KeyF: 'light', Escape: 'pause', KeyP: 'pause', KeyE: 'useTap' };
    addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (e.code === 'Tab') e.preventDefault();
      if (!e.repeat && map[e.code]) this.press(map[e.code]);
      this.keys.add(e.code);
      if (e.code === 'KeyE') this.use = true;
    });
    addEventListener('keyup', (e) => { this.keys.delete(e.code); if (e.code === 'KeyE') this.use = false; });
    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled || this.touch) return;
      if (!this.locked) { this.canvas.requestPointerLock?.(); return; }
      if (e.button === 0) this.fire = true; if (e.button === 2) this.ads = true;
    });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.fire = false; if (e.button === 2) this.ads = false; });
    addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('wheel', (e) => { if (this.enabled && this.locked) this.press('swap'); }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (!this.locked && this.enabled && !this.touch) { this.fire = false; this.ads = false; this.press('pause'); }
    });
    addEventListener('mousemove', (e) => {
      if (!this.locked || !this.enabled) return;
      this.look.x += e.movementX * 0.0022 * this.sens; this.look.y += e.movementY * 0.0022 * this.sens;
    });
  }
  updateKeys() {
    if (this.touch && this._joyId != null) return;
    const k = this.keys;
    this.move.x = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
    this.move.y = (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0);
    this.sprint = k.has('ShiftLeft') || k.has('ShiftRight') || this._joySprint;
  }

  _bindTouch() {
    document.body.classList.add('touch');
    const joy = document.getElementById('joy'), knob = document.getElementById('joyKnob'), look = document.getElementById('lookZone');
    this._joyId = null; let jx = 0, jy = 0; const R = 52;
    const lookIds = new Map();
    look.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        if (t.clientX < innerWidth * 0.42 && this._joyId == null) {
          this._joyId = t.identifier; jx = t.clientX; jy = t.clientY;
          joy.style.left = jx + 'px'; joy.style.top = jy + 'px'; joy.classList.remove('idle');
        } else lookIds.set(t.identifier, { x: t.clientX, y: t.clientY });
      }
      e.preventDefault();
    }, { passive: false });
    look.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this._joyId) {
          let dx = t.clientX - jx, dy = t.clientY - jy; const l = Math.hypot(dx, dy);
          this._joySprint = dy < -R * 1.15;
          joy.classList.toggle('sprint', this._joySprint);
          if (l > R) { dx *= R / l; dy *= R / l; }
          knob.style.transform = `translate(${dx}px,${dy}px)`;
          this.move.x = dx / R; this.move.y = -dy / R; this.sprint = this._joySprint;
        } else if (lookIds.has(t.identifier)) {
          const p = lookIds.get(t.identifier);
          this.look.x += (t.clientX - p.x) * 0.0052 * this.sens; this.look.y += (t.clientY - p.y) * 0.0052 * this.sens;
          p.x = t.clientX; p.y = t.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this._joyId) { this._joyId = null; this.move.x = this.move.y = 0; this.sprint = false; this._joySprint = false; knob.style.transform = ''; joy.classList.add('idle'); joy.classList.remove('sprint'); }
        lookIds.delete(t.identifier);
      }
    };
    look.addEventListener('touchend', end); look.addEventListener('touchcancel', end);

    const hold = (id, on, off) => {
      const b = document.getElementById(id);
      b.addEventListener('touchstart', (e) => {
        e.preventDefault(); e.stopPropagation(); b.classList.add('act'); on();
        const t = e.changedTouches[0]; b._tid = t.identifier; b._lx = t.clientX; b._ly = t.clientY;
      }, { passive: false });
      // fire buttons also steer the camera while held (thumb drag)
      b.addEventListener('touchmove', (e) => {
        for (const t of e.changedTouches) if (t.identifier === b._tid) {
          this.look.x += (t.clientX - b._lx) * 0.0052 * this.sens; this.look.y += (t.clientY - b._ly) * 0.0052 * this.sens; b._lx = t.clientX; b._ly = t.clientY;
        }
        e.preventDefault();
      }, { passive: false });
      const up = (e) => { e.preventDefault(); b.classList.remove('act'); off && off(); };
      b.addEventListener('touchend', up); b.addEventListener('touchcancel', up);
    };
    hold('bFire', () => (this.fire = true), () => (this.fire = false));
    hold('bFire2', () => (this.fire = true), () => (this.fire = false));
    hold('bAds', () => (this.adsToggle = !this.adsToggle));
    hold('bReload', () => this.press('reload'));
    hold('bNade', () => this.press('nade'));
    hold('bSmoke', () => this.press('smoke'));
    hold('bCrouch', () => this.press('crouch'));
    hold('bJump', () => this.press('jump'));
    hold('bKnife', () => this.press('knife'));
    hold('bSwap', () => this.press('swap'));
    hold('bLight', () => this.press('light'));
    hold('bUse', () => { this.use = true; this.press('useTap'); }, () => (this.use = false));
  }
  get adsActive() { return this.ads || !!this.adsToggle; }
  reset() { this.fire = false; this.ads = false; this.adsToggle = false; this.use = false; this.move.x = this.move.y = 0; this.keys.clear(); this.pressed.clear(); }
}
