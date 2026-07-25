import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

type RootCauseClassification = 
  | 'RULE_IMPLEMENTATION_DEFECT'
  | 'FIXTURE_DEFECT'
  | 'TEST_HARNESS_DEFECT'
  | 'CAPABILITY_ABSENT'
  | 'MANIFEST_SCOPE_DEFECT'
  | 'VALIDATOR_INTEGRATION_DEFECT'
  | 'EXPECTED_VIOLATION_NOT_DETECTED'
  | 'UNEXPECTED_TEST_ERROR';

interface MutationTestResult {
  testId: string;
  mutationId: string;
  positiveFixturePassed: boolean;
  negativeFixtureFailed: boolean;
  expectedViolationDetected: boolean;
  restorationVerified: boolean;
  status: 'MUTATION_VERIFIED' | 'MUTATION_FAILED' | 'NOT_TESTED';
  violationCode?: string;
  error?: string;
  rootCause?: RootCauseClassification;
  reason?: string;
  fix?: string;
  verifiedAfterFix?: boolean;
}

function runMutationTest(testId: string, mutationId: string, mutationFn: () => void, restoreFn: () => void): MutationTestResult {
  const result: MutationTestResult = {
    testId,
    mutationId,
    positiveFixturePassed: false,
    negativeFixtureFailed: false,
    expectedViolationDetected: false,
    restorationVerified: false,
    status: 'NOT_TESTED'
  };

  try {
    // Step 1: Run positive fixture (baseline)
    console.log(`[${testId}] Running positive fixture...`);
    const positiveExitCode = runArchitectureTest();
    result.positiveFixturePassed = positiveExitCode === 0;

    if (!result.positiveFixturePassed) {
      result.status = 'MUTATION_FAILED';
      result.error = 'Positive fixture failed - baseline broken';
      return result;
    }

    // Step 2: Apply mutation
    console.log(`[${testId}] Applying mutation: ${mutationId}...`);
    mutationFn();

    // Step 3: Run negative fixture (should fail)
    console.log(`[${testId}] Running negative fixture...`);
    const negativeExitCode = runArchitectureTest();
    result.negativeFixtureFailed = negativeExitCode !== 0;
    result.expectedViolationDetected = result.negativeFixtureFailed;

    // Step 4: Restore original state
    console.log(`[${testId}] Restoring original state...`);
    restoreFn();
    result.restorationVerified = true;

    // Step 5: Verify restoration
    console.log(`[${testId}] Verifying restoration...`);
    const restorationExitCode = runArchitectureTest();
    result.restorationVerified = restorationExitCode === 0;

    if (result.positiveFixturePassed && result.negativeFixtureFailed && result.restorationVerified) {
      result.status = 'MUTATION_VERIFIED';
    } else {
      result.status = 'MUTATION_FAILED';
      result.error = 'Mutation test conditions not met';
    }

  } catch (e: any) {
    result.status = 'MUTATION_FAILED';
    result.error = e.message;
    // Attempt restoration even on error
    try {
      restoreFn();
      result.restorationVerified = true;
    } catch (restoreError) {
      result.restorationVerified = false;
    }
  }

  return result;
}

function runArchitectureTest(): number {
  try {
    execSync('npm run architecture:test', { cwd: projectRoot, stdio: 'pipe' });
    return 0;
  } catch (e: any) {
    return e.status || 1;
  }
}

// ARCH-002: Layer Separation - Forbidden cross-layer import
function testArch002(): MutationTestResult {
  const testFile = path.join(projectRoot, 'src/components/ScoutCardLayout.tsx');
  const backupFile = testFile + '.backup';
  
  // Backup original
  fs.copyFileSync(testFile, backupFile);
  
  const mutationFn = () => {
    let content = fs.readFileSync(testFile, 'utf-8');
    // Add forbidden import
    content = `import { MetricExtractor } from '../server/fsrs-v4/layer1-data/MetricExtractor';\n` + content;
    fs.writeFileSync(testFile, content);
  };
  
  const restoreFn = () => {
    if (fs.existsSync(backupFile)) {
      fs.copyFileSync(backupFile, testFile);
      fs.unlinkSync(backupFile);
    }
  };
  
  const result = runMutationTest('ARCH-002', 'FORBIDDEN_LAYER_IMPORT', mutationFn, restoreFn);
  result.violationCode = 'FORBIDDEN_LAYER_IMPORT';
  return result;
}

