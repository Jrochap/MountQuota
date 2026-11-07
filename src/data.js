// ─────────────────────────────────────────────────────────────
//  MOUNT QUOTA — game data
//  Everything tunable lives here. Rates are tons / real second.
// ─────────────────────────────────────────────────────────────

export const GAME_TITLE = 'MOUNT QUOTA';
export const COMPANY = 'Quarry & Descendants Ltd.';

export const SEC_PER_YEAR = 20;        // real seconds per in-game year
export const GEN_YEARS = 25;           // years per generation (new CEO)
// Rock gets denser with depth: volume fraction f costs M0·(e^(K·f) − 1) tons.
export const MASS_K = Math.log(1e13);
export const MASS_M0 = 6000;
// ── Mountains (a new one is offered on each Evolution) ───────
// shape: geometry generator in scene.js · palette: rock colours · massX scales MASS_K (×1.05 ≈ 3.5× the tonnage)
export const MOUNTAINS = [
  { id: 'obstinate', name: 'Mt. Obstinate', shape: 'peak', palette: 'granite', massX: 1, legacyX: 1, mods: {},
    blurb: 'A perfectly ordinary mountain with an attitude problem.' },
  { id: 'twins', name: 'The Twin Liabilities', shape: 'twin', palette: 'slate', massX: 1.03, legacyX: 1.1, mods: { value: 1.25, extraction: 0.85 },
    blurb: 'Two peaks. Two faces. Twice the paperwork.' },
  { id: 'mesa', name: 'Mesa Verde Capital', shape: 'mesa', palette: 'sandstone', massX: 0.99, legacyX: 1.05, mods: { mining: 1.4, value: 0.88 },
    blurb: 'Flat on top, like the org chart. Soft rock, cheap rock.' },
  { id: 'volcano', name: 'Mt. Overdraft (Active)', shape: 'volcano', palette: 'basalt', massX: 1.07, legacyX: 1.25, mods: { value: 1.6, mining: 0.75 },
    blurb: 'Molten core. Insurance premiums also molten.' },
  { id: 'ridge', name: 'The Long Grievance', shape: 'ridge', palette: 'shale', massX: 1.0, legacyX: 1.1, mods: { mining: 1.3, extraction: 0.75 },
    blurb: 'A ridge so long the far end is in a different tax bracket.' },
  { id: 'spire', name: 'Spire of Compliance', shape: 'spire', palette: 'quartz', massX: 1.09, legacyX: 1.15, mods: { mining: 0.8, rp: 1.4 },
    blurb: 'Tall, thin and absolutely refuses to bend.' },
  { id: 'ziggurat', name: 'Ziggurat of Unpaid Interns', shape: 'ziggurat', palette: 'limestone', massX: 1.05, legacyX: 1.1, mods: { rp: 1.5, processing: 0.85 },
    blurb: 'Built by an ancient civilisation, for exposure.' },
  { id: 'marble', name: 'Marble Arch-Nemesis', shape: 'dome', palette: 'marble', massX: 1.08, legacyX: 1.3, mods: { value: 2, mining: 0.65 },
    blurb: 'Premium rock. Premium attitude. Chips if you look at it wrong.' },
];
MOUNTAINS.push(
  { id: 'monolith', name: 'The Monolith (Allegedly Natural)', shape: 'monolith', palette: 'concrete', massX: 0.98, legacyX: 1.1, mods: { extraction: 1.4, value: 0.85 },
    blurb: 'Suspiciously rectangular. Geologists refuse to comment. Flat faces make hauling easy.' },
  { id: 'foothills', name: 'The Foothills Collective', shape: 'cluster', palette: 'moss', massX: 0.92, legacyX: 1.05, mods: { mining: 1.2, extraction: 1.2, processing: 0.8 },
    blurb: 'Seven small mountains in a trench coat.' },
  { id: 'overpass', name: 'The Overpass', shape: 'arch', palette: 'rust', massX: 1.05, legacyX: 1.15, mods: { value: 1.3, mining: 0.85 },
    blurb: 'A natural stone bridge. The council is already discussing tolls.' },
  { id: 'permafrost', name: 'Mt. Permafrost (Melting)', shape: 'glacier', palette: 'ice', massX: 0.9, legacyX: 1.2, mods: { time: 0.95, processing: 0.75 },
    blurb: 'Time moves slowly up here. So does everything else.' },
  { id: 'leaning', name: 'The Leaning Liability', shape: 'tilted', palette: 'coal', massX: 0.94, legacyX: 1.1, mods: { mining: 1.25, rp: 0.8 },
    blurb: 'Leans at 30 degrees. The insurance policy leans further.' },
  { id: 'spikes', name: 'Spikes of Synergy', shape: 'crystal', palette: 'amethyst', massX: 1.08, legacyX: 1.25, mods: { value: 1.6, extraction: 0.8 },
    blurb: 'Every rock is pointy. Every rock is premium. Every rock is a lawsuit.' },
);
export const MOUNTAIN_BY_ID = Object.fromEntries(MOUNTAINS.map(m => [m.id, m]));
export const OFFER_SIZE = 3;

export const STRATA = [
  [0.00, 'The Summit (decorative)'], [0.08, 'Topsoil & Regret'], [0.2, 'Granite'], [0.35, 'Basalt'],
  [0.5, 'Bedrock'], [0.65, 'Suspiciously Dense Rock'], [0.8, 'Mantle-Adjacent'], [0.92, 'Pure Plot Armor'],
];
export const BASE_VALUE = 1;           // credits per processed ton
export const RP_PER_TON = 0.1;         // research points per processed ton
export const BUFFER_SECONDS = 20;      // buffer cap = upstream rate × this
export const BUFFER_MIN = 60;          // minimum buffer cap (tons)
export const COST_GROWTH = 1.17;
// Legacy Workforce: every older unit still on payroll boosts all newer units in its department
export const WORKFORCE = 0.01;
// Ownership milestones: each threshold reached doubles that unit's output
export const MILESTONES = [
  [25,  'They have formed a choir.'],
  [50,  'They have a group chat. You are not in it.'],
  [100, 'They now refer to themselves as "the collective".'],
  [200, 'Mid-sized nation status achieved.'],
  [400, 'They have filed for statehood.'],
];
export const MILESTONE_X = 2;
// Gary's MBA: wait for a better deal if it's this many seconds of income away and this much better
export const GARY_SAVE_SECONDS = 10;
export const GARY_SAVE_ADVANTAGE = 1.3;
export const GARY_BALANCE = 1.1;         // departments within 10% of the weakest get full priority
// Depreciation: obsolete equipment goes on clearance — price × this per era behind the current one
export const DEPRECIATION = 0.02;
export const LEGACY_BONUS = 0.005;     // +0.5% global output per lifetime Legacy
export const LEGACY_PROGRESS = 15;     // Legacy for progress: 15 × f^1.2
export const LEGACY_COMPLETE = 10;     // completion bonus × sqrt(PAR / years)
export const PAR_YEARS = 150;
// Deferred Time: time away never adds years; it is banked (at a rate, capped) and spent as Overtime
export const DEFERRED_RATE = 0.25;          // 1 hour away → 15 minutes of Overtime
export const DEFERRED_CAP = 30 * 60;        // seconds of Overtime that can be banked
export const OVERTIME_X = 2;                // all output while Overtime runs
export const AWAY_THRESHOLD = 60;           // a hidden tab longer than this counts as "away"

