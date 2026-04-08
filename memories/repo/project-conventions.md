# Project Conventions - Old Eden

## Stack
- Runtime: Node.js v24.14.0 (ES Modules, type: module)
- Client: public/index.html (~10088 lines, CRLF, single-file: HTML+CSS+JS)
- 3D Engine: Three.js r163 via CDN importmap (cdn.jsdelivr.net)
- Server: Express 4 + Socket.IO 4 on port 3847 (auto-rotates if busy)
- Blockchain: Polygon, Ethers.js v6, Hardhat
- Contracts: CharacterNFT.sol, OldEdenToken.sol
- Testing: Jest (--experimental-vm-modules)
- QA: Puppeteer via qa_board.cjs (5 specialists)
- OS: Windows, PowerShell (use ; not && to chain)

## Server
- Entry: src/core/index.js (registers 22+ systems, starts Express)
- Config: src/server/HttpServer.js (static files, CSP headers, Socket.IO)
- Port: 3847 default, auto-rotates to 3848+ if busy
- CSP: script-src includes self unsafe-inline wasm-unsafe-eval cdn.jsdelivr.net
- Kill: Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

## File Editing Rules
- NEVER use replace_string_in_file on public/index.html (buffer/disk corruption)
- Use .cjs patch scripts: fs.readFileSync/writeFileSync + safeReplace() + cr() for CRLF
- Template literals in .cjs: use dollar+"{varName}" for dynamic expressions
- All files use CRLF line endings
- VS Code can re-apply cached buffers after git checkout - always verify git status

## QA Workflow
1. Kill stale node processes
2. Start server in background: node src/core/index.js
3. Run: node qa_board.cjs (5/5 specialists must APPROVED)
4. Stamp: QA BOARD 5/5 APPROVED hash:xxx
5. git add -A; git commit -m "..."
6. git status --short - must be clean

## Baselines (2026-04-07)
- public/index.html: 10088 lines, hash 3011ae16caeb6d89
- Braces: 2602/2602 balanced
- Parens: 7611/7611 balanced
- Brackets: 529/529 balanced
- Game systems: 22+ registered in server
- QA Board: 5/5 APPROVED

## Architecture
- src/core/ - GameEngine, EventEmitter, index.js entry
- src/systems/ - 22+ game systems
- src/renderer/ - Three.js renderers
- src/server/ - Express HTTP server + upload router
- src/ai/ - AI Director, asset generator
- src/blockchain/ - NFT manager, Polygon connector
- public/ - Static frontend (index.html)
- contracts/ - Solidity smart contracts
- tests/ - Jest test files

## Branch
- copilot/vscode-mnjwo8jb-b3zd (working branch)
- origin: lindapot-art/oldeden