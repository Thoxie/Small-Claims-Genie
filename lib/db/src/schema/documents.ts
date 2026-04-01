import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { casesTable } from "./cases";

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => casesTable.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  label: text("label"),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  fileData: text("file_data"),
  ocrText: text("ocr_text"),
  ocrStatus: text("ocr_status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, createdAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;
