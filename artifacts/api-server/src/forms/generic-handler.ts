/**
 * generic-handler.ts
 *
 * Factory function that creates Express route handlers for any form
 * registered in FormRegistry.  This eliminates per-form boilerplate:
 * auth, case ownership, PDF generation, and streaming are all handled here.
 *
 * Usage:
 *   router.post("/cases/:id/forms/sc104",        makeFormHandler("SC-104", (id) => `SC104-Case-${id}.pdf`));
 *   router.post("/cases/:id/forms/sc104/signed",  makeFormHandler("SC-104", (id) => `SC104-Signed-Case-${id}.pdf`, { signed: true }));
 */

import type { RequestHandler } from "express";
import { FormRegistry } from "./registry";
import type { CaseData, FormBody } from "./types";
import { getOwnedCase } from "../lib/owned-case";
import { resolveDownloadUser } from "../routes/forms-common";

export interface HandlerOptions {
  /**
   * When true the handler extracts signatureDataUrl from the request body
   * and passes the decoded PNG buffer as options.signatureBytes to generate().
   */
  signed?: boolean;
  /**
   * When true the Content-Disposition is "inline" instead of "attachment".
   */
  inline?: boolean;
  /**
   * When set, the handler reads req.query[downloadParam] to decide disposition:
   *   "1"  → attachment (download)
   *   else → inline (preview)
   * Takes precedence over the static `inline` flag.
   * Used by SC-100 with-overrides so callers can pass ?download=1.
   */
  downloadParam?: string;
}

/**
 * Returns an Express route handler that authenticates the user,
 * verifies case ownership, invokes the form's generate() method,
 * and streams the resulting PDF buffer back to the client.
 *
 * @param formId   Registry key, e.g. "SC-104" or "CA/SC-104"
 * @param filename Factory that produces the download filename from the case ID
 * @param opts     Optional handler configuration
 */
export function makeFormHandler(
  formId: string,
  filename: (caseId: number) => string,
  opts: HandlerOptions = {}
): RequestHandler {
  return async (req, res): Promise<void> => {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid case ID" });
      return;
    }

    const userId = await resolveDownloadUser(req, res, id);
    if (!userId) return;

    const c = await getOwnedCase(id, userId);
    if (!c) {
      res.status(404).json({ error: "Case not found" });
      return;
    }

    const def = FormRegistry.get(formId);
    if (!def) {
      res.status(404).json({ error: `Form ${formId} not registered` });
      return;
    }

    const body = (req.body as FormBody) ?? {};

    let signatureBytes: Buffer | undefined;
    if (opts.signed) {
      const rawSig = body.signatureDataUrl as string | undefined;
      if (rawSig) {
        signatureBytes = Buffer.from(rawSig.replace(/^data:image\/\w+;base64,/, ""), "base64");
      }
    }

    const isAttachment = opts.downloadParam
      ? req.query[opts.downloadParam] === "1"
      : !opts.inline;

    try {
      const pdfBytes = await def.generate(
        c as CaseData,
        body,
        { signatureBytes, download: isAttachment }
      );

      const disposition = isAttachment ? "attachment" : "inline";
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `${disposition}; filename="${filename(id)}"`);
      res.setHeader("Content-Length", pdfBytes.length);
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.send(pdfBytes);
    } catch (err: any) {
      req.log.error({ err, formId }, "Form PDF generation error");
      if (!res.headersSent) {
        res.status(500).json({ error: `Failed to generate ${formId} PDF.` });
      }
    }
  };
}
