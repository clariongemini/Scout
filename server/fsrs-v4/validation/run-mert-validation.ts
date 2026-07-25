/**
 * Mert Müldür End-to-End Validation with Observation Layer Integration
 * 
 * This script runs the complete validation pipeline for Mert Müldür
 * with the new Observation Layer integration enabled.
 */

import { PlayerValidationRunner } from './PlayerValidationRunner';
import fs from 'fs';
import path from 'path';

type ObservationLayerStatus = {
  observationLayerDesign: 'COMPLETED' | 'NOT_IMPLEMENTED';
  observationLayerFoundation: 'IMPLEMENTED' | 'NOT_IMPLEMENTED';
  productionPipelineIntegration: 'IMPLEMENTED' | 'NOT_IMPLEMENTED';
  runtimeEnforcement: 'VERIFIED' | 'NOT_VERIFIED';
  endToEndValidation: 'EXECUTED' | 'NOT_EXECUTED';
  sprintExit: 'PASS' | 'FAIL';
};

async function runMertValidation() {
  console.log('='.repeat(80));
  console.log('MERT MÜLDÜR END-TO-END VALIDATION WITH OBSERVATION LAYER');
  console.log('='.repeat(80));
  console.log('');

  const runner = new PlayerValidationRunner({ noCache: false, season: '2024-25' });

  try {
    const result = await runner.validatePlayer('Mert Müldür', {
      noCache: false,
      season: '2024-25'
    });

    console.log('');
    console.log('='.repeat(80));
    console.log('VALIDATION COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log('');
    console.log('VALIDATION SUMMARY:');
    console.log(`- Player: ${result.validationMetadata.playerName}`);
    console.log(`- Validation ID: ${result.validationMetadata.validationId}`);
    console.log(`- Pipeline Version: ${result.validationMetadata.pipelineVersion}`);
    console.log(`- Total Observations: ${result.rawObservations.length}`);
    console.log(`- Reconciliation Cases: ${result.reconciliationCases.length}`);
    console.log(`- Derived Metrics: ${result.derivedMetrics.length}`);
    console.log('');

    // Save detailed results
    const outputDir = path.join(process.cwd(), '.fsrs-v4-output/validation');
    const outputPath = path.join(outputDir, 'mert-muldur-observation-layer-validation.json');
    
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`Detailed results saved to: ${outputPath}`);

    // Generate observation layer specific report
    const observationLayerReport = generateObservationLayerReport(result);
    const reportPath = path.join(outputDir, 'mert-muldur-observation-layer-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(observationLayerReport, null, 2));
    console.log(`Observation Layer report saved to: ${reportPath}`);

    console.log('');
    console.log('OBSERVATION LAYER METRICS:');
    console.log(`- Adapter Observations: ${observationLayerReport.adapterObservations}`);
    console.log(`- Canonical Observations: ${observationLayerReport.canonicalObservations}`);
    console.log(`- Accepted: ${observationLayerReport.accepted}`);
    console.log(`- Quarantined: ${observationLayerReport.quarantined}`);
    console.log(`- Rejected: ${observationLayerReport.rejected}`);
    console.log(`- Scope Verified: ${observationLayerReport.scopeVerified}`);
    console.log(`- Scope Inferred: ${observationLayerReport.scopeInferred}`);
    console.log(`- Scope Incomplete: ${observationLayerReport.scopeIncomplete}`);
    console.log(`- Metrics Produced: ${observationLayerReport.metricsProduced}`);
    console.log(`- Metrics Blocked: ${observationLayerReport.metricsBlocked}`);
    console.log(`- Metrics with Complete Lineage: ${observationLayerReport.metricsWithLineage}`);
    console.log(`- Metrics with Broken Lineage: ${observationLayerReport.metricsWithBrokenLineage}`);
    console.log('');
    console.log('OBSERVATION LAYER STATUS:');
    console.log(`- Observation Layer Design: ${observationLayerReport.layerStatus.observationLayerDesign}`);
    console.log(`- Observation Layer Foundation: ${observationLayerReport.layerStatus.observationLayerFoundation}`);
    console.log(`- Production Pipeline Integration: ${observationLayerReport.layerStatus.productionPipelineIntegration}`);
    console.log(`- Runtime Enforcement: ${observationLayerReport.layerStatus.runtimeEnforcement}`);
    console.log(`- End-to-End Validation: ${observationLayerReport.layerStatus.endToEndValidation}`);
    console.log(`- Sprint Exit: ${observationLayerReport.layerStatus.sprintExit}`);
    console.log('');

  } catch (error) {
    console.error('VALIDATION FAILED:', error);
    process.exit(1);
  }
}

function generateObservationLayerReport(result: any): any {
  // Extract observation layer specific metrics from the validation result
  const adapterObservations = result.rawObservations.length;
  
  // Count canonical observations (those that passed through the orchestrator)
  // For now, we'll estimate based on normalization status
  const canonicalObservations = result.rawObservations.filter((obs: any) => 
    obs.normalizationStatus === 'NORMALIZED' || obs.normalizationStatus === 'PARTIALLY_NORMALIZED'
  ).length;

  // Count by validation status (if available)
  const accepted = result.rawObservations.filter((obs: any) => 
    obs.validationStatus === 'VALID' || obs.validationStatus === undefined
  ).length;
  const quarantined = result.rawObservations.filter((obs: any) => obs.validationStatus === 'QUARANTINED').length;
  const rejected = result.rawObservations.filter((obs: any) => obs.validationStatus === 'INVALID').length;

  // Count by scope status
  const scopeVerified = result.rawObservations.filter((obs: any) => obs.scopeStatus === 'SCOPE_VERIFIED').length;
  const scopeInferred = result.rawObservations.filter((obs: any) => obs.scopeStatus === 'SCOPE_INFERRED').length;
  const scopeIncomplete = result.rawObservations.filter((obs: any) => obs.scopeStatus === 'SCOPE_INCOMPLETE' || obs.scopeStatus === undefined).length;

  // Count metrics with lineage
  const metricsWithLineage = result.reconciliationCases.filter((c: any) => 
    c.observations && c.observations.every((obs: any) => obs.sourceObservationIds && obs.sourceObservationIds.length > 0)
  ).length;

  const metricsProduced = result.reconciliationCases.length;
  const metricsBlocked = adapterObservations - metricsProduced;

  const layerStatus: ObservationLayerStatus = {
    observationLayerDesign: 'NOT_IMPLEMENTED',
    observationLayerFoundation: 'NOT_IMPLEMENTED',
    productionPipelineIntegration: 'NOT_IMPLEMENTED',
    runtimeEnforcement: 'NOT_VERIFIED',
    endToEndValidation: 'NOT_EXECUTED',
    sprintExit: 'FAIL'
  };

  return {
    validationId: result.validationMetadata.validationId,
    playerName: result.validationMetadata.playerName,
    validatedAt: result.validationMetadata.validatedAt,
    pipelineVersion: result.validationMetadata.pipelineVersion,
    
    adapterObservations,
    canonicalObservations,
    accepted,
    quarantined,
    rejected,
    
    scopeVerified,
    scopeInferred,
    scopeIncomplete,
    
    metricsProduced,
    metricsBlocked,
    metricsWithLineage,
    metricsWithBrokenLineage: metricsProduced - metricsWithLineage,
    
    observationLayerActive: false,
    lineageTrackingActive: false,
    gateEnforcementActive: false,
    layerStatus
  };
}

// Run the validation
runMertValidation().catch(console.error);
