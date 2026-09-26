# DagingRebus — HPAL Mass Balance (BFD)

Kalkulator neraca massa HPAL berbasis Block Flow Diagram, dibuat dengan React.

- `hpal_bfd_v3.jsx` — kode aplikasi (React/JSX).
- `index.html` — halaman yang memuat React + Babel dari CDN, meng-compile `hpal_bfd_v3.jsx` di browser, lalu merendernya.
- `.github/workflows/static.yml` — deploy otomatis ke GitHub Pages setiap push ke `main`.

Untuk memperbarui aplikasi, cukup ganti isi `hpal_bfd_v3.jsx` (nama file harus tetap sama).

Untuk mencoba secara lokal, jalankan `python3 -m http.server` di folder ini, lalu buka http://localhost:8000.
File `index.html` tidak bisa dibuka langsung dengan dobel-klik karena browser memblokir `fetch` dari `file://`.
