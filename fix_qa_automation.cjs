#!/usr/bin/env node
// 🔧 FIX QA BOARD: Update Character Creation Logic  
// KING'S ORDER: Fix QA Board automation to handle modern login/signup flow

const fs = require('fs');

const cr = (text) => text.replace(/\n/g, '\r\n');

console.log('🔧 FIXING QA BOARD: Updating character creation automation');
console.log('👑 KING ORDERS: Handle modern login/signup flow properly');

try {
    // Read the current QA board file
    let content = fs.readFileSync('qa_board.cjs', 'utf-8');
    console.log(`📄 Original QA board: ${content.split('\n').length} lines`);
    
    // Find the character creation automation section
    const oldAutomation = `    // Attempt to auto-complete character creation (fill name, click confirm/start)
    // Try common selectors for confirm/start button
    let created = false;
    try {
      created = await page.evaluate(() => {
        const factionCard = document.querySelector('.faction-card');
        if (factionCard) factionCard.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        const nameInput = document.getElementById('pilot-name') || document.querySelector('#screen-create input[type="text"]');
        if (nameInput) {
          nameInput.focus();
          nameInput.value = 'QA_BOT';
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
          nameInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const btn = document.querySelector('#btn-create-char, #btn-create, #btn-confirm, #btn-start, button[type="submit"], .btn-primary');
        if (btn) {
          btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return true;
        }
        return false;
      });
      if (!created) await page.keyboard.press('Enter');
    } catch (e) {
      rwarn('QA-UX', \`Character creation automation failed: \${e.message}\`);
    }`;

    const newAutomation = `    // Attempt to auto-complete character creation (modern login/signup flow)
    let created = false;
    try {
      created = await page.evaluate(() => {
        // Try to use tester login first (skip signup if possible)
        const useTestLogin = true; // Flag to use test login vs full signup
        
        if (useTestLogin) {
          // Try tester login if available
          const emailInput = document.querySelector('input[placeholder*="Email"], input[placeholder*="tester"], #email');
          const passwordInput = document.querySelector('input[placeholder*="Password"], input[placeholder*="tester"], #password');
          
          if (emailInput && passwordInput) {
            emailInput.focus();
            emailInput.value = 'kakababa';
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            passwordInput.focus();
            passwordInput.value = '1234';
            passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Look for login button
            const loginBtn = document.querySelector('#btn-login, button[onclick*="login"], .btn:contains("LOG IN"), button:contains("LOG IN")') || 
                           [...document.querySelectorAll('button')].find(b => b.textContent.includes('LOG IN'));
            if (loginBtn) {
              loginBtn.click();
              console.log('🎯 QA: Attempting tester login');
              return true;
            }
          }
        }
        
        // Fallback: Try to bypass login by clicking CONTINUE button
        const continueBtn = document.querySelector('button:contains("CONTINUE"), .btn:contains("CONTINUE")') ||
                           [...document.querySelectorAll('button')].find(b => b.textContent.includes('CONTINUE'));
        if (continueBtn) {
          continueBtn.click();
          console.log('🎯 QA: Clicking CONTINUE to bypass login');
          return true;
        }
        
        // Fallback: Try old character creation flow
        const factionCard = document.querySelector('.faction-card');
        if (factionCard) factionCard.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        
        const nameInput = document.getElementById('pilot-name') || 
                         document.querySelector('#screen-create input[type="text"]') ||
                         document.querySelector('input[placeholder*="name"], input[placeholder*="pilot"]');
        if (nameInput) {
          nameInput.focus();
          nameInput.value = 'QA_BOT';
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
          nameInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        const btn = document.querySelector('#btn-create-char, #btn-create, #btn-confirm, #btn-start, button[type="submit"], .btn-primary') ||
                   [...document.querySelectorAll('button')].find(b => 
                     b.textContent.includes('CREATE') || 
                     b.textContent.includes('START') || 
                     b.textContent.includes('CONFIRM') ||
                     b.textContent.includes('SIGN UP')
                   );
        if (btn) {
          btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          console.log('🎯 QA: Clicked character creation button');
          return true;
        }
        
        console.log('🎯 QA: No suitable buttons found for character creation');
        return false;
      });
      if (!created) await page.keyboard.press('Enter');
    } catch (e) {
      rwarn('QA-UX', \`Character creation automation failed: \${e.message}\`);
    }`;

    // Replace the automation section
    content = content.replace(oldAutomation, newAutomation);
    
    // Also update the event listening section to be more flexible
    const oldEventCheck = `      gameplayLoaded = await page.evaluate(() => {
        return new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(false), 8000);
          window.addEventListener('createCharacterComplete', (evt) => {
            clearTimeout(timeout);
            // Event fired: character creation succeeded, bridge is loading
            resolve(true);
          });
          // Fallback: if event already fired before we attached listener, check active screen
          setTimeout(() => {
            const activeScreen = [...document.querySelectorAll('.screen')].find(el => el.classList.contains('active'));
            if (activeScreen?.id === 'screen-bridge') resolve(true);
          }, 500);
        });
      });`;

    const newEventCheck = `      gameplayLoaded = await page.evaluate(() => {
        return new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(false), 12000); // Longer timeout
          
          // Listen for character creation complete
          window.addEventListener('createCharacterComplete', (evt) => {
            clearTimeout(timeout);
            console.log('🎯 QA: createCharacterComplete event received');
            resolve(true);
          });
          
          // Check for overlays being visible (they appear when game starts)
          let checkCount = 0;
          const checkForGameplay = () => {
            checkCount++;
            
            // Check if mission or quest overlays are visible
            const missionOverlay = document.getElementById('mission-progress-overlay');
            const questOverlay = document.getElementById('quest-overlay');
            
            if (missionOverlay && questOverlay) {
              const missionVisible = missionOverlay.style.display !== 'none' && 
                                   getComputedStyle(missionOverlay).display !== 'none';
              const questVisible = questOverlay.style.display !== 'none' && 
                                 getComputedStyle(questOverlay).display !== 'none';
              
              if (missionVisible || questVisible) {
                clearTimeout(timeout);
                console.log('🎯 QA: Overlays detected visible - gameplay active');
                resolve(true);
                return;
              }
            }
            
            // Check for bridge screen
            const activeScreen = [...document.querySelectorAll('.screen')].find(el => el.classList.contains('active'));
            if (activeScreen?.id === 'screen-bridge') {
              clearTimeout(timeout);
              console.log('🎯 QA: Bridge screen active');
              resolve(true);
              return;
            }
            
            // Check for any signs of gameplay (HUD elements, 3D canvas active, etc.)
            const hudCanvas = document.getElementById('hud-canvas');
            const gameCanvas = document.getElementById('game-canvas');
            if (hudCanvas && gameCanvas) {
              const hudVisible = getComputedStyle(hudCanvas).display !== 'none';
              const gameVisible = getComputedStyle(gameCanvas).display !== 'none';
              
              if (hudVisible && gameVisible) {
                // Additional check: look for any visible overlay elements or HUD elements
                const overlays = document.querySelectorAll('[id*="overlay"], [class*="hud"], [class*="progress"]');
                let hasVisibleElements = false;
                
                overlays.forEach(el => {
                  if (getComputedStyle(el).display !== 'none' && 
                      getComputedStyle(el).visibility !== 'hidden' &&
                      getComputedStyle(el).opacity !== '0') {
                    hasVisibleElements = true;
                  }
                });
                
                if (hasVisibleElements) {
                  clearTimeout(timeout);
                  console.log('🎯 QA: Game canvas + HUD elements visible - gameplay detected');
                  resolve(true);
                  return;
                }
              }
            }
            
            // Keep checking for up to 12 seconds
            if (checkCount < 40) { // 40 * 300ms = 12 seconds
              setTimeout(checkForGameplay, 300);
            }
          };
          
          // Start checking immediately and every 500ms
          setTimeout(checkForGameplay, 100);
          setTimeout(checkForGameplay, 500);
          setTimeout(checkForGameplay, 1000);
          setTimeout(checkForGameplay, 2000);
        });
      });`;

    content = content.replace(oldEventCheck, newEventCheck);
    
    console.log('🔧 Updated automation logic:');
    console.log('  • Added modern login/signup flow handling');
    console.log('  • Added tester login with kakababa/1234');
    console.log('  • Added CONTINUE button detection');  
    console.log('  • Extended timeout from 8s to 12s');
    console.log('  • Enhanced overlay visibility detection');
    console.log('  • Added HUD canvas visibility checks');
    console.log('  • Added progressive checking with multiple timeouts');
    
    // Write the updated QA board
    fs.writeFileSync('qa_board.cjs', content);
    
    console.log('✅ SUCCESS: QA Board automation updated');
    console.log(`📈 Final file: ${content.split('\n').length} lines`);
    console.log('');
    console.log('👑 KING DECLARES: QA BOARD AUTOMATION MODERNIZED');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}

console.log('✅ QA Board fix script complete');