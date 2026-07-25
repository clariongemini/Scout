/**
 * Freshness Engine
 * 
 * Calculates freshness scores for time-sensitive metrics.
 * Freshness indicates how recent the data is relative to the current date.
 * Time-sensitive metrics like market value, contract expiry, and season statistics
 * should have higher freshness scores than historical data like transfer history.
 */

import { CanonicalObservation, ObservationType } from './CanonicalObservation';

export interface FreshnessAssessment {
  freshnessScore: number;
  freshnessStatus: 'FRESH' | 'STALE' | 'HISTORICAL' | 'UNKNOWN';
  dataAgeDays: number;
  maxAcceptableAgeDays: number;
  reason: string;
}

export interface FreshnessRule {
  observationType: ObservationType;
  metricId?: string;
  maxAgeDays: number;
  criticalAgeDays: number;
  decayRate: 'linear' | 'exponential' | 'step';
}

export class FreshnessEngine {
  private freshnessRules: Map<string, FreshnessRule>;
  private currentDate: Date;
  
  constructor(currentDate?: Date) {
    this.freshnessRules = new Map();
    this.currentDate = currentDate || new Date();
    this.initializeFreshnessRules();
  }
  
  /**
   * Assess freshness for a canonical observation
   */
  public assessFreshness(observation: CanonicalObservation): FreshnessAssessment {
    const rule = this.getFreshnessRule(observation.observationType, observation.metricId);
    
    if (!rule) {
      return {
        freshnessScore: 0.5,
        freshnessStatus: 'UNKNOWN',
        dataAgeDays: 0,
        maxAcceptableAgeDays: 365,
        reason: 'No freshness rule defined for this observation type'
      };
    }
    
    const dataTimestamp = observation.dataTimestamp || observation.retrievedAt;
    const dataAgeDays = this.calculateDataAge(dataTimestamp);
    
    const freshnessScore = this.calculateFreshnessScore(dataAgeDays, rule);
    const freshnessStatus = this.determineFreshnessStatus(freshnessScore, dataAgeDays, rule);
    const reason = this.generateFreshnessReason(dataAgeDays, rule, freshnessStatus);
    
    return {
      freshnessScore,
      freshnessStatus,
      dataAgeDays,
      maxAcceptableAgeDays: rule.maxAgeDays,
      reason
    };
  }
  
  /**
   * Calculate data age in days
   */
  private calculateDataAge(timestamp: string): number {
    const dataDate = new Date(timestamp);
    const diffTime = this.currentDate.getTime() - dataDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }
  
  /**
   * Calculate freshness score based on data age and rule
   */
  private calculateFreshnessScore(dataAgeDays: number, rule: FreshnessRule): number {
    if (dataAgeDays <= rule.criticalAgeDays) {
      return 1.0;
    }
    
    if (dataAgeDays >= rule.maxAgeDays) {
      return 0.0;
    }
    
    const ageRange = rule.maxAgeDays - rule.criticalAgeDays;
    const ageInRange = dataAgeDays - rule.criticalAgeDays;
    
    switch (rule.decayRate) {
      case 'linear':
        return 1.0 - (ageInRange / ageRange);
      
      case 'exponential':
        return Math.exp(-3 * (ageInRange / ageRange));
      
      case 'step':
        if (ageInRange < ageRange * 0.33) return 0.75;
        if (ageInRange < ageRange * 0.66) return 0.5;
        return 0.25;
      
      default:
        return 1.0 - (ageInRange / ageRange);
    }
  }
  
  /**
   * Determine freshness status
   */
  private determineFreshnessStatus(
    freshnessScore: number,
    dataAgeDays: number,
    rule: FreshnessRule
  ): FreshnessAssessment['freshnessStatus'] {
    if (dataAgeDays <= rule.criticalAgeDays) {
      return 'FRESH';
    }
    
    if (freshnessScore >= 0.7) {
      return 'FRESH';
    }
    
    if (freshnessScore >= 0.3) {
      return 'STALE';
    }
    
    return 'HISTORICAL';
  }
  
  /**
   * Generate freshness reason
   */
  private generateFreshnessReason(
    dataAgeDays: number,
    rule: FreshnessRule,
    status: FreshnessAssessment['freshnessStatus']
  ): string {
    if (status === 'FRESH') {
      return `Data is ${dataAgeDays} days old (within ${rule.criticalAgeDays} day critical threshold)`;
    }
    
    if (status === 'STALE') {
      return `Data is ${dataAgeDays} days old (exceeds ${rule.criticalAgeDays} day threshold but within ${rule.maxAgeDays} day limit)`;
    }
    
    return `Data is ${dataAgeDays} days old (exceeds ${rule.maxAgeDays} day acceptable limit)`;
  }
  
