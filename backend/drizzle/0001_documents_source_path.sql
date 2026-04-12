-- documents.source_path: チャンクの取り込み元（DATA_DIR 相対パス）
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "source_path" varchar(2048);
