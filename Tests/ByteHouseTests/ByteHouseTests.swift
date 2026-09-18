import Testing
@testable import ByteHouse
import Foundation
import SQLite3

@Suite("ByteHouse Core Tests")
struct ByteHouseTests {

    @Test("Database Initialization & Migrations")
    func databaseInitialization() throws {
        let db = ByteHouseDatabase(path: ":memory:")
        #expect(db.db != nil)
        #expect(db.userVersion >= 2)

        let tablesQuery = "SELECT name FROM sqlite_master WHERE type='table';"
        var stmt: OpaquePointer?
        #expect(sqlite3_prepare_v2(db.db, tablesQuery, -1, &stmt, nil) == SQLITE_OK)

        var foundTables: Set<String> = []
        while sqlite3_step(stmt) == SQLITE_ROW {
            if let name = sqlite3_column_text(stmt, 0) {
                foundTables.insert(String(cString: name))
            }
        }
        sqlite3_finalize(stmt)

        #expect(foundTables.contains("conversations"))
        #expect(foundTables.contains("messages"))
        #expect(foundTables.contains("memories"))
        #expect(foundTables.contains("tasks"))
        #expect(foundTables.contains("tool_traces"))

        // Check indexes
        let indexesQuery = "SELECT name FROM sqlite_master WHERE type='index';"
        #expect(sqlite3_prepare_v2(db.db, indexesQuery, -1, &stmt, nil) == SQLITE_OK)
        var foundIndexes: Set<String> = []
        while sqlite3_step(stmt) == SQLITE_ROW {
            if let name = sqlite3_column_text(stmt, 0) {
                foundIndexes.insert(String(cString: name))
            }
        }
        sqlite3_finalize(stmt)

        #expect(foundIndexes.contains("idx_messages_conversation_created"))
        #expect(foundIndexes.contains("idx_tasks_status_priority"))
        #expect(foundIndexes.contains("idx_memories_created"))
        #expect(foundIndexes.contains("idx_tool_traces_created"))
    }

    @Test("Memory Service CRUD")
    func memoryService() throws {
        let db = ByteHouseDatabase(path: ":memory:")
        let memoryService = MemoryService(database: db)

        // 1. Remember
        let memory = try memoryService.remember(content: "User prefers dark mode")
        #expect(!memory.id.isEmpty)
        #expect(memory.content == "User prefers dark mode")

        // 2. Recall
        let recalled = memoryService.recall(query: "dark mode")
        #expect(recalled.count == 1)
        #expect(recalled.first?.content == "User prefers dark mode")

        // 3. List
        let all = memoryService.list()
        #expect(all.count == 1)

        // 4. Forget
        let deleted = memoryService.forget(memoryId: memory.id)
        #expect(deleted == true)
        #expect(memoryService.list().count == 0)
    }

    @Test("Task Service CRUD")
    func taskService() throws {
        let db = ByteHouseDatabase(path: ":memory:")
        let taskService = TaskService(database: db)

        // 1. Create task
        let task = try taskService.createTask(title: "Complete Stage 0", priority: "high")
        #expect(!task.id.isEmpty)
        #expect(task.status == "pending")
        #expect(task.priority == "high")

        // 2. List tasks
        let pending = taskService.listTasks(status: "pending")
        #expect(pending.count == 1)

        // 3. Complete task
        let completed = taskService.completeTask(taskId: task.id)
        #expect(completed != nil)
        #expect(completed?.status == "completed")
        #expect(completed?.completed_at != nil)

        // 4. Verify completed status filter
        let completedList = taskService.listTasks(status: "completed")
        #expect(completedList.count == 1)
    }

    @Test("Tool Registry & Traces")
    func toolRegistry() async {
        let db = ByteHouseDatabase(path: ":memory:")
        let memoryService = MemoryService(database: db)
        let taskService = TaskService(database: db)
        let toolRegistry = ToolRegistry(database: db, memoryService: memoryService, taskService: taskService)

        // 1. Definitions
        let defs = toolRegistry.getToolDefinitions()
        #expect(defs.contains(where: { $0.name == "remember" }))
        #expect(defs.contains(where: { $0.name == "create_task" }))

        // 2. Execution
        let result = await toolRegistry.executeTool(name: "remember", input: ["content": "Server IP is 10.0.0.1"])
        #expect(result.status == "success")
        #expect(memoryService.list().count == 1)
    }

