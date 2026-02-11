import { sqliteTable, text, integer, uniqueIndex, blob } from "drizzle-orm/sqlite-core";
import { sql, type InferSelectModel, type InferInsertModel } from "drizzle-orm";

export const sessions = sqliteTable("Session", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  hostUserId: text("hostUserId").notNull(),
  hostAccessToken: text("hostAccessToken"),
  hostDeviceId: text("hostDeviceId"),
  provider: text("provider"),
  providerConfig: text("providerConfig"),
  filters: text("filters"),
  settings: text("settings"),
  createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return [
    uniqueIndex("Session_code_key").on(table.code),
  ];
});

export type Session = InferSelectModel<typeof sessions>;
export type NewSession = InferInsertModel<typeof sessions>;

export const likes = sqliteTable("Like", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  externalId: text("externalId").notNull(),
  externalUserId: text("externalUserId").notNull(),
  isMatch: integer("isMatch", { mode: "boolean" }).notNull().default(false),
  sessionCode: text("sessionCode").references(() => sessions.code, { onDelete: "cascade" }),
  createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return [
    uniqueIndex("Like_session_key").on(table.externalId, table.externalUserId, table.sessionCode).where(sql`sessionCode IS NOT NULL`),
    uniqueIndex("Like_solo_key").on(table.externalId, table.externalUserId).where(sql`sessionCode IS NULL`),
  ];
});

export type Like = InferSelectModel<typeof likes>;
export type NewLike = InferInsertModel<typeof likes>;

export const hiddens = sqliteTable("Hidden", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  externalId: text("externalId").notNull(),
  externalUserId: text("externalUserId").notNull(),
  sessionCode: text("sessionCode").references(() => sessions.code, { onDelete: "cascade" }),
}, (table) => {
  return [
    uniqueIndex("Hidden_session_key").on(table.externalId, table.externalUserId, table.sessionCode).where(sql`sessionCode IS NOT NULL`),
    uniqueIndex("Hidden_solo_key").on(table.externalId, table.externalUserId).where(sql`sessionCode IS NULL`),
  ];
});

export type Hidden = InferSelectModel<typeof hiddens>;
export type NewHidden = InferInsertModel<typeof hiddens>;

export const sessionMembers = sqliteTable("SessionMember", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionCode: text("sessionCode").references(() => sessions.code, { onDelete: "cascade" }),
  externalUserId: text("externalUserId").notNull(),
  externalUserName: text("externalUserName").notNull(),
  settings: text("settings"),
  joinedAt: text("joinedAt").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return [
    uniqueIndex("SessionMember_sessionCode_externalUserId_key").on(table.sessionCode, table.externalUserId),
  ];
});

export type SessionMember = InferSelectModel<typeof sessionMembers>;
export type NewSessionMember = InferInsertModel<typeof sessionMembers>;

export const config = sqliteTable("Config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Config = InferSelectModel<typeof config>;
export type NewConfig = InferInsertModel<typeof config>;

export const userProfiles = sqliteTable("UserProfile", {
  userId: text("userId").primaryKey(),
  image: blob("image", { mode: "buffer" }),
  contentType: text("contentType"),
  updatedAt: text("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type UserProfile = InferSelectModel<typeof userProfiles>;
export type NewUserProfile = InferInsertModel<typeof userProfiles>;

