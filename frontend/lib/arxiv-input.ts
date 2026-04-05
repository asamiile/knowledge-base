/** `/add`・`/saved` 共通: 論文 ID 欄の文字列をトークンに分割 */
export function splitArxivIdsInput(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
