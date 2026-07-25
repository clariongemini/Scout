import * as fs from 'fs';
import * as path from 'path';

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  status: 'PASS' | 'FAIL' | 'UNKNOWN';
  violations: string[];
  evidence: string[];
}

export function contractRule(projectRoot: string): RuleResult {
  const result: RuleResult = {
    ruleId: 'contract_rule',
    ruleName: 'Contract Validation Rule',
    status: 'PASS',
    violations: [],
    evidence: []
  };

  try {
    const scoutEnginePath = path.join(projectRoot, 'server/engine/ScoutEngineV4.ts');
    const schemaPath = path.join(projectRoot, 'server/fsrs-v4/schemas/verified_player.schema.json');

    // Check schema version
    if (fs.existsSync(scoutEnginePath)) {
      const scoutEngineContent = fs.readFileSync(scoutEnginePath, 'utf-8');
      
      if (scoutEngineContent.match(/schemaVersion|version.*4\.0/i)) {
        result.evidence.push(`Schema version defined`);
      } else {
        result.status = 'FAIL';
        result.violations.push(`No schema version defined`);
      }
    }

    // Check schema files exist
    if (fs.existsSync(schemaPath)) {
      result.evidence.push(`Schema files exist in FSRS_v4/schemas`);
    } else {
      result.status = 'FAIL';
      result.violations.push(`Schema files not found`);
    }

    // Check for contract validation logic
    if (fs.existsSync(scoutEnginePath)) {
      const scoutEngineContent = fs.readFileSync(scoutEnginePath, 'utf-8');
      
      if (scoutEngineContent.match(/validate.*contract|contract.*validation|schema.*validate/i)) {
        result.evidence.push(`Contract validation logic exists`);
      } else {
        result.status = 'FAIL';
        result.violations.push(`No automated contract validation`);
      }
    }

  } catch (error) {
    result.status = 'UNKNOWN';
    result.violations.push(`Error executing rule: ${error}`);
  }

  return result;
}
