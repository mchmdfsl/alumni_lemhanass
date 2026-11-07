from __future__ import annotations

import json
import shutil
import subprocess
import zipfile
from pathlib import Path

import fitz
import pandas as pd
from docx import Document

BASE_DIR = Path(__file__).resolve().parent
INPUT_DIR = BASE_DIR / "input"
OUTPUT_DIR = BASE_DIR / "output"
EXTRACT_DIR = OUTPUT_DIR / "extracted"

ZIP_NAME = "Data Alumni Reguler Lemhannas.zip"

for folder in (INPUT_DIR, OUTPUT_DIR, EXTRACT_DIR):
    folder.mkdir(parents=True, exist_ok=True)

inventory: list[dict] = []
spreadsheet_rows: list[dict] = []
text_blocks: list[dict] = []
errors: list[dict] = []


def safe_extract(zip_path: Path, destination: Path) -> None:
    """Extract ZIP entries only inside destination."""
    root = destination.resolve()

    with zipfile.ZipFile(zip_path) as archive:
        for item in archive.infolist():
            target = (destination / item.filename).resolve()

            if target != root and root not in target.parents:
                errors.append({
                    "file": item.filename,
                    "error": "Unsafe ZIP path skipped",
                })
                continue

            if item.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                continue

            target.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(item) as source, target.open("wb") as output:
                shutil.copyfileobj(source, output)


def add_text(source: Path, location: str, content: str) -> None:
    content = (content or "").strip()
    if content:
        text_blocks.append({
            "source_file": str(source.relative_to(EXTRACT_DIR)),
            "location": location,
            "content": content,
        })


def process_spreadsheet(file: Path) -> None:
    try:
        workbook = pd.ExcelFile(file)
        for sheet in workbook.sheet_names:
            frame = pd.read_excel(
                workbook, sheet_name=sheet, header=None, dtype=object
            )
            for row_number, row in enumerate(
                frame.itertuples(index=False, name=None), start=1
            ):
                values = [
                    None if pd.isna(value) else str(value).strip()
                    for value in row
                ]
                if not any(value not in (None, "") for value in values):
                    continue
                spreadsheet_rows.append({
                    "source_file": str(file.relative_to(EXTRACT_DIR)),
                    "sheet": sheet,
                    "row_number": row_number,
                    "raw_data": json.dumps(values, ensure_ascii=False),
                })
    except Exception as exc:
        errors.append({"file": str(file), "error": repr(exc)})


def process_docx(file: Path) -> None:
    try:
        document = Document(file)
        for number, paragraph in enumerate(document.paragraphs, start=1):
            add_text(file, f"Paragraph {number}", paragraph.text)

        for table_number, table in enumerate(document.tables, start=1):
            for row_number, row in enumerate(table.rows, start=1):
                cells = [cell.text.strip() for cell in row.cells]
                add_text(
                    file,
                    f"Table {table_number}, row {row_number}",
                    " | ".join(cells),
                )
    except Exception as exc:
        errors.append({"file": str(file), "error": repr(exc)})


def process_pdf(file: Path) -> None:
    try:
        with fitz.open(file) as document:
            for page_number, page in enumerate(document, start=1):
                add_text(file, f"Page {page_number}", page.get_text("text"))
    except Exception as exc:
        errors.append({"file": str(file), "error": repr(exc)})


