import { Pool } from "pg";

export interface User {
  id: number;
  battletag: string;
  updatedAt: number;
}

export interface Loadout {
  id: string;
  userId: number;
  name: string;
  class: string;
  spec: string;
  data: string; // base64 config string
  createdAt: number;
}

export interface DbDrillSession {
  id: number;
  userId: number | null;
  className: string;
  specName: string;
  drillType: string;
  durationSeconds: number;
  accuracy: number;
  avgReactionMs: number;
  scoreGrade: string;
  slowestKeys: any;
  peripheralScore: number;
  createdAt: string;
}

let pool: Pool;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

let dbInitialized = false;

async function ensureDbInitialized() {
  if (dbInitialized) return;

  try {
    const currentPool = getPool();
    
    // Create users table
    await currentPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY,
        battletag VARCHAR(255) NOT NULL,
        updated_at BIGINT NOT NULL,
        created_at BIGINT NOT NULL
      );
    `);

    // Create loadouts table
    await currentPool.query(`
      CREATE TABLE IF NOT EXISTS loadouts (
        id VARCHAR(255) PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        class VARCHAR(255) NOT NULL,
        spec VARCHAR(255) NOT NULL,
        data TEXT NOT NULL,
        created_at BIGINT NOT NULL
      );
    `);

    // Create drill_sessions table
    await currentPool.query(`
      CREATE TABLE IF NOT EXISTS drill_sessions (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        class VARCHAR(255) NOT NULL,
        spec VARCHAR(255) NOT NULL,
        drill_type VARCHAR(255) NOT NULL,
        duration_seconds INT NOT NULL,
        accuracy NUMERIC(5,2) NOT NULL,
        avg_reaction_ms INT NOT NULL,
        score_grade VARCHAR(10) NOT NULL,
        slowest_keys JSONB NOT NULL,
        peripheral_score INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    dbInitialized = true;
    console.log("PostgreSQL database initialized successfully.");
  } catch (err) {
    console.warn("Database initialization deferred (database offline during build or startup):", err);
  }
}

export class LocalDb {
  static async getUser(id: number): Promise<User | null> {
    await ensureDbInitialized();
    try {
      const res = await getPool().query("SELECT * FROM users WHERE id = $1", [id]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        battletag: row.battletag,
        updatedAt: Number(row.updated_at)
      };
    } catch (e) {
      console.error("getUser error", e);
      return null;
    }
  }

  static async saveUser(id: number, battletag: string): Promise<User> {
    await ensureDbInitialized();
    const now = Date.now();
    try {
      await getPool().query(
        `INSERT INTO users (id, battletag, updated_at, created_at) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET battletag = $2, updated_at = $3`,
        [id, battletag, now, now]
      );
      return { id, battletag, updatedAt: now };
    } catch (e) {
      console.error("saveUser error", e);
      return { id, battletag, updatedAt: now };
    }
  }

