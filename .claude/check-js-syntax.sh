#!/bin/bash
# Hook script: Check JS syntax after Write/Edit
# CLAUDE_FILE_PATHS is comma-separated list of files
IFS=',' read -ra FILES <<< "$CLAUDE_FILE_PATHS"
for f in "${FILES[@]}"; do
  if [[ "$f" == *.js ]] && [[ -f "$f" ]]; then
    node --check "$f" 2>&1
  fi
done
