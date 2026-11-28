import * as THREE from '../three.module.min.js';

export const WEAPONS = [
  { id: 'rifle', skill: 'freeshot', skillDesc: 'ضربة الرأس بترجّع طلقة للمخزن', scope: { zoom: 2.0, type: 'acog', name: 'منظار ×2' }, name: 'البندقية النبضية', auto: true, rate: 0.095, dmg: 19, head: 2.0, mag: 30, reserve: 240, maxReserve: 360, reload: 1.5, spread: 0.010, moveSpread: 0.022, recoil: 0.011, kick: 0.05, pellets: 1, range: 140, falloff: [40, 100, 0.6], color: '#5ff6ff', tracer: 0.035, sound: 'rifle', shake: 0.06 },
  { id: 'shotgun', skill: 'close', skillDesc: 'من قريب (أقل من 8 متر) الضرر +35%', scope: { zoom: 1.3, type: 'ring', name: 'منظار قريب ×1.3' }, name: 'المدفع المشتّت', auto: true, rate: 0.72, dmg: 12, head: 1.5, mag: 7, reserve: 42, maxReserve: 63, reload: 1.9, spread: 0.07, moveSpread: 0.02, recoil: 0.06, kick: 0.16, pellets: 10, range: 45, falloff: [9, 30, 0.25], color: '#ffc45f', tracer: 0.03, sound: 'shotgun', shake: 0.25 },
  { id: 'pistol', skill: 'fifth', skillDesc: 'كل خامس طلقة ضرر ×2', scope: { zoom: 1.5, type: 'dot', name: 'نقطة حمراء ×1.5' }, name: 'المسدس الليزري', auto: true, rate: 0.2, dmg: 30, head: 2.2, mag: 12, reserve: Infinity, maxReserve: Infinity, reload: 1.05, spread: 0.004, moveSpread: 0.012, recoil: 0.024, kick: 0.08, pellets: 1, range: 120, falloff: [30, 80, 0.6], color: '#ff6ad5', tracer: 0.03, sound: 'pistol', shake: 0.08 },
  { id: 'launcher', skillDesc: 'انفجار أكبر 40%', scope: { zoom: 2.6, type: 'range', name: 'منظار مدى ×2.6' }, name: 'قاذف البلازما', auto: true, rate: 0.85, dmg: 120, head: 1, mag: 4, reserve: 8, maxReserve: 16, reload: 2.1, spread: 0.0, moveSpread: 0.0, recoil: 0.05, kick: 0.2, pellets: 0, projectile: { speed: 42, radius: 6.4 }, range: 150, color: '#7dff6a', tracer: 0, sound: 'shotgun', shake: 0.2, unlockWave: 4 },
  // ---- purchasable in the shop (price in coins) ----
  { id: 'thunder', skill: 'storm', skillDesc: 'كل 10 طلقات صاعقة تضرب كل الأعداء بقرب 12 متر بنص الضرر', model: 'rifle', scope: { zoom: 2.0, type: 'acog', name: 'منظار ×2' }, name: 'الرشاش الصاعق', desc: 'رشاش سريع جداً وذخيرة كبيرة', price: 600, auto: true, rate: 0.0418, dmg: 13, head: 2.0, mag: 60, reserve: 300, maxReserve: 480, reload: 1.6, spread: 0.014, moveSpread: 0.03, recoil: 0.012, kick: 0.05, pellets: 1, range: 130, falloff: [35, 90, 0.6], color: '#fff06a', tracer: 0.03, sound: 'rifle', shake: 0.07 },
  { id: 'frost', skill: 'freeze', skillDesc: 'الأعداء اللي تنضرب يتباطأوا 50% لمدة ثانيتين', model: 'shotgun', scope: { zoom: 1.3, type: 'ring', name: 'منظار قريب ×1.3' }, name: 'مدفع الجليد', desc: 'طلقات مشتّتة تضرب أعداء كتار قريبين', price: 900, auto: true, rate: 0.8, dmg: 15, head: 1.5, mag: 6, reserve: 36, maxReserve: 54, reload: 2.1, spread: 0.08, moveSpread: 0.02, recoil: 0.07, kick: 0.16, pellets: 14, range: 50, falloff: [10, 32, 0.3], color: '#7ff8ff', tracer: 0.03, sound: 'shotgun', shake: 0.3 },
  { id: 'sunray', skill: 'burn', skillDesc: 'الهدف يحترق 3 ثواني بعد الضربة', model: 'pistol', scope: { zoom: 1.5, type: 'dot', name: 'نقطة حمراء ×1.5' }, name: 'مسدس الشمس', desc: 'ضرر كبير بكل طلقة، مدى متوسط', price: 1500, auto: true, rate: 0.14, dmg: 46, head: 2.4, mag: 8, reserve: 80, maxReserve: 120, reload: 1.2, spread: 0.004, moveSpread: 0.012, recoil: 0.03, kick: 0.09, pellets: 1, range: 130, falloff: [35, 90, 0.6], color: '#ffb43d', tracer: 0.03, sound: 'pistol', shake: 0.1 },
  { id: 'chainbolt', model: 'pistol', scope: { zoom: 1.5, type: 'dot', name: 'نقطة حمراء ×1.5' }, name: 'مسدس البرق المتسلسل', desc: 'المهارة: الرصاصة تقفز لعدو قريب وتضربه نص الضرر', skill: 'chain', price: 700, auto: true, rate: 0.16, dmg: 22, head: 2.0, mag: 12, reserve: 96, maxReserve: 144, reload: 1.3, spread: 0.006, moveSpread: 0.015, recoil: 0.03, kick: 0.09, pellets: 1, range: 130, falloff: [35, 90, 0.6], color: '#fff06a', tracer: 0.03, sound: 'pistol', shake: 0.08 },
  { id: 'leech', model: 'rifle', scope: { zoom: 2.0, type: 'acog', name: 'منظار ×2' }, name: 'رشاش المص', desc: 'المهارة: كل ضربة ترجّع لك 4% من الضرر كصحة', skill: 'leech', price: 800, auto: true, rate: 0.075, dmg: 16, head: 2.0, mag: 40, reserve: 200, maxReserve: 300, reload: 1.6, spread: 0.012, moveSpread: 0.025, recoil: 0.014, kick: 0.06, pellets: 1, range: 135, falloff: [40, 100, 0.6], color: '#7dff6a', tracer: 0.03, sound: 'rifle', shake: 0.07 },
  { id: 'refund', model: 'rifle', scope: { zoom: 2.0, type: 'acog', name: 'منظار ×2' }, name: 'بندقية الاسترداد', desc: 'المهارة: كل قتلة ترجّع 6 طلقات للمخزن', skill: 'refund', price: 1000, auto: true, rate: 0.1, dmg: 24, head: 2.0, mag: 24, reserve: 168, maxReserve: 240, reload: 1.4, spread: 0.009, moveSpread: 0.02, recoil: 0.012, kick: 0.05, pellets: 1, range: 140, falloff: [40, 100, 0.6], color: '#ff6ad5', tracer: 0.035, sound: 'rifle', shake: 0.06 },
];

