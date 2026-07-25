/* ═══════════════════════════════════════════════════════════════
   Scout Kartı v10.0 — Types
   Tüm metrikler ScoutingStats glossary + FBref + Transfermarkt + Sofascore
═══════════════════════════════════════════════════════════════ */

/* ── Temel yapılar ── */
export interface PositionData    { name: string; pct: number; rating: number }
export interface MVHistory       { year: number; value: number; label?: string }
export interface TransferItem    { date: string; from: string; to: string; fee: string; type: string; reason?: string }
export interface TrophyItem      { name: string; team: string; years: string; category?: 'league'|'cup'|'europe'|'supercup' }
export interface AwardItem       { name: string; years: string; org?: string }
export interface InjuryItem      { name: string; date: string; days: number; type?: string; matchesMissed?: number }
export interface NationalCareerRow {
  level: string; matches: number; starts: number; minutes: number;
  goals: number; assists: number; captained?: boolean;
  first: string; last: string; tournaments?: string
}
export interface NationalTimelineItem { level: string; year: string }
export interface SeasonRow {
  season: string; club: string; competition: string;
  age: number; matches: number; starts: number; minutes: number;
  goals: number; assists: number; xg: string; xa?: string;
  gol90?: string; yellowCards?: number; redCards?: number; rating?: string
}
export interface RoleFitItem     { role: string; pct: number }
export interface RiskItem        { category: string; level: 'Düşük'|'Orta'|'Yüksek'; color: string; note?: string }
export interface ComparablePlayer { name: string; similarity: number; club: string; style?: string; age?: number; mv?: string }
export interface FormationFitItem { formation: string; fit: number; clubs: string; description?: string }
export interface TacticalTag     { label: string; type: 'role'|'strength'|'style' }

/* ── Per 90 metrikler ── */
export interface Per90Metrics {
  /* Hücum */
  goals: string; assists: string; xG: string; npxG: string; xA: string; xGI?: string;
  goalsMinusXG?: string;         /* Goals − xG (bitiricilik farkı) */
  xGOTminusXG?: string;          /* xGOT − xG (yerleşim kalitesi) */
  shots: string; shotsOnTarget: string; shotsOnTargetPct: string;
  xGperShot?: string; npxGperShot?: string;
  bigChances?: string; bigChancesMissed?: string; conversionPct?: string;
  /* Pas & Yaratım */
  keyPasses: string; chancesCreated?: string; bigChancesCreated?: string;
  progressivePasses: string; throughBalls?: string; longBalls?: string;
  crossAccuracy?: string; finalThirdPasses?: string; backwardPassShare?: string;
  sca?: string; gca?: string; /* Shot/Goal Creating Actions */
  xA_90?: string;
  /* Top Taşıma */
  progressiveCarries: string; carryDistance?: string; carriesIntoBox?: string;
  carries?: string;
  /* Dribling */
  dribbles: string; dribbleSuccessPct: string; foulsDrawn?: string;
  /* Temas & Top Kaybı */
  touches: string; finalThirdTouches?: string; boxTouches?: string;
  turnovers?: string; dispossessed?: string; ballRetentionPct?: string;
  /* Savunma */
  tackles?: string; tackleWinRate?: string; interceptions?: string;
  clearances?: string; blocks?: string; recoveries?: string;
  pressures?: string; pressureSuccessPct?: string; duelWinRate?: string;
  aerialWon?: string; aerialWinRate?: string; fouls?: string;
  padjTackles?: string; padjInterceptions?: string; padjRecoveries?: string;
  errorsLeadingToGoal?: string;
  /* Genel */
  fotmob: string; yellowCards: number; redCards: number;
}

