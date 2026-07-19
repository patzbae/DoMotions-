# DoMotions — Activity Report & Developer Handoff

> **Untuk:** developer yang melanjutkan proyek
> **Tanggal:** 2026-07-06
> **Versi saat ini:** 0.1.0
> **Status singkat:** Fondasi arsitektur + modul Easing/Anchor/Layer sudah berjalan. Ada **1 bug terbuka penting** (Anchor Point — lihat §5).

---

## 1. Ringkasan Proyek

DoMotions adalah **CEP extension (panel) untuk Adobe After Effects** — toolkit motion design.

| Aspek | Detail |
|---|---|
| Tipe | Adobe CEP Panel (HTML/JS UI + ExtendScript backend) |
| Target host | After Effects **2020 (v17) ke atas** |
| Runtime | **CSXS 9.0** (dideklarasikan di manifest → kompatibel 2020+ dan semua versi di atasnya) |
| Frontend | Vanilla JS (ES6, IIFE, namespace `window.DoMotions`), tanpa framework / build tool |
| Backend | ExtendScript (ES3), namespace `$.DoMotions` |
| Jembatan | `CSInterface.evalScript()` (Promise-based, lihat `js/core/bridge.js`) |

Arsitektur lengkap: lihat `docs/Architecture.md` dan `docs/Modules.md`.

---

## 2. Cara Menjalankan & Debug

1. Aktifkan unsigned extensions — buat String `PlayerDebugMode = 1` di registry, di key `CSXS.*` sesuai versi AE:
   - AE 2019/2020 → `HKEY_CURRENT_USER\Software\Adobe\CSXS.9`
   - AE 2021+ → `HKEY_CURRENT_USER\Software\Adobe\CSXS.11` (atau `CSXS.12`)
   - (Kalau ragu, buat `PlayerDebugMode` di semua key `CSXS.*` yang ada.)
2. Copy folder `DoMotions` ke `%APPDATA%\Adobe\CEP\extensions\`.
3. Restart AE → `Window > Extensions > DoMotions`.
4. **Remote debug:** buka Chromium/Chrome → `http://localhost:8088` (dikonfigurasi di file `.debug`). Di sini bisa lihat `console.log` dari lapisan UI.
5. **Debug ExtendScript:** log JSX pakai `$.writeln(...)`; error dari JSX dikembalikan sebagai `{ success:false, error }` lewat bridge dan tampil di status bar panel.

> **Catatan penting:** Repo ini **belum di-git-init**. Sangat disarankan `git init` + commit awal sebelum lanjut, supaya perubahan bisa dilacak.

---

## 3. Pekerjaan yang Sudah Diselesaikan

### 3.1 Perbaikan agar bisa jalan di AE (showstopper)
- **CSInterface asli terpasang.** `js/lib/CSInterface.js` sebelumnya cuma *stub* dev (selalu balas `EvalScript error.`). Diganti dengan **CSInterface resmi Adobe v9.4.0 (CEP 9)**. Backup stub disimpan di `js/lib/CSInterface.stub.js.bak` (berguna untuk testing UI di browser biasa — tinggal swap sementara).
- **Target runtime diperbaiki ke CSXS 9.** `CSXS/manifest.xml`: `RequiredRuntime` 11.0 → **9.0** dan schema `Version` → 9.0. Sebelumnya menuntut CSXS 11 (baru ada di AE 2021), sehingga tidak muncul di AE 2020.

### 3.2 Perbaikan sistem settings (high)
- **`fetch()` → `XMLHttpRequest`.** CEP memuat panel lewat skema `file://`, dan Fetch API menolaknya → `defaults.json`/`version.json` gagal dimuat. Ditambah helper `DoMotions._readJSON()` (XHR, menangani `status === 0`) di `js/core/settings-manager.js`, dipakai juga di `js/modules/settings/module.js`.
- **`<CEFCommandLine>`** ditambahkan di `<Resources>` manifest (`--allow-file-access-from-files`, `--allow-file-access`) agar XHR file lokal diizinkan.

### 3.3 Perbaikan logika (medium)
- `js/main.js`: baca `general.theme` (dulu `ui.theme` yang selalu undefined); fallback `ui.lastActiveModule || general.lastActiveModule`; **inject `general.accentColor` ke CSS var `--accent-primary`** saat bootstrap.
- Preset easing `easeIn`/`easeOut`/`easeInOut` yang dulu identik (33/33) dibedakan secara semantik (In: 75/0.1, Out: 0.1/75, InOut: 33/33); tombol UI In/Out diselaraskan.
- `renameSelected` (layer.jsx): beri penomoran (`Nama 1`, `Nama 2`, …) saat >1 layer, bukan nama identik.

