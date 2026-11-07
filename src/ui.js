// ─────────────────────────────────────────────────────────────
//  MOUNT QUOTA — DOM interface
// ─────────────────────────────────────────────────────────────
import {
  GAME_TITLE, COMPANY, MOUNTAINS, MOUNTAIN_BY_ID, FX_LABEL, ERAS, CATS, UNITS, RESEARCH, RESEARCH_BY_ID, RD_ROWS, SKILLS, SKILL_BY_ID,
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

const zoomer = id => `<div class="zoomer" data-zoomer="${id}"><button class="chip" data-zoom="${id}:-" title="Zoom out (or pinch / ctrl+scroll)">−</button><span class="mono z-v">100%</span><button class="chip" data-zoom="${id}:+" title="Zoom in">+</button><button class="chip" data-zoom="${id}:fit" title="Fit the whole tree">FIT</button></div>`;
const modsText = def => {
  const parts = Object.entries(def.mods).map(([k, v]) => `<b class="${v >= 1 ? 'up' : 'down'}">${esc(FX_LABEL[k])} ×${v}</b>`);
  if (def.massX !== 1) parts.push(`<b class="${def.massX > 1 ? 'down' : 'up'}">Tonnage ×${fmt(Math.exp(Math.log(1e11) * (def.massX - 1)))}</b>`);
  return parts.length ? parts.join(' ') : '<b>No modifiers. Just rock.</b>';
};

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
        <button class="ot" id="ot" hidden data-overtime title="Spend banked Deferred Time: all output ×2 while it lasts. Years pass normally.">◷ <span id="ot-v"></span> <b id="ot-l">OVERTIME</b></button>
      </div>
      <nav class="menu">
        <button class="btn" data-open="rd">R&amp;D TREE <em id="rd-badge"></em></button>
        <button class="btn" data-open="fam">FAMILY TREE <em id="fam-badge"></em></button>
        <button class="btn" data-open="ledger">LEDGER</button>
      </nav>
    </header>

    <section class="mtn panel">
      <div class="mtn-row">
        <span class="mname" id="mname"></span><span class="mmods mono" id="mmods"></span>
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
      <div class="gary" id="gary" hidden>
        <b class="g-name" id="gary-n">GARY</b><span class="g-t" id="gary-t"></span>
        <label class="g-b" id="gary-b" title="Share of your credits Gary may spend">BUDGET <input type="range" min="0.1" max="1" step="0.05" data-budget><span class="mono" id="gary-bv"></span></label>
      </div>
      <div class="units" id="units"></div>
    </aside>

    <div class="memo panel" id="memo" hidden></div>
    <div class="succ panel" id="succ" hidden></div>
    <div class="toasts" id="toasts"></div>
    <div class="banner" id="banner" hidden></div>
    <div class="drain" id="drain" hidden><b>▶▶ ×${S.DRAIN_SPEED}</b> LAST BLOCK MINED — FAST-FORWARDING FINAL SHIPMENTS <span class="mono" id="drain-t"></span></div>
    <div class="hint" id="hint">▲ CLICK THE MOUNTAIN — THE FOUNDER WILL PERSONALLY SWING A PICKAXE</div>
    <footer class="ticker"><div class="tk-label">QUARRY NEWS NETWORK</div><div class="tk-track"><div class="tk-inner" id="ticker"></div></div></footer>

    <div class="overlay" id="ov-rd" hidden>
      <div class="ov-panel panel">
        <div class="ov-head">
          <h2>R&amp;D — RESEARCH &amp; DOWNSIZING</h2>
          <div class="rdauto" id="rd-auto"></div>
          ${zoomer('rd')}
          <div class="ov-stat mono" id="rd-rp"></div>
          <button class="x btn" data-close>✕</button>
        </div>
        <div class="ov-body pan" id="rd-body"><div class="tree" id="rd-tree"></div></div>
        <div class="ov-info" id="rd-info">Hover a node. Click to research. Generational Leaps unlock the next era of equipment.</div>
      </div>
    </div>

    <div class="overlay" id="ov-fam" hidden>
      <div class="ov-panel panel">
        <div class="ov-head">
          <h2>FAMILY TREE — PERMANENT INHERITANCE</h2>
          ${zoomer('fam')}
          <div class="ov-stat mono" id="fam-l"></div>
          <button class="x btn" data-close>✕</button>
        </div>
        <div class="fam-wrap">
          <div class="ov-body pan" id="fam-body"><div class="tree" id="fam-tree"></div></div>
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
    this.root.addEventListener('input', e => {
      if (e.target.dataset.budget != null) { this.g.settings.garyBudget = +e.target.value; setText($('#gary-bv'), Math.round(this.g.settings.garyBudget * 100) + '%'); return; }
      const k = e.target.dataset.vol; if (!k) return;
      this.g.settings[k] = +e.target.value; this.actions.settings();
    });
    this.bindBuyPress();
    this.buildTicker();
    this.applyTicker();
    this.buildRD();
    this.buildFam();
    this.zoom = { rd: 1, fam: 1 };
    this.bindPan('rd'); this.bindPan('fam');
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
      if (!S.doResearch(this.g, n.id)) { if (S.researchState(this.g, n.id) === 'available') this.sfx('denied'); return; }
      if (!n.fx.some(e => e.k === 'era')) this.sfx('research');
      { this.toast(`RESEARCHED — ${n.name}`, fxText(n.fx)); this.renderRdAuto(); this.update(true); }
      return;
    }
    if (t.dataset.skill) {
      if (S.buySkill(this.g, t.dataset.skill)) { this.sfx('skill'); const s = SKILL_BY_ID[t.dataset.skill]; this.toast(`INHERITED — ${s.name}`, s.fxt(this.g.meta.skills[s.id])); this.update(true); }
      return;
    }
    if (t.dataset.overtime != null) { const on = S.setOvertime(this.g, !this.run.overtime); this.sfx(on ? 'leap' : 'select'); if (on) this.toast('OVERTIME AUTHORISED', 'All output ×2 until the Deferred Time bank runs dry. HR has been informed (HR is also working overtime).'); return this.update(true); }
    if (t.dataset.heir != null) { S.chooseHeir(this.g, +t.dataset.heir); return; }
    if (t.dataset.memo != null) {
      const out = S.resolveEvent(this.g, +t.dataset.memo);
      this.sfx('memoPick');
      $('#memo').hidden = true;
      if (out) this.toast('BOARD DECISION', out);
      return;
    }
    if (t.dataset.mtn) { S.pickMountain(this.g, t.dataset.mtn); this.sfx('select'); return this.renderEvolve(); }
    if (t.dataset.evolve != null) return this.evolveClick(t);
    if (t.dataset.act) return this.actions[t.dataset.act]?.(t);
    if (t.dataset.zoom) { const [id, op] = t.dataset.zoom.split(':'); return this.zoomTree(id, op); }
    if (t.dataset.rprio) { this.g.settings.researchPriority = t.dataset.rprio; this.sfx('select'); return this.renderRdAuto(); }
    if (t.dataset.set) {
      const k = t.dataset.set, s = this.g.settings;
      s[k] = !s[k]; this.actions.settings(); this.applyTicker(); this.renderLedger(); this.renderRdAuto(); return;
    }
  }

  sfx(name, ...a) { this.actions.sound?.play(name, ...a); }

  buy(btn) {
    const [cat, ei] = btn.dataset.buy.split(':');
    const ok = S.buyUnit(this.g, cat, +ei, this.g.settings.buyAmt);
    if (ok) this.flash(btn);
    this.sfx(ok ? 'buy' : 'denied', cat);
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

  // ── tree navigation: drag to pan, zoom buttons, pinch / ctrl+wheel ──
  bindPan(id) {
    const body = $(`#${id}-body`);
    let drag = null;
    body.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('.node, button')) return;
      drag = { x: e.clientX, y: e.clientY, l: body.scrollLeft, t: body.scrollTop, id: e.pointerId };
      body.setPointerCapture(e.pointerId); body.classList.add('dragging');
    });
    body.addEventListener('pointermove', e => {
      if (!drag) return;
      body.scrollLeft = drag.l - (e.clientX - drag.x);
      body.scrollTop = drag.t - (e.clientY - drag.y);
    });
    const end = () => { if (drag) { body.releasePointerCapture?.(drag.id); drag = null; body.classList.remove('dragging'); } };
    body.addEventListener('pointerup', end); body.addEventListener('pointercancel', end);
    body.addEventListener('wheel', e => {
      if (!e.ctrlKey && !e.metaKey) return;          // trackpad pinch arrives as ctrl+wheel
      e.preventDefault();
      this.zoomTree(id, Math.exp(-e.deltaY * 0.01), e);
    }, { passive: false });
  }
  zoomTree(id, op, ev) {
    const body = $(`#${id}-body`), tree = $(`#${id}-tree`);
    const old = this.zoom[id];
    const w = parseFloat(tree.style.width), hgt = parseFloat(tree.style.height);
    let z = op === '+' ? old * 1.2 : op === '-' ? old / 1.2
      : op === 'fit' ? Math.min(body.clientWidth / w, body.clientHeight / hgt, 1) : old * op;
    z = Math.max(0.35, Math.min(1.6, z));
    // keep the point under the cursor (or the view centre) fixed while zooming
    const r = body.getBoundingClientRect();
    const fx = ev ? ev.clientX - r.left : body.clientWidth / 2, fy = ev ? ev.clientY - r.top : body.clientHeight / 2;
    const cx = (body.scrollLeft + fx) / old, cy = (body.scrollTop + fy) / old;
    this.zoom[id] = z;
    tree.style.zoom = z;
    body.scrollLeft = cx * z - fx; body.scrollTop = cy * z - fy;
    if (op === 'fit') { body.scrollLeft = (body.scrollWidth - body.clientWidth) / 2; body.scrollTop = (body.scrollHeight - body.clientHeight) / 2; }
    setText($(`[data-zoomer="${id}"] .z-v`), Math.round(z * 100) + '%');
  }
  centreFam() {
    const b = $('#fam-body'), z = this.zoom.fam;
    b.scrollLeft = this.famRoot.x * z - b.clientWidth / 2;
    b.scrollTop = this.famRoot.y * z - b.clientHeight / 2;
  }

  renderSuccession() {
    const r = this.run, s = r.succession, el = $('#succ');
    if (!s) { el.hidden = true; return; }
    // for "years elapse" a value above 1 is the bad direction
    const traitTxt = mods => Object.entries(mods).map(([k, v]) => `<b class="${(k === 'time' ? v <= 1 : v >= 1) ? 'up' : 'down'}">${esc(FX_LABEL[k] || k)} ×${+v.toFixed(3)}</b>`).join(' ');
    el.innerHTML = `
      <div class="memo-k">SUCCESSION — GENERATION ${S.roman(s.gen + 1)}</div>
      <div class="memo-t">${esc(r.heir.name)} has died. Choose the next CEO.</div>
      <div class="cands">${s.candidates.map((c, i) => `
        <button class="cand" data-heir="${i}">
          <span class="c-n">${esc(c.name)}</span>
          <span class="c-t">${esc(c.trait.name)}${c.trait.rare ? ' <i>RARE</i>' : ''}</span>
          <span class="c-m">${traitTxt(c.trait.mods)}</span>
          <span class="c-b">${esc(c.bio)}</span>
        </button>`).join('')}</div>
      <div class="succ-f mono">The board decides in <b id="succ-t"></b>. ${esc(r.heir.name)}'s trait applies until then.</div>`;
    el.hidden = false;
  }

  renderRdAuto() {
    const el = $('#rd-auto'), m = S.getMods(this.g), s = this.g.settings;
    if (!m.autoResearch) { setHTML(el, ''); return; }
    if (!m.researchPro) {
      setHTML(el, `<b>PLANNING COMMITTEE</b><button class="chip ${s.autoResearch ? 'on' : ''}" data-set="autoResearch">${s.autoResearch ? 'ON' : 'OFF'}</button><span class="mono dim" title="Gary Jr. (Family Tree) adds priorities and works from the start of every run">cheapest first</span><span class="mono dim" id="rd-auto-t"></span>`);
      return;
    }
    const P = [['cheapest', 'BALANCED', 'Cheapest first. Fastest overall.'], ['leaps', 'RUSH LEAPS', 'Generational Leaps first. Skips cheap multipliers, so usually slower.'], ['commerce', 'COMMERCE FIRST', 'Credits & doctrine first.']];
    setHTML(el, `<b>GARY JR.</b><button class="chip ${s.autoResearch ? 'on' : ''}" data-set="autoResearch">${s.autoResearch ? 'ON' : 'OFF'}</button>
      ${P.map(([k, l, tip]) => `<button class="chip ${s.researchPriority === k ? 'on' : ''}" data-rprio="${k}" title="${tip}">${l}</button>`).join('')}<span class="mono dim" id="rd-auto-t"></span>`);
  }
  applyTicker() { document.body.classList.toggle('no-ticker', !this.g.settings.ticker); }
  refreshSound() { if (this.open === 'ledger') this.renderLedger(); }

  markAmt() {
    this.root.querySelectorAll('[data-amt]').forEach(b => b.classList.toggle('on', String(this.g.settings.buyAmt) === b.dataset.amt));
  }
  flash(el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }

  show(id) {
    this.close();
    this.open = id;
    $(`#ov-${id}`).hidden = false;
    this.sfx('open');
    if (id === 'ledger') this.renderLedger();
    if (id === 'rd') this.renderRdAuto();
    if (id === 'fam') { this.renderEvolve(); this.centreFam(); }
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
    const STEP = 175, NW = 170, NH = 84, PAD = 60;
    const tree = $('#fam-tree');
    const BR_D = i => (i === 4 || i === 5 ? 4.75 : 3.75);
    const raw = s => {
      const a = -Math.PI / 2 + s.dir * Math.PI / 3 + (s.da || 0);
      return { x: Math.cos(a) * s.d * STEP * 1.25, y: Math.sin(a) * s.d * STEP };
    };
    // size the canvas from the actual node + label positions so no branch can fall off an edge
    const pts = [...SKILLS.map(raw), ...[0, 1, 2, 3, 4, 5].map(i => raw({ dir: i, d: BR_D(i) }))];
    const minX = Math.min(...pts.map(p => p.x)) - NW / 2 - PAD, maxX = Math.max(...pts.map(p => p.x)) + NW / 2 + PAD;
    const minY = Math.min(...pts.map(p => p.y)) - NH / 2 - PAD, maxY = Math.max(...pts.map(p => p.y)) + NH / 2 + PAD;
    tree.style.width = (maxX - minX) + 'px'; tree.style.height = (maxY - minY) + 'px';
    const pos = s => { const p = raw(s); return { x: p.x - minX, y: p.y - minY }; };
    this.famRoot = pos(SKILL_BY_ID.founder);
    let svg = `<svg class="links" width="100%" height="100%">`;
    for (const s of SKILLS) for (const [q] of s.req) {
      const a = pos(SKILL_BY_ID[q]), b = pos(s);
      svg += `<line data-link="${q}>${s.id}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" />`;
    }
    svg += '</svg>';
    const BR = ['BLOODLINE', 'LOGISTICS', 'INDUSTRY', 'COMMERCE', 'ACADEMIA', 'BUREAUCRACY'];
    let html = svg;
    BR.forEach((b, i) => {
      const p = pos({ dir: i, d: BR_D(i) });
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
      <p>The current heir is retired to a small island. The board acquires a new mountain. The family remembers.</p>
      <dl>
        <dt>Liquidated</dt><dd class="mono">${pct(f)}</dd>
        <dt>Years this run</dt><dd class="mono">${yrs(r.complete ? r.finishYears : r.years)}</dd>
        <dt>Record here</dt><dd class="mono">${yrs(g.meta.records[S.mtnDef(r).id])}</dd>
        <dt>Best anywhere</dt><dd class="mono">${yrs(g.meta.bestYears)}</dd>
        <dt>Runs</dt><dd class="mono">${g.meta.runs}</dd>
      </dl>
      <div class="gain">+◆${fmt(gain)} <span>LEGACY</span></div>
      <h4>NEXT ACQUISITION — BOARD SURVEY</h4>
      <div class="offer">${S.mountainOffer(g).map(id => {
        const d = MOUNTAIN_BY_ID[id], rec = g.meta.records[id];
        return `<button class="mcard ${g.meta.pick === id ? 'on' : ''}" data-mtn="${id}">
          <span class="mc-n">${esc(d.name)}</span><span class="mc-b">${esc(d.blurb)}</span>
          <span class="mc-m">${modsText(d)}</span>
          <span class="mc-r mono">LEGACY ×${d.legacyX} · ${rec != null ? 'RECORD ' + yrs(rec) : 'UNMINED'}</span></button>`;
      }).join('')}</div>
      <p class="dim small">Legacy = progress bonus (${pct(f, 0)} liquidated)${r.complete ? ' + completion bonus (faster = more)' : '. Finish the mountain for a large completion bonus; the faster, the bigger.'}</p>
      <button class="btn big ${gain > 0 ? '' : 'disabled'}" data-evolve>${this.armed ? 'CONFIRM — RESET THIS RUN' : 'EVOLVE ▶'}</button>
      <p class="dim small">You keep: Legacy, Family Tree, records. You lose: everything else, emotionally included.</p>`;
  }
  evolveClick(btn) {
    if (S.legacyGain(this.g) <= 0) return;
    if (!this.armed && !this.run.complete) { this.armed = true; this.renderEvolve(); setTimeout(() => { this.armed = false; if (this.open === 'fam') this.renderEvolve(); }, 4000); return; }
    this.armed = false;
    const gain = this.actions.evolve();
    this.sfx('evolve');
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
        <dt>Best liquidation (any)</dt><dd>${yrs(m.bestYears)}</dd>
        ${MOUNTAINS.map(d => `<dt>${esc(d.name)}</dt><dd>${m.records[d.id] != null ? yrs(m.records[d.id]) : '—'}</dd>`).join('')}
        <dt>Par</dt><dd>${PAR_YEARS} yrs</dd>
        <dt>Runs</dt><dd>${m.runs}</dd>
        <dt>Lifetime Legacy</dt><dd>◆${fmt(m.legacyTotal)}</dd>
      </dl>
      ${m.history.length ? `<table class="hist"><tr><th>#</th><th>MOUNTAIN</th><th>RESULT</th><th>YEARS</th><th>ERA</th><th>◆</th></tr>
        ${m.history.map(h => `<tr><td>${h.run}</td><td>${esc((MOUNTAIN_BY_ID[h.mtn] || MOUNTAINS[0]).name)}</td><td>${h.complete ? 'LIQUIDATED' : 'ABANDONED ' + pct(h.pct, 0)}</td><td>${h.years.toFixed(1)}</td><td>${ERAS[h.era].roman}</td><td>${h.legacy}</td></tr>`).join('')}</table>` : ''}
      <h3>SETTINGS</h3>
      <div class="chips">
        ${tog('tilt', 'TILT-SHIFT')} ${tog('grain', 'FILM GRAIN')} ${tog('autoRotate', 'ORBIT CAMERA')} ${tog('ticker', 'NEWS TICKER')}
      </div>
      <p class="dim small">While you're away no in-game time passes, so closing the tab never hurts your record. Time away is banked as Deferred Time (25% of it, up to 30 minutes), which you spend as Overtime: all output ×2 for as long as it lasts. Use the ◷ button under the clock.</p>
      <h3>SOUND</h3>
      <div class="chips">${tog('sound', 'SOUND')} <span class="dim small">Press M anywhere to toggle.</span></div>
      <div class="sliders">
        ${[['volume', 'MASTER'], ['sfxVol', 'EFFECTS'], ['ambVol', 'AMBIENCE']].map(([k, l]) => `<label><span>${l}</span><input type="range" min="0" max="1" step="0.05" value="${s[k]}" data-vol="${k}"></label>`).join('')}
      </div>
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
            <div class="u-desc">${esc(u.desc)}</div><div class="u-rate mono"></div><div class="u-tags"></div></div>
          <button class="buy" data-buy="${c.id}:${e}"><span class="b-n"></span><span class="b-c mono"></span><span class="b-g mono"></span></button></div>`;
      }
      html += '</div>';
    }
    $('#units').innerHTML = html;
    this.unitEls = [...this.root.querySelectorAll('[data-u]')].map(el => {
      const [cat, e] = el.dataset.u.split(':');
      return { el, cat, e: +e, own: $('.u-own', el), rate: $('.u-rate', el), tags: $('.u-tags', el), btn: $('.buy', el), n: $('.b-n', el), c: $('.b-c', el), gn: $('.b-g', el) };
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
    setText($('#density'), '×' + fmt(S.density(r, f)));
    const def = S.mtnDef(r);
    setText($('#mname'), def.name.toUpperCase());
    setHTML($('#mmods'), modsText(def));
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
      const each = S.unitRate(g, u.cat, u.e, m);
      const units = r.units[u.cat];
      setText(u.own, owned ? '×' + fmt(owned) : '');
      setText(u.rate, `${fmt(each)} t/s each${owned ? ' · ' + fmt(each * owned) + ' t/s total' : ''}`);
      setText(u.n, '×' + fmt(n));
      setText(u.c, cr(cost));
      setText(u.gn, '+' + fmt(S.gainOf(g, u.cat, u.e, n, m)) + ' t/s');
      // why this unit is (still) worth buying
      const tags = [];
      const wf = S.workforceX(units, u.e);
      if (wf > 1.0001) tags.push(`<b class="t-wf" title="Every older ${esc(u.cat)} unit adds +1% to this one">WORKFORCE ×${wf.toFixed(2)}</b>`);
      const ms = S.milestonesHit(owned), nx = S.nextMilestone(owned);
      if (ms) tags.push(`<b class="t-ms" title="Each ownership milestone doubles this unit's output">MILESTONES ×${2 ** ms}</b>`);
      if (nx) tags.push(`<span class="t-nx">next ×2 at ${nx[0]} (${nx[0] - owned} to go)</span>`);
      if (u.e < r.era) {
        const boosted = units.slice(u.e + 1).reduce((a, b) => a + b, 0);
        tags.push(`<b class="t-cl" title="Obsolete equipment is ${Math.round((1 - S.depreciation(g, u.e)) * 100)}% off">CLEARANCE −${(100 - S.depreciation(g, u.e) * 100).toFixed(S.depreciation(g, u.e) < 0.001 ? 3 : 0)}%</b>`);
        if (boosted) tags.push(`<span class="t-nx">each one +1% to ${fmt(boosted)} newer units</span>`);
      }
      setHTML(u.tags, tags.join(''));
      u.btn.classList.toggle('disabled', cost > r.credits);
    }

    // badges
    const rdAff = RESEARCH.filter(n => S.researchState(g, n.id) === 'affordable').length;
    setText($('#rd-badge'), rdAff ? rdAff : '');
    const famAff = SKILLS.filter(s => s.id !== 'founder' && S.skillState(g, s.id) === 'affordable').length;
    setText($('#fam-badge'), famAff ? famAff : (gain > 0 && f > 0.25 ? '◆' : ''));

    // Gary status
    const gb = $('#gary');
    gb.hidden = !m.auto;
    if (m.auto) {
      setText($('#gary-n'), m.smartBuy ? "GARY, MBA" : 'GARY');
      const st = r.gary, anyOn = Object.values(r.autoOn).some(Boolean);
      const txt = !anyOn ? 'Idle — switch a department to AUTO.' : st ? st.text + (st.eta != null && isFinite(st.eta) ? ` · ${Math.ceil(st.eta)}s` : '') : 'Reviewing the catalogue…';
      setText($('#gary-t'), txt);
      gb.classList.toggle('saving', st?.mode === 'saving');
      $('#gary-b').hidden = !m.smartBuy;
      const inp = $('[data-budget]', gb);
      if (m.smartBuy && document.activeElement !== inp && +inp.value !== g.settings.garyBudget) inp.value = g.settings.garyBudget;
      setText($('#gary-bv'), Math.round(g.settings.garyBudget * 100) + '%');
    }
    if (this.open === 'rd') {
      const jt = $('#rd-auto-t');
      if (jt) setText(jt, r.garyJr ? r.garyJr.text + (r.garyJr.eta != null && isFinite(r.garyJr.eta) ? ` · ${Math.ceil(r.garyJr.eta)}s` : '') : '');
    }
    if (this.open === 'rd') this.updateRD();
    if (this.open === 'fam') { this.updateFam(); if (force) this.renderEvolve(); }
    if (r.succession) {
      if ($('#succ').hidden) this.renderSuccession();
      const left = Math.max(0, Math.ceil(r.succession.deadline - r.t));
      const st = $('#succ-t'); if (st) setText(st, left + 's');
    } else if (!$('#succ').hidden) $('#succ').hidden = true;
    const ot = $('#ot'), bank = meta.deferred || 0;
    const showOt = (bank > 0.5 || r.overtime) && !r.complete;
    if (ot.hidden === showOt) ot.hidden = !showOt;
    if (showOt) {
      const s = Math.ceil(bank), mm = Math.floor(s / 60);
      setText($('#ot-v'), `${mm}:${String(s % 60).padStart(2, '0')}`);
      setText($('#ot-l'), r.overtime ? 'OVERTIME ×2 · STOP' : 'START OVERTIME');
      ot.classList.toggle('on', !!r.overtime);
    }
    const dr = S.isDraining(r), de = $('#drain');
    if (r.clicks >= 6 || dr || r.complete) $('#hint').hidden = true;
    if (de.hidden === dr) de.hidden = !dr;
    if (dr) setText($('#drain-t'), `${tons(r.face + r.yard)} left · years still count`);
  }

  // ── reactions to sim events ──────────────────────────────
  handle(ev) {
    if (ev.type === 'succession') {
      this.sfx('gen');
      this.renderSuccession();
    } else if (ev.type === 'gen') {
      const t = ev.heir.trait;
      $('#succ').hidden = true;
      if (!ev.byBoard) this.sfx('memoPick');
      this.toast(`GENERATION ${S.roman(ev.heir.gen + 1)} — ${ev.heir.name}`, `${ev.byBoard ? ev.line + ' ' : ''}Inherits the company, the mountain and the debt. Trait: ${t.name}.`);
    } else if (ev.type === 'era') {
      const e = ERAS[ev.era];
      this.sfx('leap');
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
      this.sfx('memo');
    } else if (ev.type === 'overtimeEnd') {
      this.toast('OVERTIME OVER', 'The Deferred Time bank is empty. The workers collapse into a well-earned 4-minute break.');
    } else if (ev.type === 'milestone') {
      this.sfx('research');
      this.toast(`MILESTONE — ${ev.count} × ${UNITS[ev.cat][ev.e].name}`, `${ev.text} Output ×2.`);
    } else if (ev.type === 'complete') {
      this.sfx('complete');
      this.showComplete();
    }
  }
  showComplete() {
    const g = this.g, r = this.run, gain = S.legacyGain(g);
    const best = g.meta.records[S.mtnDef(r).id];
    const record = best == null || r.finishYears < best;
    $('#complete').innerHTML = `
      <div class="memo-k">NOTICE OF TOTAL LIQUIDATION</div>
      <h2>${esc(S.mtnDef(r).name.toUpperCase())} IS GONE.</h2>
      <p>After <b>${r.finishYears.toFixed(1)} years</b> and <b>${r.gen + 1} generations</b>, the mountain has been fully converted into gravel, money, and a strongly worded documentary.</p>
      ${record ? '<p class="acc"><b>NEW RECORD FOR THIS MOUNTAIN.</b> The family portrait has been updated.</p>' : `<p class="dim">Dynasty record here: ${yrs(best)}.</p>`}
      <div class="gain">+◆${fmt(gain)} <span>LEGACY ON EVOLVE</span></div>
      <div class="memo-o">
        <button class="btn big" data-act="toEvolve">CHOOSE NEXT MOUNTAIN ▶</button>
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
