# Death Star Gunner Mode - Implementation Guide

Complete gunner mode system for Old Eden with railgun weapons, enemy NPCs, and holographic HUD.

## Overview

This implementation provides a first-person "Death Star style" gunner room view with:
- **Swivel chair cockpit** with visible interior geometry
- **Dynamic railgun weapon** with giant nail ammo, charging, and recoil
- **Projectile system** with realistic ballistics and trail rendering
- **Enemy spawn system** with 4 enemy types and wave management
- **Auto-targeting** with visual lock-on indicators
- **Holographic HUD** with ammo, shields, targeting, and readouts
- **Combat integration** with CombatSystem for damage resolution

## Architecture

### Core Systems

1. **ProjectileSystem** (`src/systems/ProjectileSystem.js`)
   - Tracks active projectiles in 3D space
   - Handles collision detection with targets
   - Supports multiple projectile types: RAILGUN, LASER, BALLISTIC, MISSILE
   - Integrates with CombatSystem for damage resolution

2. **EnemySpawnSystem** (`src/systems/EnemySpawnSystem.js`)
   - Spawns hostile NPCs in waves
   - 4 enemy types: Scout, Fighter, Bomber, Interceptor
   - Simple AI: approach player and fire periodically
   - Auto-scales difficulty over time

3. **CombatSystem** (enhanced)
   - Added RAILGUN weapon type
   - Type effectiveness: strong vs all armor types (1.2-1.6x)
   - High critical hit chance (12%)

### Visual Components

1. **RailgunWeapon** (`src/renderer/RailgunWeapon.js`)
   - Procedural 3D railgun mesh
   - Giant nail ammo visible in chamber
   - Charge-up animation (800ms)
   - Recoil with damped spring physics
   - Electromagnetic rail glow effects

2. **GunnerView** (`src/renderer/GunnerView.js`)
   - First-person cockpit view
   - Mouse-look with yaw/pitch limits
   - Swivel chair interior geometry
   - Glass canopy with frame struts
   - Side panels with holographic displays
   - Integrated railgun mount

3. **GunnerHUD** (`src/renderer/GunnerHUD.js`)
   - Canvas-based 2D overlay
   - Dynamic crosshair with targeting rings
   - Ammo counter with color-coded warnings
   - Charge/heat bars
   - Target lock display
   - Shield/hull status
   - Scanline and vignette effects

4. **ProjectileRenderer** (`src/renderer/ProjectileRenderer.js`)
   - Renders projectile trails in 3D
   - Type-specific visuals (nail, beam, bullet, rocket)
   - Dynamic trail segments
   - Glow effects

5. **EnemyRenderer** (`src/renderer/EnemyRenderer.js`)
   - Procedural enemy ship meshes
   - Type-based designs (scout, fighter, bomber, interceptor)
   - Smooth orientation toward velocity
   - Health-based visual feedback

### Integration

**GunnerModeIntegration** (`src/renderer/GunnerModeIntegration.js`)
- Wires up all components
- Handles event routing
- Auto-targeting logic
- HUD updates
- Manages mode switching

## Usage

### Basic Setup

```javascript
import { GunnerModeIntegration } from './src/renderer/GunnerModeIntegration.js';

// In your main game setup:
const gunnerMode = new GunnerModeIntegration({
  THREE,                    // Three.js namespace
  scene,                    // THREE.Scene
  camera,                   // THREE.PerspectiveCamera
  canvas,                   // WebGL canvas element
  hudCanvas,                // 2D canvas for HUD overlay
  gameEngine,               // GameEngine instance
  combatSystem,             // CombatSystem instance
  npcSystem,                // NPCSystem instance
  shipGroup,                // Ship THREE.Group
  turretMount,              // Turret mount point Object3D
});

// In animation loop:
function animate() {
  const deltaMs = clock.getDelta() * 1000;
  
  gunnerMode.update(deltaMs);
  
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// Toggle gunner mode (e.g., on 'F' key press):
document.addEventListener('keydown', (e) => {
  if (e.key === 'f' || e.key === 'F') {
    gunnerMode.toggle();
  }
});
```

### HTML Setup

