/**
 * Observation Validation Engine
 * 
 * Performs observation-level validation before data becomes a metric.
 * Validates data types, ranges, formats, and business rules.
 * This ensures data quality at the observation level before reconciliation.
 */

import { CanonicalObservation, ValidationError, ValidationWarning } from './CanonicalObservation';
import { ObservationRegistry, ObservationDefinition, ValidationRule } from './ObservationRegistry';

export interface ValidationResult {
  isValid: boolean;
  validationStatus: 'VALID' | 'INVALID' | 'SUSPICIOUS' | 'UNKNOWN';
  errors: ValidationError[];
  warnings: ValidationWarning[];
  confidence: number;
}

export class ObservationValidationEngine {
  private registry: ObservationRegistry;
  
  constructor() {
    this.registry = new ObservationRegistry();
  }
  
  /**
   * Validate a canonical observation
   */
  public validateObservation(observation: CanonicalObservation): ValidationResult {
    const definition = this.registry.getDefinition(observation.metricId);
    
    if (!definition) {
      return {
        isValid: false,
        validationStatus: 'UNKNOWN',
        errors: [],
        warnings: [{
          code: 'NO_DEFINITION',
          message: `No observation definition found for metric: ${observation.metricId}`
        }],
        confidence: 0.5
      };
    }
    
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Validate scope requirements
    this.validateScope(observation, definition, errors, warnings);
    
    // Validate data type
    this.validateDataType(observation, definition, errors, warnings);
    
    // Apply validation rules
    this.applyValidationRules(observation, definition, errors, warnings);
    
    // Validate normalization status
    this.validateNormalization(observation, definition, warnings);
    
    // Determine overall validation status
    const validationStatus = this.determineValidationStatus(errors, warnings);
    const isValid = validationStatus === 'VALID';
    const confidence = this.calculateValidationConfidence(errors, warnings, validationStatus);
    
    return {
      isValid,
      validationStatus,
      errors,
      warnings,
      confidence
    };
  }
  
  /**
   * Validate scope requirements
   */
  private validateScope(
    observation: CanonicalObservation,
    definition: ObservationDefinition,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (definition.scopeRequired) {
      if (observation.scopeStatus === 'SCOPE_INCOMPLETE') {
        errors.push({
          code: 'SCOPE_REQUIRED',
          message: `Scope is required for ${observation.metricId} but is incomplete`,
          severity: 'ERROR',
          field: 'scope'
        });
      } else if (observation.scopeStatus === 'SCOPE_AMBIGUOUS') {
        warnings.push({
          code: 'SCOPE_AMBIGUOUS',
          message: `Scope is required for ${observation.metricId} but is ambiguous`,
          field: 'scope'
        });
      }
      
      // Check if scope type is allowed
      if (definition.allowedScopeTypes.length > 0) {
        if (!definition.allowedScopeTypes.includes(observation.scope.competitionType)) {
          warnings.push({
            code: 'SCOPE_TYPE_NOT_ALLOWED',
            message: `Scope type ${observation.scope.competitionType} is not in allowed types: ${definition.allowedScopeTypes.join(', ')}`,
            field: 'scope.competitionType'
          });
        }
      }
    }
  }
  
