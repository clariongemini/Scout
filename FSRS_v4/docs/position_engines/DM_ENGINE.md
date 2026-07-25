# DM Position Engine

## Roller
- `anchor`
- `ball_winning_midfielder`
- `deep_lying_playmaker`
- `single_pivot`
- `double_pivot_controller`

## Metrik grupları
### screening
- `interceptionsPer90`
- `ballRecoveriesPer90`
- `centralDefensiveActionsPer90`
### buildUp
- `firstPhaseTouchesPer90`
- `progressivePassesPer90`
- `lineBreakingPassesPer90`
### resistance
- `pressuredPassAccuracyPct`
- `turnoversUnderPressurePer90`
- `successfulTurnsPer90`
### restDefense
- `counterpressRegainsPer90`
- `transitionStopsPer90`
- `positionDisciplineScore`
### tempo
- `passesPer90`
- `switchesPer90`
- `tempoControlScore`

## Zorunlu işlem sırası
1. Pozisyon kapsamını doğrula.
2. Rol adaylarını üret.
3. Metrik kullanılabilirlik kontrolü yap.
4. Rol ağırlıklarını uygula.
5. Position-role benchmarkı seç.
6. Sample reliability uygula.
7. Feature vector üret.
8. Publication gate çalıştır.
