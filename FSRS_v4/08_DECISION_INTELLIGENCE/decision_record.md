# `decision_record.json` Rehberi

## Neden bu JSON var?
Nihai öneriyi yeniden üretilebilir ve denetlenebilir kılmak.

## Veriler nereden çekilmeli?
Tactical, squad, market, risk, data confidence.

## Hangi JSON/policy ile karşılaştırılmalı?
decision policy.

## Kim tüketir?
LLM ve final report.

## Zorunlu kalite kuralları
- Her kayıt `schemaVersion`, `recordType`, `recordId`, `createdAt` ve `provenance` taşır.
- Kapsam alanları açık olmalıdır.
- Eksik veri `0` ile doldurulmaz.
- Estimated değerler verified değerlerle aynı alanda gösterilmez.
- Üretim çıktısı schema testinden geçmeden downstream'e verilmez.
