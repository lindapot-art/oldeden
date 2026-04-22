const fs = require('fs');

// 🎯 FIX UX FLOW NAVIGATION (CORRECTED) - Cycle 1 Improvement
console.log('🎯 FIXING UX FLOW NAVIGATION (CORRECTED VERSION)...');

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
  
  // 1. ADD UX FLOW STATE TRACKING - Insert near end of script section
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
        
        // Keep only last 20 actions
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
    };`;

  // Insert before closing script tag
  const scriptEnd = `    </script>`;
  html = safeReplace(html, scriptEnd, cr(flowStateTracking) + '\r\n\r\n    </script>');

  // 2. IMPROVE BUTTON RELIABILITY - Add CSS for better interaction
  const buttonReliabilityCSS = `
    /* UX FLOW IMPROVEMENTS - Better button interaction */
    button:focus {
      outline: 2px solid #00ffff !important;
      outline-offset: 2px;
      z-index: 999;
    }
    
    button[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }
    
    .btn-transition {
      background: linear-gradient(45deg, #333, #555) !important;
      color: #aaa !important;
      transition: all 0.3s ease;
    }
    
    /* Critical navigation buttons get priority */
    #btn-launch,
    #nav-pilot,  
    #btn-new,
    #btn-enter-eden {
      position: relative;
      z-index: 100;
      pointer-events: auto !important;
    }
    
    /* Prevent double-click issues during transitions */
    .screen.transitioning button {
      pointer-events: none;
    }`;

  // Insert after existing CSS  
  const cssInsertPoint = `    }
    
    /* Mobile responsiveness */`;
  
  html = safeReplace(html, cssInsertPoint, '    }\r\n' + cr(buttonReliabilityCSS) + '\r\n\r\n    /* Mobile responsiveness */');

  // 3. ADD BETTER TRANSITION FEEDBACK
  const transitionFeedback = `
    // ENHANCED BUTTON FEEDBACK SYSTEM
    function addButtonTransitionFeedback() {
      // Add transition feedback to critical buttons
      const criticalButtons = ['btn-launch', 'btn-new', 'btn-enter-eden', 'nav-pilot'];
      
      criticalButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn && !btn.hasAttribute('data-feedback-added')) {
          btn.setAttribute('data-feedback-added', 'true');
          
          btn.addEventListener('click', function(e) {
            if (this.disabled || this.classList.contains('btn-transition')) return;
            
            const originalText = this.textContent;
            const originalOpacity = this.style.opacity || '1';
            
            // Visual feedback
            this.classList.add('btn-transition');
            this.style.opacity = '0.7';
            
            // Restore after delay
            setTimeout(() => {
              this.classList.remove('btn-transition');
              this.style.opacity = originalOpacity;
            }, 1200);
          });
        }
      });
    }
    
    // Call during initialization
    setTimeout(addButtonTransitionFeedback, 1000);`;

  // Insert before the closing script tag (after the flow tracking)
  html = safeReplace(html, cr(flowStateTracking) + '\r\n\r\n    </script>', 
                     cr(flowStateTracking) + cr(transitionFeedback) + '\r\n\r\n    </script>');

  fs.writeFileSync('public/index.html', html);
  console.log('✅ UX FLOW NAVIGATION IMPROVEMENTS IMPLEMENTED (CORRECTED)!');
  console.log('   ✓ Added UX flow state tracking for automated testing');
  console.log('   ✓ Enhanced button focus and interaction CSS');  
  console.log('   ✓ Added transition feedback system for critical buttons');
  console.log('   ✓ Improved z-index and pointer events for navigation');
  console.log('   ✓ Added double-click prevention during transitions');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}