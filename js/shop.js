// shop.js — عملات 💰 والمشتريات (localStorage). Economy: coins per kill, upgrades, armor, shield, bought weapons, skins, headshot FX.
import { WEAPONS } from './weapons.js';

const KEY = 'ns_shop_v1';
const MAX_UP = 5;
const UP_COST = [120, 220, 380, 600, 900];         // price of level 1..5 for any weapon stat
const UP_STATS = [
  { k: 'dmg', name: 'القوة', desc: '+12% ضرر' },
  { k: 'rate', name: 'السرعة', desc: '+8% سرعة إطلاق' },
  { k: 'mag', name: 'المخزن', desc: '+12% ذخيرة و تلقيم أسرع' },
];
const ARMOR = [
  { name: 'سترة نانو', hp: 25, dr: 0.05, price: 300 },
  { name: 'درع تيتانيوم', hp: 50, dr: 0.10, price: 700 },
  { name: 'درع بلازما', hp: 80, dr: 0.15, price: 1300 },
  { name: 'درع النجم', hp: 110, dr: 0.20, price: 2200 },
  { name: 'درع الأسطورة', hp: 150, dr: 0.25, price: 3500 },
];
const ACAP = [300, 500, 800, 1100, 1500, 1900, 2400, 2900, 3500, 4200]; // سعة الدرع: 10 ترقيات، الأولى +15 وكل وحدة بعدها +5 (طلب قصي)
const ACAP_GAIN = i => 15 + 5 * i;
const SHIELD = [
  { name: 'مولّد واقٍ I', start: 25, price: 400 },
  { name: 'مولّد واقٍ II', start: 50, price: 900 },
  { name: 'مولّد واقٍ III', start: 75, price: 1600 },
];
const HEART = { gain: i => 15 + 5 * i, per: 22, cost: [150, 250, 400, 600, 850, 1150, 1500, 2000, 2600, 3300, 4100, 5000, 6000, 7200, 8500] }; // تطوير الصحة ❤️: +22 صحة قصوى لكل مستوى (15 مستوى)
const KILL_BONUS = 1.38; // طلب قصي: عملات قتل الوحوش +20% ثم +15% (1.2 × 1.15)
const KILL_COINS = { rusher: 5, soldier: 8, drone: 9, brute: 22, boss: 300 };

export const SKINS = [
  { id: 'default', icon: '🔫', name: 'قياسي', desc: 'الشكل الأصلي للأسلحة بدون تعديل', shapeDesc: 'الشكل الأصلي القياسي', perkDesc: 'بدون ميزة إضافية', perk: {}, price: 0, swatch: ['#545d80', '#38f3ff'], color: null, emissive: null, accent: null, metalness: 0.55, roughness: 0.45 },
  { id: 'gold', icon: '👑', name: 'تاج الملوك الذهبي', desc: 'هيكل مدرّع بتاج ملكي وكاتم مجنّح وليزر ذهبي', shapeDesc: 'تاج ملكي + دروع جانبية + كاتم مجنّح وليزر ذهبي', perkDesc: '+25% ذهب من كل قتلة + 20% ضرر إضافي للهيدشوت', perk: { coinMult: 1.25, headMult: 1.20 }, price: 600, swatch: ['#ffd700', '#8a6200'], color: '#ffd700', dark: '#5e4300', light: '#fff099', emissive: '#8a6200', accent: '#ffe666', metalness: 0.88, roughness: 0.2 },
  { id: 'inferno', icon: '🔥', name: 'فكّ التنين البركاني', desc: 'قرون تنين نارية ومفاعل حمم متوهّج على السلاح', shapeDesc: 'قرون وأنياب تنين أمامية + مفاعل حمم نابض', perkDesc: 'رصاص حارق يشعل الأعداء 3 ثواني + 15% ضرر إضافي', perk: { dmgMult: 1.15, burn: 3 }, price: 900, swatch: ['#ff3300', '#ff6600'], color: '#ff3300', dark: '#2c0703', light: '#ff8533', emissive: '#ff5500', accent: '#ff9429', metalness: 0.68, roughness: 0.3 },
  { id: 'frost', icon: '❄️', name: 'ناب الصقيع الجليدي', desc: 'أشواك كريستال ثلجية وخزان تبريد ومنظار ماسي عائم', shapeDesc: '6 أشواك كريستال + خزان تبريد + منظار ماسي عائم', perkDesc: 'تجميد يبطّئ الأعداء 45% + تلقيم أسرع 25%', perk: { slow: 2.2, reloadMult: 0.75 }, price: 900, swatch: ['#44f5ff', '#00aacc'], color: '#44f5ff', dark: '#0b344d', light: '#cffbff', emissive: '#00aacc', accent: '#7ff8ff', metalness: 0.72, roughness: 0.2 },
  { id: 'void', icon: '🌌', name: 'مدفع المجرة الكوني', desc: 'سبطانة مزدوجة فضائية وحلقة طاقة دوّارة وجوهرة عائمة', shapeDesc: 'سبطانة مزدوجة + حلقة طاقة دوّارة + جوهرة وأجنحة فضائية', perkDesc: 'سرعة إطلاق +20% + كل 4 طلقات موجة انفجار مجرّية للأعداء القريبين', perk: { rateMult: 0.80, voidNova: 4 }, price: 1500, swatch: ['#c026d3', '#7c3aed'], color: '#c026d3', dark: '#230838', light: '#f0abfc', emissive: '#7c3aed', accent: '#e879f9', metalness: 0.8, roughness: 0.22 },
];

