/**
 * QA HASH VERIFIER — Checks that the current index.html matches the last QA-passed hash.
 * 
 * Usage: node qa_verify_hash.cjs
 * Exit 0 = hash matches (QA is still valid)
 * Exit 1 = hash mismatch (code changed since QA) or no hash file
 */
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const HTML_PATH = path.join(__dirname, 'public', 'index.html');
const HASH_PATH = path.join(__dirname, 'qa_proxy_hash.txt');

const RED = '\x1b[31m', GREEN = '\x1b[32m', RESET = '\x1b[0m', BOLD = '\x1b[1m';

if (!fs.existsSync(HASH_PATH)) {
  console.log(`${RED}${BOLD}✘ NO QA HASH FILE${RESET} — QA has never been run. Run: node qa_proxy_live.cjs`);
  process.exit(1);
}

const src = fs.readFileSync(HTML_PATH);
const currentHash = crypto.createHash('sha256').update(src).digest('hex').slice(0, 16);
const [savedHash, savedTime] = fs.readFileSync(HASH_PATH, 'utf8').trim().split('\n');

if (currentHash === savedHash) {
  console.log(`${GREEN}${BOLD}✔ QA HASH VALID${RESET} — code unchanged since QA at ${savedTime}`);
  process.exit(0);
} else {
  console.log(`${RED}${BOLD}✘ QA HASH MISMATCH${RESET}`);
  console.log(`  Current: ${currentHash}`);
  console.log(`  QA'd:    ${savedHash} (at ${savedTime})`);
  console.log(`  ${RED}Code has changed since last QA. Re-run: node qa_proxy_live.cjs${RESET}`);
  process.exit(1);
}
