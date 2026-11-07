// ─────────────────────────────────────────────────────────────
//  MOUNT QUOTA — simulation core (pure logic, no DOM / three)
// ─────────────────────────────────────────────────────────────
import {
  SEC_PER_YEAR, GEN_YEARS, MASS_K, MASS_M0, STRATA, MOUNTAINS, MOUNTAIN_BY_ID, OFFER_SIZE, BASE_VALUE, RP_PER_TON, BUFFER_SECONDS, BUFFER_MIN,
  DEFERRED_RATE, DEFERRED_CAP, OVERTIME_X, COST_GROWTH, WORKFORCE, MILESTONES, MILESTONE_X, DEPRECIATION, GARY_SAVE_SECONDS, GARY_SAVE_ADVANTAGE, GARY_BALANCE, LEGACY_BONUS, LEGACY_PROGRESS, LEGACY_COMPLETE, PAR_YEARS,
  CATS, UNITS, RESEARCH, RESEARCH_BY_ID, SKILLS, SKILL_BY_ID, TRUST_FUND,
  FIRST_NAMES, TRAITS, FOUNDER_TRAIT, softenTrait, EVENTS, TROPHIES, TROPHY_BY_ID, CONTRACTS, CONTRACT_BY_ID, SUCCESSION_SECONDS, HEIR_BIOS, BOARD_PICK_LINES,
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
  return { legacy: 0, legacyTotal: 0, skills: { founder: 1 }, runs: 0, bestYears: null, records: {}, history: [], offer: null, pick: null, deferred: 0,
    trophies: {}, contracts: {}, contractPick: null,
    stats: { clicks: 0, memos: 0, gambleWins: 0, heirs: 0, overtime: 0 } };
}

// ── Run ──────────────────────────────────────────────────────
export function makeHeir(gen, meta) {
  if (gen === 0) return { name: 'Ezekiel Quarry', gen: 0, trait: FOUNDER_TRAIT };
  return heirCandidates(gen, meta)[0];
}
// distinct candidates (names, traits, bios); Selective Succession → 4 candidates, all good traits
export function heirCandidates(gen, meta) {
  const n = meta.skills.breeding ? 4 : 3;
  const pool = TRAITS.filter(t => !t.rare || Math.random() < 0.2);
  const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);
  const traits = shuffle(pool), names = shuffle(FIRST_NAMES), bios = shuffle(HEIR_BIOS);
  const out = [];
  for (let i = 0; i < Math.min(n, traits.length); i++)
    out.push({ name: `${names[i]} Quarry ${roman(gen + 1)}`, gen, trait: meta.skills.breeding ? softenTrait(traits[i]) : traits[i], bio: bios[i % bios.length] });
  return out;
}
// install a candidate as CEO
export function chooseHeir(g, i, byBoard = false) {
  const r = g.run, s = r.succession;
  if (!s) return null;
  const heir = s.candidates[Math.max(0, Math.min(s.candidates.length - 1, i))];
  r.heir = heir; r.succession = null;
  if (!byBoard) stat(g, 'heirs');
  g.out.push({ type: 'gen', heir, byBoard, line: byBoard ? pick(BOARD_PICK_LINES) : null });
  return heir;
}

// ── Mountains ────────────────────────────────────────────────
export const mtnDef = r => MOUNTAIN_BY_ID[r.mtn?.id] || MOUNTAINS[0];
export const massK = r => MASS_K * mtnDef(r).massX + (r.contract === 'mandate' ? Math.log(CONTRACT_BY_ID.mandate.massMul) : 0);
export const massOf = r => MASS_M0 * (Math.exp(massK(r)) - 1);
export function mountainOffer(g) {
  const meta = g.meta;
  if (!meta.offer || !meta.offer.every(id => MOUNTAIN_BY_ID[id])) {
    const pool = MOUNTAINS.map(m => m.id).sort(() => Math.random() - 0.5);
    // prefer mountains the dynasty hasn't liquidated yet
    pool.sort((a, b) => (meta.records[a] != null) - (meta.records[b] != null));
    meta.offer = pool.slice(0, OFFER_SIZE).sort(() => Math.random() - 0.5);
    meta.pick = meta.offer[0];
  }
  if (!meta.offer.includes(meta.pick)) meta.pick = meta.offer[0];
  return meta.offer;
}
export function pickMountain(g, id) { if (mountainOffer(g).includes(id)) g.meta.pick = id; }

