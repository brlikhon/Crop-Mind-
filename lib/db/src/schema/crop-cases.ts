import { pgTable, serial, varchar, text, real, timestamp, index } from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cropCasesTable = pgTable("crop_cases", {
  id: serial("id").primaryKey(),
  caseId: varchar("case_id", { length: 64 }).notNull().unique(),
  cropType: varchar("crop_type", { length: 100 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  region: varchar("region", { length: 200 }).notNull(),
  symptomsText: text("symptoms_text").notNull(),
  diagnosis: varchar("diagnosis", { length: 300 }).notNull(),
  treatmentApplied: text("treatment_applied").notNull(),
  outcomeScore: real("outcome_score").notNull(),
  resolvedAt: timestamp("resolved_at").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }).notNull(),
}, (table) => [
  index("crop_cases_crop_type_idx").on(table.cropType),
  index("crop_cases_country_idx").on(table.country),
]);

export const insertCropCaseSchema = createInsertSchema(cropCasesTable).omit({ id: true });
export type InsertCropCase = z.infer<typeof insertCropCaseSchema>;
export type CropCase = typeof cropCasesTable.$inferSelect;
