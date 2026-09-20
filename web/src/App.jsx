import React, { useState, useEffect, useRef } from 'react';
import { bridge } from './bridge.js';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [presenceState, setPresenceState] = useState('idle');
  const [shortcut, setShortcut] = useState('⌃⌥ Space');
  const [conversationId, setConversationId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const feedRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Listen for presence state updates from Swift bridge
    const unsubPresence = bridge.onPresenceState((state) => {
      setPresenceState(state);
    });

    // Fetch active shortcut
    bridge.getShortcut().then((sc) => {
      if (sc) setShortcut(sc);
    });

    // Dismiss HUD on Escape key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        bridge.hideWindow();
      }
      // Space key to toggle state when not typing in input
      if (e.code === 'Space' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        cyclePresenceState();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Auto-focus input
    inputRef.current?.focus();

    return () => {
      unsubPresence();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [presenceState]);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  const cyclePresenceState = () => {
    const states = ['idle', 'listening', 'thinking'];
    const nextIdx = (states.indexOf(presenceState) + 1) % states.length;
    setPresenceState(states[nextIdx]);
  };

  const sendPromptText = async (textToSend) => {
    const cleanPrompt = textToSend.trim();
    if (!cleanPrompt || isSubmitting) return;

    const userMsg = {
      id: 'usr_' + Date.now(),
      role: 'user',
      content: cleanPrompt,
    };

    const asstId = 'asst_' + Date.now();
    const assistantPlaceholder = {
      id: asstId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      tools_executed: [],
    };

    setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
    setPrompt('');
    setIsSubmitting(true);
    setPresenceState('thinking');

    try {
      const result = await bridge.chatStream(cleanPrompt, conversationId, (delta) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === asstId
              ? { ...msg, content: msg.content + delta }
              : msg
          )
        );
      });

      if (result) {
        setConversationId(result.conversation_id);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === asstId
              ? {
                  ...msg,
                  content: result.response || msg.content,
                  tools_executed: result.tools_executed,
                  isStreaming: false,
                }
              : msg
          )
        );
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === asstId
            ? {
                ...msg,
                content: `⚠️ Error: ${err.message || 'Something went wrong.'}`,
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setIsSubmitting(false);
      setPresenceState('idle');
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendPromptText(prompt);
  };

  const handleClose = () => {
    bridge.hideWindow();
  };

  const renderFormatted = (text) => {
    return text.split('\n').map((line, i) => {
      let formatted = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^•\s*(.*)/, '<li>$1</li>');

      return (
        <span
          key={i}
          dangerouslySetInnerHTML={{ __html: formatted }}
          style={{ display: 'block', minHeight: line === '' ? '8px' : 'auto' }}
        />
      );
    });
  };

  const suggestions = [
    'Remember that my flight is on Friday at 6 PM',
    'Add a task to prepare weekly product review notes',
    'What do you remember about my preferences?',
  ];

  const hasMessages = messages.length > 0;

  return (
    <main className="spotlight-window bg-grid p-4 select-none" data-purpose="spotlight-window">
      {/* Top macOS Titlebar Area */}
      <header className="flex items-center justify-between z-20 pb-2 border-b border-white/[0.08]">
        {/* Left: macOS Traffic Light Controls */}
        <div className="flex items-center gap-2 group">
          <button
            onClick={handleClose}
            className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
            title="Close (⎋)"
            type="button"
          >
            <svg className="w-1.5 h-1.5 text-black/60 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={handleClose}
            className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
            title="Minimize"
            type="button"
          >
            <svg className="w-1.5 h-1.5 text-black/60 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
            </svg>
          </button>
          <button
            className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29] flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
            title="Zoom"
            type="button"
          >
            <svg className="w-1.5 h-1.5 text-black/60 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M7 7h10v10" />
            </svg>
          </button>
        </div>

        {/* Center: Engine Status Centerpiece */}
        <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] px-3 py-1 rounded-full shadow-inner">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              presenceState === 'thinking' ? 'bg-fuchsia-400' : presenceState === 'listening' ? 'bg-cyan-400' : 'bg-emerald-400'
            }`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              presenceState === 'thinking' ? 'bg-fuchsia-500 shadow-[0_0_8px_#ec4899]' : presenceState === 'listening' ? 'bg-cyan-400 shadow-[0_0_8px_#00f5ff]' : 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
            }`}></span>
          </span>
          <span className="text-[11px] font-mono font-semibold tracking-wide text-white/90">ByteHouse Core v4.2</span>
          <span className="text-white/30 text-[10px]">•</span>
          <span className="text-[11px] font-mono text-cyan-300 capitalize">{presenceState}</span>
          <span className="text-[9px] font-mono bg-white/[0.08] px-1.5 py-0.5 rounded text-white/60">{shortcut}</span>
        </div>

        {/* Right: State Badges & Telemetry */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/[0.05] border border-white/[0.1] rounded-full p-0.5">
            <button
              onClick={() => setPresenceState('idle')}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                presenceState === 'idle'
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-sm'
                  : 'text-white/40 hover:text-white'
              }`}
              type="button"
            >
              IDLE
            </button>
            <button
              onClick={() => setPresenceState('listening')}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                presenceState === 'listening'
                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow-sm'
                  : 'text-white/40 hover:text-white'
              }`}
              type="button"
            >
              LISTENING
            </button>
            <button
              onClick={() => setPresenceState('thinking')}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                presenceState === 'thinking'
                  ? 'bg-fuchsia-500/20 border border-fuchsia-500/40 text-pink-300 shadow-sm'
                  : 'text-white/40 hover:text-white'
              }`}
              type="button"
            >
              THINKING
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10 my-2">
        {/* Orb Hero Showcase */}
        <div className={`flex flex-col items-center justify-center transition-all duration-300 ${
          hasMessages ? 'py-1 flex-shrink-0' : 'my-auto py-4'
        }`}>
          {/* ByteHouse Orb Stage */}
          <div className={`bytehouse-stage ${hasMessages ? 'bytehouse-stage--compact' : ''}`}>
            <div className="sound-ring"></div>
            <div className="sound-ring"></div>
            <div className="sound-ring"></div>

            <div
              className={`bytehouse ${presenceState}`}
              onClick={cyclePresenceState}
              role="button"
              tabIndex={0}
              title="Click to cycle states (Idle → Listening → Thinking)"
              aria-label="ByteHouse assistant orb"
            >
              <div className="glow"></div>
              <div className="orb">
                <div className="energy"></div>
                <div className="light"></div>
                <div className="highlight"></div>
              </div>
            </div>
          </div>

          {/* Audio Amplitude Equalizer Bars & Readout */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-[3px] h-3 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
              <span className={`w-[2px] h-1.5 rounded-full ${presenceState === 'thinking' ? 'bg-pink-400' : 'bg-cyan-400'} animate-[pulse_1.1s_ease-in-out_infinite]`}></span>
              <span className={`w-[2px] h-2.5 rounded-full ${presenceState === 'thinking' ? 'bg-pink-400' : 'bg-cyan-400'} animate-[pulse_0.9s_ease-in-out_infinite_0.1s]`}></span>
              <span className={`w-[2px] h-3.5 rounded-full ${presenceState === 'thinking' ? 'bg-pink-400' : 'bg-cyan-400'} animate-[pulse_0.7s_ease-in-out_infinite_0.2s]`}></span>
              <span className={`w-[2px] h-2 rounded-full ${presenceState === 'thinking' ? 'bg-fuchsia-400' : 'bg-secondary'} animate-[pulse_1.0s_ease-in-out_infinite_0.3s]`}></span>
              <span className={`w-[2px] h-3 rounded-full ${presenceState === 'thinking' ? 'bg-fuchsia-400' : 'bg-secondary'} animate-[pulse_0.8s_ease-in-out_infinite_0.15s]`}></span>
              <span className={`w-[2px] h-1 rounded-full ${presenceState === 'thinking' ? 'bg-pink-400' : 'bg-cyan-400'} animate-[pulse_1.2s_ease-in-out_infinite_0.25s]`}></span>
            </div>
            <span className="text-[10px] font-mono text-white/50 tracking-wider">
              {presenceState === 'thinking' ? '48.2 kHz Neural Stream • Synthesizing' : presenceState === 'listening' ? 'Active Audio Pipe • Ready' : 'Standby • 60 FPS Native CSS'}
            </span>
          </div>
        </div>

        {/* Initial Suggestions List (Shown when no messages) */}
        {!hasMessages && (
          <div className="w-full max-w-xl mx-auto space-y-2 mb-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Suggested Commands</span>
              <span className="text-[10px] text-cyan-400/80 font-mono">Click to run</span>
            </div>
            {suggestions.map((sugg, idx) => (
              <div
                key={idx}
                onClick={() => sendPromptText(sugg)}
                className="stitch-suggestion-card group"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f5ff] flex-shrink-0"></span>
                  <span className="text-[12.5px] text-white/80 italic group-hover:text-white font-medium truncate transition-colors">
                    "{sugg}"
                  </span>
                </div>
                <svg
                  className="w-3.5 h-3.5 text-white/30 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </div>
            ))}
          </div>
        )}

        {/* Active Conversation Feed */}
        {hasMessages && (
          <div
            ref={feedRef}
            className="flex-1 overflow-y-auto no-scrollbar space-y-3 px-1 py-2"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                {msg.role === 'user' ? (
                  <div className="stitch-user-bubble text-[13px] max-w-[85%] font-medium leading-relaxed">
                    {msg.content}
                  </div>
                ) : (
                  <div className="stitch-assistant-bubble text-left max-w-[92%] text-[13px] leading-relaxed">
                    {msg.isStreaming && !msg.content ? (
                      <div className="thinking-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    ) : (
                      <>
                        <div className="break-words [overflow-wrap:anywhere] text-slate-100">
                          {renderFormatted(msg.content)}
                        </div>
                        {msg.isStreaming && <span className="streaming-cursor">▍</span>}
                      </>
                    )}

                    {/* Stitch Tool Execution Action Cards */}
                    {msg.tools_executed && msg.tools_executed.length > 0 && (
                      <div className="space-y-1.5 mt-2">
                        {msg.tools_executed.map((action, idx) => (
                          <div key={idx} className="stitch-tool-card">
                            {action.tool_name === 'remember' && (
                              <>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    Memory Stored
                                  </span>
                                  <span className="text-[10px] font-mono text-white/40">SQLite Persisted</span>
                                </div>
                                <div className="text-[12px] text-white/90 font-medium break-words">
                                  📌 <em>"{action.output?.memory?.content || 'Fact remembered'}"</em>
                                </div>
                              </>
                            )}
                            {action.tool_name === 'create_task' && (
                              <>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                    Task Created
                                  </span>
                                  <span className="text-[10px] font-mono text-white/40">Priority: Normal</span>
                                </div>
                                <div className="text-[12px] text-white/90 font-medium break-words">
                                  📋 <strong>{action.output?.task?.title || 'New Task'}</strong>
                                </div>
                              </>
                            )}
                            {action.tool_name === 'complete_task' && (
                              <>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    Task Completed
                                  </span>
                                  <span className="text-[10px] font-mono text-white/40">Status: Done</span>
                                </div>
                                <div className="text-[12px] text-white/90 font-medium break-words">
                                  ✅ <strong>{action.output?.task?.title || 'Task'}</strong> marked completed.
                                </div>
                              </>
                            )}
                            {action.tool_name !== 'remember' &&
                              action.tool_name !== 'create_task' &&
                              action.tool_name !== 'complete_task' && (
                                <>
                                  <span className="inline-block text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30 mb-1">
                                    {action.tool_name}
                                  </span>
                                  <div className="text-[12px] text-white/80 break-words">
                                    Status: {action.status}
                                  </div>
                                </>
                              )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Spotlight Command Omnibar Input */}
      <footer className="pt-2 z-20 flex-shrink-0" data-purpose="spotlight-input">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <div className="relative w-full flex items-center rounded-xl bg-white/[0.06] border border-white/[0.12] backdrop-blur-2xl shadow-lg transition-all focus-within:bg-white/[0.09] focus-within:border-cyan-400/50 focus-within:shadow-[0_0_24px_rgba(0,245,255,0.25)] px-3 py-1.5">
            {/* Left Slot: Auto Awesome Sparkle Icon */}
            <div className="pl-1 pr-2.5 text-cyan-400 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>

            {/* Input Field */}
            <input
              ref={inputRef}
              className="w-full bg-transparent border-none text-[13.5px] text-white placeholder:text-white/40 focus:outline-none focus:ring-0 px-1 py-1 font-normal tracking-[-0.01em]"
              placeholder="Ask ByteHouse anything, create a task, or recall memory..."
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isSubmitting}
            />

            {/* Dictation / Mic Button */}
            <button
              type="button"
              onClick={cyclePresenceState}
              className="p-1.5 rounded-lg text-white/50 hover:text-cyan-300 transition-colors cursor-pointer"
              title="Toggle State / Dictation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15a3 3 0 003-3V6a3 3 0 00-3-3 3 3 0 00-3 3v6a3 3 0 003 3z" />
              </svg>
            </button>

            {/* Return Keycap Badge */}
            <div className="flex items-center gap-1 mx-1.5 px-2 py-0.5 rounded bg-white/[0.08] text-white/50 text-[10px] font-mono shadow-inner">
              <span>↵</span>
              <span>Return</span>
            </div>

            {/* Send Button */}
            <button
              aria-label="Send prompt"
              type="submit"
              disabled={isSubmitting || !prompt.trim()}
              className="w-7 h-7 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center justify-center transition-all disabled:opacity-30 disabled:hover:bg-cyan-500 cursor-pointer shadow-[0_0_12px_rgba(0,245,255,0.4)] flex-shrink-0 active:scale-95"
            >
              <svg className="w-3.5 h-3.5 transform -rotate-12 translate-x-[-0.5px] translate-y-[-0.5px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M6 12L3 21l18-9L3 3l3 9zm0 0h9" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </button>
          </div>
        </form>

        {/* Shortcuts & Telemetry Footer */}
        <div className="flex items-center justify-between px-2 pt-2 text-white/40 text-[10.5px]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-white/[0.08] font-mono text-[9px] text-white/70">⌘K</span>
              <span>Actions</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-white/[0.08] font-mono text-[9px] text-white/70">⌥Space</span>
              <span>Toggle</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-white/[0.08] font-mono text-[9px] text-white/70">⎋</span>
              <span>Dismiss</span>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className="flex items-center gap-1 text-cyan-300">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f5ff]"></span>
              <span>Neural Engine Active</span>
            </span>
            <span className="text-white/20">|</span>
            <span>60 FPS GL/CSS</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
