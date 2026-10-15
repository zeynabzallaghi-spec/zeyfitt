#!/usr/bin/env python3
"""
یک‌بار مصرف (نسخه ۲): تبدیل اسکریپت‌های تست API مراحل ۷/۸/۹ از احراز هویت
jar به سربرگ Cookie — سرور production کوکی __Secure- می‌دهد و curl آن را
روی http نمی‌فرستد. نکته: دستورهای curl چندخطی هستند (\ ادامه)، پس خط
AUTH باید بعد از «خط بستن فرمان» درج شود، نه بعد از خط اول.
"""

JAR_DEF = {
    "test-phase7-api.sh": [
        'JA="/tmp/p7-auth-hdr-a.txt"',
        'JB="/tmp/p7-auth-hdr-b.txt"',
        'JA2="/tmp/p7-auth-hdr-a2.txt"',
    ],
    "test-phase8-api.sh": [
        'JA="/tmp/p8-auth-hdr-a.txt"',
        'JB="/tmp/p8-auth-hdr-b.txt"',
    ],
    "test-phase9-api.sh": [
        'JA="/tmp/p9-auth-hdr-a.txt"',
        'JB="/tmp/p9-auth-hdr-b.txt"',
    ],
}

AUTH_SNIPPET = 'AUTH_{tag}="Cookie: $(grep -o \'__Secure-fitcoach\\.session_token=[^;]*\' "{var}" | head -1)"'

for name, defs in JAR_DEF.items():
    path = f"scripts/{name}"
    src = open(path, encoding="utf-8").read()

    # تعریف فایل سربرگ به‌جای jar (متغیر JA/JB با نقش جدید)
    old_ja = [l for l in src.split("\n") if l.startswith('JA="')][0]
    src = src.replace(old_ja, "\n".join(defs), 1)
    # حذف تعریف قدیمی JB/JA2 (اگر جداگانه مانده باشد)
    for junk in ['JB="/tmp/p7-cookie-b.txt"', 'JA2="/tmp/p7-cookie-a2.txt"', 'JB="/tmp/p8-cookie-b.txt"', 'JB="/tmp/p9-cookie-b.txt"']:
        src = src.replace(junk + "\n", "")

    # گرفتن سربرگ به‌جای jar (اول JA2)
    src = src.replace("-c $JA2", "-D $JA2")
    src = src.replace("-c $JA", "-D $JA")
    src = src.replace("-c $JB", "-D $JB")

    # استفاده‌ها
    src = src.replace('-b $JA2', '-H "$AUTH_A2"')
    src = src.replace('-b $JA', '-H "$AUTH_A"')
    src = src.replace('-b $JB', '-H "$AUTH_B"')

    # درج AUTH بعد از «خط بستن» هر فرمان احراز هویت چندخطی
    lines = src.split("\n")
    out = []
    pending = None  # (tag, var)
    for line in lines:
        out.append(line)
        if "curl" in line:
            if "-D $JA2" in line:
                pending = ("A2", "$JA2")
            elif "-D $JA" in line:
                pending = ("A", "$JA")
            elif "-D $JB" in line:
                pending = ("B", "$JB")
        if pending is not None and line.rstrip().endswith(")"):
            tag, var = pending
            out.append(AUTH_SNIPPET.format(tag=tag, var=var))
            pending = None
    open(path, "w", encoding="utf-8").write("\n".join(out))
    print(f"patched {name}")
