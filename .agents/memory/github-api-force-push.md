---
name: GitHub API push fallback
description: Safely update a repository tree when direct GitHub Git transport cannot authenticate.
---

When direct Git transport cannot authenticate but the GitHub connector is
authorized, use the Git Data API through the connector instead of embedding a
token in the remote URL. Read the remote recursive tree, upload only local
blobs whose hashes are absent remotely, create a `base_tree` delta, verify the
new remote tree SHA equals `git rev-parse HEAD^{tree}`, and create a commit
with the current remote tip as its parent. Update `refs/heads/main` without
force when it is a normal fast-forward.

**Why:** A successful content mirror is more important than preserving the
local commit object when Git transport credentials are stale or unavailable.
The full-tree Git API request can return a connector 502; a `base_tree` delta
is smaller and still permits exact tree-hash verification.

**How to apply:** Never print or store GitHub credentials in a remote URL.
Do not use this fallback to bypass a blocked secret scan or to overwrite remote
history. After the update, report the remote commit SHA and the matching
local/remote tree SHA; be explicit if the remote commit object differs from
local history.