# `identity_candidate.json` Rehberi

## Neden bu JSON var?
İsim benzerliği olan oyuncuların yanlış birleştirilmesini engellemek.

## Veriler nereden çekilmeli?
Doğum, takım, uyruk, external IDs, kariyer geçmişi.

## Hangi JSON/policy ile karşılaştırılmalı?
canonical identity ve source records.

## Kim tüketir?
identity resolver.

## Zorunlu kalite kuralları
- Her kayıt `schemaVersion`, `recordType`, `recordId`, `createdAt` ve `provenance` taşır.
- Kapsam alanları açık olmalıdır.
- Eksik veri `0` ile doldurulmaz.
- Estimated değerler verified değerlerle aynı alanda gösterilmez.
- Üretim çıktısı schema testinden geçmeden downstream'e verilmez.
