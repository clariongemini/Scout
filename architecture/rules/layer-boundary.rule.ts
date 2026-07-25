import * as fs from 'fs';
import * as path from 'path';

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  status: 'PASS' | 'FAIL' | 'UNKNOWN';
  violations: string[];
  evidence: string[];
}

export function layerBoundaryRule(projectRoot: string): RuleResult {
  const result: RuleResult = {
    ruleId: 'layer_boundary_rule',
    ruleName: 'Layer Boundary Rule',
    status: 'PASS',
    violations: [],
    evidence: []
  };

  try {
    const presentationPath = path.join(projectRoot, 'src/components/ScoutCardLayout.tsx');
    const dataIntelligencePath = path.join(projectRoot, 'server/fsrs-v4/layer1-data/MetricExtractor.ts');
    const adapterPath = path.join(projectRoot, 'server/adapters/TransfermarktAdapter.ts');

    // Check presentation layer
    if (fs.existsSync(presentationPath)) {
      const presentationContent = fs.readFileSync(presentationPath, 'utf-8');
      
      if (presentationContent.match(/calculate.*metric|compute.*stat|derive.*metric/i)) {
        result.status = 'FAIL';
        result.violations.push(`Presentation layer contains metric calculations`);
      } else {
        result.evidence.push(`Presentation layer does not calculate metrics`);
      }
      
      if (presentationContent.match(/metrics90|seasonPerformance|careerSummary/i)) {
        result.evidence.push(`Presentation layer consumes data objects correctly`);
      }
    }

    // Check data intelligence layer
    if (fs.existsSync(dataIntelligencePath)) {
      const dataIntelligenceContent = fs.readFileSync(dataIntelligencePath, 'utf-8');
      
      if (dataIntelligenceContent.match(/from.*components.*ScoutCardLayout|import.*ScoutCardLayout/i)) {
        result.status = 'FAIL';
        result.violations.push(`Data intelligence layer imports presentation components`);
      } else {
        result.evidence.push(`Data intelligence layer does not import presentation`);
      }
    }

    // Check adapter layer
    if (fs.existsSync(adapterPath)) {
      const adapterContent = fs.readFileSync(adapterPath, 'utf-8');
      
      if (adapterContent.match(/reconcile|verified|decision/i)) {
        result.status = 'FAIL';
        result.violations.push(`Adapter contains business logic`);
      } else {
        result.evidence.push(`Adapter stays within data collection responsibilities`);
      }
    }

  } catch (error) {
    result.status = 'UNKNOWN';
    result.violations.push(`Error executing rule: ${error}`);
  }

  return result;
}
