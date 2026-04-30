# index.html

- 役割: アプリ画面の土台となるHTML。
- 主な状態: `#game-canvas`、`#status`、`#log`、`#config-panel` など。
- 主な処理: Canvas、ステータス、ログ、設定パネルの置き場所を用意する。
- 呼ばれ方: Vite または Electron から読み込まれる。
- 依存: `/src/main.ts`。
- 読むポイント: `main.ts` が取得するDOM要素のIDを確認する。
- 読まなくていい部分: HTML属性の細部。
