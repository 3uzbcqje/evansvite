import { pgTable, serial, text, timestamp, integer, boolean, pgEnum, index, jsonb } from "drizzle-orm/pg-core";

export const rsvpStatusEnum = pgEnum("rsvp_status", ["yes", "no", "maybe"]);
export const eventVisibilityEnum = pgEnum("event_visibility", ["public", "unlisted"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  isAdmin: boolean("is_admin").notNull().default(false),
  actorId: text("actor_id").unique(),
  privateKey: text("private_key"),
  publicKey: text("public_key"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  location: text("location"),
  imageUrl: text("image_url"),
  capacity: integer("capacity"),
  visibility: eventVisibilityEnum("visibility").notNull().default("public"),
  organizerId: integer("organizer_id").notNull().references(() => users.id),
  isLocal: boolean("is_local").notNull().default(true),
  remoteId: text("remote_id"),
  remoteInstance: text("remote_instance"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("events_organizer_idx").on(table.organizerId),
  index("events_start_time_idx").on(table.startTime),
  index("events_visibility_idx").on(table.visibility),
]);

export const rsvps = pgTable("rsvps", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  eventId: integer("event_id").notNull().references(() => events.id),
  status: rsvpStatusEnum("status").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("rsvps_user_event_idx").on(table.userId, table.eventId),
  index("rsvps_event_idx").on(table.eventId),
]);

export const followers = pgTable("followers", {
  id: serial("id").primaryKey(),
  actorId: text("actor_id").notNull().unique(),
  inboxUrl: text("inbox_url").notNull(),
  sharedInboxUrl: text("shared_inbox_url"),
  following: boolean("following").notNull().default(false),
  followedBy: boolean("followed_by").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inviteCodes = pgTable("invite_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  usedBy: integer("used_by").references(() => users.id),
  usedAt: timestamp("used_at"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const blockedInstances = pgTable("blocked_instances", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull().unique(),
  reason: text("reason"),
  blockedAt: timestamp("blocked_at").notNull().defaultNow(),
});

export const instanceConfig = pgTable("instance_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
});
