# Archive policy for large HTML backups and assets

This project maintains a policy to avoid large inline base64 assets tracked in the repo. To keep the repository history clean and fast, follow these guidelines:

## Goals
- Prevent large inline data URIs (PNG/JPEG base64) being committed into tracked files.
- Keep copies of historical backups outside the repo root as compressed archives.
- Automate the detection and archive compression via local hooks and CI where possible.

## Rules
1. Do not commit files containing inline `data:image/...;base64,...` payloads larger than 100 KB.
2. If you need to keep a backup of a generated HTML file with large embedded assets, place them into `archived_html_backups/` and compress into `index_html_backups.zip`.
3. The `archived_html_backups/index_html_backups.zip` can be kept locally, but it is ignored by `.gitignore` so it will not be tracked.
4. For historical clean-up (shrinking repo history) we recommend using a separate branch or archive location (object store) to retain historic blobs permanently.

## How to archive large backups
Run the included script to compress the `index.html.*` backup files and remove the raw files to keep the repo tidy.

```
cd <repo-root>
scripts/zip-archives.sh
```

This script will:
- Compress `index.html.*` variants present in the repo root into `archived_html_backups/index_html_backups.zip`.
- Remove the raw files after compression and update the git index (if run with `--commit`).

## Pre-commit / CI enforcement
We provide a pre-commit hook that compresses archives automatically if present. See `scripts/hooks/pre-commit` for instructions on installing the hook.

A CI job is present as a safeguard to either zip or fail if the repo includes uncompressed backup files. The CI job can optionally auto-commit using the `GITHUB_TOKEN` if enabled.

## Best practice
- Prefer storing asset files in `/assets/` or a CDN instead of embedding images inline.
- Keep inline `data:image` occurrences limited to small SVGs, such as icons used in `manifest.json`.
- If you must keep a backup with inline images, compress it and store it in a designated archive location, not in the working tree.
