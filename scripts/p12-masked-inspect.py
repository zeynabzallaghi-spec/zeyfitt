#!/usr/bin/env python3
"""مرحله ۱۲ — بررسی ماسک‌شدهٔ یافته‌های content-scan (بدون چاپ مقدار واقعی)."""
import re
import subprocess
import sys

MASK = "***MASKED***"


def show(path):
    try:
        out = subprocess.run(
            ["git", "show", f"HEAD:{path}"], capture_output=True, text=True, timeout=20
        ).stdout
    except subprocess.TimeoutExpired:
        print(f"{path}: git show TIMEOUT")
        return
    return out


print("=== 1. docs/database-setup.md — lines with URL creds (values masked) ===")
txt = show("docs/database-setup.md")
url_re = re.compile(r"[a-z][a-z0-9+]*://[^\s:@\"']+:[^@\s/\"']+@")
for i, line in enumerate(txt.splitlines(), 1):
    if url_re.search(line):
        print(f"line {i}: {url_re.sub(MASK, line).strip()[:160]}")

print()
print("=== 2. skills templates — AKIA occurrences (masked) ===")
files = [
    "skills/design/design-templates/digital-eguide/social-carousel.html",
    "skills/design/design-templates/blog-post/皮肤专题｜关于故障的一次重读.html",
]
akia = re.compile(r"AKIA[0-9A-Z]{16}")
for p in files:
    txt = show(p)
    if txt is None:
        continue
    hits = akia.findall(txt)
    uniq = {}
    for h in hits:
        uniq[h] = uniq.get(h, 0) + 1
    print(f"{p}: total={len(hits)} distinct={len(uniq)}")
    for h, n in uniq.items():
        print(f"  {h[:4]}{'X' * (len(h) - 4)} (len={len(h)}) x{n}")
    # context: یک قطعهٔ کوتاه ماسکشده دور اولین hit
    m = akia.search(txt)
    if m:
        s, e = max(0, m.start() - 60), min(len(txt), m.end() + 60)
        print(f"  context: ...{akia.sub(MASK, txt[s:e])}...")
print()
print("=== 3. was AKIA string maybe a known AWS docs example? ===")
for p in files:
    txt = show(p)
    if not txt:
        continue
    m = akia.search(txt)
    if m:
        print(f"{p}: matched_value_known_aws_example={m.group(0) == 'AKIAIOSFODNN7EXAMPLE'}")
