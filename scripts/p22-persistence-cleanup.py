#!/usr/bin/env python3
# p22-persistence-cleanup.py — حذف کامل و دقیق رکوردهای آزمایشی P22
# (فقط رکوردهای شناسه‌دار p22test-* / کاربر آزمایشی) + راستی‌آزمایی نهایی.
import sqlite3
import time

DB = "/home/z/my-project/db/custom.db"
USER_ID = "p22test-user-0001"
TEST_EMAIL_LIKE = "p22-%@test.invalid"  # هم کاربر SQL و هم کاربر ثبت‌نام API

con = sqlite3.connect(DB, timeout=15)
cur = con.cursor()
cur.execute("PRAGMA foreign_keys=ON")

before = {
    t: cur.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0]
    for t in ("user", "FitnessProfile", "weightEntry")
}
print("counts before cleanup:", before)

cur.execute("BEGIN")
try:
    # فرزندان کاربران آزمایشی (شامل کاربر ثبت‌نام API که id تصادفی دارد)
    cur.execute(
        "DELETE FROM weightEntry WHERE userId IN "
        '(SELECT id FROM "user" WHERE email LIKE ?)', (TEST_EMAIL_LIKE,))
    cur.execute(
        "DELETE FROM FitnessProfile WHERE userId IN "
        '(SELECT id FROM "user" WHERE email LIKE ?)', (TEST_EMAIL_LIKE,))
    cur.execute("DELETE FROM weightEntry WHERE userId=?", (USER_ID,))
    cur.execute("DELETE FROM FitnessProfile WHERE userId=?", (USER_ID,))
    # جدول‌های auth — ترتیب صریح (نشست/اکانت با CASCADE هم حذف می‌شوند)
    cur.execute("DELETE FROM session WHERE userId IN "
                '(SELECT id FROM "user" WHERE email LIKE ?)', (TEST_EMAIL_LIKE,))
    cur.execute("DELETE FROM account WHERE userId IN "
                '(SELECT id FROM "user" WHERE email LIKE ?)', (TEST_EMAIL_LIKE,))
    cur.execute("DELETE FROM verification WHERE identifier LIKE ?",
                (TEST_EMAIL_LIKE,))
    cur.execute('DELETE FROM "user" WHERE email LIKE ? OR id=?',
                (TEST_EMAIL_LIKE, USER_ID))
    # پاک‌سازی دفاعی هر ردیف آزمایشی احتمالی دیگر با پیشوند p22test-
    cur.execute("DELETE FROM weightEntry WHERE id LIKE 'p22test-%'")
    cur.execute("DELETE FROM FitnessProfile WHERE id LIKE 'p22test-%'")
    cur.execute('DELETE FROM "user" WHERE id LIKE "p22test-%"')
    cur.execute("COMMIT")
except Exception:
    cur.execute("ROLLBACK")
    raise

after = {
    t: cur.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0]
    for t in ("user", "FitnessProfile", "weightEntry")
}
print("counts after cleanup:", after)

leftover_user = cur.execute(
    'SELECT count(*) FROM "user" WHERE id LIKE "p22test-%" '
    "OR email LIKE ?", (TEST_EMAIL_LIKE,)).fetchone()[0]
leftover_profile = cur.execute(
    "SELECT count(*) FROM FitnessProfile WHERE id LIKE 'p22test-%' "
    "OR userId LIKE 'p22test-%'").fetchone()[0]
leftover_weight = cur.execute(
    "SELECT count(*) FROM weightEntry WHERE id LIKE 'p22test-%' "
    "OR userId LIKE 'p22test-%'").fetchone()[0]
orphan_neg = cur.execute(
    "SELECT count(*) FROM weightEntry WHERE id='p22test-orphan-NEG'"
).fetchone()[0]

integ = cur.execute("PRAGMA integrity_check").fetchone()[0]
fkv = len(cur.execute("PRAGMA foreign_key_check").fetchall())
con.close()

print("leftover_test_rows (user/profile/weight):",
      leftover_user, leftover_profile, leftover_weight)
print("orphan_negative_control_rows (must be 0):", orphan_neg)
print("integrity:", integ, "| fk_violations:", fkv)
ok = (leftover_user == 0 and leftover_profile == 0 and leftover_weight == 0
      and orphan_neg == 0 and integ == "ok" and fkv == 0)
print("CLEANUP_VERIFIED:", "YES" if ok else "NO")
print(f"finished at {time.strftime('%Y-%m-%d %H:%M:%S')} UTC")
raise SystemExit(0 if ok else 1)