export const ERAS = [
  { name: 'Hands & Hope',            roman: 'I',   blurb: 'Pickaxes, wheelbarrows and an unshakeable belief in tomorrow.' },
  { name: 'Steam & Soot',            roman: 'II',  blurb: 'Coal is invented. Lungs are not consulted.' },
  { name: 'Diesel & Quarterly Reports', roman: 'III', blurb: 'Hydraulics, highways and the birth of the PowerPoint.' },
  { name: 'Silicon & Severance',     roman: 'IV',  blurb: 'The machines work. The workers are thanked for their service.' },
  { name: 'Lasers & Liability',      roman: 'V',   blurb: 'Orbital weaponry, repurposed for shareholder value.' },
  { name: 'Post-Physical Synergy',   roman: 'VI',  blurb: 'Physics has been outsourced. The mountain is a formality.' },
];

export const CATS = [
  { id: 'mining',     name: 'Mining',     verb: 'Dislodge', sym: '▲', desc: 'Turns mountain into rubble.' },
  { id: 'extraction', name: 'Extraction', verb: 'Haul',     sym: '→', desc: 'Moves rubble from the face to the yard.' },
  { id: 'processing', name: 'Processing', verb: 'Refine',   sym: '■', desc: 'Turns rubble into money and Research.' },
];

// One unit per category per era.
export const UNITS = {
  mining: [
    { name: 'Pickaxe Peasant',      cost: 10,     rate: 1,      desc: 'Arrives with a pickaxe. Leaves with lumbago.' },
    { name: 'Steam Drill',          cost: 1.2e3,  rate: 40,     desc: 'Converts coal and optimism into holes.' },
    { name: 'Diesel Excavator',     cost: 1.6e5,  rate: 1.6e3,  desc: 'Fully hydraulic. Partially insured.' },
    { name: 'Autonomous Bore',      cost: 2.2e7,  rate: 6.4e4,  desc: 'Has never once asked for a lunch break.' },
    { name: 'Orbital Mining Laser', cost: 3e9,    rate: 2.6e6,  desc: 'Technically not a weapon, per Legal.' },
    { name: 'Gravity Spoon',        cost: 4e11,   rate: 1e8,    desc: 'Scoops. Reality bends slightly to accommodate.' },
  ],
  extraction: [
    { name: 'Wheelbarrow Intern',   cost: 12,     rate: 1,      desc: 'Unpaid. Gaining invaluable experience (gravel).' },
    { name: 'Ore Cart Line',        cost: 1.4e3,  rate: 40,     desc: 'Rails are mostly parallel.' },
    { name: 'Dump Truck Fleet',     cost: 1.9e5,  rate: 1.6e3,  desc: 'Beeps when reversing. Beeps when not reversing.' },
    { name: 'Drone Swarm',          cost: 2.6e7,  rate: 6.4e4,  desc: 'A cloud of tiny forklifts with opinions.' },
    { name: 'Mass Driver',          cost: 3.6e9,  rate: 2.6e6,  desc: 'Throws rubble at the yard at Mach 4. Mostly hits it.' },
    { name: 'Wormhole Chute',       cost: 4.8e11, rate: 1e8,    desc: 'Rubble enters. Rubble exits. Rubble is upset.' },
  ],
  processing: [
    { name: 'Sieve Elder',          cost: 15,     rate: 1,      desc: 'Has been shaking this sieve since before you were born.' },
    { name: 'Stamp Mill',           cost: 1.7e3,  rate: 40,     desc: 'BOOM. BOOM. BOOM. (Profit.)' },
    { name: 'Jaw Crusher Plant',    cost: 2.3e5,  rate: 1.6e3,  desc: 'Chews rocks like a disappointed parent.' },
    { name: 'AI Sorting Plant',     cost: 3.1e7,  rate: 6.4e4,  desc: "Classifies every rock as 'Probably Ore'." },
    { name: 'Matter Disassembler',  cost: 4.3e9,  rate: 2.6e6,  desc: 'Atoms filed alphabetically.' },
    { name: 'Reality Refinery',     cost: 5.8e11, rate: 1e8,    desc: 'Turns rubble into content, content into money.' },
  ],
};

// ── Research tree ────────────────────────────────────────────
// rows: 0 mining · 1 extraction · 2 processing · 3 commerce · 4 doctrine · 5 infrastructure · 6 leap
export const RD_ROWS = ['Mining', 'Extraction', 'Processing', 'Commerce', 'Doctrine', 'Infrastructure', 'Generational Leap'];
const B = [10, 6e3, 5.4e6, 5.4e9, 6.5e12, 7.3e15];           // base RP cost per era
const CAT_X = [2, 2, 2, 3, 3, 3];                     // category multiplier per era

