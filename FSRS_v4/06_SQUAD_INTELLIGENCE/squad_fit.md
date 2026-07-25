# `squad_fit.json` Rehberi

## Neden bu JSON var?
Oyuncunun mevcut kadroya marjinal katkısını ölçmek.

## Veriler nereden çekilmeli?
Roster, depth chart, roles, availability.

## Hangi JSON/policy ile karşılaştırılmalı?
squad need policy ve partner profiles.

## Kim tüketir?
decision engine.

## Zorunlu kalite kuralları
- Her kayıt `schemaVersion`, `recordType`, `recordId`, `createdAt` ve `provenance` taşır.
- Kapsam alanları açık olmalıdır.
- Eksik veri `0` ile doldurulmaz.
- Estimated değerler verified değerlerle aynı alanda gösterilmez.
- Üretim çıktısı schema testinden geçmeden downstream'e verilmez.
