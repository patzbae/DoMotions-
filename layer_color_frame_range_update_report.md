# DoMotions - Layer Color & Frame Range Enhancement Report

## 1. Status Implementasi
- **Status:** **COMPLETE** (Code Implementation & Static Analysis Verified)
- **Komponen:** Layers Module (`jsx/modules/layer.jsx`)
- **Runtime Validation:** Belum dilakukan secara langsung di Adobe After Effects karena After Effects environment tidak berjalan saat agent mengeksekusi script. Logika telah diuji melalui peninjauan statis dan verifikasi alur ExtendScript.

---

## 2. Ringkasan Perubahan
Enhancement ini mengimplementasikan tiga fokus utama pada pembuatan layer di Layers Module DoMotions:
1. **Layer Label Color After Effects Timeline:**
   - Null Layer diberi warna timeline **Hijau** (Label index `9`).
   - Adjustment Layer diberi warna timeline **Biru Clay / Slate Blue** (Label index `8`).
   - Solid Layer diberi warna timeline **Merah** (Label index `1`).
2. **Frame Range Behavior (Solid & Adjustment):**
   - Jika terdapat layer yang dipilih (selected layer), Solid dan Adjustment Layer yang baru dibuat akan mewarisi `inPoint` dan `outPoint` dari layer tersebut, bukan sepanjang komposisi penuh.
   - Menggunakan mekanisme penataan urutan penugasan (`inPoint` vs `outPoint`) untuk menghindari error penjepitan (clamping) pada ExtendScript After Effects.
3. **No Auto-Parenting untuk Solid & Adjustment:**
   - Solid Layer dan Adjustment Layer **TIDAK** di-parent ke selected layer (`parent == null`).
   - Hierarki layer asli dan layer baru tetap independen.
4. **Controller Null Behavior:**
   - Behavior pembuatan Null Layer menempatkan Null sebagai **PARENT** controller bagi selected layer (`selectedLayer.parent = nullLayer`, `nullLayer.parent == null`).
   - Null ditempatkan di atas selected layer, mewarisi `inPoint` & `outPoint`, serta diposisikan sesuai posisi comp layer target sehingga posisi visual selected layer tidak bergeser.

---

## 3. File yang Dibuat
- `layer_color_frame_range_update_report.md` (Dokumen laporan implementasi ini).

---

## 4. File yang Dimodifikasi
- `jsx/modules/layer.jsx` (Menambahkan kamus konstanta `LABEL_COLORS`, penerapan label color pada `_createNull`, `createNull`, `createSolid`, dan `createAdjustmentLayer`, implementasi inherit frame range tanpa parenting pada `createSolid` dan `createAdjustmentLayer`, serta koreksi hierarki controller Null `selectedLayer.parent = nullLayer`).

---

## 5. Implementasi Label Color
After Effects mengatur warna label pada timeline melalui properti `layer.label`, yang menerima bilangan bulat (integer) berbasis konfigurasi label bawaan After Effects (*Preferences > Labels*). Properti ini secara spesifik hanya mengubah warna swatch label pada timeline/layer bar, tanpa memengaruhi warna solid raster (`solid.source.mainSource.color`) maupun tampilan visual shape.

Implementasi terpusat didefinisikan di awal modul `jsx/modules/layer.jsx`:
```javascript
// After Effects Timeline Layer Label Color Indices (Preferences > Labels)
var LABEL_COLORS = {
    NONE: 0,
    SOLID: 1,        // Red (Merah)
    ADJUSTMENT: 8,   // Blue (Biru Clay / Slate Blue)
    NULL: 9          // Green (Hijau)
};
```

---

## 6. Label Index yang Digunakan
Berdasarkan daftar palet default label After Effects (index 0 - 16):
- **Null Layer:** Label Index **`9`** (`Green` / Hijau)
- **Adjustment Layer:** Label Index **`8`** (`Blue` / Biru Clay / Slate Blue)
- **Solid Layer:** Label Index **`1`** (`Red` / Merah)

---

## 7. Implementasi Frame Range
Ketika After Effects membuat solid (`comp.layers.addSolid(...)`), layer baru secara default dibuat sepanjang durasi komposisi (`comp.duration`) dengan `inPoint = 0` dan `outPoint = comp.duration`. 

