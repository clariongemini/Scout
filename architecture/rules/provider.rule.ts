import * as fs from 'fs';
import * as path from 'path';

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  status: 'PASS' | 'FAIL' | 'UNKNOWN';
  violations: string[];
  evidence: string[];
}

export function providerRule(projectRoot: string): RuleResult {
  const result: RuleResult = {
    ruleId: 'provider_rule',
    ruleName: 'Provider Isolation Rule',
    status: 'PASS',
    violations: [],
    evidence: []
  };

  try {
    const scoutEnginePath = path.join(projectRoot, 'server/engine/ScoutEngineV4.ts');
    const adapterPath = path.join(projectRoot, 'server/adapters/TransfermarktAdapter.ts');
    const metricExtractorPath = path.join(projectRoot, 'server/fsrs-v4/layer1-data/MetricExtractor.ts');

    // Check ScoutEngine for provider isolation
    if (fs.existsSync(scoutEnginePath)) {
      const scoutEngineContent = fs.readFileSync(scoutEnginePath, 'utf-8');
      
      if (scoutEngineContent.match(/transfermarkt.*html.*parse|understat.*html.*parse/i)) {
        result.status = 'FAIL';
        result.violations.push(`ScoutEngine contains provider-specific parsing logic`);
      } else {
        result.evidence.push(`ScoutEngine uses adapter interface, not provider-specific logic`);
      }
    }

    // Check BaseAdapter for common interface
    const baseAdapterPath = path.join(projectRoot, 'server/adapters/BaseAdapter.ts');
    if (fs.existsSync(baseAdapterPath)) {
      const baseAdapterContent = fs.readFileSync(baseAdapterPath, 'utf-8');
      
      if (baseAdapterContent.match(/class BaseAdapter|interface.*Adapter/i)) {
        result.evidence.push(`BaseAdapter provides common interface`);
      } else {
        result.status = 'FAIL';
        result.violations.push(`No common adapter interface found`);
      }
    }

    // Check MetricExtractor for provider independence
    if (fs.existsSync(metricExtractorPath)) {
      const metricExtractorContent = fs.readFileSync(metricExtractorPath, 'utf-8');
      
      if (metricExtractorContent.match(/transfermarkt.*specific|understat.*specific/i)) {
        result.status = 'FAIL';
        result.violations.push(`MetricExtractor contains provider-specific logic`);
      } else {
        result.evidence.push(`MetricExtractor works with normalized data`);
      }
    }

  } catch (error) {
    result.status = 'UNKNOWN';
    result.violations.push(`Error executing rule: ${error}`);
  }

  return result;
}
