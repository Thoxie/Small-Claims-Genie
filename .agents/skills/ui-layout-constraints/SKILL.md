---
name: ui-layout-constraints
description: Pre-flight check for UI layout and width changes. Use before implementing any UI change that affects width, padding, spacing, or positioning of elements. Prevents wasted effort from parent container conflicts.
---

# UI Layout Constraints Pre-Flight Check

Before coding any UI change that affects width, padding, spacing, or element positioning, run this check first. Do not code until the full constraint chain is understood.

## When to Use

- Making an element wider or narrower
- Changing padding or margins on a container
- Moving or repositioning content
- Aligning elements across different sections of the page

## Check Procedure

### Step 1 — Identify the target component file
Find the exact file and line where the element lives.

### Step 2 — Trace the full parent chain
Work outward from the target element, reading each parent wrapper's classes. Look for:
- `px-*`, `pl-*`, `pr-*` — horizontal padding constraining inner width
- `max-w-*` — max-width caps
- `container` — Tailwind container class (adds responsive max-width + centering)
- `mx-auto` — centering that may interact with width changes
- `overflow-hidden` — clips content that bleeds outside bounds

Do this by searching for where the component is imported and rendered, then reading the surrounding JSX up the tree.

### Step 3 — Map the full padding stack
Write out every layer of padding from the outermost wrapper to the target element. Example:

```
Page layout:       px-4  (16px each side)
Workspace wrapper: px-4  (16px each side)  ← workspace.tsx line 223
FormsTab inner:    px-4  (16px each side)  ← forms-tab.tsx line 1352
Total each side:   48px
```

### Step 4 — Determine the right fix
| Situation | Fix |
|-----------|-----|
| Inner component padding only | Reduce `px-*` on inner container |
| Parent container has padding | Use negative margins (`-mx-*`) on inner container to counteract |
| Multiple parent layers | Negate ALL parent padding layers with negative margins |
| `max-w-*` cap on ancestor | Widening inner content will not help — must change or override the cap |

### Step 5 — Confirm before coding
State the full constraint chain to the user and the proposed fix before writing any code.

## This Project's Known Constraints

- **Workspace page outer wrapper** (`workspace.tsx` ~line 223): `container mx-auto px-4 pt-0 pb-6 max-w-6xl` — applies `px-4` (16px) and `max-w-6xl` to all tab content
- **FormsTab inner container** (`forms-tab.tsx`): has its own `px-4 md:px-6` on top of the parent — total horizontal padding is ~32-40px per side
- To make a FormsTab card wider: use `-mx-4` negative margin on the FormsTab container to counteract the workspace's `px-4`
- Landing page sections: constrained by `container mx-auto max-w-5xl` or `max-w-4xl`
