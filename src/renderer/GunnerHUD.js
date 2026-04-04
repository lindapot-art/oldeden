/**
 * GunnerHUD — Canvas-based heads-up display for gunner mode.
 *
 * Renders on a 2D canvas overlay:
 *   - Crosshair with dynamic targeting reticle
 *   - Ammo counter with type indicator
 *   - Weapon charge/heat bars
 *   - Shield and hull status
 *   - Target lock indicator
 *   - Holographic-style visual effects
 *
 * Usage:
 *   const hud = new GunnerHUD(canvasElement);
 *   hud.updateWeaponStatus({ ammo: 24, maxAmmo: 24, charge: 0.5, heat: 0.3 });
 *   hud.updateTargetLock({ locked: true, targetName: 'Fighter', distance: 150 });
 *   hud.updateShields({ shield: 85, hull: 100 });
 *   hud.render();
 */

export class GunnerHUD {
  /**
   * @param {HTMLCanvasElement} canvas  The 2D canvas element for HUD rendering.
   * @param {object} [options]
   * @param {string} [options.primaryColor='#44aaff']    Primary HUD color.
   * @param {string} [options.accentColor='#00ff88']     Accent color (ammo, readouts).
   * @param {string} [options.warningColor='#ffaa00']    Warning color (low ammo, heat).
   * @param {string} [options.dangerColor='#ff4444']     Danger color (critical).
   */
  constructor(canvas, options = {}) {
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    
    this._primaryColor = options.primaryColor ?? '#44aaff';
    this._accentColor = options.accentColor ?? '#00ff88';
    this._warningColor = options.warningColor ?? '#ffaa00';
    this._dangerColor = options.dangerColor ?? '#ff4444';

    /** HUD state */
    this._weaponStatus = {
      ammo: 24,
      maxAmmo: 24,
      weaponType: 'RAILGUN',
      charge: 0,
      heat: 0,
      ready: true,
    };

    this._targetLock = {
      locked: false,
      targetName: null,
      distance: 0,
      health: 100,
    };

    this._playerStatus = {
      shield: 100,
      maxShield: 100,
      hull: 100,
      maxHull: 100,
    };

    /** Animation state */
    this._pulsePhase = 0;
    this._scanlineOffset = 0;

    /** Gyro control state */
    this._gyroStatus = {
      enabled: false,
      supported: false,
      calibrating: false,
    };

    this._resize();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Update weapon status.
   * @param {object} status
   * @param {number} status.ammo        Current ammo count.
   * @param {number} status.maxAmmo     Max ammo capacity.
   * @param {string} [status.weaponType='RAILGUN']  Weapon type name.
   * @param {number} [status.charge=0]  Charge level (0-1).
   * @param {number} [status.heat=0]    Heat level (0-1).
   * @param {boolean} [status.ready=true] Weapon ready to fire.
   */
  updateWeaponStatus(status) {
    Object.assign(this._weaponStatus, status);
  }

  /**
   * Update target lock status.
   * @param {object} target
   * @param {boolean} target.locked     Is target locked.
   * @param {string} [target.targetName] Target name/type.
   * @param {number} [target.distance]  Distance to target (m).
   * @param {number} [target.health]    Target health (0-100).
   */
  updateTargetLock(target) {
    Object.assign(this._targetLock, target);
  }

  /**
   * Update player shield/hull status.
   * @param {object} status
   * @param {number} status.shield      Current shield.
   * @param {number} [status.maxShield] Max shield.
   * @param {number} status.hull        Current hull.
   * @param {number} [status.maxHull]   Max hull.
   */
  updateShields(status) {
    Object.assign(this._playerStatus, status);
  }

  /**
   * Update gyroscope control status (mobile).
   * @param {object} status
   * @param {boolean} status.enabled      Whether gyro is enabled.
   * @param {boolean} [status.supported]  Whether gyro is supported.
   * @param {boolean} [status.calibrating] Whether gyro is calibrating.
   */
  updateGyroStatus(status) {
    Object.assign(this._gyroStatus, status);
  }

  /**
   * Render the HUD. Call every frame.
   * @param {number} [deltaMs=16] Milliseconds since last frame (for animations).
   */
  render(deltaMs = 16) {
    const ctx = this._ctx;
    const w = this._canvas.width;
    const h = this._canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    // Update animation states
    this._pulsePhase += deltaMs * 0.003;
    this._scanlineOffset = (this._scanlineOffset + deltaMs * 0.1) % h;

    // Draw components
    this._drawCrosshair(ctx, w, h);
    this._drawWeaponStatus(ctx, w, h);
    this._drawTargetLock(ctx, w, h);
    this._drawShieldHull(ctx, w, h);
    this._drawGyroIndicator(ctx, w, h);
    this._drawScanlines(ctx, w, h);
    this._drawVignette(ctx, w, h);
  }

  /**
   * Resize canvas to match window. Call on window resize.
   */
  resize() {
    this._resize();
  }

  // ── Private Rendering ───────────────────────────────────────────────────────

  _resize() {
    this._canvas.width = window.innerWidth;
    this._canvas.height = window.innerHeight;
  }

  /**
   * Draw crosshair in center with dynamic targeting rings.
   */
  _drawCrosshair(ctx, w, h) {
    const cx = w / 2;
    const cy = h / 2;
    
    ctx.save();
    ctx.translate(cx, cy);

    // Outer targeting ring
    const pulse = Math.sin(this._pulsePhase) * 0.1 + 0.9;
    const ringRadius = 60 * pulse;
    
    ctx.strokeStyle = this._primaryColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Target lock ring (if locked)
    if (this._targetLock.locked) {
      ctx.strokeStyle = this._accentColor;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius + 10, 0, Math.PI * 2);
      ctx.stroke();

      // Lock indicators (four corners)
      ctx.strokeStyle = this._accentColor;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 1.0;
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const r = ringRadius + 15;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        
        ctx.beginPath();
        ctx.moveTo(x - 8, y);
        ctx.lineTo(x + 8, y);
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x, y + 8);
        ctx.stroke();
      }
    }

    // Center dot
    ctx.fillStyle = this._primaryColor;
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // Crosshair lines (top, bottom, left, right)
    ctx.strokeStyle = this._primaryColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.8;
    
    const lineLen = 25;
    const lineGap = 15;
    
    // Top
    ctx.beginPath();
    ctx.moveTo(0, -lineGap);
    ctx.lineTo(0, -lineGap - lineLen);
    ctx.stroke();
    
    // Bottom
    ctx.beginPath();
    ctx.moveTo(0, lineGap);
    ctx.lineTo(0, lineGap + lineLen);
    ctx.stroke();
    
    // Left
    ctx.beginPath();
    ctx.moveTo(-lineGap, 0);
    ctx.lineTo(-lineGap - lineLen, 0);
    ctx.stroke();
    
    // Right
    ctx.beginPath();
    ctx.moveTo(lineGap, 0);
    ctx.lineTo(lineGap + lineLen, 0);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draw weapon status in bottom-left corner.
   */
  _drawWeaponStatus(ctx, w, h) {
    const x = 40;
    const y = h - 120;

    ctx.save();
    ctx.globalAlpha = 0.9;
    
    // Weapon name
    ctx.fillStyle = this._primaryColor;
    ctx.font = 'bold 18px monospace';
    ctx.fillText(this._weaponStatus.weaponType, x, y);

    // Ammo count
    const ammoRatio = this._weaponStatus.ammo / this._weaponStatus.maxAmmo;
    let ammoColor = this._accentColor;
    if (ammoRatio < 0.25) ammoColor = this._dangerColor;
    else if (ammoRatio < 0.5) ammoColor = this._warningColor;
    
    ctx.fillStyle = ammoColor;
    ctx.font = 'bold 32px monospace';
    ctx.fillText(`${this._weaponStatus.ammo}`, x, y + 35);
    
    ctx.fillStyle = this._primaryColor;
    ctx.font = '14px monospace';
    ctx.fillText(`/ ${this._weaponStatus.maxAmmo}`, x + 60, y + 35);

    // Charge bar (if charging)
    if (this._weaponStatus.charge > 0) {
      const barWidth = 200;
      const barHeight = 8;
      const barY = y + 50;
      
      // Background
      ctx.fillStyle = 'rgba(100, 180, 255, 0.2)';
      ctx.fillRect(x, barY, barWidth, barHeight);
      
      // Charge fill
      ctx.fillStyle = this._accentColor;
      ctx.fillRect(x, barY, barWidth * this._weaponStatus.charge, barHeight);
      
      // Label
      ctx.fillStyle = this._primaryColor;
      ctx.font = '12px monospace';
      ctx.fillText('CHARGING', x, barY - 4);
    }

    // Heat bar (if heat > 0)
    if (this._weaponStatus.heat > 0) {
      const barWidth = 200;
      const barHeight = 8;
      const barY = y + 65;
      
      // Background
      ctx.fillStyle = 'rgba(255, 100, 100, 0.2)';
      ctx.fillRect(x, barY, barWidth, barHeight);
      
      // Heat fill
      const heatColor = this._weaponStatus.heat > 0.8 ? this._dangerColor : this._warningColor;
      ctx.fillStyle = heatColor;
      ctx.fillRect(x, barY, barWidth * this._weaponStatus.heat, barHeight);
      
      // Label
      ctx.fillStyle = heatColor;
      ctx.font = '12px monospace';
      ctx.fillText(`HEAT ${Math.round(this._weaponStatus.heat * 100)}%`, x, barY - 4);
    }

    // Ready indicator
    if (this._weaponStatus.ready) {
      ctx.fillStyle = this._accentColor;
      ctx.font = 'bold 14px monospace';
      ctx.fillText('● READY', x + 220, y + 20);
    } else {
      ctx.fillStyle = this._warningColor;
      ctx.font = 'bold 14px monospace';
      ctx.fillText('○ COOLDOWN', x + 220, y + 20);
    }

    ctx.restore();
  }

  /**
   * Draw target lock info in top-center.
   */
  _drawTargetLock(ctx, w, h) {
    const cx = w / 2;
    const y = 60;

    ctx.save();
    ctx.globalAlpha = 0.9;
    
    if (this._targetLock.locked) {
      // Target name
      ctx.fillStyle = this._accentColor;
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`◎ ${this._targetLock.targetName}`, cx, y);
      
      // Distance
      ctx.fillStyle = this._primaryColor;
      ctx.font = '16px monospace';
      ctx.fillText(`${Math.round(this._targetLock.distance)}m`, cx, y + 25);
      
      // Health bar
      const barWidth = 150;
      const barHeight = 6;
      const barX = cx - barWidth / 2;
      const barY = y + 35;
      
      // Background
      ctx.fillStyle = 'rgba(100, 180, 255, 0.2)';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      // Health fill
      const healthRatio = this._targetLock.health / 100;
      let healthColor = this._accentColor;
      if (healthRatio < 0.3) healthColor = this._dangerColor;
      else if (healthRatio < 0.6) healthColor = this._warningColor;
      
      ctx.fillStyle = healthColor;
      ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);
    } else {
      // No target
      ctx.fillStyle = this._primaryColor;
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.5;
      ctx.fillText('[ NO TARGET ]', cx, y);
    }

    ctx.restore();
  }

  /**
   * Draw shield and hull status in top-right corner.
   */
  _drawShieldHull(ctx, w, h) {
    const x = w - 250;
    const y = 40;
    const barWidth = 180;
    const barHeight = 10;

    ctx.save();
    ctx.globalAlpha = 0.9;
    
    // Shield
    ctx.fillStyle = this._primaryColor;
    ctx.font = '14px monospace';
    ctx.fillText('SHIELD', x, y);
    
    const shieldRatio = this._playerStatus.shield / this._playerStatus.maxShield;
    
    // Shield bar background
    ctx.fillStyle = 'rgba(100, 180, 255, 0.2)';
    ctx.fillRect(x, y + 5, barWidth, barHeight);
    
    // Shield fill
    ctx.fillStyle = this._primaryColor;
    ctx.fillRect(x, y + 5, barWidth * shieldRatio, barHeight);
    
    // Shield value
    ctx.fillStyle = this._primaryColor;
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${Math.round(shieldRatio * 100)}%`, x + barWidth + 10, y + 13);
    
    // Hull
    ctx.fillStyle = this._accentColor;
    ctx.font = '14px monospace';
    ctx.fillText('HULL', x, y + 35);
    
    const hullRatio = this._playerStatus.hull / this._playerStatus.maxHull;
    let hullColor = this._accentColor;
    if (hullRatio < 0.3) hullColor = this._dangerColor;
    else if (hullRatio < 0.6) hullColor = this._warningColor;
    
    // Hull bar background
    ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
    ctx.fillRect(x, y + 40, barWidth, barHeight);
    
    // Hull fill
    ctx.fillStyle = hullColor;
    ctx.fillRect(x, y + 40, barWidth * hullRatio, barHeight);
    
    // Hull value
    ctx.fillStyle = hullColor;
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${Math.round(hullRatio * 100)}%`, x + barWidth + 10, y + 48);

    ctx.restore();
  }

  /**
   * Draw scanline effect (subtle CRT-style lines).
   */
  _drawScanlines(ctx, w, h) {
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = this._primaryColor;
    ctx.lineWidth = 1;
    
    for (let y = this._scanlineOffset % 4; y < h; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  /**
   * Draw subtle vignette around edges.
   */
  _drawVignette(ctx, w, h) {
    ctx.save();
    
    const gradient = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.8);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    
    ctx.restore();
  }

  /**
   * Draw gyroscope control indicator (mobile only).
   */
  _drawGyroIndicator(ctx, w, h) {
    if (!this._gyroStatus.enabled && !this._gyroStatus.supported) return;

    ctx.save();

    const x = w - 100;
    const y = h - 80;

    // Background panel
    ctx.fillStyle = 'rgba(5, 10, 25, 0.7)';
    ctx.fillRect(x - 50, y - 30, 90, 60);
    
    ctx.strokeStyle = this._primaryColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 50, y - 30, 90, 60);

    // Gyro icon (device with rotation arrows)
    const iconSize = 20;
    const iconX = x - 25;
    const iconY = y;

    // Device outline (phone/tablet)
    ctx.strokeStyle = this._gyroStatus.enabled ? this._accentColor : this._primaryColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(iconX - iconSize / 2, iconY - iconSize / 2, iconSize, iconSize * 1.5);

    // Rotation arrows
    if (this._gyroStatus.enabled) {
      ctx.strokeStyle = this._accentColor;
      ctx.lineWidth = 1.5;
      
      // Left arrow (counter-clockwise)
      ctx.beginPath();
      ctx.arc(iconX - iconSize / 2 - 8, iconY, 6, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();
      
      // Right arrow (clockwise)
      ctx.beginPath();
      ctx.arc(iconX + iconSize / 2 + 8, iconY, 6, Math.PI * 1.5, Math.PI * 0.5);
      ctx.stroke();
    }

    // Status text
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    
    if (this._gyroStatus.calibrating) {
      ctx.fillStyle = this._warningColor;
      ctx.fillText('CALIBRATING', x + 5, y - 5);
      
      // Pulse effect for calibrating
      const pulse = Math.sin(this._pulsePhase * 4) * 0.3 + 0.7;
      ctx.globalAlpha = pulse;
      ctx.fillText('...', x + 5, y + 8);
      ctx.globalAlpha = 1.0;
    } else if (this._gyroStatus.enabled) {
      ctx.fillStyle = this._accentColor;
      ctx.fillText('GYRO', x + 5, y - 5);
      ctx.fillText('ACTIVE', x + 5, y + 8);
    } else if (this._gyroStatus.supported) {
      ctx.fillStyle = this._primaryColor;
      ctx.fillText('GYRO', x + 5, y - 5);
      ctx.fillText('OFF', x + 5, y + 8);
    }

    // Calibration hint (when enabled)
    if (this._gyroStatus.enabled && !this._gyroStatus.calibrating) {
      ctx.font = '9px monospace';
      ctx.fillStyle = 'rgba(100, 180, 255, 0.5)';
      ctx.textAlign = 'center';
      ctx.fillText('TAP TO RECENTER', w - 55, h - 15);
    }

    ctx.restore();
  }
}
