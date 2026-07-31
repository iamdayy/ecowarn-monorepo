---
description: RBAC Workflow
---

## Fase 5: Role-Based Access Control (RBAC), Relasi & Keamanan API (`apps/api` & `apps/mobile`)
**Fokus Tugas:** Membangun keamanan tipe data (*type safety*), mencatat identitas pelapor, dan mengatur perutean antarmuka (UI) secara ketat berdasarkan peran pengguna.

1. **Definisi Interface & Skema Pengguna (`UserSchema`):**
   - Buat interface TypeScript `IUser`.
   - Buat `UserSchema` di MongoDB dengan field: `name`, `email`, `phoneNumber` (String, unik, wajib), `password`, `role` (Enum: `['Relawan', 'Warga']`), dan `fcmToken` (String, opsional).
   - Gunakan `bcryptjs` untuk *hashing* `password` sebelum disimpan.

2. **Revisi Skema Laporan (`ReportSchema`):**
   - Buat interface TypeScript `IReport`.
   - Tambahkan field `reporterId` dengan tipe `Schema.Types.ObjectId` (ref: `'User'`). Ini memastikan setiap laporan memiliki rekam jejak (*traceability*) ke akun relawan pengirimnya.

3. **Layanan Autentikasi Backend (JWT):**
   - Buat *controller* `register` dan `login`.
   - Saat `login` berhasil, *generate* token JWT yang berisi *payload* `userId` dan `role`.

4. **Middleware Proteksi Rute (TypeScript):**
   - Buat `authMiddleware` untuk memverifikasi JWT dan menyematkan data pengguna ke objek request (`req.user`).
   - Buat `roleMiddleware` khusus untuk rute `POST /api/reports`. Tolak akses (403) jika `req.user.role` bukan `'Relawan'`.
   - Di *controller* pembuatan laporan, pastikan `reporterId` diisi secara otomatis dari `req.user.id`.

5. **Manajemen State Klien & Navigasi Dinamis (Mobile UI):**
   - **Penyimpanan Lokal:** Gunakan `AsyncStorage` (atau `react-native-mmkv`) untuk menyimpan token JWT dan objek pengguna (termasuk `role`).
   - **AuthStack (Layar Publik):** Buat antarmuka `LoginScreen` dan `RegisterScreen`. Pada `RegisterScreen`, tambahkan *input* untuk Nomor HP dan *Dropdown/Radio Button* untuk memilih mendaftar sebagai "Warga" atau "Relawan".
   - **MainStack (Navigasi Berbasis Peran):** Buat logika percabangan di konfigurasi React Navigation:
     - **Jika Role === 'Relawan':** Arahkan ke *RelawanNavigator*. Layar utamanya adalah `ScannerScreen` (Berisi modul Vision Camera & TFLite untuk deteksi), `HistoryScreen` (Riwayat laporan), dan `ProfileScreen`.
     - **Jika Role === 'Warga':** Arahkan ke *WargaNavigator*. Layar utamanya adalah `MapScreen` (Peta interaktif *read-only* dengan pembaruan Socket.io), `AlertsScreen` (Daftar notifikasi bahaya), dan `ProfileScreen`.
     - **Pencegahan Akses:** Dengan pemisahan *Navigator* ini, Warga secara struktural tidak akan memiliki akses ke rute komponen Kamera.