import * as THREE from '../three.module.min.js';
import { mergeGeos } from './world.js';
const ENEMY_SPEED = 0.85; // سرعة كل الأعداء (1 = الأصلية)
const MOB_NERF = 0.9; // طلب قصي: صحة وضرب الوحوش العاديين −10% (الزعماء بدون تغيير)

const V = () => new THREE.Vector3();
const _a = V(), _b = V(), _c = V(), _d = V();

export const TYPES = {
  rusher: { name: 'مندفع', hp: 42, speed: 7.0, r: 0.5, h: 1.1, score: 100, color: '#ff8a2a', fly: false, debris: ['#ff8a2a', '#3a2a24', '#ffd23d'] },
  soldier: { name: 'جندي', hp: 78, speed: 4.1, r: 0.45, h: 1.95, score: 150, color: '#3fa9ff', fly: false, debris: ['#3fa9ff', '#2a2f45', '#c9d2ec'] },
  drone: { name: 'مسيّرة', hp: 46, speed: 6.8, r: 0.6, h: 0.6, score: 175, color: '#b45cff', fly: true, debris: ['#b45cff', '#2a2f45', '#ff6ad5'] },
  brute: { name: 'المدرّع', hp: 300, speed: 2.9, r: 0.75, h: 2.5, score: 400, color: '#4fd18b', fly: false, debris: ['#4fd18b', '#2a2f45', '#ffd23d'], burst: 7, gap: 0.085, shotDmg: 5, noCover: true },
  boss: { name: 'العملاق تيتان', hp: 1700, speed: 2.7, r: 1.5, h: 5.3, score: 3000, color: '#ff3d81', fly: false, debris: ['#ff3d81', '#2a2f45', '#ffd23d', '#c9d2ec'] },
};

// خاصية لكل وحش عادي بكل جزيرة (طلب قصي): 4 خواص، كل جزيرة بتوزعهم بشكل مختلف عن اللي قبلها
const ABIL = ['dash', 'regen', 'shield', 'blast']; // اندفاع · ترميم · درع · انفجار عند الموت
const ABIL_TYPE = { rusher: 0, soldier: 1, drone: 2, brute: 3 };
function abilityFor(type, isl) { if (type === 'boss' || ABIL_TYPE[type] === undefined) return null; return ABIL[(ABIL_TYPE[type] + ((isl | 0) || 1) - 1) % 4]; }

// 20 island bosses (1..20), one dedicated boss per island
export const BOSSES = [
  { name: 'العملاق تيتان',     color: '#ff3d81', accent: '#ffd23d', eye: '#ff2a2a', core: '#ffd23d', size: 1.00, wide: 1.00, hp: 1.00, dmg: 1.00, speed: 2.7, slam: 6.5, volN: 7,  volCD: 2.60, shot: 19.0, rings: 1, summon: 'rusher',  sumN: 3, extras: [] },
  { name: 'عملاق الجليد',      color: '#bfe9ff', accent: '#5ab8ff', eye: '#3fa9ff', core: '#9fe8ff', size: 1.04, wide: 1.08, hp: 1.28, dmg: 1.02, speed: 2.8, slam: 6.2, volN: 7,  volCD: 2.50, shot: 19.5, rings: 1, summon: 'rusher',  sumN: 3, extras: ['spikes'] },
  { name: 'البركان الغاضب',    color: '#d1262b', accent: '#2a1a1a', eye: '#ffb03d', core: '#ff6a00', size: 1.07, wide: 1.15, hp: 1.56, dmg: 1.04, speed: 2.85, slam: 6.0, volN: 8, volCD: 2.45, shot: 20.0, rings: 1, summon: 'soldier', sumN: 2, extras: ['pipes', 'horns'] },
  { name: 'حارس الزمرد',       color: '#2fd36b', accent: '#0f6b3a', eye: '#d6ff3d', core: '#7dff9a', size: 1.09, wide: 1.18, hp: 1.85, dmg: 1.06, speed: 2.9, slam: 5.8, volN: 8,  volCD: 2.40, shot: 20.5, rings: 1, summon: 'soldier', sumN: 3, extras: ['cannons4', 'visor'] },
  { name: 'الثور الحديدي',     color: '#ff8a2a', accent: '#8a5a2b', eye: '#ffe14d', core: '#ffb03d', size: 1.11, wide: 1.24, hp: 2.15, dmg: 1.08, speed: 2.95, slam: 5.6, volN: 8, volCD: 2.35, shot: 21.0, rings: 1, summon: 'rusher',  sumN: 4, extras: ['horns'] },
  { name: 'القرش الفولاذي',    color: '#8a9bb8', accent: '#1e88ff', eye: '#3dd6ff', core: '#3dd6ff', size: 1.13, wide: 1.12, hp: 2.45, dmg: 1.10, speed: 3.1, slam: 5.4, volN: 8,  volCD: 2.30, shot: 21.2, rings: 1, summon: 'drone',   sumN: 3, extras: ['fin', 'visor'] },
  { name: 'وحش السموم',        color: '#7dff3d', accent: '#1c4d18', eye: '#ffe64d', core: '#a6ff2e', size: 1.15, wide: 1.20, hp: 2.75, dmg: 1.12, speed: 3.0, slam: 5.2, volN: 9,  volCD: 2.25, shot: 21.5, rings: 1, summon: 'soldier', sumN: 3, extras: ['pipes', 'spikes'], rage: true },
  { name: 'صقر البرق',         color: '#2ee6ff', accent: '#1b4dff', eye: '#ffffff', core: '#7ff8ff', size: 1.15, wide: 0.92, hp: 3.05, dmg: 1.14, speed: 3.25, slam: 5.1, volN: 9, volCD: 2.20, shot: 22.0, rings: 1, summon: 'drone',   sumN: 3, extras: ['antennae', 'fin'], rage: true },
  { name: 'الحارس الحجري',     color: '#d9b36c', accent: '#5c4b32', eye: '#6ef2d6', core: '#6ef2d6', size: 1.18, wide: 1.25, hp: 3.35, dmg: 1.16, speed: 2.95, slam: 4.9, volN: 9, volCD: 2.15, shot: 22.0, rings: 2, summon: 'soldier', sumN: 3, extras: ['visor', 'cannons4'], rage: true },
  { name: 'سيد الصواعق',       color: '#44d9ff', accent: '#ffe64d', eye: '#ffe64d', core: '#ffffff', size: 1.19, wide: 1.10, hp: 3.65, dmg: 1.18, speed: 3.3, slam: 4.8, volN: 9,  volCD: 2.10, shot: 22.5, rings: 2, summon: 'drone',   sumN: 3, extras: ['halo', 'antennae'], rage: true },
  { name: 'شبح الساكورا',      color: '#ff6ec7', accent: '#5a1846', eye: '#fff0f8', core: '#ffd6f0', size: 1.18, wide: 0.96, hp: 3.95, dmg: 1.20, speed: 3.45, slam: 4.7, volN: 10, volCD: 2.05, shot: 23.0, rings: 2, summon: 'rusher', sumN: 4, extras: ['fin', 'halo'], rage: true },
  { name: 'كراكن الأعماق',     color: '#1e90ff', accent: '#00ffaa', eye: '#00ffaa', core: '#7af2ff', size: 1.21, wide: 1.22, hp: 4.25, dmg: 1.22, speed: 3.2, slam: 4.6, volN: 10, volCD: 2.00, shot: 23.0, rings: 2, summon: 'drone',   sumN: 4, extras: ['spikes', 'antennae'], rage: true },
  { name: 'عقرب الرمال',       color: '#ff5e3a', accent: '#4a1911', eye: '#ffe180', core: '#ffaa44', size: 1.22, wide: 1.24, hp: 4.55, dmg: 1.24, speed: 3.3, slam: 4.5, volN: 10, volCD: 1.98, shot: 23.5, rings: 2, summon: 'rusher',  sumN: 4, extras: ['horns', 'spikes'], rage: true },
  { name: 'الساحر البنفسجي',   color: '#a24bff', accent: '#ff6ad5', eye: '#ff6ad5', core: '#5ef2ff', size: 1.22, wide: 1.00, hp: 4.85, dmg: 1.26, speed: 3.35, slam: 4.4, volN: 10, volCD: 1.94, shot: 23.8, rings: 2, summon: 'drone',  sumN: 4, extras: ['halo', 'antennae'], rage: true },
  { name: 'المطرقة الفولاذية', color: '#ff9f1c', accent: '#302927', eye: '#ff4d4d', core: '#ffd166', size: 1.25, wide: 1.28, hp: 5.20, dmg: 1.28, speed: 3.25, slam: 4.3, volN: 10, volCD: 1.90, shot: 24.0, rings: 2, summon: 'soldier', sumN: 4, extras: ['pipes', 'cannons4'], rage: true },
  { name: 'سيد الظلال',        color: '#3a2f5a', bar: '#ff5a7a', accent: '#ff2a4d', eye: '#ff2a4d', core: '#ff2a4d', size: 1.27, wide: 1.20, hp: 5.55, dmg: 1.30, speed: 3.45, slam: 4.2, volN: 11, volCD: 1.86, shot: 24.2, rings: 2, summon: 'drone', sumN: 4, extras: ['bighorns', 'spikes', 'cannons4'], rage: true },
  { name: 'نسر السحاب',        color: '#7de8ff', accent: '#ffe680', eye: '#ffffff', core: '#ffe680', size: 1.27, wide: 1.05, hp: 5.90, dmg: 1.32, speed: 3.55, slam: 4.1, volN: 11, volCD: 1.82, shot: 24.5, rings: 2, summon: 'drone',   sumN: 4, extras: ['fin', 'halo', 'visor'], rage: true },
  { name: 'حارس المدار',       color: '#b46bff', accent: '#3dd6ff', eye: '#3dd6ff', core: '#ff6ad5', size: 1.30, wide: 1.18, hp: 6.30, dmg: 1.34, speed: 3.5, slam: 4.0, volN: 11, volCD: 1.80, shot: 24.8, rings: 3, summon: 'soldier', sumN: 4, extras: ['halo', 'cannons4', 'antennae'], rage: true },
  { name: 'سيد الكم',          color: '#00f5d4', accent: '#ff3df0', eye: '#ff3df0', core: '#ffe64d', size: 1.32, wide: 1.22, hp: 6.75, dmg: 1.36, speed: 3.6, slam: 3.9, volN: 12, volCD: 1.76, shot: 25.0, rings: 3, summon: 'drone',   sumN: 4, summon2: 'rusher', extras: ['halo', 'spikes', 'bighorns'], rage: true },
  { name: 'الإمبراطور الذهبي', color: '#ffc43d', accent: '#ffffff', eye: '#ff3d81', core: '#ffffff', size: 1.36, wide: 1.30, hp: 7.25, dmg: 1.40, speed: 3.65, slam: 3.7, volN: 12, volCD: 1.70, shot: 25.5, rings: 3, summon: 'soldier', sumN: 4, summon2: 'drone', extras: ['crown', 'halo', 'cannons4', 'pipes'], rage: true },
];
// خاصية لكل زعيم (طلب قصي): كل زعيم إله خاصية مختلفة عن الزعماء الثانيين وعن خواص الوحوش العادية
const BOSS_AB = ['teleport', 'cloak', 'pull', 'reflect', 'enrage', 'push', 'zap', 'aura', 'plates', 'quake'];
export function bossFor(level) { return BOSSES[Math.max(0, Math.min(BOSSES.length - 1, (level | 0) - 1))]; }
function bossT(B) { const base = TYPES.boss; return { ...base, name: B.name, color: B.color, speed: B.speed, r: base.r * B.size, h: base.h * B.size, score: Math.round(base.score * (1 + (B.hp - 1) * 0.5)), debris: [B.color, '#2a2f45', B.accent, B.core], B }; }

