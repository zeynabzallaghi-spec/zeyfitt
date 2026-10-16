#!/usr/bin/env python3
"""مرحله ۱۲ — بکاپ امن دیتابیس زنده با SQLite Backup API + اعتبارسنجی.

- منبع فقط با اتصال read-only باز می‌شود؛ دیتابیس اصلی هرگز نوشته نمیشود.
- بکاپ با Connection.backup() استاندارد: یک تراکنش خواندنیِ سازگار با
  journal/WAL و دسترسی همزمان سرور می‌گیرد — نه کپی خام فایل.
- اعتبارسنجی: PRAGMA integrity_check + PRAGMA foreign_key_check روی بکاپ
  و مقایسهٔ شمارش رکورد همهٔ جدول‌ها بین اصلی و بکاپ.
- سیاست گزارش: فقط نام جدول و «تعداد» چاپ میشود — هیچ ایمیل/مقدار شخصی یا
  محرمانه چاپ نمیشود.
- بکاپ در backups/ (gitignore شده) با دسترسی 0600 نگه داشته میشود.
"""
import sqlite3
import sys
import time
from pathlib import Path

SRC = Path("/home/z/my-project/db/custom.db")
BACKUP_DIR = Path("/home/z/my-project/backups")
BACKUP_DIR.mkdir(exist_ok=True)
STAMP = time.strftime("%Y%m%d-%H%M%S")
DST = BACKUP_DIR / f"custom-{STAMP}.db"


def audit(path, label):
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    tables = [
        r[0]
        for r in con.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
    ]
    counts = {t: con.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0] for t in tables}
    integrity = con.execute("PRAGMA integrity_check").fetchone()[0]
    fk_violations = len(con.execute("PRAGMA foreign_key_check").fetchall())
    con.close()
    print(
        f"[{label}] integrity={integrity} fk_violations={fk_violations} tables={len(tables)}"
    )
    return counts, integrity, fk_violations


def main():
    if not SRC.exists():
        print(f"LIVE_DB_MISSING: {SRC}")
        sys.exit(1)

    src = sqlite3.connect(f"file:{SRC}?mode=ro", uri=True)
    dst = sqlite3.connect(DST)
    src.backup(dst)  # پشتیبانگیری سازگار — مدیریت قفل داخلی sqlite
    dst.close()
    src.close()
    DST.chmod(0o600)
    print(f"backup written: {DST} ({DST.stat().st_size} bytes, mode=600)")

    main_counts, main_integrity, main_fk = audit(SRC, "main")
    backup_counts, backup_integrity, backup_fk = audit(DST, "backup")

    print("--- row counts (table: main vs backup) ---")
    for t in sorted(main_counts):
        mark = "" if main_counts[t] == backup_counts.get(t) else "  <-- DRIFT"
        print(f"{t}: {main_counts[t]} vs {backup_counts.get(t)}{mark}")

    drift = {t for t in main_counts if main_counts[t] != backup_counts.get(t)}
    missing = set(main_counts) - set(backup_counts)
    ok = (
        main_integrity == "ok"
        and backup_integrity == "ok"
        and main_fk == 0
        and backup_fk == 0
        and not drift
        and not missing
    )
    print("BACKUP_VALIDATION:", "PASS" if ok else "FAIL")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
