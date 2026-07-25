# `tactical_fit.json` Rehberi

## Neden bu JSON var?
Oyuncu rol vektörünü hedef oyun modeliyle eşleştirmek.

## Veriler nereden çekilmeli?
Feature vector + target club requirements.

## Hangi JSON/policy ile karşılaştırılmalı?
tactical fit policy.

## Kim tüketir?
decision engine.

## Zorunlu kalite kuralları
- Her kayıt `schemaVersion`, `recordType`, `recordId`, `createdAt` ve `provenance` taşır.
- Kapsam alanları açık olmalıdır.
- Eksik veri `0` ile doldurulmaz.
- Estimated değerler verified değerlerle aynı alanda gösterilmez.
- Üretim çıktısı schema testinden geçmeden downstream'e verilmez.
