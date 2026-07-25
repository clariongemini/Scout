# `metric_definition.json` Rehberi

## Neden bu JSON var?
Aynı isimde farklı anlamlı metriklerin karışmasını engellemek.

## Veriler nereden çekilmeli?
Provider documentation ve internal formulas.

## Hangi JSON/policy ile karşılaştırılmalı?
source metric mappings.

## Kim tüketir?
normalization, benchmark, validation.

## Zorunlu kalite kuralları
- Her kayıt `schemaVersion`, `recordType`, `recordId`, `createdAt` ve `provenance` taşır.
- Kapsam alanları açık olmalıdır.
- Eksik veri `0` ile doldurulmaz.
- Estimated değerler verified değerlerle aynı alanda gösterilmez.
- Üretim çıktısı schema testinden geçmeden downstream'e verilmez.
