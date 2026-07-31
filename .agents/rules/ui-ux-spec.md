# 🎨 UI/UX Specifications: EcoWarn Mobile App

Berkas ini memandu pembuatan komponen layar di `apps/mobile/src/screens`. Gunakan antarmuka yang bersih (*clean design*), pastikan tombol mudah dijangkau jari (*thumb-friendly*), dan gunakan palet warna indikator bencana yang standar (Hijau = Aman, Kuning = Waspada, Merah = Kritis).

## 1. AuthStack (Layar Akses Publik)
Tumpukan navigasi untuk pengguna yang belum masuk (*login*).

*   **`LoginScreen`**
    *   **Visual:** Logo EcoWarn di tengah atas.
    *   **Form Input:** Kolom `Nomor HP` (atau Email) dan kolom `Password` (dengan *toggle* mata untuk menyembunyikan/menampilkan teks).
    *   **Aksi:** Tombol utama "Masuk", teks *link* "Lupa Kata Sandi?", dan ajakan "Belum punya akun? Daftar di sini".
*   **`RegisterScreen`**
    *   **Form Input:** Kolom `Nama Lengkap`, `Nomor HP` (wajib angka), dan `Password`.
    *   **Pemilihan Peran:** Komponen *Radio Button* atau *Segmented Control* yang mencolok: **[ Warga ]** vs **[ Relawan ]**.
    *   **Aksi:** Tombol utama "Daftar Sekarang". *(Catatan untuk AI: Siapkan struktur agar mudah ditambahkan alur OTP di masa depan).*

---

## 2. RelawanNavigator (Dasbor Lapangan)
Tumpukan navigasi eksklusif dengan akses perangkat keras untuk agen lapangan (misalnya untuk inisiatif pemantauan sungai atau Jaga Kali).

*   **`ScannerScreen` (Layar Utama - Tab 1)**
    *   **Visual:** Modul *Vision Camera* berjalan secara layar penuh (*full-screen*).
    *   **Overlay AI:** Kotak deteksi (*bounding box*) transparan yang mengelilingi objek sampah secara *real-time*.
    *   **Indikator Header:** Teks dinamis di atas layar yang menunjukkan persentase volume dan status (contoh: "🔴 KRITIS: > 60% Area Tertutup Sampah").
    *   **Aksi (Bottom Sheet):** Panel bawah transparan berisi *Dropdown* untuk memilih jenis saluran (Selokan / Irigasi / Sungai Utama) dan tombol bulat raksasa "Kirim Peringatan" (hanya bisa ditekan jika lokasi GPS berhasil didapatkan).
*   **`HistoryScreen` (Tab 2)**
    *   **Visual:** Daftar gulir (*FlatList*) bergaya *Card UI*.
    *   **Konten Kartu:** Menampilkan riwayat laporan dari relawan tersebut. Mencakup tanggal/waktu, ikon status (Ringan/Sedang/Kritis), dan titik koordinat.
*   **`ProfileScreen` (Tab 3)**
    *   **Konten:** Nama dan Nomor HP relawan.
    *   **Gamifikasi Dasar:** Menampilkan angka "Total Laporan Tervalidasi" untuk memicu semangat operasional.
    *   **Aksi:** Tombol "Keluar" (*Logout*).

---

## 3. WargaNavigator (Dasbor Pemantauan Publik)
Tumpukan navigasi yang ringan, berfokus pada visualisasi spasial pasif dan notifikasi kedaruratan wilayah.

*   **`MapScreen` (Layar Utama - Tab 1)**
    *   **Visual:** Tampilan *React Native Maps* yang memenuhi layar (contoh: memusatkan koordinat awal di area pesisir atau muara Pekalongan).
    *   **Elemen Spasial:** Menampilkan *Marker* pada titik-titik tumpukan sampah. Jika statusnya 'Kritis', *marker* dikelilingi oleh radius lingkaran merah transparan (menggambarkan zona potensi luapan air/rob).
    *   **Pembaruan Real-Time:** Peta harus langsung memunculkan *marker* baru atau mengubah warna zona jika menerima sinyal dari Socket.io tanpa perlu dimuat ulang (*refresh*).
*   **`AlertsScreen` (Tab 2)**
    *   **Visual:** Daftar *feed* bergaya kotak masuk (*inbox*).
    *   **Konten:** Menyimpan riwayat *Push Notification* (FCM) yang masuk ke perangkat warga. Menginformasikan jam kejadian dan jarak titik kritis dari lokasi warga.
*   **`ProfileScreen` (Tab 3)**
    *   **Konten:** Nama dan Nomor HP warga.
    *   **Pengaturan:** *Toggle Switch* untuk "Izinkan Notifikasi Darurat" (Getar/Suara).
    *   **Aksi:** Tombol "Keluar" (*Logout*).