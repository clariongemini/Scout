# `position_evidence.json` Rehberi

## Neden bu JSON var?
Bir oyuncunun gerçek pozisyon dağılımını kanıtlarla belirlemek.

## Veriler nereden çekilmeli?
Lineup, event coordinates, average position, formation.

## Hangi JSON/policy ile karşılaştırılmalı?
position taxonomy ve multi-position policy.

## Kim tüketir?
role classification.

## Zorunlu kalite kuralları
- Her kayıt `schemaVersion`, `recordType`, `recordId`, `createdAt` ve `provenance` taşır.
- Kapsam alanları açık olmalıdır.
- Eksik veri `0` ile doldurulmaz.
- Estimated değerler verified değerlerle aynı alanda gösterilmez.
- Üretim çıktısı schema testinden geçmeden downstream'e verilmez.
