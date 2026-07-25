/**
 * Competition Resolution Engine
 * 
 * Resolves competition information from various sources to eliminate 'unknown' competition status.
 * Uses context clues from page URLs, page titles, and surrounding data to infer competition.
 */

import { CanonicalObservation, ObservationScope } from './CanonicalObservation';
import { DictionaryRepository } from './DictionaryRepository';

export interface CompetitionResolution {
  competitionId: string;
  competitionName: string;
  competitionType: 'league' | 'cup' | 'continental' | 'national_team' | 'all_competitions';
  country: string;
  confidence: number;
  source: 'url_inference' | 'page_title' | 'context_clues' | 'explicit' | 'default';
}

export interface ResolutionContext {
  pageUrl?: string;
  pageTitle?: string;
  pageContent?: string;
  season?: string;
  team?: string;
  league?: string;
  explicitCompetitionId?: string;
  structuredMetadata?: {
    competitionId?: string;
    competitionName?: string;
  };
  eventContext?: {
    competitionId?: string;
    competitionName?: string;
  };
  tableContext?: {
    competitionId?: string;
    competitionName?: string;
  };
}

export class CompetitionResolutionEngine {
  private dictionaryRepository: DictionaryRepository;
  
  constructor(dictionaryPath?: string) {
    this.dictionaryRepository = new DictionaryRepository(dictionaryPath);
    this.dictionaryRepository.loadAll();
  }
  
  /**
   * Resolve competition from context with priority ordering
   * 
   Priority order:
   * 1. Explicit provider competition ID
   * 2. Provider competition field
   * 3. Structured metadata
   * 4. URL pattern
   * 5. Page heading
   * 6. Event context
   * 7. Table context
   * 8. Team-only inference (low confidence, never SCOPE_VERIFIED)
   */
  public resolveCompetition(context: ResolutionContext): CompetitionResolution {
    // Priority 1: Explicit provider competition ID
    if (context.explicitCompetitionId) {
      const explicitId = this.resolveExplicitId(context.explicitCompetitionId);
      if (explicitId.confidence > 0.9) {
        return explicitId;
      }
    }
    
    // Priority 2: Provider competition field
    if (context.league) {
      const explicit = this.resolveExplicit(context.league);
      if (explicit.confidence > 0.85) {
        return explicit;
      }
    }
    
    // Priority 3: Structured metadata
    if (context.structuredMetadata?.competitionId || context.structuredMetadata?.competitionName) {
      const metadataResolution = this.resolveFromStructuredMetadata(context.structuredMetadata);
      if (metadataResolution.confidence > 0.8) {
        return metadataResolution;
      }
    }
    
    // Priority 4: URL pattern
    if (context.pageUrl) {
      const urlInference = this.resolveFromUrl(context.pageUrl);
      if (urlInference.confidence > 0.75) {
        return urlInference;
      }
    }
    
    // Priority 5: Page heading
    if (context.pageTitle) {
      const titleInference = this.resolveFromTitle(context.pageTitle);
      if (titleInference.confidence > 0.7) {
        return titleInference;
      }
    }
    
    // Priority 6: Event context
    if (context.eventContext?.competitionId || context.eventContext?.competitionName) {
      const eventResolution = this.resolveFromEventContext(context.eventContext);
      if (eventResolution.confidence > 0.6) {
        return eventResolution;
      }
    }
    
    // Priority 7: Table context
    if (context.tableContext?.competitionId || context.tableContext?.competitionName) {
      const tableResolution = this.resolveFromTableContext(context.tableContext);
      if (tableResolution.confidence > 0.55) {
        return tableResolution;
      }
    }
    
    // Priority 8: Team-only inference (low confidence, never SCOPE_VERIFIED)
    const teamInference = this.resolveFromTeamOnly(context);
    if (teamInference.confidence > 0.4) {
      // Force low confidence for team-only inference
      return {
        ...teamInference,
        confidence: Math.min(teamInference.confidence, 0.50),
        source: 'context_clues'
      };
    }
    
    // Default fallback
    return this.getDefaultResolution(context);
  }
  
  /**
   * Resolve from explicit competition ID
   */
  private resolveExplicitId(competitionId: string): CompetitionResolution {
    const competitionDict = this.dictionaryRepository.getCompetitions();
    if (!competitionDict) {
      return this.getDefaultResolution({});
    }
    
    const competition = competitionDict.competitions.find(c => c.canonicalId === competitionId);
    if (competition) {
      return {
        competitionId: competition.canonicalId,
        competitionName: competition.displayName,
        competitionType: this.mapCompetitionType(competition.competitionType),
        country: competition.countryCode,
        confidence: 0.95,
        source: 'explicit'
      };
    }
    return this.getDefaultResolution({});
  }
  
