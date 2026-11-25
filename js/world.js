import * as THREE from '../three.module.min.js';

export const ARENA = 38; // half size
export const STEP = 0.55;

function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 4; return t;
}
function rnd(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

export function makeTextures() {
  const R = rnd(7);
  const ground = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#262a4a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const v = 34 + R() * 26 | 0; g.fillStyle = `rgba(${v},${v + 4},${v + 34},${0.35})`; g.fillRect(R() * w, R() * h, 2 + R() * 4, 2 + R() * 4); }
    // tiles
    g.strokeStyle = 'rgba(10,12,28,.85)'; g.lineWidth = 6; g.strokeRect(0, 0, w, h); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 2; g.strokeRect(5, 5, w / 2 - 10, h / 2 - 10); g.strokeRect(w / 2 + 5, h / 2 + 5, w / 2 - 10, h / 2 - 10);
  });
  const groundE = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#38f3ff'; g.lineWidth = 3; g.shadowColor = '#38f3ff'; g.shadowBlur = 10; g.strokeRect(1.5, 1.5, w - 3, h - 3);
    g.fillStyle = '#38f3ff'; [[0, 0], [w, 0], [0, h], [w, h]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); });
  });
  const block = canvasTex(256, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#8a94b8'); grd.addColorStop(1, '#5d6688'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${R() * 0.08})`; g.fillRect(R() * w, R() * h, 3, 3); }
    g.strokeStyle = 'rgba(20,24,50,.55)'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.strokeRect(9, 9, w - 18, h - 18);
    g.fillStyle = 'rgba(20,24,50,.5)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(20 + (i % 2) * (w - 40), 20 + (i >> 1) * (h - 40), 5, 0, 7); g.fill(); }
  });
  const hazard = canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = '#ffb21e'; g.fillRect(0, 0, w, h); g.fillStyle = '#1b1d30';
    for (let x = -h; x < w; x += 48) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 24, h); g.lineTo(x + 24 + h, 0); g.lineTo(x + h, 0); g.fill(); }
  });
  const crate = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d9772b'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(${R() > .5 ? 255 : 0},${R() * 120 | 0},0,.08)`; g.fillRect(0, i * 14 + R() * 6, w, 6); }
    g.fillStyle = '#4b2a14'; g.fillRect(0, 0, w, 26); g.fillRect(0, h - 26, w, 26); g.fillRect(0, 0, 26, h); g.fillRect(w - 26, 0, 26, h);
    g.save(); g.translate(w / 2, h / 2); g.rotate(Math.PI / 4); g.fillRect(-12, -170, 24, 340); g.restore();
    g.fillStyle = '#ffd23d'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(70, 100, 116, 56); g.fillStyle = '#ffe9a8'; g.fillText('N-7', w / 2, h / 2 + 2);
  }, false);
  const barrel = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#d42a3a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#7a0f1c'; g.fillRect(0, 14, w, 8); g.fillRect(0, h - 22, w, 8);
    g.fillStyle = '#ffd23d'; for (let i = 0; i < 2; i++) { const cx = 64 + i * 128; g.beginPath(); g.moveTo(cx, 38); g.lineTo(cx + 26, 88); g.lineTo(cx - 26, 88); g.closePath(); g.fill(); g.fillStyle = '#1b1d30'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.fillText('!', cx, 82); g.fillStyle = '#ffd23d'; }
  });
  const wall = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#34395f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a2e4f'; g.fillRect(0, 0, w, 40); g.fillRect(0, h - 40, w, 40);
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4); g.beginPath(); g.moveTo(w / 2, 40); g.lineTo(w / 2, h - 40); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(16, 56, w / 2 - 32, h - 112); g.fillRect(w / 2 + 16, 56, w / 2 - 32, h - 112);
  });
  const glow = canvasTex(64, 64, (g, w, h) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }, false);
  const blob = canvasTex(64, 64, (g, w, h) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(0,0,0,.6)'); r.addColorStop(0.6, 'rgba(0,0,0,.3)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }, false);
  const flash = canvasTex(128, 128, (g, w, h) => {
    g.translate(64, 64); const r = g.createRadialGradient(0, 0, 0, 0, 0, 64); r.addColorStop(0, 'rgba(255,255,240,1)'); r.addColorStop(0.2, 'rgba(255,230,140,.9)'); r.addColorStop(0.5, 'rgba(255,150,40,.35)'); r.addColorStop(1, 'rgba(255,120,0,0)');
    g.fillStyle = r; for (let i = 0; i < 7; i++) { g.rotate(Math.PI * 2 / 7); g.beginPath(); g.moveTo(-9, 0); g.lineTo(0, -62); g.lineTo(9, 0); g.fill(); } g.beginPath(); g.arc(0, 0, 30, 0, 7); g.fill();
  }, false);
  const hole = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 30); r.addColorStop(0, 'rgba(0,0,0,.95)'); r.addColorStop(0.35, 'rgba(20,20,30,.8)'); r.addColorStop(0.5, 'rgba(255,170,80,.35)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }, false);
  const ring = canvasTex(128, 128, (g) => { g.strokeStyle = '#fff'; g.lineWidth = 10; g.shadowColor = '#fff'; g.shadowBlur = 14; g.beginPath(); g.arc(64, 64, 50, 0, 7); g.stroke(); }, false);
  [glow, blob, flash, hole, ring].forEach(t => t.colorSpace = THREE.SRGBColorSpace);
  return { ground, groundE, block, hazard, crate, barrel, wall, glow, blob, flash, hole, ring };
}

// Box geometry with UVs scaled to world size (so textures don't stretch)
export function sizedBox(w, h, d, texScale = 2) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / texScale, uv.getY(k) * dims[f][1] / texScale); }
  return g;
}
export function mergeGeos(list) {
  // list of {geo, matrix}; returns merged non-indexed geometry with position/normal/uv (+color if given)
  let total = 0; const parts = [];
  for (const { geo, matrix, color } of list) { const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(matrix); parts.push({ g, color }); total += g.attributes.position.count; }
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = new Float32Array(total * 2), col = new Float32Array(total * 3);
  let o = 0;
  for (const { g, color } of parts) {
    const n = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    const c = color || new THREE.Color(1, 1, 1); for (let i = 0; i < n; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; }
    o += n; g.dispose();
  }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere(); return out;
}


