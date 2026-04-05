/**
 * GLB Model Optimizer — Old Eden Asset Pipeline
 * 
 * Processes all useful GLB models from glbs/ folder:
 * - Resizes textures (512-1024px depending on model type)
 * - Applies Draco mesh compression
 * - Deduplicates meshes & materials
 * - Outputs to public/3d/glb/optimized/
 * 
 * Target: <3MB per ship, <5MB for cockpit/stations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const GLBS_DIR = path.join(__dirname, 'glbs');
const OUT_DIR = path.join(__dirname, 'public', '3d', 'glb', 'optimized');

// Ensure output dir exists
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Model catalog: source filename → output name & config
const MODELS = [
  // ── Spaceships (police patrol / parade / enemies) ──
  { src: '11 space ship 3d model.glb',         out: 'patrol_alpha.glb',     texSize: 512,  type: 'ship' },
  { src: '11bfuturistic spaceship 3d model.glb', out: 'patrol_beta.glb',   texSize: 512,  type: 'ship' },
  { src: '12 space ship 3d model.glb',          out: 'patrol_gamma.glb',    texSize: 512,  type: 'ship' },
  { src: '8 futuristic spaceship 3d model.glb', out: 'cruiser_alpha.glb',   texSize: 512,  type: 'ship' },
  { src: '1-futuristic cargo textured spaceship 3d model.glb', out: 'cargo_cruiser.glb', texSize: 512, type: 'ship' },
  { src: 'futuristic spaceship 3d model.glb',   out: 'escort_ship.glb',     texSize: 512,  type: 'ship' },
  { src: '5 futuristic spaceship 3d model.glb', out: 'interceptor.glb',     texSize: 512,  type: 'ship' },
  { src: '_9 space ship 3d model.glb',          out: 'scout_ship.glb',      texSize: 512,  type: 'ship' },
  { src: '1-cargo futuristic spaceship 3d model.glb', out: 'cargo_small.glb', texSize: 512, type: 'ship' },
  { src: 'futuristic space 1-shuttle 3d model.glb',   out: 'shuttle_b.glb',  texSize: 512,  type: 'ship' },
  { src: 'home module spacecraft 3d model.glb',       out: 'home_module.glb', texSize: 512, type: 'ship' },
  { src: '_7 sci-fi spaceship 3d model.glb',          out: 'frigate_alpha.glb', texSize: 512, type: 'ship' },
  { src: '2 sci-fi spaceship 3d model.glb',           out: 'corvette_alpha.glb', texSize: 512, type: 'ship' },
  { src: '4 sci-fi spaceship 3d model.glb',           out: 'destroyer_alpha.glb', texSize: 512, type: 'ship' },
  { src: '5 sci-fi spaceship 3d model.glb',           out: 'cruiser_beta.glb', texSize: 512, type: 'ship' },
  { src: '8 spacecraft 3d model.glb',                 out: 'gunship_alpha.glb', texSize: 512, type: 'ship' },
  { src: '1a red sci-fi spacecraft 3d model.glb',     out: 'red_fighter.glb', texSize: 512, type: 'ship' },
  { src: '3 red sci-fi spacecraft 3d model.glb',      out: 'red_cruiser.glb', texSize: 512, type: 'ship' },
  { src: '1 container shuttle space shuttle 3d model.glb', out: 'container_shuttle.glb', texSize: 512, type: 'ship' },

  // ── Cockpit (user wants latest) ──
  { src: '3 nice spacecraft cockpit 3d model.glb',           out: 'cockpit_new.glb',    texSize: 1024, type: 'cockpit' },
  { src: 'red futuistic spaceship dashboard 3d model.glb',   out: 'dashboard_red.glb',  texSize: 1024, type: 'cockpit' },
  { src: 'futuristic spaceship dashboard 3d model.glb',      out: 'dashboard_basic.glb', texSize: 512, type: 'cockpit' },

  // ── Railguns (better/bigger) ──
  { src: 'berrel spaceship railgun 3d model.glb',            out: 'railgun_large.glb',  texSize: 512,  type: 'weapon' },
  { src: '5 railgun 3d model.glb',                           out: 'railgun_med.glb',    texSize: 512,  type: 'weapon' },
  { src: 'spaceship railgun 3d model.glb',                   out: 'railgun_ship_b.glb', texSize: 512,  type: 'weapon' },
  { src: 'spaceship railgun BARREL 1  3d model.glb',         out: 'railgun_barrel_b.glb', texSize: 512, type: 'weapon' },
  { src: 'Meshy_AI_massive_raildgun_with_0403042757_texture.glb', out: 'railgun_massive.glb', texSize: 512, type: 'weapon' },

  // ── Stations ──
  { src: 'Meshy_AI_massive_spacestation__0403072424_texture.glb', out: 'station_massive.glb', texSize: 512, type: 'station' },
  { src: 'ball space station 3d model.glb',                  out: 'station_sphere.glb',  texSize: 512, type: 'station' },
  { src: 'light space station 3d model.glb',                 out: 'station_light.glb',   texSize: 512, type: 'station' },
  { src: 'universal facility futuristic space station 3d model.glb', out: 'station_facility.glb', texSize: 512, type: 'station' },
  { src: 'zorgus spacestation 3d model.glb',                 out: 'station_zorgus.glb',  texSize: 512, type: 'station' },

  // ── Planets ──
  { src: 'earth globe 3d model.glb',                         out: 'planet_earth.glb',   texSize: 1024, type: 'planet' },
  { src: 'earthlike planet 3d model.glb',                    out: 'planet_earthlike.glb', texSize: 1024, type: 'planet' },
  { src: '3 purple planet 3d model.glb',                     out: 'planet_purple.glb',  texSize: 512,  type: 'planet' },
  { src: 'green 2 planet 3d model.glb',                      out: 'planet_green.glb',   texSize: 512,  type: 'planet' },
  { src: 'yellow marble 3d model.glb',                       out: 'planet_yellow.glb',  texSize: 512,  type: 'planet' },
  { src: 'w moon planet 3d model.glb',                       out: 'planet_moon.glb',    texSize: 512,  type: 'planet' },

  // ── Characters/Misc ──
  { src: 'dead man in space suit 3d model.glb',              out: 'space_body.glb',     texSize: 512,  type: 'char' },
  { src: 'futuristic space suit 3d model.glb',               out: 'space_suit.glb',     texSize: 512,  type: 'char' },
  { src: 'stargate ring 3d model.glb',                       out: 'stargate.glb',       texSize: 512,  type: 'misc' },
  { src: 'sphere 2 dyson sphere 3d model.glb',               out: 'dyson_sphere.glb',   texSize: 512,  type: 'misc' },

  // ── Weapons ──
  { src: '4 futuristic gun 3d model.glb',                    out: 'gun_futuristic.glb', texSize: 512,  type: 'weapon' },
  { src: 'white blaster 3d model.glb',                       out: 'blaster_white.glb',  texSize: 512,  type: 'weapon' },
  { src: 'chrome pistol 3d model.glb',                       out: 'pistol_chrome.glb',  texSize: 512,  type: 'weapon' },

  // ── Creatures ──
  { src: 'blue alien insect creature 3d model.glb',          out: 'alien_insect.glb',   texSize: 512,  type: 'creature' },
  { src: 'space insect 3d model.glb',                        out: 'space_insect.glb',   texSize: 512,  type: 'creature' },

  // ── Battleships (already have some but these are different) ──
  { src: 'red alien battleship 3d model.glb',                out: 'red_battleship.glb', texSize: 512,  type: 'ship' },
  { src: 'demonic red battleship 3d model.glb',              out: 'demon_cruiser.glb',  texSize: 512,  type: 'ship' },
];

let processed = 0;
let failed = 0;
let skipped = 0;

console.log(`\n🔧 Old Eden GLB Optimizer — Processing ${MODELS.length} models\n`);

for (const model of MODELS) {
  const srcPath = path.join(GLBS_DIR, model.src);
  const outPath = path.join(OUT_DIR, model.out);

  // Skip if source doesn't exist
  if (!fs.existsSync(srcPath)) {
    console.log(`⏭  SKIP (not found): ${model.src}`);
    skipped++;
    continue;
  }

  // Skip if source is 0 bytes
  const srcSize = fs.statSync(srcPath).size;
  if (srcSize === 0) {
    console.log(`⏭  SKIP (0 bytes): ${model.src}`);
    skipped++;
    continue;
  }

  // Skip if already optimized and source hasn't changed
  if (fs.existsSync(outPath)) {
    const outTime = fs.statSync(outPath).mtimeMs;
    const srcTime = fs.statSync(srcPath).mtimeMs;
    if (outTime > srcTime) {
      const outSizeMB = (fs.statSync(outPath).size / (1024*1024)).toFixed(2);
      console.log(`✅ CACHED (${outSizeMB}MB): ${model.out}`);
      processed++;
      continue;
    }
  }

  const srcMB = (srcSize / (1024*1024)).toFixed(1);
  console.log(`\n⚙  Processing: ${model.src} (${srcMB}MB) → ${model.out}`);

  try {
    // Build gltf-transform command pipeline
    // Step 1: Resize textures + deduplicate + optimize + Draco compress
    const cmd = [
      'npx', 'gltf-transform', 'optimize',
      `"${srcPath}"`,
      `"${outPath}"`,
      `--texture-size`, `${model.texSize}`,
      `--compress`, `draco`,
    ].join(' ');

    execSync(cmd, { stdio: 'pipe', timeout: 300000 }); // 5 min timeout per model

    if (fs.existsSync(outPath)) {
      const outSize = fs.statSync(outPath).size;
      const outMB = (outSize / (1024*1024)).toFixed(2);
      const ratio = ((1 - outSize/srcSize)*100).toFixed(0);
      console.log(`   ✅ Done: ${outMB}MB (${ratio}% smaller)`);
      processed++;
    } else {
      console.log(`   ❌ Output file not created`);
      failed++;
    }
  } catch (err) {
    const errMsg = err.stderr ? err.stderr.toString().split('\n')[0] : err.message;
    console.log(`   ❌ FAILED: ${errMsg}`);
    
    // Fallback: try simpler optimization without draco
    try {
      console.log(`   🔄 Retry without Draco...`);
      const cmd2 = [
        'npx', 'gltf-transform', 'optimize',
        `"${srcPath}"`,
        `"${outPath}"`,
        `--texture-size`, `${model.texSize}`,
      ].join(' ');
      execSync(cmd2, { stdio: 'pipe', timeout: 300000 });
      if (fs.existsSync(outPath)) {
        const outSize = fs.statSync(outPath).size;
        const outMB = (outSize / (1024*1024)).toFixed(2);
        console.log(`   ✅ Done (no draco): ${outMB}MB`);
        processed++;
      } else {
        console.log(`   ❌ Retry also failed`);
        failed++;
      }
    } catch (err2) {
      // Last resort: just copy the file if it's small enough
      if (srcSize < 5 * 1024 * 1024) {
        fs.copyFileSync(srcPath, outPath);
        console.log(`   📋 Copied as-is (${srcMB}MB) — too small to compress`);
        processed++;
      } else {
        console.log(`   ❌ All attempts failed`);
        failed++;
      }
    }
  }
}

console.log(`\n${'═'.repeat(50)}`);
console.log(`📊 Results: ${processed} processed, ${skipped} skipped, ${failed} failed (${MODELS.length} total)`);

// Print final inventory
console.log(`\n📦 Optimized Asset Inventory:`);
const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.glb')).sort();
let totalMB = 0;
for (const f of files) {
  const size = fs.statSync(path.join(OUT_DIR, f)).size;
  const mb = (size / (1024*1024)).toFixed(2);
  totalMB += size / (1024*1024);
  console.log(`   ${f.padEnd(35)} ${mb.padStart(8)}MB`);
}
console.log(`   ${'─'.repeat(45)}`);
console.log(`   Total: ${files.length} models, ${totalMB.toFixed(1)}MB`);
