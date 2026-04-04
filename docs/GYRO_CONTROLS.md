# Gyroscope Controls for Gunner Mode

This document explains how to use the gyroscope controls feature for mobile devices in Gunner mode.

## Overview

Gunner mode now supports device orientation controls on mobile devices, allowing players to aim the turret by physically moving their phone or tablet. This provides an immersive AR-like experience where tilting the device controls the crosshair.

## Features

- **Automatic Detection**: Automatically detects mobile devices and gyroscope support
- **Permission Handling**: Properly requests permission on iOS and modern Android
- **Calibration**: Tap the screen to recenter/calibrate the view
- **Visual Feedback**: HUD indicator shows gyro status and calibration state
- **Fallback**: Gracefully falls back to touch/mouse controls if gyro is unavailable

## Browser Support (2026)

| Browser              | Support | Permission Required | HTTPS Required |
|----------------------|---------|---------------------|----------------|
| Chrome (Android)     | ✅ Yes  | ✅ Yes             | ✅ Yes         |
| Firefox (Android)    | ✅ Yes  | ✅ Yes             | ✅ Yes         |
| Safari (iOS)         | ✅ Yes  | ✅ Yes (gesture)   | ✅ Yes         |
| Edge Mobile          | ✅ Yes  | ✅ Yes             | ✅ Yes         |
| Samsung Internet     | ✅ Yes  | ✅ Yes             | ✅ Yes         |

**Important**: Gyroscope controls only work over HTTPS in production.

## Usage

### Basic Setup

```javascript
import { GunnerView } from './src/renderer/GunnerView.js';

const gunnerView = new GunnerView(THREE, camera, canvas, railgunWeapon, {
  gyroSensitivity: 0.015,  // Adjust gyro sensitivity (default: 0.015)
  gyroDeadZone: 0.02,      // Dead zone to reduce jitter (default: 0.02)
  autoEnableGyro: true,    // Auto-enable on mobile (default: true)
});

// Attach to ship
gunnerView.attachToShip(shipGroup, turretMount);

// Enter gunner mode - gyro will auto-enable on mobile if supported
gunnerView.enter();

// In animation loop
gunnerView.update(deltaMs);
```

### Manual Gyro Control

```javascript
// Check if gyro is supported
if (gunnerView.isGyroSupported) {
  console.log('Device supports gyroscope');
}

// Check if running on mobile
if (gunnerView.isMobile) {
  console.log('Mobile device detected');
}

// Manually request permission and enable gyro
async function enableGyroControls() {
  const granted = await gunnerView.requestGyroPermission();
  if (granted) {
    console.log('Gyro enabled!');
  }
}

// Call from a button click (required for permission request)
document.getElementById('enableGyroBtn').addEventListener('click', enableGyroControls);

// Disable gyro
gunnerView.disableGyro();

// Recalibrate/recenter view
gunnerView.calibrateGyro();
```

### Custom Options

```javascript
const gunnerView = new GunnerView(THREE, camera, canvas, railgunWeapon, {
  // Standard options
  sensitivity: 0.002,      // Mouse sensitivity
  maxPitch: 1.2,          // Max pitch angle (radians)
  maxYaw: 1.5,            // Max yaw angle (radians)
  fov: 75,                // Field of view
  
  // Gyro-specific options
  gyroSensitivity: 0.020, // Higher = more sensitive gyro
  gyroDeadZone: 0.01,     // Lower = more responsive (more jitter)
  autoEnableGyro: false,  // Don't auto-enable, require manual activation
});
```

## Mobile Controls

When gyroscope is enabled:

- **Device Tilt**: Aim the crosshair by tilting your device
- **Single Tap**: Recalibrate/recenter the view to current orientation
- **Two-Finger Tap**: Fire the railgun (alternative to screen tap)
- **Visual Indicator**: Bottom-right corner shows "GYRO ACTIVE" status

## HUD Integration

The HUD automatically displays gyroscope status:

