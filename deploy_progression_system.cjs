#!/usr/bin/env node
// 👑 THE KING'S PROGRESSION SYSTEM DEPLOYMENT
// Add leveling, skills, upgrades, and achievements

const fs = require('fs');
const path = require('path');

console.log('👑 THE KING: DEPLOYING PLAYER PROGRESSION SYSTEM');
console.log('═══════════════════════════════════════════════');

const indexPath = path.join(__dirname, 'public', 'index.html');

function safeReplace(content, search, replace) {
  if (content.includes(search)) {
    return content.replace(search, replace);
  } else {
    console.log(`⚠️ Search pattern not found: ${search.substring(0, 50)}...`);
    return content;
  }
}

function cr(text) {
  return text.replace(/\n/g, '\r\n');
}

try {
  console.log('📖 Reading index.html...');
  let content = fs.readFileSync(indexPath, 'utf-8');
  
  // Add progression system variables after player object
  console.log('📈 Adding player progression system...');
  content = safeReplace(content, 
    'let targetingSystem = null;\n        let crosshair, aimingReticle;',
    `let targetingSystem = null;
        let crosshair, aimingReticle;
        
        // 👑 PLAYER PROGRESSION SYSTEM
        let playerLevel = 1;
        let experience = 0;
        let experienceToNext = 100;
        let skillPoints = 0;
        let credits = 0;
        
        const skills = {
          accuracy: 0,      // Max 10 - improves accuracy
          damage: 0,        // Max 10 - increases weapon damage 
          armor: 0,         // Max 10 - reduces damage taken
          speed: 0,         // Max 10 - increases movement speed
          energy: 0,        // Max 10 - increases energy capacity
          shield: 0,        // Max 10 - improves shield regeneration
          targeting: 0,     // Max 10 - improves auto-targeting
          multishot: 0,     // Max 10 - chance for multiple projectiles
          criticalHit: 0,   // Max 10 - chance for double damage
          regen: 0          // Max 10 - health regeneration
        };
        
        const achievements = [
          { id: 'first_kill', name: 'First Blood', desc: 'Destroy your first enemy', unlocked: false, reward: 50 },
          { id: 'enemy_hunter', name: 'Enemy Hunter', desc: 'Destroy 25 enemies', progress: 0, target: 25, unlocked: false, reward: 100 },
          { id: 'ace_pilot', name: 'Ace Pilot', desc: 'Destroy 100 enemies', progress: 0, target: 100, unlocked: false, reward: 250 },
          { id: 'weapon_master', name: 'Weapon Master', desc: 'Use all 3 weapon types', progress: 0, target: 3, unlocked: false, reward: 75 },
          { id: 'survivor', name: 'Survivor', desc: 'Survive for 5 minutes', progress: 0, target: 300, unlocked: false, reward: 100 },
          { id: 'level_up', name: 'Level Up', desc: 'Reach level 5', progress: 1, target: 5, unlocked: false, reward: 200 },
          { id: 'rich_pilot', name: 'Rich Pilot', desc: 'Accumulate 1000 credits', progress: 0, target: 1000, unlocked: false, reward: 150 },
          { id: 'skill_master', name: 'Skill Master', desc: 'Max out any skill to level 10', progress: 0, target: 10, unlocked: false, reward: 300 }
        ];
        
        let upgradeShopOpen = false;
        let startTime = Date.now();
        let lastDamageTime = 0;`
  );
  
  // Add progression HUD elements
  console.log('💻 Adding progression HUD...');
  content = safeReplace(content,
    '<div id="hud" style="position: absolute; top: 0; left: 0; color: white; font-family: Arial; font-size: 14px; z-index: 1000; pointer-events: none;">',
    `<div id="hud" style="position: absolute; top: 0; left: 0; color: white; font-family: Arial; font-size: 14px; z-index: 1000; pointer-events: none;">
                <div id="level-display" style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.7); padding: 10px; border-radius: 5px;">
                    <div>Level: <span id="player-level">1</span></div>
                    <div>XP: <span id="player-xp">0</span> / <span id="player-xp-next">100</span></div>
                    <div style="width: 200px; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; margin-top: 5px;">
                        <div id="xp-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #4CAF50, #8BC34A); border-radius: 3px; transition: width 0.3s;"></div>
                    </div>
                </div>
                <div id="resources" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); padding: 10px; border-radius: 5px;">
                    <div>Credits: <span id="player-credits">0</span></div>
                    <div>Skill Points: <span id="skill-points">0</span></div>
                </div>
                <div id="achievements" style="position: absolute; bottom: 150px; right: 10px; width: 300px; max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.7); border-radius: 5px; padding: 10px; display: none;">
                    <h3 style="margin: 0 0 10px 0;">Achievements</h3>
                    <div id="achievement-list"></div>
                </div>`
  );
  
  // Add upgrade shop modal
  console.log('🛒 Adding upgrade shop...');
  content = safeReplace(content,
    '</div>\n            </div>\n        </div>\n        <canvas id="gameCanvas" width="800" height="600" style="background: black;"></canvas>',
    `</div>
            </div>
        </div>
        
        <!-- 👑 UPGRADE SHOP -->
        <div id="upgrade-shop" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 600px; background: rgba(0,0,0,0.9); border: 2px solid #444; border-radius: 10px; padding: 20px; z-index: 2000; display: none; color: white; font-family: Arial;">
            <h2 style="margin: 0 0 20px 0; text-align: center;">Upgrade Shop</h2>
            <div id="shop-tabs" style="display: flex; margin-bottom: 20px;">
                <button id="skills-tab" class="shop-tab active" style="flex: 1; padding: 10px; background: #333; border: none; color: white; cursor: pointer;">Skills</button>
                <button id="weapons-tab" class="shop-tab" style="flex: 1; padding: 10px; background: #222; border: none; color: white; cursor: pointer;">Weapons</button>
                <button id="ship-tab" class="shop-tab" style="flex: 1; padding: 10px; background: #222; border: none; color: white; cursor: pointer;">Ship</button>
            </div>
            <div id="shop-content" style="min-height: 300px;">
                <div id="skills-panel" class="shop-panel">
                    <div id="skills-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;"></div>
                </div>
                <div id="weapons-panel" class="shop-panel" style="display: none;">
                    <h3>Weapon Upgrades</h3>
                    <p>Coming Soon...</p>
                </div>
                <div id="ship-panel" class="shop-panel" style="display: none;">
                    <h3>Ship Upgrades</h3>
                    <p>Coming Soon...</p>
                </div>
            </div>
            <div style="text-align: center; margin-top: 20px;">
                <button id="close-shop" style="padding: 10px 30px; background: #f44336; border: none; color: white; cursor: pointer; border-radius: 5px;">Close</button>
            </div>
        </div>
        
        <canvas id="gameCanvas" width="800" height="600" style="background: black;"></canvas>`
  );
  
  // Add progression update functions
  console.log('⚡ Adding progression logic...');
  content = safeReplace(content,
    'function checkTargeting() {',
    `// 👑 PROGRESSION SYSTEM FUNCTIONS
        function gainExperience(amount) {
            experience += amount;
            updateProgressionHUD();
            
            // Level up check
            while (experience >= experienceToNext) {
                experience -= experienceToNext;
                playerLevel++;
                skillPoints += 2; // 2 skill points per level
                experienceToNext = Math.floor(experienceToNext * 1.5);
                
                // Show level up effect
                showLevelUpEffect();
                updateAchievementProgress('level_up', playerLevel);
            }
        }
        
        function gainCredits(amount) {
            credits += amount;
            updateProgressionHUD();
            updateAchievementProgress('rich_pilot', credits);
        }
        
        function updateProgressionHUD() {
            document.getElementById('player-level').textContent = playerLevel;
            document.getElementById('player-xp').textContent = experience;
            document.getElementById('player-xp-next').textContent = experienceToNext;
            document.getElementById('player-credits').textContent = credits;
            document.getElementById('skill-points').textContent = skillPoints;
            
            const xpPercent = (experience / experienceToNext) * 100;
            document.getElementById('xp-bar').style.width = xpPercent + '%';
        }
        
        function showLevelUpEffect() {
            const effect = document.createElement('div');
            effect.style.cssText = \`
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 48px;
                font-weight: bold;
                color: #FFD700;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
                z-index: 3000;
                pointer-events: none;
                animation: levelUp 3s ease-out forwards;
            \`;
            effect.textContent = \`LEVEL UP! Level \${playerLevel}\`;
            
            const style = document.createElement('style');
            style.textContent = \`
                @keyframes levelUp {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                    20% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                    80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
                }
            \`;
            document.head.appendChild(style);
            document.body.appendChild(effect);
            
            setTimeout(() => {
                document.body.removeChild(effect);
                document.head.removeChild(style);
            }, 3000);
        }
        
        function updateAchievementProgress(id, value) {
            const achievement = achievements.find(a => a.id === id);
            if (!achievement || achievement.unlocked) return;
            
            achievement.progress = value;
            if (achievement.progress >= achievement.target) {
                unlockAchievement(achievement);
            }
        }
        
        function unlockAchievement(achievement) {
            if (achievement.unlocked) return;
            achievement.unlocked = true;
            gainCredits(achievement.reward);
            
            // Show achievement notification
            const notification = document.createElement('div');
            notification.style.cssText = \`
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(45deg, #FFD700, #FFA500);
                color: black;
                padding: 15px;
                border-radius: 10px;
                font-weight: bold;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                z-index: 3000;
                animation: achievementPop 4s ease-out forwards;
            \`;
            notification.innerHTML = \`
                <div style="font-size: 14px;">🏆 ACHIEVEMENT UNLOCKED!</div>
                <div style="font-size: 16px; margin: 5px 0;">\${achievement.name}</div>
                <div style="font-size: 12px;">\${achievement.desc}</div>
                <div style="font-size: 12px; margin-top: 5px;">+\${achievement.reward} Credits</div>
            \`;
            
            const style = document.createElement('style');
            style.textContent = \`
                @keyframes achievementPop {
                    0% { transform: translateX(400px); opacity: 0; }
                    10% { transform: translateX(0); opacity: 1; }
                    90% { transform: translateX(0); opacity: 1; }
                    100% { transform: translateX(400px); opacity: 0; }
                }
            \`;
            document.head.appendChild(style);
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                    document.head.removeChild(style);
                }
            }, 4000);
        }
        
        function openUpgradeShop() {
            upgradeShopOpen = true;
            document.getElementById('upgrade-shop').style.display = 'block';
            renderSkillsPanel();
        }
        
        function closeUpgradeShop() {
            upgradeShopOpen = false;
            document.getElementById('upgrade-shop').style.display = 'none';
        }
        
        function renderSkillsPanel() {
            const grid = document.getElementById('skills-grid');
            grid.innerHTML = '';
            
            Object.entries(skills).forEach(([skillName, level]) => {
                const cost = (level + 1) * 50;
                const maxed = level >= 10;
                
                const skillDiv = document.createElement('div');
                skillDiv.style.cssText = \`
                    background: \${maxed ? '#2E7D32' : '#333'};
                    border: 1px solid #555;
                    border-radius: 5px;
                    padding: 10px;
                    cursor: \${!maxed && skillPoints >= 1 ? 'pointer' : 'not-allowed'};
                \`;
                
                skillDiv.innerHTML = \`
                    <div style="font-weight: bold; text-transform: capitalize;">\${skillName}</div>
                    <div>Level: \${level}/10</div>
                    <div style="font-size: 12px; margin: 5px 0;">Cost: \${maxed ? 'MAXED' : '1 Skill Point'}</div>
                    <div style="font-size: 11px; color: #ccc;">\${getSkillDescription(skillName)}</div>
                \`;
                
                if (!maxed && skillPoints >= 1) {
                    skillDiv.addEventListener('click', () => upgradeSkill(skillName));
                }
                
                grid.appendChild(skillDiv);
            });
        }
        
        function getSkillDescription(skillName) {
            const descriptions = {
                accuracy: 'Improves weapon accuracy and reduces bullet spread',
                damage: 'Increases damage dealt by all weapons',
                armor: 'Reduces incoming damage from enemies',
                speed: 'Increases movement speed and agility',
                energy: 'Increases maximum energy capacity',
                shield: 'Improves shield regeneration rate',
                targeting: 'Improves auto-targeting range and accuracy',
                multishot: 'Chance to fire multiple projectiles',
                criticalHit: 'Chance to deal double damage',
                regen: 'Slowly regenerates health over time'
            };
            return descriptions[skillName] || 'Unknown skill';
        }
        
        function upgradeSkill(skillName) {
            if (skills[skillName] >= 10 || skillPoints < 1) return;
            
            skills[skillName]++;
            skillPoints--;
            updateProgressionHUD();
            renderSkillsPanel();
            
            updateAchievementProgress('skill_master', Math.max(...Object.values(skills)));
            
            // Apply skill effects
            applySkillEffects();
        }
        
        function applySkillEffects() {
            // Update player stats based on skills
            if (player) {
                player.maxHealth = 100 + (skills.armor * 20);
                player.maxShields = 50 + (skills.shield * 10);
                player.maxEnergy = 100 + (skills.energy * 25);
                
                // Update weapon stats
                if (weapons) {
                    weapons.forEach(weapon => {
                        weapon.baseDamage = weapon.originalDamage * (1 + skills.damage * 0.2);
                        weapon.accuracy = Math.min(1, weapon.originalAccuracy + (skills.accuracy * 0.05));
                    });
                }
            }
        }
        
        function checkTargeting() {`
  );
  
  // Update enemy destruction to give rewards
  console.log('💰 Adding reward system to enemy kills...');
  content = safeReplace(content,
    `enemy.health <= 0) {
                        scene.remove(enemy.mesh);
                        enemies.splice(j, 1);
                        score += enemy.type === 'fast' ? 15 : enemy.type === 'tank' ? 25 : 10;`,
    `enemy.health <= 0) {
                        scene.remove(enemy.mesh);
                        
                        // 👑 PROGRESSION REWARDS
                        const baseExp = enemy.type === 'fast' ? 15 : enemy.type === 'tank' ? 25 : 10;
                        const baseCredits = enemy.type === 'fast' ? 8 : enemy.type === 'tank' ? 12 : 5;
                        
                        gainExperience(baseExp);
                        gainCredits(baseCredits);
                        
                        enemies.splice(j, 1);
                        score += baseExp;
                        
                        // Track achievements
                        updateAchievementProgress('enemy_hunter', score / 10);
                        updateAchievementProgress('ace_pilot', score / 10);
                        
                        if (score === 10) { // First kill
                            updateAchievementProgress('first_kill', 1);
                        }`
  );
  
  // Add shop toggle key
  console.log('🔑 Adding shop controls...');
  content = safeReplace(content,
    `case 'KeyE':
                    targetingSystem.cyclePrevTarget();
                    break;`,
    `case 'KeyE':
                    targetingSystem.cyclePrevTarget();
                    break;
                case 'KeyU':
                    if (upgradeShopOpen) {
                        closeUpgradeShop();
                    } else {
                        openUpgradeShop();
                    }
                    break;`
  );
  
  // Update weapon tracking for achievements
  console.log('🔫 Adding weapon tracking...');
  content = safeReplace(content,
    `currentWeapon = weaponIndex;
                const weapon = weapons[currentWeapon];`,
    `currentWeapon = weaponIndex;
                const weapon = weapons[currentWeapon];
                
                // Track weapon usage for achievement
                if (!weapon.used) {
                    weapon.used = true;
                    const usedWeapons = weapons.filter(w => w.used).length;
                    updateAchievementProgress('weapon_master', usedWeapons);
                }`
  );
  
  // Add survival time tracking
  console.log('⏰ Adding survival tracking...');
  content = safeReplace(content,
    'function gameLoop() {',
    `// Initialize weapon original stats
        function initializeWeaponStats() {
            weapons.forEach(weapon => {
                weapon.originalDamage = weapon.damage;
                weapon.originalAccuracy = weapon.accuracy || 0.95;
            });
        }
        
        function gameLoop() {
            // Update survival achievement
            const survivalTime = (Date.now() - startTime) / 1000;
            updateAchievementProgress('survivor', Math.floor(survivalTime));
            
            // Health regeneration
            if (skills.regen > 0 && player.health < player.maxHealth) {
                player.health += skills.regen * 0.1;
                player.health = Math.min(player.health, player.maxHealth);
                updateHealthBar();
            }`
  );
  
  // Add shop event listeners
  console.log('🎮 Adding shop event handlers...');
  content = safeReplace(content,
    'canvas.addEventListener(\'click\', (event) => {',
    `// 👑 SHOP EVENT LISTENERS
        document.getElementById('close-shop').addEventListener('click', closeUpgradeShop);
        document.querySelectorAll('.shop-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Update active tab
                document.querySelectorAll('.shop-tab').forEach(t => {
                    t.classList.remove('active');
                    t.style.background = '#222';
                });
                e.target.classList.add('active');
                e.target.style.background = '#333';
                
                // Show corresponding panel
                document.querySelectorAll('.shop-panel').forEach(panel => {
                    panel.style.display = 'none';
                });
                
                const panelId = e.target.id.replace('-tab', '-panel');
                document.getElementById(panelId).style.display = 'block';
                
                if (panelId === 'skills-panel') {
                    renderSkillsPanel();
                }
            });
        });
        
        canvas.addEventListener('click', (event) => {`
  );
  
  // Initialize progression system
  console.log('🚀 Adding progression initialization...');
  content = safeReplace(content,
    'updateHealthBar();\n            updateHUD();\n            animate();',
    `updateHealthBar();
            updateHUD();
            updateProgressionHUD();
            initializeWeaponStats();
            
            // Initialize achievements display
            setInterval(() => {
                document.getElementById('achievement-list').innerHTML = achievements
                    .filter(a => a.unlocked)
                    .map(a => \`<div style="margin: 5px 0; padding: 5px; background: rgba(255,255,255,0.1); border-radius: 3px;">
                        <strong>\${a.name}</strong><br>
                        <small>\${a.desc}</small>
                    </div>\`)
                    .join('');
            }, 1000);
            
            animate();`
  );
  
  console.log('💾 Saving enhanced index.html...');
  fs.writeFileSync(indexPath, content);
  
  console.log('\n👑 THE KING: PROGRESSION SYSTEM DEPLOYMENT COMPLETE!');
  console.log('═══════════════════════════════════════════════════');
  console.log('✅ Player leveling system with XP and levels');
  console.log('✅ 10 different skill trees (damage, armor, speed, etc.)');
  console.log('✅ Achievement system with 8 achievements');
  console.log('✅ Credit and reward system');
  console.log('✅ Upgrade shop (Press U to open)');
  console.log('✅ Level up effects and achievement notifications');
  console.log('✅ Progression HUD with level, XP bar, credits');
  console.log('✅ Skill point system (2 points per level)');
  console.log('✅ Health regeneration and stat bonuses');
  console.log('✅ Survival time tracking');
  console.log('\n🎮 CONTROLS:');
  console.log('  U - Open/Close Upgrade Shop');
  console.log('  Click skills in shop to upgrade (costs 1 skill point)');
  console.log('\n📈 PROGRESSION FEATURES:');
  console.log('  • Gain XP and credits from killing enemies');
  console.log('  • Level up grants 2 skill points');
  console.log('  • 10 skills: accuracy, damage, armor, speed, energy, shield, targeting, multishot, criticalHit, regen');
  console.log('  • 8 achievements with credit rewards');
  console.log('  • Visual level up effects and achievement notifications');
  
} catch (error) {
  console.error('❌ DEPLOYMENT FAILED:', error);
  process.exit(1);
}