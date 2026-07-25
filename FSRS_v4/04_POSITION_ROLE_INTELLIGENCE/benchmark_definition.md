# `benchmark_definition.json` Rehberi

## Neden bu JSON var?
Percentile evrenini tekrar üretilebilir hale getirmek.

## Veriler nereden çekilmeli?
Verified cohort dataset.

## Hangi JSON/policy ile karşılaştırılmalı?
metric definition, role, age, tier, minutes.

## Kim tüketir?
percentile engine.

## Zorunlu kalite kuralları
- Her kayıt `schemaVersion`, `recordType`, `recordId`, `createdAt` ve `provenance` taşır.
- Kapsam alanları açık olmalıdır.
- Eksik veri `0` ile doldurulmaz.
- Estimated değerler verified değerlerle aynı alanda gösterilmez.
- Üretim çıktısı schema testinden geçmeden downstream'e verilmez.
