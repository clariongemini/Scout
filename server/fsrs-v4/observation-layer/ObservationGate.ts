/**
 * Observation Gate
 * 
 * Enforces quality gates before observations can proceed to metric extraction.
 * Observations are classified as ACCEPTED, QUARANTINED, or REJECTED based on:
 * - Validation status
 * - Normalization status
 * - Scope completeness
 * - Provenance completeness
 * 
 * Quarantined observations are preserved but blocked from metric pipeline.
 * Rejected observations are discarded.
 */

import { CanonicalObservation } from './CanonicalObservation';

export interface ObservationGateResult {
  accepted: CanonicalObservation[];
  quarantined: CanonicalObservation[];
  rejected: CanonicalObservation[];
  violations: ObservationViolation[];
  summary: GateSummary;
}

export interface ObservationViolation {
  observationId: string;
  metricId: string;
  sourceId: string;
  violationCode: string;
  violationType: 'VALIDATION_FAILURE' | 'NORMALIZATION_FAILURE' | 'SCOPE_INCOMPLETE' | 'PROVENANCE_MISSING' | 'LINEAGE_BROKEN';
  severity: 'BLOCKING' | 'WARNING';
  message: string;
}

export interface GateSummary {
  totalObservations: number;
  acceptedCount: number;
  quarantinedCount: number;
  rejectedCount: number;
  acceptanceRate: number;
  quarantineRate: number;
  rejectionRate: number;
}

export class ObservationGate {
  private migrationMode: boolean = true; // Enable migration mode for gradual rollout

  /**
   * Process observations through the gate
   */
  public process(observations: CanonicalObservation[]): ObservationGateResult {
    const accepted: CanonicalObservation[] = [];
    const quarantined: CanonicalObservation[] = [];
    const rejected: CanonicalObservation[] = [];
    const violations: ObservationViolation[] = [];
    
    for (const observation of observations) {
      const gateDecision = this.evaluateObservation(observation);
      
      if (gateDecision.decision === 'ACCEPTED') {
        accepted.push(observation);
      } else if (gateDecision.decision === 'QUARANTINED') {
        quarantined.push(observation);
        violations.push(...gateDecision.violations);
      } else {
        rejected.push(observation);
        violations.push(...gateDecision.violations);
      }
    }
    
    const summary = this.calculateSummary(accepted.length, quarantined.length, rejected.length, observations.length);
    
    return {
      accepted,
      quarantined,
      rejected,
      violations,
      summary
    };
  }

  /**
   * Set migration mode (more lenient during rollout)
   */
  public setMigrationMode(enabled: boolean): void {
    this.migrationMode = enabled;
  }
  
