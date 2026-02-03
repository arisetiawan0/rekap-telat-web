# Cara Install Aplikasi Rekap Telat di CasaOS

Panduan ini akan membantu Anda menjalankan aplikasi **Rekap Telat Web** di dalam **CasaOS** menggunakan Docker.

## Prasyarat
- Perangkat yang sudah terinstall CasaOS (misal: Zimaboard, Raspberry Pi, atau PC Bekas).
- File project ini sudah ada di komputer Anda.

## Metode 1: Fitur "Custom Install" (Paling Mudah)

Metode ini menggunakan fitur bawaan CasaOS untuk mengimpor file `docker-compose.yml`.

1.  **Siapkan File:**
    - Pastikan Anda memiliki folder project yang berisi:
        - `Dockerfile`
        - `docker-compose.yml`
        - `requirements.txt`
        - `app.py`
        - `templates/` (folder)

2.  **Upload ke CasaOS:**
    - Buka aplikasi **Files** di dashboard CasaOS.
    - Lokasi default biasanya di `/DATA`.
    - Disarankan buat folder di dalam `AppData` agar rapi (Contoh: `/DATA/AppData/rekap-telat`) atau langsung di `/DATA/rekap-telat`.
    - Buat folder baru, misalnya bernama `rekap-telat`.
    - Upload semua file project ke dalam folder tersebut.

3.  **Install via Terminal / Docker Compose (Recommended):**
    - Karena ini adalah aplikasi custom yang butuh build image, cara paling stabil adalah via Terminal (SSH) mengakses mesin CasaOS Anda.
    - Login ke terminal server Anda (bisa via SSH atau fitur Terminal di CasaOS).
    - Masuk ke direktori tempat Anda upload file, misal:
      ```bash
      cd /DATA/rekap-telat
      ```
    - Jalankan perintah:
      ```bash
      docker compose up -d --build
      ```
    - Tunggu proses build selesai.

4.  **Akses Aplikasi:**
    - Setelah selesai, buka browser dan akses `http://IP-CASAOS-ANDA:5000`.

---
## Metode 2: Import Docker Compose di UI (Jika Image Sudah Ada)

Jika Anda tidak ingin build manual via terminal, Anda bisa mengandalkan fitur Import, **TAPI** CasaOS UI biasanya lebih suka image yang sudah jadi (ada di Docker Hub). Karena ini aplikasi custom lokal, **Metode 1 (Terminal)** adalah yang paling direkomendasikan agar proses `build` berjalan lancar.

Namun, jika Anda ingin mencoba via UI:
1. Klik tombol **+** di dashboard CasaOS.
2. Pilih **Install a Customized App**.
3. Di pojok kanan atas, klik icon **Import** (biasanya gambar panah/dokumen).
4. Pilih file `docker-compose.yml` dari project ini.
5. CasaOS akan memuat konfigurasi.
6. Klik **Install**.
   *(Catatan: Terkadang CasaOS UI gagal melakukan build image lokal. Jika gagal, gunakan Metode 1).*

## Troubleshooting

- **Port Bentrok:** Jika port `5000` sudah dipakai aplikasi lain, edit `docker-compose.yml` bagian `ports` menjadi `"8080:5000"` (contoh) untuk mengakses nnya di port 8080.
- **File Excel Gagal Upload:** Pastikan folder aplikasi memiliki izin tulis (writable). Jika menggunakan Docker volume, biasanya sudah aman.

## Tips
- Untuk update aplikasi (misal ada perubahan code), cukup jalankan ulang `docker compose up -d --build` di terminal folder tersebut.
