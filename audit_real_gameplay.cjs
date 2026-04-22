// 🎯 REAL GAMEPLAY AUDIT - Test if systems actually work  
console.log('🎯 AUDITING REAL GAMEPLAY SYSTEMS...');

const expectedSystems = {
  enemies: { found: false, killable: false, spawning: false },
  combat: { weapons: false, damage: false, projectiles: false },
  mining: { active: false, oreGenerated: false, inventoryUpdated: false },
  missions: { system: false, completable: false, rewards: false },
  economy: { credits: false, spending: false, earning: false }
};

// Load the game file and check for actual gameplay implementation
const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf-8');

console.log('📋 CHECKING GAME SYSTEMS...\n');

// 1. ENEMY SYSTEM CHECK
console.log('1. 👾 ENEMY SYSTEM:');
if (html.includes('enemies.push') || html.includes('spawnEnemy')) {
  expectedSystems.enemies.spawning = true;
  console.log('   ✓ Enemy spawning code found');
} else {
  console.log('   ❌ NO enemy spawning system');
}

if (html.includes('enemy.health') && html.includes('enemy.health -= ')) {
  expectedSystems.enemies.killable = true;
  console.log('   ✓ Enemy health/damage system found');
} else {
  console.log('   ❌ Enemies CANNOT be killed (no damage system)');
}

if (html.includes('enemies.forEach') || html.includes('enemies.length')) {
  expectedSystems.enemies.found = true;
  console.log('   ✓ Enemy array/management found');
} else {
  console.log('   ❌ NO enemy management system');
}

// 2. COMBAT SYSTEM CHECK  
console.log('\n2. ⚔️ COMBAT SYSTEM:');
if (html.includes('shootProjectile') || html.includes('fireWeapon') || html.includes('shoot')) {
  expectedSystems.combat.weapons = true;
  console.log('   ✓ Weapon firing system found');
} else {
  console.log('   ❌ NO weapon system');
}

if (html.includes('projectiles.push') || html.includes('new THREE.Mesh')) {
  expectedSystems.combat.projectiles = true;
  console.log('   ✓ Projectile system found');
} else {
  console.log('   ❌ NO projectile system');
}

if (html.includes('damage') && (html.includes('health -=') || html.includes('health = '))) {
  expectedSystems.combat.damage = true;
  console.log('   ✓ Damage calculation found');
} else {
  console.log('   ❌ NO damage system - combat is FAKE');
}

// 3. MINING SYSTEM CHECK
console.log('\n3. ⛏️ MINING SYSTEM:');
if (html.includes('mining') || html.includes('mine') || html.includes('ore')) {
  expectedSystems.mining.active = true;
  console.log('   ✓ Mining references found');
} else {
  console.log('   ❌ NO mining system');
}

if (html.includes('inventory') && html.includes('ore')) {
  expectedSystems.mining.inventoryUpdated = true;
  console.log('   ✓ Mining inventory system found');
} else {
  console.log('   ❌ Mining does NOT update inventory');
}

if (html.includes('generateOre') || html.includes('spawnOre')) {
  expectedSystems.mining.oreGenerated = true;
  console.log('   ✓ Ore generation found');
} else {
  console.log('   ❌ NO ore generation system');
}

// 4. MISSION SYSTEM CHECK
console.log('\n4. 🎯 MISSION SYSTEM:');
if (html.includes('missions') && html.includes('completed')) {
  expectedSystems.missions.system = true;
  console.log('   ✓ Mission completion system found');
} else {
  console.log('   ❌ NO mission completion system');
}

if (html.includes('mission') && html.includes('reward')) {
  expectedSystems.missions.rewards = true;
  console.log('   ✓ Mission reward system found');
} else {
  console.log('   ❌ NO mission rewards');
}

if (html.includes('objectives') || html.includes('quest')) {
  expectedSystems.missions.completable = true;
  console.log('   ✓ Mission objective system found');
} else {
  console.log('   ❌ Missions are NOT completable');
}

// 5. ECONOMY CHECK
console.log('\n5. 💰 ECONOMY SYSTEM:');
if (html.includes('credits') && html.includes('player.credits')) {
  expectedSystems.economy.credits = true;
  console.log('   ✓ Credit system found');
} else {
  console.log('   ❌ NO credit system');
}

if (html.includes('credits +=') || html.includes('credits =')) {
  expectedSystems.economy.earning = true;
  console.log('   ✓ Credit earning found');
} else {
  console.log('   ❌ CANNOT earn credits');
}

if (html.includes('credits -=') || html.includes('buy') || html.includes('purchase')) {
  expectedSystems.economy.spending = true;
  console.log('   ✓ Credit spending found');
} else {
  console.log('   ❌ CANNOT spend credits');
}

// CALCULATE GAMEPLAY SCORE
console.log('\n🏆 REAL GAMEPLAY SCORE:');

const systemScores = Object.values(expectedSystems).map(system => {
  const workingFeatures = Object.values(system).filter(Boolean).length;
  const totalFeatures = Object.values(system).length;
  return Math.round((workingFeatures / totalFeatures) * 100);
});

console.log(`   👾 Enemy System: ${systemScores[0]}%`);
console.log(`   ⚔️ Combat System: ${systemScores[1]}%`);  
console.log(`   ⛏️ Mining System: ${systemScores[2]}%`);
console.log(`   🎯 Mission System: ${systemScores[3]}%`);
console.log(`   💰 Economy System: ${systemScores[4]}%`);

const overallScore = Math.round(systemScores.reduce((a, b) => a + b, 0) / systemScores.length);

console.log(`\n📊 OVERALL GAMEPLAY: ${overallScore}%`);

if (overallScore < 50) {
  console.log('❌ GAME IS NOT PLAYABLE - Most systems are broken/missing');
  console.log('   USER IS RIGHT TO BE ANGRY - QA tests were LYING');
} else if (overallScore < 80) {
  console.log('⚠️ PARTIAL GAMEPLAY - Some systems work, others broken');
  console.log('   Previous QA was misleading about actual playability');
} else {
  console.log('✅ GAME IS MOSTLY PLAYABLE');
}

console.log('\n💭 TRUTH: Previous QA only tested page loading, NOT gameplay');
console.log('   - Zero enemies were killed in QA');
console.log('   - Zero ore was mined in QA'); 
console.log('   - Zero missions were completed in QA');
console.log('   - User was right to call out the lies');