export function newRun(meta, mtnId = 'obstinate', contract = null) {
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
    // the very first mountain uses the classic seed; later ones are randomised
    contract,
    mtn: { id: mtnId, seed: meta.runs === 0 && mtnId === 'obstinate' ? 7 : 1 + Math.floor(Math.random() * 1e6) },
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
  return { garyBudget: 1, autoResearch: true, researchPriority: 'cheapest', tilt: true, tiltStrength: 1, offline: true, grain: true, buyAmt: 1, autoRotate: false, ticker: true, sound: true, volume: 0.7, sfxVol: 0.9, ambVol: 0.6 };
}

// ── Modifiers ────────────────────────────────────────────────
export function getMods(g) {
  const r = g.run, meta = g.meta;
  const m = { mining: 1, extraction: 1, processing: 1, value: 1, rp: 1, buffer: 1, click: 1, global: 1, time: 1, auto: false, smartBuy: false, autoResearch: false, researchPro: false };
  for (const n of RESEARCH) if (r.research[n.id]) applyFx(m, n.fx);
  for (const s of SKILLS) { const l = meta.skills[s.id] || 0; if (l > 0 && s.apply) s.apply(m, l); }
  if (r.heir) for (const k in r.heir.trait.mods) m[k] *= r.heir.trait.mods[k];
  const mm = mtnDef(r).mods; for (const k in mm) m[k] *= mm[k];
  for (const b of r.buffs) m[b.k] *= b.x;
  if (r.overtime && meta.deferred > 0) m.global *= OVERTIME_X;
  for (const id in meta.trophies || {}) { const tr = TROPHY_BY_ID[id]; if (tr) m[tr.fx.k] *= tr.fx.x; }
  if (r.contract === 'sabbatical') { m.auto = false; m.smartBuy = false; m.autoResearch = false; }
  m.global *= 1 + LEGACY_BONUS * meta.legacyTotal;
  return m;
}
function applyFx(m, fx) {
  for (const e of fx) {
    if (e.k === 'auto') m.auto = true;
    else if (e.k === 'research') m.autoResearch = true;
    else if (e.k !== 'era') m[e.k] *= e.x;
  }
}

// ── Unit output: base × Legacy Workforce × milestones ───────
export function milestonesHit(n) { let k = 0; for (const [t] of MILESTONES) if (n >= t) k++; return k; }
export function nextMilestone(n) { return MILESTONES.find(([t]) => n < t) || null; }
const msX = n => Math.pow(MILESTONE_X, milestonesHit(n));
// workforce multiplier for era e, given the department's unit counts u
export function workforceX(u, e) { let s = 0; for (let k = 0; k < e; k++) s += u[k]; return 1 + WORKFORCE * s; }
// raw department output (before research / global mods) for unit counts u
function deptBase(cat, u) {
  let s = 0;
  for (let e = 0; e < u.length; e++) if (u[e]) s += u[e] * UNITS[cat][e].rate * msX(u[e]) * workforceX(u, e);
  return s;
}
// per-unit output of (cat, e) at current counts
export function unitRate(g, cat, e, m) {
  const u = g.run.units[cat];
  return UNITS[cat][e].rate * msX(u[e]) * workforceX(u, e) * m[cat] * m.global;
}
// exact output added to the department by buying n of (cat, e), including workforce and milestone effects
export function gainOf(g, cat, e, n, m) {
  const u = g.run.units[cat], before = deptBase(cat, u);
  u[e] += n; const after = deptBase(cat, u); u[e] -= n;
  return (after - before) * m[cat] * m.global;
}
export function rates(g, m) {
  const out = {};
  for (const c of CAT_IDS) out[c] = deptBase(c, g.run.units[c]) * m[c] * m.global;
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
  if (r.overtime && !isDraining(r)) {          // the ×40 final-shipments phase doesn't burn the bank
    g.meta.deferred = Math.max(0, g.meta.deferred - dt);
    stat(g, 'overtime', dt);
    if (g.meta.deferred <= 0) { r.overtime = false; g.out.push({ type: 'overtimeEnd' }); }
  }

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
  const MASS = massOf(r);
  const mine = Math.max(0, Math.min(R.mining * dt, capF - r.face, MASS - r.mined));
  r.face += mine; r.mined += mine;
  if (r.mined >= MASS * (1 - 1e-12)) r.mined = MASS;

  // smoothed actual flows for the UI
  const a = clamp(dt * 1.5, 0, 1), f = r.flow;
  f.mine += (mine / dt - f.mine) * a; f.haul += (haul / dt - f.haul) * a; f.proc += (proc / dt - f.proc) * a;
  f.cash += (cash / dt - f.cash) * a; f.rp += (rp / dt - f.rp) * a;

  // generations
  const gen = Math.floor(r.years / GEN_YEARS);
  if (gen > r.gen) {
    if (r.succession) chooseHeir(g, Math.floor(Math.random() * r.succession.candidates.length), true);  // overdue pick
    r.gen = gen;
    // the old CEO's trait keeps applying while the board deliberates
    r.succession = { gen, candidates: heirCandidates(gen, g.meta), deadline: r.t + SUCCESSION_SECONDS };
    if (offline) chooseHeir(g, Math.floor(Math.random() * r.succession.candidates.length), true);
    else g.out.push({ type: 'succession' });
  }
  if (r.succession && r.t >= r.succession.deadline) chooseHeir(g, Math.floor(Math.random() * r.succession.candidates.length), true);

  r.buffs = r.buffs.filter(b => b.until > r.t);

  r._trophyT = (r._trophyT || 0) + dt;
  if (r._trophyT >= 1) { r._trophyT = 0; checkTrophies(g, R); }

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
    if (r._autoT >= 0.5) { r._autoT = 0; if (m.smartBuy) smartBuy(g, m); else autoBuy(g, m, R); }
  } else r.gary = null;
  if (m.autoResearch && g.settings?.autoResearch !== false) {
    r._resT = (r._resT || 0) + dt;
    if (r._resT >= 1) { r._resT = 0; autoResearch(g, m.researchPro ? g.settings?.researchPriority : 'cheapest'); }
  } else r.garyJr = null;

  if (r.mined >= MASS && r.face <= 0 && r.yard <= 0) {
    r.complete = true; r.finishYears = r.years;
    g.out.push({ type: 'complete' });
    checkTrophies(g);
  }
}

