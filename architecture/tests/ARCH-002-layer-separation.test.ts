import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('ARCH-002: Layer Separation', () => {
  const projectRoot = path.resolve(__dirname, '../../');
  
  it('presentation layer should not calculate metrics', () => {
    const presentationPath = path.join(projectRoot, 'src/components/ScoutCardLayout.tsx');
    const content = fs.readFileSync(presentationPath, 'utf-8');
    
    // Presentation layer should not have metric calculation logic
    expect(content).not.toMatch(/calculate.*metric|compute.*stat|derive.*metric/i);
  });

  it('presentation layer should only consume data objects', () => {
    const presentationPath = path.join(projectRoot, 'src/components/ScoutCardLayout.tsx');
    const content = fs.readFileSync(presentationPath, 'utf-8');
    
    // Should consume data objects like metrics90, seasonPerformance
    expect(content).toMatch(/metrics90|seasonPerformance|careerSummary/i);
  });

  it('data intelligence layer should not import presentation components', () => {
    const dataIntelligencePath = path.join(projectRoot, 'server/fsrs-v4/layer1-data/MetricExtractor.ts');
    const content = fs.readFileSync(dataIntelligencePath, 'utf-8');
    
    // Should not import presentation components
    expect(content).not.toMatch(/from.*components.*ScoutCardLayout|import.*ScoutCardLayout/i);
  });

  it('layer 0 should only handle raw data collection', () => {
    const adapterPath = path.join(projectRoot, 'server/adapters/TransfermarktAdapter.ts');
    const content = fs.readFileSync(adapterPath, 'utf-8');
    
    // Adapters should only fetch and normalize raw data
    expect(content).toMatch(/fetchHtml|normalize|raw/i);
    // Should not have business logic
    expect(content).not.toMatch(/reconcile|verified|decision/i);
  });
});