function mat(color, o = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.55, flatShading: true, ...o }); }
function glowMat(color) { return new THREE.MeshBasicMaterial({ color, toneMapped: false }); }
function bx(w, h, d, m, x = 0, y = 0, z = 0, parent) { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); parent && parent.add(me); return me; }
function cy(r1, r2, h, m, x, y, z, parent, seg = 10, rotX = Math.PI / 2) { const me = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m); me.rotation.x = rotX; me.position.set(x, y, z); parent && parent.add(me); return me; }

// Builds a gun model. Forward is -Z. muzzle object returned.
export function buildGun(id, forTP = false) {
  const g = new THREE.Group();
  const dark = mat('#2a2f45'), mid = mat('#545d80'), light = mat('#c9d2ec', { metalness: 0.3 }), grip = mat('#191b28', { metalness: 0.1, roughness: 0.9 });
  let muzzle = new THREE.Object3D(), accent;
  if (id === 'rifle') {
    accent = glowMat('#38f3ff');
    bx(0.09, 0.11, 0.55, mid, 0, 0, -0.1, g); bx(0.07, 0.05, 0.42, dark, 0, 0.075, -0.08, g); // body + rail
    bx(0.1, 0.03, 0.5, accent, 0, 0.0, -0.12, g).scale.set(1.05, 0.25, 1);
    cy(0.022, 0.022, 0.32, dark, 0, 0.005, -0.52, g, 8); cy(0.035, 0.035, 0.08, mid, 0, 0.005, -0.68, g, 8);
    bx(0.06, 0.16, 0.08, grip, 0, -0.12, 0.05, g).rotation.x = 0.25; bx(0.06, 0.18, 0.09, dark, 0, -0.13, -0.18, g).rotation.x = -0.15; // grip, mag
    bx(0.08, 0.1, 0.2, mid, 0, -0.01, 0.25, g); bx(0.012, 0.04, 0.012, dark, 0, 0.115, -0.3, g); // stock, front sight
    bx(0.05, 0.035, 0.07, dark, 0, 0.115, 0.02, g); bx(0.02, 0.02, 0.005, glowMat('#ff3d81'), 0, 0.12, -0.016, g);
    muzzle.position.set(0, 0.005, -0.74);
  } else if (id === 'shotgun') {
    accent = glowMat('#ffb43d');
    bx(0.12, 0.13, 0.5, dark, 0, 0, -0.05, g); cy(0.04, 0.04, 0.55, mid, -0.025, 0.02, -0.45, g, 8); cy(0.04, 0.04, 0.55, mid, 0.025, 0.02, -0.45, g, 8);
    bx(0.13, 0.09, 0.22, light, 0, -0.04, -0.4, g); bx(0.124, 0.015, 0.36, accent, 0, 0.03, -0.08, g); bx(0.03, 0.02, 0.3, dark, 0, 0.072, -0.1, g);
    bx(0.07, 0.17, 0.09, grip, 0, -0.13, 0.12, g).rotation.x = 0.3; bx(0.09, 0.11, 0.22, mid, 0, -0.02, 0.3, g);
    muzzle.position.set(0, 0.02, -0.75);
  } else if (id === 'pistol') {
    accent = glowMat('#ff6ad5');
    bx(0.07, 0.09, 0.3, light, 0, 0.02, -0.08, g); bx(0.075, 0.025, 0.31, accent, 0, 0.075, -0.08, g); bx(0.06, 0.16, 0.08, grip, 0, -0.1, 0.03, g).rotation.x = 0.2;
    cy(0.02, 0.02, 0.08, dark, 0, 0.02, -0.26, g, 8);
    muzzle.position.set(0, 0.02, -0.3);
  } else {
    accent = glowMat('#7dff6a');
    cy(0.08, 0.08, 0.55, dark, 0, 0, -0.18, g, 10); cy(0.095, 0.095, 0.1, mid, 0, 0, -0.47, g, 10); cy(0.06, 0.06, 0.1, accent, 0, 0, -0.52, g, 10);
    bx(0.04, 0.04, 0.4, accent, 0, 0.09, -0.15, g); bx(0.07, 0.16, 0.09, grip, 0, -0.13, 0.0, g).rotation.x = 0.2; bx(0.12, 0.12, 0.16, mid, 0, -0.03, 0.15, g);
    for (let i = 0; i < 3; i++) bx(0.17, 0.02, 0.02, accent, 0, 0, -0.05 - i * 0.08, g);
    muzzle.position.set(0, 0, -0.57);
  }
  if (!forTP) {
    // gloved hands
    const glove = mat('#22283e', { metalness: 0.1, roughness: 0.8 }), sleeve = mat('#2d3a6a', { metalness: 0.1, roughness: 0.8 }), glowS = glowMat('#38f3ff');
    const rh = bx(0.08, 0.09, 0.12, glove, 0.0, -0.11, 0.06, g); rh.rotation.x = 0.3;
    const ra = bx(0.09, 0.09, 0.3, sleeve, 0.04, -0.17, 0.24, g); ra.rotation.set(0.35, -0.2, 0);
    bx(0.095, 0.02, 0.05, glowS, 0.03, -0.14, 0.11, g).rotation.set(0.35, -0.2, 0);
    const lz = id === 'pistol' ? -0.02 : -0.32;
    const lh = bx(0.08, 0.07, 0.12, glove, -0.02, -0.07, lz, g);
    const la = bx(0.09, 0.09, 0.34, sleeve, -0.12, -0.15, lz + 0.2, g); la.rotation.set(0.3, 0.55, 0);
  }
  g.add(muzzle);
  g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  const skinMats = {
    dark, mid, light, accent,
    orig: {
      dark: dark.color.getHex(),
      mid: mid.color.getHex(),
      light: light.color.getHex(),
      accent: accent.color.getHex(),
    },
  };
  return { group: g, muzzle, skinMats };
}

