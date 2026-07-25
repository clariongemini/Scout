import * as fs from 'fs';
import * as path from 'path';
import { EvidenceCollector, EvidenceCollection } from '../collectors/evidence-collector';

export interface TestResult {
  testId: string;
  testName: string;
  repositoryEvaluation: 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_APPLICABLE';
  validatorMaturity: 'DEFINED' | 'EXECUTABLE' | 'MUTATION_VERIFIED';
  capabilityMaturity: 'ABSENT' | 'FOUNDATION_IMPLEMENTED' | 'PARTIALLY_IMPLEMENTED' | 'VERIFIED';
  mutationStatus?: 'MUTATION_VERIFIED' | 'MUTATION_FAILED' | 'NOT_REQUIRED';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  evidence: EvidenceCollection;
}

export interface GateResult {
  gateId: string;
  gateName: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED' | 'CONDITIONAL_PASS';
  testResults: TestResult[];
  conditions?: string[];
  blockingIssues?: string[];
}

export class ChiefArchitectureGuardian {
  private projectRoot: string;
  private evidenceCollector: EvidenceCollector;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.evidenceCollector = new EvidenceCollector(projectRoot);
  }

  analyzeTestResults(testResults: TestResult[]): GateResult {
    const architectureGate = this.evaluateArchitectureGate(testResults);
    const productionGate = this.evaluateProductionGate(testResults);
    const schemaGate = this.evaluateSchemaGate(testResults);

    return {
      gateId: 'architecture_gate',
      gateName: 'Architecture Gate',
      status: architectureGate.status,
      testResults,
      conditions: architectureGate.conditions,
      blockingIssues: productionGate.blockingIssues
    };
  }

  private evaluateArchitectureGate(testResults: TestResult[]): GateResult {
    const requiredRules = ['ARCH-001', 'ARCH-002', 'ARCH-003', 'ARCH-004', 'ARCH-005'];
    const requiredMutations = ['ARCH-002', 'ARCH-003', 'ARCH-005', 'ARCH-007', 'ARCH-008', 'ARCH-009'];
    
    const relevantTests = testResults.filter(t => requiredRules.includes(t.testId));

    // Policy: Any required capability ABSENT → BLOCKED
    const absentCapabilities = relevantTests.filter(t => t.capabilityMaturity === 'ABSENT');
    if (absentCapabilities.length > 0) {
      return {
        gateId: 'architecture_gate',
        gateName: 'Architecture Gate',
        status: 'BLOCKED',
        testResults: relevantTests,
        blockingIssues: absentCapabilities.map(t => `${t.testId}: Required capability ABSENT`)
      };
    }

    // Policy: Any repository evaluation FAIL → FAIL
    const failedEvaluations = relevantTests.filter(t => t.repositoryEvaluation === 'FAIL');
    if (failedEvaluations.length > 0) {
      return {
        gateId: 'architecture_gate',
        gateName: 'Architecture Gate',
        status: 'FAIL',
        testResults: relevantTests,
        blockingIssues: failedEvaluations.map(t => `${t.testId}: Repository evaluation FAIL`)
      };
    }

    // Policy: Any required mutation not MUTATION_VERIFIED → BLOCKED
    const unverifiedMutations = relevantTests.filter(t => 
      requiredMutations.includes(t.testId) && t.mutationStatus !== 'MUTATION_VERIFIED'
    );
    if (unverifiedMutations.length > 0) {
      return {
        gateId: 'architecture_gate',
        gateName: 'Architecture Gate',
        status: 'BLOCKED',
        testResults: relevantTests,
        blockingIssues: unverifiedMutations.map(t => 
          `${t.testId}: Required mutation not verified (${t.mutationStatus || 'NOT_REQUIRED'})`
        )
      };
    }

    // Policy: All repository evaluations PASS and all required mutations MUTATION_VERIFIED → PASS
    const allPass = relevantTests.every(t => t.repositoryEvaluation === 'PASS');
    if (allPass) {
      return {
        gateId: 'architecture_gate',
        gateName: 'Architecture Gate',
        status: 'PASS',
        testResults: relevantTests
      };
    }

    // Fallback
    return {
      gateId: 'architecture_gate',
      gateName: 'Architecture Gate',
      status: 'BLOCKED',
      testResults: relevantTests,
      blockingIssues: ['Gate evaluation error - unexpected state']
    };
  }

  private evaluateProductionGate(testResults: TestResult[]): GateResult {
    const blockingTests = ['ARCH-005', 'ARCH-009', 'ARCH-010'];
    const relevantTests = testResults.filter(t => blockingTests.includes(t.testId));

    const allPass = relevantTests.every(t => t.repositoryEvaluation === 'PASS');

    if (allPass) {
      return {
        gateId: 'production_gate',
        gateName: 'Production Gate',
        status: 'PASS',
        testResults: relevantTests
      };
    } else {
      return {
        gateId: 'production_gate',
        gateName: 'Production Gate',
        status: 'BLOCKED',
        testResults: relevantTests,
        blockingIssues: relevantTests.filter(t => t.repositoryEvaluation === 'FAIL').map(t => t.testId)
      };
    }
  }

  private evaluateSchemaGate(testResults: TestResult[]): GateResult {
    const blockingTests = ['ARCH-005', 'ARCH-009'];
    const relevantTests = testResults.filter(t => blockingTests.includes(t.testId));

    const allPass = relevantTests.every(t => t.repositoryEvaluation === 'PASS');

    if (allPass) {
      return {
        gateId: 'schema_gate',
        gateName: 'Schema Gate',
        status: 'PASS',
        testResults: relevantTests
      };
    } else {
      return {
        gateId: 'schema_gate',
        gateName: 'Schema Gate',
        status: 'CONDITIONAL_PASS',
        testResults: relevantTests,
        conditions: [
          'Implement automated contract validation (ARCH-009)'
        ]
      };
    }
  }

  generateSummary(testResults: TestResult[]): string {
    const passed = testResults.filter(t => t.repositoryEvaluation === 'PASS').length;
    const failed = testResults.filter(t => t.repositoryEvaluation === 'FAIL').length;
    const blocked = testResults.filter(t => t.repositoryEvaluation === 'BLOCKED').length;
    const notApplicable = testResults.filter(t => t.repositoryEvaluation === 'NOT_APPLICABLE').length;

    let summary = `Architecture Test Summary\n`;
    summary += `========================\n`;
    summary += `Total Tests: ${testResults.length}\n`;
    summary += `Passed: ${passed}\n`;
    summary += `Failed: ${failed}\n`;
    summary += `Blocked: ${blocked}\n`;
    summary += `Not Applicable: ${notApplicable}\n\n`;

    testResults.forEach(test => {
      summary += `${test.testId}: ${test.repositoryEvaluation} [validator: ${test.validatorMaturity}] [capability: ${test.capabilityMaturity}] [mutation: ${test.mutationStatus || 'NOT_REQUIRED'}]\n`;
    });

    return summary;
  }

  saveReport(gateResult: GateResult): void {
    const outputDir = path.join(this.projectRoot, 'architecture/reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'chief_guardian_report.json');
    fs.writeFileSync(outputPath, JSON.stringify(gateResult, null, 2));
  }
}
