# src/main.ts

- 役割: アプリの入口。HTML要素、ゲーム本体、シーン、設定UIをつなぐ。
- 主な状態: `game`、`scene`、`configPanel`、`isEditingStartedGame`。
- 主な処理: ゲーム開始、設定画面へ戻る、プレイ中設定変更、終了処理。
- 呼ばれ方: `index.html` の script から読み込まれる。
- 依存: `ConfigPanel`、`DesktopProjectStorage`、`Game`、`MainScene`、`sampleGameConfig`。
- 読むポイント: ゲーム開始ボタンと `MainScene` / `Game` の接続を見る。
- 読まなくていい部分: DOM要素の存在チェックの細部。
