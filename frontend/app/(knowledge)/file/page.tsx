import { Suspense } from "react";

import { FileDetailSearchParams } from "./file-detail-search-params";

/** `/file?path=…` — 取り込みファイル1 件のメタ表示 */
export default function FileDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="text-muted-foreground mx-auto w-full max-w-4xl pb-10 text-sm">
            読み込み中…
          </div>
        </div>
      }
    >
      <FileDetailSearchParams />
    </Suspense>
  );
}
