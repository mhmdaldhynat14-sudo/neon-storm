import * as THREE from '../three.module.min.js';
import { World, makeTextures, makeSky, ARENA, THEMES, applySkyTheme } from './world.js';
import { FX } from './fx.js';
import { WEAPONS, Viewmodel, buildGun } from './weapons.js';
import { Enemies, Projectiles, TYPES, bossFor } from './enemies.js';
import { Shop, SHOP_WEAPONS, SHOP_NEW } from './shop.js';
import { Sound } from './audio.js';
import { Input } from './input.js';

const $ = id => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } } };

const DEFAULTS = { fov: 75, viewDist: 1, bs: 1, sensT: 1, sensM: 1, smooth: 0.5, quality: 'auto', vol: 0.8, music: true, autoFire: false, assist: true, invert: false, leftFire: false, fps: false, shake: true, vibe: true, view: 'fp', zoomIdx: 1, fpsCap: 60, musicVol: 1, bop: 1, unscopeRun: true, unreloadRun: true, leanAim: true, layout: {} };
const S = Object.assign({}, DEFAULTS, LS.get('ns_settings', {}));
const saveSettings = () => LS.set('ns_settings', S);
// طلب قصي: الحساسية +25% (مرة وحدة، لكل اللي عندهم إعدادات محفوظة)
if (!LS.get('ns_mig_sens25', false)) { S.sensT = Math.min(3, (+S.sensT || 1) * 1.25); S.sensM = Math.min(3, (+S.sensM || 1) * 1.25); LS.set('ns_mig_sens25', true); LS.set('ns_settings', S); }
if (!LS.get('ns_mig_sens20', false)) { S.sensT = Math.min(3, (+S.sensT || 1) * 1.2); S.sensM = Math.min(3, (+S.sensM || 1) * 1.2); LS.set('ns_mig_sens20', true); LS.set('ns_settings', S); }

const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const QUAL = { low: { pr: 0.8, shadows: 0, aa: false, env: false }, med: { pr: 1.25, shadows: 1024, aa: false, env: true }, high: { pr: 2, shadows: 2048, aa: true, env: true } };
function qualityKey() { if (S.quality !== 'auto') return S.quality; return isTouch ? 'med' : 'high'; }
const QK = qualityKey(), Q = QUAL[QK];

// ---------- renderer ----------
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: Q.aa, powerPreference: 'high-performance', stencil: false });
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = Q.shadows > 0; renderer.shadowMap.type = QK === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
renderer.autoClear = false;
let pixelRatio = Math.min(window.devicePixelRatio || 1, Q.pr), prCap = Math.min(window.devicePixelRatio || 1, S.quality === 'auto' ? QUAL.med.pr : Q.pr);
renderer.setPixelRatio(pixelRatio);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#4a1d5c', 45, 210); let FOGK = 1; function applyViewDist() { const k = (S.viewDist || 1) * FOGK; scene.fog.near = 45 * k; scene.fog.far = 210 * k; }
const camera = new THREE.PerspectiveCamera(75, 1, 0.05, 900); camera.rotation.order = 'YXZ'; applyViewDist();
const tex = makeTextures();
const sky = makeSky(scene, QK);

const hemi = new THREE.HemisphereLight('#9d8cff', '#40284a', 1.35); scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffc2a0', 2.3); sun.position.set(18, 38, -50); scene.add(sun); scene.add(sun.target);
const fill = new THREE.DirectionalLight('#38c8ff', 0.55); fill.position.set(-20, 15, 40); scene.add(fill);
if (Q.shadows) { sun.castShadow = true; sun.shadow.mapSize.set(Q.shadows, Q.shadows); const sc = sun.shadow.camera; sc.left = -46; sc.right = 46; sc.top = 46; sc.bottom = -46; sc.near = 5; sc.far = 140; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.05; }

const world = new World(scene, QK, tex);
const fx = new FX(scene, tex, world, QK);
const vm = new Viewmodel(tex);
if (Q.env) {
  const pm = new THREE.PMREMGenerator(renderer); const es = new THREE.Scene(); const s2 = makeSky(es, QK); s2.mat.uniforms.time.value = 0;
  es.add(new THREE.HemisphereLight('#9d8cff', '#40284a', 1));
  const env = pm.fromScene(es, 0.03).texture; scene.environment = env; scene.environmentIntensity = 0.45; vm.scene.environment = env; vm.scene.environmentIntensity = 0.8; pm.dispose();
}
const sound = new Sound(); sound.vol = S.vol; sound.musicOn = S.music; sound.musicVol = S.musicVol ?? 1;

// ---------- game state ----------
const G = {
  mode: 'loading', time: 0, wave: 0, score: 0, kills: 0, heads: 0, shots: 0, hits: 0, streak: 0, streakT: 0, mult: 1, world, fx, sound, scene, camera,
  spatial(p) { const dx = p.x - camera.position.x, dz = p.z - camera.position.z; const d = Math.hypot(dx, dz) || 1; const rx = Math.cos(camera.rotation.y), rz = -Math.sin(camera.rotation.y); return { dist: d, pan: (dx * rx + dz * rz) / d * 0.7 }; },
};
window.__ns = G; window.THREE_V = THREE.Vector3; G.renderer = renderer;
const enemies = new Enemies(scene, tex, G); G.enemies = enemies;
const projectiles = new Projectiles(scene, tex, G); G.projectiles = projectiles;

// ---------- player ----------
const P = G.player = {
  pos: new THREE.Vector3(0, 0, 24), vel: new THREE.Vector3(), yaw: 0, pitch: 0, onGround: true, hp: 100, armor: 0, alive: true,
  dashCD: 0, dashT: 0, invuln: 0, coyote: 0, jumpBuf: 0, recoil: 0, noise: 0, bloom: 0, stepDist: 0, eyeOff: 0, fovKick: 0, ads: 0, scoped: false, prone: false, hk: 1, autoRun: false, shake: 0, deathT: 0, landed: 0,
  maxHp: 100, perk: { dmg: 1, head: 1, reload: 1, speed: 1, mag: 1, leech: 0, dash: 1, regen: 0 }, perks: [],
  weapons: WEAPONS.map(w => ({ def: w, mag: w.mag, reserve: w.reserve, owned: !w.unlockWave })), cur: 0, fireCD: 0, reloadT: -1, swapT: 0, lastAuto: 0, view: S.view,
};
// third-person model
function buildPlayerModel() {
  const g = new THREE.Group(); const m = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.35, flatShading: true, ...o });
  const suit = m('#2d3a6a'), plate = m('#c9d2ec'), dark = m('#1b1f33'), glow = new THREE.MeshBasicMaterial({ color: '#38f3ff', toneMapped: false });
  const B = (w, h, d, mat, x, y, z, p = g) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); me.position.set(x, y, z); me.castShadow = false; p.add(me); return me; };
  const legs = [];
  for (const s of [-1, 1]) { const l = new THREE.Group(); l.position.set(s * 0.14, 0.9, 0); g.add(l); B(0.17, 0.45, 0.2, suit, 0, -0.22, 0, l); const k = new THREE.Group(); k.position.y = -0.45; l.add(k); B(0.15, 0.42, 0.18, dark, 0, -0.2, 0, k); B(0.18, 0.08, 0.28, plate, 0, -0.42, -0.04, k); legs.push({ l, k, s }); }
  const torso = new THREE.Group(); torso.position.y = 0.92; g.add(torso);
  B(0.46, 0.55, 0.28, suit, 0, 0.3, 0, torso); B(0.48, 0.3, 0.3, plate, 0, 0.42, -0.02, torso); B(0.36, 0.42, 0.18, dark, 0, 0.34, 0.22, torso); B(0.05, 0.3, 0.02, glow, 0.1, 0.36, 0.32, torso); B(0.05, 0.3, 0.02, glow, -0.1, 0.36, 0.32, torso);
  const head = new THREE.Group(); head.position.y = 0.72; torso.add(head); B(0.26, 0.28, 0.28, plate, 0, 0.0, 0, head); B(0.22, 0.08, 0.02, glow, 0, 0.02, -0.145, head);
  const arms = new THREE.Group(); arms.position.set(0, 0.5, 0); torso.add(arms);
  B(0.12, 0.12, 0.42, suit, 0.22, -0.06, -0.12, arms).rotation.y = 0.25; B(0.12, 0.12, 0.42, suit, -0.12, -0.06, -0.2, arms).rotation.y = -0.6;
  const guns = WEAPONS.map(w => { const gg = buildGun(w.model || w.id, true); gg.group.scale.setScalar(0.85); gg.group.position.set(0.08, -0.04, -0.35); arms.add(gg.group); gg.group.visible = false; return gg; });
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: tex.blob, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); blob.rotation.x = -Math.PI / 2; scene.add(blob);
  scene.add(g); return { g, legs, torso, arms, head, guns, blob, anim: 0 };
}
const PM = buildPlayerModel();

// ---------- input ----------
const input = new Input(canvas, S, isTouch, () => G.mode === 'play');
G.input = input;

// ---------- HUD refs ----------
const H = { hud: $('hud'), hpfill: $('hpfill'), hpghost: $('hpghost'), hpnum: $('hpnum'), arfill: $('arfill'), arnum: $('arnum'), wavenum: $('wavenum'), score: $('score'), combo: $('combo'), enum: $('enum'), mag: $('mag'), reserve: $('reserve'), wname: $('wname'), reloadbar: $('reloadbar'), reloadfill: $('reloadfill'), cross: $('crosshair'), hit: $('hitmarker'), hurt: $('hurt'), lowhp: $('lowhp'), announce: $('announce'), sub: $('subannounce'), feed: $('feed'), pickup: $('pickupmsg'), boss: $('bossbar'), bossfill: $('bossfill'), fps: $('fps'), radar: $('radar'), dmgdirs: $('dmgdirs'), dmgnums: $('dmgnums'), swapLbl: $('tSwapLbl'), auto: $('tAuto'), coins: $('coins'), coinbox: $('coinbox') };
const last = {};
function setText(el, key, v) { if (last[key] !== v) { last[key] = v; el.textContent = v; } }
function setStyle(el, key, prop, v) { if (last[key] !== v) { last[key] = v; el.style[prop] = v; } }
const ch = { t: H.cross.querySelector('.t'), b: H.cross.querySelector('.b'), l: H.cross.querySelector('.l'), r: H.cross.querySelector('.r') };
let hitTimer = 0, hintT = 0;
function hitMarker(kind) { H.hit.className = kind || ''; H.hit.style.opacity = 1; hitTimer = kind === 'kill' ? 0.28 : 0.14; H.hit.style.transform = kind === 'kill' ? 'scale(1.35)' : 'scale(1)'; }
function announce(text, sub, cls) { H.announce.textContent = text; H.announce.classList.remove('show'); void H.announce.offsetWidth; H.announce.classList.add('show'); if (sub) { H.sub.textContent = sub; H.sub.classList.remove('show'); void H.sub.offsetWidth; H.sub.classList.add('show'); } }
function feed(text, big) { const d = document.createElement('div'); d.className = 'fitem' + (big ? ' big' : ''); d.textContent = text; H.feed.prepend(d); setTimeout(() => d.remove(), 1400); while (H.feed.children.length > 4) H.feed.lastChild.remove(); }
function pickupMsg(text, color) { H.pickup.textContent = text; H.pickup.style.color = color; H.pickup.classList.remove('show'); void H.pickup.offsetWidth; H.pickup.classList.add('show'); }
// damage numbers
const dnPool = []; for (let i = 0; i < 14; i++) { const d = document.createElement('div'); d.className = 'dn'; d.style.opacity = 0; H.dmgnums.appendChild(d); dnPool.push({ el: d, life: 0, pos: new THREE.Vector3(), vx: 0 }); }
let dnNext = 0;
function dmgNumber(pos, v, head) { const d = dnPool[dnNext]; dnNext = (dnNext + 1) % dnPool.length; d.pos.copy(pos); d.life = 0.75; d.vx = (Math.random() - 0.5) * 30; d.el.textContent = Math.round(v); d.el.className = 'dn' + (head ? ' head' : ''); }
// damage direction
const ddPool = []; for (let i = 0; i < 5; i++) { const d = document.createElement('div'); d.className = 'ddir'; d.style.opacity = 0; H.dmgdirs.appendChild(d); ddPool.push({ el: d, life: 0, src: new THREE.Vector3() }); }
let ddNext = 0;