export function applyWeaponSkin(gunObj, skinDef) {
  const sm = gunObj && gunObj.skinMats;
  if (!sm) return;
  if (!skinDef || skinDef.id === 'default' || !skinDef.color) {
    sm.dark.color.setHex(sm.orig.dark);
    sm.dark.emissive.setHex(0x000000);
    sm.dark.emissiveIntensity = 0;
    sm.dark.metalness = 0.55; sm.dark.roughness = 0.45;
    sm.mid.color.setHex(sm.orig.mid);
    sm.mid.emissive.setHex(0x000000);
    sm.mid.emissiveIntensity = 0;
    sm.mid.metalness = 0.55; sm.mid.roughness = 0.45;
    sm.light.color.setHex(sm.orig.light);
    sm.light.emissive.setHex(0x000000);
    sm.light.emissiveIntensity = 0;
    sm.light.metalness = 0.3; sm.light.roughness = 0.45;
    sm.accent.color.setHex(sm.orig.accent);
  } else {
    sm.mid.color.set(skinDef.color);
    sm.mid.emissive.set(skinDef.emissive || '#000000');
    sm.mid.emissiveIntensity = 0.45;
    sm.mid.metalness = skinDef.metalness ?? 0.75;
    sm.mid.roughness = skinDef.roughness ?? 0.28;

    sm.dark.color.set(skinDef.dark || skinDef.color);
    sm.dark.emissive.set(skinDef.emissive || '#000000');
    sm.dark.emissiveIntensity = 0.22;
    sm.dark.metalness = skinDef.metalness ?? 0.75;
    sm.dark.roughness = Math.min(0.6, (skinDef.roughness ?? 0.28) + 0.12);

    sm.light.color.set(skinDef.light || skinDef.color);
    sm.light.emissive.set(skinDef.emissive || '#000000');
    sm.light.emissiveIntensity = 0.35;
    sm.light.metalness = skinDef.metalness ?? 0.75;
    sm.light.roughness = Math.max(0.15, (skinDef.roughness ?? 0.28) - 0.05);

    sm.accent.color.set(skinDef.accent || skinDef.color);
  }
}

