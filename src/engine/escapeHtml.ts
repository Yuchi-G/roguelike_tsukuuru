/**
 * HTML特殊文字をエスケープする。
 * innerHTML に挿入するユーザー由来の文字列に使う。
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
