const fs = require('fs');
let f = fs.readFileSync('public/index.html', 'utf8');
let changed = false;

// 6a: Add stopEngineHum to exitGunnerMode (after stopBGM)
const old6a = '  AudioSFX.stopBGM();\r\n  if (!skipScreenChange) showScreen(\'bridge\');';
const rep6a = '  AudioSFX.stopBGM();\r\n  AudioSFX.stopEngineHum();\r\n  if (!skipScreenChange) showScreen(\'bridge\');';
if (f.includes(old6a)) { f = f.replace(old6a, rep6a); changed = true; console.log('PATCH6a APPLIED'); }
else console.log('PATCH6a FAILED');

// 6b: Add engine audio update after ship movement in game loop
const old6b = '    // Move ship\r\n    ship.position.x += fl.velocity.x * dt;\r\n    ship.position.y += fl.velocity.y * dt;\r\n    ship.position.z += fl.velocity.z * dt;';
const rep6b = '    // Move ship\r\n    ship.position.x += fl.velocity.x * dt;\r\n    ship.position.y += fl.velocity.y * dt;\r\n    ship.position.z += fl.velocity.z * dt;\r\n    // Update engine audio pitch/volume based on speed\r\n    AudioSFX.updateEngineAudio(fl.speed, maxSpd, fl.afterburner);';
if (f.includes(old6b)) { f = f.replace(old6b, rep6b); changed = true; console.log('PATCH6b APPLIED'); }
else console.log('PATCH6b FAILED');

if (changed) fs.writeFileSync('public/index.html', f);
