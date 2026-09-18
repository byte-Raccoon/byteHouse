import Foundation
import SQLite3

public class TaskService {
    private let database: ByteHouseDatabase

    public init(database: ByteHouseDatabase) {
        self.database = database
    }

    public func createTask(title: String, description: String? = nil, priority: String = "medium", dueAt: String? = nil) throws -> TaskItem {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            throw NSError(domain: "ByteHouse", code: 400, userInfo: [NSLocalizedDescriptionKey: "Task title cannot be empty."])
        }

        let id = UUID().uuidString
        let createdAt = ISO8601DateFormatter().string(from: Date())

        let sql = "INSERT INTO tasks (id, title, description, status, priority, due_at, completed_at, created_at) VALUES (?, ?, ?, 'pending', ?, ?, NULL, ?);"
        var stmt: OpaquePointer?

        guard let db = database.db, sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
            throw NSError(domain: "ByteHouse", code: 500, userInfo: [NSLocalizedDescriptionKey: "Failed to prepare insert task statement."])
        }
        defer { sqlite3_finalize(stmt) }

        sqlite3_bind_text(stmt, 1, (id as NSString).utf8String, -1, nil)
        sqlite3_bind_text(stmt, 2, (trimmed as NSString).utf8String, -1, nil)
        if let desc = description {
            sqlite3_bind_text(stmt, 3, (desc as NSString).utf8String, -1, nil)
        } else {
            sqlite3_bind_null(stmt, 3)
        }
        sqlite3_bind_text(stmt, 4, (priority as NSString).utf8String, -1, nil)
        if let due = dueAt {
            sqlite3_bind_text(stmt, 5, (due as NSString).utf8String, -1, nil)
        } else {
            sqlite3_bind_null(stmt, 5)
        }
        sqlite3_bind_text(stmt, 6, (createdAt as NSString).utf8String, -1, nil)

        if sqlite3_step(stmt) == SQLITE_DONE {
            return TaskItem(id: id, title: trimmed, description: description, status: "pending", priority: priority, due_at: dueAt, completed_at: nil, created_at: createdAt)
        } else {
            throw NSError(domain: "ByteHouse", code: 500, userInfo: [NSLocalizedDescriptionKey: "Failed to store task."])
        }
    }

    public func listTasks(status: String? = nil, priority: String? = nil, limit: Int = 50) -> [TaskItem] {
        guard let db = database.db else { return [] }
        var tasks: [TaskItem] = []
        var stmt: OpaquePointer?

        var conditions: [String] = []
        if let status = status {
            conditions.append("status = '\(status)'")
        }
        if let priority = priority {
            conditions.append("priority = '\(priority)'")
        }

        let whereClause = conditions.isEmpty ? "" : "WHERE " + conditions.joined(separator: " AND ")
        let sql = """
        SELECT id, title, description, status, priority, due_at, completed_at, created_at
        FROM tasks
        \(whereClause)
        ORDER BY CASE status WHEN 'pending' THEN 1 ELSE 2 END, created_at DESC
        LIMIT ?;
        """

        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return [] }
        defer { sqlite3_finalize(stmt) }

        sqlite3_bind_int(stmt, 1, Int32(limit))

        while sqlite3_step(stmt) == SQLITE_ROW {
            let id = String(cString: sqlite3_column_text(stmt, 0))
            let title = String(cString: sqlite3_column_text(stmt, 1))
            let desc: String? = sqlite3_column_text(stmt, 2).map { String(cString: $0) }
            let status = String(cString: sqlite3_column_text(stmt, 3))
            let priority = String(cString: sqlite3_column_text(stmt, 4))
            let due: String? = sqlite3_column_text(stmt, 5).map { String(cString: $0) }
            let completed: String? = sqlite3_column_text(stmt, 6).map { String(cString: $0) }
            let createdAt = String(cString: sqlite3_column_text(stmt, 7))

            tasks.append(TaskItem(id: id, title: title, description: desc, status: status, priority: priority, due_at: due, completed_at: completed, created_at: createdAt))
        }

        return tasks
    }

    public func completeTask(taskId: String) -> TaskItem? {
        guard let db = database.db else { return nil }
        var stmt: OpaquePointer?
        let completedAt = ISO8601DateFormatter().string(from: Date())
        let sql = "UPDATE tasks SET status = 'completed', completed_at = ? WHERE id = ?;"

        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return nil }
        defer { sqlite3_finalize(stmt) }

        sqlite3_bind_text(stmt, 1, (completedAt as NSString).utf8String, -1, nil)
        sqlite3_bind_text(stmt, 2, (taskId as NSString).utf8String, -1, nil)

        if sqlite3_step(stmt) == SQLITE_DONE {
            return getTask(taskId: taskId)
        }
        return nil
    }

    public func getTask(taskId: String) -> TaskItem? {
        guard let db = database.db else { return nil }
        var stmt: OpaquePointer?
        let sql = "SELECT id, title, description, status, priority, due_at, completed_at, created_at FROM tasks WHERE id = ?;"

        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return nil }
        defer { sqlite3_finalize(stmt) }

        sqlite3_bind_text(stmt, 1, (taskId as NSString).utf8String, -1, nil)

        if sqlite3_step(stmt) == SQLITE_ROW {
            let id = String(cString: sqlite3_column_text(stmt, 0))
            let title = String(cString: sqlite3_column_text(stmt, 1))
            let desc: String? = sqlite3_column_text(stmt, 2).map { String(cString: $0) }
            let status = String(cString: sqlite3_column_text(stmt, 3))
            let priority = String(cString: sqlite3_column_text(stmt, 4))
            let due: String? = sqlite3_column_text(stmt, 5).map { String(cString: $0) }
            let completed: String? = sqlite3_column_text(stmt, 6).map { String(cString: $0) }
            let createdAt = String(cString: sqlite3_column_text(stmt, 7))

            return TaskItem(id: id, title: title, description: desc, status: status, priority: priority, due_at: due, completed_at: completed, created_at: createdAt)
        }
        return nil
    }

    public func deleteTask(taskId: String) -> Bool {
        guard let db = database.db else { return false }
        var stmt: OpaquePointer?
        let sql = "DELETE FROM tasks WHERE id = ?;"

        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return false }
        defer { sqlite3_finalize(stmt) }

        sqlite3_bind_text(stmt, 1, (taskId as NSString).utf8String, -1, nil)
        return sqlite3_step(stmt) == SQLITE_DONE
    }
}
