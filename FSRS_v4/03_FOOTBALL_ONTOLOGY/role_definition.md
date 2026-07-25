# `role_definition.json` Rehberi

## Neden bu JSON var?
Rolü kod içi string yerine semantic obje yapmak.

## Veriler nereden çekilmeli?
Futbol uzmanı tanımları, event evidence, historical calibration.

## Hangi JSON/policy ile karşılaştırılmalı?
position taxonomy, metric/behaviour registries.

## Kim tüketir?
role engine, prompt router, renderer.

## Zorunlu kalite kuralları
- Her kayıt `schemaVersion`, `recordType`, `recordId`, `createdAt` ve `provenance` taşır.
- Kapsam alanları açık olmalıdır.
- Eksik veri `0` ile doldurulmaz.
- Estimated değerler verified değerlerle aynı alanda gösterilmez.
- Üretim çıktısı schema testinden geçmeden downstream'e verilmez.