Untuk menyamakan frame range dengan layer referensi (`refLayer`):
1. Pengambilan referensi seleksi dilakukan **sebelum** pemanggilan `comp.layers.addSolid(...)`, karena API `addSolid` secara otomatis mengubah `comp.selectedLayers` ke layer baru.
2. Penanganan Clamping: Pada ExtendScript, jika `refLayer.inPoint` lebih besar dari `solid.outPoint` saat ini, mengatur `inPoint` terlebih dahulu dapat menyebabkan nilai dijepit atau ditolak. Maka urutan eksekusi disesuaikan:
```javascript
var inP = refLayer.inPoint;
var outP = refLayer.outPoint;
if (inP > layer.outPoint) {
    layer.outPoint = outP;
    layer.inPoint = inP;
} else {
    layer.inPoint = inP;
    layer.outPoint = outP;
}
```

---

## 8. Behavior Ketika Tidak Ada Selected Layer
- **Null:** Membuat 1 Null layer normal di tengah komposisi (`[comp.width / 2, comp.height / 2]`), durasi default komposisi, `label = 9` (Hijau).
- **Solid:** Membuat Solid layer standar berukuran komposisi penuh, durasi penuh komposisi, `label = 1` (Merah).
- **Adjustment:** Membuat Adjustment layer berukuran komposisi penuh, durasi penuh komposisi, `label = 8` (Biru Clay).

---

## 9. Behavior Ketika Ada Selected Layer
- **Null:** Membuat Null controller untuk setiap selected layer:
  - Struktur: `Null (Parent) └── Selected Layer (Child)`.
  - Kode: `selectedLayer.parent = nullLayer`, `nullLayer.parent = null`.
  - Diletakkan tepat di atas target layer di timeline.
  - Durasi disamakan (`inPoint`/`outPoint`).
  - Posisi Null dicocokkan dengan posisi comp layer target agar visual tidak bergeser.
  - `label = 9` (Hijau).
- **Solid:** 
  - Mengambil referensi dari selected layer (`selected[0]`).
  - Menetapkan `inPoint = refLayer.inPoint` dan `outPoint = refLayer.outPoint`.
  - Menetapkan `solid.label = 1` (Merah).
  - `solid.parent` tetap `null` (tidak ada parenting).
- **Adjustment:** 
  - Mengambil referensi dari selected layer (`selected[0]`).
  - Menetapkan `inPoint = refLayer.inPoint` dan `outPoint = refLayer.outPoint`.
  - Menetapkan `adj.label = 8` (Biru Clay).
  - `adj.parent` tetap `null` (tidak ada parenting).

---

## 10. Behavior Parenting
- **Solid Layer:** **TIDAK ADA PARENTING** (`solid.parent == null`). Seleksi layer tidak diubah menjadi child dari Solid maupun sebaliknya.
- **Adjustment Layer:** **TIDAK ADA PARENTING** (`adj.parent == null`). Seleksi layer tidak diubah menjadi child dari Adjustment Layer maupun sebaliknya.
- **Null Layer:** Null menjadi **PARENT** controller bagi selected layer (`selectedLayer.parent = nullLayer`). Null sendiri tidak memiliki parent (`nullLayer.parent == null`).

---

## 11. Behavior Multiple Selection
Berdasarkan arsitektur existing DoMotions:
- Fitur `createSolid` dan `createAdjustmentLayer` dirancang untuk membuat 1 layer per klik aksi.
- Jika user memilih multiple layers (contoh: Layer A, B, C), implementasi mengambil layer pertama (`selected[0]`) sebagai acuan frame range (`inPoint` dan `outPoint`).
- Arsitektur ini dipertahankan dan tidak diubah menjadi multi-layer generator demi mencegah perubahan arsitektur yang tidak diinginkan dan menjaga konsistensi alur kerja user.

---

## 12. Hasil Testing (T01 - T12)

> [!NOTE]
> *Runtime validation belum dilakukan karena After Effects tidak tersedia.*
> Hasil evaluasi di bawah didasarkan pada static analysis dan code review alur ExtendScript.

