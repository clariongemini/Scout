# `llm_analysis_output.json` Rehberi

## Neden bu JSON var?
Her yorumun kanıt ID ve confidence taşımasını zorunlu kılmak.

## Veriler nereden çekilmeli?
LLM response.

## Hangi JSON/policy ile karşılaştırılmalı?
output schema ve evidence validator.

## Kim tüketir?
publication gate.

## Zorunlu kalite kuralları
- Her kayıt `schemaVersion`, `recordType`, `recordId`, `createdAt` ve `provenance` taşır.
- Kapsam alanları açık olmalıdır.
- Eksik veri `0` ile doldurulmaz.
- Estimated değerler verified değerlerle aynı alanda gösterilmez.
- Üretim çıktısı schema testinden geçmeden downstream'e verilmez.
