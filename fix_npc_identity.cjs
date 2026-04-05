#!/usr/bin/env node
/**
 * Audit 13 — NPC Identity Depth + Past-Life Encounters
 * 10 fixes for the "thousand lives" fantasy
 */
const fs = require('fs');
const FILE = 'public/index.html';

let src = fs.readFileSync(FILE, 'utf8');
const origLen = src.length;
const cr = s => s.replace(/\n/g, '\r\n');

// Balance tracking
function countBraces(s) {
  let b = 0, p = 0, k = 0;
  for (const ch of s) {
    if (ch === '{') b++; else if (ch === '}') b--;
    if (ch === '(') p++; else if (ch === ')') p--;
    if (ch === '[') k++; else if (ch === ']') k--;
  }
  return { b, p, k };
}
const before = countBraces(src);

let applied = 0, failed = 0;
function safeReplace(old, replacement, label) {
  const o = cr(old);
  const r = cr(replacement);
  const idx = src.indexOf(o);
  if (idx === -1) { console.log(`  SKIP [${label}] — old string not found`); failed++; return; }
  const second = src.indexOf(o, idx + 1);
  if (second !== -1) { console.log(`  SKIP [${label}] — ambiguous (${2}+ matches)`); failed++; return; }
  src = src.slice(0, idx) + r + src.slice(idx + o.length);
  console.log(`  ✓ [${label}]`);
  applied++;
}

// ════════════════════════════════════════════════════
//  FIX 1: Expand NPC_NAMES from 20 to 80+ (multi-cultural)
// ════════════════════════════════════════════════════
safeReplace(
  `const NPC_NAMES = ['Kira','Ash','Vex','Nova','Orion','Ember','Jett','Lyra','Zara','Kai','Riven','Thane','Sable','Drake','Astra','Zenith','Echo','Cipher','Nyx','Vector'];`,
  `const NPC_NAMES = [
  // Original core
  'Kira','Ash','Vex','Nova','Orion','Ember','Jett','Lyra','Zara','Kai',
  'Riven','Thane','Sable','Drake','Astra','Zenith','Echo','Cipher','Nyx','Vector',
  // Slavic
  'Mira','Taras','Oksana','Danylo','Zlata','Bogdan','Lesia','Yaro','Ruslana','Oleh',
  // East Asian
  'Mei','Hiro','Yuki','Sora','Jin','Lian','Tao','Ren','Hana','Akira',
  // Arabic / Persian
  'Samir','Layla','Farid','Nadia','Zain','Amara','Rashid','Soraya','Khalil','Dalia',
  // Latin / Mediterranean
  'Lucia','Mateo','Isadora','Rafael','Carmen','Thiago','Elena','Santos','Valentina','Rio',
  // African
  'Zuri','Kofi','Ama','Kwame','Nia','Sekou','Amina','Jabari','Kendi','Obioma',
  // Nordic / Celtic
  'Freya','Leif','Sigrid','Bjorn','Rowan','Ailsa','Torsten','Maeve','Sven','Bryn',
  // Spacer-culture
  'Flux','Coda','Tether','Axiom','Prism','Rune','Veil','Lux','Onyx','Quasar',
];
const NPC_SURNAMES = [
  'Volkov','Chen','Okafor','Singh','Vasquez','Kowalski','Nakamura','Al-Rashid','Mbeki','Larsen',
  'Torres','Yamamoto','Petrov','Osei','Bergstrom','Reyes','Takahashi','Koval','Okonkwo','Malek',
  'Ferreira','Johansson','Kimura','Abubakar','Morales','Ivanova','Tanaka','Achebe','Lindqvist','Salazar',
  'void-born','sol-touched','dust-walker','star-forged','null-child','drift-born','arc-welder','shadow-kin','ion-marked','warp-born',
];`,
  'Fix 1: Expand NPC_NAMES (80+) + add NPC_SURNAMES (40)'
);

