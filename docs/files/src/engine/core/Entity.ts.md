# src/engine/core/Entity.ts

- 役割: マップ上に存在するものの基本クラスを定義する。
- 主な状態: `id`、`x`、`y`、`char`、`color`、`blocksMovement`。
- 主な処理: `Actor` でHP、攻撃力、ダメージ、回復、死亡判定を扱う。
- 呼ばれ方: `Player`、`Enemy`、`Item` の親クラスとして使われる。
- 依存: 型として `Game`。
- 読むポイント: `Entity` と `Actor` の違いを見る。
- 読まなくていい部分: `crypto.randomUUID()` の詳細。
