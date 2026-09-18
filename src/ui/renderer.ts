declare global {
  interface Window {
    bytehouse?: {
      chat: (prompt: string, conversationId?: string) => Promise<any>;
      listTasks: () => Promise<any[]>;
      listMemories: () => Promise<any[]>;
      hideWindow: () => Promise<void>;
      getShortcut: () => Promise<string>;
      onPresenceState: (callback: (state: string) => void) => void;
    };
  }
}

const chatFeed = document.getElementById('chat-feed') as HTMLDivElement;
const chatForm = document.getElementById('chat-form') as HTMLFormElement;
const promptInput = document.getElementById('prompt-input') as HTMLInputElement;
const presenceOrb = document.getElementById('presence-orb') as HTMLDivElement;
const presenceStatus = document.getElementById('presence-status') as HTMLSpanElement;
const closeBtn = document.getElementById('close-btn') as HTMLButtonElement;
const hotkeyBadge = document.getElementById('hotkey-badge') as HTMLSpanElement;

let currentConversationId: string | undefined = undefined;

// Fetch and display configured shortcut
if (window.bytehouse?.getShortcut && hotkeyBadge) {
  window.bytehouse.getShortcut().then((sc: string) => {
    let formatted = sc
      .replace(/CommandOrControl/g, '⌘')
      .replace(/Control/g, '⌃')
      .replace(/Option|Alt/g, '⌥')
      .replace(/Shift/g, '⇧')
      .replace(/\+/g, ' ');
    hotkeyBadge.textContent = formatted;
  });
}

// Presence State Updates
if (window.bytehouse?.onPresenceState) {
  window.bytehouse.onPresenceState((state: string) => {
    updatePresence(state);
  });
}

function updatePresence(state: string): void {
  if (!presenceOrb || !presenceStatus) return;
  presenceOrb.className = `presence-orb ${state}`;
  presenceStatus.textContent = state;
}

closeBtn?.addEventListener('click', () => {
  window.bytehouse?.hideWindow();
});

chatForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const prompt = promptInput.value.trim();
  if (!prompt) return;

  // Append user bubble
  appendMessage('user', prompt);
  promptInput.value = '';
  promptInput.disabled = true;

  try {
    updatePresence('thinking');
    if (!window.bytehouse) {
      throw new Error('ByteHouse system bridge not found. Please restart via "npm run dev".');
    }
    const result = await window.bytehouse.chat(prompt, currentConversationId);
    if (result) {
      currentConversationId = result.conversation_id;
      appendAssistantMessage(result.response, result.tools_executed);
    }
  } catch (err: any) {
    appendMessage('assistant', `⚠️ Error: ${err.message || 'Something went wrong.'}`);
  } finally {
    promptInput.disabled = false;
    promptInput.focus();
    updatePresence('idle');
  }
});

function appendMessage(role: 'user' | 'assistant', content: string): void {
  const msgEl = document.createElement('div');
  msgEl.className = `message ${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = content;
  msgEl.appendChild(bubble);
  chatFeed.appendChild(msgEl);
  chatFeed.scrollTop = chatFeed.scrollHeight;
}

function appendAssistantMessage(text: string, toolsExecuted?: Array<{ tool_name: string; output: any; status: string }>): void {
  const msgEl = document.createElement('div');
  msgEl.className = 'message assistant';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = formatMarkdown(text);
  msgEl.appendChild(bubble);

  // Render tool cards if actions were taken
  if (toolsExecuted && toolsExecuted.length > 0) {
    for (const action of toolsExecuted) {
      const card = document.createElement('div');
      card.className = 'tool-card';

      if (action.tool_name === 'remember') {
        card.innerHTML = `
          <span class="tool-badge memory">Memory Stored</span>
          <div>📌 <em>"${action.output?.memory?.content || 'Fact remembered'}"</em></div>
        `;
      } else if (action.tool_name === 'create_task') {
        const task = action.output?.task;
        card.innerHTML = `
          <span class="tool-badge task">Task Created</span>
          <div>📋 <strong>${task?.title || 'New Task'}</strong> [Priority: ${task?.priority || 'medium'}]</div>
        `;
      } else if (action.tool_name === 'complete_task') {
        const task = action.output?.task;
        card.innerHTML = `
          <span class="tool-badge task">Task Completed</span>
          <div>✅ <strong>${task?.title || 'Task'}</strong> marked completed.</div>
        `;
      } else {
        card.innerHTML = `
          <span class="tool-badge">${action.tool_name}</span>
          <div>Completed with status: ${action.status}</div>
        `;
      }
      msgEl.appendChild(card);
    }
  }

  chatFeed.appendChild(msgEl);
  chatFeed.scrollTop = chatFeed.scrollHeight;
}

function formatMarkdown(text: string): string {
  // Simple clean markdown parser for bullets, bold, italics, line breaks
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/•\s*(.*?)(?:<br>|$)/g, '<li>$1</li>');
}