// ---------- pickups ----------
const PICK = { health: { color: '#5dff8f', label: '+ صحة' }, armor: { color: '#5aa9ff', label: '+ درع' }, ammo: { color: '#ffd23d', label: '+ ذخيرة' } };
const pickups = [];
function pickupMesh(type) {
  const g = new THREE.Group(); const c = PICK[type].color; const em = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.2, flatShading: true });
  if (type === 'health') { g.add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.18), em)); g.add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.18), em)); }
  else if (type === 'armor') { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), em); m.scale.set(1, 1.2, 0.5); g.add(m); }
  else { const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.32), new THREE.MeshStandardMaterial({ color: '#3a3f5a', roughness: 0.5, metalness: 0.5 })); g.add(m); const s = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.34), em); g.add(s); }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.glow, color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 })); sp.scale.set(1.6, 1.6, 1); g.add(sp);
  scene.add(g); return g;
}
function addPickup(type, pos, pad = null, life = Infinity) { const m = pickupMesh(type); const p = { type, pos: pos.clone(), m, pad, life, t: Math.random() * 6, alive: true }; m.position.copy(pos); pickups.push(p); return p; }
function resetPickups() { for (const p of pickups) scene.remove(p.m); pickups.length = 0; for (const pad of world.pads) { pad.respawn = 0; pad.item = addPickup(pad.type, pad.pos.clone().add(new THREE.Vector3(0, 0.75, 0)), pad); } }
function dropPickup(pos, chance) { if (Math.random() > chance) return; const r = Math.random(); const type = r < 0.55 ? 'ammo' : r < 0.85 ? 'health' : 'armor'; const y = world.groundAt(pos.x, pos.z, pos.y + 0.5); addPickup(type, new THREE.Vector3(pos.x, y + 0.65, pos.z), null, 25); }
function updatePickups(dt) {
  for (const pad of world.pads) { if (!pad.item && (pad.respawn -= dt) <= 0) pad.item = addPickup(pad.type, pad.pos.clone().add(new THREE.Vector3(0, 0.75, 0)), pad); }
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i]; p.t += dt; p.life -= dt;
    p.m.position.set(p.pos.x, p.pos.y + Math.sin(p.t * 2.5) * 0.12, p.pos.z); p.m.rotation.y += dt * 2;
    if (p.life < 4) p.m.visible = Math.sin(p.life * 20) > 0;
    let take = false;
    if (P.alive && G.mode === 'play') {
      const dx = P.pos.x - p.pos.x, dz = P.pos.z - p.pos.z, dy = P.pos.y + 0.8 - p.pos.y; const d = Math.hypot(dx, dz);
      if (d < 1.4 && Math.abs(dy) < 1.8) take = applyPickup(p.type);
      else if (d < 3 && Math.abs(dy) < 1.8 && wants(p.type)) { p.pos.x += dx * dt * 4; p.pos.z += dz * dt * 4; }
    }
    if (take || p.life <= 0) { scene.remove(p.m); pickups.splice(i, 1); if (p.pad) { p.pad.item = null; p.pad.respawn = 16; } if (take) { sound.play('pickup'); fx.burst(p.m.position, null, PICK[p.type].color, 14, 4, 0.15, 0.5); } }
  }
}
function wants(type) { if (type === 'health') return P.hp < P.maxHp; if (type === 'armor') return P.armor < Shop.armorCap(); return P.weapons.some(w => w.owned && w.reserve < w.def.maxReserve); }
function applyPickup(type) {
  if (!wants(type)) return false;
  if (type === 'health') { P.hp = Math.min(P.maxHp, P.hp + 47); pickupMsg('صحة +47', PICK.health.color); } // طلب قصي: العلاج +35% (35 → 47)
  else if (type === 'armor') { P.armor = Math.min(Shop.armorCap(), P.armor + 45); pickupMsg('درع +45', PICK.armor.color); }
  else { for (const w of P.weapons) if (w.owned && w.reserve !== Infinity) w.reserve = Math.min(w.def.maxReserve, w.reserve + (w.def.id === 'launcher' ? 3 : w.def.mag * 2)); pickupMsg('ذخيرة +', PICK.ammo.color); }
  return true;
}

// ---------- combat helpers ----------
G.damagePlayer = (dmg, src) => {
  if (!P.alive || G.mode !== 'play' || P.invuln > 0) return;
  let d = dmg * (1 - (P.dr || 0)); if (P.armor > 0) { const a = Math.min(P.armor, d * 0.66); P.armor -= a; d -= a; sound.play('shieldHit'); }
  P.hp -= d; P.lastHurt = G.time; sound.play('hurt'); P.shake = Math.max(P.shake, 0.25 + dmg * 0.012);
  H.hurt.style.transition = 'none'; H.hurt.style.opacity = Math.min(0.85, 0.25 + dmg * 0.025); requestAnimationFrame(() => { H.hurt.style.transition = 'opacity .5s'; H.hurt.style.opacity = 0; });
  if (S.vibe && navigator.vibrate) try { navigator.vibrate(Math.min(80, 15 + dmg * 2)); } catch { }
  if (src) { const dd = ddPool[ddNext]; ddNext = (ddNext + 1) % ddPool.length; dd.src.copy(src); dd.life = 1.1; }
  if (P.hp <= 0) { P.hp = 0; die(); }
};
G.damageProp = (c, dmg, pos) => {
  const was = c.dead; const killed = world.damageProp(c, dmg);
  if (c.kind === 'crate') { sound.play(killed ? 'crate' : 'wood', G.spatial(pos || camera.position)); }
  if (!killed || was) return;
  const ctr = new THREE.Vector3((c.minX + c.maxX) / 2, (c.minY + c.maxY) / 2, (c.minZ + c.maxZ) / 2);
  if (c.kind === 'crate') { fx.debrisBurst(ctr, ['#d9772b', '#4b2a14', '#ffd23d'], 14, 0.28, 5); fx.puff(ctr.x, ctr.y, ctr.z, 0, 1, 0, '#8a7060', 1.2, 0.9, 0.5, 2); G.addScore(10, false); dropPickup(ctr, 0.45); }
  else { setTimeout(() => G.explode(ctr, 5.2, 150, 'barrel'), 90); }
};
G.explode = (pos, radius, dmg, owner) => {
  fx.explosion(pos, radius * 0.8, owner === 'boss' ? '#ff3d81' : '#ffa040'); sound.play('explode', G.spatial(pos));
  const dc = pos.distanceTo(camera.position); P.shake = Math.max(P.shake, clamp(1.2 - dc / 25, 0, 1) * 0.9);
  if (!dmg) return;
  let kills = 0;
  for (const e of [...enemies.list]) { if (!e.alive || owner === 'enemy') continue; const c = e.spheres[0]; const d = Math.hypot(c.x - pos.x, c.y - pos.y, c.z - pos.z) - c.r; if (d > radius) continue; const f = 1 - Math.max(0, d) / radius * 0.6; e.vel.x += (e.pos.x - pos.x) * 3; e.vel.z += (e.pos.z - pos.z) * 3; const k = enemies.damage(e, dmg * f * (e.type === 'boss' ? 0.6 : 1) * (owner === 'player' ? P.perk.dmg : 1), { explosive: true, owner }) === true; if (owner === 'player' || owner === 'barrel') { dmgNumber(new THREE.Vector3(c.x, c.y + 0.5, c.z), dmg * f, false); hitMarker(k ? 'kill' : ''); } if (k) kills++; }
  if (kills >= 2 && (owner === 'barrel' || owner === 'player')) feed(`انفجار مدمّر ×${kills}`, true);
  if (P.alive) { const d = Math.hypot(P.pos.x - pos.x, P.pos.y + 1 - pos.y, P.pos.z - pos.z); if (d < radius) { const f = 1 - d / radius; G.damagePlayer((owner === 'player' ? 0.35 : owner === 'barrel' ? 0.4 : 1) * dmg * f, pos); P.vel.x += (P.pos.x - pos.x) / (d || 1) * 8 * f; P.vel.z += (P.pos.z - pos.z) / (d || 1) * 8 * f; P.vel.y += 5 * f; P.onGround = false; } }
  for (const c of [...world.crates, ...world.barrels]) { if (c.dead) continue; const cx = (c.minX + c.maxX) / 2, cy = (c.minY + c.maxY) / 2, cz = (c.minZ + c.maxZ) / 2; const d = Math.hypot(cx - pos.x, cy - pos.y, cz - pos.z); if (d < radius && d > 0.3) G.damageProp(c, dmg * (1 - d / radius), new THREE.Vector3(cx, cy, cz)); }
};
const shockwaves = [];
G.bossSlam = (e) => { const B = e.T.B, col = B ? B.eye : '#ff3d81', n = B ? B.rings : 1; const one = () => { if (!e.alive && n > 1 && G.mode !== 'play') return; sound.play('slam'); P.shake = Math.max(P.shake, 0.8); fx.ring(e.pos.x, e.pos.y + 0.08, e.pos.z, 0.5, 24, 1.7, col); shockwaves.push({ x: e.pos.x, z: e.pos.z, y: e.pos.y, r: 0.5, max: 24, speed: 13.8, hit: false }); for (let i = 0; i < 30 * fx.scale; i++) { const a = Math.random() * 6.28; fx.puff(e.pos.x + Math.cos(a) * 2, 0.3, e.pos.z + Math.sin(a) * 2, Math.cos(a) * 6, 0.5, Math.sin(a) * 6, '#5a4060', 1, 1, 0.5, 2); } }; one(); for (let k = 1; k < n; k++) setTimeout(() => { if (G.mode === 'play' && e.alive) one(); }, k * 650); };
function setBossBar(B) { const nm = H.boss.querySelector('.name'); if (nm) { nm.textContent = B.name; nm.style.color = B.bar || B.color; nm.style.textShadow = `0 0 8px ${B.bar || B.color}`; } H.bossfill.style.background = `linear-gradient(90deg, ${B.color}, ${B.eye})`; }
function updateShockwaves(dt) { for (let i = shockwaves.length - 1; i >= 0; i--) { const s = shockwaves[i]; s.r += s.speed * dt; if (!s.hit && P.alive) { const d = Math.hypot(P.pos.x - s.x, P.pos.z - s.z); if (Math.abs(d - s.r) < 1.0 && P.pos.y - s.y < 0.7) { s.hit = true; G.damagePlayer(26 * (enemies.boss ? enemies.boss.dmgMul : 1), new THREE.Vector3(s.x, 0, s.z)); P.vel.y = 6; P.onGround = false; } } if (s.r > s.max) shockwaves.splice(i, 1); } }
G.onGrenade = () => { if (!G.nadeWarned) { G.nadeWarned = true; feed('⚠ قنبلة! تحرّك', true); } };
G.summonAround = (pos, type, n) => { for (let i = 0; i < n; i++) { const p = world.randomOpenPoint(pos.x, pos.z, 5); enemies.spawn(type, p, { aware: true, hpMul: diff().hp, dmgMul: diff().dmg, level: G.wave, isl: islOf(G.gl || 1) }); } };
G.addScore = (pts, useMult = true) => { const v = Math.round(pts * (useMult ? G.mult : 1)); G.score += v; return v; };
const STREAK = { 2: 'قتل مزدوج!', 3: 'قتل ثلاثي!', 5: 'سلسلة نارية! 🔥', 8: 'لا يمكن إيقافك!', 12: 'أسطورة الساحة!', 16: 'وحش!!', 20: 'إله الحرب!' };
G.onEnemyKilled = (e, info) => {
  if (e.demo) return;
  G.kills++; G.streak++; G.streakT = 4; G.mult = 1 + Math.min(8, G.streak - 1) * 0.5;
  let pts = e.T.score * (1 + (G.wave - 1) * 0.1); if (info.head) pts *= 1.5;
  const v = G.addScore(pts); feed(`${info.head ? 'إصابة رأس! ' : ''}+${v}`, info.head);
  if (STREAK[G.streak]) { feed(STREAK[G.streak], true); sound.play('streak'); }
  if (!spawnQueue.length && enemies.alive() === 0 && e.type !== 'boss') G.slowmo = Math.max(G.slowmo || 0, 0.45);
  H.combo.classList.remove('bump'); void H.combo.offsetWidth; H.combo.classList.add('bump');
  const cn = Shop.killCoins(e.type); Shop.add(cn); coinPop(cn);
  sound.play('kill'); dropPickup(e.pos, e.type === 'boss' ? 1 : e.type === 'brute' ? 0.7 : 0.2); if (P.perk.leech) P.hp = Math.min(P.maxHp, P.hp + P.perk.leech);
  if (e.type === 'boss') { G.slowmo = 1.2; announce(`سقط ${e.T.name}!`, `+${v} · +${cn} 💰`); dropPickup(e.pos.clone().add(new THREE.Vector3(1.5, 0, 0)), 1); dropPickup(e.pos.clone().add(new THREE.Vector3(-1.5, 0, 0)), 1); H.boss.classList.add('hidden'); }
};

// ---------- waves ----------
// ===== الجزر: 5 جزر × 10 مراحل =====
const ISL = 5, LPI = 10, TOTAL = ISL * LPI, LEVELS = TOTAL;
const glOf = (i, l) => (i - 1) * LPI + l, islOf = gl => Math.ceil(gl / LPI), lvOf = gl => ((gl - 1) % LPI) + 1;
const isBossLvl = gl => lvOf(gl) === 5 || lvOf(gl) === 10;
const bossIdx = gl => (islOf(gl) - 1) * 2 + (lvOf(gl) === 10 ? 2 : 1);
const nWaves = gl => (islOf(gl) <= 2 ? 3 : 4) + (isBossLvl(gl) ? 1 : 0);
const ewBase = gl => 1 + Math.round((gl - 1) * 0.85);
const PKEY = 'ns_islands_v1';
function loadProg() {
  let p = LS.get(PKEY, null);
  if (!p || !Array.isArray(p.b)) { // نقل التقدم القديم (10 مراحل) إلى الجزيرة الأولى
    const old = new Set((LS.get('ns_beaten', []) || []).map(Number)); const u = Math.max(1, LS.get('ns_unlocked', 1) | 0, (LS.get('ns_best_level', 0) | 0) + 1);
    for (let k = 1; k < Math.min(11, u); k++) old.add(k); if (LS.get('ns_won', false)) old.add(10);
    p = { b: [...old].filter(k => k >= 1 && k <= 10).sort((a, b) => a - b), won: false, migrated: true }; LS.set(PKEY, p);
  }
  p.b = p.b.map(Number).filter(k => k >= 1 && k <= TOTAL); return p;
}
const PROG = loadProg();
const beatenLvl = gl => PROG.b.includes(gl);
const lvlOpen = gl => gl === 1 || beatenLvl(gl - 1);
const islOpen = i => i === 1 || beatenLvl(glOf(i - 1, LPI));
const islDone = i => { let n = 0; for (let l = 1; l <= LPI; l++) if (beatenLvl(glOf(i, l))) n++; return n; };


