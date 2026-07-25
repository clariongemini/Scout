# Source Adapter Contract

Her adapter:
- source-specific raw record üretir;
- retrieval timestamp ve request metadata saklar;
- raw response hash üretir;
- parser version taşır;
- canonical merge yapmaz;
- rate limit ve retry politikasına uyar;
- başarısız alanı null bırakır, tahmin etmez.
