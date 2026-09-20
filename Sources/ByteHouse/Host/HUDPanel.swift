import AppKit
import WebKit

public class HUDPanel: NSPanel {
    public let webView: WKWebView

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

        self.webView = WKWebView(frame: .zero, configuration: config)
        webBridge.webView = self.webView

        let width: CGFloat = 440
        let height: CGFloat = 580

        let screenRect = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        // macOS Spotlight positioning: centered horizontally, top third vertically (~20% from top of visible screen)
        let x = screenRect.midX - (width / 2)
        let y = screenRect.maxY - height - (screenRect.height * 0.18)

        let contentRect = NSRect(x: x, y: y, width: width, height: height)

        super.init(
            contentRect: contentRect,
            styleMask: [.nonactivatingPanel, .borderless],
            backing: .buffered,
            defer: false
        )

        self.level = .floating
        self.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        self.isOpaque = false
        self.backgroundColor = .clear
        self.hasShadow = true
        self.isMovableByWindowBackground = true

        // Configure WebKit
        let bounds = NSRect(x: 0, y: 0, width: width, height: height)
        webView.frame = bounds
        webView.autoresizingMask = [.width, .height]
        webView.setValue(false, forKey: "drawsBackground") // Transparent WebKit canvas

        // Native macOS VisualEffectView providing true macOS vibrancy material
        let visualEffectView = NSVisualEffectView(frame: bounds)
        visualEffectView.autoresizingMask = [.width, .height]
        visualEffectView.material = .popover
        visualEffectView.blendingMode = .behindWindow
        visualEffectView.state = .active
        visualEffectView.wantsLayer = true
        visualEffectView.layer?.cornerRadius = 20.0
        visualEffectView.layer?.masksToBounds = true

        visualEffectView.addSubview(webView)
        self.contentView = visualEffectView

        // Load content URL (bytehouse://app/index.html or http dev server)
        if contentURL.scheme == "http" || contentURL.scheme == "https" {
            webView.load(URLRequest(url: contentURL))
        } else {
            let appURL = URL(string: "bytehouse://app/index.html")!
            webView.load(URLRequest(url: appURL))
        }
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
}
