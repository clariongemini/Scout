/**
 * Observation Layer Orchestrator
 * 
 * Main entry point for the Observation Layer.
 * Orchestrates the complete observation processing pipeline:
 * 1. Create Canonical Observations from raw adapter data
 * 2. Normalize observations (units, dates, names, positions, competitions)
 * 3. Validate observations (data types, ranges, business rules)
 * 4. Resolve competition context
 * 5. Assess provider trust and observation reliability
 * 6. Calculate freshness scores
 * 7. Assess source independence
 * 8. Produce fully-processed Canonical Observations ready for metric extraction
 */

import { CanonicalObservation, CanonicalObservationFactory, ObservationType } from './CanonicalObservation';
import { ObservationRegistry } from './ObservationRegistry';
import { NormalizationEngine } from './NormalizationEngine';
import { ProviderTrustEngine, TrustAssessment } from './ProviderTrustEngine';
import { CompetitionResolutionEngine, ResolutionContext, CompetitionResolution } from './CompetitionResolutionEngine';
import { FreshnessEngine, FreshnessAssessment } from './FreshnessEngine';
import { IndependenceEngine, IndependenceAssessment } from './IndependenceEngine';
import { ObservationValidationEngine, ValidationResult } from './ObservationValidationEngine';

export interface ObservationProcessingResult {
  observations: CanonicalObservation[];
  processingStats: {
    totalObservations: number;
    normalizedCount: number;
    validatedCount: number;
    competitionResolvedCount: number;
    averageFreshnessScore: number;
    averageReliability: number;
    independentSourceCount: number;
  };
  processingErrors: ProcessingError[];
}

export interface ProcessingError {
  observationId: string;
  stage: 'creation' | 'normalization' | 'validation' | 'competition_resolution' | 'trust_assessment' | 'freshness';
  error: string;
  severity: 'ERROR' | 'WARNING';
}

export interface RawAdapterData {
  metricId: string;
  rawValue: string | number | null;
  rawUnit: string;
  sourceId: string;
  sourcePlayerId: string;
  rawSnapshotId: string;
  pageUrl?: string;
  scope?: {
    season?: string;
    competition?: string;
    competitionType?: 'league' | 'cup' | 'continental' | 'national_team' | 'all_competitions' | 'unknown';
    team?: string;
    teamId?: string;
  };
  observationType?: ObservationType | string;
}

export class ObservationLayerOrchestrator {
  private registry: ObservationRegistry;
  private normalizationEngine: NormalizationEngine;
  private trustEngine: ProviderTrustEngine;
  private competitionResolver: CompetitionResolutionEngine;
  private freshnessEngine: FreshnessEngine;
  private independenceEngine: IndependenceEngine;
  private validationEngine: ObservationValidationEngine;
  
  constructor() {
    this.registry = new ObservationRegistry();
    this.normalizationEngine = new NormalizationEngine();
    this.trustEngine = new ProviderTrustEngine();
    this.competitionResolver = new CompetitionResolutionEngine();
    this.freshnessEngine = new FreshnessEngine();
    this.independenceEngine = new IndependenceEngine();
    this.validationEngine = new ObservationValidationEngine();
  }
  
