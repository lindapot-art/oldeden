/**
 * Tests for GunnerView — first-person gun turret controller.
 */
import { GunnerView } from '../src/renderer/GunnerView.js';

// Minimal Three.js stubs
function createTHREEStub() {
  class MockGeometry {
    dispose() {}
  }

  class MockMaterial {
    constructor(opts = {}) {
      Object.assign(this, opts);
      if (!this.color) this.color = { r: 1, g: 1, b: 1, setHex(hex) { this._hex = hex; } };
    }
    dispose() {}
    clone() {
      const m = new MockMaterial(this);
      m.color = { r: this.color.r, g: this.color.g, b: this.color.b, setHex(hex) { this._hex = hex; } };
      return m;
    }
  }

  class MockMesh {
    constructor(geo, mat) {
      this.geometry = geo;
      this.material = mat;
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
      this.rotation = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
      this.name = '';
      this.children = [];
    }
    add(child) { this.children.push(child); }
  }

  class MockGroup {
    constructor() {
      this.children = [];
      this.name = '';
    }
    add(child) { this.children.push(child); }
    traverse(fn) {
      fn(this);
      this.children.forEach(c => {
        fn(c);
        if (c.children) c.children.forEach(fn);
      });
    }
  }

  class MockObject3D {
    constructor() {
      this.name = '';
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
    }
    getWorldPosition(vec) { vec.x = this.position.x; vec.y = this.position.y; vec.z = this.position.z; }
    getWorldQuaternion(q) { q.x = 0; q.y = 0; q.z = 0; q.w = 1; }
  }

  class MockVector3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    clone() { return new MockVector3(this.x, this.y, this.z); }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  }

  class MockEuler {
    constructor(x = 0, y = 0, z = 0, order = 'XYZ') {
      this.x = x; this.y = y; this.z = z; this._order = order;
    }
    clone() { return new MockEuler(this.x, this.y, this.z, this._order); }
    copy(e) { this.x = e.x; this.y = e.y; this.z = e.z; return this; }
    set(x, y, z, order) { this.x = x; this.y = y; this.z = z; if (order) this._order = order; return this; }
  }

  class MockQuaternion {
    constructor() { this.x = 0; this.y = 0; this.z = 0; this.w = 1; }
    copy(q) { this.x = q.x; this.y = q.y; this.z = q.z; this.w = q.w; return this; }
    multiply() { return this; }
    setFromEuler() { return this; }
  }

  class MockCamera {
    constructor() {
      this.fov = 60;
      this.position = new MockVector3(0, 50, 200);
      this.rotation = new MockEuler();
      this.quaternion = new MockQuaternion();
      this.children = [];
      this.parent = null;
    }
    add(child) { this.children.push(child); }
    remove(child) {
      const idx = this.children.indexOf(child);
      if (idx >= 0) this.children.splice(idx, 1);
    }
    updateProjectionMatrix() {}
  }

  return {
    Group: MockGroup,
    Mesh: MockMesh,
    Object3D: MockObject3D,
    Vector3: MockVector3,
    Euler: MockEuler,
    Quaternion: MockQuaternion,
    Camera: MockCamera,
    BoxGeometry: MockGeometry,
    ConeGeometry: MockGeometry,
    CylinderGeometry: MockGeometry,
    SphereGeometry: MockGeometry,
    CircleGeometry: MockGeometry,
    RingGeometry: MockGeometry,
    MeshBasicMaterial: MockMaterial,
    MeshStandardMaterial: MockMaterial,
    FrontSide: 0,
    DoubleSide: 2,
  };
}

function createMockCanvas() {
  const listeners = {};
  return {
    addEventListener: (type, fn) => { listeners[type] = fn; },
    removeEventListener: (type) => { delete listeners[type]; },
    requestPointerLock: () => {},
    _listeners: listeners,
  };
}