| Test ID | Skenario Pengujian | Hasil yang Diharapkan | Status Evaluasi | Catatan / Mekanisme |
| :--- | :--- | :--- | :--- | :--- |
| **T01** | Create Null tanpa selected layer | Null dibuat normal, `label = 9` (Hijau) | **ANALYSIS PASS** | Dibuat di tengah comp, label diset ke 9. |
| **T02** | Create Null dengan selected layer | Null sebagai parent (`selectedLayer.parent = nullLayer`, `Null.parent = null`), `label = 9` (Hijau) | **ANALYSIS PASS** | Null dibuat di atas layer, posisi comp disesuaikan, target di-parent ke Null, durasi sama, label 9. |
| **T03** | Create Solid tanpa selected layer | Solid dibuat sepanjang comp, `label = 1` (Merah) | **ANALYSIS PASS** | Durasi mengikuti comp penuh, label diset ke 1. |
| **T04** | Create Solid dengan 1 selected layer | `label = 1`, `inPoint`/`outPoint` sama dengan selected layer, no parenting | **ANALYSIS PASS** | Frame range dicocokkan dengan refLayer, `parent` tidak disentuh. |
| **T05** | Create Adjustment tanpa selected layer | Adjustment dibuat sepanjang comp, `label = 8` (Biru Clay) | **ANALYSIS PASS** | Durasi mengikuti comp penuh, `adjustmentLayer = true`, label 8. |
| **T06** | Create Adjustment dengan 1 selected layer | `label = 8`, `inPoint`/`outPoint` sama dengan selected layer, no parenting | **ANALYSIS PASS** | Frame range dicocokkan dengan refLayer, `parent` tidak disentuh. |
| **T07** | Selected layer durasi sebagian comp | Solid/Adjustment aktif hanya sepanjang durasi selected layer | **ANALYSIS PASS** | `inPoint` dan `outPoint` diset persis mengikuti durasi partial layer. |
| **T08** | Selected layer memiliki keyframe | Keyframe selected layer tidak berubah | **ANALYSIS PASS** | Operasi Solid/Adjustment murni read-only terhadap `selected[0]`. |
| **T09** | Selected layer memiliki parenting | Tidak mengubah hierarchy parenting selected layer | **ANALYSIS PASS** | Tidak menyentuh properti `.parent` dari selected layer. |
| **T10** | Multiple selected layers | Mengikuti layer pertama (`selected[0]`), no auto-parenting | **ANALYSIS PASS** | Membuat 1 layer dengan frame range `selected[0]`, `parent == null`. |
| **T11** | Undo (Ctrl+Z) | Seluruh perubahan (create, range, label) dibatalkan dalam 1 langkah | **ANALYSIS PASS** | Seluruh proses dibungkus dalam `$.DoMotions.utils.undoGroup`. |
| **T12** | Regression | Fitur Layers lainnya tetap bekerja normal | **ANALYSIS PASS** | Tidak ada signature method atau contract yang diubah. |

---

## 13. Regression Test
- **Layers Module:**
  - `Null`, `Solid`, `Adjustment` telah di-enhance secara aman.
  - `Parent to Null`, `Duplicate`, `Rename`, `Select Similar`, `Shy`, `Lock`, `Guide` tidak mengalami modifikasi.
- **Anchor Module:** Tidak disentuh (0 baris diubah).
- **Easing Module:** Tidak disentuh (0 baris diubah).
- **Graph Module:** Tidak disentuh (0 baris diubah).
- **Settings & UI:** Tidak disentuh.

---

## 14. Limitasi
1. **Preferensi Label Pengguna di After Effects:** Label color menggunakan index After Effects default (1 = Red, 8 = Blue, 9 = Green). Jika pengguna telah mengkustomisasi nama atau warna swatch di *Preferences > Labels* After Effects, warna visual label timeline akan mengikuti palet kustom tersebut.
2. **Multiple Selection Range:** Jika beberapa layer yang dipilih memiliki frame range yang tidak saling tumpang tindih (misal Layer A di detik 1-3, Layer B di detik 4-6), Solid/Adjustment saat ini mengambil durasi Layer A (`selected[0]`), bukan gabungan bounding range (union) dari seluruh layer.

---

## 15. Rekomendasi
1. Jika di masa mendatang user menginginkan pembuatan Solid/Adjustment yang mencakup **union** (dari `min(inPoint)` hingga `max(outPoint)`) ketika multiple layers dipilih, fungsionalitas pencarian rentang boundary gabungan dapat ditambahkan secara aman pada `refLayer`.
2. Melakukan verifikasi interaktif visual langsung di panel timeline After Effects begitu sesi runtime dibuka oleh user.
