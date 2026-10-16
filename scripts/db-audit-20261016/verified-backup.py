#!/usr/bin/env python3
"""Create verified SQLite backup via backup API + report non-sensitive counts."""
import sqlite3, sys, datetime

SRC = "/home/z/my-project/db/custom.db"
ts = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
DST = f"/home/z/my-project/backups/custom-{ts}.db"

src = sqlite3.connect(f"file:{SRC}?mode=ro", uri=True)
dst = sqlite3.connect(DST)
src.backup(dst)
dst.commit()

ic = dst.execute("PRAGMA integrity_check").fetchone()[0]
fk = dst.execute("PRAGMA foreign_key_check").fetchall()
print(f"backup file: {DST}")
print(f"integrity: {ic} | fk_violations: {len(fk)}")

TABLES = ["user", "account", "session", "verification", "FitnessProfile",
          "weightEntry", "WorkoutPlan", "WorkoutSession", "WorkoutSetLog",
          "NutritionPlan", "FoodLogEntry", "AssistantConversation", "AssistantMessage"]
print("--- backup counts ---")
for t in TABLES:
    print(f"  {t}: {dst.execute(f'SELECT COUNT(*) FROM \"{t}\"').fetchone()[0]}")

# cross-check live vs backup counts (relation verification)
mismatch = []
for t in TABLES:
    a = src.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0]
    b = dst.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0]
    if a != b:
        mismatch.append((t, a, b))
print(f"live-vs-backup mismatches: {mismatch if mismatch else 'NONE'}")

# referential sanity without exposing data: orphan checks
orphans = []
for child, parent, col in [("account", "user", "userId"), ("session", "user", "userId"),
                           ("FitnessProfile", "user", "userId"),
                           ("AssistantConversation", "user", "userId"),
                           ("AssistantMessage", "AssistantConversation", "conversationId")]:
    q = (f"SELECT COUNT(*) FROM \"{child}\" c LEFT JOIN \"{parent}\" p ON c.\"{col}\"=p.id "
         f"WHERE c.\"{col}\" IS NOT NULL AND p.id IS NULL")
    n = dst.execute(q).fetchone()[0]
    if n:
        orphans.append((child, parent, n))
print(f"orphan rows: {orphans if orphans else 'NONE'}")

dst.close(); src.close()
