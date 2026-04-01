import { pgTable, text, serial, timestamp, integer, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const casesTable = pgTable("cases", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  countyId: text("county_id"),
  claimAmount: real("claim_amount"),
  claimType: text("claim_type"),
  plaintiffName: text("plaintiff_name"),
  plaintiffPhone: text("plaintiff_phone"),
  plaintiffAddress: text("plaintiff_address"),
  plaintiffCity: text("plaintiff_city"),
  plaintiffState: text("plaintiff_state").default("CA"),
  plaintiffZip: text("plaintiff_zip"),
  plaintiffEmail: text("plaintiff_email"),
  defendantName: text("defendant_name"),
  defendantPhone: text("defendant_phone"),
  defendantAddress: text("defendant_address"),
  defendantCity: text("defendant_city"),
  defendantState: text("defendant_state").default("CA"),
  defendantZip: text("defendant_zip"),
  defendantIsBusinessOrEntity: boolean("defendant_is_business_or_entity").default(false),
  defendantAgentName: text("defendant_agent_name"),
  claimDescription: text("claim_description"),
  incidentDate: text("incident_date"),
  howAmountCalculated: text("how_amount_calculated"),
  priorDemandMade: boolean("prior_demand_made"),
  priorDemandDescription: text("prior_demand_description"),
  venueReason: text("venue_reason"),
  venueBasis: text("venue_basis"),
  isSuingPublicEntity: boolean("is_suing_public_entity").default(false),
  publicEntityClaimFiledDate: text("public_entity_claim_filed_date"),
  isAttyFeeDispute: boolean("is_atty_fee_dispute").default(false),
  filedMoreThan12Claims: boolean("filed_more_than_12_claims").default(false),
  claimOver2500: boolean("claim_over_2500").default(false),
  intakeStep: integer("intake_step").default(1),
  intakeComplete: boolean("intake_complete").default(false),
  documentCount: integer("document_count").default(0),
  readinessScore: integer("readiness_score").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCaseSchema = createInsertSchema(casesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Case = typeof casesTable.$inferSelect;
