import { BaseAdapter } from './BaseAdapter';
import { PlayerUUID } from '../engine/IdentityResolver';
import * as cheerio from 'cheerio';

export class SquawkaAdapter extends BaseAdapter {
  
  public async getPlayerData(uuid: PlayerUUID): Promise<any> {
    // Squawka uses player IDs in URLs like: https://www.squawka.com/players/351549
    let playerId = uuid.squawka_id;
    let url = '';
    
    if (playerId) {
      url = `https://www.squawka.com/players/${playerId}`;
    } else {
      // Attempt search if no ID provided
      const searchUrl = `https://www.squawka.com/search?q=${encodeURIComponent(uuid.name)}`;
      const searchContext = {
        provider: 'squawka',
        resourceType: 'search',
        sourceEntityId: encodeURIComponent(uuid.name),
        ttlHours: 24
      };
      const $ = await this.fetchHtml(searchUrl, searchContext);
      if ($) {
        const firstMatch = $('.search-result-player a').first();
        const href = firstMatch.attr('href');
        if (href) {
          url = `https://www.squawka.com${href}`;
          const match = href.match(/\/players\/(\d+)/);
          if (match) playerId = match[1];
        }
      }
    }

    if (!url) {
      console.log(`Squawka: Could not find player ${uuid.name}`);
      return null;
    }

    const context = {
      provider: 'squawka',
      resourceType: 'player_profile',
      sourceEntityId: playerId || encodeURIComponent(uuid.name),
      ttlHours: 12
    };

    console.log(`Squawka: Fetching ${url}`);
    const $ = await this.fetchHtml(url, context);
    if (!$) return null;

    return this.parseHtml($.html ? $.html() : '', url, uuid, $, playerId);
  }

