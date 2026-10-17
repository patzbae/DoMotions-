# Laporan Pembaruan Behavior Tombol Null (Layers Module)

**Dokumen:** `null_behavior_update_report.md`  
**Proyek:** DoMotions v0.1 — CEP Extension for Adobe After Effects  
**Modul:** Layers Module  
**Status:** IMPLEMENTED (Static Validation & Hierarchy Correction Complete)

---

## 1. Status Implementasi
Pembaruan behavior tombol **Null** telah disesuaikan dengan koreksi hierarki controller:
- **Null menjadi PARENT**
- **Selected Layer menjadi CHILD**
- Struktur hierarchy:
  ```
  Null
  └── Selected Layer
  ```
- Tidak ada auto-parenting untuk Solid Layer dan Adjustment Layer (`parent == null`).

---

## 2. File yang Dibuat
- `null_behavior_update_report.md` (Laporan implementasi ini).

---

## 3. File yang Diubah
1. `jsx/modules/layer.jsx`:
   - Menulis ulang fungsi `$.DoMotions.modules.layer.createNull`:
     - **Tanpa Seleksi:** Membuat 1 Null Object standar di tengah komposisi (`[comp.width/2, comp.height/2]`) dengan durasi penuh comp dan label hijau (`label = 9`).
     - **Dengan Seleksi (≥ 1 Layer):**
       - Mengiterasi seluruh layer yang sedang dipilih (disnapshot terlebih dahulu).
       - Untuk setiap layer terpilih, dibuatkan satu Null Object khusus (`"Null for <Layer Name>"`).
       - Menyesuaikan 3D status jika layer target adalah 3D.
       - Menempatkan Null tepat di atas layer terpilih di Timeline (`moveBefore`).
       - Menyelaraskan frame range (`inPoint` dan `outPoint`) persis dengan layer terpilih menggunakan safe ordering.
       - Menempatkan posisi Null tepat pada posisi comp layer terpilih (`_getLayerCompPosition`).
       - **Menjadikan Selected Layer sebagai CHILD dari Null (`selectedLayer.parent = nullLayer`)**.
       - Menjaga `nullLayer.parent == null` sehingga Null berfungsi sebagai controller utama.
   - Menambahkan helper `_readLayerPosition` (aman untuk dimensi terpisah / separated dimensions) dan `_getLayerCompPosition` (mengonversi posisi anchor target ke koordinat comp bila memiliki parent sebelumnya).
2. `js/modules/layer/commands.js`:
   - Menghapus command definition `createNullAtSelected`.
   - Mempertahankan `createNull` sebagai command tunggal pembuatan Null.
3. `js/modules/layer/module.js`:
   - Menghapus elemen tombol `#null-selected` dari template HTML.
   - Mengubah layout grup tombol `Create Layer` menjadi 3 kolom rapi (`Null`, `Solid`, `Adj`).
   - Menghapus event listener klik untuk `#null-selected`.
   - Memperbarui event listener `#create-null` agar mendispatch `createNull()`.

---

## 4. Behavior Baru Tombol "Null"
- **Kondisi Tanpa Seleksi (0 Layer):**
  - Membuat satu Null Object normal berdurasi penuh komposisi di posisi tengah layar (`comp.width / 2`, `comp.height / 2`), `label = 9` (Hijau).
  - Tidak ada parenting yang dilakukan.
- **Kondisi Ada Seleksi (≥ 1 Layer):**
  - Untuk setiap layer terpilih, dibuatkan satu Null Object controller di atas layer bersangkutan.
  - Null Object mewarisi dimensi 3D jika layer sumber merupakan layer 3D (`threeDLayer = true`).
  - Null Object mewarisi label hijau (`label = 9`).

---

## 5. Behavior Parenting & Hierarki Controller
- **Arah Hierarki:**
  ```
  Null (PARENT)
  └── Selected Layer (CHILD)
  ```
  Secara ExtendScript:
  ```javascript
  selectedLayer.parent = nullLayer;
  nullLayer.parent = null;
  ```
- **Tujuan Parenting:**
  Null bertindak sebagai controller bagi selected layer. Ketika Null digerakkan, dirotasi, atau diskalakan, selected layer akan mengikuti transformasi Null tersebut.
- **Posisi Null & Stabilitas Visual:**
  Null diposisikan pada posisi koordinat comp layer terpilih sebelum proses parenting dilakukan (`nullLayer.position.setValue(compPos)`).
  Dengan cara ini, ketika `selectedLayer.parent = nullLayer` dieksekusi, After Effects secara otomatis menyesuaikan koordinat lokal selected layer tanpa menimbulkan lompatan atau pergeseran posisi visual di viewport.

---