def process_legacy_doc(file: Path) -> None:
    office = shutil.which("soffice") or shutil.which("libreoffice")
    if not office:
        errors.append({
            "file": str(file),
            "error": "File .doc lama perlu LibreOffice untuk dikonversi",
        })
        return

    conversion_dir = OUTPUT_DIR / "doc_conversion"
    conversion_dir.mkdir(parents=True, exist_ok=True)
    try:
        subprocess.run(
            [
                office, "--headless", "--convert-to", "txt:Text",
                "--outdir", str(conversion_dir), str(file),
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        converted = conversion_dir / f"{file.stem}.txt"
        if converted.exists():
            add_text(
                file,
                "Converted legacy DOC",
                converted.read_text(encoding="utf-8", errors="replace"),
            )
        else:
            errors.append({
                "file": str(file),
                "error": "LibreOffice tidak menghasilkan file TXT",
            })
    except Exception as exc:
        errors.append({"file": str(file), "error": repr(exc)})


def process_plain_text(file: Path) -> None:
    try:
        add_text(
            file,
            "Text content",
            file.read_text(encoding="utf-8", errors="replace"),
        )
    except Exception as exc:
        errors.append({"file": str(file), "error": repr(exc)})


def save_outputs(files: list[Path]) -> None:
    pd.DataFrame(inventory).to_csv(
        OUTPUT_DIR / "file_inventory.csv",
        index=False,
        encoding="utf-8-sig",
    )
    pd.DataFrame(spreadsheet_rows).to_json(
        OUTPUT_DIR / "spreadsheet_rows.jsonl",
        orient="records",
        lines=True,
        force_ascii=False,
    )
    pd.DataFrame(text_blocks).to_json(
        OUTPUT_DIR / "text_blocks.jsonl",
        orient="records",
        lines=True,
        force_ascii=False,
    )
    pd.DataFrame(errors, columns=["file", "error"]).to_csv(
        OUTPUT_DIR / "extraction_errors.csv",
        index=False,
        encoding="utf-8-sig",
    )

    extension_counts = {}
    for item in inventory:
        extension = item["extension"] or "(tanpa ekstensi)"
        extension_counts[extension] = extension_counts.get(extension, 0) + 1

    summary = pd.DataFrame([
        {"metric": "Total file", "value": len(files)},
        {"metric": "Baris spreadsheet terbaca", "value": len(spreadsheet_rows)},
        {"metric": "Blok teks terbaca", "value": len(text_blocks)},
        {"metric": "File/error yang perlu ditinjau", "value": len(errors)},
        *[
            {"metric": f"File {extension}", "value": count}
            for extension, count in sorted(extension_counts.items())
        ],
    ])
    summary.to_excel(OUTPUT_DIR / "extraction_summary.xlsx", index=False)


def main() -> None:
    zip_path = INPUT_DIR / ZIP_NAME
    if not zip_path.exists():
        candidates = sorted(INPUT_DIR.glob("*.zip"))
        if len(candidates) == 1:
            zip_path = candidates[0]
        else:
            print("ZIP belum ditemukan.")
            print(f"Masukkan satu file ZIP alumni ke folder: {INPUT_DIR}")
            print(f"Nama yang disarankan: {ZIP_NAME}")
            return

    print(f"ZIP sumber: {zip_path.name}")
    print("1/3 Mengekstrak arsip...")
    try:
        safe_extract(zip_path, EXTRACT_DIR)
    except zipfile.BadZipFile:
        print("File ZIP rusak atau bukan arsip ZIP yang valid.")
        return
    except Exception as exc:
        print(f"Gagal mengekstrak ZIP: {exc}")
        return

    files = sorted(path for path in EXTRACT_DIR.rglob("*") if path.is_file())
    print(f"2/3 Memeriksa {len(files)} file...")

    for index, file in enumerate(files, start=1):
        extension = file.suffix.lower()
        inventory.append({
            "file": str(file.relative_to(EXTRACT_DIR)),
            "extension": extension,
            "size_bytes": file.stat().st_size,
        })

        if extension in {".xlsx", ".xls", ".ods"}:
            process_spreadsheet(file)
        elif extension == ".docx":
            process_docx(file)
        elif extension == ".pdf":
            process_pdf(file)
        elif extension == ".doc":
            process_legacy_doc(file)
        elif extension in {".txt", ".csv"}:
            process_plain_text(file)

        print(f"[{index}/{len(files)}] {file.name}")

    print("3/3 Menyimpan laporan ekstraksi...")
    save_outputs(files)

    print("\n=== INVENTARISASI SELESAI ===")
    print(f"Total file: {len(files)}")
    print(f"Baris spreadsheet: {len(spreadsheet_rows)}")
    print(f"Blok teks: {len(text_blocks)}")
    print(f"Error/perlu tinjauan: {len(errors)}")
    print(f"Hasil: {OUTPUT_DIR}")
    print(
        "\nCatatan: PDF hasil scan/gambar belum menjalani OCR. "
        "File tersebut perlu ditandai untuk tahap OCR berikutnya."
    )
    print(
        "Tahap ini hanya ekstraksi. Tidak ada data yang dihapus, "
        "database yang diubah, atau CSV impor produksi yang dibuat."
    )


if __name__ == "__main__":
    main()
