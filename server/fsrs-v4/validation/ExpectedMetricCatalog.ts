export interface ExpectedMetric {
  metricId: string;
  category: string;
  requiredForValidation: boolean;
  availabilityClass: 'COMMON' | 'PROVIDER_SPECIFIC' | 'OPTIONAL';
  description: string;
  unit: string;
}

export class ExpectedMetricCatalog {
  private metrics: Map<string, ExpectedMetric>;

  constructor() {
    this.metrics = new Map();
    this.initializeCatalog();
  }

  private initializeCatalog(): void {
    const catalog: ExpectedMetric[] = [
      // Identity
      { metricId: 'fullName', category: 'identity', requiredForValidation: true, availabilityClass: 'COMMON', description: 'Player full name', unit: 'string' },
      { metricId: 'dateOfBirth', category: 'identity', requiredForValidation: true, availabilityClass: 'COMMON', description: 'Date of birth', unit: 'date' },
      { metricId: 'age', category: 'identity', requiredForValidation: true, availabilityClass: 'COMMON', description: 'Current age', unit: 'years' },
      { metricId: 'nationality', category: 'identity', requiredForValidation: true, availabilityClass: 'COMMON', description: 'Primary nationality', unit: 'string' },
      { metricId: 'birthPlace', category: 'identity', requiredForValidation: false, availabilityClass: 'COMMON', description: 'Place of birth', unit: 'string' },
      
      // Physical
      { metricId: 'height_cm', category: 'physical', requiredForValidation: false, availabilityClass: 'COMMON', description: 'Height in centimeters', unit: 'cm' },
      { metricId: 'preferredFoot', category: 'physical', requiredForValidation: false, availabilityClass: 'COMMON', description: 'Preferred foot', unit: 'string' },
      
      // Club
      { metricId: 'currentClub', category: 'club', requiredForValidation: true, availabilityClass: 'COMMON', description: 'Current club', unit: 'string' },
      { metricId: 'league', category: 'club', requiredForValidation: true, availabilityClass: 'COMMON', description: 'Current league', unit: 'string' },
      { metricId: 'primaryPosition', category: 'club', requiredForValidation: true, availabilityClass: 'COMMON', description: 'Primary position', unit: 'string' },
      { metricId: 'secondaryPositions', category: 'club', requiredForValidation: false, availabilityClass: 'COMMON', description: 'Secondary positions', unit: 'string' },
      { metricId: 'shirtNumber', category: 'club', requiredForValidation: false, availabilityClass: 'COMMON', description: 'Shirt number', unit: 'number' },
      
      // Contract
      { metricId: 'contractStart', category: 'contract', requiredForValidation: false, availabilityClass: 'COMMON', description: 'Contract start date', unit: 'date' },
      { metricId: 'contractExpiry', category: 'contract', requiredForValidation: false, availabilityClass: 'COMMON', description: 'Contract expiry date', unit: 'date' },
      { metricId: 'agent', category: 'contract', requiredForValidation: false, availabilityClass: 'PROVIDER_SPECIFIC', description: 'Agent name', unit: 'string' },
      
      // Market Value
      { metricId: 'marketValue', category: 'market_value', requiredForValidation: false, availabilityClass: 'PROVIDER_SPECIFIC', description: 'Current market value', unit: 'eur' },
      
      // Season Appearances
      { metricId: 'matches', category: 'season_appearances', requiredForValidation: true, availabilityClass: 'COMMON', description: 'Total matches played', unit: 'count' },
      { metricId: 'starts', category: 'season_appearances', requiredForValidation: false, availabilityClass: 'PROVIDER_SPECIFIC', description: 'Matches started', unit: 'count' },
      { metricId: 'minutes', category: 'season_appearances', requiredForValidation: true, availabilityClass: 'COMMON', description: 'Minutes played', unit: 'minutes' },
      
      // Goals
      { metricId: 'goals', category: 'goals', requiredForValidation: true, availabilityClass: 'COMMON', description: 'Goals scored', unit: 'count' },
      { metricId: 'xG', category: 'goals', requiredForValidation: false, availabilityClass: 'PROVIDER_SPECIFIC', description: 'Expected goals', unit: 'float' },
      { metricId: 'npg', category: 'goals', requiredForValidation: false, availabilityClass: 'PROVIDER_SPECIFIC', description: 'Non-penalty goals', unit: 'count' },
      { metricId: 'npxG', category: 'goals', requiredForValidation: false, availabilityClass: 'PROVIDER_SPECIFIC', description: 'Non-penalty expected goals', unit: 'float' },
      
      // Assists
      { metricId: 'assists', category: 'assists', requiredForValidation: true, availabilityClass: 'COMMON', description: 'Assists', unit: 'count' },
      { metricId: 'xA', category: 'assists', requiredForValidation: false, availabilityClass: 'PROVIDER_SPECIFIC', description: 'Expected assists', unit: 'float' },
      
      // Cards
      { metricId: 'yellowCards', category: 'cards', requiredForValidation: false, availabilityClass: 'COMMON', description: 'Yellow cards', unit: 'count' },
      { metricId: 'redCards', category: 'cards', requiredForValidation: false, availabilityClass: 'COMMON', description: 'Red cards', unit: 'count' },
      
      // National Team
      { metricId: 'nationalTeamCaps', category: 'national_team', requiredForValidation: false, availabilityClass: 'COMMON', description: 'National team caps', unit: 'count' },
      { metricId: 'nationalTeamGoals', category: 'national_team', requiredForValidation: false, availabilityClass: 'COMMON', description: 'National team goals', unit: 'count' },
      
      // Injury
      { metricId: 'injury_days_latest', category: 'injury', requiredForValidation: false, availabilityClass: 'PROVIDER_SPECIFIC', description: 'Latest injury days', unit: 'days' },
      { metricId: 'injury_count_latest', category: 'injury', requiredForValidation: false, availabilityClass: 'PROVIDER_SPECIFIC', description: 'Latest injury count', unit: 'count' },
      { metricId: 'matches_missed_latest', category: 'injury', requiredForValidation: false, availabilityClass: 'PROVIDER_SPECIFIC', description: 'Matches missed due to injury', unit: 'count' },
      
      // Transfer
      { metricId: 'transferHistory', category: 'transfer', requiredForValidation: false, availabilityClass: 'PROVIDER_SPECIFIC', description: 'Transfer history', unit: 'array' },
      
      // Advanced Stats (Optional)
      { metricId: 'shots', category: 'season_appearances', requiredForValidation: false, availabilityClass: 'PROVIDER_SPECIFIC', description: 'Total shots', unit: 'count' },
      { metricId: 'key_passes', category: 'assists', requiredForValidation: false, availabilityClass: 'PROVIDER_SPECIFIC', description: 'Key passes', unit: 'count' },
      { metricId: 'passes', category: 'season_appearances', requiredForValidation: false, availabilityClass: 'PROVIDER_SPECIFIC', description: 'Total passes', unit: 'count' },
      { metricId: 'tackles', category: 'season_appearances', requiredForValidation: false, availabilityClass: 'PROVIDER_SPECIFIC', description: 'Tackles', unit: 'count' },
      { metricId: 'interceptions', category: 'season_appearances', requiredForValidation: false, availabilityClass: 'PROVIDER_SPECIFIC', description: 'Interceptions', unit: 'count' },
      { metricId: 'duels', category: 'season_appearances', requiredForValidation: false, availabilityClass: 'PROVIDER_SPECIFIC', description: 'Duels won', unit: 'count' },
      { metricId: 'fouls', category: 'season_appearances', requiredForValidation: false, availabilityClass: 'PROVIDER_SPECIFIC', description: 'Fouls committed', unit: 'count' },
      { metricId: 'clearances', category: 'season_appearances', requiredForValidation: false, availabilityClass: 'PROVIDER_SPECIFIC', description: 'Clearances', unit: 'count' }
    ];

    for (const metric of catalog) {
      this.metrics.set(metric.metricId, metric);
    }
  }

