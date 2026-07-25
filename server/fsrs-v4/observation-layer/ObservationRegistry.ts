/**
 * Observation Registry
 * 
 * Central registry for observation types, units, normalization rules, and validation rules.
 * This ensures consistent observation handling across all data sources.
 */

import { ObservationType } from './CanonicalObservation';

export interface ObservationDefinition {
  metricId: string;
  observationType: ObservationType;
  dataType: 'numeric' | 'string' | 'date' | 'boolean' | 'currency' | 'height' | 'weight';
  
  // Unit normalization
  allowedRawUnits: string[];
  canonicalUnit: string;
  unitConversionRules: UnitConversionRule[];
  
  // Validation rules
  validationRules: ValidationRule[];
  requiredFields: string[];
  
  // Scope requirements
  scopeRequired: boolean;
  allowedScopeTypes: string[];
  
  // Freshness requirements
  freshnessSensitive: boolean;
  maxAgeDays?: number;
}

export interface UnitConversionRule {
  fromUnit: string;
  toUnit: string;
  conversionFactor: number;
  offset?: number;
}

export interface ValidationRule {
  ruleId: string;
  type: 'range' | 'regex' | 'enum' | 'custom';
  condition: any;
  errorMessage: string;
  severity: 'ERROR' | 'WARNING';
}

export class ObservationRegistry {
  private definitions: Map<string, ObservationDefinition>;
  
  constructor() {
    this.definitions = new Map();
    this.initializeRegistry();
  }
  
