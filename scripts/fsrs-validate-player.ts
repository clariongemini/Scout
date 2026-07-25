#!/usr/bin/env tsx
import { PlayerValidationRunner } from '../server/fsrs-v4/validation/PlayerValidationRunner';
import { ValidationArtifactWriter } from '../server/fsrs-v4/validation/ValidationArtifactWriter';
import path from 'path';
import fs from 'fs';

interface CommandLineArgs {
  player: string;
  noCache?: boolean;
  season?: string;
}

function parseArgs(): CommandLineArgs {
  const args = process.argv.slice(2);
  const result: CommandLineArgs = {
    player: ''
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--player' && args[i + 1]) {
      result.player = args[i + 1];
      i++;
    } else if (arg === '--no-cache') {
      result.noCache = true;
    } else if (arg === '--season' && args[i + 1]) {
      result.season = args[i + 1];
      i++;
    }
  }

  return result;
}

function validateArgs(args: CommandLineArgs): void {
  if (!args.player) {
    console.error('Error: --player argument is required');
    console.error('Usage: npm run fsrs:validate-player -- --player "Player Name" [--no-cache] [--season "YYYY-YY"]');
    process.exit(1);
  }
}

async function main() {
  const args = parseArgs();
  validateArgs(args);

  console.log('='.repeat(60));
  console.log('FSRS PLAYER VALIDATION');
  console.log('='.repeat(60));
  console.log(`Player: ${args.player}`);
  console.log(`Season: ${args.season || '2024-25'}`);
  console.log(`No Cache: ${args.noCache || false}`);
  console.log('='.repeat(60));

  const runner = new PlayerValidationRunner({ noCache: args.noCache, season: args.season });
  const artifactWriter = new ValidationArtifactWriter();

  try {
    const result = await runner.validatePlayer(args.player, { noCache: args.noCache, season: args.season });

    // Write artifacts
    const outputDir = path.join(process.cwd(), '.fsrs-v4-output/validation');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const playerNameSlug = args.player.toLowerCase().replace(/\s+/g, '_');
    
    // Main validation result
    const validationPath = path.join(outputDir, `${playerNameSlug}_fsrs_v4_validation.json`);
    fs.writeFileSync(validationPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`\n✓ Validation result saved: ${validationPath}`);

    // Source comparison
    const sourceComparisonPath = path.join(outputDir, `${playerNameSlug}_source_comparison.json`);
    const sourceComparison = artifactWriter.buildSourceComparison(result);
    fs.writeFileSync(sourceComparisonPath, JSON.stringify(sourceComparison, null, 2), 'utf-8');
    console.log(`✓ Source comparison saved: ${sourceComparisonPath}`);

    // Command results for architecture evidence
    const evidenceDir = path.join(process.cwd(), 'architecture/evidence');
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }
    const commandResultsPath = path.join(evidenceDir, 'player-validation-command-results.json');
    fs.writeFileSync(commandResultsPath, JSON.stringify({
      command: `npm run fsrs:validate-player -- --player "${args.player}"${args.noCache ? ' --no-cache' : ''}${args.season ? ` --season "${args.season}"` : ''}`,
      exitCode: 0,
      artifact: validationPath,
      status: 'SUCCESS',
      executedAt: new Date().toISOString(),
      result: {
        identityResolution: result.identity.resolutionStatus,
        identityConfidence: result.identity.identityConfidence,
        sourcesAttempted: result.sourceExecutions.length,
        sourcesSuccessful: result.sourceExecutions.filter(s => s.status === 'SUCCESS').length,
        rawObservations: result.rawObservations.length,
        reconciliationCases: result.reconciliationCases.length,
        verifiedMetrics: result.verifiedMetrics.length,
        derivedMetrics: result.derivedMetrics.length,
        overallScore: result.scores.overallScore
      }
    }, null, 2), 'utf-8');
    console.log(`✓ Command results saved: ${commandResultsPath}`);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Identity Resolution: ${result.identity.resolutionStatus} (${Math.round(result.identity.identityConfidence * 100)}%)`);
    console.log(`Sources Attempted: ${result.sourceExecutions.length}`);
    console.log(`Sources Successful: ${result.sourceExecutions.filter(s => s.status === 'SUCCESS').length}`);
    console.log(`Raw Observations: ${result.rawObservations.length}`);
    console.log(`Reconciliation Cases: ${result.reconciliationCases.length}`);
    console.log(`Verified Metrics: ${result.verifiedMetrics.length}`);
    console.log(`Derived Metrics: ${result.derivedMetrics.length}`);
    console.log(`Overall Accuracy Score: ${result.scores.overallScore}/100`);
    console.log('='.repeat(60));

    // Print source execution details
    console.log('\nSource Execution Details:');
    for (const source of result.sourceExecutions) {
      const status = source.status === 'SUCCESS' ? '✓' : '✗';
      console.log(`  ${status} ${source.sourceId}: ${source.status} (${source.durationMs}ms)`);
      if (source.errors.length > 0) {
        console.log(`    Errors: ${source.errors.join(', ')}`);
      }
    }

    // Print critical issues
    if (result.validationVerdict.criticalIssues.length > 0) {
      console.log('\nCritical Issues:');
      for (const issue of result.validationVerdict.criticalIssues) {
        console.log(`  - ${issue}`);
      }
    }

    // Exit with appropriate code
    if (result.identity.resolutionStatus === 'BLOCKED') {
      console.error('\n❌ Validation failed: Identity resolution BLOCKED');
      process.exit(1);
    }

    if (result.sourceExecutions.filter(s => s.status === 'SUCCESS').length === 0) {
      console.error('\n❌ Validation failed: No sources successfully executed');
      process.exit(1);
    }

    console.log('\n✓ Validation completed successfully');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Validation failed:', error.message);
    
    // Write error to command results
    const evidenceDir = path.join(process.cwd(), 'architecture/evidence');
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }
    const commandResultsPath = path.join(evidenceDir, 'player-validation-command-results.json');
    fs.writeFileSync(commandResultsPath, JSON.stringify({
      command: `npm run fsrs:validate-player -- --player "${args.player}"${args.noCache ? ' --no-cache' : ''}${args.season ? ` --season "${args.season}"` : ''}`,
      exitCode: 1,
      artifact: null,
      status: 'FAILED',
      executedAt: new Date().toISOString(),
      error: error.message
    }, null, 2), 'utf-8');

    process.exit(1);
  }
}

main();
