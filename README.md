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
- **Tectonic Assets** (giant mountains, unlocked by the *Tectonic Charter* in the Family Tree's Logistics branch):
  always on offer at Evolve, with 1,000s to 100,000s of times the tonnage. Each one shows a *Recommended Dynasty Rating*
  (your lifetime Legacy). They're drawn with 3–5× more voxels, set behind the diorama with the camera zoomed out.
  - *The Continental Shelf*: a terraced continent; extraction is the permanent bottleneck.
  - *Mons Olympus Holdings*: off-world; starts in Era IV and older equipment floats away. Research ×3.
  - *The Mountain Under the Mountain*: past 50% the grey shell is gone and a golden inner mountain is left: credits ×2, mining ×0.7.
  - *Pangaea (Remaining)*: every landform and every modifier at once.
  - Legacy is paid out every 10% mined, without resetting. The first liquidation of each giant grants a permanent **Relic**
    (Gary Works Weekends, Low-Gravity Patents, Hollow Earth Lease, The Supercontinental Calendar). Board Contracts can't be signed on giants.
- **Shareholder Trophies**: 26 permanent achievements, such as records under 100/50/20/5 years, liquidating every
  mountain, ₵1Qa in the bank, 400 peasants, 1,000 Founder clicks and winning 10 gambles. Each pays a small
  permanent bonus.
- **Board Contracts** (unlocked after your first liquidation): optional rule twists you sign at Evolve for the next
  run, each worth more Legacy if you finish:
  - *Austerity Measures*: Doctrine research costs ×500.
  - *Union Contract*: no clearance prices.
  - *Gary's Sabbatical*: no automation.
  - *Expansion Mandate*: ×20 tonnage.
  - *Quarterly Deadline*: finish within 40 years for ×2.5 Legacy, otherwise ×0.5.
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
python3 tools/balance.py contracts         # Board Contracts, fresh vs veteran
python3 tools/balance.py giants --at 8     # Tectonic Assets: each giant, then all four in order
python3 tools/balance.py all
```
Random heir traits add noise of about ±5 years per run, so use `--trials 20` before trusting small differences.

Current numbers: first run ≈ 100 years (~33 min of real time; trophies earned along the way speed it up a little).
The prestige curve goes 98 → 63 → 40 → 25 → 18 → 14 → 11 → 9.5. All 14 mountains land between about 98 and 118 years.
About 38% of the output gained comes from buying older units. Gary's MBA runs about 11% faster than basic Gary.
For a veteran, contracts trade about 25–40% more time for 40–60% more Legacy; Quarterly Deadline pays about ×2.5.
Tectonic Assets, tackled in order by a dynasty around run 8 (lifetime ◆~380): Shelf ≈ 500 years, Olympus ≈ 445,
Under the Mountain ≈ 370, Pangaea ≈ 710. That's about 2.5–5.5 hours of real play each.
