# Layer 1 — Data Intelligence

FSRS_v4 Data Intelligence katmanı: identity → normalize → metric semantics → validate → reconcile → verified

## Bileşenler

### ReconciliationEngine.ts
- Çelişen metrik değerlerini çözer
- Tolerans kurallarına göre karar verir
- `reconciliation_case.json` çıktısı üretir

### MetricExtractor.ts
- Source adapter çıktılarından metric observations üretir
- Her metrik tanım, kapsam ve provenance taşır
- `metric_observation.json` çıktısı üretir

### VerifiedPlayerBuilder.ts
- Reconciliation sonuçlarından verified player package oluşturur
- Data quality assessment yapar
- `verified_player.json` çıktısı üretir

## FSRS_v4 Standardı
Bu katmanın çıktısı `verified_player.json`dur. Sonraki hiçbir katman raw kaynaktan doğrudan okuyamaz.
