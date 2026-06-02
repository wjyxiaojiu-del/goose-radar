declare module 'better-sqlite3' {
  class Database {
    constructor(filename: string, options?: Record<string, unknown>);
    prepare(sql: string): unknown;
    exec(sql: string): void;
    close(): void;
  }
  export default Database;
}
