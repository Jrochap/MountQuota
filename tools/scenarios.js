// ─────────────────────────────────────────────────────────────
//  MOUNT QUOTA — headless balance scenarios
//  Bundled after src/data.js + src/sim.js by tools/balance.py, so every
//  game function and constant is in scope. ARGS is injected by the runner.
// ─────────────────────────────────────────────────────────────

const out = s => console.log(s);
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const stderr = a => { const m = mean(a); return a.length > 1 ? Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1) / a.length) : 0; };
const fmtY = a => `${mean(a).toFixed(1)}y ± ${stderr(a).toFixed(1)}`;

// A greedy "optimal-ish" player: all departments on AUTO (Gary decides purchases)
// and, unless Gary Jr. is owned, buys the cheapest affordable research every step.
function playRun(g, { maxYears = 400, step = 0.5, manualResearch = true, onStep } = {}) {
  for (const c of CAT_IDS) g.run.autoOn[c] = true;
  const eras = [];
  let lastEra = g.run.era;
  while (!g.run.complete && g.run.years < maxYears) {
    tick(g, step, true);
    if (manualResearch && !getMods(g).autoResearch) {
      let b;
      do {
        b = null;
        for (const n of RESEARCH) if (researchState(g, n.id) === 'affordable' && (!b || n.cost < b.cost)) b = n;
        if (b) doResearch(g, b.id);
      } while (b);
    }
    // basic Gary only exists with a Procurement skill/research; the harness always provides one
    const m = getMods(g);
    if (!m.auto) autoBuy(g, m, rates(g, m));
    if (onStep) onStep(g);
    if (g.run.era !== lastEra) { lastEra = g.run.era; eras.push(Math.round(g.run.years)); }
  }
  return { years: g.run.years, complete: g.run.complete, realMin: g.run.t / 60, eras };
}
function freshGame(skills = {}, mtnId = 'obstinate') {
  const g = newGame();
  Object.assign(g.meta.skills, skills);
  g.run = newRun(g.meta, mtnId);
  return g;
}

