import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('ARCH-004: Provider Isolation', () => {
  const projectRoot = path.resolve(__dirname, '../../');
  
  it('removing a provider should only affect adapter layer', () => {
    const scoutEnginePath = path.join(projectRoot, 'server/engine/ScoutEngineV4.ts');
    const content = fs.readFileSync(scoutEnginePath, 'utf-8');
    
    // ScoutEngine should use adapters through interface, not direct provider logic
    expect(content).toMatch(/adapter|fetch/i);
    // Should not have provider-specific business logic
    expect(content).not.toMatch(/transfermarkt.*html.*parse|understat.*html.*parse/i);
  });

  it('adapters should implement common interface', () => {
    const baseAdapterPath = path.join(projectRoot, 'server/adapters/BaseAdapter.ts');
    const content = fs.readFileSync(baseAdapterPath, 'utf-8');
    
    // BaseAdapter should define common interface
    expect(content).toMatch(/class BaseAdapter|interface.*Adapter/i);
  });

  it('business logic should not depend on specific provider', () => {
    const metricExtractorPath = path.join(projectRoot, 'server/fsrs-v4/layer1-data/MetricExtractor.ts');
    const content = fs.readFileSync(metricExtractorPath, 'utf-8');
    
    // MetricExtractor should work with normalized data, not provider-specific
    expect(content).not.toMatch(/transfermarkt.*specific|understat.*specific/i);
  });

  it('provider changes should not require engine changes', () => {
    const adapterPath = path.join(projectRoot, 'server/adapters/TransfermarktAdapter.ts');
    const scoutEnginePath = path.join(projectRoot, 'server/engine/ScoutEngineV4.ts');
    
    const adapterContent = fs.readFileSync(adapterPath, 'utf-8');
    const scoutEngineContent = fs.readFileSync(scoutEnginePath, 'utf-8');
    
    // Adapter should have provider-specific logic
    expect(adapterContent).toMatch(/transfermarkt/i);
    
    // ScoutEngine should not have provider-specific logic
    expect(scoutEngineContent).not.toMatch(/transfermarkt.*html.*parse/i);
  });
});
