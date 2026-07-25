# Schema ve Registry Versioning

- MAJOR: semantik kırılma veya alan anlamı değişikliği
- MINOR: geriye uyumlu alan/rol/metrik ekleme
- PATCH: dokümantasyon veya doğrulama düzeltmesi

Bir metric definition değiştiğinde eski veriler sessizce yeniden yorumlanmaz. Yeni metricDefinitionVersion üretilir.
