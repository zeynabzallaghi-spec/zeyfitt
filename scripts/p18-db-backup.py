#!/usr/bin/env python3
"""
p18-db-backup.py — بکاپ پیش/پس از تغییر ساختاری مرحله ۱۸ (کتابخانه عمومی گسترده)
با SQLite backup API (همان الگوی p16/p17) + راستی‌آزمایی کامل صحت بکاپ:
  - integrity_check + foreign_key_check روی فایل بکاپ
  - شمارش جداول هسته و تطبیق با دیتابیس زنده
  - گزارش sha256
حالت --post: بکاپ پس از پایان مرحله (نام فایل p18-post-phase18-…)
"""
import hashlib
import os
import sqlite3
import sys
import time

MODE = "post" if "--post" in sys.argv else "pre"
SRC = "/home/z/my-project/db/custom.db"
OUT_DIR = "/home/z/my-project/backups"
os.makedirs(OUT_DIR, exist_ok=True)
OUT = os.path.join(OUT_DIR, f"p18-{MODE}-phase18-{time.strftime('%Y%m%d-%H%M%S')}.db")

CORE_TABLES = [
    "user", "account", "session", "verification", "FitnessProfile", "weightEntry",
    "WorkoutPlan", "WorkoutPlanDay", "WorkoutPlanExercise",
    "NutritionPlan", "NutritionPlanDay", "NutritionMeal", "NutritionMealItem",
    "WorkoutSession", "WorkoutSessionExercise", "WorkoutSetLog",
    "AssistantConversation", "AssistantMessage", "FoodLogEntry",
    "CoachApplication", "CoachProfile", "StudentSubscription", "CoachStudentConnection",
    "CoachWorkoutPlan", "CoachNutritionPlan", "CoachPlanDelivery",
    "CoachConversation", "CoachMessage",
    # مرحله ۱۸ — کتابخانه عمومی حرکات
    "Exercise", "ExerciseImportBatch",
]


def table_counts(conn):
    cur = conn.cursor()
    counts = {}
    for t in CORE_TABLES:
        try:
            cur.execute(f'SELECT COUNT(*) FROM "{t}"')
            counts[t] = cur.fetchone()[0]
        except sqlite3.Error:
            counts[t] = None
    return counts


def main():
    if not os.path.exists(SRC):
        print(f"FATAL: source db missing: {SRC}")
        sys.exit(1)

    src = sqlite3.connect(SRC)
    src_ic = src.execute("PRAGMA integrity_check").fetchone()[0]
    src_fk = src.execute("PRAGMA foreign_key_check").fetchall()
    print(f"source: integrity={src_ic} fk_violations={len(src_fk)}")
    if src_ic != "ok" or src_fk:
        print("FATAL: source db unhealthy — refusing to backup")
        sys.exit(1)
    src_counts = table_counts(src)
    src.close()

    dst = sqlite3.connect(OUT)
    src = sqlite3.connect(SRC)
    src.backup(dst)
    dst.close()
    src.close()

    # راستی‌آزمایی بکاپ
    chk = sqlite3.connect(OUT)
    ic = chk.execute("PRAGMA integrity_check").fetchone()[0]
    fk = chk.execute("PRAGMA foreign_key_check").fetchall()
    chk_counts = table_counts(chk)
    chk.close()

    if ic != "ok" or fk:
        print(f"FATAL: backup verification FAILED integrity={ic} fk={len(fk)}")
        os.remove(OUT)
        sys.exit(1)
    if chk_counts != src_counts:
        print("FATAL: backup table counts differ from source")
        print(f"  src={src_counts}\n  dst={chk_counts}")
        os.remove(OUT)
        sys.exit(1)

    sha = hashlib.sha256(open(OUT, "rb").read()).hexdigest()
    size = os.path.getsize(OUT)
    print(f"backup OK ({MODE}): {OUT}")
    print(f"size={size} sha256={sha[:16]}…")
    print(f"core tables verified: {len(CORE_TABLES)}, counts match source")
    print(f"users={src_counts['user']} exercises={src_counts.get('Exercise')}")
    print("RESTORE-COMMAND: cp '" + OUT + "' " + SRC)
    return 0


if __name__ == "__main__":
    sys.exit(main())
