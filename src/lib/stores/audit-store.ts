import { db, initDb } from "../db";

export class AuditStore {
  /**
   * Log an administrative action
   */
  static async log(type: string, userId: string | null, data: any = {}): Promise<void> {
    await initDb();
    await db.query(
      "INSERT INTO audit_logs (type, user_id, data) VALUES ($1, $2, $3)",
      [type, userId, JSON.stringify(data)]
    );
  }

  /**
   * Get recent logs
   */
  static async getRecent(limit: number = 100): Promise<any[]> {
    await initDb();
    const res = await db.query(
      "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT $1",
      [limit]
    );
    return res.rows;
  }
}