// ===== الجزر: ثيم لكل جزيرة (ألوان + ديكور) =====
export const THEMES = [
  { id: 'neon', name: 'جزيرة النيون', emoji: '⚡', ui: '#38f3ff', ui2: '#ff3d81',
    fog: '#4a1d5c', fogK: 1, outer: '#120f2c', grid: '#38c8ff', gridI: 0.55, ground: null, wall: null, block: '#ffffff', neon: ['#ff3d81', '#38f3ff', '#ffd23d'], portal: '#ff3d81', pad: '#2a6cff',
    hemi: ['#9d8cff', '#40284a', 1.35], sun: ['#ffc2a0', 2.3], fill: ['#38c8ff', 0.55], exp: 1.05,
    sky: { top: [0.03, 0.02, 0.12], mid: [0.32, 0.06, 0.42], hor: [1.0, 0.36, 0.42], low: [0.07, 0.03, 0.16], sunA: [1.0, 0.25, 0.5], sunB: [1.0, 0.86, 0.3], stars: 1 },
    mt: ['#2b0f48', '#ff3d81'], city: true, props: null },
  { id: 'ice', name: 'جزيرة الجليد', emoji: '🧊', ui: '#9fe8ff', ui2: '#ffffff',
    fog: '#bfe3f5', fogK: 0.85, outer: '#dff4ff', grid: '#7fdcff', gridI: 0.35,
    ground: { base: '#c9e6f5', speck: [210, 235, 250], line: 'rgba(90,150,190,.55)', crack: 'rgba(120,180,220,.6)' },
    wall: { base: '#8fb8d8', band: '#6f9cc2', hi: 'rgba(255,255,255,.22)' }, block: '#d8f1ff', neon: ['#7fdcff', '#ffffff', '#b6a8ff'], portal: '#5ab8ff', pad: '#3fa9ff',
    hemi: ['#e6f6ff', '#7aa6c8', 1.7], sun: ['#ffffff', 2.4], fill: ['#9fe8ff', 0.7], exp: 0.95,
    sky: { top: [0.25, 0.5, 0.82], mid: [0.55, 0.78, 0.95], hor: [0.92, 0.97, 1.0], low: [0.75, 0.86, 0.95], sunA: [1.0, 1.0, 1.0], sunB: [0.85, 0.95, 1.0], stars: 0 },
    mt: ['#9fc4dd', '#ffffff'], city: false, props: 'ice' },
  { id: 'lava', name: 'جزيرة البركان', emoji: '🌋', ui: '#ff6a00', ui2: '#ffd23d',
    fog: '#3a120a', fogK: 0.8, outer: '#1a0805', grid: '#ff5a1a', gridI: 0.85,
    ground: { base: '#2a1d1a', speck: [60, 40, 34], line: 'rgba(10,4,2,.9)', crack: 'rgba(255,110,20,.85)', glowCrack: true },
    wall: { base: '#3a2a26', band: '#241816', hi: 'rgba(255,120,40,.12)' }, block: '#a07a6a', neon: ['#ff4a1a', '#ffb03d', '#ffe14d'], portal: '#ff5a1a', pad: '#ff3a00',
    hemi: ['#ff9a6a', '#3a0f08', 1.25], sun: ['#ffb070', 2.1], fill: ['#ff4a1a', 0.8], exp: 1.05,
    sky: { top: [0.05, 0.01, 0.01], mid: [0.3, 0.05, 0.02], hor: [1.0, 0.35, 0.08], low: [0.12, 0.03, 0.02], sunA: [1.0, 0.2, 0.05], sunB: [1.0, 0.7, 0.2], stars: 0.4 },
    mt: ['#1a0a08', '#ff4a1a'], city: false, props: 'lava' },
  { id: 'forest', name: 'جزيرة الغابة', emoji: '🌴', ui: '#5dff8f', ui2: '#d6ff3d',
    fog: '#2f5a3a', fogK: 0.8, outer: '#163a1c', grid: '#7dff9a', gridI: 0.3,
    ground: { base: '#3f7a35', speck: [70, 130, 55], line: 'rgba(20,50,18,.5)', crack: null, grass: true },
    wall: { base: '#6b4a2e', band: '#4e3420', hi: 'rgba(255,230,160,.10)' }, block: '#c9b48a', neon: ['#d6ff3d', '#7dff9a', '#ffe14d'], portal: '#5dff8f', pad: '#2fd36b',
    hemi: ['#d8ffd0', '#2a4a1a', 1.55], sun: ['#fff1c0', 2.5], fill: ['#9dffb0', 0.5], exp: 1.0,
    sky: { top: [0.12, 0.35, 0.65], mid: [0.35, 0.6, 0.85], hor: [0.85, 0.95, 0.75], low: [0.2, 0.35, 0.2], sunA: [1.0, 0.95, 0.6], sunB: [1.0, 1.0, 0.85], stars: 0 },
    mt: ['#1f4a24', '#5fae4a'], city: false, props: 'forest' },
  { id: 'space', name: 'جزيرة الفضاء', emoji: '🪐', ui: '#b46bff', ui2: '#3dd6ff',
    fog: '#0a0620', fogK: 1.25, outer: '#05030f', grid: '#b46bff', gridI: 0.8,
    ground: { base: '#1a1530', speck: [40, 30, 70], line: 'rgba(160,110,255,.35)', crack: null, dots: true },
    wall: { base: '#241c44', band: '#151030', hi: 'rgba(180,120,255,.14)' }, block: '#b8a8ff', neon: ['#b46bff', '#3dd6ff', '#ff6ad5'], portal: '#b46bff', pad: '#7a3dff',
    hemi: ['#a890ff', '#120a30', 1.3], sun: ['#d8c8ff', 2.0], fill: ['#3dd6ff', 0.7], exp: 1.1,
    sky: { top: [0.0, 0.0, 0.02], mid: [0.04, 0.02, 0.12], hor: [0.3, 0.12, 0.5], low: [0.02, 0.01, 0.05], sunA: [0.5, 0.8, 1.0], sunB: [1.0, 1.0, 1.0], stars: 2.2 },
    mt: ['#0c0820', '#5a2fa0'], city: false, props: 'space' },
];

