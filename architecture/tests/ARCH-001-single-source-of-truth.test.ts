import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('ARCH-001: Single Source of Truth', () => {
  const projectRoot = path.resolve(__dirname, '../../');
  
  it('should not calculate derived metrics in multiple locations', () => {
    // Check if derived metrics are calculated only in MetricExtractor
    const metricExtractorPath = path.join(projectRoot, 'server/fsrs-v4/layer1-data/MetricExtractor.ts');
    const scoutEnginePath = path.join(projectRoot, 'server/engine/ScoutEngineV4.ts');
    const presentationPath = path.join(projectRoot, 'src/components/ScoutCardLayout.tsx');
    
    const metricExtractorContent = fs.readFileSync(metricExtractorPath, 'utf-8');
    const scoutEngineContent = fs.readFileSync(scoutEnginePath, 'utf-8');
    const presentationContent = fs.readFileSync(presentationPath, 'utf-8');
    
    // MetricExtractor should have derived metric calculations
    expect(metricExtractorContent).toMatch(/goals.*90.*minutes|per90|derived/i);
    
    // Presentation layer should NOT have metric calculations
    expect(presentationContent).not.toMatch(/goals.*\*.*90.*\/.*minutes|calculate.*per90|derived.*metric/i);
  });

  it('should have single canonical data location for verified player', () => {
    // Check if VerifiedPlayerBuilder is the single source
    const verifiedPlayerBuilderPath = path.join(projectRoot, 'server/fsrs-v4/layer1-data/VerifiedPlayerBuilder.ts');
    const content = fs.readFileSync(verifiedPlayerBuilderPath, 'utf-8');
    
    expect(content).toMatch(/VerifiedPlayer|build.*verified/i);
  });

  it('should not duplicate data in data pipeline', () => {
    // Check for data duplication patterns
    const scoutEnginePath = path.join(projectRoot, 'server/engine/ScoutEngineV4.ts');
    const content = fs.readFileSync(scoutEnginePath, 'utf-8');
    
    // Should not have multiple assignments to same data structure
    const duplicatePattern = /verifiedPlayer.*=.*\{[\s\S]*?\}[\s\S]*?verifiedPlayer.*=.*\{/;
    const matches = content.match(duplicatePattern);
    
    expect(matches).toBeNull();
  });
});
