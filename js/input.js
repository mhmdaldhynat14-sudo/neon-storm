export class Input {
  constructor(canvas, S, isTouch, isPlaying) {
    this.canvas = canvas; this.S = S; this.isPlaying = isPlaying; this.touchMode = isTouch; this.keys = new Set();
    this.lookX = 0; this.lookY = 0; this.mouseFire = false; this.touchFire = 0; this.flags = {}; this.weapon = -1; this.locked = false;
    this.joy = { id: null, cx: 0, cy: 0, x: 0, y: 0, mag: 0 }; this.looks = new Map(); this.onPause = null;
    const $ = id => document.getElementById(id);
    this.el = { touch: $('touch'), joy: $('joy'), knob: $('joyknob'), move: $('movezone'), look: $('lookzone'), fire: $('tFire'), fire2: $('tFire2'), fireS: $('tFireS') }; this.scopeHold = 0;
    // keyboard
    addEventListener('keydown', e => {
      if (e.repeat) return; const k = e.code; this.keys.add(k);
      if (!this.isPlaying()) { if (k === 'Escape' || k === 'KeyP') this.onPause && this.onPause(); return; }
      if (k === 'KeyT') this.leanK = -1; if (k === 'KeyY') this.leanK = 1;
      if (k === 'Space') this.flags.jump = true; if (k === 'KeyE' || k === 'KeyC') this.flags.dash = true; if (k === 'KeyR') this.flags.reload = true; if (k === 'KeyQ') this.flags.swap = true; if (k === 'KeyV') this.flags.toggleView = true; if (k === 'KeyF' || k === 'KeyZ') this.flags.scope = true; if (k === 'KeyB') this.flags.zoom = true; if (k === 'KeyX' || k === 'ControlLeft') this.flags.prone = true; if (k === 'KeyT' || k === 'CapsLock') this.flags.autorun = true;
      if (k.startsWith('Digit')) { const n = parseInt(k.slice(5)); if (n >= 1 && n <= 6) this.weapon = n - 1; }
      if (k === 'KeyP') this.onPause && this.onPause();
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
    });
    addEventListener('keyup', e => { this.keys.delete(e.code); if (e.code === 'KeyT' || e.code === 'KeyY') this.leanK = 0; });
    addEventListener('blur', () => this.reset());
    // mouse
    canvas.addEventListener('mousedown', e => {
      if (this.touchMode && e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
      if (!this.isPlaying()) return;
      if (!this.locked) this.lock();
      if (e.button === 0) this.mouseFire = true; if (e.button === 2) this.flags.scope = true;
    });
    addEventListener('mouseup', e => { if (e.button === 0) this.mouseFire = false; });
    addEventListener('mousemove', e => { if (this.locked) { const s = 0.0022 * this.S.sensM; this.lookX += e.movementX * s; this.lookY += e.movementY * s; } });
    addEventListener('wheel', e => { if (this.isPlaying() && this.zoomWheel && this.zoomWheel()) { this.flags.zoom = true; return; } if (this.isPlaying()) { if (e.deltaY > 0) this.flags.swap = true; else this.flags.prev = true; } }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      const was = this.locked; this.locked = document.pointerLockElement === canvas;
      if (was && !this.locked && this.isPlaying() && !this.touchMode) this.onPause && this.onPause();
    });
    addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('dblclick', e => e.preventDefault());
    // touch: anything touching switches to touch mode
    addEventListener('pointerdown', e => { if (e.pointerType === 'touch' && !this.touchMode) { this.touchMode = true; document.body.classList.add('touchmode'); if (this.isPlaying()) this.setTouchVisible(true); } }, true);
    const E = this.el;
    // joystick (floating, appears under the thumb)
    E.move.addEventListener('pointerdown', e => {
      e.preventDefault(); if (this.joy.id !== null) return; E.move.setPointerCapture(e.pointerId);
      const J = this.S.joy || {}, R = this.joyR(), zr = E.move.getBoundingClientRect(); let x, y;
      if (J.fixed && J.x != null) { x = J.x * innerWidth; y = J.y * innerHeight; }
      else { x = Math.max(zr.left + R + 18, Math.min(zr.right - R - 12, e.clientX)); y = Math.max(R + 18, Math.min(innerHeight - R - 12, e.clientY)); }
      this.flags.autorunOff = true; this.joy = { id: e.pointerId, cx: x, cy: y, x: 0, y: 0, mag: 0, lock: false }; E.joy.style.left = x + 'px'; E.joy.style.top = y + 'px'; E.joy.classList.add('active'); this.updateJoy(e.clientX, e.clientY);
    });
    E.move.addEventListener('pointermove', e => { if (e.pointerId === this.joy.id) { e.preventDefault(); this.updateJoy(e.clientX, e.clientY); } });
    const endJoy = e => { if (e.pointerId !== this.joy.id) return; if (this.joy.lock) this.flags.autorunOn = true; this.el.joy.classList.remove('lockready'); this.joy = { id: null, cx: 0, cy: 0, x: 0, y: 0, mag: 0 }; E.knob.style.transform = ''; E.knob.classList.remove('sprint'); E.joy.classList.remove('active'); this.joyRest(); };
    E.move.addEventListener('pointerup', endJoy); E.move.addEventListener('pointercancel', endJoy);
    // look zone + fire buttons (both steer the camera while held)
    const lookStart = (el, fire) => e => { e.preventDefault(); e.stopPropagation(); el.setPointerCapture(e.pointerId); if (el === this.el.fireS) this.scopeHold++; this.looks.set(e.pointerId, { x: e.clientX, y: e.clientY, fire, sc: el === this.el.fireS, t: e.timeStamp || performance.now(), moved: false }); if (fire) { this.touchFire++; el.classList.add('down'); } };
    const lookMove = e => { const l = this.looks.get(e.pointerId); if (!l) return; e.preventDefault();
      let dx = e.clientX - l.x, dy = e.clientY - l.y; l.x = e.clientX; l.y = e.clientY;
      const now = e.timeStamp || performance.now(); const dtm = Math.max(4, now - (l.t || now - 16)); l.t = now;
      if (!l.moved) { l.moved = true; if (Math.hypot(dx, dy) > 40) return; }
      const lim = 70; dx = Math.max(-lim, Math.min(lim, dx)); dy = Math.max(-lim, Math.min(lim, dy));
      if (Math.abs(dx) < 0.35) dx = 0; if (Math.abs(dy) < 0.35) dy = 0;
      const sp = Math.hypot(dx, dy) / dtm; const gain = 0.7 + 0.55 * Math.min(1, sp / 1.6);
      const s = 0.0057 * this.S.sensT * gain; this.lookX += dx * s; this.lookY += dy * s * 0.85; };
    const lookEnd = el => e => { const l = this.looks.get(e.pointerId); if (!l) return; this.looks.delete(e.pointerId); if (l.sc) this.scopeHold = Math.max(0, this.scopeHold - 1); if (l.fire) { this.touchFire = Math.max(0, this.touchFire - 1); el.classList.remove('down'); } };
    for (const [el, fire] of [[E.look, false], [E.fire, true], [E.fire2, true], [E.fireS, true]]) { el.addEventListener('pointerdown', lookStart(el, fire)); el.addEventListener('pointermove', lookMove); el.addEventListener('pointerup', lookEnd(el)); el.addEventListener('pointercancel', lookEnd(el)); el.addEventListener('lostpointercapture', lookEnd(el)); }
    const btn = (id, flag) => { const b = $(id); b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); this.flags[flag] = true; b.classList.add('down'); }); const up = () => b.classList.remove('down'); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up); };
    const lean = (id, v) => { const b = $(id); if (!b) return; b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); this.leanTog = this.leanTog === v ? 0 : v; b.classList.toggle('down', this.leanTog === v); }); };
    lean('tLeanL', -1); lean('tLeanR', 1);
    btn('tScope', 'scope'); btn('tZoom', 'zoom'); btn('tProne', 'prone'); btn('tJump', 'jump'); btn('tDash', 'dash'); btn('tReload', 'reload'); btn('tSwap', 'swap');
    ['btnView', 'btnPause', 'btnFs'].forEach(id => $(id).addEventListener('pointerdown', e => e.stopPropagation()));
  }
  joyR() { const J = this.S.joy; return 52 * ((J && J.s) || 1); }
  joyRest() { const J = this.S.joy, E = this.el; if (J && J.x != null) { E.joy.style.left = J.x * innerWidth + 'px'; E.joy.style.top = J.y * innerHeight + 'px'; } else { E.joy.style.left = ''; E.joy.style.top = ''; } }
  updateJoy(x, y) {
    const R = this.joyR(); let dx = x - this.joy.cx, dy = y - this.joy.cy; const d = Math.hypot(dx, dy); const mag = d / R;
    const k = d > R ? R / d : 1; const kx = dx * k, ky = dy * k;
    this.el.knob.style.transform = `translate(${kx}px,${ky}px)`;
    const dead = 0.12; const m = Math.min(1, mag); const scaled = m < dead ? 0 : (m - dead) / (1 - dead);
    this.joy.x = d > 0 ? dx / d * scaled : 0; this.joy.y = d > 0 ? dy / d * scaled : 0; this.joy.mag = mag;
    this.el.knob.classList.toggle('sprint', mag > 1.25 && dy < 0); this.joy.lock = mag > 1.75 && dy < 0 && Math.abs(dx) < Math.abs(dy) * 0.8; this.el.joy.classList.toggle('lockready', this.joy.lock);
  }
  setTouchVisible(v) { this.el.touch.classList.toggle('hidden', !v); }
  lock() { if (this.touchMode) return; try { const p = this.canvas.requestPointerLock && this.canvas.requestPointerLock(); p && p.catch && p.catch(() => { }); } catch { } }
  unlock() { if (document.pointerLockElement) try { document.exitPointerLock(); } catch { } }
  reset() { this.keys.clear(); this.mouseFire = false; this.touchFire = 0; this.scopeHold = 0; this.looks.clear(); this.el.fireS && this.el.fireS.classList.remove('down'); this.flags = {}; this.lookX = this.lookY = 0; this.el.fire.classList.remove('down'); }
  frame() {
    const K = this.keys; let mx = 0, my = 0;
    if (K.has('KeyW') || K.has('ArrowUp')) my += 1; if (K.has('KeyS') || K.has('ArrowDown')) my -= 1; if (K.has('KeyA') || K.has('ArrowLeft')) mx -= 1; if (K.has('KeyD') || K.has('ArrowRight')) mx += 1;
    let sprint = K.has('ShiftLeft') || K.has('ShiftRight');
    if (this.joy.id !== null) { mx += this.joy.x; my += -this.joy.y; if (this.joy.mag > 1.25 && this.joy.y < -0.5) sprint = true; }
    const leanV = sprint ? 0 : Math.max(-1, Math.min(1, (this.leanK || 0) + (this.leanTog || 0))); // طلب قصي: الركض يلغي الميلان
    if (sprint && this.leanTog) { this.leanTog = 0; document.getElementById('tLeanL')?.classList.remove('down'); document.getElementById('tLeanR')?.classList.remove('down'); }
    const out = { lean: leanV, moveX: mx, moveY: my, sprint, lookX: this.lookX, lookY: this.lookY, fire: this.mouseFire || this.touchFire > 0 || (this.extFire || false), jump: !!this.flags.jump, dash: !!this.flags.dash, reload: !!this.flags.reload, swap: !!this.flags.swap, prev: !!this.flags.prev, toggleView: !!this.flags.toggleView, scope: !!this.flags.scope, zoom: !!this.flags.zoom, prone: !!this.flags.prone, autorun: !!this.flags.autorun, autorunOn: !!this.flags.autorunOn, autorunOff: !!this.flags.autorunOff, scopeHold: this.scopeHold > 0, weapon: this.weapon };
    this.lookX = 0; this.lookY = 0; this.flags = {}; this.weapon = -1;
    return out;
  }
}
