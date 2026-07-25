// Invalid fixture: RoleEngine imports from adapters (REVERSE_DEPENDENCY violation)
import { TransfermarktAdapter } from '../adapters/TransfermarktAdapter';

export class RoleEngine {
  evaluateRole(playerId: string): string {
    const adapter = new TransfermarktAdapter();
    return adapter.getPlayerPosition(playerId);
  }
}