function markBeaten(gl) { if (!PROG.b.includes(gl)) PROG.b.push(gl); if (gl >= TOTAL) PROG.won = true; LS.set(PKEY, PROG); }
function diff() { const w = G.wave, gl = G.gl || 1; return { hp: (1 + (w - 1) * 0.11) * (1 + (gl - 1) * 0.01), dmg: (1 + (w - 1) * 0.07) * (1 + (gl - 1) * 0.008), speed: 1 + Math.min(0.3, (w - 1) * 0.025) }; }
let spawnQueue = [], spawnT = 0, intermission = 0, maxAlive = 6;
function startWave(k) {
  const gl = G.gl || 1; G.waveIn = k; G.nW = nWaves(gl); const n = G.wave = ewBase(gl) + k - 1; const boss = isBossLvl(gl) && k >= G.nW; const TH = G.theme || THEMES[0], lv = lvOf(gl);

  let r = 2 + Math.floor(n * 1.3), s = 1 + Math.floor(n * 0.9), d = n >= 3 ? Math.floor((n - 1) * 0.75) : 0, br = n >= 6 ? Math.floor((n - 4) / 2) : 0;
  if (boss) { r = Math.ceil(r * 0.4); s = Math.ceil(s * 0.4); d = Math.ceil(d * 0.4); br = Math.floor(br * 0.5); }
  spawnQueue = []; for (let i = 0; i < r; i++) spawnQueue.push('rusher'); for (let i = 0; i < s; i++) spawnQueue.push('soldier'); for (let i = 0; i < d; i++) spawnQueue.push('drone'); for (let i = 0; i < br; i++) spawnQueue.push('brute');
  for (let i = spawnQueue.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[spawnQueue[i], spawnQueue[j]] = [spawnQueue[j], spawnQueue[i]]; }
  if (boss) spawnQueue.unshift('boss');
  // طلب قصي: بالمرحلة 5 و10 من كل جزيرة (الزعماء) تنشال 3 أعداء من كل موجة
  // طلب قصي: جزيرة الجليد: المرحلة n أول موجة 5n أعداء، وكل موجة بعدها +5
  if (islOf(gl) === 2) { const want = 5 * lvOf(gl) + 5 * (k - 1) + (boss ? 3 : 0); while (spawnQueue.length < want) spawnQueue.push(spawnQueue.length % 2 ? 'soldier' : 'rusher'); spawnQueue.length = want; }
  if (boss) for (let i = 0; i < 3; i++) { const j = spawnQueue.findIndex((x, idx) => idx > 0 || (idx === 0 && x !== 'boss')); if (j >= 0 && spawnQueue.length > (boss ? 1 : 0)) spawnQueue.splice(j, 1); }
  maxAlive = Math.min(5 + n, 15); spawnT = 1.2;

  announce(k === 1 ? `${TH.emoji} ${TH.name} · المرحلة ${lv}` : `المرحلة ${lv} · الموجة ${k}/${G.nW}`, boss ? `⚠ الزعيم قادم: ${bossFor(bossIdx(gl)).name} 👑` : n === 6 ? 'احذر: المدرّع! درعه من الأمام، اضربه بالرأس أو من الجنب' : k === 1 ? `الموجة 1/${G.nW} · ${spawnQueue.length} أعداء${isBossLvl(gl) ? ' · وآخرها زعيم 👑' : ''}` : `${spawnQueue.length} أعداء`); sound.play(boss ? 'boss' : 'wave');
  G.waveTotal = spawnQueue.length; G.waveKilled0 = G.kills;
  WEAPONS.forEach((w, lw) => { if (w.unlockWave && !w.price && w.unlockWave <= n && P.weapons[lw] && !P.weapons[lw].owned) { P.weapons[lw].owned = true; setTimeout(() => { feed(`سلاح جديد: ${w.name}!`, true); sound.play('pickup'); }, 1800); } });
}
function pickSpawn() {
  const cands = world.spawns.map(p => ({ p, d: p.distanceTo(P.pos), vis: world.los(p.x, 1.5, p.z, P.pos.x, P.pos.y + 1.5, P.pos.z) })).filter(c => c.d > 16);
  cands.sort((a, b) => (a.vis - b.vis) || (Math.random() - 0.5)); const c = cands[(Math.random() * Math.min(3, cands.length)) | 0] || { p: world.spawns[0] };
  return c.p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 0, (Math.random() - 0.5) * 1.5));
}
function updateWaves(dt) {
  if (intermission > 0) { intermission -= dt; if (intermission <= 0) startWave((G.waveIn || 0) + 1); return; }
  spawnT -= dt;
  if (spawnQueue.length && spawnT <= 0 && enemies.alive() < maxAlive) {
    const type = spawnQueue.shift(); const df = diff(); const pos = pickSpawn();
    const BS = type === 'boss' ? bossFor(bossIdx(G.gl || 1)) : null;
    enemies.spawn(type, pos, { boss: BS, hpMul: df.hp * (BS ? BS.hp : 1), dmgMul: df.dmg * (BS ? BS.dmg : 1), speedMul: BS ? 1 : df.speed, level: G.wave, isl: islOf(G.gl || 1), aware: G.wave > 1 && Math.random() < 0.5 });
    if (BS) { setBossBar(BS); H.boss.classList.remove('hidden'); announce(`${BS.name}!`, bossIdx(G.gl || 1) === 1 ? 'اقفز فوق الموجة الأرضية 🦘' : `زعيم ${(G.theme || THEMES[0]).name} · أقوى من اللي قبله 💪`); }
    spawnT = Math.max(0.35, 1.2 - G.wave * 0.06) * (0.7 + Math.random() * 0.6);
  }
  if (!spawnQueue.length && enemies.alive() === 0) {
    const lvlDone = (G.waveIn || 1) >= (G.nW || 1), gl = G.gl || 1;
    if (lvlDone) { G.addScore((gl >= TOTAL ? 5000 : 1500) * Math.ceil(gl / 5) + 400 * G.wave, false); sound.play('waveClear'); levelDone(gl); return; }
    const bonus = G.addScore(400 * G.wave, false);
    announce('اكتملت الموجة!', `مكافأة +${bonus}`);
    sound.play('waveClear');
    intermission = 7; P.hp = Math.min(P.maxHp, P.hp + 15); if (G.waveIn % 2 === 0) setTimeout(offerPerks, 1400);
    if (G.waveIn % 2 === 0) world.restoreProps();
    LS.set('ns_best_wave', Math.max(LS.get('ns_best_wave', 0), G.wave));
  }
}

// ---------- shooting ----------
const _o = new THREE.Vector3(), _d = new THREE.Vector3(), _f = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(), _hp = new THREE.Vector3(), _mz = new THREE.Vector3();
function aimBasis() { camera.getWorldDirection(_f); _r.set(1, 0, 0).applyQuaternion(camera.quaternion); _u.set(0, 1, 0).applyQuaternion(camera.quaternion); }
function aimOrigin(out) { out.copy(camera.position); if (P.view === 'tp') { const head = _hp.set(P.pos.x, P.pos.y + 1.55 * P.hk, P.pos.z); const t = head.sub(camera.position).dot(_f); out.addScaledVector(_f, Math.max(0, t)); } return out; }
function muzzleWorld(out) { if (P.view === 'tp') { const g = PM.guns[P.cur]; g.muzzle.updateWorldMatrix(true, false); return out.setFromMatrixPosition(g.muzzle.matrixWorld); } return out.copy(camera.position).addScaledVector(_r, 0.2).addScaledVector(_u, -0.17).addScaledVector(_f, 0.55); }
const assistOn = () => input.touchMode && S.assist;
function applySkill(w, hitE, W) {
  if (w.skill === 'freeshot') { let hd = false; for (const r of hitE.values()) if (r.head) hd = true; if (hd) W.mag = Math.min(magSize(W), W.mag + 1); return; }
  if (w.skill === 'storm') { W.stormN = (W.stormN || 0) + 1; if (W.stormN % 10 === 0) { for (const c of enemies.list) { if (!c.alive || hitE.has(c)) continue; if (Math.hypot(c.pos.x - P.pos.x, c.pos.z - P.pos.z) < 12) enemies.damage(c, w.dmg * 0.5, { head: false, weapon: w.id }); } G.fx.flash(P.pos.x, P.pos.y + 1, P.pos.z, 6, 0.25, w.color); sound.play('hit'); } return; }
  if (w.skill === 'freeze') { for (const e of hitE.keys()) if (e.alive) e.slowT = 2; return; }
  if (w.skill === 'burn') { for (const e of hitE.keys()) if (e.alive) e.burnT = 3; return; }
  if (w.skill === 'leech') { let tot = 0; for (const rec of hitE.values()) tot += rec.dmg; if (tot > 0) P.hp = Math.min(P.maxHp, P.hp + tot * 0.04); return; }
  if (w.skill === 'refund') { for (const e of hitE.keys()) if (!e.alive) W.mag = Math.min(magSize(W), W.mag + 6); return; }
  if (w.skill === 'chain') {
    for (const [e, rec] of [...hitE]) {
      let best = null, bd = 7;
      for (const c of enemies.list) { if (!c.alive || hitE.has(c)) continue; const d = c.pos.distanceTo(e.pos); if (d < bd) { bd = d; best = c; } }
      if (!best) continue;
      const from = new THREE.Vector3(e.pos.x, e.pos.y + 1, e.pos.z), to = new THREE.Vector3(best.pos.x, best.pos.y + 1, best.pos.z);
      fx.tracer(from, to, w.color, 0.05, 0.08); sound.play('hit');
      enemies.damage(best, rec.dmg * 0.5, { head: false, weapon: w.id });
      dmgNumber(to, rec.dmg * 0.5, false);
    }
  }
}
function fire() {
  const W = P.weapons[P.cur], w = W.def;
  if (W.mag <= 0) { if (W.reserve > 0) startReload(); else { sound.play('empty'); P.fireCD = 0.25; const nxt = P.weapons.findIndex((x, i) => x.owned && (x.mag > 0 || x.reserve > 0) && i !== P.cur); if (nxt >= 0) switchWeapon(nxt); } return; }
  W.mag--; P.fireCD = w.rate; G.shots++; P.noise = 0.6;
  aimBasis(); const origin = aimOrigin(_o); muzzleWorld(_mz);
  const speed01 = clamp(Math.hypot(P.vel.x, P.vel.z) / 7, 0, 1);
  const spread = (w.spread + w.moveSpread * speed01 + (P.onGround ? 0 : 0.02) + P.bloom) * (1 - 0.6 * P.ads) * (P.prone ? 0.6 : 1);
  P.bloom = Math.min(0.03, P.bloom + (w.id === 'rifle' ? 0.0022 : 0.006));
  let anyHit = false;
  if (w.projectile) {
    const h = world.raycast(origin.x, origin.y, origin.z, _f.x, _f.y, _f.z, 150); const eh = enemies.rayHit(origin, _f, h ? h.t : 150, assistOn() ? 0.2 : 0);
    const t = eh ? eh.t : h ? h.t : 150; const target = origin.clone().addScaledVector(_f, t); const dir = target.sub(_mz).normalize();
    projectiles.spawn({ pos: _mz.clone(), dir, speed: w.projectile.speed, dmg: w.dmg, owner: 'player', color: '#7dff6a', core: '#eaffd8', size: 0.2, radius: w.projectile.radius, trail: 1, grav: 2 });
  } else {
    const fifth = w.skill === 'fifth' && ((W.shotN = (W.shotN || 0) + 1) % 5 === 0) ? 2 : 1;
    const n = w.pellets; let headHit = false, killed = false, dmgSum = 0, lastPos = null, shieldHit = false;
    const hitE = new Map();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * spread;
      _d.copy(_f).addScaledVector(_r, Math.cos(a) * rr).addScaledVector(_u, Math.sin(a) * rr).normalize();
      const h = world.raycast(origin.x, origin.y, origin.z, _d.x, _d.y, _d.z, w.range);
      const maxT = h ? h.t : w.range;
      const eh = enemies.rayHit(origin, _d, maxT, assistOn() ? (n > 1 ? 0.1 : 0.22) : 0);
      let end;
      if (eh) {
        end = origin.clone().addScaledVector(_d, eh.t);
        const fo = w.falloff; const fall = eh.t < fo[0] ? 1 : eh.t > fo[1] ? fo[2] : 1 - (eh.t - fo[0]) / (fo[1] - fo[0]) * (1 - fo[2]);
        const head = eh.mult >= 1.5; let dmg = w.dmg * fall * (head ? w.head * (eh.mult / 2) : eh.mult);
        if (eh.e.type === 'boss' && eh.mult >= 2) dmg = w.dmg * fall * 2.5;
        if (w.skill === 'close' && eh.t < 8) dmg *= 1.35; if (fifth > 1) dmg *= fifth;
        const rec = hitE.get(eh.e) || { dmg: 0, head: false, pos: end, dir: _d.clone() }; rec.dmg += dmg * P.perk.dmg * (head ? P.perk.head : 1); rec.head = rec.head || head; rec.pos = end; hitE.set(eh.e, rec);
        fx.impact(end, [-_d.x, -_d.y, -_d.z], 'enemy'); anyHit = true;
      } else if (h) {
        end = origin.clone().addScaledVector(_d, h.t);
        fx.impact(end, h.normal, h.col && h.col.kind ? 'wood' : 'metal');
        if (h.col && h.col.kind) G.damageProp(h.col, w.dmg, end); else if (i === 0) sound.play('impact', G.spatial(end));
      } else end = origin.clone().addScaledVector(_d, w.range);
      if (w.tracer && (n === 1 || i % 3 === 0)) fx.tracer(_mz, end, w.color, w.tracer, n === 1 ? 0.07 : 0.05);
    }
    for (const [e, rec] of hitE) {
      const info = { head: rec.head, weapon: w.id, dir: rec.dir }; const k = enemies.damage(e, rec.dmg, info);
      dmgNumber(rec.pos, info.shielded ? rec.dmg * 0.3 : rec.dmg, rec.head); if (rec.head) { G.heads++; headHit = true; } if (k === true) killed = true; dmgSum += rec.dmg;
      if (info.shielded) { fx.burst(rec.pos, [-rec.dir.x, 0, -rec.dir.z], '#7ff8ff', 8, 6, 0.12, 0.3); sound.play('shieldHit'); shieldHit = true; } else sound.play('metal', G.spatial(rec.pos));
    }
    if (w.skill) applySkill(w, hitE, W);
    if (anyHit) { G.hits++; hitMarker(killed ? 'kill' : headHit ? 'head' : shieldHit ? 'shield' : ''); sound.play(headHit ? 'head' : 'hit'); }
  }
  // feedback
  sound.play(w.sound); vm.fire(w); fx.light(_mz.x, _mz.y, _mz.z, w.color, w.id === 'shotgun' ? 10 : 5, 0.06, 8);
  if (P.view === 'tp') fx.flash(_mz.x, _mz.y, _mz.z, w.id === 'shotgun' ? 0.9 : 0.6, 0.05, w.color);
  const rk = w.recoil * (P.onGround ? 1 : 1.3); P.pitch += rk; P.recoil += rk; P.yaw += (Math.random() - 0.5) * rk * 0.5;
  if (S.shake) P.shake = Math.max(P.shake, w.shake * 0.6); P.fovKick = Math.max(P.fovKick, w.id === 'shotgun' ? 2.5 : 0.6);
  if (W.mag === 0 && W.reserve > 0) setTimeout(() => { if (P.weapons[P.cur] === W && W.mag === 0) startReload(); }, 180);
}
function startReload() { const W = P.weapons[P.cur]; if (P.reloadT >= 0 || W.mag >= magSize(W) || W.reserve <= 0) return; P.reloadT = 0; sound.play('reload'); }
function magSize(W) { return Math.round(W.def.mag * P.perk.mag); }
function finishReload() { const W = P.weapons[P.cur]; const need = magSize(W) - W.mag; const take = Math.min(need, W.reserve); W.mag += take; if (W.reserve !== Infinity) W.reserve -= take; P.reloadT = -1; sound.play('reloadEnd'); }

