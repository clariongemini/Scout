# Governance Katmanı

Bu klasör standardın hangi kurallarının bağlayıcı olduğunu, schema/registry sürümlerinin nasıl değişeceğini ve backward compatibility politikasını tanımlar.

## Neden gerekli?
Futbol metrikleri, kaynaklar ve roller zamanla değişir. Version governance yoksa aynı isimli iki JSON farklı anlamlara gelebilir.

## Karşılaştırılacak JSON'lar
- `MANIFEST.json`
- `registries/*.json`
- `policies/*.json`
- `schemas/**/*.json`

Her üretim kaydı hangi schema, registry, benchmark ve engine sürümüyle üretildiğini taşımalıdır.
