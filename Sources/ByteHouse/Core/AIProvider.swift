import Foundation

public struct AIToolCall: Codable, Sendable {
    public let id: String
    public let name: String
    public let arguments: [String: AnyCodable]
}

public struct AIMessage: Codable, Sendable {
    public let role: String // "user" | "assistant" | "system" | "tool"
    public let content: String
    public let tool_calls: [AIToolCall]?
    public let name: String?

    public init(role: String, content: String, tool_calls: [AIToolCall]? = nil, name: String? = nil) {
        self.role = role
        self.content = content
        self.tool_calls = tool_calls
        self.name = name
    }
}

public struct AIGenerateResponse: Sendable {
    public let content: String
    public let tool_calls: [AIToolCall]?

    public init(content: String, tool_calls: [AIToolCall]? = nil) {
        self.content = content
        self.tool_calls = tool_calls
    }
}

public protocol AIProvider: Sendable {
    var name: String { get }
    func generate(messages: [AIMessage], tools: [ToolDefinition]?) async throws -> AIGenerateResponse
    func generateStream(messages: [AIMessage], tools: [ToolDefinition]?, onDelta: @Sendable @escaping (String) -> Void) async throws -> AIGenerateResponse
}

public extension AIProvider {
    func generateStream(messages: [AIMessage], tools: [ToolDefinition]?, onDelta: @Sendable @escaping (String) -> Void) async throws -> AIGenerateResponse {
        let response = try await generate(messages: messages, tools: tools)
        if !response.content.isEmpty {
            onDelta(response.content)
        }
        return response
    }
}

public class MockAIProvider: AIProvider, @unchecked Sendable {
    public let name = "Bytie (Spirit of ByteHouse)"

    public init() {}

    public func generate(messages: [AIMessage], tools: [ToolDefinition]?) async throws -> AIGenerateResponse {
        guard let last = messages.last else {
            return AIGenerateResponse(content: "Hello! I am Bytie, the spirit of ByteHouse. How can I help you?", tool_calls: nil)
        }

        // Case 1: Answering after a tool has executed
        if last.role == "tool" {
            guard let data = last.content.data(using: .utf8),
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                return AIGenerateResponse(content: "Action completed.", tool_calls: nil)
            }

            if last.name == "remember" {
                let mem = json["memory"] as? [String: Any]
                let content = (mem?["content"] as? String) ?? "stored"
                return AIGenerateResponse(content: "I've noted that down: \"\(content)\". I'll remember this for you.", tool_calls: nil)
            } else if last.name == "recall" {
                let mems = json["memories"] as? [[String: Any]] ?? []
                if mems.isEmpty {
                    return AIGenerateResponse(content: "I searched my memory, but I don't have any record of that yet.", tool_calls: nil)
                }
                let list = mems.compactMap { $0["content"] as? String }.map { "• \($0)" }.joined(separator: "\n")
                return AIGenerateResponse(content: "Here is what I remember:\n\(list)", tool_calls: nil)
            } else if last.name == "create_task" {
                let task = json["task"] as? [String: Any]
                let title = (task?["title"] as? String) ?? "Task"
                let priority = (task?["priority"] as? String) ?? "medium"
                return AIGenerateResponse(content: "I've created the task: \"\(title)\" (Priority: \(priority)).", tool_calls: nil)
            } else if last.name == "list_tasks" {
                let tasks = json["tasks"] as? [[String: Any]] ?? []
                if tasks.isEmpty {
                    return AIGenerateResponse(content: "You have no active tasks right now.", tool_calls: nil)
                }
                let list = tasks.compactMap { t -> String? in
                    guard let title = t["title"] as? String else { return nil }
                    let status = (t["status"] as? String) == "completed" ? "x" : " "
                    let prio = (t["priority"] as? String) ?? "medium"
                    return "[\(status)] \(title) (\(prio))"
                }.joined(separator: "\n")
                return AIGenerateResponse(content: "Here are your tasks:\n\(list)", tool_calls: nil)
            } else if last.name == "complete_task" {
                let task = json["task"] as? [String: Any]
                let title = (task?["title"] as? String) ?? "Task"
                return AIGenerateResponse(content: "Great job! I've marked \"\(title)\" as completed.", tool_calls: nil)
            }
            return AIGenerateResponse(content: "Action executed successfully.", tool_calls: nil)
        }

