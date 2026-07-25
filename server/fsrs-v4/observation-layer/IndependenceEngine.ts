/**
 * Independence Engine
 * 
 * Calculates independent source count to detect upstream data dependencies.
 * Some data providers may use the same upstream data sources, which means
 * observations from different providers may not be truly independent.
 * This affects reconciliation confidence and multi-source verification.
 */

import { CanonicalObservation } from './CanonicalObservation';

export interface IndependenceAssessment {
  independentSourceCount: number;
  totalSourceCount: number;
  dependencyGroups: DependencyGroup[];
  confidence: number;
  reason: string;
}

export interface DependencyGroup {
  groupId: string;
  sources: string[];
  upstreamSource: string;
  dependencyType: 'CONFIRMED_DEPENDENCY' | 'LIKELY_DEPENDENCY' | 'UNKNOWN_DEPENDENCY' | 'INDEPENDENT';
  confidence: number;
}

export interface ProviderDependency {
  sourceId: string;
  knownUpstreamSources: string[];
  suspectedUpstreamSources: string[];
  dependencyStrength: 'high' | 'medium' | 'low' | 'unknown';
  evidence: string[];
  verifiedAt: string | null;
  policyVersion: string;
}

export class IndependenceEngine {
  private providerDependencies: Map<string, ProviderDependency>;
  private sourceGroups: Map<string, string>; // sourceId -> groupId
  
  constructor() {
    this.providerDependencies = new Map();
    this.sourceGroups = new Map();
    this.initializeProviderDependencies();
    this.initializeSourceGroups();
  }
  
  /**
   * Assess independence for a set of observations
   */
  public assessIndependence(observations: CanonicalObservation[]): IndependenceAssessment {
    const uniqueSources = new Set(observations.map(o => o.sourceId));
    const totalSourceCount = uniqueSources.size;
    
    if (totalSourceCount === 0) {
      return {
        independentSourceCount: 0,
        totalSourceCount: 0,
        dependencyGroups: [],
        confidence: 0,
        reason: 'No observations provided'
      };
    }
    
    if (totalSourceCount === 1) {
      return {
        independentSourceCount: 1,
        totalSourceCount: 1,
        dependencyGroups: [],
        confidence: 1.0,
        reason: 'Single source - independence not applicable'
      };
    }
    
    const dependencyGroups = this.identifyDependencyGroups(Array.from(uniqueSources));
    const independentSourceCount = this.calculateIndependentSourceCount(dependencyGroups);
    const confidence = this.calculateIndependenceConfidence(independentSourceCount, totalSourceCount);
    const reason = this.generateIndependenceReason(independentSourceCount, totalSourceCount, dependencyGroups);
    
    return {
      independentSourceCount,
      totalSourceCount,
      dependencyGroups,
      confidence,
      reason
    };
  }
  
  /**
   * Identify dependency groups among sources
   */
  private identifyDependencyGroups(sources: string[]): DependencyGroup[] {
    const groups: DependencyGroup[] = [];
    const processedSources = new Set<string>();
    
    for (const sourceId of sources) {
      if (processedSources.has(sourceId)) continue;
      
      const dependency = this.providerDependencies.get(sourceId);
      if (!dependency) {
        // No known dependencies - treat as independent
        processedSources.add(sourceId);
        continue;
      }
      
      // Find all sources that share the same upstream
      const relatedSources = sources.filter(s => {
        if (s === sourceId) return true;
        const otherDependency = this.providerDependencies.get(s);
        if (!otherDependency) return false;
        
        return this.shareUpstream(dependency, otherDependency);
      });
      
      if (relatedSources.length > 1) {
        const groupId = this.generateGroupId(relatedSources);
        const upstreamSource = this.determinePrimaryUpstream(dependency);
        
        groups.push({
          groupId,
          sources: relatedSources,
          upstreamSource,
          dependencyType: this.determineDependencyType(dependency),
          confidence: this.calculateDependencyConfidence(dependency)
        });
        
        relatedSources.forEach(s => processedSources.add(s));
      } else {
        processedSources.add(sourceId);
      }
    }
    
    return groups;
  }
  
  /**
   * Check if two dependencies share upstream sources
   */
  private shareUpstream(dep1: ProviderDependency, dep2: ProviderDependency): boolean {
    const knownOverlap = dep1.knownUpstreamSources.some(s => 
      dep2.knownUpstreamSources.includes(s)
    );
    
    const suspectedOverlap = dep1.suspectedUpstreamSources.some(s => 
      dep2.suspectedUpstreamSources.includes(s) || dep2.knownUpstreamSources.includes(s)
    );
    
    return knownOverlap || suspectedOverlap;
  }
  
  /**
   * Calculate independent source count
   */
  private calculateIndependentSourceCount(dependencyGroups: DependencyGroup[]): number {
    // Each dependency group counts as 1 independent source
    // Sources not in any dependency group count as 1 each
    return dependencyGroups.length;
  }
  
  /**
   * Calculate independence confidence
   */
  private calculateIndependenceConfidence(independentCount: number, totalCount: number): number {
    if (totalCount === 0) return 0;
    
    // Perfect independence: all sources are independent
    if (independentCount === totalCount) return 1.0;
    
    // All sources depend on same upstream: very low independence
    if (independentCount === 1 && totalCount > 1) return 0.2;
    
    // Partial independence
    const ratio = independentCount / totalCount;
    return Math.max(0.3, ratio);
  }
  
