/**
 * Transfermarkt Observation Mapper
 * 
 * Converts Transfermarkt adapter output to AdapterObservation format.
 * This is the migration layer that enables the Observation Layer integration.
 */

import { AdapterObservation, AdapterObservationFactory } from '../fsrs-v4/observation-layer/AdapterObservation';

export interface TransfermarktParsedData {
  name: string;
  dateOfBirth: string;
  primaryNationality: string;
  height: string;
  foot: string;
  currentClub: string;
  position: string;
  contractExpires: string;
  marketValue: string;
  transferHistory: any[];
  injuryHistory: any[];
  tmUrl: string;
  tmId: string;
  [key: string]: any;
}

export class TransfermarktObservationMapper {
  private static readonly SOURCE_ID = 'transfermarkt';
  private static readonly PARSER_VERSION = '1.0.0';

  /**
   * Map Transfermarkt parsed data to AdapterObservation array
   */
  public static mapToObservations(
    parsedData: TransfermarktParsedData,
    snapshotId: string
  ): AdapterObservation[] {
    const observations: AdapterObservation[] = [];

    // Validate required provenance
    if (!parsedData.tmUrl || !snapshotId) {
      console.error('[TransfermarktMapper] Missing required provenance: tmUrl or snapshotId');
      return observations;
    }

    // 1. Full Name Observation
    if (parsedData.name) {
      observations.push(
        AdapterObservationFactory.create({
          sourceId: this.SOURCE_ID,
          sourcePlayerId: parsedData.tmId,
          observationType: 'identity',
          rawValue: parsedData.name,
          rawUnit: 'text',
          rawLabel: 'full_name',
          sourceUrl: parsedData.tmUrl,
          snapshotId,
          parserVersion: this.PARSER_VERSION,
          metadata: {
            extractionMethod: 'scraping',
            pageType: 'player_profile'
          }
        })
      );
    }

    // 2. Date of Birth Observation
    if (parsedData.dateOfBirth) {
      observations.push(
        AdapterObservationFactory.create({
          sourceId: this.SOURCE_ID,
          sourcePlayerId: parsedData.tmId,
          observationType: 'identity',
          rawValue: parsedData.dateOfBirth,
          rawUnit: 'date_tr',
          rawLabel: 'date_of_birth',
          sourceUrl: parsedData.tmUrl,
          snapshotId,
          parserVersion: this.PARSER_VERSION,
          metadata: {
            extractionMethod: 'scraping',
            pageType: 'player_profile'
          }
        })
      );
    }

    // 3. Nationality Observation
    if (parsedData.primaryNationality) {
      observations.push(
        AdapterObservationFactory.create({
          sourceId: this.SOURCE_ID,
          sourcePlayerId: parsedData.tmId,
          observationType: 'identity',
          rawValue: parsedData.primaryNationality,
          rawUnit: 'text',
          rawLabel: 'nationality',
          sourceUrl: parsedData.tmUrl,
          snapshotId,
          parserVersion: this.PARSER_VERSION,
          metadata: {
            extractionMethod: 'scraping',
            pageType: 'player_profile'
          }
        })
      );
    }

    // 4. Height Observation
    if (parsedData.height) {
      observations.push(
        AdapterObservationFactory.create({
          sourceId: this.SOURCE_ID,
          sourcePlayerId: parsedData.tmId,
          observationType: 'physical',
          rawValue: parsedData.height,
          rawUnit: 'cm_tr',
          rawLabel: 'height',
          sourceUrl: parsedData.tmUrl,
          snapshotId,
          parserVersion: this.PARSER_VERSION,
          metadata: {
            extractionMethod: 'scraping',
            pageType: 'player_profile'
          }
        })
      );
    }

    // 5. Preferred Foot Observation
    if (parsedData.foot) {
      observations.push(
        AdapterObservationFactory.create({
          sourceId: this.SOURCE_ID,
          sourcePlayerId: parsedData.tmId,
          observationType: 'physical',
          rawValue: parsedData.foot,
          rawUnit: 'text',
          rawLabel: 'preferred_foot',
          sourceUrl: parsedData.tmUrl,
          snapshotId,
          parserVersion: this.PARSER_VERSION,
          metadata: {
            extractionMethod: 'scraping',
            pageType: 'player_profile'
          }
        })
      );
    }

    // 6. Current Club Observation
    if (parsedData.currentClub) {
      observations.push(
        AdapterObservationFactory.create({
          sourceId: this.SOURCE_ID,
          sourcePlayerId: parsedData.tmId,
          observationType: 'club',
          rawValue: parsedData.currentClub,
          rawUnit: 'text',
          rawLabel: 'current_club',
          sourceUrl: parsedData.tmUrl,
          snapshotId,
          parserVersion: this.PARSER_VERSION,
          metadata: {
            extractionMethod: 'scraping',
            pageType: 'player_profile'
          }
        })
      );
    }

    // 7. Position Observation
    if (parsedData.position) {
      observations.push(
        AdapterObservationFactory.create({
          sourceId: this.SOURCE_ID,
          sourcePlayerId: parsedData.tmId,
          observationType: 'position',
          rawValue: parsedData.position,
          rawUnit: 'text',
          rawLabel: 'primary_position',
          sourceUrl: parsedData.tmUrl,
          snapshotId,
          parserVersion: this.PARSER_VERSION,
          metadata: {
            extractionMethod: 'scraping',
            pageType: 'player_profile'
          }
        })
      );
    }

    // 8. Contract Expiry Observation
    if (parsedData.contractExpires) {
      observations.push(
        AdapterObservationFactory.create({
          sourceId: this.SOURCE_ID,
          sourcePlayerId: parsedData.tmId,
          observationType: 'contract',
          rawValue: parsedData.contractExpires,
          rawUnit: 'date_tr',
          rawLabel: 'contract_expiry',
          sourceUrl: parsedData.tmUrl,
          snapshotId,
          parserVersion: this.PARSER_VERSION,
          metadata: {
            extractionMethod: 'scraping',
            pageType: 'player_profile'
          }
        })
      );
    }

    // 9. Market Value Observation
    if (parsedData.marketValue) {
      observations.push(
        AdapterObservationFactory.create({
          sourceId: this.SOURCE_ID,
          sourcePlayerId: parsedData.tmId,
          observationType: 'market_value',
          rawValue: parsedData.marketValue,
          rawUnit: 'currency_tr',
          rawLabel: 'market_value',
          sourceUrl: parsedData.tmUrl,
          snapshotId,
          parserVersion: this.PARSER_VERSION,
          metadata: {
            extractionMethod: 'scraping',
            pageType: 'player_profile'
          }
        })
      );
    }

    // 10. Transfer History Observation (as a single observation with array value)
    if (parsedData.transferHistory && parsedData.transferHistory.length > 0) {
      observations.push(
        AdapterObservationFactory.create({
          sourceId: this.SOURCE_ID,
          sourcePlayerId: parsedData.tmId,
          observationType: 'transfer',
          rawValue: parsedData.transferHistory,
          rawUnit: 'array',
          rawLabel: 'transfer_history',
          sourceUrl: parsedData.tmUrl,
          snapshotId,
          parserVersion: this.PARSER_VERSION,
          metadata: {
            extractionMethod: 'api',
            pageType: 'transfer_history'
          }
        })
      );
    }

    // 11. Injury History Observation (as a single observation with array value)
    if (parsedData.injuryHistory && parsedData.injuryHistory.length > 0) {
      observations.push(
        AdapterObservationFactory.create({
          sourceId: this.SOURCE_ID,
          sourcePlayerId: parsedData.tmId,
          observationType: 'injury',
          rawValue: parsedData.injuryHistory,
          rawUnit: 'array',
          rawLabel: 'injury_history',
          sourceUrl: parsedData.tmUrl,
          snapshotId,
          parserVersion: this.PARSER_VERSION,
          metadata: {
            extractionMethod: 'scraping',
            pageType: 'injury_history'
          }
        })
      );
    }

    // Validate all observations
    const validObservations = observations.filter(obs => {
      const validation = AdapterObservationFactory.validate(obs);
      if (!validation.valid) {
        console.error(`[TransfermarktMapper] Invalid observation: ${validation.errors.join(', ')}`);
      }
      return validation.valid;
    });

    return validObservations;
  }

  /**
   * Get observation count statistics
   */
  public static getObservationStats(parsedData: TransfermarktParsedData): {
    totalFields: number;
    populatedFields: number;
    expectedObservations: number;
  } {
    const fields = [
      'name',
      'dateOfBirth',
      'primaryNationality',
      'height',
      'foot',
      'currentClub',
      'position',
      'contractExpires',
      'marketValue',
      'transferHistory',
      'injuryHistory'
    ];

    const populatedFields = fields.filter(field => {
      const value = parsedData[field as keyof TransfermarktParsedData];
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && value !== '';
    }).length;

    return {
      totalFields: fields.length,
      populatedFields,
      expectedObservations: populatedFields
    };
  }
}
