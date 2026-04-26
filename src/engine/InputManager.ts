/**
 * キーボード入力をゲーム用の命令に変換するファイル。
 * ブラウザのキー名を、移動・決定・再開始のようなゲーム操作に分ける。
 */
export type Direction = {
  dx: number;
  dy: number;
};

/** 入力イベントを受け取り、Gameへコールバックで通知するクラス。 */
export class InputManager {
  private onMove: ((direction: Direction) => void) | null = null;
  private onRestart: (() => void) | null = null;
  private onAction: (() => void) | null = null;
  private enabled = true;

  constructor() {
    window.addEventListener("keydown", (event) => this.handleKeyDown(event));
  }

  /** 移動キーが押された時に呼ぶ処理を登録する。 */
  setMoveHandler(handler: (direction: Direction) => void): void {
    this.onMove = handler;
  }

  /** ゲームオーバー後の再開始キーに使う処理を登録する。 */
  setRestartHandler(handler: () => void): void {
    this.onRestart = handler;
  }

  /** Spaceキーなど、移動以外のアクションに使う処理を登録する。 */
  setActionHandler(handler: () => void): void {
    this.onAction = handler;
  }

  /** ゲームオーバー中は通常操作を止めるための切り替え。 */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** キー入力をゲーム操作へ振り分ける。 */
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault();
      this.onRestart?.();
      return;
    }

    if (!this.enabled) return;

    if (event.key === " ") {
      event.preventDefault();
      this.onAction?.();
      return;
    }

    const direction = this.directionForKey(event.key);
    if (!direction) return;

    event.preventDefault();
    this.onMove?.(direction);
  }

  /** 矢印キーとWASDをグリッド移動の方向に変換する。 */
  private directionForKey(key: string): Direction | null {
    switch (key.toLowerCase()) {
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
