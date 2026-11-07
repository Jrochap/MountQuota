# MOUNT QUOTA
*Quarry & Descendants Ltd. — A Generational Excavation Concern*

An isometric, tilt-shifted, brutalist idle game about a family that spends several generations
turning a mountain into money. The goal is to liquidate the whole mountain in as few years as possible.

**Play it:** https://jrochap.github.io/MountQuota/

## Run it locally
```
python3 serve.py --open        # http://127.0.0.1:8642/
```
Three.js r160 loads from jsDelivr through an import map, so no build step or npm is needed. You do need an internet connection.
Add `?speed=20` to the URL to fast-forward while testing.

## How it plays
- **Pipeline**: Mining → Extraction → Processing. Each stage feeds a buffer. When the face pile or the yard fills up,
  the stage upstream stalls, so throughput equals your weakest stage (marked **BOTTLENECK**).
- **Processing** turns rubble into Credits (₵, used for equipment) and Research (RP, used for the R&D tree).
- **Old equipment stays relevant**:
  - *Legacy Workforce*: every older unit gives +1% to all newer units in its department.
  - *Milestones*: owning 25, 50, 100, 200 or 400 of a unit doubles its output each time.
  - *Clearance*: obsolete units are 98% cheaper for each era they're behind.
  - Each buy button shows exactly how many t/s that purchase adds.
- **Gary** (auto-buy) has a career path in the Family Tree's Bureaucracy branch:
  - *Procurement Instinct*: basic Gary.
  - *Gary's MBA* (◆40): buys in bundles to reach milestones, keeps the pipeline balanced and saves up for big buys,
    with a budget slider. About 11% faster runs than basic Gary.
  - *Gary Jr.* (◆60, needs Procurement Instinct): auto-research from the start of every run, with Balanced,
    Rush Leaps or Commerce First priority. Balanced keeps pace with a perfect manual player.
- **Strategic Planning Committee** (R&D, Era IV Infrastructure): basic cheapest-first auto-research for the rest
  of the run, so you never have to click through the whole tree by hand.
- **Density**: rock gets exponentially denser with depth, so every % of the mountain costs more than the last.
- **R&D tree**: 6 eras × 7 rows. Each *Generational Leap* unlocks the next era of equipment:
  Hands & Hope → Steam & Soot → Diesel & Quarterly Reports → Silicon & Severance → Lasers & Liability → Post-Physical Synergy.
- **Succession**: every 25 years the CEO dies and you choose from 3 heirs. Each one has a trade-off trait and a
  satirical bio; if you don't choose within 30 seconds, the board picks for you. A good pick for your current
  bottleneck saves about 6 years per run. *Selective Succession* gives 4 candidates with their downsides halved.
- **Board memos**: 25 random satirical events, some only in certain eras. They have 2–3 choices, including gambles, slowed years, free units and instant mining.
- **Mountains**: 14 of them, each with its own shape, rock and trade-offs: Mt. Obstinate, The Twin Liabilities,
  Mesa Verde Capital, Mt. Overdraft (an active volcano), The Long Grievance (a ridge), Spire of Compliance,
  Ziggurat of Unpaid Interns, Marble Arch-Nemesis, The Monolith (Allegedly Natural), The Foothills Collective,
  The Overpass (a natural arch), Mt. Permafrost (Melting), The Leaning Liability and Spikes of Synergy. Each one changes the tonnage, gameplay modifiers and Legacy
  multiplier. On every Evolution the board offers 3 to pick from, and records are kept per mountain.
- **Sound**: fully synthesized with Web Audio, so there are no asset files. One-shot effects, a concrete-hall reverb,
  an ambient bed per era and machinery rhythms that follow what you own. Press **M** to mute; volumes are in the Ledger.
- **Time away**: no in-game years pass while you're away, so closing the tab never hurts your record. Time away is
  banked as *Deferred Time* (25% of it, up to 30 minutes) and spent as *Overtime*: all output ×2 while it lasts.
- **Evolve the Dynasty** (prestige): reset the run for Legacy ◆. You get a progress bonus, plus a completion bonus
  that grows the faster you finish. Spend Legacy in the **Family Tree**, a permanent skill tree with six branches
  (Bloodline, Logistics, Industry, Commerce, Academia, Bureaucracy). That includes era skips and *Calendar Reform*
  (years literally pass slower).

## Files
| File | What |
|---|---|
| `src/data.js` | All tunables and content: units, research, skills, traits, events, news |
| `src/sim.js` | Pure simulation (no DOM). Tick, buying, research, prestige |
| `src/scene.js` | Three.js diorama: voxel mountain, per-era agents, yard, town, HQ, tilt-shift + grain post |
| `src/ui.js` | DOM HUD, R&D tree, Family Tree, ledger, memos, ticker |
| `src/audio.js` | Procedural sound: effects, per-era ambience, machinery rhythm |
| `src/main.js` | Loop, save/load (localStorage), Deferred Time on return |

## Balance
`tools/balance.py` plays the real game logic (`src/data.js` + `src/sim.js`) headless with a greedy player.
It needs nothing extra on macOS (it uses the built-in JavaScriptCore), or it can use Node (`--node`).
```
python3 tools/balance.py                  # fresh-run pacing on Mt. Obstinate
python3 tools/balance.py mountains        # first run on every mountain
python3 tools/balance.py chain --runs 12  # prestige curve with greedy Legacy spending
python3 tools/balance.py oldunits         # how much output comes from buying older units
python3 tools/balance.py gary --trials 20 # auto-buy tiers compared
python3 tools/balance.py heirs --trials 20 # does choosing the heir matter?
python3 tools/balance.py all
```
Random heir traits add noise of about ±5 years per run, so use `--trials 20` before trusting small differences.

Current numbers: first run ≈ 115 years (~38 min of real time), with eras at years 12/23/37/58/86. The prestige curve goes
111 → 74 → 49 → 40 → 28 → 24 → 16 → 13. All 14 mountains land between about 104 and 121 years. About 37% of the output
gained comes from buying older units. Gary's MBA runs about 11% faster than basic Gary.
