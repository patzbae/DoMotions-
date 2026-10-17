# Laporan Pembaruan Behavior Tombol Null (Layers Module)

**Dokumen:** `null_behavior_update_report.md`  
**Proyek:** DoMotions v0.1 — CEP Extension for Adobe After Effects  
**Modul:** Layers Module  
**Status:** IMPLEMENTED (Static Validation Complete)

---

## 1. Status Implementasi
Pembaruan behavior tombol **Null** dan penghapusan tombol **Null at Selected** telah berhasil diimplementasikan secara bersih tanpa meninggalkan *dead code* atau dependensi rusak.

---

## 2. File yang Dibuat
- `null_behavior_update_report.md` (Laporan implementasi ini).

---

## 3. File yang Diubah
1. `jsx/modules/layer.jsx`:
   - Menulis ulang `$.DoMotions.modules.layer.createNull` agar cerdas mendeteksi konteks seleksi:
     - Jika tidak ada layer yang dipilih: membuat 1 Null Object standar di tengah komposisi (`[comp.width/2, comp.height/2]`).
     - Jika terdapat satu atau lebih layer yang dipilih: membuat Null Object khusus untuk setiap layer terpilih, memindahkannya tepat di atas layer bersangkutan (`moveBefore`), menyamakan `inPoint` dan `outPoint`, mem-parent Null ke layer tersebut, dan menyelaraskan posisi lokal Null ke `[0, 0]` (atau `[0, 0, 0]` bila 3D).
   - Menghapus fungsi `$.DoMotions.modules.layer.createNullAtSelected` yang sudah usang.
2. `js/modules/layer/commands.js`:
   - Menghapus command definition `createNullAtSelected`.
   - Mempertahankan `createNull` sebagai command tunggal pembuatan Null.
3. `js/modules/layer/module.js`:
   - Menghapus elemen tombol `#null-selected` dari template HTML.
   - Mengubah layout grup tombol `Create Layer` menjadi 3 kolom rapi (`Null`, `Solid`, `Adj`).
   - Menghapus event listener klik untuk `#null-selected`.
   - Memperbarui event listener `#create-null` agar mendispatch `createNull()` dan menampilkan notifikasi toast jika terjadi error.
4. `ACTIVITY-REPORT.md`:
   - Memperbarui catatan riwayat perubahan Layers Module dan membersihkan referensi *backlog*.

---

## 4. Tombol / UI yang Dihapus
- **Tombol:** `"Null at Selected"` (`<button id="null-selected">`).
- **DOM ID Terkait:** `#null-selected`.
- **Command:** `layer.createNullAtSelected`.
- **Backend Function:** `$.DoMotions.modules.layer.createNullAtSelected`.

---

## 5. Behavior Baru Tombol "Null"
- **Kondisi Tanpa Seleksi (0 Layer):**
  - Membuat satu Null Object normal berdurasi penuh komposisi di posisi tengah layar (`comp.width / 2`, `comp.height / 2`).
- **Kondisi Ada Seleksi (≥ 1 Layer):**
  - Mengiterasi seluruh layer yang sedang dipilih (disnapshot terlebih dahulu agar penambahan layer baru tidak merusak array seleksi).
  - Untuk setiap layer terpilih, dibuatkan satu Null Object khusus (`"Null for <Layer Name>"`).
  - Null Object baru otomatis mewarisi dimensi 3D jika layer sumber merupakan layer 3D (`threeDLayer = true`).

---

## 6. Behavior Parenting
- **Arah Hierarki:** `nullLayer.parent = targetLayer` (Null menjadi child dari target layer).
- **Stabilitas Transform Parent:** Karena target layer bertindak sebagai *parent*, seluruh transform milik target layer (Position, Anchor Point, Scale, Rotation, Opacity, serta keyframe yang ada) **sama sekali tidak disentuh atau dimodifikasi**.
- **Posisi Null:** Null ditempatkan pada posisi `[0, 0]` (atau `[0, 0, 0]` bila 3D) dalam ruang koordinat lokal parent, sehingga titik pusat controller Null tepat berimpit dengan Anchor Point / origin visual layer parent.

---

## 7. Behavior inPoint / outPoint
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
- Null tidak lagi selalu berdurasi penuh komposisi jika layer target hanya aktif pada sebagian durasi timeline.
- Penanganan urutan assignment memastikan tidak terjadi error clamping batas waktu pada After Effects API.

