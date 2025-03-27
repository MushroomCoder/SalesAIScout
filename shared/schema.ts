import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles enum
export const userRoleEnum = pgEnum('user_role', ['admin', 'sdr']);

// User status enum
export const userStatusEnum = pgEnum('user_status', ['pending', 'approved', 'rejected']);

// Prospect stage enum
export const prospectStageEnum = pgEnum('prospect_stage', ['new', 'contacted', 'connected', 'meeting_scheduled', 'qualified', 'disqualified']);

// Channel type enum
export const channelTypeEnum = pgEnum('channel_type', ['linkedin', 'twitter', 'instagram', 'quora', 'google']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password"),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull().default('sdr'),
  status: userStatusEnum("status").notNull().default('pending'),
  team: text("team"),
  googleId: text("google_id").unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Channels table
export const channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: channelTypeEnum("type").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Channel assignments
export const userChannels = pgTable("user_channels", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  channelId: integer("channel_id").notNull().references(() => channels.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Prospects table
export const prospects = pgTable("prospects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title"),
  company: text("company"),
  sourceLink: text("source_link"),
  channelId: integer("channel_id").references(() => channels.id),
  matchScore: integer("match_score"),
  stage: prospectStageEnum("stage").notNull().default('new'),
  notes: text("notes"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Searches table
export const searches = pgTable("searches", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  query: text("query").notNull(),
  jobTitle: text("job_title"),
  industry: text("industry"),
  companySize: text("company_size"),
  location: text("location"),
  keywords: text("keywords"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Create Zod schemas
export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true })
  .extend({
    password: z.string().min(6).optional(),
  });

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const insertChannelSchema = createInsertSchema(channels)
  .omit({ id: true, createdAt: true });

export const insertUserChannelSchema = createInsertSchema(userChannels)
  .omit({ id: true, createdAt: true });

export const insertProspectSchema = createInsertSchema(prospects)
  .omit({ id: true, createdAt: true });

export const insertSearchSchema = createInsertSchema(searches)
  .omit({ id: true, createdAt: true });

export const searchQuerySchema = z.object({
  jobTitle: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  location: z.string().optional(),
  keywords: z.string().optional(),
  channels: z.array(z.string()).optional(),
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;

export type Channel = typeof channels.$inferSelect;
export type InsertChannel = z.infer<typeof insertChannelSchema>;

export type UserChannel = typeof userChannels.$inferSelect;
export type InsertUserChannel = z.infer<typeof insertUserChannelSchema>;

export type Prospect = typeof prospects.$inferSelect;
export type InsertProspect = z.infer<typeof insertProspectSchema>;

export type Search = typeof searches.$inferSelect;
export type InsertSearch = z.infer<typeof insertSearchSchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
