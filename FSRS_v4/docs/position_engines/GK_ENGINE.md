# GK Position Engine

## Roller
- `line_goalkeeper`
- `shot_stopper`
- `sweeper_keeper`
- `build_up_goalkeeper`
- `cross_collector`

## Metrik grupları
### shotStopping
- `savePct`
- `psxgMinusGoalsAllowed`
- `goalsPreventedPer90`
- `oneVOneSavePct`
- `reactionSavePct`
### areaControl
- `crossesStoppedPct`
- `highClaimPct`
- `punchRate`
- `claimSuccessPct`
- `setPieceClaimPct`
### sweeping
- `defensiveActionsOutsideBoxPer90`
- `avgDefensiveActionDistance`
- `sweeperSuccessPct`
### distribution
- `shortPassAccuracyPct`
- `mediumPassAccuracyPct`
- `longPassAccuracyPct`
- `launchAccuracyPct`
- `passesUnderPressurePct`
### risk
- `errorsLeadingToShot`
- `errorsLeadingToGoal`
- `miscontrolPer90`

## Zorunlu işlem sırası
1. Pozisyon kapsamını doğrula.
2. Rol adaylarını üret.
3. Metrik kullanılabilirlik kontrolü yap.
4. Rol ağırlıklarını uygula.
5. Position-role benchmarkı seç.
6. Sample reliability uygula.
7. Feature vector üret.
8. Publication gate çalıştır.