export const HEAD_FX = [
  { id: 'default', name: 'شرار قياسي', desc: 'تأثير الشرار المعتاد عند إصابة الرأس', price: 0, icon: '✨', swatch: ['#7ff8ff', '#ffd23d'] },
  { id: 'plasma', name: 'انفجار بلازما', desc: 'حلقة صدمة سيان وماجنتا متوسعة + شرار نيون', price: 500, icon: '🌀', swatch: ['#38f6ff', '#ff3df0'] },
  { id: 'lightning', name: 'صاعقة كهربائية', desc: 'صاعقة برق عمودية ساطعة + شرار كهربائي', price: 800, icon: '⚡', swatch: ['#e0fbff', '#38d9ff'] },
  { id: 'goldburst', name: 'انفجار ذهبي', desc: 'انفجار نجوم ذهبي فاخر مع شظايا ذهبية', price: 1200, icon: '🌟', swatch: ['#ffd700', '#fff4b0'] },
];

let st = load();
function load() {
  let s = null; try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { s = null; }
  s = s && typeof s === 'object' ? s : {};
  const skinsOwned = { default: true, ...(s.skinsOwned && typeof s.skinsOwned === 'object' ? s.skinsOwned : {}) };
  const fxOwned = { default: true, ...(s.fxOwned && typeof s.fxOwned === 'object' ? s.fxOwned : {}) };
  const skin = (s.skin && skinsOwned[s.skin]) ? s.skin : 'default';
  const headFx = (s.headFx && fxOwned[s.headFx]) ? s.headFx : 'default';
  return {
    coins: +s.coins || 0,
    up: s.up || {},
    bought: s.bought || {},
    armor: +s.armor || 0,
    shield: +s.shield || 0,
    heart: +s.heart || 0,
    acap: +s.acap || 0,
    skinsOwned,
    skin,
    fxOwned,
    headFx,
  };
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); if (!window.__nsRestoring) { localStorage.setItem('ns_local_ts', String(Date.now())); window.dispatchEvent(new CustomEvent('ns:save')); } } catch { } }

