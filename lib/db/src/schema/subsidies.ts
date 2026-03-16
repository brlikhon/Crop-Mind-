import { pgTable, serial, varchar, text, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subsidiesTable = pgTable("subsidies", {
  id: serial("id").primaryKey(),
  programId: varchar("program_id", { length: 64 }).notNull().unique(),
  programName: varchar("program_name", { length: 300 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  administeredBy: varchar("administered_by", { length: 200 }).notNull(),
  description: text("description").notNull(),
  eligibleCrops: text("eligible_crops").notNull(),
  eligibilityCriteria: text("eligibility_criteria").notNull(),
  benefitType: varchar("benefit_type", { length: 100 }).notNull(),
  maxBenefitUsd: real("max_benefit_usd"),
  applicationDeadline: timestamp("application_deadline"),
  applicationUrl: varchar("application_url", { length: 500 }),
  isActive: boolean("is_active").notNull().default(true),
  targetRegion: varchar("target_region", { length: 200 }),
  minFarmSizeHa: real("min_farm_size_ha"),
  maxFarmSizeHa: real("max_farm_size_ha"),
  lastUpdated: timestamp("last_updated").notNull(),
});

export const insertSubsidySchema = createInsertSchema(subsidiesTable).omit({ id: true });
export type InsertSubsidy = z.infer<typeof insertSubsidySchema>;
export type Subsidy = typeof subsidiesTable.$inferSelect;
