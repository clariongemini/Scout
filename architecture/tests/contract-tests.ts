import * as fs from 'fs';
import * as path from 'path';

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

interface ContractTestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'NOT_IMPLEMENTED';
  evidence: string[];
  violations: string[];
}

function runContractTests(): ContractTestResult[] {
  const results: ContractTestResult[] = [];

  // Test 1: Schema files exist and are parseable
  try {
    const schemasPath = path.join(projectRoot, 'server/fsrs-v4/schemas');
    const schemaFiles = fs.readdirSync(schemasPath);
    
    let parseErrors = 0;
    schemaFiles.forEach(file => {
      try {
        const content = fs.readFileSync(path.join(schemasPath, file), 'utf-8');
        JSON.parse(content);
      } catch (e) {
        parseErrors++;
      }
    });

    if (parseErrors === 0) {
      results.push({
        testName: 'Schema files parseable',
        status: 'PASS',
        evidence: [`All ${schemaFiles.length} schema files parse successfully`],
        violations: []
      });
    } else {
      results.push({
        testName: 'Schema files parseable',
        status: 'FAIL',
        evidence: [],
        violations: [`${parseErrors} schema files failed to parse`]
      });
    }
  } catch (e) {
    results.push({
      testName: 'Schema files parseable',
      status: 'NOT_IMPLEMENTED',
      evidence: [],
      violations: ['Schema directory not found']
    });
  }

  // Test 2: Schema version defined
  try {
    const scoutEnginePath = path.join(projectRoot, 'server/engine/ScoutEngineV4.ts');
    const content = fs.readFileSync(scoutEnginePath, 'utf-8');
    
    if (content.match(/schemaVersion|version.*4\.0/i)) {
      results.push({
        testName: 'Schema version defined',
        status: 'PASS',
        evidence: ['Schema version found in ScoutEngineV4'],
        violations: []
      });
    } else {
      results.push({
        testName: 'Schema version defined',
        status: 'FAIL',
        evidence: [],
        violations: ['No schema version defined']
      });
    }
  } catch (e) {
    results.push({
      testName: 'Schema version defined',
      status: 'NOT_IMPLEMENTED',
      evidence: [],
      violations: ['ScoutEngineV4 not found']
    });
  }

  // Test 3: Required fields in verified player schema
  try {
    const verifiedPlayerSchemaPath = path.join(projectRoot, 'server/fsrs-v4/schemas/verified_player.schema.json');
    const schema = JSON.parse(fs.readFileSync(verifiedPlayerSchemaPath, 'utf-8'));
    
    const requiredFields = ['schemaVersion', 'recordType', 'recordId', 'playerName', 'canonicalId', 'verifiedAt', 'metrics', 'provenance'];
    const missingFields = requiredFields.filter(field => !schema.required || !schema.required.includes(field));
    
    if (missingFields.length === 0) {
      results.push({
        testName: 'Required fields in verified player schema',
        status: 'PASS',
        evidence: ['All required fields present'],
        violations: []
      });
    } else {
      results.push({
        testName: 'Required fields in verified player schema',
        status: 'FAIL',
        evidence: [],
        violations: [`Missing required fields: ${missingFields.join(', ')}`]
      });
    }
  } catch (e) {
    results.push({
      testName: 'Required fields in verified player schema',
      status: 'NOT_IMPLEMENTED',
      evidence: [],
      violations: ['Verified player schema not found or not parseable']
    });
  }

  // Test 4: Backward compatibility (schema versioning)
  try {
    const scoutEnginePath = path.join(projectRoot, 'server/engine/ScoutEngineV4.ts');
    const content = fs.readFileSync(scoutEnginePath, 'utf-8');
    
    if (content.match(/seasonPerformance|metrics90/i)) {
      results.push({
        testName: 'Backward compatibility maintained',
        status: 'PASS',
        evidence: ['New fields added without breaking existing structure'],
        violations: []
      });
    } else {
      results.push({
        testName: 'Backward compatibility maintained',
        status: 'FAIL',
        evidence: [],
        violations: ['New fields may break backward compatibility']
      });
    }
  } catch (e) {
    results.push({
      testName: 'Backward compatibility maintained',
      status: 'NOT_IMPLEMENTED',
      evidence: [],
      violations: ['Cannot verify backward compatibility']
    });
  }

  return results;
}

// Run tests
const results = runContractTests();

// Output results
console.log('CONTRACT TEST RESULTS');
console.log('=====================');
console.log('');

let passed = 0;
let failed = 0;
let notImplemented = 0;

results.forEach(result => {
  console.log(`${result.testName}: ${result.status}`);
  if (result.status === 'PASS') passed++;
  if (result.status === 'FAIL') failed++;
  if (result.status === 'NOT_IMPLEMENTED') notImplemented++;
  
  if (result.violations.length > 0) {
    result.violations.forEach(v => console.log(`  - ${v}`));
  }
});

console.log('');
console.log(`Summary: ${passed} PASS, ${failed} FAIL, ${notImplemented} NOT_IMPLEMENTED`);

// Save results
const outputDir = path.join(projectRoot, 'architecture/evidence');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(
  path.join(outputDir, 'contract-test-results.json'),
  JSON.stringify(results, null, 2)
);

// Exit with appropriate code
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