// ════════════════════════════════════════════════════
//  FIX 2: Expand NPC_TITLES from 18 to 40+
// ════════════════════════════════════════════════════
safeReplace(
  `const NPC_TITLES = ['Scavenger','Trader','Pirate Captain','Mining Foreman','Patrol Officer','Smuggler','Mechanic','Diplomat','Bounty Hunter','Scientist','Drifter','Station Hand','Cargo Pilot','Arms Dealer','Navigator','Medic','Warden','Outcast'];`,
  `const NPC_TITLES = [
  // Core
  'Scavenger','Trader','Pirate Captain','Mining Foreman','Patrol Officer','Smuggler',
  'Mechanic','Diplomat','Bounty Hunter','Scientist','Drifter','Station Hand',
  'Cargo Pilot','Arms Dealer','Navigator','Medic','Warden','Outcast',
  // Faction-flavored
  'Void Acolyte','Circuit Sage','Iron Enforcer','Church Inquisitor','Gene Sculptor',
  'Syndicate Fixer','Coalition Emissary','Republic Marshal',
  // Specialist
  'Cartographer','Terraformer','Archivist','Prophet','Xenobiologist','Hacker',
  'Salvage Diver','Demolitions Expert','Asteroid Miner','Deep-Space Surveyor',
  // Outlaw / Fringe
  'Exile','Rebel Leader','Ghost Runner','Debt Collector','Arena Champion',
  'Relic Thief','Spice Runner','Void Walker','Signal Pirate','Wreck Diver',
];`,
  'Fix 2: Expand NPC_TITLES (48)'
);

// ════════════════════════════════════════════════════
//  FIX 3: Expand NPC_BACKSTORIES from 10 to 40+
// ════════════════════════════════════════════════════
safeReplace(
  `const NPC_BACKSTORIES = [
  'Born in the mining belts, they learned to survive before they learned to speak.',
  'A former military officer who deserted after witnessing the Void Cult massacre.',
  'Heir to a trade fortune, squandered on gambling and bad deals. Starting over.',
  'They say this one once killed a Dreadnought solo. Nobody believes them.',
  'An orphan raised by station AIs. More comfortable with machines than people.',
  'Excommunicated from the Stellar Church for asking too many questions.',
  'Three past lives as a pirate. The karma debt is... significant.',
  'A genetic anomaly — radiation-resistant but socially cursed.',
  'Last seen fleeing Iron Syndicate enforcers. The bounty is still active.',
  'Quiet. Efficient. The kind of person who survives where others don\\'t.',
];`,
  `const NPC_BACKSTORIES = [
  // Original 10
  'Born in the mining belts, they learned to survive before they learned to speak.',
  'A former military officer who deserted after witnessing the Void Cult massacre.',
  'Heir to a trade fortune, squandered on gambling and bad deals. Starting over.',
  'They say this one once killed a Dreadnought solo. Nobody believes them.',
  'An orphan raised by station AIs. More comfortable with machines than people.',
  'Excommunicated from the Stellar Church for asking too many questions.',
  'Three past lives as a pirate. The karma debt is... significant.',
  'A genetic anomaly — radiation-resistant but socially cursed.',
  'Last seen fleeing Iron Syndicate enforcers. The bounty is still active.',
  'Quiet. Efficient. The kind of person who survives where others don\\'t.',
  // Faction-referenced
  'Grew up in the Autonomous Collective. Left when they realized freedom had a price.',
  'Iron Syndicate test subject. The scars healed. The memories didn\\'t.',
  'A Void Cult defector who still hears the whispers when they sleep.',
  'Stellar Church missionary turned smuggler. God works in mysterious ways.',
  'Coalition diplomat who watched two systems burn over a trade dispute.',
  'Republic veteran. Three tours, two medals, one functioning lung.',
  'Gene-sculpted by the Outer Rim cartels. Sold for parts. Escaped anyway.',
  'Raised on a generation ship that never arrived. Born between stars.',
  // Existential / poetic
  'Remembers nothing before waking in a med-bay with someone else\\'s blood type.',
  'Claims to have memories of a life that hasn\\'t happened yet.',
  'Born during a solar flare. The radiation left marks the genome can\\'t explain.',
  'The only survivor of a colony ship that vanished two centuries ago.',
  'Carries a locket with a photo of someone no database can identify.',
  'Spoke their first words in a dead language. Nobody knows which one.',
  'Found drifting in an escape pod with no ship in sensor range.',
  'Their DNA says they\\'re 200 years old. Their face says 30.',
  // Gritty / criminal
  'Wanted in six systems for crimes they definitely committed.',
  'Ran a gambling den on Sigma Station until someone bet a warship. And won.',
  'Debt so deep it has its own gravity well.',
  'Former arena champion. Retired after killing someone who begged them to stop.',
  'Stole a frigate, sold it for scrap, bought passage to the frontier.',
  'They don\\'t talk about what happened on Kappa Deep. Nobody who was there does.',
  // Weird / memorable
  'Talks to their ship like it\\'s a person. The ship talks back, sometimes.',
  'Allergic to artificial gravity. Lives in freefall by choice.',
  'Has a cybernetic arm they refuse to explain. It\\'s not from this century.',
  'Collects ancient Earth music. Will fight anyone who insults jazz.',
  'Sleeps in their cockpit. Says beds are for people who trust walls.',
  'Once traded a kidney for a star map. Found three derelicts. Worth it.',
  'Was legally dead for 72 hours. Came back different.',
  'Keeps a tally of every life they\\'ve lived. The count is... high.',
];`,
  'Fix 3: Expand NPC_BACKSTORIES (40)'
);