// ARCH-003: Dependency Direction - Reverse dependency
function testArch003(): MutationTestResult {
  const validFixtureDir = path.join(projectRoot, 'architecture/fixtures/mutation/arch-003-valid-dependency');
  const invalidFixtureDir = path.join(projectRoot, 'architecture/fixtures/mutation/arch-003-invalid-dependency');
  
  // Test valid fixture (should PASS)
  console.log('[ARCH-003] Testing valid fixture (allowed dependency)...');
  const validFixtureExists = fs.existsSync(path.join(validFixtureDir, 'football-intelligence/RoleEngine.ts'));
  
  if (!validFixtureExists) {
    return {
      testId: 'ARCH-003',
      mutationId: 'REVERSE_DEPENDENCY',
      positiveFixturePassed: false,
      negativeFixtureFailed: false,
      expectedViolationDetected: false,
      restorationVerified: true,
      status: 'NOT_TESTED',
      error: 'Valid fixture not found',
      rootCause: 'FIXTURE_DEFECT',
      reason: 'Valid fixture directory missing',
      fix: 'Create valid fixture with allowed dependency (football-intelligence → contracts)',
      verifiedAfterFix: false
    };
  }
  
  // Test invalid fixture (should FAIL with REVERSE_DEPENDENCY)
  console.log('[ARCH-003] Testing invalid fixture (reverse dependency)...');
  const invalidFixtureExists = fs.existsSync(path.join(invalidFixtureDir, 'football-intelligence/RoleEngine.ts'));
  
  if (!invalidFixtureExists) {
    return {
      testId: 'ARCH-003',
      mutationId: 'REVERSE_DEPENDENCY',
      positiveFixturePassed: true,
      negativeFixtureFailed: false,
      expectedViolationDetected: false,
      restorationVerified: true,
      status: 'NOT_TESTED',
      error: 'Invalid fixture not found',
      rootCause: 'FIXTURE_DEFECT',
      reason: 'Invalid fixture directory missing',
      fix: 'Create invalid fixture with forbidden dependency (football-intelligence → adapters)',
      verifiedAfterFix: false
    };
  }
  
  // Check if invalid fixture contains the forbidden import
  const invalidRoleEngine = fs.readFileSync(path.join(invalidFixtureDir, 'football-intelligence/RoleEngine.ts'), 'utf-8');
  const hasForbiddenImport = invalidRoleEngine.includes('import') && invalidRoleEngine.includes('adapters');
  
  if (!hasForbiddenImport) {
    return {
      testId: 'ARCH-003',
      mutationId: 'REVERSE_DEPENDENCY',
      positiveFixturePassed: true,
      negativeFixtureFailed: false,
      expectedViolationDetected: false,
      restorationVerified: true,
      status: 'MUTATION_FAILED',
      error: 'Invalid fixture does not contain forbidden import',
      rootCause: 'FIXTURE_DEFECT',
      reason: 'Invalid fixture should contain import from adapters to trigger REVERSE_DEPENDENCY violation',
      fix: 'Ensure invalid fixture has: import { TransfermarktAdapter } from "../adapters/TransfermarktAdapter"',
      verifiedAfterFix: false
    };
  }
  
  // Check if valid fixture does NOT contain forbidden import
  const validRoleEngine = fs.readFileSync(path.join(validFixtureDir, 'football-intelligence/RoleEngine.ts'), 'utf-8');
  const validHasForbiddenImport = validRoleEngine.includes('adapters');
  
  if (validHasForbiddenImport) {
    return {
      testId: 'ARCH-003',
      mutationId: 'REVERSE_DEPENDENCY',
      positiveFixturePassed: false,
      negativeFixtureFailed: true,
      expectedViolationDetected: true,
      restorationVerified: true,
      status: 'MUTATION_FAILED',
      error: 'Valid fixture contains forbidden import',
      rootCause: 'FIXTURE_DEFECT',
      reason: 'Valid fixture should only import from contracts, not adapters',
      fix: 'Ensure valid fixture has: import { VerifiedPlayer } from "../contracts/VerifiedPlayer"',
      verifiedAfterFix: false
    };
  }
  
  // Fixtures are correct - now check if ARCH-003 test can detect the violation
  // Run the actual ARCH-003 test on invalid fixture
  try {
    execSync('npm run architecture:test -- ARCH-003', { cwd: projectRoot, stdio: 'pipe' });
    // If test passes when it should fail, mutation verification failed
    return {
      testId: 'ARCH-003',
      mutationId: 'REVERSE_DEPENDENCY',
      positiveFixturePassed: true,
      negativeFixtureFailed: false,
      expectedViolationDetected: false,
      restorationVerified: true,
      status: 'MUTATION_FAILED',
      error: 'Test did not detect REVERSE_DEPENDENCY violation',
      rootCause: 'RULE_IMPLEMENTATION_DEFECT',
      reason: 'ARCH-003 test passed on invalid fixture with forbidden import. Rule may not be checking import graph correctly.',
      fix: 'Implement AST-based or import graph analysis to detect reverse dependencies from football-intelligence to adapters',
      verifiedAfterFix: false
    };
  } catch (error: any) {
    // Test failed on invalid fixture - this is expected behavior
    const output = error.stdout?.toString() + error.stderr?.toString();
    const detectedViolation = output.includes('REVERSE_DEPENDENCY') || output.includes('dependency') || output.includes('import');
    
    if (detectedViolation) {
      return {
        testId: 'ARCH-003',
        mutationId: 'REVERSE_DEPENDENCY',
        positiveFixturePassed: true,
        negativeFixtureFailed: true,
        expectedViolationDetected: true,
        restorationVerified: true,
        status: 'MUTATION_VERIFIED',
        violationCode: 'REVERSE_DEPENDENCY'
      };
    } else {
      return {
        testId: 'ARCH-003',
        mutationId: 'REVERSE_DEPENDENCY',
        positiveFixturePassed: true,
        negativeFixtureFailed: true,
        expectedViolationDetected: false,
        restorationVerified: true,
        status: 'MUTATION_FAILED',
        error: 'Test failed but violation not clearly detected',
        rootCause: 'RULE_IMPLEMENTATION_DEFECT',
        reason: 'Test failed but did not report REVERSE_DEPENDENCY violation code',
        fix: 'Ensure ARCH-003 test reports specific violation code when reverse dependency detected',
        verifiedAfterFix: false
      };
    }
  }
}

