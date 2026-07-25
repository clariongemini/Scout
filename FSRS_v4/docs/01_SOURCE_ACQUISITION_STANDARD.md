# 01 — Source Acquisition Standard

## Amaç
Her veri kaynağından veri çekme işlemini tekrarlanabilir, gözlemlenebilir ve kaynağın yapısına özel adaptörlerle yönetmek.

## Zorunlu adaptör çıktısı
Her adaptör:
- ortak `SourceAdapter` sözleşmesini uygular;
- tek oyuncu ve toplu oyuncu modlarını ayırır;
- retry, timeout, backoff ve crawl budget kurallarını uygular;
- ham snapshot ile evidence artefaktlarını kaydeder;
- veri bulunamadığında `null` üretir, sıfır üretmez;
- parser sürümünü kaydeder;
- kritik selector/network alanı kaybolduğunda başarı döndürmez.

## Kaynak güvenlik durumu
Her kaynak `source_policy_registry.json` içinde:
- kullanım amacı,
- izin durumu,
- robots durumu,
- erişim yöntemi,
- ticari kullanım riski,
- cache süresi,
- maksimum concurrency,
- maksimum günlük istek,
- upstream provider
ile tanımlanır.

## Extraction sonucu
Başarı yalnızca HTTP 200 değildir. Şunlar ayrıca doğrulanmalıdır:
- doğru oyuncu sayfası,
- beklenen kimlik alanları,
- minimum zorunlu metrikler,
- sayfa/snapshot hash'i,
- parser drift kontrolü.

## Değişiklik yönetimi
DOM veya network şeması değişirse:
1. adaptör `degraded` durumuna geçer;
2. ilgili veriler verified store'a ilerlemez;
3. drift raporu oluşturulur;
4. golden fixture güncellenmeden production açılmaz.
