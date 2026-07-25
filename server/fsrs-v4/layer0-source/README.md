# Layer 0 — Source Intelligence

FSRS_v4 Source Intelligence katmanı: Kaynak edinim katmanı yalnızca veri toplar ve kanıtı saklar. Futbol yorumu, normalization veya merge yapmaz.

## Bileşenler

### FSRSv4Adapter.ts
- FSRS_v4 kontratına uygun base adapter
- SourceRawSnapshot döndürür
- Cache ve RawDataLake entegrasyonu
- Parser version tracking
- Null semantics (0 ve null ayrımı)

## FSRS_v4 Standardı
- Her adapter source-specific raw record üretir
- Retrieval timestamp ve request metadata saklar
- Raw response hash üretir
- Parser version taşır
- Canonical merge yapmaz
- Rate limit ve retry politikasına uyar
- Başarısız alanı null bırakır, tahmin etmez

## Mevcut Adapter'lar
Mevcut adapter'lar (TransfermarktAdapter, UnderstatAdapter, vb.) bu yeni FSRSv4Adapter'den türetilecek.
