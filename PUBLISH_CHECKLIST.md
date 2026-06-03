# Pre-Publish Checklist — Small Claims Genie

Run this before every publish to catch regressions early.

---

## Step 1 — Automated API checks (30 seconds)

```bash
bash scripts/smoke-test.sh
```

All checks must pass before proceeding. If any fail, fix the issue first.

---

## Step 2 — Manual UI checklist (5–8 minutes)

Open the app URL and verify each item below. Check it off as you go.

### Authentication
- [ ] Sign-in page loads with logo and taglines
- [ ] Can sign in successfully — lands on dashboard or resume page
- [ ] Signing out and back in works
- [ ] Sign-up flow creates a new account

### Case Creation
- [ ] Navigate to "Start a New Case"
- [ ] Claim type buttons are clickable (Money Owed, Unpaid Debt, Property Damage, etc.)
- [ ] Typing a title, selecting a claim type, and clicking "Create My Case →" creates a case
- [ ] App redirects to the case workspace (URL changes to /cases/[id])

### Intake Tab
- [ ] All intake fields are editable (plaintiff, defendant, claim amount, county, etc.)
- [ ] Readiness score updates as fields are filled in
- [ ] Saving intake data persists on page refresh

### Document Upload
- [ ] Click the Documents tab in the workspace
- [ ] Upload a PDF, DOCX, or image file
- [ ] Document appears in the list with status "processing" then "complete"
- [ ] Uploaded document name and type display correctly

### AI Chat
- [ ] Click the "AI Chat" tab
- [ ] Type a message and hit Send
- [ ] AI responds with streaming text (words appear progressively — not all at once)
- [ ] If a document was uploaded, ask "Can you summarize my document?" — AI references it by name
- [ ] Voice-to-text: hold the mic button, speak, release — transcribed text appears in the input field and sends

### Demand Letter
- [ ] Click the "Demand Letter" tab
- [ ] Click generate — streaming text appears progressively
- [ ] Download PDF button produces a downloadable PDF
- [ ] Letter content references the actual case details (plaintiff name, defendant name, amount)

### SC-100 Form
- [ ] Click the "Forms" tab (or navigate to /sc100)
- [ ] "Download SC-100 PDF" button works and downloads a multi-page PDF
- [ ] Open the PDF — plaintiff name, phone, address appear in the correct form fields
- [ ] Defendant info appears correctly in Section 2
- [ ] Claim amount appears in Section 3
- [ ] Page backgrounds are crisp and legible (not blurry or pixelated)

### Public Pages
- [ ] Landing page (/) loads correctly with hero section and CTA buttons
- [ ] /how-it-works page loads
- [ ] /faq page loads
- [ ] /counties page shows all 58 CA counties
- [ ] /tos and /terms pages load without errors

---

## Step 3 — Publish

Once all checks above pass, publish the app.

---

## Common Regression Patterns to Watch For

| Symptom | Likely Cause |
|---|---|
| Chat sends message but nothing appears | Auth token not attached to POST — check `useAuth` in ChatTab |
| Streaming text appears all at once instead of word-by-word | SSE connection broken — check EventSource or fetch stream in ChatTab |
| Case creation form stays on same screen | Vite proxy not running — restart the frontend workflow |
| All API calls return 401 | Clerk token getter not set — check `AuthTokenBridge` in App.tsx |
| Documents upload but AI can't see them | OCR may still be processing — wait a moment and retry |
| Blank screen after sign-in | Auth state race condition — hard refresh (Ctrl+Shift+R) |
| SC-100 PDF downloads but fields are blank | Case intake data not saved — complete intake tab first |
| Voice mic button does nothing | Browser microphone permission not granted — check browser settings |
| Demand letter generates generic text | Case context not built — ensure intake fields are filled in |
