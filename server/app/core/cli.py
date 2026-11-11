"""Run local dataset tools without exposing recording paths in tracebacks."""

import sys
from collections.abc import Callable


def run_cli(main: Callable[[], int | None]) -> None:
    try:
        code = main()
    except Exception as exc:  # noqa: BLE001 - suppress paths from third-party exceptions
        print(f"tool_failed type={type(exc).__name__}", file=sys.stderr)
        code = 1
    raise SystemExit(code)
