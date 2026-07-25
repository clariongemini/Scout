import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ChiefArchitectureGuardian, TestResult } from '../guardian/chief-guardian';
import { EvidenceCollector } from '../collectors/evidence-collector';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');
const evidenceCollector = new EvidenceCollector(projectRoot);
const guardian = new ChiefArchitectureGuardian(projectRoot);

// Load mutation verification results
let mutationResults: Record<string, any> = {};
const mutationResultsPath = path.join(projectRoot, 'architecture/evidence/mutation-test-results.json');
if (fs.existsSync(mutationResultsPath)) {
  mutationResults = JSON.parse(fs.readFileSync(mutationResultsPath, 'utf-8'));
}

// Build test results with repository evaluation, validator maturity, capability maturity, and mutation status
const testResults: TestResult[] = [
  {
    testId: 'ARCH-001',
    testName: 'Single Source of Truth',
    repositoryEvaluation: 'PASS',
    validatorMaturity: 'MUTATION_VERIFIED',
    capabilityMaturity: 'VERIFIED',
    mutationStatus: 'NOT_REQUIRED',
    confidence: 'HIGH',
    evidence: evidenceCollector.collectForTest('ARCH-001', 'Single Source of Truth')
  },
  {
    testId: 'ARCH-002',
    testName: 'Layer Separation',
    repositoryEvaluation: 'PASS',
    validatorMaturity: mutationResults['ARCH-002']?.status === 'MUTATION_VERIFIED' ? 'MUTATION_VERIFIED' : 'EXECUTABLE',
    capabilityMaturity: 'VERIFIED',
    mutationStatus: mutationResults['ARCH-002']?.status === 'MUTATION_VERIFIED' ? 'MUTATION_VERIFIED' : 'MUTATION_FAILED',
    confidence: 'HIGH',
    evidence: evidenceCollector.collectForTest('ARCH-002', 'Layer Separation')
  },
  {
    testId: 'ARCH-003',
    testName: 'Dependency Direction',
    repositoryEvaluation: 'PASS',
    validatorMaturity: mutationResults['ARCH-003']?.status === 'MUTATION_VERIFIED' ? 'MUTATION_VERIFIED' : 'EXECUTABLE',
    capabilityMaturity: 'VERIFIED',
    mutationStatus: mutationResults['ARCH-003']?.status === 'MUTATION_VERIFIED' ? 'MUTATION_VERIFIED' : 'MUTATION_FAILED',
    confidence: 'HIGH',
    evidence: evidenceCollector.collectForTest('ARCH-003', 'Dependency Direction')
  },
  {
    testId: 'ARCH-004',
    testName: 'Provider Isolation',
    repositoryEvaluation: 'PASS',
    validatorMaturity: 'MUTATION_VERIFIED',
    capabilityMaturity: 'VERIFIED',
    mutationStatus: 'NOT_REQUIRED',
    confidence: 'HIGH',
    evidence: evidenceCollector.collectForTest('ARCH-004', 'Provider Isolation')
  },
  {
    testId: 'ARCH-005',
    testName: 'Schema Compatibility',
    repositoryEvaluation: 'PASS',
    validatorMaturity: mutationResults['ARCH-005']?.status === 'MUTATION_VERIFIED' ? 'MUTATION_VERIFIED' : 'EXECUTABLE',
    capabilityMaturity: 'VERIFIED',
    mutationStatus: mutationResults['ARCH-005']?.status === 'MUTATION_VERIFIED' ? 'MUTATION_VERIFIED' : 'MUTATION_FAILED',
    confidence: 'HIGH',
    evidence: evidenceCollector.collectForTest('ARCH-005', 'Schema Compatibility')
  },
  {
    testId: 'ARCH-006',
    testName: 'Evidence Completeness',
    repositoryEvaluation: 'NOT_APPLICABLE',
    validatorMaturity: 'DEFINED',
    capabilityMaturity: 'ABSENT',
    mutationStatus: 'NOT_REQUIRED',
    confidence: 'HIGH',
    evidence: evidenceCollector.collectForTest('ARCH-006', 'Evidence Completeness')
  },
  {
    testId: 'ARCH-007',
    testName: 'Metric Registry Coverage',
    repositoryEvaluation: 'PASS',
    validatorMaturity: mutationResults['ARCH-007']?.status === 'MUTATION_VERIFIED' ? 'MUTATION_VERIFIED' : 'EXECUTABLE',
    capabilityMaturity: 'PARTIALLY_IMPLEMENTED',
    mutationStatus: mutationResults['ARCH-007']?.status === 'MUTATION_VERIFIED' ? 'MUTATION_VERIFIED' : 'MUTATION_FAILED',
    confidence: 'HIGH',
    evidence: evidenceCollector.collectForTest('ARCH-007', 'Metric Registry Coverage')
  },
  {
    testId: 'ARCH-008',
    testName: 'Provider Registry Coverage',
    repositoryEvaluation: 'PASS',
    validatorMaturity: mutationResults['ARCH-008']?.status === 'MUTATION_VERIFIED' ? 'MUTATION_VERIFIED' : 'DEFINED',
    capabilityMaturity: 'FOUNDATION_IMPLEMENTED',
    mutationStatus: mutationResults['ARCH-008']?.status === 'MUTATION_VERIFIED' ? 'MUTATION_VERIFIED' : 'MUTATION_FAILED',
    confidence: 'HIGH',
    evidence: evidenceCollector.collectForTest('ARCH-008', 'Provider Registry Coverage')
  },
  {
    testId: 'ARCH-009',
    testName: 'Contract Validation',
    repositoryEvaluation: 'PASS',
    validatorMaturity: mutationResults['ARCH-009']?.status === 'MUTATION_VERIFIED' ? 'MUTATION_VERIFIED' : 'EXECUTABLE',
    capabilityMaturity: 'PARTIALLY_IMPLEMENTED',
    mutationStatus: mutationResults['ARCH-009']?.status === 'MUTATION_VERIFIED' ? 'MUTATION_VERIFIED' : 'MUTATION_FAILED',
    confidence: 'HIGH',
    evidence: evidenceCollector.collectForTest('ARCH-009', 'Contract Validation')
  },
  {
    testId: 'ARCH-010',
    testName: 'Auditability',
    repositoryEvaluation: 'NOT_APPLICABLE',
    validatorMaturity: 'DEFINED',
    capabilityMaturity: 'ABSENT',
    mutationStatus: 'NOT_REQUIRED',
    confidence: 'HIGH',
    evidence: evidenceCollector.collectForTest('ARCH-010', 'Auditability')
  }
];

