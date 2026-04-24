const http = require('http');
const fs = require('fs');
const report = [];
function log(msg) { report.push(msg); console.log(msg); }
async function headReq(url) {
  return new Promise((resolve) => {
    const req = http.request(url, {method:'HEAD',timeout:5000}, (res) => resolve(res.statusCode));
    req.on('error', () => resolve(0));
    req.on('timeout', () => { req.destroy(); resolve(0); });
    req.end();
  });
}
async function main() {
  log('=== PHASE 2: GLB ASSET SERVING ===');
  const assets = ['cyborg_ship','station_a','space_whale','iron_sentinel','dread_carrier','void_scout','demon_battleship','alien_battleship','cargo_shuttle','shuttle','fighter_alpha','fighter_beta','blaster_turret','terra_cruiser','phantom_interceptor','nebula_freighter','crystal_corvette','solar_destroyer'];
  let pass=0, fail=0;
  for (const a of assets) {
    const code = await headReq('http://localhost:3000/3d/glb/optimized/'+a+'.glb');
    if (code === 200) { pass++; log('OK: '+a); } else { fail++; log('FAIL: '+a+' (status='+code+')'); }
  }
  log('GLB Assets: '+pass+' PASS, '+fail+' FAIL');
  log('');
  log('=== PHASE 3: CODE INTEGRITY ===');
  const html = fs.readFileSync('D:/antiruscist/oldeden/public/index.html','utf8');
  log('DRACOLoader refs: '+(html.match(/DRACOLoader/g)||[]).length);
  const ob = (html.match(/\{/g)||[]).length;
  const cb = (html.match(/\}/g)||[]).length;
  log('Braces: open='+ob+' close='+cb+' balanced='+(ob===cb));
  const stale = (html.match(/n\.mesh|MAX_YAW|MAX_PITCH/g)||[]).length;
  log('Stale refs (n.mesh/MAX_YAW/MAX_PITCH): '+stale+(stale===0?' PASS':' FAIL'));
  log('Ukraine refs: '+(html.match(/ukraine|Ukraine/gi||[]).length));
  log('Soul Fracture refs: '+(html.match(/soulFragment|createSoulFragment|resonanceBonus|legacyChain|SOUL_MILESTONES|edenTokens/g)||[]).length);
  log('');
  log('=== PHASE 4: RUNTIME FUNCTION VALIDATION ===');
  const funcs = ['createSoulFragment','fuseFragments','checkAndClaimMilestones','renderFragmentGallery','renderResonancePanel','renderLegacyChain','renderMilestoneList','updateRebirthScreen','spawnShipLibrary','replaceShipWithGLB','updateAutopilot','renderLibraryLabels','updateLibraryRotation'];
  for (const fn of funcs) {
    const re = new RegExp('function\\s+'+fn,'g');
    const m = (html.match(re)||[]).length;
    log((m>0?'PASS':'FAIL')+': function '+fn+(m>0?' ('+m+')':' NOT found'));
  }
  fs.writeFileSync('D:/antiruscist/oldeden/qa_report.txt', report.join('\n'));
  log(''); log('Report saved to qa_report.txt');
}
main();
