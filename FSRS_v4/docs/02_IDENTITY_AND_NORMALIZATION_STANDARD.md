# 02 — Identity and Normalization Standard

## Canonical player ID
Her futbolcuya sistem içi değişmez kimlik atanır:

```text
fsrs-player-{uuid}
```

Kaynak ID'leri bu kimliğe bağlanır.

## Eşleşme puanı
Önerilen ağırlıklar:
- doğum tarihi: 0.35
- normalize isim: 0.25
- kulüp/sezon: 0.15
- milliyet: 0.10
- boy: 0.05
- pozisyon: 0.05
- önceden doğrulanmış kaynak ID bağı: 0.05

Otomatik eşleşme eşiği: `>= 0.92`
Manuel inceleme: `0.75–0.919`
Reddetme: `< 0.75`

## Normalizasyon
- tarih: ISO-8601
- sezon: `YYYY-YY`
- para: integer minor-free amount + ISO currency
- boy: santimetre
- dakika: integer
- oran: 0–100 yüzde puanı
- per90: decimal
- pozisyon: canonical position registry
- kulüp ve lig: canonical entity ID + display name

## Null politikası
- `null`: veri bilinmiyor
- `0`: gerçekten sıfır
- `not_applicable`: uygulanamaz
- boş string yasaktır
