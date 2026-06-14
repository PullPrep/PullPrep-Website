import fs from "fs";
import path from "path";

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");

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

interface DbSchema {
  users: Record<number, User>;
  loadouts: Loadout[];
}

function initDb(): DbSchema {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const defaultData: DbSchema = { users: {}, loadouts: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), "utf8");
    return defaultData;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse db.json, resetting to empty", e);
    const defaultData: DbSchema = { users: {}, loadouts: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), "utf8");
    return defaultData;
  }
}

// Thread-safe read/write helper
export class LocalDb {
  private static get(): DbSchema {
    return initDb();
  }

  private static save(data: DbSchema) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  }

  static getUser(id: number): User | null {
    const db = this.get();
    return db.users[id] || null;
  }

  static saveUser(id: number, battletag: string): User {
    const db = this.get();
    const user: User = {
      id,
      battletag,
      updatedAt: Date.now()
    };
    db.users[id] = user;
    this.save(db);
    return user;
  }

  static getLoadouts(userId: number): Loadout[] {
    const db = this.get();
    return db.loadouts.filter(l => l.userId === userId);
  }

  static addLoadout(userId: number, name: string, className: string, specName: string, data: string): Loadout {
    const db = this.get();
    const newLoadout: Loadout = {
      id: Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
      userId,
      name,
      class: className,
      spec: specName,
      data,
      createdAt: Date.now()
    };
    db.loadouts.push(newLoadout);
    this.save(db);
    return newLoadout;
  }

  static deleteLoadout(id: string, userId: number): boolean {
    const db = this.get();
    const initialCount = db.loadouts.length;
    db.loadouts = db.loadouts.filter(l => !(l.id === id && l.userId === userId));
    const succeeded = db.loadouts.length < initialCount;
    if (succeeded) {
      this.save(db);
    }
    return succeeded;
  }
}