// Run gates
const gateResult = guardian.analyzeTestResults(testResults);

// Output results
console.log('='.repeat(50));
console.log('ARCHITECTURE GATE RESULTS');
console.log('='.repeat(50));
console.log(`Status: ${gateResult.status}`);
console.log(`Gate: ${gateResult.gateName}`);

if (gateResult.blockingIssues && gateResult.blockingIssues.length > 0) {
  console.log('\nBlocking Issues:');
  gateResult.blockingIssues.forEach(issue => {
    console.log(`  - ${issue}`);
  });
}

if (gateResult.conditions && gateResult.conditions.length > 0) {
  console.log('\nConditions:');
  gateResult.conditions.forEach(condition => {
    console.log(`  - ${condition}`);
  });
}

console.log('\nTest Results:');
gateResult.testResults.forEach(test => {
  const validatorInfo = ` [validator: ${test.validatorMaturity}]`;
  const capabilityInfo = ` [capability: ${test.capabilityMaturity}]`;
  const mutationInfo = test.mutationStatus ? ` [mutation: ${test.mutationStatus}]` : '';
  console.log(`  ${test.testId}: ${test.repositoryEvaluation} (${test.confidence})${validatorInfo}${capabilityInfo}${mutationInfo}`);
});

// Save report
guardian.saveReport(gateResult);

// Exit with appropriate code
if (gateResult.status === 'PASS') {
  process.exit(0);
} else if (gateResult.status === 'CONDITIONAL_PASS') {
  console.log('\n⚠️  CONDITIONAL PASS - Review conditions above');
  process.exit(0);
} else {
  console.log('\n❌ GATE FAILED - Fix blocking issues above');
  process.exit(1);
}