  /**
   * Validate data type
   */
  private validateDataType(
    observation: CanonicalObservation,
    definition: ObservationDefinition,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const value = observation.normalizedValue;
    
    if (value === null || value === undefined) {
      // Null values are allowed for some metrics
      return;
    }
    
    switch (definition.dataType) {
      case 'numeric':
        if (typeof value !== 'number') {
          errors.push({
            code: 'INVALID_TYPE',
            message: `Expected numeric value for ${observation.metricId}, got ${typeof value}`,
            severity: 'ERROR',
            field: 'normalizedValue'
          });
        }
        break;
      
      case 'string':
        if (typeof value !== 'string') {
          errors.push({
            code: 'INVALID_TYPE',
            message: `Expected string value for ${observation.metricId}, got ${typeof value}`,
            severity: 'ERROR',
            field: 'normalizedValue'
          });
        }
        break;
      
      case 'date':
        if (typeof value !== 'string') {
          errors.push({
            code: 'INVALID_TYPE',
            message: `Expected date string for ${observation.metricId}, got ${typeof value}`,
            severity: 'ERROR',
            field: 'normalizedValue'
          });
        } else if (!this.isValidDate(value)) {
          errors.push({
            code: 'INVALID_DATE_FORMAT',
            message: `Invalid date format for ${observation.metricId}: ${value}`,
            severity: 'ERROR',
            field: 'normalizedValue'
          });
        }
        break;
      
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push({
            code: 'INVALID_TYPE',
            message: `Expected boolean value for ${observation.metricId}, got ${typeof value}`,
            severity: 'ERROR',
            field: 'normalizedValue'
          });
        }
        break;
      
      case 'currency':
        if (typeof value !== 'number') {
          errors.push({
            code: 'INVALID_TYPE',
            message: `Expected numeric value for currency metric ${observation.metricId}, got ${typeof value}`,
            severity: 'ERROR',
            field: 'normalizedValue'
          });
        } else if (value < 0) {
          errors.push({
            code: 'NEGATIVE_CURRENCY',
            message: `Currency value cannot be negative for ${observation.metricId}`,
            severity: 'ERROR',
            field: 'normalizedValue'
          });
        }
        break;
      
      case 'height':
        if (typeof value !== 'number') {
          errors.push({
            code: 'INVALID_TYPE',
            message: `Expected numeric value for height metric ${observation.metricId}, got ${typeof value}`,
            severity: 'ERROR',
            field: 'normalizedValue'
          });
        } else if (value < 100 || value > 250) {
          warnings.push({
            code: 'UNUSUAL_HEIGHT',
            message: `Height value ${value} cm is outside typical range (100-250cm) for ${observation.metricId}`,
            field: 'normalizedValue'
          });
        }
        break;
      
      case 'weight':
        if (typeof value !== 'number') {
          errors.push({
            code: 'INVALID_TYPE',
            message: `Expected numeric value for weight metric ${observation.metricId}, got ${typeof value}`,
            severity: 'ERROR',
            field: 'normalizedValue'
          });
        } else if (value < 40 || value > 120) {
          warnings.push({
            code: 'UNUSUAL_WEIGHT',
            message: `Weight value ${value} kg is outside typical range (40-120kg) for ${observation.metricId}`,
            field: 'normalizedValue'
          });
        }
        break;
    }
  }
  
  /**
   * Apply validation rules from definition
   */
  private applyValidationRules(
    observation: CanonicalObservation,
    definition: ObservationDefinition,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const value = observation.normalizedValue;
    
    for (const rule of definition.validationRules) {
      const result = this.applyRule(value, rule);
      
      if (!result.passed) {
        if (rule.severity === 'ERROR') {
          errors.push({
            code: rule.ruleId,
            message: rule.errorMessage,
            severity: 'ERROR',
            field: 'normalizedValue'
          });
        } else {
          warnings.push({
            code: rule.ruleId,
            message: rule.errorMessage,
            field: 'normalizedValue'
          });
        }
      }
    }
  }
  
  /**
   * Apply a single validation rule
   */
  private applyRule(value: any, rule: ValidationRule): { passed: boolean } {
    switch (rule.type) {
      case 'range':
        return this.applyRangeRule(value, rule.condition);
      
      case 'regex':
        return this.applyRegexRule(value, rule.condition);
      
      case 'enum':
        return this.applyEnumRule(value, rule.condition);
      
      case 'custom':
        return this.applyCustomRule(value, rule.condition);
      
      default:
        return { passed: true };
    }
  }
  
  /**
   * Apply range validation rule
   */
  private applyRangeRule(value: any, condition: any): { passed: boolean } {
    if (value === null || value === undefined) {
      return { passed: true }; // Null values don't fail range checks
    }
    
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (typeof numValue !== 'number' || isNaN(numValue)) {
      return { passed: true }; // Non-numeric values don't fail range checks
    }
    
    if (condition.min !== undefined && numValue < condition.min) {
      return { passed: false };
    }
    
    if (condition.max !== undefined && numValue > condition.max) {
      return { passed: false };
    }
    
    return { passed: true };
  }
  
  /**
   * Apply regex validation rule
   */
  private applyRegexRule(value: any, condition: any): { passed: boolean } {
    if (value === null || value === undefined) {
      return { passed: true };
    }
    
    if (typeof value !== 'string') {
      return { passed: false };
    }
    
    const regex = new RegExp(condition.pattern);
    return { passed: regex.test(value) };
  }
  
  /**
   * Apply enum validation rule
   */
  private applyEnumRule(value: any, condition: any): { passed: boolean } {
    if (value === null || value === undefined) {
      return { passed: true };
    }
    
    const normalizedValue = String(value).toLowerCase();
    const allowedValues = condition.allowedValues.map((v: string) => v.toLowerCase());
    
    return { passed: allowedValues.includes(normalizedValue) };
  }
  
  /**
   * Apply custom validation rule
   */
  private applyCustomRule(value: any, condition: any): { passed: boolean } {
    // Custom rules would be implemented as functions
    // For now, return true
    return { passed: true };
  }
  
  /**
   * Validate normalization status
   */
  private validateNormalization(
    observation: CanonicalObservation,
    definition: ObservationDefinition,
    warnings: ValidationWarning[]
  ): void {
    if (observation.normalizationStatus === 'NOT_NORMALIZED') {
      warnings.push({
        code: 'NOT_NORMALIZED',
        message: `Observation ${observation.metricId} was not normalized from unit ${observation.rawUnit} to ${definition.canonicalUnit}`,
        field: 'normalizationStatus'
      });
    } else if (observation.normalizationStatus === 'NORMALIZATION_FAILED') {
      warnings.push({
        code: 'NORMALIZATION_FAILED',
        message: `Observation ${observation.metricId} normalization failed: ${observation.normalizationReason}`,
        field: 'normalizationStatus'
      });
    }
  }
  
  /**
   * Determine validation status
   */
  private determineValidationStatus(
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): ValidationResult['validationStatus'] {
    if (errors.length > 0) {
      return 'INVALID';
    }
    
    if (warnings.length > 0) {
      return 'SUSPICIOUS';
    }
    
    return 'VALID';
  }
  
  /**
   * Calculate validation confidence
   */
  private calculateValidationConfidence(
    errors: ValidationError[],
    warnings: ValidationWarning[],
    status: ValidationResult['validationStatus']
  ): number {
    switch (status) {
      case 'VALID':
        return 1.0;
      
      case 'INVALID':
        return 0.0;
      
      case 'SUSPICIOUS':
        // Reduce confidence based on number of warnings
        const warningPenalty = Math.min(warnings.length * 0.1, 0.5);
        return 0.8 - warningPenalty;
      
      case 'UNKNOWN':
        return 0.5;
      
      default:
        return 0.5;
    }
  }
  
  /**
   * Check if date string is valid
   */
  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }
  
  /**
   * Batch validate multiple observations
   */
  public validateBatch(observations: CanonicalObservation[]): Map<string, ValidationResult> {
    const results = new Map<string, ValidationResult>();
    
    for (const observation of observations) {
      const result = this.validateObservation(observation);
      results.set(observation.observationId, result);
    }
    
    return results;
  }
}