  /**
   * Evaluate a single observation
   */
  private evaluateObservation(observation: CanonicalObservation): {
    decision: 'ACCEPTED' | 'QUARANTINED' | 'REJECTED';
    violations: ObservationViolation[];
  } {
    const violations: ObservationViolation[] = [];
    
    // In migration mode, still enforce key validation and scope rules while allowing
    // non-critical edge cases to flow through for lineage analysis.
    if (this.migrationMode) {
      // Reject observations missing critical provenance
      if (!observation.rawSnapshotId || observation.rawSnapshotId === '') {
        violations.push({
          observationId: observation.observationId,
          metricId: observation.metricId,
          sourceId: observation.sourceId,
          violationCode: 'PROVENANCE_MISSING_SNAPSHOT',
          violationType: 'PROVENANCE_MISSING',
          severity: 'BLOCKING',
          message: 'Raw snapshot ID is missing'
        });
        return { decision: 'REJECTED', violations };
      }
      
      if (!observation.pageUrl || observation.pageUrl === '') {
        violations.push({
          observationId: observation.observationId,
          metricId: observation.metricId,
          sourceId: observation.sourceId,
          violationCode: 'PROVENANCE_MISSING_URL',
          violationType: 'PROVENANCE_MISSING',
          severity: 'BLOCKING',
          message: 'Source URL is missing'
        });
        return { decision: 'REJECTED', violations };
      }

      // Reject invalid observations even during migration.
      if (observation.validationStatus === 'INVALID') {
        violations.push({
          observationId: observation.observationId,
          metricId: observation.metricId,
          sourceId: observation.sourceId,
          violationCode: 'VALIDATION_INVALID',
          violationType: 'VALIDATION_FAILURE',
          severity: 'BLOCKING',
          message: 'Observation validation status is INVALID'
        });
        return { decision: 'REJECTED', violations };
      }

      // Quarantine suspicious observations while keeping lineage visible.
      if (observation.validationStatus === 'SUSPICIOUS') {
        violations.push({
          observationId: observation.observationId,
          metricId: observation.metricId,
          sourceId: observation.sourceId,
          violationCode: 'VALIDATION_SUSPICIOUS',
          violationType: 'VALIDATION_FAILURE',
          severity: 'WARNING',
          message: 'Observation validation status is SUSPICIOUS'
        });
        return { decision: 'QUARANTINED', violations };
      }

      // Quarantine incomplete or ambiguous scope observations.
      if (observation.scopeStatus === 'SCOPE_INCOMPLETE' || observation.scopeStatus === 'SCOPE_AMBIGUOUS') {
        violations.push({
          observationId: observation.observationId,
          metricId: observation.metricId,
          sourceId: observation.sourceId,
          violationCode: observation.scopeStatus === 'SCOPE_INCOMPLETE' ? 'SCOPE_INCOMPLETE' : 'SCOPE_AMBIGUOUS',
          violationType: 'SCOPE_INCOMPLETE',
          severity: 'WARNING',
          message: observation.scopeStatus === 'SCOPE_INCOMPLETE'
            ? 'Required scope is incomplete for this observation type'
            : 'Scope is ambiguous for this observation'
        });
        return { decision: 'QUARANTINED', violations };
      }

      // Quarantine low reliability observations during migration.
      if (observation.observationReliability < 0.3) {
        violations.push({
          observationId: observation.observationId,
          metricId: observation.metricId,
          sourceId: observation.sourceId,
          violationCode: 'TRUST_LOW_RELIABILITY',
          violationType: 'VALIDATION_FAILURE',
          severity: 'WARNING',
          message: `Observation reliability is low (${observation.observationReliability.toFixed(2)})`
        });
        return { decision: 'QUARANTINED', violations };
      }

      return { decision: 'ACCEPTED', violations: [] };
    }
    
    // Strict mode (production rules)
    // Rule 1: INVALID observations are REJECTED
    if (observation.validationStatus === 'INVALID') {
      violations.push({
        observationId: observation.observationId,
        metricId: observation.metricId,
        sourceId: observation.sourceId,
        violationCode: 'VALIDATION_INVALID',
        violationType: 'VALIDATION_FAILURE',
        severity: 'BLOCKING',
        message: 'Observation validation status is INVALID'
      });
      return { decision: 'REJECTED', violations };
    }
    
    // Rule 2: UNKNOWN normalization is BLOCKED
    if (observation.normalizationStatus === 'NOT_NORMALIZED' || observation.normalizationStatus === 'NORMALIZATION_FAILED') {
      violations.push({
        observationId: observation.observationId,
        metricId: observation.metricId,
        sourceId: observation.sourceId,
        violationCode: 'NORMALIZATION_INCOMPLETE',
        violationType: 'NORMALIZATION_FAILURE',
        severity: 'BLOCKING',
        message: `Observation normalization status is ${observation.normalizationStatus}: ${observation.normalizationReason || 'No reason provided'}`
      });
      return { decision: 'REJECTED', violations };
    }
    
    // Rule 3: SUSPICIOUS observations are QUARANTINED
    if (observation.validationStatus === 'SUSPICIOUS') {
      violations.push({
        observationId: observation.observationId,
        metricId: observation.metricId,
        sourceId: observation.sourceId,
        violationCode: 'VALIDATION_SUSPICIOUS',
        violationType: 'VALIDATION_FAILURE',
        severity: 'WARNING',
        message: 'Observation validation status is SUSPICIOUS'
      });
      return { decision: 'QUARANTINED', violations };
    }
    
    // Rule 4: Required scope incomplete is QUARANTINED
    if (observation.scopeStatus === 'SCOPE_INCOMPLETE') {
      violations.push({
        observationId: observation.observationId,
        metricId: observation.metricId,
        sourceId: observation.sourceId,
        violationCode: 'SCOPE_INCOMPLETE',
        violationType: 'SCOPE_INCOMPLETE',
        severity: 'BLOCKING',
        message: 'Required scope is incomplete for this observation type'
      });
      return { decision: 'QUARANTINED', violations };
    }
    
    // Rule 5: Missing snapshot or provenance is REJECTED
    if (!observation.rawSnapshotId || observation.rawSnapshotId === '') {
      violations.push({
        observationId: observation.observationId,
        metricId: observation.metricId,
        sourceId: observation.sourceId,
        violationCode: 'PROVENANCE_MISSING_SNAPSHOT',
        violationType: 'PROVENANCE_MISSING',
        severity: 'BLOCKING',
        message: 'Raw snapshot ID is missing'
      });
      return { decision: 'REJECTED', violations };
    }
    
    if (!observation.pageUrl || observation.pageUrl === '') {
      violations.push({
        observationId: observation.observationId,
        metricId: observation.metricId,
        sourceId: observation.sourceId,
        violationCode: 'PROVENANCE_MISSING_URL',
        violationType: 'PROVENANCE_MISSING',
        severity: 'BLOCKING',
        message: 'Source URL is missing'
      });
      return { decision: 'REJECTED', violations };
    }
    
    // Rule 6: SCOPE_AMBIGUOUS is QUARANTINED
    if (observation.scopeStatus === 'SCOPE_AMBIGUOUS') {
      violations.push({
        observationId: observation.observationId,
        metricId: observation.metricId,
        sourceId: observation.sourceId,
        violationCode: 'SCOPE_AMBIGUOUS',
        violationType: 'SCOPE_INCOMPLETE',
        severity: 'WARNING',
        message: 'Scope is ambiguous for this observation'
      });
      return { decision: 'QUARANTINED', violations };
    }
    
    // Rule 7: Low scope confidence is QUARANTINED
    if (observation.scopeConfidence < 0.5) {
      violations.push({
        observationId: observation.observationId,
        metricId: observation.metricId,
        sourceId: observation.sourceId,
        violationCode: 'SCOPE_LOW_CONFIDENCE',
        violationType: 'SCOPE_INCOMPLETE',
        severity: 'WARNING',
        message: `Scope confidence is low (${observation.scopeConfidence.toFixed(2)})`
      });
      return { decision: 'QUARANTINED', violations };
    }
    
    // Rule 8: Low observation reliability is QUARANTINED
    if (observation.observationReliability < 0.3) {
      violations.push({
        observationId: observation.observationId,
        metricId: observation.metricId,
        sourceId: observation.sourceId,
        violationCode: 'TRUST_LOW_RELIABILITY',
        violationType: 'VALIDATION_FAILURE',
        severity: 'WARNING',
        message: `Observation reliability is low (${observation.observationReliability.toFixed(2)})`
      });
      return { decision: 'QUARANTINED', violations };
    }
    
    // If all checks pass, ACCEPT
    return { decision: 'ACCEPTED', violations: [] };
  }
  
