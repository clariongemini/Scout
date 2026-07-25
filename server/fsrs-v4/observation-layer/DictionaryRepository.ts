/**
 * Dictionary Repository
 * 
 * Loads and provides access to canonical dictionaries from external JSON files.
 * Replaces hard-coded mappings in engines with versioned, external data.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface CompetitionEntry {
  canonicalId: string;
  displayName: string;
  countryCode: string;
  competitionType: 'LEAGUE' | 'CUP' | 'CONTINENTAL' | 'UNKNOWN';
  aliases: string[];
  status: 'ACTIVE' | 'INACTIVE';
  validFrom: string | null;
  validTo: string | null;
}

export interface PositionEntry {
  canonicalId: string;
  displayName: string;
  abbreviation: string;
  category: 'DEFENDER' | 'MIDFIELDER' | 'FORWARD' | 'UNKNOWN';
  aliases: string[];
  status: 'ACTIVE' | 'INACTIVE';
  validFrom: string | null;
  validTo: string | null;
}

export interface NationalityEntry {
  canonicalId: string;
  displayName: string;
  isoCode: string;
  isoAlpha3: string;
  aliases: string[];
  status: 'ACTIVE' | 'INACTIVE';
  validFrom: string | null;
  validTo: string | null;
}

export interface TeamEntry {
  canonicalId: string;
  displayName: string;
  countryCode: string;
  aliases: string[];
  status: 'ACTIVE' | 'INACTIVE';
  validFrom: string | null;
  validTo: string | null;
}

export interface CurrencyEntry {
  canonicalId: string;
  displayName: string;
  isoCode: string;
  symbol: string;
  aliases: string[];
  conversionFactorToEUR: number | null;
  status: 'ACTIVE' | 'INACTIVE';
  validFrom: string | null;
  validTo: string | null;
}

export interface DictionaryMetadata {
  version: string;
  lastUpdated: string;
  description: string;
}

export interface CompetitionDictionary extends DictionaryMetadata {
  competitions: CompetitionEntry[];
}

export interface PositionDictionary extends DictionaryMetadata {
  positions: PositionEntry[];
}

export interface NationalityDictionary extends DictionaryMetadata {
  nationalities: NationalityEntry[];
}

export interface TeamDictionary extends DictionaryMetadata {
  teams: TeamEntry[];
}

export interface CurrencyDictionary extends DictionaryMetadata {
  currencies: CurrencyEntry[];
}

export class DictionaryRepository {
  private competitionDict: CompetitionDictionary | null = null;
  private positionDict: PositionDictionary | null = null;
  private nationalityDict: NationalityDictionary | null = null;
  private teamDict: TeamDictionary | null = null;
  private currencyDict: CurrencyDictionary | null = null;
  
  private readonly dictionariesPath: string;
  
  constructor(dictionariesPath?: string) {
    this.dictionariesPath = dictionariesPath || path.join(process.cwd(), 'server/fsrs-v4/data-governance/dictionaries');
  }
  
  /**
   * Load all dictionaries
   */
  public loadAll(): void {
    this.competitionDict = this.loadDictionary<CompetitionDictionary>('competitions.v1.json');
    this.positionDict = this.loadDictionary<PositionDictionary>('positions.v1.json');
    this.nationalityDict = this.loadDictionary<NationalityDictionary>('nationalities.v1.json');
    this.teamDict = this.loadDictionary<TeamDictionary>('teams.v1.json');
    this.currencyDict = this.loadDictionary<CurrencyDictionary>('currencies.v1.json');
  }
  
  /**
   * Load a specific dictionary file
   */
  private loadDictionary<T>(filename: string): T | null {
    const filePath = path.join(this.dictionariesPath, filename);
    
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(fileContent) as T;
    } catch (error) {
      console.error(`[DictionaryRepository] Failed to load dictionary: ${filename}`, error);
      return null;
    }
  }
  
  /**
   * Get competition dictionary
   */
  public getCompetitions(): CompetitionDictionary | null {
    return this.competitionDict;
  }
  
  /**
   * Get position dictionary
   */
  public getPositions(): PositionDictionary | null {
    return this.positionDict;
  }
  
  /**
   * Get nationality dictionary
   */
  public getNationalities(): NationalityDictionary | null {
    return this.nationalityDict;
  }
  
  /**
   * Get team dictionary
   */
  public getTeams(): TeamDictionary | null {
    return this.teamDict;
  }
  
  /**
   * Get currency dictionary
   */
  public getCurrencies(): CurrencyDictionary | null {
    return this.currencyDict;
  }
  
  /**
   * Resolve competition by name or alias
   */
  public resolveCompetition(name: string): CompetitionEntry | null {
    if (!this.competitionDict) return null;
    
    const normalizedName = name.toLowerCase().trim();
    
    for (const competition of this.competitionDict.competitions) {
      if (competition.status !== 'ACTIVE') continue;
      
      // Check exact match
      if (competition.displayName.toLowerCase() === normalizedName) {
        return competition;
      }
      
      // Check aliases
      if (competition.aliases.some(alias => alias.toLowerCase() === normalizedName)) {
        return competition;
      }
    }
    
    return null;
  }
  
  /**
   * Resolve position by name or alias
   */
  public resolvePosition(name: string): PositionEntry | null {
    if (!this.positionDict) return null;
    
    const normalizedName = name.toLowerCase().trim();
    
    for (const position of this.positionDict.positions) {
      if (position.status !== 'ACTIVE') continue;
      
      // Check exact match
      if (position.displayName.toLowerCase() === normalizedName) {
        return position;
      }
      
      // Check abbreviation
      if (position.abbreviation.toLowerCase() === normalizedName) {
        return position;
      }
      
      // Check aliases
      if (position.aliases.some(alias => alias.toLowerCase() === normalizedName)) {
        return position;
      }
    }
    
    return null;
  }
  
  /**
   * Resolve nationality by name or alias
   */
  public resolveNationality(name: string): NationalityEntry | null {
    if (!this.nationalityDict) return null;
    
    const normalizedName = name.toLowerCase().trim();
    
    for (const nationality of this.nationalityDict.nationalities) {
      if (nationality.status !== 'ACTIVE') continue;
      
      // Check exact match
      if (nationality.displayName.toLowerCase() === normalizedName) {
        return nationality;
      }
      
      // Check ISO code
      if (nationality.isoCode.toLowerCase() === normalizedName) {
        return nationality;
      }
      
      // Check aliases
      if (nationality.aliases.some(alias => alias.toLowerCase() === normalizedName)) {
        return nationality;
      }
    }
    
    return null;
  }
  
  /**
   * Resolve team by name or alias
   */
  public resolveTeam(name: string): TeamEntry | null {
    if (!this.teamDict) return null;
    
    const normalizedName = name.toLowerCase().trim();
    
    for (const team of this.teamDict.teams) {
      if (team.status !== 'ACTIVE') continue;
      
      // Check exact match
      if (team.displayName.toLowerCase() === normalizedName) {
        return team;
      }
      
      // Check aliases
      if (team.aliases.some(alias => alias.toLowerCase() === normalizedName)) {
        return team;
      }
    }
    
    return null;
  }
  
  /**
   * Resolve currency by name or alias
   */
  public resolveCurrency(name: string): CurrencyEntry | null {
    if (!this.currencyDict) return null;
    
    const normalizedName = name.toLowerCase().trim();
    
    for (const currency of this.currencyDict.currencies) {
      if (currency.status !== 'ACTIVE') continue;
      
      // Check exact match
      if (currency.displayName.toLowerCase() === normalizedName) {
        return currency;
      }
      
      // Check ISO code
      if (currency.isoCode.toLowerCase() === normalizedName) {
        return currency;
      }
      
      // Check symbol
      if (currency.symbol === normalizedName) {
        return currency;
      }
      
      // Check aliases
      if (currency.aliases.some(alias => alias.toLowerCase() === normalizedName)) {
        return currency;
      }
    }
    
    return null;
  }
  
  /**
   * Get dictionary version
   */
  public getDictionaryVersion(dictionaryName: string): string | null {
    switch (dictionaryName) {
      case 'competitions':
        return this.competitionDict?.version || null;
      case 'positions':
        return this.positionDict?.version || null;
      case 'nationalities':
        return this.nationalityDict?.version || null;
      case 'teams':
        return this.teamDict?.version || null;
      case 'currencies':
        return this.currencyDict?.version || null;
      default:
        return null;
    }
  }
}
