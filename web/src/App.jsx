import React, { useState, useEffect, useRef } from 'react';
import { bridge } from './bridge.js';

const PROVIDERS = [
  {
    id: 'bytie',
    name: 'Bytie',
    fullName: 'Bytie (Spirit of ByteHouse)',
    tagline: 'Homegrown Spirit • Local Core',
    badge: 'OFFLINE',
    color: 'text-cyan-400',
  },
  {
    id: 'gemini',
    name: 'Gemini 2.0',
    fullName: 'Google Gemini',
    tagline: 'Gemini 2.0 / 3.6 Flash API',
    badge: 'LIVE API',
    color: 'text-emerald-400',
  },
  {
    id: 'grok',
    name: 'Grok OSS',
    fullName: 'Grok OSS (Groq)',
    tagline: 'Fast Inference gpt-oss-120b',
    badge: 'HIGH SPEED',
    color: 'text-amber-400',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    fullName: 'OpenAI GPT-4o',
    tagline: 'GPT-4o / GPT-4o-mini Cloud',
    badge: 'LIVE API',
    color: 'text-purple-400',
  },
];

export default function App() {
  const [presenceState, setPresenceState] = useState('idle');
  const [prompt, setPrompt] = useState('');
  const [statusLabel, setStatusLabel] = useState('STATE: IDLE');
  const [latestResponse, setLatestResponse] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState('bytie');
  const [isProviderMenuOpen, setIsProviderMenuOpen] = useState(false);

  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const toggleButtonRef = useRef(null);
  const states = ['idle', 'listening', 'thinking'];

  const selectedProvider = PROVIDERS.find((p) => p.id === selectedProviderId) || PROVIDERS[0];

  useEffect(() => {
    // Check initial active provider from Swift backend
    bridge.getProvider().then((res) => {
      if (res && res.name) {
        const lower = res.name.toLowerCase();
        if (lower.includes('bytie')) {
          setSelectedProviderId('bytie');
        } else if (lower.includes('gemini')) {
          setSelectedProviderId('gemini');
        } else if (lower.includes('groq') || lower.includes('grok')) {
          setSelectedProviderId('grok');
        } else if (lower.includes('openai')) {
          setSelectedProviderId('openai');
        }
      }
    }).catch(() => {});

    // Listen for presence state changes from Swift backend
    const unsubPresence = bridge.onPresenceState((state) => {
      forceState(state);
    });

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isProviderMenuOpen) {
          setIsProviderMenuOpen(false);
          return;
        }
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
      if (e.target.closest('button, input, textarea, a, kbd, [role="button"], .provider-menu')) {
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

    // Double-click anywhere to toggle maximize / restore window size
    const handleDoubleClick = (e) => {
      if (e.target.closest('button, input, textarea, a, kbd, [role="button"], .bytehouse, .provider-menu')) {
        return;
      }
      bridge.toggleMaximize();
    };

    // Close provider menu when clicking outside
    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        toggleButtonRef.current &&
        !toggleButtonRef.current.contains(e.target)
      ) {
        setIsProviderMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('dblclick', handleDoubleClick);
    window.addEventListener('mousedown', handleClickOutside);

    return () => {
      unsubPresence();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('dblclick', handleDoubleClick);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [presenceState, isProviderMenuOpen]);

  const forceState = (stateName) => {
    setPresenceState(stateName);
    setStatusLabel('STATE: ' + stateName.toUpperCase());
  };

  const nextState = () => {
    const currentIdx = states.indexOf(presenceState);
    const nextIdx = (currentIdx + 1) % states.length;
    forceState(states[nextIdx]);
  };

  const handleSelectProvider = async (providerId) => {
    setSelectedProviderId(providerId);
    setIsProviderMenuOpen(false);
    const chosen = PROVIDERS.find((p) => p.id === providerId) || PROVIDERS[0];
    setStatusLabel(`TALKING TO: ${chosen.name.toUpperCase()}`);
    try {
      await bridge.setProvider(providerId);
    } catch (err) {
      console.warn('Failed to switch provider:', err);
    }
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
          <div className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl focus-within:border-cyan-400/40 focus-within:bg-white/[0.07] transition-all shadow-lg">
            <div className="flex items-center gap-3 text-white/80 text-xs flex-grow min-w-0">
              {/* ByteHouse Circle-Dot Logo Icon */}
              <svg className="w-4 h-4 text-cyan-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" aria-label="ByteHouse Icon">
                <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="2.5" fill="currentColor" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={inputFocused ? "Type prompt & press Enter to ask ByteHouse..." : `Message ${selectedProvider.name} or press Enter...`}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                className="bg-transparent border-none outline-none text-white text-xs w-full placeholder:text-white/40 focus:ring-0 tracking-wide font-normal"
                disabled={isSubmitting}
              />
            </div>

            {/* Provider Selector ("Who am I talking to") */}
            <div className="relative flex-shrink-0 ml-3">
              <button
                ref={toggleButtonRef}
                type="button"
                onClick={() => setIsProviderMenuOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-cyan-400/40 transition-all text-xs font-mono text-white/80 cursor-pointer shadow-sm group select-none"
                title="Select who you are talking to"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${selectedProvider.id === 'bytie' ? 'bg-cyan-400' : 'bg-emerald-400'} animate-pulse`}></span>
                <span className="text-white/40 text-[10px] hidden sm:inline tracking-wider">TALKING TO:</span>
                <span className="text-white font-medium text-[11px] group-hover:text-cyan-300 transition-colors">{selectedProvider.name}</span>
                <svg className={`w-3 h-3 text-white/40 transition-transform duration-200 ${isProviderMenuOpen ? 'rotate-180 text-cyan-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Floating Provider Menu */}
              {isProviderMenuOpen && (
                <div
                  ref={menuRef}
                  className="provider-menu absolute bottom-full right-0 mb-2.5 w-72 rounded-xl bg-[#0c121e]/95 backdrop-blur-2xl border border-white/10 p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-2.5 py-1.5 border-b border-white/5 mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-mono tracking-widest uppercase text-white/40">Select Intelligence</span>
                    <span className="text-[9px] font-mono text-cyan-400/80 px-1.5 py-0.5 rounded bg-cyan-400/10">ByteHouse</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {PROVIDERS.map((p) => {
                      const isSelected = p.id === selectedProviderId;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectProvider(p.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all ${
                            isSelected
                              ? 'bg-cyan-500/15 border border-cyan-400/30 text-white'
                              : 'hover:bg-white/5 border border-transparent text-white/70 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-2 h-2 rounded-full ${p.id === 'bytie' ? 'bg-cyan-400' : 'bg-emerald-400'} ${isSelected ? 'shadow-[0_0_8px_rgba(0,245,255,0.6)]' : ''}`}></div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-white">{p.fullName}</span>
                                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/5 text-white/40">{p.badge}</span>
                              </div>
                              <span className="text-[10px] text-white/40 font-mono tracking-tight">{p.tagline}</span>
                            </div>
                          </div>
                          {isSelected && (
                            <svg className="w-4 h-4 text-cyan-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      </footer>
    </div>
  );
}
