# Pre-Publish Checklist — Small Claims Genie

Run this before every publish to catch regressions early.

---

## Step 1 — Automated API checks (30 seconds)

```bash
bash scripts/smoke-test.sh
```

All checks must pass before proceeding. If any fail, fix the issue first.

---

## Step 2 — Manual UI checklist (3–5 minutes)

Open the app URL and verify each item below. Check it off as you go.

### Authentication
- [ ] Sign in page loads with logo and three taglines
- [ ] Can sign in successfully — lands on dashboard or resume page
- [ ] Signing out and back in works

### Case Creation
- [ ] Navigate to "Start a New Case"
- [ ] Form shows clickable buttons for claim type (Money Owed, Unpaid Debt, etc.)
- [ ] Typing a title and clicking a claim type, then "Create My Case →" creates a case
- [ ] App redirects to the case workspace (URL changes to /cases/[id])

### Document Upload
- [ ] Click the Documents tab in the workspace
- [ ] Upload a PDF, DOCX, or image file
- [ ] Document appears in the list with status "processing" then "complete"

### AI Chat
- [ ] Click the "AI Chat" tab
- [ ] Type a message and hit send
- [ ] AI responds with streaming text (not a blank screen or error message)
- [ ] If a document was uploaded, ask "Can you summarize my document?" — AI should reference it by name

### SC-100 Form
- [ ] Click the "SC-100" tab
- [ ] Generate PDF button works and downloads a PDF

---

## Step 3 — Publish

Once all checks above pass, publish the app.

---

## Common Regression Patterns to Watch For

| Symptom | Likely Cause |
|---|---|
| Chat sends message but nothing appears | Auth token not attached to POST — check `useAuth` in ChatTab |
| Case creation form stays on same screen | Vite proxy not running — restart the frontend workflow |
| All API calls return 401 | Clerk token getter not set — check `AuthTokenBridge` in App.tsx |
| Documents upload but AI can't see them | OCR may still be processing — wait a moment and retry |
| Blank screen after sign-in | Auth state race condition — hard refresh (Ctrl+Shift+R) |
