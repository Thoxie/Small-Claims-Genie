import { Router, type IRouter } from "express";

import { CALIFORNIA_COUNTIES, enrichCaCounty } from "../data/counties-ca";
import { FLORIDA_COUNTIES, enrichFlCounty } from "../data/counties-fl";
import { TEXAS_COUNTIES } from "../data/counties-tx";
import { ILLINOIS_COUNTIES, enrichIlCounty, getIlSheriffAddress } from "../data/counties-il";

const router: IRouter = Router();

export { CALIFORNIA_COUNTIES, FLORIDA_COUNTIES, TEXAS_COUNTIES, ILLINOIS_COUNTIES, getIlSheriffAddress };

router.get("/counties", (req, res): void => {
  const { state } = req.query;
  if (state === "CA") {
    res.json(CALIFORNIA_COUNTIES.map(enrichCaCounty));
  } else if (state === "FL") {
    res.json(FLORIDA_COUNTIES.map(enrichFlCounty));
  } else if (state === "IL") {
    res.json(ILLINOIS_COUNTIES.map(enrichIlCounty));
  } else if (state === "TX") {
    res.json(TEXAS_COUNTIES);
  } else {
    res.json([
      ...CALIFORNIA_COUNTIES.map(enrichCaCounty),
      ...FLORIDA_COUNTIES.map(enrichFlCounty),
      ...ILLINOIS_COUNTIES.map(enrichIlCounty),
      ...TEXAS_COUNTIES,
    ]);
  }
});

export default router;
