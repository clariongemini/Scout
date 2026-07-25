# `team_context.json` Rehberi

## Neden bu JSON var?
Oyuncu üretiminin takım ortamını ölçmek.

## Veriler nereden çekilmeli?
Team event aggregates, possession, formation, opponent strength.

## Hangi JSON/policy ile karşılaştırılmalı?
context registry.

## Kim tüketir?
context adjustment ve tactical fit.

## Zorunlu kalite kuralları
- Her kayıt `schemaVersion`, `recordType`, `recordId`, `createdAt` ve `provenance` taşır.
- Kapsam alanları açık olmalıdır.
- Eksik veri `0` ile doldurulmaz.
- Estimated değerler verified değerlerle aynı alanda gösterilmez.
- Üretim çıktısı schema testinden geçmeden downstream'e verilmez.
