#!/usr/bin/env python3
"""Read-only inspection of recovered DB blobs: integrity + non-sensitive record counts."""
import sqlite3, sys

TABLES = [
    "user", "account", "session", "verification", "FitnessProfile",
    "weightEntry", "WorkoutPlan", "WorkoutPlanDay", "WorkoutPlanExercise",
    "WorkoutSession", "WorkoutSessionExercise", "WorkoutSetLog",
    "NutritionPlan", "NutritionPlanDay", "NutritionMeal", "NutritionMealItem",
    "FoodLogEntry", "AssistantConversation", "AssistantMessage",
]

for path in sys.argv[1:]:
    print(f"=== {path} ===")
    try:
        con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
        cur = con.cursor()
        ic = cur.execute("PRAGMA integrity_check").fetchone()[0]
        fk = cur.execute("PRAGMA foreign_key_check").fetchall()
        print(f"integrity: {ic} | fk_violations: {len(fk)}")
        names = {r[0] for r in cur.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")}
        for t in TABLES:
            if t not in names:
                print(f"  {t}: MISSING TABLE")
                continue
            n = cur.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0]
            print(f"  {t}: {n}")
        con.close()
    except Exception as e:
        print(f"  ERROR: {e}")
    print()
