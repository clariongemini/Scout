import * as fs from 'fs';
import * as path from 'path';

export type ADRStatus = 'DRAFT' | 'PROPOSED' | 'ACCEPTED' | 'SUPERSEDED' | 'REJECTED' | 'DEPRECATED';
export type FailureClassification = 'REMEDIATION_TASK' | 'TECHNICAL_DEBT' | 'ARCHITECTURE_VIOLATION' | 'ADR_CANDIDATE';

export interface ADR {
  id: string;
  title: string;
  status: ADRStatus;
  classification: FailureClassification;
  date: string;
  context: {
    problem: string;
    drivers: string[];
    affectedComponents: string[];
  };
  decision: {
    description: string;
    implementation: string;
    alternatives: Array<{
      alternative: string;
      rejectedReason: string;
    }>;
  };
  consequences: {
    positive: string[];
    negative: string[];
    risks: string[];
  };
  evidence: {
    testResults: string[];
    codeReferences: string[];
    violations: string[];
  };
  relatedADRs: string[];
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  architectureImpact: boolean;
  longTermConsequence: boolean;
  decisionOwnerRequired: boolean;
}

export class ADRGenerator {
  private projectRoot: string;
  private nextADRNumber: number;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.nextADRNumber = this.findNextADRNumber();
  }

  private findNextADRNumber(): number {
    const adrDir = path.join(this.projectRoot, 'architecture/adr');
    if (!fs.existsSync(adrDir)) {
      return 14; // Start from ADR-014 (existing ADRs go up to ADR-018)
    }

    const files = fs.readdirSync(adrDir);
    const numbers = files
      .filter(f => f.startsWith('ADR-') && f.endsWith('.json'))
      .map(f => parseInt(f.split('-')[1]));

    return Math.max(...numbers, 13) + 1;
  }

  generateADRFromTestFailure(testId: string, testName: string, violations: string[]): ADR | null {
    const classification = this.classifyFailure(testId, violations);
    
    // Only generate ADR for ADR_CANDIDATE classification
    if (classification !== 'ADR_CANDIDATE') {
      return null;
    }

    const adrId = `ADR-${this.nextADRNumber++}`;
    const date = new Date().toISOString();

    let adr: ADR;

    switch (testId) {
      case 'ARCH-002':
        adr = this.generateLayerSeparationADR(adrId, date, violations, classification);
        break;
      case 'ARCH-006':
        adr = this.generateEvidenceTrackingADR(adrId, date, violations, classification);
        break;
      case 'ARCH-007':
        adr = this.generateMetricRegistryADR(adrId, date, violations, classification);
        break;
      case 'ARCH-008':
        adr = this.generateProviderRegistryADR(adrId, date, violations, classification);
        break;
      case 'ARCH-009':
        adr = this.generateContractValidationADR(adrId, date, violations, classification);
        break;
      case 'ARCH-010':
        adr = this.generateAuditLoggingADR(adrId, date, violations, classification);
        break;
      default:
        adr = this.generateGenericADR(adrId, date, testName, violations, classification);
    }

    return adr;
  }

  private classifyFailure(testId: string, violations: string[]): FailureClassification {
    // Simple classification logic
    // Registry typos, missing fields, simple implementation gaps = REMEDIATION_TASK
    // Performance issues, tech debt = TECHNICAL_DEBT
    // Layer violations, architecture breaches = ARCHITECTURE_VIOLATION
    // Strategic decisions requiring alternatives = ADR_CANDIDATE
    
    if (testId === 'ARCH-002' || testId === 'ARCH-003' || testId === 'ARCH-004' || testId === 'ARCH-005') {
      // Layer architecture decisions
      return 'ADR_CANDIDATE';
    }
    
    if (testId === 'ARCH-007' || testId === 'ARCH-008') {
      // Registry strategy decisions
      return 'ADR_CANDIDATE';
    }
    
    if (testId === 'ARCH-006' || testId === 'ARCH-009' || testId === 'ARCH-010') {
      // These are complex architectural decisions
      return 'ADR_CANDIDATE';
    }
    
    // Default to remediation task for simple fixes
    return 'REMEDIATION_TASK';
  }

  private generateLayerSeparationADR(id: string, date: string, violations: string[], classification: FailureClassification): ADR {
    return {
      id,
      title: 'Layer Separation Architecture',
      status: 'DRAFT',
      classification,
      date,
      context: {
        problem: 'Cross-layer imports detected, violating layer separation principles',
        drivers: ['ARCH-002 FAIL', 'Architecture governance requirements'],
        affectedComponents: ['src/components/', 'server/fsrs-v4/', 'server/adapters/']
      },
      decision: {
        description: 'Enforce strict layer separation with dependency direction rules',
        implementation: 'Add layer boundary validation, enforce dependency direction',
        alternatives: [
          { alternative: 'Allow cross-layer imports with exceptions', rejectedReason: 'Violates architecture principles, hard to maintain' },
          { alternative: 'Runtime dependency checking only', rejectedReason: 'Too late, errors in production' }
        ]
      },
      consequences: {
        positive: ['Clear architecture boundaries', 'Prevent circular dependencies'],
        negative: ['Additional validation overhead', 'More complex build process'],
        risks: ['Overly restrictive rules block valid patterns', 'Migration complexity']
      },
      evidence: {
        testResults: ['ARCH-002'],
        codeReferences: ['src/components/ScoutCardLayout.tsx', 'server/fsrs-v4/layer1-data/MetricExtractor.ts'],
        violations
      },
      relatedADRs: ['ADR-003'],
      priority: 'HIGH',
      architectureImpact: true,
      longTermConsequence: true,
      decisionOwnerRequired: true
    };
  }

  private generateEvidenceTrackingADR(id: string, date: string, violations: string[], classification: FailureClassification): ADR {
    return {
      id,
      title: 'Evidence Tracking Implementation',
      status: 'DRAFT',
      classification,
      date,
      context: {
        problem: 'Derived metrics cannot trace to raw metric sources, making data provenance unanswerable',
        drivers: ['ARCH-006 FAIL', 'Audit compliance requirements', 'Data governance needs'],
        affectedComponents: ['server/fsrs-v4/layer1-data/MetricExtractor', 'server/engine/ScoutEngineV4.ts']
      },
      decision: {
        description: 'Implement source lineage tracking and data provenance system',
        implementation: 'Add source lineage metadata to metric extraction pipeline',
        alternatives: [
          { alternative: 'Manual provenance tracking', rejectedReason: 'Not scalable, error-prone' },
          { alternative: 'Post-hoc reconstruction', rejectedReason: 'Too late, cannot guarantee accuracy' }
        ]
      },
      consequences: {
        positive: ['Complete data lineage traceability', 'Audit compliance achievable'],
        negative: ['Increased complexity', 'Additional storage requirements'],
        risks: ['Performance impact', 'Storage growth']
      },
      evidence: {
        testResults: ['ARCH-006'],
        codeReferences: ['server/engine/ScoutEngineV4.ts:derivedMetrics'],
        violations
      },
      relatedADRs: ['ADR-001'],
      priority: 'HIGH',
      architectureImpact: true,
      longTermConsequence: true,
      decisionOwnerRequired: true
    };
  }

  private generateMetricRegistryADR(id: string, date: string, violations: string[], classification: FailureClassification): ADR {
    return {
      id,
      title: 'Metric Registry Integration',
      status: 'DRAFT',
      classification,
      date,
      context: {
        problem: 'Metrics not registered in metric registry, no validation enforcement',
        drivers: ['ARCH-007 FAIL', 'Metric governance requirements'],
        affectedComponents: ['server/fsrs-v4/layer1-data/MetricExtractor', 'FSRS_v4/policies/metric_definition_registry.json']
      },
      decision: {
        description: 'Integrate metric registry with metric extraction pipeline',
        implementation: 'Connect metric extraction to metric registry, add validation rules',
        alternatives: [
          { alternative: 'Continue without metric registry', rejectedReason: 'No governance, validation impossible' },
          { alternative: 'External governance system', rejectedReason: 'Adds complexity' }
        ]
      },
      consequences: {
        positive: ['Metric governance enforced', 'Validation automated'],
        negative: ['Additional complexity', 'Registry maintenance'],
        risks: ['Registry becomes bottleneck', 'Schema changes break pipeline']
      },
      evidence: {
        testResults: ['ARCH-007'],
        codeReferences: ['server/engine/ScoutEngineV4.ts:derivedMetrics'],
        violations
      },
      relatedADRs: ['ADR-001'],
      priority: 'HIGH',
      architectureImpact: true,
      longTermConsequence: true,
      decisionOwnerRequired: true
    };
  }

  private generateProviderRegistryADR(id: string, date: string, violations: string[], classification: FailureClassification): ADR {
    return {
      id,
      title: 'Provider Registry Implementation',
      status: 'DRAFT',
      classification,
      date,
      context: {
        problem: 'No centralized provider registry, no health monitoring',
        drivers: ['ARCH-008 FAIL', 'Provider management needs'],
        affectedComponents: ['server/engine/ScoutEngineV4.ts', 'server/adapters/']
      },
      decision: {
        description: 'Implement centralized provider registry with health monitoring',
        implementation: 'Create provider registry service, add health monitoring',
        alternatives: [
          { alternative: 'Continue without provider registry', rejectedReason: 'Chaotic management, no health monitoring' },
          { alternative: 'External provider service', rejectedReason: 'Adds external dependency' }
        ]
      },
      consequences: {
        positive: ['Centralized management', 'Health monitoring automated'],
        negative: ['Additional complexity', 'Registry service maintenance'],
        risks: ['Registry single point of failure', 'Health check overhead']
      },
      evidence: {
        testResults: ['ARCH-008'],
        codeReferences: ['server/engine/ScoutEngineV4.ts:adapters'],
        violations
      },
      relatedADRs: ['ADR-002'],
      priority: 'MEDIUM',
      architectureImpact: true,
      longTermConsequence: true,
      decisionOwnerRequired: true
    };
  }

  private generateContractValidationADR(id: string, date: string, violations: string[], classification: FailureClassification): ADR {
    return {
      id,
      title: 'Contract Validation Automation',
      status: 'DRAFT',
      classification,
      date,
      context: {
        problem: 'No automated contract validation, schema changes can break system',
        drivers: ['ARCH-009 FAIL', 'Schema stability requirements'],
        affectedComponents: ['server/engine/ScoutEngineV4.ts', 'architecture/contracts/']
      },
      decision: {
        description: 'Implement automated contract validation system',
        implementation: 'Create contract validation service, add schema validation',
        alternatives: [
          { alternative: 'Manual contract validation', rejectedReason: 'Error-prone, not scalable' },
          { alternative: 'Runtime validation only', rejectedReason: 'Too late, errors in production' }
        ]
      },
      consequences: {
        positive: ['Automated validation', 'Early violation detection'],
        negative: ['Additional validation complexity', 'Build time overhead'],
        risks: ['Validation becomes bottleneck', 'False positives block deployment']
      },
      evidence: {
        testResults: ['ARCH-009'],
        codeReferences: ['server/engine/ScoutEngineV4.ts:schemaVersion'],
        violations
      },
      relatedADRs: ['ADR-003'],
      priority: 'HIGH',
      architectureImpact: true,
      longTermConsequence: true,
      decisionOwnerRequired: true
    };
  }

  private generateAuditLoggingADR(id: string, date: string, violations: string[], classification: FailureClassification): ADR {
    return {
      id,
      title: 'Audit Logging System',
      status: 'DRAFT',
      classification,
      date,
      context: {
        problem: 'No comprehensive audit logging, data lineage not traceable',
        drivers: ['ARCH-010 FAIL', 'Audit compliance requirements'],
        affectedComponents: ['server/engine/ScoutEngineV4.ts', 'server/storage/']
      },
      decision: {
        description: 'Implement comprehensive audit logging system',
        implementation: 'Create audit logging service, add data lineage tracking',
        alternatives: [
          { alternative: 'Continue with basic logging only', rejectedReason: 'Insufficient for audit compliance' },
          { alternative: 'External audit service', rejectedReason: 'Adds external dependency' }
        ]
      },
      consequences: {
        positive: ['Complete audit trail', 'Data lineage traceability'],
        negative: ['Significant logging infrastructure', 'Storage requirements'],
        risks: ['Performance impact', 'Audit log storage growth', 'PII compliance']
      },
      evidence: {
        testResults: ['ARCH-010'],
        codeReferences: ['server/engine/ScoutEngineV4.ts:reconciliation'],
        violations
      },
      relatedADRs: ['ADR-014'],
      priority: 'HIGH',
      architectureImpact: true,
      longTermConsequence: true,
      decisionOwnerRequired: true
    };
  }

  private generateGenericADR(id: string, date: string, testName: string, violations: string[], classification: FailureClassification): ADR {
    return {
      id,
      title: `${testName} Implementation`,
      status: 'DRAFT',
      classification,
      date,
      context: {
        problem: `Test failure for ${testName}`,
        drivers: [`${testName} FAIL`],
        affectedComponents: []
      },
      decision: {
        description: `Implement ${testName}`,
        implementation: 'To be determined',
        alternatives: []
      },
      consequences: {
        positive: [],
        negative: [],
        risks: []
      },
      evidence: {
        testResults: [testName],
        codeReferences: [],
        violations
      },
      relatedADRs: [],
      priority: 'MEDIUM',
      architectureImpact: false,
      longTermConsequence: false,
      decisionOwnerRequired: false
    };
  }

  saveADR(adr: ADR): void {
    const adrDir = path.join(this.projectRoot, 'architecture/adr');
    if (!fs.existsSync(adrDir)) {
      fs.mkdirSync(adrDir, { recursive: true });
    }

    const filename = `${adr.id}-${this.slugify(adr.title)}.json`;
    const filepath = path.join(adrDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(adr, null, 2));
  }

  private slugify(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
