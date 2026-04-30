# tests/engine/core/Entity.test.ts

- 役割: `Actor` の死亡、ダメージ、回復をテストする。
- 主な状態: テスト用 `TestActor`。
- 主な処理: `isDead`、`damage()`、`heal()` の期待値確認。
- 呼ばれ方: `npm test` で実行される。
- 依存: `Actor`。
- 読むポイント: HP処理の仕様確認に使う。
- 読まなくていい部分: Vitest の書き方。
