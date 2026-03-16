import { pgTable, serial, varchar, real, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const marketPricesTable = pgTable("market_prices", {
  id: serial("id").primaryKey(),
  cropType: varchar("crop_type", { length: 100 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  market: varchar("market", { length: 200 }).notNull(),
  pricePerKg: real("price_per_kg").notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  priceUsdPerKg: real("price_usd_per_kg").notNull(),
  weekOf: timestamp("week_of").notNull(),
  priceChange7d: real("price_change_7d"),
  priceChange30d: real("price_change_30d"),
  volume: varchar("volume", { length: 100 }),
  grade: varchar("grade", { length: 50 }),
  source: varchar("source", { length: 200 }),
  notes: text("notes"),
});

export const insertMarketPriceSchema = createInsertSchema(marketPricesTable).omit({ id: true });
export type InsertMarketPrice = z.infer<typeof insertMarketPriceSchema>;
export type MarketPrice = typeof marketPricesTable.$inferSelect;