const SCENARIOS = {
  // First run on Mt. Obstinate: pacing and era timings.
  fresh() {
    const ys = [], lines = [];
    for (let i = 0; i < ARGS.trials; i++) {
      const r = playRun(freshGame());
      ys.push(r.years);
      lines.push(`  ${r.years.toFixed(1)}y (${r.realMin.toFixed(0)} min real)  eras II–VI at years ${r.eras.join(' / ')}`);
    }
    out(`FRESH RUN · Mt. Obstinate · ${ARGS.trials} trials → ${fmtY(ys)}`);
    lines.forEach(out);
  },

  // First run on every mountain: should all land in a similar band.
  mountains() {
    out(`FRESH RUN PER MOUNTAIN · ${ARGS.trials} trials each`);
    for (const M of MOUNTAINS) {
      const ys = [], ls = [];
      for (let i = 0; i < ARGS.trials; i++) {
        const g = freshGame({}, M.id);
        const r = playRun(g);
        ys.push(r.years); ls.push(legacyGain(g));
      }
      out(`  ${M.name.padEnd(28)} ${fmtY(ys).padEnd(14)} legacy ≈ ${Math.round(mean(ls))}`);
    }
  },

  // Successive runs with greedy Legacy spending: the prestige curve.
  chain() {
    const g = newGame();
    out(`PRESTIGE CHAIN · ${ARGS.runs} runs, cheapest skill first, first offered mountain`);
    for (let i = 1; i <= ARGS.runs; i++) {
      const id = mtnDef(g.run).id;
      const r = playRun(g);
      const gain = evolve(g);
      const bought = [];
      for (;;) {
        let best = null;
        for (const s of SKILLS) {
          if (s.id === 'founder' || skillState(g, s.id) !== 'affordable') continue;
          const c = s.cost(g.meta.skills[s.id] || 0);
          if (!best || c < best.c) best = { s, c };
        }
        if (!best) break;
        buySkill(g, best.s.id); bought.push(best.s.id);
      }
      out(`  run ${String(i).padStart(2)} ${id.padEnd(10)} ${r.complete ? '' : 'NOT DONE '}${r.years.toFixed(1)}y (${r.realMin.toFixed(0)} min)  +${gain}◆  eras ${r.eras.join('/')}  → bought ${bought.join(', ') || '—'}`);
    }
    out(`  final skills: ${JSON.stringify(g.meta.skills)}`);
  },

  // Do old units still matter? Share of output gained from buying non-newest-era units.
  oldunits() {
    let oldGain = 0, allGain = 0;
    const wf = [], ys = [];
    for (let k = 0; k < ARGS.trials; k++) {
      const g = freshGame();
      for (const c of CAT_IDS) g.run.autoOn[c] = true;
      while (!g.run.complete && g.run.years < 400) {
        tick(g, 1, true);
        let b;
        do { b = null; for (const n of RESEARCH) if (researchState(g, n.id) === 'affordable' && (!b || n.cost < b.cost)) b = n; if (b) doResearch(g, b.id); } while (b);
        const m = getMods(g);
        for (let guard = 0; guard < 60; guard++) {
          const R = rates(g, m);
          const cats = CAT_IDS.slice().sort((a, c) => R[a] - R[c]);
          let did = false;
          for (const c of cats) {
            let best = -1, sc = 0;
            for (let e = 0; e <= g.run.era; e++) {
              const cost = unitCost(g, c, e, 1);
              if (cost > g.run.credits) continue;
              const s = gainOf(g, c, e, 1, m) / cost;
              if (s > sc) { sc = s; best = e; }
            }
            if (best >= 0) {
              const gn = gainOf(g, c, best, 1, m) / Math.max(R[c], 1e-9);
              allGain += gn; if (best < g.run.era) oldGain += gn;
              buyUnit(g, c, best, 1); did = true; break;
            }
          }
          if (!did) break;
        }
      }
      ys.push(g.run.years); wf.push(workforceX(g.run.units.mining, 5));
    }
    out(`OLD UNITS · ${ARGS.trials} trials → run ${fmtY(ys)}`);
    out(`  output gained via older-era purchases: ${(oldGain / allGain * 100).toFixed(0)}%`);
    out(`  final Legacy Workforce on Era VI mining: ×${mean(wf).toFixed(1)}`);
  },

  // Auto-buy tiers compared on identical setups.
  gary() {
    const trial = (skills, manualResearch, prio) => {
      const ys = [];
      for (let k = 0; k < ARGS.trials; k++) {
        const g = freshGame(skills);
        if (prio) g.settings.researchPriority = prio;
        ys.push(playRun(g, { manualResearch }).years);
      }
      return fmtY(ys);
    };
    out(`AUTO-BUY TIERS · ${ARGS.trials} trials each (± = standard error)`);
    out(`  basic Gary      + perfect manual research : ${trial({ procure: 1 }, true)}`);
    out(`  Gary's MBA      + perfect manual research : ${trial({ procure: 1, mba: 1 }, true)}`);
    out(`  MBA + Gary Jr.  (Balanced)                : ${trial({ procure: 1, mba: 1, garyjr: 1 }, false, 'cheapest')}`);
    out(`  MBA + Gary Jr.  (Rush Leaps)              : ${trial({ procure: 1, mba: 1, garyjr: 1 }, false, 'leaps')}`);
    out(`  MBA + Gary Jr.  (Commerce First)          : ${trial({ procure: 1, mba: 1, garyjr: 1 }, false, 'commerce')}`);
  },
};

const chosen = ARGS.scenario === 'all' ? Object.keys(SCENARIOS) : [ARGS.scenario];
for (const s of chosen) {
  if (!SCENARIOS[s]) { out(`Unknown scenario "${s}". Available: ${Object.keys(SCENARIOS).join(', ')}, all`); break; }
  const t0 = Date.now();
  SCENARIOS[s]();
  out(`  (${((Date.now() - t0) / 1000).toFixed(1)}s)\n`);
}
