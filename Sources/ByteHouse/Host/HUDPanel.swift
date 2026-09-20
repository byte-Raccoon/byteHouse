import AppKit
import WebKit

public class ByteHouseWebView: WKWebView {
    override public var mouseDownCanMoveWindow: Bool {
        return true
    }
}

public class HUDPanel: NSPanel {
    public let webView: WKWebView
    private var normalFrame: NSRect?

    public init(webBridge: WebBridge, contentURL: URL) {
        let config = WKWebViewConfiguration()
        let userContentController = WKUserContentController()
        userContentController.add(webBridge, name: "bytehouse")
        config.userContentController = userContentController
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        config.setValue(true, forKey: "allowUniversalAccessFromFileURLs")

        // Register custom scheme handler for local assets to avoid file:// CORS issues
        let currentDir = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
        let distDir = currentDir.appendingPathComponent("web/dist", isDirectory: true)
        let schemeHandler = LocalSchemeHandler(baseDir: distDir)
        config.setURLSchemeHandler(schemeHandler, forURLScheme: "bytehouse")

        self.webView = ByteHouseWebView(frame: .zero, configuration: config)
        webBridge.webView = self.webView

        let width: CGFloat = 840
        let height: CGFloat = 620

        let screenRect = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        // macOS Spotlight positioning: centered horizontally, top third vertically (~20% from top of visible screen)
        let x = screenRect.midX - (width / 2)
        let y = screenRect.maxY - height - (screenRect.height * 0.18)

        let contentRect = NSRect(x: x, y: y, width: width, height: height)

        super.init(
            contentRect: contentRect,
            styleMask: [.nonactivatingPanel, .borderless, .resizable],
            backing: .buffered,
            defer: false
        )

        self.level = .floating
        self.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        self.isOpaque = false
        self.backgroundColor = .clear
        self.appearance = NSAppearance(named: .darkAqua)
        self.hasShadow = true
        self.isMovableByWindowBackground = true
        self.minSize = NSSize(width: 520, height: 440)
        self.showsResizeIndicator = true

        // Configure WebKit
        let bounds = NSRect(x: 0, y: 0, width: width, height: height)
        webView.frame = bounds
        webView.autoresizingMask = [.width, .height]
        webView.setValue(false, forKey: "drawsBackground") // Transparent WebKit canvas
        webView.wantsLayer = true
        webView.layer?.cornerRadius = 20.0
        webView.layer?.masksToBounds = true

        // Native macOS VisualEffectView providing true macOS vibrancy material
        let visualEffectView = NSVisualEffectView(frame: bounds)
        visualEffectView.autoresizingMask = [.width, .height]
        visualEffectView.material = .hudWindow
        visualEffectView.blendingMode = .behindWindow
        visualEffectView.state = .active
        visualEffectView.wantsLayer = true
        visualEffectView.layer?.cornerRadius = 20.0
        visualEffectView.layer?.masksToBounds = true

        visualEffectView.addSubview(webView)
        self.contentView = visualEffectView
        self.invalidateShadow()

        // Hook up JS drag-to-move window bridge
        webBridge.onMoveWindow = { [weak self] deltaX, deltaY in
            guard let self = self else { return }
            var origin = self.frame.origin
            origin.x += deltaX
            origin.y -= deltaY
            self.setFrameOrigin(origin)
        }

        // Hook up JS double-click maximize/restore toggle bridge
        webBridge.onToggleMaximize = { [weak self] in
            self?.toggleMaximize()
        }

        // Load content URL (bytehouse://app/index.html or http dev server)
        if contentURL.scheme == "http" || contentURL.scheme == "https" {
            webView.load(URLRequest(url: contentURL))
        } else {
            let appURL = URL(string: "bytehouse://app/index.html")!
            webView.load(URLRequest(url: appURL))
        }
    }

    override public func setFrame(_ frameRect: NSRect, display displayFlag: Bool) {
        super.setFrame(frameRect, display: displayFlag)
        self.invalidateShadow()
    }

    override public var canBecomeKey: Bool {
        return true
    }

    override public var canBecomeMain: Bool {
        return true
    }

    public func positionCenter() {
        guard let screen = NSScreen.main else { return }
        let screenRect = screen.visibleFrame
        let width = frame.width
        let height = frame.height

        // Spotlight positioning: centered horizontally, optical top center
        let targetX = screenRect.midX - (width / 2)
        let targetY = screenRect.maxY - height - (screenRect.height * 0.18)

        setFrameOrigin(NSPoint(x: targetX, y: targetY))
    }

    public func toggle() {
        if isVisible {
            orderOut(nil)
        } else {
            positionCenter()
            makeKeyAndOrderFront(nil)
            NSApp.activate(ignoringOtherApps: true)
        }
    }

    public func toggleMaximize() {
        guard let screen = self.screen ?? NSScreen.main else { return }
        let visibleFrame = screen.visibleFrame

        let isMaximized = abs(frame.origin.x - visibleFrame.origin.x) < 2 &&
                          abs(frame.origin.y - visibleFrame.origin.y) < 2 &&
                          abs(frame.width - visibleFrame.width) < 4 &&
                          abs(frame.height - visibleFrame.height) < 4

        if isMaximized {
            // Restore to normal starting window size
            let restoreRect = normalFrame ?? NSRect(
                x: visibleFrame.midX - 420,
                y: visibleFrame.maxY - 620 - (visibleFrame.height * 0.18),
                width: 840,
                height: 620
            )
            setFrame(restoreRect, display: true, animate: true)
        } else {
            // Save normal frame and maximize to full screen
            normalFrame = self.frame
            setFrame(visibleFrame, display: true, animate: true)
        }
    }
}
