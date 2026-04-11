import { Suspense } from "react";

import { FileDetailSearchParams } from "./file-detail-search-params";

/** `/file?path=…` — 取り込みファイル1 件のメタ表示 */
export default function FileDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground mx-auto max-w-3xl px-4 py-6 text-sm md:px-6">
          読み込み中…
        </div>
      }
    >
      <FileDetailSearchParams />
    </Suspense>
  );
}