```html
<!-- WebGL canvas for 3D rendering -->
<canvas id="canvas"></canvas>

<!-- HUD canvas overlay -->
<canvas id="hud-canvas" style="position: fixed; top: 0; left: 0; pointer-events: none; z-index: 100;"></canvas>

<script type="module">
  import * as THREE from 'three';
  import { GunnerModeIntegration } from './src/renderer/GunnerModeIntegration.js';
  
  const canvas = document.getElementById('canvas');
  const hudCanvas = document.getElementById('hud-canvas');
  
  // ... initialize Three.js, scene, camera, etc.
  
  const gunnerMode = new GunnerModeIntegration({
    THREE, scene, camera, canvas, hudCanvas,
    gameEngine, combatSystem, npcSystem,
    shipGroup, turretMount
  });
  
  // ... animation loop
</script>
```

### Manual Component Usage

If you prefer to set up components individually:

```javascript
import { ProjectileSystem } from './src/systems/ProjectileSystem.js';
import { EnemySpawnSystem } from './src/systems/EnemySpawnSystem.js';
import { RailgunWeapon } from './src/renderer/RailgunWeapon.js';
import { GunnerView } from './src/renderer/GunnerView.js';
import { GunnerHUD } from './src/renderer/GunnerHUD.js';
import { ProjectileRenderer } from './src/renderer/ProjectileRenderer.js';
import { EnemyRenderer } from './src/renderer/EnemyRenderer.js';

// 1. Create systems
const projectileSystem = new ProjectileSystem(combatSystem);
gameEngine.registerSystem('projectiles', projectileSystem);

const enemySpawnSystem = new EnemySpawnSystem(npcSystem, combatSystem);
gameEngine.registerSystem('enemies', enemySpawnSystem);

// 2. Create railgun weapon
const railgun = new RailgunWeapon(THREE, {
  barrelLength: 5.0,
  recoilDistance: 0.3,
  chargeTimeMs: 800,
  cooldownTimeMs: 1200,
});

// 3. Create gunner view
const gunnerView = new GunnerView(THREE, camera, canvas, railgun);
gunnerView.attachToShip(shipGroup, turretMount);

// 4. Create HUD
const hud = new GunnerHUD(hudCanvas);

// 5. Create renderers
const projectileRenderer = new ProjectileRenderer(THREE, scene, projectileSystem);
const enemyRenderer = new EnemyRenderer(THREE, scene, enemySpawnSystem);

// 6. Toggle mode
gunnerView.enter();

// 7. Update loop
function update(deltaMs) {
  gunnerView.update(deltaMs);
  railgun.update(deltaMs);
  projectileRenderer.update(deltaMs);
  enemyRenderer.update(deltaMs);
  hud.render(deltaMs);
}

// 8. Fire railgun
canvas.addEventListener('gunner:fire', (e) => {
  projectileSystem.fireProjectile({
    type: 'RAILGUN',
    origin: e.detail.origin,
    direction: e.detail.direction,
    damage: 75,
    shooterId: 'player',
    weaponType: 'railgun',
  });
});
```

## Features

### Railgun Weapon
- **Charge mechanic**: Hold fire to charge (800ms)
- **Recoil**: Weapon slides back with spring physics
- **Ammo**: 24 giant nails per magazine
- **Cooldown**: 1.2 seconds between shots
- **Damage**: 75 base damage, 1.2-1.6x vs armor types

### Enemy Types

| Type | Health | Shield | Speed | Damage | Armor | Special |
|------|--------|--------|-------|--------|-------|---------|
| Scout | 50 | 30 | 35 | 15 | Light | Fast, high evasion |
| Fighter | 100 | 60 | 25 | 25 | Medium | Balanced |
| Bomber | 180 | 40 | 15 | 40 | Heavy | Slow, high damage |
| Interceptor | 70 | 50 | 45 | 20 | Light | Very fast, tracking |

### Auto-Targeting
- Selects nearest enemy within 45° forward cone
- Max targeting range: 300m
- Visual lock-on with HUD feedback
- Distance and health displayed

### HUD Elements
- **Crosshair**: Dynamic with pulse animation
- **Target lock rings**: Appear when enemy locked
- **Ammo counter**: Color-coded (green → yellow → red)
- **Charge bar**: Shows weapon charging progress
- **Shield/Hull bars**: Player status
- **Scanlines**: CRT-style effect
- **Vignette**: Edge darkening

## Events

### Emitted by Systems

```javascript
// Projectile events
engine.events.on('projectile:fired', data => {
  // { projectileId, type, shooterId, origin, direction }
});

engine.events.on('projectile:hit', data => {
  // { projectileId, targetId, position, damage, critical }
});

engine.events.on('projectile:expired', data => {
  // { projectileId, ... }
});

// Enemy events
engine.events.on('enemy:spawned', data => {
  // { enemyId, type, position }
});

engine.events.on('enemy:wave_spawned', data => {
  // { waveNumber, difficulty, count, enemies }
});

engine.events.on('enemy:killed', data => {
  // { enemyId, type, position }
});

engine.events.on('enemy:fired', data => {
  // { enemyId, targetId, weaponType, damage, position }
});
```

