import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface MetricObservation {
  metricId: string;
  value: number | string | null;
  source: string;
  scope: {
    season: string;
    competition: string;
    position?: string;
    minutes?: number;
  };
  definitionVersion: string;
  retrievedAt: string;
  // Lineage tracking - mandatory for all metrics
  sourceObservationIds: string[];
  sourceSnapshotId?: string;
  observationReliability?: number;
}

export interface ReconciliationCase {
  caseId: string;
  metricId: string;
  observations: MetricObservation[];
  decision: 'verified' | 'conflict' | 'estimated';
  verifiedValue?: number | string;
  confidence: number;
  reason: string;
  createdAt: string;
}

export class ReconciliationEngine {
  private toleranceMap: Map<string, number>;
  private sourceReliabilityMap: Map<string, number>; // 0-1 scale
  private sourceIndependenceMap: Map<string, string>; // independence groups

  constructor() {
    this.toleranceMap = new Map();
    this.sourceReliabilityMap = new Map();
    this.sourceIndependenceMap = new Map();
    this.loadToleranceRules();
    this.loadSourceReliability();
  }

  private loadToleranceRules() {
    // FSRS_v4 tolerance rules
    this.toleranceMap.set('goals', 0);
    this.toleranceMap.set('assists', 0);
    this.toleranceMap.set('matches', 0);
    this.toleranceMap.set('minutes', 5); // 5 dakika tolerans
    this.toleranceMap.set('xG', 0.1);
    this.toleranceMap.set('xA', 0.1);
    this.toleranceMap.set('rating', 0.05);
  }

  private loadSourceReliability() {
    // FSRS_v4 source registry reliability tiers
    // A = 1.0, B = 0.8, C = 0.6, ESTIMATED = 0.3
    this.sourceReliabilityMap.set('official_competition', 1.0);
    this.sourceReliabilityMap.set('licensed_event', 1.0);
    this.sourceReliabilityMap.set('structured_public', 0.8);
    this.sourceReliabilityMap.set ('transfer_database', 0.8);
    this.sourceReliabilityMap.set('reputable_media', 0.6);
    this.sourceReliabilityMap.set('model_estimate', 0.3);

    // Map specific sources to classes
    this.sourceReliabilityMap.set('understat', 0.8); // structured_public
    this.sourceReliabilityMap.set('transfermarkt', 0.8); // transfer_database
    this.sourceReliabilityMap.set('fbref', 0.9); // structured_public (high quality)
    this.sourceReliabilityMap.set('whoscored', 0.85); // structured_public (rating focused)
    this.sourceReliabilityMap.set('squawka', 0.85); // licensed_event (Opta powered)
    this.sourceReliabilityMap.set('besoccer', 0.8); // structured_public

    // Source independence groups
    this.sourceIndependenceMap.set('understat', 'provider_specific');
    this.sourceIndependenceMap.set('transfermarkt', 'database_specific');
    this.sourceIndependenceMap.set('fbref', 'database_specific');
    this.sourceIndependenceMap.set('whoscored', 'provider_specific');
    this.sourceIndependenceMap.set('squawka', 'licensed_event');
    this.sourceIndependenceMap.set('besoccer', 'database_specific');
  }

  private getSourceReliability(source: string): number {
    return this.sourceReliabilityMap.get(source) || 0.5;
  }

  private getSourceIndependence(source: string): string {
    return this.sourceIndependenceMap.get(source) || 'unknown';
  }

  public reconcile(observations: MetricObservation[]): ReconciliationCase {
    const caseId = this.generateCaseId(observations);
    const metricId = observations[0]?.metricId || 'unknown';

    // Eğer tek observation varsa doğrudan verified
    if (observations.length === 1) {
      const source = observations[0].source;
      const reliability = this.getSourceReliability(source);
      return {
        caseId,
        metricId,
        observations,
        decision: 'verified',
        verifiedValue: observations[0].value || undefined,
        confidence: reliability,
        reason: `Single source observation (reliability: ${reliability})`,
        createdAt: new Date().toISOString()
      };
    }

    // Çoklu kaynak - reconciliation
    const validObservations = observations.filter(o => o.value !== null);
    const values = validObservations.map(o => o.value);

    if (values.length === 0) {
      return {
        caseId,
        metricId,
        observations,
        decision: 'conflict',
        confidence: 0,
        reason: 'All observations are null',
        createdAt: new Date().toISOString()
      };
    }

    // Eğer sadece bir kaynak geçerli değere sahipse, onu kullan
    if (validObservations.length === 1) {
      const obs = validObservations[0];
      const reliability = this.getSourceReliability(obs.source);
      return {
        caseId,
        metricId,
        observations,
        decision: 'verified',
        verifiedValue: obs.value,
        confidence: reliability,
        reason: `Single valid source observation (reliability: ${reliability})`,
        createdAt: new Date().toISOString()
      };
    }

    // String değerler için (tarihler vb.) - ilk değeri kullan
    if (typeof values[0] === 'string') {
      return {
        caseId,
        metricId,
        observations,
        decision: 'verified',
        verifiedValue: values[0] as any,
        confidence: 0.8,
        reason: 'String value - using first source',
        createdAt: new Date().toISOString()
      };
    }

    // Sayısal değerler için tolerans kontrolü
    const numericValues = values as number[];
    const tolerance = this.toleranceMap.get(metricId) || 0;
    const maxDiff = Math.max(...numericValues) - Math.min(...numericValues);

    // Source independence kontrolü
    const independenceGroups = new Set(observations.map(o => this.getSourceIndependence(o.source)));
    const isIndependent = independenceGroups.size > 1;

    if (maxDiff <= tolerance) {
      // Tolerans içinde - ortalama al
      const avgValue = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      const confidence = isIndependent ? 0.95 : 0.85;
      return {
        caseId,
        metricId,
        observations,
        decision: 'verified',
        verifiedValue: avgValue,
        confidence,
        reason: `Values within tolerance (${maxDiff} <= ${tolerance}), independent: ${isIndependent}`,
        createdAt: new Date().toISOString()
      };
    }

    // Tolerans dışı - en güvenilir kaynağı seç
    const bestSource = observations.reduce((best, obs) => {
      const reliability = this.getSourceReliability(obs.source);
      return reliability > this.getSourceReliability(best.source) ? obs : best;
    });
    
    return {
      caseId,
      metricId,
      observations,
      decision: 'verified',
      verifiedValue: bestSource.value as number,
      confidence: this.getSourceReliability(bestSource.source),
      reason: `Values exceed tolerance (${maxDiff} > ${tolerance}), using most reliable source: ${bestSource.source}`,
      createdAt: new Date().toISOString()
    };
  }

  private generateCaseId(observations: MetricObservation[]): string {
    const sources = observations.map(o => o.source).sort().join('-');
    const metricId = observations[0]?.metricId || 'unknown';
    const hash = crypto
      .createHash('sha256')
      .update(`${metricId}-${sources}-${Date.now()}`)
      .digest('hex')
      .substring(0, 12);
    return `case-${hash}`;
  }

  public saveReconciliationCase(reconciliationCase: ReconciliationCase, outputDir: string) {
    const filePath = path.join(outputDir, `${reconciliationCase.caseId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(reconciliationCase, null, 2), 'utf8');
    return filePath;
  }
}
