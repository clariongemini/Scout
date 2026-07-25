# Alan Bazlı Kaynak Seçim Matrisi

| Veri alanı | Birincil kaynak sınıfı | İkincil doğrulama | Not |
|---|---|---|---|
| Kimlik | federasyon/lig/kulüp | structured provider | external ID tercih edilir |
| Kadro/mevki | resmi lineup | event provider | gerçek aksiyon bölgesiyle doğrulanır |
| Dakika/maç | competition feed | event provider | stoppage-time tanımı registry'de |
| Event metric | licensed/structured event | ikinci bağımsız provider | definition eşleşmesi zorunlu |
| Tracking | licensed tracking | yoksa unavailable | tahminle doldurulmaz |
| Sözleşme | kulüp açıklaması | güvenilir transfer DB | belirsizlik açık |
| Ücret | resmi mali rapor | güvenilir medya | çoğu durumda estimated |
| Injury | kulüp/lig | güvenilir medya | diagnosis ve availability ayrılır |
| Piyasa değeri | market estimator | alternatif estimator | transfer fee değildir |
