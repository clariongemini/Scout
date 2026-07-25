# ST Position Engine

## Roller
- `poacher`
- `advanced_forward`
- `complete_forward`
- `target_forward`
- `pressing_forward`
- `false_nine`
- `channel_forward`

## Metrik grupları
### finishing
- `goalsPer90`
- `nonPenaltyGoalsPer90`
- `xGPerShot`
- `goalsMinusXG`
- `shotsOnTargetPct`
### boxMovement
- `boxTouchesPer90`
- `nearPostRunsPer90`
- `farPostRunsPer90`
- `centralRunsPer90`
### linkPlay
- `layoffsPer90`
- `passesReceivedUnderPressurePer90`
- `assistsPer90`
- `xAPer90`
### aerial
- `aerialDuelWinPct`
- `headedShotsPer90`
- `headedGoalsPer90`
### depth
- `runsInBehindPer90`
- `offsidesPer90`
- `channelRunsPer90`
### pressing
- `pressuresPer90`
- `highRegainsPer90`
- `pressureSuccessPct`

## Zorunlu işlem sırası
1. Pozisyon kapsamını doğrula.
2. Rol adaylarını üret.
3. Metrik kullanılabilirlik kontrolü yap.
4. Rol ağırlıklarını uygula.
5. Position-role benchmarkı seç.
6. Sample reliability uygula.
7. Feature vector üret.
8. Publication gate çalıştır.
