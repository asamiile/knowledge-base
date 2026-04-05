import { Suspense } from "react";

import { SavedSearchRunLogsContent } from "./logs-content";

/** `/saved/logs` — 一覧はサイドバー「定期実行」。ここは詳細のみ。 */
export default function SavedSearchRunLogsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Suspense
        fallback={
          <p className="text-muted-foreground p-4 text-sm">読み込み中…</p>
        }
      >
        <SavedSearchRunLogsContent />
      </Suspense>
    </div>
  );
}
