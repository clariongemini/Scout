import * as fs from 'fs';
import * as path from 'path';

export interface Evidence {
  source: string;
  line?: number;
  observation: string;
  type: 'code' | 'config' | 'runtime';
  timestamp: string;
}

export interface EvidenceCollection {
  testId: string;
  testName: string;
  evidence: Evidence[];
  timestamp: string;
}

export class EvidenceCollector {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  collectFromFile(filePath: string, pattern: RegExp, observation: string): Evidence[] {
    const evidence: Evidence[] = [];
    const fullPath = path.join(this.projectRoot, filePath);

    if (!fs.existsSync(fullPath)) {
      return evidence;
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        evidence.push({
          source: `${filePath}:${index + 1}`,
          line: index + 1,
          observation: observation,
          type: 'code',
          timestamp: new Date().toISOString()
        });
      }
    });

    return evidence;
  }

  collectFromDirectory(dirPath: string, pattern: RegExp, observation: string): Evidence[] {
    const evidence: Evidence[] = [];
    const fullPath = path.join(this.projectRoot, dirPath);

    if (!fs.existsSync(fullPath)) {
      return evidence;
    }

    const files = fs.readdirSync(fullPath);

    files.forEach(file => {
      const filePath = path.join(fullPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isFile() && file.endsWith('.ts') || file.endsWith('.tsx')) {
        const fileEvidence = this.collectFromFile(
          path.relative(this.projectRoot, filePath),
          pattern,
          observation
        );
        evidence.push(...fileEvidence);
      }
    });

    return evidence;
  }

  collectForTest(testId: string, testName: string): EvidenceCollection {
    const evidence: Evidence[] = [];

    // Collect evidence based on test ID
    switch (testId) {
      case 'ARCH-001':
        evidence.push(...this.collectFromFile(
          'server/fsrs-v4/layer1-data/MetricExtractor.ts',
          /goals.*90.*minutes|per90|derived/i,
          'Derived metric calculations found'
        ));
        evidence.push(...this.collectFromFile(
          'src/components/ScoutCardLayout.tsx',
          /metrics90|seasonPerformance|careerSummary/i,
          'Presentation layer consumes data objects'
        ));
        break;

      case 'ARCH-002':
        evidence.push(...this.collectFromFile(
          'src/components/ScoutCardLayout.tsx',
          /metrics90|seasonPerformance/i,
          'Presentation layer data consumption'
        ));
        evidence.push(...this.collectFromFile(
          'server/fsrs-v4/layer1-data/MetricExtractor.ts',
          /extract|metric/i,
          'Data intelligence layer operations'
        ));
        break;

      case 'ARCH-003':
        evidence.push(...this.collectFromFile(
          'server/engine/ScoutEngineV4.ts',
          /from.*adapters/i,
          'Dependency from layer 1 to layer 0'
        ));
        break;

      case 'ARCH-004':
        evidence.push(...this.collectFromFile(
          'server/adapters/BaseAdapter.ts',
          /class BaseAdapter|interface.*Adapter/i,
          'Common adapter interface'
        ));
        break;

      case 'ARCH-005':
        evidence.push(...this.collectFromFile(
          'server/engine/ScoutEngineV4.ts',
          /schemaVersion|version.*4\.0/i,
          'Schema version defined'
        ));
        break;

      default:
        // Generic evidence collection
        break;
    }

    return {
      testId,
      testName,
      evidence,
      timestamp: new Date().toISOString()
    };
  }

  saveEvidence(evidenceCollection: EvidenceCollection): void {
    const outputDir = path.join(this.projectRoot, 'architecture/evidence');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `${evidenceCollection.testId}-evidence.json`);
    fs.writeFileSync(outputPath, JSON.stringify(evidenceCollection, null, 2));
  }
}
