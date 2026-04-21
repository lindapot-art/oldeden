// SPACE TRADING SYSTEM

const fs = require('fs');

function cr(text) {
  return text.replace(/\n/g, '\r\n');
}

function safeReplace(content, searchStr, replaceStr, context = '') {
  const searchNormalized = searchStr.replace(/\r?\n/g, '\r\n');
  const replaceNormalized = replaceStr.replace(/\r?\n/g, '\r\n');
  
  if (!content.includes(searchNormalized)) {
    throw new Error(`Pattern not found in ${context}: "${searchStr.substring(0, 50)}..."`);
  }
  
  const newContent = content.replace(searchNormalized, replaceNormalized);
  if (newContent === content) {
    throw new Error(`No changes made in ${context}`);
  }
  
  return newContent;
}

console.log('💰 Implementing Space Trading System...');

try {
  let html = fs.readFileSync('public/index.html', 'utf8');
  console.log('✅ Loaded index.html');

  // Add space trading keybindings
  const keybindPattern = `  else if (key === 'r' || key === 'R') { showFactionRelations(); }
  // Consumables`;
  
  const tradingKeybinds = cr(`  else if (key === 'r' || key === 'R') { showFactionRelations(); }
  // ═══ SPACE TRADING ═══
  else if (key === 'o' || key === 'O') { showTradingInterface(); }
  else if (key === 'm' || key === 'M') { showMarketAnalysis(); }
  // Consumables`);
  
  html = safeReplace(html, keybindPattern, tradingKeybinds, 'space trading keybindings');
  console.log('✅ Added space trading keybindings (O=trade, M=market)');

  // Add trading system functions before faction system
  const functionInsertionPoint = html.indexOf('// ═══ FACTION WARFARE SYSTEM ═══');
  
  const tradingFunctions = cr(`
// ═══ SPACE TRADING SYSTEM ═══

const TradingSystem = {
  // Trade goods definitions
  goods: {
    'ore': {
      name: 'Refined Ore',
      basePrice: 45,
      category: 'minerals',
      volatility: 0.3,
      description: 'Essential building material'
    },
    'crystals': {
      name: 'Energy Crystals',
      basePrice: 120,
      category: 'energy',
      volatility: 0.5,
      description: 'Power ship systems'
    },
    'nanobots': {
      name: 'Repair Nanobots',
      basePrice: 85,
      category: 'tech',
      volatility: 0.4,
      description: 'Automated repair systems'
    },
    'medicine': {
      name: 'Medical Supplies',
      basePrice: 95,
      category: 'bio',
      volatility: 0.2,
      description: 'Life support essentials'
    },
    'weapons': {
      name: 'Weapon Parts',
      basePrice: 150,
      category: 'military',
      volatility: 0.6,
      description: 'Combat system components'
    },
    'luxury': {
      name: 'Luxury Goods',
      basePrice: 200,
      category: 'luxury',
      volatility: 0.4,
      description: 'High-end consumer products'
    },
    'data': {
      name: 'Data Cores',
      basePrice: 75,
      category: 'info',
      volatility: 0.3,
      description: 'Encrypted information'
    },
    'food': {
      name: 'Food Rations',
      basePrice: 35,
      category: 'consumables',
      volatility: 0.2,
      description: 'Preserved nutrition'
    }
  },
  
  // Trading stations in different sectors
  stations: {
    'central_hub': {
      name: 'Central Trade Hub',
      location: { x: 0, z: 0 },
      faction: 'merchant_guild',
      specializes: ['luxury', 'data', 'weapons'],
      size: 'large'
    },
    'mining_outpost': {
      name: 'Mining Outpost Alpha',
      location: { x: -150, z: -200 },
      faction: 'terran_federation',
      specializes: ['ore', 'nanobots'],
      size: 'medium'
    },
    'void_station': {
      name: 'Void Research Station',
      location: { x: 50, z: -280 },
      faction: 'void_cultists',
      specializes: ['crystals', 'data'],
      size: 'small'
    },
    'shadow_port': {
      name: 'Shadow Port',
      location: { x: 180, z: 150 },
      faction: 'shadow_collective',
      specializes: ['weapons', 'medicine'],
      size: 'medium'
    },
    'agri_platform': {
      name: 'Agricultural Platform',
      location: { x: -80, z: 120 },
      faction: 'merchant_guild',
      specializes: ['food', 'medicine'],
      size: 'small'
    }
  },
  
  // Current market prices (fluctuate over time)
  currentPrices: {},
  
  // Player cargo hold
  cargoHold: {
    capacity: 50,
    current: {},
    
    // Get total cargo volume
    getUsedCapacity() {
      let total = 0;
      for (const [good, amount] of Object.entries(this.current)) {
        total += amount;
      }
      return total;
    },
    
    // Check if can add cargo
    canAdd(good, amount) {
      return this.getUsedCapacity() + amount <= this.capacity;
    },
    
    // Add cargo
    add(good, amount) {
      if (!this.canAdd(good, amount)) return false;
      this.current[good] = (this.current[good] || 0) + amount;
      return true;
    },
    
    // Remove cargo
    remove(good, amount) {
      if (!this.current[good] || this.current[good] < amount) return false;
      this.current[good] -= amount;
      if (this.current[good] === 0) delete this.current[good];
      return true;
    }
  },
  
  // Initialize market prices
  initializePrices() {
    for (const [goodId, good] of Object.entries(this.goods)) {
      this.currentPrices[goodId] = good.basePrice;
    }
  },
  
  // Update market prices based on time and events
  updateMarket() {
    const now = Date.now();
    
    for (const [goodId, good] of Object.entries(this.goods)) {
      // Random price fluctuation
      const fluctuation = (Math.random() - 0.5) * good.volatility * 0.1;
      const newPrice = this.currentPrices[goodId] * (1 + fluctuation);
      
      // Keep prices within reasonable bounds (20% to 300% of base)
      this.currentPrices[goodId] = Math.max(
        good.basePrice * 0.2,
        Math.min(good.basePrice * 3.0, newPrice)
      );
    }
  },
  
  // Get nearest trading station
  getNearestStation(position) {
    let nearest = null;
    let nearestDistance = Infinity;
    
    for (const [stationId, station] of Object.entries(this.stations)) {
      const distance = Math.sqrt(
        Math.pow(position.x - station.location.x, 2) +
        Math.pow(position.z - station.location.z, 2)
      );
      
      if (distance < nearestDistance) {
        nearest = { id: stationId, ...station, distance };
        nearestDistance = distance;
      }
    }
    
    return nearest;
  },
  
  // Check if player is at a trading station
  isAtTradingStation(position, range = 50) {
    const nearest = this.getNearestStation(position);
    return nearest && nearest.distance <= range ? nearest : null;
  },
  
  // Get station-specific price modifier
  getStationPriceModifier(station, good) {
    let modifier = 1.0;
    
    // Stations pay more for goods they specialize in
    if (station.specializes.includes(good)) {
      modifier = 1.2;
    }
    
    // Faction reputation affects prices
    if (station.faction && FactionSystem && FactionSystem.reputation[station.faction]) {
      const rep = FactionSystem.reputation[station.faction];
      modifier *= (1.0 + (rep / 1000)); // +/- 10% based on faction standing
    }
    
    // Station size affects variety and prices
    switch (station.size) {
      case 'large': modifier *= 1.1; break;
      case 'small': modifier *= 0.9; break;
    }
    
    return modifier;
  },
  
  // Buy goods from station
  buyGood(goodId, amount, station) {
    const good = this.goods[goodId];
    if (!good) return { success: false, reason: 'Unknown good' };
    
    const basePrice = this.currentPrices[goodId];
    const modifier = this.getStationPriceModifier(station, goodId);
    const totalPrice = Math.floor(basePrice * modifier * amount);
    
    // Check if player has enough credits
    if (c.credits < totalPrice) {
      return { success: false, reason: 'Insufficient credits' };
    }
    
    // Check cargo capacity
    if (!this.cargoHold.canAdd(goodId, amount)) {
      return { success: false, reason: 'Insufficient cargo space' };
    }
    
    // Complete transaction
    c.credits -= totalPrice;
    this.cargoHold.add(goodId, amount);
    
    addComms('TRADE', \`Bought \${amount}x \${good.name} for \${totalPrice} credits\`);
    
    return { success: true, price: totalPrice };
  },
  
  // Sell goods to station
  sellGood(goodId, amount, station) {
    const good = this.goods[goodId];
    if (!good) return { success: false, reason: 'Unknown good' };
    
    // Check if player has the goods
    if (!this.cargoHold.current[goodId] || this.cargoHold.current[goodId] < amount) {
      return { success: false, reason: 'Insufficient cargo' };
    }
    
    const basePrice = this.currentPrices[goodId];
    const modifier = this.getStationPriceModifier(station, goodId) * 0.85; // Stations buy at 85% of sell price
    const totalPrice = Math.floor(basePrice * modifier * amount);
    
    // Complete transaction
    this.cargoHold.remove(goodId, amount);
    c.credits += totalPrice;
    
    addComms('TRADE', \`Sold \${amount}x \${good.name} for \${totalPrice} credits\`);
    
    // Faction reputation bonus for trading
    if (station.faction && FactionSystem) {
      FactionSystem.modifyReputation(station.faction, Math.floor(amount / 5), 'Trade agreement');
    }
    
    return { success: true, price: totalPrice };
  },
  
  // Generate random cargo drops
  generateTradeDrop(position) {
    // 5% chance for trade goods drop
    if (Math.random() < 0.05) {
      const goodIds = Object.keys(this.goods);
      const randomGood = goodIds[Math.floor(Math.random() * goodIds.length)];
      const amount = 1 + Math.floor(Math.random() * 3);
      
      // Add to loot system
      if (c.loot) {
        c.loot.push({
          type: 'trade_good',
          good: randomGood,
          amount: amount,
          px: position.x + (Math.random() - 0.5) * 20,
          py: position.y,
          pz: position.z + (Math.random() - 0.5) * 20,
          age: 0,
          maxAge: 30000
        });
        
        addComms('TRADE', \`Trade cargo detected: \${amount}x \${this.goods[randomGood].name}\`);
      }
    }
  }
};

function showTradingInterface() {
  const station = TradingSystem.isAtTradingStation(ship.position);
  
  if (!station) {
    addComms('TRADE', 'No trading station in range');
    const nearest = TradingSystem.getNearestStation(ship.position);
    if (nearest) {
      addComms('NAVIGATION', \`Nearest: \${nearest.name} (\${nearest.distance.toFixed(0)}m)\`);
    }
    return;
  }
  
  addComms('TRADE', \`═══ \${station.name.toUpperCase()} ═══\`);
  addComms('FACTION', \`Controlled by: \${FactionSystem.factions[station.faction].shortName}\`);
  addComms('SPECIALIZES', \`Specializes: \${station.specializes.map(s => TradingSystem.goods[s].name).join(', ')}\`);
  
  // Show available goods and prices
  addComms('MARKET', '─── MARKET PRICES ───');
  
  for (const goodId of station.specializes) {
    const good = TradingSystem.goods[goodId];
    const basePrice = TradingSystem.currentPrices[goodId];
    const modifier = TradingSystem.getStationPriceModifier(station, goodId);
    const buyPrice = Math.floor(basePrice * modifier);
    const sellPrice = Math.floor(basePrice * modifier * 0.85);
    
    addComms('PRICE', \`\${good.name}: Buy \${buyPrice}cr | Sell \${sellPrice}cr\`);
  }
  
  // Show cargo hold status
  const cargo = TradingSystem.cargoHold;
  const usedCapacity = cargo.getUsedCapacity();
  addComms('CARGO', \`─── CARGO HOLD (\${usedCapacity}/\${cargo.capacity}) ───\`);
  
  for (const [goodId, amount] of Object.entries(cargo.current)) {
    const good = TradingSystem.goods[goodId];
    addComms('INVENTORY', \`\${good.name}: \${amount} units\`);
  }
  
  c.dmgNumbers.push({
    text: \`💰 \${station.name}\`,
    px: ship.position.x,
    py: ship.position.y + 20,
    pz: ship.position.z,
    age: 0,
    color: '#00ff80',
    scale: 1.4
  });
}

function showMarketAnalysis() {
  addComms('MARKET', '═══ MARKET ANALYSIS ═══');
  
  const sortedGoods = Object.entries(TradingSystem.goods).sort((a, b) => 
    TradingSystem.currentPrices[b[0]] - TradingSystem.currentPrices[a[0]]
  );
  
  for (const [goodId, good] of sortedGoods) {
    const currentPrice = TradingSystem.currentPrices[goodId];
    const basePrice = good.basePrice;
    const priceChange = ((currentPrice - basePrice) / basePrice * 100).toFixed(0);
    const trend = priceChange > 0 ? '📈' : priceChange < 0 ? '📉' : '➡️';
    
    addComms('COMMODITY', \`\${good.name}: \${currentPrice}cr (\${trend}\${priceChange}%)\`);
  }
  
  // Show profitable trade routes
  const currentStation = TradingSystem.isAtTradingStation(ship.position);
  if (currentStation) {
    addComms('ROUTES', '─── TRADE OPPORTUNITIES ───');
    
    for (const [stationId, station] of Object.entries(TradingSystem.stations)) {
      if (stationId === currentStation.id) continue;
      
      for (const goodId of station.specializes) {
        const good = TradingSystem.goods[goodId];
        const sellPrice = Math.floor(TradingSystem.currentPrices[goodId] * 
          TradingSystem.getStationPriceModifier(station, goodId) * 0.85);
        const buyPrice = Math.floor(TradingSystem.currentPrices[goodId] * 
          TradingSystem.getStationPriceModifier(currentStation, goodId));
        
        const profit = sellPrice - buyPrice;
        if (profit > 10) {
          const distance = Math.sqrt(
            Math.pow(currentStation.location.x - station.location.x, 2) +
            Math.pow(currentStation.location.z - station.location.z, 2)
          );
          
          addComms('OPPORTUNITY', \`\${good.name} → \${station.name}: +\${profit}cr (\${distance.toFixed(0)}m)\`);
        }
      }
    }
  }
  
  c.dmgNumbers.push({
    text: '📊 MARKET ANALYSIS',
    px: ship.position.x,
    py: ship.position.y + 15,
    pz: ship.position.z,
    age: 0,
    color: '#ffaa00',
    scale: 1.2
  });
}

function updateTradingSystem(dtMs) {
  // Update market prices every 30 seconds
  if (!TradingSystem._lastUpdate) TradingSystem._lastUpdate = 0;
  
  if (Date.now() - TradingSystem._lastUpdate > 30000) {
    TradingSystem.updateMarket();
    TradingSystem._lastUpdate = Date.now();
  }
  
  // Check for station proximity notifications
  const nearestStation = TradingSystem.getNearestStation(ship.position);
  if (nearestStation && nearestStation.distance < 100) {
    if (!TradingSystem._lastStationNotification || 
        TradingSystem._lastStationNotification !== nearestStation.id) {
      
      addComms('NAVIGATION', \`Approaching \${nearestStation.name}\`);
      
      c.dmgNumbers.push({
        text: \`🏪 \${nearestStation.name}\`,
        px: ship.position.x,
        py: ship.position.y + 8,
        pz: ship.position.z,
        age: 0,
        color: '#00ffaa',
        scale: 1.0
      });
      
      TradingSystem._lastStationNotification = nearestStation.id;
    }
  } else {
    TradingSystem._lastStationNotification = null;
  }
}

// Initialize trading system
TradingSystem.initializePrices();

`);
  
  html = html.slice(0, functionInsertionPoint) + tradingFunctions + cr('\n') + html.slice(functionInsertionPoint);
  console.log('✅ Added space trading system');

  // Add trading update to game loop
  const gameLoopPattern = `      updateFactionSystem(dtMs);
      updateParticleSystem(dtMs);`;
      
  const gameLoopWithTrading = cr(`      updateFactionSystem(dtMs);
      updateTradingSystem(dtMs);
      updateParticleSystem(dtMs);`);
  
  html = safeReplace(html, gameLoopPattern, gameLoopWithTrading, 'trading game loop');
  console.log('✅ Added trading system to game loop');

  fs.writeFileSync('public/index.html', html);
  console.log('✅ Space Trading System implemented successfully!');
  console.log('');
  console.log('💰 SPACE TRADING FEATURES:');
  console.log('   • O key: Trading interface when near stations');
  console.log('   • M key: Market analysis and trade route opportunities');
  console.log('   • 8 Trade goods with dynamic pricing and volatility');
  console.log('   • 5 Trading stations across different sectors');
  console.log('   • Faction-specific price modifiers based on reputation');
  console.log('   • Cargo hold management (50 unit capacity)');
  console.log('   • Buy/sell mechanics with station specializations');
  console.log('   • Market fluctuations every 30 seconds');
  console.log('   • Profitable trade route analysis');
  console.log('   • Station proximity notifications');
  console.log('   • Trading reputation bonuses with factions');
  console.log('');
  
} catch (error) {
  console.error('❌ Error implementing trading system:', error.message);
  process.exit(1);
}