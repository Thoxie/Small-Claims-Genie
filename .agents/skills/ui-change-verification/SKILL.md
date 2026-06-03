---
name: ui-change-verification
description: Standing instructions for verifying UI changes are actually implemented. Always follow after making any visible UI change the user requested.
---

# UI Change Verification

After completing any UI change the user asked for, always verify it is actually visible — never just assert that the code looks right.

## Required Steps After Every UI Change

1. **Read the modified file** to confirm the change is present in the source.
2. **Take a screenshot** of the relevant page/step to confirm it is visually rendered correctly.
3. **Check the published app vs dev preview gap** — if the user is testing on a `.replit.app` URL, changes only appear after a redeploy. Always trigger `suggest_deploy` after significant UI changes so the live app stays current.

## Key Rules

- Never tell the user a change is done based on code inspection alone — confirm it is rendered.
- If the change involves a button, section, or element that could be hidden (below the fold, conditional, inside a long page), scroll-check or sticky-check that it is always visible.
- If the user says "the change didn't implement," trust them immediately. Do not re-assert the code is correct — investigate scroll/visibility, published vs dev mismatch, and conditional rendering.

## Common Failure Modes to Watch For

- **Button bar below the fold**: On long pages, button bars at the bottom require scrolling. Use `sticky bottom-0` to keep them always visible.
- **Conditional rendering hiding elements**: `{prop && <Button>}` means the button disappears if the prop isn't passed. Always pass required props from the parent.
- **Published app lag**: Dev preview updates immediately via HMR. The `.replit.app` published URL only updates on redeploy. Always `suggest_deploy` after UI changes.
- **Claiming work was done without checking**: A previous session said "it's already implemented" without verifying. Always read the file or take a screenshot to confirm.

## Prompt From User That Triggers This

Any UI change request — buttons, layouts, colors, text, visibility. Always verify after completing.
