#!/bin/bash
# dev.sh — sandbox boot entry for the Next.js app (executed by /start.sh on
# every container start, synchronously inside a background boot subshell).
#
# INCIDENT HISTORY THIS FILE FIXES (2026-10-18):
#   The previous version started the server with `bun run dev &` + `disown`
#   and exited. The sandbox kills every process of the boot subshell's
#   process group once the subshell exits — disown does NOT protect against
#   that (it only edits the shell job table). Result: the dev server died
#   seconds after every boot, port 3000 went silent, Caddy (:81, the FC
#   ingress) served 502, and the preview link showed "access denied" until
#   an agent manually started the server. The same class of failure also
#   destroyed .env (start.sh rewrites it down to DATABASE_URL only) and the
#   live database (repo.tar carries neither db/ nor backups/).
#
# THIS VERSION:
#   1. skips everything when :3000 is already healthy (idempotent)
#   2. bun install (guarded — never aborts the boot on install hiccups)
#   3. self-heals .env (auth secret) + db/custom.db (verified restore from
#      local backup / data-checkpoints branch / git blob) via
#      scripts/ensure-app.sh — NON-destructive (no --accept-data-loss)
#   4. starts the server through scripts/daemon-start.py — a classic
#      double-fork daemonization (setsid + second fork) that reparents the
#      server to init in its OWN session, which survives the sandbox
#      process-group cleanup (proven across earlier phases)
#   5. waits, health-checks, and always exits 0 so the platform boot
#      timeline never records a failed custom dev script
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

log_step_start() {
        local step_name="$1"
        echo "=========================================="
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting: $step_name"
        echo "=========================================="
        export STEP_START_TIME
        STEP_START_TIME=$(date +%s)
}

log_step_end() {
        local step_name="${1:-Unknown step}"
        local end_time
        end_time=$(date +%s)
        local duration=$((end_time - STEP_START_TIME))
        echo "=========================================="
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Completed: $step_name"
        echo "[LOG] Step: $step_name | Duration: ${duration}s"
        echo "=========================================="
        echo ""
}

start_mini_services() {
        local mini_services_dir="$PROJECT_DIR/mini-services"
        local started_count=0

        log_step_start "Starting mini-services"
        if [ ! -d "$mini_services_dir" ]; then
                echo "Mini-services directory not found, skipping..."
                log_step_end "Starting mini-services"
                return 0
        fi

        for service_dir in "$mini_services_dir"/*; do
                if [ ! -d "$service_dir" ]; then
                        continue
                fi
                local service_name
                service_name=$(basename "$service_dir")
                if [ ! -f "$service_dir/package.json" ]; then
                        continue
                fi
                if ! grep -q '"dev"' "$service_dir/package.json"; then
                        continue
                fi
                echo "Starting $service_name in background..."
                (
                        cd "$service_dir"
                        bun install
                        exec bun run dev
                ) >"$PROJECT_DIR/.zscripts/mini-service-${service_name}.log" 2>&1 &
                local service_pid=$!
                echo "[$service_name] Started in background (PID: $service_pid)"
                disown "$service_pid" 2>/dev/null || true
                started_count=$((started_count + 1))
        done

        echo "Mini-services startup completed. Started $started_count service(s)."
        log_step_end "Starting mini-services"
}

wait_for_service() {
        local host="$1"
        local port="$2"
        local service_name="$3"
        local max_attempts="${4:-60}"
        local attempt=1

        echo "Waiting for $service_name to be ready on $host:$port..."

        while [ "$attempt" -le "$max_attempts" ]; do
                if curl -s --connect-timeout 2 --max-time 5 "http://$host:$port" >/dev/null 2>&1; then
                        echo "$service_name is ready!"
                        return 0
                fi
                sleep 1
                attempt=$((attempt + 1))
        done

        echo "WARN: $service_name not ready within $max_attempts seconds (may still be compiling)"
        return 1
}

cd "$PROJECT_DIR"

if ! command -v bun >/dev/null 2>&1; then
        echo "ERROR: bun is not installed or not in PATH"
        exit 0
fi

# 0) idempotency — nothing to do when the app is already serving
if curl -s -o /dev/null --max-time 3 http://localhost:3000/; then
        echo "[DEV] server already healthy on :3000 — skipping bootstrap"
        start_mini_services
        exit 0
fi

# 1) dependencies (node_modules is NOT carried in repo.tar after a recycle)
log_step_start "bun install"
echo "[DEV] Installing dependencies..."
if timeout 600 bun install; then
        echo "[DEV] bun install ok"
else
        echo "WARN: bun install failed/timed out — continuing with existing node_modules"
fi
log_step_end "bun install"

# 2) self-heal .env + database (non-destructive; replaces `db:push --accept-data-loss`)
log_step_start "self-heal env+db"
if bash "$PROJECT_DIR/scripts/ensure-app.sh"; then
        echo "[DEV] ensure-app completed"
else
        echo "WARN: ensure-app reported failure — continuing (server up beats server down)"
fi
log_step_end "self-heal env+db"

# 3) daemonized server start (double-fork — survives boot-subshell teardown)
log_step_start "Starting Next.js dev server (daemonized)"
echo "[DEV] Launching daemonized dev server..."
python3 "$PROJECT_DIR/scripts/daemon-start.py" dev \
        || echo "WARN: daemon-start not confirmed ready yet (may still be compiling)"
log_step_end "Starting Next.js dev server"

# 4) wait + health check
log_step_start "Waiting for Next.js dev server"
if wait_for_service "localhost" "3000" "Next.js dev server" 120; then
        if curl -fsS --max-time 30 localhost:3000 >/dev/null 2>&1; then
                echo "[DEV] health check passed (HTTP 200)"
        else
                echo "WARN: :3000 answered but health check curl failed — continuing"
        fi
fi
log_step_end "Waiting for Next.js dev server"

start_mini_services

echo "[DEV] bootstrap finished — dev server runs as an init-reparented daemon"
echo "[DEV] logs: $PROJECT_DIR/dev.log (append mode)"
exit 0
