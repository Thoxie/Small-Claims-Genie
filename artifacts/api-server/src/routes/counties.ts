import { Router, type IRouter } from "express";
import { db, countiesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

import { CALIFORNIA_COUNTIES, enrichCaCounty } from "../data/counties-ca";
import { FLORIDA_COUNTIES, enrichFlCounty } from "../data/counties-fl";
import { TEXAS_COUNTIES } from "../data/counties-tx";
import { ILLINOIS_COUNTIES, enrichIlCounty, getIlSheriffAddress } from "../data/counties-il";
import { NORTH_CAROLINA_COUNTIES } from "../data/counties-nc";
import { VIRGINIA_COUNTIES } from "../data/counties-va";
import { NEW_JERSEY_COUNTIES } from "../data/counties-nj";
import { WASHINGTON_COUNTIES } from "../data/counties-wa";
import { ARIZONA_COUNTIES } from "../data/counties-az";

// Re-export static arrays — used by admin.ts (buildTestCaseData) and form definitions
export {
  CALIFORNIA_COUNTIES,
  FLORIDA_COUNTIES,
  TEXAS_COUNTIES,
  ILLINOIS_COUNTIES,
  NORTH_CAROLINA_COUNTIES,
  VIRGINIA_COUNTIES,
  NEW_JERSEY_COUNTIES,
  WASHINGTON_COUNTIES,
  ARIZONA_COUNTIES,
  getIlSheriffAddress,
};

const router: IRouter = Router();

type AnyCounty = Record<string, unknown>;

function applyEnrich(rows: AnyCounty[], state: string): AnyCounty[] {
  if (state === "CA") return rows.map((r) => enrichCaCounty(r as { id: string }));
  if (state === "FL") return rows.map((r) => enrichFlCounty(r as { id: string }));
  if (state === "IL") return rows.map((r) => enrichIlCounty(r as { id: string }));
  return rows;
}

function fallback(state?: string): AnyCounty[] {
  const all = [
    ...CALIFORNIA_COUNTIES.map(enrichCaCounty),
    ...FLORIDA_COUNTIES.map(enrichFlCounty),
    ...ILLINOIS_COUNTIES.map(enrichIlCounty),
    ...TEXAS_COUNTIES,
    ...NORTH_CAROLINA_COUNTIES,
    ...VIRGINIA_COUNTIES,
    ...NEW_JERSEY_COUNTIES,
    ...WASHINGTON_COUNTIES,
    ...ARIZONA_COUNTIES,
  ] as AnyCounty[];
  return state ? all.filter((c) => c["state"] === state) : all;
}

router.get("/counties", async (req, res): Promise<void> => {
  const { state } = req.query as { state?: string };
  try {
    if (state) {
      const rows = await db
        .select()
        .from(countiesTable)
        .where(eq(countiesTable.state, state))
        .orderBy(asc(countiesTable.name));
      if (rows.length === 0) {
        res.json(fallback(state));
        return;
      }
      res.json(applyEnrich(rows as AnyCounty[], state));
    } else {
      const rows = await db
        .select()
        .from(countiesTable)
        .orderBy(asc(countiesTable.state), asc(countiesTable.name));
      if (rows.length === 0) {
        res.json(fallback());
        return;
      }
      res.json(rows.map((r) => applyEnrich([r as AnyCounty], r.state ?? "")[0]));
    }
  } catch {
    res.json(fallback(state));
  }
});

export default router;
