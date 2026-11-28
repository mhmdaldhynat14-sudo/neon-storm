import * as THREE from '../three.module.min.js';

const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _m = new THREE.Matrix4(), _c = new THREE.Color();

export class FX {
  constructor(scene, tex, world, quality) {
    this.scene = scene; this.tex = tex; this.world = world;
    const scale = quality === 'low' ? 0.5 : quality === 'med' ? 0.8 : 1;
    this.scale = scale;
    // ---- additive sparks (points) ----
    const N = this.N = Math.floor(700 * scale);
    this.p = { pos: new Float32Array(N * 3), vel: new Float32Array(N * 3), col: new Float32Array(N * 3), size: new Float32Array(N), life: new Float32Array(N), max: new Float32Array(N), grav: new Float32Array(N), drag: new Float32Array(N), base: new Float32Array(N), next: 0 };
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.p.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.p.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.pointsMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex.glow }, scale: { value: 400 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float size; attribute vec3 color; varying vec3 vC; uniform float scale; void main(){ vC=color; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = size*scale/max(0.1,-mv.z); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec3 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC*t.a, t.a); }`,
    });
    this.points = new THREE.Points(g, this.pointsMat); this.points.frustumCulled = false; scene.add(this.points);
    for (let i = 0; i < N; i++) this.p.pos[i * 3 + 1] = -999;
    // ---- smoke (normal blend points) ----
    const SN = this.SN = Math.floor(140 * scale);
    this.s = { pos: new Float32Array(SN * 3), vel: new Float32Array(SN * 3), col: new Float32Array(SN * 4), size: new Float32Array(SN), life: new Float32Array(SN), max: new Float32Array(SN), grow: new Float32Array(SN), next: 0, base: new Float32Array(SN), a0: new Float32Array(SN) };
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(this.s.pos, 3).setUsage(THREE.DynamicDrawUsage));
    sg.setAttribute('rgba', new THREE.BufferAttribute(this.s.col, 4).setUsage(THREE.DynamicDrawUsage));
    sg.setAttribute('size', new THREE.BufferAttribute(this.s.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.smokeMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex.glow }, scale: { value: 400 } }, transparent: true, depthWrite: false,
      vertexShader: `attribute float size; attribute vec4 rgba; varying vec4 vC; uniform float scale; void main(){ vC=rgba; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = size*scale/max(0.1,-mv.z); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec4 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC.rgb, vC.a*t.a*0.8); }`,
    });
    this.smoke = new THREE.Points(sg, this.smokeMat); this.smoke.frustumCulled = false; this.smoke.renderOrder = 2; scene.add(this.smoke);
    for (let i = 0; i < SN; i++) this.s.pos[i * 3 + 1] = -999;
    // ---- debris (instanced cubes) ----
    const DN = this.DN = Math.floor(160 * scale);
    this.debrisMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.3, flatShading: true }), DN);
    this.debrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.debrisMesh.frustumCulled = false;
    this.debris = []; for (let i = 0; i < DN; i++) { this.debris.push({ p: new THREE.Vector3(0, -999, 0), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), s: 0, life: 0, max: 1, emis: false }); this.debrisMesh.setColorAt(i, _c.set('#888')); }
    this.debrisMesh.count = DN; this.dNext = 0; scene.add(this.debrisMesh); this.writeDebris(true);
    // ---- tracers ----
    const trGeo = new THREE.BoxGeometry(1, 1, 1); trGeo.translate(0, 0, 0.5);
    this.tracers = [];
    for (let i = 0; i < 28; i++) { const m = new THREE.Mesh(trGeo, new THREE.MeshBasicMaterial({ color: '#9ff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); m.visible = false; m.frustumCulled = false; scene.add(m); this.tracers.push({ m, life: 0, max: 0.06 }); }
    this.trNext = 0;
    // ---- decals ----
    this.decals = []; const dGeo = new THREE.PlaneGeometry(0.22, 0.22);
    const dMat = new THREE.MeshBasicMaterial({ map: tex.hole, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    for (let i = 0; i < Math.floor(50 * scale); i++) { const m = new THREE.Mesh(dGeo, dMat); m.visible = false; scene.add(m); this.decals.push(m); }
    this.decNext = 0;
    // ---- flashes (billboard sprites) ----
    this.flashes = [];
    for (let i = 0; i < 16; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.flash, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); s.visible = false; scene.add(s); this.flashes.push({ s, life: 0, max: 0.1, size: 1, grow: 1 }); }
    this.flNext = 0;
    // ---- rings (shockwaves) ----
    this.rings = [];
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), new THREE.MeshBasicMaterial({ color: '#ff3d81', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); this.rings.push({ m, life: 0, max: 1, r0: 0, r1: 1 }); }
    // ---- beams (spawn) ----
    this.beams = []; const bGeo = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true); bGeo.translate(0, 0.5, 0);
    for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(bGeo, new THREE.MeshBasicMaterial({ color: '#ff3d81', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); m.visible = false; scene.add(m); this.beams.push({ m, life: 0, max: 1 }); }
    // ---- dynamic lights (count fixed so shaders never recompile) ----
    this.lights = [];
    for (let i = 0; i < (quality === 'low' ? 1 : 2); i++) { const l = new THREE.PointLight('#ffb050', 0, 12, 2); l.position.set(0, -50, 0); scene.add(l); this.lights.push({ l, life: 0, max: 0.1, peak: 0 }); }
    this.lNext = 0;
  }
  spark(x, y, z, vx, vy, vz, color, size, life, grav = 9, drag = 2) {
    const P = this.p, i = P.next; P.next = (i + 1) % this.N;
    P.pos[i * 3] = x; P.pos[i * 3 + 1] = y; P.pos[i * 3 + 2] = z; P.vel[i * 3] = vx; P.vel[i * 3 + 1] = vy; P.vel[i * 3 + 2] = vz;
    _c.set(color); P.col[i * 3] = _c.r; P.col[i * 3 + 1] = _c.g; P.col[i * 3 + 2] = _c.b; P.size[i] = P.base[i] = size; P.life[i] = P.max[i] = life; P.grav[i] = grav; P.drag[i] = drag;
  }
  puff(x, y, z, vx, vy, vz, color, size, life, alpha = 0.5, grow = 2) {
    const S = this.s, i = S.next; S.next = (i + 1) % this.SN;
    S.pos[i * 3] = x; S.pos[i * 3 + 1] = y; S.pos[i * 3 + 2] = z; S.vel[i * 3] = vx; S.vel[i * 3 + 1] = vy; S.vel[i * 3 + 2] = vz;
    _c.set(color); S.col[i * 4] = _c.r; S.col[i * 4 + 1] = _c.g; S.col[i * 4 + 2] = _c.b; S.a0[i] = alpha; S.col[i * 4 + 3] = alpha; S.size[i] = S.base[i] = size; S.life[i] = S.max[i] = life; S.grow[i] = grow;
  }
  burst(pos, normal, color, n = 10, speed = 6, size = 0.12, life = 0.4) {
    n = Math.max(2, Math.round(n * this.scale));
    for (let i = 0; i < n; i++) {
      const vx = (Math.random() - 0.5) * 2 + (normal ? normal[0] * 1.5 : 0), vy = (Math.random() - 0.3) * 2 + (normal ? normal[1] * 1.5 : 0), vz = (Math.random() - 0.5) * 2 + (normal ? normal[2] * 1.5 : 0);
      const L = Math.hypot(vx, vy, vz) || 1, s = speed * (0.4 + Math.random() * 0.8);
      this.spark(pos.x, pos.y, pos.z, vx / L * s, vy / L * s, vz / L * s, color, size * (0.6 + Math.random() * 0.8), life * (0.6 + Math.random() * 0.7));
    }
  }
  impact(pos, normal, kind) {
    const col = kind === 'metal' ? '#ffd58a' : kind === 'enemy' ? '#7ff8ff' : '#ffc070';
    this.burst(pos, normal, col, kind === 'enemy' ? 9 : 7, 6, 0.1, 0.35);
    if (kind !== 'enemy') { this.puff(pos.x + normal[0] * 0.1, pos.y + normal[1] * 0.1, pos.z + normal[2] * 0.1, normal[0] * 0.6, 0.4, normal[2] * 0.6, '#9a96b0', 0.35, 0.6, 0.35, 1.6); this.decal(pos, normal); }
    this.flash(pos.x + normal[0] * 0.05, pos.y + normal[1] * 0.05, pos.z + normal[2] * 0.05, 0.35, 0.05, col);
  }
  decal(pos, n) {
    const m = this.decals[this.decNext]; if (!m) return; this.decNext = (this.decNext + 1) % this.decals.length;
    m.position.set(pos.x + n[0] * 0.01, pos.y + n[1] * 0.01, pos.z + n[2] * 0.01); _v.set(pos.x + n[0], pos.y + n[1], pos.z + n[2]); m.lookAt(_v); m.rotateZ(Math.random() * 6); m.visible = true;
  }
  clearDecals() { this.decals.forEach(d => d.visible = false); }
  flash(x, y, z, size, life, color = '#fff', grow = 1.5) {
    const f = this.flashes[this.flNext]; this.flNext = (this.flNext + 1) % this.flashes.length;
    f.s.position.set(x, y, z); f.s.material.color.set(color); f.s.material.rotation = Math.random() * 6; f.size = size; f.life = f.max = life; f.grow = grow; f.s.visible = true; f.s.scale.set(size, size, 1);
  }
  light(x, y, z, color, intensity, life, dist = 12) {
    const L = this.lights[this.lNext]; this.lNext = (this.lNext + 1) % this.lights.length;
    L.l.position.set(x, y, z); L.l.color.set(color); L.l.distance = dist; L.peak = intensity; L.life = L.max = life; L.l.intensity = intensity;
  }
  tracer(from, to, color = '#9ff', width = 0.03, life = 0.06) {
    const t = this.tracers[this.trNext]; this.trNext = (this.trNext + 1) % this.tracers.length;
    const d = from.distanceTo(to); if (d < 0.3) return;
    t.m.position.copy(from); t.m.lookAt(to); t.m.scale.set(width, width, d); t.m.material.color.set(color); t.m.material.opacity = 1; t.life = t.max = life; t.m.visible = true; t.w = width;
  }
  debrisBurst(pos, color, n, size = 0.2, speed = 6, emissive = false) {
    n = Math.max(3, Math.round(n * this.scale));
    for (let k = 0; k < n; k++) {
      const i = this.dNext; this.dNext = (i + 1) % this.DN; const d = this.debris[i];
      d.p.copy(pos).add(_v.set((Math.random() - 0.5) * 0.6, Math.random() * 0.6, (Math.random() - 0.5) * 0.6));
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.8);
      d.v.set(Math.cos(a) * s, 3 + Math.random() * speed * 0.9, Math.sin(a) * s); d.w.set(Math.random() * 14 - 7, Math.random() * 14 - 7, Math.random() * 14 - 7);
      d.s = size * (0.5 + Math.random() * 0.9); d.life = d.max = 1.6 + Math.random() * 1.2;
      this.debrisMesh.setColorAt(i, _c.set(Array.isArray(color) ? color[k % color.length] : color));
    }
    this.debrisMesh.instanceColor.needsUpdate = true;
  }
  ring(x, y, z, r0, r1, life, color = '#ff3d81') { const r = this.rings.find(r => r.life <= 0) || this.rings[0]; r.m.position.set(x, y, z); r.r0 = r0; r.r1 = r1; r.life = r.max = life; r.m.material.color.set(color); r.m.visible = true; return r; }
  beam(x, y, z, color = '#ff3d81', h = 6, life = 0.9) { const b = this.beams.find(b => b.life <= 0) || this.beams[0]; b.m.position.set(x, y, z); b.m.material.color.set(color); b.life = b.max = life; b.h = h; b.m.visible = true; }
  headshotBurst(pos, style = 'default') {
    if (!pos) return;
    const x = pos.x, y = Math.max(0.4, pos.y), z = pos.z;
    if (style === 'plasma') {
      // Expanding cyan/magenta shockwave rings + neon sparks
      this.ring(x, y, z, 0.25, 3.6, 0.42, '#38f6ff');
      this.ring(x, Math.max(0.08, y - 0.5), z, 0.2, 2.8, 0.36, '#ff3df0');
      this.flash(x, y, z, 2.4, 0.24, '#38f6ff', 2.2);
      this.light(x, y, z, '#ff3df0', 22, 0.3, 10);
      for (let i = 0; i < 24 * this.scale; i++) {
        const a = Math.random() * 6.283, s = 4 + Math.random() * 8, vy = 1.5 + Math.random() * 6;
        this.spark(x, y, z, Math.cos(a) * s, vy, Math.sin(a) * s, i % 2 ? '#38f6ff' : '#ff3df0', 0.22 + Math.random() * 0.16, 0.45 + Math.random() * 0.35, 6, 1.8);
      }
      return;
    }
    if (style === 'lightning') {
      // Bright vertical lightning bolt flash + electric sparks
      this.beam(x, 0.05, z, '#7ff8ff', 14, 0.45);
      this.beam(x, 0.05, z, '#ffffff', 12, 0.24);
      this.ring(x, 0.08, z, 0.2, 3.2, 0.32, '#38d9ff');
      this.flash(x, y + 0.4, z, 3.0, 0.22, '#e0fbff', 2.4);
      this.light(x, y + 1.2, z, '#7ff8ff', 32, 0.28, 14);
      for (let i = 0; i < 26 * this.scale; i++) {
        const a = Math.random() * 6.283, s = 5 + Math.random() * 9;
        this.spark(x, y + (Math.random() - 0.3) * 1.4, z, Math.cos(a) * s, 2 + Math.random() * 8, Math.sin(a) * s, i % 3 === 0 ? '#ffffff' : '#38d9ff', 0.18 + Math.random() * 0.16, 0.35 + Math.random() * 0.3, 4, 2.4);
      }
      return;
    }
    if (style === 'goldburst') {
      // Golden starburst explosion + extra golden particles & debris
      this.ring(x, y, z, 0.2, 3.4, 0.45, '#ffd700');
      this.flash(x, y, z, 2.8, 0.28, '#ffd700', 2.3);
      this.flash(x, y, z, 1.5, 0.16, '#fff8c8', 1.8);
      this.light(x, y, z, '#ffd700', 28, 0.35, 12);
      for (let i = 0; i < 32 * this.scale; i++) {
        const a = Math.random() * 6.283, s = 3.5 + Math.random() * 9.5;
        this.spark(x, y, z, Math.cos(a) * s, 2.5 + Math.random() * 8, Math.sin(a) * s, i % 3 === 0 ? '#fff4b0' : '#ffd700', 0.24 + Math.random() * 0.2, 0.55 + Math.random() * 0.45, 9, 1.4);
      }
      this.debrisBurst(pos, ['#ffd700', '#ffaa00', '#fff4b0'], 10, 0.16, 6);
      return;
    }
    // default crisp headshot sparkle
    this.flash(x, y, z, 1.1, 0.15, '#ffd23d', 1.6);
    this.burst(pos, [0, 1, 0], '#ffd23d', 12, 6, 0.14, 0.35);
  }

  explosion(pos, radius = 4, color = '#ffa040') {
    this.flash(pos.x, pos.y + 0.5, pos.z, radius * 1.6, 0.35, '#ffd890', 2.2);
    this.flash(pos.x, pos.y + 0.6, pos.z, radius * 0.9, 0.18, '#fff', 1.6);
    this.light(pos.x, pos.y + 1.5, pos.z, '#ffa040', 40, 0.4, radius * 5);
    for (let i = 0; i < 26 * this.scale; i++) { const a = Math.random() * 6.28, s = 4 + Math.random() * 10, u = Math.random(); this.spark(pos.x, pos.y + 0.4, pos.z, Math.cos(a) * s * (1 - u * 0.5), 3 + u * 9, Math.sin(a) * s * (1 - u * 0.5), Math.random() > 0.4 ? color : '#fff3c0', 0.25 + Math.random() * 0.25, 0.5 + Math.random() * 0.6, 12, 1.5); }
    for (let i = 0; i < 10 * this.scale; i++) { const a = Math.random() * 6.28, s = 1 + Math.random() * 2.5; this.puff(pos.x + Math.cos(a) * 0.5, pos.y + 0.5 + Math.random(), pos.z + Math.sin(a) * 0.5, Math.cos(a) * s, 1 + Math.random() * 2, Math.sin(a) * s, i % 3 ? '#3a3448' : '#6a5a70', 1.2 + Math.random(), 1.4 + Math.random(), 0.6, 2.5); }
    this.ring(pos.x, Math.max(0.05, pos.y + 0.05), pos.z, 0.3, radius * 1.3, 0.35, '#ffb060');
  }
  update(dt, cam) {
    const P = this.p, N = this.N; let any = false;
    for (let i = 0; i < N; i++) {
      if (P.life[i] <= 0) continue; any = true; P.life[i] -= dt;
      if (P.life[i] <= 0) { P.pos[i * 3 + 1] = -999; P.size[i] = 0; continue; }
      const d = Math.max(0, 1 - P.drag[i] * dt);
      P.vel[i * 3] *= d; P.vel[i * 3 + 1] = P.vel[i * 3 + 1] * d - P.grav[i] * dt; P.vel[i * 3 + 2] *= d;
      P.pos[i * 3] += P.vel[i * 3] * dt; P.pos[i * 3 + 1] += P.vel[i * 3 + 1] * dt; P.pos[i * 3 + 2] += P.vel[i * 3 + 2] * dt;
      if (P.pos[i * 3 + 1] < 0.02) { P.pos[i * 3 + 1] = 0.02; P.vel[i * 3 + 1] *= -0.4; }
      P.size[i] = P.base[i] * Math.min(1, P.life[i] / P.max[i] * 1.6);
    }
    const ga = this.points.geometry.attributes; ga.position.needsUpdate = true; ga.size.needsUpdate = true; ga.color.needsUpdate = true;
    const S = this.s;
    for (let i = 0; i < this.SN; i++) {
      if (S.life[i] <= 0) continue; S.life[i] -= dt;
      if (S.life[i] <= 0) { S.pos[i * 3 + 1] = -999; S.col[i * 4 + 3] = 0; continue; }
      const k = S.life[i] / S.max[i];
      S.vel[i * 3] *= 1 - 1.5 * dt; S.vel[i * 3 + 1] = S.vel[i * 3 + 1] * (1 - 1.2 * dt) + 0.6 * dt; S.vel[i * 3 + 2] *= 1 - 1.5 * dt;
      S.pos[i * 3] += S.vel[i * 3] * dt; S.pos[i * 3 + 1] += S.vel[i * 3 + 1] * dt; S.pos[i * 3 + 2] += S.vel[i * 3 + 2] * dt;
      S.size[i] = S.base[i] * (1 + (1 - k) * S.grow[i]); S.col[i * 4 + 3] = S.a0[i] * Math.min(1, k * 1.5);
    }
    const sa = this.smoke.geometry.attributes; sa.position.needsUpdate = true; sa.size.needsUpdate = true; sa.rgba.needsUpdate = true;
    // debris
    const W = this.world;
    for (const d of this.debris) {
      if (d.life <= 0) continue; d.life -= dt;
      d.v.y -= 20 * dt; d.p.addScaledVector(d.v, dt); d.r.x += d.w.x * dt; d.r.y += d.w.y * dt; d.r.z += d.w.z * dt;
      const gy = W.groundAt(d.p.x, d.p.z, d.p.y + 0.3) + d.s * 0.5;
      if (d.p.y < gy) { d.p.y = gy; d.v.y *= -0.35; d.v.x *= 0.6; d.v.z *= 0.6; d.w.multiplyScalar(0.6); }
    }
    this.writeDebris();
    for (const t of this.tracers) { if (t.life <= 0) continue; t.life -= dt; const k = Math.max(0, t.life / t.max); t.m.material.opacity = k; t.m.scale.x = t.m.scale.y = t.w * (0.5 + k * 0.5); if (t.life <= 0) t.m.visible = false; }
    for (const f of this.flashes) { if (f.life <= 0) continue; f.life -= dt; const k = Math.max(0, f.life / f.max); const s = f.size * (1 + (1 - k) * f.grow); f.s.scale.set(s, s, 1); f.s.material.opacity = k; if (f.life <= 0) f.s.visible = false; }
    for (const L of this.lights) { if (L.life <= 0) { L.l.intensity = 0; continue; } L.life -= dt; L.l.intensity = L.peak * Math.max(0, L.life / L.max); }
    for (const r of this.rings) { if (r.life <= 0) continue; r.life -= dt; const k = 1 - Math.max(0, r.life / r.max); const R = r.r0 + (r.r1 - r.r0) * k; r.m.scale.set(R, R, R); r.m.material.opacity = 1 - k * k; if (r.life <= 0) r.m.visible = false; }
    for (const b of this.beams) { if (b.life <= 0) continue; b.life -= dt; const k = Math.max(0, b.life / b.max); const rr = (0.25 + (1 - k) * 0.9) * (b.h > 8 ? 2 : 1); b.m.scale.set(rr, b.h * (0.4 + k * 0.6), rr); b.m.material.opacity = k * k * 0.4; if (b.life <= 0) b.m.visible = false; }
  }
  writeDebris(force) {
    const M = this.debrisMesh;
    for (let i = 0; i < this.DN; i++) {
      const d = this.debris[i];
      if (d.life <= 0 && !force) { if (d.hidden) continue; d.hidden = true; _m.makeScale(0, 0, 0); M.setMatrixAt(i, _m); continue; }
      if (force && d.life <= 0) { d.hidden = true; _m.makeScale(0, 0, 0); M.setMatrixAt(i, _m); continue; }
      d.hidden = false; const k = Math.min(1, d.life / 0.4); _q.setFromEuler(d.r); _s.setScalar(d.s * k); _m.compose(d.p, _q, _s); M.setMatrixAt(i, _m);
    }
    M.instanceMatrix.needsUpdate = true;
  }
}
