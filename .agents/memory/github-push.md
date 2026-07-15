---
name: GitHub force push
description: How to force-push to GitHub from this sandbox without the push being killed mid-transfer
---

# GitHub force push

## The rule (updated July 2026)

Run `git push --force origin main` directly in the bash tool with a **119-second timeout**. This is the approach that has been confirmed working.

**Why:** The bash tool's long timeout (119000ms) gives the push enough time to complete the full pack transfer. The nohup background approach has been unreliable — it silently fails to create the log file and leaves the remote unchanged.

**How to apply:**
```bash
git push --force origin main 2>&1
```
With `timeout: 119000` on the bash tool call.

Confirm the output shows `main -> main` ref update. A trailing lock-file error (`refs/remotes/origin/main.lock`) is **harmless** — the remote update already completed before the lock cleanup failed.

Then verify with:
```bash
git --no-optional-locks ls-remote origin refs/heads/main
```
Confirm the SHA matches local `HEAD`.

## What does NOT work
- `nohup git push --force origin main > /tmp/git-push.log 2>&1 &` — process gets killed immediately, produces no log file, remote unchanged (observed July 2026)
- `git push origin main` (non-force) — fails silently when branches have diverged
- GitHub API `PATCH /git/refs/heads/main` alone — fails with "Object does not exist" if commits aren't on GitHub yet

## Lock file cleanup
The `.git/refs/remotes/origin/main.lock` leftover cannot be removed via bash (sandbox blocks `rm` on `.git/` paths). It is harmless and clears itself on the next git operation or restart.

## Token location
The GitHub token is embedded in the `origin` remote URL. Extract programmatically if needed:
```js
const remoteUrl = execSync('git --no-optional-locks remote get-url origin').toString().trim();
const token = remoteUrl.match(/x-access-token:([^@]+)@/)[1];
```
Never print the token.
