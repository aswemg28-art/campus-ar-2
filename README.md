# AR Filter Wajah – Wisuda dan Kampus

Aplikasi filter wajah berbasis web bertema wisuda dan kampus. Aksesori 3D tempel pada wajah secara real-time menggunakan **MindAR.js 1.2.5** dan **Three.js 0.175.0**, tanpa framework, bundler, atau backend.

## Fitur

- Face tracking `faceMesh` dengan kamera depan.
- Topi toga dan kacamata sebagai model GLB 3D.
- Landmark `10` untuk area dahi/atas kepala dan `168` untuk pangkal hidung.
- Animasi goyang loop dengan `THREE.AnimationMixer` dan `AnimationClip`.
- Dua filter yang dapat diganti tanpa memuat ulang halaman.
- Overlay HTML “UMSU” di bagian atas layar.
- Foto PNG hasil gabungan video dan canvas AR.
- Filter terakhir disimpan di `localStorage`.
- Pesan kesalahan yang jelas jika kamera atau resource tidak dapat diakses.
- Placeholder `BoxGeometry` berwarna emas jika model GLB gagal dimuat.

## Struktur proyek

```text
.
├── index.html
├── js/
│   ├── app.js
│   └── three-mindar-compat.js
├── data/
│   └── filters.json
├── assets/
│   └── models/
│       ├── toga_hat.glb
│       └── glasses.glb
├── docs/
│   └── device-matrix.md
└── README.md
```

Mode `faceMesh` MindAR menggunakan model wajah kanonis dan data landmark yang sudah dibundel bersama pustaka. Mode ini **tidak memerlukan file target `.mind`** seperti image tracking, sehingga proyek sengaja tidak menyertakan file target palsu.

## Cara menjalankan

### GitHub Pages

1. Buat repository GitHub, lalu unggah seluruh isi proyek ke root repository atau folder yang dipublikasikan.
2. Buka **Settings → Pages**, pilih branch dan folder `/ (root)`, lalu simpan.
3. Buka URL HTTPS yang diberikan GitHub Pages menggunakan smartphone.
4. Izinkan kamera depan ketika browser meminta izin.
5. Posisikan wajah di dalam kamera, lalu gunakan **Ganti Filter** dan **Ambil Foto**.

Seluruh path aplikasi bersifat relatif sehingga dapat digunakan pada subfolder GitHub Pages.

### Pengujian lokal

Kamera hanya tersedia pada secure context. Jalankan server statis dari root proyek, bukan membuka `index.html` melalui `file://`:

```bash
python -m http.server 8080
```

Buka `http://localhost:8080` di browser desktop. Untuk pengujian smartphone dalam jaringan lokal, gunakan HTTPS karena `http://<IP-lokal>` bukan secure context.

### Kamera tidak muncul

1. Pastikan URL diawali `https://` untuk GitHub Pages. `http://localhost` dan `http://127.0.0.1` hanya boleh digunakan di komputer yang sama.
2. Jangan membuka `index.html` melalui `file://`; gunakan server statis atau GitHub Pages.
3. Klik ikon kamera/gembok di sebelah address bar, lalu izinkan kamera. Di Chrome Android: **Setelan situs → Kamera → Izinkan**.
4. Tutup aplikasi kamera lain dan muat ulang halaman.
5. Gunakan Chrome terbaru pada Android. Jika pesan “Kamera tidak ditemukan” muncul, periksa apakah perangkat memiliki kamera yang aktif.

## Konfigurasi filter

Edit [data/filters.json](data/filters.json). Setiap aksesori membaca `model`, `landmark`, `position`, `rotation`, `scale`, dan animasi opsional dari JSON. Path model relatif terhadap `index.html`.

Model GLB yang disertakan adalah placeholder geometris sederhana buatan proyek ini. Model pengganti dapat menggunakan nama file yang sama atau path lain di JSON. Jika GLB memiliki clip animasi sendiri, clip pertama akan diputar; animasi goyang tambahan tetap dibuat saat runtime.

## Kompatibilitas Three.js r175

MindAR 1.2.5 masih mengimpor konstanta lama `sRGBEncoding`, yang telah dihapus dari Three.js r175. Import map memberi scope khusus untuk modul CDN MindAR ke [js/three-mindar-compat.js](js/three-mindar-compat.js). Modul kecil tersebut mengekspor ulang Three.js **0.175.0** yang sama dan hanya menyediakan konstanta legacy yang dibutuhkan MindAR. Output warna aplikasi tetap menggunakan `SRGBColorSpace` bawaan r175.

CDN MindAR dimuat sebagai ES module. Menggunakan tag script klasik untuk bundle ini akan gagal karena bundle memakai sintaks `import`/`export`.

## Privasi

Tidak ada data wajah atau foto yang dikirim ke server aplikasi. Pemrosesan tracking, perakitan foto, dan unduhan dilakukan di perangkat. Koneksi ke CDN dan Google Fonts tetap diperlukan untuk memuat pustaka, model tracking, dan font.

## Batasan yang diketahui

- Memerlukan HTTPS atau localhost, kamera, WebGL, dan akses internet ke CDN.
- Kualitas tracking dipengaruhi pencahayaan, jarak wajah, performa GPU, dan resolusi kamera.
- Kompatibilitas Safari/iOS dan penyimpanan unduhan perlu diuji pada perangkat fisik.
- Beberapa browser mobile membuka foto alih-alih langsung mengunduhnya ketika atribut `download` tidak didukung.
- Animasi placeholder ditujukan untuk prototipe, bukan model karakter final.

## Lisensi dan atribusi

| Komponen | Sumber | Lisensi | Catatan |
|---|---|---|---|
| Three.js 0.175.0 | threejs.org | MIT | Dimuat melalui jsDelivr |
| MindAR.js 1.2.5 | hiukim/mind-ar-js | MIT | Dimuat melalui jsDelivr |
| `toga_hat.glb` | Placeholder asli proyek ini | CC0 | Geometri kotak sederhana |
| `glasses.glb` | Placeholder asli proyek ini | CC0 | Geometri kotak sederhana |
| Cinzel | Google Fonts | SIL Open Font License | Font dekoratif overlay UMSU |
| Plus Jakarta Sans | Google Fonts | SIL Open Font License | Font antarmuka |

## Pengujian

Validasi pada 25 November 2026:

- Sintaks JavaScript, JSON filter, path model, dan struktur GLB lolos pemeriksaan.
- Chromium berhasil memuat MindAR, OpenCV, MediaPipe, Three.js, dan kedua model.
- Dengan kamera canvas simulasi, FaceMesh mendeteksi wajah sintetis, tombol ganti filter bekerja, PNG berhasil dibuat, dan pilihan filter tetap ada setelah reload.
- Tanpa kamera fisik, pesan “Kamera tidak ditemukan” muncul; simulasi izin ditolak menampilkan panduan pengaturan kamera.
- Screenshot visual tidak tersedia karena viewport browser internal tidak memiliki surface terlihat. Uji kamera, tracking, dan unduhan pada perangkat fisik belum dilakukan.

Isi [docs/device-matrix.md](docs/device-matrix.md) setelah menguji perangkat fisik. Pengujian browser otomatis tidak menggantikan uji kamera, tracking, dan unduhan pada smartphone.