  public async parseHtml(html: string, url: string, uuid: PlayerUUID, $?: ReturnType<typeof cheerio.load>, playerId?: string): Promise<any> {
    if (!$) {
      $ = cheerio.load(html);
    }
    if (!playerId) {
      const match = url.match(/\/players\/(\d+)/);
      if (match) playerId = match[1];
    }

    // ── 1. İsim ─────────────────────────────────────────────────────────────
    const fullName = $('.player-name').text().trim() || 
                     $('.header-player-name').text().trim() ||
                     uuid.name;

    // ── 2. Mevcut Kulüp ─────────────────────────────────────────────────────
    const currentClub = $('.player-club').text().trim() ||
                       $('.header-club').text().trim() ||
                       '';

    // ── 3. Mevki ─────────────────────────────────────────────────────────────
    const position = $('.player-position').text().trim() ||
                    $('.header-position').text().trim() ||
                    '';

    // ── 4. Yaş ─────────────────────────────────────────────────────────────
    const ageText = $('.player-age').text().trim() ||
                   $('.header-age').text().trim() ||
                   '';
    const age = parseInt(ageText) || 0;

    // ── 5. Sezon İstatistikleri (Opta powered stats) ─────────────────────────
    let seasonStats: any = {};
    const statsTable = $('.stats-table tbody tr').first();
    
    if (statsTable.length > 0) {
      const cells = statsTable.find('td');
      seasonStats = {
        matches: cells.eq(0).text().trim() || '0',
        starts: cells.eq(1).text().trim() || '0',
        minutes: cells.eq(2).text().trim() || '0',
        goals: cells.eq(3).text().trim() || '0',
        assists: cells.eq(4).text().trim() || '0',
        shotsTotal: cells.eq(5).text().trim() || '0',
        shotsOnTarget: cells.eq(6).text().trim() || '0',
        keyPasses: cells.eq(7).text().trim() || '0',
        dribbles: cells.eq(8).text().trim() || '0',
        fouls: cells.eq(9).text().trim() || '0',
        offsides: cells.eq(10).text().trim() || '0',
        yellowCards: cells.eq(11).text().trim() || '0',
        redCards: cells.eq(12).text().trim() || '0',
      };
    }

    // ── 6. Gelişmiş İstatistikler (Advanced Metrics) ─────────────────────────
    let advancedStats: any = {};
    const advTable = $('.advanced-stats-table tbody tr').first();
    
    if (advTable.length > 0) {
      const cells = advTable.find('td');
      advancedStats = {
        passAccuracy: cells.eq(0).text().trim() || '0',
        passCompletion: cells.eq(1).text().trim() || '0',
        passAttempted: cells.eq(2).text().trim() || '0',
        crosses: cells.eq(3).text().trim() || '0',
        longBalls: cells.eq(4).text().trim() || '0',
        throughBalls: cells.eq(5).text().trim() || '0',
        tackles: cells.eq(6).text().trim() || '0',
        interceptions: cells.eq(7).text().trim() || '0',
        blocks: cells.eq(8).text().trim() || '0',
        clearances: cells.eq(9).text().trim() || '0',
        aerialDuelsWon: cells.eq(10).text().trim() || '0',
        aerialDuelsTotal: cells.eq(11).text().trim() || '0',
        aerialWinPct: cells.eq(12).text().trim() || '0',
      };
    }

    // ── 7. Şut İstatistikleri ───────────────────────────────────────────────
    let shootingStats: any = {};
    const shootTable = $('.shooting-stats-table tbody tr').first();
    
    if (shootTable.length > 0) {
      const cells = shootTable.find('td');
      shootingStats = {
        shotsTotal: cells.eq(0).text().trim() || '0',
        shotsOnTarget: cells.eq(1).text().trim() || '0',
        shotsOnTargetPct: cells.eq(2).text().trim() || '0',
        averageShotDistance: cells.eq(3).text().trim() || '0',
        freeKicks: cells.eq(4).text().trim() || '0',
        penaltiesScored: cells.eq(5).text().trim() || '0',
        penaltiesAttempted: cells.eq(6).text().trim() || '0',
        bigChancesCreated: cells.eq(7).text().trim() || '0',
        bigChancesMissed: cells.eq(8).text().trim() || '0',
      };
    }

    // ── 8. Pas İstatistikleri ───────────────────────────────────────────────
    let passingStats: any = {};
    const passTable = $('.passing-stats-table tbody tr').first();
    
    if (passTable.length > 0) {
      const cells = passTable.find('td');
      passingStats = {
        totalPasses: cells.eq(0).text().trim() || '0',
        completedPasses: cells.eq(1).text().trim() || '0',
        passAccuracy: cells.eq(2).text().trim() || '0',
        keyPasses: cells.eq(3).text().trim() || '0',
        crosses: cells.eq(4).text().trim() || '0',
        longBalls: cells.eq(5).text().trim() || '0',
        throughBalls: cells.eq(6).text().trim() || '0',
        finalThirdPasses: cells.eq(7).text().trim() || '0',
      };
    }

    // ── 9. Dribbling İstatistikleri ──────────────────────────────────────────
    let dribblingStats: any = {};
    const dribbleTable = $('.dribbling-stats-table tbody tr').first();
    
    if (dribbleTable.length > 0) {
      const cells = dribbleTable.find('td');
      dribblingStats = {
        dribblesAttempted: cells.eq(0).text().trim() || '0',
        dribblesSuccess: cells.eq(1).text().trim() || '0',
        dribblesSuccessPct: cells.eq(2).text().trim() || '0',
        foulsWon: cells.eq(3).text().trim() || '0',
        foulsConceded: cells.eq(4).text().trim() || '0',
      };
    }

    // ── 10. Defans İstatistikleri ───────────────────────────────────────────
    let defenseStats: any = {};
    const defTable = $('.defensive-stats-table tbody tr').first();
    
    if (defTable.length > 0) {
      const cells = defTable.find('td');
      defenseStats = {
        tackles: cells.eq(0).text().trim() || '0',
        tacklesWon: cells.eq(1).text().trim() || '0',
        interceptions: cells.eq(2).text().trim() || '0',
        blocks: cells.eq(3).text().trim() || '0',
        clearances: cells.eq(4).text().trim() || '0',
        aerialDuelsWon: cells.eq(5).text().trim() || '0',
        aerialDuelsTotal: cells.eq(6).text().trim() || '0',
        aerialWinPct: cells.eq(7).text().trim() || '0',
      };
    }

    return {
      name: fullName,
      squawkaId: playerId,
      currentClub,
      position,
      age,
      seasonStats,
      advancedStats,
      shootingStats,
      passingStats,
      dribblingStats,
      defenseStats,
      squawkaUrl: url
    };
  }
}