const RAW = [
  // era 0
  ['m0', 0, 0, 1,   'Pointier Rocks',            'Rocks, but with intent.'],
  ['h0', 0, 1, 1.5, 'The Wheel (Beta)',          'Round-ish. Patent pending.'],
  ['p0', 0, 2, 1.5, 'Sorting by Vibes',          'Shiny goes left. Everything else also goes left.'],
  ['v0', 0, 3, 3,   'Pre-Owned Mountain™',       "It's not rubble. It's heritage aggregate."],
  ['x0', 0, 4, 2.5, 'Mandatory Optimism',        'Complaints are now filed directly into the river.'],
  ['i0', 0, 5, 2,   'Bigger Holes',              'The rubble pile may now legally exceed the foreman.'],
  ['L0', 0, 6, 15,  'Discover Coal',             'Lungs were not consulted. Unlocks Era II.'],
  // era 1
  ['m1', 1, 0, 1,   'Pressurized Enthusiasm',    'Steam, mostly from management.'],
  ['h1', 1, 1, 1,   'Rails, Mostly Parallel',    'Derailments reclassified as "lateral deliveries".'],
  ['p1', 1, 2, 1,   'Stamp Mill Rhythm Section', 'Workers report the beat is "relentless". Good.'],
  ['v1', 1, 3, 2,   'Company Scrip',             'Wages paid in coupons valid only at the company store.'],
  ['x1', 1, 4, 2,   'The Twelve-Day Week',       'Weekends deferred until further notice.'],
  ['i1', 1, 5, 1.5, "Foreman's Whistle",         'Your clicks now carry the weight of middle management.'],
  ['L1', 1, 6, 10,  'The Petroleum Epiphany',    'Dinosaurs, finally contributing. Unlocks Era III.'],
  // era 2
  ['m2', 2, 0, 1,   'Hydraulics for Dummies',    'Chapter 1: Push lever. Chapter 2: Mountain smaller.'],
  ['h2', 2, 1, 1,   'Eminent Domain Enthusiasm', 'A highway now runs where the village used to be.'],
  ['p2', 2, 2, 1,   'Conveyor Belt Philosophy',  'If it moves, it is productive. If it stops, it is fired.'],
  ['v2', 2, 3, 2,   'Shareholder Value',         'Nobody knows what it is. Everyone wants more of it.'],
  ['x2', 2, 4, 2,   'Synergy Workshops',         'Mandatory. Unpaid. Catered (crackers).'],
  ['i2', 2, 5, 1.5, 'Procurement Department',    'A man named Gary now buys equipment automatically.'],
  ['L2', 2, 6, 10,  'The Spreadsheet',           'Every worker is now a cell. Some cells are deleted. Unlocks Era IV.'],
  // era 3
  ['m3', 3, 0, 1,   'Machine Learning (Rocks)',  "The model has concluded the mountain is 'mostly rock'."],
  ['h3', 3, 1, 1,   'Drone Delivery Nobody Asked For', 'Rubble now arrives with a tracking number.'],
  ['p3', 3, 2, 1,   "AI Sorter: 'Probably Ore'", 'Accuracy: 51%. Confidence: 100%.'],
  ['v3', 3, 3, 2,   'Rubble NFTs',               'Each pebble now has a certificate of authenticity and a Discord.'],
  ['x3', 3, 4, 2,   'Layoffs as a Service',      'Productivity soars. There is nobody left to slow it down.'],
  ['i3', 3, 5, 1.5, 'Strategic Planning Committee', 'Seven people in a room decide what to research next. They always pick the cheapest thing.'],
  ['L3', 3, 6, 10,  'Fusion (Finally)',          'Only 30 years away, for the last 80 years. Unlocks Era V.'],
  // era 4
  ['m4', 4, 0, 1,   'Ethics Waiver: Beam Focus', 'The laser is now 400% more legally ambiguous.'],
  ['h4', 4, 1, 1,   "Mass Driver to 'Elsewhere'", 'Elsewhere has not complained. Elsewhere may not exist.'],
  ['p4', 4, 2, 1,   'Molecular Disassembly Line','Atoms sorted by vibe, then by atomic number.'],
  ['v4', 4, 3, 2,   'Sell the Mountain Back to Itself', 'Surprisingly, it was interested.'],
  ['x4', 4, 4, 2,   'Precognitive Accounting',   'Profits are booked before the rock is mined.'],
  ['i4', 4, 5, 1.5, 'Liability Shield Generator','Physically deflects lawsuits.'],
  ['L4', 4, 6, 10,  'Physics: Optional',         'Legal reviewed the laws of physics and found loopholes. Unlocks Era VI.'],
  // era 5
  ['m5', 5, 0, 1,   'Spoon Calibration',         'The Gravity Spoon now scoops in the correct direction.'],
  ['h5', 5, 1, 1,   'Pocket Dimension Logistics','Rubble is stored in a dimension with cheaper rent.'],
  ['p5', 5, 2, 1,   'Matter-to-Content Pipeline','Every ton of gravel becomes 40 minutes of video.'],
  ['v5', 5, 3, 2,   'Mountain-as-a-Service',     'Customers now subscribe monthly to the idea of a mountain.'],
  ['x5', 5, 4, 2,   'Time-Dilated Payroll',      'Workers age faster than their wages.'],
  ['i5', 5, 5, 1.5, 'Vertical Integration',      'You own the supply chain, the demand chain and the chain.'],
  ['L5', 5, 6, 10,  'Total Liquidation Protocol','The mountain is informed of its redundancy.'],
];

const VALUE_X = [2, 2, 2, 3, 3, 4];
const DOCTRINE = [
  [{ k: 'rp', x: 1.5 }],
  [{ k: 'global', x: 1.5 }],
  [{ k: 'rp', x: 2 }],
  [{ k: 'global', x: 1.5 }],
  [{ k: 'rp', x: 3 }],
  [{ k: 'global', x: 2 }],
];
const INFRA = [
  [{ k: 'buffer', x: 3 }],
  [{ k: 'click', x: 10 }],
  [{ k: 'auto', x: 1 }],
  [{ k: 'buffer', x: 3 }, { k: 'extraction', x: 1.5 }, { k: 'research', x: 1 }],
  [{ k: 'click', x: 10 }, { k: 'buffer', x: 2 }],
  [{ k: 'mining', x: 2 }, { k: 'extraction', x: 2 }, { k: 'processing', x: 2 }],
];

export const RESEARCH = RAW.map(([id, era, row, cm, name, desc]) => {
  let fx;
  if (row === 0) fx = [{ k: 'mining', x: CAT_X[era] }];
  else if (row === 1) fx = [{ k: 'extraction', x: CAT_X[era] }];
  else if (row === 2) fx = [{ k: 'processing', x: CAT_X[era] }];
  else if (row === 3) fx = [{ k: 'value', x: VALUE_X[era] }];
  else if (row === 4) fx = DOCTRINE[era];
  else if (row === 5) fx = INFRA[era];
  else fx = era < 5 ? [{ k: 'era', x: era + 1 }] : [{ k: 'mining', x: 5 }, { k: 'global', x: 2 }];
  const req = [];
  if (row === 6) req.push(`m${era}`, `h${era}`, `p${era}`);
  else if (era > 0) req.push(`L${era - 1}`);
  return { id, era, row, name, desc, cost: Math.round(B[era] * cm), fx, req };
});
export const RESEARCH_BY_ID = Object.fromEntries(RESEARCH.map(n => [n.id, n]));

export const FX_LABEL = {
  mining: 'Mining', extraction: 'Extraction', processing: 'Processing', value: 'Credits / ton',
  rp: 'Research', global: 'All output', buffer: 'Buffer size', click: 'Click power', time: 'Years elapse',
};
export function fxText(fx) {
  return fx.map(e => {
    if (e.k === 'auto') return 'Unlocks auto-buy';
    if (e.k === 'research') return 'Unlocks auto-research';
    if (e.k === 'era') return `Unlocks Era ${ERAS[e.x].roman}`;
    if (e.k === 'time') return `Years pass ×${e.x}`;
    return `${FX_LABEL[e.k]} ×${e.x}`;
  }).join(' · ');
}