  /**
   * Generate independence reason
   */
  private generateIndependenceReason(
    independentCount: number,
    totalCount: number,
    dependencyGroups: DependencyGroup[]
  ): string {
    if (independentCount === totalCount) {
      return `All ${totalCount} sources are independent`;
    }
    
    if (dependencyGroups.length > 0) {
      const groupDescriptions = dependencyGroups.map(g => 
        `${g.sources.join(', ')} share upstream: ${g.upstreamSource}`
      );
      return `${independentCount} independent sources from ${totalCount} total. Dependencies: ${groupDescriptions.join('; ')}`;
    }
    
    return `${independentCount} independent sources from ${totalCount} total`;
  }
  
  /**
   * Determine primary upstream source
   */
  private determinePrimaryUpstream(dependency: ProviderDependency): string {
    if (dependency.knownUpstreamSources.length > 0) {
      return dependency.knownUpstreamSources[0];
    }
    if (dependency.suspectedUpstreamSources.length > 0) {
      return dependency.suspectedUpstreamSources[0] + ' (suspected)';
    }
    return 'unknown';
  }
  
  /**
   * Determine dependency type
   */
  private determineDependencyType(dependency: ProviderDependency): DependencyGroup['dependencyType'] {
    if (dependency.knownUpstreamSources.length > 0) {
      return 'CONFIRMED_DEPENDENCY';
    }
    if (dependency.suspectedUpstreamSources.length > 0) {
      return 'LIKELY_DEPENDENCY';
    }
    return 'UNKNOWN_DEPENDENCY';
  }
  
  /**
   * Calculate dependency confidence
   */
  private calculateDependencyConfidence(dependency: ProviderDependency): number {
    switch (dependency.dependencyStrength) {
      case 'high':
        return 0.95;
      case 'medium':
        return 0.75;
      case 'low':
        return 0.55;
      case 'unknown':
        return 0.5;
      default:
        return 0.5;
    }
  }
  
  /**
   * Generate group ID
   */
  private generateGroupId(sources: string[]): string {
    const sorted = [...sources].sort();
    return `dep-${sorted.join('-')}`;
  }
  
  /**
   * Initialize provider dependencies
   */
  private initializeProviderDependencies(): void {
    const dependencies: ProviderDependency[] = [
      {
        sourceId: 'transfermarkt',
        knownUpstreamSources: [],
        suspectedUpstreamSources: [],
        dependencyStrength: 'unknown',
        evidence: [],
        verifiedAt: null,
        policyVersion: '1.0.0'
      },
      {
        sourceId: 'understat',
        knownUpstreamSources: [],
        suspectedUpstreamSources: [],
        dependencyStrength: 'unknown',
        evidence: [],
        verifiedAt: null,
        policyVersion: '1.0.0'
      },
      {
        sourceId: 'fbref',
        knownUpstreamSources: [],
        suspectedUpstreamSources: [],
        dependencyStrength: 'unknown',
        evidence: [],
        verifiedAt: null,
        policyVersion: '1.0.0'
      },
      {
        sourceId: 'fotmob',
        knownUpstreamSources: [],
        suspectedUpstreamSources: ['opta'],
        dependencyStrength: 'low',
        evidence: ['Suspected Opta data based on access patterns'],
        verifiedAt: null,
        policyVersion: '1.0.0'
      },
      {
        sourceId: 'statbunker',
        knownUpstreamSources: [],
        suspectedUpstreamSources: [],
        dependencyStrength: 'unknown',
        evidence: [],
        verifiedAt: null,
        policyVersion: '1.0.0'
      },
      {
        sourceId: 'soccerway',
        knownUpstreamSources: [],
        suspectedUpstreamSources: [],
        dependencyStrength: 'unknown',
        evidence: [],
        verifiedAt: null,
        policyVersion: '1.0.0'
      },
      {
        sourceId: 'sofascore',
        knownUpstreamSources: [],
        suspectedUpstreamSources: ['opta'],
        dependencyStrength: 'low',
        evidence: ['Suspected Opta data based on access patterns'],
        verifiedAt: null,
        policyVersion: '1.0.0'
      }
    ];
    
    for (const dep of dependencies) {
      this.providerDependencies.set(dep.sourceId, dep);
    }
  }
  
  /**
   * Initialize source groups
   */
  private initializeSourceGroups(): void {
    // Known dependency groups
    // FotMob and SofaScore may share Opta data
    this.sourceGroups.set('fotmob', 'opta-group');
    this.sourceGroups.set('sofascore', 'opta-group');
  }
  
  /**
   * Add provider dependency
   */
  public addProviderDependency(dependency: ProviderDependency): void {
    this.providerDependencies.set(dependency.sourceId, dependency);
  }
  
  /**
   * Get provider dependency
   */
  public getProviderDependency(sourceId: string): ProviderDependency | undefined {
    return this.providerDependencies.get(sourceId);
  }
  
  /**
   * Check if two sources are independent
   */
  public areIndependent(sourceId1: string, sourceId2: string): boolean {
    const dep1 = this.providerDependencies.get(sourceId1);
    const dep2 = this.providerDependencies.get(sourceId2);
    
    if (!dep1 || !dep2) return true;
    
    return !this.shareUpstream(dep1, dep2);
  }
}
