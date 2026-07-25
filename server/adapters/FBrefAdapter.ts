import { BaseAdapter } from './BaseAdapter';
import { PlayerUUID } from '../engine/IdentityResolver';
import * as cheerio from 'cheerio';

export class FBrefAdapter extends BaseAdapter {
  
  public async getPlayerData(uuid: PlayerUUID): Promise<any> {
    // FBref uses player IDs in URLs like: https://fbref.com/en/players/351549/Mason-Greenwood
    let playerId = uuid.fbref_id;
    let url = '';
    
    if (playerId) {
      url = `https://fbref.com/en/players/${playerId}`;
    } else {
      // Attempt search if no ID provided
      const searchUrl = `https://fbref.com/search/search.fcgi?search=${encodeURIComponent(uuid.name)}`;
      const searchContext = {
        provider: 'fbref',
        resourceType: 'search',
        sourceEntityId: encodeURIComponent(uuid.name),
        ttlHours: 24
      };
      const $ = await this.fetchHtml(searchUrl, searchContext);
      if ($) {
        const firstMatch = $('.search-item-name a').first();
        const href = firstMatch.attr('href');
        if (href) {
          url = `https://fbref.com${href}`;
          const match = href.match(/\/players\/([a-z0-9]+)/);
          if (match) playerId = match[1];
        }
      }
    }

    if (!url) {
      console.log(`FBref: Could not find player ${uuid.name}`);
      return null;
    }

    const context = {
      provider: 'fbref',
      resourceType: 'player_profile',
      sourceEntityId: playerId || encodeURIComponent(uuid.name),
      ttlHours: 12
    };

    console.log(`FBref: Fetching ${url}`);
    const $ = await this.fetchHtml(url, context);
    if (!$) return null;

    return this.parseHtml($.html ? $.html() : '', url, uuid, $, playerId);
  }