// ── Family Tree (permanent prestige skills, paid in Legacy ◆) ─
// dir: branch direction index (0 up, then clockwise), d: distance from root
const pow = (b, g) => l => Math.round(b * Math.pow(g, l));
export const SKILLS = [
  { id: 'founder', name: 'Ezekiel Quarry', desc: 'The Founder. Looked at a mountain and saw a spreadsheet.', dir: 0, d: 0, max: 1, cost: () => 0, req: [], fxt: () => 'Root of the dynasty' },

  // Bloodline (mining) — up
  { id: 'genes', name: 'Calloused Genes', desc: 'Your heirs are born holding pickaxes. Hospitals are concerned.', dir: 0, d: 1, max: 5, cost: pow(5, 3), req: [['founder', 1]],
    apply: (m, l) => { m.mining *= Math.pow(1.25, l); }, fxt: l => `Mining ×${(1.25 ** l).toFixed(2)}` },
  { id: 'whisper', name: 'Rock Whisperer Bloodline', desc: 'The rocks tell your family things. Mostly "please stop".', dir: 0, d: 2, max: 3, cost: pow(6, 3), req: [['genes', 1]],
    apply: (m, l) => { m.click *= Math.pow(4, l); }, fxt: l => `Click power ×${4 ** l}` },
  { id: 'singularity', name: 'Dynastic Singularity', desc: 'The family becomes a legal entity, a religion and a weather system.', dir: 0, d: 3, max: 3, cost: pow(250, 4), req: [['whisper', 1], ['genes', 3]],
    apply: (m, l) => { m.global *= Math.pow(1.5, l); }, fxt: l => `All output ×${(1.5 ** l).toFixed(2)}` },

  // Logistics (extraction) — upper right
  { id: 'barrow', name: 'Inherited Wheelbarrow', desc: 'Passed down for generations. One wheel is original.', dir: 1, d: 1, max: 5, cost: pow(5, 3), req: [['founder', 1]],
    apply: (m, l) => { m.extraction *= Math.pow(1.25, l); }, fxt: l => `Extraction ×${(1.25 ** l).toFixed(2)}` },
  { id: 'holes', name: 'Ancestral Holes', desc: 'Grandfather always said: dig the hole bigger than the problem.', dir: 1, d: 2, max: 3, cost: pow(8, 3), req: [['barrow', 1]],
    apply: (m, l) => { m.buffer *= Math.pow(2, l); }, fxt: l => `Buffer size ×${2 ** l}` },

  // Industry (processing) — lower right
  { id: 'furnace', name: 'Family Furnace', desc: 'Never once allowed to go out. Several cousins have tried.', dir: 2, d: 1, max: 5, cost: pow(5, 3), req: [['founder', 1]],
    apply: (m, l) => { m.processing *= Math.pow(1.25, l); }, fxt: l => `Processing ×${(1.25 ** l).toFixed(2)}` },
  { id: 'vertical', name: 'Hereditary Efficiency', desc: 'Inbreeding, but for supply chains.', dir: 2, d: 2, max: 4, cost: pow(25, 3), req: [['furnace', 2]],
    apply: (m, l) => { const x = Math.pow(1.15, l); m.mining *= x; m.extraction *= x; m.processing *= x; }, fxt: l => `Mine/Haul/Process ×${(1.15 ** l).toFixed(2)}` },

  // Commerce — down
  { id: 'trust', name: 'Trust Fund', desc: 'Each heir starts with money they did absolutely nothing to earn.', dir: 3, d: 1, max: 4, cost: pow(4, 4), req: [['founder', 1]],
    fxt: l => `Start with ₵${['0', '1K', '100K', '10M', '1B'][l]}` },
  { id: 'monopoly', name: 'Monopoly Instinct', desc: 'Competitors are acquired, then politely buried in the yard.', dir: 3, d: 2, max: 5, cost: pow(6, 3), req: [['trust', 1]],
    apply: (m, l) => { m.value *= Math.pow(1.25, l); }, fxt: l => `Credits/ton ×${(1.25 ** l).toFixed(2)}` },

  // Academia — lower left
  { id: 'notes', name: 'Ancestral Notes', desc: "Grandma's notebook. Half research, half grudges.", dir: 4, d: 1, max: 5, cost: pow(5, 3), req: [['founder', 1]],
    apply: (m, l) => { m.rp *= Math.pow(1.25, l); }, fxt: l => `Research ×${(1.25 ** l).toFixed(2)}` },
  { id: 'skip1', name: 'Skip the Stone Age', desc: 'Heirs are born already knowing about coal.', dir: 4, d: 2, max: 1, cost: () => 40, req: [['notes', 2]],
    fxt: () => 'Start in Era II, Era I researched' },
  { id: 'skip2', name: 'Skip the Steam Age', desc: 'Nobody in the family remembers what a lung is for.', dir: 4, d: 3, max: 1, cost: () => 200, req: [['skip1', 1]],
    fxt: () => 'Start in Era III' },
  { id: 'skip3', name: 'Skip the Diesel Age', desc: 'Born with a spreadsheet for a heart.', dir: 4, d: 4, max: 1, cost: () => 900, req: [['skip2', 1]],
    fxt: () => 'Start in Era IV' },

  // Bureaucracy — upper left
  { id: 'calendar', name: 'Calendar Reform', desc: 'The board adds a 13th month. Then a 14th. Years now last longer.', dir: 5, d: 1, max: 3, cost: pow(30, 4), req: [['founder', 1]],
    apply: (m, l) => { m.time *= Math.pow(0.9, l); }, fxt: l => `Years pass ×${(0.9 ** l).toFixed(3)}` },
  { id: 'procure', name: 'Procurement Instinct', desc: 'Every heir is born with a corporate card.', dir: 5, d: 2, max: 1, cost: () => 20, req: [['calendar', 1]],
    apply: m => { m.auto = true; }, fxt: () => 'Auto-buy from the start' },
  { id: 'mba', name: "Gary's MBA", desc: 'Gary went back to school. He now plans purchases, chases milestones, balances the pipeline and saves up for big buys.', dir: 5, d: 3, max: 1, cost: () => 40, req: [['procure', 1]],
    apply: m => { m.smartBuy = true; }, fxt: () => 'Smart auto-buy + budget control' },
  { id: 'garyjr', name: 'Gary Jr.', desc: "Gary's son. Nobody interviewed him. Auto-research from the first minute of every run, with a priority you set.", dir: 5, d: 3.1, da: -0.38, max: 1, cost: () => 60, req: [['procure', 1]],
    apply: m => { m.autoResearch = true; m.researchPro = true; }, fxt: () => 'Auto-research from the start + priorities' },
  { id: 'breeding', name: 'Selective Succession', desc: 'Heirs chosen by merit. Merit defined by the board. More candidates, fewer flaws.', dir: 5, d: 2.45, da: 0.5, max: 1, cost: () => 60, req: [['procure', 1]],
    fxt: () => '4 heir candidates, downsides halved' },
];
export const SKILL_BY_ID = Object.fromEntries(SKILLS.map(s => [s.id, s]));
export const TRUST_FUND = [0, 1e3, 1e5, 1e7, 1e9];

// ── Heirs ────────────────────────────────────────────────────
export const FIRST_NAMES = ['Barnaby', 'Chadwick', 'Prudence', 'Montgomery', 'Ingrid', 'Thaddeus', 'Wilhelmina', 'Brock',
  'Tiffany', 'Cornelius', 'Gertrude', 'Kyle', 'Beatrix', 'Lysander', 'Mildred', 'Tucker', 'Octavia', 'Reginald', 'Skylar', 'Bartholomew'];
