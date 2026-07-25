export interface SourceExecutionResult {
  sourceId: string;
  adapterFound: boolean;
  attempted: boolean;
  adapterExecutionStatus: 'NOT_STARTED' | 'COMPLETED' | 'FAILED' | 'TIMEOUT';
  accessStatus: 'ACCESSIBLE' | 'RATE_LIMITED' | 'BLOCKED' | 'AUTH_REQUIRED' | 'UNKNOWN';
  dataStatus: 'DATA_EXTRACTED' | 'NO_PLAYER_FOUND' | 'NO_RELEVANT_DATA' | 'NO_DATA' | 'PARSER_FAILED';
  status: 'SUCCESS' | 'NO_PLAYER_FOUND' | 'NO_RELEVANT_DATA' | 'PARSER_FAILED' | 'RATE_LIMITED' | 'BLOCKED' | 'TIMEOUT' | 'UNSUPPORTED' | 'ADAPTER_NOT_REGISTERED';
  startedAt: string;
  completedAt: string;
  durationMs: number;
  httpStatus?: number;
  sourcePlayerId?: string;
  profileUrl?: string;
  parserVersion?: string;
  rawSnapshotId?: string;
  cache: {
    used: boolean;
    ageSeconds: number | null;
    freshnessStatus: 'FRESH' | 'STALE' | 'EXPIRED' | 'UNKNOWN';
  };
  fieldsExtracted: string[];
  observationCount: number;
  warnings: string[];
  errors: string[];
}

export interface IdentityResolutionResult {
  query: string;
  resolutionStatus: 'VERIFIED' | 'LIKELY' | 'AMBIGUOUS' | 'BLOCKED';
  canonicalPlayerId: string;
  identityConfidence: number;
  candidateCount: number;
  matchedSignals: string[];
  conflictingSignals: string[];
  signalBreakdown: {
    nameMatch: number;
    dateOfBirthMatch: number;
    nationalityMatch: number;
    clubMatch: number;
    sourceIdMatch: number;
  };
  sourceIdentities: {
    sourceId: string;
    playerId: string;
    confidence: number;
  }[];
}

export interface RawObservation {
  observationId: string;
  metricId: string;
  value: number | string | null;
  unit: string;
  sourceId: string;
  sourcePlayerId: string;
  rawSnapshotId: string;
  retrievedAt: string;
  parserVersion: string;
  definitionVersion: string;
  scope: {
    season: string;
    competition: string;
    competitionType: 'league' | 'cup' | 'continental' | 'national_team' | 'all_competitions';
    team: string;
  };
  scopeStatus: 'SCOPE_VERIFIED' | 'SCOPE_INFERRED' | 'SCOPE_INCOMPLETE';
}

export interface ReconciliationCase {
  caseId: string;
  metricId: string;
  scopeKey: string;
  observations: RawObservation[];
  decision: 'MULTI_SOURCE_VERIFIED' | 'AUTHORITATIVE_SOURCE_VERIFIED' | 'SINGLE_SOURCE_ACCEPTED' | 'CONFLICTED' | 'REJECTED';
  verifiedValue: number | string | null;
  confidence: number;
  selectedSource: string | null;
  reason: string;
  tolerancePolicy: string;
}

export interface DerivedMetric {
  metricId: string;
  value: number;
  formula: string;
  formulaVersion: string;
  inputMetricIds: string[];
  inputObservationIds: string[];
  numeratorScopeKey: string;
  denominatorScopeKey: string;
  scopeMatch: boolean;
  inputsAccepted: boolean;
  scope: {
    season: string;
    competition: string;
    competitionType: string;
    team: string;
  };
  status: 'VERIFIED_DERIVED' | 'PROVISIONAL_DERIVED' | 'BLOCKED_DERIVED' | 'INVALID_INPUT' | 'SCOPE_MISMATCH';
  confidence: number;
  reason: string;
}

export interface ManualFieldComparison {
  field: string;
  systemValue: any;
  referenceValue: any;
  referenceSourceId: string;
  referenceUrl: string;
  referenceRetrievedAt: string;
  referenceSnapshotId: string;
  verdict: 'EXACT' | 'TOLERANCE_MATCH' | 'MISMATCH' | 'UNVERIFIABLE';
  notes: string;
}

export interface AccuracyScores {
  pipelineQualityScore: number;
  dataAccuracyScore: number | null;
  dataAccuracyStatus: 'SCORED' | 'INSUFFICIENT_REFERENCE_EVIDENCE' | 'NOT_SCORED';
  identityAccuracy: number;
  fieldAccuracy: number;
  metricAccuracy: number;
  scopeAccuracy: number;
  provenanceCompleteness: number;
  registryCoverage: number;
  sourceExecutionQuality: number;
  reconciliationQuality: number;
  derivedMetricIntegrity: number;
  auditability: number;
  overallScore: number | null;
}

export interface ValidationMetadata {
  validationId: string;
  playerName: string;
  validatedAt: string;
  validationVersion: string;
  pipelineVersion: string;
  options: {
    noCache: boolean;
    season: string;
  };
}

export interface PipelineExecution {
  startedAt: string;
  completedAt: string;
  durationMs: number;
  stages: {
    identityResolution: { startedAt: string; completedAt: string; durationMs: number; status: string };
    sourceExecution: { startedAt: string; completedAt: string; durationMs: number; status: string };
    metricExtraction: { startedAt: string; completedAt: string; durationMs: number; status: string };
    reconciliation: { startedAt: string; completedAt: string; durationMs: number; status: string };
    derivedMetrics: { startedAt: string; completedAt: string; durationMs: number; status: string };
  };
}

export interface ValidationVerdict {
  overallScore: number;
  dataQuality: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  recommendation: string;
  criticalIssues: string[];
  warnings: string[];
}

export interface PlayerValidationResult {
  validationMetadata: ValidationMetadata;
  pipelineExecution: PipelineExecution;
  identity: IdentityResolutionResult;
  sourceExecutions: SourceExecutionResult[];
  rawSnapshots: any[];
  rawObservations: RawObservation[];
  reconciliationCases: ReconciliationCase[];
  verifiedPlayer: any;
  verifiedMetrics: any[];
  derivedMetrics: DerivedMetric[];
  career: any;
  contract: any;
  transfers: any;
  injuries: any;
  nationalTeam: any;
  positions: any;
  sourceCoverage: any;
  metricCoverage: any;
  registryValidation: any;
  provenanceCompleteness: any;
  conflicts: any[];
  limitations: any[];
  manualComparisons: ManualFieldComparison[];
  expectedMetricCoverage: {
    expectedMetricCount: number;
    observedMetricCount: number;
    missingMetricCount: number;
    coverage: number;
    missingMetrics: any[];
  };
  pipelineDefects: PipelineDefect[];
  scores: AccuracyScores;
  validationVerdict: ValidationVerdict;
}

export interface PipelineDefect {
  defectId: string;
  defectType: 'SOURCE_STATUS_CLASSIFICATION_DEFECT' | 'EXPECTED_METRIC_CATALOG_MISSING' | 'SCOPE_EXTRACTION_DEFECT' | 'DERIVED_METRIC_SCOPE_DEFECT' | 'ACCURACY_SCORING_DEFECT' | 'IDENTITY_POLICY_UNDOCUMENTED';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  remediation: string;
  evidence: any;
}
