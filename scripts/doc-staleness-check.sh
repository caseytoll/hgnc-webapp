#!/usr/bin/env bash
# Checks documentation staleness. Fails if non-reference docs (outside archive/) are older than STALE_DAYS (default 90).
set -euo pipefail

python3 - <<'PY'
import os
import sys
import time
import pathlib

days = int(os.environ.get("STALE_DAYS", "90"))
cutoff = time.time() - days * 86400
root = pathlib.Path("docs")
stale = []

for path in root.rglob("*.md"):
    if "archive" in path.parts:
        continue
    text = path.read_text(encoding="utf-8", errors="ignore")
    if "Type: Reference document" in text or "Reference document (stable" in text:
        continue
    if path.stat().st_mtime < cutoff:
        stale.append(path)

if stale:
    print(f"⚠️  {len(stale)} stale docs older than {days} days:")
    for p in sorted(stale, key=lambda x: x.as_posix()):
        print(f" - {p.as_posix()}")
    sys.exit(1)

print(f"✅ No stale docs older than {days} days.")
PY