export const Shop = {
  UP_COST, UP_STATS, MAX_UP, ARMOR, SHIELD, HEART, SKINS, HEAD_FX,
  reload() { st = load(); },
  heartLevel() { return st.heart; },
  heartHp() { let s = 0; for (let i = 0; i < st.heart; i++) s += HEART.gain(i); return s; },
  heartNext() { return st.heart >= HEART.cost.length ? 0 : HEART.gain(st.heart); },
  heartCost() { return st.heart >= HEART.cost.length ? null : HEART.cost[st.heart]; },
  buyHeart() { const c = this.heartCost(); if (c == null || !this.spend(c)) return false; st.heart++; save(); return true; },
  get coins() { return st.coins; },
  armorLevel() { return st.armor; },
  shieldLevel() { return st.shield; },
  add(n) { st.coins += Math.max(0, Math.round(n)); save(); return st.coins; },
  spend(n) { if (st.coins < n) return false; st.coins -= n; save(); return true; },
  killCoins(type) { const cm = this.skinDef()?.perk?.coinMult || 1; return Math.round((KILL_COINS[type] ?? 5) * KILL_BONUS * cm); },
  level(id, k) { return (st.up[id] && st.up[id][k]) || 0; },
  upgradeCost(id, k) { const L = this.level(id, k); return L >= MAX_UP ? null : UP_COST[L]; },
  buyUpgrade(id, k) {
    const c = this.upgradeCost(id, k); if (c == null || !this.spend(c)) return false;
    st.up[id] = st.up[id] || {}; st.up[id][k] = this.level(id, k) + 1; save(); return true;
  },
  owned(w) { return w.price ? !!st.bought[w.id] : !w.unlockWave; },
  buyWeapon(w) { if (this.owned(w) || !this.spend(w.price)) return false; st.bought[w.id] = true; save(); return true; },
  nextArmor() { return ARMOR[st.armor] || null; },
  buyArmor() { const a = this.nextArmor(); if (!a || !this.spend(a.price)) return false; st.armor++; save(); return true; },
  nextShield() { return SHIELD[st.shield] || null; },
  armorCap() { let c = 100; for (let i = 0; i < st.acap; i++) c += ACAP_GAIN(i); return c; },
  nextCap() { const p = ACAP[st.acap]; return p == null ? null : { cap: this.armorCap() + ACAP_GAIN(st.acap), price: p, add: ACAP_GAIN(st.acap) }; },
  buyCap() { const c = this.nextCap(); if (!c || !this.spend(c.price)) return false; st.acap++; save(); return true; },
  buyShield() { const s = this.nextShield(); if (!s || !this.spend(s.price)) return false; st.shield++; save(); return true; },
  // ---- weapon skins ----
  skin() { return st.skin || 'default'; },
  skinDef(id = st.skin) { return SKINS.find(s => s.id === id) || SKINS[0]; },
  hasSkin(id) { return id === 'default' || !!st.skinsOwned[id]; },
  buySkin(id) {
    const s = SKINS.find(x => x.id === id); if (!s) return false;
    if (this.hasSkin(id)) { st.skin = id; save(); return true; }
    if (!this.spend(s.price)) return false;
    st.skinsOwned[id] = true; st.skin = id; save(); return true;
  },
  equipSkin(id) { if (!this.hasSkin(id)) return false; st.skin = id; save(); return true; },
  // ---- headshot kill effects ----
  headFx() { return st.headFx || 'default'; },
  headFxDef(id = st.headFx) { return HEAD_FX.find(f => f.id === id) || HEAD_FX[0]; },
  hasHeadFx(id) { return id === 'default' || !!st.fxOwned[id]; },
  buyHeadFx(id) {
    const f = HEAD_FX.find(x => x.id === id); if (!f) return false;
    if (this.hasHeadFx(id)) { st.headFx = id; save(); return true; }
    if (!this.spend(f.price)) return false;
    st.fxOwned[id] = true; st.headFx = id; save(); return true;
  },
  equipHeadFx(id) { if (!this.hasHeadFx(id)) return false; st.headFx = id; save(); return true; },
  // stats applied when a level starts
  armorStat() { const a = ARMOR[st.armor - 1]; return { hp: a ? a.hp : 0, dr: a ? a.dr : 0 }; },
  shieldStart() { const s = SHIELD[st.shield - 1]; return s ? s.start : 0; },
  // weapon definition with the player's upgrades applied
  def(w) {
    const u = st.up[w.id]; if (!u) return w;
    const d = { ...w };
    d.dmg = w.dmg * (1 + 0.12 * (u.dmg || 0));
    d.rate = w.rate / (1 + 0.08 * (u.rate || 0));
    d.mag = Math.round(w.mag * (1 + 0.12 * (u.mag || 0)));
    d.reload = w.reload * (1 - 0.08 * (u.mag || 0));
    return d;
  },
};
export const SHOP_WEAPONS = () => WEAPONS.filter(w => !w.price || Shop.owned(w));
export const SHOP_NEW = () => WEAPONS.filter(w => w.price && !Shop.owned(w));
