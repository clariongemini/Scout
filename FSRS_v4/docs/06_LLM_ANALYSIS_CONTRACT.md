# 06 — LLM Analysis Contract

## Girdi
LLM yalnızca schema-valid `llm_analysis_input.json` alır.

## Çıktı kuralları
- JSON dışında çıktı yasaktır.
- Her güçlü/zayıf yön `evidenceMetricIds` içerir.
- Current ability ve potential ayrıdır.
- Taktik uyum, hedef rol gereksinimlerine bağlanır.
- Veri eksikliği açıkça belirtilir.
- Mental profil yalnızca belgeli kanıt varsa yorumlanır.
- Maaş, kontrat, piyasa değeri gibi alanlar doğrulanmamışsa kesin yazılamaz.
- Potansiyel aralığı ve güven zorunludur.
- Model, deterministik skorları keyfi biçimde değiştiremez.

## Yeniden üretilebilirlik
Her analiz:
- provider
- modelId
- promptVersion
- temperature
- schemaVersion
- generatedAt
- inputHash
ile kaydedilir.
