#!/usr/bin/env python3
# p22-persistence-insert.py — ساخت رکوردهای آزمایشی کاملاً مجزا و مشخص‌دار
# در دیتابیس زنده (بدون هیچ دست‌کاری به حساب‌های واقعی) + کنترل منفی FK.
#
# رکوردها:
#   user           p22test-user-0001     (ایمیل @test.invalid — واقعی نیست)
#   FitnessProfile p22test-profile-0001  (رابطه ۱:۱)
#   weightEntry    p22test-weight-0001/2 (رابطه ۱:N — دو رکورد)
# کنترل منفی: تلاش برای weightEntry یتیم (والد ناموجود) — باید با
# IntegrityError رد شود تا اثبات شود قید FK روی اتصال فعال است.
import glob
import os
import re
import sqlite3
import time
from datetime import datetime, timezone

DB = "/home/z/my-project/db/custom.db"
USER_ID = "p22test-user-0001"
PROFILE_ID = "p22test-profile-0001"
W1, W2 = "p22test-weight-0001", "p22test-weight-0002"
NOW = datetime.now(timezone.utc)


def detect_dt_sample():
    """نمونه واقعی قالب DateTime که Prisma می‌نویسد — ابتدا دیتابیس زنده،
    سپس جدیدترین بکاپ‌های محلی (چون ممکن است جدول‌ها الان خالی باشند)."""
    candidates = [DB] + sorted(glob.glob(
        "/home/z/my-project/backups/*.db"),
        key=os.path.getmtime, reverse=True)
    for path in candidates:
        try:
            c = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
            for q in ('SELECT createdAt FROM "user" LIMIT 1',
                      "SELECT createdAt FROM weightEntry LIMIT 1",
                      "SELECT createdAt FROM FitnessProfile LIMIT 1"):
                try:
                    row = c.execute(q).fetchone()
                except sqlite3.Error:
                    continue
                if row and row[0]:
                    c.close()
                    return str(row[0])
            c.close()
        except sqlite3.Error:
            continue
    return None


def fmt_like(sample):
    """تولید رشته زمان «اکنون» در همان قالب رکوردهای واقعی Prisma."""
    if not sample:
        return NOW.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3] + " +00:00"
    patterns = [
        (r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$",
         lambda: NOW.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"),
        (r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} \+00:00$",
         lambda: NOW.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3] + " +00:00"),
        (r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \+00:00$",
         lambda: NOW.strftime("%Y-%m-%d %H:%M:%S") + " +00:00"),
        (r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+00:00$",
         lambda: NOW.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "+00:00"),
        (r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$",
         lambda: NOW.strftime("%Y-%m-%dT%H:%M:%S") + "Z"),
    ]
    for pat, fn in patterns:
        if re.match(pat, sample):
            return fn()
    return NOW.isoformat(sep="T", timespec="milliseconds")


sample = detect_dt_sample()
if sample is not None and str(sample).strip().isdigit():
    # قالب واقعی نوشته‌های اپ (Prisma/better-auth روی SQLite): integer میلی‌ثانیه
    ts = int(NOW.timestamp() * 1000)
    print("detected_datetime_format:", repr(sample), "-> app convention: epoch-ms INTEGER")
else:
    ts = fmt_like(sample)
    print("detected_datetime_format:", repr(sample) if sample else "(none — fallback)")
print("using_timestamp:", repr(ts))

con = sqlite3.connect(DB, timeout=15)
con.row_factory = sqlite3.Row
cur = con.cursor()
cur.execute("PRAGMA foreign_keys=ON")
enforced = cur.execute("PRAGMA foreign_keys").fetchone()[0]
print("PRAGMA foreign_keys (this connection):", enforced)

# ---------- idempotency: حذف رکوردهای آزمایشی قبلی همین اسکریپت ----------
cur.execute("BEGIN")
try:
    cur.execute("DELETE FROM weightEntry WHERE id LIKE 'p22test-%' "
                "OR userId LIKE 'p22test-%'")
    cur.execute("DELETE FROM FitnessProfile WHERE id LIKE 'p22test-%' "
                "OR userId LIKE 'p22test-%'")
    cur.execute('DELETE FROM "user" WHERE id LIKE "p22test-%"')
    cur.execute("COMMIT")
    print("pre-clean of prior p22test rows: done")
except Exception:
    cur.execute("ROLLBACK")
    raise

# ---------- کنترل منفی: درج یتیم باید رد شود ----------
cur.execute("BEGIN")
orphan_rejected = False
try:
    cur.execute(
        "INSERT INTO weightEntry (id, userId, weightKg, recordedAt, createdAt) "
        "VALUES (?,?,?,?,?)",
        ("p22test-orphan-NEG", "p22-nonexistent-parent", 1.0, ts, ts))
    print("UNEXPECTED: orphan insert succeeded — FK NOT enforced!")
except sqlite3.IntegrityError as e:
    orphan_rejected = True
    print("negative_control: orphan weightEntry correctly rejected ->", e)
finally:
    cur.execute("ROLLBACK")
if not orphan_rejected:
    print("ABORT: foreign keys are not enforced — no test rows written")
    con.close()
    raise SystemExit(1)

# ---------- درج رکوردهای آزمایشی ----------
cur.execute("BEGIN")
try:
    cur.execute(
        'INSERT INTO "user" (id, name, email, emailVerified, image, '
        "createdAt, updatedAt) VALUES (?,?,?,?,?,?,?)",
        (USER_ID, "[P22-TEST] Persistence Test — auto-deleted",
         "p22-persistence-test@test.invalid", 0, None, ts, ts))
    cur.execute(
        "INSERT INTO FitnessProfile (id, userId, displayName, equipmentJson, "
        "limitationsJson, allergiesJson, units, createdAt, updatedAt) "
        "VALUES (?,?,?,?,?,?,?,?,?)",
        (PROFILE_ID, USER_ID, "آزمون ماندگاری P22 (حذف خودکار)",
         "[]", "[]", "[]", "metric", ts, ts))
    cur.execute(
        "INSERT INTO weightEntry (id, userId, weightKg, recordedAt, createdAt) "
        "VALUES (?,?,?,?,?)", (W1, USER_ID, 88.8, ts, ts))
    cur.execute(
        "INSERT INTO weightEntry (id, userId, weightKg, recordedAt, createdAt) "
        "VALUES (?,?,?,?,?)", (W2, USER_ID, 77.7, ts, ts))
    cur.execute("COMMIT")
except Exception:
    cur.execute("ROLLBACK")
    raise

# ---------- بازخوانی بلافاصله ----------
print("-- immediate read-back --")
u = cur.execute('SELECT id, email, name FROM "user" WHERE id=?',
                (USER_ID,)).fetchone()
print("user:", dict(u) if u else None)
p = cur.execute("SELECT id, displayName FROM FitnessProfile WHERE userId=?",
                (USER_ID,)).fetchone()
print("profile:", dict(p) if p else None)
ws = cur.execute("SELECT id, weightKg FROM weightEntry WHERE userId=? "
                 "ORDER BY weightKg", (USER_ID,)).fetchall()
print("weights:", [dict(r) for r in ws])
integ = cur.execute("PRAGMA integrity_check").fetchone()[0]
fkv = len(cur.execute("PRAGMA foreign_key_check").fetchall()).__int__()
print("post-insert integrity:", integ, "| fk_violations:", fkv)
con.close()
print("INSERT_DONE: 1 user + 1 profile + 2 weight entries (isolated, marked)")
