# `financial_model.json` Rehberi

## Neden bu JSON var?
Transfer maliyeti ve finansal riskleri tek sözleşmede modellemek.

## Veriler nereden çekilmeli?
Contract, fee, wage, bonuses, resale assumptions.

## Hangi JSON/policy ile karşılaştırılmalı?
financial policy ve confidence rules.

## Kim tüketir?
decision engine.

## Zorunlu kalite kuralları
- Her kayıt `schemaVersion`, `recordType`, `recordId`, `createdAt` ve `provenance` taşır.
- Kapsam alanları açık olmalıdır.
- Eksik veri `0` ile doldurulmaz.
- Estimated değerler verified değerlerle aynı alanda gösterilmez.
- Üretim çıktısı schema testinden geçmeden downstream'e verilmez.
