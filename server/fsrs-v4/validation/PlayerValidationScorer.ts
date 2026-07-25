import { PlayerValidationResult, ManualFieldComparison, AccuracyScores } from './types';

export class PlayerValidationScorer {
  /**
   * Perform manual field comparison against reference sources
   * This would typically involve fetching reference data from official sources
   * For now, we'll implement the structure and scoring logic
   */
  public performManualComparisons(result: PlayerValidationResult): ManualFieldComparison[] {
    const comparisons: ManualFieldComparison[] = [];

    // Extract system values from the validation result
    const tmData = result.rawSnapshots && result.rawSnapshots.length > 0 ? result.rawSnapshots.find(s => s && s.name) || {} : {};
    const verifiedPlayer = result.verifiedPlayer || {};
    const playerName = result.validationMetadata?.playerName || 'unknown';

    // Fields to compare (18 critical fields as specified)
    const fieldsToCompare = [
      { field: 'fullName', systemValue: tmData.name || playerName },
      { field: 'dateOfBirth', systemValue: this.parseDate(tmData.dateOfBirth) },
      { field: 'age', systemValue: this.calculateAge(tmData.dateOfBirth) },
      { field: 'nationality', systemValue: tmData.primaryNationality },
      { field: 'height', systemValue: this.parseHeight(tmData.height) },
      { field: 'preferredFoot', systemValue: tmData.foot },
      { field: 'currentClub', systemValue: tmData.currentClub },
      { field: 'league', systemValue: tmData.leagueName },
      { field: 'primaryPosition', systemValue: tmData.position },
      { field: 'secondaryPositions', systemValue: tmData.secondaryPositions?.join(', ') },
      { field: 'shirtNumber', systemValue: tmData.shirtNumber },
      { field: 'contractStart', systemValue: this.parseDate(tmData.contractStart) },
      { field: 'contractExpiry', systemValue: this.parseDate(tmData.contractExpires) },
      { field: 'marketValue', systemValue: this.parseMarketValue(tmData.marketValue) },
      { field: 'latestSeasonMatches', systemValue: this.getMetricValue(result, 'matches') },
      { field: 'latestSeasonMinutes', systemValue: this.getMetricValue(result, 'minutes') },
      { field: 'latestSeasonGoals', systemValue: this.getMetricValue(result, 'goals') },
      { field: 'latestSeasonAssists', systemValue: this.getMetricValue(result, 'assists') },
      { field: 'nationalTeamCaps', systemValue: this.getMetricValue(result, 'national_team_caps') },
      { field: 'nationalTeamGoals', systemValue: this.getMetricValue(result, 'national_team_goals') },
      { field: 'latestInjuryRecord', systemValue: this.getLatestInjury(tmData.injurySummaryBySeason) }
    ];

    // For each field, we would normally fetch reference data
    // For now, we'll mark them as UNVERIFIABLE since we don't have reference sources
    for (const fieldData of fieldsToCompare) {
      comparisons.push({
        field: fieldData.field,
        systemValue: fieldData.systemValue,
        referenceValue: null,
        referenceSourceId: 'manual_verification_required',
        referenceUrl: '',
        referenceRetrievedAt: new Date().toISOString(),
        referenceSnapshotId: '',
        verdict: 'UNVERIFIABLE',
        notes: 'Manual verification against reference source required'
      });
    }

    return comparisons;
  }