const _themeTexCache = {};
export function themeTextures(th) {
  if (!th.ground) return null; if (_themeTexCache[th.id]) return _themeTexCache[th.id];
  const R = rnd(11 + th.id.length * 7), G = th.ground, Wc = th.wall;
  const ground = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = G.base; g.fillRect(0, 0, w, h);
    const [sr, sg, sb] = G.speck;
    for (let i = 0; i < 2600; i++) { const v = (R() - 0.5) * 30 | 0; g.fillStyle = `rgba(${sr + v},${sg + v},${sb + v},.4)`; g.fillRect(R() * w, R() * h, 2 + R() * 4, 2 + R() * 4); }
    if (G.grass) { for (let i = 0; i < 1400; i++) { const x = R() * w, y = R() * h; g.strokeStyle = `rgba(${90 + R() * 60 | 0},${150 + R() * 70 | 0},${50 + R() * 30 | 0},.55)`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 4, y - 4 - R() * 6); g.stroke(); } for (let i = 0; i < 26; i++) { g.fillStyle = ['#ffe14d', '#ff8ad5', '#ffffff'][i % 3]; g.beginPath(); g.arc(R() * w, R() * h, 2.5, 0, 7); g.fill(); } }
    if (G.dots) { for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(200,170,255,${0.3 + R() * 0.5})`; g.beginPath(); g.arc(R() * w, R() * h, 1 + R() * 1.6, 0, 7); g.fill(); } }
    if (G.crack) { g.strokeStyle = G.crack; g.lineWidth = G.glowCrack ? 3 : 2; if (G.glowCrack) { g.shadowColor = '#ff6a00'; g.shadowBlur = 8; }
      for (let i = 0; i < 9; i++) { let x = R() * w, y = R() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (R() - 0.5) * 70; y += (R() - 0.5) * 70; g.lineTo(x, y); } g.stroke(); } g.shadowBlur = 0; }
    g.strokeStyle = G.line; g.lineWidth = 5; g.strokeRect(0, 0, w, h); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
  });
  const wall = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = Wc.base; g.fillRect(0, 0, w, h);
    g.fillStyle = Wc.band; g.fillRect(0, 0, w, 40); g.fillRect(0, h - 40, w, 40);
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4); g.beginPath(); g.moveTo(w / 2, 40); g.lineTo(w / 2, h - 40); g.stroke();
    g.fillStyle = Wc.hi; g.fillRect(16, 56, w / 2 - 32, h - 112); g.fillRect(w / 2 + 16, 56, w / 2 - 32, h - 112);
  });
  return (_themeTexCache[th.id] = { ground, wall });
}

export class World {
  constructor(scene, quality, tex) {
    this.scene = scene; this.q = quality; this.tex = tex;
    this.colliders = []; // {minX,minY,minZ,maxX,maxY,maxZ, ramp?, rays:[boxes], obj?}
    this.crates = []; this.barrels = []; this.coverCells = []; this.spawns = []; this.pads = [];
    this.group = new THREE.Group(); scene.add(this.group);
    this.build();
    this.buildNav();
  }
  addBox(x, y, z, w, h, d, extra = {}) {
    const c = { minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2, ...extra };
    c.rays = [c]; this.colliders.push(c); return c;
  }
  addRamp(x, z, w, d, h, axis, dir) {
    // ramp rises along axis ('x' or 'z') in direction dir (+1/-1) from 0 to h
    const c = { minX: x - w / 2, maxX: x + w / 2, minY: 0, maxY: h, minZ: z - d / 2, maxZ: z + d / 2, ramp: { axis, dir, h } };
    const n = 8; c.rays = [];
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, top = h * (i + 0.5) / n;
      if (axis === 'z') { const a = dir > 0 ? c.minZ + d * t0 : c.maxZ - d * t1, b = dir > 0 ? c.minZ + d * t1 : c.maxZ - d * t0; c.rays.push({ minX: c.minX, maxX: c.maxX, minY: 0, maxY: top, minZ: a, maxZ: b }); }
      else { const a = dir > 0 ? c.minX + w * t0 : c.maxX - w * t1, b = dir > 0 ? c.minX + w * t1 : c.maxX - w * t0; c.rays.push({ minX: a, maxX: b, minY: 0, maxY: top, minZ: c.minZ, maxZ: c.maxZ }); }
    }
    this.colliders.push(c); return c;
  }
  topAt(c, x, z) {
    if (!c.ramp) return c.maxY;
    const r = c.ramp; let t;
    if (r.axis === 'z') t = (z - c.minZ) / (c.maxZ - c.minZ); else t = (x - c.minX) / (c.maxX - c.minX);
    if (r.dir < 0) t = 1 - t; return Math.max(0, Math.min(1, t)) * r.h;
  }
  groundAt(x, z, feetY, r = 0) {
    let best = 0;
    for (const c of this.colliders) {
      if (c.dead) continue;
      if (x < c.minX - r || x > c.maxX + r || z < c.minZ - r || z > c.maxZ + r) continue;
      const cx = Math.max(c.minX, Math.min(c.maxX, x)), cz = Math.max(c.minZ, Math.min(c.maxZ, z));
      if (r > 0 && (cx - x) ** 2 + (cz - z) ** 2 > r * r * 0.5) continue;
      const top = this.topAt(c, cx, cz);
      if (top <= feetY + STEP && top > best) best = top;
    }
    return best;
  }
  maxTopAt(x, z) { let best = 0; for (const c of this.colliders) { if (c.dead) continue; if (x <= c.minX || x >= c.maxX || z <= c.minZ || z >= c.maxZ) continue; const t = this.topAt(c, x, z); if (t > best) best = t; } return best; }
  // push a vertical capsule (circle in xz) out of solid colliders. returns true if collided
  collide(p, r, feetY, height) {
    let hit = false;
    for (let iter = 0; iter < 2; iter++) {
      for (const c of this.colliders) {
        if (c.dead) continue;
        if (p.x < c.minX - r || p.x > c.maxX + r || p.z < c.minZ - r || p.z > c.maxZ + r) continue;
        if (c.minY > feetY + height) continue;
        const cx = Math.max(c.minX, Math.min(c.maxX, p.x)), cz = Math.max(c.minZ, Math.min(c.maxZ, p.z));
        const top = this.topAt(c, cx, cz);
        if (top <= feetY + STEP) continue;
        let dx = p.x - cx, dz = p.z - cz; let d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 < 1e-8) { // inside: push along smallest axis
          const ox = Math.min(p.x - c.minX, c.maxX - p.x), oz = Math.min(p.z - c.minZ, c.maxZ - p.z);
          if (ox < oz) p.x = (p.x - c.minX < c.maxX - p.x) ? c.minX - r : c.maxX + r; else p.z = (p.z - c.minZ < c.maxZ - p.z) ? c.minZ - r : c.maxZ + r;
        } else { const d = Math.sqrt(d2), k = (r - d) / d; p.x += dx * k; p.z += dz * k; }
        hit = true;
      }
    }
    const L = ARENA - r; if (p.x < -L) { p.x = -L; hit = true; } if (p.x > L) { p.x = L; hit = true; } if (p.z < -L) { p.z = -L; hit = true; } if (p.z > L) { p.z = L; hit = true; }
    return hit;
  }
  // ray vs static world; returns {t, normal:[x,y,z], col} or null
  raycast(ox, oy, oz, dx, dy, dz, maxT) {
    let best = maxT, bn = null, bc = null;
    const ix = 1 / (dx || 1e-9), iy = 1 / (dy || 1e-9), iz = 1 / (dz || 1e-9);
    for (const c of this.colliders) {
      if (c.dead) continue;
      for (const b of c.rays) {
        let t1 = (b.minX - ox) * ix, t2 = (b.maxX - ox) * ix; let tmin = Math.min(t1, t2), tmax = Math.max(t1, t2), ax = 0;
        let t3 = (b.minY - oy) * iy, t4 = (b.maxY - oy) * iy; let a = Math.min(t3, t4), bb = Math.max(t3, t4);
        if (a > tmin) { tmin = a; ax = 1; } if (bb < tmax) tmax = bb;
        let t5 = (b.minZ - oz) * iz, t6 = (b.maxZ - oz) * iz; a = Math.min(t5, t6); bb = Math.max(t5, t6);
        if (a > tmin) { tmin = a; ax = 2; } if (bb < tmax) tmax = bb;
        if (tmax < Math.max(tmin, 0) || tmin > best || tmin < 0) continue;
        best = tmin; bc = c; bn = ax === 0 ? [-Math.sign(dx), 0, 0] : ax === 1 ? [0, -Math.sign(dy), 0] : [0, 0, -Math.sign(dz)];
      }
    }
    // floor
    if (dy < 0) { const t = -oy / dy; if (t > 0 && t < best) { best = t; bn = [0, 1, 0]; bc = null; } }
    // perimeter walls
    const W = ARENA;
    const tw = [dx > 0 ? (W - ox) / dx : dx < 0 ? (-W - ox) / dx : Infinity, dz > 0 ? (W - oz) / dz : dz < 0 ? (-W - oz) / dz : Infinity];
    if (tw[0] > 0 && tw[0] < best) { best = tw[0]; bn = [-Math.sign(dx), 0, 0]; bc = null; }
    if (tw[1] > 0 && tw[1] < best) { best = tw[1]; bn = [0, 0, -Math.sign(dz)]; bc = null; }
    if (!bn) return null; return { t: best, normal: bn, col: bc };
  }
  los(ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az; const L = Math.hypot(dx, dy, dz); if (L < 1e-4) return true;
    const h = this.raycast(ax, ay, az, dx / L, dy / L, dz / L, L); return !h || h.t >= L - 0.05;
  }

  build() {
    const T = this.tex, g = this.group, q = this.q;
    const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.05, ...o });
    // ground
    T.ground.repeat.set(19, 19); T.groundE.repeat.set(19, 19);
    const ground = this.groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(ARENA * 2, ARENA * 2), std({ map: T.ground, emissiveMap: T.groundE, emissive: new THREE.Color('#38c8ff'), emissiveIntensity: 0.55, roughness: 0.7, metalness: 0.15 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
    // outer ground beyond walls
    const outer = this.outerMesh = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ color: '#120f2c' })); outer.rotation.x = -Math.PI / 2; outer.position.y = -0.05; g.add(outer);

    const blocks = [], walls = [], trims = [], neons = [];
    const box = (x, y, z, w, h, d, list = blocks, collide = true, color) => { list.push({ geo: sizedBox(w, h, d), matrix: new THREE.Matrix4().makeTranslation(x, y + h / 2, z), color }); return collide ? this.addBox(x, y, z, w, h, d) : null; };
    const neon = (x, y, z, w, h, d, color) => neons.push({ geo: new THREE.BoxGeometry(w, h, d), matrix: new THREE.Matrix4().makeTranslation(x, y, z), color: new THREE.Color(color) });

    // perimeter walls (visual) — collision handled by arena clamp + raycast
    const WH = 7, A = ARENA;
    [[0, -A - 0.5, A * 2 + 2, 1], [0, A + 0.5, A * 2 + 2, 1], [-A - 0.5, 0, 1, A * 2], [A + 0.5, 0, 1, A * 2]].forEach(([x, z, w, d]) => {
      walls.push({ geo: sizedBox(w, WH, d, 4), matrix: new THREE.Matrix4().makeTranslation(x, WH / 2, z) });
      const horiz = w > d; neon(horiz ? x : x + (x > 0 ? -0.55 : 0.55), 0.35, horiz ? z + (z > 0 ? -0.55 : 0.55) : z, horiz ? w : 0.12, 0.12, horiz ? 0.12 : d, '#ff3d81');
      neon(horiz ? x : x + (x > 0 ? -0.55 : 0.55), WH - 0.3, horiz ? z + (z > 0 ? -0.55 : 0.55) : z, horiz ? w : 0.12, 0.18, horiz ? 0.12 : d, '#38f3ff');
    });
    // buttresses on walls
    for (let i = -3; i <= 3; i++) { const p = i * 10.5; [[p, -A + 0.4], [p, A - 0.4], [-A + 0.4, p], [A - 0.4, p]].forEach(([x, z]) => { box(x, 0, z, 1.6, WH + 0.6, 1.6, walls); }); }

    // central platform (raised)
    const PH = 3;
    box(0, 0, 0, 10, PH, 10); neon(0, PH + 0.02, 5.02, 10, 0.08, 0.06, '#38f3ff'); neon(0, PH + 0.02, -5.02, 10, 0.08, 0.06, '#38f3ff'); neon(5.02, PH + 0.02, 0, 0.06, 0.08, 10, '#38f3ff'); neon(-5.02, PH + 0.02, 0, 0.06, 0.08, 10, '#38f3ff');
    trims.push({ geo: sizedBox(10.1, 0.5, 10.1), matrix: new THREE.Matrix4().makeTranslation(0, 0.25, 0) });
    // ramps to centre (north & south)
    this.rampMesh(0, 8.5, 3.2, 7, PH, 'z', -1, blocks); this.addRamp(0, 8.5, 3.2, 7, PH, 'z', -1);
    this.rampMesh(0, -8.5, 3.2, 7, PH, 'z', 1, blocks); this.addRamp(0, -8.5, 3.2, 7, PH, 'z', 1);
    // low cover on platform
    box(-3.4, PH, 3.4, 2.4, 1.0, 0.6); box(3.4, PH, -3.4, 2.4, 1.0, 0.6); box(3.6, PH, 2.6, 0.6, 1.0, 2.0); box(-3.6, PH, -2.6, 0.6, 1.0, 2.0);

    // corner bunkers (raised) with ramps
    const BH = 2.4;
    [[-26, -26, 1], [26, 26, -1], [-26, 26, 1], [26, -26, -1]].forEach(([x, z, s], i) => {
      box(x, 0, z, 9, BH, 9);
      neon(x, BH + 0.02, z + 4.52, 9, 0.08, 0.06, '#ff3d81'); neon(x, BH + 0.02, z - 4.52, 9, 0.08, 0.06, '#ff3d81'); neon(x + 4.52, BH + 0.02, z, 0.06, 0.08, 9, '#ff3d81'); neon(x - 4.52, BH + 0.02, z, 0.06, 0.08, 9, '#ff3d81');
      // ramp toward centre along x
      const rx = x + s * 8.0; this.rampMesh(rx, z, 7, 3, BH, 'x', -s, blocks); this.addRamp(rx, z, 7, 3, BH, 'x', -s);
      // parapets
      box(x - s * 2, BH, z + (z > 0 ? -4.2 : 4.2), 5, 1.0, 0.5); box(x + (x > 0 ? -4.2 : 4.2), BH, z - (z > 0 ? 2 : -2), 0.5, 1.0, 4);
      // tall pillar on bunker
      box(x - s * 3, BH, z - (z > 0 ? -3 : 3), 1.2, 4, 1.2, blocks, true);
      neon(x - s * 3, BH + 4.02, z - (z > 0 ? -3 : 3), 1.25, 0.12, 1.25, i % 2 ? '#38f3ff' : '#ffd23d');
    });

    // mid walls & cover (symmetric-ish)
    const cover = [
      // [x, z, w, d, h]
      [-14, 0, 1, 7, 2.2], [14, 0, 1, 7, 2.2], [0, -18, 8, 1, 2.2], [0, 18, 8, 1, 2.2],
      [-9, -12, 3.5, 0.8, 1.25], [9, 12, 3.5, 0.8, 1.25], [-9, 12, 0.8, 3.5, 1.25], [9, -12, 0.8, 3.5, 1.25],
      [-20, -10, 0.8, 4, 1.25], [20, 10, 0.8, 4, 1.25], [-20, 12, 4, 0.8, 1.25], [20, -12, 4, 0.8, 1.25],
      [-28, 0, 3, 3, 3.8], [28, 0, 3, 3, 3.8], [0, -30, 3, 3, 3.8], [0, 30, 3, 3, 3.8],
      [-12, -26, 5, 0.8, 1.3], [12, 26, 5, 0.8, 1.3], [-31, -14, 0.8, 4, 1.3], [31, 14, 0.8, 4, 1.3],
      [12, -24, 0.8, 4, 1.3], [-12, 24, 0.8, 4, 1.3], [26, -10, 4, 0.8, 1.3], [-26, 10, 4, 0.8, 1.3],
      [-6, 22, 1.4, 1.4, 4.5], [6, -22, 1.4, 1.4, 4.5], [22, 4, 1.4, 1.4, 4.5], [-22, -4, 1.4, 1.4, 4.5],
    ];
    for (const [x, z, w, d, h] of cover) {
      box(x, 0, z, w, h, d);
      trims.push({ geo: sizedBox(w + 0.06, 0.32, d + 0.06, 1), matrix: new THREE.Matrix4().makeTranslation(x, 0.16, z) });
      if (h > 3) neon(x, h + 0.03, z, w + 0.04, 0.1, d + 0.04, '#38f3ff');
      else if (h > 2) neon(x, h + 0.03, z, w + 0.04, 0.07, d + 0.04, '#ff3d81');
    }

    const blockMat = std({ map: T.block, vertexColors: true, roughness: 0.8, metalness: 0.1 });
    const wallMat = std({ map: T.wall, roughness: 0.9 });
    const trimMat = std({ map: T.hazard, roughness: 0.7 });
    const neonMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    // tint blocks per instance via vertex color
    blocks.forEach((b, i) => { b.color = b.color || new THREE.Color().setHSL(0.62 + (i % 5) * 0.012, 0.18, 0.72 + (i % 3) * 0.05); });
    const mk = (list, mat, cast = true) => { if (!list.length) return; const m = new THREE.Mesh(mergeGeos(list), mat); m.castShadow = cast; m.receiveShadow = true; g.add(m); return m; };
    mk(blocks, blockMat); mk(walls, wallMat); mk(trims, trimMat, false); const nm = mk(neons, neonMat, false); if (nm) { nm.castShadow = false; nm.receiveShadow = false; }
    this.blockMat = blockMat; this.wallMat = wallMat; this.neonMesh = nm; if (nm) this.neonOrig = nm.geometry.attributes.color.array.slice();

    // crates (instanced) and barrels
    const crateSpots = [
      [-4, 13, 0], [-2.8, 13.4, 0], [-3.4, 13.2, 1], [4, -13, 0], [2.8, -13.4, 0], [16.5, -4, 0], [16.5, -2.8, 0], [16.5, -3.4, 1], [-16.5, 4, 0], [-16.5, 2.8, 0],
      [-24, -18, 0], [-22.8, -18, 0], [24, 18, 0], [22.8, 18.2, 0], [23.4, 18.1, 1], [8, 30, 0], [-8, -30, 0], [30, -24, 0], [-30, 24, 0], [-30, 22.8, 0],
      [10, 5, 0], [-10, -5, 0], [6, 0, 0], [-6, 0.5, 0], [-18, 20, 0], [18, -20, 0], [33, -4, 0], [-33, 4, 0],
    ];
    const CS = 1.2;
    const crateGeo = new THREE.BoxGeometry(CS, CS, CS);
    this.crateMesh = new THREE.InstancedMesh(crateGeo, std({ map: T.crate, roughness: 0.75 }), crateSpots.length);
    this.crateMesh.castShadow = true; this.crateMesh.receiveShadow = true;
    const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), e = new THREE.Euler();
    crateSpots.forEach(([x, z, lvl], i) => {
      const base = lvl ? CS : 0; const y = this.maxTopAt(x, z) * 0 + base;
      const rot = ((i * 37) % 7 - 3) * 0.06; e.set(0, rot, 0); qq.setFromEuler(e);
      m4.compose(new THREE.Vector3(x, y + CS / 2, z), qq, new THREE.Vector3(1, 1, 1)); this.crateMesh.setMatrixAt(i, m4);
      const c = this.addBox(x, y, z, CS * 0.98, CS, CS * 0.98, { kind: 'crate', idx: i, hp: 50, matrix: m4.clone() });
      this.crates.push(c);
    });
    // stacked crates sit on lower ones: lower must die first -> link
    this.crates.forEach(c => { if (c.minY > 0.1) { const below = this.crates.find(o => o !== c && o.minY < 0.1 && Math.abs((o.minX + o.maxX) / 2 - (c.minX + c.maxX) / 2) < 1 && Math.abs((o.minZ + o.maxZ) / 2 - (c.minZ + c.maxZ) / 2) < 1); if (below) below.above = c; } });
    this.crates.forEach(c => c.orig = { minY: c.minY, maxY: c.maxY, matrix: c.matrix.clone() });
    g.add(this.crateMesh);

    const barrelSpots = [[-13, -2.5], [13, 2.5], [2.5, -19], [-2.5, 19], [-27, 3], [27, -3], [-10, 26.5], [10, -26.5], [21, -14], [-21, 14], [7, 9], [-7, -9]];
    const bGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.1, 12, 1);
    this.barrelMesh = new THREE.InstancedMesh(bGeo, [std({ map: T.barrel, roughness: 0.5, metalness: 0.3, emissive: new THREE.Color('#400008') }), std({ color: '#55141c', roughness: 0.6 }), std({ color: '#55141c' })], barrelSpots.length);
    this.barrelMesh.castShadow = true;
    barrelSpots.forEach(([x, z], i) => {
      m4.compose(new THREE.Vector3(x, 0.55, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)); this.barrelMesh.setMatrixAt(i, m4);
      this.barrels.push(this.addBox(x, 0, z, 0.86, 1.1, 0.86, { kind: 'barrel', idx: i, hp: 25, matrix: m4.clone() }));
    });
    this.barrels.forEach(c => c.orig = { minY: c.minY, maxY: c.maxY, matrix: c.matrix.clone() });
    g.add(this.barrelMesh);
    // barrel glow tops
    this.barrelGlow = [];
    const gm = new THREE.SpriteMaterial({ map: T.glow, color: '#ff4040', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7 });
    barrelSpots.forEach(([x, z]) => { const s = new THREE.Sprite(gm); s.position.set(x, 1.15, z); s.scale.set(0.8, 0.8, 1); g.add(s); this.barrelGlow.push(s); });

    // spawn portals
    const portals = [[0, -35], [0, 35], [-35, 0], [35, 0], [-34, -14], [34, 14], [-14, 34], [14, -34], [-34, 30], [34, -30]];
    const pGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.12, 24, 1, true);
    const pMat = this.portalMat = new THREE.MeshBasicMaterial({ color: '#ff3d81', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const ringGeo = new THREE.RingGeometry(1.0, 1.6, 24); const ringMat = this.ringMat = new THREE.MeshBasicMaterial({ map: T.ring, color: '#ff5c9a', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    this.portalRings = [];
    for (const [x, z] of portals) {
      const p = new THREE.Mesh(pGeo, pMat); p.position.set(x, 0.06, z); g.add(p);
      const r = new THREE.Mesh(new THREE.CircleGeometry(1.7, 24), ringMat); r.rotation.x = -Math.PI / 2; r.position.set(x, 0.03, z); g.add(r); this.portalRings.push(r);
      this.spawns.push(new THREE.Vector3(x, 0, z));
    }
    // pickup pads
    const pads = [[0, 0, PH], [-26, -26, BH], [26, 26, BH], [-26, 26, BH], [26, -26, BH], [-17, 0, 0], [17, 0, 0], [0, 23, 0], [0, -23, 0]];
    const padGeo = new THREE.CylinderGeometry(0.9, 1.0, 0.1, 16); const padMat = this.padMat = std({ color: '#1a2050', emissive: new THREE.Color('#2a6cff'), emissiveIntensity: 0.6 });
    pads.forEach(([x, z, y], i) => { const m = new THREE.Mesh(padGeo, padMat); m.position.set(x, y + 0.05, z); m.receiveShadow = true; g.add(m); this.pads.push({ pos: new THREE.Vector3(x, y + 0.1, z), type: ['armor', 'health', 'ammo', 'health', 'ammo', 'ammo', 'health', 'armor', 'ammo'][i] }); });

    // light poles with glowing heads (decor)
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 8, 6); const poleMat = std({ color: '#2a2e4f' });
    const lampMat = new THREE.MeshBasicMaterial({ color: '#ffe7b0', toneMapped: false });
    const lampGlow = new THREE.SpriteMaterial({ map: T.glow, color: '#ffcf8a', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 });
    [[-36.2, -36.2], [36.2, 36.2], [-36.2, 36.2], [36.2, -36.2]].forEach(([x, z]) => {
      const p = new THREE.Mesh(poleGeo, poleMat); p.position.set(x, 4, z); g.add(p);
      const l = new THREE.Mesh(new THREE.BoxGeometry(1, 0.3, 1), lampMat); l.position.set(x, 8.1, z); g.add(l);
      const s = new THREE.Sprite(lampGlow); s.position.set(x, 8.1, z); s.scale.set(5, 5, 1); g.add(s);
    });
  }

  // ===== تغيير ثيم الجزيرة (ألوان + ديكور + عوائق صغيرة) =====
  setTheme(idx) {
    const th = THEMES[idx] || THEMES[0]; if (this.themeId === th.id) return th; this.themeId = th.id;
    const T = this.tex, tt = themeTextures(th);
    const gm = this.groundMesh.material, gtex = tt ? tt.ground : T.ground; gtex.repeat.set(19, 19);
    gm.map = gtex; gm.emissive.set(th.grid); gm.emissiveIntensity = th.gridI; gm.needsUpdate = true;
    this.wallMat.map = tt ? tt.wall : T.wall; this.wallMat.needsUpdate = true;
    this.blockMat.color.set(th.block); this.outerMesh.material.color.set(th.outer);
    this.portalMat.color.set(th.portal); this.ringMat.color.set(th.portal); this.padMat.emissive.set(th.pad);
    if (this.neonMesh) {
      const src = [new THREE.Color('#ff3d81'), new THREE.Color('#38f3ff'), new THREE.Color('#ffd23d')], dst = th.neon.map(c => new THREE.Color(c));
      const o = this.neonOrig, attr = this.neonMesh.geometry.attributes.color, a = attr.array;
      for (let i = 0; i < a.length; i += 3) { let bk = 0, bd = 1e9; for (let k = 0; k < 3; k++) { const d = (o[i] - src[k].r) ** 2 + (o[i + 1] - src[k].g) ** 2 + (o[i + 2] - src[k].b) ** 2; if (d < bd) { bd = d; bk = k; } } a[i] = dst[bk].r; a[i + 1] = dst[bk].g; a[i + 2] = dst[bk].b; }
      attr.needsUpdate = true;
    }
    // remove old props
    if (this.themeGroup) { this.group.remove(this.themeGroup); this.themeGroup.traverse(m => { if (m.geometry) m.geometry.dispose(); }); }
    if (this.themeCols) this.colliders = this.colliders.filter(c => !this.themeCols.includes(c));
    this.themeGroup = new THREE.Group(); this.themeCols = []; this.group.add(this.themeGroup);
    if (th.props) this.buildProps(th);
    this.buildNav(); this.dirtyShadows = true;
    return th;
  }
  propSpots(n, seed) {
    const R = rnd(seed), out = []; let tries = 0;
    while (out.length < n && tries++ < 600) {
      const x = (R() * 2 - 1) * 32, z = (R() * 2 - 1) * 32, s = 1.2 + R() * 0.8, h = 1.4 + R() * 1.4;
      if (Math.hypot(x, z) < 9) continue;
      if (this.spawns.some(p => Math.hypot(p.x - x, p.z - z) < 5)) continue;
      if (this.pads.some(p => Math.hypot(p.pos.x - x, p.pos.z - z) < 3.5)) continue;
      const m = 1.8; if (this.colliders.some(c => x + s / 2 + m > c.minX && x - s / 2 - m < c.maxX && z + s / 2 + m > c.minZ && z - s / 2 - m < c.maxZ)) continue;
      if (out.some(o => Math.hypot(o.x - x, o.z - z) < 6)) continue;
      out.push({ x, z, s, h });
    }
    return out;
  }
  buildProps(th) {
    const g = this.themeGroup, R = rnd(99 + th.id.length * 13);
    const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.05, flatShading: true, ...o });
    const solid = (mesh, x, z, w, h, d) => { mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); this.themeCols.push(this.addBox(x, 0, z, w, h, d)); };
    const flat = (geo, mat, x, z, rot = 0) => { const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.rotation.z = rot; m.position.set(x, 0.012, z); g.add(m); return m; };
    const ring = (n, r0, r1, f) => { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + R() * 0.12, r = r0 + R() * (r1 - r0); f(Math.cos(a) * r, Math.sin(a) * r, i); } };
    const spots = this.propSpots(7, 7 + th.id.length * 31);
    if (th.props === 'ice') {
      const iceM = std({ color: '#cdeeff', roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.88, emissive: new THREE.Color('#2a6a9a'), emissiveIntensity: 0.25 });
      for (const p of spots) { const m = new THREE.Mesh(new THREE.BoxGeometry(p.s, p.h, p.s * 1.15), iceM); m.position.set(p.x, p.h / 2, p.z); solid(m, p.x, p.z, p.s, p.h, p.s * 1.15); }
      const spikeM = std({ color: '#e8f8ff', roughness: 0.3, emissive: new THREE.Color('#5ab8ff'), emissiveIntensity: 0.12 });
      ring(34, 46, 80, (x, z) => { const h = 10 + R() * 26, r = 2 + R() * 4; const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), spikeM); m.position.set(x, h / 2 - 0.5, z); m.rotation.y = R() * 3; g.add(m); });
      const snowM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, transparent: true, opacity: 0.75, polygonOffset: true, polygonOffsetFactor: -1 });
      for (let i = 0; i < 18; i++) flat(new THREE.CircleGeometry(1.2 + R() * 2.4, 10), snowM, (R() * 2 - 1) * 35, (R() * 2 - 1) * 35);
    } else if (th.props === 'lava') {
      const rockM = std({ color: '#4a3530', roughness: 0.95, emissive: new THREE.Color('#ff3a00'), emissiveIntensity: 0.08 });
      for (const p of spots) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), rockM); m.scale.set(p.s * 1.1, p.h * 1.05, p.s * 1.1); m.position.set(p.x, p.h * 0.45, p.z); m.rotation.y = R() * 3; solid(m, p.x, p.z, p.s * 0.95, p.h, p.s * 0.95); }
      const volM = std({ color: '#2e1a14', roughness: 1 }), topM = new THREE.MeshBasicMaterial({ color: '#ff5a10', toneMapped: false });
      const glowM = new THREE.SpriteMaterial({ map: this.tex.glow, color: '#ff6a1a', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 });
      ring(7, 60, 85, (x, z) => { const h = 22 + R() * 22, r = 16 + R() * 10; const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.22, r, h, 9, 1), volM); m.position.set(x, h / 2 - 1, z); g.add(m); const t = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.2, r * 0.2, 0.6, 9), topM); t.position.set(x, h - 0.9, z); g.add(t); const s = new THREE.Sprite(glowM); s.position.set(x, h + 2, z); s.scale.set(r * 1.6, r * 1.2, 1); g.add(s); });
      const lavaM = new THREE.MeshBasicMaterial({ color: '#ff6a1a', toneMapped: false, transparent: true, opacity: 0.9, polygonOffset: true, polygonOffsetFactor: -1 });
      for (let i = 0; i < 14; i++) flat(new THREE.PlaneGeometry(0.35 + R() * 0.3, 3 + R() * 6), lavaM, (R() * 2 - 1) * 34, (R() * 2 - 1) * 34, R() * 3);
    } else if (th.props === 'forest') {
      const trunkM = std({ color: '#6b4426', roughness: 0.95 }), leafM = std({ color: '#2fae4a', roughness: 0.85 }), leaf2 = std({ color: '#5ad45a', roughness: 0.85 });
      for (const p of spots) {
        const th2 = 4.2 + R() * 1.5; const t = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, th2, 7), trunkM); t.position.set(p.x, th2 / 2, p.z); solid(t, p.x, p.z, 0.9, th2, 0.9);
        const c1 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 0), leafM); c1.position.set(p.x, th2 + 0.8, p.z); c1.castShadow = true; g.add(c1);
        const c2 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 0), leaf2); c2.position.set(p.x + 0.7, th2 + 1.9, p.z - 0.4); c2.castShadow = true; g.add(c2);
      }
      ring(46, 44, 82, (x, z, i) => { const h = 10 + R() * 14; const t = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, h * 0.5, 6), trunkM); t.position.set(x, h * 0.25, z); g.add(t); const c = new THREE.Mesh(i % 2 ? new THREE.ConeGeometry(4 + R() * 3, h * 0.8, 7) : new THREE.IcosahedronGeometry(4 + R() * 3, 0), i % 3 ? leafM : leaf2); c.position.set(x, h * 0.5 + h * 0.3, z); g.add(c); });
      const bushM = std({ color: '#3fbf4f' }); const flowerM = new THREE.MeshBasicMaterial({ color: '#ffe14d' });
      for (let i = 0; i < 16; i++) { const x = (R() * 2 - 1) * 36.5, z = (R() > 0.5 ? 1 : -1) * (36 + R() * 0.8); const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7 + R() * 0.4, 0), bushM); b.position.set(i % 2 ? x : z, 0.4, i % 2 ? z : x); g.add(b); }
    } else if (th.props === 'space') {
      const crysM = std({ color: '#b46bff', roughness: 0.25, metalness: 0.3, emissive: new THREE.Color('#7a3dff'), emissiveIntensity: 0.55 });
      const crys2 = std({ color: '#3dd6ff', roughness: 0.25, metalness: 0.3, emissive: new THREE.Color('#1e88ff'), emissiveIntensity: 0.55 });
      spots.forEach((p, i) => { const h = p.h + 1.2; const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), i % 2 ? crys2 : crysM); m.scale.set(p.s, h, p.s); m.position.set(p.x, h / 2, p.z); solid(m, p.x, p.z, p.s * 0.7, h, p.s * 0.7); });
      const astM = std({ color: '#4a4466', roughness: 1 });
      ring(30, 48, 90, (x, z) => { const r = 1.5 + R() * 5; const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), astM); m.position.set(x, 10 + R() * 40, z); m.rotation.set(R() * 3, R() * 3, 0); g.add(m); });
      const pl = (x, y, z, r, col, ringCol) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), new THREE.MeshBasicMaterial({ color: col, fog: false })); m.position.set(x, y, z); g.add(m); if (ringCol) { const rg = new THREE.Mesh(new THREE.RingGeometry(r * 1.35, r * 2.0, 48), new THREE.MeshBasicMaterial({ color: ringCol, side: THREE.DoubleSide, transparent: true, opacity: 0.7, fog: false })); rg.position.copy(m.position); rg.rotation.set(1.2, 0.3, 0); g.add(rg); } };
      pl(-140, 120, -260, 42, '#c87aff', '#ffd23d'); pl(200, 70, 180, 22, '#3dd6ff', null); pl(60, 160, 300, 14, '#ff6ad5', null);
      const starM = new THREE.MeshBasicMaterial({ color: '#d8c8ff', toneMapped: false, transparent: true, opacity: 0.8, polygonOffset: true, polygonOffsetFactor: -1 });
      for (let i = 0; i < 24; i++) flat(new THREE.CircleGeometry(0.12 + R() * 0.12, 6), starM, (R() * 2 - 1) * 36, (R() * 2 - 1) * 36);
    }
  }
  rampMesh(x, z, w, d, h, axis, dir, list) {
    // wedge geometry
    const geo = new THREE.BufferGeometry();
    const hw = w / 2, hd = d / 2;
    // build in local space rising along +z from -hd (0) to +hd (h)
    const L = axis === 'z' ? d : w, Wd = axis === 'z' ? w : d, hl = L / 2, hwd = Wd / 2;
    const v = [
      // top slope
      -hwd, 0, -hl, hwd, 0, -hl, hwd, h, hl, -hwd, 0, -hl, hwd, h, hl, -hwd, h, hl,
      // back
      -hwd, 0, hl, -hwd, h, hl, hwd, h, hl, -hwd, 0, hl, hwd, h, hl, hwd, 0, hl,
      // left side
      -hwd, 0, -hl, -hwd, h, hl, -hwd, 0, hl,
      // right side
      hwd, 0, -hl, hwd, 0, hl, hwd, h, hl,
    ];
    const slopeLen = Math.hypot(L, h);
    const uv = [0, 0, Wd / 2, 0, Wd / 2, slopeLen / 2, 0, 0, Wd / 2, slopeLen / 2, 0, slopeLen / 2,
      0, 0, 0, h / 2, Wd / 2, h / 2, 0, 0, Wd / 2, h / 2, Wd / 2, 0,
      0, 0, L / 2, h / 2, L / 2, 0, 0, 0, L / 2, 0, L / 2, h / 2];
    // the triangles above are wound inward (the faces were culled = ramp looked invisible): flip each triangle so the faces point outward
    for (let t = 0; t < v.length / 9; t++) { for (let k = 0; k < 3; k++) { const i1 = t * 9 + 3 + k, i2 = t * 9 + 6 + k; const tmp = v[i1]; v[i1] = v[i2]; v[i2] = tmp; } }
    for (let t = 0; t < uv.length / 6; t++) { for (let k = 0; k < 2; k++) { const i1 = t * 6 + 2 + k, i2 = t * 6 + 4 + k; const tmp = uv[i1]; uv[i1] = uv[i2]; uv[i2] = tmp; } }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals();
    const m = new THREE.Matrix4();
    let ang = 0; if (axis === 'z') ang = dir > 0 ? 0 : Math.PI; else ang = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    m.makeRotationY(ang).setPosition(x, 0, z);
    list.push({ geo, matrix: m, color: new THREE.Color('#9fb0e0') });
  }
  damageProp(c, dmg) {
    if (c.dead || !c.kind) return false;
    c.hp -= dmg; if (c.hp > 0) return false;
    this.killProp(c); return true;
  }
  killProp(c) {
    c.dead = true;
    const mesh = c.kind === 'crate' ? this.crateMesh : this.barrelMesh;
    const z = new THREE.Matrix4().makeScale(0, 0, 0); mesh.setMatrixAt(c.idx, z); mesh.instanceMatrix.needsUpdate = true;
    if (c.kind === 'barrel') this.barrelGlow[c.idx].visible = false;
    // a crate on top falls
    if (c.above && !c.above.dead) { const a = c.above; const dy = a.minY; a.minY -= dy; a.maxY -= dy; a.matrix.elements[13] -= dy; mesh.setMatrixAt(a.idx, a.matrix); mesh.instanceMatrix.needsUpdate = true; }
    this.updateNavAround((c.minX + c.maxX) / 2, (c.minZ + c.maxZ) / 2, 3);
    this.dirtyShadows = true;
  }
  restoreProps() {
    let changed = false;
    for (const c of [...this.crates, ...this.barrels]) {
      if (!c.orig) continue;
      const moved = c.minY !== c.orig.minY;
      if (!c.dead && !moved) { c.hp = c.kind === 'crate' ? 50 : 25; continue; }
      changed = true; c.dead = false; c.hp = c.kind === 'crate' ? 50 : 25; c.minY = c.orig.minY; c.maxY = c.orig.maxY; c.matrix.copy(c.orig.matrix);
      const mesh = c.kind === 'crate' ? this.crateMesh : this.barrelMesh; mesh.setMatrixAt(c.idx, c.matrix); mesh.instanceMatrix.needsUpdate = true; if (c.kind === 'barrel') this.barrelGlow[c.idx].visible = true;
    }
    if (changed) { this.buildNav(); this.dirtyShadows = true; }
  }

  // ---------- navigation grid ----------
  buildNav() {
    const N = ARENA * 2; this.N = N; this.navH = new Float32Array(N * N); this.navBlock = new Uint8Array(N * N); this.flow = new Float32Array(N * N);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) this.computeCell(i, j);
    this.coverCells = [];
    for (let i = 1; i < N - 1; i++) for (let j = 1; j < N - 1; j++) {
      const k = i * N + j; if (this.navBlock[k]) continue; const h = this.navH[k];
      // a cover cell: adjacent to a solid at least 1.1 above
      let cover = false; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = (i + di) - ARENA + 0.5, z = (j + dj) - ARENA + 0.5; if (this.maxTopAt(x, z) > h + 1.1) cover = true; }
      if (cover) this.coverCells.push(k);
    }
  }
  computeCell(i, j) {
    const N = this.N, k = i * N + j, x = i - ARENA + 0.5, z = j - ARENA + 0.5;
    const h = this.maxTopAt(x, z); this.navH[k] = h; let blocked = 0;
    if (i < 1 || j < 1 || i >= N - 1 || j >= N - 1) blocked = 1;
    else {
      const r = 0.55;
      for (const c of this.colliders) { if (c.dead) continue; if (x + r < c.minX || x - r > c.maxX || z + r < c.minZ || z - r > c.maxZ) continue; const cx = Math.max(c.minX, Math.min(c.maxX, x)), cz = Math.max(c.minZ, Math.min(c.maxZ, z)); if (this.topAt(c, cx, cz) > h + 0.65) { blocked = 1; break; } }
    }
    this.navBlock[k] = blocked;
  }
  updateNavAround(x, z, r) { const i0 = Math.max(0, Math.floor(x + ARENA - r)), i1 = Math.min(this.N - 1, Math.ceil(x + ARENA + r)), j0 = Math.max(0, Math.floor(z + ARENA - r)), j1 = Math.min(this.N - 1, Math.ceil(z + ARENA + r)); for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) this.computeCell(i, j); }
  cellOf(x, z) { const i = Math.max(0, Math.min(this.N - 1, Math.floor(x + ARENA))), j = Math.max(0, Math.min(this.N - 1, Math.floor(z + ARENA))); return i * this.N + j; }
  computeFlow(tx, tz, ty) {
    const N = this.N, F = this.flow; F.fill(1e9);
    let start = this.cellOf(tx, tz);
    if (this.navBlock[start] || Math.abs(this.navH[start] - ty) > 1.2) { // nearest open cell with similar height
      let best = -1, bd = 1e9; const si = (start / N) | 0, sj = start % N;
      for (let di = -3; di <= 3; di++) for (let dj = -3; dj <= 3; dj++) { const i = si + di, j = sj + dj; if (i < 0 || j < 0 || i >= N || j >= N) continue; const k = i * N + j; if (this.navBlock[k]) continue; const d = di * di + dj * dj + Math.abs(this.navH[k] - ty) * 8; if (d < bd) { bd = d; best = k; } }
      if (best >= 0) start = best;
    }
    const q = this._q || (this._q = new Int32Array(N * N)); let qh = 0, qt = 0; q[qt++] = start; F[start] = 0;
    const nb = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1]];
    while (qh < qt) {
      const k = q[qh++], i = (k / N) | 0, j = k % N, d = F[k], h = this.navH[k];
      for (const [di, dj, c] of nb) {
        const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue; const nk = ni * N + nj;
        if (this.navBlock[nk] || F[nk] <= d + c) continue; if (Math.abs(this.navH[nk] - h) > 0.5) continue;
        F[nk] = d + c; q[qt++] = nk;
      }
    }
  }
  // best direction from (x,z) following flow; returns [dx,dz] or null
  flowDir(x, z, y = null) {
    const N = this.N, k = this.cellOf(x, z), i = (k / N) | 0, j = k % N, F = this.flow;
    const h = y === null ? this.navH[k] : y; const tol = y === null ? 0.5 : 0.8; let best = Math.abs(this.navH[k] - h) <= tol ? F[k] : 1e9, bi = -1, bj = -1;
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue; const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue; const nk = ni * N + nj;
      if (this.navBlock[nk] || Math.abs(this.navH[nk] - h) > tol) continue;
      if (di && dj) { if (this.navBlock[i * N + nj] || this.navBlock[ni * N + j]) continue; }
      const v = F[nk] + (di && dj ? 0.41 : 0); if (v < best) { best = v; bi = ni; bj = nj; }
    }
    if (bi < 0) { if (F[k] >= 1e9) return null; return [0, 0]; }
    const cx = bi - ARENA + 0.5, cz = bj - ARENA + 0.5; const dx = cx - x, dz = cz - z, L = Math.hypot(dx, dz) || 1; return [dx / L, dz / L];
  }
  randomOpenPoint(nearX, nearZ, rad, rng = Math.random) {
    for (let t = 0; t < 30; t++) { const x = nearX + (rng() * 2 - 1) * rad, z = nearZ + (rng() * 2 - 1) * rad; if (Math.abs(x) > ARENA - 2 || Math.abs(z) > ARENA - 2) continue; const k = this.cellOf(x, z); if (!this.navBlock[k] && this.navH[k] < 0.1) return new THREE.Vector3(x, 0, z); }
    return new THREE.Vector3(nearX, 0, nearZ);
  }
}

export function makeSky(scene, quality) {
  const geo = new THREE.SphereGeometry(450, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sunDir: { value: new THREE.Vector3(0.0, 0.16, -1).normalize() }, time: { value: 0 }, cTop: { value: new THREE.Vector3(0.03, 0.02, 0.12) }, cMid: { value: new THREE.Vector3(0.32, 0.06, 0.42) }, cHor: { value: new THREE.Vector3(1.0, 0.36, 0.42) }, cLow: { value: new THREE.Vector3(0.07, 0.03, 0.16) }, sunA: { value: new THREE.Vector3(1.0, 0.25, 0.5) }, sunB: { value: new THREE.Vector3(1.0, 0.86, 0.3) }, stars: { value: 1 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*p; gl_Position.z = gl_Position.w; }`,
    fragmentShader: `varying vec3 vDir; uniform vec3 sunDir; uniform float time; uniform vec3 cTop, cMid, cHor, cLow, sunA, sunB; uniform float stars;
      float hash(vec3 p){ p=fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      void main(){
        vec3 d = normalize(vDir); float h = d.y;
        vec3 top = cTop, mid = cMid, hor = cHor, low = cLow;
        vec3 col = h>0.0 ? mix(mix(hor, mid, smoothstep(0.0,0.18,h)), top, smoothstep(0.15,0.65,h)) : mix(hor*0.6, low, smoothstep(0.0,0.08,-h));
        // retro sun
        vec3 sd = normalize(sunDir); float a = acos(clamp(dot(d, sd),-1.0,1.0));
        float sun = smoothstep(0.155,0.15,a);
        float yy = (d.y - sd.y); float bands = step(0.5, fract((yy+0.2)*42.0)) + step(0.012, yy) ;
        sun *= clamp(bands,0.0,1.0);
        vec3 sunCol = mix(sunA, sunB, smoothstep(-0.1,0.13,yy));
        col = mix(col, sunCol*1.4, sun);
        col += mix(sunA, hor, 0.5)*pow(max(0.0,1.0-a/0.9),3.0)*0.35;
        // stars
        if(h>0.1){ vec3 g = floor(d*220.0); float s = hash(g); col += vec3(step(0.995,s))*smoothstep(0.1,0.5,h)*(0.6+0.4*sin(time*3.0+s*50.0))*stars; }
        gl_FragColor = vec4(col,1.0);
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(geo, mat); sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  // distant low-poly mountains ring
  const mGeo = new THREE.BufferGeometry(); const pos = []; const col = [];
  const R = rnd(3); const n = 48; const c1 = new THREE.Color('#2b0f48'), c2 = new THREE.Color('#ff3d81');
  for (let i = 0; i < n; i++) {
    const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, am = (a0 + a1) / 2; const rad = 230 + R() * 40; const hgt = 18 + R() * 46 * (0.6 + 0.4 * Math.abs(Math.sin(am * 2)));
    const p0 = [Math.cos(a0) * rad, -2, Math.sin(a0) * rad], p1 = [Math.cos(a1) * rad, -2, Math.sin(a1) * rad], pm = [Math.cos(am) * (rad - 10), hgt, Math.sin(am) * (rad - 10)];
    pos.push(...p0, ...pm, ...p1);
    col.push(c1.r, c1.g, c1.b, c2.r * 0.5, c2.g * 0.3, c2.b * 0.6, c1.r, c1.g, c1.b);
  }
  mGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); mGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const mountains = new THREE.Mesh(mGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false }));
  scene.add(mountains);
  // city silhouette blocks
  const cityG = []; const cm = new THREE.Matrix4();
  for (let i = 0; i < 90; i++) { const a = R() * Math.PI * 2, r = 120 + R() * 60, w = 6 + R() * 10, h = 10 + R() * 45; cityG.push({ geo: new THREE.BoxGeometry(w, h, w), matrix: cm.clone().makeTranslation(Math.cos(a) * r, h / 2 - 1, Math.sin(a) * r), color: new THREE.Color().setHSL(0.72 + R() * 0.05, 0.5, 0.06 + R() * 0.05) }); }
  const city = new THREE.Mesh(mergeGeos(cityG), new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }));
  scene.add(city);
  return { sky, mat, mountains, city };
}

export function applySkyTheme(S, th) {
  if (!S) return; const u = S.mat.uniforms, s = th.sky; const V = (k, a) => u[k].value.set(a[0], a[1], a[2]);
  V('cTop', s.top); V('cMid', s.mid); V('cHor', s.hor); V('cLow', s.low); V('sunA', s.sunA); V('sunB', s.sunB); u.stars.value = s.stars;
  if (S.mountains) { const c1 = new THREE.Color(th.mt[0]), c2 = new THREE.Color(th.mt[1]), a = S.mountains.geometry.attributes.color, neon = th.id === 'neon';
    for (let i = 0; i < a.count; i += 3) { a.setXYZ(i, c1.r, c1.g, c1.b); a.setXYZ(i + 1, neon ? c2.r * 0.5 : c2.r * 0.7, neon ? c2.g * 0.3 : c2.g * 0.7, neon ? c2.b * 0.6 : c2.b * 0.7); a.setXYZ(i + 2, c1.r, c1.g, c1.b); } a.needsUpdate = true; }
  if (S.city) S.city.visible = !!th.city;
}
