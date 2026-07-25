# 11 — Heatmap and Event Coordinate Standard

## Koordinat sistemi
Tüm kaynaklar 0–100 x 0–100 canonical sahaya normalize edilir.
Takım hücum yönü her zaman soldan sağa çevrilir.

## Harita türleri
- touch_density
- receive_density
- carry_start
- carry_end
- shot_location
- chance_creation
- defensive_action
- goalkeeper_action
- distribution_target

## Scope
Her harita season, team, competition, position, role, minutes ve mapType taşır.

## Kalite
Kaynak koordinat tanımı bilinmiyorsa görsel rapora eklenmez.
Farklı pozisyon dakikaları tek haritada birleştirilecekse açık `combined_positions` etiketi zorunludur.