  /**
   * Calculate accuracy scores based on manual comparisons
   */
  public calculateAccuracyScores(result: PlayerValidationResult, comparisons: ManualFieldComparison[]): AccuracyScores {
    const exactMatches = comparisons.filter(c => c.verdict === 'EXACT').length;
    const toleranceMatches = comparisons.filter(c => c.verdict === 'TOLERANCE_MATCH').length;
    const mismatches = comparisons.filter(c => c.verdict === 'MISMATCH').length;
    const unverifiable = comparisons.filter(c => c.verdict === 'UNVERIFIABLE').length;
    const total = comparisons.length;

    const fieldAccuracy = total > 0 ? ((exactMatches + toleranceMatches) / total) * 100 : 0;

    // Update the scores in the result
    const scores: AccuracyScores = {
      pipelineQualityScore: 0, // Will be calculated
      dataAccuracyScore: null, // Will be calculated if sufficient comparisons
      dataAccuracyStatus: 'INSUFFICIENT_REFERENCE_EVIDENCE',
      identityAccuracy: result.scores.identityAccuracy,
      fieldAccuracy: Math.round(fieldAccuracy),
      metricAccuracy: result.scores.metricAccuracy,
      scopeAccuracy: result.scores.scopeAccuracy,
      provenanceCompleteness: result.scores.provenanceCompleteness,
      registryCoverage: result.scores.registryCoverage,
      sourceExecutionQuality: result.scores.sourceExecutionQuality,
      reconciliationQuality: result.scores.reconciliationQuality,
      derivedMetricIntegrity: result.scores.derivedMetricIntegrity,
      auditability: result.scores.auditability,
      overallScore: null // Will be recalculated
    };

    // Recalculate overall score with updated field accuracy
    scores.overallScore = this.calculateOverallScore(scores);

    return scores;
  }

  private parseDate(dateStr: string): string | null {
    if (!dateStr) return null;
    // Turkish date format: "3 Nis 1999" -> "1999-04-03"
    const months: Record<string, string> = {
      'Oca': '01', 'Şub': '02', 'Mar': '03', 'Nis': '04',
      'May': '05', 'Haz': '06', 'Tem': '07', 'Ağu': '08',
      'Eyl': '09', 'Eki': '10', 'Kas': '11', 'Ara': '12'
    };
    
    const parts = dateStr.split(' ');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = months[parts[1]] || '01';
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    return dateStr;
  }

  private calculateAge(dateStr: string): number | null {
    if (!dateStr) return null;
    const parsed = this.parseDate(dateStr);
    if (!parsed) return null;
    
    const birthDate = new Date(parsed);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  private parseHeight(heightStr: string): number | null {
    if (!heightStr) return null;
    // "1,84 m" -> 184
    const match = heightStr.match(/[\d.,]+/);
    if (match) {
      const num = parseFloat(match[0].replace(',', '.'));
      return Math.round(num * 100);
    }
    return null;
  }

  private parseMarketValue(mvString: string): number | null {
    if (!mvString) return null;
    // "7.00 mil. €" -> 7000000
    const match = mvString.match(/[\d.]+/);
    if (match) {
      const value = parseFloat(match[0]);
      if (mvString.includes('mil')) {
        return Math.round(value * 1000000);
      }
      return value;
    }
    return null;
  }

  private getMetricValue(result: PlayerValidationResult, metricId: string): number | null {
    if (!result.verifiedMetrics || !Array.isArray(result.verifiedMetrics)) {
      return null;
    }
    const metric = result.verifiedMetrics.find(m => m.metricId === metricId);
    return metric?.value !== null && metric?.value !== undefined ? Number(metric.value) : null;
  }

  private getLatestInjury(injurySummary: any[]): string | null {
    if (!injurySummary || injurySummary.length === 0) return null;
    const latest = injurySummary[0];
    return `${latest.injury} (${latest.days} days, ${latest.matchesMissed} matches missed)`;
  }

  private calculateOverallScore(scores: AccuracyScores): number | null {
    // If data accuracy is not scored, return null
    if (scores.dataAccuracyStatus !== 'SCORED') {
      return null;
    }

    const weights: Record<string, number> = {
      identityAccuracy: 0.15,
      fieldAccuracy: 0.15,
      metricAccuracy: 0.15,
      scopeAccuracy: 0.15,
      provenanceCompleteness: 0.10,
      registryCoverage: 0.10,
      sourceExecutionQuality: 0.10,
      reconciliationQuality: 0.10,
      derivedMetricIntegrity: 0.05,
      auditability: 0.05
    };

    let total = 0;
    for (const [key, weight] of Object.entries(weights)) {
      const value = scores[key as keyof AccuracyScores];
      if (typeof value === 'number') {
        total += value * weight;
      }
    }
    return Math.round(total);
  }
}
