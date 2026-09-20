/**
 * BYTIE Atmospheric Spirit Particle Shaders
 * Floating luminous energy motes with Gaussian bloom and orbital drift.
 */

export const particleVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uSize;

  attribute float aScale;
  attribute float aSpeed;
  attribute vec3 aOrbitAxis;
  attribute float aPhase;
  attribute vec3 aColor;

  varying vec3 vColor;
  varying float vAlpha;

  // Simple rotation around axis
  mat3 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    return mat3(
      oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
      oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
      oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c
    );
  }

  void main() {
    vColor = aColor;

    // Orbit drift
    float angle = uTime * uSpeed * aSpeed + aPhase;
    vec3 rotatedPos = rotationMatrix(aOrbitAxis, angle) * position;

    // Subtle breathing displacement
    rotatedPos += sin(uTime * 0.8 + aPhase) * 0.05 * aOrbitAxis;

    vec4 mvPosition = modelViewMatrix * vec4(rotatedPos, 1.0);

    // Smooth radial boundary fade to eliminate canvas edge clipping
    float distFromCenter = length(rotatedPos);
    float boundaryAlpha = smoothstep(1.52, 1.25, distFromCenter);

    // Fade out based on distance and breathing
    vAlpha = (sin(uTime * 1.2 + aPhase) * 0.35 + 0.65) * boundaryAlpha;

    // Scale with camera distance to produce subtle glowing energy motes
    gl_PointSize = clamp(uSize * aScale * (28.0 / -mvPosition.z), 4.0, 32.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const particleFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Distance from center of point sprite (coord in [0, 1])
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);

    if (dist > 0.5) discard;

    // Soft Gaussian bloom falloff
    float intensity = exp(-dist * dist * 14.0);
    float alpha = intensity * vAlpha * 0.7;

    // White hot center
    vec3 color = mix(vColor, vec3(1.0), smoothstep(0.25, 0.02, dist));

    gl_FragColor = vec4(color, alpha);
  }
`;