input.zoomWheel = () => P.scoped;
const SC = { ov: document.getElementById('scopeov'), btn: document.getElementById('tScope') };

const ZOOMS = [1.25, 2, 3];
function curZoom() { return ZOOMS[S.zoomIdx ?? 1] || 2; }
function zoomLabel() { return '×' + curZoom(); }
function cycleZoom() { S.zoomIdx = ((S.zoomIdx ?? 1) + 1) % ZOOMS.length; saveSettings(); const b = document.getElementById('tZoom'); if (b) b.textContent = zoomLabel(); if (P.scoped) { const sc = P.weapons[P.cur].def.scope || {}; SC.ov.querySelector('.sname').textContent = (sc.name || '').replace(/×[0-9.]+/, '') + ' ' + zoomLabel(); } sound.play && sound.play('swap'); }
function setScope(on) {
  if (on && (!P.alive || P.reloadT >= 0)) return; P.scoped = !!on; SC.btn && SC.btn.classList.toggle('on', P.scoped);
  if (P.scoped) { const sc = P.weapons[P.cur].def.scope || { type: 'dot', name: '' }; SC.ov.className = sc.type; SC.ov.querySelector('.sname').textContent = (sc.name || '').replace(/×[0-9.]+/, '') + ' ' + zoomLabel(); sound.play && sound.play('swap'); }
}

const PR = { btn: document.getElementById('tProne') };
function setProne(on) { if (on && !P.onGround) return; P.prone = !!on; PR.btn && PR.btn.classList.toggle('on', P.prone); sound.play && sound.play('step'); }

const AR = { btn: document.getElementById('tRun') };
function setAutoRun(on) { P.autoRun = !!on; AR.btn && AR.btn.classList.toggle('on', P.autoRun); document.getElementById('joy').classList.toggle('autorun', P.autoRun); }
function switchWeapon(i) { if (i === P.cur || !P.weapons[i] || !P.weapons[i].owned) return; setScope(false); P.cur = i; P.reloadT = -1; P.swapT = 0.3; P.fireCD = Math.max(P.fireCD, 0.28); vm.setWeapon(i); sound.play('swap'); PM.guns.forEach((g, k) => g.group.visible = k === i); }
function nextWeapon(dir = 1) { for (let k = 1; k <= P.weapons.length; k++) { const i = (P.cur + dir * k + P.weapons.length * 4) % P.weapons.length; if (P.weapons[i].owned) { switchWeapon(i); return; } } }

// ---------- player update ----------
function updatePlayer(dt) {
  const inp = input.frame();
  if (!P.alive) return inp;
  // look
  const inv = S.invert ? -1 : 1;
  const zf = 1 + (curZoom() - 1) * P.ads; const fr = ((P.onEnemy && input.touchMode && S.assist) ? 0.62 : 1) / zf;
  P.lpx = (P.lpx || 0) + inp.lookX * fr; P.lpy = (P.lpy || 0) + inp.lookY * inv * fr;
  const sm = (input.touchMode ? (S.smooth ?? 0.5) : (S.smooth ?? 0.5) * 0.4); const kk = sm <= 0.01 ? 1 : 1 - Math.exp(-dt * (6 + (1 - sm) * 54));
  const ax = P.lpx * kk, ay = P.lpy * kk; P.lpx -= ax; P.lpy -= ay;
  P.yaw -= ax; P.pitch -= ay; P.lookDX = (P.lookDX || 0) * 0.7 + ax * 0.3; P.lookDY = (P.lookDY || 0) * 0.7 + ay * 0.3;
  const rec = Math.min(P.recoil, dt * (P.fireCD > 0 ? 0.04 : 0.35)); P.pitch -= rec; P.recoil -= rec;
  P.pitch = clamp(P.pitch, -1.45, 1.45);
  // weapons
  if (inp.swap) nextWeapon(1); if (inp.prev) nextWeapon(-1); if (inp.weapon >= 0) switchWeapon(inp.weapon);
  if (inp.reload) startReload();
  if (inp.scope) setScope(!P.scoped); if (inp.zoom) cycleZoom();
  { const lt = Math.max(-1, Math.min(1, inp.lean || 0)); P.lean = (P.lean || 0) + (lt - (P.lean || 0)) * Math.min(1, dt * 10); // ميلان (طلب قصي)
    const aimNow = S.leanAim !== false && Math.abs(lt) > 0.5 && P.alive && P.reloadT < 0; // اختياري: الميلان يصوّب
    if (aimNow && !P.scoped) { setScope(true); P.leanScoped = true; } else if (!aimNow && P.leanScoped) { P.leanScoped = false; if (!P.holdScope) setScope(false); } }
  if (inp.prone) setProne(!P.prone); if (P.prone && (inp.jump || inp.dash)) { setProne(false); inp.jump = false; inp.dash = false; }
  P.hk += ((P.prone ? 0.28 : 1) - P.hk) * Math.min(1, dt * 9);
  if (inp.scopeHold && !P.holdScope) { P.holdScope = true; setScope(true); } else if (!inp.scopeHold && P.holdScope) { P.holdScope = false; setScope(false); } if (P.holdScope && !P.scoped && P.reloadT < 0) setScope(true);
  if (P.reloadT >= 0 && P.scoped) setScope(false);
  if (inp.toggleView) toggleView();
  P.fireCD -= dt; P.bloom = Math.max(0, P.bloom - dt * 0.06); P.noise -= dt;
  if (P.reloadT >= 0) { P.reloadT += dt; if (P.reloadT >= P.weapons[P.cur].def.reload * P.perk.reload) finishReload(); }
  let wantFire = inp.fire;
  // auto-fire when crosshair is on an enemy
  aimBasis(); const ao = aimOrigin(_o); const h = world.raycast(ao.x, ao.y, ao.z, _f.x, _f.y, _f.z, 60); const onE = enemies.rayHit(ao, _f, h ? h.t : 60, assistOn() ? 0.12 : 0);
  P.onEnemy = !!onE; if ((S.autoFire) && onE && onE.t < 50) wantFire = true;
  // aim assist friction: slow look when over enemy (touch)
  if (wantFire && P.fireCD <= 0 && P.reloadT < 0 && P.swapT <= 0) fire();
  else if (wantFire && P.reloadT >= 0 && P.weapons[P.cur].mag > 0 && P.weapons[P.cur].def.id === 'shotgun') { P.reloadT = -1; } // shotgun: interrupt reload to fire
  P.swapT -= dt;
  // movement
  const fx_ = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  if (inp.autorun) setAutoRun(!P.autoRun); if (inp.autorunOff && P.autoRun) setAutoRun(false); if (inp.autorunOn) setAutoRun(true);
  let mx = inp.moveX, my = inp.moveY;
  if (P.autoRun) { if (my < -0.4) setAutoRun(false); else { my = 1; inp.sprint = !P.scoped && !P.prone; } }
  const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
  const wishX = fx_ * my + rx * mx, wishZ = fz * my + rz * mx;
  if (!P.autoRun && !P.holdScope && P.scoped && inp.sprint && my > 0.3 && S.unscopeRun !== false) setScope(false); if (!P.autoRun && P.prone && inp.sprint && my > 0.3) setProne(false); const sprint = inp.sprint && my > 0.3 && !P.scoped && !P.prone; P.sprinting = sprint;
  if (hintT > 0 && (Math.abs(inp.moveX) + Math.abs(inp.moveY) > 0.3) && hintT < 5) hintT = Math.min(hintT, 0.5);
  if (sprint && P.reloadT >= 0 && S.unreloadRun !== false) P.reloadT = -1; // طلب قصي: الركض يوقف التلقيم (اختياري)
  const spd = (sprint ? 8.6 : 6.4) * (P.reloadT >= 0 ? 0.92 : 1) * (1 - 0.35 * P.ads) * (P.prone ? 0.32 : 1) * P.perk.speed;
  P.dashCD -= dt; P.invuln -= dt;
  if (inp.dash && P.dashCD <= 0) {
    let dx = wishX, dz = wishZ; if (Math.hypot(dx, dz) < 0.2) { dx = fx_; dz = fz; } const L = Math.hypot(dx, dz); P.vel.x = dx / L * 19; P.vel.z = dz / L * 19; if (P.vel.y < 0) P.vel.y = 0;
    P.dashT = 0.2; P.dashCD = 1.3 * P.perk.dash; P.invuln = 0.22; P.fovKick = 9; sound.play('dash'); for (let i = 0; i < 8; i++) fx.puff(P.pos.x, P.pos.y + 0.2, P.pos.z, -dx * 2, 0.3, -dz * 2, '#7a7a9a', 0.5, 0.5, 0.35, 2);
  }
  if (P.dashT > 0) { P.dashT -= dt; P.vel.x *= 1 - dt * 3; P.vel.z *= 1 - dt * 3; }
  else { const k = Math.min(1, dt * (P.onGround ? 12 : 2.8)); P.vel.x += (wishX * spd - P.vel.x) * k; P.vel.z += (wishZ * spd - P.vel.z) * k; }
  // jump
  P.coyote = P.onGround ? 0.1 : P.coyote - dt; P.jumpBuf = inp.jump ? 0.14 : P.jumpBuf - dt;
  if (P.jumpBuf > 0 && P.coyote > 0) { P.vel.y = 8.2; P.onGround = false; P.coyote = 0; P.jumpBuf = 0; sound.play('jump'); }
  P.vel.y -= 24 * dt;
  const prevY = P.pos.y, fallV = P.vel.y;
  P.pos.x += P.vel.x * dt; P.pos.z += P.vel.z * dt; P.pos.y += P.vel.y * dt;
  world.collide(P.pos, 0.38, P.pos.y, 1.75);
  const gy = world.groundAt(P.pos.x, P.pos.z, Math.max(P.pos.y, prevY), 0.3);
  if (P.pos.y <= gy + 0.001 && P.vel.y <= 0) {
    if (!P.onGround && fallV < -7) { sound.play('land'); vm.landK = Math.min(1, -fallV / 14); P.eyeOff = -Math.min(0.25, -fallV * 0.015); }
    if (gy - P.pos.y > 0.05 && P.onGround) P.eyeOff -= (gy - P.pos.y); // smooth step up
    P.pos.y = gy; P.vel.y = 0; P.onGround = true;
  } else if (P.pos.y > gy + 0.05) { if (P.onGround && P.vel.y <= 0 && P.pos.y - gy < 0.6) { P.pos.y = gy; P.vel.y = 0; } else P.onGround = false; }
  // footsteps
  const hs = Math.hypot(P.vel.x, P.vel.z); if (P.onGround && hs > 1) { P.stepDist += hs * dt; if (P.stepDist > (sprint ? 2.4 : 2.0)) { P.stepDist = 0; sound.play('step'); } }
  P.eyeOff += -P.eyeOff * Math.min(1, dt * 10);
  // low health regen after no damage for 5s (only up to 30)
  if (P.hp < 30 && G.time - (P.lastHurt || 0) > 5) P.hp = Math.min(30, P.hp + dt * 4);
  if (P.perk.regen && P.armor < 50 && G.time - (P.lastHurt || 0) > 3) P.armor = Math.min(50, P.armor + dt * P.perk.regen);
  return inp;
}
function toggleView() { P.view = P.view === 'fp' ? 'tp' : 'fp'; S.view = P.view; saveSettings(); const sv = document.getElementById('sView'); if (sv) sv.value = S.view; }

