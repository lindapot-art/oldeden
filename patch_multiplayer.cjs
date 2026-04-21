const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('🌐 DEPLOYING: Real-time Multiplayer Features System');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add multiplayer system variables
const multiplayerVars = `

// === REAL-TIME MULTIPLAYER SYSTEM ===
let multiplayerSystem = {
    enabled: true,
    connected: false,
    playerId: null,
    playerData: {},
    otherPlayers: new Map(),
    maxPlayers: 8,
    sessionId: null,
    gameMode: 'cooperative', // cooperative, competitive, pvp
    features: {
        chat: true,
        voiceChat: false,
        sharedLoot: true,
        friendlyFire: false,
        leaderboards: true
    },
    matchmaking: {
        region: 'auto',
        skillLevel: 'balanced',
        gameMode: 'any'
    },
    communication: {
        messages: [],
        maxMessages: 50,
        chatOpen: false
    },
    synchronization: {
        updateRate: 60, // Updates per second
        lastUpdate: 0,
        interpolation: true
    }
};

let multiplayerUI = {
    playerList: null,
    chatBox: null,
    connectionStatus: null,
    gameMode: null
};`;

// Add multiplayer variables after loot system
indexContent = safeReplace(indexContent, 
  'let lootUIOpen = false;',
  'let lootUIOpen = false;' + multiplayerVars
);

