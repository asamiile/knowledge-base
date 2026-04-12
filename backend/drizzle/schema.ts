import {
	jsonb,
	pgTable,
	serial,
	text,
	timestamp,
	vector,
	varchar,
} from "drizzle-orm/pg-core";

export const documents = pgTable("documents", {
	id: serial().primaryKey().notNull(),
	text: text().notNull(),
	sourcePath: varchar("source_path", { length: 2048 }),
	embedding: vector({ dimensions: 768 }),
});

export const rawData = pgTable("raw_data", {
	id: serial().primaryKey().notNull(),
	source: varchar({ length: 1024 }).notNull(),
	content: jsonb().notNull(),
});

export const questionHistory = pgTable("question_history", {
	id: serial().primaryKey().notNull(),
	question: text().notNull(),
	response: jsonb().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
		.defaultNow()
		.notNull(),
});
