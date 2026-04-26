/**
 * サンプルゲームのプレイヤーを定義するファイル。
 * 表示文字、初期HP、攻撃力などの基本性能をまとめる。
 */
import { Actor } from "../engine/Entity";

/** プレイヤーキャラクター。入力による移動や攻撃はGame側で処理する。 */
export class Player extends Actor {
  constructor(x: number, y: number) {
    super(x, y, "@", "#f5f0d0", "プレイヤー", 30, 30, 5);
  }
}
