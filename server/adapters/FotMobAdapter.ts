import { BaseAdapter } from './BaseAdapter';
import { PlayerUUID } from '../engine/IdentityResolver';
import FotmobPkg from 'fotmob';

const Fotmob: any = (FotmobPkg as any).default || FotmobPkg;
const fotmob = new Fotmob();

export class FotMobAdapter extends BaseAdapter {
  
  public async getPlayerData(uuid: PlayerUUID): Promise<any> {
    const playerId = uuid.fotmob_id;
    if (!playerId) {
      console.log(`FotMob: No ID provided for ${uuid.name}`);
      return null;
    }

    console.log(`FotMob: Fetching data for ID ${playerId} via npm fotmob`);
    
    try {
      const data = await fotmob.getPlayer(playerId);
      if (!data || !data.primaryId) return null;

      // Fotmob returns a rich JSON object
      return {
        name: data.name,
        rating: data.playerData?.rating?.num || null,
        matches: data.playerData?.matches || 0,
        goals: data.playerData?.goals || 0,
        assists: data.playerData?.assists || 0,
        injury: data.playerData?.injury || null,
        recentStats: data.recentMatches || []
      };
    } catch (err: any) {
      console.error(`FotMob Error: ${err.message}`);
      return null;
    }
  }
}
