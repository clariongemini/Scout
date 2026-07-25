# FSRS Architecture Validation Framework (AVF)

## Purpose
Architecture Validation Framework (AVF) provides automated architectural testing and validation for FSRS v4. The Chief Architecture Guardian consumes AVF test results instead of manual code inspection.

## Structure
```
FSRS
architecture/
├── contracts/           # Architecture contracts and schemas
├── validators/          # Validation logic for each architectural rule
├── architecture_tests/  # Automated architectural tests
├── rules/              # Architectural rules and constraints
├── evidence/           # Evidence collection and storage
├── reports/            # Automated architecture reports
└── adr/               # Architecture Decision Records
```

## Architecture Tests Format

Each test produces standardized output:
```json
{
  "id": "ARCH-001",
  "name": "Single Source of Truth",
  "status": "PASS|FAIL|BLOCKED|UNKNOWN",
  "confidence": "HIGH|MEDIUM|LOW",
  "evidence": [
    {
      "source": "file:line",
      "observation": "what was found",
      "type": "code|config|runtime"
    }
  ],
  "violations": [
    {
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "description": "what was violated",
      "location": "file:line"
    }
  ],
  "timestamp": "ISO-8601"
}
```

## Architecture Tests Catalog

### ARCH-001: Single Source of Truth
**Purpose**: Verify that metrics are calculated in single location only
**Checks**:
- Derived metrics not calculated in multiple places
- Presentation layer does not recalculate metrics
- No data duplication in data pipeline

### ARCH-002: Layer Separation
**Purpose**: Verify strict layer separation
**Checks**:
- Presentation layer does not calculate metrics
- LLM layer does not produce raw data
- Position Engine does not directly scrape sources
- Each layer stays within responsibilities

### ARCH-003: Dependency Direction
**Purpose**: Verify correct dependency direction
**Checks**:
- Football Intelligence does not import Source Adapters
- Presentation does not import Data Intelligence internals
- Dependencies flow from lower to higher layers

### ARCH-004: Provider Isolation
**Purpose**: Verify provider isolation
**Checks**:
- Removing a provider affects only adapter layer
- No direct provider dependencies in business logic
- Provider changes don't require engine changes

### ARCH-005: Schema Compatibility
**Purpose**: Verify schema compatibility
**Checks**:
- JSON schema changes are versioned
- Backward compatibility maintained
- Migration strategy exists for breaking changes

### ARCH-006: Evidence Completeness
**Purpose**: Verify evidence tracking
**Checks**:
- Each derived metric can trace to raw metrics
- Source lineage is tracked
- Data provenance is maintained

### ARCH-007: Metric Registry Coverage
**Purpose**: Verify metric registry coverage
**Checks**:
- All metrics are registered in metric registry
- Metric definitions exist for all calculated metrics
- Metric validation rules are defined

### ARCH-008: Provider Registry Coverage
**Purpose**: Verify provider registry coverage
**Checks**:
- All providers are registered in provider registry
- Provider health monitoring is implemented
- Provider fallback mechanisms exist

### ARCH-009: Contract Validation
**Purpose**: Verify contract validation
**Checks**:
- JSON contracts are validated
- Schema validation is automated
- Contract violations are detected

### ARCH-010: Auditability
**Purpose**: Verify auditability
**Checks**:
- All data changes are logged
- Data lineage is traceable
- Audit trail is complete

## Architecture Gates

Architecture Gates are automated pass/fail criteria based on test results:

### Architecture Gate
**Criteria**: All critical architecture tests must PASS
**Blocking Tests**: ARCH-001, ARCH-002, ARCH-003
**Output**: PASS/FAIL with specific test failures

### Production Gate
**Criteria**: All production readiness tests must PASS
**Blocking Tests**: ARCH-005, ARCH-009, ARCH-010
**Output**: PASS/BLOCKED with specific gaps

### Schema Gate
**Criteria**: All schema-related tests must PASS
**Blocking Tests**: ARCH-005, ARCH-009
**Output**: PASS/FAIL with schema violations

## ADR Automation

Architecture Decision Records are automatically generated when:
- Code changes affect architectural decisions
- New architectural patterns are introduced
- Architectural violations are detected

**ADR Format**:
```json
{
  "id": "ADR-014",
  "title": "Decision Title",
  "context": "Problem or situation",
  "decision": "What was decided",
  "alternatives": ["Alternative 1", "Alternative 2"],
  "consequences": "Impact of decision",
  "status": "PROPOSED|ACCEPTED|SUPERSEDED",
  "timestamp": "ISO-8601"
}
```

## Chief Architecture Guardian Role

The Chief Architecture Guardian:
1. Runs architecture tests
2. Collects evidence
3. Analyzes test results
4. Produces summary recommendations
5. Does NOT write manual code reviews

## Implementation Priority

1. **Phase 1**: Core architecture tests (ARCH-001, ARCH-002, ARCH-003)
2. **Phase 2**: Data integrity tests (ARCH-006, ARCH-007, ARCH-008)
3. **Phase 3**: Production readiness tests (ARCH-005, ARCH-009, ARCH-010)
4. **Phase 4**: ADR automation and continuous validation
