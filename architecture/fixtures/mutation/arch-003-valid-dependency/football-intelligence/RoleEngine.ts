// Valid fixture: RoleEngine imports from contracts (allowed dependency)
import { VerifiedPlayer } from '../contracts/VerifiedPlayer';

export class RoleEngine {
  evaluateRole(player: VerifiedPlayer): string {
    return 'midfielder';
  }
}
