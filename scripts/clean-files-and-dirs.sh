#!/bin/bash
# Cleans up files and directories left behind after a git reset/discard.
# Safe to run repeatedly — skips each step if there is nothing to remove.

# ── Remove .sfdx/agents ───────────────────────────────────────────────────────
if [ -d ".sfdx/agents" ]; then
    echo "Removing .sfdx/agents..."
    rm -rf ".sfdx/agents"
    echo "Done."
else
    echo "No .sfdx/agents directory found."
fi

# ── Remove untracked files and directories from the project ───────────────────
echo "Removing untracked files..."
git clean -fd
echo "Done."

# ── Remove empty directories from the project ────────────────────────────────
echo "Scanning for empty directories..."
COUNT=$(find . -not -path './.git/*' -not -path './.sf/*' -not -path './.sfdx/*' -type d -empty | wc -l | tr -d ' ')

if [ "$COUNT" -eq 0 ]; then
    echo "No empty directories found."
    exit 0
fi

echo "Removing $COUNT empty director$([ "$COUNT" -eq 1 ] && echo 'y' || echo 'ies'):"
find . -not -path './.git/*' -not -path './.sf/*' -not -path './.sfdx/*' -type d -empty -print -delete
echo "Done."