// ---------- camera ----------
let bobT = 0;
function updateCamera(dt) {
  const hs = Math.hypot(P.vel.x, P.vel.z);
  if (P.onGround && hs > 0.5) bobT += dt * hs * 1.5;
  const bob = P.view === 'fp' ? Math.sin(bobT) * 0.04 * clamp(hs / 7, 0, 1) : 0;
  P.fovKick += -P.fovKick * Math.min(1, dt * 6);
  P.ads += ((P.scoped ? 1 : 0) - P.ads) * Math.min(1, dt * 14); const zz = 1 + (curZoom() - 1) * P.ads; const targetFov = ((S.fov || 75) + (P.sprinting ? 6 : 0)) / zz + P.fovKick * (1 - P.ads * 0.7); camera.fov += (targetFov - camera.fov) * Math.min(1, dt * (P.scoped ? 18 : 10)); camera.updateProjectionMatrix();
  P.shake = Math.max(0, P.shake - dt * 2.2); const sh = S.shake ? P.shake * P.shake * 0.35 : 0;
  camera.rotation.set(P.pitch + (Math.random() - 0.5) * sh * 0.3, P.yaw + (Math.random() - 0.5) * sh * 0.3, P.view === 'fp' ? -P.lookDX * 0.6 * 0 + Math.sin(bobT * 0.5) * 0.004 * hs / 7 - (P.lean || 0) * 0.14 : 0);
  if (!P.alive) { // death cam
    P.deathT += dt; const k = Math.min(1, P.deathT / 1.2);
    camera.position.set(P.pos.x, P.pos.y + 1.6 - k * 1.2, P.pos.z); camera.rotation.z = k * 0.6; camera.rotation.x = P.pitch - k * 0.4; return;
  }
  const head = new THREE.Vector3(P.pos.x, P.pos.y + 1.6 * P.hk + P.eyeOff + bob * P.hk, P.pos.z);
  if (P.view === 'fp') { camera.position.copy(head); if (P.lean) { camera.position.x += Math.cos(P.yaw) * P.lean * 0.42; camera.position.z -= Math.sin(P.yaw) * P.lean * 0.42; } }
  else {
    camera.position.copy(head); camera.updateMatrixWorld(); aimBasis();
    const want = head.clone().addScaledVector(_f, -3.3).addScaledVector(_r, 1.05).addScaledVector(_u, 0.35);
    const d = want.clone().sub(head); const L = d.length(); d.divideScalar(L);
    const h = world.raycast(head.x, head.y, head.z, d.x, d.y, d.z, L + 0.3); const t = h ? Math.max(0.3, h.t - 0.3) : L;
    camera.position.copy(head).addScaledVector(d, t);
    if (camera.position.y < 0.3) camera.position.y = 0.3;
  }
}
function updatePlayerModel(dt) {
  const show = P.view === 'tp' && G.mode !== 'menu'; PM.g.visible = show; PM.blob.visible = show; if (!show) return;
  PM.g.position.copy(P.pos); PM.g.rotation.y = P.yaw; PM.g.rotation.x = -(1 - P.hk) / 0.72 * 1.35; PM.g.position.y += (1 - P.hk) / 0.72 * 0.35; PM.blob.position.set(P.pos.x, world.groundAt(P.pos.x, P.pos.z, P.pos.y + 0.1) + 0.03, P.pos.z);
  const hs = Math.hypot(P.vel.x, P.vel.z); PM.anim += dt * hs * 1.6; const amp = clamp(hs / 6, 0, 1) * 0.8;
  for (const l of PM.legs) { const ph = PM.anim + (l.s > 0 ? 0 : Math.PI); l.l.rotation.x = P.onGround ? Math.sin(ph) * amp : -0.4; l.k.rotation.x = P.onGround ? Math.max(0, -Math.sin(ph + 0.6)) * amp * 1.2 : 0.6; }
  PM.arms.rotation.x = P.pitch * 0.9 + vm.kickRot * 0.3; PM.head.rotation.x = P.pitch * 0.5; PM.torso.position.y = 0.92 + Math.abs(Math.sin(PM.anim)) * 0.03 * amp;
  if (!P.alive) PM.g.rotation.z = Math.min(1.4, P.deathT * 2);
}

// ---------- HUD ----------
const rctx = H.radar.getContext('2d'); let radarT = 0;
const _proj = new THREE.Vector3();
function updateHUD(dt) {
  const hp = Math.ceil(P.hp), ar = Math.ceil(P.armor);
  const hpp = Math.round(hp / P.maxHp * 100) + '%'; setStyle(H.hpfill, 'hpw', 'width', hpp); setStyle(H.hpghost, 'hpg', 'width', hpp); setText(H.hpnum, 'hp', String(hp)); H.hpfill.classList.toggle('low', hp <= 30);
  setStyle(H.arfill, 'arw', 'width', Math.min(100, ar / Shop.armorCap() * 100) + '%'); setText(H.arnum, 'ar', String(ar));
  setText(H.wavenum, 'wave', `${(G.theme || THEMES[0]).emoji} ${lvOf(G.gl || 1)} - موجة ${G.waveIn || 1}/${G.nW || 1}`); setText(H.score, 'score', G.score.toLocaleString('en-US'));
  setText(H.combo, 'combo', G.streak >= 2 ? `×${G.mult.toFixed(1)} سلسلة ${G.streak}` : '');
  setText(H.enum, 'enum', String(enemies.alive() + spawnQueue.length)); setText(H.coins, 'coins', String(Shop.coins));
  const W = P.weapons[P.cur]; setText(H.wname, 'wn', W.def.name); setText(H.mag, 'mag', String(W.mag)); setText(H.reserve, 'res', '/ ' + (W.reserve === Infinity ? '∞' : W.reserve));
  H.mag.classList.toggle('low', W.mag <= Math.ceil(magSize(W) * 0.25));
  H.reloadbar.classList.toggle('on', P.reloadT >= 0); if (P.reloadT >= 0) H.reloadfill.style.width = (P.reloadT / (W.def.reload * P.perk.reload) * 100) + '%';
  const ownedCount = P.weapons.filter(w => w.owned).length; let ni = P.cur; for (let k = 1; k <= P.weapons.length; k++) { const i = (P.cur + k) % P.weapons.length; if (P.weapons[i].owned) { ni = i; break; } } setText(H.swapLbl, 'swl', String(ni + 1));
  const needR = W.mag === 0 && W.reserve > 0 && P.reloadT < 0; $('tReload').classList.toggle('need', needR || (W.mag <= Math.ceil(magSize(W) * 0.2) && W.reserve > 0 && P.reloadT < 0));
  setText($('reloadhint'), 'rh', P.reloadT >= 0 ? 'تلقيم…' : W.mag === 0 ? (W.reserve > 0 ? 'لقّم!' : 'لا يوجد ذخيرة') : '');
  H.lowhp.classList.toggle('on', P.alive && P.hp <= 30);
  if (P.alive && P.hp <= 30) { P.heartT = (P.heartT || 0) - dt; if (P.heartT <= 0) { P.heartT = 1; sound.play('heart'); } }
  // crosshair
  const speed01 = clamp(Math.hypot(P.vel.x, P.vel.z) / 7, 0, 1); const w = W.def; const sp = (w.spread + w.moveSpread * speed01 + (P.onGround ? 0 : 0.02) + P.bloom); const gap = 5 + sp * 520 + vm.kick * 8;
  const gk = Math.round(gap); if (last.gap !== gk) { last.gap = gk; ch.t.style.top = (-gk - 9) + 'px'; ch.b.style.top = gk + 'px'; ch.l.style.left = (-gk - 9) + 'px'; ch.r.style.left = gk + 'px'; }
  H.cross.classList.toggle('enemy', !!P.onEnemy); H.cross.style.display = P.alive && G.mode === 'play' && P.ads < 0.5 ? '' : 'none'; SC.ov.classList.toggle('hidden', !(P.scoped && P.ads > 0.5 && P.alive && G.mode === 'play'));
  if (hitTimer > 0) { hitTimer -= dt; if (hitTimer <= 0) H.hit.style.opacity = 0; }
  // boss bar
  if (enemies.boss && enemies.boss.alive) { H.boss.classList.remove('hidden'); setStyle(H.bossfill, 'boss', 'width', (enemies.boss.hp / enemies.boss.maxHp * 100).toFixed(1) + '%'); } else H.boss.classList.add('hidden');
  // damage numbers
  const wpx = innerWidth, hpx = innerHeight;
  for (const d of dnPool) {
    if (d.life <= 0) { if (d.el.style.opacity !== '0') d.el.style.opacity = 0; continue; }
    d.life -= dt; d.pos.y += dt * 1.2; _proj.copy(d.pos).project(camera);
    if (_proj.z > 1) { d.el.style.opacity = 0; continue; }
    const x = (_proj.x * 0.5 + 0.5) * wpx + d.vx * (0.75 - d.life), y = (-_proj.y * 0.5 + 0.5) * hpx;
    d.el.style.transform = `translate(${x | 0}px,${y | 0}px) translate(-50%,-50%) scale(${(1 + Math.max(0, d.life - 0.55) * 3).toFixed(2)})`; d.el.style.opacity = Math.min(1, d.life * 3).toFixed(2);
  }
  // damage direction arcs
  for (const d of ddPool) {
    if (d.life <= 0) { if (d.el.style.opacity !== '0') d.el.style.opacity = 0; continue; }
    d.life -= dt; const ang = Math.atan2(d.src.x - P.pos.x, d.src.z - P.pos.z); const rel = -(ang - (P.yaw + Math.PI));
    d.el.style.transform = `rotate(${rel}rad) translateY(-${Math.min(innerHeight * 0.32, 130)}px)`; d.el.style.opacity = Math.min(1, d.life * 1.5).toFixed(2);
  }
  // radar
  radarT -= dt; if (radarT <= 0) { radarT = 0.06; drawRadar(); }
  updateEnemyBars(dt);
  setText($('nextwave'), 'nw', intermission > 0 && intermission < 1e8 && G.mode === 'play' ? `الموجة التالية بعد ${Math.ceil(intermission)}` : '');
  if (hintT > 0) { hintT -= dt; if (hintT <= 0) $('hints').classList.add('hidden'); }
  // streak timer
  if (G.streakT > 0) { G.streakT -= dt; if (G.streakT <= 0) { G.streak = 0; G.mult = 1; } }
}
function drawRadar() {
  const c = rctx, W = 120, R = 58, range = 32; c.clearRect(0, 0, W, W); c.save(); c.translate(60, 60);
  c.strokeStyle = 'rgba(56,243,255,.25)'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, R * 0.5, 0, 7); c.stroke(); c.beginPath(); c.moveTo(-R, 0); c.lineTo(R, 0); c.moveTo(0, -R); c.lineTo(0, R); c.stroke();
  // view cone
  c.fillStyle = 'rgba(56,243,255,.12)'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R, -Math.PI / 2 - 0.6, -Math.PI / 2 + 0.6); c.closePath(); c.fill();
  const cy = Math.cos(P.yaw), sy = Math.sin(P.yaw);
  const toR = (x, z) => { const dx = x - P.pos.x, dz = z - P.pos.z; const lx = dx * cy - dz * sy, lz = dx * sy + dz * cy; return [lx / range * R, lz / range * R]; };
  for (const p of pickups) { const [x, y] = toR(p.pos.x, p.pos.z); if (x * x + y * y > R * R) continue; c.fillStyle = PICK[p.type].color; c.fillRect(x - 2, y - 2, 4, 4); }
  for (const e of enemies.list) {
    if (!e.alive) continue; let [x, y] = toR(e.pos.x, e.pos.z); const d = Math.hypot(x, y); if (d > R - 4) { x *= (R - 4) / d; y *= (R - 4) / d; }
    c.fillStyle = e.type === 'boss' ? e.T.color : e.type === 'drone' ? '#c77dff' : e.type === 'rusher' ? '#ff9a3d' : '#ff4f6d';
    c.beginPath(); c.arc(x, y, e.type === 'boss' ? 6 : 3.2, 0, 7); c.fill();
  }
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, -6); c.lineTo(4, 4); c.lineTo(-4, 4); c.closePath(); c.fill();
  c.restore();
}


