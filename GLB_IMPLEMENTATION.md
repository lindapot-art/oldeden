# GLB Optimization & Faction System Implementation

## Overview

This implementation adds optimized 3D GLB models, the Garrisons faction (rebels from late 21st century), dual weapon system (Railgun + Vector Gun), and NPC faction fleets to Old Eden.

## What Was Built

### 1. GLB Asset Optimization

**Script**: `scripts/optimize-glbs.sh`

Optimizes large GLB files using `@gltf-transform/cli`:
- **Input**: 12 files @ 638MB total
- **Output**: 12 optimized files @ 22MB total (97% reduction!)
- **Techniques**: Draco compression, mesh simplification, texture compression, deduplication

**Optimized Models**:
- `garrisons_habitat.glb` - Cyborg-style space station (11MB)
- `ship_sentinel.glb` / `ship_sentinel_variant.glb` - Fighter class (2.6MB each)
- `ship_titan.glb` / `ship_titan_variant.glb` - Heavy cruiser (3.6MB each)
- `ship_freighter.glb` - Cargo vessel (4.5MB)
- `railgun_weapon.glb` / `railgun_heavy.glb` - Weapon models (3-8MB)
- `spacestation_01/02.glb` - Generic stations (3.8-4.1MB)
- `pod_evacuation_01/02.glb` - Escape pods (3MB each)

### 2. Garrisons Faction

**File**: `src/systems/FactionSystem.js`

Added the **Garrisons** nation to the faction system:
- **Name**: Garrisons
- **Ideology**: Fortification
- **Home Region**: Fortified Nexus
- **Color**: #FF6B35 (Orange-red)
- **Lore**: Rebels who left Earth in the late 21st century, mutated over generations
- **Equipment**: Garrison Heavy Railgun, Mutant Exo-Armor

### 3. Model Loading System

**File**: `src/renderer/ModelLoader.js`

Provides GLB model loading with:
- Async loading with caching
- Draco decompression support
- Faction-based color schemes
- Model instancing (clone from cache)
- Preloading API

**Usage**:
```javascript
const loader = new ModelLoader(THREE);
const model = await loader.load('ship_sentinel', {
  faction: 'garrisons',
  scale: 1.5
});
scene.add(model);
```

### 4. Dual Weapon System

**Files**: 
- `src/renderer/VectorGunWeapon.js` - Energy weapon
- `src/renderer/GunnerModeIntegration.js` - Updated for dual weapons

**Railgun** (existing):
- Damage: 75 per shot
- Type: Physical projectile
- Mechanic: Charge + recoil
- Ammo: 24 giant nails

**Vector Gun** (new):
- Damage: 45 per shot
- Type: Energy hitscan
- Mechanic: Heat buildup + cooling
- Ammo: Infinite (limited by heat)

**Weapon Switching**:
- Press **Tab** in gunner mode to switch weapons
- HUD shows active weapon status
- Each weapon has unique visuals and mechanics

### 5. Faction Fleet Spawner

**File**: `src/systems/FactionFleetSpawner.js`

