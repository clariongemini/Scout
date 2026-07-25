/**
 * Normalization Engine
 * 
 * Converts raw observations into canonical observations by normalizing:
 * - Units (cm, m, EUR, etc.)
 * - Dates (various formats to ISO)
 * - Names (special characters, capitalization)
 * - Positions (various codes to canonical codes)
 * - Competitions (various names to canonical IDs)
 * - Currency (various currencies to EUR)
 */

import { CanonicalObservation } from './CanonicalObservation';
import { ObservationRegistry, ObservationDefinition } from './ObservationRegistry';
import { DictionaryRepository } from './DictionaryRepository';

export interface NormalizationResult {
  success: boolean;
  normalizedValue: number | string | null;
  normalizedUnit: string;
  status: 'NORMALIZED' | 'PARTIALLY_NORMALIZED' | 'NOT_NORMALIZED' | 'NORMALIZATION_FAILED';
  reason?: string;
}

export class NormalizationEngine {
  private registry: ObservationRegistry;
  private dictionaryRepository: DictionaryRepository;
  
  constructor(dictionaryPath?: string) {
    this.registry = new ObservationRegistry();
    this.dictionaryRepository = new DictionaryRepository(dictionaryPath);
    this.dictionaryRepository.loadAll();
  }
  
  /**
   * Normalize a canonical observation
   */
  public normalizeObservation(observation: CanonicalObservation): CanonicalObservation {
    const definition = this.registry.getDefinition(observation.metricId);
    
    if (!definition) {
      return {
        ...observation,
        normalizationStatus: 'NOT_NORMALIZED',
        normalizationReason: `No definition found for metric: ${observation.metricId}`
      };
    }
    
    const result = this.normalizeValue(
      observation.rawValue,
      observation.rawUnit,
      definition
    );
    
    return {
      ...observation,
      normalizedValue: result.normalizedValue,
      normalizedUnit: result.normalizedUnit,
      normalizationStatus: result.status,
      normalizationReason: result.reason
    };
  }
  
