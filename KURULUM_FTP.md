# 🚀 ScoutCard Generator - `https://salih.1i.net.tr/` FTP Yükleme & Canlıya Alma Rehberi

Bu proje **React (Frontend)** ve **Express Node.js (Scraping/API Backend)** mimarisine sahiptir. `https://salih.1i.net.tr/` adresinde canlıya almak için aşağıdaki adımları uygulayabilirsiniz.

---

## 📁 1. FTP ile Sunucuya Yüklenecek Dosyalar

Projeniz için üretim derlemesi (`npm run build`) yapılmıştır. FTP programınız (FileZilla, WinSCP vb.) ile `salih.1i.net.tr` ana dizinine (`public_html/salih` veya subdomain klasörünüze) aşağıdaki klasör ve dosyaları yükleyiniz:

- 📂 `dist/` *(Vite frontend + esbuild server paket çıktısı)*
- 📄 `server.js` *(cPanel Node.js başlangıç dosyası)*
- 📄 `package.json`
- 📄 `.htaccess`
- 📄 `.env` *(gerekli ise)*

> 💡 **Not:** `node_modules` klasörünü FTP ile yüklemek yerine sunucuda cPanel/Plesk üzerinden `NPM Install` butonuna basmak çok daha hızlıdır.

---

## ⚙️ 2. cPanel / Plesk Node.js Ayarları (Önerilen)

cPanel kullanıyorsanız:
1. cPanel paneline girin ve **"Setup Node.js App"** (Node.js Uygulaması Oluştur) seçeneğine tıklayın.
2. **Create Application** butonuna basın:
   - **Node.js Version:** `18.x`, `20.x` veya `22.x` seçin.
   - **Application Mode:** `Production`
   - **Application Root:** `salih.1i.net.tr` (FTP ile dosyaları yüklediğiniz dizin)
   - **Application URL:** `salih.1i.net.tr`
   - **Application Startup File:** `server.js`
3. **Save** (Kaydet) butonuna tıklayın.
4. **"Run NPM Install"** butonuna tıklayarak bağımlılıkları yükleyin.
5. **"Restart Application"** butonuna basarak projenizi canlıya alın!

---

## 🔄 3. VPS / SSH (PM2 ile Başlatma) Alternatifi

Eğer sunucunuzda SSH/PM2 erişiminiz varsa:
```bash
# Bağımlılıkları yükleyin
npm install --production

# Derlemeyi çalıştırın (gerekirse)
npm run build

# PM2 ile canlıda başlatın
pm2 start server.js --name "scoutcard-salih"
pm2 save
```

---

🎉 Projeniz **https://salih.1i.net.tr/** adresinde sorunsuz çalışmaya hazırdır!
