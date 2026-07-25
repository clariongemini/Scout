# `reconciliation_case.json` Rehberi

## Neden bu JSON var?
Çelişkilerin nasıl çözüldüğünü denetlenebilir şekilde kaydetmek.

## Veriler nereden çekilmeli?
Aynı metric için observations.

## Hangi JSON/policy ile karşılaştırılmalı?
source reliability, freshness, tolerance.

## Kim tüketir?
verified player ve audit.

## Zorunlu kalite kuralları
- Her kayıt `schemaVersion`, `recordType`, `recordId`, `createdAt` ve `provenance` taşır.
- Kapsam alanları açık olmalıdır.
- Eksik veri `0` ile doldurulmaz.
- Estimated değerler verified değerlerle aynı alanda gösterilmez.
- Üretim çıktısı schema testinden geçmeden downstream'e verilmez.