export class Viewmodel {
  constructor(tex) {
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(58, 1, 0.01, 10);
    this.scene.add(new THREE.HemisphereLight('#b7c4ff', '#40305a', 1.8));
    const d = new THREE.DirectionalLight('#ffd0b0', 2.4); d.position.set(-0.5, 1, 0.6); this.scene.add(d);
    const rim = new THREE.DirectionalLight('#ff3d81', 1.2); rim.position.set(1, 0.2, -1); this.scene.add(rim);
    this.root = new THREE.Group(); this.scene.add(this.root); this.cam.add(this.root); this.scene.add(this.cam);
    this.guns = WEAPONS.map(w => { const gg = buildGun(w.model || w.id); gg.group.visible = false; const holder = new THREE.Group(); holder.add(gg.group); gg.group.scale.setScalar(0.62); this.root.add(holder); gg.holder = holder; return gg; });
    // muzzle flash sprite + light
    this.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.flash, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); this.flash.visible = false; this.scene.add(this.flash);
    this.flashLight = new THREE.PointLight('#ffc070', 0, 2, 2); this.scene.add(this.flashLight);
    this.cur = 0; this.basePos = new THREE.Vector3(0.15, -0.15, -0.3);
    this.kick = 0; this.kickRot = 0; this.swayX = 0; this.swayY = 0; this.bobT = 0; this.swapT = 0; this.reloadT = 0; this.flashT = 0; this.sprintK = 0; this.landK = 0;
    this.setWeapon(0, true);
  }
  setWeapon(i, instant) { this.guns.forEach((g, k) => { g.group.visible = k === i; }); this.cur = i; if (!instant) this.swapT = 0.35; }
  applySkin(skinDef) { for (const g of this.guns) applyWeaponSkin(g, skinDef); }
  fire(w) { this.kick = Math.min(1, this.kick + (w.kick || 0.06) * 4); this.kickRot = Math.min(1, this.kickRot + (w.kick || 0.06) * 3); this.flashT = 0.05; this.flash.material.color.set(w.color); this.flash.material.rotation = Math.random() * 6; }
  update(dt, st) {
    // st: {moving, speed01, lookDX, lookDY, reloading(0..1 or -1), sprint, onGround, aspect}
    this.bobT += dt * (st.moving && st.onGround ? 9 + st.speed01 * 4 : 0);
    this.swayX += (-st.lookDX * 0.35 - this.swayX) * Math.min(1, dt * 8); this.swayY += (st.lookDY * 0.35 - this.swayY) * Math.min(1, dt * 8);
    this.swayX = Math.max(-0.06, Math.min(0.06, this.swayX)); this.swayY = Math.max(-0.05, Math.min(0.05, this.swayY));
    this.kick += -this.kick * Math.min(1, dt * 14); this.kickRot += -this.kickRot * Math.min(1, dt * 10);
    this.sprintK += ((st.sprint && st.moving ? 1 : 0) - this.sprintK) * Math.min(1, dt * 7);
    this.landK += -this.landK * Math.min(1, dt * 8);
    const amp = st.moving && st.onGround ? 0.012 + st.speed01 * 0.012 : 0.002;
    const bx = Math.sin(this.bobT) * amp, by = -Math.abs(Math.cos(this.bobT)) * amp;
    let swapOff = 0; if (this.swapT > 0) { this.swapT -= dt; swapOff = Math.sin(Math.max(0, this.swapT) / 0.35 * Math.PI) * 0.25 + Math.max(0, this.swapT) * 0.6; }
    let rl = st.reloading >= 0 ? Math.sin(Math.min(1, st.reloading) * Math.PI) : 0;
    const g = this.guns[this.cur].holder;
    g.position.set(this.basePos.x + bx + this.swayX - this.sprintK * 0.05, this.basePos.y + by + this.swayY - swapOff - rl * 0.08 - this.landK * 0.04 - this.sprintK * 0.03, this.basePos.z + this.kick * 0.06);
    g.rotation.set(this.kickRot * 0.22 + rl * -0.5 + this.swayY * 1.5, this.swayX * 1.2 + this.sprintK * 0.5, rl * 0.6 + this.swayX * 1.5 + this.sprintK * 0.25);
    // flash
    if (this.flashT > 0) {
      this.flashT -= dt; const m = this.guns[this.cur].muzzle; m.updateWorldMatrix(true, false); const p = new THREE.Vector3().setFromMatrixPosition(m.matrixWorld);
      this.flash.position.copy(p); const s = 0.18 + Math.random() * 0.1; this.flash.scale.set(s, s, 1); this.flash.visible = true; this.flashLight.position.copy(p); this.flashLight.intensity = 3;
    } else { this.flash.visible = false; this.flashLight.intensity = 0; }
  }
}