  static async getLoadouts(userId: number): Promise<Loadout[]> {
    await ensureDbInitialized();
    try {
      const res = await getPool().query(
        "SELECT * FROM loadouts WHERE user_id = $1 ORDER BY created_at DESC",
        [userId]
      );
      return res.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        class: row.class,
        spec: row.spec,
        data: row.data,
        createdAt: Number(row.created_at)
      }));
    } catch (e) {
      console.error("getLoadouts error", e);
      return [];
    }
  }

  static async addLoadout(
    userId: number,
    name: string,
    className: string,
    specName: string,
    data: string
  ): Promise<Loadout> {
    await ensureDbInitialized();
    const id = Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    const now = Date.now();
    try {
      await getPool().query(
        `INSERT INTO loadouts (id, user_id, name, class, spec, data, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, userId, name, className, specName, data, now]
      );
    } catch (e) {
      console.error("addLoadout error", e);
    }
    return { id, userId, name, class: className, spec: specName, data, createdAt: now };
  }

  static async deleteLoadout(id: string, userId: number): Promise<boolean> {
    await ensureDbInitialized();
    try {
      const res = await getPool().query(
        "DELETE FROM loadouts WHERE id = $1 AND user_id = $2",
        [id, userId]
      );
      return (res.rowCount ?? 0) > 0;
    } catch (e) {
      console.error("deleteLoadout error", e);
      return false;
    }
  }

  // --- Drill Sessions & Analytics Queries ---

  static async saveDrillSession(
    userId: number | null,
    className: string,
    specName: string,
    drillType: string,
    durationSeconds: number,
    accuracy: number,
    avgReactionMs: number,
    scoreGrade: string,
    slowestKeys: any[],
    peripheralScore: number
  ): Promise<boolean> {
    await ensureDbInitialized();
    try {
      await getPool().query(
        `INSERT INTO drill_sessions (user_id, class, spec, drill_type, duration_seconds, accuracy, avg_reaction_ms, score_grade, slowest_keys, peripheral_score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [userId, className, specName, drillType, durationSeconds, accuracy, avgReactionMs, scoreGrade, JSON.stringify(slowestKeys), peripheralScore]
      );
      return true;
    } catch (e) {
      console.error("saveDrillSession error", e);
      return false;
    }
  }

  static async getWeeklyHighScores(limit: number = 10): Promise<any[]> {
    await ensureDbInitialized();
    try {
      // Query the top scores from past 7 days.
      const res = await getPool().query(
        `SELECT ds.id, ds.user_id, COALESCE(u.battletag, 'Anonymous') as battletag,
                ds.class, ds.spec, ds.drill_type, ds.duration_seconds, 
                ds.accuracy, ds.avg_reaction_ms, ds.score_grade, ds.peripheral_score, ds.created_at
         FROM drill_sessions ds
         LEFT JOIN users u ON ds.user_id = u.id
         WHERE ds.created_at >= NOW() - INTERVAL '7 days'
         ORDER BY ds.accuracy DESC, ds.avg_reaction_ms ASC
         LIMIT $1`,
        [limit]
      );
      return res.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        battletag: row.battletag,
        class: row.class,
        spec: row.spec,
        drillType: row.drill_type,
        durationSeconds: row.duration_seconds,
        accuracy: Number(row.accuracy),
        avgReactionMs: row.avg_reaction_ms,
        scoreGrade: row.score_grade,
        peripheralScore: row.peripheral_score,
        createdAt: row.created_at
      }));
    } catch (e) {
      console.error("getWeeklyHighScores error", e);
      return [];
    }
  }

  static async getUserProgressHistory(userId: number, limit: number = 10): Promise<any[]> {
    await ensureDbInitialized();
    try {
      const res = await getPool().query(
        `SELECT id, class, spec, drill_type, duration_seconds, accuracy, avg_reaction_ms, score_grade, created_at
         FROM drill_sessions
         WHERE user_id = $1
         ORDER BY created_at ASC
         LIMIT $2`,
        [userId, limit]
      );
      return res.rows.map(row => ({
        id: row.id,
        class: row.class,
        spec: row.spec,
        drillType: row.drill_type,
        durationSeconds: row.duration_seconds,
        accuracy: Number(row.accuracy),
        avgReactionMs: row.avg_reaction_ms,
        scoreGrade: row.score_grade,
        createdAt: row.created_at
      }));
    } catch (e) {
      console.error("getUserProgressHistory error", e);
      return [];
    }
  }

  static async getUserSlowestKeybinds(userId: number): Promise<{ key: string; spell: string; avg_time_ms: number }[]> {
    await ensureDbInitialized();
    try {
      const res = await getPool().query(
        `SELECT slowest_keys 
         FROM drill_sessions 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 10`,
        [userId]
      );

      const keyMap: Record<string, { sum: number; count: number; spell: string }> = {};
      
      res.rows.forEach(row => {
        const list = row.slowest_keys;
        if (Array.isArray(list)) {
          list.forEach((item: any) => {
            if (item && item.key && item.avg_time_ms) {
              const keyUpper = item.key.toUpperCase();
              if (!keyMap[keyUpper]) {
                keyMap[keyUpper] = { sum: 0, count: 0, spell: item.spell || "" };
              }
              keyMap[keyUpper].sum += item.avg_time_ms;
              keyMap[keyUpper].count++;
            }
          });
        }
      });

      const result = Object.entries(keyMap).map(([key, data]) => ({
        key,
        spell: data.spell,
        avg_time_ms: Math.round(data.sum / data.count)
      }));

      return result.sort((a, b) => b.avg_time_ms - a.avg_time_ms).slice(0, 3);
    } catch (e) {
      console.error("getUserSlowestKeybinds error", e);
      return [];
    }
  }
}
