import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, screen } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import {
  ByteHouseDatabase,
  MemoryService,
  TaskService,
  ToolRegistry,
  ConversationService,
  MockAIProvider,
  GeminiProvider,
  AIProvider,
} from '../core/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let db: ByteHouseDatabase | null = null;
let conversationService: ConversationService | null = null;
let memoryService: MemoryService | null = null;
let taskService: TaskService | null = null;

function setupServices(): void {
  const dbDir = path.join(app.getPath('userData'), 'bytehouse');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = process.env.DATABASE_PATH || path.join(dbDir, 'bytehouse.db');
  db = new ByteHouseDatabase(dbPath);

  memoryService = new MemoryService(db.getRawDb());
  taskService = new TaskService(db.getRawDb());
  const toolRegistry = new ToolRegistry(db.getRawDb(), memoryService, taskService);

  let provider: AIProvider;
  if (process.env.AI_PROVIDER === 'gemini' && process.env.GEMINI_API_KEY) {
    provider = new GeminiProvider(process.env.GEMINI_API_KEY);
  } else {
    provider = new MockAIProvider();
  }

  conversationService = new ConversationService(db.getRawDb(), provider, toolRegistry, memoryService);
}

function createWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const windowWidth = 420;
  const windowHeight = 620;

  // Position in the top-right corner near macOS menu bar / Control Center
  const x = screenWidth - windowWidth - 24;
  const y = 36;

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    hasShadow: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../ui/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupTray(): void {
  // Create a clean 16x16 monochrome circle icon for the macOS menu bar
  const icon = nativeImage.createFromBuffer(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAADhJREFUOE9jZKAQMFKon2H4/z8GxkdgjGoG4v8fqP8ZGBgY0NVgM2T46AUMowZhGB5B1jSgpxsA5W0QC1pmsrMAAAAASUVORK5CYII=',
      'base64'
    )
  );

  tray = new Tray(icon);
  tray.setToolTip('ByteHouse Companion');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Toggle ByteHouse HUD',
      click: () => toggleWindow(),
    },
    { type: 'separator' },
    {
      label: 'Quit ByteHouse',
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => toggleWindow());
}

function toggleWindow(): void {
  if (!mainWindow) {
    createWindow();
    return;
  }
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

function setupIPC(): void {
  ipcMain.handle('bytehouse:chat', async (_event, userPrompt: string, conversationId?: string) => {
    if (!conversationService) {
      throw new Error('Conversation service not initialized.');
    }

    return await conversationService.chat(
      userPrompt,
      conversationId,
      (state) => {
        mainWindow?.webContents.send('bytehouse:presence-state', state);
      }
    );
  });

  ipcMain.handle('bytehouse:list-tasks', async () => {
    return taskService?.listTasks() || [];
  });

  ipcMain.handle('bytehouse:list-memories', async () => {
    return memoryService?.list() || [];
  });

  ipcMain.handle('bytehouse:hide-window', () => {
    mainWindow?.hide();
  });

  ipcMain.handle('bytehouse:get-shortcut', () => {
    return process.env.GLOBAL_SHORTCUT || 'Control+Option+Space';
  });
}

app.whenReady().then(() => {
  setupServices();
  setupIPC();
  createWindow();
  setupTray();

  // Register global hotkey that does not conflict with Spotlight (Option+Space or Cmd+Space)
  const primaryShortcut = process.env.GLOBAL_SHORTCUT || 'Control+Option+Space';
  try {
    globalShortcut.register(primaryShortcut, () => {
      toggleWindow();
    });
  } catch (err) {
    console.warn(`Failed to register primary shortcut ${primaryShortcut}:`, err);
  }

  // Also register Command+Shift+Space as a convenient alternative
  try {
    globalShortcut.register('CommandOrControl+Shift+Space', () => {
      toggleWindow();
    });
  } catch (err) {
    console.warn('Failed to register secondary shortcut:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  db?.close();
});

app.on('window-all-closed', () => {
  // On macOS keep app running in menu bar until explicit quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
