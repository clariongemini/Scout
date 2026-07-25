# Layer 0 — Source Intelligence
Kaynak edinim katmanı yalnızca veri toplar ve kanıtı saklar. Futbol yorumu, normalization veya merge yapmaz.

## İçerik
- source registry
- legal/use policy
- adapter contracts
- crawl budget/rate limit
- snapshot and lineage
- freshness policy

## Tasarım kararı
Her siteye özel adapter vardır; ortak canonical modele doğrudan yazılmaz. Önce site-specific raw JSON üretilir.