Spawns NPC faction fleets with 3D models:
- Space stations (capital bases)
- Fighter squadrons
- Heavy cruisers
- Support ships (freighters, etc.)
- Faction-specific behaviors
- Diplomacy awareness (allies don't attack)

**Example**:
```javascript
const spawner = new FactionFleetSpawner(THREE, scene, factionSystem, modelLoader);
await spawner.spawnGarrisonsFleet({ x: 0, y: 0, z: 100 });
```

### 6. Enhanced Enemy System

**File**: `src/systems/EnemySpawnSystem.js`

Extended to support:
- Faction assignment to enemies
- Faction-based colors and behaviors
- Mixed hostile faction encounters
- Diplomacy checks (future feature)

## Testing

### Test GLB Loading

1. Start the server:
   ```bash
   npm start
   ```

2. Open test page:
   ```
   http://localhost:3000/test-glb.html
   ```

3. You should see:
   - Garrisons Habitat (space station)
   - Sentinel Fighter
   - Titan Cruiser
   - Railgun Weapon

### Test Dual Weapons

1. Load the main game
2. Press `F` to enter gunner mode
3. Press `Tab` to switch between Railgun and Vector Gun
4. Fire with left mouse button
5. Check HUD for weapon status (ammo/heat)

## File Structure

```
oldeden/
├── glbs/                          # Original 638MB GLB files (Git LFS)
├── public/
│   ├── models/                    # Optimized 22MB GLB files
│   │   ├── garrisons_habitat.glb
│   │   ├── ship_sentinel.glb
│   │   ├── ship_titan.glb
│   │   └── ...
│   └── test-glb.html              # GLB loading test page
├── scripts/
│   └── optimize-glbs.sh           # GLB optimization script
└── src/
    ├── renderer/
    │   ├── ModelLoader.js         # GLB model loader
    │   ├── VectorGunWeapon.js     # Energy weapon
    │   └── GunnerModeIntegration.js  # Dual weapon system
    └── systems/
        ├── FactionSystem.js       # +Garrisons faction
        ├── EnemySpawnSystem.js    # +Faction support
        └── FactionFleetSpawner.js # NPC fleet spawner
```

## Integration Guide

### Adding GLB Models to Your Game

1. **Load the ModelLoader**:
   ```javascript
   import { ModelLoader } from '/src/renderer/ModelLoader.js';
   const loader = new ModelLoader(THREE);
   ```

2. **Load a model**:
   ```javascript
   const ship = await loader.load('ship_sentinel', {
     faction: 'garrisons',
     scale: 1.0
   });
   scene.add(ship);
   ```

3. **Preload models** (optional, for performance):
   ```javascript
   await loader.preload(['ship_sentinel', 'ship_titan', 'garrisons_habitat']);
   ```

### Spawning Faction Fleets

```javascript
import { FactionFleetSpawner } from '/src/systems/FactionFleetSpawner.js';

const spawner = new FactionFleetSpawner(THREE, scene, factionSystem, loader);

// Spawn Garrisons fleet at position
const fleet = await spawner.spawnGarrisonsFleet({ x: 0, y: 0, z: 500 });

// Update in game loop
function update(deltaMs) {
  spawner.update(deltaMs, playerPosition, playerFaction);
}
```

### Using Dual Weapons

The dual weapon system is automatically integrated into `GunnerModeIntegration`:
- Railgun: Heavy damage, slow fire rate, ammo-based
- Vector Gun: Medium damage, fast fire rate, heat-based

No additional setup needed - just press Tab to switch!

## Dependencies

Added packages:
- `three@0.160.0` - Three.js 3D library
- `@gltf-transform/cli@4.3.0` - GLB optimization tool

External CDN resources:
- Draco decoder: `https://www.gstatic.com/draco/versioned/decoders/1.5.6/`

## Performance Notes

- GLB models are loaded asynchronously
- Models are cached after first load (subsequent loads clone from cache)
- Draco compression reduces file size by ~90% with minimal quality loss
- All models under 12MB load quickly on modern connections
- Use preload() for critical models at game start

## Future Enhancements

- [ ] Add faction diplomacy checks to prevent friendly fire
- [ ] Implement GLB model attachments (railgun on ship hardpoints)
- [ ] Add LOD (Level of Detail) system for distant ships
- [ ] Create faction-specific weapon effects
- [ ] Add station interiors
- [ ] Implement docking mechanics
- [ ] Add ship customization (paint, decals)

## Credits

- GLB models: Generated via Meshy AI
- Optimization: gltf-transform by Don McCurdy
- 3D rendering: Three.js
- Game: Old Eden (Faction Wars update)

---

**Note**: All GLB files in `glbs/` are tracked with Git LFS. Optimized files in `public/models/` are regular Git files.
