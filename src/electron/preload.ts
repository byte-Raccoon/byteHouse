import { contextBridge, ipcRenderer } from 'electron';

export interface ByteHouseAPI {
  chat: (prompt: string, conversationId?: string) => Promise<any>;
  listTasks: () => Promise<any[]>;
  listMemories: () => Promise<any[]>;
  hideWindow: () => Promise<void>;
  getShortcut: () => Promise<string>;
  onPresenceState: (callback: (state: string) => void) => void;
}

const api: ByteHouseAPI = {
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
