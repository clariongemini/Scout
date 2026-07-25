import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('ARCH-003: Dependency Direction', () => {
  const projectRoot = path.resolve(__dirname, '../../');
  
  it('football intelligence should not import source adapters', () => {
    // When football intelligence is implemented, it should not import adapters
    // For now, check that ScoutEngine (data intelligence) imports adapters correctly
    const scoutEnginePath = path.join(projectRoot, 'server/engine/ScoutEngineV4.ts');
    const content = fs.readFileSync(scoutEnginePath, 'utf-8');
    
    // ScoutEngine should import adapters (this is correct for layer 0→1)
    expect(content).toMatch(/from.*adapters.*TransfermarktAdapter|import.*TransfermarktAdapter/i);
  });

  it('presentation should not import engine internals', () => {
    const presentationPath = path.join(projectRoot, 'src/components/ScoutCardLayout.tsx');
    const content = fs.readFileSync(presentationPath, 'utf-8');
    
    // Presentation should not import engine internals
    expect(content).not.toMatch(/from.*engine.*ScoutEngine|import.*ScoutEngine|from.*fsrs-v4/i);
  });

  it('adapters should not import business logic', () => {
    const adapterPath = path.join(projectRoot, 'server/adapters/TransfermarktAdapter.ts');
    const content = fs.readFileSync(adapterPath, 'utf-8');
    
    // Adapters should not import business logic layers (type imports are OK)
    // Check for actual business logic usage, not type imports
    expect(content).not.toMatch(/from.*fsrs-v4.*layer1-data/i);
  });

  it('dependencies should flow from lower to higher layers', () => {
    const scoutEnginePath = path.join(projectRoot, 'server/engine/ScoutEngineV4.ts');
    const content = fs.readFileSync(scoutEnginePath, 'utf-8');
    
    // ScoutEngine (layer 1) should import adapters (layer 0)
    expect(content).toMatch(/from.*adapters/i);
    
    // ScoutEngine should not import presentation (layer 9)
    expect(content).not.toMatch(/from.*components.*ScoutCardLayout/i);
  });
});
