import Foundation
import WebKit

public class WebBridge: NSObject, WKScriptMessageHandler {
    public weak var webView: WKWebView?
    public var onHideWindow: (() -> Void)?
    public var onMoveWindow: ((CGFloat, CGFloat) -> Void)?

    private let conversationService: ConversationService
    private let taskService: TaskService
    private let memoryService: MemoryService
    private let configuredShortcut: String

    public init(conversationService: ConversationService, taskService: TaskService, memoryService: MemoryService, configuredShortcut: String = "⌃⌥ Space") {
        self.conversationService = conversationService
        self.taskService = taskService
        self.memoryService = memoryService
        self.configuredShortcut = configuredShortcut
        super.init()
    }

    public func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "bytehouse",
              let body = message.body as? [String: Any],
              let action = body["action"] as? String,
              let requestId = body["requestId"] as? String else {
            return
        }

        Task { @MainActor in
            await handleAction(action: action, body: body, requestId: requestId)
        }
    }

    @MainActor
    private func handleAction(action: String, body: [String: Any], requestId: String) async {
        switch action {
        case "chat":
            guard let prompt = body["prompt"] as? String else {
                sendError(requestId: requestId, error: "Prompt is required.")
                return
            }
            let conversationId = body["conversationId"] as? String

            do {
                let response = try await conversationService.chat(prompt: prompt, conversationId: conversationId) { [weak self] state in
                    DispatchQueue.main.async {
                        self?.emitPresenceState(state: state)
                    }
                }

                let encoder = JSONEncoder()
                if let data = try? encoder.encode(response),
                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    sendSuccess(requestId: requestId, data: json)
                } else {
                    sendSuccess(requestId: requestId, data: ["response": response.response])
                }
            } catch {
                sendError(requestId: requestId, error: error.localizedDescription)
            }

        case "chatStream":
            guard let prompt = body["prompt"] as? String else {
                sendError(requestId: requestId, error: "Prompt is required.")
                return
            }
            let conversationId = body["conversationId"] as? String

            do {
                let response = try await conversationService.chatStream(
                    prompt: prompt,
                    conversationId: conversationId,
                    onDelta: { [weak self] delta in
                        DispatchQueue.main.async {
                            self?.emitStreamDelta(requestId: requestId, delta: delta)
                        }
                    },
                    onPresenceChange: { [weak self] state in
                        DispatchQueue.main.async {
                            self?.emitPresenceState(state: state)
                        }
                    }
                )

                let encoder = JSONEncoder()
                if let data = try? encoder.encode(response),
                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    sendSuccess(requestId: requestId, data: json)
                } else {
                    sendSuccess(requestId: requestId, data: ["response": response.response])
                }
            } catch {
                sendError(requestId: requestId, error: error.localizedDescription)
            }

        case "listTasks":
            let tasks = taskService.listTasks()
            let encoder = JSONEncoder()
            if let data = try? encoder.encode(tasks),
               let json = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                sendSuccess(requestId: requestId, data: ["tasks": json])
            } else {
                sendSuccess(requestId: requestId, data: ["tasks": []])
            }

        case "listMemories":
            let memories = memoryService.list()
            let encoder = JSONEncoder()
            if let data = try? encoder.encode(memories),
               let json = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                sendSuccess(requestId: requestId, data: ["memories": json])
            } else {
                sendSuccess(requestId: requestId, data: ["memories": []])
            }

        case "getShortcut":
            sendSuccess(requestId: requestId, data: configuredShortcut)

        case "hideWindow":
            onHideWindow?()
            sendSuccess(requestId: requestId, data: true)

        case "moveWindow":
            if let deltaX = body["deltaX"] as? Double,
               let deltaY = body["deltaY"] as? Double {
                onMoveWindow?(CGFloat(deltaX), CGFloat(deltaY))
                sendSuccess(requestId: requestId, data: true)
            } else {
                sendError(requestId: requestId, error: "deltaX and deltaY required")
            }

        default:
            sendError(requestId: requestId, error: "Unknown bridge action: \(action)")
        }
    }

    @MainActor
    private func sendSuccess(requestId: String, data: Any) {
        guard let webView = webView else { return }
        let payload: [String: Any] = [
            "requestId": requestId,
            "data": data
        ]
        if let json = try? JSONSerialization.data(withJSONObject: payload),
           let str = String(data: json, encoding: .utf8) {
            webView.evaluateJavaScript("window.onByteHouseResponse && window.onByteHouseResponse(\(str));") { _, error in
                if let error = error {
                    print("[ByteHouse] WebKit evaluateJavaScript error: \(error.localizedDescription)")
                }
            }
        }
    }

    @MainActor
    private func sendError(requestId: String, error: String) {
        guard let webView = webView else { return }
        let payload: [String: Any] = [
            "requestId": requestId,
            "error": error
        ]
        if let json = try? JSONSerialization.data(withJSONObject: payload),
           let str = String(data: json, encoding: .utf8) {
            webView.evaluateJavaScript("window.onByteHouseResponse && window.onByteHouseResponse(\(str));") { _, error in
                if let error = error {
                    print("[ByteHouse] WebKit evaluateJavaScript error: \(error.localizedDescription)")
                }
            }
        }
    }

    @MainActor
    public func emitPresenceState(state: String) {
        guard let webView = webView else { return }
        webView.evaluateJavaScript("window.onPresenceState && window.onPresenceState('\(state)');") { _, error in
            if let error = error {
                print("[ByteHouse] WebKit emitPresenceState error: \(error.localizedDescription)")
            }
        }
    }

    @MainActor
    public func emitStreamDelta(requestId: String, delta: String) {
        guard let webView = webView else { return }
        let payload: [String: Any] = [
            "requestId": requestId,
            "delta": delta
        ]
        if let json = try? JSONSerialization.data(withJSONObject: payload),
           let str = String(data: json, encoding: .utf8) {
            webView.evaluateJavaScript("window.onByteHouseStreamChunk && window.onByteHouseStreamChunk(\(str));") { _, error in
                if let error = error {
                    print("[ByteHouse] WebKit emitStreamDelta error: \(error.localizedDescription)")
                }
            }
        }
    }
}