// ════════════════════════════════════════════════════
//  FIX 4: Expand EPITAPHS from 10 to 30+
// ════════════════════════════════════════════════════
safeReplace(
  `const EPITAPHS = [
  '"The void remembers what the flesh forgets."',
  '"Every star is a soul that once burned."',
  '"In Old Eden, even the dead have stories to tell."',
  '"The galaxy grows heavier with each life lived."',
  '"Not all who wander are lost — some are reborn."',
  '"The Karma Wheel turns. The soul endures."',
  '"What the body loses, the soul keeps."',
  '"A thousand lives, and each one mattered."',
  '"The stars do not mourn. They witness."',
  '"From dust to dust, but the soul is stardust."',
];`,
  `const EPITAPHS = [
  // Original 10
  '"The void remembers what the flesh forgets."',
  '"Every star is a soul that once burned."',
  '"In Old Eden, even the dead have stories to tell."',
  '"The galaxy grows heavier with each life lived."',
  '"Not all who wander are lost — some are reborn."',
  '"The Karma Wheel turns. The soul endures."',
  '"What the body loses, the soul keeps."',
  '"A thousand lives, and each one mattered."',
  '"The stars do not mourn. They witness."',
  '"From dust to dust, but the soul is stardust."',
  // Philosophical
  '"Death is not the opposite of life. Rebirth is."',
  '"You were someone before. You will be someone again."',
  '"The genome forgets. The soul remembers."',
  '"Every ending is someone else\\'s beginning."',
  '"In the space between lives, the universe holds its breath."',
  // Dark / Gritty
  '"No one mourns a stranger. That\\'s why they made the Karma Wheel."',
  '"The cockpit is cold now. It will be warm again soon."',
  '"You died as you lived — surrounded by void."',
  '"Another body for the recyclers. Another soul for the wheel."',
  '"Credits spent, hull breached, name forgotten. But the soul? Intact."',
  // Hopeful
  '"The next life might be the great one."',
  '"Somewhere in the genome lottery, your perfect self is waiting."',
  '"You fell. You will rise. The wheel turns."',
  '"Each rebirth is a vote of confidence from the universe."',
  '"The best pilot in the galaxy hasn\\'t been born yet. Maybe next spin."',
  // Poetic
  '"Between the last heartbeat and the first breath — eternity."',
  '"A soul is just a star that learned to fly."',
  '"The universe writes stories in lives, not ink."',
  '"You were cosmic dust pretending to be a person. Now you\\'re dust again."',
  '"In Old Eden, every graveyard is a nursery."',
];`,
  'Fix 4: Expand EPITAPHS (30)'
);

// ════════════════════════════════════════════════════
//  FIX 5: Change name format from "Name-###" to "FirstName Surname"
// ════════════════════════════════════════════════════
safeReplace(
  `const name = NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)] + '-' + Math.floor(Math.random() * 999);`,
  `const name = NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)] + ' ' + NPC_SURNAMES[Math.floor(Math.random() * NPC_SURNAMES.length)];`,
  'Fix 5: Name format FirstName Surname'
);

