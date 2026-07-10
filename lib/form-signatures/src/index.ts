/**
 * Single source of truth for signature-image placement on generated court forms.
 *
 * WHY THIS EXISTS
 * ----------------
 * Signed-PDF end-to-end tests (`scripts/src/test-*-signed.ts`) verify that the
 * plaintiff signature image landed in the correct spot by rendering the page to
 * PNG and checking that the expected region contains dark pixels. Both the form
 * definition (which *draws* the signature) and the test (which *crops* the
 * rendered page) need the same coordinates. Historically each test hard-coded
 * its own copy of those magic numbers, so when a court reissued a form PDF with
 * a shifted layout the definition and the test could silently drift apart and
 * the test would false-pass or false-fail.
 *
 * Now the coordinates live here once. The form definition draws using
 * `placement.draw`, and the test derives its crop from the very same object, so
 * the two can never disagree.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO RE-CALIBRATE WHEN A FORM ASSET IS REPLACED
 * ─────────────────────────────────────────────────────────────────────────────
 * When a court reissues a form PDF (`assets/forms/*.pdf`) the signature line may
 * move. To find the new coordinates:
 *
 *   1. Generate a *signed* PDF for that form (run the matching `test:*-signed`
 *      script, or hit the `/signed` endpoint with a solid-black PNG signature).
 *   2. Render the target page to PNG at 72 DPI — 1 pixel == 1 PDF point:
 *        pdftoppm -png -r 72 -f <page> -l <page> signed.pdf out
 *   3. Open `out-<page>.png` in an image viewer and read the pixel bounding box
 *      of the signature line where the image should sit (top-left origin).
 *   4. For a NON-rotated page, convert the image box back to pdf-lib coords
 *      (bottom-left origin) and update `draw`:
 *        draw.x      = imgX
 *        draw.width  = imgWidth
 *        draw.height = imgHeight
 *        draw.y      = renderedPageHeightPx - imgY - imgHeight
 *      The test crop is then derived automatically via `deriveImageCrop`.
 *   5. For a ROTATED page (e.g. VA DC-402 renders landscape because the source
 *      page has rotation = 90°), the simple pdf-lib→image formula does not hold.
 *      Update BOTH: `draw` (the pdf-lib coords + `rotate` the definition draws
 *      with) AND the explicit `testCrop` (image-space box the test crops).
 *      Calibrate the image-space box by diffing a signed vs. unsigned render.
 *   6. Sanity-check: crop the region and confirm mean brightness < 0.98 (dark
 *      pixels present). The signed tests assert exactly this.
 */

/** pdf-lib draw parameters — how a form definition places the signature image. */
export interface SignatureDrawSpec {
  /** 0-indexed page for pdf-lib `doc.getPages()`. */
  pageIndex: number;
  /** pdf-lib coords: x/y measured from the bottom-left; y is the bottom edge. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Page rotation in degrees, when the source PDF page itself is rotated. */
  rotate?: number;
}

/**
 * How a signed-PDF test should crop the rendered page to check the signature.
 *
 *  - `derive-from-draw`: compute the crop from `draw` using the standard
 *    pdf-lib→image formula. Correct for non-rotated pages.
 *  - `image-space`: an explicit, separately-calibrated crop in rendered-image
 *    coordinates (top-left origin). Required for rotated pages where the formula
 *    does not apply.
 */
export type SignatureTestCrop =
  | { mode: "derive-from-draw" }
  | {
      mode: "image-space";
      /** 1-indexed page for `pdftoppm -f/-l`. */
      page: number;
      x: number;
      y: number;
      width: number;
      height: number;
    };

/** A form's complete signature-placement record. */
export interface FormSignaturePlacement {
  /** Human-readable label used in test failure messages. */
  label: string;
  draw: SignatureDrawSpec;
  testCrop: SignatureTestCrop;
}

/** A crop box in rendered-image space (top-left origin), ready for `pdftoppm`. */
export interface ImageCrop {
  /** 1-indexed page for `pdftoppm -f/-l`. */
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Convert a pdf-lib `draw` spec into a rendered-image crop box.
 *
 * pdf-lib uses a bottom-left origin (y = bottom edge of the image); rendered
 * PNGs use a top-left origin. At 72 DPI, 1 pixel == 1 PDF point, so:
 *
 *   imgX = draw.x
 *   imgY = renderedPageHeightPx - draw.y - draw.height
 *
 * Only valid for NON-rotated pages. For rotated pages use an explicit
 * `image-space` `testCrop` instead.
 */
export function deriveImageCrop(
  draw: SignatureDrawSpec,
  renderedPageHeightPx: number,
): ImageCrop {
  return {
    page: draw.pageIndex + 1,
    x: draw.x,
    y: renderedPageHeightPx - draw.y - draw.height,
    width: draw.width,
    height: draw.height,
  };
}

/**
 * Resolve the crop a signed-PDF test should use.
 *
 * For `image-space` placements the calibrated box is returned as-is and the
 * rendered page height is ignored. For `derive-from-draw` placements the crop is
 * computed from `draw` and the supplied rendered page height.
 */
export function resolveTestCrop(
  placement: FormSignaturePlacement,
  renderedPageHeightPx: number,
): ImageCrop {
  if (placement.testCrop.mode === "image-space") {
    const { page, x, y, width, height } = placement.testCrop;
    return { page, x, y, width, height };
  }
  return deriveImageCrop(placement.draw, renderedPageHeightPx);
}

/**
 * Signature placements for every form covered by a signed-PDF e2e test.
 *
 * Keys are stable form ids used by both the form definitions and the tests.
 */
export const FORM_SIGNATURE_PLACEMENTS = {
  /**
   * AZ Small Claims Complaint (LJSC00001F). Plaintiff signs page 2 (index 1).
   * Non-rotated AcroForm; test crop derives from `draw`.
   */
  "az-complaint": {
    label: "AZ-COMPLAINT",
    draw: { pageIndex: 1, x: 326, y: 513, width: 180, height: 28 },
    testCrop: { mode: "derive-from-draw" },
  },

  /**
   * AZ Proof of Service (LJSC00003F). Single-page overlay; signature sits just
   * above the drawn "Signature of Person Filing" line (line y = 96, image
   * bottom edge y = 98). Non-rotated; test crop derives from `draw`.
   */
  "az-proof-of-service": {
    label: "AZ-PROOF-OF-SERVICE",
    draw: { pageIndex: 0, x: 74, y: 98, width: 190, height: 24 },
    testCrop: { mode: "derive-from-draw" },
  },

  /**
   * VA DC-402 (Warrant in Debt). The source page has rotation = 90°, so the
   * definition draws with `rotate: 90` at pdf-lib coords, and pdftoppm renders
   * a landscape 792×612 image. The pdf-lib→image formula does not apply, so the
   * test crops an explicitly calibrated image-space box instead.
   */
  "va-dc-402": {
    label: "VA-DC-402",
    draw: { pageIndex: 0, x: 339, y: 200, width: 155, height: 22, rotate: 90 },
    testCrop: { mode: "image-space", page: 1, x: 200, y: 317, width: 156, height: 23 },
  },
} satisfies Record<string, FormSignaturePlacement>;

export type FormSignatureId = keyof typeof FORM_SIGNATURE_PLACEMENTS;
