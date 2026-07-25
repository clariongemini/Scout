import { BaseAdapter } from './BaseAdapter';
import { PlayerUUID } from '../engine/IdentityResolver';
import axios from 'axios';

const SOFA_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/html, */*',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
};

export class SofaScoreAdapter extends BaseAdapter {
  
  public async getPlayerData(uuid: PlayerUUID): Promise<any> {
    const searchName = uuid.name.replace(/\s+/g, '-').toLowerCase();
    const searchUrl = `https://api.sofascore.com/api/v1/player/search/${encodeURIComponent(searchName)}`;
    
    console.log(`SofaScore: Searching for ${searchName}`);
    
    try {
      const response = await axios.get(searchUrl, { headers: SOFA_HEADERS, timeout: 8000 });
      const players = response.data?.results || [];
      
      if (players.length === 0) {
        console.log(`SofaScore: No results for ${searchName}`);
        return null;
      }
      
      // Get first matching player
      const player = players[0];
      const playerId = player.id;
      
      console.log(`SofaScore: Found player ID ${playerId}`);
      
      // Get detailed stats
      const statsUrl = `https://api.sofascore.com/api/v1/player/${playerId}/statistics`;
      const statsResponse = await axios.get(statsUrl, { headers: SOFA_HEADERS, timeout: 8000 });
      const statsData = statsResponse.data?.statistics || [];
      
      // Get current season stats
      const currentSeason = statsData[0] || {};
      const stats = currentSeason.statistics || {};
      
      return {
        name: player.name,
        matches: stats.appearances || 0,
        goals: stats.goals || 0,
        assists: stats.assists || 0,
        yellowCards: stats.yellowCards || 0,
        redCards: stats.redCards || 0,
        shots: stats.totalShots || 0,
        shotsOnTarget: stats.shotsOnTarget || 0,
        rating: stats.rating || null,
        minutes: stats.minutesPlayed || 0,
        league: currentSeason.tournament?.name || 'unknown'
      };
    } catch (err: any) {
      console.error(`SofaScore Error: ${err.message}`);
      return null;
    }
  }
}
