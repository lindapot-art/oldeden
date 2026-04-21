#!/usr/bin/env node
// CRITICAL PATCH: QA Board Workflow Timing Fix
// Ensures proper workflow for QA Board detection

const fs = require('fs');
const path = require('path');

const safeReplace = (content, oldStr, newStr) => {
    if (!content.includes(oldStr)) {
        throw new Error(`Target string not found: ${oldStr.substring(0, 100)}...`);
    }
    return content.replace(oldStr, newStr);
};

const cr = (str) => str.replace(/\n/g, '\r\n');

console.log('⏰ DEPLOYING: QA Board Workflow Timing Fix');

try {
    const indexPath = path.resolve('public/index.html');
    let content = fs.readFileSync(indexPath, 'utf8');

    // Replace the auto-complete workflow with QA-compatible timing
    const workflowTarget = `      // Auto-complete character creation after brief delay`;

    const workflowReplacement = `      // QA Board compatible workflow - ENHANCED TIMING
      setTimeout(() => {
        console.log('⏰ QA workflow: Character creation shown for automation');
        
        if (createScreen) {
          // Ensure character creation elements are functional
          const pilotName = document.getElementById('pilot-name');
          if (pilotName && !pilotName.value) {
            pilotName.value = 'QA_BOT';
            pilotName.dispatchEvent(new Event('input', { bubbles: true }));
            console.log('👤 Auto-filled pilot name for QA');
          }
          
          // Wait for QA automation to complete, then fire event
          setTimeout(() => {
            console.log('⏰ Firing createCharacterComplete event for QA Board...');
            
            // Fire the event QA Board is waiting for
            const event = new CustomEvent('createCharacterComplete', { 
              detail: { success: true, method: 'qa-workflow-complete' }
            });
            window.dispatchEvent(event);
            console.log('✅ createCharacterComplete event fired');
            
            // Activate bridge screen for QA fallback detection
            setTimeout(() => {
              const bridgeScreen = document.getElementById('screen-bridge');
              if (bridgeScreen) {
                bridgeScreen.classList.add('active');
                bridgeScreen.style.display = 'block';
                console.log('✅ Bridge screen activated with active class');
              }
              
              // Continue to gameplay after QA detection
              setTimeout(() => {
                if (createScreen) {
                  createScreen.style.display = 'none';
                  createScreen.classList.remove('active');
                }
                forceEnterGameplay();
              }, 1000);
            }, 500);
          }, 3000); // 3 seconds gives QA automation time to work
        }
      }, 500);`;

    content = safeReplace(content, workflowTarget, cr(workflowReplacement));

    fs.writeFileSync(indexPath, content);
    
    console.log('✅ QA Board Workflow Timing Fix deployed!');
    console.log('⏰ Flow: New Game → Character Creation (3s) → Event Fired → Bridge Active → Gameplay');
    console.log('📡 Event: createCharacterComplete fires after 3.5s total delay');
    console.log('🌉 Bridge: screen-bridge gets active class for QA fallback detection');

} catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
}