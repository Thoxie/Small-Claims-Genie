/**
 * mc030-fields.ts
 *
 * Typed coordinate constants for MC-030 (Declaration).
 * Rendering technique: PNG overlay — pdf-lib draws text/xmarks directly at
 * fixed (x, y) positions on top of the background image.
 *
 * All coordinates are in PDF points (72 pt = 1 inch) measured from the
 * bottom-left of the page. The drawing helpers in the definition apply LIFT
 * and DOWN offsets at call time; these constants store the pre-offset base
 * coordinates so that the intent is visible at the call site.
 *
 * Body layout constants (MC030_BODY_SIZE, MC030_BODY_MAX_W, MC030_MAX_LINES)
 * are re-exported from mc030-definition.ts so that external callers
 * (e.g. demand-letter.ts) can continue to import them from the definition file
 * without change. The remaining layout values that appear only inside the
 * definition are centralised here.
 *
 * Use these constants instead of raw inline literals so that TypeScript catches
 * mismatches and editors provide autocomplete.
 */

export const MC030_LIFT = 4.5;
export const MC030_DOWN = 6;

export const MC030_COORDS = {
  text: {
    // Declarant info block (top-left)
    declarantName:      { x:  48, y: 734 },
    declarantAddress:   { x:  48, y: 721 },
    declarantCityLine:  { x:  48, y: 707 },
    declarantPhone:     { x: 127, y: 676 },
    declarantEmail:     { x: 127, y: 665 },
    declarantAttorney:  { x: 127, y: 651 },

    // Court info block
    courtCounty:        { x: 238, y: 636 },
    courtStreet:        { x: 127, y: 625 },
    courtCityZip:       { x: 127, y: 602 },
    branchName:         { x: 127, y: 591 },

    // Case caption
    plaintiffName:      { x: 154, y: 573 },
    defendantName:      { x: 154, y: 556 },
    caseNumber:         { x: 413, y: 544 },

    // Signature block (uses vs helper — LIFT only, no DOWN)
    signDate:           { x:  77, y: 157 },
  },

  xmarks: {
    underPenaltyOfPerjury: { cx: 408, cy: 80 },
  },

  body: {
    startY:    494,
    x:          36,
    maxW:      540,
    size:       10.5,
    lineH:      11.5,
    maxLines:   26,
    titleSize:  11,
    titleLines:  2,
  },

  sig: {
    x:    370,
    y:    112,
    maxW: 190,
    maxH:  42,
  },
} as const;