### 3.4 Polish (low)
- `config/version.json`: `0.1.0-alpha` → `0.1.0`.
- `README.md`: requirement CEP 9+, tabel registry `PlayerDebugMode` per versi AE.

### 3.5 Perbaikan error dimensi ExtendScript
Kelas bug: mengirim array dengan **jumlah elemen salah** ke API AE.

- **Easing — FIXED.** Ukuran array temporal-ease harus dari `propertyValueType`, bukan `value.length`. Ditambah util `$.DoMotions.utils.getEaseDimensions(prop)` di `jsx/modules/utils.jsx` (spatial/OneD → 1, TwoD → 2, ThreeD → 3), dipakai di `applyEase`. Mengatasi error `setTemporalEaseAtKey ... does not have 1 elements` pada Position dsb.
- **Layer — FIXED.** `createNullAtSelected` dulu `setValue(pos)` dengan `pos` 3-elemen (layer 3D) ke Null 2D → crash. Kini Null dibuat 3D bila layer sumbernya 3D, dan posisi diset dengan dimensi yang cocok.
- **Anchor — ATTEMPTED, MASIH ERROR.** Lihat §5.

---

## 4. Status Per Modul

| Modul | order | Status | Backend JSX |
|---|---|---|---|
| Layers | 10 | ✅ Berfungsi | `jsx/modules/layer.jsx` |
| Graph | 20 | 🚧 Placeholder | — |
| Easing | 30 | ✅ Berfungsi (dimensi fixed) | `jsx/modules/easing.jsx` |
| **Anchor** | 40 | ✅ Berfungsi | `jsx/modules/anchor.jsx` |
| Text | 50 | 🚧 Placeholder | — |
| Utils | 60 | 🚧 Placeholder | — |
| **Graph** | 20 | ✅ Berfungsi | `jsx/modules/graph.jsx` |
| Settings | 70 | ✅ Berfungsi | — (baca version.json) |

---

## 5. Anchor Point — RESOLVED ✅

**Akar masalah (penting untuk dipahami):** kode anchor lama memakai `layer.toWorld()` / `fromWorld()` / `toWorldVec()`. **Metode-metode itu hanya ada di bahasa EKSPRESI After Effects, bukan di DOM scripting (ExtendScript).** Jadi lewat panel CEP mereka selalu `undefined` → "Error setting anchor". Ini pelajaran penting: **jangan pakai `toWorld/toComp/*Vec` di ExtendScript.**

**Solusi:** `_moveAnchor` ditulis ulang memakai **`AVLayer.sourcePointToComp()`** (metode scripting resmi, AE 17.0/2020+) dengan teknik *measure-shift*: ukur posisi comp titik konten target sebelum & sesudah anchor dipindah, lalu batalkan geseran itu lewat Position. Menangani scale, rotasi, parent, 2D/3D, dan Position dimensi terpisah. Ada fallback manual (scale + rotasi 2D) untuk pra-2020. **Dikonfirmasi berfungsi normal oleh user.**

**Gotcha reload yang ikut diperbaiki:** `jsx/hostscript.jsx` dulu punya guard `if (typeof $.DoMotions === 'undefined')`. Karena engine ExtendScript persist selama AE hidup, edit `.jsx` tidak termuat sampai AE di-restart. Guard dihapus → host **selalu reload**, jadi reload panel cukup untuk memuat perubahan `.jsx`.

---

## 6. Backlog / Next Steps (disarankan, urut prioritas)

1. **[P1] Verifikasi runtime menyeluruh di AE** — Anchor ✅, Easing ✅, **Graph** ✅ sudah diuji & dikonfirmasi user (kurva mengikuti tanpa overshoot). Layer belum diuji tuntas di AE.
2. **[P2] Nuansa parent-space (Layer)** — `createNullAtSelected` & `parentToNull` memakai `position.value` (parent space) tapi menaruh Null di comp space; meleset bila layer sumber sudah punya parent. Perbaiki dengan `sourcePointToComp` (BUKAN toWorld — lihat pelajaran di §5). Bukan crash, hanya penempatan.
3. **[P3] Modul placeholder tersisa** — Text Animator, Utilities (lihat `docs/Roadmap.md` Milestone 4). Graph sudah ✅.
4. **[P3] Graph — peningkatan** — belum ada: overshoot (butuh keyframe tambahan, temporal ease murni tak bisa overshoot), input numerik manual untuk 4 nilai bezier, simpan preset kustom. Speed dihitung dari magnitudo Δvalue dan dipakai sama untuk semua dimensi (cukup untuk mayoritas kasus).
5. **[P3] Ikon tema light** — `icons/light/` masih kosong; IconManager fallback ke karakter Unicode. Isi bila mau dukung tema light.
6. **[P4] Testing** — folder `tests/` masih kosong. Belum ada test otomatis.

