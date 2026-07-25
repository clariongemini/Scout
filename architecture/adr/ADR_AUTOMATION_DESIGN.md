# ADR Automation System Design

## Purpose
Architecture Decision Records (ADR) are automatically generated when code changes affect architectural decisions or when architectural violations are detected.

## ADR Generation Triggers

### Trigger 1: Architectural Violation Detection
When architecture tests detect violations:
- ARCH-006 FAIL → ADR for evidence tracking
- ARCH-007 FAIL → ADR for metric registry
- ARCH-008 FAIL → ADR for provider registry
- ARCH-009 FAIL → ADR for contract validation
- ARCH-010 FAIL → ADR for auditability

### Trigger 2: New Architectural Patterns
When new patterns are introduced:
- New layer added
- New data flow pattern
- New dependency pattern
- New integration pattern

### Trigger 3: Architectural Decision Changes
When existing decisions are modified:
- Single source of truth implementation changes
- Layer separation pattern changes
- Provider strategy changes
- Schema versioning changes

## ADR Template

```json
{
  "id": "ADR-XXX",
  "title": "Decision Title",
  "status": "PROPOSED|ACCEPTED|SUPERSEDED|DEPRECATED",
  "date": "ISO-8601",
  "context": {
    "problem": "What problem are we solving?",
    "drivers": ["Driver 1", "Driver 2"],
    "affectedComponents": ["Component 1", "Component 2"]
  },
  "decision": {
    "description": "What was decided?",
    "implementation": "How was it implemented?",
    "alternatives": [
      {
        "alternative": "Alternative description",
        "rejectedReason": "Why was this rejected?"
      }
    ]
  },
  "consequences": {
    "positive": ["Positive consequence 1", "Positive consequence 2"],
    "negative": ["Negative consequence 1", "Negative consequence 2"],
    "risks": ["Risk 1", "Risk 2"]
  },
  "evidence": {
    "testResults": ["ARCH-XXX"],
    "codeReferences": ["file:line"],
    "violations": ["Violation description"]
  },
  "relatedADRs": ["ADR-XXX", "ADR-YYY"]
}
```

## Current ADRs Based on Test Results

### ADR-014: Evidence Tracking Implementation
**Trigger**: ARCH-006 FAIL
**Status**: PROPOSED
**Context**: Derived metrics cannot trace to raw metric sources
**Decision**: Implement source lineage tracking and data provenance
**Priority**: HIGH

### ADR-015: Metric Registry Integration
**Trigger**: ARCH-007 FAIL
**Status**: PROPOSED
**Context**: Metrics not registered in metric registry, no validation enforcement
**Decision**: Integrate metric registry with metric extraction pipeline
**Priority**: HIGH

### ADR-016: Provider Registry Implementation
**Trigger**: ARCH-008 FAIL
**Status**: PROPOSED
**Context**: No centralized provider registry, no health monitoring
**Decision**: Implement provider registry with health monitoring and fallback
**Priority**: MEDIUM

### ADR-017: Contract Validation Automation
**Trigger**: ARCH-009 FAIL
**Status**: PROPOSED
**Context**: No automated contract validation or violation detection
**Decision**: Implement automated contract validation system
**Priority**: HIGH

### ADR-018: Audit Logging System
**Trigger**: ARCH-010 FAIL
**Status**: PROPOSED
**Context**: No comprehensive audit logging or data lineage traceability
**Decision**: Implement comprehensive audit logging system
**Priority**: HIGH

## ADR Workflow

1. **Detection**: Architecture test detects violation or pattern change
2. **Generation**: System generates ADR draft with context from test results
3. **Review**: Chief Architecture Guardian reviews ADR
4. **Decision**: ADR status updated (PROPOSED → ACCEPTED)
5. **Implementation**: Development team implements decision
6. **Validation**: Architecture tests re-run to verify implementation
7. **Closure**: ADR marked as ACCEPTED or SUPERSEDED

## ADR Storage

```
architecture/adr/
├── ADR-001-verified-player-single-source.json
├── ADR-002-adapter-pattern-data-sources.json
├── ADR-003-layer-separation-architecture.json
├── ADR-014-evidence-tracking-implementation.json
├── ADR-015-metric-registry-integration.json
├── ADR-016-provider-registry-implementation.json
├── ADR-017-contract-validation-automation.json
└── ADR-018-audit-logging-system.json
```

## ADR Index

```json
{
  "adrs": [
    {
      "id": "ADR-001",
      "title": "Verified Player as Single Source of Truth",
      "status": "ACCEPTED",
      "date": "2026-07-24"
    },
    {
      "id": "ADR-014",
      "title": "Evidence Tracking Implementation",
      "status": "PROPOSED",
      "date": "2026-07-24"
    }
  ]
}
```