        // Case 2: Intent detection from user prompt
        let text = last.content.lowercased()

        // "Remember that ..."
        if text.contains("remember") {
            var fact = last.content
            if let range = fact.range(of: "remember that ", options: .caseInsensitive) {
                fact = String(fact[range.upperBound...])
            } else if let range = fact.range(of: "remember ", options: .caseInsensitive) {
                fact = String(fact[range.upperBound...])
            }
            fact = fact.trimmingCharacters(in: .whitespacesAndNewlines)
            let call = AIToolCall(
                id: UUID().uuidString,
                name: "remember",
                arguments: ["content": AnyCodable(fact)]
            )
            return AIGenerateResponse(content: "", tool_calls: [call])
        }

        // "Recall ..." / "What is my ..." / "Do you remember ..."
        if text.contains("recall") || text.contains("what is my") || text.contains("what do you remember") {
            var query = ""
            if let range = text.range(of: "recall ") {
                query = String(text[range.upperBound...])
            } else if let range = text.range(of: "what is my ") {
                query = String(text[range.upperBound...]).replacingOccurrences(of: "?", with: "")
            }
            query = query.trimmingCharacters(in: .whitespacesAndNewlines)
            let call = AIToolCall(
                id: UUID().uuidString,
                name: "recall",
                arguments: ["query": AnyCodable(query)]
            )
            return AIGenerateResponse(content: "", tool_calls: [call])
        }

        // "Add task ..." / "Create a task ..."
        if text.contains("add a task") || text.contains("create a task") || text.contains("add task") || text.contains("create task") {
            var title = last.content
            if let range = title.range(of: "task to ", options: .caseInsensitive) {
                title = String(title[range.upperBound...])
            } else if let range = title.range(of: "task ", options: .caseInsensitive) {
                title = String(title[range.upperBound...])
            }
            title = title.trimmingCharacters(in: .whitespacesAndNewlines)
            let call = AIToolCall(
                id: UUID().uuidString,
                name: "create_task",
                arguments: ["title": AnyCodable(title), "priority": AnyCodable("medium")]
            )
            return AIGenerateResponse(content: "", tool_calls: [call])
        }

        // "List tasks" / "What are my tasks"
        if text.contains("list tasks") || text.contains("show tasks") || text.contains("my tasks") {
            let call = AIToolCall(
                id: UUID().uuidString,
                name: "list_tasks",
                arguments: ["status": AnyCodable("pending")]
            )
            return AIGenerateResponse(content: "", tool_calls: [call])
        }

        // "Complete task ..." / "Finish task ..."
        if text.contains("complete task") || text.contains("complete the task") || text.contains("finish task") {
            var target = last.content
            if let range = target.range(of: "task ", options: .caseInsensitive) {
                target = String(target[range.upperBound...])
            }
            target = target.trimmingCharacters(in: .whitespacesAndNewlines)
            let call = AIToolCall(
                id: UUID().uuidString,
                name: "complete_task",
                arguments: ["task_title": AnyCodable(target)]
            )
            return AIGenerateResponse(content: "", tool_calls: [call])
        }

        // Identity / Who am I talking to
        if text.contains("who are you") || text.contains("who am i talking to") || text.contains("what is your name") || text.contains("bytie") {
            return AIGenerateResponse(content: "You are talking to Bytie, the homegrown spirit of ByteHouse! I live right here on your Mac to manage your memory and tasks.", tool_calls: nil)
        }

        // Default greeting
        if text.contains("hello") || text.contains("hi") {
            return AIGenerateResponse(content: "Hello! I am Bytie, the spirit of ByteHouse. How can I help you today?", tool_calls: nil)
        }

        return AIGenerateResponse(content: "I am Bytie, the spirit of ByteHouse. You can ask me to remember facts, recall information, or manage your tasks.", tool_calls: nil)
    }

    public func generateStream(messages: [AIMessage], tools: [ToolDefinition]?, onDelta: @Sendable @escaping (String) -> Void) async throws -> AIGenerateResponse {
        let response = try await generate(messages: messages, tools: tools)
        if let calls = response.tool_calls, !calls.isEmpty {
            return response
        }
        let words = response.content.split(separator: " ")
        for (index, word) in words.enumerated() {
            let chunk = index == 0 ? String(word) : " " + String(word)
            onDelta(chunk)
            try? await Task.sleep(nanoseconds: 15_000_000)
        }
        return response
    }
}

