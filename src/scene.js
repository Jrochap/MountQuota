// ─────────────────────────────────────────────────────────────
//  MOUNT QUOTA — the diorama (three.js)
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { progress, getMods, rates, faceCap, yardCap, mtnDef } from './sim.js';
import { MOUNTAINS, isGiant } from './data.js';

const C = {
  bg: 0xd9d4c8, ground: 0xd2ccbf, slab: 0xc4bdb0, slabSide: 0x8f897d, ink: 0x161616, accent: 0xff4f12,
  concrete: 0xb3ada2, concreteDark: 0x77726a, white: 0xf0ece4, rubble: 0x8c877f, iron: 0x3a3936,
};

// ── post-processing shaders ──────────────────────────────────
const TiltShader = {
  uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2(1, 0) }, focus: { value: 0.52 }, band: { value: 0.1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 dir; uniform float focus; uniform float band; varying vec2 vUv;
    void main(){
      float d = abs(vUv.y - focus);
      float s = smoothstep(band, band + 0.38, d);
      vec2 o = dir * s;
      vec4 c = texture2D(tDiffuse, vUv) * 0.2270270270;
      c += texture2D(tDiffuse, vUv + o * 1.3846153846) * 0.3162162162;
      c += texture2D(tDiffuse, vUv - o * 1.3846153846) * 0.3162162162;
      c += texture2D(tDiffuse, vUv + o * 3.2307692308) * 0.0702702703;
      c += texture2D(tDiffuse, vUv - o * 3.2307692308) * 0.0702702703;
      gl_FragColor = c;
    }`,
};
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, grain: { value: 0.03 }, res: { value: new THREE.Vector2(1, 1) } },
  vertexShader: TiltShader.vertexShader,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time; uniform float grain; uniform vec2 res; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = (vUv - 0.5) * vec2(1.15, 1.0);
      c.rgb *= mix(0.74, 1.0, smoothstep(0.92, 0.28, length(d)));
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(vec3(l), c.rgb, 1.12);
      c.rgb += (hash(floor(vUv * res) + fract(time * 7.0) * 91.0) - 0.5) * grain;
      gl_FragColor = c;
    }`,
};

// ── small helpers ────────────────────────────────────────────
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function valueNoise(seed) {
  const r = rng(seed), S = 64, g = new Float32Array(S * S);
  for (let i = 0; i < g.length; i++) g[i] = r();
  const at = (x, y) => g[((y % S + S) % S) * S + ((x % S + S) % S)];
  const sm = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, ...o });
const glow = (color = C.accent, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });
function inst(geo, mat, max, shadow = true) {
  const m = new THREE.InstancedMesh(geo, mat, max);
  m.count = 0; m.frustumCulled = false; m.castShadow = shadow; m.receiveShadow = shadow;
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return m;
}
function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
const visCount = (n, max, k = 1.6) => (n <= 0 ? 0 : Math.min(max, Math.ceil(Math.sqrt(n) * k)));
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();
function setInst(mesh, i, x, y, z, sx = 1, sy = 1, sz = 1, ry = 0, rx = 0, rz = 0) {
  _p.set(x, y, z); _e.set(rx, ry, rz); _q.setFromEuler(_e); _s.set(sx, sy, sz);
  mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
}

