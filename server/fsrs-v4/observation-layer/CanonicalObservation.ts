/**
 * Canonical Observation Model
 * 
 * This represents a normalized observation from a raw data source before it becomes a metric.
 * All raw data from adapters should be converted to Canonical Observations first.
 * This enables proper normalization, validation, and governance at the observation level.
 */

export interface CanonicalObservation {
  // Identification
  observationId: string;
  observationType: ObservationType;
  metricId: string;
  
  // Raw Source Information
  sourceId: string;
  sourcePlayerId: string;
  rawSnapshotId: string;
  pageUrl?: string;
  retrievedAt: string;
  parserVersion: string;
  
  // Raw Values (as extracted from source)
  rawValue: string | number | null;
  rawUnit: string;
  rawFormat: string;
  
  // Normalized Values (after normalization engine)
  normalizedValue: number | string | null;
  normalizedUnit: string;
  normalizationStatus: 'NORMALIZED' | 'PARTIALLY_NORMALIZED' | 'NOT_NORMALIZED' | 'NORMALIZATION_FAILED';
  normalizationReason?: string;
  
  // Scope Information
  scope: ObservationScope;
  scopeStatus: 'SCOPE_VERIFIED' | 'SCOPE_INFERRED' | 'SCOPE_INCOMPLETE' | 'SCOPE_AMBIGUOUS';
  scopeConfidence: number;
  
  // Validation
  validationStatus: 'VALID' | 'INVALID' | 'SUSPICIOUS' | 'UNKNOWN';
  validationErrors: ValidationError[];
  validationWarnings: ValidationWarning[];
  
  // Trust and Reliability
  providerReliability: number;
  observationReliability: number;
  reliabilityReason: string;
  
  // Freshness
  freshnessScore: number;
  freshnessStatus: 'FRESH' | 'STALE' | 'HISTORICAL' | 'UNKNOWN';
  dataTimestamp?: string;
  
  // Independence
  independentSourceCount: number;
  upstreamDependency?: string;
  
  // Provenance
  provenance: ObservationProvenance;
}

export type ObservationType = 
  | 'identity'
  | 'physical'
  | 'club'
  | 'contract'
  | 'market_value'
  | 'position'
  | 'season_appearances'
  | 'goals'
  | 'assists'
  | 'cards'
  | 'national_team'
  | 'injury'
  | 'transfer'
  | 'advanced_stats';

export interface ObservationScope {
  season: string;
  competition: string;
  competitionId?: string;
  competitionType: 'league' | 'cup' | 'continental' | 'national_team' | 'all_competitions' | 'unknown';
  team: string;
  teamId?: string;
  clubOrNationalTeam: 'club' | 'national_team' | 'unknown';
  allCompetitionsFlag: boolean;
  scopeKey: string;
}

export interface ValidationError {
  code: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
  field?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
}

export interface ObservationProvenance {
  sourceType: 'official_club' | 'official_league' | 'official_federation' | 'specialized_provider' | 'community_maintained' | 'unknown';
  dataOrigin: 'primary' | 'secondary' | 'aggregated' | 'unknown';
  updateFrequency: 'realtime' | 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'unknown';
  accessMethod: 'api' | 'scraping' | 'manual' | 'unknown';
  lastVerifiedAt?: string;
}

/**
 * Factory for creating Canonical Observations
 */
export class CanonicalObservationFactory {
  /**
   * Create a Canonical Observation from raw adapter data
   */
  static createFromRaw(data: {
    metricId: string;
    rawValue: string | number | null;
    rawUnit: string;
    sourceId: string;
    sourcePlayerId: string;
    rawSnapshotId: string;
    pageUrl?: string;
    scope?: Partial<ObservationScope>;
    observationType?: ObservationType | string;
  }): CanonicalObservation {
    const observationId = this.generateObservationId(data.sourceId, data.metricId);
    
    return {
      observationId,
      observationType: this.normalizeObservationType(data.observationType || this.inferObservationType(data.metricId)),
      metricId: data.metricId,
      sourceId: data.sourceId,
      sourcePlayerId: data.sourcePlayerId,
      rawSnapshotId: data.rawSnapshotId,
      pageUrl: data.pageUrl,
      retrievedAt: new Date().toISOString(),
      parserVersion: '1.0.0',
      rawValue: data.rawValue,
      rawUnit: data.rawUnit,
      rawFormat: this.detectRawFormat(data.rawValue),
      normalizedValue: data.rawValue, // Will be updated by Normalization Engine
      normalizedUnit: data.rawUnit, // Will be updated by Normalization Engine
      normalizationStatus: 'NOT_NORMALIZED',
      scope: this.buildScope(data.scope),
      scopeStatus: this.assessScopeStatus(data.scope),
      scopeConfidence: this.calculateScopeConfidence(data.scope),
      validationStatus: 'UNKNOWN',
      validationErrors: [],
      validationWarnings: [],
      providerReliability: this.getProviderReliability(data.sourceId),
      observationReliability: 0.5, // Will be calculated by Provider Trust Engine
      reliabilityReason: 'Pending trust engine evaluation',
      freshnessScore: 0.5, // Will be calculated by Freshness Engine
      freshnessStatus: 'UNKNOWN',
      independentSourceCount: 1, // Will be calculated by Independence Engine
      provenance: this.buildProvenance(data.sourceId)
    };
  }

