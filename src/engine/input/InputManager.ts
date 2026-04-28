export type Direction = {
  dx: number;
  dy: number;
};

/** 入力イベントを受け取り、Gameへコールバックで通知するクラス。 */
export class InputManager {
  private moveHandler: ((direction: Direction) => void) | null = null;
  private restartHandler: (() => void) | null = null;
  private floorActionHandler: (() => void) | null = null;
  private useItemHandler: (() => void) | null = null;
  private acceptsPlayerInput = true;

  constructor() {
    window.addEventListener("keydown", (event) => this.handleKeyDown(event));
  }

  /** 移動キーが押された時に呼ぶ処理を登録する。 */
  setMoveHandler(moveHandler: (direction: Direction) => void): void {
    this.moveHandler = moveHandler;
  }

  /** ゲームオーバー後の再開始キーに使う処理を登録する。 */
  setRestartHandler(restartHandler: () => void): void {
    this.restartHandler = restartHandler;
  }

  /** Spaceキーなど、移動以外のアクションに使う処理を登録する。 */
  setActionHandler(floorActionHandler: () => void): void {
    this.floorActionHandler = floorActionHandler;
  }

  /** バッグ内のアイテムを使う処理を登録する。 */
  setUseItemHandler(useItemHandler: () => void): void {
    this.useItemHandler = useItemHandler;
  }

  /** ゲームオーバー中は通常操作を止めるための切り替え。 */
  setEnabled(acceptsPlayerInput: boolean): void {
    this.acceptsPlayerInput = acceptsPlayerInput;
  }

  /** キー入力をゲーム操作へ振り分ける。 */
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault();
      this.restartHandler?.();
      return;
    }

    if (!this.acceptsPlayerInput) return;

    if (event.key === " ") {
      event.preventDefault();
      this.floorActionHandler?.();
      return;
    }

    if (event.key.toLowerCase() === "h") {
      event.preventDefault();
      this.useItemHandler?.();
      return;
    }

    const moveDirection = this.directionForKey(event.key);
    if (!moveDirection) return;

    event.preventDefault();
    this.moveHandler?.(moveDirection);
  }

  /** 矢印キーとWASDをグリッド移動の方向に変換する。 */
  private directionForKey(keyName: string): Direction | null {
    switch (keyName.toLowerCase()) {
      case "arrowup":
      case "w":
        return { dx: 0, dy: -1 };
      case "arrowdown":
      case "s":
        return { dx: 0, dy: 1 };
      case "arrowleft":
      case "a":
        return { dx: -1, dy: 0 };
      case "arrowright":
      case "d":
        return { dx: 1, dy: 0 };
      default:
        return null;
    }
  }
}
