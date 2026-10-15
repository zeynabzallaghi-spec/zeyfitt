#!/usr/bin/env python3
"""مرحله ۱۱ — بکاپ سازگار با وضعیت journal و دسترسی هم‌زمان + تست restore.

- بکاپ با Connection.backup() استاندارد sqlite3: یک تراکنش خواندنی سازگار
  می‌گیرد (حتی حین نوشتن فرایند دیگر) — برخلاف کپی سادهٔ فایل که در حین
  نوشتن می‌تواند ناسازگار باشد.
- restore فقط روی نسخهٔ کپی در /tmp انجام می‌شود؛ دیتابیس اصلی هرگز
  تغییر نمی‌کند.
"""
import shutil
import sqlite3
import sys
import time
from pathlib import Path

SRC = Path("/home/z/my-project/db/custom.db")
BACKUP_DIR = Path("/home/z/my-project/backups")
BACKUP_DIR.mkdir(exist_ok=True)
STAMP = time.strftime("%Y%m%d-%H%M%S")
DST = BACKUP_DIR / f"custom-{STAMP}.db"
RESTORE_COPY = Path(f"/tmp/p11-restore-test-{STAMP}.db")


def snapshot_counts(path):
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    tables = [
        r[0]
        for r in con.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
    ]
    counts = {t: con.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0] for t in tables}
    integrity = con.execute("PRAGMA integrity_check").fetchone()[0]
    con.close()
    return counts, integrity


def main():
    print(f"source: {SRC}")
    src = sqlite3.connect(f"file:{SRC}?mode=ro", uri=True)
    dst = sqlite3.connect(DST)
    src.backup(dst)  # پشتیبان‌گیری سازگار — مدیریت قفل داخلی
    dst.close()
    src.close()
    print(f"backup written: {DST} ({DST.stat().st_size} bytes)")

    main_counts, main_integrity = snapshot_counts(SRC)
    backup_counts, backup_integrity = snapshot_counts(DST)

    # تست restore: کپی بکاپ به مسیر آزمایشی و بازکردن آن به‌عنوان دیتابیس مستقل
    shutil.copy2(DST, RESTORE_COPY)  # کپی از فایل بسته و ثابت — بی‌خطر
    dst2 = sqlite3.connect(RESTORE_COPY)
    dst2.execute("PRAGMA foreign_keys=ON")
    r = dst2.execute("SELECT count(*) FROM user").fetchone()[0]
    sample = dst2.execute("SELECT email FROM user ORDER BY createdAt LIMIT 3").fetchall()
    dst2.close()

    print(f"main integrity: {main_integrity} | backup integrity: {backup_integrity}")
    print(f"restore-copy opened as independent DB, user rows: {r}, sample: {[e for (e,) in sample]}")

    drift = {t: (main_counts[t], backup_counts[t]) for t in main_counts if main_counts[t] != backup_counts[t]}
    print(f"row-count drift main vs backup: {drift if drift else 'NONE'}")
    ok = (
        main_integrity == "ok"
        and backup_integrity == "ok"
        and not drift
        and r == main_counts["user"]
    )
    print("BACKUP_RESTORE_TEST:", "PASS" if ok else "FAIL")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