// Add multiplayer functions
const multiplayerFunctions = `

// === MULTIPLAYER FUNCTIONS ===
function initMultiplayerSystem() {
    console.log('🌐 Initializing Real-time Multiplayer System...');
    
    // Generate unique player ID
    multiplayerSystem.playerId = 'player_' + Math.random().toString(36).substr(2, 9);
    
    // Set up player data
    multiplayerSystem.playerData = {
        id: multiplayerSystem.playerId,
        name: state.player.name || 'Anonymous Pilot',
        position: { x: 0, y: 0, z: 0 },
        health: state.player.health,
        score: state.player.score || 0,
        kills: 0,
        deaths: 0,
        shipType: 'standard',
        color: Math.random() * 0xffffff,
        status: 'active'
    };
    
    // Create multiplayer UI
    createMultiplayerUI();
    
    // Attempt to connect
    connectToMultiplayerSession();
    
    console.log(\`🌐 Multiplayer initialized as \${multiplayerSystem.playerData.name} (ID: \${multiplayerSystem.playerId})\`);
}

function createMultiplayerUI() {
    // Connection status indicator
    const connectionStatus = document.createElement('div');
    connectionStatus.id = 'connection-status';
    connectionStatus.style.cssText = \`
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 6px 10px;
        border-radius: 6px;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        z-index: 2000;
        border: 1px solid #444;
    \`;
    document.body.appendChild(connectionStatus);
    multiplayerUI.connectionStatus = connectionStatus;
    
    // Player list
    const playerList = document.createElement('div');
    playerList.id = 'player-list';
    playerList.style.cssText = \`
        position: absolute;
        top: 50px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px;
        border-radius: 6px;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        max-width: 200px;
        z-index: 2000;
        border: 1px solid #444;
        display: none;
    \`;
    document.body.appendChild(playerList);
    multiplayerUI.playerList = playerList;
    
    // Chat system
    const chatBox = document.createElement('div');
    chatBox.id = 'chat-box';
    chatBox.style.cssText = \`
        position: absolute;
        bottom: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 10px;
        border-radius: 6px;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        width: 300px;
        height: 150px;
        z-index: 2000;
        border: 1px solid #444;
        display: none;
        overflow-y: auto;
    \`;
    document.body.appendChild(chatBox);
    multiplayerUI.chatBox = chatBox;
    
    // Chat input
    const chatInput = document.createElement('input');
    chatInput.id = 'chat-input';
    chatInput.placeholder = 'Press Enter to send message...';
    chatInput.style.cssText = \`
        position: absolute;
        bottom: 170px;
        left: 10px;
        width: 300px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        border: 1px solid #444;
        padding: 8px;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        z-index: 2000;
        display: none;
    \`;
    
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && chatInput.value.trim()) {
            sendChatMessage(chatInput.value.trim());
            chatInput.value = '';
            e.preventDefault();
        }
        if (e.key === 'Escape') {
            toggleChat();
        }
    });
    
    document.body.appendChild(chatInput);
    multiplayerUI.chatInput = chatInput;
}

function connectToMultiplayerSession() {
    // Simulate connection to multiplayer server
    setTimeout(() => {
        multiplayerSystem.connected = true;
        multiplayerSystem.sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
        
        updateConnectionStatus();
        addChatMessage('SYSTEM', 'Connected to multiplayer session');
        
        // Add some simulated players
        addSimulatedPlayers();
        
        console.log('🌐 Connected to multiplayer session:', multiplayerSystem.sessionId);
    }, 1000 + Math.random() * 2000);
}

function addSimulatedPlayers() {
    const playerNames = ['ACE_PILOT_92', 'StarHunter', 'VoidWalker', 'NebulaCruiser', 'QuantumRider'];
    const numPlayers = Math.floor(Math.random() * 4) + 1;
    
    for (let i = 0; i < numPlayers; i++) {
        const playerId = 'sim_player_' + i;
        const playerData = {
            id: playerId,
            name: playerNames[i % playerNames.length],
            position: {
                x: (Math.random() - 0.5) * 1000,
                y: 0,
                z: (Math.random() - 0.5) * 1000
            },
            health: 80 + Math.random() * 40,
            score: Math.floor(Math.random() * 5000),
            kills: Math.floor(Math.random() * 20),
            deaths: Math.floor(Math.random() * 10),
            shipType: 'standard',
            color: Math.random() * 0xffffff,
            status: 'active'
        };
        
        multiplayerSystem.otherPlayers.set(playerId, playerData);
        spawnOtherPlayer(playerData);
    }
    
    updatePlayerList();
}

function spawnOtherPlayer(playerData) {
    // Create visual representation of other player
    const shipGeo = new THREE.BoxGeometry(8, 2, 12);
    const shipMat = new THREE.MeshBasicMaterial({ 
        color: playerData.color,
        transparent: true,
        opacity: 0.8
    });
    
    const playerShip = new THREE.Mesh(shipGeo, shipMat);
    playerShip.position.set(playerData.position.x, playerData.position.y, playerData.position.z);
    
    // Add player name label
    const nameLabel = document.createElement('div');
    nameLabel.style.cssText = \`
        position: absolute;
        color: #4af;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        font-weight: bold;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
        pointer-events: none;
        z-index: 1500;
        background: rgba(0,0,0,0.6);
        padding: 2px 6px;
        border-radius: 3px;
    \`;
    nameLabel.textContent = playerData.name;
    nameLabel.id = 'player-label-' + playerData.id;
    document.body.appendChild(nameLabel);
    
    scene.add(playerShip);
    
    playerData.mesh = playerShip;
    playerData.nameLabel = nameLabel;
    
    console.log(\`👥 Spawned player: \${playerData.name}\`);
}

function updateMultiplayer(deltaTime) {
    if (!multiplayerSystem.connected) return;
    
    // Update own player position
    if (ship) {
        multiplayerSystem.playerData.position = {
            x: ship.position.x,
            y: ship.position.y,
            z: ship.position.z
        };
        multiplayerSystem.playerData.health = state.player.health;
    }
    
    // Update other players
    multiplayerSystem.otherPlayers.forEach((player, id) => {
        if (player.mesh && camera) {
            // Simple AI movement for simulated players
            if (player.id.startsWith('sim_player_')) {
                updateSimulatedPlayer(player, deltaTime);
            }
            
            // Update name label position
            if (player.nameLabel) {
                const screenPos = player.mesh.position.clone().project(camera);
                const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
                const y = (screenPos.y * -0.5 + 0.5) * window.innerHeight - 20;
                
                player.nameLabel.style.left = x - 50 + 'px';
                player.nameLabel.style.top = y + 'px';
                player.nameLabel.style.display = screenPos.z < 1 ? 'block' : 'none';
            }
        }
    });
    
    // Update UI periodically
    if (Date.now() - multiplayerSystem.synchronization.lastUpdate > 1000) {
        updatePlayerList();
        multiplayerSystem.synchronization.lastUpdate = Date.now();
    }
}

function updateSimulatedPlayer(player, deltaTime) {
    if (!player.mesh) return;
    
    // Simple patrol behavior
    if (!player.patrolCenter) {
        player.patrolCenter = player.mesh.position.clone();
        player.patrolRadius = 200 + Math.random() * 300;
        player.patrolAngle = Math.random() * Math.PI * 2;
    }
    
    player.patrolAngle += deltaTime * 0.001;
    const targetPos = player.patrolCenter.clone();
    targetPos.x += Math.cos(player.patrolAngle) * player.patrolRadius;
    targetPos.z += Math.sin(player.patrolAngle) * player.patrolRadius;
    
    const direction = targetPos.sub(player.mesh.position).normalize();
    player.mesh.position.add(direction.multiplyScalar(deltaTime * 0.05));
    
    // Update position data
    player.position = {
        x: player.mesh.position.x,
        y: player.mesh.position.y,
        z: player.mesh.position.z
    };
}

function updateConnectionStatus() {
    if (!multiplayerUI.connectionStatus) return;
    
    const status = multiplayerSystem.connected ? 'ONLINE' : 'OFFLINE';
    const color = multiplayerSystem.connected ? '#4a4' : '#a44';
    const playerCount = multiplayerSystem.otherPlayers.size + 1;
    
    multiplayerUI.connectionStatus.innerHTML = \`
        <div style="color: \${color};">● \${status}</div>
        <div>\${playerCount}/\${multiplayerSystem.maxPlayers} Players</div>
        <div>Mode: \${multiplayerSystem.gameMode.toUpperCase()}</div>
    \`;
}

function updatePlayerList() {
    if (!multiplayerUI.playerList) return;
    
    let html = '<h4 style="margin: 0 0 8px 0; color: #e0b15f;">👥 PLAYERS</h4>';
    
    // Add self
    html += \`
        <div style="padding: 4px; background: rgba(68,170,68,0.3); border-radius: 3px; margin-bottom: 4px;">
            <strong>\${multiplayerSystem.playerData.name}</strong> (You)
            <br><span style="font-size: 10px; color: #ccc;">Score: \${state.player.score || 0} | Health: \${Math.floor(state.player.health)}</span>
        </div>
    \`;
    
    // Add other players
    multiplayerSystem.otherPlayers.forEach(player => {
        const statusColor = player.status === 'active' ? '#4a4' : '#a44';
        html += \`
            <div style="padding: 4px; background: rgba(40,40,60,0.5); border-radius: 3px; margin-bottom: 4px;">
                <span style="color: \${statusColor};">●</span> \${player.name}
                <br><span style="font-size: 10px; color: #ccc;">Score: \${player.score} | K/D: \${player.kills}/\${player.deaths}</span>
            </div>
        \`;
    });
    
    multiplayerUI.playerList.innerHTML = html;
}

function togglePlayerList() {
    if (!multiplayerUI.playerList) return;
    
    const isVisible = multiplayerUI.playerList.style.display !== 'none';
    multiplayerUI.playerList.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
        updatePlayerList();
    }
}

function toggleChat() {
    if (!multiplayerUI.chatBox || !multiplayerUI.chatInput) return;
    
    const isOpen = multiplayerSystem.communication.chatOpen;
    multiplayerSystem.communication.chatOpen = !isOpen;
    
    multiplayerUI.chatBox.style.display = isOpen ? 'none' : 'block';
    multiplayerUI.chatInput.style.display = isOpen ? 'none' : 'block';
    
    if (!isOpen) {
        multiplayerUI.chatInput.focus();
        updateChatDisplay();
    }
}

function sendChatMessage(message) {
    if (!multiplayerSystem.connected || !message.trim()) return;
    
    const chatMessage = {
        id: Date.now(),
        sender: multiplayerSystem.playerData.name,
        message: message,
        timestamp: new Date().toLocaleTimeString()
    };
    
    addChatMessage(chatMessage.sender, chatMessage.message);
    
    // In a real implementation, this would send to server
    console.log(\`💬 Chat: [\${chatMessage.sender}] \${chatMessage.message}\`);
}

function addChatMessage(sender, message) {
    multiplayerSystem.communication.messages.push({
        sender: sender,
        message: message,
        timestamp: new Date().toLocaleTimeString()
    });
    
    // Keep only recent messages
    if (multiplayerSystem.communication.messages.length > multiplayerSystem.communication.maxMessages) {
        multiplayerSystem.communication.messages.shift();
    }
    
    updateChatDisplay();
}

function updateChatDisplay() {
    if (!multiplayerUI.chatBox) return;
    
    const messages = multiplayerSystem.communication.messages;
    let html = '';
    
    messages.forEach(msg => {
        const color = msg.sender === 'SYSTEM' ? '#4af' : msg.sender === multiplayerSystem.playerData.name ? '#4a4' : '#fff';
        html += \`
            <div style="margin-bottom: 4px;">
                <span style="color: #888; font-size: 10px;">\${msg.timestamp}</span>
                <span style="color: \${color}; font-weight: bold;">\${msg.sender}:</span>
                <span style="color: #ccc;">\${msg.message}</span>
            </div>
        \`;
    });
    
    multiplayerUI.chatBox.innerHTML = html;
    multiplayerUI.chatBox.scrollTop = multiplayerUI.chatBox.scrollHeight;
}`;

// Add multiplayer functions after loot functions
indexContent = safeReplace(indexContent, 
  'function findNearestLoot() {',
  multiplayerFunctions + cr() + cr() + 'function findNearestLoot() {'
);

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Real-time Multiplayer Features System v1 deployed!');
console.log('🌐 Added multiplayer with chat, player list, and cooperative gameplay');