# Project Conventions - Old Eden
# Coding standards, patterns, and best practices

## Code Style

### JavaScript (ES Modules)
- **Module System:** ES modules (`import`/`export`)
- **File Extension:** `.js` (with `"type": "module"` in package.json)
- **Naming:**
  - Classes: PascalCase (`GameEngine`, `PlayerController`)
  - Functions/variables: camelCase (`initializeGame`, `playerHealth`)
  - Constants: UPPER_SNAKE_CASE (`MAX_PLAYERS`, `DEFAULT_SPEED`)
- **Exports:** Use named exports for utilities, default for main classes

### Testing
- **Framework:** Jest with `--experimental-vm-modules` flag
- **Command:** `npm test`
- **Pattern:** `*.test.js` files in `/tests` directory
- **Must Install:** Run `npm install` before tests (node_modules not in repo)

### Three.js & Rendering
- **Library:** Three.js v0.163.0
- **Structure:** Scene → Renderer → Camera → Objects
- **Patterns:**
  - Use `PlaceholderShip.js` for vector-based models
  - Use `GunnerView.js` for first-person camera controls
  - Pointer-lock for mouse look in gunner mode

### Asset Pipeline
- **3D Assets:** GLB/glTF format
- **Processing:** @gltf-transform/core + extensions (v4.3.0)
- **Processor:** `src/assets/GlbProcessor.js`
- **Git LFS:** Tracks `*.glb`, `*.gltf`, `*.fbx`
- **Location:** `/public/3d/glb/`

## Architecture Patterns

### Game Engine
- **Entry Point:** `src/core/GameEngine.js`
- **Start Command:** `npm start` (or `node src/core/index.js`)
- **Hot Reload:** `npm run dev` (--watch flag)

### Blockchain Integration
- **Network:** Polygon
- **Library:** ethers.js v6.11.1
- **Contracts:** Hardhat framework
- **Build:** `npm run build:contracts`
- **Deploy:** `npm run deploy:contracts`

### Server & Multiplayer
- **Framework:** Express.js
- **WebSockets:** Socket.io v4.7.4
- **Port:** 3000 (default) or 8080 (development)

## File Organization

```
/src
  /core          - Game engine, loop, state management
  /renderer      - Three.js rendering, camera, scene
  /assets        - Asset loading, processing
  /blockchain    - Web3, contract interactions
  /multiplayer   - Networking, sync, lobby
  
/public
  /js            - Client-side scripts
  /css           - Stylesheets
  /3d/glb        - 3D models (Git LFS)
  index.html     - Main entry point
  
/tests
  *.test.js      - Jest test suites
  
/contracts
  *.sol          - Solidity smart contracts
  
/docs
  *.md           - Documentation
```

## Critical Files (Guardian Monitored)

### public/index.html
- **Markers:** `<section>` tags, `nav-btn` classes
- **Structure:** Must maintain all navigation sections
- **Events:** Click handlers for UI buttons

### public/css/style.css
- **Tracked:** Total CSS rule count `{`
- **Critical:** Game UI styling, responsive layout

### src/core/*.js
- **Tracked:** Exported functions, event listeners
- **Critical:** Core game loop, state management

## Development Workflow

### Before Making Changes
1. Check `/memories/repo/` for context
2. Run `bash scripts/guardian-snapshot.sh --baseline`
3. Identify exact files and lines to modify

### During Changes
1. Make small, atomic edits
2. Run `node --check` on modified JS files
3. Test incrementally

### After Changes
1. Run `bash scripts/guardian-snapshot.sh --compare`
2. Run `bash scripts/qa-protocol.sh`
3. Verify with `git diff --stat HEAD`
4. Commit with clear message

## QA Requirements

### Mandatory Checks
- ✅ All JS files pass `node --check`
- ✅ Guardian snapshot shows no regressions
- ✅ Proxy QA passes (if server running)
- ✅ No syntax errors in committed code

### Optional (but recommended)
- Run full test suite: `npm test`
- Manual testing in browser
- Check console for errors

## Special Features

### Gunner Mode
- **Toggle:** F key
- **Implementation:** `src/renderer/GunnerView.js`
- **Ship Model:** `src/renderer/PlaceholderShip.js`
- **Controls:** Pointer-lock mouse look, WASD movement

### Deployment
- **Staging:** GitHub Actions workflow (`.github/workflows/deploy-staging.yml`)
- **Branches:** `staging` or `develop` trigger auto-deploy
- **Platform:** GitHub Pages (works with private repos)

### Quick Start Scripts
- **Windows:** `start.bat` (auto-install dependencies, start on port 3000)
- **Linux/Mac:** `start.sh` (same functionality)

## Immutable Rules

1. **Ukraine Donation:** 10% split is unchangeable
2. **Free-to-Play:** Must always have F2P path
3. **Monetization:** Cosmetic/convenience only (no pay-to-win)
4. **No External Edits:** Never use sed/awk/Python to edit source files
5. **ES Modules:** All code uses ES module syntax

## Performance Considerations

- Three.js scenes should maintain 60 FPS
- Asset loading should be async/lazy where possible
- Network sync optimized for <100ms latency
- Blockchain calls cached when appropriate

---

**Version:** 1.0.0  
**Last Updated:** 2026-04-04  
**Maintained By:** AI Agent System
