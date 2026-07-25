import { BaseAdapter } from './BaseAdapter';
import { PlayerUUID } from '../engine/IdentityResolver';
import axios from 'axios';

const ONEFOOTBALL_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/html, */*',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
};

export class OneFootballAdapter extends BaseAdapter {
  
  public async getPlayerData(uuid: PlayerUUID): Promise<any> {
    const searchName = uuid.name.replace(/\s+/g, '-').toLowerCase();
    const searchUrl = `https://api.onefootball.com/v3/players/search?q=${encodeURIComponent(searchName)}`;
    
    console.log(`OneFootball: Searching for ${searchName}`);
    
    try {
      const response = await axios.get(searchUrl, { headers: ONEFOOTBALL_HEADERS, timeout: 8000 });
      const players = response.data?.players || [];
      
      if (players.length === 0) {
        console.log(`OneFootball: No results for ${searchName}`);
        return null;
      }
      
      // Get first matching player
      const player = players[0];
      const playerId = player.id;
      
      console.log(`OneFootball: Found player ID ${playerId}`);
      
      // Get detailed stats
      const statsUrl = `https://api.onefootball.com/v3/players/${playerId}/stats`;
      const statsResponse = await axios.get(statsUrl, { headers: ONEFOOTBALL_HEADERS, timeout: 8000 });
      const statsData = statsResponse.data?.stats || {};
      
      return {
        name: player.name,
        matches: statsData.appearances || 0,
        goals: statsData.goals || 0,
        assists: statsData.assists || 0,
        yellowCards: statsData.yellowCards || 0,
        redCards: statsData.redCards || 0,
        shots: statsData.shots || 0,
        shotsOnTarget: statsData.shotsOnTarget || 0,
        rating: statsData.rating || null,
        minutes: statsData.minutes || 0,
        league: statsData.league || 'unknown'
      };
    } catch (err: any) {
      console.error(`OneFootball Error: ${err.message}`);
      return null;
    }
  }
}