  public async parseHtml(html: string, url: string, uuid: PlayerUUID, $?: ReturnType<typeof cheerio.load>, playerId?: string): Promise<any> {
    if (!$) {
      $ = cheerio.load(html);
    }
    if (!playerId) {
      const match = url.match(/\/players\/([a-z0-9]+)/);
      if (match) playerId = match[1];
    }

    // ── 1. İsim ─────────────────────────────────────────────────────────────
    const fullName = $('h1[itemprop="name"]').text().trim() || uuid.name;

    // ── 2. Mevcut Kulüp ─────────────────────────────────────────────────────
    const currentClub = $('.info-box div:contains("Club")').next().text().trim() ||
                       $('#meta div:contains("Club")').next().text().trim() ||
                       '';

    // ── 3. Yaş ─────────────────────────────────────────────────────────────
    const ageText = $('.info-box div:contains("Age")').next().text().trim() ||
                   $('#meta div:contains("Age")').next().text().trim() ||
                   '';
    const age = parseInt(ageText) || 0;

    // ── 4. Doğum Tarihi ─────────────────────────────────────────────────────
    const birthDate = $('.info-box div:contains("Born")').next().text().trim() ||
                     $('#meta div:contains("Born")').next().text().trim() ||
                     '';

    // ── 5. Mevki ─────────────────────────────────────────────────────────────
    const position = $('.info-box div:contains("Position")').next().text().trim() ||
                    $('#meta div:contains("Position")').next().text().trim() ||
                    '';

    // ── 6. Boy ─────────────────────────────────────────────────────────────
    const height = $('.info-box div:contains("Height")').next().text().trim() ||
                  $('#meta div:contains("Height")').next().text().trim() ||
                  '';

    // ── 7. Sezon İstatistikleri (Summary Table) ─────────────────────────────
    let seasonStats: any = {};
    const statsTable = $('#stats_standard_dom_lg tbody tr').first();
    
    if (statsTable.length > 0) {
      seasonStats = {
        matches: statsTable.find('td[data-stat="games"]').text().trim() || '0',
        starts: statsTable.find('td[data-stat="games_starts"]').text().trim() || '0',
        minutes: statsTable.find('td[data-stat="minutes"]').text().trim() || '0',
        goals: statsTable.find('td[data-stat="goals"]').text().trim() || '0',
        assists: statsTable.find('td[data-stat="assists"]').text().trim() || '0',
        shotsTotal: statsTable.find('td[data-stat="shots_total"]').text().trim() || '0',
        shotsOnTarget: statsTable.find('td[data-stat="shots_on_target"]').text().trim() || '0',
        xG: statsTable.find('td[data-stat="xg"]').text().trim() || '0',
        npxG: statsTable.find('td[data-stat="npxg"]').text().trim() || '0',
        xA: statsTable.find('td[data-stat="xa"]').text().trim() || '0',
        keyPasses: statsTable.find('td[data-stat="pass_assists"]').text().trim() || '0',
        progressivePasses: statsTable.find('td[data-stat="pass_progressive_distance"]').text().trim() || '0',
        progressiveCarries: statsTable.find('td[data-stat="carry_progressive_distance"]').text().trim() || '0',
        dribbles: statsTable.find('td[data-stat="dribbles"]').text().trim() || '0',
        dribblesSuccess: statsTable.find('td[data-stat="dribbles_completed"]').text().trim() || '0',
        yellowCards: statsTable.find('td[data-stat="cards_yellow"]').text().trim() || '0',
        redCards: statsTable.find('td[data-stat="cards_red"]').text().trim() || '0',
      };
    }

    // ── 8. Gelişmiş İstatistikler (Advanced Metrics) ─────────────────────────
    let advancedStats: any = {};
    const advTable = $('#stats_advanced_dom_lg tbody tr').first();
    
    if (advTable.length > 0) {
      advancedStats = {
        passAccuracy: advTable.find('td[data-stat="pass_pct"]').text().trim() || '0',
        passCompletion: advTable.find('td[data-stat="pass_completed"]').text().trim() || '0',
        passAttempted: advTable.find('td[data-stat="pass_attempted"]').text().trim() || '0',
        sca: advTable.find('td[data-stat="sca"]').text().trim() || '0', // Shot Creating Actions
        scaPer90: advTable.find('td[data-stat="sca_per90"]').text().trim() || '0',
        gca: advTable.find('td[data-stat="gca"]').text().trim() || '0', // Goal Creating Actions
        gcaPer90: advTable.find('td[data-stat="gca_per90"]').text().trim() || '0',
        touches: advTable.find('td[data-stat="touches"]').text().trim() || '0',
        touchesPenaltyArea: advTable.find('td[data-stat="touches_att_pen_area"]').text().trim() || '0',
        touchesThird: advTable.find('td[data-stat="touches_att_3rd"]').text().trim() || '0',
        carries: advTable.find('td[data-stat="carries"]').text().trim() || '0',
        carryDistance: advTable.find('td[data-stat="carry_distance"]').text().trim() || '0',
        tackles: advTable.find('td[data-stat="tackles"]').text().trim() || '0',
        interceptions: advTable.find('td[data-stat="interceptions"]').text().trim() || '0',
        blocks: advTable.find('td[data-stat="blocks"]').text().trim() || '0',
        aerialDuelsWon: advTable.find('td[data-stat="aerial_wins"]').text().trim() || '0',
        aerialDuelsTotal: advTable.find('td[data-stat="aerial_duels"]').text().trim() || '0',
        aerialWinPct: advTable.find('td[data-stat="aerial_win_pct"]').text().trim() || '0',
      };
    }

    // ── 9. Savunma İstatistikleri ───────────────────────────────────────────
    let defenseStats: any = {};
    const defTable = $('#stats_defense_dom_lg tbody tr').first();
    
    if (defTable.length > 0) {
      defenseStats = {
        tackles: defTable.find('td[data-stat="tackles"]').text().trim() || '0',
        tacklesWon: defTable.find('td[data-stat="tackles_won"]').text().trim() || '0',
        defensiveThirdTouches: defTable.find('td[data-stat="touches_def_3rd"]').text().trim() || '0',
        pressures: defTable.find('td[data-stat="pressures"]').text().trim() || '0',
        pressureRegains: defTable.find('td[data-stat="pressure_regains"]').text().trim() || '0',
        pressureRegainPct: defTable.find('td[data-stat="pressure_regain_pct"]').text().trim() || '0',
      };
    }

    // ── 10. Pas İstatistikleri ───────────────────────────────────────────────
    let passingStats: any = {};
    const passTable = $('#stats_passing_dom_lg tbody tr').first();
    
    if (passTable.length > 0) {
      passingStats = {
        totalPasses: passTable.find('td[data-stat="passes"]').text().trim() || '0',
        completedPasses: passTable.find('td[data-stat="passes_completed"]').text().trim() || '0',
        passAccuracy: passTable.find('td[data-stat="pass_pct"]').text().trim() || '0',
        totalDistance: passTable.find('td[data-stat="pass_distance"]').text().trim() || '0',
        progressiveDistance: passTable.find('td[data-stat="pass_progressive_distance"]').text().trim() || '0',
        shortPasses: passTable.find('td[data-stat="passes_short"]').text().trim() || '0',
        mediumPasses: passTable.find('td[data-stat="passes_medium"]').text().trim() || '0',
        longPasses: passTable.find('td[data-stat="passes_long"]').text().trim() || '0',
        crosses: passTable.find('td[data-stat="crosses"]').text().trim() || '0',
        cornerKicks: passTable.find('td[data-stat="corner_kicks"]').text().trim() || '0',
      };
    }

    // ── 11. Şut İstatistikleri ───────────────────────────────────────────────
    let shootingStats: any = {};
    const shootTable = $('#stats_shooting_dom_lg tbody tr').first();
    
    if (shootTable.length > 0) {
      shootingStats = {
        shotsTotal: shootTable.find('td[data-stat="shots"]').text().trim() || '0',
        shotsOnTarget: shootTable.find('td[data-stat="shots_on_target"]').text().trim() || '0',
        shotsOnTargetPct: shootTable.find('td[data-stat="shots_on_target_pct"]').text().trim() || '0',
        averageShotDistance: shootTable.find('td[data-stat="avg_shot_distance"]').text().trim() || '0',
        freeKicks: shootTable.find('td[data-stat="shots_free_kicks"]').text().trim() || '0',
        penaltiesScored: shootTable.find('td[data-stat="pens_made"]').text().trim() || '0',
        penaltiesAttempted: shootTable.find('td[data-stat="pens_att"]').text().trim() || '0',
        xG: shootTable.find('td[data-stat="xg"]').text().trim() || '0',
        npxG: shootTable.find('td[data-stat="npxg"]').text().trim() || '0',
        xGPerShot: shootTable.find('td[data-stat="xg_per_shot"]').text().trim() || '0',
      };
    }

    return {
      name: fullName,
      fbrefId: playerId,
      currentClub,
      age,
      birthDate,
      position,
      height,
      seasonStats,
      advancedStats,
      defenseStats,
      passingStats,
      shootingStats,
      fbrefUrl: url
    };
  }
}
