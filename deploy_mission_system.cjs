#!/usr/bin/env node
// 👑 THE KING'S MISSION AND QUEST SYSTEM DEPLOYMENT
// Add dynamic missions, storylines, and objectives

const fs = require('fs');
const path = require('path');

console.log('👑 THE KING: DEPLOYING MISSION AND QUEST SYSTEM');
console.log('════════════════════════════════════════════════');

const indexPath = path.join(__dirname, 'public', 'index.html');

function safeReplace(content, search, replace) {
  if (content.includes(search)) {
    return content.replace(search, replace);
  } else {
    console.log(`⚠️ Search pattern not found, appending instead...`);
    // If search not found, append to end of script section
    const scriptEnd = content.lastIndexOf('</script>');
    if (scriptEnd > -1) {
      return content.substring(0, scriptEnd) + '\n' + replace + '\n' + content.substring(scriptEnd);
    }
    return content + '\n' + replace;
  }
}

function cr(text) {
  return text.replace(/\n/g, '\r\n');
}

try {
  console.log('📖 Reading index.html...');
  let content = fs.readFileSync(indexPath, 'utf-8');
  
  // Add mission and quest system
  console.log('🎯 Adding mission and quest system...');
  const missionSystem = cr(`
        // 👑 MISSION AND QUEST SYSTEM
        
        let activeMissions = [];
        let completedMissions = [];
        let missionCounter = 0;
        let mainStoryProgress = 0;
        let missionUpdateTimer = 0;
        
        const missionTypes = {
            DESTROY_ENEMIES: {
                name: 'Eliminate Threats',
                description: 'Destroy {count} enemy ships',
                rewards: { credits: 100, experience: 50 },
                difficulty: 'easy'
            },
            COLLECT_RESOURCES: {
                name: 'Resource Collection',
                description: 'Collect {count} {resourceType}',
                rewards: { credits: 150, experience: 75 },
                difficulty: 'medium'
            },
            VISIT_STATION: {
                name: 'Station Visit',
                description: 'Visit space station in sector {sector}',
                rewards: { credits: 75, experience: 40 },
                difficulty: 'easy'
            },
            SURVIVE_TIME: {
                name: 'Survival Challenge',
                description: 'Survive for {minutes} minutes without taking damage',
                rewards: { credits: 200, experience: 100 },
                difficulty: 'hard'
            },
            REACH_LOCATION: {
                name: 'Exploration',
                description: 'Reach coordinates ({x}, {z})',
                rewards: { credits: 80, experience: 60 },
                difficulty: 'easy'
            },
            MINING_QUOTA: {
                name: 'Mining Contract',
                description: 'Mine {value} credits worth of resources',
                rewards: { credits: 120, experience: 80 },
                difficulty: 'medium'
            }
        };
        
        const storyMissions = [
            {
                id: 'prologue',
                title: 'Welcome to the Void',
                description: 'Complete your first enemy kill to begin your journey in space.',
                objectives: [{ type: 'DESTROY_ENEMIES', target: 1, progress: 0 }],
                rewards: { credits: 200, experience: 100 },
                unlocked: true,
                completed: false,
                isStoryMission: true
            },
            {
                id: 'first_mining',
                title: 'Resource Prospector',
                description: 'Learn the basics of resource collection by mining your first mineral.',
                objectives: [{ type: 'COLLECT_RESOURCES', target: 1, progress: 0, resourceType: 'any' }],
                rewards: { credits: 150, experience: 75 },
                unlocked: false,
                completed: false,
                isStoryMission: true
            },
            {
                id: 'trade_introduction',
                title: 'First Trade',
                description: 'Visit a space station and sell resources to learn about trading.',
                objectives: [{ type: 'VISIT_STATION', target: 1, progress: 0 }],
                rewards: { credits: 300, experience: 150 },
                unlocked: false,
                completed: false,
                isStoryMission: true
            },
            {
                id: 'skill_development',
                title: 'Pilot Training',
                description: 'Reach level 3 and upgrade your first skill to begin mastering your ship.',
                objectives: [{ type: 'REACH_LEVEL', target: 3, progress: 1 }],
                rewards: { credits: 500, experience: 200, skillPoints: 3 },
                unlocked: false,
                completed: false,
                isStoryMission: true
            },
            {
                id: 'veteran_pilot',
                title: 'Veteran Status',
                description: 'Prove yourself as a skilled pilot by destroying 50 enemies.',
                objectives: [{ type: 'DESTROY_ENEMIES', target: 50, progress: 0 }],
                rewards: { credits: 1000, experience: 500, skillPoints: 5 },
                unlocked: false,
                completed: false,
                isStoryMission: true
            }
        ];
        
        function generateRandomMission() {
            const types = Object.keys(missionTypes);
            const type = types[Math.floor(Math.random() * types.length)];
            const template = missionTypes[type];
            
            let mission = {
                id: 'mission_' + (++missionCounter),
                title: template.name,
                description: template.description,
                type: type,
                objectives: [],
                rewards: { ...template.rewards },
                difficulty: template.difficulty,
                timeLimit: 300 + Math.random() * 600, // 5-15 minutes
                timeRemaining: 0,
                isStoryMission: false,
                completed: false
            };
            
            // Generate specific objectives based on mission type
            switch (type) {
                case 'DESTROY_ENEMIES':
                    const enemyCount = 3 + Math.floor(Math.random() * 8);
                    mission.objectives.push({ type: 'DESTROY_ENEMIES', target: enemyCount, progress: 0 });
                    mission.description = mission.description.replace('{count}', enemyCount);
                    break;
                    
                case 'COLLECT_RESOURCES':
                    const resourceTypes = ['iron', 'copper', 'gold', 'platinum', 'crystal'];
                    const resourceType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
                    const resourceCount = 2 + Math.floor(Math.random() * 6);
                    mission.objectives.push({ type: 'COLLECT_RESOURCES', target: resourceCount, progress: 0, resourceType });
                    mission.description = mission.description.replace('{count}', resourceCount).replace('{resourceType}', resourceType);
                    break;
                    
                case 'VISIT_STATION':
                    const sectorId = Math.floor(Math.random() * 3) + 1;
                    mission.objectives.push({ type: 'VISIT_STATION', target: 1, progress: 0, sector: sectorId });
                    mission.description = mission.description.replace('{sector}', sectorId);
                    break;
                    
                case 'SURVIVE_TIME':
                    const minutes = 2 + Math.floor(Math.random() * 4);
                    mission.objectives.push({ type: 'SURVIVE_TIME', target: minutes * 60, progress: 0, lastDamageTime: 0 });
                    mission.description = mission.description.replace('{minutes}', minutes);
                    break;
                    
                case 'REACH_LOCATION':
                    const targetX = -100 + Math.random() * 200;
                    const targetZ = -100 + Math.random() * 200;
                    mission.objectives.push({ type: 'REACH_LOCATION', target: 1, progress: 0, x: targetX, z: targetZ, radius: 15 });
                    mission.description = mission.description.replace('{x}', targetX.toFixed(0)).replace('{z}', targetZ.toFixed(0));
                    break;
                    
                case 'MINING_QUOTA':
                    const targetValue = 100 + Math.floor(Math.random() * 300);
                    mission.objectives.push({ type: 'MINING_QUOTA', target: targetValue, progress: 0 });
                    mission.description = mission.description.replace('{value}', targetValue);
                    break;
            }
            
            mission.timeRemaining = mission.timeLimit;
            return mission;
        }
        
        function updateMissions() {
            missionUpdateTimer++;
            
            // Update mission timers
            activeMissions.forEach((mission, index) => {
                if (!mission.isStoryMission && mission.timeRemaining > 0) {
                    mission.timeRemaining -= 1/60; // Decrease by 1 second at 60fps
                    if (mission.timeRemaining <= 0) {
                        // Mission expired
                        activeMissions.splice(index, 1);
                        showMissionNotification('Mission Failed: ' + mission.title, 'Time limit exceeded!', '#f44336');
                    }
                }
            });
            
            // Generate new missions periodically
            if (missionUpdateTimer > 900 && activeMissions.filter(m => !m.isStoryMission).length < 3) { // Every 15 seconds
                missionUpdateTimer = 0;
                if (Math.random() < 0.7) { // 70% chance
                    const newMission = generateRandomMission();
                    activeMissions.push(newMission);
                    showMissionNotification('New Mission Available!', newMission.title, '#4CAF50');
                }
            }
            
            updateMissionProgress();
            checkStoryProgression();
        }
        
        function updateMissionProgress() {
            activeMissions.forEach(mission => {
                mission.objectives.forEach(objective => {
                    switch (objective.type) {
                        case 'DESTROY_ENEMIES':
                            // Updated when enemy is destroyed
                            break;
                            
                        case 'COLLECT_RESOURCES':
                            if (objective.resourceType === 'any') {
                                objective.progress = Object.values(inventory).reduce((sum, count) => sum + count, 0);
                            } else {
                                objective.progress = inventory[objective.resourceType] || 0;
                            }
                            break;
                            
                        case 'VISIT_STATION':
                            if (nearestStation) {
                                objective.progress = 1;
                            }
                            break;
                            
                        case 'SURVIVE_TIME':
                            const currentTime = Date.now() / 1000;
                            if (lastDamageTime === 0 || (currentTime - lastDamageTime) < objective.target) {
                                objective.progress = Math.min(objective.target, currentTime - (objective.lastDamageTime || startTime / 1000));
                            }
                            break;
                            
                        case 'REACH_LOCATION':
                            if (player) {
                                const distance = Math.sqrt(
                                    Math.pow(player.mesh.position.x - objective.x, 2) +
                                    Math.pow(player.mesh.position.z - objective.z, 2)
                                );
                                if (distance <= objective.radius) {
                                    objective.progress = 1;
                                }
                            }
                            break;
                            
                        case 'MINING_QUOTA':
                            // Calculate total value of mined resources (simplified)
                            let totalValue = 0;
                            Object.entries(inventory).forEach(([resource, count]) => {
                                totalValue += count * (marketPrices[resource] || 0);
                            });
                            objective.progress = totalValue;
                            break;
                            
                        case 'REACH_LEVEL':
                            objective.progress = playerLevel || 1;
                            break;
                    }
                    
                    // Check if objective is completed
                    if (objective.progress >= objective.target && !mission.completed) {
                        completeMission(mission);
                    }
                });
            });
        }
        
        function completeMission(mission) {
            mission.completed = true;
            
            // Remove from active missions and add to completed
            const index = activeMissions.indexOf(mission);
            if (index > -1) {
                activeMissions.splice(index, 1);
                completedMissions.push(mission);
            }
            
            // Give rewards
            if (mission.rewards.credits) {
                gainCredits(mission.rewards.credits);
            }
            if (mission.rewards.experience) {
                gainExperience(mission.rewards.experience);
            }
            if (mission.rewards.skillPoints) {
                skillPoints += mission.rewards.skillPoints;
                updateProgressionHUD();
            }
            
            // Show completion notification
            showMissionNotification(
                'Mission Completed!',
                mission.title + '\\n+' + (mission.rewards.credits || 0) + ' credits, +' + (mission.rewards.experience || 0) + ' XP',
                '#4CAF50'
            );
            
            // Update story progress if it's a story mission
            if (mission.isStoryMission) {
                mainStoryProgress++;
                checkStoryProgression();
            }
        }
        
        function checkStoryProgression() {
            // Unlock next story missions based on progress
            storyMissions.forEach((storyMission, index) => {
                if (!storyMission.unlocked && index <= mainStoryProgress) {
                    storyMission.unlocked = true;
                    activeMissions.push({ ...storyMission });
                    showMissionNotification('New Story Mission!', storyMission.title, '#FF9800');
                }
            });
        }
        
        function showMissionNotification(title, message, color = '#2196F3') {
            const notification = document.createElement('div');
            notification.style.cssText = \`
                position: fixed;
                top: 100px;
                right: 20px;
                background: \${color};
                color: white;
                padding: 15px;
                border-radius: 8px;
                font-family: Arial;
                font-weight: bold;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                z-index: 3000;
                max-width: 300px;
                animation: missionNotificationSlide 5s ease-out forwards;
            \`;
            
            notification.innerHTML = \`
                <div style="font-size: 16px; margin-bottom: 5px;">\${title}</div>
                <div style="font-size: 12px; font-weight: normal; white-space: pre-line;">\${message}</div>
            \`;
            
            // Add animation
            const style = document.createElement('style');
            style.textContent = \`
                @keyframes missionNotificationSlide {
                    0% { transform: translateX(400px); opacity: 0; }
                    10% { transform: translateX(0); opacity: 1; }
                    85% { transform: translateX(0); opacity: 1; }
                    100% { transform: translateX(400px); opacity: 0; }
                }
            \`;
            if (!document.querySelector('style[data-mission-style]')) {
                style.setAttribute('data-mission-style', 'true');
                document.head.appendChild(style);
            }
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 5000);
        }
        
        function openMissionLog() {
            const missionLog = document.createElement('div');
            missionLog.id = 'mission-log';
            missionLog.style.cssText = \`
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 600px;
                max-height: 500px;
                background: rgba(0,0,0,0.95);
                border: 2px solid #444;
                border-radius: 10px;
                padding: 20px;
                z-index: 2000;
                color: white;
                font-family: Arial;
                overflow-y: auto;
            \`;
            
            let logContent = '<h2 style="text-align: center; margin: 0 0 20px 0;">Mission Log</h2>';
            
            if (activeMissions.length > 0) {
                logContent += '<h3 style="color: #4CAF50;">Active Missions</h3>';
                activeMissions.forEach(mission => {
                    const progressText = mission.objectives.map(obj => {
                        const progressPercent = ((obj.progress / obj.target) * 100).toFixed(0);
                        return \`\${obj.progress}/\${obj.target} (\${progressPercent}%)\`;
                    }).join(', ');
                    
                    const timeText = mission.timeRemaining > 0 ? 
                        \`Time: \${Math.floor(mission.timeRemaining / 60)}:\${(Math.floor(mission.timeRemaining % 60)).toString().padStart(2, '0')}\` :
                        '';
                    
                    logContent += \`
                        <div style="margin: 10px 0; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; border-left: 4px solid \${mission.isStoryMission ? '#FF9800' : '#2196F3'};">
                            <div style="font-weight: bold;">\${mission.title} \${mission.isStoryMission ? '(Story)' : ''}</div>
                            <div style="font-size: 12px; color: #ccc; margin: 5px 0;">\${mission.description}</div>
                            <div style="font-size: 12px;">Progress: \${progressText}</div>
                            \${timeText ? \`<div style="font-size: 12px; color: #ffeb3b;">Time Remaining: \${timeText}</div>\` : ''}
                            <div style="font-size: 11px; color: #4CAF50;">Rewards: \${mission.rewards.credits || 0}c, \${mission.rewards.experience || 0}xp\${mission.rewards.skillPoints ? ', ' + mission.rewards.skillPoints + ' skill points' : ''}</div>
                        </div>
                    \`;
                });
            }
            
            if (completedMissions.length > 0) {
                logContent += '<h3 style="color: #666; margin-top: 20px;">Recent Completions</h3>';
                completedMissions.slice(-5).forEach(mission => {
                    logContent += \`
                        <div style="margin: 5px 0; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 5px; font-size: 12px;">
                            <span style="font-weight: bold;">\${mission.title}</span> - Completed
                        </div>
                    \`;
                });
            }
            
            logContent += \`
                <div style="text-align: center; margin-top: 20px;">
                    <button id="close-mission-log" style="padding: 10px 30px; background: #f44336; border: none; color: white; cursor: pointer; border-radius: 5px;">Close</button>
                </div>
            \`;
            
            missionLog.innerHTML = logContent;
            document.body.appendChild(missionLog);
            
            document.getElementById('close-mission-log').addEventListener('click', () => {
                document.body.removeChild(missionLog);
            });
        }
        
        function onEnemyDestroyed() {
            // Update mission progress for enemy destruction
            activeMissions.forEach(mission => {
                mission.objectives.forEach(objective => {
                    if (objective.type === 'DESTROY_ENEMIES') {
                        objective.progress++;
                    }
                });
            });
        }
        
        function onPlayerDamaged() {
            lastDamageTime = Date.now() / 1000;
            // Reset survival mission progress
            activeMissions.forEach(mission => {
                mission.objectives.forEach(objective => {
                    if (objective.type === 'SURVIVE_TIME') {
                        objective.lastDamageTime = lastDamageTime;
                    }
                });
            });
        }
        
        function initializeMissions() {
            // Add first story mission
            const prologueMission = { ...storyMissions[0] };
            activeMissions.push(prologueMission);
            
            // Generate initial random missions
            for (let i = 0; i < 2; i++) {
                const randomMission = generateRandomMission();
                activeMissions.push(randomMission);
            }
        }
  `);
  
  content = safeReplace(content, '</script>', missionSystem + '</script>');
  
  // Add mission HUD
  console.log('💻 Adding mission HUD...');
  const missionHUD = cr(`
        // Mission HUD updates
        let missionDisplay = document.getElementById('mission-display');
        if (!missionDisplay) {
            missionDisplay = document.createElement('div');
            missionDisplay.id = 'mission-display';
            missionDisplay.style.cssText = \`
                position: absolute;
                top: 10px;
                right: 220px;
                background: rgba(0,0,0,0.7);
                padding: 10px;
                border-radius: 5px;
                color: white;
                font-family: Arial;
                font-size: 12px;
                pointer-events: none;
                max-width: 250px;
            \`;
            document.getElementById('hud').appendChild(missionDisplay);
        }
        
        if (activeMissions.length > 0) {
            let missionText = '<strong>Active Missions:</strong><br>';
            activeMissions.slice(0, 3).forEach(mission => { // Show max 3 missions
                const progressText = mission.objectives.map(obj => {
                    return \`\${obj.progress}/\${obj.target}\`;
                }).join(', ');
                
                missionText += \`<div style="margin: 3px 0; font-size: 11px; \${mission.isStoryMission ? 'color: #FF9800;' : ''}">
                    \${mission.title}: \${progressText}
                </div>\`;
            });
            missionDisplay.innerHTML = missionText;
        } else {
            missionDisplay.innerHTML = '<strong>No Active Missions</strong>';
        }
  `);
  
  content = safeReplace(content, 'function gameLoop() {', 'function gameLoop() {\n        updateMissions();\n' + missionHUD);
  
  // Add mission controls
  console.log('🔑 Adding mission controls...');
  const missionControls = cr(`
                case 'KeyM':
                    openMissionLog();
                    break;
  `);
  
  content = safeReplace(content, 'break;\n            }', 'break;\n' + missionControls + '            }');
  
  // Hook into enemy destruction
  console.log('🎯 Adding mission tracking hooks...');
  content = safeReplace(content, 'score += baseExp;', 'score += baseExp;\n                        onEnemyDestroyed();');
  
  // Hook into player damage
  content = safeReplace(content, 'player.health -= damage;', 'player.health -= damage;\n                    onPlayerDamaged();');
  
  // Initialize missions
  console.log('🚀 Adding mission initialization...');
  const missionInit = cr(`
        initializeMissions();
  `);
  
  content = safeReplace(content, 'animate();', missionInit + '\n        animate();');
  
  console.log('💾 Saving enhanced index.html...');
  fs.writeFileSync(indexPath, content);
  
  console.log('\n👑 THE KING: MISSION AND QUEST SYSTEM DEPLOYMENT COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Dynamic mission generation system');
  console.log('✅ 6 different mission types with varied objectives');
  console.log('✅ Story mission progression system');
  console.log('✅ Mission timers and difficulty levels');
  console.log('✅ Comprehensive reward system (credits, XP, skill points)');
  console.log('✅ Mission log interface with progress tracking');
  console.log('✅ Real-time mission progress updates');
  console.log('✅ Mission notifications and completion effects');
  console.log('✅ HUD integration with active mission display');
  console.log('\n🎮 CONTROLS:');
  console.log('  M - Open Mission Log');
  console.log('\n🎯 MISSION TYPES:');
  console.log('  • Eliminate Threats - Destroy enemy ships');
  console.log('  • Resource Collection - Mine specific resources');
  console.log('  • Station Visit - Travel to space stations');
  console.log('  • Survival Challenge - Avoid damage for set time');
  console.log('  • Exploration - Reach specific coordinates');
  console.log('  • Mining Contract - Mine resources worth target credits');
  console.log('\n📖 STORY MISSIONS:');
  console.log('  • Welcome to the Void - First enemy kill');
  console.log('  • Resource Prospector - First mining experience');
  console.log('  • First Trade - Visit a space station');
  console.log('  • Pilot Training - Reach level 3');
  console.log('  • Veteran Status - Destroy 50 enemies');
  console.log('\n🎉 FEATURES:');
  console.log('  • Up to 3 random missions active at once');
  console.log('  • Mission timers (5-15 minutes for random missions)');
  console.log('  • Story missions unlock progressively');
  console.log('  • Real-time progress tracking and notifications');
  console.log('  • Mission failure for expired time limits');
  
} catch (error) {
  console.error('❌ DEPLOYMENT FAILED:', error);
  process.exit(1);
}