"""Safely convert and validate data.json without losing existing data.

Actions performed by this script:
- Create a timestamped backup of the original `data.json`.
- Attempt to detect UTF encoding (tries UTF-8, UTF-16 LE/BE) and read the file.
- Parse JSON and write a pretty-printed UTF-8 `data.cleaned.json` file.
- If parsing fails, preserves the backup and prints helpful diagnostics.

Usage (from repo root):
  python scripts/fix_data_json.py
"""
from __future__ import annotations

import json
import shutil
from datetime import datetime
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data.json"
BACKUP_DIR = ROOT / "data_backups"


def make_backup(src: Path) -> Path:
    BACKUP_DIR.mkdir(exist_ok=True)
    ts = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    dst = BACKUP_DIR / f"data.json.bak.{ts}"
    shutil.copy2(src, dst)
    return dst


def try_read_with_encodings(path: Path, encodings=("utf-8", "utf-16", "utf-16-le", "utf-16-be")):
    last_exc = None
    for enc in encodings:
        try:
            text = path.read_text(encoding=enc)
            return text, enc
        except Exception as e:
            last_exc = e
    raise last_exc


def main():
    if not DATA_PATH.exists():
        print(f"ERROR: {DATA_PATH} not found.")
        sys.exit(2)

    print(f"Backing up {DATA_PATH}...")
    backup = make_backup(DATA_PATH)
    print(f"Backup created at: {backup}")

    print("Attempting to read with common encodings...")
    try:
        text, enc = try_read_with_encodings(DATA_PATH)
    except Exception as e:
        print("Failed to read file with utf-8/utf-16 family encodings:", e)
        print("Original file preserved at:", backup)
        sys.exit(3)

    print(f"Read file using encoding: {enc}. Now validating JSON...")
    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        print("JSON decode error:", e)
        print("Backup preserved at:", backup)
        sys.exit(4)

    cleaned_path = ROOT / "data.cleaned.json"
    cleaned_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote cleaned UTF-8 JSON to: {cleaned_path}")
    print("Operation completed successfully. Original backed up; no data was deleted.")


if __name__ == '__main__':
    main()