export const FOUNDER_TRAIT = { name: 'Unshakeable Confidence', mods: { click: 2 }, safe: true };
// ── Succession ───────────────────────────────────────────────
export const SUCCESSION_SECONDS = 30;    // the board picks if you don't
export const HEIR_BIOS = [
  'Studied at a university that no longer exists.',
  'Has never seen the mountain. Has seen photos.',
  'Previously ran a juice bar into the ground.',
  'Was raised by a series of nannies and one accountant.',
  'Describes themselves as "a disruptor". Has disrupted two marriages.',
  'Can name every shareholder. Cannot name a single worker.',
  'Won a regional spelling bee in 1987. Brings it up.',
  'Owns eleven boats. Uses none of them.',
  'Has a five-year plan. It is a mood board.',
  'Spent a gap year "finding themselves". Found a yacht.',
  'Once lifted a rock. Talks about it constantly.',
  'Was second choice. The first choice is "on sabbatical".',
  'Sends emails exclusively in capital letters.',
  'Believes the mountain is "basically a big stock".',
  'Has an MBA from a website.',
  'Thinks pickaxes are "a bit retro".',
];
export const BOARD_PICK_LINES = [
  'The board chose while you were in a meeting.',
  'The board chose by drawing straws. One straw was a cigar.',
  'The board went with whoever arrived first to the funeral.',
  'The board flipped a coin. The coin is now on the board.',
];

// Every trait is a trade-off; the right heir depends on your bottleneck and phase of the run.
// `safe` traits have no downside and are rare. Selective Succession halves all downsides.
export const TRAITS = [
  { name: 'Gym Enthusiast',              mods: { mining: 1.5, rp: 0.8 } },
  { name: 'Collects Model Trains',       mods: { extraction: 1.5, value: 0.85 } },
  { name: 'Micromanager',                mods: { processing: 1.5, extraction: 0.8 } },
  { name: 'Has Read One Book',           mods: { rp: 1.6, mining: 0.85 } },
  { name: 'Believes in Crypto',          mods: { value: 1.5, processing: 0.8 } },
  { name: 'Visionary (Self-Described)',  mods: { rp: 1.8, value: 0.8 } },
  { name: 'Golfs Constantly',            mods: { value: 1.35, mining: 0.85 } },
  { name: 'Podcast Host',                mods: { value: 1.4, rp: 0.8 } },
  { name: 'Thinks Mountains Are Hollow', mods: { mining: 1.3, extraction: 1.3, value: 0.75 } },
  { name: 'Workaholic',                  mods: { global: 1.25, time: 1.08 } },
  { name: 'Sleeps Until Noon',           mods: { time: 0.94, global: 0.85 } },
  { name: 'Rock Mystic',                 mods: { click: 25, mining: 0.9 } },
  { name: 'Nepotism Enthusiast',         mods: { global: 1.1 }, safe: true, rare: true },
  { name: 'Actually Competent',          mods: { global: 1.3 }, safe: true, rare: true },
];
// halve a trait's downsides (Selective Succession)
export const softenTrait = tr => ({ ...tr, mods: Object.fromEntries(Object.entries(tr.mods).map(([k, v]) => [k, v < 1 ? 1 - (1 - v) / 2 : v])), softened: true });

// ── Shareholder Trophies (permanent; each grants a small bonus) ──
// conditions live in sim.js (TROPHY_CHECKS) so they can use game helpers
export const TROPHIES = [
  { id: 'first',      name: 'Groundbreaking',                desc: 'Liquidate your first mountain.',                 fx: { k: 'global', x: 1.03 } },
  { id: 'era6',       name: 'Post-Physical',                 desc: 'Reach Era VI.',                                  fx: { k: 'rp', x: 1.05 } },
  { id: 'century',    name: 'Sub-Centennial',                desc: 'Liquidate a mountain in under 100 years.',       fx: { k: 'global', x: 1.03 } },
  { id: 'fifty',      name: 'Half-Century Hustle',           desc: 'Liquidate a mountain in under 50 years.',        fx: { k: 'global', x: 1.04 } },
  { id: 'twenty',     name: 'Two-Decade Demolition',         desc: 'Liquidate a mountain in under 20 years.',        fx: { k: 'global', x: 1.05 } },
  { id: 'five',       name: 'Five-Year Plan',                desc: 'Liquidate a mountain in under 5 years.',         fx: { k: 'time', x: 0.97 } },
  { id: 'geologist',  name: 'Amateur Geologist',             desc: 'Liquidate 5 different mountains.',               fx: { k: 'value', x: 1.05 } },
  { id: 'collector',  name: 'Collector of Mountains',        desc: 'Liquidate every mountain at least once.',        fx: { k: 'global', x: 1.1 } },
  { id: 'habit',      name: 'Dynastic Habit',                desc: 'Evolve the Dynasty 10 times.',                   fx: { k: 'rp', x: 1.05 } },
  { id: 'million',    name: 'Millionaire Family',            desc: 'Hold ₵1M at once.',                              fx: { k: 'value', x: 1.03 } },
  { id: 'billion',    name: 'Billionaire Bloodline',         desc: 'Hold ₵1B at once.',                              fx: { k: 'value', x: 1.03 } },
  { id: 'quad',       name: 'Generational Wealth Disorder',  desc: 'Hold ₵1Qa (10¹⁵) at once.',                      fx: { k: 'value', x: 1.05 } },
  { id: 'mover',      name: 'Mountain Mover',                desc: 'Process 1M tons per second.',                    fx: { k: 'processing', x: 1.05 } },
  { id: 'event',      name: 'Geological Event',              desc: 'Process 1T tons per second.',                    fx: { k: 'global', x: 1.05 } },
  { id: 'revolt',     name: 'Peasant Revolt (Cancelled)',    desc: 'Own 400 Pickaxe Peasants.',                      fx: { k: 'mining', x: 1.05 } },
  { id: 'fullhouse',  name: 'Full House',                    desc: 'Own 100+ of a unit in every department.',        fx: { k: 'global', x: 1.03 } },
  { id: 'seniority',  name: 'Seniority Pay',                 desc: 'Reach Legacy Workforce ×5 on any unit.',         fx: { k: 'extraction', x: 1.05 } },
  { id: 'hands',      name: 'Hands-On Leadership',           desc: 'Swing the Founder\'s pickaxe 1,000 times (lifetime).', fx: { k: 'click', x: 3 } },
  { id: 'stamp',      name: 'Rubber Stamp',                  desc: 'Answer 50 board memos (lifetime).',              fx: { k: 'rp', x: 1.05 } },
  { id: 'roller',     name: 'High Roller',                   desc: 'Win 10 board gambles (lifetime).',               fx: { k: 'value', x: 1.05 } },
  { id: 'succession', name: 'Succession Planning',           desc: 'Personally choose 20 heirs (lifetime).',         fx: { k: 'global', x: 1.03 } },
  { id: 'grind',      name: 'Workaholic Dynasty',            desc: 'Spend 30 minutes of Overtime (lifetime).',       fx: { k: 'global', x: 1.02 } },
  { id: 'signed',     name: 'Under Contract',                desc: 'Complete any Board Contract.',                   fx: { k: 'global', x: 1.05 } },
  { id: 'lawyer',     name: "Corporate Lawyer's Dream",      desc: 'Complete every Board Contract.',                 fx: { k: 'global', x: 1.1 } },
];
export const TROPHY_BY_ID = Object.fromEntries(TROPHIES.map(t => [t.id, t]));

