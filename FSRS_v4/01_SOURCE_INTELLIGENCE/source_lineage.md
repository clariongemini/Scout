# `source_lineage.json` Rehberi

## Neden bu JSON var?
İki görünen kaynağın aynı upstream sağlayıcıdan gelip gelmediğini anlamak.

## Veriler nereden çekilmeli?
Provider dokümantasyonu, network metadata, data attribution.

## Hangi JSON/policy ile karşılaştırılmalı?
source reliability matrix ve independence policy.

## Kim tüketir?
reconciliation engine.

## Zorunlu kalite kuralları
- Her kayıt `schemaVersion`, `recordType`, `recordId`, `createdAt` ve `provenance` taşır.
- Kapsam alanları açık olmalıdır.
- Eksik veri `0` ile doldurulmaz.
- Estimated değerler verified değerlerle aynı alanda gösterilmez.
- Üretim çıktısı schema testinden geçmeden downstream'e verilmez.