// ── Lifetime stats & Shareholder Trophies ────────────────────
export function stat(g, k, n = 1) {
  const s = g.meta.stats || (g.meta.stats = {});
  s[k] = (s[k] || 0) + n;
}
const anyUnit = (r, pred) => CAT_IDS.some(c => r.units[c].some((n, e) => n > 0 && pred(c, e, n)));
export const TROPHY_CHECKS = {
  first:      (g) => Object.keys(g.meta.records).length >= 1 || g.run.complete,
  era6:       (g) => g.run.era >= 5,
  century:    (g) => best(g) < 100,
  fifty:      (g) => best(g) < 50,
  twenty:     (g) => best(g) < 20,
  five:       (g) => best(g) < 5,
  geologist:  (g) => Object.keys(g.meta.records).length >= 5,
  collector:  (g) => MOUNTAINS.every(m => g.meta.records[m.id] != null),
  habit:      (g) => g.meta.runs >= 10,
  million:    (g) => g.run.credits >= 1e6,
  billion:    (g) => g.run.credits >= 1e9,
  quad:       (g) => g.run.credits >= 1e15,
  mover:      (g) => g.run.flow.proc >= 1e6,
  event:      (g) => g.run.flow.proc >= 1e12,
  revolt:     (g) => g.run.units.mining[0] >= 400,
  fullhouse:  (g) => CAT_IDS.every(c => g.run.units[c].some(n => n >= 100)),
  seniority:  (g) => anyUnit(g.run, (c, e) => workforceX(g.run.units[c], e) >= 5),
  hands:      (g) => (g.meta.stats?.clicks || 0) >= 1000,
  stamp:      (g) => (g.meta.stats?.memos || 0) >= 50,
  roller:     (g) => (g.meta.stats?.gambleWins || 0) >= 10,
  succession: (g) => (g.meta.stats?.heirs || 0) >= 20,
  grind:      (g) => (g.meta.stats?.overtime || 0) >= 1800,
  signed:     (g) => Object.keys(g.meta.contracts).length >= 1 || contractPassed(g.run),
  lawyer:     (g) => CONTRACTS.every(c => g.meta.contracts[c.id] != null || (g.run.contract === c.id && contractPassed(g.run))),
};
// best finish time so far, counting a just-completed run before it is banked by evolve()
const best = g => Math.min(g.meta.bestYears ?? Infinity, g.run.complete ? g.run.finishYears : Infinity);
export function checkTrophies(g) {
  const got = g.meta.trophies || (g.meta.trophies = {});
  for (const t of TROPHIES) {
    if (got[t.id] || !TROPHY_CHECKS[t.id]?.(g)) continue;
    got[t.id] = Date.now();
    g.out.push({ type: 'trophy', id: t.id });
  }
}