// ---------- perks (an upgrade every 2 waves) ----------
const PERKS = [
  { id: 'dmg', icon: '💥', name: 'ضرر أقوى', desc: 'ضرر كل الأسلحة يزيد 20%', apply: () => P.perk.dmg *= 1.2 },
  { id: 'hp', icon: '❤️', name: 'قلب حديدي', desc: 'الصحة القصوى تزيد 25 مع علاج كامل', apply: () => { P.maxHp += 25; P.hp = P.maxHp; } },
  { id: 'reload', icon: '⚡', name: 'يد سريعة', desc: 'التلقيم أسرع بـ 30%', apply: () => P.perk.reload *= 0.7 },
  { id: 'speed', icon: '👟', name: 'خفة الحركة', desc: 'سرعة الحركة تزيد 12%', apply: () => P.perk.speed *= 1.12 },
  { id: 'mag', icon: '🔋', name: 'مخزن أكبر', desc: 'رصاص المخزن يزيد 35%', apply: () => { P.perk.mag *= 1.35; for (const w of P.weapons) w.mag = Math.round(w.def.mag * P.perk.mag); } },
  { id: 'leech', icon: '🧲', name: 'امتصاص', desc: 'كل قتلة ترجعلك 5 صحة', apply: () => P.perk.leech += 5 },
  { id: 'dash', icon: '💨', name: 'اندفاع خارق', desc: 'الاندفاع يرجع أسرع 40%', apply: () => P.perk.dash *= 0.6 },
  { id: 'head', icon: '🎯', name: 'عين الصقر', desc: 'ضرر إصابة الرأس يزيد 35%', apply: () => P.perk.head *= 1.35 },
  { id: 'regen', icon: '🛡️', name: 'درع متجدد', desc: 'الدرع يتجدد لحد 50', apply: () => P.perk.regen += 4 },
  { id: 'ammo', icon: '📦', name: 'مخزون ذخيرة', desc: 'ذخيرة كاملة ودرع 50', apply: () => { for (const w of P.weapons) if (w.owned) w.reserve = w.def.maxReserve; P.armor = Math.max(P.armor, 50); } },
];
function offerPerks() {
  if (G.mode !== 'play' || !P.alive) return;
  const pool = PERKS.filter(p => !(p.id === 'regen' && P.perk.regen >= 8)).sort(() => Math.random() - 0.5).slice(0, 3);
  const box = $('perkcards'); box.innerHTML = '';
  for (const p of pool) {
    const b = document.createElement('button'); b.className = 'perk'; b.innerHTML = `<div class="pi">${p.icon}</div><b>${p.name}</b><span>${p.desc}</span>`;
    b.addEventListener('click', () => { p.apply(); P.perks.push(p.id); sound.play('pickup'); show(null); G.mode = 'play'; input.reset(); input.lock(); feed(`${p.icon} ${p.name}`, true); lastT = performance.now(); });
    box.appendChild(b);
  }
  G.mode = 'perk'; input.unlock(); input.reset(); show('perks'); sound.play('streak');
}
// enemy health bars
const ehpPool = []; for (let i = 0; i < 14; i++) { const d = document.createElement('div'); d.className = 'ehp'; d.innerHTML = '<i></i>'; $('ehps').appendChild(d); ehpPool.push({ el: d, fill: d.firstChild, on: false }); }
function updateEnemyBars(dt) {
  let k = 0;
  for (const e of enemies.list) {
    if (!e.alive || e.type === 'boss' || !(e.barT > 0) || k >= ehpPool.length) continue; e.barT -= dt;
    _proj.set(e.pos.x, e.pos.y + (e.T.fly ? 0.75 : e.T.h + 0.35), e.pos.z).project(camera); if (_proj.z > 1 || Math.abs(_proj.x) > 1.1 || Math.abs(_proj.y) > 1.1) continue;
    const b = ehpPool[k++]; const x = (_proj.x * 0.5 + 0.5) * innerWidth, y = (-_proj.y * 0.5 + 0.5) * innerHeight;
    b.el.style.transform = `translate(${x | 0}px,${y | 0}px)`; b.el.style.opacity = Math.min(1, e.barT * 2).toFixed(2); b.fill.style.width = Math.max(0, e.hp / e.maxHp * 100).toFixed(0) + '%'; b.on = true;
  }
  for (; k < ehpPool.length; k++) { const b = ehpPool[k]; if (b.on) { b.on = false; b.el.style.opacity = 0; } }
}

// ---------- screens ----------
const screens = ['menu', 'settings', 'how', 'pause', 'over', 'perks', 'layoutEd', 'levels', 'shop', 'islands'];
let settingsReturn = 'menu';
function show(id) { for (const s of screens) $(s).classList.toggle('hidden', s !== id); }
function updateBest() { $('menuCoins').textContent = Shop.coins.toLocaleString('en-US'); $('bestScore').textContent = LS.get('ns_best', 0).toLocaleString('en-US'); $('bestWave').textContent = `${PROG.b.length}/${TOTAL}`; }
function renderIslands() {
  const box = $('islgrid'); box.innerHTML = ''; let nd = 0;
  for (let i = 1; i <= ISL; i++) {
    const th = THEMES[i - 1], open = islOpen(i), n = islDone(i); if (n >= LPI) nd++;
    const b = document.createElement('button'); b.className = 'isl' + (open ? '' : ' locked') + (n >= LPI ? ' done' : ''); b.dataset.i = i;
    b.style.setProperty('--bc', th.ui); b.style.setProperty('--bc2', th.ui2);
    b.innerHTML = `<i>${open ? th.emoji : '🔒'}</i><b>${th.name}</b><span>${open ? `${n}/${LPI} ${n >= LPI ? '✅' : '⭐'}` : 'مقفلة'}</span><small>👑 ${bossFor(i * 2 - 1).name} · ${bossFor(i * 2).name}</small>`;
    b.addEventListener('click', e => { e.preventDefault(); sound.init(); sound.play('ui'); if (!open) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); $('islmsg').textContent = `🔒 لازم تخلّص المرحلة 10 من ${THEMES[i - 2].name} أول`; return; } openLevels(i); });
    box.appendChild(b);
  }
  $('islcount').textContent = `${nd}/${ISL}`; $('islmsg').textContent = 'كل جزيرة فيها 10 مراحل · الزعماء 👑 بالمرحلة 5 و 10 · خلّص المرحلة 10 عشان تفتح الجزيرة اللي بعدها 🏝';
}
function openIslands() { G.mode = 'menu'; renderIslands(); show('islands'); H.hud.classList.add('hidden'); input.unlock(); }
function renderLevels() {
  const I = G.selIsl || 1, th = THEMES[I - 1], box = $('lvlgrid'); box.innerHTML = ''; let n = 0;
  $('lvltitle').textContent = `${th.emoji} ${th.name}`; $('levels').style.setProperty('--bc', th.ui);
  for (let l = 1; l <= LPI; l++) {
    const gl = glOf(I, l), open = lvlOpen(gl), done = beatenLvl(gl), boss = isBossLvl(gl); if (done) n++;
    const b = document.createElement('button'); b.className = 'lvl' + (open ? '' : ' locked') + (done ? ' done' : '') + (boss ? ' bosslvl' : ''); b.dataset.l = l; b.dataset.gl = gl;
    b.innerHTML = `<i>${open ? (done ? '✅' : (boss ? '👑' : '▶')) : '🔒'}</i><b>${l}</b><span>${boss ? '👑 ' + bossFor(bossIdx(gl)).name : (open ? `${nWaves(gl)} موجات` : 'مقفلة')}</span>${done ? '<em>⭐</em>' : ''}`;
    b.style.setProperty('--bc', boss ? bossFor(bossIdx(gl)).color : th.ui);
    b.addEventListener('click', e => { e.preventDefault(); sound.init(); if (!open) { sound.play('ui'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); $('lvlmsg').textContent = `🔒 لازم تخلّص المرحلة ${l - 1} أول`; return; } sound.play('ui'); tryFullscreen(); startGame(gl); });
    box.appendChild(b);
  }
  $('lvlcount').textContent = `${n}/${LPI}`; $('lvlmsg').textContent = 'المراحل العادية بلا زعيم · المرحلة 5 و 10 آخرها زعيم 👑 · خلّص المرحلة عشان تفتح اللي بعدها';
}
function openLevels(i) { if (i >= 1 && i <= ISL) G.selIsl = i; if (!G.selIsl) G.selIsl = islOf(G.gl || 1); G.mode = 'menu'; renderLevels(); show('levels'); H.hud.classList.add('hidden'); input.unlock(); }
function applyTheme(th) {
  scene.fog.color.set(th.fog); FOGK = th.fogK || 1; applyViewDist();
  hemi.color.set(th.hemi[0]); hemi.groundColor.set(th.hemi[1]); hemi.intensity = th.hemi[2];
  sun.color.set(th.sun[0]); sun.intensity = th.sun[1]; fill.color.set(th.fill[0]); fill.intensity = th.fill[1];
  renderer.toneMappingExposure = th.exp; applySkyTheme(sky, th); document.documentElement.style.setProperty('--isl', th.ui);
}
function resetGame() {
  const AS = Shop.armorStat();
  enemies.clear(); projectiles.clear(); shockwaves.length = 0; fx.clearDecals();
  world.restoreProps(); resetPickups();
  Object.assign(P, { maxHp: 100 + AS.hp + Shop.heartHp(), dr: AS.dr, perk: { dmg: 1, head: 1, reload: 1, speed: 1, mag: 1, leech: 0, dash: 1, regen: 0 }, perks: [], hp: 100 + AS.hp + Shop.heartHp(), armor: 25 + Shop.shieldStart(), alive: true, deathT: 0, recoil: 0, bloom: 0, dashCD: 0, invuln: 0, reloadT: -1, swapT: 0, fireCD: 0.3, cur: 0, ads: 0, scoped: false, prone: false, hk: 1, autoRun: false, pitch: -0.12, yaw: Math.PI, shake: 0, lastHurt: 0 });
  P.pos.set(1.6, 3, 1.8); P.vel.set(0, 0, 0); P.yaw = Math.PI; P.view = S.view; P.weapons = WEAPONS.map(w => { const d = Shop.def(w); return { def: d, mag: d.mag, reserve: d.reserve, owned: Shop.owned(w) }; });
  vm.setWeapon(0, true); PM.guns.forEach((g, k) => g.group.visible = k === 0); PM.g.rotation.z = 0;
  Object.assign(G, { nadeWarned: false, wave: 0, score: 0, kills: 0, heads: 0, shots: 0, hits: 0, streak: 0, streakT: 0, mult: 1, slowmo: 0 });
  intermission = 0; spawnQueue = [];
  H.boss.classList.add('hidden'); for (const k in last) delete last[k]; for (const b of ehpPool) { b.on = false; b.el.style.opacity = 0; }
}
function startGame(lvl) {
  sound.init(); sound.setVolume(S.vol); sound.setMusic(S.music);
  const qs = new URLSearchParams(location.search), dbgB = +(qs.get('boss') || 0), useBoss = dbgB >= 1 && dbgB <= 10 && !G.bossUsed;
  const dbgI = +(qs.get('island') || 0), useHook = !useBoss && dbgI >= 1 && dbgI <= ISL && !G.hookUsed;
  let gl = clamp((lvl | 0) || G.gl || 1, 1, TOTAL);
  if (useBoss) { gl = glOf(Math.ceil(dbgB / 2), dbgB % 2 ? 5 : 10); G.bossUsed = true; }
  else if (useHook) { gl = glOf(dbgI, clamp(+(qs.get('level') || 1) | 0, 1, LPI)); G.hookUsed = true; }
  resetGame(); G.gl = gl; G.level = gl; G.selIsl = islOf(gl); G.theme = world.setTheme(islOf(gl) - 1); applyTheme(G.theme);
  G.mode = 'play'; show(null); H.hud.classList.remove('hidden'); input.setTouchVisible(input.touchMode); applyHudSettings();
  const eb = ewBase(gl); P.weapons.forEach(w => { if (w.def.unlockWave && !w.def.price && w.def.unlockWave < eb) w.owned = true; });
  startWave(useBoss ? nWaves(gl) : 1); if (dbgB || dbgI || qs.has('debug')) window.__ns = { G, P, enemies, fire, applySkill, levelDone, openLevels, openIslands, startGame, PROG, world, isBossLvl, bossIdx, nWaves, dbgWave(k) { enemies.clear(); intermission = 0; startWave(k); }, dbgQueue: () => spawnQueue.slice(), fire, applySkill }; input.lock();
  const hc = LS.get('ns_hint', 0); if (input.touchMode && hc < 3) { LS.set('ns_hint', hc + 1); hintT = 7; $('hints').classList.remove('hidden'); } else $('hints').classList.add('hidden');
}
function pauseGame() { if (G.mode !== 'play') return; G.mode = 'paused'; show('pause'); input.unlock(); input.reset(); }
function resumeGame() { if (G.mode !== 'paused') return; G.mode = 'play'; show(null); input.lock(); last.t = performance.now(); }
function toMenu() { G.mode = 'menu'; show('menu'); H.hud.classList.add('hidden'); input.unlock(); enemies.clear(); projectiles.clear(); world.restoreProps(); spawnDemo(); updateBest(); sound.setIntensity(0); }
function levelDone(gl) {
  P.invuln = 999; input.unlock(); input.reset(); G.slowmo = 1.2; spawnQueue = []; intermission = 1e9; markBeaten(gl);
  const last = gl >= TOTAL, I = islOf(gl), lv = lvOf(gl), th = THEMES[I - 1], newIsl = lv === LPI && !last, nth = newIsl ? THEMES[I] : null, boss = isBossLvl(gl);
  const title = `${th.name} – المرحلة ${lv} خلصت ✅`;
  announce(last ? '🏆 فزت!' : title, last ? 'خلصت الجزر الخمسة كلها' : newIsl ? `فتحت جزيرة جديدة 🏝 ${nth.emoji} ${nth.name}` : `انفتحت المرحلة ${lv + 1} 🔓`);
  const best = LS.get('ns_best', 0), rec = G.score > best; if (rec) LS.set('ns_best', G.score); LS.set('ns_best_wave', Math.max(LS.get('ns_best_wave', 0), G.wave));
  const lc = 150 + 10 * gl + (boss ? 100 : 0); Shop.add(lc);
  setTimeout(() => {
    $('oCoins').textContent = `💰 +${lc} من المرحلة · الرصيد ${Shop.coins.toLocaleString('en-US')}`; $('oShop').classList.remove('hidden');
    G.mode = 'over'; G.overKind = last ? 'win' : 'next'; $('oTitle').textContent = last ? '🏆 فزت! خلصت كل الجزر' : title; $('oTitle').className = 'win';
    const parts = []; if (boss) parts.push(`هزمت ${bossFor(bossIdx(gl)).name} 👑`);
    if (last) parts.push('خلصت الخمسين مرحلة 🏆'); else if (newIsl) parts.push(`فتحت جزيرة جديدة 🏝 ${nth.emoji} ${nth.name}`); else parts.push(`انفتحت المرحلة ${lv + 1} 🔓`);
    $('oSub').textContent = parts.join(' · '); $('oSub').classList.remove('hidden');
    $('oAgain').textContent = last ? '↺ العب المرحلة مجدداً' : newIsl ? `▶ المرحلة التالية (${nth.emoji} ${nth.name})` : '▶ المرحلة التالية';
    fillStats(best, rec); $('oWave').textContent = `${th.emoji} ${lv}/${LPI}`; show('over'); H.hud.classList.add('hidden');
  }, 2400);
}
function fillStats(best, rec) { $('oScore').textContent = G.score.toLocaleString('en-US'); $('oKills').textContent = G.kills; $('oAcc').textContent = (G.shots ? Math.round(G.hits / G.shots * 100) : 0) + '%'; $('oHead').textContent = G.heads; $('oBest').textContent = Math.max(best, G.score).toLocaleString('en-US'); $('newrec').classList.toggle('hidden', !rec); }
function die() {
  P.alive = false; P.deathT = 0; sound.play('gameover'); input.unlock();
  const best = LS.get('ns_best', 0), rec = G.score > best; if (rec) LS.set('ns_best', G.score); LS.set('ns_best_wave', Math.max(LS.get('ns_best_wave', 0), G.wave));
  setTimeout(() => {
    $('oCoins').textContent = `💰 الرصيد ${Shop.coins.toLocaleString('en-US')}`; $('oShop').classList.add('hidden');
    G.mode = 'over'; G.overKind = 'retry'; $('oTitle').textContent = 'خسرت 💥'; $('oTitle').className = 'danger'; $('oSub').textContent = `${(G.theme || THEMES[0]).name} · المرحلة ${lvOf(G.gl || 1)} · الموجة ${G.waveIn || 1}/${G.nW || 1}`; $('oSub').classList.remove('hidden');
    $('oAgain').textContent = '↺ أعد المحاولة'; fillStats(best, rec); $('oWave').textContent = `${(G.theme || THEMES[0]).emoji} ${lvOf(G.gl || 1)} - موجة ${G.waveIn || 1}/${G.nW || 1}`; show('over'); H.hud.classList.add('hidden');
  }, 1600);
}
function spawnDemo() { const pts = [[-8, 10, 'soldier'], [10, -6, 'rusher'], [6, 14, 'drone'], [-12, -12, 'soldier'], [16, 8, 'rusher']]; for (const [x, z, t] of pts) { const e = enemies.spawn(t, new THREE.Vector3(x, 0, z), { demo: true }); e.state = 'patrol'; e.spawnT = 0; e.root.scale.setScalar(1); } }
function applyHudSettings() { const zb = document.getElementById('tZoom'); if (zb) zb.textContent = zoomLabel(); document.documentElement.style.setProperty('--bs', S.bs); document.documentElement.style.setProperty('--bop', S.bop ?? 1); applyLayout(); $('fps').classList.toggle('hidden', !S.fps); $('tFire2').classList.toggle('hidden', !S.leftFire); H.auto.classList.toggle('on', S.autoFire); }

