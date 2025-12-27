import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql, type InferSelectModel, type InferInsertModel } from "drizzle-orm";

export const sessions = sqliteTable("Session", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  hostUserId: text("hostUserId").notNull(),
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
  jellyfinItemId: text("jellyfinItemId").notNull(),
  jellyfinUserId: text("jellyfinUserId").notNull(),
  isMatch: integer("isMatch", { mode: "boolean" }).notNull().default(false),
  sessionCode: text("sessionCode").references(() => sessions.code),
  createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return [
    uniqueIndex("Like_jellyfinItemId_jellyfinUserId_sessionCode_key").on(table.jellyfinItemId, table.jellyfinUserId, table.sessionCode),
  ];
});

export type Like = InferSelectModel<typeof likes>;
export type NewLike = InferInsertModel<typeof likes>;

export const hiddens = sqliteTable("Hidden", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jellyfinItemId: text("jellyfinItemId").notNull(),
  jellyfinUserId: text("jellyfinUserId").notNull(),
  sessionCode: text("sessionCode").references(() => sessions.code),
}, (table) => {
  return [
    uniqueIndex("Hidden_jellyfinItemId_jellyfinUserId_sessionCode_key").on(table.jellyfinItemId, table.jellyfinUserId, table.sessionCode),
  ];
});

export type Hidden = InferSelectModel<typeof hiddens>;
export type NewHidden = InferInsertModel<typeof hiddens>;
