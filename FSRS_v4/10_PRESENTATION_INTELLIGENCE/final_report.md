# `final_report.json` Rehberi

## Neden bu JSON var?
UI/PDF/API için tek doğruluk kaynağı sağlamak.

## Veriler nereden çekilmeli?
Validated deterministic + LLM outputs.

## Hangi JSON/policy ile karşılaştırılmalı?
publication gate ve renderer contract.

## Kim tüketir?
tüm sunum katmanları.

## Zorunlu kalite kuralları
- Her kayıt `schemaVersion`, `recordType`, `recordId`, `createdAt` ve `provenance` taşır.
- Kapsam alanları açık olmalıdır.
- Eksik veri `0` ile doldurulmaz.
- Estimated değerler verified değerlerle aynı alanda gösterilmez.
- Üretim çıktısı schema testinden geçmeden downstream'e verilmez.
