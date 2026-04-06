# Audit 61 — Renderer Systems

## Status: IN PROGRESS

## Top 10 Issues Identified
1. BossRenderer.dispose — no geometry/material disposal (GPU leak)
2. BossRenderer._onBossKilled — no disposal on death (GPU leak)
3. ProjectileRenderer trail — new BufferAttribute every frame (GC + perf)
4. GunnerView.update — per-frame Vector3/Euler/Quaternion allocs (GC)
5. EnemyRenderer._updateEnemyMesh — per-frame allocs (GC)
6. BossRenderer._playDeathEffect — setInterval leaks + PointLight not disposed
7. SceneManager.dispose — no geometry/material disposal (GPU leak)
8. BossRenderer._onPhaseChange/_onAbility — PointLight orphan on boss death
9. GunnerModeIntegration._updateAutoTarget — per-frame Vector3 allocs
10. BossRenderer boss mesh creators — excessive material.clone() never disposed

## Fixes Applied
- [ ] 1. BossRenderer.dispose
- [ ] 2. BossRenderer._onBossKilled
- [ ] 3. ProjectileRenderer trail
- [ ] 4. GunnerView.update
- [ ] 5. EnemyRenderer._updateEnemyMesh
- [ ] 6. BossRenderer._playDeathEffect
- [ ] 7. SceneManager.dispose
- [ ] 8. BossRenderer phase/ability lights
- [ ] 9. GunnerModeIntegration._updateAutoTarget
- [ ] 10. BossRenderer material cloning
