import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface CacheEntry {
  cache_key: string;
  provider: string;
  resource_type: string;
  source_entity_id: string;
  raw_file_path: string;
  created_at: string;
  expires_at: string;
}

export class CacheManager {
  private db: Database.Database;

  constructor() {
    const dbDir = path.resolve(process.cwd(), '.cache');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, 'cache.sqlite');
    this.db = new Database(dbPath);
    this.initDb();
  }

  private initDb() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cache_entries (
        cache_key TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        source_entity_id TEXT NOT NULL,
        raw_file_path TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL
      )
    `);
    
    // Index for finding stale entries
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_expires_at ON cache_entries(expires_at)`);
  }

  public getCache(cacheKey: string): string | null {
    const stmt = this.db.prepare('SELECT raw_file_path, expires_at FROM cache_entries WHERE cache_key = ?');
    const row = stmt.get(cacheKey) as any;

    if (!row) return null;

    // Check expiration
    if (new Date() > new Date(row.expires_at)) {
      // Stale entry, we could return null or handle "stale-while-revalidate"
      // For now, let's treat it as a miss to force a refetch
      return null;
    }

    if (fs.existsSync(row.raw_file_path)) {
      return fs.readFileSync(row.raw_file_path, 'utf8');
    }

    return null;
  }

  public setCache(
    cacheKey: string, 
    provider: string, 
    resourceType: string, 
    sourceEntityId: string, 
    rawFilePath: string, 
    ttlHours: number
  ) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO cache_entries (
        cache_key, provider, resource_type, source_entity_id, raw_file_path, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      cacheKey,
      provider,
      resourceType,
      sourceEntityId,
      rawFilePath,
      expiresAt.toISOString()
    );
  }

  public cleanupStaleCache() {
    const stmt = this.db.prepare('DELETE FROM cache_entries WHERE expires_at < CURRENT_TIMESTAMP');
    stmt.run();
  }
}

export const cacheManager = new CacheManager();
