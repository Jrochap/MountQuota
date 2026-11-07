// ─────────────────────────────────────────────────────────────
//  MOUNT QUOTA — bootstrap, loop, persistence
// ─────────────────────────────────────────────────────────────
import { Site } from './scene.js';
import { UI } from './ui.js';
import * as S from './sim.js';
import { tons, fmt } from './format.js';

const KEY = 'mountquota.save.v1';
const OFFLINE_CAP = 8 * 3600;
const params = new URLSearchParams(location.search);
const SPEED = Math.max(1, +params.get('speed') || 1);   // ?speed=20 for testing

function serialize(g) { return JSON.stringify({ v: 1, meta: g.meta, run: g.run, settings: g.settings, savedAt: Date.now() }); }
function deserialize(raw) {
  const d = JSON.parse(raw);
  const meta = Object.assign(S.newMeta(), d.meta);
  const run = Object.assign(S.newRun(meta), d.run);
  run.flow = Object.assign({ mine: 0, haul: 0, proc: 0, cash: 0, rp: 0 }, run.flow);
  return { g: { meta, run, settings: Object.assign(S.defaultSettings(), d.settings), out: [] }, savedAt: d.savedAt || Date.now() };
}

let g, savedAt = null;
try {
  const raw = localStorage.getItem(KEY);
  if (raw) ({ g, savedAt } = deserialize(raw));
} catch (e) { console.warn('save unreadable, starting fresh', e); }
if (!g) g = S.newGame();
window.game = g;

let skipSave = false;
function save() { if (skipSave) return; try { localStorage.setItem(KEY, serialize(g)); } catch (e) { /* storage blocked */ } }

const site = new Site(document.getElementById('scene'), {
  onMine: (x, y) => {
    const amt = S.clickMine(g);
    ui.floater(x, y, amt > 0 ? '+' + tons(amt) : 'FACE CLOGGED — HAUL IT');
    return amt;
  },
});
site.setSettings(g.settings);

const ui = new UI(document.getElementById('ui'), g, {
  evolve: () => { const gain = S.evolve(g); save(); return gain; },
  settings: () => site.setSettings(g.settings),
  save: () => { save(); ui.toast('SAVED', 'The ledger has been notarised.'); },
  admire: () => { document.getElementById('ov-complete').hidden = true; },
  exportSave: () => {
    const s = btoa(unescape(encodeURIComponent(serialize(g))));
    navigator.clipboard?.writeText(s).then(() => ui.toast('EXPORTED', 'Save copied to clipboard.'), () => prompt('Copy your save:', s));
  },
  importSave: () => {
    const s = prompt('Paste a save string:');
    if (!s) return;
    try { const d = JSON.parse(decodeURIComponent(escape(atob(s.trim())))); if (!d.meta || !d.run) throw 0; skipSave = true; localStorage.setItem(KEY, JSON.stringify({ ...d, savedAt: Date.now() })); location.reload(); }
    catch { ui.toast('IMPORT FAILED', 'That is not a save. That is a cry for help.'); }
  },
  hardReset: btn => {
    if (btn.dataset.armed) { skipSave = true; localStorage.removeItem(KEY); location.reload(); return; }
    btn.dataset.armed = '1'; btn.textContent = 'REALLY? CLICK AGAIN';
  },
});

// offline progress
if (savedAt && g.settings.offline) {
  const away = Math.min(OFFLINE_CAP, (Date.now() - savedAt) / 1000);
  if (away > 10 && !g.run.complete) {
    const y0 = g.run.years, m0 = g.run.mined, c0 = g.run.credits;
    S.simulate(g, away, 1);
    g.out = g.out.filter(e => e.type !== 'event');
    ui.toast('WHILE YOU WERE AWAY', `${(g.run.years - y0).toFixed(1)} years passed. ${tons(g.run.mined - m0)} liquidated, ₵${fmt(Math.max(0, g.run.credits - c0))} banked.`);
  }
}
if (g.run.complete) ui.showComplete();
if (g.run.event) ui.handle({ type: 'event', id: g.run.event });

// ── main loop ────────────────────────────────────────────────
let last = performance.now(), uiT = 0, saveT = 0;
function frame(now) {
  let dt = (now - last) / 1000; last = now;
  if (dt > 1) {                      // tab was hidden: catch up in coarse steps
    S.simulate(g, dt * SPEED, 0.5);
    dt = 0.016;
  } else {
    let left = dt * SPEED;
    while (left > 1e-6) { const s = Math.min(0.1, left); S.tick(g, s); left -= s; }
  }
  while (g.out.length) ui.handle(g.out.shift());

  site.update(g, dt);
  site.render(dt);

  uiT += dt;
  if (uiT > 0.1) { uiT = 0; ui.update(); }
  saveT += dt;
  if (saveT > 15) { saveT = 0; save(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(t => { last = t; ui.update(true); frame(t); });
addEventListener('beforeunload', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
