# 09 — Role Intelligence Standard

Rol sınıflandırması pozisyon etiketinden ayrı bir işlemdir.

## Zorunlu girdiler
- position evidence
- event location profile
- average position
- touch/receive zones
- pass direction profile
- shot profile
- carry profile
- defensive action height
- formation and team context

## Çıktı
Primary, secondary ve rejected role candidates üretilir. Her aday confidence, sample minutes, evidence ve contradicting evidence taşır.

## Yasaklar
- yalnızca tek sağlayıcının `position` etiketiyle rol belirleme
- yalnızca heatmap görüntüsünden rol belirleme
- 300 dakikadan az örneklemde yüksek güven üretme
- farklı sezon/pozisyon kapsamlarını tek profile birleştirme
