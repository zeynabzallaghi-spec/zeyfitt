#!/usr/bin/env python3
# p22-db-backup.py — بکاپ سازگار (consistent) از دیتابیس زنده با API رسمی
# sqlite3 backup + راستی‌آزمایی مستقل نسخه کپی (integrity + FK + جداول هسته).
import hashlib
import os
import sqlite3
import sys
import time

DB = "/home/z/my-project/db/custom.db"
ts = time.strftime("%Y%m%d-%H%M%S")
OUT = f"/home/z/my-project/backups/p22-pre-persistence-test-{ts}.db"

src = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
dst = sqlite3.connect(OUT)
src.backup(dst)  # کپی آنلاین و سازگار حتی در حین فعالیت
dst.close()
src.close()

# راستی‌آزمایی مستقل نسخه کپی
v = sqlite3.connect(f"file:{OUT}?mode=ro", uri=True)
integrity = v.execute("PRAGMA integrity_check").fetchone()[0]
fkv = len(v.execute("PRAGMA foreign_key_check").fetchall())
tables = {r[0] for r in v.execute(
    "SELECT name FROM sqlite_master WHERE type='table'")}
v.close()

h = hashlib.sha256()
with open(OUT, "rb") as fh:
    for chunk in iter(lambda: fh.read(1 << 20), b""):
        h.update(chunk)
digest = h.hexdigest()
os.chmod(OUT, 0o600)

core = {"user", "account", "session", "FitnessProfile",
        "WorkoutPlan", "NutritionPlan"}
print("backup:", OUT)
print(f"size={os.path.getsize(OUT)} sha256={digest}")
print("integrity:", integrity, "| fk_violations:", fkv,
      "| core_tables_present:", core <= tables)
ok = integrity == "ok" and fkv == 0 and core <= tables
print("BACKUP_VERIFIED:", "YES" if ok else "NO")
sys.exit(0 if ok else 1)