  /**
   * Get freshness rule for observation type and metric
   */
  private getFreshnessRule(observationType: ObservationType, metricId?: string): FreshnessRule | undefined {
    // Try metric-specific rule first
    if (metricId) {
      const metricKey = `${observationType}:${metricId}`;
      const metricRule = this.freshnessRules.get(metricKey);
      if (metricRule) return metricRule;
    }
    
    // Try observation type rule
    const typeRule = this.freshnessRules.get(observationType);
    if (typeRule) return typeRule;
    
    return undefined;
  }
  
  /**
   * Initialize freshness rules
   */
  private initializeFreshnessRules(): void {
    const rules: FreshnessRule[] = [
      // Identity - generally stable, not time-sensitive
      {
        observationType: 'identity',
        maxAgeDays: 365,
        criticalAgeDays: 180,
        decayRate: 'linear'
      },
      
      // Physical - generally stable
      {
        observationType: 'physical',
        maxAgeDays: 365,
        criticalAgeDays: 180,
        decayRate: 'linear'
      },
      
      // Club - moderately time-sensitive
      {
        observationType: 'club',
        maxAgeDays: 30,
        criticalAgeDays: 7,
        decayRate: 'linear'
      },
      
      // Contract - time-sensitive
      {
        observationType: 'contract',
        maxAgeDays: 30,
        criticalAgeDays: 7,
        decayRate: 'linear'
      },
      
      // Market Value - highly time-sensitive
      {
        observationType: 'market_value',
        maxAgeDays: 30,
        criticalAgeDays: 3,
        decayRate: 'exponential'
      },
      
      // Position - moderately time-sensitive
      {
        observationType: 'position',
        maxAgeDays: 90,
        criticalAgeDays: 30,
        decayRate: 'linear'
      },
      
      // Season Appearances - highly time-sensitive during season
      {
        observationType: 'season_appearances',
        maxAgeDays: 7,
        criticalAgeDays: 1,
        decayRate: 'exponential'
      },
      
      // Goals - highly time-sensitive during season
      {
        observationType: 'goals',
        maxAgeDays: 7,
        criticalAgeDays: 1,
        decayRate: 'exponential'
      },
      
      // Assists - highly time-sensitive during season
      {
        observationType: 'assists',
        maxAgeDays: 7,
        criticalAgeDays: 1,
        decayRate: 'exponential'
      },
      
      // Cards - highly time-sensitive during season
      {
        observationType: 'cards',
        maxAgeDays: 7,
        criticalAgeDays: 1,
        decayRate: 'exponential'
      },
      
      // National Team - moderately time-sensitive
      {
        observationType: 'national_team',
        maxAgeDays: 90,
        criticalAgeDays: 30,
        decayRate: 'linear'
      },
      
      // Injury - highly time-sensitive
      {
        observationType: 'injury',
        maxAgeDays: 3,
        criticalAgeDays: 1,
        decayRate: 'exponential'
      },
      
      // Transfer - moderately time-sensitive
      {
        observationType: 'transfer',
        maxAgeDays: 180,
        criticalAgeDays: 30,
        decayRate: 'linear'
      },
      
      // Advanced Stats - highly time-sensitive during season
      {
        observationType: 'advanced_stats',
        maxAgeDays: 7,
        criticalAgeDays: 1,
        decayRate: 'exponential'
      }
    ];
    
    for (const rule of rules) {
      this.freshnessRules.set(rule.observationType, rule);
    }
    
    // Add metric-specific overrides
    this.freshnessRules.set('market_value:marketValue', {
      observationType: 'market_value',
      metricId: 'marketValue',
      maxAgeDays: 14,
      criticalAgeDays: 2,
      decayRate: 'exponential'
    });
    
    this.freshnessRules.set('contract:contractExpiry', {
      observationType: 'contract',
      metricId: 'contractExpiry',
      maxAgeDays: 14,
      criticalAgeDays: 2,
      decayRate: 'linear'
    });
    
    this.freshnessRules.set('injury:injury_count_latest', {
      observationType: 'injury',
      metricId: 'injury_count_latest',
      maxAgeDays: 1,
      criticalAgeDays: 0,
      decayRate: 'exponential'
    });
  }
  
  /**
   * Set current date for testing
   */
  public setCurrentDate(date: Date): void {
    this.currentDate = date;
  }
  
  /**
   * Get current date
   */
  public getCurrentDate(): Date {
    return this.currentDate;
  }
}
