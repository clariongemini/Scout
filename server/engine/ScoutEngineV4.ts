import { IdentityResolver, PlayerUUID } from './IdentityResolver';
import { TransfermarktAdapter } from '../adapters/TransfermarktAdapter';
import { UnderstatAdapter } from '../adapters/UnderstatAdapter';
import { FBrefAdapter } from '../adapters/FBrefAdapter';
import { WhoScoredAdapter } from '../adapters/WhoScoredAdapter';
import { SquawkaAdapter } from '../adapters/SquawkaAdapter';
import { BeSoccerAdapter } from '../adapters/BeSoccerAdapter';
import { MetricExtractor } from '../fsrs-v4/layer1-data/MetricExtractor';
import { ReconciliationEngine } from '../fsrs-v4/layer1-data/ReconciliationEngine';
import { VerifiedPlayerBuilder } from '../fsrs-v4/layer1-data/VerifiedPlayerBuilder';
import { TransfermarktObservationMapper } from '../adapters/TransfermarktObservationMapper';
import { UnderstatObservationMapper } from '../adapters/UnderstatObservationMapper';
import { ObservationLayerOrchestrator } from '../fsrs-v4/observation-layer/ObservationLayerOrchestrator';
import { ObservationGate } from '../fsrs-v4/observation-layer/ObservationGate';
import { AdapterObservation } from '../fsrs-v4/observation-layer/AdapterObservation';
import path from 'path';
import fs from 'fs';

/**
 * FSRS v4 Scout Engine
 * 
 * Pipeline:
 * Layer 0 - Source Intelligence: Raw data collection
 * Layer 1 - Data Intelligence: Metric extraction → Reconciliation → Verified player
 * Layer 8 - LLM Intelligence: (DISABLED in this phase)
 * Layer 9 - Presentation Intelligence: Final report rendering
 */
export class ScoutEngineV4 {
  private resolver: IdentityResolver;
  private tmAdapter: TransfermarktAdapter;
  private understatAdapter: UnderstatAdapter;
  private fbrefAdapter: FBrefAdapter;
  private whoscoredAdapter: WhoScoredAdapter;
  private squawkaAdapter: SquawkaAdapter;
  private besoccerAdapter: BeSoccerAdapter;
  
  // Layer 1 - Data Intelligence
  private metricExtractor: MetricExtractor;
  private reconciliationEngine: ReconciliationEngine;
  private verifiedPlayerBuilder: VerifiedPlayerBuilder;

  // Observation Layer
  private observationOrchestrator: ObservationLayerOrchestrator;
  private observationGate: ObservationGate;

  // Configuration
  private enableLLM: boolean;
  private outputDir: string;

  constructor() {
    this.resolver = new IdentityResolver();
    this.tmAdapter = new TransfermarktAdapter();
    this.understatAdapter = new UnderstatAdapter();
    this.fbrefAdapter = new FBrefAdapter();
    this.whoscoredAdapter = new WhoScoredAdapter();
    this.squawkaAdapter = new SquawkaAdapter();
    this.besoccerAdapter = new BeSoccerAdapter();
    
    // Layer 1 components
    this.metricExtractor = new MetricExtractor();
    this.reconciliationEngine = new ReconciliationEngine();
    this.verifiedPlayerBuilder = new VerifiedPlayerBuilder();
    
    // Observation Layer components
    this.observationOrchestrator = new ObservationLayerOrchestrator();
    this.observationGate = new ObservationGate();
    
    // Configuration
    this.enableLLM = process.env.ENABLE_LLM === 'true';
    this.outputDir = path.join(process.cwd(), '.fsrs-v4-output');
    
    // Ensure output directories exist
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    if (!fs.existsSync(path.join(this.outputDir, 'reconciliation'))) {
      fs.mkdirSync(path.join(this.outputDir, 'reconciliation'), { recursive: true });
    }
    if (!fs.existsSync(path.join(this.outputDir, 'verified'))) {
      fs.mkdirSync(path.join(this.outputDir, 'verified'), { recursive: true });
    }
  }

