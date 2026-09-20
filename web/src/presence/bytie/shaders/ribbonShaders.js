/**
 * BYTIE Spirit Ribbon Shaders
 * Flowing translucent plasma membranes with wave harmonics and chromatic energy gradients.
 */

export const ribbonVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uFreq;
  uniform float uAmplitude;
  uniform float uPhase;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    // Wave propagation along length (uv.x)
    float t = uTime * uSpeed + uPhase;
    float waveX = sin(uv.x * uFreq * 3.14159 - t) * uAmplitude * uv.x;
    float waveY = cos(uv.x * (uFreq * 1.3) * 3.14159 - t * 1.1) * (uAmplitude * 0.7) * uv.x;
    float waveZ = sin(uv.x * 2.0 - t * 0.8) * (uAmplitude * 0.5);

    vec3 displaced = position + vec3(waveX, waveY, waveZ);

    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vViewPosition = -mvPosition.xyz;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const ribbonFragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uTime;
  uniform float uOpacity;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 viewDir = normalize(vViewPosition);
    vec3 normal = normalize(vNormal);

    // Color gradient along ribbon length
    float lengthProgress = vUv.x;
    vec3 baseColor = mix(uColorA, uColorB, lengthProgress);

    // Lateral soft edge falloff (uv.y from 0 to 1, center at 0.5)
    float lateralFalloff = sin(vUv.y * 3.14159);
    lateralFalloff = pow(lateralFalloff, 1.4);

    // Tip fade at root (near 0) and tail tip (near 1)
    float tipFade = smoothstep(0.0, 0.15, lengthProgress) * smoothstep(1.0, 0.75, lengthProgress);

    // Soft Fresnel glow along edge
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.0);

    vec3 finalColor = baseColor + vec3(fresnel * 0.5);
    float alpha = lateralFalloff * tipFade * (0.65 + fresnel * 0.35) * uOpacity;

    gl_FragColor = vec4(finalColor, alpha);
  }
`;
