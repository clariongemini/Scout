# WINGER Position Engine

## Roller
- `traditional_winger`
- `inside_forward`
- `wide_creator`
- `transition_runner`
- `wide_playmaker`
- `touchline_winger`

## Metrik grupları
### carrying
- `successfulDribblesPer90`
- `dribbleSuccessPct`
- `progressiveCarriesPer90`
- `carryDistancePer90`
### insideThreat
- `halfSpaceTouchesPer90`
- `centralBoxTouchesPer90`
- `nonPenaltyXGPer90`
- `shotsPer90`
### width
- `wideTouchesPer90`
- `crossesPer90`
- `crossAccuracyPct`
- `bylineEntriesPer90`
### creation
- `keyPassesPer90`
- `xAPer90`
- `shotCreatingActionsPer90`
### transition
- `fastBreakActionsPer90`
- `carriesIntoFinalThirdPer90`
- `runsInBehindPer90`
### defense
- `pressuresPer90`
- `counterpressRegainsPer90`
- `trackingRunsPer90`

## Zorunlu işlem sırası
1. Pozisyon kapsamını doğrula.
2. Rol adaylarını üret.
3. Metrik kullanılabilirlik kontrolü yap.
4. Rol ağırlıklarını uygula.
5. Position-role benchmarkı seç.
6. Sample reliability uygula.
7. Feature vector üret.
8. Publication gate çalıştır.