  /**
   * Map dictionary competition type to engine type
   */
  private mapCompetitionType(dictType: string): CompetitionResolution['competitionType'] {
    switch (dictType) {
      case 'LEAGUE':
        return 'league';
      case 'CUP':
        return 'cup';
      case 'CONTINENTAL':
        return 'continental';
      case 'UNKNOWN':
        return 'all_competitions';
      default:
        return 'league';
    }
  }
  
  /**
   * Resolve from structured metadata
   */
  private resolveFromStructuredMetadata(metadata: { competitionId?: string; competitionName?: string }): CompetitionResolution {
    if (metadata.competitionId) {
      return this.resolveExplicitId(metadata.competitionId);
    }
    if (metadata.competitionName) {
      return this.resolveExplicit(metadata.competitionName);
    }
    return this.getDefaultResolution({});
  }
  
  /**
   * Resolve from event context
   */
  private resolveFromEventContext(eventContext: { competitionId?: string; competitionName?: string }): CompetitionResolution {
    if (eventContext.competitionId) {
      return this.resolveExplicitId(eventContext.competitionId);
    }
    if (eventContext.competitionName) {
      return this.resolveExplicit(eventContext.competitionName);
    }
    return this.getDefaultResolution({});
  }
  
  /**
   * Resolve from table context
   */
  private resolveFromTableContext(tableContext: { competitionId?: string; competitionName?: string }): CompetitionResolution {
    if (tableContext.competitionId) {
      return this.resolveExplicitId(tableContext.competitionId);
    }
    if (tableContext.competitionName) {
      return this.resolveExplicit(tableContext.competitionName);
    }
    return this.getDefaultResolution({});
  }
  
  /**
   * Resolve from team-only inference (lowest priority)
   */
  private resolveFromTeamOnly(context: ResolutionContext): CompetitionResolution {
    return this.resolveFromContext(context);
  }
  
  /**
   * Resolve from explicit league name
   */
  private resolveExplicit(leagueName: string): CompetitionResolution {
    const normalized = leagueName.toLowerCase().trim();
    
    // Use dictionary repository to resolve
    const competition = this.dictionaryRepository.resolveCompetition(leagueName);
    if (competition) {
      return {
        competitionId: competition.canonicalId,
        competitionName: competition.displayName,
        competitionType: this.mapCompetitionType(competition.competitionType),
        country: competition.countryCode,
        confidence: 0.90,
        source: 'explicit'
      };
    }
    
    // Partial match - try to find any competition that contains the name
    const competitionDict = this.dictionaryRepository.getCompetitions();
    if (competitionDict) {
      for (const comp of competitionDict.competitions) {
        if (normalized.includes(comp.displayName.toLowerCase()) || 
            comp.displayName.toLowerCase().includes(normalized)) {
          return {
            competitionId: comp.canonicalId,
            competitionName: comp.displayName,
            competitionType: this.mapCompetitionType(comp.competitionType),
            country: comp.countryCode,
            confidence: 0.75,
            source: 'explicit'
          };
        }
      }
    }
    
    return this.getDefaultResolution({ league: leagueName });
  }
  
  /**
   * Resolve from URL
   */
  private resolveFromUrl(url: string): CompetitionResolution {
    const urlLower = url.toLowerCase();
    
    // Transfermarkt URL patterns
    if (urlLower.includes('transfermarkt')) {
      if (urlLower.includes('/sueper-lig/')) {
        return this.getResolution('TUR1', 'url_inference');
      }
      if (urlLower.includes('/premier-league/')) {
        return this.getResolution('ENG1', 'url_inference');
      }
      if (urlLower.includes('/laliga/')) {
        return this.getResolution('ESP1', 'url_inference');
      }
      if (urlLower.includes('/bundesliga/')) {
        return this.getResolution('GER1', 'url_inference');
      }
      if (urlLower.includes('/serie-a/')) {
        return this.getResolution('ITA1', 'url_inference');
      }
      if (urlLower.includes('/ligue-1/')) {
        return this.getResolution('FRA1', 'url_inference');
      }
      if (urlLower.includes('/champions-league/')) {
        return this.getResolution('UECL', 'url_inference');
      }
      if (urlLower.includes('/europa-league/')) {
        return this.getResolution('UEL', 'url_inference');
      }
    }
    
    // FBref URL patterns
    if (urlLower.includes('fbref.com')) {
      if (urlLower.includes('/tr/')) {
        return this.getResolution('TUR1', 'url_inference');
      }
      if (urlLower.includes('/en/')) {
        if (urlLower.includes('Premier-League')) {
          return this.getResolution('ENG1', 'url_inference');
        }
      }
    }
    
    // Understat URL patterns
    if (urlLower.includes('understat.com')) {
      if (urlLower.includes('/league/')) {
        const leagueMatch = urlLower.match(/league\/([^\/]+)/);
        if (leagueMatch) {
          const leagueId = leagueMatch[1];
          const mapping: Record<string, string> = {
            'La_liga': 'ESP1',
            'EPL': 'ENG1',
            'Bundesliga': 'GER1',
            'Serie_A': 'ITA1',
            'Ligue_1': 'FRA1',
            'RFPL': 'RUS1'
          };
          if (mapping[leagueId]) {
            return this.getResolution(mapping[leagueId], 'url_inference');
          }
        }
      }
    }
    
    return this.getDefaultResolution({});
  }
  
