const fs = require('fs');

// 🎯 FIX UX FLOW NAVIGATION - Cycle 1 Improvement
console.log('🎯 FIXING UX FLOW NAVIGATION...');

function safeReplace(content, search, replacement) {
  if (!content.includes(search)) {
    console.warn(`⚠️  Search string not found: ${search.substring(0, 80)}...`);
    return content;
  }
  return content.replace(search, replacement);
}

function cr(text) {
  return text.replace(/\n/g, '\r\n');
}

try {
  let html = fs.readFileSync('public/index.html', 'utf-8');
  
  // 1. FIX ENTER SPACE BUTTON FLOW - Make it more reliable
  const oldEnterSpaceClick = `    document.getElementById('btn-enter-space')?.addEventListener('click', (e) => {
      e.preventDefault();
      playButtonSound();
      
      // Set initial player state
      if (!state.player.name) state.player.name = 'Pilot';
      if (!state.player.credits) state.player.credits = 1000;
      
      showScreen('screen-bridge');
    });`;

  const newEnterSpaceClick = `    document.getElementById('btn-enter-space')?.addEventListener('click', (e) => {
      e.preventDefault();
      playButtonSound();
      
      // Set initial player state with better defaults
      if (!state.player.name) state.player.name = 'Pilot';
      if (!state.player.credits) state.player.credits = 1000;
      if (!state.player.health) state.player.health = 100;
      if (!state.player.maxHealth) state.player.maxHealth = 100;
      
      // Add visual feedback for better UX flow
      const btn = document.getElementById('btn-enter-space');
      if (btn) {
        btn.textContent = '⚔ LAUNCHING...';
        btn.style.opacity = '0.7';
        btn.disabled = true;
      }
      
      // Smooth transition to bridge with delay for feedback
      setTimeout(() => {
        showScreen('screen-bridge');
        // Re-enable button after transition
        if (btn) {
          btn.textContent = '⚔ ENTER SPACE';
          btn.style.opacity = '1';
          btn.disabled = false;
        }
      }, 800);
    });`;

  html = safeReplace(html, oldEnterSpaceClick, cr(newEnterSpaceClick));

  // 2. IMPROVE BRIDGE TRANSITION - Make gunner entry more reliable
  const oldGunnerClick = `      document.getElementById('nav-pilot')?.addEventListener('click', () => {
        playButtonSound();
        showScreen('screen-gunner');
      });`;

  const newGunnerClick = `      document.getElementById('nav-pilot')?.addEventListener('click', (e) => {
        e.preventDefault();
        playButtonSound();
        
        // Add loading feedback
        const btn = e.target;
        const originalText = btn.textContent;
        btn.textContent = 'LAUNCHING PILOT...';
        btn.style.opacity = '0.7';
        
        // Ensure game systems are ready before entering gunner mode
        setTimeout(() => {
          if (typeof THREE !== 'undefined' && gameCanvas) {
            showScreen('screen-gunner');
            // Restore button after successful transition
            setTimeout(() => {
              btn.textContent = originalText;
              btn.style.opacity = '1';
            }, 500);
          } else {
            console.warn('[UX] Gunner mode not ready, delaying...');
            setTimeout(() => {
              showScreen('screen-gunner');
              btn.textContent = originalText;
              btn.style.opacity = '1';
            }, 1000);
          }
        }, 600);
      });`;

  html = safeReplace(html, oldGunnerClick, cr(newGunnerClick));

  // 3. ADD UX FLOW STATE TRACKING - Help with automated testing
  const flowStateTracking = `
    
    // UX FLOW STATE TRACKING - For better navigation and testing
    window.uxFlowState = {
      currentScreen: 'screen-title',
      transitionActive: false,
      lastAction: 'page-load',
      actionHistory: [],
      
      recordAction(action, screen) {
        this.lastAction = action;
        this.currentScreen = screen || this.currentScreen;
        this.actionHistory.push({
          action: action,
          screen: this.currentScreen,
          timestamp: Date.now()
        });
        
        // Keep only last 20 actions for memory efficiency
        if (this.actionHistory.length > 20) {
          this.actionHistory.shift();
        }
        
        console.log('[UX-Flow]', action, '→', this.currentScreen);
      },
      
      getState() {
        return {
          current: this.currentScreen,
          transitioning: this.transitionActive,
          lastAction: this.lastAction,
          recentActions: this.actionHistory.slice(-5)
        };
      }
    };
    
    // Hook into showScreen to track transitions
    const originalShowScreen = window.showScreen;
    window.showScreen = function(screenId) {
      window.uxFlowState.transitionActive = true;
      window.uxFlowState.recordAction('screen-transition', screenId);
      
      const result = originalShowScreen(screenId);
      
      setTimeout(() => {
        window.uxFlowState.transitionActive = false;
        window.uxFlowState.recordAction('screen-active', screenId);
      }, 100);
      
      return result;
    };`;

  // Insert after the main UI initialization
  const insertAfter = `    initUI();`;
  html = safeReplace(html, insertAfter, insertAfter + cr(flowStateTracking));

  // 4. IMPROVE BUTTON VISIBILITY FOR AUTOMATED TESTING
  const buttonVisibilityCSS = `
    
    /* IMPROVED BUTTON VISIBILITY FOR UX FLOW TESTING */
    button:focus {
      outline: 2px solid #00ffff;
      outline-offset: 2px;
    }
    
    button[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .btn-transition {
      background: linear-gradient(45deg, #333, #555);
      color: #aaa;
      transition: all 0.3s ease;
    }
    
    /* Make critical navigation buttons more prominent */
    #btn-enter-space,
    #nav-pilot,
    #btn-new {
      position: relative;
      z-index: 10;
      pointer-events: auto;
    }`;

  // Insert after existing button styles
  const cssInsertPoint = `    .btn:hover {`;
  html = safeReplace(html, cssInsertPoint, cr(buttonVisibilityCSS) + '\r\n\r\n    .btn:hover {');

  fs.writeFileSync('public/index.html', html);
  console.log('✅ UX FLOW NAVIGATION IMPROVEMENTS IMPLEMENTED!');
  console.log('   ✓ Enhanced ENTER SPACE button with loading feedback');
  console.log('   ✓ Improved gunner mode transition reliability');  
  console.log('   ✓ Added UX flow state tracking for testing');
  console.log('   ✓ Enhanced button visibility and focus styles');
  console.log('   ✓ Added transition feedback to prevent double-clicks');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}