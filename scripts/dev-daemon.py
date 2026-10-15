#!/usr/bin/env python3
"""مرحله ۱۱ — دیمون double-fork برای next dev روی پورت دلخواه (پیش‌فرض 3001).
برای بازتولید هشدارهای dev-only (hydration / duplicate-key) بدون دست‌زدن به
سرور production روی 3000. همان الگوی daemon-start.py — فقط حالت dev با پورت.
"""
import os
import sys
import time

PROJECT = "/home/z/my-project"
PORT = sys.argv[1] if len(sys.argv) > 1 else "3001"
LOG = f"/tmp/p11-dev-{PORT}.log"


def daemonize():
    pid = os.fork()
    if pid > 0:
        return False
    os.setsid()
    pid2 = os.fork()
    if pid2 > 0:
        os._exit(0)
    os.chdir(PROJECT)
    devnull = os.open(os.devnull, os.O_RDWR)
    os.dup2(devnull, 0)
    log_fd = os.open(LOG, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
    os.dup2(log_fd, 1)
    os.dup2(log_fd, 2)
    env = dict(os.environ)
    env["NODE_ENV"] = "development"
    env["PORT"] = PORT
    try:
        with open(os.path.join(PROJECT, ".env"), encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, _, v = line.partition("=")
                    env.setdefault(k.strip(), v.strip())
    except FileNotFoundError:
        pass
    env.setdefault("DATABASE_URL", "file:/home/z/my-project/db/custom.db")
    # سقف heap تا OOM killer سندباکس فعال نشود (حالت dev با Turbopack پرحافظه است)
    env.setdefault("NODE_OPTIONS", "--max-old-space-size=1536")
    os.execvpe("bun", ["bun", "next", "dev", "-p", PORT], env)
    return True  # unreachable


def main():
    child = daemonize()
    if not child:
        # والد: صبر برای بالا آمدن
        deadline = time.time() + 90
        while time.time() < deadline:
            out = os.popen(
                f'curl -s -o /dev/null -w "%{{http_code}}" --max-time 3 '
                f"http://localhost:{PORT}/ 2>/dev/null"
            ).read().strip()
            if out == "200":
                print(f"DEV_READY port={PORT}")
                sys.exit(0)
            time.sleep(2)
        print("DEV_NOT_READY")
        sys.exit(1)


if __name__ == "__main__":
    main()
