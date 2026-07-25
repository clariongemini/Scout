import { MetricObservation } from './ReconciliationEngine';
import { CanonicalObservation } from '../observation-layer/CanonicalObservation';

class InvalidMetricExtractorInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMetricExtractorInputError';
  }
}

/**
 * Runtime validation for CanonicalObservation input
 */
function isCanonicalObservation(input: any): input is CanonicalObservation {
  return (
    input &&
    typeof input === 'object' &&
    typeof input.observationId === 'string' &&
    typeof input.metricId === 'string' &&
    typeof input.sourceId === 'string' &&
    typeof input.rawValue !== 'undefined' &&
    typeof input.normalizedValue !== 'undefined' &&
    typeof input.validationStatus === 'string' &&
    typeof input.normalizationStatus === 'string'
  );
}

export class MetricExtractor {
  private migrationMode: boolean = true; // Enable migration mode for gradual rollout

  /**
   * Set migration mode (more lenient during rollout)
   */
  public setMigrationMode(enabled: boolean): void {
    this.migrationMode = enabled;
  }

  /**
   * Extract metrics from CanonicalObservations
   * 
   * CRITICAL: This method ONLY accepts CanonicalObservation[].
   * Any other input type will be rejected at runtime.
   * 
   * @param observations - Array of CanonicalObservation objects
   * @returns Array of MetricObservation objects
   * @throws InvalidMetricExtractorInputError if input is not CanonicalObservation[]
   */
  public extract(observations: readonly CanonicalObservation[]): MetricObservation[] {
    // Runtime validation: Ensure input is CanonicalObservation[]
    if (!Array.isArray(observations)) {
      throw new InvalidMetricExtractorInputError(
        `MetricExtractor requires CanonicalObservation[] input, received ${typeof observations}`
      );
    }

    for (let i = 0; i < observations.length; i++) {
      if (!isCanonicalObservation(observations[i])) {
        throw new InvalidMetricExtractorInputError(
          `MetricExtractor requires CanonicalObservation[] input. Element at index ${i} is not a valid CanonicalObservation`
        );
      }
    }

    const metricObservations: MetricObservation[] = [];

    for (const observation of observations) {
      // In migration mode, accept observations with UNKNOWN status (no registry definition)
      const isValidStatus = this.migrationMode 
        ? ['VALID', 'UNKNOWN', 'SUSPICIOUS'].includes(observation.validationStatus)
        : observation.validationStatus === 'VALID';

      if (!isValidStatus) {
        console.warn(`[MetricExtractor] Skipping observation ${observation.observationId} with validation status: ${observation.validationStatus}`);
        continue;
      }

      const isNormalized = this.migrationMode
        ? ['NORMALIZED', 'PARTIALLY_NORMALIZED', 'NOT_NORMALIZED'].includes(observation.normalizationStatus)
        : ['NORMALIZED', 'PARTIALLY_NORMALIZED'].includes(observation.normalizationStatus);

      if (!isNormalized) {
        console.warn(`[MetricExtractor] Skipping observation ${observation.observationId} with normalization status: ${observation.normalizationStatus}`);
        continue;
      }

      // Convert CanonicalObservation to MetricObservation
      const metricObservation: MetricObservation = {
        metricId: observation.metricId,
        value: observation.normalizedValue || observation.rawValue,
        source: observation.sourceId,
        scope: {
          season: observation.scope.season || 'unknown',
          competition: observation.scope.competition || 'unknown'
        },
        definitionVersion: '1.0',
        retrievedAt: observation.retrievedAt,
        // Lineage tracking
        sourceObservationIds: [observation.observationId],
        sourceSnapshotId: observation.snapshotId,
        observationReliability: observation.observationReliability
      };

      metricObservations.push(metricObservation);
    }

    console.log(`[MetricExtractor] Extracted ${metricObservations.length} metrics from ${observations.length} observations`);
    return metricObservations;
  }