// ════════════════════════════════════════════════════
//  FIX 6: Stat-derived occupation instead of random
// ════════════════════════════════════════════════════
safeReplace(
  `const occupations = ['Shopkeeper', 'Bartender', 'Mechanic', 'Bounty Board Operator', 'Fuel Vendor', 'Arms Dealer', 'Station Guard', 'Dock Worker'];
  const life = {
    name: state.player.name,
    faction: state.player.faction,
    genome: state.player.genome ? [...state.player.genome] : null,
    credits: state.player.credits,
    kills: state.combat.kills,
    score: state.combat.score,
    bestStreak: state.combat.bestStreak,
    deathCause: deathCause || 'Unknown',
    station: state.starSystems[state.location.systemIndex]?.name || 'Deep Space',
    occupation: occupations[Math.floor(Math.random() * occupations.length)],`,
  `// Derive occupation from actual playstyle stats
  const kills = state.combat.kills || 0;
  const score = state.combat.score || 0;
  const creds = state.player.credits || 0;
  const streak = state.combat.bestStreak || 0;
  let occupation;
  if (kills >= 30 && streak >= 10) occupation = 'War Hero';
  else if (kills >= 20) occupation = 'Bounty Hunter';
  else if (kills >= 10 && streak >= 5) occupation = 'Gun-for-Hire';
  else if (creds >= 2000) occupation = 'Merchant Prince';
  else if (creds >= 800) occupation = 'Trader';
  else if (score >= 5000) occupation = 'Ace Pilot';
  else if (score >= 2000) occupation = 'Veteran';
  else if (kills < 3 && score < 500) occupation = 'Drifter';
  else occupation = ['Mechanic','Station Hand','Dock Worker','Fuel Vendor','Bartender','Shopkeeper'][Math.floor(Math.random() * 6)];
  const life = {
    name: state.player.name,
    faction: state.player.faction,
    genome: state.player.genome ? [...state.player.genome] : null,
    credits: state.player.credits,
    kills: state.combat.kills,
    score: state.combat.score,
    bestStreak: state.combat.bestStreak,
    deathCause: deathCause || 'Unknown',
    station: state.starSystems[state.location.systemIndex]?.name || 'Deep Space',
    occupation: occupation,`,
  'Fix 6: Stat-derived occupation'
);

// ════════════════════════════════════════════════════
//  FIX 7: Keep ALL past lives, only display last 50 at stations
// ════════════════════════════════════════════════════
safeReplace(
  `// Cap at 50 past lives to prevent memory bloat
  if (state.pastLives.length > 50) state.pastLives.shift();`,
  `// Archive system: keep ALL past lives for the "thousand lives" fantasy
  // Station display is limited to most recent 100 for performance`,
  'Fix 7: Keep all past lives (remove 50-cap)'
);