// ── particles (cube smoke / debris) ──────────────────────────
class Particles {
  constructor(scene, max, mat, size, gravity) {
    this.mesh = inst(new THREE.BoxGeometry(size, size, size), mat, max, false);
    this.mesh.castShadow = gravity !== 0;
    this.p = []; this.max = max; this.gravity = gravity;
    this.mesh.setColorAt(0, new THREE.Color(0xffffff));
    scene.add(this.mesh);
  }
  spawn(x, y, z, vx, vy, vz, life, scale = 1, color = null) {
    if (this.p.length >= this.max) return;
    this.p.push({ x, y, z, vx, vy, vz, life, t: 0, scale, color, rot: Math.random() * 6 });
  }
  update(dt) {
    let n = 0;
    for (let i = this.p.length - 1; i >= 0; i--) {
      const q = this.p[i];
      q.t += dt;
      if (q.t >= q.life) { this.p.splice(i, 1); continue; }
      q.vy += this.gravity * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      if (this.gravity < 0 && q.y < 0.15) { q.y = 0.15; q.vy *= -0.3; q.vx *= 0.6; q.vz *= 0.6; }
    }
    for (const q of this.p) {
      const k = q.t / q.life;
      const s = this.gravity < 0 ? q.scale * (1 - k * k) : q.scale * (0.4 + k * 1.6) * (1 - k * 0.6);
      setInst(this.mesh, n, q.x, q.y, q.z, s, s, s, q.rot + q.t, q.rot * 0.5);
      if (q.color) this.mesh.setColorAt(n, _c.set(q.color));
      else this.mesh.setColorAt(n, _c.setRGB(1, 1, 1));
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

// ── mountain shapes: (u, v) are cell coords / R; return column height (and lava flag) ──
const pos0 = v => Math.max(0, v);
const SHAPES = {
  peak: (u, v, H, n1, n2, x, z) => {
    const fall = pos0(1 - Math.hypot(u, v));
    let h = H * Math.pow(fall, 1.35);
    h = Math.max(h, H * 0.62 * Math.pow(pos0(1 - Math.hypot(u - 0.38, v + 0.3) / 0.55), 1.6));
    return { h: h + (n1(x * 0.16 + 3, z * 0.16) - 0.5) * 9 * fall + (n2(x * 0.45, z * 0.45) - 0.5) * 3 * fall };
  },
  twin: (u, v, H, n1, n2, x, z) => {
    const a = pos0(1 - Math.hypot(u + 0.42, v + 0.05) / 0.62), b = pos0(1 - Math.hypot(u - 0.45, v - 0.12) / 0.56);
    const saddle = H * 0.32 * Math.pow(pos0(1 - Math.hypot(u * 0.6, v * 1.4)), 1.2);
    const fall = pos0(1 - Math.hypot(u, v) * 0.85);
    return { h: Math.max(H * 1.0 * Math.pow(a, 1.25), H * 0.82 * Math.pow(b, 1.25), saddle) + (n1(x * 0.18, z * 0.18) - 0.5) * 7 * fall };
  },
  mesa: (u, v, H, n1, n2, x, z) => {
    const d = Math.hypot(u, v * 1.15) + (n1(x * 0.12, z * 0.12) - 0.5) * 0.22;
    let h = d < 0.66 ? H * 0.48 : d < 0.92 ? H * 0.48 * Math.pow((0.92 - d) / 0.26, 0.55) : 0;
    const butte = Math.hypot(u + 0.25, v + 0.2);
    if (butte < 0.24) h = H * 0.66;
    return { h: h > 0 ? h + (n2(x * 0.5, z * 0.5) - 0.5) * 1.6 : 0 };
  },
  volcano: (u, v, H, n1, n2, x, z) => {
    const d = Math.hypot(u, v) + (n1(x * 0.2, z * 0.2) - 0.5) * 0.08;
    const rim = H * 0.86 * Math.pow(0.8, 1.05);
    if (d < 0.2) return { h: rim - (0.2 - d) / 0.2 * H * 0.26, lava: d < 0.15 };
    return { h: H * 0.86 * Math.pow(pos0(1 - d), 1.05) + (n2(x * 0.4, z * 0.4) - 0.5) * 2.5 * pos0(1 - d) };
  },
  ridge: (u, v, H, n1, n2, x, z) => {
    const a = -0.8, uu = u * Math.cos(a) + v * Math.sin(a), vv = -u * Math.sin(a) + v * Math.cos(a);
    const d = Math.hypot(uu / 1.12, vv / 0.42);
    const fall = pos0(1 - d);
    const jag = (n2(x * 0.35, z * 0.35) - 0.5) * 9 + (n1(x * 0.11, z * 0.11) - 0.5) * 10;
    return { h: H * 0.72 * Math.pow(fall, 0.9) + jag * fall };
  },
  spire: (u, v, H, n1, n2, x, z) => {
    const d = Math.hypot(u, v);
    const needle = H * 1.35 * Math.pow(pos0(1 - d / 0.5), 1.5);
    const apron = H * 0.24 * Math.pow(pos0(1 - d), 1.8);
    return { h: Math.max(needle, apron) + (n2(x * 0.5, z * 0.5) - 0.5) * 2 * pos0(1 - d) };
  },
  ziggurat: (u, v) => {
    const c = Math.max(Math.abs(u), Math.abs(v)) / 0.82;
    return { h: c < 1 ? (Math.floor((1 - c) * 7) + 1) * 34 * 0.11 : 0 };
  },
  monolith: (u, v, H, n1) => {
    // a perfect slab with a slightly chamfered crown
    const a = 0.35, uu = u * Math.cos(a) + v * Math.sin(a), vv = -u * Math.sin(a) + v * Math.cos(a);
    const du = Math.abs(uu) / 0.42, dv = Math.abs(vv) / 0.72;
    if (du > 1 || dv > 1) return { h: 0 };
    const edge = Math.max(du, dv);
    return { h: H * 0.8 - (edge > 0.9 ? (edge - 0.9) * 30 : 0) };
  },
  cluster: (u, v, H, n1, n2, x, z) => {
    let h = 0;
    for (let i = 0; i < 8; i++) {
      const a = i * 2.39996, rr = i === 0 ? 0 : 0.28 + 0.45 * n1(i * 7.3, 1.7);
      const cu = Math.cos(a) * rr, cv = Math.sin(a) * rr, size = 0.22 + 0.16 * n1(i * 3.1, 9.2);
      const d = Math.hypot(u - cu, v - cv) / size;
      h = Math.max(h, H * (0.32 + 0.3 * n1(i * 5.7, 4.4)) * Math.pow(pos0(1 - d), 1.2));
    }
    return { h: h > 0 ? h + (n2(x * 0.4, z * 0.4) - 0.5) * 2 : 0 };
  },
  arch: (u, v, H, n1, n2, x, z) => {
    const a = -0.8, uu = u * Math.cos(a) + v * Math.sin(a), vv = -u * Math.sin(a) + v * Math.cos(a);
    const jag = (n2(x * 0.4, z * 0.4) - 0.5) * 2.5;
    // two pillars
    const p1 = Math.hypot(uu + 0.55, vv * 1.2) / 0.3, p2 = Math.hypot(uu - 0.55, vv * 1.2) / 0.3;
    const pillar = H * 0.78 * Math.pow(pos0(1 - Math.min(p1, p2)), 0.35);
    // the bridge: a band floating between them (voxels from lo to h)
    if (Math.abs(uu) < 0.58 && Math.abs(vv) < 0.16) {
      const sag = 1 - Math.pow(uu / 0.58, 2);
      const hi = H * 0.72 - sag * H * 0.06 + jag, lo = H * 0.5 - sag * H * 0.08;
      if (pillar > lo) return { h: Math.max(pillar, hi) };
      return { h: hi, lo };
    }
    const apron = H * 0.14 * Math.pow(pos0(1 - Math.hypot(uu / 1.05, vv / 0.5)), 1.4);
    return { h: Math.max(pillar, apron) + (pillar > 1 ? jag : 0) };
  },
  glacier: (u, v, H, n1, n2, x, z) => {
    const d = Math.hypot(u * 0.9, v * 1.1);
    if (d >= 1) return { h: 0 };
    const crevasse = Math.abs(n1(x * 0.09, z * 0.09) - 0.5) < 0.04 ? -4 : 0;
    return { h: H * 0.5 * Math.pow(1 - d * d, 0.6) + (n2(x * 0.2, z * 0.2) - 0.5) * 3 + crevasse };
  },
  tilted: (u, v, H, n1, n2, x, z) => {
    const a = 0.25, uu = u * Math.cos(a) + v * Math.sin(a), vv = -u * Math.sin(a) + v * Math.cos(a);
    if (Math.abs(uu) > 0.78 || Math.abs(vv) > 0.62) return { h: 0 };
    return { h: 2 + H * 1.05 * (0.78 - uu) / 1.56 + (n2(x * 0.5, z * 0.5) - 0.5) * 1.5 };
  },
  crystal: (u, v, H, n1, n2, x, z) => {
    let h = H * 0.18 * Math.pow(pos0(1 - Math.hypot(u, v) / 0.95), 1.3);
    for (let i = 0; i < 14; i++) {
      const a = i * 2.39996, rr = i === 0 ? 0 : 0.12 + 0.62 * n1(i * 4.9, 2.3);
      const cu = Math.cos(a) * rr, cv = Math.sin(a) * rr;
      const d = Math.hypot(u - cu, v - cv) / (0.07 + 0.06 * n1(i * 2.2, 8.1));
      h = Math.max(h, H * (0.5 + 0.75 * n1(i * 6.1, 3.3)) * (1 - rr * 0.5) * Math.pow(pos0(1 - d), 0.8));
    }
    return { h };
  },
  // ── Tectonic Assets ──
  shelf: (u, v, H, n1, n2, x, z) => {
    // a continent-sized stepped plateau with a ragged coastline
    const d = Math.hypot(u * 0.78, v * 1.08) + (n1(x * 0.06, z * 0.06) - 0.5) * 0.3;
    if (d >= 0.98) return { h: 0 };
    const t = Math.min(1, (0.98 - d) / 0.55);
    const step = Math.floor(t * 6) / 6;
    return { h: H * (0.12 + 0.36 * step) + (n2(x * 0.3, z * 0.3) - 0.5) * 1.8 };
  },
  shield: (u, v, H, n1, n2, x, z) => {
    // a vast, gentle shield volcano with a stepped caldera
    const d = Math.hypot(u, v) + (n1(x * 0.1, z * 0.1) - 0.5) * 0.06;
    if (d >= 1) return { h: 0 };
    const h = H * 0.62 * Math.pow(1 - Math.pow(d, 1.7), 0.75);
    if (d < 0.22) return { h: h - H * (d < 0.12 ? 0.16 : 0.08) };
    return { h: h + (n2(x * 0.35, z * 0.35) - 0.5) * 2 * (1 - d) };
  },
  hollow: (u, v, H, n1, n2, x, z) => {
    // a thick outer shell with a second, denser mountain inside it
    const d = Math.hypot(u, v);
    const h = H * 0.92 * Math.pow(pos0(1 - d), 1.05) + (n1(x * 0.16, z * 0.16) - 0.5) * 6 * pos0(1 - d);
    const inner = H * 0.72 * Math.pow(pos0(1 - d / 0.58), 1.25) + (n2(x * 0.4, z * 0.4) - 0.5) * 1.5 * pos0(1 - d / 0.58);
    if (inner <= 0.5) return { h };
    return { h, inner, lo: Math.max(inner + 2.5, h - 4) };
  },
  pangaea: (u, v, H, n1, n2, x, z) => {
    // every landform at once: a spine, peaks, plateaus and a stray volcano
    const a = -0.6, uu = u * Math.cos(a) + v * Math.sin(a), vv = -u * Math.sin(a) + v * Math.cos(a);
    const base = Math.hypot(u * 0.82, v * 0.95) + (n1(x * 0.05, z * 0.05) - 0.5) * 0.35;
    if (base >= 1) return { h: 0 };
    const land = H * 0.16 * Math.pow(1 - base, 0.5);
    const spine = H * 0.95 * Math.pow(pos0(1 - Math.hypot(uu / 0.95, vv / 0.2)), 1.1);
    const peaks = [[-0.45, 0.4, 0.3, 0.85], [0.5, -0.35, 0.26, 0.7], [0.2, 0.55, 0.22, 0.6]]
      .reduce((m, [cu, cv, r, k]) => Math.max(m, H * k * Math.pow(pos0(1 - Math.hypot(u - cu, v - cv) / r), 1.3)), 0);
    const mesa = Math.hypot(u + 0.5, v + 0.45) < 0.26 ? H * 0.36 : 0;
    const jag = (n2(x * 0.3, z * 0.3) - 0.5) * 5;
    return { h: Math.max(land, spine + jag * 0.6, peaks + jag * 0.4, mesa) };
  },
  dome: (u, v, H, n1, n2, x, z) => {
    const d = Math.hypot(u * 0.95, v * 1.05);
    return { h: d < 1 ? H * 0.6 * Math.sqrt(1 - d * d) + (n1(x * 0.15, z * 0.15) - 0.5) * 2.5 : 0 };
  },
};
const PALETTES = {
  granite:   { strata: [0x8b877f, 0x9a958c, 0x7f7b74, 0xa49f95, 0x918c83], cap: C.white, ore: C.accent, oreRate: 0.025 },
  slate:     { strata: [0x6f747a, 0x7c8187, 0x646970, 0x868b90], cap: 0xe8ecef, ore: C.accent, oreRate: 0.022 },
  sandstone: { strata: [0xb5714d, 0xc4845c, 0xa86643, 0xcf9a72, 0xb97c58], cap: null, ore: 0xf4efe6, oreRate: 0.02 },
  basalt:    { strata: [0x3a3836, 0x45423f, 0x302e2c, 0x4d4a46], cap: null, ore: C.accent, oreRate: 0.04 },
  shale:     { strata: [0x7d7468, 0x8a8174, 0x6f675c, 0x978d7f], cap: C.white, ore: C.accent, oreRate: 0.02 },
  quartz:    { strata: [0xc9c6d2, 0xd8d5df, 0xbbb8c6, 0xe4e1ea], cap: 0xffffff, ore: C.accent, oreRate: 0.02 },
  limestone: { strata: [0xd6c9a8, 0xbfae88, 0xe0d4b6, 0xa8977a], cap: null, ore: C.accent, oreRate: 0.015, tiers: true },
  concrete:  { strata: [0xa9a59e, 0xb4b0a8, 0x9d9992, 0xbcb8b0], cap: null, ore: C.accent, oreRate: 0.008 },
  moss:      { strata: [0x7d8a6a, 0x8a957a, 0x6f7c5f, 0x96a085], cap: 0xe9ece2, ore: C.accent, oreRate: 0.02 },
  rust:      { strata: [0x9a5a3c, 0xa8694a, 0x8a4e33, 0xb57a5a], cap: null, ore: 0xf0e6d8, oreRate: 0.02 },
  ice:       { strata: [0xd8e4ea, 0xcad9e2, 0xe6eef2, 0xbfd0da], cap: 0xffffff, ore: 0x6aa7c4, oreRate: 0.03 },
  coal:      { strata: [0x2f2f30, 0x3a3a3b, 0x262627, 0x444446], cap: null, ore: C.accent, oreRate: 0.03 },
  amethyst:  { strata: [0x6d5a7a, 0x7c6889, 0x5f4e6b, 0x8a779a], cap: null, ore: 0xd9c6ef, oreRate: 0.09 },
  shelf:     { strata: [0x9c9078, 0xaa9e84, 0x8e836c, 0xb8ad93, 0x7f8a6c], cap: null, ore: C.accent, oreRate: 0.012, tiers: true },
  mars:      { strata: [0xa4553a, 0xb46446, 0x934a31, 0xc07552, 0x8a4430], cap: null, ore: 0xe8d6c4, oreRate: 0.02 },
  hollow:    { strata: [0x5d5a57, 0x686461, 0x52504d, 0x726e6a], cap: C.white, ore: C.accent, oreRate: 0.015, inner: [0xd9b45a, 0xe6c46c, 0xc9a24a, 0xf0d27e] },
  pangaea:   { strata: [0x8b877f, 0xb5714d, 0x6f747a, 0x7d8a6a, 0x9a5a3c, 0xd6c9a8], cap: C.white, ore: C.accent, oreRate: 0.03 },
  marble:    { strata: [0xeeeae3, 0xe2ddd4, 0xf6f3ee, 0xd8d2c8], cap: null, ore: 0x55524e, oreRate: 0.06 },
};

// ═════════════════════════════════════════════════════════════
export class Site {
  constructor(container, { onMine } = {}) {
    this.container = container;
    this.onMine = onMine;
    this.time = 0;
    this.settings = { tilt: true, tiltStrength: 1, grain: true, autoRotate: false };

    const renderer = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(C.bg);
    scene.fog = new THREE.Fog(C.bg, 140, 260);

    this.viewSize = 88;
    const cam = this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 600);
    this.target = new THREE.Vector3(5, 5, -3);
    cam.position.copy(this.target).add(new THREE.Vector3(70, 62, 70));
    cam.lookAt(this.target);

    const ctl = this.controls = new OrbitControls(cam, renderer.domElement);
    ctl.target.copy(this.target);
    ctl.enableDamping = true; ctl.dampingFactor = 0.08;
    ctl.minPolarAngle = 0.55; ctl.maxPolarAngle = 1.15;
    ctl.minZoom = 0.6; ctl.maxZoom = 3.5;
    ctl.screenSpacePanning = true; ctl.rotateSpeed = 0.5;
    ctl.autoRotateSpeed = 0.35;

    // lights
    scene.add(new THREE.HemisphereLight(0xfffaf0, 0x8d877b, 1.15));
    const sun = this.sun = new THREE.DirectionalLight(0xfff3e2, 2.3);
    sun.position.set(-25, 70, 40); sun.target.position.set(10, 0, -2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 1, far: 220 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    scene.add(sun, sun.target);

    this.buildWorld();
    this.buildMountain();
    this.buildAgents();
    this.buildYard();
    this.buildTown();

    // post
    const composer = this.composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, cam));
    this.tilt = [new ShaderPass(TiltShader), new ShaderPass(TiltShader), new ShaderPass(TiltShader), new ShaderPass(TiltShader)];
    this.tilt.forEach(p => composer.addPass(p));
    this.grade = new ShaderPass(GradeShader);
    composer.addPass(this.grade);
    composer.addPass(new OutputPass());

    this.resize();
    addEventListener('resize', () => this.resize());
    this.bindPointer();
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight, a = w / h;
    const v = this.viewSize;
    Object.assign(this.camera, { left: -v * a / 2, right: v * a / 2, top: v / 2, bottom: -v / 2 });
    // keep the diorama centred in the area not covered by the operations panel
    const side = w > 980 ? 440 : 0, bottom = w > 980 ? 0 : h * 0.46;
    this.camera.setViewOffset(w, h, side / 2, bottom / 2, w, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.w = w; this.h = h;
    this.applyTilt();
    this.grade.uniforms.res.value.set(w, h);
  }
  applyTilt() {
    const k = this.settings.tilt ? this.settings.tiltStrength : 0;
    const amt = [2.6, 2.6, 1.2, 1.2];
    this.tilt.forEach((p, i) => {
      p.enabled = k > 0;
      const horiz = i % 2 === 0;
      p.uniforms.dir.value.set(horiz ? amt[i] * k / this.w : 0, horiz ? 0 : amt[i] * k / this.h);
    });
    this.grade.uniforms.grain.value = this.settings.grain ? 0.032 : 0;
  }
  setSettings(s) {
    Object.assign(this.settings, s);
    this.controls.autoRotate = !!this.settings.autoRotate;
    if (this.w) this.applyTilt();
  }

  bindPointer() {
    const el = this.renderer.domElement;
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    let down = null;
    el.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
    el.addEventListener('pointerup', e => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 6) return;
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, this.camera);
      const hit = ray.intersectObject(this.mountain, false)[0];
      if (hit && this.onMine) {
        const amt = this.onMine(e.clientX, e.clientY);
        if (amt > 0) this.burst(hit.point, 6);
      }
    });
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, this.camera);
      el.style.cursor = ray.intersectObject(this.mountain, false).length ? 'pointer' : 'grab';
    });
  }

  // ── static world ─────────────────────────────────────────
  buildWorld() {
    const s = this.scene;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), std(C.ground));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -6; ground.receiveShadow = true;
    s.add(ground);
    // the diorama plinth
    box(108, 6, 76, std(C.slabSide), 10, -3.02, -2, s);
    const top = box(104, 0.2, 72, std(C.slab), 10, -0.1, -2, s);
    top.castShadow = false;
    // trim line (accent)
    box(108.2, 0.35, 0.35, glow(C.accent), 10, -1.2, 36.1, s);
    box(0.35, 0.35, 76.2, glow(C.accent), 64.1, -1.2, -2, s);

    // dirt track from face to yard
    this.A = new THREE.Vector3(12, 0, 12);    // face rubble pile
    this.B = new THREE.Vector3(32, 0, 12);    // yard stockpile
    box(20, 0.06, 6.5, std(0xb7ae9e), 22, 0.03, 12.5, s).castShadow = false;

    // stockpiles
    const pileGeo = new THREE.ConeGeometry(1, 1, 7, 1);
    pileGeo.translate(0, 0.5, 0);
    const pileMat = std(C.rubble, { flatShading: true });
    this.facePile = new THREE.Mesh(pileGeo, pileMat); this.facePile.position.copy(this.A); this.facePile.castShadow = true;
    this.yardPile = new THREE.Mesh(pileGeo, pileMat); this.yardPile.position.copy(this.B); this.yardPile.castShadow = true;
    s.add(this.facePile, this.yardPile);

    // particles
    this.debris = new Particles(s, 260, std(0xffffff), 0.32, -22);
    this.smoke = new Particles(s, 220, new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 1, transparent: true, opacity: 0.55, depthWrite: false }), 0.7, 0);

    // HQ: grows one cantilevered floor per research
    this.hqBase = new THREE.Vector3(-6, 0, 27);
    box(7, 0.6, 7, std(C.concreteDark), -6, 0.3, 27, s);
    this.hq = inst(new THREE.BoxGeometry(1, 1, 1), std(C.concrete), 64);
    this.hq.setColorAt(0, _c.set(C.concrete));
    s.add(this.hq);
    this.beacon = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.4, 0.6), glow());
    s.add(this.beacon);
  }

  // zoom the camera, fog and shadows out for a giant mountain (and back in for a normal one)
  frame(scale, cx, cz, radius, height) {
    const giant = scale > 1;
    const target = giant ? new THREE.Vector3(cx * 0.55 + 18 * 0.45, height * 0.2, cz * 0.55 + 4 * 0.45) : new THREE.Vector3(5, 5, -3);
    const key = giant ? `${scale}:${cx}` : 'normal';
    if (this.frameKey === key) return;
    const first = this.frameKey == null;
    this.frameKey = key;
    this.viewSize = 88 * (giant ? scale * 1.05 : 1);
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    this.target.copy(target); this.controls.target.copy(target);
    this.camera.position.copy(target).addScaledVector(dir, 117.5 * (giant ? scale : 1));
    this.camera.far = 600 * (giant ? scale * 1.4 : 1);
    this.scene.fog.near = 140 * (giant ? scale : 1); this.scene.fog.far = 260 * (giant ? scale * 1.25 : 1);
    const sc = this.sun.shadow.camera, ext = giant ? Math.max(75, radius + 40) : 75;
    Object.assign(sc, { left: -ext, right: ext, top: ext, bottom: -ext, far: 220 * (giant ? scale : 1) });
    this.sun.position.set(target.x - 30, 70 * (giant ? scale * 0.8 : 1), target.z + 42);
    this.sun.target.position.set(target.x + 5, 0, target.z + 1);
    this.sun.shadow.mapSize.set(giant ? 4096 : 2048, giant ? 4096 : 2048);
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    sc.updateProjectionMatrix();
    this.camera.zoom = 1;
    if (!first) this.resize();
  }

  // ── the mountain ─────────────────────────────────────────
  buildMountain(def = MOUNTAINS[0], seed = 7) {
    if (this.mountain) {
      this.scene.remove(this.mountain);
      this.mountain.geometry.dispose(); this.mountain.material.dispose();
      for (const list of this.miners || []) for (const a of list) a.k = -1;
    }
    if (this.giantBase) { this.scene.remove(this.giantBase); this.giantBase.geometry.dispose(); this.giantBase.material.dispose(); this.giantBase = null; }
    this.mtnKey = def.id + ':' + seed;
    this.mtnDef = def;
    // Tectonic Assets are drawn `scale`× bigger with voxels of size `vs`: (scale/vs)³ × the voxel count,
    // set back behind the diorama, with the camera zoomed out to fit
    const giant = isGiant(def), scale = giant ? def.scale : 1, vs = giant ? def.vox : 1, k = scale / vs;
    const N = Math.round(54 * k), R = 22 * k, H = 34 * k;
    const off = 22 * (scale - 1);
    const cx = -12 - off * 1.05, cz = -6 - off * 0.95;
    this.voxS = vs;
    const n1 = valueNoise(seed), n2 = valueNoise(seed + 12), r = rng(seed + 35);
    const shape = SHAPES[def.shape] || SHAPES.peak;
    const pal = PALETTES[def.palette] || PALETTES.granite;
    const vox = [];
    this.lava = [];
    const layered = !!def.phase2;     // the whole outer mountain goes before the inner one
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x = i - N / 2 + 0.5, z = j - N / 2 + 0.5;
      // shapes work in the classic mountain's units; heights are scaled up to the finer grid
      const res = shape(x / R, z / R, 34, (a, b) => n1(a, b), (a, b) => n2(a, b), x / k, z / k);
      const top = Math.max(0, Math.floor(res.h * k)), lo = (res.lo || 0) * k, inner = Math.floor((res.inner || 0) * k);
      const wx = x * vs + cx, wz = z * vs + cz;
      // inner mountain (hollow shape): kept until the shell is gone
      for (let y = 0; y < inner; y++) vox.push({ x: wx, y: y * vs, cy: y, z: wz, top: inner, inner: true, key: y + 0.06 * x + r() * 2.6 });
      for (let y = Math.max(inner, Math.floor(lo)); y < top; y++)
        vox.push({ x: wx, y: y * vs, cy: y, z: wz, top, lava: res.lava && y === top - 1, key: y + 0.06 * x + r() * 2.6 + (layered ? 1e4 : 0) });
    }
    // removal order: highest key first (top-down, quarry face toward the yard)
    vox.sort((a, b) => b.key - a.key);
    this.total = vox.length;
    this.vox = vox;
    this.shellN = def.phase2 ? vox.filter(v => !v.inner).length : 0;
    this.giant = giant;
    this.frame(giant ? def.scale : 1, cx, cz, R * vs, H * vs);
    if (giant) {
      // a raised bedrock slab so the giant doesn't float off the edge of the plinth
      const w = (N + 4) * vs;
      this.giantBase = box(w, 6, w, std(C.slabSide), cx, -3.05, cz, this.scene);
      this.giantBase.castShadow = false;
    }
    this.mountainCenter = new THREE.Vector3(cx, 0, cz);
    const peak = vox.reduce((a, v) => (v.y > a.y ? v : a), vox[0]);
    this.summit = new THREE.Vector3(def.shape === 'volcano' ? cx : peak.x, peak.y + vs, def.shape === 'volcano' ? cz : peak.z);

    const geo = new THREE.BoxGeometry(0.97 * vs, 0.97 * vs, 0.97 * vs);
    const mesh = this.mountain = new THREE.InstancedMesh(geo, std(0xffffff), vox.length);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    const cr = rng(seed - 4);
    vox.forEach((v, i) => {
      let col;
      const y = v.cy;
      if (v.lava) col = C.accent;
      else if (v.inner && pal.inner) col = cr() < 0.06 ? C.accent : pal.inner[Math.floor(y / (3 * k)) % pal.inner.length];
      else if (pal.cap && (y > H * 0.74 || (y === v.top - 1 && y > H * 0.6))) col = pal.cap;
      else if (cr() < pal.oreRate) col = pal.ore;
      else if (pal.tiers) col = pal.strata[Math.floor(v.top > 0 ? y / (H * 0.11) : 0) % pal.strata.length];
      else col = pal.strata[(Math.floor((y + Math.sin(v.x * 0.3 / vs) * 1.2 * k) / (3 * k)) % pal.strata.length + pal.strata.length) % pal.strata.length];
      _c.set(col);
      const j = 0.94 + cr() * 0.1; _c.multiplyScalar(j);
      v.color = _c.getHex();
      mesh.setColorAt(i, _c);
      setInst(mesh, i, v.x, v.y + 0.5 * vs, v.z);
    });
    mesh.instanceColor.needsUpdate = true;
    this.scene.add(mesh);
    this.removed = 0;
  }
  setRemoved(count, fx) {
    count = Math.max(0, Math.min(this.total, count));
    if (count === this.removed) return;
    const m = this.mountain;
    if (count < this.removed) {
      for (let i = count; i < this.removed; i++) { const v = this.vox[i]; setInst(m, i, v.x, v.y + 0.5 * this.voxS, v.z); }
    } else {
      let spawned = 0;
      for (let i = this.removed; i < count; i++) {
        const v = this.vox[i];
        setInst(m, i, v.x, -500, v.z, 0.001, 0.001, 0.001);
        if (fx && spawned < 14) {
          spawned++;
          this.debris.spawn(v.x, v.y + 0.5 * this.voxS, v.z, (Math.random() - 0.3) * 6, 4 + Math.random() * 5, (Math.random() - 0.3) * 6, 1.4 + Math.random(), 1, v.color);
        }
      }
    }
    this.removed = count;
    m.instanceMatrix.needsUpdate = true;
  }
  front(offset = 0) {
    const k = Math.min(this.total - 1, this.removed + offset);
    const v = this.vox[k];
    return _p.set(v.x, v.y + this.voxS, v.z);
  }
  burst(p, n) {
    for (let i = 0; i < n; i++)
      this.debris.spawn(p.x, p.y + 0.3, p.z, (Math.random() - 0.5) * 7, 3 + Math.random() * 5, (Math.random() - 0.5) * 7, 1 + Math.random() * 0.6, 0.8, C.accent);
  }

  // ── agents: miners & haulers per era ─────────────────────
  buildAgents() {
    const s = this.scene;
    const dark = std(0x1c1c1c), orange = std(C.accent, { roughness: 0.7 }), white = std(C.white), iron = std(C.iron, { roughness: 0.6, metalness: 0.3 });

    // mining
    const peasant = inst(new THREE.BoxGeometry(0.42, 0.9, 0.42).translate(0, 0.45, 0), dark, 90);
    const helmet = inst(new THREE.BoxGeometry(0.4, 0.28, 0.4).translate(0, 1.02, 0), orange, 90);
    const drill = inst(new THREE.CylinderGeometry(0.32, 0.45, 1.2, 8).translate(0, 0.6, 0), iron, 40);
    const exBody = inst(new THREE.BoxGeometry(1.3, 0.8, 1.7).translate(0, 0.45, 0), orange, 30);
    const exArm = inst(new THREE.BoxGeometry(0.24, 0.24, 2.0).translate(0, 0, 1.0), dark, 30);
    const bore = inst(new THREE.CylinderGeometry(0.55, 0.55, 2.4, 12).rotateZ(Math.PI / 2).translate(0, 0.6, 0), white, 24);
    const boreTip = inst(new THREE.ConeGeometry(0.55, 0.8, 12).rotateZ(-Math.PI / 2).translate(1.6, 0.6, 0), orange, 24);
    s.add(peasant, helmet, drill, exBody, exArm, bore, boreTip);
    this.minerMeshes = [[peasant, helmet], [drill], [exBody, exArm], [bore, boreTip]];
    this.minerMax = [90, 40, 30, 24];
    this.miners = [[], [], [], []];

    // era V: orbital lasers
    const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true).translate(0, 0.5, 0);
    this.beams = [];
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      const core = new THREE.Mesh(beamGeo, glow(0xffe3c4, { transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
      const halo = new THREE.Mesh(beamGeo, glow(C.accent, { transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
      core.scale.set(0.14, 1, 0.14); halo.scale.set(0.5, 1, 0.5);
      g.add(core, halo); g.visible = false; g.userData = { core, halo };
      s.add(g); this.beams.push(g);
    }
    this.impact = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), glow(C.accent, { transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.impact.visible = false; s.add(this.impact);

    // era VI: the gravity spoon
    const spoon = this.spoon = new THREE.Group();
    const mono = std(0x151515, { roughness: 0.35, metalness: 0.4 });
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(3.4, 20, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mono);
    bowl.scale.set(1, 0.55, 1.35); bowl.castShadow = true;
    const handle = box(0.9, 0.5, 13, mono, 0, 0.1, -10.5, null); spoon.add(handle);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.12, 6, 48), glow(C.accent));
    ring.rotation.x = Math.PI / 2; ring.position.y = -1.6;
    spoon.add(bowl, ring); spoon.visible = false; spoon.userData.ring = ring;
    s.add(spoon);

    // hauling
    const barrow = inst(new THREE.BoxGeometry(0.75, 0.38, 0.5).translate(0, 0.25, 0), dark, 50);
    const barrowLoad = inst(new THREE.BoxGeometry(0.55, 0.22, 0.4).translate(0, 0.5, 0), std(C.rubble), 50);
    const cart = inst(new THREE.BoxGeometry(1.2, 0.7, 0.85).translate(0, 0.45, 0), iron, 30);
    const truck = inst(new THREE.BoxGeometry(2.6, 1.0, 1.4).translate(0, 0.65, 0), orange, 26);
    const truckCab = inst(new THREE.BoxGeometry(0.8, 0.8, 1.3).translate(1.6, 0.6, 0), white, 26);
    const drone = inst(new THREE.BoxGeometry(0.9, 0.16, 0.9), white, 40);
    const droneLed = inst(new THREE.BoxGeometry(0.25, 0.1, 0.25).translate(0, -0.1, 0), glow(), 40, false);
    const slug = inst(new THREE.BoxGeometry(0.6, 0.6, 0.6), glow(C.accent), 40, false);
    const mote = inst(new THREE.BoxGeometry(0.45, 0.45, 0.45), dark, 60);
    s.add(barrow, barrowLoad, cart, truck, truckCab, drone, droneLed, slug, mote);
    this.haulMeshes = [[barrow, barrowLoad], [cart], [truck, truckCab], [drone, droneLed], [slug], [mote]];
    this.haulMax = [50, 30, 26, 40, 40, 60];

    // hauling infrastructure (appears per era)
    const infra = this.haulInfra = [];
    const rails = new THREE.Group();
    box(20, 0.12, 0.12, iron, 22, 0.08, 9.6, rails); box(20, 0.12, 0.12, iron, 22, 0.08, 10.4, rails);
    for (let x = 12.5; x < 32; x += 1.1) box(0.25, 0.06, 1.5, std(0x6b5f52), x, 0.03, 10, rails);
    const road = new THREE.Group();
    box(21, 0.08, 3.2, std(0x2b2a28), 22, 0.05, 15.6, road).castShadow = false;
    for (let x = 13; x < 32; x += 2.2) box(1, 0.1, 0.14, glow(0xf0ece4), x, 0.07, 15.6, road).castShadow = false;
    const pad = new THREE.Group();
    box(2.2, 3.2, 2.2, std(C.concrete), this.A.x + 0.5, 1.6, 8, pad);
    box(0.6, 0.6, 6, std(C.ink), this.A.x + 2, 2.6, 8, pad).rotation.set(0, Math.PI / 2, -0.5);
    box(2.2, 3.2, 2.2, std(C.concrete), this.B.x - 0.5, 1.6, 8, pad);
    const portals = new THREE.Group();
    const torus = new THREE.TorusGeometry(2, 0.35, 8, 32);
    for (const [x, sign] of [[this.A.x + 2.5, 1], [this.B.x - 2.5, -1]]) {
      const t = new THREE.Mesh(torus, std(0x111111, { metalness: 0.5, roughness: 0.3 })); t.position.set(x, 3.6, 12); t.rotation.y = Math.PI / 2; t.castShadow = true;
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1.7, 32), glow(C.accent, { side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
      disc.position.copy(t.position); disc.rotation.y = Math.PI / 2;
      portals.add(t, disc);
    }
    infra.push(null, rails, road, null, pad, portals);
    for (const g of infra) if (g) { g.visible = false; s.add(g); }
    this.haulers = [[], [], [], [], [], []];
  }

  // ── processing yard ──────────────────────────────────────
  buildYard() {
    const s = this.scene;
    box(30, 0.1, 26, std(0xbab3a5), 46, 0.05, 12, s).castShadow = false;
    const slots = [[38, 4], [46, 4], [54, 4], [38, 19], [46, 19], [54, 19]];
    const conc = std(C.concrete), dark = std(C.concreteDark), ink = std(C.ink), white = std(C.white), orange = std(C.accent);
    const lit = glow(C.accent);
    const mk = [
      // I: sieve shed
      g => {
        for (const [x, z] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) box(0.3, 2.2, 0.3, dark, x, 1.1, z, g);
        box(4, 0.35, 4, conc, 0, 2.35, 0, g);
        const sieve = box(1.6, 0.15, 1.6, ink, 0, 0.9, 0, g);
        return t => { sieve.position.x = Math.sin(t * 9) * 0.15; };
      },
      // II: stamp mill
      g => {
        box(4, 3.4, 3.2, dark, 0, 1.7, 0, g);
        const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 7, 10), std(0x5d4f45)); ch.position.set(1.4, 3.5, -1); ch.castShadow = true; g.add(ch);
        const pist = [0, 1, 2].map(i => box(0.5, 1.4, 0.5, ink, -1.2 + i * 1.2, 4, 1.2, g));
        return (t, site, wp) => {
          pist.forEach((p, i) => { p.position.y = 3.9 + Math.abs(Math.sin(t * 5 + i * 2.1)) * 0.8; });
          if (Math.random() < 0.25) site.smoke.spawn(wp.x + 1.4 * g.scale.x, 7.2 * g.scale.y, wp.z - 1, 0.6 + Math.random() * 0.4, 1.6 + Math.random(), -0.3, 3.2, 1.1);
        };
      },
      // III: jaw crusher plant
      g => {
        box(5, 2.6, 3.6, conc, 0, 1.3, 0, g);
        const hop = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 0.8, 1.8, 4, 1), orange); hop.position.set(-0.8, 3.5, 0); hop.rotation.y = Math.PI / 4; hop.castShadow = true; g.add(hop);
        const belt = box(5.5, 0.3, 0.8, ink, -4.3, 1.8, 0, g); belt.rotation.z = -0.45;
        const fan = box(1.8, 0.15, 0.3, white, 1.6, 2.75, 0.8, g);
        return t => { fan.rotation.y = t * 6; if (Math.random() < 0.1) this.smoke.spawn(g.position.x + 1.5, 3, g.position.z, 0.4, 1, 0, 2, 0.8); };
      },
      // IV: AI sorting plant
      g => {
        box(4.4, 4.4, 4.4, white, 0, 2.2, 0, g);
        for (let i = 0; i < 4; i++) box(4.5, 0.18, 4.5, ink, 0, 0.8 + i * 1.0, 0, g).castShadow = false;
        const strip = box(0.25, 4.5, 0.25, lit, 2.25, 2.25, 2.25, g);
        const mast = box(0.15, 3, 0.15, ink, -1.4, 5.9, -1.4, g);
        const dish = box(1.3, 0.12, 1.3, white, -1.4, 7.4, -1.4, g);
        return t => { strip.material.color.setHSL(0.04, 1, 0.45 + Math.sin(t * 3) * 0.12); dish.rotation.y = t * 0.8; };
      },
      // V: matter disassembler
      g => {
        box(3, 9, 3, std(0x161616, { roughness: 0.4 }), 0, 4.5, 0, g);
        box(0.35, 7.5, 0.1, lit, 0, 4.6, 1.52, g).castShadow = false;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.14, 6, 40), orange); ring.position.y = 5; g.add(ring);
        return t => { ring.rotation.x = Math.PI / 2 + Math.sin(t * 0.7) * 0.4; ring.rotation.y = t * 0.9; ring.position.y = 5 + Math.sin(t * 1.3) * 2.5; };
      },
      // VI: reality refinery
      g => {
        box(5, 0.9, 5, conc, 0, 0.45, 0, g);
        const oct = new THREE.Mesh(new THREE.OctahedronGeometry(2.2, 0), white); oct.position.y = 5.5; oct.castShadow = true; g.add(oct);
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 3.6, 10), glow(C.accent, { transparent: true, opacity: 0.8 })); beam.position.y = 2.6; g.add(beam);
        return t => { oct.rotation.y = t * 0.6; oct.rotation.z = Math.sin(t * 0.5) * 0.3; oct.position.y = 5.5 + Math.sin(t * 1.1) * 0.5; };
      },
    ];
    this.plants = mk.map((f, i) => {
      const g = new THREE.Group();
      g.position.set(slots[i][0], 0, slots[i][1]);
      const anim = f(g);
      g.visible = false; g.userData = { anim, shown: 0 };
      s.add(g);
      return g;
    });
  }

  // ── company town ─────────────────────────────────────────
  buildTown() {
    const r = rng(11);
    this.townSlots = [];
    for (let row = 0; row < 4; row++) for (let col = 0; col < 9; col++) {
      this.townSlots.push({ x: 22 + col * 4.4 + (row % 2) * 1.2, z: -31 + row * 5.2, w: 2.2 + r() * 1.2, d: 2.2 + r() * 1.0, h: 0.6 + r() * 0.8, door: r() < 0.3 });
    }
    // order slots by distance from mine so town grows outward
    this.townSlots.sort((a, b) => Math.hypot(a.x - 18, a.z + 12) - Math.hypot(b.x - 18, b.z + 12));
    this.houses = inst(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), std(0xffffff), this.townSlots.length);
    this.townSlots.forEach((t, i) => this.houses.setColorAt(i, _c.set(t.door ? 0xc9c2b4 : 0xb8b1a4)));
    this.houses.instanceColor.needsUpdate = true;
    this.roofs = inst(new THREE.BoxGeometry(1, 0.18, 1), std(C.ink), this.townSlots.length);
    this.scene.add(this.houses, this.roofs);
    this.townKey = '';
  }

  // ── per-frame update from game state ─────────────────────
  update(g, dt) {
    this.time += dt;
    const t = this.time, run = g.run;
    const m = getMods(g), R = rates(g, m);

    // mountain (rebuilt when a new one is acquired)
    const def = mtnDef(run);
    if (this.mtnKey !== def.id + ':' + run.mtn.seed) this.buildMountain(def, run.mtn.seed);
    const frac = run.complete ? 1 : progress(g);
    const p2 = def.phase2;
    const want = p2 && this.shellN
      ? Math.floor(frac < p2.at ? frac / p2.at * this.shellN : this.shellN + (frac - p2.at) / (1 - p2.at) * (this.total - this.shellN))
      : Math.floor(frac * this.total);
    const before = this.removed;
    this.setRemoved(want, Math.abs(want - this.removed) < 400);
    this.lastRemoved = Math.max(0, this.removed - before);

    // piles
    const ff = Math.min(1, run.face / faceCap(R, m)), yf = Math.min(1, run.yard / yardCap(R, m));
    const pileScale = (p, f) => { const r = 0.4 + 3.4 * Math.sqrt(f); p.scale.set(r, 0.2 + 3 * f, r); p.visible = f > 0.002; };
    pileScale(this.facePile, ff); pileScale(this.yardPile, yf);

    const done = this.removed >= this.total;

    // miners (eras I–IV)
    for (let e = 0; e < 4; e++) {
      const n = done ? 0 : visCount(run.units.mining[e], this.minerMax[e], e === 0 ? 2.2 : 1.5);
      const list = this.miners[e];
      while (list.length < n) list.push({ k: -1, ox: Math.random() - 0.5, oz: Math.random() - 0.5, ph: Math.random() * 6, ry: Math.random() * 6 });
      list.length = n;
      const meshes = this.minerMeshes[e];
      const win = Math.max(1, Math.min(420, this.total - this.removed - 1));
      for (let i = 0; i < n; i++) {
        const a = list[i];
        if (a.k < this.removed || a.k >= this.total) { a.k = this.removed + Math.floor(Math.random() * win); a.ry = Math.random() * 6; }
        const v = this.vox[Math.min(this.total - 1, a.k)];
        const x = v.x + a.ox * 0.6, z = v.z + a.oz * 0.6, y = v.y + this.voxS;
        if (e === 0) {
          const bob = Math.abs(Math.sin(t * 6 + a.ph)) * 0.12;
          setInst(meshes[0], i, x, y + bob, z, 1, 1, 1, a.ry, Math.sin(t * 6 + a.ph) * 0.25);
          setInst(meshes[1], i, x, y + bob, z, 1, 1, 1, a.ry, Math.sin(t * 6 + a.ph) * 0.25);
        } else if (e === 1) {
          setInst(meshes[0], i, x, y + Math.abs(Math.sin(t * 22 + a.ph)) * 0.08, z, 1, 1, 1, a.ry);
          if (Math.random() < dt * 1.5) this.smoke.spawn(x, y + 1.3, z, 0.3, 1.4, 0.1, 2.2, 0.6);
        } else if (e === 2) {
          setInst(meshes[0], i, x, y, z, 1, 1, 1, a.ry);
          setInst(meshes[1], i, x, y + 1, z, 1, 1, 1, a.ry, -0.4 + Math.sin(t * 1.5 + a.ph) * 0.5);
        } else {
          setInst(meshes[0], i, x, y, z, 1, 1, 1, a.ry, t * 4);
          setInst(meshes[1], i, x, y, z, 1, 1, 1, a.ry);
        }
        if (Math.random() < dt * 0.6) this.debris.spawn(x, y + 0.3, z, (Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3, 0.9, 0.5, v.color);
      }
      for (const mesh of meshes) { mesh.count = n; mesh.instanceMatrix.needsUpdate = true; }
    }

    // era V lasers
    const nl = done ? 0 : Math.min(4, Math.ceil(Math.log2(run.units.mining[4] + 1) / 1.6));
    let anyBeam = false;
    for (let i = 0; i < 4; i++) {
      const b = this.beams[i];
      b.visible = i < nl;
      if (!b.visible) continue;
      anyBeam = true;
      const f = this.front(i * 37).clone();
      const sky = new THREE.Vector3(f.x - 40 + i * 9, 140, f.z - 30 - i * 6);
      const dir = f.clone().sub(sky), len = dir.length();
      b.position.copy(sky);
      b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      const pulse = 0.85 + Math.sin(t * 30 + i) * 0.15;
      b.userData.core.scale.set(0.14 * pulse, len, 0.14 * pulse);
      b.userData.halo.scale.set(0.55 * pulse, len, 0.55 * pulse);
      if (i === 0) { this.impact.position.copy(f); const s = 1 + Math.sin(t * 25) * 0.25; this.impact.scale.setScalar(s); }
      if (Math.random() < dt * 8) this.debris.spawn(f.x, f.y, f.z, (Math.random() - 0.5) * 8, 5 + Math.random() * 5, (Math.random() - 0.5) * 8, 1.2, 0.6, C.accent);
    }
    this.impact.visible = anyBeam;

    // era VI spoon
    this.spoon.visible = !done && run.units.mining[5] > 0;
    if (this.spoon.visible) {
      const f = this.front(0);
      const sp = this.spoon, k = (t * 0.25) % 1;
      const dip = Math.sin(k * Math.PI * 2);
      sp.position.set(f.x + 2, f.y + 7 + dip * 3, f.z + 2);
      sp.rotation.set(dip * 0.25, t * 0.15, 0);
      sp.userData.ring.material.color.setHSL(0.04, 1, 0.5 + dip * 0.1);
    }

    // haulers
    const A = this.A, B = this.B;
    const speeds = [0.035, 0.05, 0.07, 0.09, 0.22, 0.3];
    for (let e = 0; e < 6; e++) {
      const owned = run.units.extraction[e];
      if (this.haulInfra[e]) this.haulInfra[e].visible = owned > 0;
      const n = visCount(owned, this.haulMax[e], e >= 4 ? 3 : 1.6);
      const list = this.haulers[e];
      while (list.length < n) list.push({ ph: Math.random(), lane: Math.random() - 0.5 });
      list.length = n;
      const meshes = this.haulMeshes[e];
      for (let i = 0; i < n; i++) {
        const a = list[i];
        const p = (t * speeds[e] + a.ph) % 1;
        if (e <= 3) {
          const going = p < 0.5, s = going ? p * 2 : 2 - p * 2;
          const x = A.x + 1.5 + (B.x - A.x - 3) * s;
          const lanes = [13.2, 10, 15.6, 12];
          let z = lanes[e] + (going ? 0.55 : -0.55) + (e === 0 || e === 3 ? a.lane * 1.2 : 0);
          let y = 0, ry = going ? 0 : Math.PI;
          if (e === 3) y = 2.5 + Math.sin(s * Math.PI) * 5 + Math.sin(t * 3 + i) * 0.2;
          setInst(meshes[0], i, x, y, z, 1, 1, 1, ry);
          if (meshes[1]) {
            const loaded = going ? 1 : 0.001;
            setInst(meshes[1], i, x, y, z, e === 0 ? loaded : 1, e === 0 ? loaded : 1, e === 0 ? loaded : 1, ry);
          }
        } else if (e === 4) {
          const x = A.x + 2 + (B.x - A.x - 4) * p, z = 8 + a.lane * 0.6;
          const y = 3.5 + 4 * 16 * p * (1 - p);
          setInst(meshes[0], i, x, y, z, 1, 1, 1, t * 5, t * 3);
        } else {
          // into portal A, out of portal B
          const pa = new THREE.Vector3(A.x + 2.5, 3.6, 12), pb = new THREE.Vector3(B.x - 2.5, 3.6, 12);
          let x, y, z, sc;
          if (p < 0.5) { const s = p * 2; x = A.x + (pa.x - A.x) * s; y = 0.5 + (pa.y - 0.5) * s; z = 12 + a.lane * 3 * (1 - s); sc = 1 - s * 0.8; }
          else { const s = (p - 0.5) * 2; x = pb.x + (B.x - pb.x) * s; y = pb.y + (0.5 - pb.y) * s; z = 12 + a.lane * 3 * s; sc = 0.2 + s * 0.8; }
          setInst(meshes[0], i, x, y, z, sc, sc, sc, t * 2 + i, t);
        }
      }
      for (const mesh of meshes) { mesh.count = n; mesh.instanceMatrix.needsUpdate = true; }
    }

    // processing plants
    for (let e = 0; e < 6; e++) {
      const p = this.plants[e], n = run.units.processing[e];
      const target = n > 0 ? Math.min(1.7, 0.85 + 0.11 * Math.log2(n)) : 0;
      p.userData.shown += (target - p.userData.shown) * Math.min(1, dt * 4);
      const sc = p.userData.shown;
      p.visible = sc > 0.02;
      if (p.visible) { p.scale.setScalar(sc); p.userData.anim(t, this, p.position); }
    }

    // company town grows with generations; style with era
    const houses = Math.min(this.townSlots.length, 3 + run.gen * 3);
    const key = houses + ':' + run.era;
    if (key !== this.townKey) {
      this.townKey = key;
      const hMul = [1.2, 1.6, 3.2, 5, 7, 9][run.era];
      this.townSlots.forEach((s, i) => {
        if (i >= houses) return;
        const h = s.h * hMul + 0.6;
        setInst(this.houses, i, s.x, 0, s.z, s.w, h, s.d);
        setInst(this.roofs, i, s.x, h + 0.09, s.z, s.w + 0.3, 1, s.d + 0.3);
      });
      this.houses.count = houses; this.roofs.count = houses;
      this.houses.instanceMatrix.needsUpdate = true; this.roofs.instanceMatrix.needsUpdate = true;
    }

    // HQ floors = research completed
    const floors = Object.keys(run.research).length + 1;
    if (floors !== this.hqFloors) {
      this.hqFloors = floors;
      const r = rng(5);
      for (let i = 0; i < floors; i++) {
        const w = 4 + r() * 2.5, d = 4 + r() * 2.5;
        setInst(this.hq, i, this.hqBase.x + (r() - 0.5) * 1.6, 0.6 + i * 0.95 + 0.45, this.hqBase.z + (r() - 0.5) * 1.6, w, 0.88, d);
        this.hq.setColorAt(i, _c.set(i % 5 === 4 ? C.concreteDark : C.concrete));
      }
      this.hq.count = floors; this.hq.instanceMatrix.needsUpdate = true; this.hq.instanceColor.needsUpdate = true;
      this.beacon.position.set(this.hqBase.x, 0.6 + floors * 0.95 + 0.7, this.hqBase.z);
    }
    this.beacon.visible = Math.sin(t * 3) > -0.3;

    // the volcano smokes (and spits) until it's mostly gone
    if (def.shape === 'volcano' && frac < 0.85) {
      const s = this.summit;
      if (Math.random() < dt * 6) this.smoke.spawn(s.x + (Math.random() - 0.5) * 3, s.y + 0.5, s.z + (Math.random() - 0.5) * 3, 0.8, 2.2 + Math.random(), -0.4, 5, 1.6);
      if (Math.random() < dt * 1.5) this.debris.spawn(s.x, s.y, s.z, (Math.random() - 0.5) * 6, 9 + Math.random() * 5, (Math.random() - 0.5) * 6, 1.6, 0.9, C.accent);
    }

    this.debris.update(dt);
    this.smoke.update(dt);
  }

  render(dt) {
    this.controls.update();
    this.grade.uniforms.time.value = this.time;
    this.composer.render(dt);
  }
}
