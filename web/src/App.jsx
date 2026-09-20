import React, { useState, useEffect, useRef } from 'react';
import { bridge } from './bridge.js';

export default function App() {
  const [presenceState, setPresenceState] = useState('idle');
  const [prompt, setPrompt] = useState('');
  const [statusLabel, setStatusLabel] = useState('STATE: IDLE');
  const [latestResponse, setLatestResponse] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const inputRef = useRef(null);
  const states = ['idle', 'listening', 'thinking'];

  useEffect(() => {
    // Listen for presence state changes from Swift backend
    const unsubPresence = bridge.onPresenceState((state) => {
      forceState(state);
    });

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        bridge.hideWindow();
      }
      if (e.code === 'Space' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        nextState();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Mouse drag-to-move window
    let isDragging = false;
    let startScreenX = 0;
    let startScreenY = 0;

    const handleMouseDown = (e) => {
      // Don't drag if clicking buttons, inputs, keycaps, or interactive elements
      if (e.target.closest('button, input, textarea, a, kbd, [role="button"]')) {
        return;
      }
      isDragging = true;
      startScreenX = e.screenX;
      startScreenY = e.screenY;
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.screenX - startScreenX;
      const deltaY = e.screenY - startScreenY;
      if (deltaX !== 0 || deltaY !== 0) {
        startScreenX = e.screenX;
        startScreenY = e.screenY;
        bridge.moveWindow(deltaX, deltaY);
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      unsubPresence();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [presenceState]);

  const forceState = (stateName) => {
    setPresenceState(stateName);
    setStatusLabel('STATE: ' + stateName.toUpperCase());
  };

  const nextState = () => {
    const currentIdx = states.indexOf(presenceState);
    const nextIdx = (currentIdx + 1) % states.length;
    forceState(states[nextIdx]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isSubmitting) return;

    setPrompt('');
    setIsSubmitting(true);
    forceState('thinking');
    setLatestResponse('');

    try {
      const result = await bridge.chatStream(cleanPrompt, conversationId, (delta) => {
        setLatestResponse((prev) => prev + delta);
      });

      if (result) {
        setConversationId(result.conversation_id);
        if (result.response) {
          setLatestResponse(result.response);
        }
        if (result.tools_executed && result.tools_executed.length > 0) {
          const tool = result.tools_executed[0];
          if (tool.tool_name === 'remember') {
            setStatusLabel('STATE: MEMORY STORED');
          } else if (tool.tool_name === 'create_task') {
            setStatusLabel('STATE: TASK CREATED');
          } else if (tool.tool_name === 'complete_task') {
            setStatusLabel('STATE: TASK COMPLETED');
          }
        }
      }
    } catch (err) {
      setLatestResponse(`⚠️ Error: ${err.message || 'Something went wrong.'}`);
    } finally {
      setIsSubmitting(false);
      forceState('idle');
    }
  };

  // Compute status badge classes matching Stitch
  let statusBadgeClass = 'inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono tracking-widest text-emerald-400 uppercase shadow-inner';
  if (presenceState === 'listening') {
    statusBadgeClass = 'inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono tracking-widest text-cyan-300 uppercase shadow-inner';
  } else if (presenceState === 'thinking') {
    statusBadgeClass = 'inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/30 text-xs font-mono tracking-widest text-pink-300 uppercase shadow-inner';
  }

  return (
    <div className="w-full h-full bg-grid flex flex-col justify-between items-center p-6 select-none overflow-hidden rounded-[20px]">
      {/* Top bar info */}
      <header className="w-full max-w-5xl flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-xs font-semibold tracking-widest uppercase text-white/70">
            ByteHouse Neural Presence
          </span>
        </div>

        {/* Mode Badges */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 backdrop-blur-md">
          <button
            id="btn-idle"
            onClick={() => forceState('idle')}
            className={`state-btn px-3 py-1 rounded-full text-xs font-medium transition-all ${
              presenceState === 'idle'
                ? 'bg-white/20 text-white shadow'
                : 'text-white/50 hover:text-white'
            }`}
            type="button"
          >
            IDLE
          </button>
          <button
            id="btn-listening"
            onClick={() => forceState('listening')}
            className={`state-btn px-3 py-1 rounded-full text-xs font-medium transition-all ${
              presenceState === 'listening'
                ? 'bg-white/20 text-white shadow'
                : 'text-white/50 hover:text-white'
            }`}
            type="button"
          >
            LISTENING
          </button>
          <button
            id="btn-thinking"
            onClick={() => forceState('thinking')}
            className={`state-btn px-3 py-1 rounded-full text-xs font-medium transition-all ${
              presenceState === 'thinking'
                ? 'bg-white/20 text-white shadow'
                : 'text-white/50 hover:text-white'
            }`}
            type="button"
          >
            THINKING
          </button>
        </div>
      </header>

      {/* Center Orb Showcase */}
      <main className="flex flex-col items-center justify-center my-auto z-10 text-center">
        <div className="bytehouse-stage">
          {/* Concentric soundwave halos */}
          <div className="sound-ring"></div>
          <div className="sound-ring"></div>
          <div className="sound-ring"></div>

          {/* ByteHouse Orb */}
          <div
            className={`bytehouse ${presenceState}`}
            id="bytehouse"
            role="button"
            tabIndex={0}
            aria-label="ByteHouse assistant"
            onClick={nextState}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                nextState();
              }
            }}
          >
            <div className="glow"></div>
            <div className="orb">
              <div className="energy"></div>
              <div className="light"></div>
              <div className="highlight"></div>
            </div>
          </div>
        </div>

        {/* State readout & caption */}
        <div className="mt-6 flex flex-col items-center">
          <div className={statusBadgeClass} id="status-badge">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                presenceState === 'thinking'
                  ? 'bg-pink-400 animate-ping'
                  : presenceState === 'listening'
                  ? 'bg-cyan-400'
                  : 'bg-emerald-400'
              }`}
            ></span>
            <span id="status-text">{statusLabel}</span>
          </div>
          <p className="text-white/40 text-xs mt-3 max-w-md tracking-wide leading-relaxed min-h-[1.5rem]">
            {latestResponse ? (
              <span className="text-white/80">{latestResponse}</span>
            ) : (
              <>
                Click or press{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-mono text-[11px]">
                  Space
                </kbd>{' '}
                to cycle states (Idle → Listening → Thinking)
              </>
            )}
          </p>
        </div>
      </main>

      {/* Bottom Interactive controls */}
      <footer className="w-full max-w-xl z-20 flex flex-col items-center gap-3">
        <form onSubmit={handleSubmit} className="w-full">
          <div className="w-full flex items-center justify-between px-5 py-3 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl focus-within:border-cyan-400/40 focus-within:bg-white/[0.07] transition-all shadow-lg">
            <div className="flex items-center gap-3 text-white/80 text-xs w-full">
              <svg className="w-4 h-4 text-cyan-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={inputFocused ? "Type prompt & press Enter to ask ByteHouse..." : "CSS Multi-Layer Spectrum Dynamics"}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                className="bg-transparent border-none outline-none text-white text-xs w-full placeholder:text-white/80 focus:placeholder:text-white/40 focus:ring-0 tracking-wide font-normal"
                disabled={isSubmitting}
              />
            </div>
            <span className="text-[11px] font-mono text-white/40 flex-shrink-0 ml-3">
              60 FPS Native GL/CSS
            </span>
          </div>
        </form>
      </footer>
    </div>
  );
}