  private static generateObservationId(sourceId: string, metricId: string): string {
    return `obs-${sourceId}-${metricId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private static normalizeObservationType(observationType: ObservationType | string): ObservationType {
    if (typeof observationType === 'string') {
      const validTypes: ObservationType[] = [
        'identity', 'physical', 'club', 'contract', 'market_value', 'position',
        'season_appearances', 'goals', 'assists', 'cards', 'national_team',
        'injury', 'transfer', 'advanced_stats'
      ];
      if (validTypes.includes(observationType as ObservationType)) {
        return observationType as ObservationType;
      }
      return 'advanced_stats'; // Default fallback
    }
    return observationType;
  }

  private static inferObservationType(metricId: string): ObservationType {
    const typeMap: Record<string, ObservationType> = {
      'fullName': 'identity',
      'dateOfBirth': 'identity',
      'age': 'identity',
      'nationality': 'identity',
      'height_cm': 'physical',
      'preferredFoot': 'physical',
      'currentClub': 'club',
      'league': 'club',
      'primaryPosition': 'position',
      'matches': 'season_appearances',
      'minutes': 'season_appearances',
      'goals': 'goals',
      'assists': 'assists',
      'yellowCards': 'cards',
      'redCards': 'cards',
      'nationalTeamCaps': 'national_team',
      'marketValue': 'market_value',
      'contractStart': 'contract',
      'contractExpiry': 'contract'
    };
    
    return typeMap[metricId] || 'advanced_stats';
  }

  private static detectRawFormat(rawValue: string | number | null): string {
    if (rawValue === null) return 'null';
    if (typeof rawValue === 'number') return 'numeric';
    if (typeof rawValue === 'string') {
      if (/^\d{1,2} [A-Za-z]{3} \d{4}$/.test(rawValue)) return 'date_tr';
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) return 'date_iso';
      if (/^\d+,\d+ m$/.test(rawValue)) return 'height_tr';
      if (/^\d+\.?\d*$/.test(rawValue)) return 'numeric_string';
      if (rawValue.includes('€') || rawValue.includes('$') || rawValue.includes('£')) return 'currency';
    }
    return 'string';
  }

  private static buildScope(scope?: Partial<ObservationScope>): ObservationScope {
    return {
      season: scope?.season || '2024-25',
      competition: scope?.competition || 'unknown',
      competitionId: scope?.competitionId,
      competitionType: scope?.competitionType || 'unknown',
      team: scope?.team || 'unknown',
      teamId: scope?.teamId,
      clubOrNationalTeam: scope?.clubOrNationalTeam || 'unknown',
      allCompetitionsFlag: scope?.allCompetitionsFlag || false,
      scopeKey: this.buildScopeKey(scope)
    };
  }

  private static buildScopeKey(scope?: Partial<ObservationScope>): string {
    const season = scope?.season || '2024-25';
    const competition = scope?.competition || 'unknown';
    const team = scope?.team || 'unknown';
    return `${season}-${competition}-${team}`;
  }

  private static assessScopeStatus(scope?: Partial<ObservationScope>): CanonicalObservation['scopeStatus'] {
    if (!scope || scope.competition === 'unknown' || scope.competition === undefined) {
      return 'SCOPE_INCOMPLETE';
    }
    if (scope.competitionType === 'unknown' || scope.competitionType === undefined) {
      return 'SCOPE_AMBIGUOUS';
    }
    return 'SCOPE_VERIFIED';
  }

  private static calculateScopeConfidence(scope?: Partial<ObservationScope>): number {
    if (!scope) return 0;
    let confidence = 0;
    
    if (scope.competition && scope.competition !== 'unknown') confidence += 0.4;
    if (scope.competitionType && scope.competitionType !== 'unknown') confidence += 0.3;
    if (scope.team && scope.team !== 'unknown') confidence += 0.2;
    if (scope.competitionId) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private static getProviderReliability(sourceId: string): number {
    // Base provider reliability scores (will be enhanced by Provider Trust Engine)
    const reliabilityScores: Record<string, number> = {
      'transfermarkt': 0.92,
      'understat': 0.88,
      'fbref': 0.90,
      'fotmob': 0.85,
      'statbunker': 0.75,
      'soccerway': 0.82,
      'sofascore': 0.80
    };
    
    return reliabilityScores[sourceId] || 0.5;
  }

  private static buildProvenance(sourceId: string): ObservationProvenance {
    const provenanceMap: Record<string, ObservationProvenance> = {
      'transfermarkt': {
        sourceType: 'specialized_provider',
        dataOrigin: 'primary',
        updateFrequency: 'daily',
        accessMethod: 'scraping'
      },
      'understat': {
        sourceType: 'specialized_provider',
        dataOrigin: 'primary',
        updateFrequency: 'daily',
        accessMethod: 'api'
      },
      'fbref': {
        sourceType: 'specialized_provider',
        dataOrigin: 'primary',
        updateFrequency: 'daily',
        accessMethod: 'scraping'
      }
    };
    
    return provenanceMap[sourceId] || {
      sourceType: 'unknown',
      dataOrigin: 'unknown',
      updateFrequency: 'unknown',
      accessMethod: 'unknown'
    };
  }
}
