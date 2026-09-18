import DatabaseConstructor, { Database as DatabaseType } from 'better-sqlite3';
import { SCHEMA_SQL } from './schema.js';

export class ByteHouseDatabase {
  private db: DatabaseType;

  constructor(filePath: string = ':memory:') {
    this.db = new DatabaseConstructor(filePath);
    this.init();
  }

  private init(): void {
    // Enable WAL mode for concurrency and performance (unless in-memory)
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.exec(SCHEMA_SQL);
  }

  public getRawDb(): DatabaseType {
    return this.db;
  }

  public close(): void {
    this.db.close();
  }
}
