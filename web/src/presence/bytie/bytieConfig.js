/**
 * BYTIE Configuration Constants
 * Definitive visual palette, geometry parameters, and spirit anatomy matching the reference spirit creature.
 */
import * as THREE from 'three';

export const BYTIE_PALETTE = {
  cyan: new THREE.Color(0x00f5ff),
  blue: new THREE.Color(0x1e60ff),
  violet: new THREE.Color(0x8b5cf6),
  magenta: new THREE.Color(0xf43f8e),
  hotPink: new THREE.Color(0xff2a8d),
  rose: new THREE.Color(0xfb7185),
  emerald: new THREE.Color(0x10b981),
  white: new THREE.Color(0xffffff),
  darkBase: new THREE.Color(0x06091c),
};

export const BYTIE_GEOMETRY = {
  headRadius: 0.66,
  headSegments: 64,
  headPosition: [0.0, 0.38, 0.0],
  
  // Large Buoyant Wing-Fins sweeping gracefully outward matching reference spirit
  wingWidth: 1.05,
  wingHeight: 0.52,
  leftWingPos: [-0.48, 0.14, -0.15],
  leftWingRot: [0.12, 0.38, -0.32],
  rightWingPos: [0.48, 0.44, -0.15],
  rightWingRot: [0.12, -0.38, 0.32],

  // Flowing Spiral Tail
  tailSegments: 80,
  tailWidthTop: 0.48,
  tailWidthMid: 1.18,
  tailWidthBottom: 0.05,
  
  // Orbital Filament & Embers
  orbitalRadiusX: 1.40,
  orbitalRadiusY: 1.15,
  orbitalRotation: [1.15, 0.25, -0.42],
  emberCount: 42,
  emberSpreadMin: 0.75,
  emberSpreadMax: 1.45,
};