/* ── Percentile verileri ── */
export interface PercentileData {
  goals?: number; assists?: number; xG?: number; npxG?: number; xA?: number;
  shots?: number; shotsOnTarget?: number; conversionPct?: number; bigChances?: number;
  keyPasses?: number; progressivePasses?: number; chancesCreated?: number;
  progressiveCarries?: number; dribbles?: number; dribbleSuccessPct?: number;
  tackles?: number; interceptions?: number; aerialWinRate?: number;
  pressures?: number; pressureSuccessPct?: number; duelWinRate?: number;
  passes?: number; passAccuracy?: number; sca?: number; gca?: number;
  touches?: number; boxTouches?: number; foulsDrawn?: number;
}

/* ── Trend verisi ── */
export interface SeasonTrend {
  season: string; goals: number; assists: number; xg: number; xa: number;
  rating: number; minutes: number; gol90: number; trend: '↗'|'→'|'↘'
}

/* ── Fiziksel Profil ── */
export interface PhysicalProfile {
  sprintSpeed?: string; maxSpeed?: string; acceleration?: string;
  highIntensityRuns?: string; distancePerGame?: string;
  repeatedSprintAbility?: string; stamina?: string; jumpHeight?: string;
  sprintSpeedPct?: number; maxSpeedPct?: number; staminaPct?: number;
  jumpPct?: number; accelerationPct?: number; hiRunsPct?: number
}

/* ── Mental Profil ── */
export interface MentalProfile {
  leadership: number; decisionMaking: number; underPressure: number;
  composure: number; aggression: number; workRate: number;
  discipline: number; gameIntelligence: number
}

/* ── Kontrat Detayları ── */
export interface ContractDetails {
  start: string; end: string; option: string; wage: string;
  releaseClause: string; agent: string; agentCompany?: string; status: string
}

/* ── Finansal Analiz ── */
export interface FinancialAnalysis {
  currentMV: string; peakMV: string; peakYear?: string;
  estimatedFee: string; minFee: string; wagePA: string;
  releaseClause: string; acquisitionDifficulty: number; /* 1-100 */
  resaleValue: number; /* 1-100 */
  financialRisk: number; /* 1-100 */
  mvTrend?: 'up'|'stable'|'down'
}

/* ── AI Tahmin ── */
export interface AIPrediction {
  developmentCurve: string; /* 'Zirve', 'Yükseliş', 'Düşüş' */
  mv12months: string; mv24months: string; mv36months?: string;
  top5LeagueAdaptation: number; /* % */
  bigClubSuccess: number; /* % */
  injuryRiskProjection: number; /* % */
  transferTiming: 'HEMEN'|'1 SEZON SONRA'|'2 SEZON SONRA';
  ceiling: string; ceilingScore: number;
  floor: string; floorScore: number;
  agingCurveNote?: string
}

/* ── Scout Kararı ── */
export interface ScoutDecision {
  readiness: 'Hazır Oyuncu'|'Gelişim Oyuncusu'|'Yüksek Tavan'|'Rotasyon'|'İlk 11'|'Gelecek Yatırımı';
  overallScores: {
    technicalQuality: number; tacticalIntelligence: number; physicalProfile: number;
    mentality: number; consistency: number; potential: number;
    risk: number; /* ters — yüksek puan = düşük risk */
    financialValue: number; clubFit: number; resalePotential: number
  }
}

/* ── Ana PlayerData ── */
export interface PlayerData {
  /* Kimlik */
  name: string; number: string; team: string; league: string;
  country: string; countryCode: string; secondNationality?: string;
  imageUrl?: string;
  teamLogoUrl?: string;
  clubLogoUrl?: string;
  // Lig
  leagueName?: string;
  leagueLogoUrl?: string;
  // Uyruk
  primaryNationality?: string;
  primaryFlagUrl?: string;
  nationalityFlags?: { country: string; flagUrl: string }[];
  // Transfer & Piyasa
  birthDate: string; 
  birthPlace?: string;
  height: string; weight?: string;
  preferredFoot: string; weakFootRating?: number; /* 1-5 */
  skillMoves?: number; /* 1-5 */
  agility?: number;
  nationalTeam?: string; nationalTeamStatus?: string;
  primaryPosition: string; altPositions?: string[];
  // Detaylı Mevki
  primaryPositions?: string[];
  secondaryPositions?: string[];
  mainPositionLabels?: string[];
  secondaryPositionLabels?: string[];
  marketValue: string; debutDate?: string; contractExpiry: string;
  contractStart?: string;
  agentCompany?: string;
  shirtNumber?: string;
  agent?: string;

