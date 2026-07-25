# `role_classification.json` Rehberi

## Neden bu JSON var?
Pozisyon içindeki rol ve arketipi confidence ile sınıflandırmak.

## Veriler nereden çekilmeli?
Position evidence + role metrics.

## Hangi JSON/policy ile karşılaştırılmalı?
role definitions ve sample rules.

## Kim tüketir?
position engine, benchmark, LLM.

## Zorunlu kalite kuralları
- Her kayıt `schemaVersion`, `recordType`, `recordId`, `createdAt` ve `provenance` taşır.
- Kapsam alanları açık olmalıdır.
- Eksik veri `0` ile doldurulmaz.
- Estimated değerler verified değerlerle aynı alanda gösterilmez.
- Üretim çıktısı schema testinden geçmeden downstream'e verilmez.