### Custom Events (from GunnerView)

```javascript
// Fire event (on canvas element)
canvas.addEventListener('gunner:fire', (e) => {
  const { origin, direction, weaponType } = e.detail;
  // Spawn projectile
});
```

## Customization

### Weapon Parameters

```javascript
const railgun = new RailgunWeapon(THREE, {
  barrelLength: 5.0,        // Length of rail/barrel
  recoilDistance: 0.3,      // Max recoil backward (m)
  recoilSpring: 15,         // Spring stiffness
  recoilDamping: 0.8,       // Damping (0-1)
  chargeTimeMs: 800,        // Time to charge
  cooldownTimeMs: 1200,     // Cooldown between shots
});
```

### Enemy Spawn Settings

```javascript
const enemySpawner = new EnemySpawnSystem(npcSystem, combatSystem, {
  spawnRadius: 150,         // Distance from player to spawn
  maxActiveEnemies: 20,     // Max concurrent enemies
  waveIntervalMs: 30000,    // Time between auto-waves
});
```

### HUD Colors

```javascript
const hud = new GunnerHUD(hudCanvas, {
  primaryColor: '#44aaff',    // Main HUD color
  accentColor: '#00ff88',     // Ammo, readouts
  warningColor: '#ffaa00',    // Low ammo, heat
  dangerColor: '#ff4444',     // Critical status
});
```

## Performance Considerations

- **Projectile limits**: ProjectileSystem automatically removes expired projectiles
- **Enemy limits**: EnemySpawnSystem respects `maxActiveEnemies` setting
- **Trail rendering**: Uses BufferGeometry updates for efficiency
- **HUD rendering**: Canvas-based, low overhead

## Extending the System

### Adding New Weapon Types

1. Add to `CombatSystem.js`:
```javascript
export const WEAPON_TYPE = Object.freeze({
  // ... existing types
  PLASMA_CANNON: 'plasma_cannon',
});

export const TYPE_EFFECTIVENESS = Object.freeze({
  // ... existing types
  [WEAPON_TYPE.PLASMA_CANNON]: {
    [ARMOR_TYPE.NONE]:   1.0,
    // ... effectiveness values
  },
});
```

2. Add to `ProjectileSystem.js`:
```javascript
this.PROJECTILE_TYPES = {
  PLASMA_CANNON: {
    trailLength: 4.0,
    trailColor: 0xff00ff,
    glowIntensity: 1.8,
    hitRadius: 0.25,
    speed: 300,
  },
  // ... other types
};
```

3. Add visual in `ProjectileRenderer.js` (in `_createProjectileMesh`).

### Adding New Enemy Types

Edit `EnemySpawnSystem.js`:

```javascript
this.ENEMY_TYPES = {
  CRUISER: {
    name: 'Cruiser',
    health: 300,
    shield: 100,
    armorType: ARMOR_TYPE.HEAVY,
    weaponType: WEAPON_TYPE.MISSILE,
    damage: 50,
    speed: 10,
    evasion: 0,
    accuracy: 90,
    scale: 2.0,
    color: 0x666688,
  },
  // ... other types
};
```

Then add mesh in `EnemyRenderer.js` (in `_createEnemyMesh`).

## Troubleshooting

**Issue**: Railgun doesn't fire
- Check that `railgun.isReady` is true
- Verify charge time has elapsed
- Check ammo count

**Issue**: No enemies spawn
- Verify `enemySpawnSystem` is registered with GameEngine
- Check `maxActiveEnemies` limit
- Call `enemySpawnSystem.spawnWave()` manually

**Issue**: HUD not visible
- Ensure `hudCanvas` display is set to 'block'
- Check z-index is higher than WebGL canvas
- Verify HUD canvas is sized correctly

**Issue**: Projectiles don't hit enemies
- Register enemies as targets: `projectileSystem.registerTarget()`
- Check collision radius settings
- Verify enemy positions are updating

## Credits

Implementation follows the "Death Star gunner booth" aesthetic from Star Wars, adapted for Old Eden's grim, modern space combat setting.

All systems integrate seamlessly with Old Eden's existing CombatSystem, NPCSystem, and GameEngine architecture.