// ── Deferred Time ────────────────────────────────────────────
// Real time away is banked instead of simulated, so it can never cost in-game years.
export function bankDeferred(g, awaySeconds) {
  const before = g.meta.deferred || 0;
  g.meta.deferred = Math.min(DEFERRED_CAP, before + Math.max(0, awaySeconds) * DEFERRED_RATE);
  return g.meta.deferred - before;
}
export function setOvertime(g, on) {
  const r = g.run;
  r.overtime = !!on && g.meta.deferred > 0 && !r.complete;
  return r.overtime;
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
export const depreciation = (g, e) => (g.run.contract === 'union' ? 1 : Math.pow(DEPRECIATION, Math.max(0, g.run.era - e)));
export function unitCost(g, cat, e, n = 1) {
  const c0 = UNITS[cat][e].cost * depreciation(g, e) * Math.pow(COST_GROWTH, g.run.units[cat][e]);
  return c0 * (Math.pow(COST_GROWTH, n) - 1) / (COST_GROWTH - 1);
}
export function maxAffordable(g, cat, e) {
  const c0 = UNITS[cat][e].cost * depreciation(g, e) * Math.pow(COST_GROWTH, g.run.units[cat][e]);
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
  let n = resolveAmt(g, cat, e, amt);
  if (amt === 'max') while (n > 1 && unitCost(g, cat, e, n) > r.credits) n--;   // float-rounding guard
  const cost = unitCost(g, cat, e, n);
  if (n < 1 || cost > r.credits) return false;
  r.credits -= cost;
  buyCount(g, cat, e, n);
  return true;
}

// add units and announce any milestone crossed
function buyCount(g, cat, e, n) {
  const u = g.run.units[cat], before = milestonesHit(u[e]);
  u[e] += n;
  const after = milestonesHit(u[e]);
  for (let k = before; k < after; k++) g.out.push({ type: 'milestone', cat, e, count: MILESTONES[k][0], text: MILESTONES[k][1] });
}

function bestUnit(g, cat, m) {
  let best = -1, score = 0;
  for (let e = 0; e <= g.run.era; e++) {
    const c = unitCost(g, cat, e, 1);
    if (c > g.run.credits) continue;
    const s = gainOf(g, cat, e, 1, m) / c;
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
      if (e >= 0) { R[c] += gainOf(g, c, e, 1, m); r.credits -= unitCost(g, c, e, 1); buyCount(g, c, e, 1); bought = true; break; }
    }
    if (!bought) break;
    cats.sort((a, b) => R[a] - R[b]);
  }
}

// ── Gary's MBA: smart auto-buy ───────────────────────────────
// Considers single units AND "buy up to the next milestone" bundles, weights departments so the
// pipeline stays balanced, and will wait a few seconds for a clearly better deal.
export function smartBuy(g, m) {
  const r = g.run, s = g.settings || {};
  const cats = CAT_IDS.filter(c => r.autoOn[c]);
  if (!cats.length) { r.gary = { mode: 'idle', text: 'All departments set to manual.' }; return; }
  const reserve = r.credits * (1 - (s.garyBudget ?? 1));
  const income = Math.max(0, r.flow.cash);
  let status = null;
  for (let guard = 0; guard < 40; guard++) {
    const R = rates(g, m);
    const minR = Math.min(...cats.map(c => R[c]));
    const budget = r.credits - reserve;
    let best = null, bestAff = null;
    for (const c of cats) {
      // throughput is capped by the weakest department, so output added elsewhere is discounted in
      // proportion to its lead (not zeroed: cheap units there still pay off via workforce & milestones).
      // Linear beat squared/flat weightings in the balance sim.
      const lead = R[c] / Math.max(minR, 1e-9);
      const w = lead <= GARY_BALANCE ? 1 : Math.max(1e-4, GARY_BALANCE / lead);
      for (let e = 0; e <= r.era; e++) {
        const own = r.units[c][e], nx = nextMilestone(own);
        const opts = [1];
        if (nx && nx[0] - own > 1 && nx[0] - own <= 40) opts.push(nx[0] - own);
        for (const n of opts) {
          const cost = unitCost(g, c, e, n);
          const score = gainOf(g, c, e, n, m) / cost * w;
          const o = { c, e, n, cost, score };
          if (!best || score > best.score) best = o;
          if (cost <= budget && (!bestAff || score > bestAff.score)) bestAff = o;
        }
      }
    }
    if (!best) break;
    // save up if the best deal is close and clearly better than what we can afford right now
    if (best !== bestAff && best.cost > budget) {
      const eta = income > 0 ? (best.cost - budget) / income : Infinity;
      if (eta <= GARY_SAVE_SECONDS && (!bestAff || best.score > bestAff.score * GARY_SAVE_ADVANTAGE)) {
        status = { mode: 'saving', text: `Saving for ${best.n > 1 ? best.n + '× ' : ''}${UNITS[best.c][best.e].name}${best.n > 1 ? ' (milestone ×2)' : ''}`, eta };
        break;
      }
    }
    if (!bestAff) { status = status || { mode: 'idle', text: 'Waiting for credits.' }; break; }
    r.credits -= bestAff.cost;
    buyCount(g, bestAff.c, bestAff.e, bestAff.n);
    status = { mode: 'buying', text: `Bought ${bestAff.n > 1 ? bestAff.n + '× ' : ''}${UNITS[bestAff.c][bestAff.e].name}` };
  }
  if (status) r.gary = status;
}

