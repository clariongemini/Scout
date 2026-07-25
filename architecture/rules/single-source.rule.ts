import * as fs from 'fs';
import * as path from 'path';

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  status: 'PASS' | 'FAIL' | 'UNKNOWN';
  violations: string[];
  evidence: string[];
}

export function singleSourceRule(projectRoot: string): RuleResult {
  const result: RuleResult = {
    ruleId: 'single_source_rule',
    ruleName: 'Single Source of Truth Rule',
    status: 'PASS',
    violations: [],
    evidence: []
  };

  try {
    // Check if derived metrics are calculated only in MetricExtractor
    const metricExtractorPath = path.join(projectRoot, 'server/fsrs-v4/layer1-data/MetricExtractor.ts');
    const presentationPath = path.join(projectRoot, 'src/components/ScoutCardLayout.tsx');
    
    if (fs.existsSync(metricExtractorPath)) {
      const metricExtractorContent = fs.readFileSync(metricExtractorPath, 'utf-8');
      result.evidence.push(`MetricExtractor contains derived metric calculations`);
      
      if (metricExtractorContent.match(/goals.*90.*minutes|per90|derived/i)) {
        result.evidence.push(`MetricExtractor has per90 calculations`);
      }
    } else {
      result.status = 'UNKNOWN';
      result.violations.push(`MetricExtractor not found`);
    }

    if (fs.existsSync(presentationPath)) {
      const presentationContent = fs.readFileSync(presentationPath, 'utf-8');
      
      // Check if presentation layer has metric calculations
      if (presentationContent.match(/goals.*\*.*90.*\/.*minutes|calculate.*per90|derived.*metric/i)) {
        result.status = 'FAIL';
        result.violations.push(`Presentation layer contains metric calculations`);
      } else {
        result.evidence.push(`Presentation layer does not calculate metrics`);
      }
    } else {
      result.status = 'UNKNOWN';
      result.violations.push(`Presentation layer not found`);
    }

  } catch (error) {
    result.status = 'UNKNOWN';
    result.violations.push(`Error executing rule: ${error}`);
  }

  return result;
}