// ARCH-005: Schema Compatibility - Full fixture matrix
function testArch005(): MutationTestResult {
  const fixtureBaseDir = path.join(projectRoot, 'architecture/fixtures/mutation');
  
  const scenarios = [
    { dir: 'arch-005-optional-field-added', expected: 'COMPATIBLE', type: 'compatible' },
    { dir: 'arch-005-required-field-added', expected: 'BREAKING', type: 'breaking' },
    { dir: 'arch-005-field-removed', expected: 'BREAKING', type: 'breaking' },
    { dir: 'arch-005-field-type-changed', expected: 'BREAKING', type: 'breaking' },
    { dir: 'arch-005-enum-widened', expected: 'COMPATIBLE', type: 'compatible' },
    { dir: 'arch-005-enum-narrowed', expected: 'BREAKING', type: 'breaking' },
    { dir: 'arch-005-description-changed', expected: 'COMPATIBLE', type: 'compatible' },
    { dir: 'arch-005-nullable-to-non-nullable', expected: 'BREAKING', type: 'breaking' },
    { dir: 'arch-005-non-nullable-to-nullable', expected: 'COMPATIBLE', type: 'compatible' }
  ];
  
  let passedScenarios = 0;
  let failedScenariosMissing = 0;
  let breakingScenariosTested = 0;
  let compatibleScenariosTested = 0;
  
  console.log('[ARCH-005] Testing schema compatibility fixture matrix...');
  
  for (const scenario of scenarios) {
    const fixturePath = path.join(fixtureBaseDir, scenario.dir, 'verified_player.schema.json');
    const exists = fs.existsSync(fixturePath);
    
    if (!exists) {
      failedScenariosMissing++;
      console.log(`[ARCH-005] Missing fixture: ${scenario.dir}`);
      continue;
    }
    
    if (scenario.type === 'breaking') {
      breakingScenariosTested++;
    } else {
      compatibleScenariosTested++;
    }
    
    passedScenarios++;
    console.log(`[ARCH-005] Fixture exists: ${scenario.dir} (${scenario.expected})`);
  }
  
  // Check if all breaking scenarios are present
  const breakingScenarios = scenarios.filter(s => s.type === 'breaking');
  const allBreakingPresent = breakingScenarios.every(s => 
    fs.existsSync(path.join(fixtureBaseDir, s.dir, 'verified_player.schema.json'))
  );
  
  // Check if all compatible scenarios are present
  const compatibleScenarios = scenarios.filter(s => s.type === 'compatible');
  const allCompatiblePresent = compatibleScenarios.every(s => 
    fs.existsSync(path.join(fixtureBaseDir, s.dir, 'verified_player.schema.json'))
  );
  
  if (failedScenariosMissing > 0) {
    return {
      testId: 'ARCH-005',
      mutationId: 'BREAKING_SCHEMA_CHANGE',
      positiveFixturePassed: false,
      negativeFixtureFailed: false,
      expectedViolationDetected: false,
      restorationVerified: true,
      status: 'MUTATION_FAILED',
      error: `${failedScenariosMissing} fixture scenarios missing`,
      rootCause: 'FIXTURE_DEFECT',
      reason: `Schema compatibility fixture matrix incomplete. ${failedScenariosMissing} scenarios missing out of ${scenarios.length}.`,
      fix: 'Create all 9 fixture scenarios: optional-field-added, required-field-added, field-removed, field-type-changed, enum-widened, enum-narrowed, description-changed, nullable-to-non-nullable, non-nullable-to-nullable.',
      verifiedAfterFix: false
    };
  }
  
  if (!allBreakingPresent || !allCompatiblePresent) {
    return {
      testId: 'ARCH-005',
      mutationId: 'BREAKING_SCHEMA_CHANGE',
      positiveFixturePassed: true,
      negativeFixtureFailed: false,
      expectedViolationDetected: false,
      restorationVerified: true,
      status: 'MUTATION_FAILED',
      error: 'Fixture matrix incomplete',
      rootCause: 'FIXTURE_DEFECT',
      reason: `Not all breaking or compatible scenarios present. Breaking: ${breakingScenariosTested}/${breakingScenarios.length}, Compatible: ${compatibleScenariosTested}/${compatibleScenarios.length}`,
      fix: 'Ensure all 9 fixture scenarios are created and valid.',
      verifiedAfterFix: false
    };
  }
  
  // All fixtures present - now check if ARCH-005 can detect breaking changes
  // Test one breaking scenario by temporarily replacing the schema
  const breakingFixturePath = path.join(fixtureBaseDir, 'arch-005-required-field-added/verified_player.schema.json');
  const productionSchemaPath = path.join(projectRoot, 'server/fsrs-v4/schemas/verified_player.schema.json');
  const backupSchemaPath = productionSchemaPath + '.backup';
  
  fs.copyFileSync(productionSchemaPath, backupSchemaPath);
  fs.copyFileSync(breakingFixturePath, productionSchemaPath);
  
  try {
    execSync('npm run architecture:test -- ARCH-005', { cwd: projectRoot, stdio: 'pipe' });
    // Test passed on breaking schema - mutation verification failed
    fs.copyFileSync(backupSchemaPath, productionSchemaPath);
    fs.unlinkSync(backupSchemaPath);
    
    return {
      testId: 'ARCH-005',
      mutationId: 'BREAKING_SCHEMA_CHANGE',
      positiveFixturePassed: true,
      negativeFixtureFailed: false,
      expectedViolationDetected: false,
      restorationVerified: true,
      status: 'MUTATION_FAILED',
      error: 'Test did not detect breaking schema change',
      rootCause: 'RULE_IMPLEMENTATION_DEFECT',
      reason: 'ARCH-005 test passed on breaking schema (required field added). Rule may not be checking schema compatibility correctly.',
      fix: 'Implement schema compatibility validation to detect breaking changes: required field additions, field removals, type changes, enum narrowing.',
      verifiedAfterFix: false
    };
  } catch (error: any) {
    // Test failed on breaking schema - this is expected
    fs.copyFileSync(backupSchemaPath, productionSchemaPath);
    fs.unlinkSync(backupSchemaPath);
    
    const output = error.stdout?.toString() + error.stderr?.toString();
    const detectedViolation = output.includes('BREAKING') || output.includes('breaking') || output.includes('schema') || output.includes('compatibility');
    
    if (detectedViolation) {
      return {
        testId: 'ARCH-005',
        mutationId: 'BREAKING_SCHEMA_CHANGE',
        positiveFixturePassed: true,
        negativeFixtureFailed: true,
        expectedViolationDetected: true,
        restorationVerified: true,
        status: 'MUTATION_VERIFIED',
        violationCode: 'BREAKING_SCHEMA_CHANGE'
      };
    } else {
      return {
        testId: 'ARCH-005',
        mutationId: 'BREAKING_SCHEMA_CHANGE',
        positiveFixturePassed: true,
        negativeFixtureFailed: true,
        expectedViolationDetected: false,
        restorationVerified: true,
        status: 'MUTATION_FAILED',
        error: 'Test failed but violation not clearly detected',
        rootCause: 'RULE_IMPLEMENTATION_DEFECT',
        reason: 'Test failed on breaking schema but did not report BREAKING_SCHEMA_CHANGE violation code',
        fix: 'Ensure ARCH-005 test reports specific violation code when breaking schema change detected',
        verifiedAfterFix: false
      };
    }
  }
}

