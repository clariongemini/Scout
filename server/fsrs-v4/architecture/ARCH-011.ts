/**
 * ARCH-011: Observation Layer Architecture Enforcement
 * 
 * This architecture rule enforces that all data must pass through the Observation Layer
 * before becoming metrics. No adapter may bypass the Observation Layer, and no raw
 * provider data may reach the MetricExtractor directly.
 * 
 * VIOLATIONS DETECTED:
 * 1. OBSERVATION_LAYER_BYPASS - Adapters producing MetricCandidate directly
 * 2. RAW_DATA_TO_METRIC_LAYER - MetricExtractor accepting non-CanonicalObservation input
 * 3. MISSING_OBSERVATION_LINEAGE - Metrics without sourceObservationIds
 * 4. UNVALIDATED_OBSERVATION_USAGE - Using quarantined/rejected observations
 */

export enum Arch011Violation {
  OBSERVATION_LAYER_BYPASS = 'OBSERVATION_LAYER_BYPASS',
  RAW_DATA_TO_METRIC_LAYER = 'RAW_DATA_TO_METRIC_LAYER',
  MISSING_OBSERVATION_LINEAGE = 'MISSING_OBSERVATION_LINEAGE',
  UNVALIDATED_OBSERVATION_USAGE = 'UNVALIDATED_OBSERVATION_USAGE'
}

export interface Arch011ViolationReport {
  violation: Arch011Violation;
  file: string;
  line: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
  remediation: string;
}

export class Arch011Enforcer {
  /**
   * Check if a file violates ARCH-011 architecture rules
   * 
   * This is a static analysis check that should be run during CI/CD
   */
  public static checkFile(filePath: string, content: string): Arch011ViolationReport[] {
    const violations: Arch011ViolationReport[] = [];

    // Check 1: Adapters importing MetricCandidate
    if (this.isAdapterFile(filePath) && content.includes('MetricCandidate')) {
      violations.push({
        violation: Arch011Violation.OBSERVATION_LAYER_BYPASS,
        file: filePath,
        line: this.findLineNumber(content, 'MetricCandidate'),
        severity: 'CRITICAL',
        description: 'Adapter imports MetricCandidate - adapters must only output AdapterObservation',
        remediation: 'Refactor adapter to output AdapterObservation instead of MetricCandidate'
      });
    }

    // Check 2: MetricExtractor accepting non-CanonicalObservation input
    if (this.isMetricExtractorFile(filePath)) {
      if (content.includes('extractMetrics(') && !content.includes('CanonicalObservation')) {
        violations.push({
          violation: Arch011Violation.RAW_DATA_TO_METRIC_LAYER,
          file: filePath,
          line: this.findLineNumber(content, 'extractMetrics'),
          severity: 'CRITICAL',
          description: 'MetricExtractor has method accepting non-CanonicalObservation input',
          remediation: 'Refactor MetricExtractor to only accept CanonicalObservation[]'
        });
      }
    }

    // Check 3: Metrics without sourceObservationIds
    if (content.includes('MetricObservation') && content.includes('metricId')) {
      const metricObjectPattern = /metricId:\s*['"][\w_]+['"]/g;
      const matches = content.match(metricObjectPattern);
      if (matches && matches.length > 0) {
        const hasLineage = content.includes('sourceObservationIds');
        if (!hasLineage) {
          violations.push({
            violation: Arch011Violation.MISSING_OBSERVATION_LINEAGE,
            file: filePath,
            line: this.findLineNumber(content, 'MetricObservation'),
            severity: 'CRITICAL',
            description: 'MetricObservation created without sourceObservationIds lineage',
            remediation: 'Add sourceObservationIds array to all MetricObservation objects'
          });
        }
      }
    }

    // Check 4: Using quarantined/rejected observations
    if (content.includes('quarantined') || content.includes('rejected')) {
      const hasValidationCheck = content.includes('validationStatus') || 
                                content.includes('gateResult') ||
                                content.includes('ACCEPTED');
      if (!hasValidationCheck) {
        violations.push({
          violation: Arch011Violation.UNVALIDATED_OBSERVATION_USAGE,
          file: filePath,
          line: this.findLineNumber(content, 'quarantined') || this.findLineNumber(content, 'rejected'),
          severity: 'HIGH',
          description: 'Code references quarantined/rejected observations without validation check',
          remediation: 'Add validation check to ensure only ACCEPTED observations are used'
        });
      }
    }

    return violations;
  }

  /**
   * Check if a file is an adapter file
   */
  private static isAdapterFile(filePath: string): boolean {
    return filePath.includes('/adapters/') && 
           (filePath.endsWith('Adapter.ts') || filePath.endsWith('adapter.ts'));
  }

  /**
   * Check if a file is the MetricExtractor
   */
  private static isMetricExtractorFile(filePath: string): boolean {
    return filePath.includes('MetricExtractor.ts');
  }

  /**
   * Find line number of a pattern in content
   */
  private static findLineNumber(content: string, pattern: string): number {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(pattern)) {
        return i + 1;
      }
    }
    return 0;
  }

  /**
   * Run ARCH-011 check on multiple files
   */
  public static checkFiles(files: Map<string, string>): Arch011ViolationReport[] {
    const allViolations: Arch011ViolationReport[] = [];
    
    for (const [filePath, content] of files.entries()) {
      const violations = this.checkFile(filePath, content);
      allViolations.push(...violations);
    }

    return allViolations;
  }

  /**
   * Generate ARCH-011 compliance report
   */
  public static generateReport(violations: Arch011ViolationReport[]): {
    compliant: boolean;
    totalViolations: number;
    criticalViolations: number;
    highViolations: number;
    mediumViolations: number;
    violationsByType: Record<Arch011Violation, number>;
    summary: string;
  } {
    const criticalViolations = violations.filter(v => v.severity === 'CRITICAL').length;
    const highViolations = violations.filter(v => v.severity === 'HIGH').length;
    const mediumViolations = violations.filter(v => v.severity === 'MEDIUM').length;
    
    const violationsByType: Record<Arch011Violation, number> = {
      [Arch011Violation.OBSERVATION_LAYER_BYPASS]: 0,
      [Arch011Violation.RAW_DATA_TO_METRIC_LAYER]: 0,
      [Arch011Violation.MISSING_OBSERVATION_LINEAGE]: 0,
      [Arch011Violation.UNVALIDATED_OBSERVATION_USAGE]: 0
    };

    for (const violation of violations) {
      violationsByType[violation.violation]++;
    }

    const compliant = violations.length === 0;
    
    const summary = compliant 
      ? 'ARCH-011: COMPLIANT - All architecture rules satisfied'
      : `ARCH-011: NON-COMPLIANT - ${violations.length} violations found (${criticalViolations} critical)`;

    return {
      compliant,
      totalViolations: violations.length,
      criticalViolations,
      highViolations,
      mediumViolations,
      violationsByType,
      summary
    };
  }
}

