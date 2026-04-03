/**
 * Tests for PlaceholderShip — procedural vector ship builder.
 */
import { PlaceholderShip } from '../src/renderer/PlaceholderShip.js';

// Minimal Three.js stubs for testing geometry/material construction
function createTHREEStub() {
  class MockGeometry {
    constructor() { this.attributes = {}; }
    setAttribute() {}
    dispose() {}
  }

  class MockMaterial {
    constructor(opts = {}) { Object.assign(this, opts); }
    dispose() {}
  }

  class MockMesh {
    constructor(geo, mat) {
      this.geometry = geo;
      this.material = mat;
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; }, copy() {} };
      this.rotation = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
      this.scale = { x: 1, y: 1, z: 1, set(x, y, z) { this.x = x; this.y = y; this.z = z; }, setScalar(s) { this.x = s; this.y = s; this.z = s; } };
      this.name = '';
      this.children = [];
    }
    add(child) { this.children.push(child); }
  }

  class MockGroup {
    constructor() {
      this.children = [];
      this.name = '';
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
      this.rotation = { x: 0, y: 0, z: 0 };
      this.scale = { x: 1, y: 1, z: 1, setScalar(s) { this.x = s; this.y = s; this.z = s; } };
    }
    add(child) { this.children.push(child); }
  }

  class MockObject3D {
    constructor() {
      this.name = '';
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
      this.rotation = { x: 0, y: 0, z: 0 };
    }
  }

  return {
    Group: MockGroup,
    Mesh: MockMesh,
    Object3D: MockObject3D,
    BoxGeometry: MockGeometry,
    ConeGeometry: MockGeometry,
    CylinderGeometry: MockGeometry,
    SphereGeometry: MockGeometry,
    CircleGeometry: MockGeometry,
    RingGeometry: MockGeometry,
    MeshStandardMaterial: MockMaterial,
    MeshBasicMaterial: MockMaterial,
    FrontSide: 0,
    DoubleSide: 2,
  };
}

describe('PlaceholderShip', () => {
  let THREE;

  beforeEach(() => {
    THREE = createTHREEStub();
  });

  test('constructor sets default options', () => {
    const builder = new PlaceholderShip(THREE);
    expect(builder._hullColor).toBe(0x334455);
    expect(builder._accentColor).toBe(0x44aaff);
    expect(builder._canopyColor).toBe(0x88ccff);
    expect(builder._gunColor).toBe(0x556677);
    expect(builder._scale).toBe(1);
  });

  test('constructor accepts custom options', () => {
    const builder = new PlaceholderShip(THREE, {
      hullColor: 0xff0000,
      accentColor: 0x00ff00,
      canopyColor: 0x0000ff,
      gunColor: 0xaabbcc,
      scale: 2.5,
    });
    expect(builder._hullColor).toBe(0xff0000);
    expect(builder._accentColor).toBe(0x00ff00);
    expect(builder._canopyColor).toBe(0x0000ff);
    expect(builder._gunColor).toBe(0xaabbcc);
    expect(builder._scale).toBe(2.5);
  });

  test('build() returns group and turretMount', () => {
    const builder = new PlaceholderShip(THREE);
    const result = builder.build();

    expect(result).toHaveProperty('group');
    expect(result).toHaveProperty('turretMount');
    expect(result.group.name).toBe('placeholder-ship');
    expect(result.turretMount.name).toBe('turret-mount');
  });

  test('build() creates ship with expected child count', () => {
    const builder = new PlaceholderShip(THREE);
    const { group } = builder.build();

    // Should have multiple children: hull, nose, wings, fins, tails,
    // engines, glows, canopy, turret base, barrels, mount, etc.
    expect(group.children.length).toBeGreaterThanOrEqual(15);
  });

  test('turret mount is positioned above hull', () => {
    const builder = new PlaceholderShip(THREE);
    const { turretMount } = builder.build();

    // Mount should be above the hull (y > 0) and slightly forward (z < 0)
    expect(turretMount.position.y).toBeGreaterThan(0);
    expect(turretMount.position.z).toBeLessThan(0);
  });

  test('build() applies custom scale', () => {
    const builder = new PlaceholderShip(THREE, { scale: 3 });
    const { group } = builder.build();

    expect(group.scale.x).toBe(3);
    expect(group.scale.y).toBe(3);
    expect(group.scale.z).toBe(3);
  });

  test('build() does not scale when scale is 1', () => {
    const builder = new PlaceholderShip(THREE, { scale: 1 });
    const { group } = builder.build();

    // Default scale should remain 1
    expect(group.scale.x).toBe(1);
    expect(group.scale.y).toBe(1);
    expect(group.scale.z).toBe(1);
  });

  test('turretMount is a child of the group', () => {
    const builder = new PlaceholderShip(THREE);
    const { group, turretMount } = builder.build();

    const found = group.children.find(c => c.name === 'turret-mount');
    expect(found).toBe(turretMount);
  });
});
