# ID-Grow EditorMap

Editor denah interaktif & sistem navigasi indoor (**Bangunan → Lantai → Ruangan → Rak/Lemari → Slot**) untuk rumah sakit dan gudang logistik, dirancang kompatibel dengan modul `Inventaris` pada **ID-Grow Worklist**.

## Menjalankan Secara Mandiri (Standalone)

```bash
npm install
npm run dev
```

Build produksi & uji engine pathfinding:

```bash
npm run build
node --test tests/pathfinding.test.mjs
```

## Fitur Utama (Berbasis Riset Mappedin, Visioglobe, ArcGIS Indoors H1 2026 & Mapsted)

1. **Editor Denah Multi-Gedung & Multi-Lantai**:
   - Menggambar & mengklasifikasikan zona ruangan (`medis`, `steril`, `gudang`, `koridor`, `restricted`).
   - Memasang pintu (`Door`) dengan *geometry-aided snapping* ke graph koridor.
   - Menempatkan wadah/rak (`StockContainer`) di dalam ruangan dan mengelola kisi slot baris × kolom (`rack_map`).
   - Menghubungkan antar-lantai dan antar-gedung melalui node **Portal** (`elevator`, `ramp`, `bridge`, `stairs`).
   - Upload blueprint (PNG/JPG/SVG) sebagai underlay, kalibrasi skala (`pixel = meter`), kontrol status **Draft / Published**, serta **Audit Validasi Peta**.
2. **Cari Barang & Rute Pengambilan Terdekat**:
   - Pencarian stok di seluruh gedung/ruangan/rak/slot, diurutkan otomatis berdasarkan jarak rute berjalan aktual (A*), bukan garis lurus.
   - Menyorot langsung lokasi rak dan sel slot target (`Baris × Kolom`).
3. **Porter Alat Steril**:
   - Pemilihan profil rute (`Ramah Troli`, `Jalur Steril CSSD` yang menghindari zona infeksius/terlarang & bebas tangga, serta `Jarak Tercepat`).
   - Panduan navigasi langkah-demi-langkah (*turn-by-turn*) + simulasi posisi *blue-dot* lintas lantai.
4. **Export / Import Schema Worklist**:
   - Menghasilkan payload JSON yang selaras dengan tabel `denah_maps` (`nav_nodes`, `path_graph`) dan `stock_containers` (`data.mapping`, `rack_map`) pada backend `worklist`.
