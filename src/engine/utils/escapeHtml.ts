/**
 * HTML特殊文字をエスケープする。
 * innerHTML に挿入するユーザー由来の文字列に使う。
 */
export function escapeHtml(rawText: string): string {
  return rawText
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
