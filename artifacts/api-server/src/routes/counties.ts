import { Router, type IRouter } from "express";

import { CALIFORNIA_COUNTIES, enrichCaCounty } from "../data/counties-ca";
import { FLORIDA_COUNTIES, enrichFlCounty } from "../data/counties-fl";
import { TEXAS_COUNTIES } from "../data/counties-tx";
import { ILLINOIS_COUNTIES, enrichIlCounty, getIlSheriffAddress } from "../data/counties-il";
import { NORTH_CAROLINA_COUNTIES } from "../data/counties-nc";
import { VIRGINIA_COUNTIES } from "../data/counties-va";
import { NEW_JERSEY_COUNTIES } from "../data/counties-nj";
import { WASHINGTON_COUNTIES } from "../data/counties-wa";
import { ARIZONA_COUNTIES } from "../data/counties-az";

const router: IRouter = Router();

export { CALIFORNIA_COUNTIES, FLORIDA_COUNTIES, TEXAS_COUNTIES, ILLINOIS_COUNTIES, NORTH_CAROLINA_COUNTIES, VIRGINIA_COUNTIES, NEW_JERSEY_COUNTIES, WASHINGTON_COUNTIES, ARIZONA_COUNTIES, getIlSheriffAddress };

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
  } else if (state === "NC") {
    res.json(NORTH_CAROLINA_COUNTIES);
  } else if (state === "VA") {
    res.json(VIRGINIA_COUNTIES);
  } else if (state === "NJ") {
    res.json(NEW_JERSEY_COUNTIES);
  } else if (state === "WA") {
    res.json(WASHINGTON_COUNTIES);
  } else if (state === "AZ") {
    res.json(ARIZONA_COUNTIES);
  } else {
    res.json([
      ...CALIFORNIA_COUNTIES.map(enrichCaCounty),
      ...FLORIDA_COUNTIES.map(enrichFlCounty),
      ...ILLINOIS_COUNTIES.map(enrichIlCounty),
      ...TEXAS_COUNTIES,
      ...NORTH_CAROLINA_COUNTIES,
      ...VIRGINIA_COUNTIES,
      ...NEW_JERSEY_COUNTIES,
      ...WASHINGTON_COUNTIES,
      ...ARIZONA_COUNTIES,
    ]);
  }
});

export default router;