  /**
   * Normalize a value based on its definition
   */
  private normalizeValue(
    rawValue: string | number | null,
    rawUnit: string,
    definition: ObservationDefinition
  ): NormalizationResult {
    if (rawValue === null || rawValue === undefined) {
      return {
        success: true,
        normalizedValue: null,
        normalizedUnit: definition.canonicalUnit,
        status: 'NORMALIZED',
        reason: 'Null value - no normalization needed'
      };
    }
    
    // If already in canonical unit, no conversion needed
    if (rawUnit === definition.canonicalUnit) {
      return {
        success: true,
        normalizedValue: rawValue,
        normalizedUnit: definition.canonicalUnit,
        status: 'NORMALIZED'
      };
    }
    
    // Find conversion rule
    const conversionRule = definition.unitConversionRules.find(
      rule => rule.fromUnit === rawUnit
    );
    
    if (!conversionRule) {
      return {
        success: false,
        normalizedValue: rawValue,
        normalizedUnit: rawUnit,
        status: 'NOT_NORMALIZED',
        reason: `No conversion rule found for unit: ${rawUnit}`
      };
    }
    
    // Apply conversion
    try {
      const normalizedValue = this.applyConversion(rawValue, conversionRule);
      
      return {
        success: true,
        normalizedValue,
        normalizedUnit: definition.canonicalUnit,
        status: 'NORMALIZED'
      };
    } catch (error) {
      return {
        success: false,
        normalizedValue: rawValue,
        normalizedUnit: rawUnit,
        status: 'NORMALIZATION_FAILED',
        reason: `Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Apply unit conversion
   */
  private applyConversion(rawValue: string | number, rule: any): number | string {
    const numericValue = typeof rawValue === 'string' ? this.parseNumeric(rawValue) : rawValue;
    
    if (numericValue === null) {
      throw new Error('Cannot convert non-numeric value');
    }
    
    let result = numericValue * rule.conversionFactor;
    
    if (rule.offset !== undefined) {
      result = result * (1 + rule.offset);
    }
    
    // Round to reasonable precision
    return Math.round(result * 1000) / 1000;
  }
  
  /**
   * Parse numeric value from string
   */
  private parseNumeric(value: string): number | null {
    // Remove common non-numeric characters
    const cleaned = value
      .replace(/[^\d.,-]/g, '')
      .replace(',', '.'); // Handle European decimal format
    
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? null : parsed;
  }
  
  /**
   * Normalize date string to ISO format
   */
  public normalizeDate(dateString: string): string | null {
    if (!dateString) return null;
    
    // Turkish date format: "3 Nis 1999"
    const turkishDateMatch = dateString.match(/^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/);
    if (turkishDateMatch) {
      const [, day, monthTurkish, year] = turkishDateMatch;
      const month = this.turkishMonthToNumber(monthTurkish);
      if (month) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    
    // ISO format: "1999-04-03"
    const isoMatch = dateString.match(/^\d{4}-\d{2}-\d{2}$/);
    if (isoMatch) {
      return dateString;
    }
    
    // Try to parse with Date
    const parsed = new Date(dateString);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    
    return null;
  }
  
  /**
   * Convert Turkish month name to number
   */
  private turkishMonthToNumber(month: string): number | null {
    const months: Record<string, number> = {
      'Oca': 1, 'Şub': 2, 'Mar': 3, 'Nis': 4, 'May': 5, 'Haz': 6,
      'Tem': 7, 'Ağu': 8, 'Eyl': 9, 'Eki': 10, 'Kas': 11, 'Ara': 12
    };
    return months[month] || null;
  }
  
  /**
   * Normalize height string to cm
   */
  public normalizeHeight(heightString: string): number | null {
    if (!heightString) return null;
    
    // Turkish format: "1,84 m"
    const turkishMatch = heightString.match(/^(\d+),(\d+)\s*m$/);
    if (turkishMatch) {
      const meters = parseFloat(turkishMatch[1].replace(',', '.') + '.' + turkishMatch[2]);
      return Math.round(meters * 100);
    }
    
    // Metric format: "184 cm"
    const metricMatch = heightString.match(/^(\d+)\s*cm$/);
    if (metricMatch) {
      return parseInt(metricMatch[1], 10);
    }
    
    // Decimal meters: "1.84"
    const decimalMatch = heightString.match(/^(\d+\.?\d*)$/);
    if (decimalMatch) {
      const meters = parseFloat(decimalMatch[1]);
      return Math.round(meters * 100);
    }
    
    return null;
  }
  
  /**
   * Normalize market value string to EUR
   */
  public normalizeMarketValue(valueString: string): number | null {
    if (!valueString) return null;
    
    // Format: "7.00 mil. €"
    const match = valueString.match(/^([\d.]+)\s*mil\.\s*€?$/);
    if (match) {
      const millions = parseFloat(match[1]);
      return Math.round(millions * 1000000);
    }
    
    // Format: "€7.00m"
    const match2 = valueString.match(/^€?([\d.]+)m$/);
    if (match2) {
      const millions = parseFloat(match2[1]);
      return Math.round(millions * 1000000);
    }
    
    // Format: "€7,000,000"
    const match3 = valueString.match(/^€?([\d,]+)$/);
    if (match3) {
      const value = parseFloat(match3[1].replace(/,/g, ''));
      return Math.round(value);
    }
    
    return null;
  }
  
  /**
   * Normalize position to canonical code
   */
  public normalizePosition(positionString: string): string {
    if (!positionString) return 'unknown';
    
    const normalized = this.dictionaryRepository.resolvePosition(positionString);
    return normalized?.canonicalId || 'unknown';
  }
  
  /**
   * Normalize competition to canonical ID
   */
  public normalizeCompetition(competitionString: string): string {
    if (!competitionString) return 'unknown';
    
    const normalized = this.dictionaryRepository.resolveCompetition(competitionString);
    return normalized?.canonicalId || 'unknown';
  }
  
  /**
   * Normalize team name to canonical form
   */
  public normalizeTeam(teamString: string): string {
    if (!teamString) return 'unknown';
    
    const normalized = this.dictionaryRepository.resolveTeam(teamString);
    return normalized?.displayName || teamString;
  }
  
  /**
   * Normalize nationality to ISO code
   */
  public normalizeNationality(nationalityString: string): string {
    if (!nationalityString) return 'unknown';
    
    const normalized = this.dictionaryRepository.resolveNationality(nationalityString);
    return normalized?.isoCode || 'unknown';
  }
}