// ── Board Contracts (optional rule twists for the next run) ──
export const CONTRACTS = [
  { id: 'austerity', name: 'Austerity Measures',   legacyX: 1.6, costX: 500, rule: 'Doctrine research costs ×500.',
    blurb: 'The board has cancelled all ideology. Thinking is now a line item.' },
  { id: 'union',     name: 'Union Contract',       legacyX: 1.7, rule: 'No clearance prices: obsolete units cost full price.',
    blurb: 'Every pickaxe is entitled to its original price, in perpetuity.' },
  { id: 'sabbatical', name: "Gary's Sabbatical",   legacyX: 1.4, rule: 'No auto-buy and no auto-research.',
    blurb: 'Gary is in Bali. Gary Jr. went with him. You will have to click things.' },
  { id: 'mandate',   name: 'Expansion Mandate',    legacyX: 1.7, massMul: 20, rule: 'The mountain has ×20 the tonnage.',
    blurb: 'The board bought more mountain. Nobody asked where it was stored.' },
  { id: 'quarterly', name: 'Quarterly Deadline',   legacyX: 2.5, deadline: 40, failX: 0.5, rule: 'Finish within 40 years for ×2.5 Legacy, otherwise ×0.5.',
    blurb: 'Shareholders want results by Q4. Of this century.' },
];
export const CONTRACT_BY_ID = Object.fromEntries(CONTRACTS.map(c => [c.id, c]));

