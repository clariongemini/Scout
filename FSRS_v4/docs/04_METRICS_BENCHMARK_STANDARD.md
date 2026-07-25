# 04 — Metrics and Benchmark Standard

## Metrik katmanları
1. observed counts
2. derived rates
3. benchmark percentiles
4. position feature scores
5. model estimates

## Benchmark zorunlu alanları
- season
- competitionTier
- league
- positionGroup
- roleGroup
- ageScope
- minimumMinutes
- populationSize
- dataCoverage
- benchmarkVersion

## Lig gücü
Farklı ligler doğrudan tek havuza eklenmemelidir. Competition tier veya ayrı lig benchmarkı kullanılır. Lig gücü düzeltmesi yapılacaksa formül sürümlendirilir ve ham percentile ayrıca korunur.

## Pozisyon örneklemi
Oyuncu çoklu pozisyonda oynuyorsa:
- dakika bazlı rol dağılımı tutulur;
- ana benchmark minimum rol dakika eşiğine göre seçilir;
- role split belirsizse rapor uyarısı verilir.