  /* Kontrat */
  contractDetails?: ContractDetails;

  /* Kariyer Özeti (ham sayılar) */
  careerSummary: {
    matches: number; minutes: number; goals: number; assists: number;
    passAccuracy: string; duelWinRate: string; aerialWinRate: string;
    runningDist?: string; maxSpeed?: string;
    yellowCards?: number; redCards?: number;
    goalsPer90?: string; assistsPer90?: string; gaPer90?: string;
    clubCount?: number; leagueCount?: number;
    nonPenaltyGoals?: number; penalties?: number;
  };

  /* Sezon performansı (güncel sezon) */
  seasonPerformance: {
    season?: string; matches: number; starts: number; minutes: number;
    goals: number; assists: number; nonPenaltyGoals?: number; penalties?: number;
    xg: string; xa: string; npxg?: string; gol90: string; rating: string;
    yellowCards?: number; redCards?: number;
    keyPasses?: number; progressivePasses?: number;
    sca?: number; gca?: number;
  };

  /* Per90 + İleri metrikler */
  metrics90: Per90Metrics;

  /* Percentile */
  percentile?: PercentileData;

  /* Trend (son 3 sezon) */
  seasonTrend?: SeasonTrend[];

  /* Kariyer Sezon Tablosu */
  seasonBySeasonStats?: SeasonRow[];

  /* Pozisyonlar */
  positions: PositionData[];

  /* Piyasa Değeri */
  marketValueHistory: MVHistory[];

  /* Transfer Geçmişi */
  transferHistory: TransferItem[];

  /* Milli Takım */
  nationalCareer: NationalCareerRow[];
  nationalTimeline?: NationalTimelineItem[];

  /* Başarılar */
  trophies: TrophyItem[];
  awards: AwardItem[];

  /* Sakatlık */
  injuryHistory: InjuryItem[];

  /* Fiziksel + Mental */
  physicalProfile?: PhysicalProfile;
  mentalProfile?: MentalProfile;

  /* Radar */
  radar: { teknik: number; fiziksel: number; taktik: number; zihinsel: number; liderlik: number; butunculuk: number };

  /* Scout Skorları */
  scoutScores: { teknik: number; fiziksel: number; taktik: number; zihinsel: number; bitiricilik: number };

  /* Taktik */
  roleFit: RoleFitItem[];
  tacticalRole?: string; /* 'Target Forward', 'Inside Forward' vb. */
  tacticalTags?: TacticalTag[];
  tacticalFormationFit?: FormationFitItem[];
  targetClubFit?: {
    clubName: string; formation: string; managerStyle: string;
    formationFit: number; leagueFit: number; euroFit: number;
    foreignQuotaOk: boolean; u23Advantage: boolean; note: string
  };

  /* Risk */
  riskAnalysis: RiskItem[];

  /* Finansal */
  financialAnalysis?: FinancialAnalysis;

  /* Fiziksel */
  physicalData?: PhysicalProfile;

  /* AI */
  aiPrediction?: AIPrediction;

  /* Scout Kararı */
  scoutDecision?: ScoutDecision;

  /* Güçlü / Zayıf */
  strengths?: string[];
  weaknesses?: string[];
  tacticalEvaluation?: string;

  /* Benzer Oyuncular */
  comparablePlayers?: ComparablePlayer[];
}

/* ── Scout Raporu (Wizard çıktısı) ── */
export interface ScoutReport {
  strengths: string[];
  weaknesses: string[];
  tacticalEvaluation: string;
  recommendation: 'buy' | 'follow' | 'pass';
  score: number;
  riskAnalysis?: RiskItem[];
  targetClub?: string;
  age?: number;
  fsrsData?: any;
}