// ════════════════════════════════════════════════════
//  FIX 8: Past-life genome thumbnails at station
// ════════════════════════════════════════════════════
safeReplace(
  `const livesHtml = pastLivesHere.map(life => {
      const fac = FACTIONS.find(f => f.id === life.faction);
      return \`<div class="trade-row" style="flex-direction:column;align-items:flex-start;gap:4px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
        <div style="color:var(--gold);font-size:0.95rem">\${life.name} <span style="color:var(--muted);font-size:0.7rem">— \${life.occupation}</span></div>
        <div style="font-size:0.75rem;color:var(--muted)">Life #\${life.rebirthNum + 1} · \${life.kills} kills · \${life.score} pts · Died: \${life.deathCause}</div>
        <div style="font-size:0.7rem;color:\${fac?.color || '#888'}">\${fac?.name || 'Independent'}</div>
      </div>\`;
    }).join('');
    pastPanel.innerHTML = \`<div class="panel-title" style="color:#a855f7">&#128123; Past Lives Here</div>
      <div style="font-size:0.75rem;color:var(--muted);margin-bottom:8px;font-style:italic">"You recognize these souls... they were you."</div>\${livesHtml}\`;`,
  `const livesHtml = pastLivesHere.slice(-12).map((life, li) => {
      const fac = FACTIONS.find(f => f.id === life.faction);
      const canvasId = 'past-life-genome-' + li;
      return \`<div class="trade-row past-life-entry" data-life-idx="\${li}" style="flex-direction:row;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer" title="Click to commune with this past self">
        <canvas id="\${canvasId}" width="48" height="48" style="border-radius:4px;flex-shrink:0;border:1px solid rgba(255,255,255,0.1)"></canvas>
        <div style="flex:1;min-width:0">
          <div style="color:var(--gold);font-size:0.95rem">\${life.name} <span style="color:var(--muted);font-size:0.7rem">— \${life.occupation}</span></div>
          <div style="font-size:0.75rem;color:var(--muted)">Life #\${life.rebirthNum + 1} · \${life.kills} kills · \${life.score} pts</div>
          <div style="font-size:0.7rem;color:\${fac?.color || '#888'}">\${fac?.name || 'Independent'} · Died: \${life.deathCause}</div>
        </div>
        <div style="font-size:1.2rem;opacity:0.3">▸</div>
      </div>\`;
    }).join('');
    pastPanel.innerHTML = \`<div class="panel-title" style="color:#a855f7">&#128123; Past Lives Here</div>
      <div style="font-size:0.75rem;color:var(--muted);margin-bottom:8px;font-style:italic">"You recognize these souls... they were you."</div>\${livesHtml}
      <div id="past-life-dialogue" style="display:none;margin-top:12px;padding:12px;background:rgba(168,85,247,0.08);border:1px solid rgba(168,85,247,0.2);border-radius:8px"></div>\`;
    // Render genome thumbnails
    pastLivesHere.slice(-12).forEach((life, li) => {
      if (life.genome) {
        const cv = document.getElementById('past-life-genome-' + li);
        if (cv) drawGenome(new Uint8Array(life.genome), cv, 48);
      }
    });
    // Click interaction — talk to past self
    pastPanel.querySelectorAll('.past-life-entry').forEach((el, li) => {
      el.addEventListener('click', () => {
        const life = pastLivesHere.slice(-12)[li];
        if (!life) return;
        const quotes = [
          'I remember this place... or I will. Time is strange when you\\'ve lived more than once.',
          'Don\\'t make my mistakes. Or do — the wheel turns regardless.',
          'I had ' + life.kills + ' kills and ' + Math.round(life.score) + ' points. Beat that, will you?',
          'The ' + (FACTIONS.find(f=>f.id===life.faction)?.name||'void') + ' was everything to me. Now it\\'s just a memory.',
          'Credits don\\'t follow you through death. But lessons do.',
          'I died ' + (life.deathCause||'somehow') + '. You\\'ll die differently. Or maybe not.',
          'Take care of this genome. It\\'s been places you haven\\'t.',
          'Strange, seeing your own face on someone else. Or is it the other way around?',
        ];
        const quote = quotes[Math.floor(Math.random() * quotes.length)];
        const dlg = document.getElementById('past-life-dialogue');
        dlg.style.display = '';
        dlg.innerHTML = '<div style="color:var(--gold);font-size:0.9rem;margin-bottom:6px">' + life.name + ' speaks:</div>' +
          '<div style="font-style:italic;color:#ccc;font-size:0.85rem">"' + quote + '"</div>' +
          '<div style="font-size:0.7rem;color:var(--muted);margin-top:8px">A memory from Life #' + (life.rebirthNum+1) + '</div>';
        AudioSFX.play('click');
      });
    });`,
  'Fix 8+9: Genome thumbnails + past-life interaction'
);

// ════════════════════════════════════════════════════
//  FIX 10: Expand star system name variety
// ════════════════════════════════════════════════════
safeReplace(
  `const prefixes = ['Alpha','Beta','Gamma','Delta','Zeta','Tau','Sigma','Nova','Kappa','Omega'];
    const suffixes = ['Prime','Reach','Deep','Secundus','Minor','Expanse','Crossing','Haven','Nexus','Gate'];`,
  `const prefixes = ['Alpha','Beta','Gamma','Delta','Zeta','Tau','Sigma','Nova','Kappa','Omega',
      'Vela','Cygnus','Draco','Lyra','Aquila','Perseus','Orion','Hydra','Corvus','Pyxis'];
    const suffixes = ['Prime','Reach','Deep','Secundus','Minor','Expanse','Crossing','Haven','Nexus','Gate',
      'Hollow','Drift','Frontier','Terminus','Rift','Spire','Anchorage','Bastion','Threshold','Abyss'];`,
  'Fix 10: Expand star system name pool (20x20=400)'
);

// ════════════════════════════════════════════════════
//  BALANCE CHECK
// ════════════════════════════════════════════════════
const after = countBraces(src);
const db = after.b - before.b;
const dp = after.p - before.p;
const dk = after.k - before.k;

console.log(`\n=== Audit 13: NPC Identity + Past Lives ===`);
console.log(`Applied: ${applied}/10, Failed: ${failed}`);
console.log(`Balance delta — B:${db} P:${dp} K:${dk}`);
if (db !== 0 || dp !== 0 || dk !== 0) {
  console.log('❌ BALANCE ERROR — aborting write');
  process.exit(1);
}
if (failed > 0) {
  console.log('❌ SOME FIXES FAILED — aborting write');
  process.exit(1);
}
fs.writeFileSync(FILE, src);
console.log(`✅ File written. Size: ${origLen} → ${src.length} (+${src.length - origLen})`);
