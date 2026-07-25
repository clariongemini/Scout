# `llm_analysis_input.json` Rehberi

## Neden bu JSON var?
LLM bilgi sınırını belirlemek ve hallucination riskini azaltmak.

## Veriler nereden çekilmeli?
Verified intelligence package.

## Hangi JSON/policy ile karşılaştırılmalı?
prompt route contract.

## Kim tüketir?
LLM.

## Zorunlu kalite kuralları
- Her kayıt `schemaVersion`, `recordType`, `recordId`, `createdAt` ve `provenance` taşır.
- Kapsam alanları açık olmalıdır.
- Eksik veri `0` ile doldurulmaz.
- Estimated değerler verified değerlerle aynı alanda gösterilmez.
- Üretim çıktısı schema testinden geçmeden downstream'e verilmez.
