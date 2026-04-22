const fs = require('fs');

// 🪦 IMPLEMENT DEAD BODY FLOATING IN SPACE OPENING SCENARIO
console.log('🪦 IMPLEMENTING DEAD BODY FLOATING IN SPACE OPENING...');

function safeReplace(content, search, replacement) {
  if (!content.includes(search)) {
    console.warn(`⚠️  Search string not found: ${search.substring(0, 50)}...`);
    return content;
  }
  return content.replace(search, replacement);
}

function cr(text) {
  return text.replace(/\n/g, '\r\n');
}

try {
  let html = fs.readFileSync('public/index.html', 'utf-8');
  
  // 1. REPLACE GENERIC OPENING WITH DEAD BODY SCENE
  const oldOpeningScene = `    // Basic opening scene renderer
    function renderOpeningScene() {
      if (!openingCamera || !openingScene) return;
      
      // Animate the astronaut rotation
      if (holoState.astronaut) {
        holoState.astronaut.rotation.y += 0.01;
      }
      
      openingRenderer.render(openingScene, openingCamera);
    }`;
    
  const newDeadBodyScene = `    // DEAD BODY FLOATING IN SPACE - Environmental storytelling based on rebirth count
    function renderOpeningScene() {
      if (!openingCamera || !openingScene) return;
      
      // Animate dead body floating with subtle rotation (like in space wreckage)
      if (holoState.astronaut) {
        holoState.astronaut.rotation.x += 0.003; // Slow tumbling like a corpse
        holoState.astronaut.rotation.z += 0.001;
        
        // Add slight drift movement
        holoState.astronaut.position.x += Math.sin(Date.now() * 0.0005) * 0.01;
        holoState.astronaut.position.y += Math.cos(Date.now() * 0.0003) * 0.005;
      }
      
      // Animate wreckage debris field
      if (holoState.wreckageDebris) {
        holoState.wreckageDebris.forEach((debris, i) => {
          debris.rotation.x += (0.01 + i * 0.002);
          debris.rotation.y += (0.005 + i * 0.001);
          debris.position.x += Math.sin(Date.now() * 0.0003 + i) * 0.02;
        });
      }
      
      openingRenderer.render(openingScene, openingCamera);
    }`;

  html = safeReplace(html, oldOpeningScene, cr(newDeadBodyScene));

  // 2. MODIFY OPENING SCENE INITIALIZATION TO CREATE DEAD BODY + WRECKAGE
  const oldSceneInit = `      // Create the astronaut model
      const loader = new THREE.GLTFLoader();
      loader.load('/3d/glb/astronaut.glb', (gltf) => {
        holoState.astronaut = gltf.scene;
        holoState.astronaut.scale.set(0.8, 0.8, 0.8);
        holoState.astronaut.position.set(0, 0, -5);
        openingScene.add(holoState.astronaut);
      }, undefined, (error) => {
        console.log('Could not load astronaut model, using placeholder');
        // Fallback geometry
        const geo = new THREE.BoxGeometry(1, 2, 0.5);
        const mat = new THREE.MeshBasicMaterial({ color: 0x444444 });
        holoState.astronaut = new THREE.Mesh(geo, mat);
        holoState.astronaut.position.set(0, 0, -5);
        openingScene.add(holoState.astronaut);
      });`;
      
  const newDeadBodyInit = `      // Create DEAD BODY scene based on player's rebirth count
      const rebirthCount = (state && state.character && state.character.cycle) || 0;
      
      const loader = new THREE.GLTFLoader();
      loader.load('/3d/glb/astronaut.glb', (gltf) => {
        holoState.astronaut = gltf.scene;
        holoState.astronaut.scale.set(0.8, 0.8, 0.8);
        holoState.astronaut.position.set(0, 0, -5);
        
        // Make astronaut look DEAD - no helmet light, darker materials
        holoState.astronaut.traverse((child) => {
          if (child.isMesh && child.material) {
            // Darken all materials to look lifeless
            if (child.material.emissive) child.material.emissive.setHex(0x000000);
            if (child.material.color) child.material.color.multiplyScalar(0.3);
          }
        });
        
        // Set initial tumbling rotation (like a corpse drifting)
        holoState.astronaut.rotation.set(
          Math.random() * Math.PI, 
          Math.random() * Math.PI, 
          Math.random() * Math.PI
        );
        
        openingScene.add(holoState.astronaut);
      }, undefined, (error) => {
        console.log('Could not load astronaut model, creating dead body placeholder');
        // Fallback dead body geometry
        const geo = new THREE.BoxGeometry(1, 2, 0.5);
        const mat = new THREE.MeshBasicMaterial({ 
          color: 0x222222, // Dark, lifeless color
          transparent: true,
          opacity: 0.8
        });
        holoState.astronaut = new THREE.Mesh(geo, mat);
        holoState.astronaut.position.set(0, 0, -5);
        holoState.astronaut.rotation.set(0.3, 0.7, 0.2); // Unnatural death pose
        openingScene.add(holoState.astronaut);
      });
      
      // ADD WRECKAGE DEBRIS FIELD around the dead body
      holoState.wreckageDebris = [];
      const wreckageCount = Math.min(3 + rebirthCount, 12); // More debris = more deaths
      
      for (let i = 0; i < wreckageCount; i++) {
        const debrisGeo = new THREE.BoxGeometry(
          0.2 + Math.random() * 0.8,
          0.1 + Math.random() * 0.3, 
          0.1 + Math.random() * 0.4
        );
        const debrisMat = new THREE.MeshBasicMaterial({ 
          color: new THREE.Color(0.1 + Math.random() * 0.2, 0.05, 0.05), // Dark reddish metal
          transparent: true,
          opacity: 0.6 + Math.random() * 0.3
        });
        
        const debris = new THREE.Mesh(debrisGeo, debrisMat);
        
        // Scatter debris around the corpse
        const angle = (i / wreckageCount) * Math.PI * 2;
        const radius = 3 + Math.random() * 8;
        debris.position.set(
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * 4,
          -5 + (Math.random() - 0.5) * 6
        );
        
        // Random orientations like real wreckage
        debris.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI, 
          Math.random() * Math.PI
        );
        
        openingScene.add(debris);
        holoState.wreckageDebris.push(debris);
      }`;

  html = safeReplace(html, oldSceneInit, cr(newDeadBodyInit));

  // 3. UPDATE OPENING TEXT TO MATCH THE DEAD BODY THEME
  const oldOpeningText = `        <div class="opening-text">
          <h1>OLD EDEN</h1>
          <div class="subtitle">A Space Odyssey</div>
          <div class="flavor-text">
            In the void between stars, humanity searches for meaning...
          </div>
        </div>`;
        
  const newDeadBodyText = `        <div class="opening-text">
          <h1>OLD EDEN</h1>
          <div class="subtitle">Death. Rebirth. Evolution.</div>
          <div class="flavor-text" id="death-narrative">
            Another life ends in the cold void. Another resurrection awaits...
          </div>
        </div>`;

  html = safeReplace(html, oldOpeningText, cr(newDeadBodyText));

  // 4. ADD DYNAMIC DEATH NARRATIVE BASED ON REBIRTH COUNT
  const narrativeUpdateCode = `
    // Update death narrative based on rebirth count
    function updateDeathNarrative() {
      const narrative = document.getElementById('death-narrative');
      const rebirthCount = (state && state.character && state.character.cycle) || 0;
      
      const narratives = [
        "Floating in the endless dark, your first death teaches the cruelty of space...",
        "The wreckage of your previous life drifts silently. Resurrection calls again...", 
        "Multiple corpses mark your failures. Each death brings wisdom...",
        "The debris field grows. You are becoming something more than human...",
        "Death no longer frightens you. The void is just another beginning...",
        "Ancient wreckage surrounds ancient bones. Evolution through endless death...",
        "The cosmos remembers every death. Your legend grows in blood and metal...",
        "Transcendence comes through suffering. Each corpse a stepping stone...",
        "You are death. You are rebirth. You are Old Eden's eternal cycle...",
        "The final death approaches. But in Old Eden, nothing truly ends..."
      ];
      
      const text = narratives[Math.min(rebirthCount, narratives.length - 1)];
      if (narrative) narrative.textContent = text;
    }
    
    // Call when opening scene loads
    if (typeof updateDeathNarrative === 'function') {
      setTimeout(updateDeathNarrative, 1000);
    }`;

  // Insert after the opening scene code
  const insertAfter = '    renderOpeningScene();';
  html = safeReplace(html, insertAfter, insertAfter + cr(narrativeUpdateCode));

  fs.writeFileSync('public/index.html', html);
  console.log('✅ DEAD BODY FLOATING IN SPACE OPENING IMPLEMENTED!');
  console.log('   - Dead astronaut corpse with realistic tumbling');
  console.log('   - Wreckage debris field (grows with rebirth count)');  
  console.log('   - Death narrative that evolves with player progress');
  console.log('   - Environmental storytelling tied to rebirth system');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}