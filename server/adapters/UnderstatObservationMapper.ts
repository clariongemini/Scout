/**
 * Understat Observation Mapper
 * 
 * Converts Understat adapter output to AdapterObservation format.
 * Understat provides advanced statistics data.
 */

import { AdapterObservation, AdapterObservationFactory } from '../fsrs-v4/observation-layer/AdapterObservation';

export interface UnderstatParsedData {
  season: string;
  team: string;
  games: string;
  time: string;
  goals: string;
  xG: string;
  assists: string;
  xA: string;
  shots: string;
  key_passes: string;
  yellowCards: string;
  redCards: string;
  npxG: string;
  npxGPer90: string;
  xA90: string;
  npg: string;
  careerGames: number;
  careerTime: number;
  careerGoals: number;
  careerAssists: number;
  careerYellow: number;
  careerRed: number;
  allSeasons: any[];
  [key: string]: any;
}

export class UnderstatObservationMapper {
  private static readonly SOURCE_ID = 'understat';
  private static readonly PARSER_VERSION = '1.0.0';

  /**
   * Map Understat parsed data to AdapterObservation array
   */
  public static mapToObservations(
    parsedData: UnderstatParsedData,
    snapshotId: string,
    sourceUrl: string
  ): AdapterObservation[] {
    const observations: AdapterObservation[] = [];

    // Validate required provenance
    if (!sourceUrl || !snapshotId) {
      console.error('[UnderstatMapper] Missing required provenance: sourceUrl or snapshotId');
      return observations;
    }

    // Extract player ID from URL
    const playerId = sourceUrl.match(/getPlayerData\/(\d+)/)?.[1] || '';

    // Build scope information
    const scope = {
      season: parsedData.season || undefined,
      competition: 'unknown', // Understat doesn't explicitly provide competition
      competitionType: 'league' as const,
      team: parsedData.team || undefined
    };

    // 1. Appearances Observation
    if (parsedData.games) {
      observations.push(
        AdapterObservationFactory.create({
          sourceId: this.SOURCE_ID,
          sourcePlayerId: playerId,
          observationType: 'season_appearances',
          rawValue: parsedData.games,
          rawUnit: 'count',
          rawLabel: 'appearances',
          rawScope: scope,
          sourceUrl,
          snapshotId,
          parserVersion: this.PARSER_VERSION,
          metadata: {
            extractionMethod: 'api',
            pageType: 'player_stats'
          }
        })
      );
    }

    // 2. Minutes Observation
    if (parsedData.time) {
      observations.push(
        AdapterObservationFactory.create({
          sourceId: this.SOURCE_ID,
          sourcePlayerId: playerId,
          observationType: 'season_appearances',
          rawValue: parsedData.time,
          rawUnit: 'minutes',
          rawLabel: 'minutes',
          rawScope: scope,
          sourceUrl,
          snapshotId,
          parserVersion: this.PARSER_VERSION,
          metadata: {
            extractionMethod: 'api',
            pageType: 'player_stats'
          }
        })
      );
    }

    // 3. Goals Observation
    if (parsedData.goals) {
      observations.push(
        AdapterObservationFactory.create({
          sourceId: this.SOURCE_ID,
          sourcePlayerId: playerId,
          observationType: 'goals',
          rawValue: parsedData.goals,
          rawUnit: 'count',
          rawLabel: 'goals',
          rawScope: scope,
          sourceUrl,
          snapshotId,
          parserVersion: this.PARSER_VERSION,
          metadata: {
            extractionMethod: 'api',
            pageType: 'player_stats'
          }
        })
      );
    }

    // 4. Assists Observation
    if (parsedData.assists) {
      observations.push(
        AdapterObservationFactory.create({
          sourceId: this.SOURCE_ID,
          sourcePlayerId: playerId,
          observationType: 'assists',
          rawValue: parsedData.assists,
          rawUnit: 'count',
          rawLabel: 'assists',
          rawScope: scope,
          sourceUrl,
          snapshotId,
          parserVersion: this.PARSER_VERSION,
          metadata: {
            extractionMethod: 'api',
            pageType: 'player_stats'
          }
        })
      );
    }

    // 5. xG Observation
    if (parsedData.xG) {
      observations.push(
        AdapterObservationFactory.create({
          sourceId: this.SOURCE_ID,
          sourcePlayerId: playerId,
          observationType: 'advanced_stats',
          rawValue: parsedData.xG,
          rawUnit: 'decimal',
          rawLabel: 'xG',
          rawScope: scope,
          sourceUrl,
          snapshotId,
          parserVersion: this.PARSER_VERSION,
          metadata: {
            extractionMethod: 'api',
            pageType: 'player_stats'
          }
        })
      );
    }

    // 6. xA Observation
    if (parsedData.xA) {
      observations.push(
        AdapterObservationFactory.create({
          sourceId: this.SOURCE_ID,
          sourcePlayerId: playerId,
          observationType: 'advanced_stats',
          rawValue: parsedData.xA,
          rawUnit: 'decimal',
          rawLabel: 'xA',
          rawScope: scope,
          sourceUrl,
          snapshotId,
          parserVersion: this.PARSER_VERSION,
          metadata: {
            extractionMethod: 'api',
            pageType: 'player_stats'
          }
        })
      );
    }

    // 7. Shots Observation
    if (parsedData.shots) {
      observations.push(
        AdapterObservationFactory.create({
          sourceId: this.SOURCE_ID,
          sourcePlayerId: playerId,
          observationType: 'advanced_stats',
          rawValue: parsedData.shots,
          rawUnit: 'count',
          rawLabel: 'shots',
          rawScope: scope,
          sourceUrl,
          snapshotId,
          parserVersion: this.PARSER_VERSION,
          metadata: {
            extractionMethod: 'api',
            pageType: 'player_stats'
          }
        })
      );
    }

    // 8. Key Passes Observation
    if (parsedData.key_passes) {
      observations.push(
        AdapterObservationFactory.create({
          sourceId: this.SOURCE_ID,
          sourcePlayerId: playerId,
          observationType: 'advanced_stats',
          rawValue: parsedData.key_passes,
          rawUnit: 'count',
          rawLabel: 'key_passes',
          rawScope: scope,
          sourceUrl,
          snapshotId,
          parserVersion: this.PARSER_VERSION,
          metadata: {
            extractionMethod: 'api',
            pageType: 'player_stats'
          }
        })
      );
    }

    // 9. npxG Observation
    if (parsedData.npxG) {
      observations.push(
        AdapterObservationFactory.create({
          sourceId: this.SOURCE_ID,
          sourcePlayerId: playerId,
          observationType: 'advanced_stats',
          rawValue: parsedData.npxG,
          rawUnit: 'decimal',
          rawLabel: 'npxG',
          rawScope: scope,
          sourceUrl,
          snapshotId,
          parserVersion: this.PARSER_VERSION,
          metadata: {
            extractionMethod: 'api',
            pageType: 'player_stats'
          }
        })
      );
    }

    // 10. xGChain Observation (if available in allSeasons data)
    if (parsedData.allSeasons && parsedData.allSeasons.length > 0) {
      const latestSeason = parsedData.allSeasons[0];
      if (latestSeason.xGChain) {
        observations.push(
          AdapterObservationFactory.create({
            sourceId: this.SOURCE_ID,
            sourcePlayerId: playerId,
            observationType: 'advanced_stats',
            rawValue: latestSeason.xGChain,
            rawUnit: 'decimal',
            rawLabel: 'xGChain',
            rawScope: scope,
            sourceUrl,
            snapshotId,
            parserVersion: this.PARSER_VERSION,
            metadata: {
              extractionMethod: 'api',
              pageType: 'player_stats'
            }
          })
        );
      }
    }

    // 11. xGBuildup Observation (if available in allSeasons data)
    if (parsedData.allSeasons && parsedData.allSeasons.length > 0) {
      const latestSeason = parsedData.allSeasons[0];
      if (latestSeason.xGBuildup) {
        observations.push(
          AdapterObservationFactory.create({
            sourceId: this.SOURCE_ID,
            sourcePlayerId: playerId,
            observationType: 'advanced_stats',
            rawValue: latestSeason.xGBuildup,
            rawUnit: 'decimal',
            rawLabel: 'xGBuildup',
            rawScope: scope,
            sourceUrl,
            snapshotId,
            parserVersion: this.PARSER_VERSION,
            metadata: {
              extractionMethod: 'api',
              pageType: 'player_stats'
            }
          })
        );
      }
    }

    // Validate all observations
    const validObservations = observations.filter(obs => {
      const validation = AdapterObservationFactory.validate(obs);
      if (!validation.valid) {
        console.error(`[UnderstatMapper] Invalid observation: ${validation.errors.join(', ')}`);
      }
      return validation.valid;
    });

    return validObservations;
  }

  /**
   * Get observation count statistics
   */
  public static getObservationStats(parsedData: UnderstatParsedData): {
    totalFields: number;
    populatedFields: number;
    expectedObservations: number;
    scopeComplete: boolean;
  } {
    const fields = [
      'games',
      'time',
      'goals',
      'assists',
      'xG',
      'xA',
      'shots',
      'key_passes',
      'npxG'
    ];

    const populatedFields = fields.filter(field => {
      const value = parsedData[field as keyof UnderstatParsedData];
      return value !== undefined && value !== null && value !== '';
    }).length;

    const scopeComplete = !!(parsedData.season && parsedData.team);

    return {
      totalFields: fields.length,
      populatedFields,
      expectedObservations: populatedFields + (scopeComplete ? 0 : 0), // xGChain and xGBuildup are optional
      scopeComplete
    };
  }
}