// settings UI
function bindSettings() {
  const bindR = (id, key, out, fmt = v => v) => { const el = $(id), o = $(out); el.value = S[key]; o && (o.textContent = fmt(S[key])); el.addEventListener('input', () => { S[key] = parseFloat(el.value); o && (o.textContent = fmt(S[key])); saveSettings(); if (key === 'vol') sound.setVolume(S.vol); }); };
  bindR('sSensT', 'sensT', 'oSensT', v => (+v).toFixed(2)); bindR('sSmooth', 'smooth', 'oSmooth', v => Math.round(v * 100) + '%'); bindR('sSensM', 'sensM', 'oSensM', v => (+v).toFixed(2)); bindR('sVol', 'vol', 'oVol', v => Math.round(v * 100) + '%'); bindR('sBs', 'bs', 'oBs', v => Math.round(v * 100) + '%'); bindR('sMvol', 'musicVol', 'oMvol', v => Math.round(v * 100) + '%'); bindR('sBop', 'bop', 'oBop', v => Math.round(v * 100) + '%'); bindR('sFov', 'fov', 'oFov', v => Math.round(v) + '°'); bindR('sDist', 'viewDist', 'oDist', v => '×' + (+v).toFixed(2).replace(/\.?0+$/, '')); $('sDist').addEventListener('input', applyViewDist);
  $('sMvol').addEventListener('input', () => sound.setMusicVol(S.musicVol)); $('sBop').addEventListener('input', applyHudSettings); $('sBs').addEventListener('input', applyHudSettings);
  { const fc = $('sFpsCap'); fc.value = String(S.fpsCap); fc.addEventListener('change', () => { S.fpsCap = +fc.value; saveSettings(); }); }
  { const sv = $('sView'); sv.value = S.view; sv.addEventListener('change', () => { S.view = sv.value; P.view = S.view; saveSettings(); }); }
  $('sBs').addEventListener('input', applyHudSettings);
  const bindC = (id, key, cb) => { const el = $(id); el.checked = !!S[key]; el.addEventListener('change', () => { S[key] = el.checked; saveSettings(); cb && cb(); applyHudSettings(); }); };
  bindC('sMusic', 'music', () => sound.setMusic(S.music)); bindC('sAuto', 'autoFire'); bindC('sAssist', 'assist'); bindC('sInvert', 'invert'); bindC('sUnscope', 'unscopeRun'); bindC('sUnreload', 'unreloadRun'); bindC('sLeanAim', 'leanAim'); bindC('sLeftFire', 'leftFire'); bindC('sFps', 'fps'); bindC('sShake', 'shake'); bindC('sVibe', 'vibe');
  const q = $('sQuality'); q.value = S.quality; q.addEventListener('change', () => { S.quality = q.value; saveSettings(); qualityChanged = true; });
}
let qualityChanged = false;
function closeSettings() { if (qualityChanged) { qualityChanged = false; if (G.mode === 'menu' || settingsReturn === 'menu') { location.reload(); return; } } applyHudSettings(); if (settingsReturn === 'game') { settingsReturn = 'pause'; resumeGame(); return; } show(settingsReturn); }
const click = (id, fn) => $(id).addEventListener('click', e => { e.preventDefault(); sound.init(); sound.play('ui'); fn(); });
click('mPlay', () => { const q = new URLSearchParams(location.search), d = +(q.get('boss') || 0), di = +(q.get('island') || 0); if ((d >= 1 && d <= 10 && !G.bossUsed) || (di >= 1 && di <= ISL && !G.hookUsed)) { tryFullscreen(); startGame(); } else openIslands(); });
click('islBack', toMenu); click('islShop', () => openShop('islands'));
click('lvlBack', openIslands);
// ===== المتجر =====
let shopFrom = 'menu';
function coinPop(n) { const d = document.createElement('div'); d.className = 'cpop'; d.textContent = `+${n} 💰`; H.coinbox.appendChild(d); setTimeout(() => d.remove(), 900); }
function openShop(from) { shopFrom = from; $('shopMsg').textContent = ''; renderShop(); show('shop'); }
function closeShop() { if (shopFrom === 'levels') openLevels(); else if (shopFrom === 'islands') openIslands(); else if (shopFrom === 'over') show('over'); else { show('menu'); updateBest(); } }
const pct = v => Math.round(v * 100) + '%';
function renderShop() {
  $('shopCoins').textContent = Shop.coins.toLocaleString('en-US');
  const stars = n => '★'.repeat(n) + '☆'.repeat(Shop.MAX_UP - n);
  // طلب قصي: كل سلاح يبيّن ميزاته بالمتجر (ضرر، سرعة، مخزن، احتياط، مدى)
  const wStatLine = d => { const sk = d.skillDesc ? `<small class="wst">⭐ ${d.skillDesc}</small>` : ''; const perSec = d.rate ? (1 / d.rate).toFixed(1) : '—'; const pel = d.pellets > 1 ? ` × ${d.pellets} رصاصة` : ''; return `<small class="wst">💥 الضرر ${Math.round(d.dmg)}${pel} · 🎯 الرأس ×${d.head || 1} · ⚡ ${perSec} طلقة/ث · 📦 المخزن ${d.mag} · 🎒 الاحتياط ${(d.maxReserve ?? d.reserve) === Infinity ? '∞' : (d.maxReserve ?? d.reserve)} · 📏 المدى ${d.range || '—'}</small>` + sk; };
  const hc = Shop.heartCost(), hl = Shop.heartLevel(), hn = Shop.HEART.cost.length;
  let h = '<div class="shsec">❤️ الصحة</div><div class="shgrid">' +
    `<div class="wcard"><h3>❤️ القلب — الصحة القصوى ${100 + Shop.heartHp()}</h3><small>الترقية الجاية +${Shop.heartNext()} صحة قصوى (مع الدرع: ${100 + Shop.heartHp() + Shop.armorStat().hp})</small>` +
    `<div class="urow"><span class="ulbl">المستوى ${hl}/${hn}</span><span class="stars">${'❤'.repeat(hl)}${'♡'.repeat(hn - hl)}</span>` +
    (hc == null ? `<button class="shbtn done" disabled>أقصى ✓</button>` : `<button class="shbtn${Shop.coins < hc ? ' poor' : ''}" data-act="heart">ترقية · ${hc} 💰</button>`) + `</div></div></div>`;
  h += '<div class="shsec">🔫 ترقية أسلحتك</div><div class="shgrid">';
  for (const w of SHOP_WEAPONS()) {
    h += `<div class="wcard"><h3>${w.name}${w.unlockWave ? ' <small>(بالموجة ٤)</small>' : ''}</h3>${wStatLine(Shop.def(w))}`;
    for (const s of Shop.UP_STATS) {
      const L = Shop.level(w.id, s.k), c = Shop.upgradeCost(w.id, s.k);
      h += `<div class="urow"><span class="ulbl">${s.name} <small>${s.desc}</small></span><span class="stars">${stars(L)}</span>` +
        (c == null ? `<button class="shbtn done" disabled>أقصى ✓</button>` : `<button class="shbtn${Shop.coins < c ? ' poor' : ''}" data-act="up" data-id="${w.id}" data-k="${s.k}">ترقية · ${c} 💰</button>`) + `</div>`;
    }
    h += '</div>';
  }
  h += '</div><div class="shsec">🆕 أسلحة جديدة</div><div class="shgrid">';
  const nw = SHOP_NEW();
  for (const w of nw) h += `<div class="wcard"><h3>${w.name}</h3><small>${w.desc}</small>${wStatLine(w)}<div class="urow"><span class="ulbl"></span><button class="shbtn${Shop.coins < w.price ? ' poor' : ''}" data-act="wep" data-id="${w.id}">اشترِ · ${w.price} 💰</button></div></div>`;
  if (!nw.length) h += `<div class="wcard"><h3>كل الأسلحة عندك ✓</h3></div>`;
  h += '</div><div class="shsec">🛡 الدروع والحماية</div><div class="shgrid">';
  const a = Shop.nextArmor(), cur = Shop.armorStat(), sh = Shop.nextShield();
  h += `<div class="wcard"><h3>الدرع: ${Shop.armorLevel() ? Shop.ARMOR[Shop.armorLevel() - 1].name : 'بدون'}</h3><small>${Shop.armorLevel() ? `+${cur.hp} صحة قصوى · −${pct(cur.dr)} ضرر` : 'ما عندك درع بعد'}</small>` +
    (a ? `<div class="urow"><span class="ulbl">التالي: ${a.name} <small>+${a.hp} صحة · −${pct(a.dr)} ضرر</small></span><button class="shbtn${Shop.coins < a.price ? ' poor' : ''}" data-act="armor">ترقية · ${a.price} 💰</button></div>` : `<small>أقصى درع ✓</small>`) + '</div>';
  h += `<div class="wcard"><h3>${Shop.shieldLevel() ? Shop.SHIELD[Shop.shieldLevel() - 1].name : 'المولّد الواقي'}</h3><small>${Shop.shieldLevel() ? `+${Shop.shieldStart()} درع في بداية كل مرحلة` : 'درع إضافي يبدأ به كل مرحلة'}</small>` +
    (sh ? `<div class="urow"><span class="ulbl">التالي: ${sh.name} <small>+${sh.start} درع</small></span><button class="shbtn${Shop.coins < sh.price ? ' poor' : ''}" data-act="shield">شراء · ${sh.price} 💰</button></div>` : `<small>أقصى مولّد ✓</small>`) + '</div>';
  { const nc = Shop.nextCap(); h += `<div class="wcard"><h3>🔵 سعة الدرع: ${Shop.armorCap()}</h3><small>الدرع (الشريط الأزرق فوق) يقدر يوصل لـ ${Shop.armorCap()} بدل 100، الترقية الجاية +${Shop.nextCap()?.add || 0}</small>` + (nc ? `<div class="urow"><span class="ulbl">التالي: ${nc.cap}</span><button class="shbtn${Shop.coins < nc.price ? ' poor' : ''}" data-act="cap">ترقية · ${nc.price} 💰</button></div>` : `<small>أقصى سعة ✓</small>`) + '</div>'; }
  h += '</div>';
  $('shopBody').innerHTML = h;
}
$('shopBody').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return; e.preventDefault(); sound.init();
  const act = b.dataset.act; let ok = false, price = 0, what = '';
  if (act === 'up') { price = Shop.upgradeCost(b.dataset.id, b.dataset.k) || 0; ok = Shop.buyUpgrade(b.dataset.id, b.dataset.k); what = 'ترقية تمت ✅ ولا تنسى تجرّبها'; }
  else if (act === 'wep') { const w = WEAPONS.find(x => x.id === b.dataset.id); price = w.price; ok = Shop.buyWeapon(w); what = `${w.name} صار عندك ✅`; }
  else if (act === 'armor') { price = Shop.nextArmor()?.price || 0; ok = Shop.buyArmor(); what = 'درع جديد ✅ يشتغل من المرحلة الجاية'; }
  else if (act === 'heart') { price = Shop.heartCost() || 0; ok = Shop.buyHeart(); what = `صحتك صارت ${100 + Shop.heartHp()} ❤️ من المرحلة الجاية`; }
  else if (act === 'cap') { price = Shop.nextCap()?.price || 0; ok = Shop.buyCap(); what = `سعة الدرع صارت ${Shop.armorCap()} 🔵 من المرحلة الجاية`; }
  else if (act === 'shield') { price = Shop.nextShield()?.price || 0; ok = Shop.buyShield(); what = 'المولّد الواقي ✅ يشتغل من أول المرحلة الجاية'; }
  if (ok) { sound.play('swap'); $('shopMsg').textContent = what; }
  else { sound.play('empty'); $('shopMsg').textContent = `ما بكفّي الكوينز: ناقصك ${(price - Shop.coins).toLocaleString('en-US')} 💰`; }
  renderShop();
});
$('shopBack').addEventListener('click', e => { e.preventDefault(); sound.init(); sound.play('ui'); closeShop(); });
click('mShop', () => openShop('menu')); click('lvlShop', () => openShop('levels')); click('oShop', () => openShop('over'));

