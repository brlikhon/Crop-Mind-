import { pgTable, serial, text, varchar, timestamp, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cropAlertsTable = pgTable("crop_alerts", {
  id: serial("id").primaryKey(),
  alertId: varchar("alert_id", { length: 64 }).notNull().unique(),
  cropType: varchar("crop_type", { length: 100 }).notNull(),
  region: varchar("region", { length: 200 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  threatType: varchar("threat_type", { length: 50 }).notNull(),
  threatName: varchar("threat_name", { length: 200 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  description: text("description").notNull(),
  advisoryText: text("advisory_text").notNull(),
  affectedAreaHa: real("affected_area_ha"),
  reportedDate: timestamp("reported_date").notNull(),
  expiresDate: timestamp("expires_date"),
  isActive: boolean("is_active").notNull().default(true),
  source: varchar("source", { length: 200 }),
});

export const insertCropAlertSchema = createInsertSchema(cropAlertsTable).omit({ id: true });
export type InsertCropAlert = z.infer<typeof insertCropAlertSchema>;
export type CropAlert = typeof cropAlertsTable.$inferSelect;
