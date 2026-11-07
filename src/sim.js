// ─────────────────────────────────────────────────────────────
//  MOUNT QUOTA — simulation core (pure logic, no DOM / three)
// ─────────────────────────────────────────────────────────────
import {
  SEC_PER_YEAR, GEN_YEARS, MOUNTAIN_MASS, MASS_K, MASS_M0, STRATA, BASE_VALUE, RP_PER_TON, BUFFER_SECONDS, BUFFER_MIN,
  COST_GROWTH, LEGACY_BONUS, LEGACY_PROGRESS, LEGACY_COMPLETE, PAR_YEARS,
  CATS, UNITS, RESEARCH, RESEARCH_BY_ID, SKILLS, SKILL_BY_ID, TRUST_FUND,
  FIRST_NAMES, TRAITS, FOUNDER_TRAIT, EVENTS,
} from './data.js';

const CAT_IDS = CATS.map(c => c.id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

export function roman(n) {
  const t = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = ''; for (const [v, r] of t) while (n >= v) { s += r; n -= v; } return s;
}

// ── Meta (persists across runs) ──────────────────────────────
export function newMeta() {
  return { legacy: 0, legacyTotal: 0, skills: { founder: 1 }, runs: 0, bestYears: null, history: [] };
}

// ── Run ──────────────────────────────────────────────────────
export function makeHeir(gen, meta) {
  if (gen === 0) return { name: 'Ezekiel Quarry', gen: 0, trait: FOUNDER_TRAIT };
  let pool = TRAITS.filter(t => !t.rare || Math.random() < 0.25);
  if (meta.skills.breeding) pool = pool.filter(t => t.good);
  return { name: `${pick(FIRST_NAMES)} Quarry ${roman(gen + 1)}`, gen, trait: pick(pool) };
}

export function newRun(meta) {
  const units = {};
  for (const c of CAT_IDS) units[c] = UNITS[c].map(() => 0);
  for (const c of CAT_IDS) units[c][0] = 1;
  const sk = meta.skills;
  const skip = sk.skip3 ? 3 : sk.skip2 ? 2 : sk.skip1 ? 1 : 0;
  const run = {
    t: 0, years: 0, credits: 20 + TRUST_FUND[sk.trust || 0], rp: 0,
    mined: 0, face: 0, yard: 0, processed: 0, earned: 0, rpEarned: 0,
    units, research: {}, era: skip,
    autoOn: { mining: false, extraction: false, processing: false },
    buffs: [], nextEvent: 75 + Math.random() * 60, event: null,
    gen: 0, heir: makeHeir(0, meta), clicks: 0, clickTons: 0,
    complete: false, finishYears: null,
    flow: { mine: 0, haul: 0, proc: 0, cash: 0, rp: 0 },
    eraYears: [0],
  };
  for (const n of RESEARCH) if (n.era < skip) run.research[n.id] = true;
  if (skip > 0) {
    for (let e = 1; e <= skip; e++) run.eraYears[e] = 0;
    // a starter kit so the skipped eras are actually usable
    for (const c of CAT_IDS) units[c][skip] = 1;
    run.credits += UNITS.processing[skip].cost * 6;
  }
  return run;
}

export function newGame() {
  const meta = newMeta();
  return { meta, run: newRun(meta), settings: defaultSettings(), out: [] };
}
export function defaultSettings() {
  return { tilt: true, tiltStrength: 1, offline: true, grain: true, buyAmt: 1, autoRotate: false };
}

// ── Modifiers ────────────────────────────────────────────────
export function getMods(g) {
  const r = g.run, meta = g.meta;
  const m = { mining: 1, extraction: 1, processing: 1, value: 1, rp: 1, buffer: 1, click: 1, global: 1, time: 1, auto: false };
  for (const n of RESEARCH) if (r.research[n.id]) applyFx(m, n.fx);
  for (const s of SKILLS) { const l = meta.skills[s.id] || 0; if (l > 0 && s.apply) s.apply(m, l); }
  if (r.heir) for (const k in r.heir.trait.mods) m[k] *= r.heir.trait.mods[k];
  for (const b of r.buffs) m[b.k] *= b.x;
  m.global *= 1 + LEGACY_BONUS * meta.legacyTotal;
  return m;
}
function applyFx(m, fx) {
  for (const e of fx) {
    if (e.k === 'auto') m.auto = true;
    else if (e.k !== 'era') m[e.k] *= e.x;
  }
}

export function unitRate(cat, e, m) { return UNITS[cat][e].rate * m[cat] * m.global; }
export function rates(g, m) {
  const out = {};
  for (const c of CAT_IDS) {
    let s = 0; const u = g.run.units[c];
    for (let e = 0; e < u.length; e++) s += u[e] * UNITS[c][e].rate;
    out[c] = s * m[c] * m.global;
  }
  return out;
}
export function faceCap(R, m) { return Math.max(BUFFER_MIN * m.buffer, R.mining * BUFFER_SECONDS * m.buffer); }
export function yardCap(R, m) { return Math.max(BUFFER_MIN * m.buffer, R.extraction * BUFFER_SECONDS * m.buffer); }
export function valuePerTon(m) { return BASE_VALUE * m.value; }
export function rpPerTon(m) { return RP_PER_TON * m.rp; }

// ── Tick ─────────────────────────────────────────────────────
export function tick(g, dt, offline = false) {
  const r = g.run;
  if (r.complete) return;
  const m = getMods(g);
  const R = rates(g, m);
  r.t += dt;
  r.years += (dt / SEC_PER_YEAR) * m.time;

  // processing first so the pipeline flows within one tick
  const proc = Math.min(R.processing * dt, r.yard);
  r.yard -= proc; r.processed += proc;
  const cash = proc * valuePerTon(m);
  const rp = proc * rpPerTon(m);
  r.credits += cash; r.earned += cash; r.rp += rp; r.rpEarned += rp;

  const capY = yardCap(R, m);
  const haul = Math.max(0, Math.min(R.extraction * dt, r.face, capY - r.yard));
  r.face -= haul; r.yard += haul;

  const capF = faceCap(R, m);
  const mine = Math.max(0, Math.min(R.mining * dt, capF - r.face, MOUNTAIN_MASS - r.mined));
  r.face += mine; r.mined += mine;
  if (r.mined >= MOUNTAIN_MASS * (1 - 1e-12)) r.mined = MOUNTAIN_MASS;

  // smoothed actual flows for the UI
  const a = clamp(dt * 1.5, 0, 1), f = r.flow;
  f.mine += (mine / dt - f.mine) * a; f.haul += (haul / dt - f.haul) * a; f.proc += (proc / dt - f.proc) * a;
  f.cash += (cash / dt - f.cash) * a; f.rp += (rp / dt - f.rp) * a;

  // generations
  const gen = Math.floor(r.years / GEN_YEARS);
  if (gen > r.gen) {
    r.gen = gen; r.heir = makeHeir(gen, g.meta);
    g.out.push({ type: 'gen', heir: r.heir });
  }

  r.buffs = r.buffs.filter(b => b.until > r.t);

  // board memos
  if (!offline && !r.event && r.t >= r.nextEvent) {
    const pool = EVENTS.filter(e => (e.minGen || 0) <= r.gen && (e.minEra || 0) <= r.era && e.id !== r.lastEvent);
    const ev = pick(pool);
    r.event = ev.id; r.lastEvent = ev.id;
    g.out.push({ type: 'event', id: ev.id });
  }

  // auto-buy (Gary)
  if (m.auto) {
    r._autoT = (r._autoT || 0) + dt;
    if (r._autoT >= 0.5) { r._autoT = 0; autoBuy(g, m, R); }
  }

  if (r.mined >= MOUNTAIN_MASS && r.face <= 0 && r.yard <= 0) {
    r.complete = true; r.finishYears = r.years;
    g.out.push({ type: 'complete' });
  }
}

export function simulate(g, seconds, step = 1) {
  let left = seconds;
  while (left > 0 && !g.run.complete) {
    const dt = Math.min(step, left);
    tick(g, dt, true);
    left -= dt;
  }
}

// ── Units ────────────────────────────────────────────────────
export function unitCost(g, cat, e, n = 1) {
  const c0 = UNITS[cat][e].cost * Math.pow(COST_GROWTH, g.run.units[cat][e]);
  return c0 * (Math.pow(COST_GROWTH, n) - 1) / (COST_GROWTH - 1);
}
export function maxAffordable(g, cat, e) {
  const c0 = UNITS[cat][e].cost * Math.pow(COST_GROWTH, g.run.units[cat][e]);
  const n = Math.floor(Math.log(g.run.credits * (COST_GROWTH - 1) / c0 + 1) / Math.log(COST_GROWTH));
  return Math.max(0, n);
}
export function resolveAmt(g, cat, e, amt) {
  if (amt === 'max') return Math.max(1, maxAffordable(g, cat, e));
  return amt;
}
export function buyUnit(g, cat, e, amt = 1) {
  const r = g.run;
  if (e > r.era) return false;
  const n = resolveAmt(g, cat, e, amt);
  const cost = unitCost(g, cat, e, n);
  if (n < 1 || cost > r.credits) return false;
  r.credits -= cost;
  r.units[cat][e] += n;
  return true;
}

function bestUnit(g, cat, m) {
  let best = -1, score = 0;
  for (let e = 0; e <= g.run.era; e++) {
    const c = unitCost(g, cat, e, 1);
    if (c > g.run.credits) continue;
    const s = UNITS[cat][e].rate / c;
    if (s > score) { score = s; best = e; }
  }
  return best;
}
export function autoBuy(g, m, R) {
  const r = g.run;
  const cats = CAT_IDS.filter(c => r.autoOn[c]).sort((a, b) => R[a] - R[b]);
  for (let guard = 0; guard < 60; guard++) {
    let bought = false;
    for (const c of cats) {
      const e = bestUnit(g, c, m);
      if (e >= 0) { r.credits -= unitCost(g, c, e, 1); r.units[c][e]++; R[c] += unitRate(c, e, m); bought = true; break; }
    }
    if (!bought) break;
    cats.sort((a, b) => R[a] - R[b]);
  }
}

// ── Research ─────────────────────────────────────────────────
export function researchState(g, id) {
  const n = RESEARCH_BY_ID[id], r = g.run;
  if (r.research[id]) return 'done';
  if (!n.req.every(q => r.research[q])) return 'locked';
  return r.rp >= n.cost ? 'affordable' : 'available';
}
export function doResearch(g, id) {
  if (researchState(g, id) !== 'affordable') return false;
  const n = RESEARCH_BY_ID[id], r = g.run;
  r.rp -= n.cost;
  r.research[id] = true;
  for (const e of n.fx) if (e.k === 'era' && e.x > r.era) {
    r.era = e.x; r.eraYears[e.x] = r.years;
    g.out.push({ type: 'era', era: e.x });
  }
  return true;
}

// ── Clicking the mountain ────────────────────────────────────
export function clickPower(g, m = getMods(g)) {
  const R = rates(g, m);
  return (1 + R.mining * 0.03) * m.click;
}
export function clickMine(g) {
  const r = g.run;
  if (r.complete) return 0;
  const m = getMods(g), R = rates(g, m);
  const amt = Math.max(0, Math.min(clickPower(g, m), faceCap(R, m) * 1.5 - r.face, MOUNTAIN_MASS - r.mined));
  r.face += amt; r.mined += amt; r.clicks++; r.clickTons += amt;
  return amt;
}

// ── Board memos ──────────────────────────────────────────────
export function resolveEvent(g, optIndex) {
  const r = g.run;
  const ev = EVENTS.find(e => e.id === r.event);
  if (!ev) return null;
  const opt = ev.opts[optIndex];
  const f = r.flow;
  for (const e of opt.fx) {
    if (e.t === 'credits') r.credits = Math.max(0, r.credits * (1 + e.frac));
    else if (e.t === 'rp') r.rp += Math.max(5, f.rp * e.secs);
    else if (e.t === 'cash') r.credits += Math.max(50, f.cash * e.secs);
    else if (e.t === 'buff') r.buffs.push({ k: e.k, x: e.x, until: r.t + e.dur, dur: e.dur, src: ev.id });
  }
  r.event = null;
  r.nextEvent = r.t + 120 + Math.random() * 120;
  return opt.out;
}

// ── Succession / prestige ────────────────────────────────────
export function legacyGain(g) {
  const r = g.run;
  const f = volumeFrac(r.mined);
  let L = Math.floor(LEGACY_PROGRESS * Math.pow(f, 1.2));
  if (r.complete) L += Math.floor(LEGACY_COMPLETE * Math.sqrt(clamp(PAR_YEARS / Math.max(0.5, r.finishYears), 0.25, 400)));
  return L;
}
export function evolve(g) {
  const gain = legacyGain(g), r = g.run, meta = g.meta;
  meta.legacy += gain; meta.legacyTotal += gain; meta.runs++;
  if (r.complete && (meta.bestYears == null || r.finishYears < meta.bestYears)) meta.bestYears = r.finishYears;
  meta.history.unshift({
    run: meta.runs, years: r.complete ? r.finishYears : r.years, complete: r.complete,
    pct: volumeFrac(r.mined), legacy: gain, era: r.era, gens: r.gen + 1,
  });
  meta.history = meta.history.slice(0, 30);
  g.run = newRun(meta);
  return gain;
}

export function skillState(g, id) {
  const s = SKILL_BY_ID[id], lvl = g.meta.skills[id] || 0;
  if (lvl >= s.max) return 'maxed';
  if (!s.req.every(([q, l]) => (g.meta.skills[q] || 0) >= l)) return 'locked';
  return g.meta.legacy >= s.cost(lvl) ? 'affordable' : 'available';
}
export function buySkill(g, id) {
  if (skillState(g, id) !== 'affordable') return false;
  const s = SKILL_BY_ID[id], lvl = g.meta.skills[id] || 0;
  g.meta.legacy -= s.cost(lvl);
  g.meta.skills[id] = lvl + 1;
  return true;
}

export const volumeFrac = mined => mined >= MOUNTAIN_MASS ? 1 : Math.log(1 + mined / MASS_M0) / MASS_K;
export const progress = g => volumeFrac(g.run.mined);
export const massAt = f => MASS_M0 * (Math.exp(MASS_K * f) - 1);
export function stratum(f) { let s = STRATA[0][1]; for (const [a, n] of STRATA) if (f >= a) s = n; return s; }
export function density(f) { return Math.exp(MASS_K * f); }
export { CAT_IDS, MOUNTAIN_MASS };
