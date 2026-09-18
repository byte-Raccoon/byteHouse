import AppKit
import WebKit
import Darwin

// --- 1. Load Configuration & Initialize Structured Logger ---
let config = AppConfig.load()
AppLogger.shared.configure(
    minLevel: config.logLevel,
    logPath: config.logPath,
    secrets: [config.geminiApiKey, config.openAiApiKey, config.grokApiKey].compactMap { $0 }
)

// --- 2. Single-Instance Enforcement ---
let fileManager = FileManager.default
let appSupport = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
let byteHouseDir = appSupport.appendingPathComponent("ByteHouse", isDirectory: true)

if !fileManager.fileExists(atPath: byteHouseDir.path) {
    try? fileManager.createDirectory(at: byteHouseDir, withIntermediateDirectories: true)
}

let lockFilePath = byteHouseDir.appendingPathComponent("bytehouse.lock").path
let lockFd = open(lockFilePath, O_CREAT | O_RDWR, 0o644)

if lockFd != -1 {
    let lockResult = flock(lockFd, LOCK_EX | LOCK_NB)
    if lockResult != 0 {
        AppLogger.shared.info("Host", "Another instance is already running. Activating existing instance...")
        DistributedNotificationCenter.default().postNotificationName(
            NSNotification.Name("com.bytehouse.activateHUD"),
            object: nil,
            userInfo: nil,
            deliverImmediately: true
        )
        exit(0)
    }
}

@MainActor
class AppDelegate: NSObject, NSApplicationDelegate {
    var statusItem: NSStatusItem?
    var hudPanel: HUDPanel?
    var database: ByteHouseDatabase?
    var memoryService: MemoryService?
    var taskService: TaskService?
    var toolRegistry: ToolRegistry?
    var conversationService: ConversationService?
    var webBridge: WebBridge?
    var globalEventMonitor: Any?

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Run as accessory app (lives in menu bar, floating overlay)
        NSApp.setActivationPolicy(.accessory)
        AppLogger.shared.info("Host", "ByteHouse desktop companion initializing (log level: \(config.logLevel.rawValue))...")

        // Listen for activation requests from secondary launches
        DistributedNotificationCenter.default().addObserver(
            forName: NSNotification.Name("com.bytehouse.activateHUD"),
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.showHUD()
            }
        }

        // Setup Database
        let db = ByteHouseDatabase(path: config.databasePath)
        self.database = db
        AppLogger.shared.info("Database", "Database ready (schema version: \(db.userVersion)) at \(config.databasePath)")

        // Setup Core Services
        let memService = MemoryService(database: db)
        let tService = TaskService(database: db)
        let tRegistry = ToolRegistry(database: db, memoryService: memService, taskService: tService)
        let aiProvider = AIProviderFactory.create(config: config)
        let convService = ConversationService(database: db, aiProvider: aiProvider, toolRegistry: tRegistry, memoryService: memService)

        self.memoryService = memService
        self.taskService = tService
        self.toolRegistry = tRegistry
        self.conversationService = convService

        // Setup WebBridge & React URL
        let bridge = WebBridge(
            conversationService: convService,
            taskService: tService,
            memoryService: memService,
            configuredShortcut: config.hotkey
        )
        self.webBridge = bridge

        // Check for built React bundle in web/dist/index.html
        let currentDir = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
        let localDistHTML = currentDir.appendingPathComponent("web/dist/index.html")

        let contentURL: URL
        if let devServer = ProcessInfo.processInfo.environment["VITE_DEV_SERVER"], !devServer.isEmpty {
            contentURL = URL(string: devServer) ?? URL(string: "http://localhost:5173")!
        } else if FileManager.default.fileExists(atPath: localDistHTML.path) {
            contentURL = URL(string: "bytehouse://app/index.html")!
        } else {
            // Fallback to local Vite dev server if running
            contentURL = URL(string: "http://localhost:5173")!
        }

        AppLogger.shared.info("Host", "Loading React UI from: \(contentURL)")

        // Create HUD Panel
        let panel = HUDPanel(webBridge: bridge, contentURL: contentURL)
        bridge.onHideWindow = { [weak panel] in
            panel?.orderOut(nil)
        }
        self.hudPanel = panel

        // Setup Status Item (macOS Menu Bar)
        setupStatusItem()

        // Setup Global Shortcut (Control + Option + Space)
        setupGlobalShortcut()

        // Show HUD initially
        panel.toggle(statusItem: statusItem)
        AppLogger.shared.info("Host", "Native companion running. Summon with \(config.hotkey) or menu bar icon.")
    }

    private func setupStatusItem() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        guard let button = statusItem?.button else { return }

        // Use Apple SF Symbol 'sparkles'
        let config = NSImage.SymbolConfiguration(pointSize: 15, weight: .medium)
        if let image = NSImage(systemSymbolName: "sparkles", accessibilityDescription: "ByteHouse")?.withSymbolConfiguration(config) {
            image.isTemplate = true
            button.image = image
            button.imagePosition = .imageOnly
            button.title = ""
        } else {
            button.title = "✦"
        }

        button.target = self
        button.action = #selector(statusBarButtonClicked(_:))
        button.sendAction(on: [.leftMouseUp, .rightMouseUp])
    }

    @objc func statusBarButtonClicked(_ sender: NSStatusBarButton) {
        guard let event = NSApp.currentEvent else {
            toggleHUD()
            return
        }

        if event.type == .rightMouseUp || (event.type == .leftMouseUp && event.modifierFlags.contains(.control)) {
            showContextMenu()
        } else {
            toggleHUD()
        }
    }

    private func showContextMenu() {
        let menu = NSMenu()
        let toggleItem = NSMenuItem(title: "Toggle ByteHouse HUD (⌃⌥ Space)", action: #selector(toggleHUD), keyEquivalent: "")
        toggleItem.target = self
        menu.addItem(toggleItem)
        menu.addItem(NSMenuItem.separator())
        let quitItem = NSMenuItem(title: "Quit ByteHouse", action: #selector(quitApp), keyEquivalent: "q")
        quitItem.target = self
        menu.addItem(quitItem)

        statusItem?.menu = menu
        statusItem?.button?.performClick(nil)
        DispatchQueue.main.async { [weak self] in
            self?.statusItem?.menu = nil
        }
    }

    @objc func showHUD() {
        guard let panel = hudPanel else { return }
        panel.positionNear(statusItem: statusItem)
        panel.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    @objc func toggleHUD() {
        hudPanel?.toggle(statusItem: statusItem)
    }

    @objc func quitApp() {
        NSApp.terminate(nil)
    }

    private func setupGlobalShortcut() {
        // Global monitor for Control + Option + Space
        NSEvent.addGlobalMonitorForEvents(matching: .keyDown) { [weak self] event in
            if event.modifierFlags.contains([.control, .option]) && event.keyCode == 49 { // 49 = Space
                DispatchQueue.main.async {
                    self?.toggleHUD()
                }
            }
        }

        // Local monitor (when app has focus)
        NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            if event.modifierFlags.contains([.control, .option]) && event.keyCode == 49 {
                DispatchQueue.main.async {
                    self?.toggleHUD()
                }
                return nil
            }
            return event
        }
    }
}

// Start Application
let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