const geoCache = {};
function geo(key, make) { return geoCache[key] || (geoCache[key] = make()); }
function stdMat(color, o = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.45, flatShading: true, ...o }); }
const glowMats = {};
function glowMat(color) { return glowMats[color] || (glowMats[color] = new THREE.MeshBasicMaterial({ color, toneMapped: false })); }
const darkMat = stdMat('#23263a', { roughness: 0.7 });
const jointMat = stdMat('#4b5272');

function add(parent, g, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) { const me = new THREE.Mesh(g, m); me.position.set(x, y, z); me.scale.set(sx, sy, sz); parent.add(me); return me; }
const BOX = () => geo('box', () => new THREE.BoxGeometry(1, 1, 1));
const SPH = () => geo('sph', () => new THREE.IcosahedronGeometry(1, 1));
const SPH0 = () => geo('sph0', () => new THREE.IcosahedronGeometry(1, 0));
const CYL = () => geo('cyl', () => new THREE.CylinderGeometry(1, 1, 1, 10));
const CONE = () => geo('cone', () => new THREE.ConeGeometry(1, 1, 8));
const TOR = () => geo('tor', () => new THREE.TorusGeometry(1, 0.12, 6, 24));

// ===== أشكال الوحوش حسب الجزيرة (طلب قصي): نفس القوة بالضبط، بس شكل وألوان مختلفة =====
// كل الخامات بتنبني مرة وحدة لكل جزيرة وبتنعاد (خفيفة على الموبايل). الحجم/الهيت بوكس (r, h) ما بتغير.
const SKIN_DEF = [
  { isl: 1, col: {}, dark: null, joint: null, eye: { rusher: '#ff2a2a', soldier: '#7ff8ff', drone: '#ff6ad5', brute: '#ff2a2a' }, gA: '#7ff8ff', gB: '#ffd23d', gC: '#ff6ad5', gD: '#4fd18b', rot: '#d8c8ff', bodyOpt: {} },
  { isl: 2, col: { rusher: '#8fd4ff', soldier: '#dff4ff', drone: '#6fc2ff', brute: '#a9dcff' }, dark: ['#24476e', { roughness: 0.4, metalness: 0.3 }], joint: ['#e6f6ff', { roughness: 0.2, metalness: 0.5 }], eye: { rusher: '#00e5ff', soldier: '#ffffff', drone: '#9ff8ff', brute: '#00e5ff' }, gA: '#bff6ff', gB: '#e8fbff', gC: '#7fe0ff', gD: '#9ffcff', rot: '#e0f6ff', bodyOpt: { roughness: 0.22, metalness: 0.25 } },
  { isl: 3, col: { rusher: '#c0301a', soldier: '#8e2416', drone: '#b03a12', brute: '#7a1c10' }, dark: ['#150b09', { roughness: 0.85 }], joint: ['#3a2622', { roughness: 0.7 }], eye: { rusher: '#ffb02a', soldier: '#ffd23d', drone: '#ff8a1a', brute: '#ffb02a' }, gA: '#ff8a1a', gB: '#ffb02a', gC: '#ff5a1a', gD: '#ffd23d', rot: '#ffb080', bodyOpt: { roughness: 0.75, metalness: 0.3 } },
  { isl: 4, col: { rusher: '#5fae34', soldier: '#3f923c', drone: '#82c43c', brute: '#2f7230' }, dark: ['#3b2a18', { roughness: 0.9, metalness: 0.05 }], joint: ['#7a5430', { roughness: 0.85, metalness: 0.05 }], eye: { rusher: '#ffe14d', soldier: '#ffe14d', drone: '#fff07a', brute: '#ffe14d' }, gA: '#c6ff5a', gB: '#ffe14d', gC: '#9dff6a', gD: '#ffe14d', rot: '#d8ffb0', bodyOpt: { roughness: 0.75, metalness: 0.1 } },
  { isl: 5, col: { rusher: '#7a3cff', soldier: '#c4cade', drone: '#9b5cff', brute: '#5b2cb0' }, dark: ['#1a1238', { roughness: 0.4, metalness: 0.6 }], joint: ['#dfe3f5', { roughness: 0.18, metalness: 0.95 }], eye: { rusher: '#ff4fd8', soldier: '#7ff8ff', drone: '#ff4fd8', brute: '#7ff8ff' }, gA: '#ff6ad5', gB: '#7ff8ff', gC: '#c77dff', gD: '#7ff8ff', rot: '#e0d0ff', bodyOpt: { roughness: 0.22, metalness: 0.85 } },
];
const SKINS = SKIN_DEF.map(d => {
  const dM = d.dark ? stdMat(d.dark[0], d.dark[1]) : darkMat, jM = d.joint ? stdMat(d.joint[0], d.joint[1]) : jointMat;
  const K = { ...d, dM, jM, darkHex: d.dark ? d.dark[0] : '#23263a', ex: {} };
  if (d.isl === 2) { K.ex.ice = stdMat('#d6f7ff', { roughness: 0.1, metalness: 0.1, emissive: '#3fb8ff', emissiveIntensity: 0.55, transparent: true, opacity: 0.88 }); }
  if (d.isl === 3) { K.ex.horn = stdMat('#1c100c', { roughness: 0.6, metalness: 0.4 }); K.ex.crack = glowMat('#ff7a1a'); }
  if (d.isl === 4) { K.ex.leaf = stdMat('#5ad14a', { roughness: 0.8, metalness: 0, emissive: '#1f5a10', emissiveIntensity: 0.4 }); K.ex.moss = stdMat('#2c7f2a', { roughness: 0.95, metalness: 0 }); }
  if (d.isl === 5) { K.ex.glass = new THREE.MeshStandardMaterial({ color: '#b8ecff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.3, depthWrite: false }); K.ex.orbA = glowMat(d.gA); K.ex.orbB = glowMat(d.gB); }
  return K;
});
const skinTCache = {};
// نفس إحصائيات TYPES حرفياً (hp, speed, r, h, score…) — بس اللون والحطام والشكل حسب الجزيرة
function skinT(type, isl) {
  const i = (((Math.max(1, isl | 0) - 1) % SKINS.length) + 1); if (i === 1) return TYPES[type];
  const key = type + i; if (skinTCache[key]) return skinTCache[key];
  const K = SKINS[i - 1], base = TYPES[type], color = K.col[type] || base.color;
  return (skinTCache[key] = { ...base, color, debris: [color, K.darkHex, K.gB], skin: K });
}
function addSkinExtras(type, p, K) {
  const X = K.ex, S = 1.32, t = p.torso, h = p.head;
  const spike = (par, m, x, y, z, w, l, rx = 0, rz = 0) => { const o = add(par, CONE(), m, x, y, z, w, l, w); o.rotation.x = rx; o.rotation.z = rz; return o; };
  if (K.isl === 2) { // ❄️ جليد: كريستالات ثلج
    const I = X.ice;
    if (type === 'rusher') { spike(t, I, 0, 0.42, 0.04, 0.08, 0.3); spike(t, I, 0, 0.34, 0.3, 0.07, 0.24, 0.5); spike(t, I, 0.24, 0.3, 0.22, 0.05, 0.18, 0.3, -0.7); spike(t, I, -0.24, 0.3, 0.22, 0.05, 0.18, 0.3, 0.7); }
    else if (type === 'soldier') { spike(h, I, 0.08, 0.25, 0, 0.06, 0.22, 0, -0.25); spike(h, I, -0.08, 0.23, 0.02, 0.05, 0.18, 0, 0.3); for (const s of [-1, 1]) spike(t, I, s * 0.42, 0.74, 0, 0.08, 0.26, 0, -s * 0.5); }
    else if (type === 'drone') { for (let k = 0; k < 4; k++) { const a = k * 1.571 + 0.785; spike(t, I, Math.cos(a) * 0.36, -0.2, Math.sin(a) * 0.36, 0.05, 0.24, Math.PI); } spike(t, I, 0, 0.42, 0, 0.09, 0.26); }
    else if (type === 'brute') { for (const s of [-1, 1]) spike(t, I, s * 0.55 * S, 0.82 * S, 0, 0.1 * S, 0.34 * S, 0, -s * 0.35); spike(t, I, 0, 0.84 * S, 0.3 * S, 0.09 * S, 0.36 * S, 0.5); spike(t, I, 0.16 * S, 0.8 * S, 0.34 * S, 0.06 * S, 0.24 * S, 0.6, -0.4); }
  } else if (K.isl === 3) { // 🌋 بركان: قرون + شقوق نار
    const Hn = X.horn, C = X.crack;
    if (type === 'rusher') { spike(t, Hn, 0.17, 0.3, -0.3, 0.07, 0.26, -0.5, -0.35); spike(t, Hn, -0.17, 0.3, -0.3, 0.07, 0.26, -0.5, 0.35); add(t, BOX(), C, 0.1, 0.355, 0.02, 0.035, 0.03, 0.4).rotation.y = 0.35; add(t, BOX(), C, -0.14, 0.33, 0.12, 0.03, 0.03, 0.3).rotation.y = -0.5; add(t, BOX(), C, 0.47, 0.02, 0.05, 0.03, 0.2, 0.05).rotation.x = 0.4; add(t, BOX(), C, -0.47, 0.02, -0.05, 0.03, 0.2, 0.05).rotation.x = -0.4; }
    else if (type === 'soldier') { spike(h, Hn, 0.13, 0.2, 0, 0.055, 0.24, 0, -0.4); spike(h, Hn, -0.13, 0.2, 0, 0.055, 0.24, 0, 0.4); add(t, BOX(), C, -0.16, 0.3, -0.196, 0.03, 0.3, 0.01).rotation.z = 0.35; add(t, BOX(), C, 0.19, 0.24, -0.196, 0.03, 0.22, 0.01).rotation.z = -0.45; add(t, BOX(), C, 0.312, 0.35, 0, 0.01, 0.3, 0.03).rotation.x = 0.3; }
    else if (type === 'drone') { add(t, CYL(), C, 0, 0, 0, 0.565, 0.035, 0.565); for (let k = 0; k < 3; k++) { const a = k * 2.094; spike(t, Hn, Math.cos(a) * 0.3, 0.26, Math.sin(a) * 0.3, 0.06, 0.22, Math.sin(a) * 0.4, -Math.cos(a) * 0.4); } }
    else if (type === 'brute') { spike(h, Hn, 0.17 * S, 0.17 * S, -0.02 * S, 0.07 * S, 0.32 * S, -0.2, -0.55); spike(h, Hn, -0.17 * S, 0.17 * S, -0.02 * S, 0.07 * S, 0.32 * S, -0.2, 0.55); for (const s of [-1, 1]) { add(t, BOX(), C, s * 0.413 * S, 0.42 * S, 0.02 * S, 0.01, 0.42 * S, 0.035 * S).rotation.x = s * 0.3; spike(t, Hn, s * 0.55 * S, 0.8 * S, 0, 0.07 * S, 0.24 * S, 0, -s * 0.3); } }
  } else if (K.isl === 4) { // 🌴 غابة: أوراق + طحالب
    const Lf = X.leaf, M = X.moss, J = K.jM;
    const sprout = (par, x, y, z, sc) => { add(par, CYL(), J, x, y, z, 0.018 * sc, 0.18 * sc, 0.018 * sc); add(par, SPH(), Lf, x + 0.1 * sc, y + 0.1 * sc, z, 0.13 * sc, 0.025 * sc, 0.07 * sc).rotation.z = -0.45; add(par, SPH(), Lf, x - 0.09 * sc, y + 0.12 * sc, z, 0.11 * sc, 0.025 * sc, 0.06 * sc).rotation.z = 0.55; };
    if (type === 'rusher') { add(t, SPH0(), M, 0, 0.3, 0.06, 0.36, 0.1, 0.42); add(t, SPH(), Lf, 0.33, 0.56, 0.1, 0.12, 0.025, 0.07).rotation.z = -0.5; add(t, SPH(), Lf, -0.33, 0.56, 0.1, 0.12, 0.025, 0.07).rotation.z = 0.5; }
    else if (type === 'soldier') { add(h, SPH(), Lf, 0.19, 0.33, 0, 0.13, 0.025, 0.075).rotation.z = -0.45; add(h, SPH(), Lf, 0.06, 0.33, 0, 0.1, 0.025, 0.06).rotation.z = 0.5; for (const s of [-1, 1]) add(t, BOX(), M, s * 0.42, 0.65, 0, 0.27, 0.06, 0.29); add(t, BOX(), M, 0, 0.64, 0.02, 0.5, 0.04, 0.3); }
    else if (type === 'drone') { add(t, SPH(), M, 0, 0.22, 0, 0.3, 0.1, 0.3); sprout(t, 0, 0.36, 0, 1.2); }
    else if (type === 'brute') { for (const s of [-1, 1]) add(t, BOX(), M, s * 0.55 * S, 0.76 * S, 0, 0.36 * S, 0.08 * S, 0.38 * S); add(t, BOX(), M, 0, 0.7 * S, 0.05 * S, 0.7 * S, 0.05 * S, 0.4 * S); sprout(h, 0, 0.2 * S, 0, 1.4); }
  } else if (K.isl === 5) { // 🪐 فضاء: قبة زجاج + هوائيات بكرات مضيئة
    const Gl = X.glass, A = X.orbA, Bo = X.orbB, J = K.jM;
    const ant = (par, x, y, z, l, r, m) => { add(par, CYL(), J, x, y + l / 2, z, 0.015, l, 0.015); add(par, SPH(), m, x, y + l + r * 0.6, z, r, r, r); };
    if (type === 'rusher') { add(t, SPH(), Gl, 0, 0.28, 0.06, 0.32, 0.24, 0.34); ant(t, 0, 0.45, 0.16, 0.26, 0.07, A); }
    else if (type === 'soldier') { add(h, SPH(), Gl, 0, 0.02, 0, 0.31, 0.3, 0.31); for (const s of [-1, 1]) ant(h, s * 0.1, 0.3, 0, 0.14, 0.045, s > 0 ? A : Bo); }
    else if (type === 'drone') { add(t, SPH(), Gl, 0, 0.1, 0, 0.42, 0.34, 0.42); for (const s of [-1, 1]) ant(t, s * 0.16, 0.36, 0, 0.18, 0.06, s > 0 ? A : Bo); }
    else if (type === 'brute') { add(h, SPH(), Gl, 0, 0.03 * S, 0, 0.26 * S, 0.24 * S, 0.26 * S); for (const s of [-1, 1]) ant(t, s * 0.55 * S, 0.74 * S, 0, 0.3, 0.08, s > 0 ? A : Bo); }
  }
}

export function buildEnemyMesh(type, tex, Tover) {
  const T = Tover || TYPES[type]; const K = T.skin || SKINS[0]; const dM = K.dM, jM = K.jM;
  const root = new THREE.Group(); const body = stdMat(T.color, type === 'boss' ? {} : K.bodyOpt); const parts = { body, legs: [], eyeMats: [] };
  const B = type === 'boss' ? (T.B || BOSSES[0]) : null;
  const eyeCol = B ? B.eye : (K.eye[type] || '#ff2a2a');
  const eyeM = new THREE.MeshBasicMaterial({ color: eyeCol, toneMapped: false }); parts.eye = eyeM;
  const glowSprite = (x, y, z, s, color) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.glow, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9 })); sp.position.set(x, y, z); sp.scale.set(s, s, 1); return sp; };
  if (type === 'rusher') {
    const b = new THREE.Group(); b.position.y = 0.62; root.add(b); parts.torso = b;
    add(b, SPH0(), body, 0, 0, 0, 0.5, 0.38, 0.58);
    add(b, BOX(), dM, 0, -0.12, 0, 0.62, 0.16, 0.66);
    add(b, SPH(), eyeM, 0, 0.08, -0.48, 0.15, 0.15, 0.1);
    const sg = glowSprite(0, 0.08, -0.55, 0.7, eyeCol); b.add(sg); parts.eyeSprite = sg;
    add(b, BOX(), jM, 0.2, 0.36, 0.1, 0.04, 0.3, 0.04).rotation.z = -0.4; add(b, BOX(), jM, -0.2, 0.36, 0.1, 0.04, 0.3, 0.04).rotation.z = 0.4;
    add(b, SPH(), glowMat(K.gB), 0.27, 0.5, 0.1, 0.05, 0.05, 0.05); add(b, SPH(), glowMat(K.gB), -0.27, 0.5, 0.1, 0.05, 0.05, 0.05);
    // mandibles
    add(b, BOX(), dM, 0.16, -0.06, -0.52, 0.06, 0.06, 0.22).rotation.y = 0.4; add(b, BOX(), dM, -0.16, -0.06, -0.52, 0.06, 0.06, 0.22).rotation.y = -0.4;
    for (let i = 0; i < 4; i++) {
      const sx = i % 2 ? 1 : -1, sz = i < 2 ? -1 : 1; const leg = new THREE.Group(); leg.position.set(sx * 0.35, 0.55, sz * 0.25); root.add(leg);
      const up = add(leg, BOX(), jM, sx * 0.18, 0.05, 0, 0.36, 0.07, 0.07); up.rotation.z = sx * -0.5;
      const low = add(leg, BOX(), dM, sx * 0.4, -0.25, 0, 0.07, 0.6, 0.07); low.rotation.z = sx * 0.25;
      parts.legs.push({ g: leg, phase: i * 1.57 + (i % 2) * 3.14, side: sx });
    }
    root.userData.spheres = [{ x: 0, y: 0.62, z: 0, r: 0.55, m: 1 }, { x: 0, y: 0.7, z: -0.42, r: 0.24, m: 2 }];
  } else if (type === 'soldier') {
    const hip = new THREE.Group(); hip.position.y = 0.95; root.add(hip);
    add(hip, BOX(), dM, 0, 0, 0, 0.5, 0.18, 0.3);
    for (const s of [-1, 1]) {
      const leg = new THREE.Group(); leg.position.set(s * 0.17, 0, 0); hip.add(leg);
      add(leg, BOX(), body, 0, -0.22, 0, 0.18, 0.44, 0.22); const knee = new THREE.Group(); knee.position.y = -0.45; leg.add(knee);
      add(knee, BOX(), dM, 0, -0.22, 0.02, 0.15, 0.44, 0.18); add(knee, BOX(), jM, 0, -0.47, -0.05, 0.2, 0.08, 0.32);
      parts.legs.push({ g: leg, knee, side: s });
    }
    const torso = new THREE.Group(); torso.position.y = 1.0; root.add(torso); parts.torso = torso;
    add(torso, BOX(), body, 0, 0.35, 0, 0.62, 0.55, 0.38); add(torso, BOX(), dM, 0, 0.1, 0, 0.5, 0.15, 0.32);
    add(torso, BOX(), glowMat(K.gA), 0, 0.42, -0.2, 0.18, 0.06, 0.02);
    add(torso, BOX(), dM, 0, 0.38, 0.26, 0.42, 0.42, 0.18); // backpack
    add(torso, BOX(), glowMat(K.gB), 0.12, 0.5, 0.36, 0.06, 0.06, 0.02);
    const head = new THREE.Group(); head.position.set(0, 0.78, 0); torso.add(head); parts.head = head;
    add(head, BOX(), body, 0, 0, 0, 0.34, 0.3, 0.34); add(head, BOX(), eyeM, 0, 0.03, -0.175, 0.26, 0.07, 0.02);
    const eg = glowSprite(0, 0.03, -0.22, 0.5, eyeCol); head.add(eg); parts.eyeSprite = eg;
    add(head, BOX(), jM, 0.12, 0.22, 0, 0.03, 0.18, 0.03);
    // arms
    for (const s of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(s * 0.42, 0.52, 0); torso.add(sh); add(sh, BOX(), jM, 0, 0.02, 0, 0.22, 0.2, 0.24);
      if (s > 0) { // gun arm, points forward
        const arm = new THREE.Group(); arm.position.set(0, -0.12, 0); sh.add(arm); arm.rotation.x = 1.35;
        add(arm, BOX(), body, 0, -0.18, 0, 0.16, 0.36, 0.16); const gun = add(arm, CYL(), dM, 0, -0.5, 0, 0.09, 0.4, 0.09);
        const tip = add(arm, CYL(), glowMat(K.gA), 0, -0.72, 0, 0.06, 0.05, 0.06); parts.gunTip = tip; parts.gunArm = arm;
        const mz = new THREE.Object3D(); mz.position.set(0, -0.78, 0); arm.add(mz); parts.muzzle = mz;
        const cg = glowSprite(0, -0.78, 0, 0.0, K.gA); arm.add(cg); parts.charge = cg;
      } else { const arm = add(sh, BOX(), body, 0, -0.32, -0.05, 0.14, 0.5, 0.14); arm.rotation.x = 0.3; parts.leftArm = arm; }
    }
    root.userData.spheres = [{ x: 0, y: 1.3, z: 0, r: 0.42, m: 1 }, { x: 0, y: 0.6, z: 0, r: 0.34, m: 0.8 }, { x: 0, y: 1.8, z: 0, r: 0.22, m: 2 }];
  } else if (type === 'drone') {
    const b = new THREE.Group(); root.add(b); parts.torso = b;
    add(b, CYL(), body, 0, 0, 0, 0.55, 0.16, 0.55); add(b, SPH(), dM, 0, 0.08, 0, 0.36, 0.22, 0.36);
    add(b, CYL(), eyeM, 0, -0.12, 0, 0.18, 0.06, 0.18); const eg = glowSprite(0, -0.16, 0, 0.8, eyeCol); b.add(eg); parts.eyeSprite = eg;
    add(b, BOX(), glowMat(K.gC), 0, 0, -0.56, 0.3, 0.05, 0.02);
    parts.rotors = [];
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4, x = Math.cos(a) * 0.62, z = Math.sin(a) * 0.62;
      const arm = add(b, BOX(), jM, x * 0.6, 0.02, z * 0.6, 0.08, 0.05, 0.5); arm.rotation.y = -a + Math.PI / 2;
      const rot = new THREE.Group(); rot.position.set(x, 0.08, z); b.add(rot);
      add(rot, BOX(), new THREE.MeshBasicMaterial({ color: K.rot, transparent: true, opacity: 0.45 }), 0, 0, 0, 0.5, 0.01, 0.06); add(rot, BOX(), new THREE.MeshBasicMaterial({ color: K.rot, transparent: true, opacity: 0.45 }), 0, 0, 0, 0.06, 0.01, 0.5);
      parts.rotors.push(rot);
    }
    const mz = new THREE.Object3D(); mz.position.set(0, -0.2, -0.3); b.add(mz); parts.muzzle = mz;
    const cg = glowSprite(0, -0.2, -0.3, 0, K.gC); b.add(cg); parts.charge = cg;
    root.userData.spheres = [{ x: 0, y: 0, z: 0, r: 0.62, m: 1 }, { x: 0, y: -0.12, z: 0, r: 0.22, m: 1.6 }];
  } else if (type === 'brute') {
    const S = 1.32;
    const hip = new THREE.Group(); hip.position.y = 0.95 * S; root.add(hip);
    add(hip, BOX(), dM, 0, 0, 0, 0.6 * S, 0.2 * S, 0.36 * S);
    for (const s of [-1, 1]) {
      const leg = new THREE.Group(); leg.position.set(s * 0.22 * S, 0, 0); hip.add(leg);
      add(leg, BOX(), body, 0, -0.22 * S, 0, 0.24 * S, 0.46 * S, 0.28 * S); const knee = new THREE.Group(); knee.position.y = -0.45 * S; leg.add(knee);
      add(knee, BOX(), dM, 0, -0.22 * S, 0.02 * S, 0.2 * S, 0.44 * S, 0.22 * S); add(knee, BOX(), jM, 0, -0.47 * S, -0.05 * S, 0.26 * S, 0.1 * S, 0.38 * S);
      parts.legs.push({ g: leg, knee, side: s });
    }
    const torso = new THREE.Group(); torso.position.y = 1.0 * S; root.add(torso); parts.torso = torso;
    add(torso, BOX(), body, 0, 0.38 * S, 0, 0.82 * S, 0.62 * S, 0.5 * S); add(torso, BOX(), dM, 0, 0.1 * S, 0, 0.66 * S, 0.16 * S, 0.42 * S);
    // energy shield plate on the chest
    const shieldM = new THREE.MeshBasicMaterial({ color: K.gA, transparent: true, opacity: 0.35, toneMapped: false, depthWrite: false }); parts.shield = shieldM;
    add(torso, BOX(), jM, 0, 0.4 * S, -0.27 * S, 0.7 * S, 0.5 * S, 0.06 * S); add(torso, BOX(), shieldM, 0, 0.4 * S, -0.33 * S, 0.86 * S, 0.66 * S, 0.02 * S);
    const head = new THREE.Group(); head.position.set(0, 0.8 * S, 0.02 * S); torso.add(head); parts.head = head;
    add(head, BOX(), body, 0, 0, 0, 0.3 * S, 0.22 * S, 0.3 * S); add(head, BOX(), eyeM, 0, 0.0, -0.155 * S, 0.22 * S, 0.05 * S, 0.02 * S);
    const eg = glowSprite(0, 0, -0.2 * S, 0.6, K.gB); head.add(eg); parts.eyeSprite = eg;
    for (const s of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(s * 0.55 * S, 0.55 * S, 0); torso.add(sh); add(sh, BOX(), jM, 0, 0.04 * S, 0, 0.32 * S, 0.3 * S, 0.34 * S);
      if (s > 0) {
        const arm = new THREE.Group(); arm.position.set(0, -0.12 * S, 0); sh.add(arm); arm.rotation.x = 1.35;
        add(arm, BOX(), body, 0, -0.18 * S, 0, 0.2 * S, 0.36 * S, 0.2 * S);
        for (let k = 0; k < 3; k++) { const a = k * 2.09; add(arm, CYL(), dM, Math.cos(a) * 0.05 * S, -0.55 * S, Math.sin(a) * 0.05 * S, 0.035 * S, 0.45 * S, 0.035 * S); }
        add(arm, CYL(), jM, 0, -0.38 * S, 0, 0.11 * S, 0.12 * S, 0.11 * S); parts.gunArm = arm;
        const mz = new THREE.Object3D(); mz.position.set(0, -0.8 * S, 0); arm.add(mz); parts.muzzle = mz;
        const cg = glowSprite(0, -0.8 * S, 0, 0.0, K.gB); arm.add(cg); parts.charge = cg;
      } else { const arm = add(sh, BOX(), body, 0, -0.34 * S, -0.04 * S, 0.18 * S, 0.5 * S, 0.18 * S); arm.rotation.x = 0.3; add(sh, BOX(), dM, 0, -0.62 * S, -0.12 * S, 0.24 * S, 0.2 * S, 0.24 * S); }
    }
    add(torso, BOX(), dM, 0, 0.42 * S, 0.32 * S, 0.5 * S, 0.5 * S, 0.2 * S); add(torso, CYL(), glowMat(K.gD), 0.15 * S, 0.6 * S, 0.44 * S, 0.05 * S, 0.06 * S, 0.05 * S);
    root.userData.spheres = [{ x: 0, y: 1.75, z: 0, r: 0.6, m: 1 }, { x: 0, y: 0.75, z: 0, r: 0.45, m: 0.8 }, { x: 0, y: 2.38, z: 0, r: 0.23, m: 2 }];
  } else if (type === 'boss') {
    const S = 2.6 * B.size, accM = stdMat(B.accent, { metalness: 0.6, roughness: 0.35 }), glowE = glowMat(B.eye), glowC = glowMat(B.core);
    const hip = new THREE.Group(); hip.position.y = 0.95 * S; root.add(hip);
    add(hip, BOX(), darkMat, 0, 0, 0, 0.6 * S, 0.22 * S, 0.4 * S);
    for (const s of [-1, 1]) {
      const leg = new THREE.Group(); leg.position.set(s * 0.25 * S, 0, 0); hip.add(leg);
      add(leg, BOX(), body, 0, -0.22 * S, 0, 0.26 * S, 0.46 * S, 0.3 * S); const knee = new THREE.Group(); knee.position.y = -0.45 * S; leg.add(knee);
      add(knee, BOX(), darkMat, 0, -0.22 * S, 0.02 * S, 0.22 * S, 0.44 * S, 0.24 * S); add(knee, BOX(), jointMat, 0, -0.47 * S, -0.06 * S, 0.3 * S, 0.1 * S, 0.44 * S);
      parts.legs.push({ g: leg, knee, side: s });
    }
    const torso = new THREE.Group(); torso.position.y = 1.0 * S; root.add(torso); parts.torso = torso;
    add(torso, BOX(), body, 0, 0.4 * S, 0, 0.9 * S, 0.65 * S, 0.55 * S); add(torso, BOX(), darkMat, 0, 0.12 * S, 0, 0.7 * S, 0.18 * S, 0.45 * S);
    add(torso, BOX(), darkMat, 0, 0.45 * S, 0.33 * S, 0.6 * S, 0.5 * S, 0.2 * S);
    const coreM = new THREE.MeshBasicMaterial({ color: B.core, toneMapped: false }); parts.core = coreM;
    add(torso, SPH(), coreM, 0, 0.42 * S, -0.28 * S, 0.16 * S, 0.16 * S, 0.08 * S);
    const cs = glowSprite(0, 0.42 * S, -0.34 * S, 1.6, B.core); torso.add(cs); parts.coreSprite = cs;
    const head = new THREE.Group(); head.position.set(0, 0.86 * S, -0.05 * S); torso.add(head); parts.head = head;
    add(head, BOX(), body, 0, 0, 0, 0.36 * S, 0.24 * S, 0.34 * S); add(head, BOX(), eyeM, 0, 0.02 * S, -0.175 * S, 0.3 * S, 0.06 * S, 0.02 * S);
    const eg = glowSprite(0, 0.02 * S, -0.2 * S, 1.2, '#ff2a2a'); head.add(eg); parts.eyeSprite = eg;
    parts.cannons = [];
    for (const s of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(s * 0.62 * S, 0.62 * S, 0); torso.add(sh); add(sh, BOX(), jointMat, 0, 0, 0, 0.32 * S, 0.3 * S, 0.36 * S);
      const can = new THREE.Group(); can.position.set(s * 0.05 * S, 0.24 * S, -0.05 * S); sh.add(can);
      add(can, BOX(), darkMat, 0, 0, 0, 0.26 * S, 0.2 * S, 0.5 * S); for (const k of [-1, 1]) add(can, CYL(), body, k * 0.06 * S, 0, -0.32 * S, 0.05 * S, 0.22 * S, 0.05 * S).rotation.x = Math.PI / 2;
      const mz = new THREE.Object3D(); mz.position.set(0, 0, -0.45 * S); can.add(mz); parts.cannons.push(mz);
      const arm = add(sh, BOX(), body, s * 0.05 * S, -0.35 * S, -0.05 * S, 0.2 * S, 0.55 * S, 0.22 * S);
      add(sh, BOX(), darkMat, s * 0.05 * S, -0.7 * S, -0.12 * S, 0.26 * S, 0.22 * S, 0.3 * S);
    }
    const cg = glowSprite(0, 0.42 * S, -0.5 * S, 0, B.core); torso.add(cg); parts.charge = cg;
    // --- per-boss look ---
    torso.scale.x = B.wide; head.scale.x = 1 / B.wide;
    add(torso, BOX(), accM, 0, 0.62 * S, -0.29 * S, 0.5 * S, 0.08 * S, 0.04 * S); // chest stripe
    for (const s of [-1, 1]) add(torso, BOX(), accM, s * 0.62 * S, 0.8 * S, 0, 0.36 * S, 0.06 * S, 0.4 * S); // shoulder trims
    const X = new Set(B.extras);
    if (X.has('horns')) for (const s of [-1, 1]) { const h = add(head, CONE(), accM, s * 0.2 * S, 0.16 * S, -0.02 * S, 0.06 * S, 0.24 * S, 0.06 * S); h.rotation.z = -s * 0.9; }
    if (X.has('bighorns')) for (const s of [-1, 1]) { const h1 = add(head, CYL(), accM, s * 0.24 * S, 0.14 * S, 0, 0.05 * S, 0.22 * S, 0.05 * S); h1.rotation.z = -s * 1.1; const h2 = add(head, CONE(), glowE, s * 0.36 * S, 0.32 * S, 0, 0.06 * S, 0.26 * S, 0.06 * S); h2.rotation.z = -s * 0.25; }
    if (X.has('antennae')) for (const s of [-1, 1]) { add(head, CYL(), jointMat, s * 0.12 * S, 0.26 * S, 0.05 * S, 0.015 * S, 0.3 * S, 0.015 * S); add(head, SPH(), glowE, s * 0.12 * S, 0.43 * S, 0.05 * S, 0.05 * S, 0.05 * S, 0.05 * S); head.add(glowSprite(s * 0.12 * S, 0.43 * S, 0.05 * S, 0.9, B.eye)); }
    if (X.has('crown')) { add(head, CYL(), accM, 0, 0.16 * S, 0, 0.2 * S, 0.08 * S, 0.2 * S); for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283; add(head, CONE(), accM, Math.cos(a) * 0.16 * S, 0.27 * S, Math.sin(a) * 0.16 * S, 0.04 * S, 0.14 * S, 0.04 * S); add(head, SPH(), glowE, Math.cos(a) * 0.2 * S, 0.17 * S, Math.sin(a) * 0.2 * S, 0.025 * S, 0.025 * S, 0.025 * S); } }
    if (X.has('halo')) { const hl = add(head, TOR(), glowC, 0, 0.42 * S, 0.02 * S, 0.24 * S, 0.24 * S, 0.24 * S); hl.rotation.x = Math.PI / 2; head.add(glowSprite(0, 0.42 * S, 0, 1.4, B.core)); }
    if (X.has('visor')) { add(head, BOX(), glowE, 0, 0.02 * S, -0.18 * S, 0.38 * S, 0.09 * S, 0.03 * S); }
    if (X.has('fin')) { const f = add(torso, BOX(), accM, 0, 0.75 * S, 0.3 * S, 0.06 * S, 0.5 * S, 0.4 * S); f.rotation.x = -0.5; }
    if (X.has('spikes')) for (let k = 0; k < 3; k++) for (const s of [-1, 1]) { const c = add(torso, CONE(), k % 2 ? glowE : accM, s * 0.2 * S, (0.25 + k * 0.2) * S, 0.32 * S, 0.06 * S, 0.24 * S, 0.06 * S); c.rotation.x = 1.1; c.rotation.z = -s * 0.3; }
    if (X.has('pipes')) for (const s of [-1, 1]) { add(torso, CYL(), darkMat, s * 0.22 * S, 0.85 * S, 0.3 * S, 0.07 * S, 0.45 * S, 0.07 * S); add(torso, CYL(), glowC, s * 0.22 * S, 1.08 * S, 0.3 * S, 0.075 * S, 0.03 * S, 0.075 * S); torso.add(glowSprite(s * 0.22 * S, 1.12 * S, 0.3 * S, 1.0, B.core)); }
    if (X.has('cannons4')) for (const s of [-1, 1]) { const can = new THREE.Group(); can.position.set(s * 0.42 * S, 0.98 * S, 0.05 * S); torso.add(can); add(can, BOX(), accM, 0, 0, 0, 0.18 * S, 0.16 * S, 0.42 * S); add(can, CYL(), glowE, 0, 0, -0.24 * S, 0.05 * S, 0.06 * S, 0.05 * S).rotation.x = Math.PI / 2; const mz = new THREE.Object3D(); mz.position.set(0, 0, -0.3 * S); can.add(mz); parts.cannons.push(mz); }
    const z = B.size; root.userData.spheres = [{ x: 0, y: 3.4 * z, z: 0, r: 1.25 * z, m: 1 }, { x: -0.65 * z, y: 1.3 * z, z: 0, r: 0.7 * z, m: 0.8 }, { x: 0.65 * z, y: 1.3 * z, z: 0, r: 0.7 * z, m: 0.8 }, { x: 0, y: 3.7 * z, z: -0.75 * z, r: 0.5 * z, m: 2.5 }, { x: 0, y: 4.8 * z, z: -0.1 * z, r: 0.5 * z, m: 2 }];
  }
  if (type !== 'boss' && K.isl > 1) addSkinExtras(type, parts, K);
  // blob shadow
  const blob = new THREE.Mesh(geo('blob', () => new THREE.PlaneGeometry(1, 1)), new THREE.MeshBasicMaterial({ map: tex.blob, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  blob.rotation.x = -Math.PI / 2; const bs = T.r * 2.6; blob.scale.set(bs, bs, 1); blob.renderOrder = 1; parts.blob = blob;
  compact(root);
  root.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return { root, parts };
}

// merge sibling meshes that share a material into one draw call (keeps animated sub-groups)
const mergeCache = new Map();
export function compact(node) {
  for (const ch of [...node.children]) if (ch.isGroup) compact(ch);
  const byMat = new Map();
  for (const ch of node.children) { if (!ch.isMesh || ch.isSprite) continue; const k = ch.material; if (!byMat.has(k)) byMat.set(k, []); byMat.get(k).push(ch); }
  for (const [m, list] of byMat) {
    if (list.length < 2) continue;
    for (const c of list) { c.updateMatrix(); node.remove(c); }
    const merged = new THREE.Mesh(mergeGeos(list.map(c => ({ geo: c.geometry, matrix: c.matrix }))), m); node.add(merged);
  }
}

export class Projectiles {
  constructor(scene, tex, G) {
    this.G = G; this.list = []; this.scene = scene;
    const g = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 90; i++) {
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#fff', toneMapped: false })); m.visible = false;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.glow, color: '#f0f', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); m.add(s);
      scene.add(m); this.list.push({ m, s, alive: false, pos: V(), vel: V(), life: 0 });
    }
  }
  spawn(o) {
    const p = this.list.find(p => !p.alive); if (!p) return;
    p.alive = true; p.pos.copy(o.pos); p.vel.copy(o.dir).multiplyScalar(o.speed); p.dmg = o.dmg; p.owner = o.owner; p.radius = o.radius || 0; p.size = o.size || 0.12; p.life = o.life || 4; p.color = o.color; p.src = o.src; p.grav = o.grav || 0; p.trail = o.trail || 0; p.nade = !!o.nade; p.s.material.opacity = 1;
    p.m.material.color.set(o.core || '#ffffff'); p.s.material.color.set(o.color); p.m.scale.setScalar(p.size); p.s.scale.setScalar(p.size > 0.2 ? 7 : 6); p.m.visible = true; p.m.position.copy(p.pos);
  }
  clear() { this.list.forEach(p => { p.alive = false; p.m.visible = false; }); }
  update(dt) {
    const G = this.G, W = G.world, P = G.player;
    for (const p of this.list) {
      if (!p.alive) continue;
      p.life -= dt; if (p.life <= 0) { this.kill(p); continue; }
      p.vel.y -= p.grav * dt;
      const sp = p.vel.length(), step = sp * dt; _a.copy(p.vel).divideScalar(sp || 1);
      // world
      const h = W.raycast(p.pos.x, p.pos.y, p.pos.z, _a.x, _a.y, _a.z, step);
      let hitT = h ? h.t : Infinity, hitEnemy = null, hitPlayer = false;
      if (p.owner === 'enemy' && P.alive) {
        // segment vs player capsule approx by two spheres
        for (const [yy, rr] of (P.prone ? [[P.pos.y + 0.32, 0.5], [P.pos.y + 0.3, 0.42]] : [[P.pos.y + 1.1, 0.5], [P.pos.y + 0.45, 0.42], [P.pos.y + 1.6, 0.3]])) {
          const t = raySphere(p.pos, _a, P.pos.x, yy, P.pos.z, rr);
          if (t !== null && t <= step && t < hitT) { hitT = t; hitPlayer = true; }
        }
      } else if (p.owner === 'player') {
        const r = G.enemies.rayHit(p.pos, _a, step, 0.15); if (r && r.t < hitT) { hitT = r.t; hitEnemy = r; }
      }
      if (hitT <= step) {
        p.pos.addScaledVector(_a, hitT);
        if (p.radius > 0) { G.explode(p.pos.clone().addScaledVector(_a, -0.2), p.radius, p.dmg, p.owner); }
        else if (hitPlayer) { G.damagePlayer(p.dmg, p.src ? p.src : p.pos.clone().addScaledVector(_a, -3)); G.fx.burst(p.pos, null, p.color, 6, 4, 0.12, 0.3); }
        else {
          if (h && h.col && h.col.kind) G.damageProp(h.col, p.dmg * 0.6, p.pos);
          G.fx.burst(p.pos, h ? h.normal : null, p.color, 8, 5, 0.14, 0.35); G.fx.flash(p.pos.x, p.pos.y, p.pos.z, 0.6, 0.08, p.color);
        }
        this.kill(p); continue;
      }
      p.pos.addScaledVector(_a, step); p.m.position.copy(p.pos);
      if (p.trail && Math.random() < 0.7) G.fx.puff(p.pos.x, p.pos.y, p.pos.z, 0, 0.3, 0, p.owner === 'enemy' ? '#ff8080' : '#88ff88', 0.25, 0.35, 0.3, 2);
      if (p.nade) { p.blink = (p.blink || 0) + dt * 14; p.s.material.opacity = 0.5 + 0.5 * Math.sin(p.blink); }
      // near-miss whiz
      if (p.owner === 'enemy' && !p.whiz && !p.nade) { const d = p.pos.distanceTo(_b.set(P.pos.x, P.pos.y + 1.4, P.pos.z)); if (d < 1.3) { p.whiz = true; G.sound.play('buzz'); } }
    }
  }
  kill(p) { p.alive = false; p.m.visible = false; p.whiz = false; }
}

export function raySphere(o, d, cx, cy, cz, r) {
  const ox = o.x - cx, oy = o.y - cy, oz = o.z - cz; const b = ox * d.x + oy * d.y + oz * d.z; const c = ox * ox + oy * oy + oz * oz - r * r;
  if (c > 0 && b > 0) return null; const disc = b * b - c; if (disc < 0) return null; const t = -b - Math.sqrt(disc); return t < 0 ? 0 : t;
}

let UID = 1;
export class Enemies {
  constructor(scene, tex, G) { this.scene = scene; this.tex = tex; this.G = G; this.list = []; this.flowT = 0; this.boss = null; this.abN = 0; }
  spawn(type, pos, opts = {}) {
    const G = this.G; const lvl = opts.level || 1;
    const T = type === 'boss' ? bossT(opts.boss || bossFor(Math.ceil(lvl / 5))) : skinT(type, opts.isl || Math.ceil((G.gl || 1) / 5)); const { root, parts } = buildEnemyMesh(type, this.tex, T);
    const e = {
      id: UID++, type, T, root, parts, pos: pos.clone(), vel: V(), yaw: Math.random() * 6.28, hp: T.hp * (opts.hpMul || 1) * (type === 'boss' ? 1 : MOB_NERF), maxHp: T.hp * (opts.hpMul || 1) * (type === 'boss' ? 1 : MOB_NERF), dmgMul: (opts.dmgMul || 1) * (type === 'boss' ? 1 : MOB_NERF), speedMul: opts.speedMul || 1,
      state: 'spawn', stateT: 0, spawnT: 0.9, aware: !!opts.aware, seeT: Math.random() * 0.2, canSee: false, lastSeen: V(), lostT: 0, attackCD: 1 + Math.random(), burst: 0, burstN: 0, burstT: 0,
      strafeDir: Math.random() < 0.5 ? -1 : 1, strafeT: 1 + Math.random(), cover: null, coverT: 0, flash: 0, seed: Math.random() * 100, alive: true, spheres: [], awareT: opts.demo ? 1e9 : (opts.aware ? 0 : 6 + Math.random() * 4),
      orbit: Math.random() * 6.28, orbitDir: Math.random() < 0.5 ? -1 : 1, hoverY: 3.8 + Math.random() * 1.6, demo: !!opts.demo, slamCD: 5, volleyCD: 2.5, summoned: 0, stuckT: 0, lastPos: pos.clone(), patrolTarget: null, charge: 0, windup: 0,
    };
    e.bab = type === 'boss' ? (Math.max(0, BOSSES.findIndex(b => b.name === T.name)) % BOSS_AB.length) : -1; e.cloak = false; e.reflectT = 0; e.pullT = 0;
    e.ab = type === 'boss' ? null : ABIL[(this.abN++ + ((opts.isl || Math.ceil((G.gl || 1) / 5)) - 1)) % 4]; // كل وحش إله خاصية وحدة، موزّعين على كل الوحوش بالجزيرة
    if (T.fly) e.pos.y = Math.max(e.pos.y, 2.5);
    root.position.copy(e.pos); root.scale.setScalar(0.01); this.scene.add(root); this.scene.add(parts.blob);
    this.list.push(e); if (type === 'boss') this.boss = e;
    if (!opts.demo) G.fx.beam(pos.x, 0, pos.z, T.color, type === 'boss' ? 10 : 4.5, 0.7);
    G.sound.play(type === 'boss' ? 'boss' : 'spawn', G.spatial(pos));
    this.updateSpheres(e);
    return e;
  }
  clear() { for (const e of this.list) this.remove(e); this.list.length = 0; this.boss = null; }
  remove(e) { this.scene.remove(e.root); this.scene.remove(e.parts.blob); e.parts.body.dispose(); }
  alive() { return this.list.filter(e => e.alive).length; }
  updateSpheres(e) {
    const s = e.root.userData.spheres, c = Math.cos(e.yaw), sn = Math.sin(e.yaw), sc = e.root.scale.x;
    for (let i = 0; i < s.length; i++) { const o = s[i]; const x = o.x * c + o.z * sn, z = -o.x * sn + o.z * c; e.spheres[i] = { x: e.pos.x + x * sc, y: e.pos.y + (o.y + (e.bob || 0)) * sc, z: e.pos.z + z * sc, r: o.r * sc, m: o.m }; }
  }
  rayHit(o, d, maxT, assist = 0) {
    let best = null;
    for (const e of this.list) {
      if (!e.alive || e.cloak || e.state === 'spawn' && e.spawnT > 0.5) continue;
      // quick reject
      const s0 = e.spheres[0]; const dx = s0.x - o.x, dy = s0.y - o.y, dz = s0.z - o.z; const along = dx * d.x + dy * d.y + dz * d.z; if (along < -3 || along > maxT + 4) continue;
      for (const s of e.spheres) {
        const dist = Math.max(0, along); const r = s.r + (assist ? assist * Math.min(1.5, 0.35 + dist * 0.02) : 0);
        const t = raySphere(o, d, s.x, s.y, s.z, r);
        if (t !== null && t <= maxT && (!best || t < best.t - 0.001 || (Math.abs(t - best.t) < 0.4 && s.m > best.mult && best.e === e))) best = { e, t, mult: s.m, sphere: s };
      }
    }
    return best;
  }
  damage(e, dmg, info = {}) {
    if (!e.alive || e.cloak) return false;
    if (e.ab === 'shield') dmg *= 0.8; e.noHit = 0;
    if (e.bab === 8 && info.head) dmg *= 0.5; // زعيم الدروع: الرأس ينضرب نص الضرر
    if (e.reflectT > 0 && this.G.player.alive) this.G.damagePlayer(Math.min(6, dmg * 0.2), e.pos); // زعيم الانعكاس
    if (e.type === 'brute' && info.dir && !info.head && !info.explosive) { const fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw); if (-(info.dir.x * fx + info.dir.z * fz) > 0.45) { dmg *= 0.3; info.shielded = true; e.shieldFlash = 0.15; } }
    e.hp -= dmg; e.flash = 0.09; e.barT = 3; if (!e.demo) { e.aware = true; }
    if (info.dir && e.type !== 'boss') { const k = Math.min(2.2, dmg * 0.05) * (e.type === 'brute' ? 0.3 : 1); e.vel.x += info.dir.x * k; e.vel.z += info.dir.z * k; e.stagger = Math.min(0.25, (e.stagger || 0) + dmg * 0.004); }
    if (e.type === 'soldier' && e.hp < e.maxHp * 0.5 && !e.cover && Math.random() < 0.5) e.wantCover = true;
    if (e.hp <= 0) { this.kill(e, info); return true; }
    return info.shielded ? 'shield' : false;
  }
  kill(e, info) {
    const G = this.G; e.alive = false;
    const c = _a.set(e.pos.x, e.pos.y + (e.T.fly ? 0 : e.T.h * 0.5), e.pos.z);
    G.fx.debrisBurst(c, e.T.debris, e.type === 'boss' ? 40 : 14, e.type === 'boss' ? 0.5 : 0.22, e.type === 'boss' ? 10 : 6);
    G.fx.burst(c, null, e.T.color, e.type === 'boss' ? 60 : 22, 9, 0.2, 0.6); G.fx.flash(c.x, c.y, c.z, e.type === 'boss' ? 8 : 2.6, 0.25, e.T.color);
    G.fx.light(c.x, c.y, c.z, e.T.color, e.type === 'boss' ? 60 : 18, 0.3, 10);
    for (let i = 0; i < (e.type === 'boss' ? 14 : 4); i++) G.fx.puff(c.x, c.y, c.z, (Math.random() - .5) * 3, 1 + Math.random() * 2, (Math.random() - .5) * 3, '#3a3448', 0.8, 1.2, 0.5, 2);
    if (e.type === 'boss') { G.explode(c.clone(), 6, 0, 'boss'); this.boss = null; }
    G.sound.play('robotDie', G.spatial(e.pos));
    if (e.ab === 'blast' && G.player.alive) { const P = G.player, d = Math.hypot(P.pos.x - e.pos.x, P.pos.z - e.pos.z); G.fx.flash(c.x, c.y, c.z, 4.5, 0.3, e.T.color); if (d < 3.2) G.damagePlayer(3 + 9 * (1 - d / 3.2), e.pos); }
    this.remove(e);
    G.onEnemyKilled(e, info);
  }
  shoot(e, from, speed, dmg, spreadMul = 1, color) {
    const G = this.G, P = G.player; const target = _b.set(P.pos.x, P.pos.y + 1.15 * (P.hk || 1), P.pos.z);
    const dist = from.distanceTo(target); const tLead = dist / speed;
    const lead = 0.35 + Math.min(0.5, G.wave * 0.04);
    target.x += P.vel.x * tLead * lead; target.z += P.vel.z * tLead * lead; target.y += P.vel.y * tLead * lead * 0.3;
    const inacc = Math.max(0.025, 0.075 - G.wave * 0.004) * spreadMul * dist;
    target.x += (Math.random() - 0.5) * inacc; target.y += (Math.random() - 0.5) * inacc * 0.6; target.z += (Math.random() - 0.5) * inacc;
    const dir = _c.copy(target).sub(from).normalize();
    G.projectiles.spawn({ pos: from, dir, speed, dmg: dmg * e.dmgMul, owner: 'enemy', color: color || e.T.color, size: 0.13, src: e.pos.clone() });
    G.sound.play('eshot', G.spatial(from)); G.fx.flash(from.x, from.y, from.z, 0.8, 0.07, color || e.T.color);
  }
  update(dt, t) {
    const G = this.G, W = G.world, P = G.player;
    this.flowT -= dt;
    if (this.flowT <= 0 && P.alive) { this.flowT = 0.3; W.computeFlow(P.pos.x, P.pos.z, P.pos.y); }
    const peye = _d.set(P.pos.x, P.pos.y + 1.55 * (P.hk || 1), P.pos.z);
    for (const e of this.list) {
      if (!e.alive) continue;
      const T = e.T; e.stateT += dt;
      if (e.burnT > 0) { e.burnT -= dt; this.damage(e, 9 * dt, {}); if (!e.alive) continue; } // مهارة الحرق
      if (e.ab === 'regen') { e.noHit = (e.noHit || 0) + dt; if (e.noHit > 4 && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.025 * dt); }
      // spawn-in
      if (e.state === 'spawn') { e.spawnT -= dt; const k = 1 - Math.max(0, e.spawnT) / 0.9; e.root.scale.setScalar(Math.max(0.01, k < 0.6 ? k / 0.6 * 1.08 : 1.08 - (k - 0.6) * 0.2)); if (e.spawnT <= 0) { e.state = e.aware ? 'chase' : 'patrol'; e.root.scale.setScalar(1); } this.place(e, dt, t); continue; }
      // perception
      e.seeT -= dt; const dxp = P.pos.x - e.pos.x, dzp = P.pos.z - e.pos.z, dist = Math.hypot(dxp, dzp);
      if (e.seeT <= 0) {
        e.seeT = 0.2 + Math.random() * 0.08;
        const eyeY = e.pos.y + (T.fly ? 0 : T.h * 0.85);
        e.canSee = P.alive && dist < 55 && W.los(e.pos.x, eyeY, e.pos.z, peye.x, peye.y, peye.z);
        if (e.canSee && !e.demo) {
          const fwdX = -Math.sin(e.yaw), fwdZ = -Math.cos(e.yaw); const dot = (dxp * fwdX + dzp * fwdZ) / (dist || 1);
          if (e.aware || dot > 0.2 || dist < 9 || P.noise > 0) { if (!e.aware) { e.aware = true; e.alertFlash = 0.5; } e.lastSeen.copy(P.pos); e.lostT = 0; }
        }
      }
      if (!e.canSee) e.lostT += dt;
      if (!e.demo && !e.aware) { e.awareT -= dt; if (e.awareT <= 0 || (P.noise > 0 && dist < 30)) e.aware = true; }
      if (!P.alive || G.mode !== 'play') e.aware = false;
      // behaviour
      const desired = _a.set(0, 0, 0); let face = null, speed = T.speed * e.speedMul;
      if (!e.aware) {
        // patrol between random points
        if (!e.patrolTarget || e.pos.distanceTo(e.patrolTarget) < 1.5 || e.stateT > 8) { e.patrolTarget = W.randomOpenPoint(e.pos.x, e.pos.z, 10); e.stateT = 0; }
        desired.set(e.patrolTarget.x - e.pos.x, 0, e.patrolTarget.z - e.pos.z).normalize(); speed *= 0.4;
      } else if (e.type === 'rusher') { e.state = 'chase'; this.aiRusher(e, dt, dist, desired); }
      else if (e.type === 'soldier' || e.type === 'brute') { this.aiSoldier(e, dt, dist, desired, t); }
      else if (e.type === 'drone') { this.aiDrone(e, dt, dist, desired, t); }
      else if (e.type === 'boss') { this.aiBoss(e, dt, dist, desired, t); }
      if (e.speedOverride) { speed = e.speedOverride; e.speedOverride = 0; }
      if (e.ab === 'dash' && e.aware) { e.abDashT = (e.abDashT ?? 2) - dt; if (e.abDashT <= 0) { e.abDashT = 3.2 + Math.random() * 0.8; e.abDashOn = 0.45; } if ((e.abDashOn || 0) > 0) { e.abDashOn -= dt; speed *= 2; } }
      if (e.slowT > 0) { e.slowT -= dt; speed *= 0.5; } // مهارة التجميد
      speed *= ENEMY_SPEED; // طلب قصي: كل الأعداء أبطأ 15%
      // facing
      if (e.aware && (e.canSee || dist < 6)) face = Math.atan2(-dxp, -dzp); else if (desired.lengthSq() > 0.01) face = Math.atan2(-desired.x, -desired.z);
      if (face !== null) { let dy = face - e.yaw; while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283; e.yaw += dy * Math.min(1, dt * (e.type === 'boss' ? 2.5 : 8)); }
      // integrate
      const acc = T.fly ? 6 : 12;
      e.vel.x += (desired.x * speed - e.vel.x) * Math.min(1, dt * acc); e.vel.z += (desired.z * speed - e.vel.z) * Math.min(1, dt * acc);
      if (T.fly) e.vel.y += ((desired.y || 0) * speed - e.vel.y) * Math.min(1, dt * 3);
      this.move(e, dt);
      this.place(e, dt, t);
    }
    // separation
    const L = this.list;
    for (let i = 0; i < L.length; i++) { const a = L[i]; if (!a.alive) continue; for (let j = i + 1; j < L.length; j++) { const b = L[j]; if (!b.alive) continue; if (a.T.fly !== b.T.fly) continue; const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d2 = dx * dx + dz * dz, R = a.T.r + b.T.r + 0.1; if (d2 < R * R && d2 > 1e-6) { const d = Math.sqrt(d2), k = (R - d) / d * 0.5; const wa = b.type === 'boss' ? 1.8 : a.type === 'boss' ? 0.2 : 1, wb = 2 - wa; a.pos.x -= dx * k * wa; a.pos.z -= dz * k * wa; b.pos.x += dx * k * wb; b.pos.z += dz * k * wb; } } }
    // keep enemies off the player
    if (P.alive) for (const e of L) { if (!e.alive || e.T.fly) continue; const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d2 = dx * dx + dz * dz, R = e.T.r + 0.4; if (d2 < R * R && d2 > 1e-6 && Math.abs(e.pos.y - P.pos.y) < 1.5) { const d = Math.sqrt(d2), k = (R - d) / d; e.pos.x += dx * k; e.pos.z += dz * k; } }
    for (let i = L.length - 1; i >= 0; i--) if (!L[i].alive) L.splice(i, 1);
  }
  steerTo(e, tx, tz, desired) {
    // follow flow field toward player, or straight if clear
    const W = this.G.world, P = this.G.player;
    const dx = tx - e.pos.x, dz = tz - e.pos.z, d = Math.hypot(dx, dz);
    const direct = d < 14 && Math.abs(P.pos.y - e.pos.y) < 0.6 && W.los(e.pos.x, e.pos.y + 0.5, e.pos.z, tx, P.pos.y + 0.5, tz);
    if (direct) { desired.set(dx / d, 0, dz / d); return; }
    const f = W.flowDir(e.pos.x, e.pos.z, e.pos.y); if (f && (f[0] || f[1])) desired.set(f[0], 0, f[1]); else desired.set(dx / (d || 1), 0, dz / (d || 1));
  }
  aiRusher(e, dt, dist, desired) {
    const G = this.G, P = G.player;
    e.attackCD -= dt;
    if (e.windup > 0) {
      e.windup -= dt; e.speedOverride = 0.5; desired.set(P.pos.x - e.pos.x, 0, P.pos.z - e.pos.z).normalize();
      if (e.windup <= 0) {
        e.lunge = 0.18; const dy = Math.abs(P.pos.y - e.pos.y);
        if (dist < 2.4 && dy < 1.6) { G.damagePlayer(13 * e.dmgMul, e.pos); G.fx.burst(_b.set(P.pos.x, P.pos.y + 1, P.pos.z), null, '#ff8a2a', 8, 5, 0.12, 0.3); }
        e.attackCD = 0.85;
      }
      return;
    }
    if (e.lunge > 0) { e.lunge -= dt; e.speedOverride = 11; }
    if (dist < 2.0 && e.attackCD <= 0 && Math.abs(P.pos.y - e.pos.y) < 1.6) { e.windup = 0.28; G.sound.play('charge', G.spatial(e.pos)); return; }
    this.steerTo(e, P.pos.x, P.pos.z, desired);
    if (dist > 5) { const z = Math.sin(G.time * 4 + e.seed) * 0.55; const px = -desired.z, pz = desired.x; desired.x += px * z; desired.z += pz * z; desired.normalize(); }
    if (dist < 4) e.speedOverride = e.T.speed * e.speedMul * 1.25;
  }
  aiSoldier(e, dt, dist, desired, t) {
    const G = this.G, W = G.world, P = G.player;
    e.attackCD -= dt;
    // firing (independent of movement)
    if (e.burst > 0) {
      e.burstT -= dt; e.speedOverride = 1.2;
      if (e.burstT <= 0) {
        const T = e.T; e.burst--; e.burstT = T.gap || 0.13;
        e.parts.muzzle.updateWorldMatrix(true, false); const from = _c.setFromMatrixPosition(e.parts.muzzle.matrixWorld).clone();
        this.shoot(e, from, T.burst ? 24 : 27, T.shotDmg || 7, T.burst ? 1.6 : 1, T.burst ? '#ffd23d' : '#7ff8ff');
        if (e.burst === 0) { e.attackCD = (T.burst ? 2.2 : 1.6) + Math.random() * 1.0 - Math.min(0.6, G.wave * 0.04); e.burstN++; if (!T.noCover && ((e.burstN >= 2 && Math.random() < 0.55) || e.wantCover)) { e.wantCover = false; this.findCover(e); } }
      }
    } else if (e.charge > 0) {
      e.charge -= dt; e.speedOverride = 1.5; e.parts.charge.scale.setScalar((0.4 - e.charge) * 2.2);
      if (e.charge <= 0) { e.parts.charge.scale.setScalar(0); if (e.canSee) { e.burst = e.T.burst || 3; e.burstT = 0; } else e.attackCD = 0.4; }
    } else if (e.attackCD <= 0 && e.canSee && dist < 32 && e.state !== 'cover') { e.charge = 0.4; }
    // movement
    if (e.state === 'cover' && e.cover) {
      const dx = e.cover.x - e.pos.x, dz = e.cover.z - e.pos.z, d = Math.hypot(dx, dz);
      if (d > 0.6 && e.coverT > 0) { desired.set(dx / d, 0, dz / d); e.speedOverride = e.T.speed * 1.35; if (e.stateT > 4) { e.state = 'engage'; e.cover = null; } }
      else { e.coverT -= dt; desired.set(0, 0, 0); if (e.coverT <= 0) { e.state = 'engage'; e.cover = null; e.attackCD = Math.min(e.attackCD, 0.2); e.stateT = 0; } }
      return;
    }
    // smart: lob a grenade at a player who hides behind cover
    e.nadeCD = (e.nadeCD ?? (3 + Math.random() * 4)) - dt;
    if (!e.T.burst && !e.canSee && e.lostT > 1.5 && e.lostT < 8 && e.nadeCD <= 0 && dist < 22 && dist > 5 && G.wave >= 2) {
      e.nadeCD = 7 + Math.random() * 5; const from = new THREE.Vector3(e.pos.x, e.pos.y + 1.9, e.pos.z); const tgt = e.lastSeen; const Tf = 1.15, g = 14;
      const v = new THREE.Vector3((tgt.x - from.x) / Tf, (tgt.y + 0.3 - from.y) / Tf + 0.5 * g * Tf, (tgt.z - from.z) / Tf); const sp = v.length();
      G.projectiles.spawn({ pos: from, dir: v.clone().divideScalar(sp), speed: sp, dmg: 38 * e.dmgMul, owner: 'enemy', color: '#ff2a4d', core: '#ffd0d0', size: 0.16, radius: 3.6, grav: g, trail: 1, nade: true, src: e.pos.clone() });
      G.sound.play('charge', G.spatial(e.pos)); G.onGrenade && G.onGrenade();
    }
    if (!e.canSee && e.lostT > 1.0 || dist > 22) { e.state = 'chase'; this.steerTo(e, P.pos.x, P.pos.z, desired); return; }
    e.state = 'engage';
    const nx = (P.pos.x - e.pos.x) / (dist || 1), nz = (P.pos.z - e.pos.z) / (dist || 1);
    e.strafeT -= dt; if (e.strafeT <= 0 || e.bumped) { e.strafeDir *= -1; e.strafeT = 1.0 + Math.random() * 1.6; e.bumped = false; }
    let fwd = 0; const far = e.T.burst ? 13 : 16, near = e.T.burst ? 5 : 8; if (dist > far) fwd = 0.8; else if (dist < near) fwd = -0.8;
    const flank = (e.id % 3 === 0 && dist > 9) ? 0.6 : 0; // some soldiers circle to the side
    desired.set(nx * (fwd + flank * 0.3) + -nz * (e.strafeDir * 0.9 + flank * e.orbitDir), 0, nz * (fwd + flank * 0.3) + nx * (e.strafeDir * 0.9 + flank * e.orbitDir)).normalize();
    e.speedOverride = e.T.speed * e.speedMul * 0.75;
  }
  findCover(e) {
    const G = this.G, W = G.world, P = G.player; const cells = W.coverCells; if (!cells.length) return;
    let best = null, bd = 1e9; const N = W.N;
    for (let k = 0; k < 50; k++) {
      const c = cells[(Math.random() * cells.length) | 0]; const i = (c / N) | 0, j = c % N; const x = i - 38 + 0.5, z = j - 38 + 0.5; const y = W.navH[c];
      if (Math.abs(y - e.pos.y) > 0.6) continue;
      const de = Math.hypot(x - e.pos.x, z - e.pos.z); if (de > 11 || de < 1) continue;
      const dp = Math.hypot(x - P.pos.x, z - P.pos.z); if (dp < 6 || dp > 24) continue;
      if (W.los(P.pos.x, P.pos.y + 1.5, P.pos.z, x, y + 1.0, z)) continue;
      if (de < bd) { bd = de; best = { x, z }; }
    }
    if (best) { e.cover = best; e.state = 'cover'; e.coverT = 1.4 + Math.random() * 1.4; e.stateT = 0; }
  }
  aiDrone(e, dt, dist, desired, t) {
    const G = this.G, P = G.player, W = G.world;
    e.orbit += e.orbitDir * dt * 0.45; const R = 10 + Math.sin(e.seed + t * 0.3) * 2.5;
    const tx = P.pos.x + Math.cos(e.orbit) * R, tz = P.pos.z + Math.sin(e.orbit) * R, ty = P.pos.y + e.hoverY + Math.sin(t * 1.3 + e.seed) * 0.6;
    const dx = tx - e.pos.x, dy = ty - e.pos.y, dz = tz - e.pos.z, d = Math.hypot(dx, dy, dz);
    desired.set(dx / (d || 1), dy / (d || 1), dz / (d || 1)); if (d < 1.5) desired.multiplyScalar(d / 1.5);
    if (e.bumped) { e.orbitDir *= -1; e.bumped = false; }
    e.attackCD -= dt;
    if (e.charge > 0) { e.charge -= dt; e.parts.charge.scale.setScalar((0.45 - e.charge) * 2); if (e.charge <= 0) { e.parts.charge.scale.setScalar(0); if (e.canSee) { e.parts.muzzle.updateWorldMatrix(true, false); const from = _c.setFromMatrixPosition(e.parts.muzzle.matrixWorld).clone(); this.shoot(e, from, 23, 7, 1.1, '#ff6ad5'); } e.attackCD = 1.5 + Math.random() * 0.8 - Math.min(0.5, G.wave * 0.03); } }
    else if (e.attackCD <= 0 && e.canSee && dist < 30) { e.charge = 0.45; }
  }
  bossAb(e, dt, dist) {
    const G = this.G, W = G.world, P = G.player, name = BOSS_AB[e.bab];
    if (!name || !P.alive) return;
    e.cdT = (e.cdT ?? 3) - dt; const ready = e.cdT <= 0;
    if (name === 'teleport') { if (ready && dist > 6 && e.canSee) { e.cdT = 7; const q = W.randomOpenPoint(P.pos.x, P.pos.z, 4.5); if (q && Math.hypot(q.x - P.pos.x, q.z - P.pos.z) > 2.5) { G.fx.flash(e.pos.x, e.pos.y + 1, e.pos.z, 5, 0.3, e.T.color); e.pos.x = q.x; e.pos.z = q.z; G.fx.flash(q.x, e.pos.y + 1, q.z, 5, 0.3, e.T.color); } } }
    else if (name === 'cloak') { if (e.cloakT > 0) { e.cloakT -= dt; if (e.cloakT <= 0) { e.cloak = false; e.root.visible = true; } } else if (ready) { e.cdT = 9; e.cloakT = 1.6; e.cloak = true; e.root.visible = false; } }
    else if (name === 'pull') { if (ready && dist < 20 && e.canSee) { e.cdT = 8; e.pullT = 0.7; } }
    else if (name === 'reflect') { if (e.reflectT > 0) e.reflectT -= dt; else if (ready) { e.cdT = 8; e.reflectT = 2; } }
    else if (name === 'enrage') { if (!e.enraged && e.hp < e.maxHp * 0.5) { e.enraged = true; e.dmgMul *= 1.3; } }
    else if (name === 'push') { if (ready && dist < 5) { e.cdT = 6; const dx = P.pos.x - e.pos.x, dz = P.pos.z - e.pos.z, d = Math.hypot(dx, dz) || 1; P.vel.x += dx / d * 9; P.vel.z += dz / d * 9; } }
    else if (name === 'zap') { if (ready && dist < 22 && e.canSee) { e.cdT = 5; G.damagePlayer(7 * e.dmgMul, e.pos); G.fx.flash(P.pos.x, P.pos.y + 1, P.pos.z, 3, 0.2, e.T.color); } }
    else if (name === 'aura') { if (dist < 5) { e.auraT = (e.auraT ?? 0.5) - dt; if (e.auraT <= 0) { e.auraT = 0.5; G.damagePlayer(0.9 * e.dmgMul, e.pos); } } }
    else if (name === 'quake') { if (ready && dist < 9) { e.cdT = 10; P.shake = Math.max(P.shake, 0.6); G.damagePlayer(4 * e.dmgMul, e.pos); } }
    if (e.pullT > 0) { e.pullT -= dt; const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz) || 1; P.vel.x += dx / d * 14 * dt; P.vel.z += dz / d * 14 * dt; }
  }
  aiBoss(e, dt, dist, desired, t) {
    const G = this.G, P = G.player, B = e.T.B || BOSSES[0];
    this.bossAb(e, dt, dist);
    const frac = e.hp / e.maxHp, rage = B.rage && frac < 0.33 ? 0.7 : 1;
    e.volleyCD -= dt; e.slamCD -= dt;
    if (e.windup > 0) { // slam windup
      e.windup -= dt; desired.set(0, 0, 0); e.parts.charge.scale.setScalar((1.0 - e.windup) * 6);
      if (e.windup <= 0) { e.parts.charge.scale.setScalar(0); G.bossSlam(e); e.slamCD = (B.slam + Math.random() * 2) * rage; }
      return;
    }
    if (e.slamCD <= 0 && dist < 13) { e.windup = 1.0; G.sound.play('charge'); G.fx.ring(e.pos.x, e.pos.y + 0.06, e.pos.z, 13, 1.5, 1.0, B.eye); return; }
    if (e.volleyCD <= 0 && e.canSee) {
      e.volleyCD = B.volCD * rage;
      const cans = e.parts.cannons;
      for (let k = 0; k < cans.length; k++) {
        const n = k < 2 ? B.volN : 3, spread = k < 2 ? 0.12 : 0.07;
        const mz = cans[k]; mz.updateWorldMatrix(true, false); const from = new THREE.Vector3().setFromMatrixPosition(mz.matrixWorld);
        const base = _b.set(P.pos.x, P.pos.y + 1.0, P.pos.z).sub(from).normalize(); const ang = Math.atan2(base.x, base.z);
        for (let i = 0; i < n; i++) { const a = ang + (i - (n - 1) / 2) * spread + (k < 2 ? (k ? 0.06 : -0.06) : 0); const dir = new THREE.Vector3(Math.sin(a), base.y, Math.cos(a)).normalize(); G.projectiles.spawn({ pos: from, dir, speed: B.shot, dmg: 9 * e.dmgMul, owner: 'enemy', color: B.eye, size: 0.22, src: e.pos.clone() }); }
        G.fx.flash(from.x, from.y, from.z, 1.0, 0.1, B.eye);
      }
      G.sound.play('bossShot', G.spatial(e.pos));
    }
    // summon helpers
    if ((frac < 0.66 && e.summoned < 1) || (frac < 0.33 && e.summoned < 2)) { e.summoned++; G.summonAround(e.pos, e.summoned === 2 && B.summon2 ? B.summon2 : B.summon, B.sumN); }
    if (dist > 9) this.steerTo(e, P.pos.x, P.pos.z, desired); else { const nx = (P.pos.x - e.pos.x) / dist, nz = (P.pos.z - e.pos.z) / dist; desired.set(-nz * e.strafeDir * 0.5, 0, nx * e.strafeDir * 0.5); e.strafeT -= dt; if (e.strafeT <= 0) { e.strafeDir *= -1; e.strafeT = 2 + Math.random() * 2; } }
  }
  move(e, dt) {
    const W = this.G.world, T = e.T;
    const nx = e.pos.x + e.vel.x * dt, nz = e.pos.z + e.vel.z * dt; const before = _b.set(nx, 0, nz);
    e.pos.x = nx; e.pos.z = nz;
    if (T.fly) {
      e.pos.y += e.vel.y * dt; e.pos.y = Math.max(1.6, Math.min(9, e.pos.y));
      const hit = W.collide(e.pos, T.r, e.pos.y - 0.3, 0.6); if (hit) e.bumped = true;
    } else {
      const hit = W.collide(e.pos, T.r, e.pos.y, T.h); if (hit && Math.hypot(e.pos.x - before.x, e.pos.z - before.z) > 0.01) e.bumped = true;
      const gy = W.groundAt(e.pos.x, e.pos.z, e.pos.y, T.r * 0.6);
      if (gy > e.pos.y) e.pos.y = Math.min(gy, e.pos.y + dt * 10); else { e.vy = (e.vy || 0) - 20 * dt; e.pos.y = Math.max(gy, e.pos.y + e.vy * dt); if (e.pos.y <= gy) e.vy = 0; }
    }
    // stuck detection (e.g. corners) -> nudge
    e.stuckCheck = (e.stuckCheck || 0) + dt;
    if (e.stuckCheck > 1.2) { const moved = e.pos.distanceTo(e.lastPos); if (e.aware && moved < 0.4 && e.state !== 'cover' && !e.windup && e.burst <= 0) { e.vel.x += (Math.random() - .5) * 8; e.vel.z += (Math.random() - .5) * 8; e.strafeDir *= -1; } e.lastPos.copy(e.pos); e.stuckCheck = 0; }
  }
  place(e, dt, t) {
    const p = e.parts, sp = Math.hypot(e.vel.x, e.vel.z);
    e.root.position.copy(e.pos); e.root.rotation.y = e.yaw;
    e.anim = (e.anim || 0) + dt * (sp * (e.type === 'rusher' ? 2.6 : e.type === 'boss' ? 1.2 : 2.2) + 0.5);
    if (e.type === 'rusher') { for (const l of p.legs) { l.g.rotation.x = Math.sin(e.anim + l.phase) * 0.6; l.g.position.y = 0.55 + Math.max(0, Math.sin(e.anim + l.phase)) * 0.1; } p.torso.position.y = 0.62 + Math.abs(Math.sin(e.anim * 2)) * 0.05; p.torso.rotation.x = e.windup > 0 ? -0.35 : e.lunge > 0 ? 0.35 : 0; }
    else if (e.type === 'soldier' || e.type === 'boss' || e.type === 'brute') {
      const amp = Math.min(1, sp / (e.T.speed * 0.6)) * 0.7;
      for (const l of p.legs) { const ph = e.anim + (l.side > 0 ? 0 : Math.PI); l.g.rotation.x = Math.sin(ph) * amp; l.knee.rotation.x = Math.max(0, -Math.sin(ph + 0.6)) * amp * 1.2; }
      p.torso.position.y = (e.type === 'boss' ? 2.6 * (e.T.B ? e.T.B.size : 1) : e.type === 'brute' ? 1.32 : 1.0) + Math.abs(Math.sin(e.anim)) * 0.04 * amp * (e.type === 'boss' ? 3 : 1) - (e.windup > 0 ? 0.4 : 0);
      if (p.head && this.G.player) { const P = this.G.player; const dy = P.pos.y + 1.5 - (e.pos.y + (e.type === 'boss' ? 4.5 * (e.T.B ? e.T.B.size : 1) : e.type === 'brute' ? 2.3 : 1.75)); const d = Math.hypot(P.pos.x - e.pos.x, P.pos.z - e.pos.z); const pitch = Math.atan2(dy, d); if (p.gunArm) p.gunArm.rotation.x = e.aware ? 1.57 + Math.max(-0.6, Math.min(0.6, pitch)) : 0.7; p.head.rotation.x = Math.max(-0.4, Math.min(0.4, pitch)) * 0.6; }
    } else if (e.type === 'drone') {
      for (const r of p.rotors) r.rotation.y += dt * 30; e.bob = Math.sin(t * 3 + e.seed) * 0.08;
      p.torso.position.y = e.bob; p.torso.rotation.z = -e.vel.x * 0.04 * Math.cos(e.yaw) + e.vel.z * 0.04 * Math.sin(e.yaw); p.torso.rotation.x = -(e.vel.z * Math.cos(e.yaw) + e.vel.x * Math.sin(e.yaw)) * -0.05;
      if (Math.random() < dt * 0.6) this.G.sound.play('buzz', this.G.spatial(e.pos));
    }
    if (e.stagger > 0) { e.stagger = Math.max(0, e.stagger - dt); if (p.torso) p.torso.rotation.x = -e.stagger * 1.6; }
    if (p.shield) { if (e.shieldFlash > 0) e.shieldFlash -= dt; p.shield.opacity = 0.3 + Math.sin(t * 5) * 0.08 + (e.shieldFlash > 0 ? 0.5 : 0); }
    // hit flash
    if (e.flash > 0) { e.flash -= dt; p.body.emissive.setRGB(1, 1, 1); p.body.emissiveIntensity = Math.max(0, e.flash / 0.09) * 1.3; } else p.body.emissiveIntensity = 0;
    if (p.eyeSprite) { const blink = e.alertFlash > 0 ? 1.8 : 1; if (e.alertFlash > 0) e.alertFlash -= dt; p.eyeSprite.material.opacity = (e.aware ? 1 : 0.55) * (e.windup > 0 ? 1.4 : 1); p.eyeSprite.scale.setScalar((e.type === 'boss' ? 1.2 : e.type === 'drone' ? 0.8 : 0.6) * blink); }
    if (p.coreSprite) p.coreSprite.scale.setScalar(1.6 + Math.sin(t * 6) * 0.3);
    // blob shadow on ground
    const W = this.G.world; const gy = e.T.fly ? W.groundAt(e.pos.x, e.pos.z, e.pos.y) : e.pos.y;
    p.blob.position.set(e.pos.x, gy + 0.03, e.pos.z); const k = e.T.fly ? Math.max(0.3, 1 - (e.pos.y - gy) * 0.1) : 1; const bs = e.T.r * 2.6 * k * e.root.scale.x; p.blob.scale.set(bs, bs, 1);
    this.updateSpheres(e);
  }
}
