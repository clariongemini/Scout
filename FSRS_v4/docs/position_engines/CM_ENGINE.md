# CM Position Engine

## Roller
- `box_to_box`
- `progressor`
- `controller`
- `mezzala`
- `two_way_midfielder`

## Metrik grupları
### progression
- `progressivePassesPer90`
- `progressiveCarriesPer90`
- `finalThirdPassesPer90`
### circulation
- `passesPer90`
- `passCompletionPct`
- `switchesPer90`
### coverage
- `distanceCoveredPer90`
- `highIntensityRunsPer90`
- `recoveriesPer90`
### creation
- `keyPassesPer90`
- `xAPer90`
- `shotCreatingActionsPer90`
### arrival
- `boxTouchesPer90`
- `nonPenaltyXGPer90`
- `lateBoxRunsPer90`

## Zorunlu işlem sırası
1. Pozisyon kapsamını doğrula.
2. Rol adaylarını üret.
3. Metrik kullanılabilirlik kontrolü yap.
4. Rol ağırlıklarını uygula.
5. Position-role benchmarkı seç.
6. Sample reliability uygula.
7. Feature vector üret.
8. Publication gate çalıştır.
