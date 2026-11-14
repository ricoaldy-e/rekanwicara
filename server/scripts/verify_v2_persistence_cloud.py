"""Run real SDK persistence checks; credentials stay in memory and hidden terminal input."""

import argparse
import getpass
import json
import os
import shutil
import subprocess
import sys
import warnings
from pathlib import Path
from uuid import uuid4

SERVER = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVER))

from app.core.settings import Settings  # noqa: E402


def prepare() -> Path:
    run_id = uuid4().hex
    directory = SERVER / ".venv" / f"v2-persistence-{run_id}"
    directory.mkdir()
    ids = [str(uuid4()) for _ in range(4)]
    marker = f"sdk_v2_test_{run_id}"
    plan = {
        "item_id": marker,
        "session_id": marker,
        "attempt_ids": ids[:3],
        "invalid_attempt_id": ids[3],
        "all_attempt_ids": ids,
    }
    path = directory / "plan.json"
    path.write_text(json.dumps(plan, indent=2), encoding="utf-8")
    sql = (
        "-- Only this run's synthetic metadata; never policies, schema, or old user data.\n"
        "begin;\n"
        "delete from public.attempts where id in ("
        + ",".join(f"'{key}'::uuid" for key in ids)
        + f") and session_id = '{marker}' and item_id = '{marker}';\n"
        + f"delete from public.progress where item_id = '{marker}';\ncommit;\n"
    )
    (directory / "cleanup.sql").write_text(sql, encoding="utf-8")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prepare-only", action="store_true")
    parser.add_argument("--plan", type=Path)
    parser.add_argument(
        "--allow-operator-cleanup",
        action="store_true",
        help="Requires explicit approval; service key is used only for exact test-row cleanup.",
    )
    args = parser.parse_args()
    plan = args.plan.resolve() if args.plan else prepare()
    if args.prepare_only:
        print(json.dumps({"plan": str(plan), "cleanup_sql": str(plan.with_name("cleanup.sql"))}))
        return 0
    if not sys.stdin.isatty():
        raise RuntimeError("SecureTerminalRequired")
    node = shutil.which("node")
    if node is None:
        raise RuntimeError("NodeRequired")
    settings = Settings()
    config = {
        "project": settings.supabase_url,
        "public_key": settings.supabase_anon_key.get_secret_value(),
        "operator_key": settings.supabase_service_role_key.get_secret_value()
        if args.allow_operator_cleanup
        else None,
        "accounts": [],
    }
    warnings.simplefilter("error", getpass.GetPassWarning)
    for alias in ("A", "B"):
        config["accounts"].append(
            {
                "alias": alias,
                "email": getpass.getpass(f"Email akun {alias} (disembunyikan): "),
                "password": getpass.getpass(f"Password akun {alias} (disembunyikan): "),
            }
        )
    result = subprocess.run(
        [node, str(Path(__file__).with_suffix(".cjs")), str(plan)],
        input=json.dumps(config),
        text=True,
        capture_output=True,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        timeout=600,
        check=False,
    )
    for line in result.stdout.splitlines():
        try:
            value = json.loads(line)
        except ValueError:
            continue
        if isinstance(value, dict):
            print(json.dumps(value), flush=True)
    if result.returncode != 0:
        print("Cloud verification did not fully pass; inspect the sanitized results.json.")
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
