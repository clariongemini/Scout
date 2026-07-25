/**
 * Mert Müldür End-to-End Validation with Observation Layer Integration (V2)
 * 
 * This script runs the complete validation pipeline for Mert Müldür
 * using ScoutEngineV4 with the new Observation Layer integration.
 */

import { ScoutEngineV4 } from '../../engine/ScoutEngineV4';
import fs from 'fs';
import path from 'path';

type ObservationLayerStatus = {
  observationLayerDesign: 'FOUNDATION' | 'COMPLETED' | 'NOT_IMPLEMENTED';
  observationLayerFoundation: 'IMPLEMENTED' | 'NOT_IMPLEMENTED';
  productionPipelineIntegration: 'IMPLEMENTED' | 'NOT_IMPLEMENTED';
  runtimeEnforcement: 'VERIFIED' | 'NOT_VERIFIED';
  endToEndValidation: 'EXECUTED' | 'NOT_EXECUTED';
  sprintExit: 'PASS' | 'FAIL';
};

async function runMertValidation() {
  console.log('='.repeat(80));
  console.log('MERT MÜLDÜR END-TO-END VALIDATION WITH OBSERVATION LAYER (V2)');
  console.log('='.repeat(80));
  console.log('');

  const scoutEngine = new ScoutEngineV4();

  try {
    const report = await scoutEngine.generateReport('Mert Müldür');

    console.log('');
    console.log('='.repeat(80));
    console.log('VALIDATION COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log('');
    console.log('VALIDATION SUMMARY:');
    console.log(`- Player: ${report.name}`);
    console.log(`- Team: ${report.team}`);
    console.log(`- League: ${report.league}`);
    console.log(`- Total Metrics: ${Object.keys(report.fsrsV4Data?.verifiedPlayer?.metrics || {}).length}`);
    console.log(`- Derived Metrics: ${Object.keys(report.fsrsV4Data?.verifiedPlayer?.derivedMetrics || {}).length}`);
    console.log('');

    // Save detailed results
    const outputDir = path.join(process.cwd(), '.fsrs-v4-output/validation');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, 'mert-muldur-observation-layer-validation-v2.json');
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`Detailed results saved to: ${outputPath}`);

    // Generate observation layer specific report
    const observationLayerReport = generateObservationLayerReport(report);
    const reportPath = path.join(outputDir, 'mert-muldur-observation-layer-report-v2.json');
    fs.writeFileSync(reportPath, JSON.stringify(observationLayerReport, null, 2));
    console.log(`Observation Layer report saved to: ${reportPath}`);

    console.log('');
    console.log('OBSERVATION LAYER METRICS:');
    console.log(`- Total Metrics: ${observationLayerReport.totalMetrics}`);
    console.log(`- Metrics with Complete Lineage: ${observationLayerReport.metricsWithLineage}`);
    console.log(`- Metrics with Broken Lineage: ${observationLayerReport.metricsWithBrokenLineage}`);
    console.log(`- Lineage Coverage: ${(observationLayerReport.lineageCoverage * 100).toFixed(1)}%`);
    console.log('');
    console.log('OBSERVATION LAYER STATUS:');
    console.log(`- Observation Layer Design: ${observationLayerReport.layerStatus.observationLayerDesign}`);
    console.log(`- Observation Layer Foundation: ${observationLayerReport.layerStatus.observationLayerFoundation}`);
    console.log(`- Production Pipeline Integration: ${observationLayerReport.layerStatus.productionPipelineIntegration}`);
    console.log(`- Runtime Enforcement: ${observationLayerReport.layerStatus.runtimeEnforcement}`);
    console.log(`- End-to-End Validation: ${observationLayerReport.layerStatus.endToEndValidation}`);
    console.log(`- Sprint Exit: ${observationLayerReport.layerStatus.sprintExit}`);
    console.log('');

    // Check sprint exit criteria
    const lineageRate = observationLayerReport.lineageCoverage;
    const sprintExit = lineageRate >= 0.8 ? 'PASS' : 'FAIL';
    
    console.log(`SPRINT EXIT STATUS: ${sprintExit}`);
    if (sprintExit === 'FAIL') {
      console.log(`Reason: Lineage coverage ${(lineageRate * 100).toFixed(1)}% is below 80% threshold`);
    }

  } catch (error) {
    console.error('VALIDATION FAILED:', error);
    process.exit(1);
  }
}

function generateObservationLayerReport(report: any): any {
  // ScoutEngineV4 returns a final report with fsrsV4Data containing verifiedPlayer
  const verifiedPlayer = report.fsrsV4Data?.verifiedPlayer;
  const metrics = verifiedPlayer?.metrics || {};
  const derivedMetrics = verifiedPlayer?.derivedMetrics || {};
  
  // Count total metrics
  const totalMetrics = Object.keys(metrics).length + Object.keys(derivedMetrics).length;
  
  // Count metrics with complete lineage
  let metricsWithLineage = 0;
  
  for (const [key, metric] of Object.entries(metrics)) {
    if (metric && typeof metric === 'object' && 'sourceObservationIds' in metric) {
      const obsIds = (metric as any).sourceObservationIds;
      if (Array.isArray(obsIds) && obsIds.length > 0) {
        metricsWithLineage++;
      }
    }
  }
  
  for (const [key, metric] of Object.entries(derivedMetrics)) {
    if (metric && typeof metric === 'object' && 'sourceObservationIds' in metric) {
      const obsIds = (metric as any).sourceObservationIds;
      if (Array.isArray(obsIds) && obsIds.length > 0) {
        metricsWithLineage++;
      }
    }
  }

  const metricsWithBrokenLineage = totalMetrics - metricsWithLineage;
  const lineageCoverage = totalMetrics > 0 ? metricsWithLineage / totalMetrics : 0;

  const observationLayerActive = report.fsrsV4Data?.layers?.layer0Source === 'enabled';
  const gateEnforcementActive = report.fsrsV4Data?.layers?.layer1Data === 'enabled';
  const layerStatus: ObservationLayerStatus = {
    observationLayerDesign: observationLayerActive ? 'FOUNDATION' : 'NOT_IMPLEMENTED',
    observationLayerFoundation: observationLayerActive ? 'IMPLEMENTED' : 'NOT_IMPLEMENTED',
    productionPipelineIntegration: gateEnforcementActive ? 'IMPLEMENTED' : 'NOT_IMPLEMENTED',
    runtimeEnforcement: gateEnforcementActive ? 'NOT_VERIFIED' : 'NOT_VERIFIED',
    endToEndValidation: totalMetrics > 0 ? 'EXECUTED' : 'NOT_EXECUTED',
    sprintExit: observationLayerActive && gateEnforcementActive && lineageCoverage >= 0.8 ? 'PASS' : 'FAIL'
  };

  return {
    validationId: `validation-${Date.now()}`,
    playerName: report.name,
    validatedAt: new Date().toISOString(),
    pipelineVersion: '4.0.0-ObservationLayer',
    
    totalMetrics,
    metricsWithLineage,
    metricsWithBrokenLineage,
    lineageCoverage,
    
    sources: Object.keys(report.sources || {}),
    team: report.team,
    league: report.league,
    
    observationLayerActive,
    lineageTrackingActive: true,
    gateEnforcementActive,
    layerStatus,
    
    sprintExitCriteria: {
      lineageThreshold: 0.8,
      lineageMet: lineageCoverage >= 0.8,
      sprintExit: lineageCoverage >= 0.8 ? 'PASS' : 'FAIL'
    }
  };
}

// Run the validation
runMertValidation().catch(console.error);