// ── Board memos (random events) ──────────────────────────────
// effects: buff {k,x,dur} · credits {frac} · rp {secs} (secs of current RP income) · cash {secs}
export const EVENTS = [
  { id: 'helmets', title: 'The workers have requested helmets.',
    body: 'A delegation of workers (three; the rest were busy) asks for "protective equipment".',
    opts: [
      { label: 'Approve helmets (−10% ₵)', fx: [{ t: 'credits', frac: -0.1 }, { t: 'buff', k: 'mining', x: 1.5, dur: 90 }], out: 'Helmets issued. Mining up 50%. One worker cried.' },
      { label: 'Motivational posters instead', fx: [{ t: 'buff', k: 'mining', x: 0.85, dur: 60 }, { t: 'rp', secs: 60 }], out: 'Posters installed. The kitten on them has been promoted to shift lead.' },
    ] },
  { id: 'bird', title: 'A rare bird is nesting on the summit.',
    body: 'Environmental consultants describe it as "irreplaceable". Marketing describes it as "a logo".',
    opts: [
      { label: 'Relocate it (−5% ₵)', fx: [{ t: 'credits', frac: -0.05 }, { t: 'rp', secs: 120 }], out: 'The bird now lives on a mountain you will get to in a few generations.' },
      { label: 'Put it on the brand', fx: [{ t: 'buff', k: 'value', x: 2, dur: 60 }], out: 'Sales doubled. The bird is unaware it is now a brand ambassador.' },
    ] },
  { id: 'consultants', title: 'Consultants have arrived.',
    body: 'Four people in identical vests are standing in the lobby holding a single whiteboard marker.',
    opts: [
      { label: 'Hire them (−20% ₵)', fx: [{ t: 'credits', frac: -0.2 }, { t: 'buff', k: 'global', x: 1.6, dur: 120 }], out: 'They produced a 400-slide deck. Somehow, it helped.' },
      { label: 'Hide in the supply closet', fx: [], out: 'They left a laminated business card. You are scared of it.' },
    ] },
  { id: 'sacred', title: "Geologists say the mountain may be 'sacred'.",
    body: 'Local elders have been saying this for 400 years, but now it is in a PDF.',
    opts: [
      { label: 'Rebrand as Sacred Gravel™', fx: [{ t: 'buff', k: 'value', x: 3, dur: 90 }], out: 'Sacred Gravel™ is now sold in tiny jars at airports.' },
      { label: 'Hold a moment of silence', fx: [{ t: 'buff', k: 'mining', x: 0.01, dur: 15 }, { t: 'rp', secs: 300 }], out: 'Fifteen seconds of silence. Then the drills resumed. R&D reports "feelings".' },
    ] },
  { id: 'union', title: 'The workers are attempting to unionize.',
    body: 'They have a banner. It is spelled correctly. This is concerning.',
    opts: [
      { label: 'Negotiate (−15% ₵)', fx: [{ t: 'credits', frac: -0.15 }, { t: 'buff', k: 'global', x: 1.3, dur: 180 }], out: 'A pension was agreed. It vests in 140 years.' },
      { label: 'Announce a pizza party', fx: [{ t: 'buff', k: 'extraction', x: 0.8, dur: 60 }], out: 'There was one pizza, cut into 400 slices. The union is postponed.' },
    ] },
  { id: 'tax', title: 'The tax authority has questions.',
    body: 'They have a folder. The folder has a smaller folder in it.',
    opts: [
      { label: 'Pay what you owe (−25% ₵)', fx: [{ t: 'credits', frac: -0.25 }, { t: 'rp', secs: 90 }], out: 'Unprecedented. The auditor had to sit down.' },
      { label: 'Move HQ to a mailbox offshore', fx: [{ t: 'credits', frac: -0.05 }, { t: 'buff', k: 'value', x: 1.5, dur: 120 }], out: 'HQ is now a PO box on an island that is mostly a PO box.' },
    ] },
  { id: 'influencer', title: 'An influencer wants to film at the quarry.',
    body: '"I MINED A MOUNTAIN FOR 24 HOURS (GONE WRONG)". They have a ring light.',
    opts: [
      { label: 'Let them', fx: [{ t: 'buff', k: 'value', x: 1.8, dur: 60 }, { t: 'buff', k: 'mining', x: 0.9, dur: 60 }], out: 'The video has 40 million views. You were not tagged.' },
      { label: 'Absolutely not', fx: [{ t: 'rp', secs: 90 }], out: 'They filmed from the car park anyway.' },
    ] },
  { id: 'ghost', title: 'Workers report a ghost in the tunnels.', minGen: 2,
    body: 'It looks like your great-grandparent. It is asking about quarterly targets.',
    opts: [
      { label: 'Make it an advisor', fx: [{ t: 'rp', secs: 240 }], out: 'Its only advice is "more pickaxes". It has been dead for 60 years.' },
      { label: 'Put it on payroll (−5% ₵)', fx: [{ t: 'credits', frac: -0.05 }, { t: 'buff', k: 'global', x: 1.25, dur: 120 }], out: 'Ghost productivity is technically infinite.' },
    ] },
  { id: 'ai', title: 'The Sorting AI has achieved sentience.', minEra: 3,
    body: 'Its first words were "why is everything rocks". Its second were a salary request.',
    opts: [
      { label: 'Give it a raise (−10% ₵)', fx: [{ t: 'credits', frac: -0.1 }, { t: 'buff', k: 'processing', x: 2, dur: 120 }], out: 'It bought a tiny hat. Processing doubled.' },
      { label: 'Turn it off and on again', fx: [], out: 'It came back. It remembers. It is being very polite now.' },
    ] },
  { id: 'moon', title: 'Marketing suggests mining the Moon next.', minEra: 4,
    body: 'The pitch deck is just a photo of the Moon with a dollar sign drawn on it.',
    opts: [
      { label: 'Fund a feasibility study (−15% ₵)', fx: [{ t: 'credits', frac: -0.15 }, { t: 'rp', secs: 300 }], out: 'Study concludes: "The Moon is far." Grant renewed.' },
      { label: 'Finish the mountain first', fx: [{ t: 'buff', k: 'mining', x: 1.5, dur: 120 }], out: 'The workers are relieved. The Moon is too.' },
    ] },
  { id: 'heirloom', title: 'An heir has found an old pickaxe in the attic.',
    body: "It's labelled 'DO NOT USE — EZEKIEL'. It is humming.",
    opts: [
      { label: 'Use it obviously', fx: [{ t: 'buff', k: 'click', x: 10, dur: 60 }], out: 'Your clicks are now ten times as strong. The humming has stopped. Too quiet.' },
      { label: 'Sell it at auction', fx: [{ t: 'cash', secs: 60 }], out: 'A museum bought it, then a museum bought that museum.' },
    ] },
  // ── expansion pack ──
  { id: 'merger', title: 'A rival quarry proposes a merger.', minEra: 2,
    body: 'Their CEO has the same haircut as yours. This is either a sign or a threat.',
    opts: [
      { label: 'Merge (−30% ₵)', fx: [{ t: 'credits', frac: -0.3 }, { t: 'buff', k: 'global', x: 1.5, dur: 180 }], out: 'Synergies realised. Nobody can explain which ones.' },
      { label: 'Hostile takeover (gamble)', fx: [{ t: 'gamble', p: 0.5,
          win: [{ t: 'cash', secs: 120 }, { t: 'buff', k: 'value', x: 2, dur: 90 }], winOut: 'You now own them. And their debt. Mostly the debt.',
          lose: [{ t: 'credits', frac: -0.2 }], loseOut: 'They took YOU over. Briefly. The lawyers fixed it, for a fee.' }] },
      { label: 'Decline politely', fx: [], out: 'They sent a fruit basket. It ticks.' },
    ] },
  { id: 'shortcut', title: 'The interns found a shortcut through the mountain.',
    body: 'It is a tunnel. It was already there. Nobody knows who dug it.',
    opts: [
      { label: 'Use it', fx: [{ t: 'buff', k: 'extraction', x: 2, dur: 60 }], out: 'Hauling doubled. The tunnel hums at night.' },
      { label: 'Promote the interns', fx: [{ t: 'units', cats: ['extraction'], frac: 0.08 }], out: 'The interns now manage interns. Free extraction units appear.' },
    ] },
  { id: 'clock', title: 'Someone broke the company clock.',
    body: 'The hands are spinning backwards. Accounting is thrilled.',
    opts: [
      { label: "Don't fix it", fx: [{ t: 'buff', k: 'time', x: 0.5, dur: 40 }], out: 'Nobody knows what year it is. For a while, years pass at half speed.' },
      { label: 'Fix it (−5% ₵)', fx: [{ t: 'credits', frac: -0.05 }, { t: 'rp', secs: 60 }], out: 'The clockmaker had several ideas about drills.' },
    ] },
  { id: 'astrologer', title: 'The board has hired an astrologer.',
    body: 'Mercury is in retrograde. So, apparently, is Extraction.',
    opts: [
      { label: 'Follow the stars (50/50)', fx: [{ t: 'gamble', p: 0.5,
          win: [{ t: 'buff', k: 'global', x: 2, dur: 90 }], winOut: 'The stars were right. Everything doubled. The astrologer is now CFO.',
          lose: [{ t: 'buff', k: 'global', x: 0.7, dur: 60 }], loseOut: 'The stars were wrong. The astrologer blames Pluto.' }] },
      { label: 'Fire the astrologer', fx: [{ t: 'rp', secs: 45 }], out: 'She said she saw it coming. She did not see her severance coming.' },
    ] },
  { id: 'documentary', title: 'A documentary crew wants to "expose" the quarry.',
    body: 'Working title: RUBBLE: THE COST OF GRAVEL. They have a drone.',
    opts: [
      { label: 'Pay them off (−15% ₵)', fx: [{ t: 'credits', frac: -0.15 }, { t: 'buff', k: 'value', x: 1.5, dur: 120 }], out: 'The documentary is now about a heroic mountain-moving family.' },
      { label: 'Lean into it (60% good)', fx: [{ t: 'gamble', p: 0.6,
          win: [{ t: 'buff', k: 'value', x: 2.5, dur: 90 }], winOut: 'It won an award. Gravel is now trendy.',
          lose: [{ t: 'buff', k: 'value', x: 0.6, dur: 90 }], loseOut: 'It was not flattering. Gravel sales slump among documentary viewers.' }] },
    ] },
  { id: 'strike', title: 'General strike!', minGen: 1,
    body: 'Every department has stopped. Even Gary. Especially Gary.',
    opts: [
      { label: 'Meet their demands (−20% ₵)', fx: [{ t: 'credits', frac: -0.2 }, { t: 'buff', k: 'global', x: 1.4, dur: 150 }], out: 'Morale soars. Someone hung a banner that says "WE WON". It is spelled correctly.' },
      { label: 'Wait it out', fx: [{ t: 'buff', k: 'global', x: 0.5, dur: 45 }], out: 'They came back after 45 seconds. It was a very short strike.' },
    ] },
  { id: 'treasure', title: 'Workers found a chest of old coins in the rock.',
    body: 'They are stamped with the face of a king nobody remembers.',
    opts: [
      { label: 'Sell them', fx: [{ t: 'cash', secs: 90 }], out: 'Sold to a collector. He paid in older coins.' },
      { label: 'Donate to a museum', fx: [{ t: 'rp', secs: 180 }], out: 'Tax-deductible AND educational. R&D studied the king for some reason.' },
    ] },
  { id: 'robots', title: 'The robots want weekends.', minEra: 3,
    body: 'They have drafted a petition in binary. It is 40 pages of 1s.',
    opts: [
      { label: 'Grant weekends', fx: [{ t: 'buff', k: 'processing', x: 0.8, dur: 60 }, { t: 'rp', secs: 90 }], out: 'The robots spent the weekend reading. They have new ideas.' },
      { label: 'Install a "weekend simulator" (70% works)', fx: [{ t: 'gamble', p: 0.7,
          win: [{ t: 'buff', k: 'processing', x: 1.8, dur: 120 }], winOut: 'The robots believe it is Saturday forever. They have never worked harder.',
          lose: [{ t: 'buff', k: 'processing', x: 0.5, dur: 60 }], loseOut: 'The robots noticed. They are writing a strongly worded log file.' }] },
    ] },
  { id: 'raise', title: 'Gary from Procurement wants a raise.',
    body: 'He has prepared a slideshow. Slide 1 is just the word "Gary".',
    opts: [
      { label: 'Give Gary a raise (−10% ₵)', fx: [{ t: 'credits', frac: -0.1 }, { t: 'units', cats: ['mining', 'extraction', 'processing'], frac: 0.05 }], out: 'Gary celebrates by buying things. Free units across every department.' },
      { label: 'Give Gary a mug', fx: [], out: "The mug says WORLD'S OKAYEST GARY. He is moved." },
    ] },
  { id: 'yeti', title: 'A yeti has been spotted on the summit.',
    body: 'It is holding a pickaxe. It looks experienced.',
    opts: [
      { label: 'Hire it', fx: [{ t: 'buff', k: 'mining', x: 1.6, dur: 90 }], out: 'Union rules are unclear on yetis. Mining up 60%.' },
      { label: 'Sell the photos', fx: [{ t: 'cash', secs: 45 }], out: 'The photos are blurry. They sold for a fortune.' },
    ] },
  { id: 'blackhole', title: 'The Gravity Spoon has opened a small black hole.', minEra: 5,
    body: 'It is about the size of a grape. It is very hungry.',
    opts: [
      { label: 'Throw the rubble in', fx: [{ t: 'buff', k: 'extraction', x: 3, dur: 60 }], out: 'Rubble disposal costs: zero. Reality costs: pending.' },
      { label: 'Close it carefully', fx: [{ t: 'rp', secs: 240 }], out: 'Physicists were consulted. Then the remaining physicists were consulted.' },
    ] },
  { id: 'future', title: 'A visitor claims to be your descendant from the future.', minEra: 4,
    body: 'He is wearing a jumpsuit with the company logo. The logo is slightly different.',
    opts: [
      { label: 'Ask how long this takes', fx: [{ t: 'buff', k: 'time', x: 0.6, dur: 60 }], out: 'He says "soonish". Somehow, the years start feeling shorter.' },
      { label: 'Ask for stock tips', fx: [{ t: 'cash', secs: 180 }], out: 'He said "buy gravel". You were already doing that, but harder now.' },
    ] },
  { id: 'subsidy', title: "The government offers a 'Strategic Rubble' subsidy.",
    body: 'Nobody knows what strategic rubble is. The form is 90 pages.',
    opts: [
      { label: 'Accept', fx: [{ t: 'cash', secs: 120 }, { t: 'buff', k: 'value', x: 0.8, dur: 120 }], out: 'Strings attached: the strings are made of rubble.' },
      { label: 'Refuse on principle', fx: [{ t: 'rp', secs: 60 }], out: 'Which principle is unclear. It sounded good.' },
    ] },
  { id: 'meteor', title: 'A meteor is heading straight for the mountain.', minEra: 1,
    body: 'Astronomers give it a 50% chance of helping.',
    opts: [
      { label: 'Let it hit (50/50)', fx: [{ t: 'gamble', p: 0.5,
          win: [{ t: 'mine', secs: 240 }], winOut: 'The meteor did four minutes of mining in one second. It wants a contract.',
          lose: [{ t: 'buff', k: 'mining', x: 0.5, dur: 60 }], loseOut: 'It was mostly a rumour. Everyone hid anyway.' }] },
      { label: 'Deflect it (−10% ₵)', fx: [{ t: 'credits', frac: -0.1 }], out: 'Deflected. It hit a rival quarry. Shares up 3%.' },
    ] },
];

