#!/usr/bin/env python3
"""Compare sqlite schema SQL between blob and current empty DB (read-only)."""
import sqlite3, sys

def schema_of(path):
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    rows = con.execute(
        "SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY type, name"
    ).fetchall()
    con.close()
    return {f"{t}|{n}": s for t, n, s in rows}

blob, live = sys.argv[1], sys.argv[2]
sb, sl = schema_of(blob), schema_of(live)
only_b = sorted(set(sb) - set(sl))
only_l = sorted(set(sl) - set(sb))
diff = [k for k in set(sb) & set(sl) if sb[k] != sl[k]]
print(f"schema objects: blob={len(sb)} live={len(live)}")
print(f"only in blob: {only_b}")
print(f"only in live: {only_l}")
print(f"differing SQL: {sorted(diff) if diff else 'NONE'}")
