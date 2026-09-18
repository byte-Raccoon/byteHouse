import Foundation
import SQLite3

public struct Migration: Sendable {
    public let version: Int
    public let name: String
    public let sql: String

    public init(version: Int, name: String, sql: String) {
        self.version = version
        self.name = name
        self.sql = sql
    }
}

public class MigrationRunner {
    public static let migrations: [Migration] = [
        Migration(
            version: 1,
            name: "001_initial_schema",
            sql: """
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS memories (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                source TEXT NOT NULL DEFAULT 'explicit',
                user_confirmed INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                priority TEXT NOT NULL DEFAULT 'medium',
                due_at TEXT,
                completed_at TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tool_traces (
                id TEXT PRIMARY KEY,
                tool_name TEXT NOT NULL,
                input TEXT NOT NULL,
                output TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        ),
        Migration(
            version: 2,
            name: "002_performance_indexes",
            sql: """
            CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority);
            CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at);
            CREATE INDEX IF NOT EXISTS idx_tool_traces_created ON tool_traces(created_at);
            """
        )
    ]

    public static func getUserVersion(db: OpaquePointer?) -> Int {
        guard let db = db else { return 0 }
        var stmt: OpaquePointer?
        var version = 0
        if sqlite3_prepare_v2(db, "PRAGMA user_version;", -1, &stmt, nil) == SQLITE_OK {
            if sqlite3_step(stmt) == SQLITE_ROW {
                version = Int(sqlite3_column_int(stmt, 0))
            }
            sqlite3_finalize(stmt)
        }
        return version
    }

    public static func applyMigrations(db: OpaquePointer?) throws -> Int {
        guard let db = db else {
            throw NSError(domain: "ByteHouse.Database", code: 500, userInfo: [NSLocalizedDescriptionKey: "Database pointer is null."])
        }

        let currentVersion = getUserVersion(db: db)
        let pending = migrations.filter { $0.version > currentVersion }.sorted { $0.version < $1.version }

        guard !pending.isEmpty else {
            return currentVersion
        }

        for migration in pending {
            var errMsg: UnsafeMutablePointer<CChar>?
            let beginRes = sqlite3_exec(db, "BEGIN EXCLUSIVE TRANSACTION;", nil, nil, &errMsg)
            if beginRes != SQLITE_OK {
                let msg = errMsg.map { String(cString: $0) } ?? "Unknown error"
                sqlite3_free(errMsg)
                throw NSError(domain: "ByteHouse.Database", code: Int(beginRes), userInfo: [NSLocalizedDescriptionKey: "Failed to begin transaction for migration \(migration.version): \(msg)"])
            }

            let execRes = sqlite3_exec(db, migration.sql, nil, nil, &errMsg)
            if execRes != SQLITE_OK {
                let msg = errMsg.map { String(cString: $0) } ?? "Unknown error"
                sqlite3_free(errMsg)
                sqlite3_exec(db, "ROLLBACK;", nil, nil, nil)
                throw NSError(domain: "ByteHouse.Database", code: Int(execRes), userInfo: [NSLocalizedDescriptionKey: "Migration \(migration.version) (\(migration.name)) failed: \(msg)"])
            }

            let versionSql = "PRAGMA user_version = \(migration.version);"
            let versionRes = sqlite3_exec(db, versionSql, nil, nil, &errMsg)
            if versionRes != SQLITE_OK {
                let msg = errMsg.map { String(cString: $0) } ?? "Unknown error"
                sqlite3_free(errMsg)
                sqlite3_exec(db, "ROLLBACK;", nil, nil, nil)
                throw NSError(domain: "ByteHouse.Database", code: Int(versionRes), userInfo: [NSLocalizedDescriptionKey: "Failed to update user_version for migration \(migration.version): \(msg)"])
            }

            sqlite3_exec(db, "COMMIT;", nil, nil, nil)
            AppLogger.shared.info("Database", "Applied migration \(migration.version): \(migration.name)")
        }

        return getUserVersion(db: db)
    }
}
