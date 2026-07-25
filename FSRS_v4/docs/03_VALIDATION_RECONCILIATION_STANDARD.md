# 03 — Validation and Reconciliation Standard

## Karşılaştırma ön koşulları
İki değer ancak aşağıdakiler eşleşiyorsa karşılaştırılır:
- canonicalPlayerId
- metricId
- season
- team
- competitionScope
- unit
- metricDefinitionVersion

## Mutabakat
- tam eşleşme: exact
- yuvarlama toleransı içinde: tolerance
- authoritative source üstünlüğü: authoritative
- tek kaynak kabulü: single_source
- çözümsüz çelişki: conflict

## Güven hesabı
Örnek bileşenler:
- source reliability
- freshness
- independence
- scope completeness
- mathematical consistency
- cross-source agreement
- sample reliability

Ağırlıklar `reconciliation_policy.json` dosyasındadır.

## Conflict kaydı
Her çelişki:
- aday değerleri
- kaynakları
- independence group'ları
- kapsam farkını
- seçilen veya reddedilen değeri
- karar nedenini
- karar motoru sürümünü
saklamalıdır.
