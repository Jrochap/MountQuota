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
  - *Gary Jr.* (◆120): auto-research with Balanced, Rush Leaps or Commerce First priority. Balanced keeps pace
    with a perfect manual player.
- **Density**: rock gets exponentially denser with depth, so every % of the mountain costs more than the last.
- **R&D tree**: 6 eras × 7 rows. Each *Generational Leap* unlocks the next era of equipment:
  Hands & Hope → Steam & Soot → Diesel & Quarterly Reports → Silicon & Severance → Lasers & Liability → Post-Physical Synergy.
- **Generations**: every 25 years a new heir takes over, with a random trait (buff or debuff).
- **Board memos**: random satirical events with two choices that give temporary buffs.
- **Mountains**: 8 of them, each with its own shape, rock and trade-offs: Mt. Obstinate, The Twin Liabilities,
  Mesa Verde Capital, Mt. Overdraft (an active volcano), The Long Grievance (a ridge), Spire of Compliance,
  Ziggurat of Unpaid Interns and Marble Arch-Nemesis. Each one changes the tonnage, gameplay modifiers and Legacy
  multiplier. On every Evolution the board offers 3 to pick from, and records are kept per mountain.
- **Sound**: fully synthesized with Web Audio, so there are no asset files. One-shot effects, a concrete-hall reverb,
  an ambient bed per era and machinery rhythms that follow what you own. Press **M** to mute; volumes are in the Ledger.
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
| `src/main.js` | Loop, save/load (localStorage), offline progress |

## Balance
`tools/balance.py` plays the real game logic (`src/data.js` + `src/sim.js`) headless with a greedy player.
It needs nothing extra on macOS (it uses the built-in JavaScriptCore), or it can use Node (`--node`).
```
python3 tools/balance.py                  # fresh-run pacing on Mt. Obstinate
python3 tools/balance.py mountains        # first run on every mountain
python3 tools/balance.py chain --runs 12  # prestige curve with greedy Legacy spending
python3 tools/balance.py oldunits         # how much output comes from buying older units
python3 tools/balance.py gary --trials 20 # auto-buy tiers compared
python3 tools/balance.py all
```
Random heir traits add noise of about ±5 years per run, so use `--trials 20` before trusting small differences.

Current numbers: first run ≈ 115 years (~38 min of real time), with eras at years 12/23/37/58/86. The prestige curve goes
111 → 74 → 49 → 40 → 28 → 24 → 16 → 13. All 8 mountains land between 110 and 119 years. About 37% of the output
gained comes from buying older units. Gary's MBA runs about 11% faster than basic Gary.
