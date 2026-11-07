
from pathlib import Path
import zipfile
import json
import traceback
import subprocess
import shutil

import pandas as pd
import fitz
from docx import Document

BASE = Path(__file__).resolve().parent
DATA_DIR = BASE / "data"
OUTPUT_DIR = BASE / "output"
EXTRACT_DIR = OUTPUT_DIR / "extracted"

ZIP_FILE = DATA_DIR / "Data Alumni Reguler Lemhannas.zip"

OUTPUT_DIR.mkdir(exist_ok=True)
EXTRACT_DIR.mkdir(parents=True, exist_ok=True)

inventory = []
spreadsheet_rows = []
text_blocks = []
errors = []


def safe_extract(zip_path, destination):
    """Extract ZIP safely, preventing paths outside destination."""
    root = destination.resolve()

    with zipfile.ZipFile(zip_path, "r") as archive:
        for item in archive.infolist():
            target = (destination / item.filename).resolve()

            if target != root and root not in target.parents:
                errors.append({
                    "file": item.filename,
                    "error": "Unsafe ZIP path skipped"
                })
                continue

            if item.is_dir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                with archive.open(item) as source:
                    with open(target, "wb") as output:
                        shutil.copyfileobj(source, output)


def add_text(source, location, content):
    content = str(content or "").strip()
    if content:
        text_blocks.append({
            "source_file": str(source.relative_to(EXTRACT_DIR)),
            "location": location,
            "content": content
        })


def process_excel(file):
    try:
        book = pd.ExcelFile(file)

        for sheet in book.sheet_names:
            df = pd.read_excel(
                file,
                sheet_name=sheet,
                header=None,
                dtype=object
            )

            for row_number, row in enumerate(
                df.itertuples(index=False, name=None), start=1
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
                    "raw_data": json.dumps(
                        values, ensure_ascii=False, default=str
                    )
                })

    except Exception as exc:
        errors.append({"file": str(file), "error": str(exc)})


def process_docx(file):
    try:
        doc = Document(file)

        for i, paragraph in enumerate(doc.paragraphs, start=1):
            add_text(file, f"Paragraph {i}", paragraph.text)

        for table_no, table in enumerate(doc.tables, start=1):
            for row_no, row in enumerate(table.rows, start=1):
                values = [cell.text.strip() for cell in row.cells]
                add_text(
                    file,
                    f"Table {table_no}, row {row_no}",
                    " | ".join(values)
                )

    except Exception as exc:
        errors.append({"file": str(file), "error": str(exc)})


def process_pdf(file):
    try:
        with fitz.open(file) as pdf:
            for page_no, page in enumerate(pdf, start=1):
                add_text(file, f"Page {page_no}", page.get_text("text"))

    except Exception as exc:
        errors.append({"file": str(file), "error": str(exc)})


def process_legacy_doc(file):
    """Try converting old .doc files using LibreOffice if installed."""
    libreoffice = shutil.which("soffice")

    if not libreoffice:
        errors.append({
            "file": str(file),
            "error": "Legacy DOC skipped: LibreOffice not installed"
        })
        return

    temp_dir = OUTPUT_DIR / "doc_conversion"
    temp_dir.mkdir(exist_ok=True)

    try:
        subprocess.run(
            [
                libreoffice,
                "--headless",
                "--convert-to", "txt:Text",
                "--outdir", str(temp_dir),
                str(file)
            ],
            check=True,
            capture_output=True,
            text=True
        )

        converted = temp_dir / (file.stem + ".txt")

        if converted.exists():
            add_text(file, "Converted DOC text", converted.read_text(
                encoding="utf-8", errors="replace"
            ))

    except Exception as exc:
        errors.append({"file": str(file), "error": str(exc)})


def process_text(file):
    try:
        content = file.read_text(encoding="utf-8", errors="replace")
        add_text(file, "Text content", content)
    except Exception as exc:
        errors.append({"file": str(file), "error": str(exc)})


def main():
    if not ZIP_FILE.exists():
        print(f"ZIP tidak ditemukan: {ZIP_FILE}")
        print("Pastikan ZIP berada di folder data.")
        return

    print("1. Mengekstrak ZIP...")
    safe_extract(ZIP_FILE, EXTRACT_DIR)

    files = [
        f for f in EXTRACT_DIR.rglob("*")
        if f.is_file()
    ]

    print(f"2. Menemukan {len(files)} file. Memulai pembacaan...")

    for index, file in enumerate(files, start=1):
        ext = file.suffix.lower()

        inventory.append({
            "file": str(file.relative_to(EXTRACT_DIR)),
            "extension": ext,
            "size_bytes": file.stat().st_size
        })

        if ext in [".xlsx", ".xls", ".ods"]:
            process_excel(file)
        elif ext == ".docx":
            process_docx(file)
        elif ext == ".pdf":
            process_pdf(file)
        elif ext == ".doc":
            process_legacy_doc(file)
        elif ext in [".txt", ".csv"]:
            process_text(file)

        print(f"[{index}/{len(files)}] {file.name}")

    print("3. Menyimpan hasil ekstraksi...")

    pd.DataFrame(inventory).to_csv(
        OUTPUT_DIR / "file_inventory.csv",
        index=False,
        encoding="utf-8-sig"
    )

    pd.DataFrame(spreadsheet_rows).to_json(
        OUTPUT_DIR / "spreadsheet_rows.jsonl",
        orient="records",
        lines=True,
        force_ascii=False
    )

    pd.DataFrame(text_blocks).to_json(
        OUTPUT_DIR / "text_blocks.jsonl",
        orient="records",
        lines=True,
        force_ascii=False
    )

    pd.DataFrame(errors).to_csv(
        OUTPUT_DIR / "extraction_errors.csv",
        index=False,
        encoding="utf-8-sig"
    )

    summary = pd.DataFrame([
        {"metric": "Total files", "value": len(inventory)},
        {"metric": "Spreadsheet rows", "value": len(spreadsheet_rows)},
        {"metric": "Text blocks", "value": len(text_blocks)},
        {"metric": "Extraction errors", "value": len(errors)}
    ])

    summary.to_excel(
        OUTPUT_DIR / "extraction_summary.xlsx",
        index=False
    )

    print("\n=== EKSTRAKSI SELESAI ===")
    print(summary.to_string(index=False))
    print(f"\nHasil tersimpan di: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
