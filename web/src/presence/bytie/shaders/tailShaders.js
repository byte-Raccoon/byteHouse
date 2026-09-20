/**
 * BYTIE Flowing Spiral Silk Tail Shaders
 * Tapering S-curved ribbon with traveling harmonic waves, silk translucency, and chromatic sheen.
 */

export const tailVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uAmplitude;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vTravelingWave;

  void main() {
    vUv = uv;

    // Traveling wave moving downward along the tail (uv.x = 0 top/base, uv.x = 1 bottom/tip)
    float wavePhase = uTime * uSpeed * 3.2 - uv.x * 6.8;
    float wave1 = sin(wavePhase);
    float wave2 = cos(wavePhase * 1.6 + 1.2) * 0.5;
    float totalWave = (wave1 + wave2) * uAmplitude * pow(uv.x, 0.85);

    vTravelingWave = totalWave;

    vec3 displaced = position;

    // Displace perpendicular to ribbon surface
    displaced.z += totalWave * 0.28;
    displaced.x += cos(wavePhase * 0.9) * uAmplitude * 0.15 * uv.x;

    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewPosition = -mvPosition.xyz;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const tailFragmentShader = /* glsl */ `
  uniform vec3 uColorBase;    // Deep Violet / Blue at upper root
  uniform vec3 uColorMid;     // Vibrant Magenta / Pink along body
  uniform vec3 uColorTip;     // Electric Cyan / Teal at spiral tip
  uniform float uOpacity;
  uniform float uTime;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vTravelingWave;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);

    // Fresnel rim factor for translucent silk sheen
    float fresnel = pow(1.0 - max(abs(dot(normal, viewDir)), 0.0), 1.6);

    // Chromatic progression down the tail: Root (Violet) -> Mid (Magenta/Pink) -> Tip (Cyan/Teal)
    vec3 color;
    if (vUv.x < 0.45) {
      color = mix(uColorBase, uColorMid, smoothstep(0.0, 0.45, vUv.x));
    } else {
      color = mix(uColorMid, uColorTip, smoothstep(0.45, 1.0, vUv.x));
    }

    // Dynamic wave caustic highlight
    float shimmer = sin(vUv.x * 12.0 - uTime * 3.2) * 0.5 + 0.5;
    color = mix(color, uColorTip, shimmer * 0.20 * (1.0 - vUv.x * 0.4));

    // Lateral edge glow (tinted jewel rim, vibrant without blowing out)
    float edge = pow(abs(vUv.y - 0.5) * 2.0, 2.2);
    vec3 edgeTint = mix(uColorMid, uColorTip, vUv.x);
    color = mix(color, edgeTint * 1.35, edge * 0.65);

    // Add saturated Fresnel silk sheen
    color += edgeTint * fresnel * 0.55;

    // Glowing tip accent
    float tipGlow = smoothstep(0.82, 1.0, vUv.x);
    color = mix(color, uColorTip * 1.3, tipGlow * 0.65);

    // Saturated silk boost
    color *= 1.15;

    // Silky opacity with soft edge falloff but solid luminous core
    float silkBody = 0.60 + 0.40 * cos(abs(vUv.y - 0.5) * 3.14159);
    float alpha = clamp((silkBody * 0.65 + edge * 0.45 + fresnel * 0.35) * uOpacity, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
  }
`;
