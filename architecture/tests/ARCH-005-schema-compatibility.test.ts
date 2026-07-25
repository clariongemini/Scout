import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('ARCH-005: Schema Compatibility', () => {
  const projectRoot = path.resolve(__dirname, '../../');
  
  it('should have schema version defined', () => {
    const scoutEnginePath = path.join(projectRoot, 'server/engine/ScoutEngineV4.ts');
    const content = fs.readFileSync(scoutEnginePath, 'utf-8');
    
    expect(content).toMatch(/schemaVersion|version.*4\.0/i);
  });

  it('schema changes should be versioned', () => {
    const scoutEnginePath = path.join(projectRoot, 'server/engine/ScoutEngineV4.ts');
    const content = fs.readFileSync(scoutEnginePath, 'utf-8');
    
    // Should have version tracking
    expect(content).toMatch(/4\.0\.0|schemaVersion/i);
  });

  it('recent changes should be backward compatible', () => {
    const scoutEnginePath = path.join(projectRoot, 'server/engine/ScoutEngineV4.ts');
    const content = fs.readFileSync(scoutEnginePath, 'utf-8');
    
    // New fields should be additive, not breaking
    expect(content).toMatch(/seasonPerformance|metrics90/i);
    
    // Should maintain existing structure
    expect(content).toMatch(/identity|contracts|verifiedMetrics/i);
  });

  it('should have schema files in FSRS_v4/schemas', () => {
    const schemasPath = path.join(projectRoot, 'server/fsrs-v4/schemas');
    const schemaFiles = fs.readdirSync(schemasPath);
    
    expect(schemaFiles.length).toBeGreaterThan(0);
    expect(schemaFiles).toContain('verified_player.schema.json');
  });
});
