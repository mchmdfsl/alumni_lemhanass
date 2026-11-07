# Pembersihan Data Alumni Lemhannas

Folder ini berisi alat ekstraksi awal untuk inventarisasi sumber data alumni secara lokal.

## Privasi data

- Jangan commit atau push ZIP, hasil ekstraksi, spreadsheet, CSV, maupun data pribadi alumni.
- Simpan ZIP di folder `input/` pada laptop.
- Hasil program disimpan di `output/`, yang juga diabaikan Git.
- Skrip ini tidak terhubung ke database produksi dan tidak melakukan impor.

## Struktur lokal

```
data-cleaning/
├── cleaning.py
├── requirements.txt
├── README.md
├── input/
│   └── Data Alumni Reguler Lemhannas.zip
└── output/
```

Folder `input/` dan `output/` dibuat otomatis saat skrip dijalankan.

## Menjalankan di Windows

Dari terminal VS Code, masuk ke folder ini:

```powershell
cd data-cleaning
py -3.15 -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python cleaning.py
```

Jika virtual environment sudah dibuat dan pustaka sudah terpasang, cukup jalankan:

```powershell
python cleaning.py
```

Masukkan ZIP di `data-cleaning/input/`. Nama file yang disarankan adalah
`Data Alumni Reguler Lemhannas.zip`. Jika hanya ada satu file ZIP di folder
input, skrip juga dapat memilihnya otomatis.

## Output

- `output/file_inventory.csv`: daftar file dan ukurannya.
- `output/spreadsheet_rows.jsonl`: baris mentah Excel/ODS/XLS.
- `output/text_blocks.jsonl`: teks dari DOCX, PDF berbasis teks, TXT, dan CSV.
- `output/extraction_errors.csv`: file yang gagal dibaca atau butuh penanganan khusus.
- `output/extraction_summary.xlsx`: ringkasan jumlah file, baris, dan blok teks.

PDF hasil scan/gambar belum menjalani OCR. File DOC lama memerlukan LibreOffice.
Tahap ini hanya inventarisasi dan ekstraksi, belum normalisasi final, deduplikasi,
pencocokan ke 8.723 data database, atau pembuatan file impor produksi.
