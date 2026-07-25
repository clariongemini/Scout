/**
 * Provider Trust Engine
 * 
 * Calculates observation reliability based on:
 * - Provider reliability (base trust in the data source)
 * - Observation reliability (specific to the type of data)
 * - Freshness (how recent the data is)
 * - Independence (whether sources are truly independent)
 */

import { CanonicalObservation } from './CanonicalObservation';

export interface TrustAssessment {
  providerReliability: number;
  observationReliability: number;
  combinedReliability: number;
  reliabilityReason: string;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
}

export interface ProviderTrustProfile {
  sourceId: string;
  baseReliability: number;
  sourceType: 'official_club' | 'official_league' | 'official_federation' | 'specialized_provider' | 'community_maintained' | 'unknown';
  dataOrigin: 'primary' | 'secondary' | 'aggregated' | 'unknown';
  updateFrequency: 'realtime' | 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'unknown';
  accessMethod: 'api' | 'scraping' | 'manual' | 'unknown';
  strengths: string[];
  weaknesses: string[];
  knownIssues: string[];
}

export class ProviderTrustEngine {
  private providerProfiles: Map<string, ProviderTrustProfile>;
  private observationTypeWeights: Map<string, number>;
  
  constructor() {
    this.providerProfiles = new Map();
    this.observationTypeWeights = new Map();
    this.initializeProviderProfiles();
    this.initializeObservationWeights();
  }
  
  /**
   * Assess trust for a canonical observation
   */
  public assessTrust(observation: CanonicalObservation): TrustAssessment {
    const providerProfile = this.providerProfiles.get(observation.sourceId);
    if (!providerProfile) {
      return this.getDefaultAssessment(observation);
    }
    
    const providerReliability = providerProfile.baseReliability;
    const observationReliability = this.calculateObservationReliability(observation, providerProfile);
    
    // Combine provider and observation reliability (weighted average)
    const combinedReliability = (providerReliability * 0.6) + (observationReliability * 0.4);
    
    const confidenceLevel = this.getConfidenceLevel(combinedReliability);
    const reliabilityReason = this.generateReliabilityReason(observation, providerProfile, combinedReliability);
    
    return {
      providerReliability,
      observationReliability,
      combinedReliability,
      reliabilityReason,
      confidenceLevel
    };
  }
  
  /**
   * Calculate observation-specific reliability using multiplicative model
   * 
   Formula: observationConfidence = providerReliability × observationTypeReliability × identityConfidence × scopeConfidence × normalizationConfidence × freshnessFactor × provenanceFactor
   * 
   This prevents a single strong factor from masking other weaknesses.
   */
  private calculateObservationReliability(observation: CanonicalObservation, profile: ProviderTrustProfile): number {
    const providerReliability = profile.baseReliability;
    const observationTypeReliability = this.observationTypeWeights.get(observation.observationType) || 0.5;
    const identityConfidence = 1.0; // Will be calculated from identity resolution when available
    const scopeConfidence = this.calculateScopeConfidence(observation);
    const normalizationConfidence = this.calculateNormalizationConfidence(observation);
    const freshnessFactor = this.calculateFreshnessFactor(observation);
    const provenanceFactor = this.calculateProvenanceFactor(profile);
    
    // Multiplicative calculation
    let confidence = providerReliability * observationTypeReliability * identityConfidence * scopeConfidence * normalizationConfidence * freshnessFactor * provenanceFactor;
    
    // Clamp to [0, 1] range
    return Math.max(0, Math.min(1, confidence));
  }
  
  /**
   * Calculate scope confidence factor
   */
  private calculateScopeConfidence(observation: CanonicalObservation): number {
    switch (observation.scopeStatus) {
      case 'SCOPE_VERIFIED':
        return 1.0;
      case 'SCOPE_INFERRED':
        return Math.max(0.5, observation.scopeConfidence);
      case 'SCOPE_AMBIGUOUS':
        return 0.6;
      case 'SCOPE_INCOMPLETE':
        return 0.3;
      default:
        return 0.5;
    }
  }
  
