import { BaseAdapter } from './BaseAdapter';
import { PlayerUUID } from '../engine/IdentityResolver';

export class SoccerwayAdapter extends BaseAdapter {
  
  public async getPlayerData(uuid: PlayerUUID): Promise<any> {
    const searchName = uuid.name.replace(/\s+/g, '+');
    const searchUrl = `https://int.soccerway.com/search/players/?q=${searchName}`;
    
    console.log(`Soccerway: Scraping ${searchUrl}`);
    const searchContext = {
      provider: 'soccerway',
      resourceType: 'search',
      sourceEntityId: encodeURIComponent(uuid.name),
      ttlHours: 24
    };
    const $ = await this.fetchHtml(searchUrl, searchContext);
    if (!$) return null;

    // Search results are usually in a table. We'll pick the first result if available.
    let playerUrl = '';
    $('.search-results tbody tr').first().find('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('/players/')) {
        playerUrl = `https://int.soccerway.com${href}`;
      }
    });

    if (!playerUrl) return null;
    
    console.log(`Soccerway: Found player URL ${playerUrl}`);
    const playerContext = {
      provider: 'soccerway',
      resourceType: 'player_profile',
      sourceEntityId: encodeURIComponent(playerUrl),
      ttlHours: 168
    };
    const $p = await this.fetchHtml(playerUrl, playerContext);
    if (!$p) return null;

    const data: any = {
      seasonStats: [],
      currentSeason: {}
    };

    // Scrape season table - Soccerway uses different table structures
    // Try multiple selectors
    const tables = $p('table');
    let foundStats = false;
    
    tables.each((i, table) => {
      const $table = $(table);
      const headers = $table.find('th').map((j, th) => $(th).text().trim().toLowerCase()).get();
      
      // Check if this table has stats columns
      if (headers.some(h => h.includes('appearance') || h.includes('match') || h.includes('goal'))) {
        $table.find('tbody tr').each((j, row) => {
          const $row = $(row);
          const cells = $row.find('td');
          
          if (cells.length >= 2) {
            const season = cells.eq(0).text().trim();
            const team = cells.eq(1).text().trim();
            const competition = cells.eq(2).text().trim();
            const apps = parseInt(cells.eq(3).text().trim()) || 0;
            const goals = parseInt(cells.eq(4).text().trim()) || 0;
            const assists = parseInt(cells.eq(5).text().trim()) || 0;
            const yellows = parseInt(cells.eq(6).text().trim()) || 0;
            const reds = parseInt(cells.eq(7).text().trim()) || 0;

            if (season && apps > 0) {
              data.seasonStats.push({ season, team, competition, apps, goals, assists, yellows, reds });
              
              // Assume first row is current season
              if (!foundStats) {
                data.currentSeason = {
                  matches: apps,
                  goals: goals,
                  assists: assists,
                  yellowCards: yellows,
                  redCards: reds,
                  competition: competition
                };
                foundStats = true;
              }
            }
          }
        });
      }
    });

    // If no table found, try to extract from page text
    if (!foundStats) {
      const text = $p.text();
      const matchesMatch = text.match(/(\d+)\s*appearances?/i);
      const goalsMatch = text.match(/(\d+)\s*goals?/i);
      
      if (matchesMatch || goalsMatch) {
        data.currentSeason = {
          matches: matchesMatch ? parseInt(matchesMatch[1]) : 0,
          goals: goalsMatch ? parseInt(goalsMatch[1]) : 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          competition: 'unknown'
        };
      }
    }

    console.log(`Soccerway: Extracted current season - matches: ${data.currentSeason.matches}, goals: ${data.currentSeason.goals}`);

    return data;
  }
}
