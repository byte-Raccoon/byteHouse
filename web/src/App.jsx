import React, { useState, useEffect, useRef } from 'react';
import { bridge } from './bridge.js';

export default function App() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm **ByteHouse**, your personal companion.\n\nTry:\n• *\"Remember that my flight is on Friday\"*\n• *\"Add a task to prepare meeting notes\"*\n• *\"What do you remember?\"*",
    },
  ]);
  const [prompt, setPrompt] = useState('');
  const [presenceState, setPresenceState] = useState('idle');
  const [shortcut, setShortcut] = useState('⌃⌥ Space');
  const [conversationId, setConversationId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const feedRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Listen for presence state updates from Swift
    const unsubPresence = bridge.onPresenceState((state) => {
      setPresenceState(state);
    });

    // Fetch active shortcut
    bridge.getShortcut().then((sc) => {
      if (sc) setShortcut(sc);
    });

    return () => unsubPresence();
  }, []);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isSubmitting) return;

    const userMsg = {
      id: 'usr_' + Date.now(),
      role: 'user',
      content: cleanPrompt,
    };

    setMessages((prev) => [...prev, userMsg]);
    setPrompt('');
    setIsSubmitting(true);
    setPresenceState('thinking');

    try {
      const result = await bridge.chat(cleanPrompt, conversationId);
      if (result) {
        setConversationId(result.conversation_id);
        const assistantMsg = {
          id: 'asst_' + Date.now(),
          role: 'assistant',
          content: result.response,
          tools_executed: result.tools_executed,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      const errorMsg = {
        id: 'err_' + Date.now(),
        role: 'assistant',
        content: `⚠️ Error: ${err.message || 'Something went wrong.'}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSubmitting(false);
      setPresenceState('idle');
      inputRef.current?.focus();
    }
  };

  const handleClose = () => {
    bridge.hideWindow();
  };

  const renderFormatted = (text) => {
    return text.split('\n').map((line, i) => {
      // Basic bold & bullet formatting
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

  return (
    <div className="hud-container">
      {/* Header */}
      <header className="hud-header">
        <div className="presence-wrapper">
          <div className={`presence-orb ${presenceState}`} />
          <div className="presence-meta">
            <span className="hud-title">ByteHouse</span>
            <span className="presence-label">{presenceState}</span>
          </div>
        </div>
        <div className="header-actions">
          <span className="hotkey-badge">{shortcut}</span>
          <button className="icon-btn" onClick={handleClose} title="Hide HUD">
            ×
          </button>
        </div>
      </header>

      {/* Message Feed */}
      <main className="chat-feed" ref={feedRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="bubble">{renderFormatted(msg.content)}</div>

            {msg.tools_executed && msg.tools_executed.length > 0 && (
              <div className="tool-cards">
                {msg.tools_executed.map((action, idx) => (
                  <div key={idx} className="tool-card">
                    {action.tool_name === 'remember' && (
                      <>
                        <span className="tool-badge memory">Memory Stored</span>
                        <div>📌 <em>"{action.output?.memory?.content || 'Fact remembered'}"</em></div>
                      </>
                    )}
                    {action.tool_name === 'create_task' && (
                      <>
                        <span className="tool-badge task">Task Created</span>
                        <div>
                          📋 <strong>{action.output?.task?.title || 'New Task'}</strong>{' '}
                          [Priority: {action.output?.task?.priority || 'medium'}]
                        </div>
                      </>
                    )}
                    {action.tool_name === 'complete_task' && (
                      <>
                        <span className="tool-badge task">Task Completed</span>
                        <div>✅ <strong>{action.output?.task?.title || 'Task'}</strong> marked completed.</div>
                      </>
                    )}
                    {action.tool_name !== 'remember' &&
                      action.tool_name !== 'create_task' &&
                      action.tool_name !== 'complete_task' && (
                        <>
                          <span className="tool-badge">{action.tool_name}</span>
                          <div>Completed with status: {action.status}</div>
                        </>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </main>

      {/* Input Footer */}
      <footer className="hud-footer">
        <form className="input-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask ByteHouse or give an instruction..."
            autoFocus
            disabled={isSubmitting}
          />
          <button type="submit" className="send-btn" disabled={isSubmitting || !prompt.trim()}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </footer>
    </div>
  );
}
