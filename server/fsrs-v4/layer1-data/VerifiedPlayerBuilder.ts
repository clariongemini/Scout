import { ReconciliationCase } from './ReconciliationEngine';
import fs from 'fs';
import path from 'path';

export interface VerifiedPlayer {
  schemaVersion: string;
  recordType: string;
  recordId: string;
  playerName: string;
  canonicalId: string;
  verifiedAt: string;
  metrics: {
    [metricId: string]: {
      value: number | string | null;
      confidence: number;
      sources: string[];
      reconciliationCaseId?: string;
    }
  };
  derivedMetrics: {
    [metricId: string]: {
      value: number | null;
      formula: string;
    }
  };
  career: {
    totalMatches: number | null;
    totalGoals: number | null;
    totalAssists: number | null;
    totalMinutes: number | null;
  };
  contract: {
    expires: string | null;
    starts: string | null;
    shirtNumber: number | null;
  };
  physical: {
    heightCm: number | null;
  };
  injuries: {
    latestSeasonDays: number | null;
    latestSeasonCount: number | null;
    matchesMissed: number | null;
  };
  nationalTeam: {
    caps: number | null;
    goals: number | null;
  };
  limitations: string[];
  provenance: {
    sources: string[];
    retrievalWindow: string;
    dataQuality: 'high' | 'medium' | 'low';
    sourceIndependence: boolean;
  };
}

export class VerifiedPlayerBuilder {
  public buildVerifiedPlayer(
    playerName: string,
    canonicalId: string,
    reconciliationCases: ReconciliationCase[],
    derivedMetrics: Map<string, number | null> = new Map()
  ): VerifiedPlayer {
    const recordId = `verified-${canonicalId}-${Date.now()}`;
    const metrics: any = {};
    const sources = new Set<string>();
    const limitations: string[] = [];
    
    // Kariyer verileri
    let career = {
      totalMatches: null as number | null,
      totalGoals: null as number | null,
      totalAssists: null as number | null,
      totalMinutes: null as number | null
    };
    
    // Sözleşme verileri
    let contract = {
      expires: null as string | null,
      starts: null as string | null,
      shirtNumber: null as number | null
    };
    
    // Fiziksel veriler
    let physical = {
      heightCm: null as number | null
    };
    
    // Sakatlık verileri
    let injuries = {
      latestSeasonDays: null as number | null,
      latestSeasonCount: null as number | null,
      matchesMissed: null as number | null
    };
    
    // Milli takım verileri
    let nationalTeam = {
      caps: null as number | null,
      goals: null as number | null
    };

    for (const rc of reconciliationCases) {
      rc.observations.forEach(o => sources.add(o.source));

      if (rc.decision === 'verified' && rc.verifiedValue !== undefined) {
        metrics[rc.metricId] = {
          value: rc.verifiedValue,
          confidence: rc.confidence,
          sources: rc.observations.map(o => o.source),
          reconciliationCaseId: rc.caseId
        };
        
        // Kariyer verilerini ayır
        if (rc.metricId === 'career_matches') career.totalMatches = rc.verifiedValue as number;
        if (rc.metricId === 'career_goals') career.totalGoals = rc.verifiedValue as number;
        if (rc.metricId === 'career_assists') career.totalAssists = rc.verifiedValue as number;
        if (rc.metricId === 'career_minutes') career.totalMinutes = rc.verifiedValue as number;
        
        // Sözleşme verilerini ayır
        if (rc.metricId === 'contract_expires') contract.expires = rc.verifiedValue as string;
        if (rc.metricId === 'contract_start') contract.starts = rc.verifiedValue as string;
        if (rc.metricId === 'shirt_number') contract.shirtNumber = rc.verifiedValue as number;
        
        // Fiziksel verileri ayır
        if (rc.metricId === 'height_cm') physical.heightCm = rc.verifiedValue as number;
        
        // Sakatlık verilerini ayır
        if (rc.metricId === 'injury_days_latest') injuries.latestSeasonDays = rc.verifiedValue as number;
        if (rc.metricId === 'injury_count_latest') injuries.latestSeasonCount = rc.verifiedValue as number;
        if (rc.metricId === 'matches_missed_latest') injuries.matchesMissed = rc.verifiedValue as number;
        
        // Milli takım verilerini ayır
        if (rc.metricId === 'national_team_caps') nationalTeam.caps = rc.verifiedValue as number;
        if (rc.metricId === 'national_team_goals') nationalTeam.goals = rc.verifiedValue as number;
        
      } else if (rc.decision === 'conflict') {
        metrics[rc.metricId] = {
          value: null,
          confidence: 0,
          sources: rc.observations.map(o => o.source),
          reconciliationCaseId: rc.caseId
        };
        limitations.push(`Metric ${rc.metricId} has conflicting values from sources: ${rc.observations.map(o => o.source).join(', ')}`);
      }
    }

    // Derived metrics (hesaplanan metrikler)
    const derivedMetricsObj: any = {};
    for (const [metricId, value] of derivedMetrics.entries()) {
      derivedMetricsObj[metricId] = {
        value: value,
        formula: this.getFormula(metricId)
      };
    }

    // Data quality assessment
    const dataQuality = this.assessDataQuality(reconciliationCases);
    
    // Source independence kontrolü
    const sourceIndependence = this.checkSourceIndependence(sources);

    return {
      schemaVersion: '4.0.0',
      recordType: 'verified_player',
      recordId,
      playerName,
      canonicalId,
      verifiedAt: new Date().toISOString(),
      metrics,
      derivedMetrics: derivedMetricsObj,
      career,
      contract,
      physical,
      injuries,
      nationalTeam,
      limitations,
      provenance: {
        sources: Array.from(sources),
        retrievalWindow: 'current-season',
        dataQuality,
        sourceIndependence
      }
    };
  }

  private getFormula(metricId: string): string {
    const formulas: Record<string, string> = {
      'goals_per90': 'goals * 90 / minutes',
      'assists_per90': 'assists * 90 / minutes',
      'xG_per90': 'xG * 90 / minutes',
      'xA_per90': 'xA * 90 / minutes',
      'shots_per90': 'shots * 90 / minutes',
      'key_passes_per90': 'key_passes * 90 / minutes'
    };
    return formulas[metricId] || 'unknown';
  }

  private assessDataQuality(cases: ReconciliationCase[]): 'high' | 'medium' | 'low' {
    const verifiedCount = cases.filter(c => c.decision === 'verified').length;
    const conflictCount = cases.filter(c => c.decision === 'conflict').length;
    const total = cases.length;

    if (total === 0) return 'low';
    if (verifiedCount / total >= 0.9) return 'high';
    if (verifiedCount / total >= 0.7) return 'medium';
    return 'low';
  }

  private checkSourceIndependence(sources: Set<string>): boolean {
    // En az 2 farklı independence group varsa independent kabul et
    const independenceGroups = new Set<string>();
    const groupMap: Record<string, string> = {
      'understat': 'provider_specific',
      'fotmob': 'provider_specific',
      'transfermarkt': 'database_specific',
      'statbunker': 'official',
      'soccerway': 'database_specific'
    };
    
    for (const source of sources) {
      independenceGroups.add(groupMap[source] || 'unknown');
    }
    
    return independenceGroups.size >= 2;
  }

  public saveVerifiedPlayer(verifiedPlayer: VerifiedPlayer, outputDir: string) {
    const filePath = path.join(outputDir, `${verifiedPlayer.recordId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(verifiedPlayer, null, 2), 'utf8');
    return filePath;
  }
}
