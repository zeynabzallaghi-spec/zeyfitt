#!/usr/bin/env python3
# p22-db-inspect.py — بازرسی فقط-خواندنی از دیتابیس زنده SQLite (Task 22).
# Usage: python3 p22-db-inspect.py --label <name> [--test-rows] [--users]
import argparse
import os
import sqlite3
import time

DB = "/home/z/my-project/db/custom.db"
TEST_USER_ID = "p22test-user-0001"

ap = argparse.ArgumentParser()
ap.add_argument("--label", default="unlabeled")
ap.add_argument("--test-rows", action="store_true")
ap.add_argument("--users", action="store_true")
a = ap.parse_args()

st = os.stat(DB)
print(f"== [{a.label}] {time.strftime('%Y-%m-%d %H:%M:%S')} UTC ==")
print(f"file={DB}")
print(f"size={st.st_size} inode={st.st_ino} "
      f"mtime={time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(st.st_mtime))}Z")

con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
con.row_factory = sqlite3.Row
cur = con.cursor()

print("integrity_check:", cur.execute("PRAGMA integrity_check").fetchone()[0])
print("quick_check:", cur.execute("PRAGMA quick_check").fetchone()[0])
fkv = cur.execute("PRAGMA foreign_key_check").fetchall()
print("foreign_key_check violations:", len(fkv))
for r in fkv[:10]:
    print("   violation:", tuple(r))
print("journal_mode:", cur.execute("PRAGMA journal_mode").fetchone()[0])
print("page_count:", cur.execute("PRAGMA page_count").fetchone()[0],
      "| freelist:", cur.execute("PRAGMA freelist_count").fetchone()[0])

tables = [r[0] for r in cur.execute(
    "SELECT name FROM sqlite_master WHERE type='table' "
    "AND name NOT LIKE 'sqlite_%' ORDER BY name")]
print("tables:", len(tables))
total = 0
for t in tables:
    c = cur.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0]
    total += c
    print(f"   {t}: {c}")
print("total_rows:", total)

if a.users:
    rows = cur.execute(
        'SELECT id, name, email, emailVerified, createdAt FROM "user" '
        "ORDER BY createdAt").fetchall()
    print("users:", len(rows))
    for r in rows:
        print(f"   - {r['email']} | name={r['name']!r} | "
              f"verified={r['emailVerified']} | createdAt={r['createdAt']} | "
              f"id={r['id'][:16]}...")

if a.test_rows:
    u = cur.execute('SELECT * FROM "user" WHERE id=?',
                    (TEST_USER_ID,)).fetchone()
    print("test_user_present:", bool(u))
    if u:
        print("   email:", u["email"], "| name:", u["name"],
              "| createdAt:", u["createdAt"], "| updatedAt:", u["updatedAt"])
    p = cur.execute("SELECT * FROM FitnessProfile WHERE userId=?",
                    (TEST_USER_ID,)).fetchone()
    print("test_profile_present:", bool(p))
    if p:
        print("   displayName:", p["displayName"], "| units:", p["units"],
              "| createdAt:", p["createdAt"])
    w = cur.execute("SELECT id, weightKg, recordedAt, createdAt FROM weightEntry "
                    "WHERE userId=? ORDER BY recordedAt",
                    (TEST_USER_ID,)).fetchall()
    print("test_weight_entries:", len(w))
    for r in w:
        print(f"   {r['id']} weightKg={r['weightKg']} "
              f"recordedAt={r['recordedAt']} createdAt={r['createdAt']}")
    neg = cur.execute("SELECT count(*) FROM weightEntry WHERE id=?",
                      ("p22test-orphan-NEG",)).fetchone()[0]
    print("orphan_negative_control_rows (must be 0):", neg)

con.close()
print("== end ==")
