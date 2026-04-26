import { Actor } from "../engine/Entity";

export class Player extends Actor {
  constructor(x: number, y: number) {
    super(x, y, "@", "#f5f0d0", "プレイヤー", 30, 30, 5);
  }
}
