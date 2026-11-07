// ─────────────────────────────────────────────────────────────
//  MOUNT QUOTA — bootstrap, loop, persistence
// ─────────────────────────────────────────────────────────────
import { Site } from './scene.js';
import { UI } from './ui.js';
import * as S from './sim.js';
import { tons, fmt } from './format.js';
import { Sound } from './audio.js';
import { AWAY_THRESHOLD } from './data.js';

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
const sound = new Sound(g.settings);
window.sound = sound;
// audio may only start from a user gesture
const unlock = () => sound.unlock();
addEventListener('pointerdown', unlock, true);
addEventListener('keydown', unlock, true);
addEventListener('keydown', e => {
  if ((e.key === 'm' || e.key === 'M') && !e.metaKey && !e.ctrlKey && e.target.tagName !== 'INPUT') {
    g.settings.sound = !g.settings.sound; sound.applyVolume();
    ui.toast(g.settings.sound ? 'SOUND ON' : 'SOUND OFF', 'Press M to toggle.'); ui.refreshSound();
  }
});

function save() { if (skipSave) return; try { localStorage.setItem(KEY, serialize(g)); } catch (e) { /* storage blocked */ } }

const site = new Site(document.getElementById('scene'), {
  onMine: (x, y) => {
    const amt = S.clickMine(g);
    sound.play(amt > 0 ? 'mine' : 'clogged');
    ui.floater(x, y, amt > 0 ? '+' + tons(amt) : 'FACE CLOGGED — HAUL IT');
    return amt;
  },
});
site.setSettings(g.settings);

const ui = new UI(document.getElementById('ui'), g, {
  evolve: () => { const gain = S.evolve(g); save(); return gain; },
  settings: () => { site.setSettings(g.settings); sound.applyVolume(); },
  sound,
  toEvolve: () => { document.getElementById('ov-complete').hidden = true; ui.show('fam'); },
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

// time away never costs years: it is banked as Deferred Time (spent as Overtime)
function awayFor(seconds) {
  if (seconds <= 10) return;
  const got = S.bankDeferred(g, seconds);
  if (got > 0) ui.toast('WHILE YOU WERE AWAY', `No time passed. The workers stood perfectly still and saved up ${clockStr(got)} of Overtime (bank ${clockStr(g.meta.deferred)}).`);
  else ui.toast('WHILE YOU WERE AWAY', 'No time passed. The Overtime bank is already full.');
}
const clockStr = s => { s = Math.round(s); const m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}:${String(s % 60).padStart(2, '0')}`; };
if (savedAt) awayFor(Math.min(OFFLINE_CAP, (Date.now() - savedAt) / 1000));
if (g.run.complete) ui.showComplete();
if (g.run.event) ui.handle({ type: 'event', id: g.run.event });

// ── main loop ────────────────────────────────────────────────
let last = performance.now(), uiT = 0, saveT = 0;
function frame(now) {
  let dt = (now - last) / 1000; last = now;
  if (dt > AWAY_THRESHOLD) {         // tab was hidden for a while: treat it as being away
    awayFor(dt);
    dt = 0.016;
  } else if (dt > 1) {               // brief hide: catch up in coarse steps
    S.simulate(g, dt * SPEED, 0.5);
    dt = 0.016;
  } else {
    // once the last block is mined, fast-forward the final hauling/processing (years still count)
    let left = dt * SPEED * (S.isDraining(g.run) ? S.DRAIN_SPEED : 1);
    while (left > 1e-6) { const s = Math.min(0.1, left); S.tick(g, s); left -= s; }
  }
  while (g.out.length) ui.handle(g.out.shift());

  site.update(g, dt);
  site.render(dt);
  sound.crumble(site.lastRemoved);
  sound.update(g, dt);

  uiT += dt;
  if (uiT > 0.1) { uiT = 0; ui.update(); }
  saveT += dt;
  if (saveT > 15) { saveT = 0; save(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(t => { last = t; ui.update(true); frame(t); });
addEventListener('beforeunload', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); sound.suspend(document.hidden); });
