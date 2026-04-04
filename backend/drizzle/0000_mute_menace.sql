-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"embedding" vector(1536)
);
--> statement-breakpoint
CREATE TABLE "raw_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" varchar(1024) NOT NULL,
	"content" jsonb NOT NULL
);

*/