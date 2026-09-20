/**
 * BYTIE Wing-Fins / Spirit Ears Shaders
 * Curved translucent petal fins with cyan-to-magenta gradient and buoyant waving kinematics.
 */

export const spiritFinsVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uFlutter;
  uniform float uSide; // -1.0 for left fin, +1.0 for right fin

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;

    // Wing kinematics: buoyant waving and gentle flutter propagating from base (uv.x = 0) to tip (uv.x = 1)
    float wavePhase = uTime * uSpeed * 2.8 + uv.x * 2.4;
    float flutterAmt = pow(uv.x, 1.4) * uFlutter;

    vec3 displaced = position;

    // Flapping along normal and Z
    displaced.z += sin(wavePhase) * flutterAmt * 0.22;
    displaced.y += cos(wavePhase * 0.8) * flutterAmt * 0.12;

    // Curved cupping of the wing tips
    displaced.z += pow(uv.x, 2.0) * 0.08 * uSide;

    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewPosition = -mvPosition.xyz;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const spiritFinsFragmentShader = /* glsl */ `
  uniform vec3 uColorBase;   // Cyan / Blue at root
  uniform vec3 uColorTip;    // Hot Magenta / Pink at tips
  uniform vec3 uColorGlint;  // Prismatic Violet / Emerald accent
  uniform float uOpacity;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);

    // Fresnel rim factor for translucent glowing wing edges
    float fresnel = pow(1.0 - max(abs(dot(normal, viewDir)), 0.0), 1.8);

    // Gradient from root (uv.x = 0) to tip (uv.x = 1)
    vec3 color = mix(uColorBase, uColorTip, smoothstep(0.1, 0.85, vUv.x));

    // Internal violet / glint caustics along middle band
    float midGlint = smoothstep(0.3, 0.6, vUv.x) * smoothstep(0.9, 0.6, vUv.x);
    color = mix(color, uColorGlint, midGlint * 0.45);

    // Edge highlight (uv.y near 0 or 1 is the outer curved border)
    float edgeFactor = pow(abs(vUv.y - 0.5) * 2.0, 3.0);
    color += uColorTip * edgeFactor * 0.85;

    // Hot tip luminescence
    float tipGlow = smoothstep(0.7, 1.0, vUv.x) * 0.6;
    color += vec3(1.0, 0.4, 0.8) * tipGlow;

    // Additive luminous rim
    color += mix(uColorBase, uColorTip, vUv.x) * fresnel * 1.2;

    // Soft transparency: more translucent near base and center, solid/glowing at edges and tip
    float alpha = clamp((0.45 + vUv.x * 0.45 + edgeFactor * 0.4 + fresnel * 0.35) * uOpacity, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
  }
`;