public final class AIProviderFactory {
    public static func create(config: AppConfig, overrideProvider: String? = nil) -> AIProvider {
        let requested = (overrideProvider ?? config.aiProvider).lowercased()

        if requested == "bytie" || requested == "mock" {
            AppLogger.shared.info("AI", "Selected Bytie (Spirit of ByteHouse - Homegrown Local Core).")
            return MockAIProvider()
        }

        if requested == "gemini" {
            if let key = config.geminiApiKey, !key.isEmpty {
                AppLogger.shared.info("AI", "Initialized live Google Gemini provider (\(config.geminiModel)).")
                return GeminiAIProvider(apiKey: key, model: config.geminiModel)
            } else {
                AppLogger.shared.warn("AI", "AI_PROVIDER=gemini requested but GEMINI_API_KEY is missing in .env. Falling back to MockAIProvider.")
                return MockAIProvider()
            }
        }

        if requested == "openai" {
            if let key = config.openAiApiKey, !key.isEmpty {
                AppLogger.shared.info("AI", "Initialized live OpenAI provider (gpt-4o-mini).")
                return OpenAIProvider(apiKey: key)
            } else {
                AppLogger.shared.warn("AI", "AI_PROVIDER=openai requested but OPENAI_API_KEY is missing in .env. Falling back to MockAIProvider.")
                return MockAIProvider()
            }
        }

        if requested == "grok" || requested == "groq" {
            if let key = config.grokApiKey, !key.isEmpty {
                return makeGrokProvider(key: key, model: config.grokModel)
            } else {
                AppLogger.shared.warn("AI", "AI_PROVIDER=\(requested) requested but GROK_API_KEY/GROQ_API_KEY is missing in .env. Falling back to MockAIProvider.")
                return MockAIProvider()
            }
        }

        // Auto-detect if user provided a key without explicitly setting AI_PROVIDER
        if let grokKey = config.grokApiKey, !grokKey.isEmpty {
            return makeGrokProvider(key: grokKey, model: config.grokModel)
        }

        if let geminiKey = config.geminiApiKey, !geminiKey.isEmpty {
            AppLogger.shared.info("AI", "Detected GEMINI_API_KEY in environment. Using live Gemini provider (\(config.geminiModel)).")
            return GeminiAIProvider(apiKey: geminiKey, model: config.geminiModel)
        }

        if let openAiKey = config.openAiApiKey, !openAiKey.isEmpty {
            AppLogger.shared.info("AI", "Detected OPENAI_API_KEY in environment. Using live OpenAI provider.")
            return OpenAIProvider(apiKey: openAiKey)
        }

        AppLogger.shared.info("AI", "Using MockAIProvider (deterministic offline mode). Add GEMINI_API_KEY or GROK_API_KEY in .env for live AI.")
        return MockAIProvider()
    }

    private static func makeGrokProvider(key: String, model: String?) -> AIProvider {
        if key.hasPrefix("gsk_") {
            let selectedModel = model ?? "openai/gpt-oss-120b"
            AppLogger.shared.info("AI", "Initialized live Groq provider (\(selectedModel)) via OpenAI-compatible endpoint.")
            return OpenAIProvider(
                apiKey: key,
                model: selectedModel,
                baseURL: "https://api.groq.com/openai/v1"
            )
        } else if key.hasPrefix("xai-") {
            let selectedModel = model ?? "grok-2-latest"
            AppLogger.shared.info("AI", "Initialized live xAI Grok provider (\(selectedModel)).")
            return OpenAIProvider(
                apiKey: key,
                model: selectedModel,
                baseURL: "https://api.x.ai/v1"
            )
        } else {
            let selectedModel = model ?? "openai/gpt-oss-120b"
            AppLogger.shared.info("AI", "Initialized live Groq/Grok provider (\(selectedModel)).")
            return OpenAIProvider(
                apiKey: key,
                model: selectedModel,
                baseURL: "https://api.groq.com/openai/v1"
            )
        }
    }
}