  /**
   * Legacy method for backward compatibility (DEPRECATED)
   * 
   * This method is kept for temporary compatibility during migration.
   * It will be removed once all adapters are fully migrated to Observation Layer.
   * 
   * @deprecated Use extract(CanonicalObservation[]) instead
   */
  public extractMetrics(sourceData: any, sourceName: string, season: string): MetricObservation[] {
    console.warn(`[MetricExtractor] extractMetrics() is deprecated. Use extract(CanonicalObservation[]) instead.`);
    const observations: MetricObservation[] = [];
    const retrievedAt = new Date().toISOString();

    // Understat metrics - Kapsamlı ofansif metrikler
    if (sourceName === 'understat' && sourceData) {
      // Temel metrikler
      observations.push(this.createMetric('goals', sourceData.goals, 'understat', season, sourceData.league, retrievedAt));
      observations.push(this.createMetric('assists', sourceData.assists, 'understat', season, sourceData.league, retrievedAt));
      observations.push(this.createMetric('minutes', sourceData.time, 'understat', season, sourceData.league, retrievedAt));
      observations.push(this.createMetric('matches', sourceData.games, 'understat', season, sourceData.league, retrievedAt));
      
      // xG/xA metrikleri
      observations.push(this.createMetric('xG', sourceData.xG, 'understat', season, sourceData.league, retrievedAt));
      observations.push(this.createMetric('xA', sourceData.xA, 'understat', season, sourceData.league, retrievedAt));
      observations.push(this.createMetric('npxG', sourceData.npxG, 'understat', season, sourceData.league, retrievedAt));
      observations.push(this.createMetric('npg', sourceData.npg, 'understat', season, sourceData.league, retrievedAt));
      
      // Per 90 metrikleri (Understat'tan direkt)
      observations.push(this.createMetric('npxG_per90', sourceData.npxGPer90, 'understat', season, sourceData.league, retrievedAt));
      observations.push(this.createMetric('xA_per90', sourceData.xA90, 'understat', season, sourceData.league, retrievedAt));
      
      // Şut ve pas metrikleri
      observations.push(this.createMetric('shots', sourceData.shots, 'understat', season, sourceData.league, retrievedAt));
      observations.push(this.createMetric('key_passes', sourceData.key_passes, 'understat', season, sourceData.league, retrievedAt));
      
      // Kartlar
      observations.push(this.createMetric('yellow_cards', sourceData.yellow, 'understat', season, sourceData.league, retrievedAt));
      observations.push(this.createMetric('red_cards', sourceData.red, 'understat', season, sourceData.league, retrievedAt));
      
      // Kariyer toplamları
      if (sourceData.careerGames) {
        observations.push(this.createMetric('career_matches', sourceData.careerGames, 'understat', season, sourceData.league, retrievedAt));
        observations.push(this.createMetric('career_minutes', sourceData.careerTime, 'understat', season, sourceData.league, retrievedAt));
        observations.push(this.createMetric('career_goals', sourceData.careerGoals, 'understat', season, sourceData.league, retrievedAt));
        observations.push(this.createMetric('career_assists', sourceData.careerAssists, 'understat', season, sourceData.league, retrievedAt));
      }
    }

    // FotMob metrics - Rating ve temel istatistikler
    if (sourceName === 'fotmob' && sourceData) {
      observations.push(this.createMetric('rating', sourceData.rating, 'fotmob', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('matches', sourceData.matches, 'fotmob', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('goals', sourceData.goals, 'fotmob', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('assists', sourceData.assists, 'fotmob', season, 'unknown', retrievedAt));
    }

    // FBref metrics - Kapsamlı istatistikler
    if (sourceName === 'fbref' && sourceData) {
      const stats = sourceData.seasonStats || {};
      const adv = sourceData.advancedStats || {};
      const shooting = sourceData.shootingStats || {};
      const passing = sourceData.passingStats || {};
      const defense = sourceData.defenseStats || {};
      
      // Temel metrikler
      if (stats.matches) {
        observations.push(this.createMetric('matches', parseInt(stats.matches), 'fbref', season, 'unknown', retrievedAt));
      }
      if (stats.goals) {
        observations.push(this.createMetric('goals', parseInt(stats.goals), 'fbref', season, 'unknown', retrievedAt));
      }
      if (stats.assists) {
        observations.push(this.createMetric('assists', parseInt(stats.assists), 'fbref', season, 'unknown', retrievedAt));
      }
      if (stats.minutes) {
        observations.push(this.createMetric('minutes', parseInt(stats.minutes), 'fbref', season, 'unknown', retrievedAt));
      }
      if (stats.shotsTotal) {
        observations.push(this.createMetric('shots', parseInt(stats.shotsTotal), 'fbref', season, 'unknown', retrievedAt));
      }
      if (stats.shotsOnTarget) {
        observations.push(this.createMetric('shots_on_target', parseInt(stats.shotsOnTarget), 'fbref', season, 'unknown', retrievedAt));
      }
      if (stats.yellowCards) {
        observations.push(this.createMetric('yellow_cards', parseInt(stats.yellowCards), 'fbref', season, 'unknown', retrievedAt));
      }
      if (stats.redCards) {
        observations.push(this.createMetric('red_cards', parseInt(stats.redCards), 'fbref', season, 'unknown', retrievedAt));
      }
      
      // xG/xA metrikleri
      if (stats.xG) {
        observations.push(this.createMetric('xG', parseFloat(stats.xG), 'fbref', season, 'unknown', retrievedAt));
      }
      if (stats.npxG) {
        observations.push(this.createMetric('npxG', parseFloat(stats.npxG), 'fbref', season, 'unknown', retrievedAt));
      }
      if (stats.xA) {
        observations.push(this.createMetric('xA', parseFloat(stats.xA), 'fbref', season, 'unknown', retrievedAt));
      }
      
      // Gelişmiş metrikler
      if (adv.passAccuracy) {
        observations.push(this.createMetric('pass_accuracy', adv.passAccuracy, 'fbref', season, 'unknown', retrievedAt));
      }
      if (adv.keyPasses) {
        observations.push(this.createMetric('key_passes', parseInt(adv.keyPasses), 'fbref', season, 'unknown', retrievedAt));
      }
      if (adv.progressiveCarries) {
        observations.push(this.createMetric('progressive_carries', parseInt(adv.progressiveCarries), 'fbref', season, 'unknown', retrievedAt));
      }
      if (adv.dribbles) {
        observations.push(this.createMetric('dribbles', parseInt(adv.dribbles), 'fbref', season, 'unknown', retrievedAt));
      }
      
      // Savunma metrikleri
      if (defense.tackles) {
        observations.push(this.createMetric('tackles', parseInt(defense.tackles), 'fbref', season, 'unknown', retrievedAt));
      }
      if (defense.interceptions) {
        observations.push(this.createMetric('interceptions', parseInt(defense.interceptions), 'fbref', season, 'unknown', retrievedAt));
      }
      if (defense.blocks) {
        observations.push(this.createMetric('blocks', parseInt(defense.blocks), 'fbref', season, 'unknown', retrievedAt));
      }
    }

    // WhoScored metrics - Rating ve temel istatistikler
    if (sourceName === 'whoscored' && sourceData) {
      observations.push(this.createMetric('rating', sourceData.rating, 'whoscored', season, sourceData.competition || 'unknown', retrievedAt));
      observations.push(this.createMetric('matches', sourceData.matches, 'whoscored', season, sourceData.competition || 'unknown', retrievedAt));
      observations.push(this.createMetric('goals', sourceData.goals, 'whoscored', season, sourceData.competition || 'unknown', retrievedAt));
      observations.push(this.createMetric('assists', sourceData.assists, 'whoscored', season, sourceData.competition || 'unknown', retrievedAt));
      observations.push(this.createMetric('minutes', sourceData.minutes, 'whoscored', season, sourceData.competition || 'unknown', retrievedAt));
      observations.push(this.createMetric('shots', sourceData.shots, 'whoscored', season, sourceData.competition || 'unknown', retrievedAt));
      observations.push(this.createMetric('key_passes', sourceData.keyPasses, 'whoscored', season, sourceData.competition || 'unknown', retrievedAt));
      observations.push(this.createMetric('dribbles', sourceData.dribbles, 'whoscored', season, sourceData.competition || 'unknown', retrievedAt));
      observations.push(this.createMetric('yellow_cards', sourceData.yellowCards, 'whoscored', season, sourceData.competition || 'unknown', retrievedAt));
      observations.push(this.createMetric('red_cards', sourceData.redCards, 'whoscored', season, sourceData.competition || 'unknown', retrievedAt));
    }

    // Transfermarkt metrics - Identity, contract ve finansal
    if (sourceName === 'transfermarkt' && sourceData) {
      // Temel metrikler - Transfermarkt'tan da çekelim
      if (sourceData.goals) {
        observations.push(this.createMetric('goals', sourceData.goals, 'transfermarkt', season, sourceData.league || 'unknown', retrievedAt));
      }
      if (sourceData.assists) {
        observations.push(this.createMetric('assists', sourceData.assists, 'transfermarkt', season, sourceData.league || 'unknown', retrievedAt));
      }
      if (sourceData.matches) {
        observations.push(this.createMetric('matches', sourceData.matches, 'transfermarkt', season, sourceData.league || 'unknown', retrievedAt));
      }
      
      observations.push(this.createMetric('marketValue', sourceData.marketValue ? this.parseMarketValue(sourceData.marketValue) : null, 'transfermarkt', season, 'unknown', retrievedAt));
      
      // Sözleşme bilgileri
      if (sourceData.contractExpires) {
        observations.push({
          metricId: 'contract_expires',
          value: this.parseDate(sourceData.contractExpires),
          source: 'transfermarkt',
          scope: { season, competition: 'unknown' },
          definitionVersion: '1.0',
          retrievedAt,
          sourceObservationIds: [`legacy-tm-${season}`] // Temporary lineage for legacy method
        });
      }
      
      if (sourceData.contractStart) {
        observations.push({
          metricId: 'contract_start',
          value: this.parseDate(sourceData.contractStart),
          source: 'transfermarkt',
          scope: { season, competition: 'unknown' },
          definitionVersion: '1.0',
          retrievedAt,
          sourceObservationIds: [`legacy-tm-${season}`] // Temporary lineage for legacy method
        });
      }
      
      // Forma numarası
      if (sourceData.shirtNumber) {
        observations.push(this.createMetric('shirt_number', sourceData.shirtNumber, 'transfermarkt', season, 'unknown', retrievedAt));
      }
      
      // Boy
      if (sourceData.height) {
        observations.push({
          metricId: 'height_cm',
          value: this.parseHeight(sourceData.height),
          source: 'transfermarkt',
          scope: { season, competition: 'unknown' },
          definitionVersion: '1.0',
          retrievedAt,
          sourceObservationIds: [`legacy-tm-${season}`] // Temporary lineage for legacy method
        });
      }
      
      // Sakatlık geçmişi özeti
      if (sourceData.injurySummaryBySeason && sourceData.injurySummaryBySeason.length > 0) {
        const latestInjury = sourceData.injurySummaryBySeason[0];
        observations.push(this.createMetric('injury_days_latest', latestInjury.days, 'transfermarkt', season, 'unknown', retrievedAt));
        observations.push(this.createMetric('injury_count_latest', latestInjury.injuries, 'transfermarkt', season, 'unknown', retrievedAt));
        observations.push(this.createMetric('matches_missed_latest', latestInjury.matchesMissed, 'transfermarkt', season, 'unknown', retrievedAt));
      }
      
      // Milli takım kariyeri
      if (sourceData.nationalCareer && sourceData.nationalCareer.length > 0) {
        const totalCaps = sourceData.nationalCareer.reduce((sum: number, c: any) => sum + c.matches, 0);
        const totalGoals = sourceData.nationalCareer.reduce((sum: number, c: any) => sum + c.goals, 0);
        observations.push(this.createMetric('national_team_caps', totalCaps, 'transfermarkt', season, 'unknown', retrievedAt));
        observations.push(this.createMetric('national_team_goals', totalGoals, 'transfermarkt', season, 'unknown', retrievedAt));
      }
    }

    // Statbunker metrics - Resmi lig verileri
    if (sourceName === 'statbunker' && sourceData) {
      observations.push(this.createMetric('matches', sourceData.appearances, 'statbunker', season, sourceData.competition, retrievedAt));
      observations.push(this.createMetric('goals', sourceData.goals, 'statbunker', season, sourceData.competition, retrievedAt));
      observations.push(this.createMetric('assists', sourceData.assists, 'statbunker', season, sourceData.competition, retrievedAt));
      observations.push(this.createMetric('minutes', sourceData.minutes, 'statbunker', season, sourceData.competition, retrievedAt));
    }

    // FotMob metrics - Rating ve temel istatistikler
    if (sourceName === 'fotmob' && sourceData) {
      // Temel metrikler
      observations.push(this.createMetric('matches', sourceData.matches, 'fotmob', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('goals', sourceData.goals, 'fotmob', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('assists', sourceData.assists, 'fotmob', season, 'unknown', retrievedAt));
      
      // Rating (FotMob özel)
      if (sourceData.rating) {
        observations.push(this.createMetric('rating', sourceData.rating, 'fotmob', season, 'unknown', retrievedAt));
      }
      
      // Sakatlık durumu
      if (sourceData.injury) {
        observations.push(this.createMetric('injury_status', sourceData.injury, 'fotmob', season, 'unknown', retrievedAt));
      }
    }

    // Soccerway metrics - Uluslararası ve kupa verileri
    if (sourceName === 'soccerway' && sourceData) {
      const currentSeason = sourceData.currentSeason || {};
      observations.push(this.createMetric('matches', currentSeason.matches, 'soccerway', season, currentSeason.competition || 'unknown', retrievedAt));
      observations.push(this.createMetric('goals', currentSeason.goals, 'soccerway', season, currentSeason.competition || 'unknown', retrievedAt));
      observations.push(this.createMetric('assists', currentSeason.assists, 'soccerway', season, currentSeason.competition || 'unknown', retrievedAt));
      observations.push(this.createMetric('yellow_cards', currentSeason.yellowCards, 'soccerway', season, currentSeason.competition || 'unknown', retrievedAt));
      observations.push(this.createMetric('red_cards', currentSeason.redCards, 'soccerway', season, currentSeason.competition || 'unknown', retrievedAt));
    }

    // FBref metrics - Kapsamlı istatistikler
    if (sourceName === 'fbref' && sourceData) {
      const stats = sourceData.seasonStats || {};
      const adv = sourceData.advancedStats || {};
      const shooting = sourceData.shootingStats || {};
      const passing = sourceData.passingStats || {};
      const defense = sourceData.defenseStats || {};
      
      // Temel metrikler
      observations.push(this.createMetric('matches', stats.matches, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      observations.push(this.createMetric('starts', stats.starts, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      observations.push(this.createMetric('minutes', stats.minutes, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      observations.push(this.createMetric('goals', stats.goals, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      observations.push(this.createMetric('assists', stats.assists, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      
      // Şut metrikleri
      observations.push(this.createMetric('shots', shooting.shotsTotal, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      observations.push(this.createMetric('shots_on_target', shooting.shotsOnTarget, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      observations.push(this.createMetric('xG', shooting.xG, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      observations.push(this.createMetric('npxG', shooting.npxG, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      
      // Pas metrikleri
      observations.push(this.createMetric('key_passes', stats.keyPasses, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      observations.push(this.createMetric('xA', stats.xA, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      observations.push(this.createMetric('progressive_passes', stats.progressivePasses, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      observations.push(this.createMetric('progressive_carries', stats.progressiveCarries, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      
      // Gelişmiş metrikler
      observations.push(this.createMetric('dribbles', stats.dribbles, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      observations.push(this.createMetric('dribbles_success', stats.dribblesSuccess, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      observations.push(this.createMetric('sca', adv.sca, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      observations.push(this.createMetric('gca', adv.gca, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      observations.push(this.createMetric('touches', adv.touches, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      observations.push(this.createMetric('touches_penalty_area', adv.touchesPenaltyArea, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      observations.push(this.createMetric('touches_third', adv.touchesThird, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      
      // Savunma metrikleri
      observations.push(this.createMetric('tackles', defense.tackles, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      observations.push(this.createMetric('interceptions', defense.interceptions, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      observations.push(this.createMetric('blocks', defense.blocks, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      observations.push(this.createMetric('aerial_duels_won', defense.aerialDuelsWon, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      observations.push(this.createMetric('aerial_duels_total', defense.aerialDuelsTotal, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      observations.push(this.createMetric('aerial_win_pct', defense.aerialWinPct, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      
      // Kartlar
      observations.push(this.createMetric('yellow_cards', stats.yellowCards, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
      observations.push(this.createMetric('red_cards', stats.redCards, 'fbref', season, sourceData.league || 'unknown', retrievedAt));
    }

    // WhoScored metrics - Rating ve detaylı istatistikler
    if (sourceName === 'whoscored' && sourceData) {
      const stats = sourceData.seasonStats || {};
      const adv = sourceData.advancedStats || {};
      const shooting = sourceData.shootingStats || {};
      const passing = sourceData.passingStats || {};
      const dribbling = sourceData.dribblingStats || {};
      const defense = sourceData.defenseStats || {};
      
      // Rating (WhoScored özel)
      observations.push(this.createMetric('rating', sourceData.rating, 'whoscored', season, 'unknown', retrievedAt));
      
      // Temel metrikler
      observations.push(this.createMetric('matches', stats.matches, 'whoscored', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('starts', stats.starts, 'whoscored', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('minutes', stats.minutes, 'whoscored', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('goals', stats.goals, 'whoscored', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('assists', stats.assists, 'whoscored', season, 'unknown', retrievedAt));
      
      // Şut metrikleri
      observations.push(this.createMetric('shots', shooting.shotsTotal, 'whoscored', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('shots_on_target', shooting.shotsOnTarget, 'whoscored', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('big_chances_created', shooting.bigChancesCreated, 'whoscored', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('big_chances_missed', shooting.bigChancesMissed, 'whoscored', season, 'unknown', retrievedAt));
      
      // Pas metrikleri
      observations.push(this.createMetric('key_passes', stats.keyPasses, 'whoscored', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('crosses', passing.crosses, 'whoscored', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('long_balls', passing.longBalls, 'whoscored', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('through_balls', passing.throughBalls, 'whoscored', season, 'unknown', retrievedAt));
      
      // Dribbling
      observations.push(this.createMetric('dribbles', stats.dribbles, 'whoscored', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('dribbles_attempted', dribbling.dribblesAttempted, 'whoscored', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('dribbles_success', dribbling.dribblesSuccess, 'whoscored', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('dribbles_success_pct', dribbling.dribblesSuccessPct, 'whoscored', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('fouls_won', dribbling.foulsWon, 'whoscored', season, 'unknown', retrievedAt));
      
      // Savunma
      observations.push(this.createMetric('tackles', defense.tackles, 'whoscored', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('interceptions', defense.interceptions, 'whoscored', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('blocks', defense.blocks, 'whoscored', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('clearances', defense.clearances, 'whoscored', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('aerial_duels_won', defense.aerialDuelsWon, 'whoscored', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('aerial_duels_total', defense.aerialDuelsTotal, 'whoscored', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('aerial_win_pct', defense.aerialWinPct, 'whoscored', season, 'unknown', retrievedAt));
      
      // Kartlar
      observations.push(this.createMetric('yellow_cards', stats.yellowCards, 'whoscored', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('red_cards', stats.redCards, 'whoscored', season, 'unknown', retrievedAt));
    }

    // Squawka metrics - Opta verileri
    if (sourceName === 'squawka' && sourceData) {
      const stats = sourceData.seasonStats || {};
      const adv = sourceData.advancedStats || {};
      const shooting = sourceData.shootingStats || {};
      const passing = sourceData.passingStats || {};
      const dribbling = sourceData.dribblingStats || {};
      const defense = sourceData.defenseStats || {};
      
      // Temel metrikler
      observations.push(this.createMetric('matches', stats.matches, 'squawka', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('starts', stats.starts, 'squawka', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('minutes', stats.minutes, 'squawka', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('goals', stats.goals, 'squawka', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('assists', stats.assists, 'squawka', season, 'unknown', retrievedAt));
      
      // Şut metrikleri
      observations.push(this.createMetric('shots', shooting.shotsTotal, 'squawka', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('shots_on_target', shooting.shotsOnTarget, 'squawka', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('big_chances_created', shooting.bigChancesCreated, 'squawka', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('big_chances_missed', shooting.bigChancesMissed, 'squawka', season, 'unknown', retrievedAt));
      
      // Pas metrikleri
      observations.push(this.createMetric('key_passes', stats.keyPasses, 'squawka', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('crosses', passing.crosses, 'squawka', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('long_balls', passing.longBalls, 'squawka', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('through_balls', passing.throughBalls, 'squawka', season, 'unknown', retrievedAt));
      
      // Dribbling
      observations.push(this.createMetric('dribbles', stats.dribbles, 'squawka', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('dribbles_attempted', dribbling.dribblesAttempted, 'squawka', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('dribbles_success', dribbling.dribblesSuccess, 'squawka', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('dribbles_success_pct', dribbling.dribblesSuccessPct, 'squawka', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('fouls_won', dribbling.foulsWon, 'squawka', season, 'unknown', retrievedAt));
      
      // Savunma
      observations.push(this.createMetric('tackles', defense.tackles, 'squawka', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('interceptions', defense.interceptions, 'squawka', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('blocks', defense.blocks, 'squawka', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('clearances', defense.clearances, 'squawka', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('aerial_duels_won', defense.aerialDuelsWon, 'squawka', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('aerial_duels_total', defense.aerialDuelsTotal, 'squawka', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('aerial_win_pct', defense.aerialWinPct, 'squawka', season, 'unknown', retrievedAt));
      
      // Kartlar
      observations.push(this.createMetric('yellow_cards', stats.yellowCards, 'squawka', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('red_cards', stats.redCards, 'squawka', season, 'unknown', retrievedAt));
    }

    // BeSoccer metrics - Form analizleri
    if (sourceName === 'besoccer' && sourceData) {
      const stats = sourceData.seasonStats || {};
      const adv = sourceData.advancedStats || {};
      const shooting = sourceData.shootingStats || {};
      const passing = sourceData.passingStats || {};
      const dribbling = sourceData.dribblingStats || {};
      const defense = sourceData.defenseStats || {};
      
      // Temel metrikler
      observations.push(this.createMetric('matches', stats.matches, 'besoccer', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('starts', stats.starts, 'besoccer', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('minutes', stats.minutes, 'besoccer', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('goals', stats.goals, 'besoccer', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('assists', stats.assists, 'besoccer', season, 'unknown', retrievedAt));
      
      // Şut metrikleri
      observations.push(this.createMetric('shots', shooting.shotsTotal, 'besoccer', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('shots_on_target', shooting.shotsOnTarget, 'besoccer', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('big_chances_created', shooting.bigChancesCreated, 'besoccer', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('big_chances_missed', shooting.bigChancesMissed, 'besoccer', season, 'unknown', retrievedAt));
      
      // Pas metrikleri
      observations.push(this.createMetric('key_passes', stats.keyPasses, 'besoccer', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('crosses', passing.crosses, 'besoccer', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('long_balls', passing.longBalls, 'besoccer', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('through_balls', passing.throughBalls, 'besoccer', season, 'unknown', retrievedAt));
      
      // Dribbling
      observations.push(this.createMetric('dribbles', stats.dribbles, 'besoccer', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('dribbles_attempted', dribbling.dribblesAttempted, 'besoccer', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('dribbles_success', dribbling.dribblesSuccess, 'besoccer', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('dribbles_success_pct', dribbling.dribblesSuccessPct, 'besoccer', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('fouls_won', dribbling.foulsWon, 'besoccer', season, 'unknown', retrievedAt));
      
      // Savunma
      observations.push(this.createMetric('tackles', defense.tackles, 'besoccer', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('interceptions', defense.interceptions, 'besoccer', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('blocks', defense.blocks, 'besoccer', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('clearances', defense.clearances, 'besoccer', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('aerial_duels_won', defense.aerialDuelsWon, 'besoccer', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('aerial_duels_total', defense.aerialDuelsTotal, 'besoccer', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('aerial_win_pct', defense.aerialWinPct, 'besoccer', season, 'unknown', retrievedAt));
      
      // Kartlar
      observations.push(this.createMetric('yellow_cards', stats.yellowCards, 'besoccer', season, 'unknown', retrievedAt));
      observations.push(this.createMetric('red_cards', stats.redCards, 'besoccer', season, 'unknown', retrievedAt));
    }

    return observations;
  }

  private createMetric(metricId: string, value: any, source: string, season: string, competition: string | undefined, retrievedAt: string): MetricObservation {
    return {
      metricId,
      value: value !== null && value !== undefined && value !== '' ? parseFloat(value) : null,
      source,
      scope: { season, competition: competition || 'unknown' },
      definitionVersion: '1.0',
      retrievedAt,
      sourceObservationIds: [`legacy-${source}-${season}`] // Temporary lineage for legacy method
    };
  }

  private parseMarketValue(mvString: string): number {
    // "€55.00M" -> 55.00, "€1.5m" -> 1.5
    if (!mvString) return 0;
    const match = mvString.match(/[\d.]+/);
    if (match) {
      return parseFloat(match[0]);
    }
    return 0;
  }

  private parseDate(dateStr: string): string {
    // "30 Haz 2025" -> ISO format
    if (!dateStr) return '';
    try {
      const months: Record<string, string> = {
        'Oca': '01', 'Şub': '02', 'Mar': '03', 'Nis': '04',
        'May': '05', 'Haz': '06', 'Tem': '07', 'Ağu': '08',
        'Eyl': '09', 'Eki': '10', 'Kas': '11', 'Ara': '12'
      };
      
      const parts = dateStr.split(' ');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = months[parts[1]] || '01';
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  }

  private parseHeight(heightStr: string): number | null {
    // "1,81 m" -> 181
    if (!heightStr) return null;
    const match = heightStr.match(/[\d.,]+/);
    if (match) {
      const num = parseFloat(match[0].replace(',', '.'));
      return Math.round(num * 100); // cm'ye çevir
    }
    return null;
  }

  public groupObservationsByMetric(observations: MetricObservation[]): Map<string, MetricObservation[]> {
    const grouped = new Map<string, MetricObservation[]>();

    for (const obs of observations) {
      const existing = grouped.get(obs.metricId) || [];
      existing.push(obs);
      grouped.set(obs.metricId, existing);
    }

    return grouped;
  }

  /**
   * Per 90 metriklerini hesapla (FSRS_v4 feature calculation)
   */
  public calculateDerivedMetrics(observations: Map<string, MetricObservation[]>): Map<string, number | null> {
    const derived = new Map<string, number | null>();
    
    const minutes = this.getVerifiedValue(observations, 'minutes');
    
    if (minutes && minutes > 0) {
      // goals_per90
      const goals = this.getVerifiedValue(observations, 'goals');
      const goalsPer90 = goals !== null ? (goals * 90) / minutes : null;
      if (goalsPer90 !== null) derived.set('goals_per90', goalsPer90);
      
      // assists_per90
      const assists = this.getVerifiedValue(observations, 'assists');
      const assistsPer90 = assists !== null ? (assists * 90) / minutes : null;
      if (assistsPer90 !== null) derived.set('assists_per90', assistsPer90);
      
      // xG_per90
      const xG = this.getVerifiedValue(observations, 'xG');
      const xGPer90 = xG !== null ? (xG * 90) / minutes : null;
      if (xGPer90 !== null) derived.set('xG_per90', xGPer90);
      
      // xA_per90
      const xA = this.getVerifiedValue(observations, 'xA');
      const xAPer90 = xA !== null ? (xA * 90) / minutes : null;
      if (xAPer90 !== null) derived.set('xA_per90', xAPer90);
      
      // shots_per90
      const shots = this.getVerifiedValue(observations, 'shots');
      const shotsPer90 = shots !== null ? (shots * 90) / minutes : null;
      if (shotsPer90 !== null) derived.set('shots_per90', shotsPer90);
      
      // key_passes_per90
      const keyPasses = this.getVerifiedValue(observations, 'key_passes');
      const keyPassesPer90 = keyPasses !== null ? (keyPasses * 90) / minutes : null;
      if (keyPassesPer90 !== null) derived.set('key_passes_per90', keyPassesPer90);
    }
    
    return derived;
  }

  private getVerifiedValue(observations: Map<string, MetricObservation[]>, metricId: string): number | null {
    const obs = observations.get(metricId);
    if (!obs || obs.length === 0) return null;
    const value = obs[0].value;
    // Sadece sayısal değerleri döndür
    return typeof value === 'number' ? value : null;
  }
}
