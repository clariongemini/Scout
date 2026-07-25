# CB Position Engine

## Roller
- `stopper`
- `cover_defender`
- `ball_playing_defender`
- `wide_centre_back`
- `aerial_dominant_defender`

## Metrik grupları
### defending
- `groundDuelWinPct`
- `aerialDuelWinPct`
- `tacklesWonPct`
- `interceptionsPer90`
- `blocksPer90`
### recovery
- `recoveryRunsPer90`
- `lastManActions`
- `defensiveActionHeight`
- `paceProxy`
### boxDefense
- `clearancesPer90`
- `shotsBlockedPer90`
- `boxDefensiveActionsPer90`
### progression
- `progressivePassesPer90`
- `lineBreakingPassesPer90`
- `progressiveCarriesPer90`
- `longPassAccuracyPct`
### security
- `turnoversPer90`
- `errorsLeadingToShot`
- `pressuredPassAccuracyPct`

## Zorunlu işlem sırası
1. Pozisyon kapsamını doğrula.
2. Rol adaylarını üret.
3. Metrik kullanılabilirlik kontrolü yap.
4. Rol ağırlıklarını uygula.
5. Position-role benchmarkı seç.
6. Sample reliability uygula.
7. Feature vector üret.
8. Publication gate çalıştır.
