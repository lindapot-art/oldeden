const fs = require('fs');

// 🪦 IMPLEMENT DEAD BODY FLOATING IN SPACE OPENING SCENARIO
console.log('🪦 IMPLEMENTING DEAD BODY FLOATING IN SPACE OPENING (CORRECT VERSION)...');

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
  
  // 1. CHANGE OPENING TEXT TO DEAD BODY THEME
  const oldOpeningText = `  <div id="opening-text">
    <h2>CONSCIOUSNESS RESTORED</h2>
  </div>`;
  
  const newDeadBodyText = `  <div id="opening-text">
    <h2 id="death-title">ANOTHER DEATH</h2>
    <p id="death-narrative">Your corpse drifts in the cold void. Resurrection awaits...</p>
  </div>`;

  html = safeReplace(html, oldOpeningText, cr(newDeadBodyText));

  // 2. REPLACE ASTRONAUT LOADING WITH DEAD BODY VERSION
  const oldAstronautLoad = `      gltfLoader.load('/3d/glb/optimized/space_suit.glb', (gltf) => {
        astronaut = gltf.scene;
        astronaut.scale.setScalar(3);
        astronaut.rotation.set(Math.PI * 0.1, Math.PI * 0.3, 0);

        astronaut.traverse(child => {
          if (child.isMesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => {
              mat.emissive = new THREE.Color(0x1a2a4a);
              mat.emissiveIntensity = 0.1;
            });
          }
        });

        scene.add(astronaut);
      }, undefined, (e) => {
        console.warn('[Opening] Could not load space_suit.glb:', e);
      });`;
      
  const newDeadBodyLoad = `      // Load dead astronaut body with wreckage
      const rebirthCount = (state && state.character && state.character.cycle) || 0;
      
      gltfLoader.load('/3d/glb/optimized/space_suit.glb', (gltf) => {
        astronaut = gltf.scene;
        astronaut.scale.setScalar(3);
        
        // Set death pose - unnatural angles like a corpse
        astronaut.rotation.set(Math.PI * 0.7, Math.PI * 1.3, Math.PI * 0.4);

        // Make astronaut look DEAD - dark, lifeless materials
        astronaut.traverse(child => {
          if (child.isMesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => {
              // No helmet lights, very dark colors
              mat.emissive = new THREE.Color(0x000000);
              mat.emissiveIntensity = 0;
              if (mat.color) mat.color.multiplyScalar(0.2); // Much darker
            });
          }
        });

        scene.add(astronaut);
        
        // ADD WRECKAGE DEBRIS FIELD around corpse (more debris = more deaths)
        const debrisCount = Math.min(2 + Math.floor(rebirthCount / 2), 8);
        
        for (let i = 0; i < debrisCount; i++) {
          const debrisGeo = new THREE.BoxGeometry(
            0.3 + Math.random() * 1.2,
            0.2 + Math.random() * 0.8,
            0.1 + Math.random() * 0.6
          );
          
          const debrisMat = new THREE.MeshBasicMaterial({ 
            color: new THREE.Color(
              0.1 + Math.random() * 0.15, // Dark red
              0.02 + Math.random() * 0.05, // Minimal green  
              0.02 + Math.random() * 0.05  // Minimal blue
            ),
            transparent: true,
            opacity: 0.4 + Math.random() * 0.4
          });
          
          const debris = new THREE.Mesh(debrisGeo, debrisMat);
          
          // Scatter around the dead body
          const angle = (i / debrisCount) * Math.PI * 2;
          const radius = 8 + Math.random() * 15;
          debris.position.set(
            Math.cos(angle) * radius,
            (Math.random() - 0.5) * 8,
            -5 + (Math.random() - 0.5) * 12
          );
          
          // Random death-like orientations
          debris.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
          );
          
          scene.add(debris);
        }
      }, undefined, (e) => {
        console.warn('[Opening] Could not load space_suit.glb:', e);
      });`;

  html = safeReplace(html, oldAstronautLoad, cr(newDeadBodyLoad));

  // 3. REPLACE SMOOTH ROTATION WITH DEAD BODY TUMBLING
  const oldRotation = `        if (astronaut) {
          astronaut.rotation.y += 0.0008;
          astronaut.position.y = Math.sin(openingTime * 0.3) * 2;
          astronaut.position.x = Math.cos(openingTime * 0.2) * 1.5;
        }`;
        
  const newDeadTumbling = `        if (astronaut) {
          // Corpse tumbling motion - irregular like real zero-G death
          astronaut.rotation.x += 0.003;
          astronaut.rotation.y += 0.002;
          astronaut.rotation.z += 0.001;
          
          // Slow drifting motion like floating wreckage
          astronaut.position.y = Math.sin(openingTime * 0.15) * 3;
          astronaut.position.x = Math.cos(openingTime * 0.12) * 2;
          astronaut.position.z = -2 + Math.sin(openingTime * 0.08) * 1;
        }`;

  html = safeReplace(html, oldRotation, cr(newDeadTumbling));

  // 4. ADD DYNAMIC DEATH NARRATIVE SYSTEM
  const narrativeSystem = `
    
    // UPDATE DEATH NARRATIVE based on rebirth count
    function updateDeathNarrative() {
      const titleEl = document.getElementById('death-title');
      const narrativeEl = document.getElementById('death-narrative');
      const rebirthCount = (state && state.character && state.character.cycle) || 0;
      
      const titles = [
        "FIRST DEATH", "SECOND DEATH", "THIRD DEATH", "MANY DEATHS", 
        "COUNTLESS DEATHS", "DEATH INCARNATE", "ETERNAL DEATH", 
        "TRANSCENDENT DEATH", "DEATH MASTERED", "BEYOND DEATH"
      ];
      
      const narratives = [
        "Your corpse drifts in the cold void. The first taste of space's cruelty...",
        "Another body joins the wreckage. Death is becoming familiar...",
        "The debris field grows. Your failures accumulate in metal and bone...",
        "Multiple corpses mark your struggles. Each death teaches harsh lessons...",
        "Death no longer surprises you. The void is just another battlefield...",
        "Ancient bones and twisted metal. You are learning to master mortality...",
        "The cosmos remembers every death. Your legend grows in blood and stars...",
        "Death is your teacher. Resurrection is your tool. Evolution is your goal...",
        "You have become death itself. The universe bends to your will...",
        "Beyond death, beyond life. You are something Old Eden has never seen..."
      ];
      
      const title = titles[Math.min(rebirthCount, titles.length - 1)];
      const text = narratives[Math.min(rebirthCount, narratives.length - 1)];
      
      if (titleEl) titleEl.textContent = title;
      if (narrativeEl) narrativeEl.textContent = text;
    }
    
    // Update narrative when opening scene starts
    setTimeout(() => {
      if (typeof updateDeathNarrative === 'function') {
        updateDeathNarrative();
      }
    }, 500);`;

  // Insert after the renderOpening function
  const insertAfter = '      renderOpening();';
  html = safeReplace(html, insertAfter, insertAfter + cr(narrativeSystem));

  // 5. ADD DEATH NARRATIVE CSS STYLING
  const deathNarrativeCSS = `
    
    #death-title {
      color: #ff4444;
      text-shadow: 0 0 10px #ff4444;
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }
    
    #death-narrative {
      color: #cccccc;
      font-size: 1.1rem;
      line-height: 1.4;
      max-width: 600px;
      margin: 0 auto;
      text-align: center;
      opacity: 0.9;
    }`;

  // Insert after opening-text styles
  const cssInsertAfter = '    #opening-text h2 {';
  const cssInsertBefore = html.indexOf(cssInsertAfter);
  if (cssInsertBefore !== -1) {
    const beforeCss = html.substring(0, cssInsertBefore);
    const afterCss = html.substring(cssInsertBefore);
    html = beforeCss + cr(deathNarrativeCSS) + '\r\n\r\n    ' + afterCss;
  }

  fs.writeFileSync('public/index.html', html);
  console.log('✅ DEAD BODY FLOATING IN SPACE OPENING FULLY IMPLEMENTED!');
  console.log('   - Changed "CONSCIOUSNESS RESTORED" → "FIRST DEATH" / "MANY DEATHS" etc');
  console.log('   - Dead astronaut with dark lifeless materials');  
  console.log('   - Realistic corpse tumbling (not smooth rotation)');
  console.log('   - Wreckage debris field that grows with rebirth count');
  console.log('   - Death narrative system (10 different messages by death count)');
  console.log('   - Environmental storytelling tied to player progression');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}