/**
 * sc140-fields.ts
 *
 * Typed coordinate constants for SC-140 (Notice of Appeal — Limited Civil Case).
 * Rendering technique: PNG overlay — pdf-lib draws text/xmarks directly at
 * fixed (x, y) positions on top of the background image.
 *
 * All coordinates are in PDF points (72 pt = 1 inch) measured from the
 * bottom-left of the page. The `v` closure in the definition adds LIFT (4.5 pt)
 * to every y value before drawing; the constants here store the pre-LIFT base
 * coordinate so that the intent is visible at the call site.
 *
 * Use these constants instead of raw inline literals so that TypeScript catches
 * mismatches and editors provide autocomplete.
 */

export const SC140_LIFT = 4.5;

export const SC140_COORDS = {
  text: {
    // Header
    courtName:          { x: 285,        y: 754 },
    caseNumber:         { x: 900 * 0.24, y: 745 },

    // Parties
    plaintiffName:      { x:  72, y: 725 },
    plaintiffPhone:     { x:  72, y: 707 },
    defendantName:      { x: 350, y: 725 },
    defendantPhone:     { x: 350, y: 707 },

    // Body
    appealFiledDate:    { x:  72, y: 430 },
    appellantName:      { x:  72, y: 387 },
  },

  xmarks: {
    // Appellant role
    appellantRolePlaintiff:    { cx: 120, cy: 554 },
    appellantRoleDefendant:    { cx: 120, cy: 537 },

    // Appeal type
    appealTypeJudgment:        { cx:  49, cy: 460 },
    appealTypeMotionToVacate:  { cx: 252, cy: 460 },
  },
} as const;
