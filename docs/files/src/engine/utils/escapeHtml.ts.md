# src/engine/utils/escapeHtml.ts

- 役割: HTMLに入れる文字列を安全な文字に置き換える。
- 主な状態: なし。
- 主な処理: `escapeHtml()`。
- 呼ばれ方: `Game` と `ConfigPanel` のHTML生成で使われる。
- 依存: なし。
- 読むポイント: `innerHTML` に文字列を入れる前の安全処理。
- 読まなくていい部分: 置換対象文字の暗記。
