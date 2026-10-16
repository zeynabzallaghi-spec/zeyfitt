#!/usr/bin/env python3
"""Add zodIssueCodes to VALIDATION responses in remaining API routes (deterministic patch)."""
import re, pathlib

ROUTES = {
    "src/app/api/sessions/route.ts": ("startSessionSchema|setLogSchema|finishSessionSchema", "firstSessionError"),
    "src/app/api/sessions/start/route.ts": ("startSessionSchema", "firstSessionError"),
    "src/app/api/sessions/[id]/sets/route.ts": ("setLogSchema", "firstSessionError"),
    "src/app/api/sessions/[id]/finish/route.ts": ("finishSessionSchema", "firstSessionError"),
    "src/app/api/sessions/[id]/exercises/route.ts": ("addExerciseSchema", "firstSessionError"),
    "src/app/api/sessions/[id]/exercises/[exId]/route.ts": ("exerciseStatusSchema", "firstSessionError"),
    "src/app/api/food-logs/route.ts": ("foodLogPayloadSchema|foodLogEditSchema", "firstFoodLogError"),
    "src/app/api/food-logs/[id]/route.ts": ("foodLogEditSchema", "firstFoodLogError"),
    "src/app/api/assistant/conversations/[id]/messages/route.ts": ("assistantMessageSchema", "firstAssistantError"),
    "src/app/api/plans/[id]/route.ts": ("planTitleSchema", None),
    "src/app/api/nutrition/[id]/route.ts": ("nutritionPatchSchema", None),
    "src/app/api/nutrition/[id]/shopping/route.ts": (None, None),
}

BASE = pathlib.Path("/home/z/my-project")

def add_import(src: str) -> str:
    if "zodIssueCodes" in src:
        return src
    # insert after first import block line containing "@/lib/session" or first import line
    lines = src.split("\n")
    for i, line in enumerate(lines):
        if line.startswith("import "):
            # find end of import statements (last consecutive import line)
            j = i
            while j < len(lines) and (lines[j].startswith("import ") or lines[j].startswith("} from")):
                j += 1
            lines.insert(j, 'import { zodIssueCodes } from "@/lib/api-issues";')
            return "\n".join(lines)
    return src

for rel in ROUTES:
    path = BASE / rel
    if not path.exists():
        print(f"SKIP missing {rel}")
        continue
    src = path.read_text()
    orig = src
    # 1) augment single-line validation json objects
    src = re.sub(
        r"\{ error: \"VALIDATION\", message: (first\w+Error\(parsed\.error\)) \}",
        r'{ error: "VALIDATION", message: \1, issues: zodIssueCodes(parsed.error) }',
        src,
    )
    # multi-line form used in some routes:
    src = re.sub(
        r"\{\s*error: \"VALIDATION\",\s*message: (first\w+Error\(parsed\.error\)),\s*\}",
        r'{ error: "VALIDATION",\n          message: \1,\n          issues: zodIssueCodes(parsed.error),\n        }',
        src,
    )
    # 2) add import
    src = add_import(src)
    if src != orig:
        path.write_text(src)
        print(f"PATCHED {rel}")
    else:
        print(f"NO-CHANGE {rel}")