  public getMetric(metricId: string): ExpectedMetric | undefined {
    return this.metrics.get(metricId);
  }

  public getAllMetrics(): ExpectedMetric[] {
    return Array.from(this.metrics.values());
  }

  public getRequiredMetrics(): ExpectedMetric[] {
    return this.getAllMetrics().filter(m => m.requiredForValidation);
  }

  public getMetricsByCategory(category: string): ExpectedMetric[] {
    return this.getAllMetrics().filter(m => m.category === category);
  }

  public calculateCoverage(observedMetricIds: string[]): {
    expectedMetricCount: number;
    observedMetricCount: number;
    missingMetricCount: number;
    coverage: number;
    missingMetrics: ExpectedMetric[];
  } {
    const expectedMetrics = this.getAllMetrics();
    const observedSet = new Set(observedMetricIds);
    
    const observedMetrics = expectedMetrics.filter(m => observedSet.has(m.metricId));
    const missingMetrics = expectedMetrics.filter(m => !observedSet.has(m.metricId));
    
    const coverage = expectedMetrics.length > 0 ? (observedMetrics.length / expectedMetrics.length) * 100 : 0;

    return {
      expectedMetricCount: expectedMetrics.length,
      observedMetricCount: observedMetrics.length,
      missingMetricCount: missingMetrics.length,
      coverage: Math.round(coverage),
      missingMetrics
    };
  }
}