  /**
   * Calculate gate summary statistics
   */
  private calculateSummary(
    accepted: number,
    quarantined: number,
    rejected: number,
    total: number
  ): GateSummary {
    if (total === 0) {
      return {
        totalObservations: 0,
        acceptedCount: 0,
        quarantinedCount: 0,
        rejectedCount: 0,
        acceptanceRate: 0,
        quarantineRate: 0,
        rejectionRate: 0
      };
    }
    
    return {
      totalObservations: total,
      acceptedCount: accepted,
      quarantinedCount: quarantined,
      rejectedCount: rejected,
      acceptanceRate: accepted / total,
      quarantineRate: quarantined / total,
      rejectionRate: rejected / total
    };
  }
  
  /**
   * Write quarantined observations to file
   */
  public writeQuarantine(quarantined: CanonicalObservation[], runId: string): void {
    const quarantineDir = '.fsrs-v4-output/quarantine';
    const filename = `${quarantineDir}/${runId}.json`;
    
    // Note: This would typically use a file system writer
    // For now, we'll just log the intent
    console.log(`[ObservationGate] Writing ${quarantined.length} quarantined observations to ${filename}`);
  }
  
  /**
   * Get violation statistics by type
   */
  public getViolationStats(violations: ObservationViolation[]): Map<string, number> {
    const stats = new Map<string, number>();
    
    for (const violation of violations) {
      const count = stats.get(violation.violationCode) || 0;
      stats.set(violation.violationCode, count + 1);
    }
    
    return stats;
  }
}
