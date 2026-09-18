import Foundation
import SQLite3

public class MemoryService {
    private let database: ByteHouseDatabase

    public init(database: ByteHouseDatabase) {
        self.database = database
    }

    public func remember(content: String, source: String = "explicit") throws -> Memory {
        let trimmed = content.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            throw NSError(domain: "ByteHouse", code: 400, userInfo: [NSLocalizedDescriptionKey: "Memory content cannot be empty."])
        }

        let id = UUID().uuidString
        let createdAt = ISO8601DateFormatter().string(from: Date())

        let sql = "INSERT INTO memories (id, content, source, user_confirmed, created_at) VALUES (?, ?, ?, 1, ?);"
        var stmt: OpaquePointer?

        guard let db = database.db, sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
            throw NSError(domain: "ByteHouse", code: 500, userInfo: [NSLocalizedDescriptionKey: "Failed to prepare insert memory statement."])
        }
        defer { sqlite3_finalize(stmt) }

        sqlite3_bind_text(stmt, 1, (id as NSString).utf8String, -1, nil)
        sqlite3_bind_text(stmt, 2, (trimmed as NSString).utf8String, -1, nil)
        sqlite3_bind_text(stmt, 3, (source as NSString).utf8String, -1, nil)
        sqlite3_bind_text(stmt, 4, (createdAt as NSString).utf8String, -1, nil)

        if sqlite3_step(stmt) == SQLITE_DONE {
            return Memory(id: id, content: trimmed, source: source, user_confirmed: 1, created_at: createdAt)
        } else {
            throw NSError(domain: "ByteHouse", code: 500, userInfo: [NSLocalizedDescriptionKey: "Failed to store memory."])
        }
    }

    public func recall(query: String? = nil, limit: Int = 10) -> [Memory] {
        guard let db = database.db else { return [] }
        var memories: [Memory] = []
        var stmt: OpaquePointer?

        let cleanQuery = query?.trimmingCharacters(in: .whitespacesAndNewlines)
        let sql: String
        if let cleanQuery = cleanQuery, !cleanQuery.isEmpty {
            sql = "SELECT id, content, source, user_confirmed, created_at FROM memories WHERE content LIKE ? ORDER BY created_at DESC LIMIT ?;"
        } else {
            sql = "SELECT id, content, source, user_confirmed, created_at FROM memories ORDER BY created_at DESC LIMIT ?;"
        }

        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return [] }
        defer { sqlite3_finalize(stmt) }

        if let cleanQuery = cleanQuery, !cleanQuery.isEmpty {
            let pattern = "%\(cleanQuery)%"
            sqlite3_bind_text(stmt, 1, (pattern as NSString).utf8String, -1, nil)
            sqlite3_bind_int(stmt, 2, Int32(limit))
        } else {
            sqlite3_bind_int(stmt, 1, Int32(limit))
        }

        while sqlite3_step(stmt) == SQLITE_ROW {
            let id = String(cString: sqlite3_column_text(stmt, 0))
            let content = String(cString: sqlite3_column_text(stmt, 1))
            let source = String(cString: sqlite3_column_text(stmt, 2))
            let userConfirmed = Int(sqlite3_column_int(stmt, 3))
            let createdAt = String(cString: sqlite3_column_text(stmt, 4))
            memories.append(Memory(id: id, content: content, source: source, user_confirmed: userConfirmed, created_at: createdAt))
        }

        return memories
    }

    public func forget(memoryId: String) -> Bool {
        guard let db = database.db else { return false }
        var stmt: OpaquePointer?
        let sql = "DELETE FROM memories WHERE id = ?;"

        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return false }
        defer { sqlite3_finalize(stmt) }

        sqlite3_bind_text(stmt, 1, (memoryId as NSString).utf8String, -1, nil)
        return sqlite3_step(stmt) == SQLITE_DONE
    }

    public func list(limit: Int = 50) -> [Memory] {
        return recall(query: nil, limit: limit)
    }
}
