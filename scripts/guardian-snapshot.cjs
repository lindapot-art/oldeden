const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const snapshotDir = path.join(repoRoot, 'memories', 'repo');
const baselineFile = path.join(snapshotDir, 'guardian-baseline.json');
const currentFile = path.join(snapshotDir, 'guardian-current.json');

fs.mkdirSync(snapshotDir, { recursive: true });

function countInFile(filePath, matcher) {
  if (!fs.existsSync(filePath)) return 0;
  const text = fs.readFileSync(filePath, 'utf8');
  const matches = text.match(matcher);
  return matches ? matches.length : 0;
}

function walkFiles(dirPath, predicate) {
  if (!fs.existsSync(dirPath)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath, predicate));
      continue;
    }
    if (predicate(fullPath)) results.push(fullPath);
  }
  return results;
}

function countMatchesInFiles(files, matcher) {
  return files.reduce((total, filePath) => total + countInFile(filePath, matcher), 0);
}

function buildSnapshot() {
  const srcDir = path.join(repoRoot, 'src');
  const testsDir = path.join(repoRoot, 'tests');
  const publicIndex = path.join(repoRoot, 'public', 'index.html');
  const publicJsDir = path.join(repoRoot, 'public', 'js');
  const cssFile = path.join(repoRoot, 'public', 'css', 'style.css');
  const srcJsFiles = walkFiles(srcDir, filePath => filePath.endsWith('.js'));
  const publicJsFiles = walkFiles(publicJsDir, filePath => filePath.endsWith('.js'));
  const testFiles = walkFiles(testsDir, filePath => filePath.endsWith('.test.js'));

  return {
    timestamp: new Date().toISOString(),
    metrics: {
      html_sections: countInFile(publicIndex, /<section/g),
      nav_buttons: countInFile(publicIndex, /nav-btn/g),
      event_listeners: countMatchesInFiles(srcJsFiles, /addEventListener/g) + countMatchesInFiles(publicJsFiles, /addEventListener/g),
      exported_functions: countMatchesInFiles(srcJsFiles, /^export (function|const|class)/gm),
      css_rules: countInFile(cssFile, /{/g),
      js_files: srcJsFiles.length,
      test_files: testFiles.length,
    },
  };
}

function writeSnapshot(filePath, snapshot) {
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2) + '\n');
}

function printSnapshot(label, snapshot) {
  console.log(label + ':');
  console.log(JSON.stringify(snapshot, null, 2));
}

function compareSnapshots() {
  if (!fs.existsSync(baselineFile)) {
    console.error('No baseline found. Run guardian:baseline first.');
    process.exit(1);
  }

  const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
  const current = buildSnapshot();
  writeSnapshot(currentFile, current);

  printSnapshot('BASELINE', baseline);
  printSnapshot('CURRENT', current);

  const regressions = [];
  if (current.metrics.html_sections < baseline.metrics.html_sections) {
    regressions.push(`HTML sections decreased from ${baseline.metrics.html_sections} to ${current.metrics.html_sections}`);
  }
  if (current.metrics.nav_buttons < baseline.metrics.nav_buttons) {
    regressions.push(`Nav buttons decreased from ${baseline.metrics.nav_buttons} to ${current.metrics.nav_buttons}`);
  }

  if (regressions.length > 0) {
    for (const regression of regressions) console.error('REGRESSION DETECTED:', regression);
    process.exit(1);
  }

  console.log('No regressions detected');
}

const mode = process.argv[2] || 'snapshot';

if (mode === '--baseline') {
  const snapshot = buildSnapshot();
  writeSnapshot(baselineFile, snapshot);
  console.log('Baseline saved to', baselineFile);
  printSnapshot('BASELINE', snapshot);
} else if (mode === '--compare') {
  compareSnapshots();
} else if (mode === '--report') {
  console.log('Guardian Report');
  console.log('==================');
  if (fs.existsSync(baselineFile)) printSnapshot('BASELINE', JSON.parse(fs.readFileSync(baselineFile, 'utf8')));
  if (fs.existsSync(currentFile)) printSnapshot('CURRENT', JSON.parse(fs.readFileSync(currentFile, 'utf8')));
} else {
  console.log(JSON.stringify(buildSnapshot(), null, 2));
}