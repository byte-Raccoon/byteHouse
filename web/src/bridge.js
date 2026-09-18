/**
 * Two-way bridge between React (WebKit) and native Swift Host
 */
class ByteHouseBridge {
  constructor() {
    this.responseCallbacks = new Map();
    this.presenceListeners = new Set();

    // Listen for events emitted by Swift via webView.evaluateJavaScript
    window.onByteHouseResponse = (response) => {
      const { requestId, error, data } = response;
      if (this.responseCallbacks.has(requestId)) {
        const { resolve, reject } = this.responseCallbacks.get(requestId);
        this.responseCallbacks.delete(requestId);
        if (error) {
          reject(new Error(error));
        } else {
          resolve(data);
        }
      }
    };

    window.onPresenceState = (state) => {
      for (const listener of this.presenceListeners) {
        listener(state);
      }
    };
  }

  isNative() {
    return !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.bytehouse);
  }

  async send(action, payload = {}) {
    const requestId = 'req_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();

    if (this.isNative()) {
      return new Promise((resolve, reject) => {
        this.responseCallbacks.set(requestId, { resolve, reject });
        window.webkit.messageHandlers.bytehouse.postMessage({
          requestId,
          action,
          ...payload,
        });
      });
    } else {
      // Browser fallback for standalone development / testing
      console.log(`[Browser Dev Fallback] Action: ${action}`, payload);
      if (action === 'chat') {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              conversation_id: payload.conversationId || 'dev_conv',
              response: `[Dev Mock] Echo: "${payload.prompt}". (Running in standalone browser)`,
              tools_executed: [],
            });
          }, 300);
        });
      }
      if (action === 'getShortcut') return Promise.resolve('⌃⌥ Space');
      if (action === 'listTasks') return Promise.resolve([]);
      if (action === 'listMemories') return Promise.resolve([]);
      return Promise.resolve({ success: true });
    }
  }

  chat(prompt, conversationId) {
    return this.send('chat', { prompt, conversationId });
  }

  listTasks() {
    return this.send('listTasks');
  }

  listMemories() {
    return this.send('listMemories');
  }

  hideWindow() {
    return this.send('hideWindow');
  }

  getShortcut() {
    return this.send('getShortcut');
  }

  onPresenceState(callback) {
    this.presenceListeners.add(callback);
    return () => this.presenceListeners.delete(callback);
  }
}

export const bridge = new ByteHouseBridge();