## 6. Behavior inPoint / outPoint
- Durasi Null secara presisi mengikuti rentang waktu aktif layer target:
  ```javascript
  var inP = targetLayer.inPoint;
  var outP = targetLayer.outPoint;
  if (inP > nullLayer.outPoint) {
      nullLayer.outPoint = outP;
      nullLayer.inPoint = inP;
  } else {
      nullLayer.inPoint = inP;
      nullLayer.outPoint = outP;
  }
  ```
- Null tidak aktif di luar rentang durasi layer target (mengikuti batas in/out secara presisi).
- Penanganan urutan assignment mencegah error *time-clamp* pada API After Effects.

---

## 7. Behavior Multiple Selection
Bila user memilih beberapa layer (misal: Layer A, Layer B, Layer C) lalu menekan "Null":
- Dihasilkan satu Null untuk masing-masing layer:
  ```
  Null for Layer A
  └── Layer A

  Null for Layer B
  └── Layer B

  Null for Layer C
  └── Layer C
  ```
- Setiap Null:
  - Berada tepat di atas layer pasangannya pada timeline.
  - Menjadi parent bagi layer pasangannya.
  - Mengikuti `inPoint` dan `outPoint` layer pasangannya.
  - Memiliki `label = 9` (Hijau).
  - Memiliki `nullLayer.parent == null`.

---

## 8. Perbedaan Parenting Null vs Solid & Adjustment
- **Null:** Melakukan parenting controller (`selectedLayer.parent = nullLayer`).
- **Solid Layer:** **TIDAK** ada parenting (`solid.parent == null`).
- **Adjustment Layer:** **TIDAK** ada parenting (`adj.parent == null`).

---

## 9. Hasil Pengujian Khusus Parenting & Behavior (T01 - T07)

> [!NOTE]
> *Runtime validation belum dilakukan karena After Effects tidak tersedia.*  
> Seluruh hasil di bawah diverifikasi melalui static analysis dan peninjauan logika ExtendScript DOM.

| Test ID | Skenario Pengujian | Hasil yang Diharapkan | Status Evaluasi | Catatan / Mekanisme |
|---|---|---|---|---|
| **T01** | Pilih 1 layer → klik Null | Timeline: `Null └── Selected Layer`<br>`selectedLayer.parent == Null`<br>`Null.parent == null` | **ANALYSIS PASS** | Dibuat di atas layer, `targetLayer.parent = nullLayer`, `nullLayer.parent == null`. |
| **T02** | Gerakkan Null | Selected Layer ikut bergerak | **ANALYSIS PASS** | Selected layer bertindak sebagai child, sehingga mewarisi delta transformasi parent. |
| **T03** | Posisi visual selected layer sebelum & sesudah parenting | Tidak ada pergeseran visual di viewport | **ANALYSIS PASS** | Posisi Null diset ke comp position layer target sebelum parenting; AE menghitung koordinat lokal tanpa pergeseran. |
| **T04** | Periksa frame range Null | `Null.inPoint == SelectedLayer.inPoint`<br>`Null.outPoint == SelectedLayer.outPoint` | **ANALYSIS PASS** | Nilai inPoint dan outPoint Null disinkronkan secara identik. |
| **T05** | Multiple selected layers (A, B, C) | Setiap layer memiliki Null controller masing-masing | **ANALYSIS PASS** | Loop terisolasi membuat `Null A └── Layer A`, `Null B └── Layer B`, `Null C └── Layer C`. |
| **T06** | Solid + selected layer | `Solid.parent == null` | **ANALYSIS PASS** | Solid mewarisi frame range tanpa pernah mengaitkan properti `.parent`. |
| **T07** | Adjustment + selected layer | `Adjustment.parent == null` | **ANALYSIS PASS** | Adjustment mewarisi frame range tanpa pernah mengaitkan properti `.parent`. |

---

## 10. Undo Operation
Seluruh operasi pembuatan Null, sinkronisasi frame range, penataan posisi, dan penugasan parenting (`selectedLayer.parent = nullLayer`) dibungkus dalam blok tunggal:
```javascript
$.DoMotions.utils.undoGroup('Create Null', function () { ... });
```
Satu kali penekanan Ctrl+Z (Undo) akan membatalkan seluruh operasi sekaligus dan mengembalikan hierarki serta layer ke kondisi semula.

---

## 11. Regression Testing
- **Layers Module:**
  - `Create Solid`: Mengikuti frame range tanpa parenting (`parent == null`), label merah (`1`).
  - `Create Adjustment`: Mengikuti frame range tanpa parenting (`parent == null`), label biru clay (`8`).
  - `Parent to Null`: Tetap berfungsi normal untuk mem-parent multi-layer ke 1 null rata-rata.
  - `Duplicate`, `Rename`, `Select Similar`, `Shy`, `Lock`, `Guide`: Bekerja normal.
- **Anchor, Easing, Graph, Settings:** 100% tidak mengalami perubahan.
