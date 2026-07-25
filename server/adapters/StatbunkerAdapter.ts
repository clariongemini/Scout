import { BaseAdapter } from './BaseAdapter';
import { PlayerUUID } from '../engine/IdentityResolver';
import * as cheerio from 'cheerio';

export class StatbunkerAdapter extends BaseAdapter {
  
  public async getPlayerData(uuid: PlayerUUID): Promise<any> {
    const searchName = uuid.name;
    const searchUrl = `https://www.statbunker.com/players/search?exact=1&name=${encodeURIComponent(searchName)}`;
    
    console.log(`Statbunker: Scraping ${searchUrl}`);
    const context = {
      provider: 'statbunker',
      resourceType: 'search_or_profile',
      sourceEntityId: encodeURIComponent(searchName),
      ttlHours: 168
    };
    const $ = await this.fetchHtml(searchUrl, context);
    if (!$) return null;

    // Statbunker usually redirects directly to the player if exact match, or shows a list.
    // We will extract basic HTML tables.
    const playerHeader = $('h1').first().text();
    if (playerHeader.toLowerCase().includes('search results')) {
      console.log(`Statbunker: Multiple or no results for ${searchName}`);
      return null;
    }

    const stats: any = {
      matches: '-',
      minutes: '-',
      goals: '-',
      assists: '-',
      passes: '-',
      tackles: '-',
      duels: '-',
      interceptions: '-',
      clearances: '-',
      fouls: '-',
      yellowCards: '-',
      redCards: '-'
    };

    // Try to find the main stats table - Statbunker uses specific table structures
    // Look for tables with player statistics
    $('table').each((i, table) => {
      const $table = $(table);
      const headers = $table.find('th').map((j, th) => $(th).text().trim().toLowerCase()).get();
      
      // Check if this table has stats columns
      if (headers.some(h => h.includes('match') || h.includes('goal') || h.includes('assist'))) {
        $table.find('tbody tr').each((j, row) => {
          const $row = $(row);
          const cells = $row.find('td');
          
          if (cells.length >= 2) {
            const metric = cells.eq(0).text().trim().toLowerCase();
            const value = cells.eq(1).text().trim();
            
            if (metric.includes('match') || metric.includes('appearance')) stats.matches = value;
            if (metric.includes('minute') || metric.includes('time')) stats.minutes = value;
            if (metric.includes('goal')) stats.goals = value;
            if (metric.includes('assist')) stats.assists = value;
            if (metric.includes('pass')) stats.passes = value;
            if (metric.includes('tackle')) stats.tackles = value;
            if (metric.includes('duel')) stats.duels = value;
            if (metric.includes('interception')) stats.interceptions = value;
            if (metric.includes('clearance')) stats.clearances = value;
            if (metric.includes('foul')) stats.fouls = value;
          }
        });
      }
    });

    // Also try to find summary stats in divs or spans
    const text = $.text();
    
    // Try to extract numbers from the page text as fallback
    const matchesMatch = text.match(/(\d+)\s*matches?/i);
    if (matchesMatch) stats.matches = matchesMatch[1];
    
    const goalsMatch = text.match(/(\d+)\s*goals?/i);
    if (goalsMatch) stats.goals = goalsMatch[1];
    
    const assistsMatch = text.match(/(\d+)\s*assists?/i);
    if (assistsMatch) stats.assists = assistsMatch[1];

    // Log what we found
    console.log(`Statbunker: Extracted stats - matches: ${stats.matches}, goals: ${stats.goals}, assists: ${stats.assists}`);

    return stats;
  }
}
