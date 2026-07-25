import { BaseAdapter } from './BaseAdapter';
import { PlayerUUID } from '../engine/IdentityResolver';

export class UnderstatAdapter extends BaseAdapter {
  
  public async getPlayerData(uuid: PlayerUUID): Promise<any> {
    let playerId = uuid.understat_id;
    if (!playerId) {
      console.log(`Understat: No static ID provided for ${uuid.name}, attempting dynamic search...`);
      const searchUrl = `https://understat.com/main/getPlayersName/${encodeURIComponent(uuid.name)}`;
      const searchContext = {
        provider: 'understat',
        resourceType: 'search',
        sourceEntityId: encodeURIComponent(uuid.name),
        ttlHours: 24
      };
      console.log(`Understat: Dynamic search for ${uuid.name}`);
      try {
        const data = await this.fetchJson(searchUrl, searchContext, { 'X-Requested-With': 'XMLHttpRequest' });
        if (data?.response?.success && data.response.players?.length > 0) {
          playerId = data.response.players[0].id;
          console.log(`Understat: Found dynamic ID ${playerId} for ${uuid.name}`);
        } else {
          console.log(`Understat: Player not found dynamically for ${uuid.name}`);
          return null;
        }
      } catch (err) {
        console.error(`Understat: Error searching for ${uuid.name}`, err);
        return null;
      }
    }

    const url = `https://understat.com/getPlayerData/${playerId}`;
    console.log(`Understat: Fetching API ${url}`);
    
    try {
      const context = {
        provider: 'understat',
        resourceType: 'player_profile',
        sourceEntityId: playerId,
        ttlHours: 12
      };
      const data = await this.fetchJson(url, context, { 'X-Requested-With': 'XMLHttpRequest' });
      const groupsData = data?.groups;
      if (!groupsData || !groupsData.season) return null;

      let seasons = Array.isArray(groupsData.season) ? groupsData.season : Object.values(groupsData.season);
      if (seasons.length === 0) return null;

      seasons.sort((a: any, b: any) => parseInt(b.season) - parseInt(a.season));
      const latestSeason = seasons[0];

      // Calculate total career stats across all recorded seasons
      let totalGames = 0;
      let totalTime = 0;
      let totalGoals = 0;
      let totalAssists = 0;
      let totalYellow = 0;
      let totalRed = 0;

      seasons.forEach((s: any) => {
        totalGames += parseInt(s.games || '0');
        totalTime += parseInt(s.time || '0');
        totalGoals += parseInt(s.goals || '0');
        totalAssists += parseInt(s.assists || '0');
        totalYellow += parseInt(s.yellow || '0');
        totalRed += parseInt(s.red || '0');
      });

      return {
        season: latestSeason.season,
        team: latestSeason.team,
        games: latestSeason.games,
        time: latestSeason.time,
        goals: latestSeason.goals,
        xG: latestSeason.xG,
        assists: latestSeason.assists,
        xA: latestSeason.xA,
        shots: latestSeason.shots,
        keyPasses: latestSeason.key_passes,
        yellowCards: latestSeason.yellow,
        redCards: latestSeason.red,
        npxG: latestSeason.npxG,
        npxGPer90: latestSeason.npxG90 || "0",
        xA90: latestSeason.xA90 || "0",
        npg: latestSeason.npg || "0",

        // Career Totals across all seasons
        careerGames: totalGames,
        careerTime: totalTime,
        careerGoals: totalGoals,
        careerAssists: totalAssists,
        careerYellow: totalYellow,
        careerRed: totalRed,
        allSeasons: seasons
      };
    } catch(err) {
      console.error(`Understat API Error:`, err);
      return null;
    }
  }
}
