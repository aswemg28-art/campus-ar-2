# AR Filter Wajah – Wisuda dan Kampus

Aplikasi filter wajah berbasis web bertema wisuda dan kampus. Aksesori 3D tempel pada wajah secara real-time menggunakan **MindAR.js 1.2.5** dan **Three.js 0.175.0**, tanpa framework, bundler, atau backend.

## Fitur

- Face tracking `faceMesh` dengan kamera depan.
- Topi toga dan kacamata sebagai model GLB 3D.
- Tiga bentuk dan warna toga: Klasik Emas, Oxford Navy, dan Mortar Maroon.
- Tiga bentuk dan warna kacamata: Kotak Emas, Bulat Hitam, dan Cat-eye Cokelat.
- Dropdown terpisah memungkinkan hingga sembilan kombinasi topi dan kacamata.
- Landmark `10` untuk area dahi/atas kepala dan `168` untuk pangkal hidung.
- Animasi goyang loop dengan `THREE.AnimationMixer` dan `AnimationClip`.
- Tombol **Ganti Filter** berpindah ke pasangan berikutnya tanpa memuat ulang halaman.
- Overlay HTML “UMSU” di bagian atas layar.
- Foto PNG hasil gabungan video dan canvas AR.
- Pilihan topi dan kacamata masing-masing disimpan di `localStorage`.
- Pesan kesalahan yang jelas jika kamera atau resource tidak dapat diakses.
- Placeholder `BoxGeometry` mengikuti warna aksesori jika model GLB gagal dimuat.

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
│       ├── toga_oxford.glb
│       ├── toga_mortar.glb
│       ├── glasses.glb
│       ├── glasses_round.glb
│       └── glasses_cat_eye.glb
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
5. Posisikan wajah di dalam kamera, lalu gunakan dropdown **Bentuk & warna toga** dan **Bentuk & warna kacamata**, tombol **Ganti Filter**, serta **Ambil Foto**.

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

Edit [data/filters.json](data/filters.json). Array `hats` berisi tiga pilihan toga dan array `glasses` berisi tiga pilihan kacamata. Setiap aksesori membaca `model`, `landmark`, `position`, `rotation`, `modelRotation`, `scale`, warna pratinjau, dan animasi opsional dari JSON. Path model relatif terhadap `index.html`.

Model GLB yang disertakan adalah geometri prosedural sederhana buatan proyek ini. Model pengganti dapat menggunakan nama file yang sama atau path lain di JSON. Jika GLB memiliki clip animasi sendiri, clip pertama akan diputar; animasi goyang tambahan tetap dibuat saat runtime.

### Pilihan bentuk dan warna

| Kategori | Pilihan | Bentuk | Warna |
|---|---|---|---|
| Toga | Klasik | Board kotak, mahkota pendek | Emas |
| Toga | Oxford | Board bulat, mahkota silinder | Navy |
| Toga | Mortar | Mahkota tinggi, board miring | Maroon |
| Kacamata | Kotak | Bingkai tebal berbentuk kotak | Emas |
| Kacamata | Bulat | Lensa dan bingkai bulat | Hitam |
| Kacamata | Cat-eye | Sudut luar terangkat | Cokelat |

### Kalibrasi posisi

| Aksesori | Anchor | Position awal | Scale awal |
|---|---:|---|---:|
| Toga Klasik / Oxford | `10` | `[0, 0.12, -0.05]` | `[0.25, 0.25, 0.25]` |
| Toga Mortar | `10` | `[0, 0.12, -0.05]` | `[0.23, 0.23, 0.23]` |
| Kacamata Kotak / Cat-eye | `168` | `[0, 0, 0.04–0.05]` | `[0.15, 0.15, 0.15]` |
| Kacamata Bulat | `168` | `[0, 0, 0.04]` | `[0.16, 0.16, 0.16]` |

Offset diterapkan ke wadah aksesori di bawah anchor, bukan ke `anchor.group`, karena MindAR menimpa matrix anchor setiap frame. `modelRotation` dapat digunakan untuk koreksi orientasi GLB tanpa mengubah anchor.

Untuk melihat titik anchor, buka URL dengan parameter `?debug=true`. Anchor `10` ditandai merah dan anchor `168` ditandai biru. Hint pencahayaan tampil selama empat detik setelah kamera siap.

Keenam model tanpa tekstur dan berukuran di bawah 140 KB. Jumlah triangle per model berkisar 156–1.716, jauh di bawah batas 3 MB, 10.000 triangle, serta tekstur 512×512 per aksesori.

## Kompatibilitas Three.js r175

MindAR 1.2.5 masih mengimpor konstanta lama `sRGBEncoding`, yang telah dihapus dari Three.js r175. Import map memberi scope khusus untuk modul CDN MindAR ke [js/three-mindar-compat.js](js/three-mindar-compat.js). Modul kecil tersebut mengekspor ulang Three.js **0.175.0** yang sama, menyediakan konstanta legacy yang dibutuhkan MindAR, dan membuat `WebGLRenderer` dengan `preserveDrawingBuffer: true` agar hasil foto tidak hitam. Output warna aplikasi tetap menggunakan `SRGBColorSpace` bawaan r175.

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
| Enam model toga dan kacamata | Geometri prosedural asli proyek ini | CC0 | Tiga bentuk dan warna untuk masing-masing kategori |
| Cinzel | Google Fonts | SIL Open Font License | Font dekoratif overlay UMSU |
| Plus Jakarta Sans | Google Fonts | SIL Open Font License | Font antarmuka |

## Pengujian

Validasi pada 25 November 2026:

- Sintaks JavaScript, JSON filter, path model, dan struktur GLB lolos pemeriksaan.
- Chromium berhasil memuat MindAR, OpenCV, MediaPipe, Three.js, dan keenam model.
- Dengan kamera canvas simulasi, FaceMesh mendeteksi wajah sintetis, keenam pilihan model dapat dimuat, dropdown serta tombol ganti filter bekerja, pilihan masing-masing kategori tetap ada setelah reload, dan PNG berhasil dibuat.
- Tanpa kamera fisik, pesan “Kamera tidak ditemukan” muncul; simulasi izin ditolak menampilkan panduan pengaturan kamera.
- Screenshot visual tidak tersedia karena viewport browser internal tidak memiliki surface terlihat. Uji kamera, tracking, dan unduhan pada perangkat fisik belum dilakukan.

Isi [docs/device-matrix.md](docs/device-matrix.md) setelah menguji perangkat fisik. Pengujian browser otomatis tidak menggantikan uji kamera, tracking, dan unduhan pada smartphone.
