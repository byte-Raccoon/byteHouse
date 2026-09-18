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

        self.webView = WKWebView(frame: .zero, configuration: config)
        webBridge.webView = self.webView

        let width: CGFloat = 420
        let height: CGFloat = 620

        let screenRect = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        let x = screenRect.maxX - width - 24
        let y = screenRect.maxY - height - 12

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

        let containerView = NSView(frame: bounds)
        containerView.wantsLayer = true
        containerView.addSubview(webView)
        self.contentView = containerView

        // Load content URL (local dist/index.html or dev server)
        if contentURL.isFileURL {
            webView.loadFileURL(contentURL, allowingReadAccessTo: contentURL.deletingLastPathComponent())
        } else {
            webView.load(URLRequest(url: contentURL))
        }
    }

    override public var canBecomeKey: Bool {
        return true
    }

    override public var canBecomeMain: Bool {
        return true
    }

    public func positionNear(statusItem: NSStatusItem?) {
        guard let screen = NSScreen.main else { return }
        let screenRect = screen.visibleFrame
        let width = frame.width
        let height = frame.height

        var targetX = screenRect.maxX - width - 24
        if let button = statusItem?.button, let buttonWindow = button.window {
            let buttonRect = buttonWindow.frame
            targetX = buttonRect.midX - (width / 2)
            targetX = max(screenRect.minX + 16, min(targetX, screenRect.maxX - width - 16))
        }
        let targetY = screenRect.maxY - height - 8

        setFrameOrigin(NSPoint(x: targetX, y: targetY))
    }

    public func toggle(statusItem: NSStatusItem? = nil) {
        if isVisible {
            orderOut(nil)
        } else {
            positionNear(statusItem: statusItem)
            makeKeyAndOrderFront(nil)
            NSApp.activate(ignoringOtherApps: true)
        }
    }
}
