import { describe, it, expect } from 'vitest';
import { ADRGenerator } from '../generators/adr-generator';

describe('ADR Generator Classification', () => {
  const generator = new ADRGenerator('/tmp/test');

  it('normal contract failure should return REMEDIATION_TASK, no ADR', () => {
    const result = generator.generateADRFromTestFailure('ARCH-999', 'Simple Contract Failure', ['Missing field']);
    expect(result).toBeNull();
  });

  it('registry typo should return REMEDIATION_TASK, no ADR', () => {
    const result = generator.generateADRFromTestFailure('ARCH-999', 'Registry Typo', ['Typo in registry']);
    expect(result).toBeNull();
  });

  it('new registry strategy should return ADR_CANDIDATE, draft ADR exists', () => {
    const result = generator.generateADRFromTestFailure('ARCH-007', 'Metric Registry Coverage', ['Registry not integrated']);
    expect(result).not.toBeNull();
    expect(result?.status).toBe('DRAFT');
    expect(result?.classification).toBe('ADR_CANDIDATE');
    expect(result?.architectureImpact).toBe(true);
    expect(result?.longTermConsequence).toBe(true);
    expect(result?.decisionOwnerRequired).toBe(true);
    expect(result?.decision.alternatives.length).toBeGreaterThanOrEqual(2);
  });

  it('layer dependency policy change should return ADR_CANDIDATE, draft ADR exists', () => {
    const result = generator.generateADRFromTestFailure('ARCH-002', 'Layer Separation', ['Cross-layer import']);
    expect(result).not.toBeNull();
    expect(result?.status).toBe('DRAFT');
    expect(result?.classification).toBe('ADR_CANDIDATE');
    expect(result?.architectureImpact).toBe(true);
    expect(result?.longTermConsequence).toBe(true);
    expect(result?.decisionOwnerRequired).toBe(true);
    expect(result?.decision.alternatives.length).toBeGreaterThanOrEqual(2);
  });

  it('ADR status should never be ACCEPTED, SUPERSEDED, or REJECTED automatically', () => {
    const result = generator.generateADRFromTestFailure('ARCH-007', 'Metric Registry Coverage', ['Registry not integrated']);
    expect(result).not.toBeNull();
    expect(result?.status).not.toBe('ACCEPTED');
    expect(result?.status).not.toBe('SUPERSEDED');
    expect(result?.status).not.toBe('REJECTED');
    expect(result?.status).toBe('DRAFT');
  });
});
