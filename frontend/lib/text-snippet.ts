/** 表示用に空白を整理し、最大文字数で切り詰める。 */
export function textSnippet(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}
