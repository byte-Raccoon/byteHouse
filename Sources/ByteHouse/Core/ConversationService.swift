import Foundation
import SQLite3

public struct ChatResponse: Codable, Sendable {
    public let conversation_id: String
    public let response: String
    public let tools_executed: [ToolExecutionResult]

    public init(conversation_id: String, response: String, tools_executed: [ToolExecutionResult]) {
        self.conversation_id = conversation_id
        self.response = response
        self.tools_executed = tools_executed
    }
}

public class ConversationService: @unchecked Sendable {
    private let database: ByteHouseDatabase
    private let aiProvider: AIProvider
    private let toolRegistry: ToolRegistry
    private let memoryService: MemoryService

    public init(database: ByteHouseDatabase, aiProvider: AIProvider, toolRegistry: ToolRegistry, memoryService: MemoryService) {
        self.database = database
        self.aiProvider = aiProvider
        self.toolRegistry = toolRegistry
        self.memoryService = memoryService
    }

    public func getOrCreateConversation(id: String? = nil) -> Conversation {
        guard let db = database.db else {
            let now = ISO8601DateFormatter().string(from: Date())
            return Conversation(id: id ?? UUID().uuidString, created_at: now, updated_at: now)
        }

        if let id = id {
            var stmt: OpaquePointer?
            let sql = "SELECT id, created_at, updated_at FROM conversations WHERE id = ?;"
            if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK {
                sqlite3_bind_text(stmt, 1, (id as NSString).utf8String, -1, nil)
                if sqlite3_step(stmt) == SQLITE_ROW {
                    let convId = String(cString: sqlite3_column_text(stmt, 0))
                    let createdAt = String(cString: sqlite3_column_text(stmt, 1))
                    let updatedAt = String(cString: sqlite3_column_text(stmt, 2))
                    sqlite3_finalize(stmt)
                    return Conversation(id: convId, created_at: createdAt, updated_at: updatedAt)
                }
                sqlite3_finalize(stmt)
            }
        }

        let newId = id ?? UUID().uuidString
        let now = ISO8601DateFormatter().string(from: Date())
        var stmt: OpaquePointer?
        let sql = "INSERT INTO conversations (id, created_at, updated_at) VALUES (?, ?, ?);"
        if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK {
            sqlite3_bind_text(stmt, 1, (newId as NSString).utf8String, -1, nil)
            sqlite3_bind_text(stmt, 2, (now as NSString).utf8String, -1, nil)
            sqlite3_bind_text(stmt, 3, (now as NSString).utf8String, -1, nil)
            sqlite3_step(stmt)
            sqlite3_finalize(stmt)
        }

        return Conversation(id: newId, created_at: now, updated_at: now)
    }

    public func getMessages(conversationId: String, limit: Int = 50) -> [Message] {
        guard let db = database.db else { return [] }
        var messages: [Message] = []
        var stmt: OpaquePointer?
        let sql = "SELECT id, conversation_id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?;"

        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return [] }
        defer { sqlite3_finalize(stmt) }

        sqlite3_bind_text(stmt, 1, (conversationId as NSString).utf8String, -1, nil)
        sqlite3_bind_int(stmt, 2, Int32(limit))

        while sqlite3_step(stmt) == SQLITE_ROW {
            let id = String(cString: sqlite3_column_text(stmt, 0))
            let convId = String(cString: sqlite3_column_text(stmt, 1))
            let role = String(cString: sqlite3_column_text(stmt, 2))
            let content = String(cString: sqlite3_column_text(stmt, 3))
            let createdAt = String(cString: sqlite3_column_text(stmt, 4))
            messages.append(Message(id: id, conversation_id: convId, role: role, content: content, created_at: createdAt))
        }

        return messages
    }

    private func saveMessage(conversationId: String, role: String, content: String) {
        guard let db = database.db else { return }
        let id = UUID().uuidString
        let now = ISO8601DateFormatter().string(from: Date())
        var stmt: OpaquePointer?
        let sql = "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?);"

        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return }
        defer { sqlite3_finalize(stmt) }

        sqlite3_bind_text(stmt, 1, (id as NSString).utf8String, -1, nil)
        sqlite3_bind_text(stmt, 2, (conversationId as NSString).utf8String, -1, nil)
        sqlite3_bind_text(stmt, 3, (role as NSString).utf8String, -1, nil)
        sqlite3_bind_text(stmt, 4, (content as NSString).utf8String, -1, nil)
        sqlite3_bind_text(stmt, 5, (now as NSString).utf8String, -1, nil)
        sqlite3_step(stmt)
    }

    public func chat(prompt: String, conversationId: String? = nil, onPresenceChange: (@Sendable (String) -> Void)? = nil) async throws -> ChatResponse {
        let conv = getOrCreateConversation(id: conversationId)

        // 1. Save user prompt
        saveMessage(conversationId: conv.id, role: "user", content: prompt)
        onPresenceChange?("thinking")

        // 2. Load context
        let history = getMessages(conversationId: conv.id, limit: 20)
        var aiMessages = history.map { AIMessage(role: $0.role, content: $0.content) }

        // Inject explicit memories into system context (Principle 2)
        let memories = memoryService.recall(query: nil, limit: 5)
        if !memories.isEmpty {
            let memList = memories.map { "- \($0.content)" }.joined(separator: "\n")
            aiMessages.insert(AIMessage(role: "system", content: "Known user memories:\n\(memList)"), at: 0)
        }

        var toolsExecuted: [ToolExecutionResult] = []
        let tools = toolRegistry.getToolDefinitions()

        // 3. AI provider generation
        var response = try await aiProvider.generate(messages: aiMessages, tools: tools)

        // 4. Tool execution loop
        if let calls = response.tool_calls, !calls.isEmpty {
            onPresenceChange?("working")

            for call in calls {
                let inputDict = call.arguments.mapValues { $0.value }
                let result = await toolRegistry.executeTool(name: call.name, input: inputDict)
                toolsExecuted.append(result)

                // Pass result back into context
                let outputJson = (try? JSONEncoder().encode(result.output)).flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
                aiMessages.append(AIMessage(role: "tool", content: outputJson, name: call.name))
            }

            onPresenceChange?("thinking")
            response = try await aiProvider.generate(messages: aiMessages, tools: tools)
        }

        let finalAnswer = response.content.isEmpty ? "I have completed that for you." : response.content

        // 5. Save assistant reply
        saveMessage(conversationId: conv.id, role: "assistant", content: finalAnswer)
        onPresenceChange?("idle")

        return ChatResponse(conversation_id: conv.id, response: finalAnswer, tools_executed: toolsExecuted)
    }
}
