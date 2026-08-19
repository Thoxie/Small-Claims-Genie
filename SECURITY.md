# Security Policy

## Secret handling

Live credentials belong in **Replit Secrets** or a local developer credential
store — never in tracked files, command-line arguments, remote URLs, shell
history, source archives, or database exports. The committed `.env.example`
file may contain variable names and clearly non-live placeholders only.

The portable SQL export intentionally redacts credential-shaped values that can
appear in synchronized Stripe webhook metadata. After restoring an export,
configure live integrations from their source systems and Replit Secrets.

## Local secret scanning

This repository has a dependency-free scanner configured in
`.secret-scanner.toml` and checked into `.githooks/`.

Install the hooks after cloning:

```bash
bash scripts/install-git-hooks.sh
```

The pre-commit hook scans staged file content and fails the commit on a
configured credential pattern. The pre-push hook scans every newly introduced
commit in each ref being pushed, so it also catches a bad commit created before
the hook was installed.

Run scans manually:

```bash
python3 scripts/scan-secrets.py --staged
python3 scripts/scan-secrets.py --working-tree
python3 scripts/scan-secrets.py --history
```

The scanner reports paths, commit identifiers, and rule names only; it never
prints matching values.

### Deliberate bypass

Use a bypass only for a reviewed false positive and document the reason in the
commit or pull request:

```bash
git commit --no-verify
git push --no-verify
```

Do not bypass a scan for a live credential. Correct the file or move the value
to Replit Secrets instead.

## GitHub protection

GitHub Secret Scanning and Push Protection are enabled for this repository.
To verify or change them, open the repository on GitHub and go to:

**Settings → Code security and analysis → Secret Protection**.

Enable **Secret scanning** and **Push protection**. For a public repository,
these protections are available without requiring a private-repository
Advanced Security license. GitHub protection complements, rather than replaces,
the local hooks.

## If a credential is committed

1. Stop further pushes and do not paste the value into chat, tickets, or
   commit messages.
2. Identify the provider and whether the commit reached a remote repository.
   Record only the commit ID, file path, credential type, and a short prefix.
3. Revoke or rotate the specific credential when the evidence shows it was
   exposed, then update the provider or Replit Secret store.
4. Remove the value from the current branch and add a regression guard if the
   scanner missed it.
5. Decide separately whether history rewriting is warranted. Rewriting history
   does not invalidate a credential that was already exposed.
6. Review GitHub secret-scanning alerts and close them only after remediation.