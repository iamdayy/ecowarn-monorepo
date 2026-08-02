<div align="center">
  
# 🌍 EcoWarn (Smart Ecology Hub)
### Sistem Peringatan Dini (Early Warning System) Mitigasi Banjir Rob & Krisis Sanitasi Lingkungan

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Node.js & Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh/)
[![MongoDB 2dsphere](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?&style=for-the-badge&logo=Socket.io&logoColor=white)](https://socket.io/)
[![Firebase Cloud Messaging](https://img.shields.io/badge/Firebase-FFA611?style=for-the-badge&logo=firebase&logoColor=white)](https://firebase.google.com/)
[![TensorFlow Lite](https://img.shields.io/badge/TensorFlow%20Lite-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white)](https://www.tensorflow.org/lite)

</div>

---

## 📌 1. Visi & Ikhtisar Sistem
**EcoWarn** adalah platform ekosistem cerdas berskala enterprise yang dirancang khusus untuk memitigasi risiko **banjir rob pesisir** dan **krisis sanitasi perkotaan** yang disebabkan oleh akumulasi serta sumbatan sampah pada aliran drainase atau sungai.

Sistem ini memadukan kekuatan pemrosesan **Kecerdasan Buatan di Perangkat Klien (*Offline-First AI Edge Inference*)**, pemetaan geospasial presisi bermesin **MongoDB 2dsphere**, serta infrastruktur penyampaian peringatan dini seketika menggunakan protokol heterogen **Socket.io (WebSockets)** dan **Firebase Cloud Messaging (FCM)**.

---

## 🏛️ 2. Arsitektur Monorepo
Proyek ini dibangun di atas arsitektur *Monorepo* modern berkecepatan tinggi bertenaga **Bun & NPM Workspaces**:

```
ecowarn-monorepo/
 ├── apps/
 │    ├── mobile/        # Klien Android & iOS (React Native / Expo / VisionCamera / TFLite)
 │    └── api/           # Peladen Backend (Node.js / Express / MongoDB / Socket.io / FCM Admin)
 ├── packages/           # Pustaka berbagi (Shared TypeScript models & utilities)
 ├── package.json        # Pengatur workspace utama
 └── bun.lock            # Pengunci dependensi deterministik
```

---

## 🔄 3. Alur Kerja & Diagram Sistem (Flowcharts)

### A. Arsitektur Total & Ekosistem Komunikasi
 Diagram berikut memetakan koneksi dari kamera sensor keliling (*Relawan*) hingga ke penerimaan peringatan darurat oleh masyarakat (*Warga*):

```mermaid
graph TD
    subgraph Klien["Klien Mobile (Apps / Mobile - React Native)"]
        UI["Antarmuka Warga & Relawan (Expo Router)"]
        Cam["React Native VisionCamera (Live Stream)"]
        TFL["Fast TFLite Edge Inference (XNNPACK SIMD)"]
        Map["React Native Maps (Google Maps Provider)"]
    end

    subgraph Server["Peladen Backend (Apps / API - Express & Bun)"]
        RBAC["Auth & RBAC Middleware (JWT Verification)"]
        API["RESTful API Endpoints (/api/reports)"]
        Spatial["Geospatial Engine ($nearSphere 2dsphere)"]
        AlertEngine["Alert Evaluator (500m Density Rule Engine)"]
    end

    subgraph Data["Lapisan Penyimpanan & Cloud"]
        DB[(MongoDB Cluster / 2dsphere Index)]
        FCM["Firebase Cloud Messaging (Google Push Gateway)"]
        SocketServer["Socket.io Real-Time Hub (WebSockets)"]
    end

    Cam -->|"Frames (NMS/ONNX)"| TFL
    TFL -->|"Klasifikasi: Ringan/Sedang/Kritis"| UI
    UI -->|"POST /api/reports (Base64 + GPS + JWT)"| RBAC
    RBAC -->|"Terverifikasi (Relawan/Admin)"| API
    API -->|"Simpan Data & Koordinat"| DB
    API -->|"Evaluasi Bahaya"| AlertEngine
    AlertEngine -->|"Kueri Kepadatan 500m"| Spatial
    Spatial -->|"Mengambil Total Sumbatan"| DB
    
    AlertEngine -->|"Siarkan Marker Baru / Alert"| SocketServer
    AlertEngine -->|"Kirim Notifikasi Latar (Killed App)"| FCM
    
    SocketServer -->|"Event: NEW_REPORT / CRITICAL_ALERT"| Map
    FCM -->|"Push Notification Android/iOS"| UI
```

---

### B. Logika Evaluasi Peringatan Bencana (Aturan Lingkup 500 Meter)
Untuk menghindari peringatan palsu (*alarm fatigue*), EcoWarn menerapkan algoritma kepadatan spasial akurat: **Potensi Bencana Kritis** hanya diluncurkan jika akumulasi laporan sumbatan (status *Sedang* atau *Kritis*) mencapai **5 hingga 10+ titik** di bawah radius **500 meter**.

```mermaid
flowchart TD
    Start(["Laporan Sumbatan Baru Masuk (Kritis / Sedang)"]) --> Extract["Ekstraksi Koordinat [Longitude, Latitude]"]
    Extract --> Query["Kueri MongoDB $nearSphere ($maxDistance: 500m)"]
    Query --> Count["Hitung Jumlah Laporan Sumbatan Aktif (N)"]
    
    Count --> Check{"Apakah N >= 5 Laporan?"}
    
    Check -->|"Ya (N >= 5)"| HighRisk["🚨 STATUS: POTENSI BENCANA BANJIR ROB TINGGI"]
    Check -->|"Tidak (N < 5)"| SafeRisk["🟢 STATUS: POTENSI RINGAN HINGGA SEDANG"]
    
    HighRisk --> Broadcast["Emit Socket.io (CRITICAL_ZONE_ALERT)"]
    Broadcast --> PushFCM["Kirim Push Notification FCM ke Radius Terdampak"]
    PushFCM --> EndHigh(["Sistem Siagakan Masyarakat"])
    
    SafeRisk --> Log["Catat Log Kawasan (Belum Memenuhi Syarat Bencana)"]
    Log --> EmitNormal["Emit Socket.io (NEW_REPORT - Pemantauan Peta)"]
    EmitNormal --> EndSafe(["Sistem Kondusif / Terkendali"])
```

---

### C. Alur Distribusi Notifikasi Real-Time (Hybrid WebSockets + FCM)

```mermaid
sequenceDiagram
    autonumber
    actor R as Relawan / Surveyor
    participant API as Peladen API
    participant DB as MongoDB (2dsphere)
    participant SK as Socket.io Engine
    participant FC as Firebase Cloud Messaging
    actor W as Warga / Masyarakat

    R->>API: Unggah Laporan (GPS + Foto Base64 + Severity)
    API->>DB: Simpan Dokumen & Jalankan Kueri $nearSphere (500m)
    DB-->>API: Mengembalikan Akumulasi Sumbatan (N >= 5)
    
    par Komunikasi Layar Aktif (Foreground)
        API->>SK: Emit Event (CRITICAL_ZONE_ALERT)
        SK->>W: Pemutakhiran Marker & Modal Peringatan Darurat
    and Komunikasi Latar Belakang (Background / Killed)
        API->>FC: Kirim Payload Notification via Admin SDK
        FC->>W: Push Notification Ponsel Bergetar / Suara Darurat
    end
```

---

## 🛠️ 4. Fitur & Kapabilitas Unggulan

### 1. AI Edge Object Detection (*Offline-First*)
- Model deep learning khusus (`ecowarn_trash_detector.tflite`) beroperasi langsung di dalam ponsel keliling menggunakan **CPU XNNPACK ARM SIMD Delegation** dan integrasi **React Native VisionCamera**.
- Menganalisis tingkat keparahan sumbatan secara seketika (*Ringan*, *Sedang*, *Kritis*) dan mendukung fitur **🔒 Kunci Deteksi (Lock Detection)** sebelum bukti foto diunggah ke peladen.

### 2. Pemetaan Geospasial Interaktif
- Terintegrasi dengan **Google Maps Provider** via `react-native-maps`.
- Menayangkan visualisasi peta dalam format **Satelit/Hybrid** dan **3D Bangunan**, dilengkapi kontrol **FAB (Floating Action Button)** ergonomis, lingkaran radius bahaya aktual, serta fitur **🎯 Fit Semua Titik** untuk pemfokusan kamera otomatis.

### 3. Kendali Akses Bertingkat (RBAC - Role-Based Access Control)
- **👥 Warga:** Memiliki otoritas pemantauan peta waktu nyata, pembacaan analisis ancaman wilayah, dan penerimaan notifikasi bencana.
- **🛡️ Relawan:** Dilengkapi kredensial khusus untuk memindai sumbatan dengan kamera AI, menyertakan bukti foto resolusi tinggi, dan menyemai data verifikasi lapangan.
- **🏛️ Aparatur / Admin:** Mengelola parameter ambang batas eksternal dan validasi penanganan krisis sanitasi di instansi pemerintah.

---

## 🚀 5. Panduan Instalasi & Pengoperasian Lokalisasi

### A. Persiapan Sistem & Dependensi
Pastikan sistem operasi Anda (Linux / Android SDK) telah dilengkapi dengan:
- [Bun](https://bun.sh/) (v1.3+ disarankan untuk performa instalasi optimal) atau Node.js v20+
- Android Studio / JDK 17+ (Untuk kompilasi native VisionCamera & TFLite)
- MongoDB Database Instance yang sedang beroperasi

### B. Instalasi Dependensi Monorepo
Jalalankan dari direktori utama (*root directory*):
```bash
bun install
```

### C. Menjalankan Peladen (Backend API)
```bash
cd apps/api
# Salin konfigurasi lingkungan jika belum ada
cp .env.example .env 
# Jalankan peladen mode pengembangan
bun run dev
```
> *Peladen akan aktif pada port **5000** dengan layanan HTTP REST API dan WebSockets berpotensi menyokong payload foto besar (batas 15MB).*

### D. Menjalankan Aplikasi Klien (React Native / Expo)
```bash
cd apps/mobile
# Mulai peladen dev metro dengan aktivasi kompilasi native tflite
npx expo start --android
```
> **Catatan Pemindai AI Android:** Agar modul TFLite berjalan native secara nyata pada perangkat fisik atau Android Emulator, jalankan pemuatan bundle native menggunakan perintah `npx expo run:android` (Membutuhkan Android NDK/SDK).

---

## 🧪 6. Standar Kualitas & Penanganan Galat
Sesuai dengan protokol penulisan kode berstandar tinggi:
- **Zero Compilation Error:** Kode bersyarat mutlak tertulis dalam **TypeScript** pekat. Verifikasi keutuhan tipe dapat dijalankan di kedua ruang lingkup melalui perintah:
  ```bash
  cd apps/api && bunx tsc --noEmit
  cd ../mobile && bunx tsc --noEmit
  ```
- **Ketahanan Aset TFLite:** Aset AI dikelola via **`expo-asset`** untuk mengekstrak model lokal berprotokol pasti (`file://`) ke sistem berkas HP, menghilangkan potensi *runtime error Java MalformedURLException* di mesin virtual Android.

---
<div align="center">
  <sub>Dibangkitkan & Dipelihara dengan ❤️ oleh Tim Pengembang EcoWarn & Deepmind Advanced Agentic Coding</sub>
</div>
