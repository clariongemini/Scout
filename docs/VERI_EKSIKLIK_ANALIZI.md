# Veri Eksiklik Analizi ve İyileştirme Planı

## Mevcut Durum Analizi

### Şu Anda Çekilen Veriler (MetricExtractor)
**Understat:**
- goals, assists, xG, xA, minutes, matches
- shots, keyPasses, yellowCards, redCards
- npxG, npxGPer90, xA90, npg

**FotMob:**
- rating, matches, goals, assists

**Transfermarkt:**
- marketValue

### TransfermarktAdapter'da Mevcut Ama Kullanılmayan Veriler
- Sakatlık geçmişi (injuryHistory, injurySummaryBySeason)
- Transfer geçmişi (transferHistory)
- Milli takım kariyeri (nationalCareer)
- Detaylı kupalar (detailedTrophies)
- Pozisyon detayları (primaryPositions, secondaryPositions)
- Sözleşme bilgileri (contractExpires, contractStart)
- Temsilci bilgisi (agent)
- Forma numarası (shirtNumber)
- Boy, ayak, doğum yeri, doğum tarihi

### FSRS_v4 Metric Registry'de Tanımlı Metrikler
- minutes
- goals_per90 (formula: goals*90/minutes)
- psxg_minus_goals_allowed (GK için)
- progressive_passes_per90
- npxg_per90
- cross_claim_pct (GK için)
- role_minutes_share

### FSRS_v4 Feature Registry'de Tanımlı Feature'lar
- scoring_threat (npxg_per90, shots_per90, box_touches_per90)
- progression (progressive_passes_per90, progressive_carries_per90)
- shot_stopping (save_pct, psxg_minus_goals_allowed, one_v_one_save_pct)
- data_confidence (source_independence, coverage, freshness, definition_match)

## Eksik Veri Kategorileri

### 1. Gelişmiş Ofansif Metrikler
- shots_per90
- shots_on_target_per90
- box_touches_per90
- progressive_carries_per90
- dribbles_per90
- key_passes_per90
- xG_per90
- xA_per90
- npxG_per90
- npg_per90

### 2. Gelişmiş Defansif Metrikler
- tackles_per90
- interceptions_per90
- aerial_duels_won_pct
- pressures_per90
- blocks_per90
- clearances_per90

### 3. Kaleci Metrikleri
- save_pct
- psxg_minus_goals_allowed
- one_v_one_save_pct
- cross_claim_pct
- clean_sheets

### 4. Kariyer ve Geçmiş Veriler
- Kariyer toplamları (career totals)
- Sezon bazlı geçmiş (season-by-season stats)
- Transfer geçmişi
- Sakatlık geçmişi
- Milli takım kariyeri

### 5. Sözleşme ve Finansal Veriler
- Sözleşme başlangıç/bitiş
- Temsilci bilgisi
- Piyasa değeri geçmişi
- Maaş bilgisi (varsa)

### 6. Pozisyon ve Rol Verileri
- Detaylı pozisyon bilgileri
- Rol dağılımı
- Dakika dağılımı pozisyona göre

## İyileştirme Planı

### Faz 1: MetricExtractor Genişletme
1. Tüm Understat metriklerini ekle
2. Transfermarkt detaylı verilerini ekle
3. FotMob gelişmiş metriklerini ekle
4. Statbunker ve Soccerway metriklerini ekle

### Faz 2: Reconciliation Hiyerarşisi
1. Source reliability tier'ları uygula (A, B, C, ESTIMATED)
2. Freshness policy ekle
3. Source independence kontrolü
4. Tolerance kurallarını genişlet

### Faz 3: Feature Calculation
1. FSRS_v4 feature registry'deki feature'ları hesapla
2. Per 90 metriklerini hesapla
3. Pozisyon bazlı metrikleri filtrele

### Faz 4: Verified Player Package Genişletme
1. Tüm metrikleri kapsayan verified player
2. Kariyer ve geçmiş verilerini ekle
3. Sözleşme ve finansal verileri ekle
4. Pozisyon ve rol verilerini ekle
