import Foundation
import SQLite3

public class ByteHouseDatabase {
    internal var db: OpaquePointer?

    public init(path: String = ":memory:") {
        var dbPointer: OpaquePointer?
        let flags = SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX
        if sqlite3_open_v2(path, &dbPointer, flags, nil) == SQLITE_OK {
            self.db = dbPointer
            initSchema()
        } else {
            let errorMsg = String(cString: sqlite3_errmsg(dbPointer))
            print("[ByteHouse] Failed to open SQLite database: \(errorMsg)")
        }
    }

    deinit {
        close()
    }

    public func close() {
        if db != nil {
            sqlite3_close_v2(db)
            db = nil
        }
    }

    private func initSchema() {
        execute(sql: "PRAGMA journal_mode = WAL;")
        execute(sql: "PRAGMA foreign_keys = ON;")

        let schema = """
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
        execute(sql: schema)
    }

    @discardableResult
    public func execute(sql: String) -> Bool {
        guard let db = db else { return false }
        var errMsg: UnsafeMutablePointer<CChar>?
        if sqlite3_exec(db, sql, nil, nil, &errMsg) != SQLITE_OK {
            if let errMsg = errMsg {
                print("[ByteHouse] SQLite execute error: \(String(cString: errMsg))")
                sqlite3_free(errMsg)
            }
            return false
        }
        return true
    }
}
