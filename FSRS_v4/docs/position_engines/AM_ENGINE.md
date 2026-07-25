# AM Position Engine

## Roller
- `classic_ten`
- `advanced_playmaker`
- `shadow_striker`
- `half_space_creator`
- `free_eight`

## Metrik grupları
### receiving
- `betweenLinesReceiptsPer90`
- `halfSpaceReceiptsPer90`
- `turnsUnderPressurePer90`
### creation
- `keyPassesPer90`
- `throughBallsPer90`
- `xAPer90`
- `goalCreatingActionsPer90`
### combination
- `oneTwosPer90`
- `shortCombinationsPer90`
- `layoffsPer90`
### threat
- `nonPenaltyXGPer90`
- `boxTouchesPer90`
- `shotsPer90`
### resistance
- `pressuredRetentionPct`
- `dispossessedPer90`

## Zorunlu işlem sırası
1. Pozisyon kapsamını doğrula.
2. Rol adaylarını üret.
3. Metrik kullanılabilirlik kontrolü yap.
4. Rol ağırlıklarını uygula.
5. Position-role benchmarkı seç.
6. Sample reliability uygula.
7. Feature vector üret.
8. Publication gate çalıştır.
