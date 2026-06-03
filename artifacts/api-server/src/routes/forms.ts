import { Router, type IRouter } from "express";

import sc100Router    from "./forms-sc100";
import mc030Router    from "./forms-mc030";
import sc100aRouter   from "./forms-sc100a";
import sc103Router    from "./forms-sc103";
import sc104Router    from "./forms-sc104";
import sc105Router    from "./forms-sc105";
import sc112aRouter   from "./forms-sc112a";
import sc120Router    from "./forms-sc120";
import sc140Router    from "./forms-sc140";
import sc150Router    from "./forms-sc150";
import fw001Router    from "./forms-fw001";

// Re-export symbols that demand-letter.ts imports from this barrel.
export { stripMC030Wrappers, measureMC030BodyLines, MC030_MAX_LINES } from "./forms-mc030";

const router: IRouter = Router();

router.use(sc100Router);
router.use(mc030Router);
router.use(sc100aRouter);
router.use(sc103Router);
router.use(sc104Router);
router.use(sc105Router);
router.use(sc112aRouter);
router.use(sc120Router);
router.use(sc140Router);
router.use(sc150Router);
router.use(fw001Router);

export default router;
