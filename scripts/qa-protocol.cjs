const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawnSync, spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const port = Number(process.env.QA_PORT || process.env.PORT || 3847);

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

function runNodeCheck(filePath) {
  const result = spawnSync(process.execPath, ['--check', filePath], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`Syntax check failed: ${path.relative(repoRoot, filePath)}`);
  }
}

function checkIndexModuleScript() {
  const htmlPath = path.join(repoRoot, 'public', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const start = html.indexOf('<script type="module">');
  const end = html.lastIndexOf('</script>');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('Could not locate module script block in public/index.html');
  }
  const script = html.slice(start + 22, end);
  const tempFile = path.join(repoRoot, '_tmp_qa_index_check.mjs');
  fs.writeFileSync(tempFile, script);
  try {
    runNodeCheck(tempFile);
  } finally {
    fs.rmSync(tempFile, { force: true });
  }
}

function httpGet(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', error => resolve({ status: 0, error: error.message, body: '' }));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve({ status: 0, error: 'timeout', body: '' });
    });
  });
}

async function waitForServer(url, timeoutMs) {
  const startedAt = Date.now();
  while ((Date.now() - startedAt) < timeoutMs) {
    const response = await httpGet(url);
    if (response.status === 200) return true;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

async function ensureServerRunning() {
  const url = `http://localhost:${port}/`;
  const existing = await httpGet(url);
  if (existing.status === 200) {
    console.log(`Server already running on port ${port}`);
    return { child: null, startedHere: false };
  }

  console.log(`Starting server on port ${port} for QA...`);
  const child = spawn(process.execPath, ['src/core/index.js'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  const ready = await waitForServer(url, 30000);
  if (!ready) {
    child.kill();
    throw new Error(`Server did not become ready on port ${port}`);
  }
  return { child, startedHere: true };
}

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

(async () => {
  console.log('FAILSAFE QA PROTOCOL - NODE');
  console.log('===========================');

  console.log('\nPHASE 1: PRE-FLIGHT');
  console.log('Memory repo directory:', path.join(repoRoot, 'memories', 'repo'));

  console.log('\nPHASE 2: SYNTAX + GUARDIAN');
  const srcFiles = walkFiles(path.join(repoRoot, 'src'), filePath => filePath.endsWith('.js'));
  for (const filePath of srcFiles) runNodeCheck(filePath);
  runNodeCheck(path.join(repoRoot, 'gameplay_test_gpu.cjs'));
  runNodeCheck(path.join(repoRoot, 'scripts', 'qa-image-audit.cjs'));
  runNodeCheck(path.join(repoRoot, 'scripts', 'guardian-snapshot.cjs'));
  runNodeCheck(path.join(repoRoot, 'scripts', 'qa-protocol.cjs'));
  checkIndexModuleScript();
  console.log(`Syntax checks passed for ${srcFiles.length} src files and QA helpers`);
  runCommand(process.execPath, ['scripts/guardian-snapshot.cjs', '--compare']);

  console.log('\nPHASE 3: LIVE SERVER');
  const server = await ensureServerRunning();
  const home = await httpGet(`http://localhost:${port}/`);
  if (home.status !== 200) throw new Error(`HTTP check failed on port ${port}`);
  console.log(`HTTP ${home.status} from localhost:${port}`);

  console.log('\nPHASE 4: FULL QA BOARD');
  runCommand(process.execPath, ['qa_board.cjs']);

  if (server.startedHere && server.child) {
    server.child.kill();
  }

  console.log('\nQA protocol complete');
})().catch((error) => {
  console.error('\nQA protocol failed:', error.message);
  process.exit(1);
});