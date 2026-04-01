import { Router, type IRouter } from "express";
import healthRouter from "./health";
import countiesRouter from "./counties";
import casesRouter from "./cases";
import documentsRouter from "./documents";
import chatRouter from "./chat";
import formsRouter from "./forms";

const router: IRouter = Router();

router.use(healthRouter);
router.use(countiesRouter);
router.use(casesRouter);
router.use(documentsRouter);
router.use(chatRouter);
router.use(formsRouter);

export default router;
