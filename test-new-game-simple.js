const http = require('http');
const https = require('https');
const { URL } = require('url');

async function testNewGameFlow() {
  console.log('=== Testing NEW GAME Button Flow ===\n');
  
  // Step 1: Get the main page
  console.log('1. Fetching main page...');
  try {
    const mainPageResponse = await makeRequest('http://localhost:3847');
    const html = mainPageResponse.body;
    
    // Look for NEW GAME button in HTML
    console.log('2. Analyzing page content for NEW GAME button...');
    
    const newGameMatches = html.match(/new\s+game/gi);
    const buttonMatches = html.match(/<button[^>]*>.*?new.*?game.*?<\/button>/gi) || 
                         html.match(/<input[^>]*value.*?new.*?game.*?>/gi) ||
                         html.match(/onclick.*?new.*?game/gi);
    
    console.log(   - Found  "NEW GAME" text occurrences);
    console.log(   - Found  NEW GAME button elements);
    
    if (buttonMatches) {
      console.log('   - Button elements found:');
      buttonMatches.forEach((match, i) => {
        console.log(     : ...);
      });
    }
    
    // Step 3: Look for resurrection modal references
    console.log('\n3. Checking for resurrection modal code...');
    const resurrectionMatches = html.match(/resurrection/gi);
    const modalMatches = html.match(/modal.*resurrection|resurrection.*modal/gi);
    
    console.log(   - Found  "resurrection" references);
    console.log(   - Found  resurrection modal references);
    
    // Step 4: Look for character creation elements
    console.log('\n4. Checking for character creation elements...');
    const charCreateMatches = html.match(/character.*creation|create.*character/gi);
    const nameInputMatches = html.match(/<input[^>]*name[^>]*>/gi);
    
    console.log(   - Found  character creation references);
    console.log(   - Found  name input fields);
    
    // Step 5: Try to find any JavaScript that handles NEW GAME
    console.log('\n5. Analyzing JavaScript for NEW GAME handling...');
    const jsNewGameMatches = html.match(/function.*newgame|newgame.*function|onclick.*newgame/gi);
    
    if (jsNewGameMatches) {
      console.log('   - Found NEW GAME JavaScript handlers:');
      jsNewGameMatches.forEach((match, i) => {
        console.log(     : );
      });
    } else {
      console.log('   - No obvious NEW GAME JavaScript handlers found');
    }
    
    // Summary
    console.log('\n=== ANALYSIS RESULTS ===');
    
    if (newGameMatches && newGameMatches.length > 0) {
      console.log('✅ NEW GAME button appears to be present');
    } else {
      console.log('❌ NEW GAME button not found in HTML');
    }
    
    if (resurrectionMatches && resurrectionMatches.length > 0) {
      console.log('⚠️  Resurrection code still present - may need runtime testing');
    } else {
      console.log('✅ No resurrection modal code found');
    }
    
    if (charCreateMatches && charCreateMatches.length > 0) {
      console.log('✅ Character creation elements found');
    } else {
      console.log('❌ Character creation elements not clearly identified');
    }
    
  } catch (error) {
    console.error('Error during testing:', error.message);
  }
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });
    
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error('Request timeout')));
    req.end();
  });
}

testNewGameFlow();