/**
 * Runtime validation for ARCH-011
 * 
 * These checks can be used in production to catch violations at runtime
 */
export class Arch011RuntimeValidator {
  /**
   * Validate that MetricExtractor input is CanonicalObservation[]
   */
  public static validateMetricExtractorInput(input: any): { valid: boolean; error?: string } {
    if (!Array.isArray(input)) {
      return { 
        valid: false, 
        error: `ARCH-011: MetricExtractor requires CanonicalObservation[], received ${typeof input}` 
      };
    }

    for (let i = 0; i < input.length; i++) {
      const item = input[i];
      if (!this.isCanonicalObservation(item)) {
        return { 
          valid: false, 
          error: `ARCH-011: MetricExtractor requires CanonicalObservation[], element ${i} is invalid` 
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate that a MetricObservation has complete lineage
   */
  public static validateMetricLineage(metric: any): { valid: boolean; error?: string } {
    if (!metric.sourceObservationIds || !Array.isArray(metric.sourceObservationIds)) {
      return { 
        valid: false, 
        error: 'ARCH-011: MetricObservation missing sourceObservationIds lineage' 
      };
    }

    if (metric.sourceObservationIds.length === 0) {
      return { 
        valid: false, 
        error: 'ARCH-011: MetricObservation has empty sourceObservationIds array' 
      };
    }

    return { valid: true };
  }

  /**
   * Validate that observation is ACCEPTED before use
   */
  public static validateObservationStatus(observation: any): { valid: boolean; error?: string } {
    if (!observation.validationStatus) {
      return { 
        valid: false, 
        error: 'ARCH-011: Observation missing validationStatus' 
      };
    }

    if (observation.validationStatus !== 'VALID') {
      return { 
        valid: false, 
        error: `ARCH-011: Observation has validationStatus ${observation.validationStatus}, only VALID observations allowed` 
      };
    }

    return { valid: true };
  }

  /**
   * Runtime check for CanonicalObservation structure
   */
  private static isCanonicalObservation(input: any): boolean {
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
}
