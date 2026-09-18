import AppKit
import WebKit

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
        // Run as accessory app (lives in menu bar, floating overlay like Siri)
        NSApp.setActivationPolicy(.accessory)

        // 1. Setup Database Directory
        let fileManager = FileManager.default
        let appSupport = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let byteHouseDir = appSupport.appendingPathComponent("ByteHouse", isDirectory: true)

        if !fileManager.fileExists(atPath: byteHouseDir.path) {
            try? fileManager.createDirectory(at: byteHouseDir, withIntermediateDirectories: true)
        }

        let dbPath = ProcessInfo.processInfo.environment["DATABASE_PATH"] ?? byteHouseDir.appendingPathComponent("bytehouse.db").path
        let db = ByteHouseDatabase(path: dbPath)
        self.database = db

        // 2. Setup Core Services
        let memService = MemoryService(database: db)
        let tService = TaskService(database: db)
        let tRegistry = ToolRegistry(database: db, memoryService: memService, taskService: tService)
        let aiProvider = MockAIProvider()
        let convService = ConversationService(database: db, aiProvider: aiProvider, toolRegistry: tRegistry, memoryService: memService)

        self.memoryService = memService
        self.taskService = tService
        self.toolRegistry = tRegistry
        self.conversationService = convService

        // 3. Setup WebBridge & React URL
        let bridge = WebBridge(
            conversationService: convService,
            taskService: tService,
            memoryService: memService,
            configuredShortcut: "⌃⌥ Space"
        )
        self.webBridge = bridge

        // Check for built React bundle in web/dist/index.html
        let currentDir = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
        let localDistHTML = currentDir.appendingPathComponent("web/dist/index.html")

        let contentURL: URL
        if fileManager.fileExists(atPath: localDistHTML.path) {
            contentURL = localDistHTML
        } else {
            // Fallback to local Vite dev server if running
            contentURL = URL(string: "http://localhost:5173") ?? localDistHTML
        }

        print("[ByteHouse] Loading React UI from: \(contentURL)")

        // 4. Create HUD Panel
        let panel = HUDPanel(webBridge: bridge, contentURL: contentURL)
        bridge.onHideWindow = { [weak panel] in
            panel?.orderOut(nil)
        }
        self.hudPanel = panel

        // 5. Setup Status Item (macOS Menu Bar)
        setupStatusItem()

        // 6. Setup Global Shortcut (Control + Option + Space)
        setupGlobalShortcut()

        // Show HUD initially
        panel.toggle()
        print("[ByteHouse] Native companion running. Toggle with ⌃⌥ Space or Menu Bar icon.")
    }

    private func setupStatusItem() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let button = statusItem?.button {
            button.title = "⚡︎" // Clean monochrome symbol for menu bar
            button.target = self
            button.action = #selector(toggleHUD)
        }

        let menu = NSMenu()
        menu.addItem(NSMenuItem(title: "Toggle ByteHouse HUD (⌃⌥ Space)", action: #selector(toggleHUD), keyEquivalent: ""))
        menu.addItem(NSMenuItem.separator())
        menu.addItem(NSMenuItem(title: "Quit ByteHouse", action: #selector(quitApp), keyEquivalent: "q"))

        // Right-click opens menu, left-click toggles
        statusItem?.menu = nil // Allow button click action
    }

    @objc func toggleHUD() {
        hudPanel?.toggle()
    }

    @objc func quitApp() {
        NSApp.terminate(nil)
    }

    private func setupGlobalShortcut() {
        // Global monitor for Control + Option + Space
        NSEvent.addGlobalMonitorForEvents(matching: .keyDown) { [weak self] event in
            if event.modifierFlags.contains([.control, .option]) && event.keyCode == 49 { // 49 = Space
                DispatchQueue.main.async {
                    self?.hudPanel?.toggle()
                }
            }
        }

        // Local monitor (when app has focus)
        NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            if event.modifierFlags.contains([.control, .option]) && event.keyCode == 49 {
                DispatchQueue.main.async {
                    self?.hudPanel?.toggle()
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