// ===== custom button layout =====
const LBTN = { tLeanL: 46, tLeanR: 46, tZoom: 44, tProne: 54, tFireS: 76, tScope: 56, tFire: 96, tFire2: 66, tJump: 62, tDash: 58, tReload: 52, tSwap: 52, tAuto: 40 };
function applyLayout() {
  const L = S.layout || {};
  for (const id in LBTN) { const el = $(id); if (!el) continue; const c = L[id];
    if (!c) { el.style.left = el.style.top = el.style.right = el.style.bottom = el.style.width = el.style.height = ''; continue; }
    const sz = LBTN[id] * (S.bs || 1) * (c.s || 1);
    el.style.width = el.style.height = sz + 'px'; el.style.right = el.style.bottom = 'auto';
    el.style.left = (c.x * innerWidth - sz / 2) + 'px'; el.style.top = (c.y * innerHeight - sz / 2) + 'px'; }
  applyJoy();
}
// مقبض الحركة: مكان + حجم + (متحرك/ثابت)
function applyJoy() {
  const J = S.joy, jEl = $('joy'), kn = $('joyknob'), mz = $('movezone'); if (!jEl) return;
  const js = (J && J.s) || 1, jsz = 128 * js, ksz = 56 * js;
  jEl.style.width = jEl.style.height = jsz + 'px'; jEl.style.margin = `${-jsz / 2}px 0 0 ${-jsz / 2}px`;
  kn.style.width = kn.style.height = ksz + 'px'; kn.style.margin = `${-ksz / 2}px 0 0 ${-ksz / 2}px`;
  if (J && J.x != null) {
    const w = Math.max(0.42 * innerWidth, jsz * 2.4), l = Math.max(0, Math.min(innerWidth - w, J.x * innerWidth - w / 2));
    mz.style.left = l + 'px'; mz.style.width = w + 'px';
  } else { mz.style.left = ''; mz.style.width = ''; }
  if (!jEl.classList.contains('active')) input.joyRest();
  const jb = $('edJoy'); if (jb) jb.textContent = (J && J.fixed) ? '🕹 المقبض: ثابت' : '🕹 المقبض: متحرك';
}
addEventListener('resize', () => applyLayout());
let edSel = null, edDrag = null, edReturn = 'settings', edWasTouchHidden = true, edWasHudHidden = true;
function edSelect(id) { for (const k in LBTN) $(k) && $(k).classList.toggle('sel', k === id); $('joy').classList.toggle('sel', id === 'joy'); edSel = id; const c = id === 'joy' ? S.joy : (S.layout || {})[id]; $('sBsz').value = c ? (c.s || 1) : 1; $('oBsz').textContent = Math.round($('sBsz').value * 100) + '%'; }
function edCapture(id) {
  if (id === 'joy') { const r = $('joy').getBoundingClientRect(); S.joy = S.joy || { s: 1 }; S.joy.x = (r.left + r.width / 2) / innerWidth; S.joy.y = (r.top + r.height / 2) / innerHeight; return S.joy; }
  const el = $(id); const r = el.getBoundingClientRect(); S.layout = S.layout || {}; const c = S.layout[id] || { s: 1 }; c.x = (r.left + r.width / 2) / innerWidth; c.y = (r.top + r.height / 2) / innerHeight; S.layout[id] = c; return c; }
function openLayoutEditor() {
  edReturn = settingsReturn; edWasHudHidden = $('hud').classList.contains('hidden'); $('hud').classList.remove('hidden'); const T = $('touch'); edWasTouchHidden = T.classList.contains('hidden'); T.classList.remove('hidden');
  $('tFire2').classList.remove('hidden'); document.body.classList.add('editing'); show('layoutEd'); edSelect('tFire');
}
function closeLayoutEditor() {
  document.body.classList.remove('editing'); for (const k in LBTN) $(k) && $(k).classList.remove('sel'); $('joy').classList.remove('sel');
  if (edWasTouchHidden) $('touch').classList.add('hidden'); if (edWasHudHidden) $('hud').classList.add('hidden'); saveSettings(); applyHudSettings(); show('settings'); settingsReturn = edReturn;
}
$('touch').addEventListener('pointerdown', e => {
  if (!document.body.classList.contains('editing')) return;
  const b = e.target.closest('.tbtn, #joy'); e.stopPropagation(); e.preventDefault(); if (!b || (!LBTN[b.id] && b.id !== 'joy')) return;
  edSelect(b.id); const c = edCapture(b.id); edDrag = { id: b.id, pid: e.pointerId, ox: e.clientX - c.x * innerWidth, oy: e.clientY - c.y * innerHeight }; applyLayout();
}, true);
addEventListener('pointermove', e => { if (!edDrag || e.pointerId !== edDrag.pid) return; e.preventDefault(); const c = edDrag.id === 'joy' ? S.joy : S.layout[edDrag.id];
  c.x = Math.max(0.03, Math.min(0.97, (e.clientX - edDrag.ox) / innerWidth)); c.y = Math.max(0.05, Math.min(0.97, (e.clientY - edDrag.oy) / innerHeight)); applyLayout(); }, true);
addEventListener('pointerup', e => { if (edDrag && e.pointerId === edDrag.pid) edDrag = null; }, true);
addEventListener('pointercancel', e => { if (edDrag && e.pointerId === edDrag.pid) edDrag = null; }, true);
$('sBsz').addEventListener('input', () => { if (!edSel) return; const c = edCapture(edSel); c.s = parseFloat($('sBsz').value); $('oBsz').textContent = Math.round(c.s * 100) + '%'; applyLayout(); });
$('edJoy').addEventListener('click', e => { e.preventDefault(); const c = edCapture('joy'); c.fixed = !c.fixed; applyLayout(); edSelect('joy'); });
$('edReset').addEventListener('click', () => { S.layout = {}; S.joy = null; applyLayout(); edSelect(edSel || 'tFire'); });
$('edDone').addEventListener('click', closeLayoutEditor);
$('sLayout').addEventListener('click', openLayoutEditor);
click('mSettings', () => { settingsReturn = 'menu'; show('settings'); });
click('mHow', () => show('how')); click('howBack', () => show('menu'));
click('setBack', closeSettings);
click('pResume', resumeGame); click('pSettings', () => { settingsReturn = 'pause'; show('settings'); }); click('pRestart', () => { G.mode = 'paused'; startGame(G.gl); }); click('pLevels', () => openLevels()); click('pMenu', toMenu);
click('oAgain', () => startGame(G.overKind === 'next' ? Math.min(TOTAL, (G.gl || 1) + 1) : G.gl)); click('oMenu', () => openLevels(G.overKind === 'next' && lvOf(G.gl || 1) === LPI ? islOf(G.gl) + 1 : islOf(G.gl || 1)));
click('mFs', tryFullscreen); $('btnFs').addEventListener('click', tryFullscreen);
$('btnPause').addEventListener('click', pauseGame); $('btnSet').addEventListener('pointerdown', e => e.stopPropagation()); $('btnSet').addEventListener('click', () => { if (G.mode !== 'play') return; pauseGame(); settingsReturn = 'game'; show('settings'); }); $('btnView').addEventListener('click', toggleView);
H.auto.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); S.autoFire = !S.autoFire; saveSettings(); applyHudSettings(); $('sAuto').checked = S.autoFire; feed(S.autoFire ? 'الإطلاق التلقائي: تشغيل' : 'الإطلاق التلقائي: إيقاف'); });
$('rotSkip').addEventListener('click', () => { rotSkipped = true; checkRotate(); });
function tryFullscreen() {
  const el = document.documentElement; const rq = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!document.fullscreenElement && rq) { try { const p = rq.call(el, { navigationUI: 'hide' }); p && p.then && p.then(() => { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => { }); }).catch(() => { }); } catch { } }
}
if (!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)) { $('mFs').classList.add('hidden'); $('btnFs').classList.add('hidden'); }
let rotSkipped = false;
function checkRotate() { const portrait = innerHeight > innerWidth * 1.05; const showR = input.touchMode && portrait && !rotSkipped; $('rotate').classList.toggle('hidden', !showR); if (showR && G.mode === 'play') pauseGame(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
input.onPause = () => { if (G.mode === 'play') pauseGame(); else if (G.mode === 'paused') resumeGame(); };

// ---------- resize & perf ----------
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); vm.cam.aspect = w / h; vm.cam.updateProjectionMatrix();
  const sc = h * renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)); fx.pointsMat.uniforms.scale.value = sc; fx.smokeMat.uniforms.scale.value = sc;
  checkRotate();
}
addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 200));
let fpsAcc = 0, fpsN = 0, fpsT = 0, fpsVal = 60;
function perf(dt) {
  fpsAcc += dt; fpsN++; fpsT += dt;
  if (fpsT >= 1) {
    fpsVal = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; fpsT = 0; if (S.fps) H.fps.textContent = `${Math.round(fpsVal)} FPS · ${renderer.getPixelRatio().toFixed(2)}x`;
    if (S.quality === 'auto' && G.mode === 'play') {
      let pr = renderer.getPixelRatio();
      // last resort on slow phones: drop shadows + reflections once
      if (fpsVal < 40 && pr <= 0.66) { G.slowSecs = (G.slowSecs || 0) + 1; if (G.slowSecs >= 3 && !G.degraded) { G.degraded = true; sun.castShadow = false; renderer.shadowMap.enabled = false; scene.environment = null; vm.scene.environment = null; scene.traverse(o => { if (o.material) [].concat(o.material).forEach(mm => mm.needsUpdate = true); }); } } else G.slowSecs = 0;
      if (fpsVal < 48 && pr > 0.65) pr = Math.max(0.65, pr - 0.1); else if (fpsVal > 58 && pr < prCap) pr = Math.min(prCap, pr + 0.05); else return;
      renderer.setPixelRatio(pr); resize();
    }
  }
}

// ---------- main loop ----------
let lastT = performance.now(), menuT = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const cap = +S.fpsCap || 0; if (cap > 0 && now - lastT < 1000 / cap - 2) return;
  let dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; if (dt <= 0) return;
  perf(dt);
  if (G.slowmo > 0) { G.slowmo -= dt; dt *= 0.3; }
  sky.mat.uniforms.time.value = now / 1000;
  for (const r of world.portalRings) r.rotation.z += dt * 0.8;
  if (G.mode === 'play') {
    G.time += dt;
    const inp = updatePlayer(dt);
    if (P.alive) updateWaves(dt);
    enemies.update(dt, G.time); projectiles.update(dt); updateShockwaves(dt); updatePickups(dt);
    updateCamera(dt); updatePlayerModel(dt);
    fx.update(dt, camera);
    vm.update(dt, { moving: Math.hypot(P.vel.x, P.vel.z) > 0.5, speed01: clamp(Math.hypot(P.vel.x, P.vel.z) / 8, 0, 1), lookDX: P.lookDX || 0, lookDY: P.lookDY || 0, reloading: P.reloadT >= 0 ? P.reloadT / (P.weapons[P.cur].def.reload * P.perk.reload) : -1, sprint: P.sprinting, onGround: P.onGround });
    updateHUD(dt);
    sound.setIntensity(clamp(enemies.alive() / 8, 0, 1));
  } else if (G.mode === 'menu' || G.mode === 'loading') {
    menuT += dt; G.time += dt;
    const a = menuT * 0.07; camera.position.set(Math.sin(a) * 30, 11 + Math.sin(menuT * 0.2) * 2, Math.cos(a) * 30); camera.lookAt(0, 2, 0); camera.fov = 70; camera.updateProjectionMatrix();
    enemies.update(dt, G.time); fx.update(dt, camera); updatePlayerModel(dt);
  } else if (G.mode === 'over') { G.time += dt; enemies.update(dt * 0.5, G.time); fx.update(dt, camera); updateCamera(dt); }
  else if (G.mode === 'paused' || G.mode === 'perk') { /* frozen */ }
  if (world.dirtyShadows || !G.shadowsDone) { renderer.shadowMap.needsUpdate = true; world.dirtyShadows = false; G.shadowsDone = true; }
  renderer.clear(); renderer.render(scene, camera);
  if (G.mode === 'play' && P.view === 'fp' && P.alive && P.ads < 0.6) { renderer.clearDepth(); renderer.render(vm.scene, vm.cam); }
}

// ---------- boot ----------
bindSettings(); resize(); updateBest(); spawnDemo(); applyHudSettings();
if (input.touchMode) document.body.classList.add('touchmode');
requestAnimationFrame(t => { lastT = t; requestAnimationFrame(loop); });
// warm up shaders (avoid stutter on first shot/explosion)
renderer.compile(scene, camera); renderer.compile(vm.scene, vm.cam);
setTimeout(() => { $('loading').classList.add('hidden'); G.mode = 'menu'; show('menu'); }, 150);
G.api = { Shop, offerPerks,  startGame, pauseGame, resumeGame, toMenu, fire, P, enemies, world, settings: S, switchWeapon, startWave, get spawnQueue() { return spawnQueue; }, set intermission(v) { intermission = v; }, explode: G.explode };