    @Test("10-Step Stage 0 Target Journey")
    func fullStage0Journey() async throws {
        let tempDbPath = NSTemporaryDirectory() + "bytehouse_journey_test_\(UUID().uuidString).db"
        defer {
            try? FileManager.default.removeItem(atPath: tempDbPath)
        }

        // Step 1: Open ByteHouse
        var db: ByteHouseDatabase? = ByteHouseDatabase(path: tempDbPath)
        var memoryService = MemoryService(database: db!)
        var taskService = TaskService(database: db!)
        var toolRegistry = ToolRegistry(database: db!, memoryService: memoryService, taskService: taskService)
        var aiProvider = MockAIProvider()
        var conversationService = ConversationService(database: db!, aiProvider: aiProvider, toolRegistry: toolRegistry, memoryService: memoryService)

        // Step 2: Talk
        var chatRes = try await conversationService.chat(prompt: "Hello ByteHouse!")
        let conversationId = chatRes.conversation_id
        #expect(!conversationId.isEmpty)
        #expect(chatRes.response.contains("ByteHouse"))

        // Step 3: Remember explicitly
        chatRes = try await conversationService.chat(prompt: "Remember that my primary email is joy@example.com", conversationId: conversationId)
        #expect(chatRes.tools_executed.count == 1)
        #expect(chatRes.tools_executed.first?.tool_name == "remember")

        // Step 4: Storage check
        let memories = memoryService.list()
        #expect(memories.count == 1)
        #expect(memories.first?.content.contains("joy@example.com") ?? false)

        // Step 5: Recall
        chatRes = try await conversationService.chat(prompt: "What is my email?", conversationId: conversationId)
        #expect(chatRes.tools_executed.count == 1)
        #expect(chatRes.tools_executed.first?.tool_name == "recall")
        #expect(chatRes.response.contains("joy@example.com"))

        // Step 6: Create task via natural language
        chatRes = try await conversationService.chat(prompt: "Add a task to review project specs by 5 PM", conversationId: conversationId)
        #expect(chatRes.tools_executed.count == 1)
        #expect(chatRes.tools_executed.first?.tool_name == "create_task")

        // Step 7: List tasks
        chatRes = try await conversationService.chat(prompt: "What are my tasks?", conversationId: conversationId)
        #expect(chatRes.tools_executed.count == 1)
        #expect(chatRes.tools_executed.first?.tool_name == "list_tasks")
        #expect(chatRes.response.contains("review project specs"))

        // Step 8: Complete task
        chatRes = try await conversationService.chat(prompt: "Complete the task review project specs", conversationId: conversationId)
        #expect(chatRes.tools_executed.count == 1)
        #expect(chatRes.tools_executed.first?.tool_name == "complete_task")
        #expect(chatRes.response.contains("completed"))

        // Step 9: Restart application
        db?.close()
        db = nil

        // Reopen new instance with same DB file
        db = ByteHouseDatabase(path: tempDbPath)
        memoryService = MemoryService(database: db!)
        taskService = TaskService(database: db!)
        toolRegistry = ToolRegistry(database: db!, memoryService: memoryService, taskService: taskService)
        aiProvider = MockAIProvider()
        conversationService = ConversationService(database: db!, aiProvider: aiProvider, toolRegistry: toolRegistry, memoryService: memoryService)

        // Step 10: Verify persistent state
        let restoredMessages = conversationService.getMessages(conversationId: conversationId)
        #expect(restoredMessages.count >= 10)

        let restoredMemories = memoryService.list()
        #expect(restoredMemories.count == 1)
        #expect(restoredMemories.first?.content.contains("joy@example.com") ?? false)

        let restoredTasks = taskService.listTasks()
        #expect(restoredTasks.count == 1)
        #expect(restoredTasks.first?.status == "completed")

        db?.close()
    }

    @Test("AppConfig & .env Parsing")
    func appConfigAndEnv() {
        let envSample = """
        # Comments should be ignored
        DATABASE_PATH=/custom/test.db
        LOG_LEVEL=DEBUG
        AI_PROVIDER=gemini
        export GEMINI_API_KEY="test_secret_gemini_key_123"
        HOTKEY="⌃⌥ B"
        """

        let parsed = AppConfig.parseEnvContent(envSample)
        #expect(parsed["DATABASE_PATH"] == "/custom/test.db")
        #expect(parsed["LOG_LEVEL"] == "DEBUG")
        #expect(parsed["AI_PROVIDER"] == "gemini")
        #expect(parsed["GEMINI_API_KEY"] == "test_secret_gemini_key_123")
        #expect(parsed["HOTKEY"] == "⌃⌥ B")
    }

    @Test("AppLogger Redaction & Levels")
    func appLogger() {
        let logger = AppLogger()
        let tempLog = NSTemporaryDirectory() + "test_log_\(UUID().uuidString).log"
        defer {
            try? FileManager.default.removeItem(atPath: tempLog)
        }

        logger.configure(minLevel: .info, logPath: tempLog, secrets: ["my-super-secret-token"])

        logger.info("TestSubsystem", "Connecting with token my-super-secret-token here")

        // Read log file back
        let content = (try? String(contentsOfFile: tempLog, encoding: .utf8)) ?? ""
        #expect(!content.contains("my-super-secret-token"))
    }
}