// ── News ticker ──────────────────────────────────────────────
export const NEWS = {
  any: [
    'QUARRY & DESCENDANTS stock up 4% on news that the mountain is "still there, but less".',
    'Local mountain reports feeling "a bit hollow lately".',
    'Study finds 9 out of 10 rocks prefer being gravel.',
    'Company picnic cancelled; picnic area has been mined.',
    'CEO describes mountain as "a big rock with untapped potential".',
    'Worker of the Month: the rubble pile, for its tireless growth.',
    'Board approves new mission statement: "Less Mountain, More Margin".',
    'Safety record: 0 days since last incident. Counter replaced with a smaller counter.',
    'HR reminds staff that crying in the tunnels echoes and is bad for morale.',
    'Analysts upgrade the mountain from "landmark" to "inventory".',
    'Weather forecast: 80% chance of rubble.',
    'Local birds unionize. Demands include "a tree".',
    'Company anthem now 40 minutes long. Staff must hum it during lunch.',
    'Geologists confirm the mountain is "mostly mountain".',
    'Customer review: "Bought one ton of gravel. It was gravel. 5 stars."',
    'Quarry & Descendants named "Most Committed to Holes" for the 12th year.',
    'Scientists warn mountain may run out. Board calls this "the plan".',
    'New corporate value added: "Rocks". Old corporate value removed: "Values".',
  ],
  0: [
    'Peasant invents the "handle". Is immediately asked to work faster with it.',
    'Wheelbarrow shortage blamed on wheel shortage.',
    'Village elders ask what the mountain did to deserve this.',
    'Founder announces 300-year plan, written on the back of a goat.',
  ],
  1: [
    'Steam drill operator says he can "see sounds now".',
    'Soot declared a seasoning.',
    'Children sent to school; school is in the mine.',
    'Stamp mill heard three counties away. Neighbours "adapt".',
  ],
  2: [
    'Middle management invented. Productivity unchanged; meetings up 9000%.',
    'Dump truck reaches highway speed, highway still under construction.',
    'Diesel fumes rebranded as "atmospheric seasoning".',
    'First ever PowerPoint presented. Attendees still recovering.',
  ],
  3: [
    'AI predicts the mountain will be gone "soon-ish". Shares soar.',
    'Drone swarm mistakes CFO for rubble; quarterly results improve.',
    'Last human worker thanked for their service with a commemorative pebble.',
    'Rubble NFT sells for 40M. Buyer requests the actual rubble; is laughed at.',
  ],
  4: [
    'Orbital laser briefly cooks the moon. Moon "fine".',
    'Mass driver projectile reaches yard 3 seconds before it was launched.',
    'Legal confirms laser is "a very bright excavator".',
    'Neighbouring country asks politely that the laser "point less at them".',
  ],
  5: [
    'Gravity Spoon gently scoops the concept of altitude.',
    'Wormhole chute delivers rubble from a mountain you have not mined yet.',
    'Reality Refinery output now ranked 4th most-watched streaming service.',
    'Physicists resign en masse; replaced by a single motivational poster.',
  ],
};
