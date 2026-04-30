# tests/app/ui/ConfigPanel.test.ts

- 役割: 設定パネルのプロジェクト読込をテストする。
- 主な状態: テスト用 `ProjectStorage`、DOM root、`GameConfig`。
- 主な処理: 正常JSON、不正JSON、キャンセル、読込エラー、JSON preview、schemaVersion を確認する。
- 呼ばれ方: `npm test` で実行される。
- 依存: `ConfigPanel`、`ProjectStorage`、`sampleGameConfig`。
- 読むポイント: 保存・読込の失敗時処理を確認する。
- 読まなくていい部分: jsdom や非同期待ちの細部。
