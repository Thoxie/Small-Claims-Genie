/**
 * sc100a-fields.ts
 *
 * Typed coordinate constants for SC-100A (Other Plaintiffs or Defendants).
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

export const SC100A_LIFT = 4.5;

export const SC100A_COORDS = {
  text: {
    caseNumber:       { x: 403, y: 739 },

    // Plaintiff 1
    p1Name:           { x: 176, y: 663 },
    p1Street:         { x: 131, y: 647 },
    p1Phone:          { x: 440, y: 647 },
    p1City:           { x:  96, y: 631 },
    p1State:          { x: 299, y: 631 },
    p1Zip:            { x: 372, y: 631 },
    p1MailingStreet:  { x: 195, y: 614 },
    p1MailingCity:    { x:  96, y: 597 },
    p1MailingState:   { x: 299, y: 597 },
    p1MailingZip:     { x: 371, y: 597 },

    // Plaintiff 2
    p2Name:           { x: 168, y: 564 },
    p2Street:         { x: 131, y: 548 },
    p2Phone:          { x: 440, y: 548 },
    p2City:           { x:  96, y: 533 },
    p2State:          { x: 299, y: 533 },
    p2Zip:            { x: 371, y: 533 },

    // Defendant 1
    def1Name:         { x: 176, y: 420 },
    def1Street:       { x: 131, y: 405 },
    def1Phone:        { x: 439, y: 405 },
    def1City:         { x:  96, y: 390 },
    def1State:        { x: 299, y: 390 },
    def1Zip:          { x: 371, y: 390 },
    def1AgentName:    { x:  97, y: 319 },

    // Signature block
    signDate1:        { x:  63, y: 154 },
    signerName1:      { x:  37, y: 139 },
    signDate2:        { x:  63, y: 111 },
    signerName2:      { x:  37, y:  96 },
  },

  xmarks: {
    topCheckbox:          { cx:  66, cy: 708 },
    p1IsFictitious:       { cx: 313, cy: 586 },
    p1IsNotFictitious:    { cx: 352, cy: 586 },
    moreThanTwoDefendants:{ cx:  66, cy: 278 },
    claimAmountOver2500:  { cx: 285, cy: 260 },
    claimAmountUnder2500: { cx: 337, cy: 260 },
  },

  sigs: {
    sig1: { x: 355, y: 142 },
    sig2: { x: 355, y:  98 },
    maxW: 185,
    maxH:  38,
  },
} as const;