  /**
   * Process raw adapter data through the complete observation layer
   */
  public async processObservations(
    rawDataArray: RawAdapterData[],
    context?: {
      pageUrl?: string;
      pageTitle?: string;
      season?: string;
    }
  ): Promise<ObservationProcessingResult> {
    const observations: CanonicalObservation[] = [];
    const processingErrors: ProcessingError[] = [];
    
    // Stage 1: Create Canonical Observations
    for (const rawData of rawDataArray) {
      try {
        const observation = CanonicalObservationFactory.createFromRaw(rawData);
        observations.push(observation);
      } catch (error) {
        processingErrors.push({
          observationId: `raw-${rawData.metricId}-${rawData.sourceId}`,
          stage: 'creation',
          error: error instanceof Error ? error.message : 'Unknown error',
          severity: 'ERROR'
        });
      }
    }
    
    // Stage 2: Normalize observations
    for (const observation of observations) {
      try {
        const normalized = this.normalizationEngine.normalizeObservation(observation);
        Object.assign(observation, normalized);
      } catch (error) {
        processingErrors.push({
          observationId: observation.observationId,
          stage: 'normalization',
          error: error instanceof Error ? error.message : 'Unknown error',
          severity: 'WARNING'
        });
      }
    }
    
    // Stage 3: Validate observations
    for (const observation of observations) {
      try {
        const validationResult = this.validationEngine.validateObservation(observation);
        observation.validationStatus = validationResult.validationStatus;
        observation.validationErrors = validationResult.errors;
        observation.validationWarnings = validationResult.warnings;
      } catch (error) {
        processingErrors.push({
          observationId: observation.observationId,
          stage: 'validation',
          error: error instanceof Error ? error.message : 'Unknown error',
          severity: 'WARNING'
        });
      }
    }
    
    // Stage 4: Resolve competition context
    for (const observation of observations) {
      try {
        const resolutionContext: ResolutionContext = {
          pageUrl: context?.pageUrl || observation.pageUrl,
          pageTitle: context?.pageTitle,
          season: context?.season || observation.scope.season,
          team: observation.scope.team,
          league: observation.scope.competition
        };
        
        const resolution = this.competitionResolver.resolveCompetition(resolutionContext);
        
        if (resolution.confidence > 0.5) {
          observation.scope = this.competitionResolver.applyResolution(observation.scope, resolution);
          observation.scopeStatus = this.updateScopeStatus(resolution.confidence);
          observation.scopeConfidence = resolution.confidence;
        }
      } catch (error) {
        processingErrors.push({
          observationId: observation.observationId,
          stage: 'competition_resolution',
          error: error instanceof Error ? error.message : 'Unknown error',
          severity: 'WARNING'
        });
      }
    }
    
    // Stage 5: Assess provider trust
    for (const observation of observations) {
      try {
        const trustAssessment = this.trustEngine.assessTrust(observation);
        observation.providerReliability = trustAssessment.providerReliability;
        observation.observationReliability = trustAssessment.observationReliability;
        observation.reliabilityReason = trustAssessment.reliabilityReason;
      } catch (error) {
        processingErrors.push({
          observationId: observation.observationId,
          stage: 'trust_assessment',
          error: error instanceof Error ? error.message : 'Unknown error',
          severity: 'WARNING'
        });
      }
    }
    
    // Stage 6: Calculate freshness
    for (const observation of observations) {
      try {
        const freshnessAssessment = this.freshnessEngine.assessFreshness(observation);
        observation.freshnessScore = freshnessAssessment.freshnessScore;
        observation.freshnessStatus = freshnessAssessment.freshnessStatus;
      } catch (error) {
        processingErrors.push({
          observationId: observation.observationId,
          stage: 'freshness',
          error: error instanceof Error ? error.message : 'Unknown error',
          severity: 'WARNING'
        });
      }
    }
    
    // Stage 7: Assess source independence (batch operation)
    try {
      const independenceAssessment = this.independenceEngine.assessIndependence(observations);
      for (const observation of observations) {
        observation.independentSourceCount = independenceAssessment.independentSourceCount;
        if (independenceAssessment.dependencyGroups.length > 0) {
          const dependency = independenceAssessment.dependencyGroups.find(g => 
            g.sources.includes(observation.sourceId)
          );
          if (dependency) {
            observation.upstreamDependency = dependency.upstreamSource;
          }
        }
      }
    } catch (error) {
      processingErrors.push({
        observationId: 'batch',
        stage: 'freshness',
        error: error instanceof Error ? error.message : 'Unknown error',
        severity: 'WARNING'
      });
    }
    
    // Calculate processing statistics
    const processingStats = this.calculateProcessingStats(observations);
    
    return {
      observations,
      processingStats,
      processingErrors
    };
  }
  
  /**
   * Calculate processing statistics
   */
  private calculateProcessingStats(observations: CanonicalObservation[]): ObservationProcessingResult['processingStats'] {
    const totalObservations = observations.length;
    const normalizedCount = observations.filter(o => 
      o.normalizationStatus === 'NORMALIZED' || o.normalizationStatus === 'PARTIALLY_NORMALIZED'
    ).length;
    const validatedCount = observations.filter(o => o.validationStatus === 'VALID').length;
    const competitionResolvedCount = observations.filter(o => 
      o.scopeStatus === 'SCOPE_VERIFIED' || o.scopeStatus === 'SCOPE_INFERRED'
    ).length;
    
    const averageFreshnessScore = observations.length > 0
      ? observations.reduce((sum, o) => sum + o.freshnessScore, 0) / observations.length
      : 0;
    
    const averageReliability = observations.length > 0
      ? observations.reduce((sum, o) => sum + o.observationReliability, 0) / observations.length
      : 0;
    
    const independentSourceCount = observations.length > 0
      ? Math.max(...observations.map(o => o.independentSourceCount))
      : 0;
    
    return {
      totalObservations,
      normalizedCount,
      validatedCount,
      competitionResolvedCount,
      averageFreshnessScore,
      averageReliability,
      independentSourceCount
    };
  }
  
  /**
   * Update scope status based on resolution confidence
   */
  private updateScopeStatus(confidence: number): CanonicalObservation['scopeStatus'] {
    if (confidence >= 0.8) return 'SCOPE_VERIFIED';
    if (confidence >= 0.5) return 'SCOPE_INFERRED';
    return 'SCOPE_INCOMPLETE';
  }
  
  /**
   * Get observation registry
   */
  public getRegistry(): ObservationRegistry {
    return this.registry;
  }
  
  /**
   * Get normalization engine
   */
  public getNormalizationEngine(): NormalizationEngine {
    return this.normalizationEngine;
  }
  
  /**
   * Get trust engine
   */
  public getTrustEngine(): ProviderTrustEngine {
    return this.trustEngine;
  }
  
  /**
   * Get competition resolver
   */
  public getCompetitionResolver(): CompetitionResolutionEngine {
    return this.competitionResolver;
  }
  
  /**
   * Get freshness engine
   */
  public getFreshnessEngine(): FreshnessEngine {
    return this.freshnessEngine;
  }
  
  /**
   * Get independence engine
   */
  public getIndependenceEngine(): IndependenceEngine {
    return this.independenceEngine;
  }
  
  /**
   * Get validation engine
   */
  public getValidationEngine(): ObservationValidationEngine {
    return this.validationEngine;
  }
}