  /**
   * Resolve from page title
   */
  private resolveFromTitle(title: string): CompetitionResolution {
    const titleLower = title.toLowerCase();
    
    const competitionDict = this.dictionaryRepository.getCompetitions();
    if (competitionDict) {
      for (const comp of competitionDict.competitions) {
        if (titleLower.includes(comp.displayName.toLowerCase())) {
          return {
            competitionId: comp.canonicalId,
            competitionName: comp.displayName,
            competitionType: this.mapCompetitionType(comp.competitionType),
            country: comp.countryCode,
            confidence: 0.70,
            source: 'page_title'
          };
        }
      }
    }
    
    return this.getDefaultResolution({});
  }
  
  /**
   * Resolve from context clues
   */
  private resolveFromContext(context: ResolutionContext): CompetitionResolution {
    // If team is known, infer likely competition
    if (context.team) {
      const teamLower = context.team.toLowerCase();
      
      // Turkish teams
      if (['fenerbahçe', 'galatasaray', 'beşiktaş', 'trabzonspor'].some(t => teamLower.includes(t))) {
        return this.getResolution('TUR1', 'context_clues');
      }
      
      // English teams
      if (['manchester united', 'manchester city', 'liverpool', 'chelsea', 'arsenal'].some(t => teamLower.includes(t))) {
        return this.getResolution('ENG1', 'context_clues');
      }
      
      // Spanish teams
      if (['real madrid', 'barcelona', 'atletico madrid'].some(t => teamLower.includes(t))) {
        return this.getResolution('ESP1', 'context_clues');
      }
      
      // German teams
      if (['bayern munich', 'borussia dortmund'].some(t => teamLower.includes(t))) {
        return this.getResolution('GER1', 'context_clues');
      }
      
      // Italian teams
      if (['juventus', 'inter milan', 'ac milan'].some(t => teamLower.includes(t))) {
        return this.getResolution('ITA1', 'context_clues');
      }
      
      // French teams
      if (['psg', 'olympique marseille'].some(t => teamLower.includes(t))) {
        return this.getResolution('FRA1', 'context_clues');
      }
    }
    
    return this.getDefaultResolution(context);
  }
  
  /**
   * Get resolution for competition ID
   */
  private getResolution(competitionId: string, source: CompetitionResolution['source']): CompetitionResolution {
    const competitionDict = this.dictionaryRepository.getCompetitions();
    if (!competitionDict) {
      return this.getDefaultResolution({});
    }
    
    const competition = competitionDict.competitions.find(c => c.canonicalId === competitionId);
    if (!competition) {
      return this.getDefaultResolution({});
    }
    
    return {
      competitionId: competition.canonicalId,
      competitionName: competition.displayName,
      competitionType: this.mapCompetitionType(competition.competitionType),
      country: competition.countryCode,
      confidence: 0.65,
      source
    };
  }
  
  /**
   * Get default resolution
   */
  private getDefaultResolution(context: ResolutionContext): CompetitionResolution {
    return {
      competitionId: 'unknown',
      competitionName: 'Unknown Competition',
      competitionType: 'all_competitions',
      country: 'unknown',
      confidence: 0.0,
      source: 'default'
    };
  }
  
  /**
   * Apply resolution to observation scope
   */
  public applyResolution(scope: ObservationScope, resolution: CompetitionResolution): ObservationScope {
    return {
      ...scope,
      competition: resolution.competitionName,
      competitionId: resolution.competitionId,
      competitionType: resolution.competitionType,
      scopeKey: this.buildScopeKey(scope.season, resolution.competitionId, scope.team)
    };
  }
  
  private buildScopeKey(season: string, competitionId: string, team: string): string {
    return `${season}-${competitionId}-${team}`;
  }
}
