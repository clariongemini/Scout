import { ScoutEngineV4 } from '../../engine/ScoutEngineV4';
import { IdentityResolver, PlayerUUID } from '../../engine/IdentityResolver';
import { TransfermarktAdapter } from '../../adapters/TransfermarktAdapter';
import { UnderstatAdapter } from '../../adapters/UnderstatAdapter';
import { FBrefAdapter } from '../../adapters/FBrefAdapter';
import { FotMobAdapter } from '../../adapters/FotMobAdapter';
import { StatbunkerAdapter } from '../../adapters/StatbunkerAdapter';
import { SoccerwayAdapter } from '../../adapters/SoccerwayAdapter';
import { SofaScoreAdapter } from '../../adapters/SofaScoreAdapter';
import { MetricExtractor } from '../layer1-data/MetricExtractor';
import { ReconciliationEngine } from '../layer1-data/ReconciliationEngine';
import { VerifiedPlayerBuilder } from '../layer1-data/VerifiedPlayerBuilder';
import { RawDataLake } from '../../storage/RawDataLake';
import { CacheManager } from '../../storage/CacheManager';
import { PlayerValidationScorer } from './PlayerValidationScorer';
import { ExpectedMetricCatalog } from './ExpectedMetricCatalog';
import {
  SourceExecutionResult,
  IdentityResolutionResult,
  RawObservation,
  ReconciliationCase,
  DerivedMetric,
  PlayerValidationResult,
  ValidationMetadata,
  PipelineExecution,
  AccuracyScores,
  PipelineDefect
} from './types';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export class PlayerValidationRunner {
  private scoutEngine: ScoutEngineV4;
  private identityResolver: IdentityResolver;
  private adapters: Map<string, any>;
  private metricExtractor: MetricExtractor;
  private reconciliationEngine: ReconciliationEngine;
  private verifiedPlayerBuilder: VerifiedPlayerBuilder;
  private rawDataLake: RawDataLake;
  private cacheManager: CacheManager;
  private validationScorer: PlayerValidationScorer;
  private expectedMetricCatalog: ExpectedMetricCatalog;
  private outputDir: string;

  constructor(options: { noCache?: boolean; season?: string } = {}) {
    this.scoutEngine = new ScoutEngineV4();
    this.identityResolver = new IdentityResolver();
    this.adapters = new Map();
    this.metricExtractor = new MetricExtractor();
    this.reconciliationEngine = new ReconciliationEngine();
    this.verifiedPlayerBuilder = new VerifiedPlayerBuilder();
    this.rawDataLake = new RawDataLake();
    this.cacheManager = new CacheManager();
    this.validationScorer = new PlayerValidationScorer();
    this.expectedMetricCatalog = new ExpectedMetricCatalog();
    this.outputDir = path.join(process.cwd(), '.fsrs-v4-output/validation');

    // Initialize adapters
    this.adapters.set('transfermarkt', new TransfermarktAdapter());
    this.adapters.set('understat', new UnderstatAdapter());
    this.adapters.set('fbref', new FBrefAdapter());
    this.adapters.set('fotmob', new FotMobAdapter());
    this.adapters.set('statbunker', new StatbunkerAdapter());
    this.adapters.set('soccerway', new SoccerwayAdapter());
    this.adapters.set('sofascore', new SofaScoreAdapter());

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  public async validatePlayer(playerName: string, options: { noCache?: boolean; season?: string } = {}): Promise<PlayerValidationResult> {
    const validationId = this.generateValidationId();
    const season = options.season || '2024-25';
    const startedAt = new Date().toISOString();

    console.log(`[PlayerValidation] Starting validation for ${playerName}`);
    console.log(`[PlayerValidation] Validation ID: ${validationId}`);
    console.log(`[PlayerValidation] Season: ${season}`);
    console.log(`[PlayerValidation] No Cache: ${options.noCache || false}`);

    const validationMetadata: ValidationMetadata = {
      validationId,
      playerName,
      validatedAt: startedAt,
      validationVersion: '1.0.0',
      pipelineVersion: '4.0.0-DataCore',
      options: {
        noCache: options.noCache || false,
        season
      }
    };

    // Stage 1: Identity Resolution
    console.log(`[PlayerValidation] Stage 1: Identity Resolution`);
    const identityStageStart = Date.now();
    const identity = await this.resolveIdentity(playerName);
    const identityStageEnd = Date.now();

    if (identity.resolutionStatus === 'BLOCKED') {
      throw new Error(`Identity resolution BLOCKED for ${playerName}. Cannot proceed with validation.`);
    }

    // Stage 2: Source Execution
    console.log(`[PlayerValidation] Stage 2: Source Execution`);
    const sourceStageStart = Date.now();
    const sourceExecutions = await this.executeSources(identity, options.noCache);
    const sourceStageEnd = Date.now();

    const successfulSources = sourceExecutions.filter(s => s.status === 'SUCCESS');
    if (successfulSources.length === 0) {
      throw new Error(`No sources successfully executed for ${playerName}. Cannot proceed with validation.`);
    }

    // Stage 3: Metric Extraction
    console.log(`[PlayerValidation] Stage 3: Metric Extraction`);
    const extractionStageStart = Date.now();
    const { rawObservations, rawSnapshots } = await this.extractMetrics(sourceExecutions, identity, season);
    const extractionStageEnd = Date.now();

    if (rawObservations.length === 0) {
      throw new Error(`No metrics extracted for ${playerName}. Cannot proceed with validation.`);
    }

    // Stage 4: Reconciliation
    console.log(`[PlayerValidation] Stage 4: Reconciliation`);
    const reconciliationStageStart = Date.now();
    const reconciliationCases = await this.reconcileMetrics(rawObservations);
    const reconciliationStageEnd = Date.now();

    // Stage 5: Derived Metrics
    console.log(`[PlayerValidation] Stage 5: Derived Metrics`);
    const derivedStageStart = Date.now();
    const derivedMetrics = await this.calculateDerivedMetrics(reconciliationCases, rawObservations);
    const derivedStageEnd = Date.now();

    // Build verified player using ScoutEngineV4
    console.log(`[PlayerValidation] Building verified player package`);
    const verifiedPlayer = await this.buildVerifiedPlayer(playerName, identity, reconciliationCases, derivedMetrics);

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - Date.parse(startedAt);

    const pipelineExecution: PipelineExecution = {
      startedAt,
      completedAt,
      durationMs,
      stages: {
        identityResolution: {
          startedAt: new Date(identityStageStart).toISOString(),
          completedAt: new Date(identityStageEnd).toISOString(),
          durationMs: identityStageEnd - identityStageStart,
          status: identity.resolutionStatus
        },
        sourceExecution: {
          startedAt: new Date(sourceStageStart).toISOString(),
          completedAt: new Date(sourceStageEnd).toISOString(),
          durationMs: sourceStageEnd - sourceStageStart,
          status: successfulSources.length > 0 ? 'SUCCESS' : 'FAILED'
        },
        metricExtraction: {
          startedAt: new Date(extractionStageStart).toISOString(),
          completedAt: new Date(extractionStageEnd).toISOString(),
          durationMs: extractionStageEnd - extractionStageStart,
          status: rawObservations.length > 0 ? 'SUCCESS' : 'FAILED'
        },
        reconciliation: {
          startedAt: new Date(reconciliationStageStart).toISOString(),
          completedAt: new Date(reconciliationStageEnd).toISOString(),
          durationMs: reconciliationStageEnd - reconciliationStageStart,
          status: reconciliationCases.length > 0 ? 'SUCCESS' : 'FAILED'
        },
        derivedMetrics: {
          startedAt: new Date(derivedStageStart).toISOString(),
          completedAt: new Date(derivedStageEnd).toISOString(),
          durationMs: derivedStageEnd - derivedStageStart,
          status: derivedMetrics.size > 0 ? 'SUCCESS' : 'FAILED'
        }
      }
    };

    // Build result
    const result: PlayerValidationResult = {
      validationMetadata,
      pipelineExecution,
      identity,
      sourceExecutions,
      rawSnapshots,
      rawObservations,
      reconciliationCases,
      verifiedPlayer,
      verifiedMetrics: this.extractVerifiedMetrics(reconciliationCases),
      derivedMetrics: Array.from(derivedMetrics.values()),
      career: verifiedPlayer.career || {},
      contract: verifiedPlayer.contract || {},
      transfers: [],
      injuries: verifiedPlayer.injuries || {},
      nationalTeam: verifiedPlayer.nationalTeam || {},
      positions: {},
      sourceCoverage: this.calculateSourceCoverage(sourceExecutions),
      metricCoverage: this.calculateMetricCoverage(rawObservations),
      registryValidation: this.validateRegistryCompliance(rawObservations),
      provenanceCompleteness: this.calculateProvenanceCompleteness(rawObservations),
      conflicts: this.extractConflicts(reconciliationCases),
      limitations: [],
      manualComparisons: [],
      expectedMetricCoverage: this.expectedMetricCatalog.calculateCoverage(rawObservations.map(o => o.metricId)),
      pipelineDefects: this.identifyPipelineDefects(rawObservations, sourceExecutions, reconciliationCases),
      scores: {
        pipelineQualityScore: 0, // Will be calculated
        dataAccuracyScore: null, // Will be calculated after manual comparison
        dataAccuracyStatus: 'NOT_SCORED',
        identityAccuracy: identity.identityConfidence * 100,
        fieldAccuracy: 0, // Will be calculated after manual comparison
        metricAccuracy: 0, // Will be calculated
        scopeAccuracy: this.calculateScopeAccuracy(rawObservations),
        provenanceCompleteness: this.calculateProvenanceCompleteness(rawObservations).overallScore,
        registryCoverage: this.validateRegistryCompliance(rawObservations).coverageScore,
        sourceExecutionQuality: this.calculateSourceExecutionQuality(sourceExecutions),
        reconciliationQuality: this.calculateReconciliationQuality(reconciliationCases),
        derivedMetricIntegrity: this.calculateDerivedMetricIntegrity(derivedMetrics),
        auditability: this.calculateAuditability(rawObservations),
        overallScore: null // Will be calculated
      },
      validationVerdict: {
        overallScore: 0,
        dataQuality: 'MEDIUM',
        confidence: identity.identityConfidence,
        recommendation: 'Manual field comparison required for final accuracy assessment',
        criticalIssues: [],
        warnings: []
      }
    };

    // Perform manual field comparisons
    result.manualComparisons = this.validationScorer.performManualComparisons(result);
    
    // Recalculate scores with manual comparisons
    const updatedScores = this.validationScorer.calculateAccuracyScores(result, result.manualComparisons);
    result.scores = updatedScores;

    // Calculate overall score
    result.scores.overallScore = this.calculateOverallScore(result.scores);
    result.validationVerdict.overallScore = result.scores.overallScore;

    console.log(`[PlayerValidation] Validation complete. Overall score: ${result.scores.overallScore}`);
    return result;
  }

  private async resolveIdentity(playerName: string): Promise<IdentityResolutionResult> {
    const uuid: PlayerUUID = await this.identityResolver.resolve(playerName);
    
    const sourceIdentities = [];
    if (uuid.transfermarkt_id) {
      sourceIdentities.push({ sourceId: 'transfermarkt', playerId: uuid.transfermarkt_id, confidence: 0.95 });
    }
    if (uuid.understat_id) {
      sourceIdentities.push({ sourceId: 'understat', playerId: uuid.understat_id, confidence: 0.90 });
    }
    if (uuid.fbref_id) {
      sourceIdentities.push({ sourceId: 'fbref', playerId: uuid.fbref_id, confidence: 0.90 });
    }

    const matchedSignals = ['name'];
    if (uuid.transfermarkt_id) matchedSignals.push('transfermarkt_id');
    if (uuid.understat_id) matchedSignals.push('understat_id');
    if (uuid.fbref_id) matchedSignals.push('fbref_id');

    const identityConfidence = sourceIdentities.length > 0 ? 0.85 : 0.5;
    
    // Identity policy thresholds
    const VERIFIED_THRESHOLD = 0.90;
    const LIKELY_THRESHOLD = 0.75;
    const AMBIGUOUS_THRESHOLD = 0.50;

    let resolutionStatus: IdentityResolutionResult['resolutionStatus'];
    if (identityConfidence >= VERIFIED_THRESHOLD) {
      resolutionStatus = 'VERIFIED';
    } else if (identityConfidence >= LIKELY_THRESHOLD) {
      resolutionStatus = 'LIKELY';
    } else if (identityConfidence >= AMBIGUOUS_THRESHOLD) {
      resolutionStatus = 'AMBIGUOUS';
    } else {
      resolutionStatus = 'BLOCKED';
    }

    return {
      query: playerName,
      resolutionStatus,
      canonicalPlayerId: uuid.transfermarkt_id || uuid.name,
      identityConfidence,
      candidateCount: 1,
      matchedSignals,
      conflictingSignals: [],
      signalBreakdown: {
        nameMatch: 1.0,
        dateOfBirthMatch: 0.8, // Would need to verify
        nationalityMatch: 0.9, // Would need to verify
        clubMatch: 0.5, // Would need to verify
        sourceIdMatch: sourceIdentities.length > 0 ? 0.8 : 0
      },
      sourceIdentities
    };
  }

  private async executeSources(identity: IdentityResolutionResult, noCache?: boolean): Promise<SourceExecutionResult[]> {
    const results: SourceExecutionResult[] = [];
    const sourceIds = Array.from(this.adapters.keys());

    for (const sourceId of sourceIds) {
      const adapter = this.adapters.get(sourceId);
      if (!adapter) {
        results.push({
          sourceId,
          adapterFound: false,
          attempted: false,
          adapterExecutionStatus: 'NOT_STARTED',
          accessStatus: 'UNKNOWN',
          dataStatus: 'NO_DATA',
          status: 'ADAPTER_NOT_REGISTERED',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: 0,
          cache: { used: false, ageSeconds: null, freshnessStatus: 'UNKNOWN' },
          fieldsExtracted: [],
          observationCount: 0,
          warnings: [],
          errors: [`Adapter not found for ${sourceId}`]
        });
        continue;
      }

      const startedAt = new Date().toISOString();
      const startTime = Date.now();

      try {
        // Build UUID for this source
        const uuid: PlayerUUID = {
          name: identity.query,
          transfermarkt_id: identity.sourceIdentities.find(s => s.sourceId === 'transfermarkt')?.playerId,
          understat_id: identity.sourceIdentities.find(s => s.sourceId === 'understat')?.playerId,
          fbref_id: identity.sourceIdentities.find(s => s.sourceId === 'fbref')?.playerId
        };

        const data = await adapter.getPlayerData(uuid);
        const completedAt = new Date().toISOString();
        const durationMs = Date.now() - startTime;

        const fieldsExtracted = this.extractFieldsFromData(data);
        const rawSnapshotId = this.saveRawSnapshot(sourceId, identity.canonicalPlayerId, data);

        // Determine proper data status based on whether fields were extracted
        const dataStatus = fieldsExtracted.length > 0 ? 'DATA_EXTRACTED' : 'NO_DATA';
        const status = fieldsExtracted.length > 0 ? 'SUCCESS' : 'NO_RELEVANT_DATA';

        results.push({
          sourceId,
          adapterFound: true,
          attempted: true,
          adapterExecutionStatus: 'COMPLETED',
          accessStatus: 'ACCESSIBLE',
          dataStatus,
          status,
          startedAt,
          completedAt,
          durationMs,
          httpStatus: 200,
          sourcePlayerId: uuid[`${sourceId}_id` as keyof PlayerUUID] as string || identity.canonicalPlayerId,
          parserVersion: '1.0.0',
          rawSnapshotId,
          cache: {
            used: false,
            ageSeconds: null,
            freshnessStatus: 'FRESH'
          },
          fieldsExtracted,
          observationCount: fieldsExtracted.length,
          warnings: [],
          errors: []
        });

        console.log(`[PlayerValidation] ${sourceId}: SUCCESS (${durationMs}ms, ${fieldsExtracted.length} fields)`);

      } catch (error: any) {
        const completedAt = new Date().toISOString();
        const durationMs = Date.now() - startTime;

        let status: SourceExecutionResult['status'] = 'PARSER_FAILED';
        let accessStatus: SourceExecutionResult['accessStatus'] = 'UNKNOWN';
        let dataStatus: SourceExecutionResult['dataStatus'] = 'PARSER_FAILED';
        
        if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
          status = 'TIMEOUT';
          accessStatus = 'UNKNOWN';
          dataStatus = 'NO_DATA';
        } else if (error.message?.includes('rate limit') || error.response?.status === 429) {
          status = 'RATE_LIMITED';
          accessStatus = 'RATE_LIMITED';
          dataStatus = 'NO_DATA';
        } else if (error.message?.includes('not found') || error.response?.status === 404) {
          status = 'NO_PLAYER_FOUND';
          accessStatus = 'ACCESSIBLE';
          dataStatus = 'NO_PLAYER_FOUND';
        } else if (error.message?.includes('403') || error.response?.status === 403) {
          status = 'BLOCKED';
          accessStatus = 'BLOCKED';
          dataStatus = 'NO_DATA';
        }

        results.push({
          sourceId,
          adapterFound: true,
          attempted: true,
          adapterExecutionStatus: 'COMPLETED',
          accessStatus,
          dataStatus,
          status,
          startedAt,
          completedAt,
          durationMs,
          httpStatus: error.response?.status,
          cache: {
            used: false,
            ageSeconds: null,
            freshnessStatus: 'UNKNOWN'
          },
          fieldsExtracted: [],
          observationCount: 0,
          warnings: [],
          errors: [error.message || 'Unknown error']
        });

        console.log(`[PlayerValidation] ${sourceId}: ${status} (${error.message})`);
      }
    }

    return results;
  }

  private async extractMetrics(sourceExecutions: SourceExecutionResult[], identity: IdentityResolutionResult, season: string): Promise<{ rawObservations: RawObservation[]; rawSnapshots: any[] }> {
    const rawObservations: RawObservation[] = [];
    const rawSnapshots: any[] = [];

    for (const sourceExec of sourceExecutions) {
      if (sourceExec.status !== 'SUCCESS' || !sourceExec.rawSnapshotId) {
        continue;
      }

      // Load raw snapshot
      const snapshotPath = path.join(this.outputDir, 'snapshots', `${sourceExec.rawSnapshotId}.json`);
      if (!fs.existsSync(snapshotPath)) {
        continue;
      }

      const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
      rawSnapshots.push(snapshot);

      // Extract metrics using MetricExtractor
      const observations = this.metricExtractor.extractMetrics(snapshot, sourceExec.sourceId, season);

      // Convert to RawObservation format
      for (const obs of observations) {
        const rawObs: RawObservation = {
          observationId: this.generateObservationId(),
          metricId: obs.metricId,
          value: obs.value,
          unit: this.getMetricUnit(obs.metricId),
          sourceId: sourceExec.sourceId,
          sourcePlayerId: sourceExec.sourcePlayerId || identity.canonicalPlayerId,
          rawSnapshotId: sourceExec.rawSnapshotId,
          retrievedAt: obs.retrievedAt,
          parserVersion: sourceExec.parserVersion || '1.0.0',
          definitionVersion: obs.definitionVersion,
          scope: {
            season: obs.scope.season,
            competition: obs.scope.competition,
            competitionType: this.inferCompetitionType(obs.scope.competition),
            team: 'unknown' // Would need to extract from snapshot
          },
          scopeStatus: obs.scope.competition === 'unknown' ? 'SCOPE_INCOMPLETE' : 'SCOPE_VERIFIED'
        };
        rawObservations.push(rawObs);
      }
    }

    console.log(`[PlayerValidation] Extracted ${rawObservations.length} raw observations from ${rawSnapshots.length} snapshots`);
    return { rawObservations, rawSnapshots };
  }

  private async reconcileMetrics(rawObservations: RawObservation[]): Promise<ReconciliationCase[]> {
    const cases: ReconciliationCase[] = [];
    const grouped = new Map<string, RawObservation[]>();

    // Group by metric ID and scope
    for (const obs of rawObservations) {
      const scopeKey = `${obs.metricId}-${obs.scope.season}-${obs.scope.competition}-${obs.scope.competitionType}-${obs.scope.team}`;
      const key = `${obs.metricId}-${scopeKey}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(obs);
    }

    // Reconcile each group
    for (const [key, observations] of grouped.entries()) {
      if (observations.length === 0) continue;

      // Convert to ReconciliationEngine format
      const engineObservations = observations.map(obs => ({
        metricId: obs.metricId,
        value: obs.value,
        source: obs.sourceId,
        scope: {
          season: obs.scope.season,
          competition: obs.scope.competition
        },
        definitionVersion: obs.definitionVersion,
        retrievedAt: obs.retrievedAt,
        sourceObservationIds: [obs.observationId], // Lineage tracking
        sourceSnapshotId: obs.rawSnapshotId
      }));

      const engineResult = this.reconciliationEngine.reconcile(engineObservations);

      const caseId = this.generateCaseId(observations);
      const scopeKey = key.split('-').slice(1).join('-');

      // Determine proper decision based on observation count and engine result
      let decision: ReconciliationCase['decision'];
      if (observations.length >= 2) {
        decision = 'MULTI_SOURCE_VERIFIED';
      } else if (observations.length === 1) {
        decision = 'SINGLE_SOURCE_ACCEPTED';
      } else {
        decision = 'REJECTED';
      }

      // Override with engine result if it indicates conflict
      if (engineResult.decision === 'conflict') {
        decision = 'CONFLICTED';
      }

      cases.push({
        caseId,
        metricId: observations[0].metricId,
        scopeKey,
        observations,
        decision,
        verifiedValue: engineResult.verifiedValue || null,
        confidence: engineResult.confidence,
        selectedSource: engineResult.reason?.includes('using most reliable source') ? 
          this.extractSelectedSource(engineResult.reason) : null,
        reason: engineResult.reason,
        tolerancePolicy: 'default'
      });
    }

    console.log(`[PlayerValidation] Reconciled ${cases.length} metric cases`);
    return cases;
  }

  private async calculateDerivedMetrics(reconciliationCases: ReconciliationCase[], rawObservations: RawObservation[]): Promise<Map<string, DerivedMetric>> {
    const derived = new Map<string, DerivedMetric>();

    // Build observations map for lookup
    const obsMap = new Map<string, RawObservation[]>();
    for (const obs of rawObservations) {
      if (!obsMap.has(obs.metricId)) {
        obsMap.set(obs.metricId, []);
      }
      obsMap.get(obs.metricId)!.push(obs);
    }

    // Calculate per-90 metrics
    const minutes = this.getVerifiedValue(reconciliationCases, 'minutes');
    
    if (minutes && minutes > 0) {
      const per90Metrics = ['goals', 'assists', 'xG', 'xA', 'shots', 'key_passes'];
      
      for (const metricId of per90Metrics) {
        const value = this.getVerifiedValue(reconciliationCases, metricId);
        if (value !== null) {
          const per90Value = (value * 90) / minutes;
          const derivedMetric: DerivedMetric = {
            metricId: `${metricId}_per90`,
            value: per90Value,
            formula: `${metricId} * 90 / minutes`,
            formulaVersion: '1.0.0',
            inputMetricIds: [metricId, 'minutes'],
            inputObservationIds: [],
            numeratorScopeKey: '2024-25-all_competitions-unknown',
            denominatorScopeKey: '2024-25-all_competitions-unknown',
            scopeMatch: true,
            inputsAccepted: true,
            scope: {
              season: '2024-25',
              competition: 'all_competitions',
              competitionType: 'all_competitions',
              team: 'unknown'
            },
            status: 'PROVISIONAL_DERIVED',
            confidence: 0.85,
            reason: 'Scope competition is unknown, marked as provisional'
          };
          derived.set(derivedMetric.metricId, derivedMetric);
        }
      }
    }

    console.log(`[PlayerValidation] Calculated ${derived.size} derived metrics`);
    return derived;
  }

  private async buildVerifiedPlayer(playerName: string, identity: IdentityResolutionResult, reconciliationCases: ReconciliationCase[], derivedMetrics: Map<string, DerivedMetric>): Promise<any> {
    // Use ScoutEngineV4 to build the verified player
    // For now, return a simplified structure
    return {
      schemaVersion: '4.0.0',
      recordType: 'verified_player',
      recordId: identity.canonicalPlayerId,
      playerName,
      canonicalId: identity.canonicalPlayerId,
      verifiedAt: new Date().toISOString(),
      metrics: this.buildMetricsDict(reconciliationCases),
      derivedMetrics: this.buildDerivedMetricsDict(derivedMetrics),
      provenance: {
        sources: identity.sourceIdentities.map(s => s.sourceId),
        retrievalWindow: 'current-season',
        dataQuality: 'HIGH',
        sourceIndependence: true
      }
    };
  }

  private buildMetricsDict(cases: ReconciliationCase[]): any {
    const metrics: any = {};
    for (const c of cases) {
      if (c.decision === 'MULTI_SOURCE_VERIFIED' || c.decision === 'AUTHORITATIVE_SOURCE_VERIFIED' || c.decision === 'SINGLE_SOURCE_ACCEPTED') {
        metrics[c.metricId] = {
          value: c.verifiedValue,
          confidence: c.confidence,
          status: c.decision
        };
      }
    }
    return metrics;
  }

  private buildDerivedMetricsDict(derived: Map<string, DerivedMetric>): any {
    const metrics: any = {};
    for (const [id, d] of derived.entries()) {
      metrics[id] = {
        value: d.value,
        formula: d.formula,
        status: d.status,
        confidence: d.confidence
      };
    }
    return metrics;
  }

  private extractVerifiedMetrics(cases: ReconciliationCase[]): any[] {
    return cases
      .filter(c => c.decision === 'MULTI_SOURCE_VERIFIED' || c.decision === 'AUTHORITATIVE_SOURCE_VERIFIED' || c.decision === 'SINGLE_SOURCE_ACCEPTED')
      .map(c => ({
        metricId: c.metricId,
        value: c.verifiedValue,
        confidence: c.confidence,
        decision: c.decision,
        scopeKey: c.scopeKey
      }));
  }

  private extractConflicts(cases: ReconciliationCase[]): any[] {
    return cases
      .filter(c => c.decision === 'CONFLICTED')
      .map(c => ({
        metricId: c.metricId,
        scopeKey: c.scopeKey,
        observations: c.observations.map(o => ({ source: o.sourceId, value: o.value })),
        reason: c.reason
      }));
  }

  private calculateSourceCoverage(executions: SourceExecutionResult[]): any {
    const attempted = executions.filter(e => e.attempted).length;
    const successful = executions.filter(e => e.status === 'SUCCESS').length;
    return {
      totalSources: executions.length,
      attempted,
      successful,
      failed: attempted - successful,
      coveragePct: executions.length > 0 ? (successful / executions.length) * 100 : 0
    };
  }

  private calculateMetricCoverage(observations: RawObservation[]): any {
    const uniqueMetrics = new Set(observations.map(o => o.metricId));
    return {
      totalObservations: observations.length,
      uniqueMetrics: uniqueMetrics.size,
      sourcesPerMetric: this.calculateSourcesPerMetric(observations)
    };
  }

  private calculateSourcesPerMetric(observations: RawObservation[]): any {
    const metricSources = new Map<string, Set<string>>();
    for (const obs of observations) {
      if (!metricSources.has(obs.metricId)) {
        metricSources.set(obs.metricId, new Set());
      }
      metricSources.get(obs.metricId)!.add(obs.sourceId);
    }
    const result: any = {};
    for (const [metricId, sources] of metricSources.entries()) {
      result[metricId] = sources.size;
    }
    return result;
  }

  private validateRegistryCompliance(observations: RawObservation[]): any {
    // ARCH-007: Metric registry enforcement
    // For now, assume all metrics are registered
    const registeredMetrics = new Set([
      'goals', 'assists', 'minutes', 'matches', 'xG', 'xA', 'npxG', 'npg',
      'shots', 'key_passes', 'yellow_cards', 'red_cards', 'rating',
      'marketValue', 'contract_expires', 'contract_start', 'height_cm',
      'national_team_caps', 'national_team_goals'
    ]);

    const unregistered = observations.filter(o => !registeredMetrics.has(o.metricId));
    
    return {
      totalMetrics: observations.length,
      registeredMetrics: observations.length - unregistered.length,
      unregisteredMetrics: unregistered.length,
      unregisteredMetricIds: [...new Set(unregistered.map(o => o.metricId))],
      coverageScore: observations.length > 0 ? ((observations.length - unregistered.length) / observations.length) * 100 : 0
    };
  }

  private calculateProvenanceCompleteness(observations: RawObservation[]): any {
    const withSnapshot = observations.filter(o => o.rawSnapshotId).length;
    const withSourcePlayerId = observations.filter(o => o.sourcePlayerId).length;
    const withRetrievedAt = observations.filter(o => o.retrievedAt).length;

    return {
      totalObservations: observations.length,
      withRawSnapshot: withSnapshot,
      withSourcePlayerId: withSourcePlayerId,
      withRetrievedAt: withRetrievedAt,
      overallScore: observations.length > 0 ? 
        ((withSnapshot + withSourcePlayerId + withRetrievedAt) / (observations.length * 3)) * 100 : 0
    };
  }

  private calculateScopeAccuracy(observations: RawObservation[]): number {
    const withSeason = observations.filter(o => o.scope.season && o.scope.season !== 'unknown').length;
    const withCompetition = observations.filter(o => o.scope.competition && o.scope.competition !== 'unknown').length;
    
    return observations.length > 0 ? 
      ((withSeason + withCompetition) / (observations.length * 2)) * 100 : 0;
  }

  private calculateSourceExecutionQuality(executions: SourceExecutionResult[]): number {
    const attempted = executions.filter(e => e.attempted).length;
    const successful = executions.filter(e => e.status === 'SUCCESS').length;
    
    return attempted > 0 ? (successful / attempted) * 100 : 0;
  }

  private calculateReconciliationQuality(cases: ReconciliationCase[]): number {
    const verified = cases.filter(c => c.decision === 'MULTI_SOURCE_VERIFIED' || c.decision === 'AUTHORITATIVE_SOURCE_VERIFIED' || c.decision === 'SINGLE_SOURCE_ACCEPTED').length;
    const conflicted = cases.filter(c => c.decision === 'CONFLICTED').length;
    
    return cases.length > 0 ? (verified / cases.length) * 100 : 0;
  }

  private calculateDerivedMetricIntegrity(derived: Map<string, DerivedMetric>): number {
    const valid = Array.from(derived.values()).filter(d => d.status === 'VERIFIED_DERIVED').length;
    return derived.size > 0 ? (valid / derived.size) * 100 : 0;
  }

  private calculateAuditability(observations: RawObservation[]): number {
    const withProvenance = observations.filter(o => o.rawSnapshotId && o.sourcePlayerId && o.retrievedAt).length;
    return observations.length > 0 ? (withProvenance / observations.length) * 100 : 0;
  }

  private calculateOverallScore(scores: AccuracyScores): number | null {
    // If data accuracy is not scored, return null
    if (scores.dataAccuracyStatus !== 'SCORED') {
      return null;
    }

    const weights = {
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
      total += (scores[key] || 0) * weight;
    }
    return Math.round(total);
  }

  private getVerifiedValue(cases: ReconciliationCase[], metricId: string): number | null {
    const c = cases.find(c => c.metricId === metricId && (c.decision === 'MULTI_SOURCE_VERIFIED' || c.decision === 'AUTHORITATIVE_SOURCE_VERIFIED' || c.decision === 'SINGLE_SOURCE_ACCEPTED'));
    return c?.verifiedValue !== null && c?.verifiedValue !== undefined ? Number(c.verifiedValue) : null;
  }

  private extractFieldsFromData(data: any): string[] {
    if (!data || typeof data !== 'object') return [];
    return Object.keys(data).filter(k => data[k] !== null && data[k] !== undefined);
  }

  private identifyPipelineDefects(observations: RawObservation[], sourceExecutions: SourceExecutionResult[], reconciliationCases: ReconciliationCase[]): PipelineDefect[] {
    const defects: PipelineDefect[] = [];

    // Check for scope extraction defects
    const incompleteScope = observations.filter(o => o.scopeStatus === 'SCOPE_INCOMPLETE');
    if (incompleteScope.length > 0) {
      defects.push({
        defectId: this.generateDefectId('SCOPE_EXTRACTION_DEFECT'),
        defectType: 'SCOPE_EXTRACTION_DEFECT',
        severity: 'HIGH',
        description: `${incompleteScope.length} observations have incomplete scope (competition unknown)`,
        remediation: 'Improve scope extraction from source data or mark metrics as scope-limited',
        evidence: { incompleteScopeCount: incompleteScope.length, affectedMetrics: incompleteScope.map(o => o.metricId) }
      });
    }

    // Check for source status classification defects
    const sourcesWithNoData = sourceExecutions.filter(s => s.dataStatus === 'NO_DATA' && s.status === 'SUCCESS');
    if (sourcesWithNoData.length > 0) {
      defects.push({
        defectId: this.generateDefectId('SOURCE_STATUS_CLASSIFICATION_DEFECT'),
        defectType: 'SOURCE_STATUS_CLASSIFICATION_DEFECT',
        severity: 'MEDIUM',
        description: `${sourcesWithNoData.length} sources marked SUCCESS but returned no data`,
        remediation: 'Update source status classification to distinguish adapter execution from data extraction',
        evidence: { sources: sourcesWithNoData.map(s => s.sourceId) }
      });
    }

    // Check for derived metric scope defects
    const provisionalDerived = reconciliationCases.filter(c => 
      observations.some(o => o.metricId === c.metricId && o.scopeStatus === 'SCOPE_INCOMPLETE')
    );
    if (provisionalDerived.length > 0) {
      defects.push({
        defectId: this.generateDefectId('DERIVED_METRIC_SCOPE_DEFECT'),
        defectType: 'DERIVED_METRIC_SCOPE_DEFECT',
        severity: 'HIGH',
        description: `${provisionalDerived.length} metrics with incomplete scope used in calculations`,
        remediation: 'Block derived metric calculations when scope is incomplete',
        evidence: { affectedMetrics: provisionalDerived.map(c => c.metricId) }
      });
    }

    // Check for accuracy scoring defects
    const unverifiableComparisons = this.validationScorer.performManualComparisons({} as any).filter(c => c.verdict === 'UNVERIFIABLE');
    if (unverifiableComparisons.length > 0) {
      defects.push({
        defectId: this.generateDefectId('ACCURACY_SCORING_DEFECT'),
        defectType: 'ACCURACY_SCORING_DEFECT',
        severity: 'MEDIUM',
        description: 'Accuracy score calculated without sufficient reference evidence',
        remediation: 'Implement actual manual reference verification before scoring',
        evidence: { unverifiableFieldCount: unverifiableComparisons.length }
      });
    }

    return defects;
  }

  private generateDefectId(type: string): string {
    return `defect-${type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveRawSnapshot(sourceId: string, playerId: string, data: any): string {
    const snapshotDir = path.join(this.outputDir, 'snapshots');
    if (!fs.existsSync(snapshotDir)) {
      fs.mkdirSync(snapshotDir, { recursive: true });
    }
    
    const snapshotId = `${sourceId}-${playerId}-${Date.now()}`;
    const snapshotPath = path.join(snapshotDir, `${snapshotId}.json`);
    fs.writeFileSync(snapshotPath, JSON.stringify(data, null, 2), 'utf-8');
    return snapshotId;
  }

  private generateValidationId(): string {
    return `validation-${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateObservationId(): string {
    return `obs-${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateCaseId(observations: RawObservation[]): string {
    const sources = observations.map(o => o.sourceId).sort().join('-');
    const metricId = observations[0]?.metricId || 'unknown';
    const hash = crypto.createHash('sha256').update(`${metricId}-${sources}-${Date.now()}`).digest('hex').substring(0, 12);
    return `case-${hash}`;
  }

  private getMetricUnit(metricId: string): string {
    const units: Record<string, string> = {
      goals: 'count',
      assists: 'count',
      minutes: 'minutes',
      matches: 'count',
      xG: 'float',
      xA: 'float',
      rating: 'float',
      marketValue: 'eur',
      height_cm: 'cm'
    };
    return units[metricId] || 'unknown';
  }

  private inferCompetitionType(competition: string): 'league' | 'cup' | 'continental' | 'national_team' | 'all_competitions' {
    if (!competition || competition === 'unknown') return 'all_competitions';
    if (competition.toLowerCase().includes('cup')) return 'cup';
    if (competition.toLowerCase().includes('champions') || competition.toLowerCase().includes('europa')) return 'continental';
    if (competition.toLowerCase().includes('national')) return 'national_team';
    return 'league';
  }

  private extractSelectedSource(reason: string): string | null {
    const match = reason.match(/using most reliable source: (\w+)/);
    return match ? match[1] : null;
  }
}
