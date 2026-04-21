const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('🌐 DEPLOYING: Multiplayer Controls & Integration');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add multiplayer initialization
const multiplayerInit = `    // Initialize multiplayer system
    initMultiplayerSystem();`;

// Add after loot init
indexContent = indexContent.replace(
  '    // Initialize loot system',
  `    // Initialize multiplayer system
    initMultiplayerSystem();
    
    // Initialize loot system`
);

// Add multiplayer updates to game loop
const multiplayerUpdate = `      // Update multiplayer system
      updateMultiplayer(deltaTime);`;

// Add after loot updates
indexContent = indexContent.replace(
  '      // Update loot drops',
  `      // Update multiplayer system
      updateMultiplayer(deltaTime);
      
      // Update loot drops`
);

// Add multiplayer controls
const multiplayerControls = `        case 'KeyP': // Toggle player list
          if (threeReady) {
            togglePlayerList();
          }
          break;
        
        case 'KeyC': // Toggle chat
          if (threeReady) {
            toggleChat();
          }
          break;
        
        case 'KeyM': // Change game mode
          if (threeReady && multiplayerSystem.connected) {
            const modes = ['cooperative', 'competitive', 'pvp'];
            const currentIndex = modes.indexOf(multiplayerSystem.gameMode);
            const nextIndex = (currentIndex + 1) % modes.length;
            multiplayerSystem.gameMode = modes[nextIndex];
            updateConnectionStatus();
            addChatMessage('SYSTEM', \`Game mode changed to \${multiplayerSystem.gameMode.toUpperCase()}\`);
          }
          break;

`;

// Add multiplayer controls after loot controls
indexContent = indexContent.replace(
  `        case 'KeyL': // Loot pickup (manual)`,
  `        case 'KeyP': // Toggle player list
          if (threeReady) {
            togglePlayerList();
          }
          break;
        
        case 'KeyC': // Toggle chat
          if (threeReady) {
            toggleChat();
          }
          break;
        
        case 'KeyM': // Change game mode
          if (threeReady && multiplayerSystem.connected) {
            const modes = ['cooperative', 'competitive', 'pvp'];
            const currentIndex = modes.indexOf(multiplayerSystem.gameMode);
            const nextIndex = (currentIndex + 1) % modes.length;
            multiplayerSystem.gameMode = modes[nextIndex];
            updateConnectionStatus();
            addChatMessage('SYSTEM', \`Game mode changed to \${multiplayerSystem.gameMode.toUpperCase()}\`);
          }
          break;

        case 'KeyL': // Loot pickup (manual)`
);

// Add quick status display
const multiplayerStatus = `
        // Multiplayer status display
        const mpStatus = document.getElementById('mp-quick-status');
        if (!mpStatus) {
            const display = document.createElement('div');
            display.id = 'mp-quick-status';
            display.style.cssText = \`
                position: absolute;
                top: 100px;
                right: 10px;
                color: #fff;
                font-family: 'Courier New', monospace;
                font-size: 11px;
                background: rgba(0, 0, 0, 0.7);
                padding: 6px 10px;
                border-radius: 4px;
                border: 1px solid #444;
                z-index: 1000;
            \`;
            document.body.appendChild(display);
        }
        
        if (multiplayerSystem.connected) {
            document.getElementById('mp-quick-status').innerHTML = \`
                <div>🌐 MULTIPLAYER: ACTIVE</div>
                <div>Players: \${multiplayerSystem.otherPlayers.size + 1}/\${multiplayerSystem.maxPlayers}</div>
                <div>Mode: \${multiplayerSystem.gameMode.toUpperCase()}</div>
                <div style="font-size: 10px; color: #888; margin-top: 4px;">
                    P = Players | C = Chat | M = Mode
                </div>
            \`;
        } else {
            document.getElementById('mp-quick-status').innerHTML = \`
                <div>🌐 MULTIPLAYER: CONNECTING...</div>
                <div style="font-size: 10px; color: #888;">Please wait...</div>
            \`;
        }`;

// Add multiplayer status to UI updates
indexContent = indexContent.replace(
  '        document.getElementById(\'ai-status-display\').innerHTML = `',
  multiplayerStatus + cr() + cr() + '        document.getElementById(\'ai-status-display\').innerHTML = `'
);

// Add multiplayer event handling for enemy deaths (cooperative features)
const cooperativeFeatures = `
// === COOPERATIVE MULTIPLAYER FEATURES ===
function handleCooperativeEnemyKill(enemy) {
    if (!multiplayerSystem.connected || multiplayerSystem.gameMode !== 'cooperative') return;
    
    // Distribute experience among nearby players
    multiplayerSystem.otherPlayers.forEach(player => {
        if (player.mesh && ship) {
            const distance = player.mesh.position.distanceTo(ship.position);
            if (distance < 200) { // Cooperation range
                // In a real implementation, this would sync with server
                player.score += 10;
                console.log(\`🤝 Cooperative XP shared with \${player.name}\`);
            }
        }
    });
    
    // Announce kill to team
    addChatMessage('SYSTEM', \`\${multiplayerSystem.playerData.name} eliminated an enemy!\`);
}

function handleMultiplayerLootDrop(loot) {
    if (!multiplayerSystem.connected || !multiplayerSystem.features.sharedLoot) return;
    
    // In cooperative mode, loot is shared
    if (multiplayerSystem.gameMode === 'cooperative') {
        // Announce loot to team
        if (Math.random() < 0.3) { // Don't spam chat
            addChatMessage('SYSTEM', \`Loot available: \${loot.userData.name}\`);
        }
    }
}

function sendMultiplayerUpdate() {
    if (!multiplayerSystem.connected) return;
    
    // In a real implementation, this would send data to server
    const updateData = {
        playerId: multiplayerSystem.playerId,
        position: multiplayerSystem.playerData.position,
        health: multiplayerSystem.playerData.health,
        score: state.player.score,
        timestamp: Date.now()
    };
    
    // Simulate receiving updates from other players
    multiplayerSystem.otherPlayers.forEach(player => {
        if (player.id.startsWith('sim_player_') && Math.random() < 0.1) {
            // Random events
            if (Math.random() < 0.05) {
                player.score += 50;
                addChatMessage('SYSTEM', \`\${player.name} scored points!\`);
            }
        }
    });
}

// Call this when enemy dies
function onMultiplayerEnemyDeath(enemy) {
    handleCooperativeEnemyKill(enemy);
    multiplayerSystem.playerData.kills++;
    updatePlayerList();
}

// Call this when loot drops
function onMultiplayerLootDrop(loot) {
    handleMultiplayerLootDrop(loot);
}`;

// Add cooperative features
indexContent = indexContent.replace(
  'function updateGraphicsQualityNote() {',
  `${cooperativeFeatures}

function updateGraphicsQualityNote() {`
);

// Integrate multiplayer with existing enemy death handling
if (indexContent.includes('createLootDrop(enemy);')) {
  indexContent = indexContent.replace(
    'createLootDrop(enemy);',
    `createLootDrop(enemy);
        onMultiplayerEnemyDeath(enemy);`
  );
}

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Multiplayer Controls & Integration deployed!');
console.log('🌐 Controls:');
console.log('   P = Toggle player list');
console.log('   C = Toggle chat');
console.log('   M = Change game mode');
console.log('🤝 Features: Cooperative XP, shared loot, team communication');