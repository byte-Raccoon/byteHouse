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
  const shellRef = useRef(null);

  useEffect(() => {
    // Listen for presence state updates from Swift
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
    };
    window.addEventListener('keydown', handleKeyDown);

    // Interactive cursor specular reflection tracking from Stitch
    const handlePointerMove = (e) => {
      if (!shellRef.current) return;
      const rect = shellRef.current.getBoundingClientRect();
      const xPercent = Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, 0), 100);
      const yPercent = Math.min(Math.max(((e.clientY - rect.top) / rect.height) * 100, 0), 100);
      shellRef.current.style.setProperty('--liquid-x', `${xPercent}%`);
      shellRef.current.style.setProperty('--liquid-y', `${yPercent}%`);
    };
    window.addEventListener('pointermove', handlePointerMove);

    // Auto-focus input
    inputRef.current?.focus();

    return () => {
      unsubPresence();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

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
    'Remember that my flight is on Friday',
    'Add a task to prepare meeting notes',
    'What do you remember?',
  ];

  return (
    <main
      ref={shellRef}
      className="liquid-window relative z-10 w-full h-full rounded-[36px] flex flex-col justify-between p-4.5 pb-5 overflow-hidden shadow-2xl shadow-blue-900/10"
      data-purpose="assistant-shell"
    >
      {/* Traveling specular perimeter shimmer border */}
      <div className="perimeter-shimmer"></div>

      {/* Ambient liquid caustics behind glass surface */}
      <div className="caustic-fluid-layer">
        <div className="caustic-mesh-1"></div>
        <div className="caustic-mesh-2"></div>
      </div>

      {/* Diagonal refractive fluid sweep */}
      <div className="fluid-shimmer-sweep"></div>

      {/* Liquid Bevel Refraction Lines */}
      <div className="absolute top-0 left-10 right-10 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none"></div>
      <div className="absolute bottom-0 left-16 right-16 h-[1px] bg-gradient-to-r from-transparent via-sky-200/60 to-transparent pointer-events-none"></div>

      {/* BEGIN: Top Navigation Header */}
      <header className="relative z-10 flex items-center justify-between pt-1 px-1 flex-shrink-0" data-purpose="app-header">
        {/* Left: Identity & Pearl Orb Avatar */}
        <div className="flex items-center space-x-3">
          {/* Iridescent Pearl Orb Avatar with Sky Halo */}
          <div className="relative w-11 h-11 rounded-full p-[2px] bg-gradient-to-tr from-sky-400 via-blue-400 to-cyan-300 shadow-[0_4px_16px_rgba(56,189,248,0.35)] flex-shrink-0">
            <div className="w-full h-full rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center overflow-hidden relative shadow-inner">
              <video
                className="w-full h-full object-cover rounded-full pointer-events-none"
                src="/orb-animation.webm"
                autoPlay
                loop
                muted
                playsInline
              />
              {/* Specular reflection overlays */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-transparent to-transparent rounded-full pointer-events-none"></div>
              <div className="absolute w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#ffffff] top-1.5 left-2 pointer-events-none"></div>
            </div>
          </div>

          {/* Title and Sleek Status Row */}
          <div className="flex flex-col justify-center">
            <h1 className="text-[16.5px] font-bold tracking-tight text-slate-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)] leading-tight">
              ByteHouse
            </h1>
            <div className="flex items-center space-x-2 mt-0.5">
              {/* Live Presence Indicator */}
              <div className="flex items-center space-x-1.5">
                <span className="relative flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      presenceState === 'working'
                        ? 'bg-cyan-400'
                        : presenceState === 'thinking'
                        ? 'bg-pink-400'
                        : 'bg-emerald-400'
                    }`}
                  ></span>
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      presenceState === 'working'
                        ? 'bg-cyan-500 shadow-[0_0_6px_#06b6d4]'
                        : presenceState === 'thinking'
                        ? 'bg-pink-500 shadow-[0_0_6px_#ec4899]'
                        : 'bg-emerald-500 shadow-[0_0_6px_#10b981]'
                    }`}
                  ></span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  {presenceState}
                </span>
              </div>
              <span className="text-[9px] text-blue-300 font-medium select-none">•</span>
              {/* Model Badge */}
              <span className="inline-flex items-center text-[10px] font-semibold text-slate-700 bg-white/70 border border-blue-200/60 shadow-[0_1px_3px_rgba(14,116,144,0.05)] px-2 py-0.5 rounded-full">
                openai/gpt-oss-120b
              </span>
            </div>
          </div>
        </div>

        {/* Right: Control Actions */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            aria-label="Switch Space"
            className="glass-pill px-3 py-1.5 rounded-full flex items-center space-x-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 active:scale-95 cursor-pointer overflow-hidden transition-all shadow-sm"
            type="button"
          >
            <span className="relative z-10 text-[11px] font-mono text-sky-600 font-bold tracking-tight">⌃⌥</span>
            <span className="relative z-10 tracking-normal font-medium text-slate-800">Space</span>
          </button>
          <button
            aria-label="Close Assistant"
            onClick={handleClose}
            className="glass-pill w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 active:scale-95 cursor-pointer overflow-hidden transition-all shadow-sm"
            type="button"
          >
            <svg className="relative z-10 w-3.5 h-3.5 stroke-[2.4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          </button>
        </div>
      </header>
      {/* END: Top Navigation Header */}

      {/* BEGIN: Chat Flow & Messages View */}
      <div
        ref={feedRef}
        className="flex-1 flex flex-col justify-start pt-5 px-0.5 overflow-y-auto space-y-3.5 no-scrollbar relative z-10"
        data-purpose="chat-messages"
      >
        {/* Welcome Greeting Liquid Bubble Card (Shown initially) */}
        {messages.length === 0 && (
          <article className="liquid-card rounded-3xl p-5 text-left relative overflow-hidden backdrop-blur-2xl border border-blue-100/70">
            <div className="caustic-fluid-layer opacity-30">
              <div className="caustic-mesh-1 scale-125"></div>
            </div>
            <div className="fluid-shimmer-sweep opacity-40"></div>
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-sky-200/40 rounded-full blur-2xl pointer-events-none"></div>

            <p className="relative z-10 text-[14.5px] leading-relaxed text-slate-800 font-normal tracking-[-0.01em]">
              Hello! I'm <span className="font-bold text-slate-900 drop-shadow-sm">ByteHouse</span>, your personal intelligence companion.
            </p>

            <div className="relative z-10 flex items-center space-x-2 mt-4 mb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-700 bg-sky-100/70 px-2 py-0.5 rounded-md">
                Try
              </span>
              <span className="text-xs text-slate-500 font-medium">Click to use prompt</span>
            </div>

            <ul className="relative z-10 space-y-2">
              {suggestions.map((sug, i) => (
                <li
                  key={i}
                  onClick={() => sendPromptText(sug)}
                  className="prompt-chip group flex items-center justify-between p-3 rounded-2xl cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.8)] flex-shrink-0"></span>
                    <span className="text-[13px] text-slate-700 italic group-hover:text-sky-900 group-hover:not-italic font-medium truncate transition-colors leading-tight">
                      "{sug}"
                    </span>
                  </div>
                  <svg
                    className="w-4 h-4 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                </li>
              ))}
            </ul>
          </article>
        )}

        {/* Dynamic Messages Feed */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            {msg.role === 'user' ? (
              <div className="user-bubble-liquid p-3 px-4.5 text-[13.5px] max-w-[88%] font-medium leading-relaxed">
                {msg.content}
              </div>
            ) : (
              <div className="assistant-bubble-liquid p-4 sm:p-4.5 text-left relative overflow-hidden backdrop-blur-2xl border border-blue-100/80 max-w-[92%] text-[13.5px] leading-relaxed text-slate-800">
                {msg.isStreaming && !msg.content ? (
                  <div className="thinking-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                ) : (
                  <>
                    <div>{renderFormatted(msg.content)}</div>
                    {msg.isStreaming && <span className="streaming-cursor">▍</span>}
                  </>
                )}

                {/* Inline Action Cards for Tools */}
                {msg.tools_executed && msg.tools_executed.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.tools_executed.map((action, idx) => (
                      <div key={idx} className="tool-card-stitch">
                        {action.tool_name === 'remember' && (
                          <>
                            <span className="inline-block text-[9.5px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 mb-1">
                              Memory Stored
                            </span>
                            <div className="font-medium text-[12.5px]">
                              📌 <em>"{action.output?.memory?.content || 'Fact remembered'}"</em>
                            </div>
                          </>
                        )}
                        {action.tool_name === 'create_task' && (
                          <>
                            <span className="inline-block text-[9.5px] uppercase font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200 mb-1">
                              Task Created
                            </span>
                            <div className="font-medium text-[12.5px]">
                              📋 <strong>{action.output?.task?.title || 'New Task'}</strong> [Priority: {action.output?.task?.priority || 'medium'}]
                            </div>
                          </>
                        )}
                        {action.tool_name === 'complete_task' && (
                          <>
                            <span className="inline-block text-[9.5px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 mb-1">
                              Task Completed
                            </span>
                            <div className="font-medium text-[12.5px]">
                              ✅ <strong>{action.output?.task?.title || 'Task'}</strong> marked completed.
                            </div>
                          </>
                        )}
                        {action.tool_name !== 'remember' &&
                          action.tool_name !== 'create_task' &&
                          action.tool_name !== 'complete_task' && (
                            <>
                              <span className="inline-block text-[9.5px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 mb-1">
                                {action.tool_name}
                              </span>
                              <div className="text-[12px]">Completed with status: {action.status}</div>
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
      {/* END: Chat Flow & Messages View */}

      {/* BEGIN: Floating Liquid Input Capsule */}
      <footer className="relative z-20 pt-2 flex-shrink-0" data-purpose="chat-input-bar">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <div className="relative overflow-hidden w-full flex items-center glass-pill rounded-full pl-4 pr-1.5 py-1.5 focus-within:ring-2 focus-within:ring-sky-400/40 focus-within:border-sky-300 transition-all duration-300 shadow-[0_8px_24px_rgba(14,60,110,0.08)]">
            <div className="fluid-shimmer-sweep opacity-50 pointer-events-none"></div>

            {/* Input Icon */}
            <div className="relative z-10 pl-1 pr-2.5 text-sky-500 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </div>

            {/* Text Input Field */}
            <input
              ref={inputRef}
              className="relative z-10 w-full bg-transparent border-none text-[13.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 p-0 font-normal tracking-[-0.01em]"
              placeholder="Ask ByteHouse or give an instruction..."
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isSubmitting}
            />

            {/* Translucent Glass Send Action Button */}
            <button
              aria-label="Send prompt"
              type="submit"
              disabled={isSubmitting || !prompt.trim()}
              className="relative z-10 send-btn-liquid w-8 h-8 rounded-full flex items-center justify-center ml-2 text-white hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5 transform -rotate-12 translate-x-[-0.5px] translate-y-[-0.5px]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M6 12L3 21l18-9L3 3l3 9zm0 0h9" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </button>
          </div>
        </form>

        {/* iOS / macOS Accent Pill Bar */}
        <div className="w-24 h-1 bg-slate-400/25 rounded-full mx-auto mt-2.5 mb-0.5 pointer-events-none"></div>
      </footer>
      {/* END: Floating Liquid Input Capsule */}
    </main>
  );
}