  /**
   * Calculate normalization confidence factor
   */
  private calculateNormalizationConfidence(observation: CanonicalObservation): number {
    switch (observation.normalizationStatus) {
      case 'NORMALIZED':
        return 1.0;
      case 'PARTIALLY_NORMALIZED':
        return 0.8;
      case 'NOT_NORMALIZED':
        return 0.4;
      case 'NORMALIZATION_FAILED':
        return 0.2;
      default:
        return 0.5;
    }
  }
  
  /**
   * Calculate freshness factor
   */
  private calculateFreshnessFactor(observation: CanonicalObservation): number {
    switch (observation.freshnessStatus) {
      case 'FRESH':
        return 1.0;
      case 'STALE':
        return 0.8;
      case 'HISTORICAL':
        return 0.5;
      case 'UNKNOWN':
        return 0.7;
      default:
        return 0.7;
    }
  }
  
  /**
   * Calculate provenance factor based on provider profile
   */
  private calculateProvenanceFactor(profile: ProviderTrustProfile): number {
    let factor = 1.0;
    
    // Source type factor
    switch (profile.sourceType) {
      case 'official_club':
        factor *= 1.0;
        break;
      case 'official_league':
        factor *= 0.95;
        break;
      case 'official_federation':
        factor *= 0.90;
        break;
      case 'specialized_provider':
        factor *= 0.85;
        break;
      case 'community_maintained':
        factor *= 0.60;
        break;
      default:
        factor *= 0.70;
    }
    
    // Data origin factor
    switch (profile.dataOrigin) {
      case 'primary':
        factor *= 1.0;
        break;
      case 'secondary':
        factor *= 0.90;
        break;
      case 'aggregated':
        factor *= 0.80;
        break;
      default:
        factor *= 0.70;
    }
    
    // Access method factor
    switch (profile.accessMethod) {
      case 'api':
        factor *= 1.0;
        break;
      case 'scraping':
        factor *= 0.90;
        break;
      case 'manual':
        factor *= 0.80;
        break;
      default:
        factor *= 0.70;
    }
    
    return Math.max(0.5, Math.min(1.0, factor));
  }
  
  /**
   * Get confidence level from combined reliability
   */
  private getConfidenceLevel(reliability: number): TrustAssessment['confidenceLevel'] {
    if (reliability >= 0.85) return 'HIGH';
    if (reliability >= 0.65) return 'MEDIUM';
    if (reliability >= 0.45) return 'LOW';
    return 'UNKNOWN';
  }
  
  /**
   * Generate reliability reason string
   */
  private generateReliabilityReason(
    observation: CanonicalObservation,
    profile: ProviderTrustProfile,
    combinedReliability: number
  ): string {
    const reasons: string[] = [];
    
    reasons.push(`Provider: ${profile.sourceType} (${profile.dataOrigin})`);
    reasons.push(`Access: ${profile.accessMethod}`);
    reasons.push(`Update: ${profile.updateFrequency}`);
    
    if (observation.scopeStatus === 'SCOPE_INCOMPLETE') {
      reasons.push('Scope incomplete (-15%)');
    }
    
    if (observation.normalizationStatus !== 'NORMALIZED') {
      reasons.push(`Normalization: ${observation.normalizationStatus}`);
    }
    
    if (observation.validationStatus !== 'VALID') {
      reasons.push(`Validation: ${observation.validationStatus}`);
    }
    
    if (observation.freshnessStatus !== 'FRESH') {
      reasons.push(`Freshness: ${observation.freshnessStatus}`);
    }
    
    return reasons.join(', ');
  }
  
  /**
   * Get default assessment for unknown provider
   */
  private getDefaultAssessment(observation: CanonicalObservation): TrustAssessment {
    return {
      providerReliability: 0.5,
      observationReliability: 0.5,
      combinedReliability: 0.5,
      reliabilityReason: 'Unknown provider - default reliability',
      confidenceLevel: 'LOW'
    };
  }
  
