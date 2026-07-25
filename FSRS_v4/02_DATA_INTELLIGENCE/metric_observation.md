# `metric_observation.json` Rehberi

## Neden bu JSON var?
Her sayıyı tanım, kapsam, birim ve provenance ile saklamak.

## Veriler nereden çekilmeli?
Source adapter çıktıları.

## Hangi JSON/policy ile karşılaştırılmalı?
metric definition registry, scope validator.

## Kim tüketir?
reconciliation ve verified player.

## Zorunlu kalite kuralları
- Her kayıt `schemaVersion`, `recordType`, `recordId`, `createdAt` ve `provenance` taşır.
- Kapsam alanları açık olmalıdır.
- Eksik veri `0` ile doldurulmaz.
- Estimated değerler verified değerlerle aynı alanda gösterilmez.
- Üretim çıktısı schema testinden geçmeden downstream'e verilmez.
