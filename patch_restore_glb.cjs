// patch_restore_glb.cjs — Restore real GLB loading with vector fallback
// Also restore batched preloadEnemyModel()
const fs = require('fs');
const FILE = 'public/index.html';

let src = fs.readFileSync(FILE, 'utf8');
const origLen = src.length;

function cr(s) { return s.replace(/\r?\n/g, '\r\n'); }

function safeReplace(haystack, needle, replacement, label) {
  const idx = haystack.indexOf(needle);
  if (idx === -1) { console.error('FAIL: Could not find "' + label + '" — aborting'); process.exit(1); }
  const secondIdx = haystack.indexOf(needle, idx + needle.length);
  if (secondIdx !== -1) { console.error('FAIL: "' + label + '" found multiple times — aborting'); process.exit(1); }
  return haystack.substring(0, idx) + replacement + haystack.substring(idx + needle.length);
}

// ============================================================
// FIX 1: Restore loadGLBModel to use gltfLoader.load() with vector fallback
// ============================================================
const oldLoadGLB = [
  'function loadGLBModel(key) {',
  '  return new Promise((resolve, reject) => {',
  '    if (state.loadedModels[key]) { resolve(state.loadedModels[key]); return; }',
  '    const asset = GLB_ASSETS[key];',
  "    if (!asset) { reject(new Error('Unknown: ' + key)); return; }",
  '    const model = _buildVectorModel(key, asset);',
  '    model.scale.setScalar(asset.scale);',
  '    state.loadedModels[key] = model;',
  '    resolve(model);',
  '  });',
  '}'
].join('\r\n');

const newLoadGLB = [
  'function loadGLBModel(key) {',
  '  return new Promise((resolve, reject) => {',
  '    if (state.loadedModels[key]) { resolve(state.loadedModels[key]); return; }',
  '    const asset = GLB_ASSETS[key];',
  "    if (!asset) { reject(new Error('Unknown asset: ' + key)); return; }",
  '    gltfLoader.load(asset.path,',
  '      (gltf) => {',
  '        const model = gltf.scene;',
  '        model.scale.setScalar(asset.scale);',
  '        model.traverse(child => {',
  '          if (child.isMesh) {',
  '            child.frustumCulled = true;',
  "            if (child.material) child.material.precision = 'mediump';",
  '          }',
  '        });',
  '        state.loadedModels[key] = model;',
  '        resolve(model);',
  '      },',
  '      undefined,',
  '      (err) => {',
  "        console.warn('[GLB] Failed to load', key, '— using vector fallback:', err);",
  '        const model = _buildVectorModel(key, asset);',
  '        model.scale.setScalar(asset.scale);',
  '        state.loadedModels[key] = model;',
  '        resolve(model);',
  '      }',
  '    );',
  '  });',
  '}'
].join('\r\n');

src = safeReplace(src, oldLoadGLB, newLoadGLB, 'loadGLBModel-vector');

// ============================================================
// FIX 2: Restore preloadEnemyModel to batched loading
// ============================================================
const oldPreload = [
  'async function preloadEnemyModel() {',
  "  for (const key of COMBAT_MODELS) { try { await loadGLBModel(key); } catch(e) {} }",
  '}'
].join('\r\n');

const newPreload = [
  'async function preloadEnemyModel() {',
  "  // Load iron_sentinel first (most common) — blocks",
  "  try { await loadGLBModel('iron_sentinel'); } catch(e) { /* fallback to box */ }",
  '  // Stagger remaining models: load 2 at a time with delay to avoid frame spikes',
  '  _combatModelIdx = 0;',
  '  _loadNextCombatBatch();',
  '}'
].join('\r\n');

src = safeReplace(src, oldPreload, newPreload, 'preloadEnemyModel-sequential');

// ============================================================
// WRITE & VERIFY
// ============================================================
fs.writeFileSync(FILE, src, 'utf8');
const newLen = src.length;
const lineCount = src.split('\n').length;
console.log('OK: Patched ' + FILE);
console.log('  Size: ' + origLen + ' -> ' + newLen + ' (' + (newLen - origLen) + ' chars)');
console.log('  Lines: ' + lineCount);
console.log('  FIX 1: loadGLBModel restored to gltfLoader.load() with vector fallback');
console.log('  FIX 2: preloadEnemyModel restored to batched loading');
