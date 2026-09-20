import React, { useState, useEffect, useRef } from 'react';
import { bridge } from './bridge.js';
import { Bytie } from './presence/bytie/index.js';

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
  const [activeTask, setActiveTask] = useState(null);

  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const toggleButtonRef = useRef(null);
  const states = ['idle', 'listening', 'thinking'];

  const selectedProvider = PROVIDERS.find((p) => p.id === selectedProviderId) || PROVIDERS[0];

  useEffect(() => {
    // Automatically focus the typebar on launch
    inputRef.current?.focus();

    // Query any active pending task on startup
    bridge.listTasks().then((res) => {
      const tasks = res?.tasks || [];
      const pending = tasks.find((t) => t.status === 'pending');
      if (pending) {
        setActiveTask(pending);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    // Check initial active provider from Swift backend
    bridge.getProvider().then((res) => {
      if (res && res.name) {
        const lower = res.name.toLowerCase();
        if (lower.includes('bytie')) {
          setSelectedProviderId('bytie');
        } else if (lower.includes('gemini')) {
          setSelectedProviderId('gemini');
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
        inputRef.current?.focus();
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

    // Click empty space in window to focus typebar without needing to click directly on it
    const handleClickEmptySpace = (e) => {
      if (e.target.closest('button, input, textarea, a, kbd, [role="button"], .bytehouse, .provider-menu')) {
        return;
      }
      inputRef.current?.focus();
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

    const handleSimulateTask = (e) => {
      if (e.detail) {
        setActiveTask(e.detail);
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('dblclick', handleDoubleClick);
    window.addEventListener('click', handleClickEmptySpace);
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('simulateTask', handleSimulateTask);

    return () => {
      unsubPresence();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('dblclick', handleDoubleClick);
      window.removeEventListener('click', handleClickEmptySpace);
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('simulateTask', handleSimulateTask);
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
          for (const tool of result.tools_executed) {
            if (tool.tool_name === 'remember') {
              setStatusLabel('STATE: MEMORY STORED');
            } else if (tool.tool_name === 'create_task') {
              setStatusLabel('STATE: TASK CREATED');
              try {
                const taskRes = await bridge.listTasks();
                const tasks = taskRes?.tasks || [];
                const pending = tasks.find((t) => t.status === 'pending');
                if (pending) setActiveTask(pending);
              } catch (_) {}
            } else if (tool.tool_name === 'complete_task') {
              setStatusLabel('STATE: TASK COMPLETED');
              try {
                const taskRes = await bridge.listTasks();
                const tasks = taskRes?.tasks || [];
                const nextPending = tasks.find((t) => t.status === 'pending');
                setActiveTask(nextPending || null);
              } catch (_) {}
            }
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

  const handleCompleteTask = async (taskId) => {
    try {
      await bridge.completeTask(taskId);
      setStatusLabel('STATE: TASK COMPLETED');
      const taskRes = await bridge.listTasks();
      const tasks = taskRes?.tasks || [];
      const nextPending = tasks.find((t) => t.status === 'pending');
      setActiveTask(nextPending || null);
    } catch (err) {
      console.warn('Failed to complete task:', err);
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
    <div className="w-full h-full bg-grid flex flex-col justify-between items-center px-3 py-3.5 select-none overflow-hidden rounded-[20px]">
      {/* Top bar info */}
      <header className="w-full flex items-center justify-between z-20 px-1">
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

      {/* Center Stage: Shifts Bytie to the far left and Task Window to far right when activeTask is not null */}
      <main className="w-full flex-1 flex items-center justify-center my-auto z-10 select-none px-0">
        <div
          className={`w-full flex items-center transition-all duration-700 ease-out ${
            activeTask
              ? 'flex-col md:flex-row justify-between gap-3'
              : 'flex-col justify-center'
          }`}
        >
          {/* Left Side: Bytie Orb showcase pushed towards the left end */}
          <div
            className={`flex flex-col items-center justify-center transition-all duration-700 ease-out ${
              activeTask ? 'md:-ml-10 lg:-ml-12' : 'translate-x-0'
            }`}
          >
            <div className="bytehouse-stage">
              {/* Concentric soundwave halos */}
              <div className="sound-ring"></div>
              <div className="sound-ring"></div>
              <div className="sound-ring"></div>

              {/* 3D Living Spirit Entity (Bytie) */}
              <Bytie
                state={presenceState}
                size="standard"
                interactive={true}
                inputFocused={inputFocused}
                onClick={nextState}
                className="z-10"
              />
            </div>

            {/* Explicit Bytie Identity & Living Core label */}
            <div className="flex flex-col items-center mt-3 select-none">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-[0.25em] text-white uppercase drop-shadow-[0_0_10px_rgba(0,245,255,0.7)]">
                  BYTIE
                </span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-[9px] font-mono tracking-wider text-cyan-300 shadow-[0_0_8px_rgba(0,245,255,0.2)]">
                  LIVING CORE
                </span>
              </div>
            </div>

            {/* State readout & response */}
            <div className="mt-3.5 flex flex-col items-center">
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
              {latestResponse && (
                <p className="text-white/80 text-xs mt-2 max-w-xs tracking-wide leading-relaxed min-h-[1.5rem] animate-in fade-in duration-300 text-center">
                  {latestResponse}
                </p>
              )}
            </div>
          </div>

          {/* Right side: Dynamic Task Window pushed to the far right end with very little margin */}
          {activeTask && (
            <div
              className="task-card-window p-4.5 animate-in fade-in zoom-in-95 duration-500 text-left select-text mr-0"
              id="active-task-window"
            >
              {/* Task Header */}
              <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,245,255,0.9)] animate-pulse"></span>
                  <span className="text-[10px] font-mono tracking-widest text-cyan-300 uppercase font-semibold">
                    ACTIVE TASK
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider ${
                      activeTask.priority === 'high'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                        : activeTask.priority === 'low'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                    }`}
                  >
                    {activeTask.priority || 'NORMAL'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTask(null)}
                    title="Dismiss task window"
                    className="w-5 h-5 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors text-xs ml-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Task Content */}
              <div className="py-2.5">
                <h3 className="text-sm font-semibold text-white tracking-wide leading-snug break-words">
                  {activeTask.title}
                </h3>
                {activeTask.description && (
                  <p className="text-xs text-white/65 mt-1.5 leading-relaxed break-words font-normal">
                    {activeTask.description}
                  </p>
                )}
                <div className="mt-2.5 flex items-center gap-2 text-[10px] font-mono text-white/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/70"></span>
                  <span>STATUS: {activeTask.status.toUpperCase()}</span>
                </div>
              </div>

              {/* Task Actions */}
              <div className="pt-2.5 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => handleCompleteTask(activeTask.id)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 hover:border-emerald-400/80 text-emerald-300 hover:text-emerald-200 text-xs font-mono font-medium transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)] cursor-pointer active:scale-95"
                >
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  Mark Done
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Interactive controls */}
      <footer className="w-full max-w-xl z-20 flex flex-col items-center gap-3">
        <form onSubmit={handleSubmit} className="w-full">
          <div className="prompt-bar-wrapper">
            <div className="prompt-bar-inner">
              <div className="flex items-center gap-3 text-white/80 text-xs flex-grow min-w-0">
                {/* Living Bytie Spirit Icon without eyebrow, dynamic orb colors & shadows */}
                <svg
                  className="w-4 h-4 flex-shrink-0 bytie-spirit-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-label="Bytie Spirit Icon"
                >
                  <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" className="opacity-95" />
                  <circle cx="12" cy="9.8" r="2.7" fill="currentColor" />
                  <circle cx="12.9" cy="8.9" r="0.9" fill="#ffffff" className="bytie-spark" />
                  <circle cx="11.2" cy="10.8" r="0.45" fill="#ffffff" opacity="0.8" />
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
                  {selectedProvider.id === 'bytie' ? (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,245,255,0.8)] animate-pulse"></span>
                  ) : (
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedProvider.id === 'gemini' ? 'bg-emerald-400' : 'bg-purple-400'} animate-pulse`}></span>
                  )}
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
                              {p.id === 'bytie' ? (
                                <svg className="w-4 h-4 flex-shrink-0 bytie-spirit-icon" viewBox="0 0 24 24" fill="none">
                                  <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
                                  <circle cx="12" cy="9.8" r="2.7" fill="currentColor" />
                                  <circle cx="12.9" cy="8.9" r="0.9" fill="#ffffff" className="bytie-spark" />
                                </svg>
                              ) : (
                                <div className={`w-2.5 h-2.5 rounded-full ${p.id === 'gemini' ? 'bg-emerald-400' : 'bg-purple-400'} ${isSelected ? 'shadow-[0_0_8px_rgba(16,185,129,0.6)]' : ''}`}></div>
                              )}
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
        </div>
      </form>
      </footer>
    </div>
  );
}
