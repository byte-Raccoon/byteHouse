/**
 * BytieScene - Three.js WebGL Orchestration Engine for Bytie
 * Procedural spirit presence matching the reference creature:
 * - Liquid-glass head with two glowing crescent eyes (⌒ ⌒)
 * - Buoyant curved wing-fins / spirit ears
 * - Flowing S-curved spiral silk tail
 * - Orbital neon filament with moving light tracer
 * - Atmospheric floating embers
 */
import * as THREE from 'three';
import { BYTIE_PALETTE, BYTIE_GEOMETRY } from './bytieConfig.js';
import { BYTIE_STATES, BYTIE_STATE_TARGETS, interpolateParams } from './bytieStates.js';
import { bodyVertexShader, bodyFragmentShader } from './shaders/bodyShaders.js';
import { spiritFinsVertexShader, spiritFinsFragmentShader } from './shaders/spiritFinsShaders.js';
import { tailVertexShader, tailFragmentShader } from './shaders/tailShaders.js';
import { particleVertexShader, particleFragmentShader } from './shaders/particleShaders.js';

export class BytieScene {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;

    this.width = container.clientWidth || 280;
    this.height = container.clientHeight || 280;

    this.currentState = options.state || BYTIE_STATES.IDLE;
    this.targetParams = { ...BYTIE_STATE_TARGETS[this.currentState] };
    this.currentParams = { ...this.targetParams };

    this.clock = new THREE.Clock();
    this.animId = null;
    this.isDisposed = false;

    // Interaction & Gaze
    this.pointerTarget = new THREE.Vector2(0, 0);
    this.pointerSmooth = new THREE.Vector2(0, 0);
    this.inputFocused = false;
    this.pulseIntensity = 0.0;
    this.blinkTimer = 0.0;
    this.eyeBlink = 1.0;

