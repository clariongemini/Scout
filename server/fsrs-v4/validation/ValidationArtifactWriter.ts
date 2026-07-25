import { PlayerValidationResult, SourceExecutionResult } from './types';

export class ValidationArtifactWriter {
  buildSourceComparison(result: PlayerValidationResult): any {
    const comparison = {
      playerName: result.validationMetadata.playerName,
      validatedAt: result.validationMetadata.validatedAt,
      sources: result.sourceExecutions.map(s => ({
        sourceId: s.sourceId,
        status: s.status,
        durationMs: s.durationMs,
        fieldsExtracted: s.fieldsExtracted.length,
        errors: s.errors
      })),
      metricsBySource: this.groupMetricsBySource(result.rawObservations),
      conflicts: result.conflicts
    };
    return comparison;
  }

  private groupMetricsBySource(observations: any[]): any {
    const grouped: any = {};
    for (const obs of observations) {
      if (!grouped[obs.sourceId]) {
        grouped[obs.sourceId] = [];
      }
      grouped[obs.sourceId].push({
        metricId: obs.metricId,
        value: obs.value,
        scope: obs.scope
      });
    }
    return grouped;
  }
}
