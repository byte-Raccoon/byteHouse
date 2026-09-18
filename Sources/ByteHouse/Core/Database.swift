import Foundation
import SQLite3

public class ByteHouseDatabase {
    internal var db: OpaquePointer?

    public init(path: String = ":memory:") {
        var dbPointer: OpaquePointer?
        let flags = SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX
        if sqlite3_open_v2(path, &dbPointer, flags, nil) == SQLITE_OK {
            self.db = dbPointer
            configurePragmas()
            do {
                _ = try MigrationRunner.applyMigrations(db: self.db)
            } catch {
                AppLogger.shared.error("Database", "Database migration failed: \(error.localizedDescription)")
            }
        } else {
            let errorMsg = String(cString: sqlite3_errmsg(dbPointer))
            AppLogger.shared.error("Database", "Failed to open SQLite database at '\(path)': \(errorMsg)")
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

    public var userVersion: Int {
        return MigrationRunner.getUserVersion(db: db)
    }

    private func configurePragmas() {
        execute(sql: "PRAGMA journal_mode = WAL;")
        execute(sql: "PRAGMA foreign_keys = ON;")
    }

    @discardableResult
    public func execute(sql: String) -> Bool {
        guard let db = db else { return false }
        var errMsg: UnsafeMutablePointer<CChar>?
        if sqlite3_exec(db, sql, nil, nil, &errMsg) != SQLITE_OK {
            if let errMsg = errMsg {
                AppLogger.shared.error("Database", "SQLite execute error: \(String(cString: errMsg))")
                sqlite3_free(errMsg)
            }
            return false
        }
        return true
    }
}
