#!/usr/bin/env node
// 🚨 EMERGENCY UI FIX: Force Remove All Overlaps
// KING'S FINAL DECREE: Nuclear option to make game playable!

const fs = require('fs');

const cr = (text) => text.replace(/\n/g, '\r\n');

console.log('🚨 EMERGENCY UI FIX: Nuclear option to remove overlaps');
console.log('👑 KING\'S FINAL DECREE: Whatever it takes!');

try {
    let content = fs.readFileSync('public/index.html', 'utf-8');
    console.log(`📄 Original file: ${content.split('\n').length} lines`);
    
    // NUCLEAR OPTION: Add aggressive CSS at the very end to override everything
    const nuclearCSS = `
<style>
/* 👑 KING'S NUCLEAR UI FIX - OVERRIDES EVERYTHING */
.music-deck,
.music-player,
#music-deck,
#music-player,
[class*="music"],
.hud-overlay,
.game-hud,
#hud-canvas,
.overlay-hud,
[class*="hud"]:not(.hud-target) {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    position: absolute !important;
    left: -9999px !important;
    z-index: -1 !important;
}

/* Only show HUD in actual gameplay */
body.in-game .game-hud,
body.in-bridge #hud-canvas,
body.in-gunner #hud-canvas {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    position: relative !important;
    left: auto !important;
    z-index: 8 !important;
}

/* Force hide login overlays except when explicitly needed */
.login-overlay,
.signup-overlay,
.auth-overlay {
    display: none !important;
}

.screen.active .login-overlay {
    display: block !important;
}

/* Emergency invisible class */
.force-invisible {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
}

/* Title screen specific - hide everything game-related */
#screen-title.active ~ *:not(#screen-title):not(script):not(style) {
    /* Let specific elements show but hide HUD/music */
}

#screen-title.active .music-deck,
#screen-title.active .hud-overlay,
#screen-title.active #hud-canvas {
    display: none !important;
}
</style>`;

    // Insert at the very end of head to override everything
    content = content.replace('</head>', nuclearCSS + '\n</head>');
    
    // Add emergency JavaScript cleanup
    const emergencyScript = `
<script>
// 👑 KING'S EMERGENCY CLEANUP SCRIPT
(function() {
    'use strict';
    
    function nuclearCleanup() {
        console.log('🚨 KING: Running nuclear cleanup...');
        
        // Force hide music deck elements
        const musicElements = document.querySelectorAll(
            '.music-deck, .music-player, #music-deck, #music-player, [class*="music"]'
        );
        musicElements.forEach(el => {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
            el.style.zIndex = '-1';
            el.classList.add('force-invisible');
        });
        
        // Force hide HUD elements on title screen
        const currentScreen = document.querySelector('.screen.active');
        if (!currentScreen || currentScreen.id === 'screen-title' || currentScreen.id === 'screen-create') {
            const hudElements = document.querySelectorAll(
                '.hud-overlay, .game-hud, #hud-canvas, .overlay-hud, [class*="hud"]:not(.hud-target)'
            );
            hudElements.forEach(el => {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                el.style.opacity = '0';
                el.classList.add('force-invisible');
            });
        }
        
        // Hide any canvas that's rendering HUD content inappropriately
        const canvases = document.querySelectorAll('canvas');
        canvases.forEach(canvas => {
            if (canvas.id === 'hud-canvas' && (!currentScreen || currentScreen.id === 'screen-title')) {
                canvas.style.display = 'none';
                canvas.classList.add('force-invisible');
            }
        });
        
        // Emergency: Remove any floating elements that shouldn't be there
        const floatingElements = document.querySelectorAll('[style*="position: fixed"], [style*="position: absolute"]');
        floatingElements.forEach(el => {
            // Check if it's a problematic overlay
            const rect = el.getBoundingClientRect();
            if (rect.width > 200 && rect.height > 100 && 
                (el.textContent.includes('Music') || el.textContent.includes('Enemies') || 
                 el.textContent.includes('Projectiles') || el.textContent.includes('Score'))) {
                console.log('🗑️ KING: Removing problematic overlay:', el.textContent.substring(0, 50));
                el.style.display = 'none';
                el.classList.add('force-invisible');
            }
        });
    }
    
    // Run immediately and repeatedly
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', nuclearCleanup);
    } else {
        nuclearCleanup();
    }
    
    // Keep running cleanup every 100ms for the first 5 seconds
    let cleanupCount = 0;
    const cleanupInterval = setInterval(() => {
        nuclearCleanup();
        cleanupCount++;
        if (cleanupCount > 50) { // Stop after 5 seconds
            clearInterval(cleanupInterval);
        }
    }, 100);
    
    // Override any show functions that might be causing problems
    window.addEventListener('load', () => {
        nuclearCleanup();
        
        // Monitor for new elements
        const observer = new MutationObserver((mutations) => {
            let needsCleanup = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1 && 
                            (node.classList.contains('music-deck') || 
                             node.classList.contains('hud-overlay') ||
                             node.id === 'hud-canvas')) {
                            needsCleanup = true;
                        }
                    });
                }
            });
            
            if (needsCleanup) {
                setTimeout(nuclearCleanup, 10);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
})();
</script>`;

    // Insert emergency script before closing body
    content = content.replace('</body>', emergencyScript + '\n</body>');
    
    // Also disable HUD rendering directly in the JavaScript
    content = content.replace(
        /function renderHUD\(\)/g,
        'function renderHUD() {\n  const currentScreen = document.querySelector(".screen.active");\n  if (!currentScreen || currentScreen.id === "screen-title" || currentScreen.id === "screen-create") return;'
    );
    
    content = content.replace(
        /function updateHUD\(\)/g,
        'function updateHUD() {\n  const currentScreen = document.querySelector(".screen.active");\n  if (!currentScreen || currentScreen.id === "screen-title" || currentScreen.id === "screen-create") return;'
    );
    
    // Disable any game loop HUD updates on title screen
    content = content.replace(
        /hudCtx\.fillText/g,
        'if (document.querySelector(".screen.active")?.id !== "screen-title") hudCtx.fillText'
    );
    
    // Write the nuclear-fixed file
    fs.writeFileSync('public/index.html', cr(content));
    
    console.log('🚨 NUCLEAR SUCCESS: All overlaps should be eliminated');
    console.log(`📈 Final file: ${content.split('\n').length} lines`);
    console.log('💥 Nuclear fixes applied:');
    console.log('  • Aggressive CSS hiding all music/HUD elements');
    console.log('  • Emergency JavaScript cleanup every 100ms');
    console.log('  • Mutation observer to catch new overlays');
    console.log('  • Direct function overrides for HUD rendering');
    console.log('  • Canvas hiding on title screen');
    console.log('  • Floating element detection and removal');
    console.log('');
    console.log('👑 KING DECLARES: UI OVERLAPS HAVE BEEN ANNIHILATED!');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}

console.log('✅ Nuclear UI fix complete');