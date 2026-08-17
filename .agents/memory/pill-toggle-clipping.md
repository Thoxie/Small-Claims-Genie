---
name: Pill toggle overflow-hidden glyph clipping
description: overflow:hidden on a rounded pill container clips letter glyphs (E→I) at small sizes. Applies to web (Tailwind) and mobile (React Native StyleSheet).
---

# Pill toggle overflow-hidden glyph clipping

**Rule:** Never use `overflow: hidden` (web) or `overflow: "hidden"` (mobile) on a rounded pill container that holds text buttons. At small font sizes, the rounded clip region shears the horizontal bars off glyphs like "E", making them render as "I".

**Why:** "EN"→"IN" and "ES"→"IS" appeared in production on both the web navbar toggle and the mobile Dashboard header toggle. The clipping happens where the pill's rounded corners intersect the leftmost/rightmost button text.

**How to apply:**
- Web: Remove `overflow-hidden` from the container. Give the first button `rounded-l-full` and the last button `rounded-r-full` so the active highlight still looks like a pill segment.
- Mobile: Remove `overflow: "hidden"` from the container StyleSheet. Add `borderTopLeftRadius`/`borderBottomLeftRadius` to the left button style and `borderTopRightRadius`/`borderBottomRightRadius` to the right button style.
- Also applies to any short all-caps label (e.g. "EN", "ES", "CA", "TX") in a small pill — always verify at the actual rendered size before shipping.
