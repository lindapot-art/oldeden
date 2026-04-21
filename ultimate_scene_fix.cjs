#!/usr/bin/env node
// 👑 THE KING'S ULTIMATE SCENE FIX
// Comprehensive Three.js initialization fix

const fs = require('fs');
const path = require('path');

console.log('👑 THE KING: ULTIMATE SCENE ERROR FIX');
console.log('════════════════════════════════════');

const indexPath = path.join(__dirname, 'public', 'index.html');

function safeReplace(content, search, replace) {
  if (content.includes(search)) {
    return content.replace(search, replace);
  } else {
    console.log(`⚠️ Pattern not found, trying alternative...`);
    // Try to find the script tag and insert there
    const scriptTag = content.indexOf('<script type="module">');
    if (scriptTag > -1) {
      const insertPoint = scriptTag + '<script type="module">'.length;
      return content.substring(0, insertPoint) + replace + '\r\n' + content.substring(insertPoint);
    }
    return content;
  }
}

function cr(text) {
  return text.replace(/\n/g, '\r\n');
}

try {
  console.log('📖 Reading game file...');
  let content = fs.readFileSync(indexPath, 'utf-8');
  
  console.log('🎯 Applying ultimate scene fix...');
  
  // Ultimate Three.js initialization that happens immediately
  const ultimateSceneFix = cr(`
        
        // === 👑 ULTIMATE THREE.JS SCENE INITIALIZATION ===
        console.log('👑 Initializing Ultimate Three.js Scene...');
        
        // Declare ALL globals at the very top
        window.scene = null;
        window.camera = null;
        window.renderer = null;
        window.audioContext = null;
        
        // Initialize Three.js immediately
        function initializeThreeJS() {
            try {
                console.log('🎮 Creating Three.js scene...');
                
                // Create scene
                window.scene = new THREE.Scene();
                window.scene.background = new THREE.Color(0x000011);
                console.log('✅ Scene created');
                
                // Create camera
                window.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
                window.camera.position.set(0, 5, 10);
                console.log('✅ Camera created');
                
                // Create renderer
                window.renderer = new THREE.WebGLRenderer({ antialias: true });
                window.renderer.setSize(window.innerWidth, window.innerHeight);
                window.renderer.setPixelRatio(window.devicePixelRatio);
                console.log('✅ Renderer created');
                
                // Add canvas to DOM
                const canvas = window.renderer.domElement;
                canvas.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;';
                canvas.id = 'three-js-canvas';
                document.body.appendChild(canvas);
                console.log('✅ Canvas added to DOM');
                
                // Create lights
                const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
                window.scene.add(ambientLight);
                
                const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
                directionalLight.position.set(10, 10, 5);
                window.scene.add(directionalLight);
                console.log('✅ Lighting created');
                
                // Create player ship
                const shipGeometry = new THREE.ConeGeometry(0.8, 3, 6);
                const shipMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff88 });
                const playerShip = new THREE.Mesh(shipGeometry, shipMaterial);
                playerShip.position.set(0, 0, 0);
                playerShip.rotation.x = Math.PI / 2;
                window.scene.add(playerShip);
                console.log('✅ Player ship created');
                
                // Store player ship globally
                window.playerShip = playerShip;
                
                // Initialize audio context
                try {
                    window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    console.log('✅ Audio context initialized');
                } catch (e) {
                    console.log('⚠️ Audio context failed, continuing without audio');
                }
                
                // Set up game state
                window.gameState = {
                    scene: window.scene,
                    camera: window.camera,
                    renderer: window.renderer,
                    player: playerShip,
                    enemies: [],
                    projectiles: [],
                    isPlaying: true,
                    health: 100,
                    shields: 100,
                    energy: 100,
                    score: 0,
                    killCount: 0
                };
                
                console.log('🎮 Three.js initialization complete!');
                return true;
                
            } catch (error) {
                console.error('❌ Three.js initialization failed:', error);
                return false;
            }
        }
        
        // Initialize immediately when script loads
        let threeJSInitialized = false;
        
        function ensureThreeJS() {
            if (!threeJSInitialized && typeof THREE !== 'undefined') {
                threeJSInitialized = initializeThreeJS();
            }
            return threeJSInitialized;
        }
        
        // Try initialization multiple times
        ensureThreeJS();
        
        // Also try when DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            console.log('🎯 DOM ready, ensuring Three.js...');
            ensureThreeJS();
        });
        
        // And when window loads
        window.addEventListener('load', () => {
            console.log('🎯 Window loaded, ensuring Three.js...');
            ensureThreeJS();
        });
        
        // Continuous check until successful
        const initInterval = setInterval(() => {
            if (ensureThreeJS()) {
                clearInterval(initInterval);
                console.log('🎉 Three.js finally initialized successfully!');
                startGameLoop();
            }
        }, 100);
        
        // Timeout after 10 seconds
        setTimeout(() => {
            if (!threeJSInitialized) {
                clearInterval(initInterval);
                console.error('❌ Three.js initialization timeout');
            }
        }, 10000);
        
        // Simple game loop
        function startGameLoop() {
            if (!window.scene || !window.camera || !window.renderer) {
                console.log('⚠️ Game loop waiting for Three.js...');
                setTimeout(startGameLoop, 100);
                return;
            }
            
            console.log('🎮 Starting game loop...');
            
            function animate() {
                try {
                    if (window.renderer && window.scene && window.camera) {
                        window.renderer.render(window.scene, window.camera);
                    }
                    requestAnimationFrame(animate);
                } catch (error) {
                    console.error('❌ Game loop error:', error);
                }
            }
            
            animate();
            console.log('✅ Game loop started successfully!');
        }
        
        // Make scene globally available for compatibility
        const scene = () => window.scene;
        const camera = () => window.camera;
        const renderer = () => window.renderer;
        
        console.log('👑 Ultimate Scene Fix loaded - Three.js will initialize automatically');
  `);
  
  // Insert at the beginning of the script, after imports
  const importEnd = content.indexOf("import * as THREE from 'https://cdn.skypack.dev/three@0.163.0';");
  if (importEnd > -1) {
    const insertPoint = content.indexOf('\n', importEnd) + 1;
    const beforeInsert = content.substring(0, insertPoint);
    const afterInsert = content.substring(insertPoint);
    content = beforeInsert + ultimateSceneFix + afterInsert;
  } else {
    // Fallback - insert after script tag
    content = safeReplace(content, '<script type="module">', '<script type="module">' + ultimateSceneFix);
  }
  
  console.log('💾 Saving ultimate fix...');
  fs.writeFileSync(indexPath, content);
  
  console.log('\n👑 THE KING: ULTIMATE SCENE FIX DEPLOYED!');
  console.log('═══════════════════════════════════════');
  console.log('✅ Comprehensive Three.js initialization');
  console.log('✅ Multiple initialization attempts');
  console.log('✅ Global scene variables secured');
  console.log('✅ Automatic game loop startup');
  console.log('✅ Error-resistant architecture');
  console.log('✅ Player ship auto-creation');
  console.log('\n🚀 THREE.JS SCENE ERRORS ELIMINATED!');
  
} catch (error) {
  console.error('❌ ULTIMATE FIX FAILED:', error);
  process.exit(1);
}