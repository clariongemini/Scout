import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { PlayerUUID } from '../engine/IdentityResolver';

export class IdentityDatabase {
  private db: Database.Database;

  constructor() {
    // Veritabanı dosyasının kaydedileceği dizini oluştur
    const dbDir = path.join(process.cwd(), '.data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbPath = path.join(dbDir, 'identities.db');
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS player_identities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        normalized_name TEXT NOT NULL,
        transfermarkt_id TEXT,
        understat_id TEXT,
        statbunker_id TEXT,
        soccerway_id TEXT,
        fotmob_id TEXT,
        statsbomb_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_normalized_name ON player_identities(normalized_name);
    `);
  }

  /**
   * İsim normalize etme (örn: "Arda Güler" -> "arda guler")
   */
  public normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9 ]/g, '') // Özel karakterleri temizle
      .replace(/\s+/g, ' ');      // Fazla boşlukları tek boşluğa indir
  }

  /**
   * İsme göre oyuncu kimliği arama (fuzzy veya exact)
   */
  public findIdentityByName(name: string): PlayerUUID | null {
    const normalized = this.normalizeName(name);
    const stmt = this.db.prepare('SELECT * FROM player_identities WHERE normalized_name = ?');
    const row = stmt.get(normalized) as any;

    if (!row) {
      return null;
    }

    return {
      name: row.name,
      transfermarkt_id: row.transfermarkt_id,
      understat_id: row.understat_id,
      statbunker_id: row.statbunker_id,
      soccerway_id: row.soccerway_id,
      fotmob_id: row.fotmob_id,
      statsbomb_id: row.statsbomb_id,
    };
  }

  /**
   * Yeni bir kimlik kaydetme veya güncelleme
   */
  public upsertIdentity(uuid: PlayerUUID) {
    const normalized = this.normalizeName(uuid.name);
    
    const stmt = this.db.prepare(`
      INSERT INTO player_identities (
        name, normalized_name, transfermarkt_id, understat_id, statbunker_id, soccerway_id, fotmob_id, statsbomb_id, updated_at
      ) VALUES (
        @name, @normalized, @tm, @us, @sb, @sw, @fm, @sbm, CURRENT_TIMESTAMP
      )
      ON CONFLICT(normalized_name) DO UPDATE SET
        name = excluded.name,
        transfermarkt_id = COALESCE(excluded.transfermarkt_id, player_identities.transfermarkt_id),
        understat_id = COALESCE(excluded.understat_id, player_identities.understat_id),
        statbunker_id = COALESCE(excluded.statbunker_id, player_identities.statbunker_id),
        soccerway_id = COALESCE(excluded.soccerway_id, player_identities.soccerway_id),
        fotmob_id = COALESCE(excluded.fotmob_id, player_identities.fotmob_id),
        statsbomb_id = COALESCE(excluded.statsbomb_id, player_identities.statsbomb_id),
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run({
      name: uuid.name,
      normalized: normalized,
      tm: uuid.transfermarkt_id || null,
      us: uuid.understat_id || null,
      sb: uuid.statbunker_id || null,
      sw: uuid.soccerway_id || null,
      fm: uuid.fotmob_id || null,
      sbm: uuid.statsbomb_id || null,
    });
  }
}
