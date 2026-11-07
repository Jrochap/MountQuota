// ─────────────────────────────────────────────────────────────
//  MOUNT QUOTA — DOM interface
// ─────────────────────────────────────────────────────────────
import {
  GAME_TITLE, COMPANY, MOUNTAIN_NAME, ERAS, CATS, UNITS, RESEARCH, RESEARCH_BY_ID, RD_ROWS, SKILLS, SKILL_BY_ID,
  EVENTS, NEWS, fxText, LEGACY_BONUS, PAR_YEARS,
} from './data.js';
import * as S from './sim.js';
import { fmt, tons, cr, rp, pct, clock, yrs } from './format.js';

const $ = (sel, el = document) => el.querySelector(sel);
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
// Write to the DOM only when the value changes. Rewriting text under the cursor mid-press makes
// WebKit (Safari) drop the click, and the HUD refreshes 10×/s.
const setText = (el, v) => { v = String(v); if (el.textContent !== v) el.textContent = v; };
const setHTML = (el, v) => { if (el._html !== v) { el._html = v; el.innerHTML = v; } };
const setClass = (el, v) => { if (el.className !== v) el.className = v; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class UI {
  constructor(root, game, actions) {
    this.root = root;
    this.g = game;
    this.actions = actions;
    this.unitKey = '';
    this.open = null;
    this.build();
  }
  get run() { return this.g.run; }

  // ── skeleton ─────────────────────────────────────────────
  build() {
    this.root.innerHTML = `
    <header class="top">
      <div class="brand panel">
        <div class="logo">MOUNT<br>QUOTA</div>
        <div class="sub">${esc(COMPANY.toUpperCase())}<br><span class="dim">A GENERATIONAL EXCAVATION CONCERN</span></div>
      </div>
      <div class="clock panel">
        <div class="lbl">YEAR <span id="month"></span></div>
        <div class="big mono" id="year">0000</div>
        <div class="heir"><b id="gen">GEN I</b> · <span id="heir"></span></div>
        <div class="trait" id="trait"></div>
      </div>
      <nav class="menu">
        <button class="btn" data-open="rd">R&amp;D TREE <em id="rd-badge"></em></button>
        <button class="btn" data-open="fam">FAMILY TREE <em id="fam-badge"></em></button>
        <button class="btn" data-open="ledger">LEDGER</button>
      </nav>
    </header>

    <section class="mtn panel">
      <div class="mtn-row">
        <span class="mname">${esc(MOUNTAIN_NAME.toUpperCase())}</span>
        <span class="mono" id="pct">0.00%</span><span class="dim">LIQUIDATED</span>
        <span class="sep"></span>
        <span class="dim">STRATUM</span><span id="strata"></span>
        <span class="dim">DENSITY</span><span class="mono" id="density"></span>
        <span class="dim">ERA</span><span id="era-name"></span>
      </div>
      <div class="bar"><i id="pbar"></i></div>
      <div class="bar-ticks">${[10, 20, 30, 40, 50, 60, 70, 80, 90].map(v => `<span style="left:${v}%"></span>`).join('')}</div>
    </section>

    <aside class="ops panel">
      <div class="res">
        <div class="stat"><div class="lbl">CREDITS</div><div class="v mono" id="credits">₵0</div><div class="d mono" id="credits-d"></div></div>
        <div class="stat"><div class="lbl">RESEARCH</div><div class="v mono" id="rp">0</div><div class="d mono" id="rp-d"></div></div>
        <div class="stat lg"><div class="lbl">LEGACY</div><div class="v mono" id="legacy">◆0</div><div class="d mono" id="legacy-d"></div></div>
      </div>
      <div class="pipeline" id="pipeline">
        ${CATS.map((c, i) => `
          <div class="stage" data-cat="${c.id}">
            <div class="st-head"><span class="sym">${c.sym}</span>${c.name.toUpperCase()}<em class="tag"></em></div>
            <div class="st-rate mono"></div>
            <div class="st-buf"><i></i></div>
            <div class="st-note"></div>
          </div>${i < 2 ? '<div class="arrow">▶</div>' : ''}`).join('')}
      </div>
      <div class="amt">
        <span class="dim">BUY</span>
        ${[1, 10, 100, 'max'].map(a => `<button class="chip" data-amt="${a}">${a === 'max' ? 'MAX' : '×' + a}</button>`).join('')}
        <span class="buffs" id="buffs"></span>
      </div>
      <div class="units" id="units"></div>
    </aside>

    <div class="memo panel" id="memo" hidden></div>
    <div class="toasts" id="toasts"></div>
    <div class="banner" id="banner" hidden></div>
    <div class="hint" id="hint">▲ CLICK THE MOUNTAIN — THE FOUNDER WILL PERSONALLY SWING A PICKAXE</div>
    <footer class="ticker"><div class="tk-label">QUARRY NEWS NETWORK</div><div class="tk-track"><div class="tk-inner" id="ticker"></div></div></footer>

    <div class="overlay" id="ov-rd" hidden>
      <div class="ov-panel panel">
        <div class="ov-head">
          <h2>R&amp;D — RESEARCH &amp; DOWNSIZING</h2>
          <div class="ov-stat mono" id="rd-rp"></div>
          <button class="x btn" data-close>✕</button>
        </div>
        <div class="ov-body"><div class="tree" id="rd-tree"></div></div>
        <div class="ov-info" id="rd-info">Hover a node. Click to research. Generational Leaps unlock the next era of equipment.</div>
      </div>
    </div>

    <div class="overlay" id="ov-fam" hidden>
      <div class="ov-panel panel">
        <div class="ov-head">
          <h2>FAMILY TREE — PERMANENT INHERITANCE</h2>
          <div class="ov-stat mono" id="fam-l"></div>
          <button class="x btn" data-close>✕</button>
        </div>
        <div class="fam-wrap">
          <div class="ov-body" id="fam-body"><div class="tree" id="fam-tree"></div></div>
          <div class="evolve panel" id="evolve"></div>
        </div>
        <div class="ov-info" id="fam-info">Skills bought here persist forever. Legacy ◆ is earned by Evolving the Dynasty.</div>
      </div>
    </div>

    <div class="overlay" id="ov-ledger" hidden>
      <div class="ov-panel panel narrow">
        <div class="ov-head"><h2>LEDGER</h2><button class="x btn" data-close>✕</button></div>
        <div class="ov-body pad" id="ledger"></div>
      </div>
    </div>

    <div class="overlay dark" id="ov-complete" hidden>
      <div class="ov-panel panel narrow complete" id="complete"></div>
    </div>`;

    // events
    this.root.addEventListener('click', e => this.onClick(e));
    this.bindBuyPress();
    this.buildTicker();
    this.buildRD();
    this.buildFam();
    this.markAmt();
  }

  onClick(e) {
    const t = e.target.closest('button, [data-node], [data-skill], .overlay');
    if (!t) return;
    if (t.classList.contains('overlay') && e.target === t && t.id !== 'ov-complete') return this.close();
    if (t.dataset.open) return this.show(t.dataset.open);
    if ('close' in t.dataset) return this.close();
    if (t.dataset.amt) {
      this.g.settings.buyAmt = t.dataset.amt === 'max' ? 'max' : +t.dataset.amt;
      this.markAmt(); this.unitKey = ''; return;
    }
    if (t.dataset.buy) {
      // mouse purchases already happened on pointerdown; clicks here are touch / pen / keyboard
      if (this.pressBought === t.dataset.buy && e.detail > 0) { this.pressBought = null; return; }
      this.buy(t); return;
    }
    if (t.dataset.auto) {
      this.run.autoOn[t.dataset.auto] = !this.run.autoOn[t.dataset.auto];
      this.unitKey = ''; this.update(true); return;
    }
    if (t.dataset.node) {
      const n = RESEARCH_BY_ID[t.dataset.node];
      if (S.doResearch(this.g, n.id)) { this.toast(`RESEARCHED — ${n.name}`, fxText(n.fx)); this.update(true); }
      return;
    }
    if (t.dataset.skill) {
      if (S.buySkill(this.g, t.dataset.skill)) { const s = SKILL_BY_ID[t.dataset.skill]; this.toast(`INHERITED — ${s.name}`, s.fxt(this.g.meta.skills[s.id])); this.update(true); }
      return;
    }
    if (t.dataset.memo != null) {
      const out = S.resolveEvent(this.g, +t.dataset.memo);
      $('#memo').hidden = true;
      if (out) this.toast('BOARD DECISION', out);
      return;
    }
    if (t.dataset.evolve != null) return this.evolveClick(t);
    if (t.dataset.act) return this.actions[t.dataset.act]?.(t);
    if (t.dataset.set) {
      const k = t.dataset.set, s = this.g.settings;
      s[k] = !s[k]; this.actions.settings(); this.renderLedger(); return;
    }
  }

  buy(btn) {
    const [cat, ei] = btn.dataset.buy.split(':');
    const ok = S.buyUnit(this.g, cat, +ei, this.g.settings.buyAmt);
    if (ok) this.flash(btn);
    this.update(true);
    return ok;
  }
  // Mouse buys fire on press (immune to the cursor drifting off before release) and repeat while held.
  bindBuyPress() {
    let hold = null;
    const stop = () => { if (hold) { clearTimeout(hold.t); hold = null; } };
    this.root.addEventListener('pointerdown', e => {
      this.pressBought = null;
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      const btn = e.target.closest('[data-buy]');
      if (!btn) return;
      e.preventDefault();
      stop();
      const key = btn.dataset.buy;
      this.pressBought = key;
      this.buy(btn);
      const step = delay => {
        hold = { t: setTimeout(() => {
          // the list may have been rebuilt; find the live button for the same unit
          const live = this.root.querySelector(`[data-buy="${key}"]`);
          if (!live || !this.buy(live)) return stop();
          step(Math.max(45, delay * 0.85));
        }, delay) };
      };
      step(420);
    });
    addEventListener('pointerup', stop);
    addEventListener('pointercancel', stop);
    addEventListener('blur', stop);
  }

  markAmt() {
    this.root.querySelectorAll('[data-amt]').forEach(b => b.classList.toggle('on', String(this.g.settings.buyAmt) === b.dataset.amt));
  }
  flash(el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }

  show(id) {
    this.close();
    this.open = id;
    $(`#ov-${id}`).hidden = false;
    if (id === 'ledger') this.renderLedger();
    if (id === 'fam') { this.renderEvolve(); const b = $('#fam-body'); b.scrollLeft = (b.scrollWidth - b.clientWidth) / 2; b.scrollTop = (b.scrollHeight - b.clientHeight) / 2; }
    this.update(true);
  }
  close() {
    for (const id of ['rd', 'fam', 'ledger']) $(`#ov-${id}`).hidden = true;
    this.open = null;
  }

  // ── R&D tree ─────────────────────────────────────────────
  buildRD() {
    const W = 196, H = 92, X0 = 140, Y0 = 58, NW = 176, NH = 78;
    const tree = $('#rd-tree');
    tree.style.width = (X0 + ERAS.length * W + 20) + 'px';
    tree.style.height = (Y0 + RD_ROWS.length * H + 10) + 'px';
    const pos = n => ({ x: X0 + n.era * W, y: Y0 + n.row * H });
    let svg = `<svg class="links" width="100%" height="100%">`;
    // visual spine: each leap feeds the next era; within an era, m/h/p feed the leap (drawn as a bracket)
    for (let e = 0; e < ERAS.length; e++) {
      const L = RESEARCH_BY_ID[`L${e}`], p = pos(L);
      const bx = p.x - 8;
      svg += `<path data-link="m${e}>L${e}" d="M${bx},${Y0 + NH / 2} L${bx},${p.y + NH / 2} L${p.x},${p.y + NH / 2}" />`;
      if (e > 0) { const a = pos(RESEARCH_BY_ID[`L${e - 1}`]); svg += `<path data-link="L${e - 1}>L${e}" d="M${a.x + NW},${a.y + NH / 2} L${p.x - 8},${p.y + NH / 2}" />`; }
    }
    svg += '</svg>';
    let html = svg;
    ERAS.forEach((e, i) => { html += `<div class="col-h" data-col="${i}" style="left:${X0 + i * W}px">ERA ${e.roman}<br><span>${esc(e.name)}</span><b class="lock">${i > 0 ? 'LOCKED · needs ' + esc(RESEARCH_BY_ID['L' + (i - 1)].name) : ''}</b></div>`; });
    RD_ROWS.forEach((r, i) => { html += `<div class="row-h" style="top:${Y0 + i * H}px;height:${NH}px">${esc(r)}</div>`; });
    for (const n of RESEARCH) {
      const p = pos(n);
      html += `<div class="node rd ${n.row === 6 ? 'leap' : ''}" data-node="${n.id}" style="left:${p.x}px;top:${p.y}px">
        <div class="n-name">${esc(n.name)}</div>
        <div class="n-fx">${esc(fxText(n.fx))}</div>
        <div class="n-cost mono">${rp(n.cost)}</div></div>`;
    }
    tree.innerHTML = html;
    tree.addEventListener('mouseover', e => {
      const el = e.target.closest('[data-node]'); if (!el) return;
      const n = RESEARCH_BY_ID[el.dataset.node];
      $('#rd-info').innerHTML = `<b>${esc(n.name)}</b> — ${esc(n.desc)} <span class="acc">${esc(fxText(n.fx))}</span>${n.req.length ? ` <span class="dim">· requires ${n.req.map(q => esc(RESEARCH_BY_ID[q].name)).join(', ')}</span>` : ''}`;
    });
    this.rdNodes = [...tree.querySelectorAll('[data-node]')];
    this.rdLinks = [...tree.querySelectorAll('[data-link]')];
    this.rdCols = [...tree.querySelectorAll('[data-col]')];
  }
  updateRD() {
    setHTML($('#rd-rp'), `${rp(this.run.rp)} <span class="dim">+${fmt(this.run.flow.rp)}/s</span>`);
    for (const el of this.rdNodes) {
      const st = S.researchState(this.g, el.dataset.node);
      setClass(el, el.className.replace(/\b(done|locked|available|affordable)\b/g, '').trim() + ' ' + st);
    }
    for (const c of this.rdCols) c.classList.toggle('locked', +c.dataset.col > this.run.era);
    for (const l of this.rdLinks) {
      const [a, b] = l.dataset.link.split('>');
      l.classList.toggle('on', !!this.run.research[a]);
      l.classList.toggle('done', !!this.run.research[b]);
    }
  }

  // ── Family tree ──────────────────────────────────────────
  buildFam() {
    const SZ = 1500, C = SZ / 2, STEP = 175, NW = 170, NH = 84;
    const tree = $('#fam-tree');
    tree.style.width = SZ + 'px'; tree.style.height = (SZ - 300) + 'px';
    const yOff = -150;
    const pos = s => {
      const a = -Math.PI / 2 + s.dir * Math.PI / 3;
      return { x: C + Math.cos(a) * s.d * STEP * 1.25, y: C + yOff + Math.sin(a) * s.d * STEP };
    };
    let svg = `<svg class="links" width="100%" height="100%">`;
    for (const s of SKILLS) for (const [q] of s.req) {
      const a = pos(SKILL_BY_ID[q]), b = pos(s);
      svg += `<line data-link="${q}>${s.id}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" />`;
    }
    svg += '</svg>';
    const BR = ['BLOODLINE', 'LOGISTICS', 'INDUSTRY', 'COMMERCE', 'ACADEMIA', 'BUREAUCRACY'];
    let html = svg;
    BR.forEach((b, i) => {
      const p = pos({ dir: i, d: i === 4 ? 4.75 : 3.75 });
      html += `<div class="branch-l" style="left:${p.x}px;top:${p.y}px">${b}</div>`;
    });
    for (const s of SKILLS) {
      const p = pos(s);
      html += `<div class="node sk ${s.id === 'founder' ? 'root' : ''}" data-skill="${s.id}" style="left:${p.x - NW / 2}px;top:${p.y - NH / 2}px">
        <div class="n-name">${esc(s.name)}</div>
        <div class="n-fx"></div>
        <div class="n-cost mono"></div></div>`;
    }
    setHTML(tree, html);
    tree.addEventListener('mouseover', e => {
      const el = e.target.closest('[data-skill]'); if (!el) return;
      const s = SKILL_BY_ID[el.dataset.skill], l = this.g.meta.skills[s.id] || 0;
      const next = l < s.max ? ` <span class="acc">Next: ${esc(s.fxt(l + 1))}</span>` : '';
      setHTML($('#fam-info'), `<b>${esc(s.name)}</b> — ${esc(s.desc)}${next}${s.req.length && s.id !== 'founder' ? ` <span class="dim">· requires ${s.req.map(([q, lv]) => esc(SKILL_BY_ID[q].name) + (lv > 1 ? ' ' + lv : '')).join(', ')}</span>` : ''}`);
    });
    this.famNodes = [...tree.querySelectorAll('[data-skill]')];
    this.famLinks = [...tree.querySelectorAll('[data-link]')];
  }
  updateFam() {
    const meta = this.g.meta;
    setHTML($('#fam-l'), `◆${fmt(meta.legacy)} <span class="dim">· GENERATIONAL WEALTH +${fmt(meta.legacyTotal * LEGACY_BONUS * 100)}% ALL OUTPUT</span>`);
    for (const el of this.famNodes) {
      const s = SKILL_BY_ID[el.dataset.skill], l = meta.skills[s.id] || 0, st = s.id === 'founder' ? 'maxed' : S.skillState(this.g, s.id);
      setClass(el, el.className.replace(/\b(maxed|locked|available|affordable|owned)\b/g, '').trim() + ' ' + st + (l > 0 ? ' owned' : ''));
      setText(el.children[1], l > 0 ? s.fxt(l) : s.fxt(1));
      setText(el.children[2], s.id === 'founder' ? 'DECEASED' : `${l}/${s.max}` + (l < s.max ? ` · ◆${fmt(s.cost(l))}` : ' · MAX'));
    }
    for (const ln of this.famLinks) {
      const [a, b] = ln.dataset.link.split('>');
      ln.classList.toggle('on', (meta.skills[a] || 0) > 0);
      ln.classList.toggle('done', (meta.skills[b] || 0) > 0);
    }
  }
  renderEvolve() {
    const g = this.g, gain = S.legacyGain(g), r = this.run;
    const f = S.progress(g);
    $('#evolve').innerHTML = `
      <h3>EVOLVE THE DYNASTY</h3>
      <p>The current heir is retired to a small island. Through a regrettable clerical error, ${esc(MOUNTAIN_NAME)} is restored to its original condition. The family remembers.</p>
      <dl>
        <dt>Liquidated</dt><dd class="mono">${pct(f)}</dd>
        <dt>Years this run</dt><dd class="mono">${yrs(r.complete ? r.finishYears : r.years)}</dd>
        <dt>Best time</dt><dd class="mono">${yrs(g.meta.bestYears)}</dd>
        <dt>Runs</dt><dd class="mono">${g.meta.runs}</dd>
      </dl>
      <div class="gain">+◆${fmt(gain)} <span>LEGACY</span></div>
      <p class="dim small">Legacy = progress bonus (${pct(f, 0)} liquidated)${r.complete ? ' + completion bonus (faster = more)' : '. Finish the mountain for a large completion bonus; the faster, the bigger.'}</p>
      <button class="btn big ${gain > 0 ? '' : 'disabled'}" data-evolve>${this.armed ? 'CONFIRM — RESET THIS RUN' : 'EVOLVE ▶'}</button>
      <p class="dim small">You keep: Legacy, Family Tree, records. You lose: everything else, emotionally included.</p>`;
  }
  evolveClick(btn) {
    if (S.legacyGain(this.g) <= 0) return;
    if (!this.armed && !this.run.complete) { this.armed = true; this.renderEvolve(); setTimeout(() => { this.armed = false; if (this.open === 'fam') this.renderEvolve(); }, 4000); return; }
    this.armed = false;
    const gain = this.actions.evolve();
    $('#ov-complete').hidden = true;
    this.unitKey = '';
    this.toast('THE DYNASTY EVOLVES', `+◆${fmt(gain)} Legacy. A new heir. The same mountain. Fresh optimism.`);
    this.show('fam');
  }

  // ── Ledger ───────────────────────────────────────────────
  renderLedger() {
    const g = this.g, r = this.run, m = g.meta, s = g.settings;
    const tog = (k, label) => `<button class="chip ${s[k] ? 'on' : ''}" data-set="${k}">${label}: ${s[k] ? 'ON' : 'OFF'}</button>`;
    $('#ledger').innerHTML = `
      <h3>THIS RUN</h3>
      <dl class="grid">
        <dt>Years elapsed</dt><dd>${yrs(r.years)}</dd>
        <dt>Generations</dt><dd>${r.gen + 1}</dd>
        <dt>Rock liquidated</dt><dd>${tons(r.mined)}</dd>
        <dt>Rock processed</dt><dd>${tons(r.processed)}</dd>
        <dt>Credits earned</dt><dd>${cr(r.earned)}</dd>
        <dt>Research earned</dt><dd>${rp(r.rpEarned)}</dd>
        <dt>Founder clicks</dt><dd>${fmt(r.clicks)} (${tons(r.clickTons)})</dd>
        ${r.eraYears.map((y, i) => y != null ? `<dt>Era ${ERAS[i].roman} reached</dt><dd>year ${y.toFixed(1)}</dd>` : '').join('')}
      </dl>
      <h3>DYNASTY RECORDS</h3>
      <dl class="grid">
        <dt>Best liquidation</dt><dd>${yrs(m.bestYears)}</dd>
        <dt>Par</dt><dd>${PAR_YEARS} yrs</dd>
        <dt>Runs</dt><dd>${m.runs}</dd>
        <dt>Lifetime Legacy</dt><dd>◆${fmt(m.legacyTotal)}</dd>
      </dl>
      ${m.history.length ? `<table class="hist"><tr><th>#</th><th>RESULT</th><th>YEARS</th><th>ERA</th><th>◆</th></tr>
        ${m.history.map(h => `<tr><td>${h.run}</td><td>${h.complete ? 'LIQUIDATED' : 'ABANDONED ' + pct(h.pct, 0)}</td><td>${h.years.toFixed(1)}</td><td>${ERAS[h.era].roman}</td><td>${h.legacy}</td></tr>`).join('')}</table>` : ''}
      <h3>SETTINGS</h3>
      <div class="chips">
        ${tog('tilt', 'TILT-SHIFT')} ${tog('grain', 'FILM GRAIN')} ${tog('autoRotate', 'ORBIT CAMERA')} ${tog('offline', 'OFFLINE PROGRESS')}
      </div>
      <p class="dim small">Offline progress simulates up to 8 hours while the game is closed. Years keep passing while you're away; the mountain does not care about your schedule.</p>
      <h3>SAVE</h3>
      <div class="chips">
        <button class="chip" data-act="save">SAVE NOW</button>
        <button class="chip" data-act="exportSave">EXPORT</button>
        <button class="chip" data-act="importSave">IMPORT</button>
        <button class="chip danger" data-act="hardReset">HARD RESET</button>
      </div>`;
  }

  // ── units list ───────────────────────────────────────────
  buildUnits(m) {
    const r = this.run, amt = this.g.settings.buyAmt;
    let html = '';
    for (const c of CATS) {
      html += `<div class="cat" data-cat="${c.id}">
        <div class="cat-h"><span class="sym">${c.sym}</span>${c.name.toUpperCase()}<span class="dim cat-desc">${esc(c.desc)}</span>
        ${m.auto ? `<button class="chip auto ${r.autoOn[c.id] ? 'on' : ''}" data-auto="${c.id}" title="Gary from Procurement buys the most cost-effective unit">AUTO ${r.autoOn[c.id] ? 'ON' : 'OFF'}</button>` : ''}</div>`;
      for (let e = 0; e <= Math.min(ERAS.length - 1, r.era + 1); e++) {
        const u = UNITS[c.id][e];
        if (e > r.era) {
          html += `<div class="unit locked"><div class="u-era">${ERAS[e].roman}</div><div class="u-main"><div class="u-name">▒▒▒▒▒▒▒▒</div><div class="u-desc">Requires Generational Leap to Era ${ERAS[e].roman}.</div></div></div>`;
          continue;
        }
        html += `<div class="unit" data-u="${c.id}:${e}">
          <div class="u-era">${ERAS[e].roman}</div>
          <div class="u-main"><div class="u-name">${esc(u.name)} <span class="u-own mono"></span></div>
            <div class="u-desc">${esc(u.desc)}</div><div class="u-rate mono"></div></div>
          <button class="buy" data-buy="${c.id}:${e}"><span class="b-n"></span><span class="b-c mono"></span></button></div>`;
      }
      html += '</div>';
    }
    $('#units').innerHTML = html;
    this.unitEls = [...this.root.querySelectorAll('[data-u]')].map(el => {
      const [cat, e] = el.dataset.u.split(':');
      return { el, cat, e: +e, own: $('.u-own', el), rate: $('.u-rate', el), btn: $('.buy', el), n: $('.b-n', el), c: $('.b-c', el) };
    });
  }

  // ── per-frame-ish refresh ────────────────────────────────
  update(force = false) {
    const g = this.g, r = this.run, meta = g.meta;
    const m = S.getMods(g), R = S.rates(g, m);
    const calLvl = meta.skills.calendar || 0;
    const ck = clock(r.complete ? r.finishYears : r.years, calLvl);
    setText($('#year'), ck.year);
    setText($('#month'), ck.month);
    setText($('#gen'), `GEN ${S.roman(r.gen + 1)}`);
    setText($('#heir'), `CEO ${r.heir.name}`);
    setText($('#trait'), `TRAIT: ${r.heir.trait.name} — ${Object.entries(r.heir.trait.mods).map(([k, v]) => `${k} ×${v}`).join(', ')}`);

    const f = S.progress(g);
    setText($('#pct'), pct(f, f < 0.1 ? 3 : 2));
    $('#pbar').style.width = (f * 100) + '%';
    setText($('#strata'), S.stratum(f).toUpperCase());
    setText($('#density'), '×' + fmt(S.density(f)));
    setText($('#era-name'), `${ERAS[r.era].roman} · ${ERAS[r.era].name.toUpperCase()}`);

    setText($('#credits'), cr(r.credits));
    setText($('#credits-d'), `+${fmt(r.flow.cash)}/s · ₵${fmt(S.valuePerTon(m))}/t`);
    setText($('#rp'), fmt(r.rp));
    setText($('#rp-d'), `+${fmt(r.flow.rp)}/s`);
    setText($('#legacy'), '◆' + fmt(meta.legacy));
    const gain = S.legacyGain(g);
    setText($('#legacy-d'), gain > 0 ? `+${fmt(gain)} on evolve` : 'evolve to earn');

    // pipeline
    const flows = { mining: r.flow.mine, extraction: r.flow.haul, processing: r.flow.proc };
    const fc = S.faceCap(R, m), yc = S.yardCap(R, m);
    const minCat = ['mining', 'extraction', 'processing'].reduce((a, b) => (R[b] < R[a] ? b : a));
    for (const st of this.root.querySelectorAll('.stage')) {
      const c = st.dataset.cat;
      setHTML($('.st-rate', st), `${fmt(flows[c])}<small> / ${fmt(R[c])} t/s</small>`);
      let fill = 0, note = '';
      if (c === 'mining') { fill = r.face / fc; note = fill > 0.97 ? 'FACE CLOGGED' : `face ${tons(r.face)}`; }
      else if (c === 'extraction') { fill = r.yard / yc; note = fill > 0.97 ? 'YARD FULL' : `yard ${tons(r.yard)}`; }
      else { note = `₵${fmt(S.valuePerTon(m))}/t · ${fmt(S.rpPerTon(m))} RP/t`; fill = R.processing > 0 ? Math.min(1, flows.processing / R.processing) : 0; }
      $('.st-buf i', st).style.width = (Math.min(1, fill) * 100) + '%';
      setText($('.st-note', st), note);
      const tag = $('.tag', st);
      setText(tag, c === minCat ? 'BOTTLENECK' : '');
      st.classList.toggle('neck', c === minCat);
    }
    setHTML($('#buffs'), r.buffs.map(b => `<span class="buff ${b.x < 1 ? 'neg' : ''}">${b.k.toUpperCase()} ×${b.x} <i>${Math.ceil(b.until - r.t)}s</i></span>`).join(''));

    // units
    const key = `${r.era}|${m.auto}|${g.settings.buyAmt}|${JSON.stringify(r.autoOn)}`;
    if (key !== this.unitKey) { this.unitKey = key; this.buildUnits(m); }
    const amt = g.settings.buyAmt;
    for (const u of this.unitEls) {
      const n = S.resolveAmt(g, u.cat, u.e, amt);
      const cost = S.unitCost(g, u.cat, u.e, n);
      const owned = r.units[u.cat][u.e];
      const each = S.unitRate(u.cat, u.e, m);
      setText(u.own, owned ? '×' + fmt(owned) : '');
      setText(u.rate, `${fmt(each)} t/s each${owned ? ' · ' + fmt(each * owned) + ' t/s total' : ''}`);
      setText(u.n, '×' + fmt(n));
      setText(u.c, cr(cost));
      u.btn.classList.toggle('disabled', cost > r.credits);
    }

    // badges
    const rdAff = RESEARCH.filter(n => S.researchState(g, n.id) === 'affordable').length;
    setText($('#rd-badge'), rdAff ? rdAff : '');
    const famAff = SKILLS.filter(s => s.id !== 'founder' && S.skillState(g, s.id) === 'affordable').length;
    setText($('#fam-badge'), famAff ? famAff : (gain > 0 && f > 0.25 ? '◆' : ''));

    if (this.open === 'rd') this.updateRD();
    if (this.open === 'fam') { this.updateFam(); if (force) this.renderEvolve(); }
    if (r.clicks >= 6) $('#hint').hidden = true;
  }

  // ── reactions to sim events ──────────────────────────────
  handle(ev) {
    if (ev.type === 'gen') {
      const t = ev.heir.trait;
      this.toast(`GENERATION ${S.roman(ev.heir.gen + 1)}`, `${ev.heir.name} inherits the company, the mountain and the debt. Trait: ${t.name}.`);
    } else if (ev.type === 'era') {
      const e = ERAS[ev.era];
      const b = $('#banner');
      b.innerHTML = `<div class="b-k">GENERATIONAL LEAP</div><div class="b-t">ERA ${e.roman} — ${esc(e.name.toUpperCase())}</div><div class="b-s">${esc(e.blurb)}</div>`;
      b.hidden = false; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
      clearTimeout(this._bt); this._bt = setTimeout(() => { b.hidden = true; }, 5200);
      this.unitKey = '';
    } else if (ev.type === 'event') {
      const e = EVENTS.find(x => x.id === ev.id);
      const el = $('#memo');
      el.innerHTML = `<div class="memo-k">MEMO FROM THE BOARD</div><div class="memo-t">${esc(e.title)}</div><div class="memo-b">${esc(e.body)}</div>
        <div class="memo-o">${e.opts.map((o, i) => `<button class="btn" data-memo="${i}">${esc(o.label)}</button>`).join('')}</div>`;
      el.hidden = false;
    } else if (ev.type === 'complete') {
      this.showComplete();
    }
  }
  showComplete() {
    const g = this.g, r = this.run, gain = S.legacyGain(g);
    const best = g.meta.bestYears;
    const record = best == null || r.finishYears < best;
    $('#complete').innerHTML = `
      <div class="memo-k">NOTICE OF TOTAL LIQUIDATION</div>
      <h2>${esc(MOUNTAIN_NAME.toUpperCase())} IS GONE.</h2>
      <p>After <b>${r.finishYears.toFixed(1)} years</b> and <b>${r.gen + 1} generations</b>, the mountain has been fully converted into gravel, money, and a strongly worded documentary.</p>
      ${record ? '<p class="acc"><b>NEW DYNASTY RECORD.</b> The family portrait has been updated.</p>' : `<p class="dim">Dynasty record: ${yrs(best)}.</p>`}
      <div class="gain">+◆${fmt(gain)} <span>LEGACY ON EVOLVE</span></div>
      <div class="memo-o">
        <button class="btn big" data-evolve>EVOLVE THE DYNASTY ▶</button>
        <button class="btn" data-act="admire">ADMIRE THE HOLE</button>
      </div>`;
    $('#ov-complete').hidden = false;
  }

  toast(title, body) {
    const el = h(`<div class="toast panel"><b>${esc(title)}</b><span>${esc(body)}</span></div>`);
    $('#toasts').prepend(el);
    setTimeout(() => el.classList.add('out'), 6500);
    setTimeout(() => el.remove(), 7200);
    const all = $('#toasts').children; while (all.length > 5) all[all.length - 1].remove();
  }
  floater(x, y, text) {
    const el = h(`<div class="floater mono">${esc(text)}</div>`);
    el.style.left = x + 'px'; el.style.top = y + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  // ── news ticker ──────────────────────────────────────────
  buildTicker() {
    const el = $('#ticker');
    const fill = () => {
      const era = this.run.era;
      const pool = [...NEWS.any, ...(NEWS[era] || []), ...(NEWS[era - 1] || [])];
      const picks = [];
      while (picks.length < 6) { const p = pool[Math.floor(Math.random() * pool.length)]; if (!picks.includes(p)) picks.push(p); }
      el.innerHTML = picks.map(p => `<span>${esc(p)}</span>`).join('<i>■</i>');
      el.style.animation = 'none'; void el.offsetWidth;
      const dur = Math.max(30, el.scrollWidth / 70);
      el.style.animation = `ticker ${dur}s linear 1`;
    };
    el.addEventListener('animationend', fill);
    fill();
  }
}
