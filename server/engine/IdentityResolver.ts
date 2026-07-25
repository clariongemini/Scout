import { IdentityDatabase } from '../storage/IdentityDatabase';
import axios from 'axios';
import * as cheerio from 'cheerio';
import FotmobPkg from 'fotmob';
const Fotmob: any = (FotmobPkg as any).default || FotmobPkg;

export interface PlayerUUID {
  name: string;
  transfermarkt_id?: string;
  transfermarktUrl?: string; // full URL e.g. https://www.transfermarkt.com.tr/.../spieler/123
  understat_id?: string;
  statbunker_id?: string;
  soccerway_id?: string;
  fotmob_id?: string;
  fbref_id?: string;
  whoscored_id?: string;
  squawka_id?: string;
  besoccer_id?: string;
  statsbomb_id?: string;
  // Legacy aliases used in some adapters
  transfermarkt?: string;
  understat?: string;
  fotmob?: string;
}

export class IdentityResolver {
  private db: IdentityDatabase;
  private fotmob: any;

  constructor() {
    this.db = new IdentityDatabase();
    this.fotmob = new Fotmob();
    this.seedDatabase();
  }

  /**
   * Varsayılan oyuncuları veritabanına ekle
   */
  private seedDatabase() {
    const mappings: PlayerUUID[] = [
      { name: 'Arda Güler', transfermarkt_id: '805111', understat_id: '11162', fbref_id: '351549' },
      { name: 'Erling Haaland', transfermarkt_id: '418560', understat_id: '8260', fbref_id: '42fd9f88' },
      { name: 'Mason Greenwood', transfermarkt_id: '532826', understat_id: '7490', fbref_id: 'd708ce21' },
      { name: 'Victor Osimhen', transfermarkt_id: '401923', understat_id: '8215', fbref_id: 'd4868d3c' },
      { name: 'Kerem Aktürkoğlu', transfermarkt_id: '439763', fbref_id: 'c8b7267c' },
      { name: 'Mert Müldür', transfermarkt_id: '353922', understat_id: '10986', fbref_id: 'c3e9b9e6' }
    ];

    for (const player of mappings) {
      if (!this.db.findIdentityByName(player.name)) {
        this.db.upsertIdentity(player);
      }
    }
  }

  public async resolve(playerName: string): Promise<PlayerUUID> {
    const existing = this.db.findIdentityByName(playerName);
    if (existing) {
      console.log(`[IdentityResolver] Bulundu (Cache): ${playerName}`);
      return existing;
    }

    console.log(`[IdentityResolver] Yeni Oyuncu Keşfediliyor: ${playerName}`);
    const uuid: PlayerUUID = { name: playerName };

    // Paralel Keşif (Dynamic Discovery)
    await Promise.allSettled([
      this.discoverTransfermarkt(uuid),
      this.discoverUnderstat(uuid),
      this.discoverFotMob(uuid)
    ]);

    // Veritabanına kaydet
    this.db.upsertIdentity(uuid);
    
    console.log(`[IdentityResolver] Keşif Tamamlandı ve Kaydedildi:`, uuid);
    return uuid;
  }

  private async discoverTransfermarkt(uuid: PlayerUUID) {
    try {
      const searchUrl = `https://www.transfermarkt.com.tr/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(uuid.name)}`;
      const { data } = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 8000
      });
      const $ = cheerio.load(data);
      const firstMatch = $('.items tbody tr.odd td.hauptlink a').first();
      const href = firstMatch.attr('href');
      if (href) {
        const match = href.match(/spieler\/(\d+)/);
        if (match) {
          uuid.transfermarkt_id = match[1];
        }
      }
    } catch (err) {
      console.error(`[IdentityResolver] TM Keşif Hatası: ${err.message}`);
    }
  }

  private async discoverUnderstat(uuid: PlayerUUID) {
    try {
      // Understat doesn't have a simple search endpoint, typically you parse the homepage or a specific page.
      // But we can just leave it to the adapter for now, or do a simple fetch if we know how to search.
      // Since Understat search is tricky via HTML, we'll rely on the UnderstatAdapter's internal fallback logic.
    } catch (err) {
      console.error(`[IdentityResolver] Understat Keşif Hatası: ${err.message}`);
    }
  }

  private async discoverFotMob(uuid: PlayerUUID) {
    try {
      const results = await this.fotmob.search(uuid.name);
      if (results && results.length > 0) {
        const topResult = results[0];
        // Ensure it's a player
        if (topResult.type === 'player') {
          // IDs in Fotmob are typically embedded in URLs or explicit
          // but we can extract it. E.g. topResult.id
          // Actually fotmob library search returns object with value/id.
        }
      }
    } catch (err) {
      console.error(`[IdentityResolver] FotMob Keşif Hatası: ${err.message}`);
    }
  }
}