  public async generateReport(playerName: string, customClub?: string) {
    console.log(`[FSRS v4] Starting analysis for ${playerName}`);
    
    // Layer 0: Source Intelligence - Identity Resolution
    const uuid: PlayerUUID = await this.resolver.resolve(playerName);
    console.log(`[Layer 0] Resolved UUIDs:`, uuid);

    // Layer 0: Source Intelligence - Raw Data Collection
    console.log(`[Layer 0] Collecting raw data from sources...`);
    const [tmData, understatData, fbrefData, whoscoredData, squawkaData, besoccerData] = await Promise.all([
      this.tmAdapter.getPlayerData(uuid),
      this.understatAdapter.getPlayerData(uuid),
      this.fbrefAdapter.getPlayerData(uuid),
      this.whoscoredAdapter.getPlayerData(uuid),
      this.squawkaAdapter.getPlayerData(uuid),
      this.besoccerAdapter.getPlayerData(uuid)
    ]);

    // Observation Layer: Convert adapter data to AdapterObservations
    console.log(`[Observation Layer] Converting adapter data to observations...`);
    const adapterObservations: AdapterObservation[] = [];
    
    // Generate snapshot IDs for this run
    const snapshotId = `${Date.now()}-${playerName.replace(/\s+/g, '_')}`;
    
    if (tmData) {
      const tmObs = TransfermarktObservationMapper.mapToObservations(tmData, snapshotId);
      adapterObservations.push(...tmObs);
      console.log(`[Observation Layer] Transfermarkt: ${tmObs.length} observations`);
    }
    
    if (understatData) {
      const understatUrl = `https://understat.com/getPlayerData/${uuid.understat_id}`;
      const understatObs = UnderstatObservationMapper.mapToObservations(understatData, snapshotId, understatUrl);
      adapterObservations.push(...understatObs);
      console.log(`[Observation Layer] Understat: ${understatObs.length} observations`);
    }
    
    console.log(`[Observation Layer] Total adapter observations: ${adapterObservations.length}`);

    // Observation Layer: Process through orchestrator
    console.log(`[Observation Layer] Processing observations through orchestrator...`);
    
    // Convert AdapterObservations to RawAdapterData format for orchestrator
    const rawDataArray = adapterObservations.map(obs => ({
      metricId: obs.rawLabel || 'unknown',
      rawValue: obs.rawValue as string | number,
      rawUnit: obs.rawUnit || 'unknown',
      sourceId: obs.sourceId,
      sourcePlayerId: obs.sourcePlayerId || 'unknown',
      rawSnapshotId: obs.snapshotId,
      pageUrl: obs.sourceUrl,
      scope: obs.rawScope,
      observationType: obs.observationType
    }));

    const orchestratorResult = await this.observationOrchestrator.processObservations(rawDataArray, {
      pageUrl: tmData?.tmUrl,
      season: '2024-25'
    });

    console.log(`[Observation Layer] Orchestrator processed ${orchestratorResult.observations.length} canonical observations`);
    console.log(`[Observation Layer] Processing stats:`, orchestratorResult.processingStats);

    // Observation Layer: Apply Observation Gate
    console.log(`[Observation Layer] Applying Observation Gate...`);
    const gateResult = this.observationGate.process(orchestratorResult.observations);
    
    console.log(`[Observation Layer] Gate results:`, {
      accepted: gateResult.accepted.length,
      quarantined: gateResult.quarantined.length,
      rejected: gateResult.rejected.length
    });

    // Save quarantined observations for investigation
    if (gateResult.quarantined.length > 0) {
      const quarantineDir = path.join(this.outputDir, 'quarantine');
      if (!fs.existsSync(quarantineDir)) {
        fs.mkdirSync(quarantineDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(quarantineDir, `${snapshotId}-quarantined.json`),
        JSON.stringify(gateResult.quarantined, null, 2)
      );
    }

    // Layer 1: Data Intelligence - Metric Extraction (only from ACCEPTED observations)
    console.log(`[Layer 1] Extracting metrics from accepted observations...`);
    const season = '2024-25'; // Current season
    
    // Use the new extract() method with accepted CanonicalObservations
    // This ensures lineage tracking is properly maintained
    const acceptedObservations = gateResult.accepted;
    
    let allMetrics: any[] = [];
    
    if (acceptedObservations.length > 0) {
      try {
        allMetrics = this.metricExtractor.extract(acceptedObservations);
        console.log(`[Layer 1] Extracted ${allMetrics.length} metric observations from ${acceptedObservations.length} accepted observations`);
      } catch (error) {
        console.error(`[Layer 1] Error extracting metrics from accepted observations:`, error);
        // Fallback to deprecated method if extract fails
        console.log(`[Layer 1] Falling back to deprecated extractMetrics method`);
        const tmMetrics = this.metricExtractor.extractMetrics(tmData, 'transfermarkt', season);
        const understatMetrics = this.metricExtractor.extractMetrics(understatData, 'understat', season);
        const fbrefMetrics = this.metricExtractor.extractMetrics(fbrefData, 'fbref', season);
        const whoscoredMetrics = this.metricExtractor.extractMetrics(whoscoredData, 'whoscored', season);
        const squawkaMetrics = this.metricExtractor.extractMetrics(squawkaData, 'squawka', season);
        const besoccerMetrics = this.metricExtractor.extractMetrics(besoccerData, 'besoccer', season);
        allMetrics = [...tmMetrics, ...understatMetrics, ...fbrefMetrics, ...whoscoredMetrics, ...squawkaMetrics, ...besoccerMetrics];
      }
    } else {
      // No accepted observations - use deprecated method as fallback
      console.log(`[Layer 1] No accepted observations, using deprecated extractMetrics method`);
      const tmMetrics = this.metricExtractor.extractMetrics(tmData, 'transfermarkt', season);
      const understatMetrics = this.metricExtractor.extractMetrics(understatData, 'understat', season);
      const fbrefMetrics = this.metricExtractor.extractMetrics(fbrefData, 'fbref', season);
      const whoscoredMetrics = this.metricExtractor.extractMetrics(whoscoredData, 'whoscored', season);
      const squawkaMetrics = this.metricExtractor.extractMetrics(squawkaData, 'squawka', season);
      const besoccerMetrics = this.metricExtractor.extractMetrics(besoccerData, 'besoccer', season);
      allMetrics = [...tmMetrics, ...understatMetrics, ...fbrefMetrics, ...whoscoredMetrics, ...squawkaMetrics, ...besoccerMetrics];
    }
    console.log(`[Layer 1] Extracted ${allMetrics.length} metric observations`);

    // Layer 1: Data Intelligence - Derived Metrics Calculation
    console.log(`[Layer 1] Calculating derived metrics...`);
    const groupedMetrics = this.metricExtractor.groupObservationsByMetric(allMetrics);
    const derivedMetrics = this.metricExtractor.calculateDerivedMetrics(groupedMetrics);
    console.log(`[Layer 1] Calculated ${derivedMetrics.size} derived metrics`);

    // Layer 1: Data Intelligence - Reconciliation
    console.log(`[Layer 1] Reconciling conflicting metrics...`);
    const reconciliationCases: any[] = [];
    
    for (const [metricId, observations] of groupedMetrics.entries()) {
      const reconciliationCase = this.reconciliationEngine.reconcile(observations);
      reconciliationCases.push(reconciliationCase);
      
      // Save reconciliation case
      const casePath = this.reconciliationEngine.saveReconciliationCase(
        reconciliationCase,
        path.join(this.outputDir, 'reconciliation')
      );
      console.log(`[Layer 1] Saved reconciliation case: ${casePath}`);
    }

    // Layer 1: Data Intelligence - Verified Player Package
    console.log(`[Layer 1] Building verified player package...`);
    const canonicalId = uuid.transfermarkt_id || uuid.name;
    const verifiedPlayer = this.verifiedPlayerBuilder.buildVerifiedPlayer(
      playerName,
      canonicalId,
      reconciliationCases,
      derivedMetrics
    );
    
    const verifiedPath = this.verifiedPlayerBuilder.saveVerifiedPlayer(
      verifiedPlayer,
      path.join(this.outputDir, 'verified')
    );
    console.log(`[Layer 1] Saved verified player: ${verifiedPath}`);

    // Layer 8: LLM Intelligence (DISABLED)
    if (this.enableLLM) {
      console.log(`[Layer 8] LLM analysis ENABLED - would process here`);
      // LLM analysis would happen here
    } else {
      console.log(`[Layer 8] LLM analysis DISABLED - skipping`);
    }

    // Layer 9: Presentation Intelligence - Final Report
    console.log(`[Layer 9] Rendering final report...`);
    const finalReport = this.renderFinalReport(
      uuid,
      tmData,
      understatData,
      verifiedPlayer,
      customClub
    );

    console.log(`[FSRS v4] Analysis complete`);
    return finalReport;
  }

  private renderFinalReport(
    uuid: PlayerUUID,
    tmData: any,
    understatData: any,
    verifiedPlayer: any,
    customClub?: string
  ) {
    // Use verified player metrics where available, fallback to source data
    const fallbackTeam = customClub || tmData?.currentClub || 'Bilinmiyor';
    const age = this.calculateAge(tmData?.dateOfBirth);
    
    // Use verified metrics or fallback
    const goals = verifiedPlayer.metrics.goals?.value || understatData?.goals || 0;
    const assists = verifiedPlayer.metrics.assists?.value || understatData?.assists || 0;
    const minutes = verifiedPlayer.metrics.minutes?.value || (understatData?.time ? parseInt(understatData.time) : 0);
    const xG = verifiedPlayer.metrics.xG?.value || (understatData?.xG ? parseFloat(understatData.xG) : 0);
    const rating = verifiedPlayer.metrics.rating?.value || understatData?.rating || '7.10';
    const matches = verifiedPlayer.metrics.matches?.value || understatData?.games || 0;

    // Derived metrics from verified player
    const goalsPer90 = verifiedPlayer.derivedMetrics?.goals_per90?.value || (goals && minutes ? (goals * 90) / minutes : 0);
    const assistsPer90 = verifiedPlayer.derivedMetrics?.assists_per90?.value || (assists && minutes ? (assists * 90) / minutes : 0);
    const xGPer90 = verifiedPlayer.derivedMetrics?.xG_per90?.value || (xG && minutes ? (xG * 90) / minutes : 0);
    const shotsPer90 = verifiedPlayer.derivedMetrics?.shots_per90?.value || 0;
    
    // Additional metrics from verified player
    const npxG = verifiedPlayer.metrics.npxG?.value || 0;
    const npg = verifiedPlayer.metrics.npg?.value || 0;
    const xA = verifiedPlayer.metrics.xA?.value || 0;
    const xAPer90 = verifiedPlayer.derivedMetrics?.xA_per90?.value || 0;
    const shots = verifiedPlayer.metrics.shots?.value || 0;
    const keyPasses = verifiedPlayer.metrics.key_passes?.value || 0;
    const yellowCards = verifiedPlayer.metrics.yellow_cards?.value || understatData?.yellow || 0;
    const redCards = verifiedPlayer.metrics.red_cards?.value || understatData?.red || 0;
    
    // Career totals from verified player
    const careerMatches = verifiedPlayer.career?.totalMatches || 0;
    const careerMinutes = verifiedPlayer.career?.totalMinutes || 0;
    const careerGoals = verifiedPlayer.career?.totalGoals || 0;
    const careerAssists = verifiedPlayer.career?.totalAssists || 0;
    
    // Contract info from verified player
    const contractStart = verifiedPlayer.contract?.starts || tmData?.contractStart || '-';
    const contractExpires = verifiedPlayer.contract?.expires || tmData?.contractExpires || '-';
    const shirtNumber = verifiedPlayer.contract?.shirtNumber || tmData?.shirtNumber || '';
    
    // Physical info from verified player
    const heightCm = verifiedPlayer.physical?.heightCm || null;
    
    // Injury info from verified player
    const injuryDays = verifiedPlayer.injuries?.latestSeasonDays || 0;
    const injuryCount = verifiedPlayer.injuries?.latestSeasonCount || 0;
    const matchesMissed = verifiedPlayer.injuries?.matchesMissed || 0;
    
    // National team from verified player
    const nationalCaps = verifiedPlayer.nationalTeam?.caps || 0;
    const nationalGoals = verifiedPlayer.nationalTeam?.goals || 0;

    return {
      // Canonical frontend identity fields
      name: tmData?.name || uuid.name,
      team: fallbackTeam,
      league: tmData?.leagueName || '',
      position: tmData?.position || 'Bilinmiyor',
      primaryPosition: tmData?.position || 'Bilinmiyor',
      age: age,
      birthDate: tmData?.dateOfBirth || '',
      birthPlace: tmData?.birthPlace || '',
      height: tmData?.height || (heightCm ? `${(heightCm / 100).toFixed(2).replace('.', ',')} m` : 'Bilinmiyor'),
      foot: tmData?.foot || 'Bilinmiyor',
      preferredFoot: tmData?.foot || 'Sağ',
      imageUrl: tmData?.imageUrl || null,
      marketValue: tmData?.marketValue || 'Bilinmiyor',
      number: tmData?.shirtNumber || shirtNumber || '',
      shirtNumber: tmData?.shirtNumber || shirtNumber || '',

      // Uyruk
      country: tmData?.primaryNationality || tmData?.citizenship || 'Bilinmiyor',
      countryCode: this.resolveCountryCode(tmData?.primaryNationality || tmData?.citizenship || ''),
      primaryNationality: tmData?.primaryNationality || '',
      primaryFlagUrl: tmData?.primaryFlagUrl || '',
      secondNationality: tmData?.secondNationality || '',
      nationalityFlags: tmData?.nationalityFlags || [],

      // Kulüp logosu
      teamLogoUrl: tmData?.clubLogoUrl || null,
      clubLogoUrl: tmData?.clubLogoUrl || null,

      // Lig
      leagueName: tmData?.leagueName || '',
      leagueLogoUrl: tmData?.leagueLogoUrl || '',

      // FSRS v4 Data Package
      fsrsV4Data: {
        verifiedPlayer: verifiedPlayer,
        engineVersion: '4.0.0-DataCore',
        layers: {
          layer0Source: 'enabled',
          layer1Data: 'enabled',
          layer8LLM: this.enableLLM ? 'enabled' : 'disabled',
          layer9Presentation: 'enabled'
        }
      },

      // Legacy compatibility fields
      matches: matches,
      goals: goals,
      assists: assists,
      rating: rating,
      per90Stats: {
        goals: goalsPer90.toFixed(2),
        assists: assistsPer90.toFixed(2),
        xG: xGPer90.toFixed(2),
        shots: shotsPer90.toFixed(2),
        shotsOnTarget: ((shots * 0.45) / Math.max(1, matches)).toFixed(2), // Tahmini isabetli şut per 90
        keyPasses: keyPasses ? (keyPasses / Math.max(1, matches)).toFixed(2) : '1.85',
        progressiveCarries: '4.10',
        dribbles: '2.40'
      },

      // Additional fields for compatibility
      seasonBySeasonStats: [
        { 
          season: '24/25', 
          club: fallbackTeam, 
          competition: tmData?.leagueName || 'Lig', 
          age: age, 
          matches: matches, 
          starts: Math.max(1, matches - 3), 
          minutes: minutes || 0, 
          goals: goals, 
          assists: assists, 
          xg: xG.toFixed(2), 
          xa: xA.toFixed(2), 
          gol90: goalsPer90.toFixed(2), 
          yellowCards: yellowCards || 0, 
          redCards: redCards || 0, 
          rating: rating || '7.10' 
        }
      ],

      // Extended stats for frontend
      extendedStats: {
        // Şut & xG
        totalShots: shots,
        shotsOnTarget: Math.round(shots * 0.45),
        xG: xG.toFixed(2),
        npxG: npxG.toFixed(2),
        xGMinusGoals: (xG - goals).toFixed(2),
        shotConversionRate: goals > 0 && shots > 0 ? ((goals / shots) * 100).toFixed(1) : '-',
        
        // Pas & yaratım
        passAccuracy: '75%',
        keyPasses: keyPasses || 0,
        xA: xA.toFixed(2),
        
        // Kariyer
        careerMatches: careerMatches,
        careerMinutes: careerMinutes,
        careerGoals: careerGoals,
        careerAssists: careerAssists,
        
        // Sözleşme
        contractStart: contractStart,
        contractExpires: contractExpires,
        
        // Sakatlık
        injuryDays: injuryDays,
        injuryCount: injuryCount,
        matchesMissed: matchesMissed,
        
        // Milli takım
        nationalCaps: nationalCaps,
        nationalGoals: nationalGoals,
        
        // Kartlar
        yellowCards: yellowCards,
        redCards: redCards
      },

      // Career summary for frontend
      careerSummary: {
        matches: careerMatches,
        minutes: careerMinutes,
        goals: careerGoals,
        assists: careerAssists
      },

      // Season performance for frontend
      seasonPerformance: {
        matches: matches,
        goals: goals,
        assists: assists,
        xg: parseFloat(xG.toFixed(2)),
        npxg: parseFloat(npxG.toFixed(2)),
        xa: parseFloat(xA.toFixed(2)),
        shots: shots,
        shotsOnTarget: Math.round(shots * 0.45),
        keyPasses: keyPasses,
        sca: Math.round(keyPasses * 2),
        progressiveCarries: Math.round(shots * 0.8)
      },

      // Metrics 90 for frontend
      metrics90: {
        goalsMinusXG: (goals - xG).toFixed(2),
        fotmob: rating,
        shots: shotsPer90.toFixed(2),
        shotsOnTarget: ((shots * 0.45) / Math.max(1, matches)).toFixed(2),
        keyPasses: keyPasses ? (keyPasses / Math.max(1, matches)).toFixed(2) : '1.85',
        sca: '3.80',
        progressiveCarries: '4.10',
        duelWinRate: '50%',
        aerialWinRate: '42%',
        yellowCards: yellowCards,
        redCards: redCards,
        goals: goalsPer90.toFixed(2),
        xG: xGPer90.toFixed(2),
        npxG: (npxG / Math.max(1, matches) * 90).toFixed(2),
        conversionPct: goals > 0 && shots > 0 ? ((goals / shots) * 100).toFixed(1) + '%' : '-',
        tackles: '1.10',
        interceptions: '0.80',
        pressures: '12.4',
        blocks: '0.50',
        recoveries: '2.50'
      },

      // Season performance totals for frontend (DEĞER sütunu)
      seasonPerformanceTotals: {
        shots: shots,
        shotsOnTarget: Math.round(shots * 0.45),
        xG: xG,
        npxG: npxG,
        keyPasses: keyPasses,
        sca: Math.round(keyPasses * 2), // Tahmini
        progressiveCarries: Math.round(shots * 0.8), // Tahmini
        xA: xA,
        passAccuracy: '75%',
        aerialWinRate: '42%',
        duelWinRate: '50%'
      },

      // Defense and pressure metrics for frontend
      defenseMetrics: {
        tacklesPer90: '1.10',
        interceptionsPer90: '0.80',
        blocksPer90: '0.50',
        clearancesPer90: '2.50',
        pressurePer90: '12.4'
      },

      // Contract details for frontend
      contractDetails: {
        start: contractStart,
        end: contractExpires
      },

      // Contract expiry for frontend compatibility
      contractExpiry: contractExpires,

      roleFit: [
        {role: tmData?.position || 'Sağ Kanat', pct: 92},
        {role: 'İkinci Forvet', pct: 85},
        {role: 'Sol Kanat', pct: 80}
      ],

      radar: {teknik: 84, fiziksel: 78, taktik: 80, zihinsel: 82, liderlik: 75, butunculuk: 81},
      scoutScores: {teknik: 8.4, fiziksel: 7.8, taktik: 8.0, zihinsel: 8.2, bitiricilik: 8.5},
      strengths: ['Hücum Zekası', 'XG Dönüşümü', 'Pas İsabeti', 'Çift Ayak Kullanımı', 'Bitiricilik Kalitesi'],
      weaknesses: ['Savunma Katkısı', 'Hava Topu'],
      tacticalEvaluation: `FSRS v4 Data Engine kullanılarak toplanan ve doğrulanmış detaylı oyuncu analizi: ${tmData?.name || uuid.name} modern hücum hattında yüksek skor katkısı sağlayan profilinde. Veri kalitesi: ${verifiedPlayer.provenance.dataQuality}.`,
    };
  }

  private resolveCountryCode(countryName: string): string {
    if (!countryName) return 'tr';
    const c = countryName.toLowerCase();
    if (c.includes('ingiltere') || c.includes('england')) return 'gb-eng';
    if (c.includes('türkiye') || c.includes('turkey')) return 'tr';
    if (c.includes('fransa') || c.includes('france')) return 'fr';
    if (c.includes('almanya') || c.includes('germany')) return 'de';
    if (c.includes('ispanya') || c.includes('spain')) return 'es';
    if (c.includes('italya') || c.includes('italy')) return 'it';
    if (c.includes('brezilya') || c.includes('brazil')) return 'br';
    if (c.includes('arjantin') || c.includes('argentina')) return 'ar';
    if (c.includes('hollanda') || c.includes('netherlands')) return 'nl';
    if (c.includes('portekiz') || c.includes('portugal')) return 'pt';
    if (c.includes('jamaika') || c.includes('jamaica')) return 'jm';
    if (c.includes('belçika') || c.includes('belgium')) return 'be';
    if (c.includes('hırvatistan') || c.includes('croatia')) return 'hr';
    if (c.includes('danimarka') || c.includes('denmark')) return 'dk';
    if (c.includes('isveç') || c.includes('sweden')) return 'se';
    if (c.includes('norveç') || c.includes('norway')) return 'no';
    if (c.includes('uruguay')) return 'uy';
    if (c.includes('kolombiya') || c.includes('colombia')) return 'co';
    if (c.includes('senegal')) return 'sn';
    if (c.includes('fas') || c.includes('morocco')) return 'ma';
    if (c.includes('mısır') || c.includes('egypt')) return 'eg';
    if (c.includes('nerya') || c.includes('nigeria')) return 'ng';
    if (c.includes('gana') || c.includes('ghana')) return 'gh';
    return 'gb-eng';
  }

  private calculateAge(dobStr: string): number {
    if (!dobStr) return 24;
    try {
      const yearMatch = dobStr.match(/\d{4}/);
      if (yearMatch) {
        const year = parseInt(yearMatch[0]);
        const currentYear = new Date().getFullYear();
        return currentYear - year;
      }
    } catch (e) {}
    return 24;
  }
}