// ── Gary Jr.: auto-research ──────────────────────────────────
const RD_RANK = {
  leaps:    n => (n.row === 6 ? 0 : n.row <= 2 ? 1 : 2),
  commerce: n => (n.row === 3 || n.row === 4 ? 0 : n.row === 6 ? 1 : 2),
  cheapest: () => 0,
};
// the Planning Committee always goes cheapest-first; Gary Jr. honours the chosen priority
export function autoResearch(g, priority = 'cheapest') {
  const r = g.run, rank = RD_RANK[priority] || RD_RANK.cheapest;
  for (let guard = 0; guard < 10; guard++) {
    const open = RESEARCH.filter(n => !r.research[n.id] && !isForbidden(r, n) && n.req.every(q => r.research[q]));
    if (!open.length) { r.garyJr = { text: 'Nothing left to research.' }; return; }
    open.sort((a, b) => rank(a) - rank(b) || rdCost(r, a) - rdCost(r, b));
    const target = open[0];
    if (r.rp >= rdCost(r, target)) { doResearch(g, target.id); r.garyJr = { text: `Researched ${target.name}` }; continue; }
    // while saving for the priority target, only pick up trivially cheap nodes
    const filler = open.find(n => n !== target && rdCost(r, n) <= r.rp && rdCost(r, n) < rdCost(r, target) * 0.05);
    if (filler) { doResearch(g, filler.id); continue; }
    const eta = r.flow.rp > 0 ? (rdCost(r, target) - r.rp) / r.flow.rp : Infinity;
    r.garyJr = { text: `Saving for ${target.name}`, eta };
    return;
  }
}

// ── Research ─────────────────────────────────────────────────
// Board Contract restrictions on research
export function isForbidden(r, n) {
  return false;
}
// research price after contract rules (Austerity makes Doctrine expensive)
export const rdCost = (r, n) => n.cost * (r.contract === 'austerity' && n.row === 4 ? CONTRACT_BY_ID.austerity.costX : 1);
export function researchState(g, id) {
  const n = RESEARCH_BY_ID[id], r = g.run;
  if (r.research[id]) return 'done';
  if (isForbidden(r, n)) return 'forbidden';
  if (!n.req.every(q => r.research[q])) return 'locked';
  return r.rp >= rdCost(r, n) ? 'affordable' : 'available';
}
export function doResearch(g, id) {
  if (researchState(g, id) !== 'affordable') return false;
  const n = RESEARCH_BY_ID[id], r = g.run;
  r.rp -= rdCost(r, n);
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
  const amt = Math.max(0, Math.min(clickPower(g, m), faceCap(R, m) * 1.5 - r.face, massOf(r) - r.mined));
  r.face += amt; r.mined += amt; r.clicks++; r.clickTons += amt;
  if (amt > 0) stat(g, 'clicks');
  return amt;
}