    // Reduced motion preference
    this.prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.init();
  }

  init() {
    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Perspective Camera
    this.camera = new THREE.PerspectiveCamera(42, this.width / this.height, 0.1, 50);
    this.camera.position.set(0, 0.0, 4.3);

    // 3. WebGL Renderer with Alpha & DrawingBuffer preservation
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.setClearColor(0x000000, 0);

    this.container.appendChild(this.renderer.domElement);

    // Master group for organic floating, breathing & swaying
    this.spiritGroup = new THREE.Group();
    this.scene.add(this.spiritGroup);

    // 4. Build Spirit Anatomy
    this.buildHead();
    this.buildWingFins();
    this.buildSpiralTail();
    this.buildOrbitalFilament();
    this.buildEmbers();
    this.buildFloatingPetals();

    // 5. Start Render Loop
    this.animate = this.animate.bind(this);
    this.animId = requestAnimationFrame(this.animate);
  }

  buildHead() {
    this.headGeometry = new THREE.SphereGeometry(
      BYTIE_GEOMETRY.headRadius,
      BYTIE_GEOMETRY.headSegments,
      BYTIE_GEOMETRY.headSegments
    );

    this.headMaterial = new THREE.ShaderMaterial({
      vertexShader: bodyVertexShader,
      fragmentShader: bodyFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uEnergy: { value: this.currentParams.energySpeed },
        uDistortion: { value: this.currentParams.energyDistortion },
        uGlow: { value: this.currentParams.bodyGlow },
        uEyeOffset: { value: new THREE.Vector2(0, 0) },
        uEyeBlink: { value: 1.0 },
        uColorCyan: { value: BYTIE_PALETTE.cyan },
        uColorBlue: { value: BYTIE_PALETTE.blue },
        uColorViolet: { value: BYTIE_PALETTE.violet },
        uColorMagenta: { value: BYTIE_PALETTE.magenta },
        uColorEmerald: { value: BYTIE_PALETTE.emerald },
        uColorDark: { value: BYTIE_PALETTE.darkBase },
      },
      transparent: true,
      depthWrite: false,
    });

    this.headMesh = new THREE.Mesh(this.headGeometry, this.headMaterial);
    this.headMesh.position.set(...BYTIE_GEOMETRY.headPosition);
    this.spiritGroup.add(this.headMesh);
  }

  createPetalGeometry(width, height, segX = 36, segY = 28) {
    const geo = new THREE.PlaneGeometry(width, height, segX, segY);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      let px = pos.getX(i);
      let py = pos.getY(i);

      // Shift so root is at x = 0, tip sweeps out to x = width
      px += width * 0.5;

      // Normalized u from 0 (root) to 1 (tip)
      const u = Math.max(0.0, Math.min(1.0, px / width));
      // Normalized v from -1 (bottom edge) to +1 (top edge)
      const v = py / (height * 0.5);

      // Graceful upward sweeping curve towards tip
      const upwardCurve = Math.pow(u, 1.25) * (height * 0.62);
      py += upwardCurve;

      // Fairy-fin width profile: broad fan with rounded dome tip matching reference spirit
      let widthFactor;
      if (u <= 0.62) {
        // Base expanding to full fan width
        widthFactor = 0.35 + 0.65 * Math.sin((u / 0.62) * (Math.PI * 0.5));
      } else {
        // Smoothly rounded dome tip
        const tTip = (u - 0.62) / 0.38;
        const dome = Math.sqrt(Math.max(0.0, 1.0 - tTip * tTip));
        widthFactor = 1.0 * dome;
      }

      // Add gentle secondary lower flare around u = 0.45
      const lowerFlare = (v < 0.0) ? (Math.sin(u * Math.PI) * 0.22) : 0.0;
      py = (py - upwardCurve) * (widthFactor + lowerFlare) + upwardCurve;

      // 3D Cupping curvature along Z (spoon-like shell depth)
      const cup = (1.0 - v * v) * Math.sin(u * Math.PI * 0.85) * 0.18;
      pos.setXYZ(i, px, py, cup);
    }

    geo.computeVertexNormals();
    return geo;
  }

  buildWingFins() {
    this.wingMeshes = [];

    // Left wing fin (sweeping out and cupping upward on the left)
    const leftGeo = this.createPetalGeometry(BYTIE_GEOMETRY.wingWidth, BYTIE_GEOMETRY.wingHeight);
    const leftMat = new THREE.ShaderMaterial({
      vertexShader: spiritFinsVertexShader,
      fragmentShader: spiritFinsFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 1.0 },
        uFlutter: { value: 0.18 },
        uSide: { value: -1.0 },
        uColorBase: { value: BYTIE_PALETTE.blue },
        uColorTip: { value: BYTIE_PALETTE.magenta },
        uColorGlint: { value: BYTIE_PALETTE.violet },
        uOpacity: { value: 0.94 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.leftWing = new THREE.Mesh(leftGeo, leftMat);
    this.leftWing.position.set(...BYTIE_GEOMETRY.leftWingPos);
    this.leftWing.rotation.set(...BYTIE_GEOMETRY.leftWingRot);
    this.leftWing.scale.set(-1, 1, 1); // Mirrored horizontally so it sweeps up-left
    this.spiritGroup.add(this.leftWing);
    this.wingMeshes.push({ mesh: this.leftWing, mat: leftMat });

    // Right wing fin (reaching high and curving gracefully on the upper-right)
    const rightGeo = this.createPetalGeometry(BYTIE_GEOMETRY.wingWidth, BYTIE_GEOMETRY.wingHeight);
    const rightMat = new THREE.ShaderMaterial({
      vertexShader: spiritFinsVertexShader,
      fragmentShader: spiritFinsFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 1.08 },
        uFlutter: { value: 0.20 },
        uSide: { value: 1.0 },
        uColorBase: { value: BYTIE_PALETTE.cyan },
        uColorTip: { value: BYTIE_PALETTE.hotPink },
        uColorGlint: { value: BYTIE_PALETTE.violet },
        uOpacity: { value: 0.94 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.rightWing = new THREE.Mesh(rightGeo, rightMat);
    this.rightWing.position.set(...BYTIE_GEOMETRY.rightWingPos);
    this.rightWing.rotation.set(...BYTIE_GEOMETRY.rightWingRot);
    this.spiritGroup.add(this.rightWing);
    this.wingMeshes.push({ mesh: this.rightWing, mat: rightMat });
  }

  createRibbonGeometry(spinePoints, widthTop, widthMid, widthBottom, segments = 80, twistRevolutions = 2.0) {
    const curve = new THREE.CatmullRomCurve3(spinePoints);
    const sampledPoints = curve.getPoints(segments);

    const vertexCount = (segments + 1) * 2;
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const pt = sampledPoints[i];

      const tangent = curve.getTangent(t).normalize();
      const up = new THREE.Vector3(0, 0, 1);
      let binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();
      if (binormal.lengthSq() < 0.01) {
        binormal.set(1, 0, 0);
      }

      // 3D Helical twist along the ribbon's spine path:
      // Rotates binormal around tangent, creating billowing folds and voluminous 3D spirals
      const twistAngle = t * Math.PI * twistRevolutions + Math.sin(t * Math.PI * 2.0) * 0.35;
      binormal.applyAxisAngle(tangent, twistAngle);

      // Compute local surface normal perpendicular to tangent and rotated binormal
      const localNormal = new THREE.Vector3().crossVectors(tangent, binormal).normalize();

      // Swelling width profile: slender base at neck -> broad billowing body -> delicate spiral tip
      let width;
      if (t < 0.32) {
        const s = t / 0.32;
        width = THREE.MathUtils.lerp(widthTop, widthMid, Math.sin(s * Math.PI * 0.5));
      } else {
        const s = (t - 0.32) / 0.68;
        width = THREE.MathUtils.lerp(widthMid, widthBottom, Math.pow(s, 0.75));
      }
      const vIndex = i * 2;

      // Left edge
      const pLeft = pt.clone().addScaledVector(binormal, -width * 0.5);
      positions[vIndex * 3] = pLeft.x;
      positions[vIndex * 3 + 1] = pLeft.y;
      positions[vIndex * 3 + 2] = pLeft.z;
      normals[vIndex * 3] = localNormal.x;
      normals[vIndex * 3 + 1] = localNormal.y;
      normals[vIndex * 3 + 2] = localNormal.z;
      uvs[vIndex * 2] = t;
      uvs[vIndex * 2 + 1] = 0.0;

      // Right edge
      const pRight = pt.clone().addScaledVector(binormal, width * 0.5);
      positions[(vIndex + 1) * 3] = pRight.x;
      positions[(vIndex + 1) * 3 + 1] = pRight.y;
      positions[(vIndex + 1) * 3 + 2] = pRight.z;
      normals[(vIndex + 1) * 3] = localNormal.x;
      normals[(vIndex + 1) * 3 + 1] = localNormal.y;
      normals[(vIndex + 1) * 3 + 2] = localNormal.z;
      uvs[(vIndex + 1) * 2] = t;
      uvs[(vIndex + 1) * 2 + 1] = 1.0;

      if (i < segments) {
        indices.push(vIndex, vIndex + 1, vIndex + 2);
        indices.push(vIndex + 1, vIndex + 3, vIndex + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  buildSpiralTail() {
    this.tailMeshes = [];

    // 1. Primary wide flowing silk ribbon (swooping right, folding left, swirling to tip)
    // Starts tucked behind lower sphere rim (y = -0.26)
    const mainSpine = [
      new THREE.Vector3(0.02, -0.26, -0.10),
      new THREE.Vector3(0.38, -0.46, 0.04),
      new THREE.Vector3(0.42, -0.72, 0.08),
      new THREE.Vector3(0.14, -0.95, -0.02),
      new THREE.Vector3(-0.22, -1.12, 0.06),
      new THREE.Vector3(-0.06, -1.30, 0.02),
      new THREE.Vector3(0.08, -1.42, 0.04),
    ];

    this.mainTailGeometry = this.createRibbonGeometry(mainSpine, 0.48, 1.18, 0.05, 80, 2.1);
    this.mainTailMaterial = new THREE.ShaderMaterial({
      vertexShader: tailVertexShader,
      fragmentShader: tailFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 0.85 },
        uAmplitude: { value: 0.22 },
        uColorBase: { value: BYTIE_PALETTE.violet },
        uColorMid: { value: BYTIE_PALETTE.magenta },
        uColorTip: { value: BYTIE_PALETTE.cyan },
        uOpacity: { value: 0.95 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.mainTailMesh = new THREE.Mesh(this.mainTailGeometry, this.mainTailMaterial);
    this.spiritGroup.add(this.mainTailMesh);
    this.tailMeshes.push({ mesh: this.mainTailMesh, mat: this.mainTailMaterial });

    // 2. Secondary outer curling veil (ethereal cyan/teal silk trailing on the right)
    const veilSpine = [
      new THREE.Vector3(-0.04, -0.28, -0.14),
      new THREE.Vector3(0.26, -0.48, -0.05),
      new THREE.Vector3(0.46, -0.76, -0.02),
      new THREE.Vector3(0.36, -1.02, 0.04),
      new THREE.Vector3(0.12, -1.24, 0.05),
      new THREE.Vector3(0.18, -1.38, 0.02),
    ];

    this.veilTailGeometry = this.createRibbonGeometry(veilSpine, 0.35, 0.82, 0.04, 64, 1.8);
    this.veilTailMaterial = new THREE.ShaderMaterial({
      vertexShader: tailVertexShader,
      fragmentShader: tailFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 0.90 },
        uAmplitude: { value: 0.18 },
        uColorBase: { value: BYTIE_PALETTE.blue },
        uColorMid: { value: BYTIE_PALETTE.cyan },
        uColorTip: { value: BYTIE_PALETTE.hotPink },
        uOpacity: { value: 0.88 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.veilTailMesh = new THREE.Mesh(this.veilTailGeometry, this.veilTailMaterial);
    this.spiritGroup.add(this.veilTailMesh);
    this.tailMeshes.push({ mesh: this.veilTailMesh, mat: this.veilTailMaterial });
  }

  buildOrbitalFilament() {
    // Elliptical orbital neon filament circling the spirit's waist
    const curve = new THREE.EllipseCurve(
      0, 0,
      BYTIE_GEOMETRY.orbitalRadiusX,
      BYTIE_GEOMETRY.orbitalRadiusY,
      0, 2 * Math.PI,
      false,
      0
    );
    const pts = curve.getPoints(80);
    const ringGeo = new THREE.BufferGeometry().setFromPoints(pts);

    const ringMat = new THREE.LineBasicMaterial({
      color: 0x00f5ff,
      transparent: true,
      opacity: 0.50,
      blending: THREE.AdditiveBlending,
    });

    this.orbitalFilament = new THREE.Line(ringGeo, ringMat);
    this.orbitalFilament.position.set(0.0, 0.08, 0.0);
    this.orbitalFilament.rotation.set(...BYTIE_GEOMETRY.orbitalRotation);
    this.spiritGroup.add(this.orbitalFilament);

    // Glowing orbiting tracer bead
    const tracerGeo = new THREE.SphereGeometry(0.038, 16, 16);
    const tracerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    this.orbitalTracer = new THREE.Mesh(tracerGeo, tracerMat);
    this.spiritGroup.add(this.orbitalTracer);
    this.orbitalPoints = pts;
  }

  buildEmbers() {
    const count = BYTIE_GEOMETRY.emberCount;
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const speeds = new Float32Array(count);
    const phases = new Float32Array(count);
    const orbitAxes = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const emberColors = [
      BYTIE_PALETTE.cyan,
      BYTIE_PALETTE.magenta,
      BYTIE_PALETTE.hotPink,
      BYTIE_PALETTE.violet,
      BYTIE_PALETTE.white,
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const r = BYTIE_GEOMETRY.emberSpreadMin + Math.random() * (BYTIE_GEOMETRY.emberSpreadMax - BYTIE_GEOMETRY.emberSpreadMin);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) + 0.1;
      positions[i3 + 2] = r * Math.cos(phi);

      scales[i] = 0.6 + Math.random() * 0.8;
      speeds[i] = 0.4 + Math.random() * 0.8;
      phases[i] = Math.random() * Math.PI * 2;

      const axis = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize();
      orbitAxes[i3] = axis.x;
      orbitAxes[i3 + 1] = axis.y;
      orbitAxes[i3 + 2] = axis.z;

      const col = emberColors[Math.floor(Math.random() * emberColors.length)];
      colors[i3] = col.r;
      colors[i3 + 1] = col.g;
      colors[i3 + 2] = col.b;
    }

    this.emberGeometry = new THREE.BufferGeometry();
    this.emberGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.emberGeometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    this.emberGeometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    this.emberGeometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    this.emberGeometry.setAttribute('aOrbitAxis', new THREE.BufferAttribute(orbitAxes, 3));
    this.emberGeometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    this.emberMaterial = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 0.6 },
        uSize: { value: 2.8 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.emberPoints = new THREE.Points(this.emberGeometry, this.emberMaterial);
    this.spiritGroup.add(this.emberPoints);
  }

  buildFloatingPetals() {
    this.floatingPetalMeshes = [];

    // Five key glowing petal sparks matching reference artwork composition:
    const petalConfigs = [
      { pos: [0.0, 1.25, 0.08], rot: [0.2, 0.4, 0.6], scale: 0.12, color: BYTIE_PALETTE.hotPink },
      { pos: [-0.72, 0.05, 0.12], rot: [-0.3, 0.1, -0.4], scale: 0.10, color: BYTIE_PALETTE.rose },
      { pos: [0.78, 0.22, -0.08], rot: [0.1, -0.4, 0.5], scale: 0.11, color: BYTIE_PALETTE.magenta },
      { pos: [-0.40, -0.52, 0.18], rot: [0.4, 0.2, 0.8], scale: 0.09, color: BYTIE_PALETTE.violet },
      { pos: [0.36, -1.02, 0.10], rot: [-0.2, 0.5, -0.6], scale: 0.11, color: BYTIE_PALETTE.hotPink },
    ];

    const basePetalGeo = this.createPetalGeometry(1.0, 0.6, 12, 10);

    petalConfigs.forEach((cfg, idx) => {
      const mat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });

      const mesh = new THREE.Mesh(basePetalGeo, mat);
      mesh.position.set(...cfg.pos);
      mesh.rotation.set(...cfg.rot);
      mesh.scale.set(cfg.scale, cfg.scale, cfg.scale);

      this.spiritGroup.add(mesh);
      this.floatingPetalMeshes.push({
        mesh,
        baseY: cfg.pos[1],
        phase: idx * 1.3,
        rotSpeed: 0.3 + idx * 0.12,
      });
    });
  }

  setState(newState) {
    if (this.currentState === newState) return;
    this.currentState = newState;
    const target = BYTIE_STATE_TARGETS[newState];
    if (target) {
      this.targetParams = { ...target };
    }
  }

  setPointer(normX, normY) {
    this.pointerTarget.set(normX, normY);
  }

  setInputFocused(focused) {
    this.inputFocused = focused;
  }

  triggerPulse() {
    this.pulseIntensity = 1.0;
  }

  resize(width, height) {
    if (this.width === width && this.height === height) return;
    this.width = width;
    this.height = height;
    if (this.camera && this.renderer) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  animate() {
    if (this.isDisposed) return;
    this.animId = requestAnimationFrame(this.animate);
    this.updateAndRender();
  }

  renderOnce(timeAdvance = 0.016) {
    this.updateAndRender(timeAdvance);
  }

  updateAndRender(forcedDelta = null) {
    if (this.isDisposed || !this.renderer) return;

    const delta = forcedDelta !== null ? forcedDelta : Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Smoothly interpolate state parameters
    interpolateParams(this.currentParams, this.targetParams, delta, 4.0);

    // Decay pulse intensity
    if (this.pulseIntensity > 0.001) {
      this.pulseIntensity *= Math.exp(-delta * 3.5);
    } else {
      this.pulseIntensity = 0.0;
    }

    // 2. Eye Gaze Tracking & Blinking
    // Pointer gaze coordinates (normalized)
    const targetGazeX = this.inputFocused ? 0.0 : this.pointerTarget.x * 0.16;
    const targetGazeY = this.inputFocused ? -0.16 : this.pointerTarget.y * 0.14;

    this.pointerSmooth.x += (targetGazeX - this.pointerSmooth.x) * (delta * 7.0);
    this.pointerSmooth.y += (targetGazeY - this.pointerSmooth.y) * (delta * 7.0);

    // Cute natural blinking cycle
    this.blinkTimer += delta;
    if (this.blinkTimer > 3.8) {
      // Blink shut
      this.eyeBlink = 0.06;
      if (this.blinkTimer > 4.02) {
        // Open back up
        this.eyeBlink = 1.0;
        this.blinkTimer = 0.0;
      }
    } else {
      this.eyeBlink = 1.0;
    }

    const effectiveTime = elapsedTime * (this.prefersReducedMotion ? 0.35 : 1.0);

    // 3. Update Head Shaders
    if (this.headMaterial) {
      this.headMaterial.uniforms.uTime.value = effectiveTime;
      this.headMaterial.uniforms.uEnergy.value = this.currentParams.energySpeed;
      this.headMaterial.uniforms.uDistortion.value = this.currentParams.energyDistortion + this.pulseIntensity * 0.2;
      this.headMaterial.uniforms.uGlow.value = this.currentParams.bodyGlow + this.pulseIntensity * 0.4;
      this.headMaterial.uniforms.uEyeOffset.value.copy(this.pointerSmooth);
      this.headMaterial.uniforms.uEyeBlink.value = this.eyeBlink;
    }

    // 4. Update Wing-Fins
    this.wingMeshes.forEach(({ mat }) => {
      mat.uniforms.uTime.value = effectiveTime;
      mat.uniforms.uSpeed.value = this.currentParams.ribbonSpeed;
      mat.uniforms.uFlutter.value = 0.18 * this.currentParams.ribbonAmplitude + this.pulseIntensity * 0.15;
    });

    // 5. Update Tail Meshes
    if (this.tailMeshes) {
      this.tailMeshes.forEach(({ mat }) => {
        mat.uniforms.uTime.value = effectiveTime;
        mat.uniforms.uSpeed.value = this.currentParams.ribbonSpeed;
        mat.uniforms.uAmplitude.value = 0.24 * this.currentParams.ribbonAmplitude + this.pulseIntensity * 0.12;
      });
    }

    // 6. Update Orbital Filament & Tracer Bead
    if (this.orbitalFilament) {
      this.orbitalFilament.rotation.z += delta * 0.35 * this.currentParams.energySpeed;
    }
    if (this.orbitalTracer && this.orbitalPoints && this.orbitalPoints.length > 0) {
      const tracerIndex = Math.floor((effectiveTime * 28.0) % this.orbitalPoints.length);
      const pt2D = this.orbitalPoints[tracerIndex];
      // Project into the rotated plane of the filament
      const localPt = new THREE.Vector3(pt2D.x, pt2D.y, 0);
      localPt.applyEuler(this.orbitalFilament.rotation);
      this.orbitalTracer.position.copy(localPt).add(this.orbitalFilament.position);
    }

    // 7. Update Embers & Floating Petals
    if (this.emberMaterial) {
      this.emberMaterial.uniforms.uTime.value = effectiveTime;
      this.emberMaterial.uniforms.uSpeed.value = this.currentParams.particleSpeed;
    }
    if (this.floatingPetalMeshes) {
      this.floatingPetalMeshes.forEach((item) => {
        item.mesh.rotation.z += delta * item.rotSpeed;
        item.mesh.rotation.x += delta * (item.rotSpeed * 0.5);
        item.mesh.position.y = item.baseY + Math.sin(effectiveTime * 1.5 + item.phase) * 0.04;
      });
    }

    // 8. Buoyant Organic Floating & Banking
    const floatY = Math.sin(elapsedTime * this.currentParams.floatSpeed * 1.2) * 0.05;
    const swayX = Math.cos(elapsedTime * this.currentParams.floatSpeed * 0.8) * 0.025;

    if (!this.prefersReducedMotion) {
      this.spiritGroup.position.y = floatY;
      this.spiritGroup.position.x = swayX;
      // Slight playful banking with cursor
      this.spiritGroup.rotation.y = this.pointerSmooth.x * 0.25;
      this.spiritGroup.rotation.x = -this.pointerSmooth.y * 0.18;
      this.spiritGroup.rotation.z = Math.sin(elapsedTime * 1.1) * 0.035;
    }

    // Breathing scale
    const breathingScale = this.currentParams.scale + Math.sin(elapsedTime * 2.2) * 0.015 + this.pulseIntensity * 0.06;
    this.spiritGroup.scale.set(breathingScale, breathingScale, breathingScale);

    // 9. Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.isDisposed = true;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
    }

    // Dispose head
    if (this.headGeometry) this.headGeometry.dispose();
    if (this.headMaterial) this.headMaterial.dispose();

    // Dispose wings
    if (this.wingMeshes) {
      this.wingMeshes.forEach(({ mesh, mat }) => {
        mesh.geometry.dispose();
        mat.dispose();
      });
    }

    // Dispose tail
    if (this.tailMeshes) {
      this.tailMeshes.forEach(({ mesh, mat }) => {
        mesh.geometry.dispose();
        mat.dispose();
      });
    }

    // Dispose orbital
    if (this.orbitalFilament) {
      this.orbitalFilament.geometry.dispose();
      this.orbitalFilament.material.dispose();
    }
    if (this.orbitalTracer) {
      this.orbitalTracer.geometry.dispose();
      this.orbitalTracer.material.dispose();
    }

    // Dispose embers
    if (this.emberGeometry) this.emberGeometry.dispose();
    if (this.emberMaterial) this.emberMaterial.dispose();

    // Dispose renderer
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
