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
      className="liquid-window relative z-10 w-full h-full flex flex-col justify-between p-4 overflow-hidden"
      data-purpose="assistant-shell"
    >
      {/* BEGIN: Top Navigation Header */}
      <header className="relative z-10 flex items-center justify-between flex-shrink-0 mb-4" data-purpose="app-header">
        {/* Left: Identity & Strategy B Obsidian Lens Jewel Presence Orb */}
        <div className="flex items-center space-x-3.5">
          {/* Obsidian Lens Jewel Chamber from bytehouse_presence.html */}
          <div 
            className={`presence-bezel presence-bezel--${presenceState}`} 
            aria-label="ByteHouse presence"
            role="img"
          >
            <div className="presence-glow" />
            <div className="presence-orb">
              <div className="presence-energy" />
              <div className="presence-light" />
              <div className="presence-highlight" />
            </div>
          </div>

          {/* Title and Sleek Status Row */}
          <div className="flex flex-col justify-center">
            <h1 className="text-[16px] font-bold tracking-tight text-slate-900 leading-tight">
              ByteHouse
            </h1>
            <div className="flex items-center space-x-2 mt-1">
              {/* Live Presence Indicator */}
              <div className="flex items-center space-x-1.5">
                <span className="relative flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      presenceState === 'working'
                        ? 'bg-emerald-400'
                        : presenceState === 'thinking'
                        ? 'bg-violet-400'
                        : 'bg-sky-400'
                    }`}
                  ></span>
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      presenceState === 'working'
                        ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]'
                        : presenceState === 'thinking'
                        ? 'bg-violet-500 shadow-[0_0_6px_#8b5cf6]'
                        : 'bg-sky-500 shadow-[0_0_6px_#0ea5e9]'
                    }`}
                  ></span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  {presenceState}
                </span>
              </div>
              <span className="text-[9px] text-slate-400 font-medium select-none">•</span>
              {/* Model / Status Chip matching TRY pill styling */}
              <span className="header-pill">
                openai/gpt-oss-120b
              </span>
            </div>
          </div>
        </div>

        {/* Right: Control Actions */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          <button
            aria-label="Switch Space"
            className="glass-pill px-2.5 py-1 flex items-center space-x-1 text-xs font-semibold text-slate-700 hover:text-slate-900 active:scale-95 cursor-pointer overflow-hidden transition-all"
            type="button"
          >
            <span className="relative z-10 text-[10.5px] font-mono text-sky-600 font-bold tracking-tight">⌃⌥</span>
            <span className="relative z-10 text-[11px] font-medium text-slate-800">Space</span>
          </button>
          <button
            aria-label="Close Assistant"
            onClick={handleClose}
            className="glass-pill w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-900 active:scale-95 cursor-pointer overflow-hidden transition-all"
            type="button"
          >
            <svg className="relative z-10 w-3 h-3 stroke-[2.4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          </button>
        </div>
      </header>
      {/* END: Top Navigation Header */}

      {/* BEGIN: Chat Flow & Messages View */}
      <div
        ref={feedRef}
        className="flex-1 flex flex-col justify-start overflow-y-auto space-y-4 no-scrollbar relative z-10 px-1 pt-4 pb-2"
        data-purpose="chat-messages"
      >
        {/* Welcome Greeting Card (Shown initially) */}
        {messages.length === 0 && (
          <article className="liquid-card p-5 text-left relative overflow-hidden">
            {/* Greeting Headline */}
            <p className="text-[14.5px] leading-relaxed text-slate-900 font-normal tracking-[-0.01em]">
              Hello! I'm <span className="font-semibold text-slate-900">ByteHouse</span>, your personal AI companion.
            </p>

            {/* Assistant Sub-text */}
            <p className="text-[12.5px] text-slate-600 mt-1 leading-relaxed">
              I can remember facts, manage your tasks, and reason in real time with high accuracy.
            </p>

            {/* Try Suggestions Header Label */}
            <div className="flex items-center space-x-2 mt-4 mb-2.5">
              <span className="chip-label">
                Try
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Click to use prompt</span>
            </div>

            {/* Suggestions list as individual rounded cards */}
            <ul className="space-y-2">
              {suggestions.map((sugg, idx) => (
                <li
                  key={idx}
                  onClick={() => sendPromptText(sugg)}
                  className="suggestion-card group"
                >
                  <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                    {/* Small colored dot before text */}
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.7)] flex-shrink-0"></span>
                    <span className="text-[12.5px] text-slate-700 italic group-hover:text-slate-900 font-medium truncate transition-colors leading-tight">
                      "{sugg}"
                    </span>
                  </div>
                  {/* Right chevron icon aligned to far edge */}
                  <svg
                    className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
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
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} my-0.5`}
          >
            {msg.role === 'user' ? (
              <div className="user-bubble-liquid text-[13px] max-w-[85%] font-medium leading-6">
                {msg.content}
              </div>
            ) : (
              <div className="assistant-bubble-liquid text-left relative max-w-[90%] text-[13px] leading-6 text-slate-900">
                {msg.isStreaming && !msg.content ? (
                  <div className="thinking-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                ) : (
                  <>
                    <div className="break-words [overflow-wrap:anywhere]">{renderFormatted(msg.content)}</div>
                    {msg.isStreaming && <span className="streaming-cursor">▍</span>}
                  </>
                )}

                {/* Inline Action Cards for Tools */}
                {msg.tools_executed && msg.tools_executed.length > 0 && (
                  <div className="mt-2.5 space-y-1.5">
                    {msg.tools_executed.map((action, idx) => (
                      <div key={idx} className="tool-card-stitch">
                        {action.tool_name === 'remember' && (
                          <>
                            <span className="inline-block text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 mb-1">
                              Memory Stored
                            </span>
                            <div className="font-medium text-[12px] break-words">
                              📌 <em>"{action.output?.memory?.content || 'Fact remembered'}"</em>
                            </div>
                          </>
                        )}
                        {action.tool_name === 'create_task' && (
                          <>
                            <span className="inline-block text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200 mb-1">
                              Task Created
                            </span>
                            <div className="font-medium text-[12px] break-words">
                              📋 <strong>{action.output?.task?.title || 'New Task'}</strong>
                            </div>
                          </>
                        )}
                        {action.tool_name === 'complete_task' && (
                          <>
                            <span className="inline-block text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 mb-1">
                              Task Completed
                            </span>
                            <div className="font-medium text-[12px] break-words">
                              ✅ <strong>{action.output?.task?.title || 'Task'}</strong> marked completed.
                            </div>
                          </>
                        )}
                        {action.tool_name !== 'remember' &&
                          action.tool_name !== 'create_task' &&
                          action.tool_name !== 'complete_task' && (
                            <>
                              <span className="inline-block text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 mb-1">
                                {action.tool_name}
                              </span>
                              <div className="text-[12px] break-words">Completed with status: {action.status}</div>
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

      {/* BEGIN: Floating Input Bar */}
      <footer className="relative z-20 pt-1 flex-shrink-0" data-purpose="chat-input-bar">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <div className="relative overflow-hidden w-full flex items-center glass-pill pl-3 pr-1.5 py-1 focus-within:ring-2 focus-within:ring-sky-400/40 focus-within:border-sky-300 transition-all duration-200 shadow-sm">
            {/* Input Icon */}
            <div className="relative z-10 pl-0.5 pr-2 text-sky-500 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </div>

            {/* Text Input Field */}
            <input
              ref={inputRef}
              className="relative z-10 w-full bg-transparent border-none text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 px-1 py-0.5 font-normal tracking-[-0.01em]"
              placeholder="Ask ByteHouse or give an instruction..."
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isSubmitting}
            />

            {/* Solid Filled Circle Accent Send Button */}
            <button
              aria-label="Send prompt"
              type="submit"
              disabled={isSubmitting || !prompt.trim()}
              className="relative z-10 send-btn-solid"
            >
              <svg className="w-3.5 h-3.5 transform -rotate-12 translate-x-[-0.5px] translate-y-[-0.5px]" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
                <path d="M6 12L3 21l18-9L3 3l3 9zm0 0h9" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </button>
          </div>
        </form>

        {/* macOS Subtle Bottom Accent Pill Bar */}
        <div className="w-16 h-1 bg-slate-400/20 rounded-full mx-auto mt-2.5 pointer-events-none"></div>
      </footer>
      {/* END: Floating Input Bar */}
    </main>
  );
}
