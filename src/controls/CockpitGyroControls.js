/**
 * @fileoverview Cockpit Gyroscope Controls - Gyroscope-based ship flight controls.
 * Adapts device orientation to control ship pitch, roll, and yaw.
 */

export class CockpitGyroControls {
  /**
   * @param {object} options - Configuration options
   */
  constructor(options = {}) {
    // Sensitivity settings
    this._gyroSensitivity = options.gyroSensitivity ?? 0.015;
    this._gyroDeadZone = options.gyroDeadZone ?? 0.02;
    this._autoEnableGyro = options.autoEnableGyro ?? true;
    
    // State
    this._gyroEnabled = false;
    this._gyroPermissionGranted = false;
    this._gyroSupported = this._detectGyroSupport();
    this._isMobile = this._detectMobile();
    this._gyroCalibrating = false;
    
    // Gyro calibration baseline
    this._gyroBaseline = {
      alpha: 0,
      beta: 0,
      gamma: 0
    };
    
    // Current orientation values
    this._pitch = 0;  // Up/down rotation
    this._roll = 0;   // Left/right tilt
    this._yaw = 0;    // Left/right turn
    
    // Bound event handlers
    this._onDeviceOrientation = this._handleDeviceOrientation.bind(this);
    this._onTouchStart = this._handleTouchStart.bind(this);
    
    console.log(`[CockpitGyroControls] Initialized (mobile: ${this._isMobile}, gyro: ${this._gyroSupported})`);
  }
  
  /**
   * Detect if device supports gyroscope
   */
  _detectGyroSupport() {
    return 'DeviceOrientationEvent' in window;
  }
  
  /**
   * Detect if running on mobile device
   */
  _detectMobile() {
    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|windows phone/i.test(ua);
    const hasTouch = navigator.maxTouchPoints > 0;
    return isMobile || hasTouch;
  }
  
  /**
   * Request gyroscope permission (iOS 13+ requirement)
   */
  async requestGyroPermission() {
    if (!this._gyroSupported) {
      console.warn('[CockpitGyroControls] Gyroscope not supported');
      return false;
    }
    
    // iOS 13+ requires explicit permission
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        this._gyroPermissionGranted = (permission === 'granted');
        console.log(`[CockpitGyroControls] Gyro permission: ${permission}`);
        return this._gyroPermissionGranted;
      } catch (error) {
        console.error('[CockpitGyroControls] Gyro permission error:', error);
        return false;
      }
    } else {
      // Android and older iOS - auto-granted
      this._gyroPermissionGranted = true;
      return true;
    }
  }
  
  /**
   * Enable gyroscope controls
   */
  async enable() {
    if (!this._gyroSupported) {
      console.warn('[CockpitGyroControls] Cannot enable - gyro not supported');
      return false;
    }
    
    if (!this._gyroPermissionGranted) {
      const granted = await this.requestGyroPermission();
      if (!granted) {
        console.warn('[CockpitGyroControls] Gyro permission denied');
        return false;
      }
    }
    
    this._gyroEnabled = true;
    window.addEventListener('deviceorientation', this._onDeviceOrientation, true);
    window.addEventListener('touchstart', this._onTouchStart, { passive: true });
    
    // Calibrate on enable
    this._gyroCalibrating = true;
    
    console.log('[CockpitGyroControls] Gyro enabled');
    return true;
  }
  
  /**
   * Disable gyroscope controls
   */
  disable() {
    this._gyroEnabled = false;
    window.removeEventListener('deviceorientation', this._onDeviceOrientation, true);
    window.removeEventListener('touchstart', this._onTouchStart);
    
    // Reset orientation
    this._pitch = 0;
    this._roll = 0;
    this._yaw = 0;
    
    console.log('[CockpitGyroControls] Gyro disabled');
  }
  
  /**
   * Calibrate gyroscope (set current orientation as baseline)
   */
  calibrate() {
    this._gyroCalibrating = true;
    console.log('[CockpitGyroControls] Calibrating...');
  }
  
  /**
   * Handle device orientation events
   */
  _handleDeviceOrientation(e) {
    if (!this._gyroEnabled) return;
    
    // Extract orientation values (in degrees)
    const alpha = e.alpha ?? 0;  // Z-axis (compass, 0-360)
    const beta = e.beta ?? 0;    // X-axis (pitch, -180 to 180)
    const gamma = e.gamma ?? 0;  // Y-axis (roll, -90 to 90)
    
    // Handle calibration
    if (this._gyroCalibrating) {
      this._gyroBaseline = { alpha, beta, gamma };
      this._gyroCalibrating = false;
      console.log('[CockpitGyroControls] Calibrated:', this._gyroBaseline);
      return;
    }
    
    // Convert to radians and apply baseline offset
    const alphaRad = ((alpha - this._gyroBaseline.alpha) * Math.PI) / 180;
    const betaRad = ((beta - this._gyroBaseline.beta) * Math.PI) / 180;
    const gammaRad = ((gamma - this._gyroBaseline.gamma) * Math.PI) / 180;
    
    // Map device orientation to ship controls
    // Portrait mode (phone held upright):
    // - beta (pitch forward/back) controls pitch
    // - gamma (tilt left/right) controls roll  
    // - alpha (compass heading) controls yaw
    
    let pitch = betaRad * this._gyroSensitivity;
    let roll = gammaRad * this._gyroSensitivity;
    let yaw = alphaRad * this._gyroSensitivity * 0.5; // Less sensitive for yaw
    
    // Apply dead zone to reduce jitter
    if (Math.abs(pitch) < this._gyroDeadZone) pitch = 0;
    if (Math.abs(roll) < this._gyroDeadZone) roll = 0;
    if (Math.abs(yaw) < this._gyroDeadZone) yaw = 0;
    
    // Update values
    this._pitch = pitch;
    this._roll = roll;
    this._yaw = yaw;
  }
  
  /**
   * Handle touch events (tap to calibrate)
   */
  _handleTouchStart(e) {
    if (!this._gyroEnabled) return;
    
    // Single tap to calibrate
    if (e.touches.length === 1) {
      this.calibrate();
    }
  }
  
  /**
   * Get current pitch value
   */
  getPitch() {
    return this._pitch;
  }
  
  /**
   * Get current roll value
   */
  getRoll() {
    return this._roll;
  }
  
  /**
   * Get current yaw value
   */
  getYaw() {
    return this._yaw;
  }
  
  /**
   * Get all orientation values
   */
  getOrientation() {
    return {
      pitch: this._pitch,
      roll: this._roll,
      yaw: this._yaw
    };
  }
  
  /**
   * Check if gyro is enabled
   */
  isEnabled() {
    return this._gyroEnabled;
  }
  
  /**
   * Check if gyro is supported
   */
  isSupported() {
    return this._gyroSupported;
  }
  
  /**
   * Check if running on mobile
   */
  isMobile() {
    return this._isMobile;
  }
  
  /**
   * Cleanup
   */
  dispose() {
    this.disable();
  }
}