```javascript
import { GunnerHUD } from './src/renderer/GunnerHUD.js';

const hud = new GunnerHUD(hudCanvas);

// Update gyro status in render loop
hud.updateGyroStatus({
  enabled: gunnerView.isGyroEnabled,
  supported: gunnerView.isGyroSupported,
  calibrating: gunnerView.isGyroCalibrating,
});

hud.render(deltaMs);
```

## Troubleshooting

### Gyro not working on iOS

1. **HTTPS Required**: Ensure you're serving over HTTPS
2. **User Gesture**: Permission must be requested from a button click or touch event
3. **Privacy Settings**: Check Safari settings → Motion & Orientation Access

### Gyro not working on Android

1. **HTTPS Required**: Must be served over HTTPS
2. **Chrome Flags**: Ensure "Sensors" is not blocked in Chrome flags
3. **Device Support**: Verify device has actual gyroscope hardware

### Jittery/Unstable Movement

1. **Increase Dead Zone**: Set `gyroDeadZone: 0.03` or higher
2. **Decrease Sensitivity**: Set `gyroSensitivity: 0.010` or lower
3. **Calibrate Often**: Tap screen to recalibrate when view drifts

### Permission Denied

If permission is denied:
- Reload the page and try again
- Check browser privacy settings
- On iOS: Settings → Safari → Motion & Orientation Access
- The system will fall back to mouse/touch controls

## Technical Details

### Device Orientation Events

The implementation uses the `DeviceOrientationEvent` API:

- **Alpha (α)**: Compass direction (0-360°) - used for yaw
- **Beta (β)**: Front-to-back tilt (-180 to 180°) - used for pitch  
- **Gamma (γ)**: Left-to-right tilt (-90 to 90°) - used for yaw in portrait mode

### Orientation Mapping

In portrait mode (most common):
- Gamma → Yaw (horizontal rotation)
- Beta → Pitch (vertical tilt)

The gyro values are converted from degrees to radians, baseline-adjusted for calibration, and clamped to the same limits as mouse controls.

### Calibration

Calibration stores the current device orientation as the baseline. All subsequent movements are calculated relative to this baseline, allowing players to set their preferred "neutral" position.

## Examples

### Add "Enable Gyro" Button

```html
<button id="enableGyroBtn">Enable Gyro Controls</button>

<script type="module">
  import { GunnerView } from './src/renderer/GunnerView.js';
  
  const gunnerView = new GunnerView(THREE, camera, canvas, railgun);
  
  document.getElementById('enableGyroBtn').addEventListener('click', async () => {
    const granted = await gunnerView.requestGyroPermission();
    if (granted) {
      alert('Gyro controls enabled! Tilt your device to aim.');
    } else {
      alert('Gyro permission denied. Using touch controls.');
    }
  });
</script>
```

### Auto-Enable with Fallback

```javascript
const gunnerView = new GunnerView(THREE, camera, canvas, railgun, {
  autoEnableGyro: true,  // Try to auto-enable
});

gunnerView.attachToShip(ship, mount);

// Enter gunner mode
gunnerView.enter();

// Check status after a moment
setTimeout(() => {
  if (!gunnerView.isGyroEnabled && gunnerView.isMobile) {
    // Permission was denied or gyro unavailable
    showTouchControlsHint();
  }
}, 1000);
```

## Performance Considerations

- **Low Overhead**: Device orientation events are lightweight
- **No Polling**: Event-driven, only processes when device moves
- **Dead Zone**: Prevents unnecessary calculations for tiny movements
- **Efficient Clamping**: Yaw/pitch clamped same as mouse controls

## Future Enhancements

Potential improvements for future versions:

- Landscape mode orientation mapping
- Sensitivity adjustment UI slider
- Gyro smoothing/filtering for very sensitive devices
- Haptic feedback on calibration (vibration API)
- Tutorial/onboarding for first-time users
- Save user preferences (sensitivity, auto-enable)

## See Also

- [GunnerView API Documentation](../src/renderer/GunnerView.js)
- [GunnerHUD API Documentation](../src/renderer/GunnerHUD.js)
- [MDN: DeviceOrientationEvent](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent)
- [DeviceOrientation Browser Support](https://caniuse.com/mdn-api_deviceorientationevent)
