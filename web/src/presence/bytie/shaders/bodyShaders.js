/**
 * BYTIE Head Sphere Shaders
 * Glossy translucent liquid-glass sphere with chromatic interior,
 * crisp specular highlights, electric magenta Fresnel edges,
 * and two adorable glowing crescent eyes (⌒ ⌒).
 */

export const bodyVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uDistortion;
  uniform float uEnergy;

  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    // Smooth subtle organic breathing expansion (maintaining smooth liquid-glass sphere silhouette)
    float breath = sin(uTime * 1.8) * 0.018 * uEnergy;
    vec3 displaced = position + normal * breath;

    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vPosition = displaced;
    vViewPosition = -mvPosition.xyz;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const bodyFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uEnergy;
  uniform float uGlow;
  uniform vec2 uEyeOffset;     // Saccadic cursor tracking offset
  uniform float uEyeBlink;     // 1.0 = open/awake, 0.0 = blinked shut
  uniform vec3 uColorCyan;
  uniform vec3 uColorBlue;
  uniform vec3 uColorViolet;
  uniform vec3 uColorMagenta;
  uniform vec3 uColorEmerald;
  uniform vec3 uColorDark;

  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;

  // Function to render an adorable solid glowing crescent arch eye: ⌒
  float drawSolidCrescentEye(vec2 p, float blink) {
    // Large, bold, joyful eye proportions matching reference spirit
    float w = 0.165;
    float curve = 2.8 * blink;
    float peakY = 0.095 * blink;
    float thickness = mix(0.012, 0.088, blink);

    // Parabolic top and bottom curves creating a filled curved crescent
    float topCurve = peakY - p.x * p.x * curve;
    float bottomCurve = (peakY - thickness) - p.x * p.x * (curve * 0.72);

    // Signed distance inside the vertical band between bottom and top
    float distTop = p.y - topCurve;
    float distBottom = bottomCurve - p.y;
    float insideV = smoothstep(0.016, -0.008, max(distTop, distBottom));

    // Tapered horizontal tips
    float taper = smoothstep(w + 0.025, w - 0.02, abs(p.x));
    float solidEye = insideV * taper;

    // Glowing white bloom halo around the solid crescent
    float centerDist = length(vec2(p.x * 0.8, p.y - peakY * 0.4));
    float halo = exp(-centerDist * centerDist * 95.0) * 0.9 * smoothstep(w + 0.08, w - 0.03, abs(p.x));

    return solidEye * 3.4 + halo * 1.6;
  }

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);

    // 1. Fresnel Factor for luminous glass rim
    float NdotV = max(dot(normal, viewDir), 0.0);
    float fresnel = pow(1.0 - NdotV, 2.0);

    // 2. Liquid Glass Internal Chromatic Caustics
    float ny = normal.y;
    float nx = normal.x;
    float nz = normal.z;

    // The reference spirit is a luminous celestial sapphire/cyan glass orb
    // with deep violet core, glowing magenta lower rim, and emerald caustics at top-right
    vec3 baseColor = uColorDark;

    // Luminous blue & electric cyan dominating upper and mid region
    float upperSphere = smoothstep(-0.35, 0.65, ny - nx * 0.25);
    vec3 upperGrad = mix(uColorBlue, uColorCyan, smoothstep(-0.1, 0.85, ny));
    baseColor = mix(baseColor, upperGrad, upperSphere * 0.95);

    // Deep luminous violet core
    float midViolet = smoothstep(-0.5, 0.0, ny) * smoothstep(0.4, -0.1, ny);
    baseColor = mix(baseColor, uColorViolet, midViolet * 0.7);

    // Radiant magenta/pink on the lower rim and underside
    float lowerMagenta = smoothstep(0.05, -0.8, ny);
    baseColor = mix(baseColor, uColorMagenta, lowerMagenta * 0.85);

    // Prismatic emerald-cyan refraction on the upper-right rim (matching reference)
    float emeraldGlint = smoothstep(0.25, 0.75, nx * 0.8 + ny * 0.6) * smoothstep(0.08, 0.55, fresnel);
    baseColor = mix(baseColor, uColorEmerald, emeraldGlint * 0.95);

    // 3. Specular Highlights (Glossy Glass Reflection)
    // Crisp glossy specular gleam on the upper-left crown (completely clear of the eyes)
    vec3 lightDir1 = normalize(vec3(-0.45, 0.78, 0.45));
    vec3 half1 = normalize(lightDir1 + viewDir);
    float spec1 = pow(max(dot(normal, half1), 0.0), 55.0);
    float spec1Soft = pow(max(dot(normal, half1), 0.0), 22.0) * 0.35;
    vec3 specColor1 = vec3(1.0) * (spec1 * 2.8 + spec1Soft);

    // Secondary subtle fill reflection
    vec3 lightDir2 = normalize(vec3(0.6, -0.3, 0.6));
    vec3 half2 = normalize(lightDir2 + viewDir);
    float spec2 = pow(max(dot(normal, half2), 0.0), 20.0) * 0.3;
    vec3 specColor2 = uColorCyan * spec2;

    // 4. Two Adorable Expressive Glowing Crescent Eyes: (⌒ ⌒)
    // Map sphere front coordinates (nz > 0) to 2D face plane
    vec2 faceCoord = vec2(normal.x, normal.y);
    // Slight head tilt rotation (approx 12.5 degrees)
    float tiltAngle = 0.22;
    mat2 rot = mat2(cos(tiltAngle), -sin(tiltAngle), sin(tiltAngle), cos(tiltAngle));
    vec2 tiltedCoord = rot * (faceCoord - uEyeOffset);

    // Eye centers in tilted space matching reference spirit placement
    vec2 leftEyePos = vec2(-0.16, 0.02);
    vec2 rightEyePos = vec2(0.15, 0.09);

    float leftEye = drawSolidCrescentEye(tiltedCoord - leftEyePos, uEyeBlink);
    float rightEye = drawSolidCrescentEye(tiltedCoord - rightEyePos, uEyeBlink);
    float totalEye = max(leftEye, rightEye);

    // Eyes only visible on the front hemisphere
    float frontFactor = smoothstep(0.12, 0.52, nz);
    totalEye *= frontFactor;

    // Glowing white eyes with slight cyan halo
    vec3 eyeGlowColor = mix(vec3(1.0), uColorCyan, 0.10);
    vec3 eyeOutput = eyeGlowColor * totalEye * 3.0;

    // 5. Fresnel Rim Glow (Hot Magenta & Cyan)
    vec3 rimColor = mix(uColorMagenta, uColorCyan, smoothstep(-0.2, 0.8, ny));
    vec3 rimOutput = rimColor * fresnel * (1.15 + uGlow * 0.65);

    // 6. Combine all components
    vec3 finalColor = baseColor + eyeOutput + rimOutput + specColor1 + specColor2;

    // Glass transparency: translucent in the center, solid/glowing at edges, bright at eyes
    float alpha = clamp(0.72 + fresnel * 0.28 + totalEye * 0.35 + spec1 * 0.5, 0.0, 1.0);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;
