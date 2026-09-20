/**
 * Bytie - React 3D Spirit Presence Component
 * Encapsulates the WebGL Three.js renderer into a declarative React component.
 */
import React, { useRef, useEffect } from 'react';
import { BytieScene } from './BytieScene.js';
import { BYTIE_STATES } from './bytieStates.js';

export default function Bytie({
  state = BYTIE_STATES.IDLE,
  size = 'standard',
  interactive = true,
  inputFocused = false,
  className = '',
  onClick,
  ...props
}) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);

  // Size preset mapping
  const sizeClasses = {
    compact: 'w-[200px] h-[200px]',
    standard: 'w-[280px] h-[280px]',
    expanded: 'w-[360px] h-[360px]',
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Instantiate Three.js scene
    const scene = new BytieScene(containerRef.current, { state });
    sceneRef.current = scene;
    window.__bytie = scene;

    // Resize handling
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          scene.resize(width, height);
        }
      }
    });
    resizeObserver.observe(containerRef.current);

    // Pointer move listener
    const handlePointerMove = (e) => {
      if (!interactive || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const normX = ((e.clientX - (rect.left + rect.width / 2)) / (window.innerWidth / 2));
      const normY = -((e.clientY - (rect.top + rect.height / 2)) / (window.innerHeight / 2));
      scene.setPointer(
        Math.max(-1.0, Math.min(1.0, normX)),
        Math.max(-1.0, Math.min(1.0, normY))
      );
    };

    window.addEventListener('mousemove', handlePointerMove);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      resizeObserver.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Update semantic state
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setState(state);
    }
  }, [state]);

  // Update input focus
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setInputFocused(inputFocused);
    }
  }, [inputFocused]);

  const handleClick = (e) => {
    if (sceneRef.current) {
      sceneRef.current.triggerPulse();
    }
    if (typeof onClick === 'function') {
      onClick(e);
    }
  };

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      aria-label={`Bytie 3D Spirit Presence (${state})`}
      onClick={handleClick}
      className={`relative flex items-center justify-center cursor-pointer select-none outline-none ${
        sizeClasses[size] || sizeClasses.standard
      } ${className}`}
      {...props}
    />
  );
}
