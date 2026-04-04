import { pgTable, serial, text, vector, varchar, jsonb } from "drizzle-orm/pg-core";

export const documents = pgTable("documents", {
	id: serial().primaryKey().notNull(),
	text: text().notNull(),
	embedding: vector({ dimensions: 768 }),
});

export const rawData = pgTable("raw_data", {
	id: serial().primaryKey().notNull(),
	source: varchar({ length: 1024 }).notNull(),
	content: jsonb().notNull(),
});
