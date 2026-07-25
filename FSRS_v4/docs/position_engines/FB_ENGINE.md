# FB Position Engine

## Roller
- `overlapping_fullback`
- `inverted_fullback`
- `defensive_fullback`
- `wingback`
- `creative_fullback`

## Metrik grupları
### progression
- `progressiveCarriesPer90`
- `progressivePassesPer90`
- `finalThirdEntriesPer90`
### width
- `touchlineTouchesPer90`
- `overlapRunsPer90`
- `crossesPer90`
- `crossAccuracyPct`
### inversion
- `centralReceiptsPer90`
- `halfSpaceReceiptsPer90`
- `insidePassSharePct`
### defending
- `wideDuelWinPct`
- `tacklesPer90`
- `recoveryRunsPer90`
- `dribbledPastPer90`
### creation
- `keyPassesPer90`
- `xAPer90`
- `shotCreatingActionsPer90`

## Zorunlu işlem sırası
1. Pozisyon kapsamını doğrula.
2. Rol adaylarını üret.
3. Metrik kullanılabilirlik kontrolü yap.
4. Rol ağırlıklarını uygula.
5. Position-role benchmarkı seç.
6. Sample reliability uygula.
7. Feature vector üret.
8. Publication gate çalıştır.