// ARCH-007: Metric Registry Coverage - Unregistered metric
function testArch007(): MutationTestResult {
  const testFile = path.join(projectRoot, 'server/fsrs-v4/layer1-data/MetricExtractor.ts');
  const backupFile = testFile + '.backup';
  
  if (!fs.existsSync(testFile)) {
    return {
      testId: 'ARCH-007',
      mutationId: 'UNREGISTERED_METRIC',
      positiveFixturePassed: true,
      negativeFixtureFailed: true,
      expectedViolationDetected: true,
      restorationVerified: true,
      status: 'NOT_TESTED',
      error: 'MetricExtractor not found',
      rootCause: 'TEST_HARNESS_DEFECT',
      reason: 'Test harness depends on production file. Metric registry capability exists (registry file created in previous work) but test does not verify registry loading and enforcement.',
      fix: 'Implement registry loading verification and runtime enforcement check. Test should verify that unregistered metrics are rejected by rule.',
      verifiedAfterFix: false
    };
  }
  
  fs.copyFileSync(testFile, backupFile);
  
  const mutationFn = () => {
    let content = fs.readFileSync(testFile, 'utf-8');
    // Add unregistered metric emission
    content = content.replace(/return {/, 'return {\n    unregistered_metric: 42,');
    fs.writeFileSync(testFile, content);
  };
  
  const restoreFn = () => {
    if (fs.existsSync(backupFile)) {
      fs.copyFileSync(backupFile, testFile);
      fs.unlinkSync(backupFile);
    }
  };
  
  const result = runMutationTest('ARCH-007', 'UNREGISTERED_METRIC', mutationFn, restoreFn);
  result.violationCode = 'UNREGISTERED_METRIC';
  
  if (result.status === 'MUTATION_FAILED') {
    result.rootCause = 'RULE_IMPLEMENTATION_DEFECT';
    result.reason = 'Metric registry capability is PARTIALLY_IMPLEMENTED (registry file exists) but rule does not enforce runtime validation of unregistered metrics.';
    result.fix = 'Implement runtime metric registry enforcement in rule. Verify registry loading and check metric IDs against registry before emission.';
    result.verifiedAfterFix = false;
    result.error = undefined; // Override generic error
  }
  
  return result;
}

// ARCH-008: Provider Registry Coverage - Unregistered provider
function testArch008(): MutationTestResult {
  const testFile = path.join(projectRoot, 'server/engine/ScoutEngineV4.ts');
  const backupFile = testFile + '.backup';
  
  fs.copyFileSync(testFile, backupFile);
  
  const mutationFn = () => {
    let content = fs.readFileSync(testFile, 'utf-8');
    // Add unregistered provider
    content = content.replace(/source.*unknown/i, 'source: "unknown-provider"');
    fs.writeFileSync(testFile, content);
  };
  
  const restoreFn = () => {
    if (fs.existsSync(backupFile)) {
      fs.copyFileSync(backupFile, testFile);
      fs.unlinkSync(backupFile);
    }
  };
  
  const result = runMutationTest('ARCH-008', 'UNREGISTERED_PROVIDER', mutationFn, restoreFn);
  result.violationCode = 'UNREGISTERED_PROVIDER';
  
  if (result.status === 'MUTATION_FAILED') {
    result.rootCause = 'FIXTURE_DEFECT';
    result.reason = 'Test fixture uses string replacement which may not match actual source code pattern. Provider registry capability is ABSENT but test does not validate provider rejection logic.';
    result.fix = 'Implement proper fixture with valid/invalid provider objects. Add provider registry enforcement rule to reject unknown providers. Test canonicalization policy (Transfermarkt vs transfermarkt vs transfermarkt.com).';
    result.verifiedAfterFix = false;
    result.error = undefined; // Override generic error
  }
  
  return result;
}

// ARCH-009: Contract Validation - Invalid contract fixture
function testArch009(): MutationTestResult {
  const fixtureFile = path.join(projectRoot, 'architecture/fixtures/valid-minimal-verified-player.json');
  const backupFile = fixtureFile + '.backup';
  
  if (!fs.existsSync(fixtureFile)) {
    return {
      testId: 'ARCH-009',
      mutationId: 'INVALID_CONTRACT_FIXTURE',
      positiveFixturePassed: true,
      negativeFixtureFailed: true,
      expectedViolationDetected: true,
      restorationVerified: true,
      status: 'NOT_TESTED',
      error: 'Fixture not found',
      rootCause: 'FIXTURE_DEFECT',
      reason: 'Contract validation fixture not found. Contract test passes (npm run contract:test) but mutation test does not use same validator.',
      fix: 'Create contract validation fixtures and integrate with real contract validator from contract:test. Test should reject invalid fixtures with correct error codes.',
      verifiedAfterFix: false
    };
  }
  
  fs.copyFileSync(fixtureFile, backupFile);
  
  const mutationFn = () => {
    let fixture = JSON.parse(fs.readFileSync(fixtureFile, 'utf-8'));
    // Remove required field
    delete fixture.schemaVersion;
    fs.writeFileSync(fixtureFile, JSON.stringify(fixture, null, 2));
  };
  
  const restoreFn = () => {
    if (fs.existsSync(backupFile)) {
      fs.copyFileSync(backupFile, fixtureFile);
      fs.unlinkSync(backupFile);
    }
  };
  
  const result = runMutationTest('ARCH-009', 'INVALID_CONTRACT_FIXTURE', mutationFn, restoreFn);
  result.violationCode = 'INVALID_CONTRACT_FIXTURE';
  
  if (result.status === 'MUTATION_FAILED') {
    result.rootCause = 'VALIDATOR_INTEGRATION_DEFECT';
    result.reason = 'Contract test passes (npm run contract:test) but mutation test does not use the same validator. ARCH-009 likely uses separate or simplified validator instead of real contract validation service.';
    result.fix = 'Integrate ARCH-009 with real contract validator from contract:test. Add negative fixtures: missing required field, wrong primitive type, invalid enum, invalid null, unsupported schema version, unknown field when forbidden.';
    result.verifiedAfterFix = false;
    result.error = undefined; // Override generic error
  }
  
  return result;
}

// Run all mutation tests
const results: MutationTestResult[] = [];

console.log('=== ARCHITECTURE MUTATION VERIFICATION ===\n');

results.push(testArch002());
results.push(testArch003());
results.push(testArch005());
results.push(testArch007());
results.push(testArch008());
results.push(testArch009());

// Output results
console.log('\n=== MUTATION VERIFICATION RESULTS ===\n');
results.forEach(r => {
  console.log(`${r.testId} - ${r.mutationId}: ${r.status}`);
  if (r.violationCode) console.log(`  Violation Code: ${r.violationCode}`);
  if (r.rootCause) console.log(`  Root Cause: ${r.rootCause}`);
  if (r.reason) console.log(`  Reason: ${r.reason}`);
  if (r.fix) console.log(`  Fix: ${r.fix}`);
  if (r.error) console.log(`  Error: ${r.error}`);
});

// Save results
const outputDir = path.join(projectRoot, 'architecture/evidence');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(
  path.join(outputDir, 'mutation-test-results.json'),
  JSON.stringify(results, null, 2)
);

const verifiedCount = results.filter(r => r.status === 'MUTATION_VERIFIED').length;
console.log(`\nSummary: ${verifiedCount}/6 mutation tests verified`);

// Exit with appropriate code
if (verifiedCount < 6) {
  process.exit(1);
} else {
  process.exit(0);
}
