import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { requiresPurchase } from "../middlewares/requiresPurchase";
import healthRouter from "./health";
import countiesRouter from "./counties";
import helpChatRouter from "./help-chat";
import caseClassifierRouter from "./case-classifier";
import casesRouter from "./cases";
import documentsRouter from "./documents";
import chatRouter from "./chat";
import chatExportRouter from "./chat-export";
import formsRouter from "./forms";
import formsTokenRouter from "./forms-token";
import transcribeRouter from "./transcribe";
import sc100WordRouter from "./sc100-word";
import demandLetterRouter from "./demand-letter";
import hearingPrepRouter from "./hearing-prep";
import storageRouter from "./storage";
import backupDownloadRouter from "./backup-download";
import stripeRouter from "./stripe";
import accountRouter from "./account";

const router: IRouter = Router();

// Public routes — no auth required
router.use(healthRouter);
router.use(countiesRouter);
router.use(storageRouter);
router.use(helpChatRouter);
router.use(caseClassifierRouter);
router.use(backupDownloadRouter);
// Source download is a dev-only utility — never expose in production
if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  router.use(require("./source-download").default);
}
router.use(stripeRouter); // Stripe routes (checkout is public; internal auth via client_reference_id)

// Form downloads — accept ?token query param (token issued by protected endpoint below)
router.use(formsRouter);
router.use(sc100WordRouter);

// Auth-only routes — Clerk JWT required, no purchase needed
router.use(requireAuth);
router.use(accountRouter); // Account management always accessible

// Pay-to-start gate — confirmed Stripe purchase required for all case workspace features
router.use(requiresPurchase);
router.use(casesRouter);
router.use(documentsRouter);
router.use(chatRouter);
router.use(chatExportRouter);
router.use(formsTokenRouter);
router.use(transcribeRouter);
router.use(demandLetterRouter);
router.use(hearingPrepRouter);

export default router;
