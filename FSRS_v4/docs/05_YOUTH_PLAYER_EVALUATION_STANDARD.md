# 05 — Youth Player Evaluation Standard

## Kapsam
15–19 yaş arası futbolcular için zorunludur. 20–21 yaş gelişim oyuncuları için opsiyonel olarak kullanılabilir.

## Ayrı veri örneklemleri
- academy
- reserve
- youth international
- senior domestic
- senior continental

Bu seviyelerin üretimleri aynı ağırlıkta birleştirilmez.

## Zorunlu genç oyuncu alanları
- ageBand
- careerStage
- seniorExposure
- youthExposure
- ageCohortPercentiles
- seniorPositionPercentiles
- developmentVelocity
- seniorTransitionScore
- sampleReliability
- physicalMaturityStatus
- potentialRange
- projectionHorizonYears
- assumptions
- pathwayRecommendation

## Örneklem cezası
Senior dakika azsa:
- current ability güveni düşürülür;
- potential aralığı genişletilir;
- transfer tavsiyesi `MONITOR` veya `DEVELOPMENT_SIGNING` yönüne çekilebilir;
- kesin elit seviye iddiası engellenir.

## Fiziksel olgunluk
Boy, kilo veya yaş üzerinden LLM fiziksel olgunluk çıkarımı yapamaz. Belgeli test yoksa:
```json
{"status":"unavailable"}
```

## Potansiyel
Potansiyel tek rakam değil:
- low
- expected
- high
- confidence
- horizon
- drivers
- risks
- assumptions
ile sunulur.
