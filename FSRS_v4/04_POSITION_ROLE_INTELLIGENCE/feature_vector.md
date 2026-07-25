# `feature_vector.json` Rehberi

## Neden bu JSON var?
Metrikleri futbol davranış boyutlarına deterministik dönüştürmek.

## Veriler nereden çekilmeli?
Verified metrics + benchmark percentiles.

## Hangi JSON/policy ile karşılaştırılmalı?
feature registry ve role weights.

## Kim tüketir?
fit, decision ve LLM.

## Zorunlu kalite kuralları
- Her kayıt `schemaVersion`, `recordType`, `recordId`, `createdAt` ve `provenance` taşır.
- Kapsam alanları açık olmalıdır.
- Eksik veri `0` ile doldurulmaz.
- Estimated değerler verified değerlerle aynı alanda gösterilmez.
- Üretim çıktısı schema testinden geçmeden downstream'e verilmez.
