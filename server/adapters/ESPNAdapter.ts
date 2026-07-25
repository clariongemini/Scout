import { BaseAdapter } from './BaseAdapter';
import { PlayerUUID } from '../engine/IdentityResolver';
import axios from 'axios';

const ESPN_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/html, */*',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
};

export class ESPNAdapter extends BaseAdapter {
  
  public async getPlayerData(uuid: PlayerUUID): Promise<any> {
    const searchName = uuid.name.replace(/\s+/g, '-').toLowerCase();
    const searchUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/athletes?search=${encodeURIComponent(searchName)}`;
    
    console.log(`ESPN: Searching for ${searchName}`);
    
    try {
      const response = await axios.get(searchUrl, { headers: ESPN_HEADERS, timeout: 8000 });
      const athletes = response.data?.items || [];
      
      if (athletes.length === 0) {
        console.log(`ESPN: No results for ${searchName}`);
        return null;
      }
      
      // Get first matching player
      const player = athletes[0];
      const playerId = player.id;
      
      console.log(`ESPN: Found player ID ${playerId}`);
      
      // Get detailed stats
      const statsUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/athletes/${playerId}/stats`;
      const statsResponse = await axios.get(statsUrl, { headers: ESPN_HEADERS, timeout: 8000 });
      const statsData = statsResponse.data?.categories || [];
      
      // Parse stats
      let stats: any = {
        matches: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        shots: 0,
        minutes: 0,
        league: 'unknown'
      };
      
      statsData.forEach((category: any) => {
        category.stats.forEach((stat: any) => {
          const name = stat.name.toLowerCase();
          const value = stat.value;
          
          if (name.includes('appearances') || name.includes('matches')) stats.matches = value;
          if (name.includes('goals')) stats.goals = value;
          if (name.includes('assists')) stats.assists = value;
          if (name.includes('yellow') || name.includes('cautions')) stats.yellowCards = value;
          if (name.includes('red') || name.includes('sendings')) stats.redCards = value;
          if (name.includes('shots')) stats.shots = value;
          if (name.includes('minutes') || name.includes('time')) stats.minutes = value;
        });
      });
      
      return {
        name: player.fullName || player.displayName,
        ...stats
      };
    } catch (err: any) {
      console.error(`ESPN Error: ${err.message}`);
      return null;
    }
  }
}