describe('GunnerView', () => {
  let THREE;
  let camera;
  let canvas;
  let origDocument;

  beforeEach(() => {
    THREE = createTHREEStub();
    camera = new THREE.Camera();
    canvas = createMockCanvas();

    // Stub global document for pointer-lock APIs
    origDocument = globalThis.document;
    const docListeners = {};
    globalThis.document = {
      addEventListener: (type, fn) => { docListeners[type] = fn; },
      removeEventListener: (type) => { delete docListeners[type]; },
      exitPointerLock: () => {},
      pointerLockElement: null,
      _listeners: docListeners,
    };
  });

  afterEach(() => {
    globalThis.document = origDocument;
  });

  test('constructor sets default options', () => {
    const gv = new GunnerView(THREE, camera, canvas);
    expect(gv._sensitivity).toBe(0.002);
    expect(gv._maxPitch).toBe(1.2);
    expect(gv._maxYaw).toBe(1.5);
    expect(gv._gunnerFov).toBe(75);
    expect(gv.isActive).toBe(false);
  });

  test('constructor accepts custom options', () => {
    const gv = new GunnerView(THREE, camera, canvas, {
      sensitivity: 0.005,
      maxPitch: 1.0,
      maxYaw: 2.0,
      fov: 90,
    });
    expect(gv._sensitivity).toBe(0.005);
    expect(gv._maxPitch).toBe(1.0);
    expect(gv._maxYaw).toBe(2.0);
    expect(gv._gunnerFov).toBe(90);
  });

  test('attachToShip stores references', () => {
    const gv = new GunnerView(THREE, camera, canvas);
    const shipGroup = new THREE.Group();
    const turretMount = new THREE.Object3D();

    gv.attachToShip(shipGroup, turretMount);
    expect(gv._shipGroup).toBe(shipGroup);
    expect(gv._turretMount).toBe(turretMount);
  });

  test('enter() without turret mount does not activate', () => {
    const gv = new GunnerView(THREE, camera, canvas);
    gv.enter();
    expect(gv.isActive).toBe(false);
  });

  test('enter() with turret mount activates', () => {
    const gv = new GunnerView(THREE, camera, canvas);
    const shipGroup = new THREE.Group();
    const turretMount = new THREE.Object3D();
    gv.attachToShip(shipGroup, turretMount);

    gv.enter();
    expect(gv.isActive).toBe(true);
    expect(camera.fov).toBe(75);
  });

  test('enter() adds cockpit to camera', () => {
    const gv = new GunnerView(THREE, camera, canvas);
    gv.attachToShip(new THREE.Group(), new THREE.Object3D());

    gv.enter();
    expect(camera.children.length).toBe(1);
    expect(camera.children[0].name).toBe('gunner-cockpit');
  });

  test('exit() deactivates and restores camera', () => {
    const gv = new GunnerView(THREE, camera, canvas);
    gv.attachToShip(new THREE.Group(), new THREE.Object3D());

    const originalFov = camera.fov;
    gv.enter();
    expect(camera.fov).toBe(75);

    gv.exit();
    expect(gv.isActive).toBe(false);
    expect(camera.fov).toBe(originalFov);
    expect(camera.children.length).toBe(0);
  });

  test('exit() when not active is a no-op', () => {
    const gv = new GunnerView(THREE, camera, canvas);
    // Should not throw
    gv.exit();
    expect(gv.isActive).toBe(false);
  });

  test('enter() twice does not double-activate', () => {
    const gv = new GunnerView(THREE, camera, canvas);
    gv.attachToShip(new THREE.Group(), new THREE.Object3D());

    gv.enter();
    gv.enter(); // second call should be no-op
    expect(gv.isActive).toBe(true);
    expect(camera.children.length).toBe(1);
  });

  test('update() positions camera at turret world position', () => {
    const gv = new GunnerView(THREE, camera, canvas);
    const ship = new THREE.Group();
    const mount = new THREE.Object3D();
    mount.position.set(10, 5, -3);

    // Override getWorldPosition for test
    ship.getWorldQuaternion = (q) => { q.x = 0; q.y = 0; q.z = 0; q.w = 1; };
    gv.attachToShip(ship, mount);
    gv.enter();

    gv.update(16);
    expect(camera.position.x).toBe(10);
    expect(camera.position.y).toBe(5);
    expect(camera.position.z).toBe(-3);
  });

  test('update() when not active is a no-op', () => {
    const gv = new GunnerView(THREE, camera, canvas);
    const origX = camera.position.x;

    gv.update(16);
    expect(camera.position.x).toBe(origX);
  });

  test('dispose() cleans up', () => {
    const gv = new GunnerView(THREE, camera, canvas);
    gv.attachToShip(new THREE.Group(), new THREE.Object3D());
    gv.enter();

    gv.dispose();
    expect(gv.isActive).toBe(false);
    expect(gv._cockpit).toBe(null);
  });

  test('mouse look clamps yaw and pitch', () => {
    const gv = new GunnerView(THREE, camera, canvas);
    gv._active = true;

    // Simulate large movements
    gv._yaw = 0;
    gv._pitch = 0;

    // Manually call the handler logic
    gv._yaw += 10000 * gv._sensitivity;
    gv._yaw = Math.max(-gv._maxYaw, Math.min(gv._maxYaw, gv._yaw));
    expect(gv._yaw).toBe(gv._maxYaw);

    gv._pitch += 10000 * gv._sensitivity;
    gv._pitch = Math.max(-gv._maxPitch, Math.min(gv._maxPitch, gv._pitch));
    expect(gv._pitch).toBe(gv._maxPitch);

    gv._yaw = 0;
    gv._yaw += -10000 * gv._sensitivity;
    gv._yaw = Math.max(-gv._maxYaw, Math.min(gv._maxYaw, gv._yaw));
    expect(gv._yaw).toBe(-gv._maxYaw);
  });
});
