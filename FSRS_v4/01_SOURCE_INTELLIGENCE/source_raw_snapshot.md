# `source_raw_snapshot.json` Rehberi

## Neden bu JSON var?
Ham kaynak kanıtını değiştirilmeden saklamak.

## Veriler nereden çekilmeli?
Resmî API, lisanslı feed, izinli HTML/network payload.

## Hangi JSON/policy ile karşılaştırılmalı?
source registry, retrieval policy, content hash.

## Kim tüketir?
canonical adapter ve audit katmanı.

## Zorunlu kalite kuralları
- Her kayıt `schemaVersion`, `recordType`, `recordId`, `createdAt` ve `provenance` taşır.
- Kapsam alanları açık olmalıdır.
- Eksik veri `0` ile doldurulmaz.
- Estimated değerler verified değerlerle aynı alanda gösterilmez.
- Üretim çıktısı schema testinden geçmeden downstream'e verilmez.