---

## 8. Behavior Multiple Selection
- Bila user memilih beberapa layer (misal Layer A, Layer B, Layer C):
  - Dihasilkan 3 Null terpisah:
    - `Null for Layer A` → Parent: Layer A (inPoint/outPoint mengikuti Layer A)
    - `Null for Layer B` → Parent: Layer B (inPoint/outPoint mengikuti Layer B)
    - `Null for Layer C` → Parent: Layer C (inPoint/outPoint mengikuti Layer C)
- Seluruh Null dibuat dalam satu eksekusi tunggal.

---

## 9. Behavior Layer Ordering
- Setiap Null ditempatkan tepat di atas layer parent-nya pada timeline menggunakan:
  ```javascript
  nullLayer.moveBefore(targetLayer);
  ```
- Urutan timeline tetap terstruktur rapi:
  ```
  [Null for Layer A]
  [Layer A]
  [Null for Layer B]
  [Layer B]
  ...
  ```

---

## 10. Hasil Test (T01 - T09)

| Test ID | Skenario Uji | Status Verifikasi Kode / Logika |
|---|---|---|
| **T01** | Tidak ada layer dipilih → klik Null | **LOGIC VERIFIED** — Masuk ke Scenario A: membuat 1 Null normal di `[width/2, height/2]`. |
| **T02** | 1 layer dipilih → klik Null | **LOGIC VERIFIED** — Membuat 1 Null tepat di atas layer, `null.parent = layer`, `pos = [0,0]`, in/outPoint sinkron. |
| **T03** | Layer hanya aktif sebagian durasi | **LOGIC VERIFIED** — `null.inPoint` & `null.outPoint` mengikuti nilai in/out layer target. |
| **T04** | Beberapa layer dipilih | **LOGIC VERIFIED** — Setiap layer di-loop dan menerima 1 Null masing-masing. |
| **T05** | Beberapa layer dengan durasi berbeda | **LOGIC VERIFIED** — Masing-masing Null disinkronkan ke in/outPoint layer pasangannya. |
| **T06** | Layer memiliki transform (Pos, Scale, Rot, Anchor) | **LOGIC VERIFIED** — Layer sumber bertindak sebagai parent; transform-nya tidak diubah sama sekali. |
| **T07** | Layer memiliki keyframe | **LOGIC VERIFIED** — Nilai dan keyframe layer target tidak dimodifikasi. |
| **T08** | Undo (Ctrl+Z) | **LOGIC VERIFIED** — Seluruh blok pembuatan terbungkus dalam satu `$.DoMotions.utils.undoGroup('Create Null')`. |
| **T09** | Tombol & referensi "Null at Selected" dihapus | **VERIFIED** — Bersih dari template HTML, event listener, command, dan JSX backend (zero dead code). |

> *Catatan Pengujian Runtime:*  
> **Runtime validation belum dilakukan karena After Effects tidak tersedia.**  
> Seluruh pengecekan statis, integritas AST, dan verifikasi alur data internal telah selesai dan valid.

---

## 11. Regression Testing
- **Create Solid:** Tidak terpengaruh (`DoMotions.Commands.Layer.createSolid`).
- **Create Adjustment Layer:** Tidak terpengaruh (`DoMotions.Commands.Layer.createAdjustmentLayer`).
- **Parent to Null:** Tidak terpengaruh (`DoMotions.Commands.Layer.parentToNull`).
- **Duplicate Selected:** Tidak terpengaruh (`DoMotions.Commands.Layer.duplicateSelected`).
- **Rename Selected:** Tidak terpengaruh (`DoMotions.Commands.Layer.renameSelected`).
- **Select Similar:** Tidak terpengaruh (`DoMotions.Commands.Layer.selectSimilar`).
- **Toggles (Shy, Lock, Guide):** Tidak terpengaruh.
- **Anchor Module, Easing, Graph, Text, Settings:** 100% tidak disentuh.

---

## 12. Limitasi & Rekomendasi
- **Limitasi:** Jika comp terkunci atau tidak ada komposisi aktif, ExtendScript akan melempar error standard DoMotions (*"No active composition"*), yang ditangani secara elegan oleh status bar & toast notification.
- **Rekomendasi:** Pengujian langsung di Adobe After Effects dapat dilakukan dengan memilih variasi layer 2D dan 3D untuk memverifikasi keselarasan visual controller di viewport.