// ── Board memos ──────────────────────────────────────────────
export function resolveEvent(g, optIndex) {
  const r = g.run;
  const ev = EVENTS.find(e => e.id === r.event);
  if (!ev) return null;
  const opt = ev.opts[optIndex];
  if (!opt) return null;
  const out = applyEventFx(g, opt.fx, ev.id) || opt.out;
  stat(g, 'memos');
  r.event = null;
  r.nextEvent = r.t + 120 + Math.random() * 120;
  return out;
}
// returns an outcome text when a gamble decides it
function applyEventFx(g, fx, src) {
  const r = g.run, f = r.flow;
  let text = null;
  for (const e of fx) {
    if (e.t === 'credits') r.credits = Math.max(0, r.credits * (1 + e.frac));
    else if (e.t === 'rp') r.rp += Math.max(5, f.rp * e.secs);
    else if (e.t === 'cash') r.credits += Math.max(50, f.cash * e.secs);
    else if (e.t === 'buff') r.buffs.push({ k: e.k, x: e.x, until: r.t + e.dur, dur: e.dur, src });
    else if (e.t === 'gamble') {
      const win = Math.random() < e.p;
      applyEventFx(g, win ? e.win : e.lose, src);
      if (win) stat(g, 'gambleWins');
      text = (win ? '✓ ' + e.winOut : '✗ ' + e.loseOut);
    } else if (e.t === 'units') {
      // free units of the newest era in each listed department
      for (const c of e.cats) { const own = r.units[c][r.era]; buyCount(g, c, r.era, Math.max(1, Math.ceil(own * e.frac))); }
    } else if (e.t === 'mine') {
      // instantly dislodge `secs` worth of mining onto the face pile
      const R = rates(g, getMods(g));
      const amt = Math.max(0, Math.min(R.mining * e.secs, massOf(r) - r.mined));
      r.mined += amt; r.face += amt;
    }
  }
  return text;
}

// ── Succession / prestige ────────────────────────────────────
// a contract only pays off if the mountain is finished (and, for deadlines, on time)
export function contractX(r) {
  const c = CONTRACT_BY_ID[r.contract];
  if (!c || !r.complete) return 1;
  if (c.deadline != null) return r.finishYears <= c.deadline ? c.legacyX : c.failX;
  return c.legacyX;
}
export const contractPassed = r => { const c = CONTRACT_BY_ID[r.contract]; return !!c && r.complete && (c.deadline == null || r.finishYears <= c.deadline); };
export function pickContract(g, id) { g.meta.contractPick = CONTRACT_BY_ID[id] ? id : null; }
export const contractsUnlocked = meta => Object.keys(meta.records || {}).length > 0;
export function legacyGain(g) {
  const r = g.run;
  const f = volumeFrac(r);
  let L = LEGACY_PROGRESS * Math.pow(f, 1.2);
  if (r.complete) L += LEGACY_COMPLETE * Math.sqrt(clamp(PAR_YEARS / Math.max(0.5, r.finishYears), 0.25, 400));
  return Math.floor(L * mtnDef(r).legacyX * contractX(r));
}
export function evolve(g) {
  const gain = legacyGain(g), r = g.run, meta = g.meta;
  meta.legacy += gain; meta.legacyTotal += gain; meta.runs++;
  if (r.complete && (meta.bestYears == null || r.finishYears < meta.bestYears)) meta.bestYears = r.finishYears;
  const id = mtnDef(r).id;
  if (r.complete && (meta.records[id] == null || r.finishYears < meta.records[id])) meta.records[id] = r.finishYears;
  if (contractPassed(r) && (meta.contracts[r.contract] == null || r.finishYears < meta.contracts[r.contract])) meta.contracts[r.contract] = r.finishYears;
  meta.history.unshift({
    run: meta.runs, years: r.complete ? r.finishYears : r.years, complete: r.complete,
    pct: volumeFrac(r), legacy: gain, era: r.era, gens: r.gen + 1, mtn: id, contract: r.contract || null,
    contractOk: r.contract ? contractPassed(r) : null,
  });
  meta.history = meta.history.slice(0, 30);
  mountainOffer(g);
  const next = meta.pick;
  meta.offer = null; meta.pick = null;          // a fresh survey after every evolution
  const contract = contractsUnlocked(meta) ? meta.contractPick : null;
  meta.contractPick = null;
  g.run = newRun(meta, next, contract);
  g.run.autoOn = { ...r.autoOn };
  checkTrophies(g);               // keep each department's AUTO setting across runs
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

// every block is gone but rubble is still being hauled / processed
export const isDraining = r => !r.complete && r.mined >= massOf(r);
export const DRAIN_SPEED = 40;
export const volumeFrac = r => r.mined >= massOf(r) ? 1 : Math.log(1 + r.mined / MASS_M0) / massK(r);
export const progress = g => volumeFrac(g.run);
export function stratum(f) { let s = STRATA[0][1]; for (const [a, n] of STRATA) if (f >= a) s = n; return s; }
export const density = (r, f) => Math.exp(massK(r) * f);
export { CAT_IDS };
