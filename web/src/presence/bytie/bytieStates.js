/**
 * BYTIE State Definitions and Interpolation
 * Maps semantic ByteHouse states to numerical shader and animation targets.
 */

export const BYTIE_STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  THINKING: 'thinking',
  SPEAKING: 'speaking',
  ALERT: 'alert',
};

export const BYTIE_STATE_TARGETS = {
  [BYTIE_STATES.IDLE]: {
    energySpeed: 0.5,
    energyDistortion: 0.08,
    bodyGlow: 0.45,
    ribbonSpeed: 0.6,
    ribbonAmplitude: 0.18,
    particleSpeed: 0.35,
    floatSpeed: 0.9,
    floatAmplitude: 0.06,
    scale: 1.0,
    lightIntensity: 1.0,
    internalFlow: 0.4,
  },
  [BYTIE_STATES.LISTENING]: {
    energySpeed: 0.9,
    energyDistortion: 0.12,
    bodyGlow: 0.75,
    ribbonSpeed: 1.1,
    ribbonAmplitude: 0.26,
    particleSpeed: 0.75,
    floatSpeed: 1.4,
    floatAmplitude: 0.08,
    scale: 1.06,
    lightIntensity: 1.35,
    internalFlow: 0.85,
  },
  [BYTIE_STATES.THINKING]: {
    energySpeed: 1.7,
    energyDistortion: 0.18,
    bodyGlow: 0.9,
    ribbonSpeed: 1.8,
    ribbonAmplitude: 0.34,
    particleSpeed: 1.4,
    floatSpeed: 1.8,
    floatAmplitude: 0.09,
    scale: 1.08,
    lightIntensity: 1.5,
    internalFlow: 1.6,
  },
  [BYTIE_STATES.SPEAKING]: {
    energySpeed: 1.2,
    energyDistortion: 0.14,
    bodyGlow: 0.8,
    ribbonSpeed: 1.3,
    ribbonAmplitude: 0.28,
    particleSpeed: 0.9,
    floatSpeed: 1.5,
    floatAmplitude: 0.07,
    scale: 1.04,
    lightIntensity: 1.4,
    internalFlow: 1.1,
  },
  [BYTIE_STATES.ALERT]: {
    energySpeed: 1.9,
    energyDistortion: 0.22,
    bodyGlow: 1.1,
    ribbonSpeed: 2.1,
    ribbonAmplitude: 0.38,
    particleSpeed: 1.8,
    floatSpeed: 2.2,
    floatAmplitude: 0.11,
    scale: 1.12,
    lightIntensity: 1.7,
    internalFlow: 1.9,
  },
};

/**
 * Smoothly interpolates current parameters toward target state parameters using delta-time
 */
export function interpolateParams(current, target, factor) {
  for (const key in target) {
    if (typeof target[key] === 'number') {
      current[key] += (target[key] - current[key]) * Math.min(1.0, factor);
    }
  }
}
