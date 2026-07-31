---
description: Full Workflows
---

# 🔄 EcoWarn Workflows

## 🎯 Panduan Eksekusi AI
Setiap kali menerima instruksi pengembangan fitur, periksa fase pengerjaan berikut dan kerjakan secara berurutan sesuai konteks tugas yang diminta pengguna.

### Fase 1: Setup Fondasi Backend (`apps/api`)
1. **Inisialisasi Database:** Siapkan koneksi Node.js ke kluster MongoDB.
2. **Skema Geospasial:** Buat `ReportSchema` (Mongoose) yang wajib memuat:
   - Format GeoJSON (tipe *Point*, array koordinat `[longitude, latitude]`).
   - *Index* `2dsphere` pada field lokasi.
   - Field status keparahan (Ringan / Sedang / Kritis).
3. **Pembuatan REST API:** Rancang *endpoint* utama (misal: `POST /api/reports`) untuk menerima data dari klien genggam (*mobile*).

### Fase 2: Eksekusi Real-Time Engine (`apps/api`)
1. **Integrasi WebSockets:** Pasang dan konfigurasikan peladen Socket.io.
2. **Logika Broadcast:** Saat *endpoint* pelaporan menerima data dengan status "Kritis", eksekusi kueri spasial MongoDB untuk mencari zona terdampak, lalu pancarkan (*emit*) notifikasi bahaya secara seketika melalui Socket.io.

### Fase 3: Integrasi Klien Mobile & Kecerdasan Buatan (`apps/mobile`)
1. **Desain Antarmuka:** Susun kerangka UI untuk Peta Interaktif dan Panel Kamera Pemindai.
2. **Pemasangan TFLite:** Konfigurasikan `react-native-vision-camera` bersama `react-native-fast-tflite` untuk memuat model pendeteksi objek.
3. **Kalkulasi Volume:** Buat algoritma perbandingan luas (*Bounding Box Ratio*) terhadap luas layar (kamera) untuk menentukan apakah sampah berskala Ringan, Sedang, atau Kritis secara *real-time*.

### Fase 4: Pengikatan Komponen (End-to-End Integration)
1. **Koneksi Klien-Peladen:** Hubungkan aplikasi React Native ke REST API dan peladen Socket.io.
2. **Pengujian Siklus Penuh:** Eksekusi aliran data dari awal hingga akhir:
   - Kamera mendeteksi sampah -> Hitung persentase di gawai -> Kirim koordinat ke API -> API query database spasial -> Socket.io memancarkan *broadcast* -> UI Peta warga memunculkan notifikasi "Zona Merah".
3. **Pembersihan (Cleanup):** Hapus semua *log* konsol yang tidak diperlukan dan pastikan *framerate* (FPS) pada kamera berjalan di atas 30 FPS.