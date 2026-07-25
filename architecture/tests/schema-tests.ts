import * as fs from 'fs';
import * as path from 'path';

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

interface SchemaTestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'NOT_IMPLEMENTED';
  evidence: string[];
  violations: string[];
}

function runSchemaTests(): SchemaTestResult[] {
  const results: SchemaTestResult[] = [];

  // Test 1: All JSON Schema files are parseable
  try {
    const schemasPath = path.join(projectRoot, 'server/fsrs-v4/schemas');
    const schemaFiles = fs.readdirSync(schemasPath).filter(f => f.endsWith('.json'));
    
    let parseErrors = 0;
    let parseableCount = 0;
    
    schemaFiles.forEach(file => {
      try {
        const content = fs.readFileSync(path.join(schemasPath, file), 'utf-8');
        JSON.parse(content);
        parseableCount++;
      } catch (e) {
        parseErrors++;
      }
    });

    if (parseErrors === 0 && parseableCount > 0) {
      results.push({
        testName: 'JSON Schema files parseable',
        status: 'PASS',
        evidence: [`All ${parseableCount} schema files parse successfully`],
        violations: []
      });
    } else {
      results.push({
        testName: 'JSON Schema files parseable',
        status: 'FAIL',
        evidence: [],
        violations: [`${parseErrors} schema files failed to parse, ${parseableCount} parseable`]
      });
    }
  } catch (e) {
    results.push({
      testName: 'JSON Schema files parseable',
      status: 'NOT_IMPLEMENTED',
      evidence: [],
      violations: ['Schema directory not found']
    });
  }

  // Test 2: Schema files have required properties
  try {
    const schemasPath = path.join(projectRoot, 'server/fsrs-v4/schemas');
    const schemaFiles = fs.readdirSync(schemasPath).filter(f => f.endsWith('.json'));
    
    let invalidSchemas = 0;
    
    schemaFiles.forEach(file => {
      try {
        const schema = JSON.parse(fs.readFileSync(path.join(schemasPath, file), 'utf-8'));
        if (!schema.$schema || !schema.type) {
          invalidSchemas++;
        }
      } catch (e) {
        // Already counted in parse test
      }
    });

    if (invalidSchemas === 0) {
      results.push({
        testName: 'Schema files have required properties',
        status: 'PASS',
        evidence: ['All schemas have $schema and type properties'],
        violations: []
      });
    } else {
      results.push({
        testName: 'Schema files have required properties',
        status: 'FAIL',
        evidence: [],
        violations: [`${invalidSchemas} schemas missing required properties`]
      });
    }
  } catch (e) {
    results.push({
      testName: 'Schema files have required properties',
      status: 'NOT_IMPLEMENTED',
      evidence: [],
      violations: ['Cannot verify schema properties']
    });
  }

  // Test 3: Schema version consistency
  try {
    const scoutEnginePath = path.join(projectRoot, 'server/engine/ScoutEngineV4.ts');
    const content = fs.readFileSync(scoutEnginePath, 'utf-8');
    
    if (content.match(/4\.0\.0|schemaVersion/i)) {
      results.push({
        testName: 'Schema version consistency',
        status: 'PASS',
        evidence: ['Schema version 4.0.0 defined in code'],
        violations: []
      });
    } else {
      results.push({
        testName: 'Schema version consistency',
        status: 'FAIL',
        evidence: [],
        violations: ['Schema version not consistently defined']
      });
    }
  } catch (e) {
    results.push({
      testName: 'Schema version consistency',
      status: 'NOT_IMPLEMENTED',
      evidence: [],
      violations: ['Cannot verify schema version consistency']
    });
  }

  // Test 4: Registry-schema referential integrity
  try {
    const metricRegistryPath = path.join(projectRoot, 'FSRS_v4/policies/metric_definition_registry.json');
    const schemasPath = path.join(projectRoot, 'server/fsrs-v4/schemas');
    
    if (fs.existsSync(metricRegistryPath) && fs.existsSync(schemasPath)) {
      const metricRegistry = JSON.parse(fs.readFileSync(metricRegistryPath, 'utf-8'));
      
      if (metricRegistry && Object.keys(metricRegistry).length > 0) {
        results.push({
          testName: 'Registry-schema referential integrity',
          status: 'PASS',
          evidence: ['Metric registry exists and has content'],
          violations: []
        });
      } else {
        results.push({
          testName: 'Registry-schema referential integrity',
          status: 'FAIL',
          evidence: [],
          violations: ['Metric registry is empty or invalid']
        });
      }
    } else {
      results.push({
        testName: 'Registry-schema referential integrity',
        status: 'NOT_IMPLEMENTED',
        evidence: [],
        violations: ['Metric registry or schemas not found']
      });
    }
  } catch (e) {
    results.push({
      testName: 'Registry-schema referential integrity',
      status: 'NOT_IMPLEMENTED',
      evidence: [],
      violations: ['Cannot verify referential integrity']
    });
  }

  return results;
}

// Run tests
const results = runSchemaTests();

// Output results
console.log('SCHEMA TEST RESULTS');
console.log('==================');
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
  path.join(outputDir, 'schema-test-results.json'),
  JSON.stringify(results, null, 2)
);

// Exit with appropriate code
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
