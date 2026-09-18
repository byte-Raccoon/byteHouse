const { contextBridge, ipcRenderer } = require('electron');

const api = {
  chat: (prompt, conversationId) => ipcRenderer.invoke('bytehouse:chat', prompt, conversationId),
  listTasks: () => ipcRenderer.invoke('bytehouse:list-tasks'),
  listMemories: () => ipcRenderer.invoke('bytehouse:list-memories'),
  hideWindow: () => ipcRenderer.invoke('bytehouse:hide-window'),
  getShortcut: () => ipcRenderer.invoke('bytehouse:get-shortcut'),
  onPresenceState: (callback) => {
    ipcRenderer.on('bytehouse:presence-state', (_event, state) => callback(state));
  },
};

contextBridge.exposeInMainWorld('bytehouse', api);
