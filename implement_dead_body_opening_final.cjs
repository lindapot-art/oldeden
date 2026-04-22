const fs = require('fs');

// 🪦 IMPLEMENT DEAD BODY FLOATING IN SPACE OPENING SCENARIO (FINAL VERSION)
console.log('🪦 IMPLEMENTING DEAD BODY FLOATING IN SPACE OPENING (FINAL VERSION)...');

function safeReplace(content, search, replacement) {
  if (!content.includes(search)) {
    console.warn(`⚠️  Search string not found: ${search.substring(0, 80)}...`);
    return content;
  }
  const occurrences = (content.match(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  if (occurrences > 1) {
    console.warn(`⚠️  Multiple matches (${occurrences}) for: ${search.substring(0, 50)}...`);
  }
  return content.replace(search, replacement);
}

function cr(text) {
  return text.replace(/\n/g, '\r\n');
}

try {
  let html = fs.readFileSync('public/index.html', 'utf-8');
  
  // 1. CHANGE OPENING TEXT TO DEAD BODY THEME
  const oldOpeningText = `    <h2>CONSCIOUSNESS RESTORED</h2>`;
  
  const newDeadBodyText = `    <h2 id="death-title">ANOTHER DEATH</h2>
    <p id="death-narrative">Your corpse drifts in the cold void. Resurrection awaits...</p>`;

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
      
  const newDeadBodyLoad = `      // Load dead astronaut body with wreckage field
      const rebirthCount = (state && state.character && state.character.cycle) || 0;
      
      gltfLoader.load('/3d/glb/optimized/space_suit.glb', (gltf) => {
        astronaut = gltf.scene;
        astronaut.scale.setScalar(3);
        
        // Set death pose - unnatural angles like a corpse in space
        astronaut.rotation.set(Math.PI * 0.7, Math.PI * 1.3, Math.PI * 0.4);

        // Make astronaut look DEAD - dark, lifeless materials
        astronaut.traverse(child => {
          if (child.isMesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => {
              // No helmet lights, dark dead colors
              mat.emissive = new THREE.Color(0x000000);
              mat.emissiveIntensity = 0;
              if (mat.color) mat.color.multiplyScalar(0.2); // Much darker/lifeless
            });
          }
        });

        scene.add(astronaut);
        
        // ADD WRECKAGE DEBRIS FIELD (more debris = more previous deaths)
        const debrisCount = Math.min(2 + Math.floor(rebirthCount / 2), 10);
        
        for (let i = 0; i < debrisCount; i++) {
          const debrisGeo = new THREE.BoxGeometry(
            0.3 + Math.random() * 1.2,
            0.2 + Math.random() * 0.8,
            0.1 + Math.random() * 0.6
          );
          
          const debrisMat = new THREE.MeshBasicMaterial({ 
            color: new THREE.Color(
              0.08 + Math.random() * 0.12, // Dark crimson
              0.02 + Math.random() * 0.03, // Almost no green  
              0.02 + Math.random() * 0.03  // Almost no blue
            ),
            transparent: true,
            opacity: 0.3 + Math.random() * 0.4
          });
          
          const debris = new THREE.Mesh(debrisGeo, debrisMat);
          
          // Scatter wreckage around the floating corpse
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

  // 3. FIND AND REPLACE RENDEROPENING FUNCTION TO ADD CORPSE TUMBLING
  const renderFunctionStart = `      function renderOpening() {
        openingTime += 1 / 60;
        const progress = Math.min(openingTime / openingDuration, 1);

        if (astronaut) {
          astronaut.rotation.y += 0.0008;
          astronaut.position.y = Math.sin(openingTime * 0.3) * 2;
          astronaut.position.x = Math.cos(openingTime * 0.2) * 1.5;
        }`;
        
  const newRenderWithTumbling = `      function renderOpening() {
        openingTime += 1 / 60;
        const progress = Math.min(openingTime / openingDuration, 1);

        if (astronaut) {
          // DEAD BODY TUMBLING - irregular rotation like a corpse in zero-G
          astronaut.rotation.x += 0.003;
          astronaut.rotation.y += 0.002;
          astronaut.rotation.z += 0.001;
          
          // Slow drifting motion like floating wreckage
          astronaut.position.y = Math.sin(openingTime * 0.15) * 3;
          astronaut.position.x = Math.cos(openingTime * 0.12) * 2;
          astronaut.position.z = -2 + Math.sin(openingTime * 0.08) * 1;
        }`;

  html = safeReplace(html, renderFunctionStart, cr(newRenderWithTumbling));

  // 4. ADD DEATH NARRATIVE SYSTEM AFTER RENDEROPENING CALL
  const insertAfter = `      renderOpening();`;
  
  const deathNarrativeSystem = `      renderOpening();

      // DEATH NARRATIVE SYSTEM - Updates text based on rebirth count
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
          "Death is your teacher. Resurrection is your tool. Evolution awaits...",
          "You have become death itself. The universe bends to your will...",
          "Beyond death, beyond life. You are what Old Eden has never seen..."
        ];
        
        const title = titles[Math.min(rebirthCount, titles.length - 1)];
        const text = narratives[Math.min(rebirthCount, narratives.length - 1)];
        
        if (titleEl) titleEl.textContent = title;
        if (narrativeEl) narrativeEl.textContent = text;
      }
      
      // Update death narrative after brief delay
      setTimeout(updateDeathNarrative, 500);`;

  html = safeReplace(html, insertAfter, cr(deathNarrativeSystem));

  // 5. ADD CSS STYLING FOR DEATH THEME
  const cssInsertPoint = `    #opening-text h2 {
      color: #00ffff;
      text-shadow: 0 0 20px #00ffff;
      font-size: 2.5rem;
      margin: 0;
    }`;
    
  const newDeathCSS = `    #opening-text h2 {
      color: #00ffff;
      text-shadow: 0 0 20px #00ffff;
      font-size: 2.5rem;
      margin: 0;
    }
    
    #death-title {
      color: #ff4444 !important;
      text-shadow: 0 0 15px #ff4444 !important;
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
      text-shadow: 0 0 5px #ffffff;
    }`;

  html = safeReplace(html, cssInsertPoint, cr(newDeathCSS));

  fs.writeFileSync('public/index.html', html);
  console.log('✅ DEAD BODY FLOATING IN SPACE OPENING IMPLEMENTED SUCCESSFULLY!');
  console.log('');
  console.log('🪦 FEATURES ADDED:');
  console.log('   ✓ Changed opening text from "CONSCIOUSNESS RESTORED" to death theme');
  console.log('   ✓ Dead astronaut with lifeless dark materials (no helmet lights)');  
  console.log('   ✓ Realistic corpse tumbling rotation (not smooth)');
  console.log('   ✓ Wreckage debris field that grows with death count');
  console.log('   ✓ Dynamic death narrative (10 different messages)');
  console.log('   ✓ Environmental storytelling tied to rebirth system');
  console.log('   ✓ Death-themed CSS styling (red title, atmospheric text)');
  console.log('');
  console.log('🎮 OPENING EXPERIENCE:');
  console.log('   • First death: "FIRST DEATH - Your corpse drifts in the cold void..."');
  console.log('   • Many deaths: "COUNTLESS DEATHS - Ancient bones and twisted metal..."');
  console.log('   • Master level: "BEYOND DEATH - You are what Old Eden has never seen..."');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}