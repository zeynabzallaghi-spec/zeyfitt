#!/usr/bin/env python3
"""
p195b-db-backup.py — بکاپ پیش/پس از تغییر مرحله ۱۹.۵ب (پیوست فایل درخواست مربی‌گری
+ ارتقای ادمین). همان الگوی p16/p17/p19 با SQLite backup API + راستی‌آزمایی کامل:
  - integrity_check + foreign_key_check روی فایل بکاپ
  - شمارش جداول هسته و تطبیق با دیتابیس زنده
  - گزارش sha256
حالت --post: بکاپ پس از پایان مرحله (نام فایل p195b-post-…)
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
OUT = os.path.join(OUT_DIR, f"p195b-{MODE}-phase195b-{time.strftime('%Y%m%d-%H%M%S')}.db")

CORE_TABLES = [
    "user", "account", "session", "verification", "FitnessProfile", "weightEntry",
    "WorkoutPlan", "WorkoutPlanDay", "WorkoutPlanExercise",
    "NutritionPlan", "NutritionPlanDay", "NutritionMeal", "NutritionMealItem",
    "WorkoutSession", "WorkoutSessionExercise", "WorkoutSetLog",
    "AssistantConversation", "AssistantMessage", "FoodLogEntry",
    "CoachApplication", "CoachProfile", "StudentSubscription", "CoachStudentConnection",
    "CoachWorkoutPlan", "CoachNutritionPlan", "CoachPlanDelivery",
    "CoachConversation", "CoachMessage",
    "Exercise", "ExerciseImportBatch",
    # مرحله ۱۹.۵
    "PremiumUpgradeRequest", "SupportTicket", "AdminActionLog",
    # مرحله ۱۹.۵ب — پیوست‌های درخواست مربی‌گری
    "CoachApplicationAttachment",
]


def table_counts(conn):
    cur = conn.cursor()
    counts = {}
    for t in CORE_TABLES:
        try:
            cur.execute(f'SELECT COUNT(*) FROM "{t}"')
            counts[t] = cur.fetchone()[0]
        except sqlite3.OperationalError:
            counts[t] = None
    return counts


def main():
    src = sqlite3.connect(SRC)
    dst = sqlite3.connect(OUT)
    src.backup(dst)
    dst.commit()
    src.close()
    dst.close()

    chk = sqlite3.connect(OUT)
    integrity = chk.execute("PRAGMA integrity_check").fetchone()[0]
    fk_violations = chk.execute("PRAGMA foreign_key_check").fetchall()
    live = sqlite3.connect(SRC)
    live_counts = table_counts(live)
    backup_counts = table_counts(chk)

    mismatches = {t: (live_counts[t], backup_counts[t])
                  for t in CORE_TABLES if live_counts[t] != backup_counts[t]}
    chk.close()
    live.close()

    sha = hashlib.sha256(open(OUT, "rb").read()).hexdigest()
    size = os.path.getsize(OUT)
    print(f"backup file : {OUT}")
    print(f"mode        : {MODE}")
    print(f"integrity   : {integrity}")
    print(f"fk_check    : {'OK (0 violations)' if not fk_violations else fk_violations}")
    print(f"sha256      : {sha}")
    print(f"size        : {size} bytes")
    print(f"users       : {backup_counts.get('user')}")
    print(f"exercises   : {backup_counts.get('Exercise')}")
    print(f"core_tables : {len(CORE_TABLES)}")
    if mismatches:
        print("MISMATCH    :", mismatches)
        sys.exit(1)
    if integrity != "ok" or fk_violations:
        print("BACKUP FAILED VERIFICATION")
        sys.exit(1)
    print("BACKUP VERIFIED OK")


if __name__ == "__main__":
    main()
