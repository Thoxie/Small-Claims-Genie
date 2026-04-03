import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import healthRouter from "./health";
import countiesRouter from "./counties";
import casesRouter from "./cases";
import documentsRouter from "./documents";
import chatRouter from "./chat";
import chatExportRouter from "./chat-export";
import formsRouter from "./forms";
import formsTokenRouter from "./forms-token";
import transcribeRouter from "./transcribe";
import sc100WordRouter from "./sc100-word";
import demandLetterRouter from "./demand-letter";

const router: IRouter = Router();

// Public routes — no auth required
router.use(healthRouter);
router.use(countiesRouter);

// Form downloads — accept ?token query param (token issued by protected endpoint below)
router.use(formsRouter);
router.use(sc100WordRouter);

// Protected routes — Clerk JWT required on every request
router.use(requireAuth);
router.use(casesRouter);
router.use(documentsRouter);
router.use(chatRouter);
router.use(chatExportRouter);
router.use(formsTokenRouter);
router.use(transcribeRouter);
router.use(demandLetterRouter);

export default router;