  private initializeRegistry(): void {
    const definitions: ObservationDefinition[] = [
      // Identity
      {
        metricId: 'fullName',
        observationType: 'identity',
        dataType: 'string',
        allowedRawUnits: ['string'],
        canonicalUnit: 'string',
        unitConversionRules: [],
        validationRules: [
          {
            ruleId: 'min_length',
            type: 'range',
            condition: { min: 2 },
            errorMessage: 'Name must be at least 2 characters',
            severity: 'ERROR'
          },
          {
            ruleId: 'max_length',
            type: 'range',
            condition: { max: 100 },
            errorMessage: 'Name must not exceed 100 characters',
            severity: 'WARNING'
          }
        ],
        requiredFields: [],
        scopeRequired: false,
        allowedScopeTypes: [],
        freshnessSensitive: false
      },
      {
        metricId: 'dateOfBirth',
        observationType: 'identity',
        dataType: 'date',
        allowedRawUnits: ['date_tr', 'date_iso', 'timestamp'],
        canonicalUnit: 'date_iso',
        unitConversionRules: [
          { fromUnit: 'date_tr', toUnit: 'date_iso', conversionFactor: 1 },
          { fromUnit: 'timestamp', toUnit: 'date_iso', conversionFactor: 1000 }
        ],
        validationRules: [
          {
            ruleId: 'reasonable_range',
            type: 'range',
            condition: { min: new Date('1950-01-01').getTime(), max: new Date().getTime() },
            errorMessage: 'Date of birth must be after 1950',
            severity: 'ERROR'
          }
        ],
        requiredFields: [],
        scopeRequired: false,
        allowedScopeTypes: [],
        freshnessSensitive: false
      },
      {
        metricId: 'age',
        observationType: 'identity',
        dataType: 'numeric',
        allowedRawUnits: ['years'],
        canonicalUnit: 'years',
        unitConversionRules: [],
        validationRules: [
          {
            ruleId: 'reasonable_range',
            type: 'range',
            condition: { min: 15, max: 50 },
            errorMessage: 'Age must be between 15 and 50',
            severity: 'ERROR'
          }
        ],
        requiredFields: [],
        scopeRequired: false,
        allowedScopeTypes: [],
        freshnessSensitive: true,
        maxAgeDays: 365
      },
      {
        metricId: 'nationality',
        observationType: 'identity',
        dataType: 'string',
        allowedRawUnits: ['string', 'iso_code'],
        canonicalUnit: 'iso_code',
        unitConversionRules: [],
        validationRules: [
          {
            ruleId: 'valid_country',
            type: 'enum',
            condition: { allowedValues: this.getCountryCodes() },
            errorMessage: 'Invalid country code',
            severity: 'WARNING'
          }
        ],
        requiredFields: [],
        scopeRequired: false,
        allowedScopeTypes: [],
        freshnessSensitive: false
      },
      
      // Physical
      {
        metricId: 'height_cm',
        observationType: 'physical',
        dataType: 'height',
        allowedRawUnits: ['cm', 'm', 'height_tr', 'height_in'],
        canonicalUnit: 'cm',
        unitConversionRules: [
          { fromUnit: 'm', toUnit: 'cm', conversionFactor: 100 },
          { fromUnit: 'height_tr', toUnit: 'cm', conversionFactor: 100 },
          { fromUnit: 'height_in', toUnit: 'cm', conversionFactor: 2.54 }
        ],
        validationRules: [
          {
            ruleId: 'reasonable_range',
            type: 'range',
            condition: { min: 150, max: 220 },
            errorMessage: 'Height must be between 150cm and 220cm',
            severity: 'ERROR'
          }
        ],
        requiredFields: [],
        scopeRequired: false,
        allowedScopeTypes: [],
        freshnessSensitive: false
      },
      {
        metricId: 'preferredFoot',
        observationType: 'physical',
        dataType: 'string',
        allowedRawUnits: ['string'],
        canonicalUnit: 'string',
        unitConversionRules: [],
        validationRules: [
          {
            ruleId: 'valid_foot',
            type: 'enum',
            condition: { allowedValues: ['left', 'right', 'both', 'unknown'] },
            errorMessage: 'Invalid preferred foot value',
            severity: 'ERROR'
          }
        ],
        requiredFields: [],
        scopeRequired: false,
        allowedScopeTypes: [],
        freshnessSensitive: false
      },
      
      // Club
      {
        metricId: 'currentClub',
        observationType: 'club',
        dataType: 'string',
        allowedRawUnits: ['string', 'club_id'],
        canonicalUnit: 'string',
        unitConversionRules: [],
        validationRules: [
          {
            ruleId: 'min_length',
            type: 'range',
            condition: { min: 2 },
            errorMessage: 'Club name must be at least 2 characters',
            severity: 'ERROR'
          }
        ],
        requiredFields: [],
        scopeRequired: false,
        allowedScopeTypes: [],
        freshnessSensitive: true,
        maxAgeDays: 30
      },
      {
        metricId: 'league',
        observationType: 'club',
        dataType: 'string',
        allowedRawUnits: ['string', 'league_id'],
        canonicalUnit: 'string',
        unitConversionRules: [],
        validationRules: [
          {
            ruleId: 'min_length',
            type: 'range',
            condition: { min: 2 },
            errorMessage: 'League name must be at least 2 characters',
            severity: 'ERROR'
          }
        ],
        requiredFields: ['competition'],
        scopeRequired: true,
        allowedScopeTypes: ['league', 'cup', 'continental'],
        freshnessSensitive: true,
        maxAgeDays: 30
      },
      {
        metricId: 'primaryPosition',
        observationType: 'position',
        dataType: 'string',
        allowedRawUnits: ['string', 'position_code'],
        canonicalUnit: 'string',
        unitConversionRules: [],
        validationRules: [
          {
            ruleId: 'valid_position',
            type: 'enum',
            condition: { allowedValues: this.getPositionCodes() },
            errorMessage: 'Invalid position value',
            severity: 'WARNING'
          }
        ],
        requiredFields: [],
        scopeRequired: false,
        allowedScopeTypes: [],
        freshnessSensitive: true,
        maxAgeDays: 90
      },
      
      // Season Appearances
      {
        metricId: 'matches',
        observationType: 'season_appearances',
        dataType: 'numeric',
        allowedRawUnits: ['count'],
        canonicalUnit: 'count',
        unitConversionRules: [],
        validationRules: [
          {
            ruleId: 'non_negative',
            type: 'range',
            condition: { min: 0 },
            errorMessage: 'Matches cannot be negative',
            severity: 'ERROR'
          },
          {
            ruleId: 'reasonable_max',
            type: 'range',
            condition: { max: 100 },
            errorMessage: 'Matches count seems unusually high',
            severity: 'WARNING'
          }
        ],
        requiredFields: ['season', 'competition'],
        scopeRequired: true,
        allowedScopeTypes: ['league', 'cup', 'continental', 'all_competitions'],
        freshnessSensitive: true,
        maxAgeDays: 7
      },
      {
        metricId: 'minutes',
        observationType: 'season_appearances',
        dataType: 'numeric',
        allowedRawUnits: ['minutes'],
        canonicalUnit: 'minutes',
        unitConversionRules: [
          { fromUnit: 'hours', toUnit: 'minutes', conversionFactor: 60 }
        ],
        validationRules: [
          {
            ruleId: 'non_negative',
            type: 'range',
            condition: { min: 0 },
            errorMessage: 'Minutes cannot be negative',
            severity: 'ERROR'
          },
          {
            ruleId: 'reasonable_max',
            type: 'range',
            condition: { max: 10000 },
            errorMessage: 'Minutes count seems unusually high',
            severity: 'WARNING'
          }
        ],
        requiredFields: ['season', 'competition'],
        scopeRequired: true,
        allowedScopeTypes: ['league', 'cup', 'continental', 'all_competitions'],
        freshnessSensitive: true,
        maxAgeDays: 7
      },
      
      // Goals
      {
        metricId: 'goals',
        observationType: 'goals',
        dataType: 'numeric',
        allowedRawUnits: ['count'],
        canonicalUnit: 'count',
        unitConversionRules: [],
        validationRules: [
          {
            ruleId: 'non_negative',
            type: 'range',
            condition: { min: 0 },
            errorMessage: 'Goals cannot be negative',
            severity: 'ERROR'
          },
          {
            ruleId: 'reasonable_max',
            type: 'range',
            condition: { max: 100 },
            errorMessage: 'Goals count seems unusually high',
            severity: 'WARNING'
          }
        ],
        requiredFields: ['season', 'competition'],
        scopeRequired: true,
        allowedScopeTypes: ['league', 'cup', 'continental', 'all_competitions'],
        freshnessSensitive: true,
        maxAgeDays: 7
      },
      {
        metricId: 'xG',
        observationType: 'goals',
        dataType: 'numeric',
        allowedRawUnits: ['float'],
        canonicalUnit: 'float',
        unitConversionRules: [],
        validationRules: [
          {
            ruleId: 'non_negative',
            type: 'range',
            condition: { min: 0 },
            errorMessage: 'xG cannot be negative',
            severity: 'ERROR'
          }
        ],
        requiredFields: ['season', 'competition'],
        scopeRequired: true,
        allowedScopeTypes: ['league', 'cup', 'continental'],
        freshnessSensitive: true,
        maxAgeDays: 7
      },
      
      // Assists
      {
        metricId: 'assists',
        observationType: 'assists',
        dataType: 'numeric',
        allowedRawUnits: ['count'],
        canonicalUnit: 'count',
        unitConversionRules: [],
        validationRules: [
          {
            ruleId: 'non_negative',
            type: 'range',
            condition: { min: 0 },
            errorMessage: 'Assists cannot be negative',
            severity: 'ERROR'
          },
          {
            ruleId: 'reasonable_max',
            type: 'range',
            condition: { max: 50 },
            errorMessage: 'Assists count seems unusually high',
            severity: 'WARNING'
          }
        ],
        requiredFields: ['season', 'competition'],
        scopeRequired: true,
        allowedScopeTypes: ['league', 'cup', 'continental', 'all_competitions'],
        freshnessSensitive: true,
        maxAgeDays: 7
      },
      {
        metricId: 'xA',
        observationType: 'assists',
        dataType: 'numeric',
        allowedRawUnits: ['float'],
        canonicalUnit: 'float',
        unitConversionRules: [],
        validationRules: [
          {
            ruleId: 'non_negative',
            type: 'range',
            condition: { min: 0 },
            errorMessage: 'xA cannot be negative',
            severity: 'ERROR'
          }
        ],
        requiredFields: ['season', 'competition'],
        scopeRequired: true,
        allowedScopeTypes: ['league', 'cup', 'continental'],
        freshnessSensitive: true,
        maxAgeDays: 7
      },
      
      // Cards
      {
        metricId: 'yellowCards',
        observationType: 'cards',
        dataType: 'numeric',
        allowedRawUnits: ['count'],
        canonicalUnit: 'count',
        unitConversionRules: [],
        validationRules: [
          {
            ruleId: 'non_negative',
            type: 'range',
            condition: { min: 0 },
            errorMessage: 'Yellow cards cannot be negative',
            severity: 'ERROR'
          },
          {
            ruleId: 'reasonable_max',
            type: 'range',
            condition: { max: 30 },
            errorMessage: 'Yellow cards count seems unusually high',
            severity: 'WARNING'
          }
        ],
        requiredFields: ['season', 'competition'],
        scopeRequired: true,
        allowedScopeTypes: ['league', 'cup', 'continental', 'all_competitions'],
        freshnessSensitive: true,
        maxAgeDays: 7
      },
      {
        metricId: 'redCards',
        observationType: 'cards',
        dataType: 'numeric',
        allowedRawUnits: ['count'],
        canonicalUnit: 'count',
        unitConversionRules: [],
        validationRules: [
          {
            ruleId: 'non_negative',
            type: 'range',
            condition: { min: 0 },
            errorMessage: 'Red cards cannot be negative',
            severity: 'ERROR'
          },
          {
            ruleId: 'reasonable_max',
            type: 'range',
            condition: { max: 10 },
            errorMessage: 'Red cards count seems unusually high',
            severity: 'WARNING'
          }
        ],
        requiredFields: ['season', 'competition'],
        scopeRequired: true,
        allowedScopeTypes: ['league', 'cup', 'continental', 'all_competitions'],
        freshnessSensitive: true,
        maxAgeDays: 7
      },
      
      // Market Value
      {
        metricId: 'marketValue',
        observationType: 'market_value',
        dataType: 'currency',
        allowedRawUnits: ['eur', 'gbp', 'usd', 'mil_eur', 'mil_gbp', 'mil_usd'],
        canonicalUnit: 'eur',
        unitConversionRules: [
          { fromUnit: 'mil_eur', toUnit: 'eur', conversionFactor: 1000000 },
          { fromUnit: 'mil_gbp', toUnit: 'eur', conversionFactor: 1000000, offset: 0.15 }, // Approximate GBP to EUR
          { fromUnit: 'mil_usd', toUnit: 'eur', conversionFactor: 1000000, offset: 0.1 }, // Approximate USD to EUR
          { fromUnit: 'gbp', toUnit: 'eur', conversionFactor: 1.15 },
          { fromUnit: 'usd', toUnit: 'eur', conversionFactor: 0.92 }
        ],
        validationRules: [
          {
            ruleId: 'non_negative',
            type: 'range',
            condition: { min: 0 },
            errorMessage: 'Market value cannot be negative',
            severity: 'ERROR'
          },
          {
            ruleId: 'reasonable_max',
            type: 'range',
            condition: { max: 500000000 }, // 500 million EUR
            errorMessage: 'Market value seems unusually high',
            severity: 'WARNING'
          }
        ],
        requiredFields: [],
        scopeRequired: false,
        allowedScopeTypes: [],
        freshnessSensitive: true,
        maxAgeDays: 30
      },
      
      // Contract
      {
        metricId: 'contractStart',
        observationType: 'contract',
        dataType: 'date',
        allowedRawUnits: ['date_tr', 'date_iso'],
        canonicalUnit: 'date_iso',
        unitConversionRules: [
          { fromUnit: 'date_tr', toUnit: 'date_iso', conversionFactor: 1 }
        ],
        validationRules: [
          {
            ruleId: 'reasonable_range',
            type: 'range',
            condition: { min: new Date('1990-01-01').getTime(), max: new Date('2030-01-01').getTime() },
            errorMessage: 'Contract start date seems unreasonable',
            severity: 'ERROR'
          }
        ],
        requiredFields: [],
        scopeRequired: false,
        allowedScopeTypes: [],
        freshnessSensitive: false
      },
      {
        metricId: 'contractExpiry',
        observationType: 'contract',
        dataType: 'date',
        allowedRawUnits: ['date_tr', 'date_iso'],
        canonicalUnit: 'date_iso',
        unitConversionRules: [
          { fromUnit: 'date_tr', toUnit: 'date_iso', conversionFactor: 1 }
        ],
        validationRules: [
          {
            ruleId: 'reasonable_range',
            type: 'range',
            condition: { min: new Date('2020-01-01').getTime(), max: new Date('2035-01-01').getTime() },
            errorMessage: 'Contract expiry date seems unreasonable',
            severity: 'ERROR'
          }
        ],
        requiredFields: [],
        scopeRequired: false,
        allowedScopeTypes: [],
        freshnessSensitive: true,
        maxAgeDays: 30
      },
      
      // National Team
      {
        metricId: 'nationalTeamCaps',
        observationType: 'national_team',
        dataType: 'numeric',
        allowedRawUnits: ['count'],
        canonicalUnit: 'count',
        unitConversionRules: [],
        validationRules: [
          {
            ruleId: 'non_negative',
            type: 'range',
            condition: { min: 0 },
            errorMessage: 'National team caps cannot be negative',
            severity: 'ERROR'
          },
          {
            ruleId: 'reasonable_max',
            type: 'range',
            condition: { max: 200 },
            errorMessage: 'National team caps count seems unusually high',
            severity: 'WARNING'
          }
        ],
        requiredFields: [],
        scopeRequired: false,
        allowedScopeTypes: [],
        freshnessSensitive: true,
        maxAgeDays: 30
      }
    ];
    
    for (const definition of definitions) {
      this.definitions.set(definition.metricId, definition);
    }
  }
  
  public getDefinition(metricId: string): ObservationDefinition | undefined {
    return this.definitions.get(metricId);
  }
  
  public getAllDefinitions(): ObservationDefinition[] {
    return Array.from(this.definitions.values());
  }
  
  public getDefinitionsByType(observationType: ObservationType): ObservationDefinition[] {
    return this.getAllDefinitions().filter(d => d.observationType === observationType);
  }
  
  private getCountryCodes(): string[] {
    // Common country codes (would be expanded in production)
    return ['TR', 'GB', 'DE', 'FR', 'ES', 'IT', 'BR', 'AR', 'US', 'NL', 'PT', 'BE', 'AT', 'CH', 'GR', 'RU', 'UA', 'PL', 'CZ', 'HR', 'RS', 'BI', 'MK', 'AL', 'RO', 'BG', 'HU', 'SK', 'SI', 'HR', 'BA', 'ME', 'XK'];
  }
  
  private getPositionCodes(): string[] {
    return ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF', 'SS'];
  }
}