---

## 5b. Modul Graph (ease curve editor) — cara kerja

Referensi konsep: **Flow** (`reference/flow-v1.4.2`) — tapi kode JSX-nya `@JSXBIN@` (terkompilasi, tak terbaca), jadi dibangun ulang dari nol.

- **UI** (`js/modules/graph/module.js`): editor **cubic-bezier** berbasis SVG (2 handle drag, ambil handle terdekat), garis referensi linear, readout `cubic-bezier(...)`, dan tombol Apply. Fitur: **input numerik** 4 nilai (sinkron dua arah), **16 preset bawaan** (Smooth/Ease/Quad/Cubic/Quart/Expo), **preset kustom** simpan/hapus (`modules.graph.customPresets`), **Copy/Paste** string cubic-bezier. Kurva terakhir dipersist ke `modules.graph.lastCurve`.
- **Backend** (`jsx/modules/graph.jsx` → `applyGraphEase`): untuk tiap pasang keyframe terpilih yang berurutan, meng-set OUT-ease keyframe pertama (influence `x1`, slope `y1/x1`) dan IN-ease keyframe kedua (influence `1-x2`, slope `(1-y2)/(1-x2)`), diskalakan ke value/detik dari Δvalue & Δtime segmen. Memakai `getEaseDimensions` (Position spatial → 1 elemen).
- **Wiring**: `commands.js` (`DoMotions.Commands.Graph.applyEase`), didaftarkan di `index.html` & `hostscript.jsx`, `placeholder:false`.
- **Pelajaran konversi (penting):** (1) ukuran array ease dari `propertyValueType` (spatial → 1). (2) `x1/x2` di-clamp ke `[EPS, 1-EPS]` dan influence+slope pakai denominator yang **sama** supaya titik kontrol AE mendarat tepat di handle. (3) speed **bertanda per-dimensi** untuk properti non-spatial (magnitudo untuk spatial) — magnitudo tanpa tanda membuat nilai menurun **overshoot**. Interaksi drag mengambil **handle terdekat** (bukan hit-test lingkaran kecil).

---

## 7. Peta File Kunci

```
CSXS/manifest.xml              # deklarasi extension (CSXS 9, CEFCommandLine)
index.html                    # urutan load <script> (core → modules → main.js)
config/defaults.json          # default settings (dibaca via XHR)
js/lib/CSInterface.js         # library Adobe asli v9.4.0
js/lib/CSInterface.stub.js.bak# stub lama (untuk test di browser)
js/core/bridge.js             # evalScript wrapper (Promise, timeout 10s)
js/core/command-bus.js        # dispatch command + lifecycle events
js/core/registry.js           # katalog & lifecycle modul
js/core/settings-manager.js   # settings berlapis + helper _readJSON (XHR)
js/core/ui.js                 # accordion + status bar
js/core/icon-manager.js       # SVG themed + fallback
js/main.js                    # bootstrap
jsx/hostscript.jsx            # entry ExtendScript + dispatcher
jsx/modules/utils.jsx         # helper (undoGroup, seleksi, getEaseDimensions)
jsx/modules/easing.jsx        # ✅ backend easing
jsx/modules/anchor.jsx        # ⚠️ backend anchor (bug terbuka)
jsx/modules/layer.jsx         # ✅ backend layer
```

## 8. Konvensi Menambah Modul
Ringkas (detail di `docs/Modules.md`):
1. Buat `js/modules/<nama>/module.js` yang implement `initialize(context)` → `render(container)` → `destroy()`, lalu panggil `DoMotions.Registry.register({ id, name, icon, order, instance })`.
2. (Opsional) `commands.js` yang menambah factory di `DoMotions.Commands.<Nama>`.
3. (Opsional) fungsi ExtendScript di `jsx/modules/<nama>.jsx` + daftarkan `$.evalFile` di `jsx/hostscript.jsx`.
4. Tambah `<script>` di `index.html` (sebelum `js/main.js`).

## 9. Gotchas yang Wajib Diingat
- **`file://` di CEP:** jangan pakai `fetch()` untuk file lokal — pakai `DoMotions._readJSON()` / XHR.
- **Dimensi array ExtendScript:** `setTemporalEaseAtKey`, `setValue`, `toWorld`/`fromWorld` **strict** soal jumlah elemen. Untuk temporal ease pakai `propertyValueType` (Position = spatial = 1 elemen), untuk posisi/anchor cocokkan 2D/3D layer.
- **Versi CSXS vs versi AE:** registry `PlayerDebugMode` mengikuti CEP runtime AE yang dipakai, bukan angka di manifest.
- Semua file JS/JSX yang diubah sudah lolos `node --check` (validasi sintaks, bukan runtime AE).
