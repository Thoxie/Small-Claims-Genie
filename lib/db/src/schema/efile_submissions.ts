import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";

export const efileSubmissionsTable = pgTable("efile_submissions", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull(),
  userId: text("user_id").notNull(),
  jurisdictionState: text("jurisdiction_state").notNull(),
  courtCli: text("court_cli"),
  envelopeId: text("envelope_id"),
  status: text("status").notNull().default("submitted"),
  feesCharged: integer("fees_charged"),
  courtFeeAmount: integer("court_fee_amount"),
  convenienceFeeAmount: integer("convenience_fee_amount"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  rejectionReason: text("rejection_reason"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("efile_submissions_case_id_idx").on(t.caseId),
  index("efile_submissions_user_id_idx").on(t.userId),
  index("efile_submissions_envelope_id_idx").on(t.envelopeId),
]);

export type EfileSubmission = typeof efileSubmissionsTable.$inferSelect;
