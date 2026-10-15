#!/usr/bin/env python3
"""Double-fork daemonize the Next.js dev server so it survives tool calls.

The sandbox kills processes spawned within a tool call once the call ends.
Classic double-fork daemonization reparents the server to init (PID 1),
which has preserved it across calls in earlier phases.
"""
import os
import sys
import time
import secrets

PROJECT = "/home/z/my-project"
LOG = os.path.join(PROJECT, "dev.log")


def ensure_auth_secret(env: dict) -> None:
    """Self-healing: the sandbox reset may wipe .env (untracked) down to a
    template. In production better-auth throws BetterAuthError without
    BETTER_AUTH_SECRET and every SSR/API returns 500, so generate a strong
    secret on the fly and persist it back to .env. Trade-off: sessions
    signed with a lost secret become invalid (users re-login) — acceptable;
    a dead site is not."""
    if env.get("BETTER_AUTH_SECRET"):
        return
    value = secrets.token_urlsafe(48)
    env["BETTER_AUTH_SECRET"] = value
    try:
        with open(os.path.join(PROJECT, ".env"), "a", encoding="utf-8") as fh:
            fh.write(f"BETTER_AUTH_SECRET={value}\n")
    except OSError:
        pass


def daemonize_and_run(mode: str) -> None:
    # First fork: parent exits, child becomes session leader.
    pid = os.fork()
    if pid > 0:
        return  # parent returns to main
    os.setsid()
    # Second fork: grandchild is no longer a session leader,
    # can never acquire a controlling terminal.
    pid2 = os.fork()
    if pid2 > 0:
        os._exit(0)
    # Grandchild: fully detached daemon.
    os.chdir(PROJECT)
    devnull = os.open(os.devnull, os.O_RDWR)
    os.dup2(devnull, 0)
    log_fd = os.open(LOG, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
    os.dup2(log_fd, 1)
    os.dup2(log_fd, 2)
    # Runtime env: inject every KEY=VALUE from .env (standalone server
    # does not load .env by itself).
    env = dict(os.environ)
    env_path = os.path.join(PROJECT, ".env")
    try:
        with open(env_path, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                env.setdefault(key.strip(), value.strip())
    except FileNotFoundError:
        pass
    env.setdefault("DATABASE_URL", "file:/home/z/my-project/db/custom.db")
    ensure_auth_secret(env)
    if mode == "prod":
        env["NODE_ENV"] = "production"
        env.setdefault("PORT", "3000")
        env.setdefault("HOSTNAME", "0.0.0.0")
        os.execvpe("bun", ["bun", ".next/standalone/server.js"], env)
    else:
        os.execvpe("bun", ["bun", "run", "dev"], env)


def main() -> None:
    mode = sys.argv[1] if len(sys.argv) > 1 else "dev"
    daemonize_and_run(mode)
    # Parent: give the daemon time to boot, then verify.
    deadline = time.time() + 60
    last_err = None
    while time.time() < deadline:
        probe = os.system(
            'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null'
        )
        # curl exit status in high byte of os.system result; 200 body is echoed
        out = os.popen(
            'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null'
        ).read().strip()
        if out == "200":
            print(f"SERVER_READY http=200 after {60 - (deadline - time.time()):.1f}s")
            sys.exit(0)
        last_err = out
        time.sleep(2)
    print(f"SERVER_NOT_READY last_probe={last_err!r}")
    sys.exit(1)


if __name__ == "__main__":
    main()
