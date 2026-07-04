#!/bin/bash
# Get git diff in a format suitable for code review
# Shows changed files and the changes for each

set -e

# Get list of changed files
CHANGED_FILES=$(git diff --name-only)

if [ -z "$CHANGED_FILES" ]; then
  echo "No changes to review."
  exit 0
fi

echo "=== Changed Files ==="
git diff --name-status
echo ""

echo "=== File-by-File Diff ==="
# For each changed file, show the diff
for file in $CHANGED_FILES; do
  echo ""
  echo "--- File: $file ---"
  git diff "$file" | head -100  # Limit to first 100 lines per file
done
