# Main JavaScript File Map - Old Eden
# Quick reference for core JS architecture

## Entry Points

### src/core/index.js
- **Purpose:** Application entry point
- **Exports:** None (executes GameEngine)
- **Dependencies:** GameEngine.js

### src/core/GameEngine.js
- **Purpose:** Main game engine orchestrator
- **Key Methods:**
  - `initialize()` - Setup game systems
  - `start()` - Begin game loop
  - `update(deltaTime)` - Frame update logic
- **Dependencies:** Scene, Loop, State management

## Rendering System

### src/renderer/Scene.js
- **Purpose:** Three.js scene management
- **Key Methods:**
  - `setupScene()` - Initialize Three.js scene
  - `addObject(object)` - Add 3D object to scene
  - `render()` - Render frame
- **Dependencies:** Three.js

### src/renderer/PlaceholderShip.js
- **Purpose:** Vector-based ship model builder
- **Key Methods:**
  - `buildShip()` - Create ship geometry
  - `addTurretMount()` - Add gunner mode turret
- **Dependencies:** Three.js

### src/renderer/GunnerView.js
- **Purpose:** First-person gunner mode camera
- **Key Methods:**
  - `enableGunnerMode()` - Switch to FPS view
  - `disableGunnerMode()` - Return to normal view
  - `handleMouseLook(event)` - Pointer-lock mouse control
- **Dependencies:** Three.js, PlaceholderShip
- **Controls:** F key toggle, pointer-lock

## Asset Management

### src/assets/GlbProcessor.js
- **Purpose:** GLB/glTF 3D model processing
- **Library:** @gltf-transform/core v4.3.0
- **Key Methods:**
  - `processGlb(file)` - Load and optimize GLB
  - `applyTransforms()` - Apply transformations
- **Supported Formats:** .glb, .gltf, .fbx (via Git LFS)

## Blockchain Integration

### src/blockchain/Web3Manager.js (assumed)
- **Purpose:** Ethereum/Polygon interaction
- **Library:** ethers.js v6.11.1
- **Network:** Polygon
- **Key Features:**
  - Wallet connection
  - Contract calls
  - NFT minting/trading

## Client-Side Scripts

### public/js/main.js (if exists)
- **Purpose:** Browser-side game initialization
- **DOM Events:** UI button handlers
- **Integration:** Loads and initializes WebGL context

## Event Listener Patterns

### Common Patterns
```javascript
// Keyboard input
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);

// Mouse input (gunner mode)
canvas.addEventListener('click', requestPointerLock);
document.addEventListener('pointerlockchange', onPointerLockChange);

// Window events
window.addEventListener('resize', onWindowResize);

// UI buttons
navButton.addEventListener('click', handleNavigation);
```

## Function Naming Conventions

### Initialization
- `initialize*()` - Setup system
- `setup*()` - Configure component
- `create*()` - Factory functions

### Updates
- `update(deltaTime)` - Frame-based update
- `tick()` - Fixed-time update
- `render()` - Draw frame

### Handlers
- `handle*()` - Event handlers
- `on*()` - Event callbacks
- `process*()` - Data processing

## Module Dependencies Graph

```
index.js
  └── GameEngine.js
      ├── Scene.js
      │   ├── PlaceholderShip.js
      │   └── GunnerView.js
      ├── Loop.js
      ├── State.js
      └── AssetManager.js
          └── GlbProcessor.js
```

## Critical Counts (for Guardian)

**Baseline Metrics** (update as needed):
- Exported functions in /src: ~50-100
- Event listeners total: ~20-40
- Three.js scene objects: ~10-30
- Active game systems: ~8-12

## Performance Hotspots

1. **Render Loop** - Must maintain 60 FPS
2. **Asset Loading** - Async, lazy load when possible
3. **Network Sync** - Throttle updates to ~20 Hz
4. **Blockchain Calls** - Cache aggressively

## Testing

### Test Coverage
- Test files: `tests/*.test.js`
- Framework: Jest with ES modules
- Command: `npm test`
- Suites: 14-17 test suites, 350-400 tests

### Key Test Patterns
```javascript
// ES module import in tests
import { GameEngine } from '../src/core/GameEngine.js';

// Async tests
test('should load assets', async () => {
  const assets = await assetManager.load();
  expect(assets).toBeDefined();
});
```

---

**Version:** 1.0.0  
**Last Updated:** 2026-04-04  
**Note:** Update this file when major architectural changes occur
