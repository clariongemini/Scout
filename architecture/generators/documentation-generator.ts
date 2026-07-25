import * as fs from 'fs';
import * as path from 'path';
import { EvidenceCollection } from '../collectors/evidence-collector';
import { GateResult } from '../guardian/chief-guardian';

export class DocumentationGenerator {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  generateFromEvidence(evidenceCollection: EvidenceCollection): string {
    let markdown = `# ${evidenceCollection.testName} Evidence Report\n\n`;
    markdown += `**Test ID:** ${evidenceCollection.testId}\n`;
    markdown += `**Generated:** ${evidenceCollection.timestamp}\n\n`;
    markdown += `## Evidence\n\n`;

    if (evidenceCollection.evidence.length === 0) {
      markdown += `No evidence collected.\n`;
    } else {
      evidenceCollection.evidence.forEach(evidence => {
        markdown += `### ${evidence.source}\n`;
        markdown += `- **Type:** ${evidence.type}\n`;
        markdown += `- **Observation:** ${evidence.observation}\n`;
        markdown += `- **Timestamp:** ${evidence.timestamp}\n\n`;
      });
    }

    return markdown;
  }

  generateFromGateResult(gateResult: GateResult): string {
    let markdown = `# Architecture Gate Report\n\n`;
    markdown += `**Gate:** ${gateResult.gateName}\n`;
    markdown += `**Status:** ${gateResult.status}\n`;
    markdown += `**Generated:** ${new Date().toISOString()}\n\n`;

    markdown += `## Test Results\n\n`;
    gateResult.testResults.forEach(test => {
      markdown += `### ${test.testId}: ${test.testName}\n`;
      markdown += `- **Repository Evaluation:** ${test.repositoryEvaluation}\n`;
      markdown += `- **Validator Maturity:** ${test.validatorMaturity}\n`;
      markdown += `- **Capability Maturity:** ${test.capabilityMaturity}\n`;
      markdown += `- **Mutation Status:** ${test.mutationStatus}\n`;
      markdown += `- **Confidence:** ${test.confidence}\n`;
      markdown += `- **Evidence Count:** ${test.evidence.evidence.length}\n\n`;
    });

    if (gateResult.conditions && gateResult.conditions.length > 0) {
      markdown += `## Conditions\n\n`;
      gateResult.conditions.forEach(condition => {
        markdown += `- ${condition}\n`;
      });
      markdown += `\n`;
    }

    if (gateResult.blockingIssues && gateResult.blockingIssues.length > 0) {
      markdown += `## Blocking Issues\n\n`;
      gateResult.blockingIssues.forEach(issue => {
        markdown += `- ${issue}\n`;
      });
      markdown += `\n`;
    }

    return markdown;
  }

  generateFromManifest(manifest: any): string {
    let markdown = `# FSRS Architecture Manifest\n\n`;
    markdown += `**Version:** ${manifest.manifestVersion}\n`;
    markdown += `**FSRS Version:** ${manifest.fsrsVersion}\n`;
    markdown += `**Last Updated:** ${manifest.lastUpdated}\n\n`;

    markdown += `## Layers\n\n`;
    manifest.architecture.layers.forEach((layer: any) => {
      markdown += `### ${layer.id}: ${layer.name}\n`;
      markdown += `- **Status:** ${layer.status}\n`;
      markdown += `- **Components:** ${layer.components.join(', ')}\n\n`;
    });

    markdown += `## Tests\n\n`;
    manifest.tests.forEach((test: any) => {
      markdown += `### ${test.id}: ${test.name}\n`;
      markdown += `- **Status:** ${test.status}\n`;
      markdown += `- **Executable:** ${test.executable}\n\n`;
    });

    markdown += `## Gates\n\n`;
    manifest.gates.forEach((gate: any) => {
      markdown += `### ${gate.id}: ${gate.name}\n`;
      markdown += `- **Status:** ${gate.status}\n`;
      markdown += `- **Executable:** ${gate.executable}\n\n`;
    });

    return markdown;
  }

  saveDocumentation(content: string, filename: string): void {
    const docsDir = path.join(this.projectRoot, 'docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    const filepath = path.join(docsDir, filename);
    fs.writeFileSync(filepath, content);
  }

  generateAllDocumentation(): void {
    // Generate manifest documentation
    const manifestPath = path.join(this.projectRoot, 'architecture/manifest.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const manifestDoc = this.generateFromManifest(manifest);
      this.saveDocumentation(manifestDoc, 'ARCHITECTURE_MANIFEST.md');
    }

    // Generate gate reports
    const reportsDir = path.join(this.projectRoot, 'architecture/reports');
    if (fs.existsSync(reportsDir)) {
      const reportFiles = fs.readdirSync(reportsDir).filter(f => f.endsWith('.json'));
      reportFiles.forEach(file => {
        const reportPath = path.join(reportsDir, file);
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
        const gateDoc = this.generateFromGateResult(report);
        const filename = file.replace('.json', '.md');
        this.saveDocumentation(gateDoc, filename);
      });
    }

    // Generate evidence reports
    const evidenceDir = path.join(this.projectRoot, 'architecture/evidence');
    if (fs.existsSync(evidenceDir)) {
      const evidenceFiles = fs.readdirSync(evidenceDir).filter(f => f.endsWith('.json'));
      evidenceFiles.forEach(file => {
        const evidencePath = path.join(evidenceDir, file);
        const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf-8'));
        const evidenceDoc = this.generateFromEvidence(evidence);
        const filename = file.replace('.json', '.md');
        this.saveDocumentation(evidenceDoc, filename);
      });
    }
  }
}
