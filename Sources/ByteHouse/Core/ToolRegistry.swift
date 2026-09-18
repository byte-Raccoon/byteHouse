import Foundation
import SQLite3

public struct ToolDefinition: Codable {
    public let name: String
    public let description: String
    public let sideEffects: String
}

public class ToolRegistry {
    private let database: ByteHouseDatabase
    private let memoryService: MemoryService
    private let taskService: TaskService

    public init(database: ByteHouseDatabase, memoryService: MemoryService, taskService: TaskService) {
        self.database = database
        self.memoryService = memoryService
        self.taskService = taskService
    }

    public func getToolDefinitions() -> [ToolDefinition] {
        return [
            ToolDefinition(name: "remember", description: "Explicitly store a memory or fact about the user for long-term recall.", sideEffects: "Inserts into memories table."),
            ToolDefinition(name: "recall", description: "Search and retrieve explicit memories stored by the user.", sideEffects: "Reads memories table."),
            ToolDefinition(name: "forget", description: "Remove/delete a specific stored memory by ID.", sideEffects: "Deletes from memories table."),
            ToolDefinition(name: "create_task", description: "Create a new personal todo/task.", sideEffects: "Inserts into tasks table."),
            ToolDefinition(name: "list_tasks", description: "Retrieve user tasks optionally filtered by status.", sideEffects: "Reads tasks table."),
            ToolDefinition(name: "complete_task", description: "Mark a task as completed by ID or title.", sideEffects: "Updates tasks status to completed.")
        ]
    }

    public func executeTool(name: String, input: [String: Any]) async -> ToolExecutionResult {
        var output: [String: AnyCodable] = [:]
        var status = "success"

        do {
            switch name {
            case "remember":
                guard let content = input["content"] as? String else {
                    throw NSError(domain: "ByteHouse", code: 400, userInfo: [NSLocalizedDescriptionKey: "Content is required for remember tool."])
                }
                let memory = try memoryService.remember(content: content)
                output["success"] = AnyCodable(true)
                output["memory"] = AnyCodable([
                    "id": memory.id,
                    "content": memory.content,
                    "source": memory.source,
                    "created_at": memory.created_at
                ])

            case "recall":
                let query = input["query"] as? String
                let memories = memoryService.recall(query: query)
                let memArray = memories.map { [
                    "id": $0.id,
                    "content": $0.content,
                    "created_at": $0.created_at
                ] }
                output["count"] = AnyCodable(memories.count)
                output["memories"] = AnyCodable(memArray)

            case "forget":
                guard let memoryId = input["memory_id"] as? String else {
                    throw NSError(domain: "ByteHouse", code: 400, userInfo: [NSLocalizedDescriptionKey: "memory_id is required."])
                }
                let success = memoryService.forget(memoryId: memoryId)
                output["success"] = AnyCodable(success)
                output["memory_id"] = AnyCodable(memoryId)

            case "create_task":
                guard let title = input["title"] as? String else {
                    throw NSError(domain: "ByteHouse", code: 400, userInfo: [NSLocalizedDescriptionKey: "title is required for create_task."])
                }
                let desc = input["description"] as? String
                let priority = (input["priority"] as? String) ?? "medium"
                let dueAt = input["due_at"] as? String
                let task = try taskService.createTask(title: title, description: desc, priority: priority, dueAt: dueAt)
                output["success"] = AnyCodable(true)
                output["task"] = AnyCodable([
                    "id": task.id,
                    "title": task.title,
                    "status": task.status,
                    "priority": task.priority,
                    "created_at": task.created_at
                ])

            case "list_tasks":
                let statusFilter = input["status"] as? String
                let priorityFilter = input["priority"] as? String
                let tasks = taskService.listTasks(status: statusFilter, priority: priorityFilter)
                let taskArray = tasks.map { [
                    "id": $0.id,
                    "title": $0.title,
                    "status": $0.status,
                    "priority": $0.priority
                ] }
                output["count"] = AnyCodable(tasks.count)
                output["tasks"] = AnyCodable(taskArray)

            case "complete_task":
                var taskId = input["task_id"] as? String
                if taskId == nil, let titleQuery = input["task_title"] as? String {
                    let pending = taskService.listTasks(status: "pending")
                    if let match = pending.first(where: { $0.title.localizedCaseInsensitiveContains(titleQuery) }) {
                        taskId = match.id
                    }
                }
                guard let finalId = taskId, let completed = taskService.completeTask(taskId: finalId) else {
                    throw NSError(domain: "ByteHouse", code: 404, userInfo: [NSLocalizedDescriptionKey: "Task not found or failed to complete."])
                }
                output["success"] = AnyCodable(true)
                output["task"] = AnyCodable([
                    "id": completed.id,
                    "title": completed.title,
                    "status": completed.status,
                    "completed_at": completed.completed_at ?? ""
                ])

            default:
                status = "error"
                output["error"] = AnyCodable("Unknown tool: \(name)")
            }
        } catch {
            status = "error"
            output["error"] = AnyCodable(error.localizedDescription)
        }

        // Record trace in tool_traces table
        recordTrace(toolName: name, input: input, output: output, status: status)

        return ToolExecutionResult(tool_name: name, output: output, status: status)
    }

    private func recordTrace(toolName: String, input: [String: Any], output: [String: AnyCodable], status: String) {
        guard let db = database.db else { return }
        let id = UUID().uuidString
        let createdAt = ISO8601DateFormatter().string(from: Date())

        let inputJson = (try? JSONSerialization.data(withJSONObject: input)).flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
        let outputJson = (try? JSONEncoder().encode(output)).flatMap { String(data: $0, encoding: .utf8) } ?? "{}"

        let sql = "INSERT INTO tool_traces (id, tool_name, input, output, status, created_at) VALUES (?, ?, ?, ?, ?, ?);"
        var stmt: OpaquePointer?

        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return }
        defer { sqlite3_finalize(stmt) }

        sqlite3_bind_text(stmt, 1, (id as NSString).utf8String, -1, nil)
        sqlite3_bind_text(stmt, 2, (toolName as NSString).utf8String, -1, nil)
        sqlite3_bind_text(stmt, 3, (inputJson as NSString).utf8String, -1, nil)
        sqlite3_bind_text(stmt, 4, (outputJson as NSString).utf8String, -1, nil)
        sqlite3_bind_text(stmt, 5, (status as NSString).utf8String, -1, nil)
        sqlite3_bind_text(stmt, 6, (createdAt as NSString).utf8String, -1, nil)

        sqlite3_step(stmt)
    }
}
