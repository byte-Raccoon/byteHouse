/**
 * Two-way bridge between React (WebKit) and native Swift Host
 */
class ByteHouseBridge {
  constructor() {
    this.responseCallbacks = new Map();
    this.streamCallbacks = new Map();
    this.presenceListeners = new Set();

    // Listen for events emitted by Swift via webView.evaluateJavaScript
    window.onByteHouseResponse = (response) => {
      const { requestId, error, data } = response;
      this.streamCallbacks.delete(requestId);
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

    window.onByteHouseStreamChunk = ({ requestId, delta }) => {
      if (this.streamCallbacks.has(requestId)) {
        const onDelta = this.streamCallbacks.get(requestId);
        onDelta(delta);
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

  chatStream(prompt, conversationId, onDelta) {
    const requestId = 'req_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();

    if (this.isNative()) {
      return new Promise((resolve, reject) => {
        this.responseCallbacks.set(requestId, { resolve, reject });
        if (typeof onDelta === 'function') {
          this.streamCallbacks.set(requestId, onDelta);
        }
        window.webkit.messageHandlers.bytehouse.postMessage({
          requestId,
          action: 'chatStream',
          prompt,
          conversationId,
        });
      });
    } else {
      // Browser fallback for standalone development / testing
      console.log(`[Browser Dev Fallback] chatStream: "${prompt}"`);
      const words = `[Dev Mock] Echo: "${prompt}". (Streaming simulated in standalone browser)`.split(' ');
      let i = 0;
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          if (i < words.length) {
            const chunk = (i === 0 ? '' : ' ') + words[i];
            if (onDelta) onDelta(chunk);
            i++;
          } else {
            clearInterval(interval);
            resolve({
              conversation_id: conversationId || 'dev_conv',
              response: words.join(' '),
              tools_executed: [],
            });
          }
        }, 35);
      });
    }
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

  moveWindow(deltaX, deltaY) {
    if (this.isNative()) {
      window.webkit.messageHandlers.bytehouse.postMessage({
        requestId: 'drag_' + Date.now(),
        action: 'moveWindow',
        deltaX,
        deltaY,
      });
    }
  }

  onPresenceState(callback) {
    this.presenceListeners.add(callback);
    return () => this.presenceListeners.delete(callback);
  }
}

export const bridge = new ByteHouseBridge();
