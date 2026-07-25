/**
 * Adapter Observation Contract
 * 
 * Standard contract for all provider adapters to output raw observations.
 * Adapters must NOT output metrics or verified data directly.
 * All adapter output must go through the Observation Layer before becoming metrics.
 */

export interface AdapterObservation {
  // Identification
  sourceId: string;
  sourcePlayerId?: string;
  observationType: string;
  
  // Raw Data
  rawValue: unknown;
  rawUnit?: string;
  rawLabel?: string;
  
  // Scope Information
  rawScope?: {
    season?: string;
    competition?: string;
    competitionType?: 'league' | 'cup' | 'continental' | 'national_team' | 'all_competitions' | 'unknown';
    team?: string;
    teamId?: string;
  };
  
  // Provenance
  sourceUrl: string;
  snapshotId: string;
  retrievedAt: string;
  parserVersion: string;
  
  // Optional metadata
  metadata?: {
    jsonPath?: string;
    extractionMethod?: 'api' | 'scraping' | 'manual';
    pageType?: string;
    pageLastUpdatedAt?: string;
  };
}

/**
 * Adapter Execution Status
 * 
 * Detailed status tracking for adapter execution.
 * HTTP 200 is NOT sufficient for success.
 */
export interface AdapterExecutionStatus {
  adapterExecutionStatus: 'COMPLETED' | 'FAILED' | 'TIMEOUT' | 'BLOCKED';
  accessStatus: 'ACCESSIBLE' | 'BLOCKED' | 'CHALLENGE_PAGE' | 'RATE_LIMITED' | 'NOT_FOUND';
  payloadStatus: 'PAYLOAD_EXTRACTED' | 'NEXT_DATA_MISSING' | 'PLAYER_PAYLOAD_MISSING' | 'SCHEMA_MISMATCH' | 'PARTIAL_PAYLOAD';
  dataStatus: 'DATA_EXTRACTED' | 'NO_DATA' | 'INCOMPLETE_DATA';
  observationCount: number;
  executionTimeMs: number;
  errors: AdapterError[];
}

export interface AdapterError {
  code: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
  stage: 'FETCH' | 'EXTRACT' | 'PARSE' | 'MAP';
  details?: Record<string, unknown>;
}

/**
 * Adapter Manifest
 * 
 * Metadata about adapter capabilities and status.
 */
export interface AdapterManifest {
  providerId: string;
  adapterStatus: 'PRODUCTION' | 'MIGRATED' | 'LEGACY' | 'DISABLED' | 'UNSUPPORTED' | 'EXPERIMENTAL';
  productionEnabled: boolean;
  accessPolicy: 'PUBLIC' | 'PERMISSION_REQUIRED' | 'LICENSE_REQUIRED' | 'RESTRICTED';
  extractionStrategies: string[];
  allowedDomains: string[];
  forbiddenAuthorityDomains: string[];
  supportedObservationTypes: string[];
  lastUpdated: string;
  version: string;
}

/**
 * Provider Trust Profile (Manifest Level)
 * 
 * High-level trust information for the provider.
 */
export interface ProviderTrustProfile {
  providerId: string;
  role: string[];
  authorityByDomain: Record<string, string>;
  accessPolicy: string;
  productionEnabled: boolean;
  baseReliability: number;
  sourceType: 'official_club' | 'official_league' | 'official_federation' | 'specialized_provider' | 'community_maintained' | 'unknown';
  dataOrigin: 'primary' | 'secondary' | 'aggregated' | 'unknown';
  updateFrequency: 'realtime' | 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'unknown';
  accessMethod: 'api' | 'scraping' | 'manual' | 'unknown';
}

/**
 * Dependency Record (Evidence-Aware)
 * 
 * Tracks upstream data dependencies between providers.
 */
export interface DependencyRecord {
  providerId: string;
  upstreamGroup: string;
  status: 'CONFIRMED_DEPENDENCY' | 'LIKELY_DEPENDENCY' | 'UNKNOWN_DEPENDENCY' | 'INDEPENDENT';
  evidence: string[];
  verifiedAt: string | null;
  policyVersion: string;
}

/**
 * Factory for creating Adapter Observations
 */
export class AdapterObservationFactory {
  /**
   * Create an Adapter Observation from raw data
   */
  static create(data: {
    sourceId: string;
    sourcePlayerId?: string;
    observationType: string;
    rawValue: unknown;
    rawUnit?: string;
    rawLabel?: string;
    rawScope?: {
      season?: string;
      competition?: string;
      competitionType?: 'league' | 'cup' | 'continental' | 'national_team' | 'all_competitions' | 'unknown';
      team?: string;
      teamId?: string;
    };
    sourceUrl: string;
    snapshotId: string;
    parserVersion: string;
    metadata?: {
      jsonPath?: string;
      extractionMethod?: 'api' | 'scraping' | 'manual';
      pageType?: string;
      pageLastUpdatedAt?: string;
    };
  }): AdapterObservation {
    return {
      sourceId: data.sourceId,
      sourcePlayerId: data.sourcePlayerId,
      observationType: data.observationType,
      rawValue: data.rawValue,
      rawUnit: data.rawUnit,
      rawLabel: data.rawLabel,
      rawScope: data.rawScope,
      sourceUrl: data.sourceUrl,
      snapshotId: data.snapshotId,
      retrievedAt: new Date().toISOString(),
      parserVersion: data.parserVersion,
      metadata: data.metadata
    };
  }
  
  /**
   * Validate an Adapter Observation
   */
  static validate(observation: AdapterObservation): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!observation.sourceId) {
      errors.push('sourceId is required');
    }
    
    if (!observation.observationType) {
      errors.push('observationType is required');
    }
    
    if (observation.rawValue === undefined || observation.rawValue === null) {
      errors.push('rawValue is required');
    }
    
    if (!observation.sourceUrl) {
      errors.push('sourceUrl is required');
    }
    
    if (!observation.snapshotId) {
      errors.push('snapshotId is required');
    }
    
    if (!observation.parserVersion) {
      errors.push('parserVersion is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
