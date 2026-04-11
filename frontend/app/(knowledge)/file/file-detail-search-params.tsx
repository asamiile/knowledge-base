"use client";

import { useSearchParams } from "next/navigation";

import { FileDetailPanel } from "../components/file-detail-panel";

export function FileDetailSearchParams() {
  const searchParams = useSearchParams();
  const pathParam = searchParams.get("path");
  return <FileDetailPanel key={pathParam ?? ""} pathParam={pathParam} />;
}