  /**
   * Initialize provider trust profiles
   */
  private initializeProviderProfiles(): void {
    const profiles: ProviderTrustProfile[] = [
      {
        sourceId: 'transfermarkt',
        baseReliability: 0.92,
        sourceType: 'specialized_provider',
        dataOrigin: 'primary',
        updateFrequency: 'daily',
        accessMethod: 'scraping',
        strengths: ['Comprehensive player profiles', 'Market value data', 'Contract information'],
        weaknesses: ['Scraping-based access', 'Rate limiting'],
        knownIssues: ['Season stats may be delayed', 'Some leagues have incomplete data']
      },
      {
        sourceId: 'understat',
        baseReliability: 0.88,
        sourceType: 'specialized_provider',
        dataOrigin: 'primary',
        updateFrequency: 'daily',
        accessMethod: 'api',
        strengths: ['Advanced metrics (xG, xA)', 'Shot data', 'Expected goals'],
        weaknesses: ['Limited to top 5 leagues', 'No market value data'],
        knownIssues: ['Some player IDs may be missing', 'Historical data gaps']
      },
      {
        sourceId: 'fbref',
        baseReliability: 0.90,
        sourceType: 'specialized_provider',
        dataOrigin: 'primary',
        updateFrequency: 'daily',
        accessMethod: 'scraping',
        strengths: ['Comprehensive statistics', 'Historical data', 'Advanced metrics'],
        weaknesses: ['Scraping-based access', 'Complex page structure'],
        knownIssues: ['Some player search issues', 'Rate limiting']
      },
      {
        sourceId: 'fotmob',
        baseReliability: 0.85,
        sourceType: 'specialized_provider',
        dataOrigin: 'primary',
        updateFrequency: 'realtime',
        accessMethod: 'api',
        strengths: ['Real-time data', 'Live match data', 'Player ratings'],
        weaknesses: ['Limited historical data', 'API access restrictions'],
        knownIssues: ['Player ID mapping issues', 'Coverage gaps']
      },
      {
        sourceId: 'statbunker',
        baseReliability: 0.75,
        sourceType: 'specialized_provider',
        dataOrigin: 'secondary',
        updateFrequency: 'weekly',
        accessMethod: 'scraping',
        strengths: ['Historical data', 'Comprehensive archives'],
        weaknesses: ['Slow update frequency', 'Limited advanced metrics'],
        knownIssues: ['Data quality varies by league', 'Some missing seasons']
      },
      {
        sourceId: 'soccerway',
        baseReliability: 0.82,
        sourceType: 'specialized_provider',
        dataOrigin: 'primary',
        updateFrequency: 'daily',
        accessMethod: 'scraping',
        strengths: ['Comprehensive player database', 'Transfer history', 'Career statistics'],
        weaknesses: ['Scraping-based access', 'Rate limiting'],
        knownIssues: ['Some player search issues', 'Data inconsistencies']
      },
      {
        sourceId: 'sofascore',
        baseReliability: 0.80,
        sourceType: 'specialized_provider',
        dataOrigin: 'primary',
        updateFrequency: 'realtime',
        accessMethod: 'api',
        strengths: ['Real-time data', 'Player ratings', 'Match statistics'],
        weaknesses: ['API access restrictions', 'Limited historical data'],
        knownIssues: ['Rate limiting', 'Coverage gaps']
      }
    ];
    
    for (const profile of profiles) {
      this.providerProfiles.set(profile.sourceId, profile);
    }
  }
  
  /**
   * Initialize observation type weights
   */
  private initializeObservationWeights(): void {
    // Higher weight = more reliable observation type
    const weights: Record<string, number> = {
      'identity': 0.95,
      'physical': 0.90,
      'club': 0.85,
      'contract': 0.88,
      'market_value': 0.82,
      'position': 0.85,
      'season_appearances': 0.90,
      'goals': 0.92,
      'assists': 0.92,
      'cards': 0.88,
      'national_team': 0.85,
      'injury': 0.75,
      'transfer': 0.80,
      'advanced_stats': 0.88
    };
    
    for (const [type, weight] of Object.entries(weights)) {
      this.observationTypeWeights.set(type, weight);
    }
  }
  
  /**
   * Get provider profile
   */
  public getProviderProfile(sourceId: string): ProviderTrustProfile | undefined {
    return this.providerProfiles.get(sourceId);
  }
  
  /**
   * Get all provider profiles
   */
  public getAllProviderProfiles(): ProviderTrustProfile[] {
    return Array.from(this.providerProfiles.values());
  }
}
