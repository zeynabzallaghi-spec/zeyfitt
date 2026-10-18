#!/usr/bin/env python3
# p22-runtime-confirm.py — اثبات اینکه سرورِ «در حال اجرا» واقعاً از کدام
# فایل دیتابیس استفاده می‌کند: خواندن DATABASE_URL از environ پروسه سرور +
# fd های بازِ اشاره‌کننده به custom.db (ادله سطح سیستم‌عامل، نه حدس).
import os

NEEDLES = ("custom.db",)


def cmdline_of(pid):
    try:
        with open(f"/proc/{pid}/cmdline", "rb") as fh:
            return fh.read().replace(b"\0", b" ").decode(errors="replace").strip()
    except Exception:
        return ""


def env_db_of(pid):
    try:
        with open(f"/proc/{pid}/environ", "rb") as fh:
            for kv in fh.read().split(b"\0"):
                if kv.startswith(b"DATABASE_URL="):
                    return kv.decode(errors="replace")
    except Exception:
        pass
    return None


def ppid_of(pid):
    try:
        with open(f"/proc/{pid}/stat") as fh:
            return int(fh.read().split(") ")[-1].split()[1])
    except Exception:
        return None


def is_server_cmd(cmd):
    if not cmd:
        return False
    low = cmd.lower()
    return ("bun run dev" in low or "next-server" in low or "next dev" in low
            or "prisma" in low and "my-project" in low)


print("== runtime DB confirmation ==")
fd_holders = []
servers = []
for pid in os.listdir("/proc"):
    if not pid.isdigit():
        continue
    cmd = cmdline_of(pid)
    db_fds = []
    try:
        for fd in os.listdir(f"/proc/{pid}/fd"):
            try:
                target = os.readlink(f"/proc/{pid}/fd/{fd}")
            except OSError:
                continue
            if any(n in target for n in NEEDLES):
                db_fds.append(f"{fd}->{target}")
    except OSError:
        pass
    if db_fds:
        fd_holders.append((pid, cmd, env_db_of(pid), db_fds,
                           ppid_of(pid)))
    if is_server_cmd(cmd):
        servers.append((pid, cmd, env_db_of(pid), ppid_of(pid)))

print("-- server-ish processes (bun/next/prisma) --")
for pid, cmd, env_db, ppid in servers:
    print(f"pid={pid} ppid={ppid} env_database_url={env_db}")
    print(f"   cmd={cmd[:120]}")

print("-- ANY process holding custom.db open --")
if not fd_holders:
    print("(none — server may be down)")
for pid, cmd, env_db, fds, ppid in fd_holders:
    print(f"pid={pid} ppid={ppid} env_database_url={env_db}")
    print(f"   cmd={cmd[:120]}")
    for f in fds:
        print(f"   fd {f}")
print("== end ==")
